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
	RequestMode                                             string // the CLI request transport: direct or build (default)
	CLI, DataDir                                            string
	WorkingDirectory                                        string
	RuntimeMaintenanceLease                                 string
	RuntimeMaintenanceExpires                               time.Time
	MaintenanceOnly                                         bool
	Key, AdminKey                                           string
	Timeout                                                 time.Duration
	Env                                                     []string
}

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
	if o.RequestMode == "" {
		o.RequestMode = "build"
	}
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
	success := false
	defer func() {
		if !success {
			_ = os.RemoveAll(work)
		}
	}()
	timeout := o.Timeout
	if timeout <= 0 {
		timeout = time.Hour
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
	g := &Gateway{
		Runner:          &Runner{CLI: cli, Version: version, Work: work, Proxy: proxy, Overrides: overrides, Env: o.Env, WorkingDirectory: o.WorkingDirectory},
		RequestMode:     o.RequestMode,
		CLIInfo:         cliInfo,
		MaintenanceOnly: o.MaintenanceOnly,
		Key:             o.Key,
		Timeout:         timeout,
		Slots:           make(chan struct{}, 4),
		RequestLogDir:   logs.root,
		RequestLogs:     logs,
	}
	if g.Runner.WorkingDirectory == "" {
		g.Runner.WorkingDirectory = root
	}
	g.configureResourceReporting()
	if err := g.configureRequestIdentity(root); err != nil {
		return nil, err
	}
	admin := &authManager{cli: cli, key: o.AdminKey, work: work, proxy: proxy, overrides: overrides, version: version, requestLogs: logs, env: o.Env}
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
	mux := http.NewServeMux()
	mux.Handle(resourcePrefix+"/", resources)
	mux.Handle("/", g)
	mux.Handle("/admin/", admin)
	ctx, stop := context.WithCancel(context.Background())
	r := &Runtime{Handler: mux, Version: version, gateway: g, admin: admin, resources: resources, work: work, stop: stop, life: ctx, done: make(chan struct{})}
	r.runtimeLease, r.runtimeLeaseExpires = o.RuntimeMaintenanceLease, o.RuntimeMaintenanceExpires
	r.maintenanceOnly = o.MaintenanceOnly
	r.cliManagement = cliManagement
	r.cli = newCLICheck(version, func(ctx context.Context) (string, error) { return checkCLIVersion(ctx, cli) })
	mux.HandleFunc("/admin/cli", r.serveCLI)
	mux.HandleFunc("/admin/runtime", r.serveRuntimeMaintenance)
	go r.maintain(ctx, logs)
	success = true
	return r, nil
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
// request capabilities.
func loadPinnedCLI(o Options) (cli, version string, info cliRequestInfo, err error) {
	if cli, err = resolveCLI(o.CLI); err != nil {
		return
	}
	if version, err = checkVersion(cli); err != nil {
		return
	}
	verifyOptions := o
	if o.MaintenanceOnly {
		verifyOptions.RequestMode = ""
	}
	if err = verifyPinnedCLI(cli, version, verifyOptions); err != nil {
		return
	}
	info, infoErr := readCLIRequestInfo(cli, version, o)
	if infoErr != nil && o.ExpectedCLIVersion != "" {
		err = infoErr
		return
	}
	if !o.MaintenanceOnly && infoErr == nil && !info.supports("request_"+o.RequestMode) {
		err = fmt.Errorf("loaded CLI does not support configured request mode")
		return
	}
	info.SHA256 = o.ExpectedCLISHA256
	return
}

// newPinnedCLIManagement turns automatic release checks off for a pinned CLI.
func newPinnedCLIManagement(root, pinned string) (*cliManagement, error) {
	m, err := newCLIManagement(root)
	if err != nil || pinned == "" {
		return m, err
	}
	m.pinnedVersion = pinned
	policy := m.policy
	policy.AutoUpdate = false
	if err := m.save(policy); err != nil {
		return nil, err
	}
	return m, nil
}

// maintain prunes the request logs every minute and checks the release
// channel every ten, until ctx ends.
func (r *Runtime) maintain(ctx context.Context, logs *requestLogStore) {
	defer close(r.done)
	prune := time.NewTicker(time.Minute)
	defer prune.Stop()
	releases := time.NewTicker(10 * time.Minute)
	defer releases.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-prune.C:
			logs.prune()
		case <-releases.C:
			r.autoUpdateCLI(ctx)
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
	// found changed or missing.
	if (business || strings.HasPrefix(request.URL.Path, resourcePrefix+"/")) && r.gateway.authorized(request) {
		if err := r.cli.ready(); err != nil {
			apiError(w, 503, "api_error", err.Error())
			return
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

func (r *Runtime) CLIVersion() string { return r.cli.status().Version }

// ExecutionModes lists the request transports the loaded CLI offers; a
// maintenance-only Worker offers none.
func (r *Runtime) ExecutionModes() []string {
	if r.maintenanceOnly {
		return []string{}
	}
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

func (r *Runtime) RequestCapabilities() []string {
	if r.maintenanceOnly {
		return []string{}
	}
	return r.gateway.requestCapabilities()
}

func (r *Runtime) MaintenanceOnly() bool { return r.maintenanceOnly }

func (r *Runtime) CLIIdentity() (string, string) {
	return r.gateway.CLIInfo.Patch, r.gateway.CLIInfo.SHA256
}

func (r *Runtime) CLIReady() bool { return r.cli.ready() == nil }

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
