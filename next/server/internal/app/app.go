// Package app wires every module into one server process. It is the only
// place that imports module packages side by side; modules depend on each
// other only through internal/core interfaces.
package app

import (
	"context"
	"errors"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	runtimecontract "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/account"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/apikey"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/background"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/cluster"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/event"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/event/delivery"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/fallbackcredits"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/group"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/iam"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/job"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/messagediagnostics"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/api"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/blobs"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/dbschema"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/egress"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/grpcruntime"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/market"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/rollout"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/routes"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/sandbox"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/providerresources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/proxy"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/updater"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usage"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/webui"
	"github.com/Sub2API-Devs/sup2api/next/server/web"
)

// Run starts the server and blocks until ctx is cancelled, then shuts down
// in reverse order.
func Run(ctx context.Context, cfg *config.Config, version string, log *slog.Logger) error {
	if cfg.Managed.Enabled {
		return runManaged(ctx, cfg, version, log)
	}
	return run(ctx, cfg, version, log, nil)
}

func run(ctx context.Context, cfg *config.Config, version string, log *slog.Logger, managed *managedCore) error {
	var closers []func(context.Context)
	defer func() {
		sctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
		defer cancel()
		// The supervisor observes its own drain deadline. It must never receive
		// completion while core producers are still running after a timeout.
		if managed != nil {
			sctx = context.Background()
		}
		for i := len(closers) - 1; i >= 0; i-- {
			closers[i](sctx)
		}
	}()
	onClose := func(fn func(context.Context)) { closers = append(closers, fn) }

	// ------------------------------------------------------------ storage
	db, err := store.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("database: %w", err)
	}
	onClose(func(context.Context) { db.Close() })
	if managed == nil {
		applied, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		if err != nil {
			return fmt.Errorf("migrate: %w", err)
		}
		log.Info("migrations applied", "files", applied)
	} else {
		applied, err := prepareCoreSchema(ctx, db, managed.prepare)
		if err != nil {
			return fmt.Errorf("core schema preparation: %w", err)
		}
		log.Info("managed core schema verified", "migrations_applied", applied)
	}

	rdb, err := cluster.OpenRedis(ctx, cfg.RedisURL)
	if err != nil {
		return fmt.Errorf("redis: %w", err)
	}
	onClose(func(context.Context) { _ = rdb.Close() })

	cipher, err := secret.New(cfg.MasterKey)
	if err != nil {
		return err
	}

	// ------------------------------------------------------------ cluster
	cl := cluster.New(rdb, db.Pool, cluster.Options{NodeID: cfg.NodeID, Addr: cfg.PublicURL, HostVersion: version, Logger: log, Managed: cfg.Managed.Enabled, CoreBootID: cfg.Managed.BootID})
	if err := cl.Start(ctx); err != nil {
		return fmt.Errorf("cluster: %w", err)
	}
	onClose(func(context.Context) { cl.Close() })

	// ------------------------------------------------------------ core services
	events := event.NewPublisher(db)
	reg := registry.New()
	trust, err := pkg.NewTrustStore(cfg.Plugins.OfficialRootKeys, cfg.Plugins.AllowUnsigned)
	if err != nil {
		return fmt.Errorf("plugin trust: %w", err)
	}
	if !cfg.Plugins.VerifySignatures {
		trust.SetVerifySignatures(false)
		log.Warn("plugin signature verification is disabled (SUB2API_PLUGIN_VERIFY_SIGNATURES=false)")
	}
	// Package bytes are not in PostgreSQL. Under the shell they are kept by
	// the primary and fetched over the node network; market packages are
	// downloaded by each node. Without a shell only one node is supported.
	var packageStore blobs.Store = blobs.Dir(filepath.Join(cfg.Plugins.DataDir, "blobs"))
	if cfg.Managed.Enabled && cfg.Managed.UpdaterSocket != "" {
		packageStore = blobs.NewShell(cfg.Managed.UpdaterSocket, cfg.Managed.UpdaterToken, cfg.Plugins.MaxPackageBytes)
	}
	marketClient := &http.Client{Timeout: 60 * time.Second}
	// Packages may be 1 GiB (CONTRACTS §53.10): downloads get more time than
	// index requests.
	packageClient := &http.Client{Timeout: market.PackageDownloadTimeout}
	packageSource := &blobs.Source{Store: packageStore, MaxBytes: cfg.Plugins.MaxPackageBytes,
		Download: func(ctx context.Context, url string, limit int64) ([]byte, error) {
			return market.Fetch(ctx, packageClient, url, limit)
		}}
	// Nodes re-verify package signatures before unpacking, so revoked keys
	// and publishers stop loading everywhere.
	pkgs := registry.NewPackages(db, cfg.Plugins.DataDir, registry.WithSource(packageSource), registry.WithVerifier(
		registry.TrustVerifier(trust, db.Pool, pkg.Limits{MaxPackageBytes: cfg.Plugins.MaxPackageBytes})))
	onClose(func(context.Context) { pkgs.Close() })

	bill := billing.New(db, rdb, cl.Bus, events, reg)
	onClose(func(context.Context) { bill.Close() })
	backgroundWork := background.New(8)
	var canWork, canCoordinate func() bool
	if managed != nil {
		canWork = managed.backgroundAllowed
		canCoordinate = managed.coordinateAllowed
		backgroundWork.Admitted = canWork
	}
	settler := usage.New(db, bill, bill, events, usage.Options{CanRetry: canWork})
	settler.Start(ctx)
	onClose(settler.Stop)

	az := authz.New(authz.Deps{DB: db, Bus: cl.Bus, Plugins: reg})
	if err := az.Start(ctx); err != nil {
		return fmt.Errorf("authz: %w", err)
	}
	idm := iam.New(iam.Deps{DB: db, Redis: rdb, Config: cfg, Events: events, Authz: az})
	if managed == nil || managed.prepare.Bootstrap {
		if err := idm.Bootstrap(ctx); err != nil {
			return fmt.Errorf("bootstrap admin: %w", err)
		}
	}

	grp := group.New(db, rdb, cl.Bus, reg)
	keys := apikey.New(db, rdb, az, reg)
	keys.Cipher = cipher
	prx := proxy.New(db, cipher, cl.Bus, proxy.Options{AllowPrivate: cfg.AllowPrivateUpstream, Registry: reg})
	// One converter registry for the gateway (conversion) and the account
	// module (endpoints an account type can serve), ARCHITECTURE 6.6.
	converters := convert.Default()
	// Per-account rpm/tpm limits (CONTRACTS §18).
	limiter := account.NewLimiter(rdb)
	ccg := ccgateway.New(db, cipher)
	// Draft proxy visibility and the one-node draft sweep (CONTRACTS §49).
	ccg.Authorizer, ccg.Locker, ccg.CanWork = az, cl.Locker, canWork
	// The runtime images ship inside the active ccgateway package (§53.10).
	ccg.Bundle = func() (ccgateway.BundlePackage, bool) {
		p := reg.Package("ccgateway")
		if p == nil {
			return ccgateway.BundlePackage{}, false
		}
		return ccgateway.BundlePackage{Version: p.Version, File: p.File(), FS: p.FS()}, true
	}
	acc := account.New(account.Deps{
		CCGateway: ccg,
		DB:        db, Redis: rdb, Cipher: cipher, Registry: reg, Proxies: prx, Events: events,
		Slots: cl.Slots, Limiter: limiter, Bus: cl.Bus, AllowPrivateUpstream: cfg.AllowPrivateUpstream, Converters: converters,
		// Ownership checks and proxy_url resolution (CONTRACTS §21).
		Authorizer: az, Resolver: prx,
		// Credential refresh: one renewal per account cluster-wide, one
		// sweeping node, only once admitted (CONTRACTS §48).
		Locker: cl.Locker, CanWork: canWork,
	})
	// Register balance providers (CONTRACTS §51).
	acc.RegisterClaudeOAuthBalanceProvider()
	// Price sync sources (upstream API keys encrypted) and GET /key/prices for
	// downstream sup2api instances (CONTRACTS §17).
	bill.SetSyncDeps(billing.SyncDeps{Cipher: cipher, Keys: keys})
	go keys.Run(ctx)
	go prx.Run(ctx)
	go acc.Run(ctx)
	go ccg.Run(ctx)

	// The reconcile loop closes pre-charged usage rows (CONTRACTS §25.4). It
	// starts here rather than next to settler.Start because it needs the
	// account and proxy directories: the core sends the reconcile request
	// itself, through the account's proxy, so that a plugin with
	// asynchronous work needs neither network access nor account access of
	// its own. Only one node sweeps at a time (cl.Locker).
	settler.StartReconcile(ctx, usage.ReconcileDeps{
		Executor: backgroundWork,
		Locker:   cl.Locker, Registry: reg, Accounts: acc, Proxies: prx,
		Slots: cl.Slots, Limiter: limiter,
		AllowPrivateUpstream: cfg.AllowPrivateUpstream, NodeID: cfg.NodeID, Logger: log,
	})

	// ------------------------------------------------------------ plugin runtime
	pgAddr, err := databaseAddr(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	// Plugins reach PostgreSQL only through the address GetDSN hands out
	// (and only with db.schema); Redis and every private address are never
	// reachable through the tunnel (audit 2026-10-09 P0-3).
	var coreAddrs []string
	if ra, ok := redisAddr(cfg.RedisURL); ok {
		coreAddrs = append(coreAddrs, ra)
	}
	if cfg.Plugins.EgressAllowPrivate {
		log.Warn("plugins may reach private network addresses (SUB2API_PLUGIN_EGRESS_ALLOW_PRIVATE=true); tests and development only")
	}
	egressP := egress.New(db, egress.Options{NodeID: cfg.NodeID, DatabaseAddrs: []string{pgAddr}, CoreAddrs: coreAddrs,
		AllowPrivate: cfg.Plugins.EgressAllowPrivate, Events: events, Logger: log})
	onClose(func(context.Context) { egressP.Close() })
	launcher := sandbox.NewLauncher(sandbox.LauncherOptions{DisableWrap: cfg.Plugins.DevMode, Landlock: cfg.Plugins.Landlock, Logger: log})
	schemas := dbschema.New(db, cfg.DatabaseURL, cfg.MasterKey, cfg.Plugins.DBRoleIsolation)

	rt, err := grpcruntime.New(grpcruntime.Options{
		DB: db, Redis: rdb, Bus: cl.Bus, Locker: cl.Locker, Cipher: cipher, Node: cl.Registry, Launcher: launcher,
		Egress: egressP, Authorizer: az, Ledger: bill, Schemas: schemas, Accounts: acc,
		HostVersion: version, DataDir: cfg.Plugins.DataDir, RunDir: cfg.Plugins.RunDir,
		StrictNetwork: cfg.Plugins.StrictNetwork, Seccomp: cfg.Plugins.Seccomp, MaxMemoryMB: cfg.Plugins.MaxMemoryMB,
		Logger: log,
	})
	if err != nil {
		return fmt.Errorf("plugin runtime: %w", err)
	}

	// The request gate admits HTTP traffic; WebSocket sessions also watch it to
	// end themselves on drain, which http.Server.Shutdown cannot do for them.
	gate := &requestGate{}
	if managed != nil {
		gate.stop()
	}
	resourceStore := providerresources.New(db, providerresources.Options{})
	helperStore := helperhistory.New(db, cipher, helperhistory.Options{})
	stopHelperHistory := startHelperHistoryMaintenance(ctx, settler, helperStore, canWork)
	onClose(stopHelperHistory)
	gw := gateway.New(gateway.Deps{
		CCGateway:     ccg,
		HelperHistory: helperStore, EnableHelperHistory: true,
		Resources: resourceStore, Skills: resourceStore, Credits: fallbackcredits.New(db, 4096), Diagnostics: messagediagnostics.New(db, 4096, 0), ResourceTransport: ccg.ResourceTransport(),
		DB: db, Redis: rdb, Bus: cl.Bus, Node: cl.Registry, Registry: reg,
		Auth: keys, Pricer: bill, Balance: bill, Slots: cl.Slots,
		Accounts: acc, Proxies: prx, Settler: settler, Tasks: settler, Limiter: limiter, Quota: acc, Config: cfg, Converters: converters,
		Draining: gate.isDraining,
	})

	mutations := &cluster.PluginMutations{DB: db, Locker: cl.Locker}
	if managed != nil {
		mutations.AllowBootstrap = managed.bootstrapAllowed
	}
	defaults := install.NewDefaultsApplier(az, gw)
	ctl, err := rollout.New(rollout.Options{Mutations: mutations,
		CanCoordinate: canCoordinate,
		DB:            db, Node: cl.Registry, Bus: cl.Bus, Packages: pkgs, Registry: reg,
		Runtime: rollout.FromGRPC(rt), Schemas: schemas, Defaults: defaults, Perms: az, Events: events, Logger: log,
	})
	if err != nil {
		return fmt.Errorf("rollout: %w", err)
	}
	ctl.Start(ctx)
	onClose(ctl.Stop)
	// Polling must stop before plugin instances and their egress. Keep the
	// earlier cleanup too, for initialization errors before this point.
	onClose(settler.Stop)
	onClose(stopHelperHistory)

	inst := install.New(install.Deps{Mutations: mutations,
		DB: db, Trust: trust, Authz: az, Permissions: az, Defaults: defaults,
		Rollout: ctl, Schemas: schemas, Bus: cl.Bus, Accounts: acc, KV: rt, Nodes: cl.Registry, Packages: packageSource,
	}, install.Options{HostVersion: version, Plugins: cfg.Plugins})
	mkt := market.New(db, inst, marketClient, cfg.Plugins.MaxPackageBytes)
	if managed == nil || managed.prepare.Bootstrap {
		if err := mkt.SeedSources(ctx, cfg.Plugins.MarketSourcesJSON); err != nil {
			return fmt.Errorf("market sources: %w", err)
		}
	}
	builtinReady := &atomic.Bool{}
	if managed == nil || managed.prepare.Bootstrap {
		var stopBuiltins func(context.Context)
		if managed == nil {
			builtinReady, stopBuiltins = startBuiltinConvergence(ctx, inst, cl.Locker, reg, cfg.Plugins.BuiltinDir, log.With("component", "builtin-plugins"))
		} else {
			builtinReady, stopBuiltins = startBuiltinBootstrap(ctx, inst, cl.Locker, reg, cfg.Plugins.BuiltinDir, log.With("component", "builtin-plugins"))
		}
		onClose(stopBuiltins)
	} else {
		// A managed core that was not bootstrapped does not wait for its bundle
		// to admit the node, but it still brings the bundled plugins up to the
		// versions it carries, once it may coordinate plugins and no core plan
		// blocks plugin changes (CONTRACTS §37).
		builtinReady.Store(true)
		builtinAllowed := func() bool {
			if canCoordinate != nil && !canCoordinate() {
				return false
			}
			check, cancel := context.WithTimeout(ctx, 5*time.Second)
			defer cancel()
			busy, err := cluster.CoreUpdateBusy(check, db.Pool)
			return err == nil && !busy
		}
		onClose(startBuiltinUpgrade(ctx, inst, cl.Locker, cfg.Plugins.BuiltinDir, builtinAllowed, log.With("component", "builtin-plugins")))
	}

	jobs := job.New(db, cl.Locker, reg, log, cfg.NodeID, job.Options{Executor: backgroundWork})
	onClose(func(c context.Context) { _ = jobs.Stop(c) })
	dlv := delivery.New(db, cl.Locker, cl.Bus, reg, log, cfg.NodeID, delivery.Options{CanRun: canWork})
	onClose(func(c context.Context) { _ = dlv.Stop(c) })
	var startOnce sync.Once
	var startErr error
	startBackground := func() error {
		startOnce.Do(func() {
			if startErr = jobs.Start(ctx); startErr == nil {
				startErr = dlv.Start(ctx)
			}
		})
		return startErr
	}
	if managed == nil {
		if err := startBackground(); err != nil {
			return fmt.Errorf("background startup: %w", err)
		}
	}
	// Extraction goroutines still call plugins and submit usage after their
	// HTTP handler returns. Join them before stopping either dependency.
	// Reverse close order: drain gateway producers, then stop all usage
	// polling before the plugin controller and egress are torn down. The
	// earlier registration still covers failures during initialization.
	onClose(func(context.Context) { gw.Close() })

	// ------------------------------------------------------------ HTTP
	sharedAssets, err := webui.NewSharedAssets(db, web.Dist, webui.SharedOptions{Logger: log})
	if err != nil {
		return fmt.Errorf("console asset manifest: %w", err)
	}
	onClose(sharedAssets.Start(ctx))
	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	// Client IPs (login rate limiting, usage records) come from
	// X-Forwarded-For only when the request arrives from a trusted proxy.
	if err := engine.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		return fmt.Errorf("trusted proxies: %w", err)
	}
	// The core owns exactly the routes of manifest.CoreRoutePrefixes (/api/v1
	// through httpapi.Router, /plugin-ui, /healthz) plus the bare /api;
	// manifest/check rejects plugin endpoints that would shadow them
	// (manifest.ReservedPath) and the console fallback answers them with a
	// JSON 404. Other /api/... paths (/api/v3) are gateway paths.
	engine.GET("/"+manifest.RouteHealthz, func(c *gin.Context) {
		status, text := http.StatusOK, "ok"
		if gate.isDraining() || !cl.Registry.Healthy() || !builtinReady.Load() || !sharedAssets.Ready() {
			status, text = http.StatusServiceUnavailable, "unavailable"
		}
		c.JSON(status, gin.H{"status": text, "version": version, "node": cfg.NodeID, "boot_id": cl.Registry.BootID()})
	})
	r := httpapi.NewRouter(engine, idm, az)
	r.Authed(http.MethodGet, "/system/version", systemVersionHandler(version, cfg.Managed.Enabled, cfg.NodeID, cl.Registry.BootID()))
	updater.RegisterRoutes(r, cfg.Managed.UpdaterSocket, cfg.Managed.UpdaterToken, db)
	ccg.RegisterRoutes(r)
	audit.RegisterRoutes(r, db)
	idm.RegisterRoutes(r)
	az.RegisterRoutes(r)
	grp.RegisterRoutes(r)
	keys.RegisterRoutes(r)
	prx.RegisterRoutes(r)
	acc.RegisterRoutes(r)
	bill.RegisterRoutes(r)
	settler.RegisterRoutes(r)
	api.New(api.Deps{
		DB: db, Install: inst, Market: mkt, Rollout: ctl, Nodes: cl.Registry, Registry: reg,
		Authz: az, Cipher: cipher, Bus: cl.Bus, Jobs: jobs, HookStats: gw, Plugins: cfg.Plugins,
	}).RegisterRoutes(r)
	pr := routes.New(reg, idm, az, routes.WithHealth(cl.Registry), routes.WithVersionAssets(pkgs))
	pr.RegisterRoutes(r)
	pr.RegisterAssets(engine)
	gw.RegisterRoutes(r)

	ui, err := webui.New(web.Dist, webui.WithSharedAssets(sharedAssets))
	if err != nil {
		return fmt.Errorf("console assets: %w", err)
	}
	// Plugin-declared gateway endpoints are dynamic, so they are dispatched
	// before the console fallback instead of being registered as routes.
	engine.NoRoute(gw.Middleware(), ui.Serve)

	requestCtx, cancelRequests := context.WithCancel(context.Background())
	defer cancelRequests()
	srv := &http.Server{Addr: cfg.HTTPAddr, Handler: gate.wrap(engine), ReadHeaderTimeout: 10 * time.Second,
		BaseContext: func(net.Listener) context.Context { return requestCtx }}
	listener, err := net.Listen("tcp", cfg.HTTPAddr)
	if err != nil {
		return fmt.Errorf("http listen: %w", err)
	}
	defer listener.Close()
	errc := make(chan error, 1)
	go func() {
		log.Info("listening", "addr", cfg.HTTPAddr, "boot_id", cl.Registry.BootID(), "version", version)
		if err := srv.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errc <- err
		}
	}()
	if managed != nil {
		managed.mu.Lock()
		managed.gate, managed.start, managed.active = gate, startBackground, backgroundWork.Active
		managed.validate = func(c context.Context, a runtimecontract.Admission) error {
			return verifyAdmission(c, db, cfg.NodeID, a)
		}
		managed.liveValidate = func(c context.Context, a runtimecontract.Admission) error {
			return verifyLiveAdmission(c, db, cfg.NodeID, a)
		}
		managed.check = func(c context.Context) (string, error) {
			if !cl.Registry.Healthy() || !sharedAssets.Ready() || !builtinReady.Load() {
				return "", errors.New("node dependencies are not ready")
			}
			return approvedPluginsReady(c, db, reg, version)
		}
		if managed.mode == "preparing" {
			managed.mode = "prepared"
		}
		managed.mu.Unlock()
	}
	select {
	case <-ctx.Done():
	case err := <-errc:
		return fmt.Errorf("http: %w", err)
	}
	// Expose non-readiness before closing the listener, so health-based
	// balancers can remove this node while existing requests are still alive.
	gate.stop()
	time.Sleep(cfg.ShutdownDelay)
	return shutdownHTTP(srv, gate, cancelRequests, 30*time.Second)
}

// databaseAddr extracts host:port from a PostgreSQL URL or key=value DSN;
// plugins reach this address through the egress tunnel.
func databaseAddr(dsn string) (string, error) {
	host, port := "", "5432"
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		u, err := url.Parse(dsn)
		if err != nil {
			return "", fmt.Errorf("parse database url: %w", err)
		}
		host = u.Hostname()
		if p := u.Port(); p != "" {
			port = p
		}
	} else {
		for _, f := range strings.Fields(dsn) {
			k, v, _ := strings.Cut(f, "=")
			switch k {
			case "host":
				host = strings.Trim(v, "'")
			case "port":
				port = strings.Trim(v, "'")
			}
		}
	}
	if host == "" {
		host = "localhost"
	}
	return net.JoinHostPort(host, port), nil
}

// redisAddr is the TCP "host:port" of the Redis URL (false for a unix
// socket or an unparsable URL).
func redisAddr(raw string) (string, bool) {
	o, err := cluster.ParseRedisURL(raw)
	if err != nil || o.Network == "unix" || o.Addr == "" {
		return "", false
	}
	return o.Addr, true
}
