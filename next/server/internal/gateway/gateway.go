// Package gateway is the client-facing API gateway: plugin-declared
// endpoints, the proxy pipeline (auth, hooks, billing gate, scheduling,
// forwarding, usage extraction), sticky sessions and the /sticky-rules
// console API. See ARCHITECTURE chapter 6 and CONTRACTS §5.6/§5.9.
package gateway

import (
	"context"
	"encoding/json"
	"log/slog"
	"math/rand/v2"
	"net"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Deps are the gateway's collaborators. DB and Redis may be nil in unit
// tests: sticky sessions and hook breaker/stats
// then degrade to no-ops.
type Deps struct {
	DB       *store.DB
	Redis    redis.UniversalClient
	Bus      core.Bus
	Node     core.Node
	Registry core.PluginRegistry
	Auth     core.APIKeyAuthenticator
	Pricer   core.Pricer
	Balance  core.BalanceGate
	Slots    core.Slots
	Accounts core.AccountDirectory
	Proxies  core.ProxyDirectory
	Settler  core.Settler
	Config   *config.Config
	// Converters are the core's protocol converters (ARCHITECTURE 6.6);
	// nil means convert.Default(). Hand the same registry (or the Gateway,
	// see Converters/CanConvert) to the account module as
	// core.ProtocolConverters.
	Converters *convert.Registry
}

// Gateway serves plugin-declared endpoints and owns sticky sessions.
type Gateway struct {
	d Deps

	conv *convert.Registry

	table atomic.Pointer[routeTable]

	settings *settingsCache
	rules    *ruleCache
	hooks    *hookRuntime

	allowPrivate bool

	// Overridable in tests.
	now        func() time.Time
	lookupIP   func(ctx context.Context, host string) ([]net.IP, error)
	headerWait func(stream bool) time.Duration
	shuffle    func(n int, swap func(i, j int))

	stop    chan struct{}
	wg      sync.WaitGroup
	cancels []func()
	closed  sync.Once
}

var (
	_ core.StickyRuleCatalog  = (*Gateway)(nil)
	_ core.HookStatsSource    = (*Gateway)(nil)
	_ core.ProtocolConverters = (*Gateway)(nil)
)

// Converters returns the gateway's converter registry.
func (g *Gateway) Converters() *convert.Registry { return g.conv }

// CanConvert implements core.ProtocolConverters (for the account module).
func (g *Gateway) CanConvert(clientProtocol, upstreamProtocol string) bool {
	return g.conv.CanConvert(clientProtocol, upstreamProtocol)
}

// New builds the gateway, subscribes to registry and bus notifications and
// starts its background loop (hook stats flush).
// Call Close on shutdown.
func New(d Deps) *Gateway {
	g := &Gateway{
		d:          d,
		now:        time.Now,
		lookupIP:   defaultLookupIP,
		headerWait: defaultHeaderWait,
		shuffle:    rand.Shuffle,
		stop:       make(chan struct{}),
	}
	g.conv = d.Converters
	if g.conv == nil {
		g.conv = convert.Default()
	}
	if d.Config != nil {
		g.allowPrivate = d.Config.AllowPrivateUpstream
	}
	g.settings = newSettingsCache(d.DB)
	g.rules = newRuleCache(d.DB)
	g.hooks = newHookRuntime(d.Redis)

	var gen core.Generation
	if d.Registry != nil {
		gen = d.Registry.Current()
		g.cancels = append(g.cancels, d.Registry.OnChange(func(gen core.Generation) {
			g.table.Store(buildRouteTable(gen))
		}))
	}
	g.table.Store(buildRouteTable(gen))

	if d.Bus != nil {
		g.cancels = append(g.cancels,
			d.Bus.Subscribe(core.ChannelConfigChanged, func(payload []byte) { g.onConfigChanged(payload) }),
		)
	}
	g.wg.Add(1)
	go g.statsLoop()
	return g
}

// Close stops background work and subscriptions and flushes hook stats.
func (g *Gateway) Close() {
	g.closed.Do(func() {
		for _, c := range g.cancels {
			if c != nil {
				c()
			}
		}
		close(g.stop)
		g.wg.Wait()
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		g.hooks.flush(ctx)
	})
}

// Middleware dispatches requests matching an endpoint of an enabled plugin
// to the pipeline. Anything else (including endpoints of disabled or
// uninstalled plugins) falls through to the next handler, i.e. 404. Mount it
// with engine.Use before the core routes, or in engine.NoRoute.
func (g *Gateway) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		method, path := c.Request.Method, c.Request.URL.Path
		t := g.table.Load()
		if rt := t.match(method, path); rt != nil {
			g.serve(c, t.gen, rt.binding)
			c.Abort()
			return
		}
		c.Next()
	}
}

func (g *Gateway) onConfigChanged(payload []byte) {
	var msg struct {
		Key string `json:"key"`
	}
	_ = json.Unmarshal(payload, &msg)
	// Cheap to reload; settings, rules and the gateway section are tiny.
	g.settings.invalidate()
	g.rules.invalidate()
}

// changed invalidates local caches and tells the other nodes.
func (g *Gateway) changed(ctx context.Context, key string) {
	g.settings.invalidate()
	g.rules.invalidate()
	if g.d.Bus == nil {
		return
	}
	payload, _ := json.Marshal(map[string]string{"key": key})
	if err := g.d.Bus.Publish(context.WithoutCancel(ctx), core.ChannelConfigChanged, payload); err != nil {
		slog.WarnContext(ctx, "gateway: publish config:changed", "err", err)
	}
}

func (g *Gateway) statsLoop() {
	defer g.wg.Done()
	tick := time.NewTicker(2 * time.Second)
	defer tick.Stop()
	for {
		select {
		case <-g.stop:
			return
		case <-tick.C:
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			g.hooks.flush(ctx)
			cancel()
		}
	}
}

func (g *Gateway) nodeID() string {
	if g.d.Node == nil {
		return ""
	}
	return g.d.Node.NodeID()
}

func defaultLookupIP(ctx context.Context, host string) ([]net.IP, error) {
	addrs, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return nil, err
	}
	out := make([]net.IP, 0, len(addrs))
	for _, a := range addrs {
		out = append(out, a.IP)
	}
	return out, nil
}

// defaultHeaderWait bounds the time to the upstream response headers. A
// non-stream upstream only answers after generating the whole response.
func defaultHeaderWait(stream bool) time.Duration {
	if stream {
		return 3 * time.Minute
	}
	return 10 * time.Minute
}
