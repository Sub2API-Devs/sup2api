package app

import (
	"context"
	"log/slog"
	"net/http"
	"sync"
	"sync/atomic"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/account"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/apikey"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/background"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/cluster"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/event"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/event/delivery"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/group"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/iam"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/job"
	observer "github.com/Sub2API-Devs/sup2api/next/server/internal/observation"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/blobs"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/dbschema"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/egress"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/grpcruntime"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/market"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/rollout"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/providerresources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/proxy"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usage"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/webui"
)

// boot is one core process being brought up: the dependencies each phase
// builds and the teardown stack they register. run threads the same value
// through the phases so they need no long parameter lists, and the shutdown
// order stays exactly the registration order reversed.
type boot struct {
	ctx     context.Context
	cfg     *config.Config
	version string
	log     *slog.Logger
	managed *managedCore

	stopper *teardown

	// storage and cluster
	db     *store.DB
	rdb    redis.UniversalClient
	cipher *secret.Cipher
	cl     *cluster.Cluster

	// core services
	events  *event.Publisher
	reg     *registry.Registry
	trust   *pkg.TrustStore
	pkgs    *registry.Packages
	bill    *billing.Service
	work    *background.Executor
	settler *usage.Service
	az      *authz.Service
	idm     *iam.Service
	grp     *group.Service
	keys    *apikey.Service
	prx     *proxy.Service
	stats   *account.Stats
	ccg     *ccgateway.Service
	acc     *account.Service

	converters   *convert.Registry
	limiter      *account.Limiter
	packageStore blobs.Store
	packageSrc   *blobs.Source
	marketClient *http.Client
	packageHTTP  *http.Client

	// how this node may work and coordinate (nil on a standalone node)
	canWork       func() bool
	canCoordinate func() bool

	// plugin runtime
	egress       *egress.Provider
	schemas      *dbschema.Manager
	rt           *grpcruntime.Runtime
	gate         *requestGate
	resources    *providerresources.Service
	helpers      *helperhistory.Service
	observations *observer.Hub
	gw           *gateway.Gateway
	mutations    *cluster.PluginMutations
	defaults     *install.DefaultsApplier
	ctl          *rollout.Controller
	inst         *install.Service
	mkt          *market.Service
	builtinReady *atomic.Bool
	jobs         *job.Scheduler
	dlv          *delivery.Service
	startOnce    sync.Once
	startErr     error

	// HTTP
	sharedAssets *webui.SharedAssets
	engine       *gin.Engine
	router       *httpapi.Router
}

// teardown is the shutdown stack: functions run in reverse registration
// order, none of them twice. A function registered again under the same key
// is moved to the end, which keeps "closing = inverse of the last successful
// phase" true when a dependency is deliberately re-registered later.
type teardown struct {
	fns  []func(context.Context)
	keys map[string]int
}

func newTeardown() *teardown { return &teardown{keys: map[string]int{}} }

// add registers fn under key, or moves an earlier registration of key to the
// end of the stack.
func (t *teardown) add(key string, fn func(context.Context)) {
	if idx, ok := t.keys[key]; ok {
		t.fns = append(t.fns[:idx], t.fns[idx+1:]...)
		for k, i := range t.keys {
			if i > idx {
				t.keys[k] = i - 1
			}
		}
	}
	t.keys[key] = len(t.fns)
	t.fns = append(t.fns, fn)
}

// run calls every teardown function in reverse registration order.
func (t *teardown) run(ctx context.Context) {
	for i := len(t.fns) - 1; i >= 0; i-- {
		t.fns[i](ctx)
	}
}
