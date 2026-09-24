// Package app wires every module into one server process. It is the only
// place that imports module packages side by side; modules depend on each
// other only through internal/core interfaces.
package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/account"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/apikey"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/cluster"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/event"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/event/delivery"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/group"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/iam"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/job"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/api"
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
	"github.com/Sub2API-Devs/sup2api/next/server/internal/proxy"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usage"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/webui"
	"github.com/Sub2API-Devs/sup2api/next/server/web"
)

// Run starts the server and blocks until ctx is cancelled, then shuts down
// in reverse order.
func Run(ctx context.Context, cfg *config.Config, version string, log *slog.Logger) error {
	var closers []func(context.Context)
	defer func() {
		sctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
		defer cancel()
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
	applied, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	if err != nil {
		return fmt.Errorf("migrate: %w", err)
	}
	log.Info("migrations applied", "files", applied)

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
	cl := cluster.New(rdb, db.Pool, cluster.Options{NodeID: cfg.NodeID, Addr: cfg.PublicURL, HostVersion: version, Logger: log})
	if err := cl.Start(ctx); err != nil {
		return fmt.Errorf("cluster: %w", err)
	}
	onClose(func(context.Context) { cl.Close() })

	// ------------------------------------------------------------ core services
	events := event.NewPublisher(db)
	reg := registry.New()
	pkgs := registry.NewPackages(db, cfg.Plugins.DataDir)
	onClose(func(context.Context) { pkgs.Close() })

	bill := billing.New(db, rdb, cl.Bus, events, reg)
	onClose(func(context.Context) { bill.Close() })
	settler := usage.New(db, bill, events, usage.Options{})
	settler.Start(ctx)
	onClose(settler.Stop)

	az := authz.New(authz.Deps{DB: db, Bus: cl.Bus, Plugins: reg})
	if err := az.Start(ctx); err != nil {
		return fmt.Errorf("authz: %w", err)
	}
	idm := iam.New(iam.Deps{DB: db, Redis: rdb, Config: cfg, Events: events, Authz: az})
	if err := idm.Bootstrap(ctx); err != nil {
		return fmt.Errorf("bootstrap admin: %w", err)
	}

	grp := group.New(db, rdb, cl.Bus)
	keys := apikey.New(db, rdb, az)
	prx := proxy.New(db, cipher, cl.Bus, proxy.Options{})
	acc := account.New(account.Deps{
		DB: db, Redis: rdb, Cipher: cipher, Registry: reg, Proxies: prx, Events: events,
		Slots: cl.Slots, Bus: cl.Bus, AllowPrivateUpstream: cfg.AllowPrivateUpstream,
	})
	go keys.Run(ctx)
	go prx.Run(ctx)
	go acc.Run(ctx)

	// ------------------------------------------------------------ plugin runtime
	pgAddr, err := databaseAddr(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	egressP := egress.New(db, egress.Options{NodeID: cfg.NodeID, AlwaysAllow: []string{pgAddr}, Logger: log})
	onClose(func(context.Context) { egressP.Close() })
	launcher := sandbox.NewLauncher(sandbox.LauncherOptions{DisableWrap: cfg.Plugins.DevMode, Logger: log})
	schemas := dbschema.New(db, cfg.DatabaseURL, cfg.MasterKey, cfg.Plugins.DBRoleIsolation)

	rt, err := grpcruntime.New(grpcruntime.Options{
		DB: db, Redis: rdb, Cipher: cipher, Node: cl.Registry, Launcher: launcher,
		Egress: egressP, Authorizer: az, Ledger: bill, Schemas: schemas,
		HostVersion: version, DataDir: cfg.Plugins.DataDir,
		StrictNetwork: cfg.Plugins.StrictNetwork, Seccomp: cfg.Plugins.Seccomp, MaxMemoryMB: cfg.Plugins.MaxMemoryMB,
		Logger: log,
	})
	if err != nil {
		return fmt.Errorf("plugin runtime: %w", err)
	}

	gw := gateway.New(gateway.Deps{
		DB: db, Redis: rdb, Bus: cl.Bus, Node: cl.Registry, Registry: reg,
		Auth: keys, Pricer: bill, Balance: bill, Slots: cl.Slots,
		Accounts: acc, Proxies: prx, Settler: settler, Config: cfg,
	})
	onClose(func(context.Context) { gw.Close() })

	defaults := install.NewDefaultsApplier(az, bill, gw)
	ctl, err := rollout.New(rollout.Options{
		DB: db, Node: cl.Registry, Bus: cl.Bus, Packages: pkgs, Registry: reg,
		Runtime: rollout.FromGRPC(rt), Schemas: schemas, Defaults: defaults, Perms: az, Events: events, Logger: log,
	})
	if err != nil {
		return fmt.Errorf("rollout: %w", err)
	}
	ctl.Start(ctx)
	onClose(ctl.Stop)

	trust, err := pkg.NewTrustStore(cfg.Plugins.OfficialRootKeys, cfg.Plugins.AllowUnsigned)
	if err != nil {
		return fmt.Errorf("plugin trust: %w", err)
	}
	inst := install.New(install.Deps{
		DB: db, Trust: trust, Authz: az, Permissions: az, Defaults: defaults,
		Rollout: ctl, Schemas: schemas, Bus: cl.Bus,
	}, install.Options{HostVersion: version, Plugins: cfg.Plugins})
	mkt := market.New(db, inst, nil, cfg.Plugins.MaxPackageBytes)
	if err := mkt.SeedSources(ctx, cfg.Plugins.MarketSourcesJSON); err != nil {
		return fmt.Errorf("market sources: %w", err)
	}

	jobs := job.New(db, cl.Locker, reg, log, cfg.NodeID, job.Options{})
	if err := jobs.Start(ctx); err != nil {
		return fmt.Errorf("jobs: %w", err)
	}
	onClose(func(c context.Context) { _ = jobs.Stop(c) })
	dlv := delivery.New(db, cl.Locker, cl.Bus, reg, log, cfg.NodeID, delivery.Options{})
	if err := dlv.Start(ctx); err != nil {
		return fmt.Errorf("event delivery: %w", err)
	}
	onClose(func(c context.Context) { _ = dlv.Stop(c) })

	// ------------------------------------------------------------ HTTP
	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	engine.GET("/healthz", func(c *gin.Context) {
		status := http.StatusOK
		if !cl.Registry.Healthy() {
			status = http.StatusServiceUnavailable
		}
		c.JSON(status, gin.H{"status": http.StatusText(status), "version": version, "node": cfg.NodeID, "boot_id": cl.Registry.BootID()})
	})
	r := httpapi.NewRouter(engine, idm, az, idm)
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
	pr := routes.New(reg, idm, az, idm)
	pr.RegisterRoutes(r)
	pr.RegisterAssets(engine)
	gw.RegisterRoutes(r)

	ui, err := webui.New(web.Dist)
	if err != nil {
		return fmt.Errorf("console assets: %w", err)
	}
	// Plugin-declared gateway endpoints are dynamic, so they are dispatched
	// before the console fallback instead of being registered as routes.
	engine.NoRoute(gw.Middleware(), ui.Serve)

	srv := &http.Server{Addr: cfg.HTTPAddr, Handler: engine, ReadHeaderTimeout: 10 * time.Second}
	errc := make(chan error, 1)
	go func() {
		log.Info("listening", "addr", cfg.HTTPAddr, "node", cfg.NodeID, "boot_id", cl.Registry.BootID(), "version", version)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errc <- err
		}
	}()
	select {
	case <-ctx.Done():
	case err := <-errc:
		return fmt.Errorf("http: %w", err)
	}
	// Stop taking requests first; background services close afterwards.
	sctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	return srv.Shutdown(sctx)
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
