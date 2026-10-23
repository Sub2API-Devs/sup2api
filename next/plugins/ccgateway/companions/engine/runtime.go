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
)

// Options configures one account's gateway without changing process-wide env.
type Options struct {
	ExpectedCLIVersion, ExpectedCLISHA256, ExpectedCLIPatch string
	RequestMode                                             string // single-request CLI transport: direct or build (default)
	InternalBaseURL                                         string
	CLI, Plugin, DataDir, CacheDir                          string
	WorkingDirectory                                        string
	RuntimeMaintenanceLease                                 string
	RuntimeMaintenanceExpires                               time.Time
	MaintenanceOnly                                         bool
	Key, AdminKey, NativeTools                              string
	Timeout                                                 time.Duration
	CacheLimit                                              int64
	Env                                                     []string
}

// Runtime shares the original runner, history and management APIs between
// the gateway command and account workers.
type Runtime struct {
	catalog       *cliCatalog
	catalogDone   chan struct{}
	cliManagement *cliManagement
	cliGate       sync.RWMutex
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
	if o.RequestMode == "" {
		o.RequestMode = "build"
	}
	if err := validateRequestMode(o.RequestMode); err != nil {
		return nil, err
	}
	if o.Key == "" {
		return nil, fmt.Errorf("CCG_API_KEY is required for an account worker")
	}
	if o.AdminKey != "" && o.AdminKey == o.Key {
		return nil, fmt.Errorf("CCG_ADMIN_KEY must differ from CCG_API_KEY")
	}
	if o.DataDir == "" {
		return nil, fmt.Errorf("worker data directory is required")
	}
	cli, err := resolveCLI(o.CLI)
	if err != nil {
		return nil, err
	}
	version, err := checkVersion(cli)
	if err != nil {
		return nil, err
	}
	verifyOptions := o
	if o.MaintenanceOnly {
		verifyOptions.RequestMode = ""
	}
	if err := verifyPinnedCLI(cli, version, verifyOptions); err != nil {
		return nil, err
	}
	cliInfo, infoErr := readCLIRequestInfo(cli, version, o)
	if infoErr != nil && o.ExpectedCLIVersion != "" {
		return nil, infoErr
	}
	if !o.MaintenanceOnly && infoErr == nil && !cliInfo.supports("request_"+o.RequestMode) {
		return nil, fmt.Errorf("loaded CLI does not support configured request mode")
	}
	cliInfo.SHA256 = o.ExpectedCLISHA256
	root, err := filepath.Abs(o.DataDir)
	if err != nil {
		return nil, err
	}
	if err = os.MkdirAll(root, 0700); err != nil {
		return nil, err
	}
	if o.WorkingDirectory != "" {
		if !filepath.IsAbs(o.WorkingDirectory) {
			return nil, fmt.Errorf("trusted account working directory must be absolute")
		}
		info, err := os.Stat(o.WorkingDirectory)
		if err != nil || !info.IsDir() {
			return nil, fmt.Errorf("trusted account working directory is unavailable")
		}
	}
	work, err := os.MkdirTemp(root, "worker-")
	if err != nil {
		return nil, err
	}
	success := false
	defer func() {
		if !success {
			_ = os.RemoveAll(work)
		}
	}()
	plugin := o.Plugin
	if plugin == "" {
		plugin, err = extractMod(work)
		if err != nil {
			return nil, err
		}
	} else if _, err = os.Stat(filepath.Join(plugin, "hooks", "hooks.json")); err != nil {
		return nil, fmt.Errorf("invalid worker Mod directory: %w", err)
	}
	cacheDir := o.CacheDir
	if cacheDir == "" {
		cacheDir = filepath.Join(root, "cache")
	}
	limit := o.CacheLimit
	if limit <= 0 {
		limit = 128 << 20
	}
	cache, err := newCache(cacheDir, limit)
	if err != nil {
		return nil, err
	}
	timeout := o.Timeout
	if timeout <= 0 {
		timeout = time.Hour
	}
	native, err := nativeAllowlist(o.NativeTools)
	if err != nil {
		return nil, err
	}
	proxy, err := NewProxyConfigStore(root, o.AdminKey)
	if err != nil {
		return nil, err
	}
	logs, err := newRequestLogStore(root)
	if err != nil {
		return nil, err
	}
	overrides := NewEnvironmentOverrides(root)
	g := &Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: work, Proxy: proxy, Overrides: overrides, Env: o.Env, InternalBaseURL: o.InternalBaseURL}, Cache: cache, Key: o.Key, Timeout: timeout, Slots: make(chan struct{}, 4), NativeAllowed: native, RequestLogDir: logs.root}
	g.RequestLogs = logs
	g.RequestMode = o.RequestMode
	g.CLIInfo = cliInfo
	g.MaintenanceOnly = o.MaintenanceOnly
	g.configureResourceReporting()
	if err := g.configureRequestIdentity(root); err != nil {
		return nil, err
	}
	g.Runner.WorkingDirectory = o.WorkingDirectory
	if g.Runner.WorkingDirectory == "" {
		g.Runner.WorkingDirectory = root
	}
	admin := &authManager{cli: cli, key: o.AdminKey, work: work, proxy: proxy, overrides: overrides, version: version, requestLogs: g.RequestLogs, env: o.Env}
	resources, err := newResourceBroker(g, admin, root)
	if err != nil {
		return nil, err
	}
	g.resources = resources
	cliManagement, err := newCLIManagement(root)
	if err != nil {
		_ = resources.lease.Close()
		return nil, err
	}
	if o.ExpectedCLIVersion != "" {
		cliManagement.pinnedVersion = o.ExpectedCLIVersion
		policy := cliManagement.policy
		policy.AutoUpdate = false
		if err := cliManagement.save(policy); err != nil {
			_ = resources.lease.Close()
			return nil, err
		}
	}
	mux := http.NewServeMux()
	mux.Handle(resourcePrefix+"/", resources)
	mux.Handle("/", g)
	mux.Handle("/admin/", admin)
	ctx, stop := context.WithCancel(context.Background())
	r := &Runtime{Handler: mux, Version: version, gateway: g, admin: admin, resources: resources, work: work, stop: stop, life: ctx, done: make(chan struct{})}
	r.runtimeLease, r.runtimeLeaseExpires = o.RuntimeMaintenanceLease, o.RuntimeMaintenanceExpires
	r.maintenanceOnly = o.MaintenanceOnly
	r.cliManagement = cliManagement
	mux.HandleFunc("/admin/cli", r.serveCLI)
	mux.HandleFunc("/admin/cli/catalog", r.serveCLI)
	mux.HandleFunc("/admin/runtime", r.serveRuntimeMaintenance)
	r.catalog = newCLICatalog(func(ctx context.Context) (string, error) { return checkCLIVersion(ctx, cli) }, func(ctx context.Context, version string) (nativeCatalogue, error) {
		tools, err := g.Runner.captureToolCatalog(ctx, version)
		if err == nil && r.catalog.current.Load() != nil {
			err = g.Runner.verifyCLICatalog(ctx, version, tools)
		}
		return tools, err
	})
	r.catalogDone = make(chan struct{})
	go func() {
		defer close(r.catalogDone)
		_ = r.catalog.sync(ctx)
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				_ = r.catalog.sync(ctx)
				r.autoUpdateCLI(ctx)
			}
		}
	}()
	go func() {
		defer close(r.done)
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				cache.prune()
				pruneRequestLogs(logs.root)
			}
		}
	}()
	success = true
	return r, nil
}

func (r *Runtime) ServeHTTP(w http.ResponseWriter, request *http.Request) {
	if serveCLICatalogProbe(w, request) || serveGatewayRender(w, request) {
		return
	}
	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		apiError(w, 503, "api_error", "Worker is shutting down")
		return
	}
	business := request.URL.Path == "/v1/messages" || request.URL.Path == "/v1/ccgateway/probe"
	if business && r.maintenanceOnly {
		r.mu.Unlock()
		apiError(w, 409, "configuration_error", "Retired native runtime requires packaged Worker and CLI activation")
		return
	}
	if business && r.runtimeLease != "" {
		r.mu.Unlock()
		apiError(w, 503, "api_error", "Worker runtime maintenance is in progress")
		return
	}
	if business {
		r.requests++
	}
	r.active.Add(1)
	r.mu.Unlock()
	defer r.active.Done()
	if business {
		defer func() { r.mu.Lock(); r.requests--; r.mu.Unlock() }()
	}
	ctx, cancel := context.WithCancel(request.Context())
	stop := context.AfterFunc(r.life, cancel)
	defer stop()
	defer cancel()
	if r.catalog != nil && r.gateway.authorized(request) && (request.URL.Path == "/v1/messages" || strings.HasPrefix(request.URL.Path, resourcePrefix+"/")) {
		if !r.cliGate.TryRLock() {
			apiError(w, 503, "api_error", "Claude Code maintenance is in progress")
			return
		}
		defer r.cliGate.RUnlock()
		snapshot, err := r.catalog.snapshot()
		if err != nil {
			apiError(w, 503, "api_error", err.Error())
			return
		}
		ctx = context.WithValue(ctx, cliSnapshotKey{}, snapshot)
	}
	r.Handler.ServeHTTP(w, request.WithContext(ctx))
}

func (r *Runtime) CLIVersion() string {
	if r.catalog != nil {
		return r.catalog.status().Version
	}
	return r.Version
}

func (r *Runtime) ExecutionModes() []string {
	if r.maintenanceOnly {
		return []string{}
	}
	if r.gateway != nil && r.gateway.RequestMode != "" {
		var modes []string
		for _, mode := range []string{"request_direct", "request_build"} {
			if r.gateway.CLIInfo.supports(mode) {
				modes = append(modes, mode)
			}
		}
		if len(modes) > 0 {
			return modes
		}
		return []string{"request_" + r.gateway.RequestMode}
	}
	return []string{"native"}
}

func (r *Runtime) RequestCapabilities() []string {
	if r.gateway == nil || r.maintenanceOnly {
		return []string{}
	}
	return r.gateway.requestCapabilities()
}

func (r *Runtime) MaintenanceOnly() bool { return r.maintenanceOnly }

func (r *Runtime) CLIIdentity() (string, string) {
	if r.gateway == nil {
		return "", ""
	}
	return r.gateway.CLIInfo.Patch, r.gateway.CLIInfo.SHA256
}

func (r *Runtime) CLIReady() bool {
	if !r.cliGate.TryRLock() {
		return false
	}
	defer r.cliGate.RUnlock()
	if r.catalog == nil {
		return true
	}
	_, err := r.catalog.snapshot()
	return err == nil
}

func (r *Runtime) Close() error {
	r.once.Do(func() {
		r.mu.Lock()
		r.closed = true
		r.mu.Unlock()
		r.stop()
		r.active.Wait()
		<-r.done
		if r.catalogDone != nil {
			<-r.catalogDone
		}
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
