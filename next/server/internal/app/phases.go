package app

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"

	runtimecontract "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/account"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/apikey"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/background"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/cluster"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/environment"
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
	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/notify"
	observer "github.com/Sub2API-Devs/sup2api/next/server/internal/observation"
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
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ratelimit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/updater"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usage"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/webui"
	"github.com/Sub2API-Devs/sup2api/next/server/web"
)

// openStorage connects PostgreSQL (running or verifying migrations) and the
// Redis-protocol cache, and builds the credential cipher.
func (b *boot) openStorage() error {
	db, err := store.Open(b.ctx, b.cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("database: %w", err)
	}
	b.db = db
	b.stopper.add("db", func(context.Context) { db.Close() })
	if b.managed == nil {
		applied, err := store.Migrate(b.ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		if err != nil {
			return fmt.Errorf("migrate: %w", err)
		}
		b.log.Info("migrations applied", "files", applied)
	} else {
		applied, err := prepareCoreSchema(b.ctx, db, b.managed.prepare)
		if err != nil {
			return fmt.Errorf("core schema preparation: %w", err)
		}
		b.log.Info("managed core schema verified", "migrations_applied", applied)
	}

	rdb, err := cluster.OpenRedis(b.ctx, b.cfg.RedisURL)
	if err != nil {
		return fmt.Errorf("redis: %w", err)
	}
	b.rdb = rdb
	b.stopper.add("redis", func(context.Context) { _ = rdb.Close() })

	cipher, err := secret.New(b.cfg.MasterKey)
	if err != nil {
		return err
	}
	b.cipher = cipher
	return nil
}

// startCluster joins the node registry and heartbeat.
func (b *boot) startCluster() error {
	b.cl = cluster.New(b.rdb, b.db.Pool, cluster.Options{NodeID: b.cfg.NodeID, Addr: b.cfg.PublicURL, HostVersion: b.version, Logger: b.log, Managed: b.cfg.Managed.Enabled, CoreBootID: b.cfg.Managed.BootID})
	if err := b.cl.Start(b.ctx); err != nil {
		return fmt.Errorf("cluster: %w", err)
	}
	b.stopper.add("cluster", func(context.Context) { b.cl.Close() })
	return nil
}

// buildCoreServices builds and starts the modules the request path depends on:
// billing, usage settlement, authz/iam, the account and proxy directories and
// the ccgateway controller. The trust store is returned for the plugin runtime
// phase instead of being kept on the boot.
func (b *boot) buildCoreServices() (*pkg.TrustStore, error) {
	cfg := b.cfg
	b.events = event.NewPublisher(b.db)
	b.reg = registry.New()
	trust, err := pkg.NewTrustStore(cfg.Plugins.OfficialRootKeys, cfg.Plugins.AllowUnsigned)
	if err != nil {
		return nil, fmt.Errorf("plugin trust: %w", err)
	}
	if !cfg.Plugins.VerifySignatures {
		trust.SetVerifySignatures(false)
		b.log.Warn("plugin signature verification is disabled (SUB2API_PLUGIN_VERIFY_SIGNATURES=false)")
	}
	// Package bytes are not in PostgreSQL. Under the shell they are kept by
	// the primary and fetched over the node network; market packages are
	// downloaded by each node. Without a shell only one node is supported.
	packageStore := blobs.Store(blobs.Dir(filepath.Join(cfg.Plugins.DataDir, "blobs")))
	if cfg.Managed.Enabled && cfg.Managed.UpdaterSocket != "" {
		packageStore = blobs.NewShell(cfg.Managed.UpdaterSocket, cfg.Managed.UpdaterToken, cfg.Plugins.MaxPackageBytes)
	}
	b.marketClient = &http.Client{Timeout: 60 * time.Second}
	// Packages may be 1 GiB (CONTRACTS §53.10): downloads get more time than
	// index requests.
	packageHTTP := &http.Client{Timeout: market.PackageDownloadTimeout}
	b.packageSrc = &blobs.Source{Store: packageStore, MaxBytes: cfg.Plugins.MaxPackageBytes,
		Download: func(ctx context.Context, url string, limit int64) ([]byte, error) {
			return market.Fetch(ctx, packageHTTP, url, limit)
		}}
	// Nodes re-verify package signatures before unpacking, so revoked keys
	// and publishers stop loading everywhere.
	pkgs := registry.NewPackages(b.db, cfg.Plugins.DataDir, registry.WithSource(b.packageSrc), registry.WithVerifier(
		registry.TrustVerifier(trust, b.db.Pool, pkg.Limits{MaxPackageBytes: cfg.Plugins.MaxPackageBytes})))
	b.pkgs = pkgs
	b.stopper.add("packages", func(context.Context) { pkgs.Close() })

	bill := billing.New(b.db, b.rdb, b.cl.Bus, b.events, b.reg)
	b.bill = bill
	b.stopper.add("billing", func(context.Context) { bill.Close() })
	b.work = background.New(8)
	if b.managed != nil {
		b.canWork = b.managed.backgroundAllowed
		b.canCoordinate = b.managed.coordinateAllowed
		b.work.Admitted = b.canWork
	}
	b.env = environment.New(b.db, b.cl.Bus)
	b.stopper.add("environment", b.env.Close)
	b.settler = usage.New(b.db, bill, bill, b.events, usage.Options{CanRetry: b.canWork, Environment: b.env})
	b.settler.Start(b.ctx)
	b.stopper.add("settler", b.settler.Stop)
	b.ntf = notify.New(b.db, b.reg, notify.Options{CanRun: b.canWork})
	b.ntf.Start(b.ctx)
	b.stopper.add("notifications", b.ntf.Stop)

	az := authz.New(authz.Deps{DB: b.db, Bus: b.cl.Bus, Plugins: b.reg})
	if err := az.Start(b.ctx); err != nil {
		return nil, fmt.Errorf("authz: %w", err)
	}
	b.az = az
	b.settler.Authz = az
	b.idm = iam.New(iam.Deps{DB: b.db, Redis: b.rdb, Config: cfg, Events: b.events, Authz: az})
	if b.managed == nil || b.managed.prepare.Bootstrap {
		if err := b.idm.Bootstrap(b.ctx); err != nil {
			return nil, fmt.Errorf("bootstrap admin: %w", err)
		}
	}

	b.grp = group.New(b.db, b.rdb, b.cl.Bus, b.reg)
	b.keys = apikey.New(b.db, b.rdb, az, b.reg)
	b.keys.Cipher = b.cipher
	// Per-key caps the owners set (CONTRACTS §60): minute windows and slots.
	b.keys.Windows, b.keys.Slots = ratelimit.NewMinute(b.rdb, "apikey"), b.cl.Slots
	b.keys.Balances = b.bill
	b.prx = proxy.New(b.db, b.cipher, b.cl.Bus, proxy.Options{AllowPrivate: cfg.AllowPrivateUpstream, Registry: b.reg, Events: b.events})
	// One converter registry for the gateway (conversion) and the account
	// module (endpoints an account type can serve), ARCHITECTURE 6.6.
	b.converters = convert.Default()
	// Per-account rpm/tpm limits (CONTRACTS §18).
	b.limiter = account.NewLimiter(b.rdb)
	b.stats = account.NewStats(b.rdb, b.db, b.cl.Slots, b.cl.Bus)
	b.stats.Start()
	b.stopper.add("account-stats", b.stats.Close)
	b.ccg = ccgateway.New(b.db, b.cipher)
	// Draft proxy visibility and the one-node draft sweep (CONTRACTS §49).
	b.ccg.Authorizer, b.ccg.Locker, b.ccg.CanWork = az, b.cl.Locker, b.canWork
	// Account, proxy and configuration changes reach the request cache and
	// the reconciler of every node.
	b.ccg.Bus = b.cl.Bus
	// The runtime images ship inside the active ccgateway package (§53.10).
	b.ccg.Bundle = func() (ccgateway.BundlePackage, bool) {
		p := b.reg.Package("ccgateway")
		if p == nil {
			return ccgateway.BundlePackage{}, false
		}
		return ccgateway.BundlePackage{Version: p.Version, File: p.File(), FS: p.FS()}, true
	}
	b.acc = account.New(account.Deps{
		CCGateway:          b.ccg,
		LifecycleResources: map[string]core.AccountLifecycleResource{"ccgateway": b.ccg},
		DB:                 b.db, Redis: b.rdb, Cipher: b.cipher, Registry: b.reg, Proxies: b.prx, Events: b.events,
		Slots: b.cl.Slots, Limiter: b.limiter, Stats: b.stats, Bus: b.cl.Bus, AllowPrivateUpstream: cfg.AllowPrivateUpstream, Converters: b.converters,
		// Ownership checks and proxy_url resolution (CONTRACTS §21).
		Authorizer: az, Resolver: b.prx,
		// Credential refresh: one renewal per account cluster-wide, one
		// sweeping node, only once admitted (CONTRACTS §48).
		Locker: b.cl.Locker, CanWork: b.canWork,
	})
	// Register balance providers (CONTRACTS §51).
	b.acc.RegisterClaudeOAuthBalanceProvider()
	// A changed subscription type recomputes automatic model lists (§59);
	// account already imports ccgateway, so the hook is wired here.
	b.ccg.FactsObserved = b.acc.FactsObserved
	// Price sync sources (upstream API keys encrypted) and GET /key/prices for
	// downstream sup2api instances (CONTRACTS §17).
	b.bill.SetSyncDeps(billing.SyncDeps{Cipher: b.cipher, Keys: b.keys})
	go b.keys.Run(b.ctx)
	go b.prx.Run(b.ctx)
	go b.acc.Run(b.ctx)
	go b.ccg.Run(b.ctx)

	// The reconcile loop closes pre-charged usage rows (CONTRACTS §25.4). It
	// starts here rather than next to settler.Start because it needs the
	// account and proxy directories: the core sends the reconcile request
	// itself, through the account's proxy, so that a plugin with
	// asynchronous work needs neither network access nor account access of
	// its own. Only one node sweeps at a time (cl.Locker).
	b.settler.StartReconcile(b.ctx, usage.ReconcileDeps{
		Executor: b.work,
		Locker:   b.cl.Locker, Registry: b.reg, Accounts: b.acc, Proxies: b.prx,
		Slots: b.cl.Slots, Limiter: b.limiter,
		AllowPrivateUpstream: cfg.AllowPrivateUpstream, NodeID: cfg.NodeID, Logger: b.log,
	})
	return trust, nil
}

// startPluginRuntime builds egress, the plugin runtime, the resource stores,
// the gateway and the install/rollout services, and starts their loops. trust
// comes from buildCoreServices: it is not boot state.
func (b *boot) startPluginRuntime(trust *pkg.TrustStore) error {
	cfg := b.cfg
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
		b.log.Warn("plugins may reach private network addresses (SUB2API_PLUGIN_EGRESS_ALLOW_PRIVATE=true); tests and development only")
	}
	egress := egress.New(b.db, egress.Options{NodeID: cfg.NodeID, DatabaseAddrs: []string{pgAddr}, CoreAddrs: coreAddrs,
		AllowPrivate: cfg.Plugins.EgressAllowPrivate, Events: b.events, Logger: b.log})
	b.stopper.add("egress", func(context.Context) { egress.Close() })
	launcher := sandbox.NewLauncher(sandbox.LauncherOptions{DisableWrap: cfg.Plugins.DevMode, Landlock: cfg.Plugins.Landlock, Logger: b.log})
	schemas := dbschema.New(b.db, cfg.DatabaseURL, cfg.MasterKey, cfg.Plugins.DBRoleIsolation)

	rt, err := grpcruntime.New(grpcruntime.Options{
		DB: b.db, Redis: b.rdb, Bus: b.cl.Bus, Locker: b.cl.Locker, Cipher: b.cipher, Node: b.cl.Registry, Launcher: launcher,
		Egress: egress, Authorizer: b.az, Ledger: b.bill, Prices: b.bill, Schemas: schemas, Accounts: b.acc, Sticky: gateway.NewStickyClearer(b.rdb), Environment: b.env, Notifier: b.ntf,
		HostVersion: b.version, DataDir: cfg.Plugins.DataDir, RunDir: cfg.Plugins.RunDir,
		StrictNetwork: cfg.Plugins.StrictNetwork, Seccomp: cfg.Plugins.Seccomp, MaxMemoryMB: cfg.Plugins.MaxMemoryMB,
		Logger: b.log,
	})
	if err != nil {
		return fmt.Errorf("plugin runtime: %w", err)
	}

	// The request gate admits HTTP traffic; WebSocket sessions also watch it to
	// end themselves on drain, which http.Server.Shutdown cannot do for them.
	b.gate = &requestGate{}
	if b.managed != nil {
		b.gate.stop()
	}
	resources := providerresources.New(b.db, providerresources.Options{})
	helpers := helperhistory.New(b.db, b.cipher, helperhistory.Options{})
	stopHelperHistory := startHelperHistoryMaintenance(b.ctx, b.settler, helpers, b.canWork)
	b.stopper.add("helper-history", stopHelperHistory)
	observations := observer.New(b.reg, b.stats, observer.Consumer{Namespace: observation.CoreNamespace, AllAccounts: true,
		Phases: []string{observation.UsageFinalized}, Metrics: []string{observation.SuccessRequests, observation.SuccessTokens, observation.PendingUsage}, Client: account.StatsConsumer{}})
	b.stopper.add("observations", observations.Close)
	b.gw = gateway.New(gateway.Deps{
		CCGateway:     b.ccg,
		HelperHistory: helpers, EnableHelperHistory: true,
		Resources: resources, Skills: resources, Credits: fallbackcredits.New(b.db, 4096), ResourceTransport: b.ccg.ResourceTransport(),
		DB: b.db, Redis: b.rdb, Bus: b.cl.Bus, Node: b.cl.Registry, Registry: b.reg,
		Auth: b.keys, Pricer: b.bill, Balance: b.bill, Slots: b.cl.Slots,
		Environment: b.env,
		Accounts:    b.acc, Proxies: b.prx, Settler: b.settler, Observations: observations, Tasks: b.settler, Limiter: b.limiter, KeyWindows: b.keys.Windows, KeyUsage: b.keys, Quota: b.acc, Config: cfg, Converters: b.converters,
		Draining: b.gate.isDraining,
	})

	mutations := &cluster.PluginMutations{DB: b.db, Locker: b.cl.Locker}
	if b.managed != nil {
		mutations.AllowBootstrap = b.managed.bootstrapAllowed
	}
	defaults := install.NewDefaultsApplier(b.az)
	ctl, err := rollout.New(rollout.Options{Mutations: mutations,
		CanCoordinate: b.canCoordinate,
		DB:            b.db, Node: b.cl.Registry, Bus: b.cl.Bus, Packages: b.pkgs, Registry: b.reg,
		Runtime: rollout.FromGRPC(rt), Schemas: schemas, Defaults: defaults, Perms: b.az, Events: b.events, Logger: b.log,
	})
	if err != nil {
		return fmt.Errorf("rollout: %w", err)
	}
	b.ctl = ctl
	ctl.Start(b.ctx)
	b.stopper.add("rollout", ctl.Stop)
	// Polling must stop before plugin instances and their egress. Keep the
	// earlier cleanup too, for initialization errors before this point: the
	// stack moves the re-registration to the end instead of adding a second
	// call, so the close order is unchanged.
	b.stopper.add("settler", b.settler.Stop)
	b.stopper.add("notifications", b.ntf.Stop)
	b.stopper.add("helper-history", stopHelperHistory)

	b.inst = install.New(install.Deps{Mutations: mutations,
		DB: b.db, Trust: trust, Authz: b.az, Permissions: b.az, Defaults: defaults,
		Rollout: ctl, Schemas: schemas, Bus: b.cl.Bus, Accounts: b.acc, KV: rt, Nodes: b.cl.Registry, Packages: b.packageSrc,
	}, install.Options{HostVersion: b.version, Plugins: cfg.Plugins})
	b.mkt = market.New(b.db, b.inst, b.marketClient, cfg.Plugins.MaxPackageBytes)
	if b.managed == nil || b.managed.prepare.Bootstrap {
		if err := b.mkt.SeedSources(b.ctx, cfg.Plugins.MarketSourcesJSON); err != nil {
			return fmt.Errorf("market sources: %w", err)
		}
	}
	return b.startBuiltins()
}

// startBuiltins starts the builtin convergence loop, or the bundled-plugin
// upgrade loop for a managed core that was not bootstrapped.
func (b *boot) startBuiltins() error {
	cfg := b.cfg
	log := b.log.With("component", "builtin-plugins")
	b.builtinReady = &atomic.Bool{}
	switch {
	case b.managed == nil:
		ready, stop := startBuiltinConvergence(b.ctx, b.inst, b.cl.Locker, b.reg, cfg.Plugins.BuiltinDir, log)
		b.builtinReady = ready
		b.stopper.add("builtin", stop)
	case b.managed.prepare.Bootstrap:
		ready, stop := startBuiltinBootstrap(b.ctx, b.inst, b.cl.Locker, b.reg, cfg.Plugins.BuiltinDir, log)
		b.builtinReady = ready
		b.stopper.add("builtin", stop)
	default:
		// A managed core that was not bootstrapped does not wait for its bundle
		// to admit the node, but it still brings the bundled plugins up to the
		// versions it carries, once it may coordinate plugins and no core plan
		// blocks plugin changes (CONTRACTS §37).
		b.builtinReady.Store(true)
		allowed := func() bool {
			if b.canCoordinate != nil && !b.canCoordinate() {
				return false
			}
			check, cancel := context.WithTimeout(b.ctx, 5*time.Second)
			defer cancel()
			busy, err := cluster.CoreUpdateBusy(check, b.db.Pool)
			return err == nil && !busy
		}
		b.stopper.add("builtin", startBuiltinUpgrade(b.ctx, b.inst, b.cl.Locker, cfg.Plugins.BuiltinDir, allowed, log))
	}
	return nil
}

// buildBackground constructs the job scheduler and the event delivery loop and
// registers their teardown. It is idempotent so the boot path and admission
// share one pair of instances: registerRoutes hands the console the scheduler
// built here, and admission starts that same scheduler.
func (b *boot) buildBackground() {
	if b.jobs != nil {
		return
	}
	b.jobs = job.New(b.db, b.cl.Locker, b.reg, b.log, b.cfg.NodeID, job.Options{Executor: b.work})
	b.stopper.add("jobs", func(c context.Context) { _ = b.jobs.Stop(c) })
	b.dlv = delivery.New(b.db, b.cl.Locker, b.cl.Bus, b.reg, b.log, b.cfg.NodeID, delivery.Options{CanRun: b.canWork, Subscriptions: b.acc.LifecycleSubscriptions})
	b.stopper.add("delivery", func(c context.Context) { _ = b.dlv.Stop(c) })
	// Extraction goroutines still call plugins and submit usage after their
	// HTTP handler returns. Join them before stopping either dependency.
	b.stopper.add("gateway", func(context.Context) { b.gw.Close() })
}

// startBackground starts the scheduler and delivery loop built by
// buildBackground, once. It is what admission runs (m.start) on a managed
// core, and what run() calls directly on a standalone one.
func (b *boot) startBackground() error {
	b.buildBackground()
	b.startOnce.Do(func() {
		if b.startErr = b.jobs.Start(b.ctx); b.startErr == nil {
			b.startErr = b.dlv.Start(b.ctx)
		}
	})
	if b.startErr != nil {
		return fmt.Errorf("background startup: %w", b.startErr)
	}
	return nil
}

// registerRoutes mounts every module's console API and the gateway.
func (b *boot) registerRoutes(r *httpapi.Router) {
	cfg := b.cfg
	r.Authed(http.MethodGet, "/system/version", systemVersionHandler(b.version, cfg.Managed.Enabled, cfg.NodeID, b.cl.Registry.BootID()))
	updater.RegisterRoutes(r, cfg.Managed.UpdaterSocket, cfg.Managed.UpdaterToken, b.db)
	b.ccg.RegisterRoutes(r)
	audit.RegisterRoutes(r, b.db)
	b.idm.RegisterRoutes(r)
	b.az.RegisterRoutes(r)
	b.grp.RegisterRoutes(r)
	b.env.RegisterRoutes(r)
	b.ntf.RegisterRoutes(r)
	b.keys.RegisterRoutes(r)
	b.prx.RegisterRoutes(r)
	b.acc.RegisterRoutes(r)
	b.bill.RegisterRoutes(r)
	b.settler.RegisterRoutes(r)
	api.New(api.Deps{
		DB: b.db, Install: b.inst, Market: b.mkt, Rollout: b.ctl, Nodes: b.cl.Registry, Registry: b.reg,
		Authz: b.az, Cipher: b.cipher, Bus: b.cl.Bus, Jobs: b.jobs, HookStats: b.gw, Plugins: cfg.Plugins,
	}).RegisterRoutes(r)
	pr := routes.New(b.reg, b.idm, b.az, routes.WithHealth(b.cl.Registry), routes.WithVersionAssets(b.pkgs))
	pr.RegisterRoutes(r)
	pr.RegisterAssets(b.engine)
	b.gw.RegisterRoutes(r)
}

// buildEngine creates the gin engine with the shared middleware and the health
// endpoint; module routes are mounted by registerRoutes.
func (b *boot) buildEngine() error {
	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	// Client IPs (login rate limiting, usage records) come from
	// X-Forwarded-For only when the request arrives from a trusted proxy.
	if err := engine.SetTrustedProxies(b.cfg.TrustedProxies); err != nil {
		return fmt.Errorf("trusted proxies: %w", err)
	}
	// The core owns exactly the routes of manifest.CoreRoutePrefixes (/api/v1
	// through httpapi.Router, /plugin-ui, /healthz) plus the bare /api;
	// manifest/check rejects plugin endpoints that would shadow them
	// (manifest.ReservedPath) and the console fallback answers them with a
	// JSON 404. Other /api/... paths (/api/v3) are gateway paths.
	engine.GET("/"+manifest.RouteHealthz, func(c *gin.Context) {
		status, text := http.StatusOK, "ok"
		if b.gate.isDraining() || !b.cl.Registry.Healthy() || !b.builtinReady.Load() || !b.sharedAssets.Ready() {
			status, text = http.StatusServiceUnavailable, "unavailable"
		}
		c.JSON(status, gin.H{"status": text, "version": b.version, "node": b.cfg.NodeID, "boot_id": b.cl.Registry.BootID()})
	})
	b.engine = engine
	b.router = httpapi.NewRouter(engine, b.idm, b.az)
	return nil
}

// startHTTP builds the console assets, routes and the HTTP server, and blocks
// until ctx ends or the listener fails.
func (b *boot) startHTTP() error {
	cfg := b.cfg
	sharedAssets, err := webui.NewSharedAssets(b.db, web.Dist, webui.SharedOptions{Logger: b.log})
	if err != nil {
		return fmt.Errorf("console asset manifest: %w", err)
	}
	b.sharedAssets = sharedAssets
	b.stopper.add("shared-assets", sharedAssets.Start(b.ctx))
	if err := b.buildEngine(); err != nil {
		return err
	}
	b.registerRoutes(b.router)
	ui, err := webui.New(web.Dist, webui.WithSharedAssets(sharedAssets))
	if err != nil {
		return fmt.Errorf("console assets: %w", err)
	}
	// Plugin-declared gateway endpoints are dynamic, so they are dispatched
	// before the console fallback instead of being registered as routes.
	b.engine.NoRoute(b.gw.Middleware(), ui.Serve)

	requestCtx, cancelRequests := context.WithCancel(context.Background())
	defer cancelRequests()
	srv := &http.Server{Addr: cfg.HTTPAddr, Handler: b.gate.wrap(b.engine), ReadHeaderTimeout: 10 * time.Second,
		BaseContext: func(net.Listener) context.Context { return requestCtx }}
	listener, err := net.Listen("tcp", cfg.HTTPAddr)
	if err != nil {
		return fmt.Errorf("http listen: %w", err)
	}
	defer listener.Close()
	errc := make(chan error, 1)
	go func() {
		b.log.Info("listening", "addr", cfg.HTTPAddr, "boot_id", b.cl.Registry.BootID(), "version", b.version)
		if err := srv.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errc <- err
		}
	}()
	b.publishManaged()
	select {
	case <-b.ctx.Done():
	case err := <-errc:
		return fmt.Errorf("http: %w", err)
	}
	// Expose non-readiness before closing the listener, so health-based
	// balancers can remove this node while existing requests are still alive.
	// A managed core drained by its shell skips both waits: the shell already
	// stopped sending it traffic, and a model stream rarely ends within the
	// grace anyway. Canceled requests still finish their deferred usage Submit
	// before billing stops (shutdownHTTP waits for every handler).
	b.gate.stop()
	delay, grace := cfg.ShutdownDelay, 30*time.Second
	if b.managed != nil && b.managed.draining() {
		delay, grace = 0, 0
	}
	time.Sleep(delay)
	return shutdownHTTP(srv, b.gate, cancelRequests, grace)
}

// publishManaged hands the control endpoints the live objects they poll. Only
// a managed core has a supervisor to answer.
func (b *boot) publishManaged() {
	m := b.managed
	if m == nil {
		return
	}
	m.mu.Lock()
	m.gate, m.start, m.active = b.gate, b.startBackground, b.work.Active
	m.validate = func(c context.Context, a runtimecontract.Admission) error {
		return verifyAdmission(c, b.db, b.cfg.NodeID, a)
	}
	m.liveValidate = func(c context.Context, a runtimecontract.Admission) error {
		return verifyLiveAdmission(c, b.db, b.cfg.NodeID, a)
	}
	m.check = func(c context.Context) (string, error) {
		if !b.cl.Registry.Healthy() || !b.sharedAssets.Ready() || !b.builtinReady.Load() {
			return "", errors.New("node dependencies are not ready")
		}
		return approvedPluginsReady(c, b.db, b.reg, b.version)
	}
	if m.mode == "preparing" {
		m.mode = "prepared"
	}
	m.mu.Unlock()
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
