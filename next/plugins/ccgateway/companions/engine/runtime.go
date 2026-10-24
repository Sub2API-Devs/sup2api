package engine

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

// Options configures one account's gateway without changing process-wide env.
type Options struct {
	ExpectedCLIVersion, ExpectedCLISHA256, ExpectedCLIPatch string
	// CLIChecksumVerified: the caller already checked ExpectedCLISHA256 on a
	// root-owned file a non-root Worker cannot change (the active runtime),
	// so the CLI is not hashed again.
	CLIChecksumVerified       bool
	RequestMode               string // the CLI request transport: direct or build (the Worker's config defaults it)
	CLI, DataDir              string
	WorkingDirectory          string
	RuntimeMaintenanceLease   string
	RuntimeMaintenanceExpires time.Time
	MaintenanceOnly           bool
	Key, AdminKey             string
	Timeout                   time.Duration
	// Slots is how many requests the account runs at once (DefaultRequestSlots
	// when zero); one more is refused with 429 before its body is read.
	Slots int
	Env   []string
}

// DefaultRequestSlots is the account's concurrent requests by default.
const DefaultRequestSlots = 4

// maxRequestSlots bounds Options.Slots: each slot is a CLI process.
const maxRequestSlots = 64

// Runtime is one account's Worker: the gateway (the CLI's request command per
// /v1/messages), the resource broker and the management APIs over one pinned
// CLI.
type Runtime struct {
	cli           *cliCheck
	cliManagement *cliManagement
	http.Handler
	Version             string
	gateway             *Gateway
	admin               *authManager
	resources           *resourceBroker
	work                string
	stop                context.CancelFunc
	done                chan struct{}
	life                context.Context
	mu                  sync.Mutex
	closed              bool
	active              sync.WaitGroup
	once                sync.Once
	err                 error
	requests            int
	runtimeLease        string
	runtimeLeaseExpires time.Time
	maintenanceOnly     bool
}

func NewRuntime(o Options) (*Runtime, error) {
	if err := validateOptions(o); err != nil {
		return nil, err
	}
	cli, version, cliInfo, err := loadPinnedCLI(o)
	if err != nil {
		return nil, err
	}
	root, err := filepath.Abs(o.DataDir)
	if err != nil {
		return nil, err
	}
	if err = os.MkdirAll(root, 0700); err != nil {
		return nil, err
	}
	work, err := os.MkdirTemp(root, "worker-")
	if err != nil {
		return nil, err
	}
	r, err := newRuntime(o, &Runner{CLI: cli, Version: version, Work: work, Env: o.Env, WorkingDirectory: o.WorkingDirectory}, cliInfo, root)
	if err != nil {
		_ = os.RemoveAll(work)
		return nil, err
	}
	go r.maintain(r.life, r.gateway.RequestLogs)
	return r, nil
}

// newRuntime assembles the account's Worker over the loaded CLI (runner)
// and its data directory root.
func newRuntime(o Options, runner *Runner, cliInfo cliRequestInfo, root string) (*Runtime, error) {
	g, err := newGateway(o, runner, cliInfo, root)
	if err != nil {
		return nil, err
	}
	admin := &authManager{cli: runner.CLI, key: o.AdminKey, work: runner.Work, proxy: runner.Proxy, overrides: runner.Overrides, version: runner.Version, requestLogs: g.RequestLogs, env: o.Env}
	resources, err := newResourceBroker(g, admin, root)
	if err != nil {
		return nil, err
	}
	g.resources = resources
	cliManagement, err := newPinnedCLIManagement(root, o.ExpectedCLIVersion)
	if err != nil {
		_ = resources.lease.Close()
		return nil, err
	}
	ctx, stop := context.WithCancel(context.Background())
	r := &Runtime{Version: runner.Version, gateway: g, admin: admin, resources: resources, work: runner.Work, stop: stop, life: ctx, done: make(chan struct{})}
	r.runtimeLease, r.runtimeLeaseExpires = o.RuntimeMaintenanceLease, o.RuntimeMaintenanceExpires
	r.maintenanceOnly = o.MaintenanceOnly
	r.cliManagement = cliManagement
	r.cli = newCLICheck(runner.Version, func(ctx context.Context) (string, error) { return checkCLIVersion(ctx, runner.CLI) })
	r.Handler = r.routes()
	return r, nil
}

// newGateway is the account's gateway: the CLI's runner with the account's
// proxy and environment, its request logs, slots and identity mapping.
func newGateway(o Options, runner *Runner, cliInfo cliRequestInfo, root string) (*Gateway, error) {
	var err error
	if runner.Proxy, err = NewProxyConfigStore(root, o.AdminKey); err != nil {
		return nil, err
	}
	logs, err := newRequestLogStore(root)
	if err != nil {
		return nil, err
	}
	runner.Overrides = NewEnvironmentOverrides(root)
	if runner.WorkingDirectory == "" {
		runner.WorkingDirectory = root
	}
	timeout, slots := o.Timeout, o.Slots
	if timeout <= 0 {
		timeout = features.RequestTimeout
	}
	if slots == 0 {
		slots = DefaultRequestSlots
	}
	g := &Gateway{Runner: runner, RequestMode: o.RequestMode, CLIInfo: cliInfo, MaintenanceOnly: o.MaintenanceOnly, Key: o.Key, Timeout: timeout, Slots: make(chan struct{}, slots), RequestLogs: logs}
	g.configureResourceReporting()
	if err := g.configureRequestIdentity(root); err != nil {
		return nil, err
	}
	return g, nil
}

// routes is the Worker's HTTP surface: the gateway, the resource broker and
// the management APIs.
func (r *Runtime) routes() http.Handler {
	mux := http.NewServeMux()
	mux.Handle(resourcePrefix+"/", r.resources)
	mux.Handle("/", r.gateway)
	mux.Handle("/admin/", r.admin)
	mux.HandleFunc("/admin/cli", r.serveCLI)
	mux.HandleFunc("/admin/runtime", r.serveRuntimeMaintenance)
	return mux
}

func validateOptions(o Options) error {
	if err := validateRequestMode(o.RequestMode); err != nil {
		return err
	}
	if o.Key == "" {
		return fmt.Errorf("CCG_API_KEY is required for an account worker")
	}
	if o.AdminKey != "" && o.AdminKey == o.Key {
		return fmt.Errorf("CCG_ADMIN_KEY must differ from CCG_API_KEY")
	}
	if o.DataDir == "" {
		return fmt.Errorf("worker data directory is required")
	}
	if o.Slots < 0 || o.Slots > maxRequestSlots {
		return fmt.Errorf("request slots must be between 1 and %d", maxRequestSlots)
	}
	if o.WorkingDirectory == "" {
		return nil
	}
	if !filepath.IsAbs(o.WorkingDirectory) {
		return fmt.Errorf("trusted account working directory must be absolute")
	}
	if info, err := os.Stat(o.WorkingDirectory); err != nil || !info.IsDir() {
		return fmt.Errorf("trusted account working directory is unavailable")
	}
	return nil
}

// loadPinnedCLI resolves the CLI, checks it is the pinned one and reads its
// request capabilities. A Worker that serves requests needs them: a CLI that
// cannot say it runs the configured mode would refuse every request (409)
// while reporting healthy, so it does not start. A maintenance-only Worker
// serves no request and starts with no capabilities.
func loadPinnedCLI(o Options) (cli, version string, info cliRequestInfo, err error) {
	if cli, err = resolveCLI(o.CLI); err != nil {
		return
	}
	if version, err = checkVersion(cli); err != nil {
		return
	}
	info, err = verifyPinnedCLI(cli, version, o)
	switch {
	case err != nil && o.MaintenanceOnly && !o.pinned():
		info, err = cliRequestInfo{}, nil
	case err == nil && !o.MaintenanceOnly && !info.supports("request_"+o.RequestMode):
		err = fmt.Errorf("loaded CLI does not support the configured request mode")
	}
	if err != nil {
		return
	}
	info.SHA256 = o.ExpectedCLISHA256
	return
}

// pinned says whether the Worker is configured with the CLI it must run.
func (o Options) pinned() bool {
	return o.ExpectedCLIVersion != "" || o.ExpectedCLISHA256 != "" || o.ExpectedCLIPatch != ""
}

// newPinnedCLIManagement turns automatic release checks off for a pinned CLI.
// Only in memory: the saved settings are the console's, and a pinned Worker
// refuses turning them on (putCLIPolicy).
func newPinnedCLIManagement(root, pinned string) (*cliManagement, error) {
	m, err := newCLIManagement(root)
	if err != nil || pinned == "" {
		return m, err
	}
	m.pinnedVersion = pinned
	m.policy.AutoUpdate = false
	return m, nil
}

// maintain prunes the request logs every minute until ctx ends. Release
// channels are not polled: a Worker runs a fixed, packaged CLI, so only the
// explicit "check" action refreshes latest_version.
func (r *Runtime) maintain(ctx context.Context, logs *requestLogStore) {
	defer close(r.done)
	prune := time.NewTicker(time.Minute)
	defer prune.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-prune.C:
			logs.prune()
		}
	}
}

func (r *Runtime) ServeHTTP(w http.ResponseWriter, request *http.Request) {
	business := request.URL.Path == "/v1/messages" || request.URL.Path == "/v1/ccgateway/probe"
	if !r.admit(w, business) {
		return
	}
	defer r.release(business)
	ctx, cancel := context.WithCancel(request.Context())
	stop := context.AfterFunc(r.life, cancel)
	defer stop()
	defer cancel()
	// A request runs on the CLI read at startup, never on one a recheck
	// found changed or missing. The key is compared once here; the gateway
	// and the resource broker read the answer (withAuthorization).
	if business || strings.HasPrefix(request.URL.Path, resourcePrefix+"/") {
		authorized := r.gateway.keyMatches(request)
		ctx = withAuthorization(ctx, authorized)
		if authorized {
			if err := r.cli.ready(); err != nil {
				apiError(w, 503, "api_error", err.Error())
				return
			}
		}
	}
	r.Handler.ServeHTTP(w, request.WithContext(ctx))
}

// admit counts the request in, or refuses it while the Worker closes or its
// runtime is being maintained.
func (r *Runtime) admit(w http.ResponseWriter, business bool) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	switch {
	case r.closed:
		apiError(w, 503, "api_error", "Worker is shutting down")
		return false
	case business && r.maintenanceOnly:
		apiError(w, 409, "configuration_error", "Retired native runtime requires packaged Worker and CLI activation")
		return false
	case business && r.runtimeLease != "":
		apiError(w, 503, "api_error", "Worker runtime maintenance is in progress")
		return false
	}
	if business {
		r.requests++
	}
	r.active.Add(1)
	return true
}

func (r *Runtime) release(business bool) {
	if business {
		r.mu.Lock()
		r.requests--
		r.mu.Unlock()
	}
	r.active.Done()
}

// RuntimeFacts is what a Worker says about itself. Its two health answers
// are built from it, each keeping its own field names: the gateway's
// /healthz for the core (Gateway.ServeHTTP) and the Worker's /health for the
// controller.
type RuntimeFacts struct {
	// CLIVersion is the CLI requests run on, read at startup; InstalledCLI is
	// what the last recheck found (they differ once the file changed).
	CLIVersion, InstalledCLI string
	CLIPatch, CLISHA256      string
	// ExecutionModes and Capabilities are what the loaded CLI offers; a
	// maintenance-only Worker offers none.
	ExecutionModes, Capabilities []string
	Slots                        int
	MaintenanceOnly              bool
	// Ready: the last recheck found the CLI read at startup.
	Ready bool
}

// facts are the gateway's part of RuntimeFacts.
func (g *Gateway) facts() RuntimeFacts {
	f := RuntimeFacts{CLIVersion: g.Runner.Version, CLIPatch: g.CLIInfo.Patch, CLISHA256: g.CLIInfo.SHA256, ExecutionModes: []string{}, Capabilities: g.requestCapabilities(), Slots: cap(g.Slots), MaintenanceOnly: g.MaintenanceOnly}
	if g.MaintenanceOnly {
		return f
	}
	for _, mode := range []string{"request_direct", "request_build"} {
		if g.CLIInfo.supports(mode) {
			f.ExecutionModes = append(f.ExecutionModes, mode)
		}
	}
	return f
}

// Facts is the Worker's RuntimeFacts now.
func (r *Runtime) Facts() RuntimeFacts {
	f := r.gateway.facts()
	f.InstalledCLI = r.cli.status().Version
	f.Ready = r.cli.ready() == nil
	return f
}

func (r *Runtime) Close() error {
	r.once.Do(func() {
		r.mu.Lock()
		r.closed = true
		r.mu.Unlock()
		r.stop()
		r.active.Wait()
		<-r.done
		r.admin.mu.Lock()
		r.admin.end()
		r.admin.mu.Unlock()
		if r.resources != nil {
			_ = r.resources.lease.Close()
		}
		r.err = os.RemoveAll(r.work)
	})
	return r.err
}
