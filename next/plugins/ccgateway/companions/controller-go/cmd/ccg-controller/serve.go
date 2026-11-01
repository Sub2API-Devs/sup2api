package main

import (
	"context"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"time"

	"ccgateway/controller/internal/api"
	"ccgateway/controller/internal/clock"
	"ccgateway/controller/internal/config"
	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/hoststate"
	"ccgateway/controller/internal/logx"
	"ccgateway/controller/internal/store"
	"ccgateway/controller/internal/workeradmin"
)

// Exit codes of serve.
const (
	exitConfig  = 2 // invalid environment (02 §4.5 step 1)
	exitStartup = 1 // data root, runtime.json, shared state, listener
)

// guardCheckTimeout bounds the start-up GET /v1/health of the guard.
const guardCheckTimeout = 5 * time.Second

// deps are what the business packages are built from.
type deps struct {
	Config    config.Config
	Store     *store.Store
	Guard     guardapi.Client
	Images    *hoststate.Images
	DiskQuota *hoststate.DiskQuota
	Worker    *workeradmin.Client
	Log       *logx.Logger
}

// services are the business packages behind the HTTP API.
type services struct {
	Accounts contract.Accounts
	Updates  contract.Updates
	Uploads  contract.Uploads
	Cleanup  contract.Cleanup
	Admin    contract.Admin
}

// builder builds the services (wire.go; tests pass stubs).
type builder func(deps) (*services, error)

// serve is the controller process (02 §4.5): configuration, umask 077, the
// data root and its lock, runtime.json, the guard client and its feature
// check, the business packages, their background loops, then the listener
// on CCG_CONTROLLER_BIND:CCG_CONTROLLER_PORT. When ctx ends (SIGTERM,
// SIGINT) the background loops stop, requests in progress get
// api.ShutdownGrace, and every tunnel is closed. listening, when not nil,
// is told the listener's address.
func serve(ctx context.Context, lookup func(string) (string, bool), stderr io.Writer, build builder,
	listening func(net.Addr)) int {
	cfg, err := config.FromEnv(lookup, buildVersion)
	if err != nil {
		fmt.Fprintln(stderr, "ccg-controller:", err)
		return exitConfig
	}
	setUmask()
	log := logx.New(stderr, "ccgateway.controller")
	st, err := store.Open(cfg.Root)
	if err != nil {
		log.Error("cannot open the data root: %v", err)
		return exitStartup
	}
	defer st.Close()
	if err := st.ResetSpool(); err != nil {
		log.Error("cannot reset the spool directory: %v", err)
		return exitStartup
	}
	images, err := hoststate.NewImages(st, cfg.AppImage, cfg.EgressImage, clock.Real())
	if err != nil {
		log.Error("cannot read the target images: %v", err)
		return exitStartup
	}
	guard, err := guardapi.New(cfg.GuardURL, cfg.GuardToken)
	if err != nil {
		log.Error("invalid guard configuration: %v", err)
		return exitConfig
	}
	checkGuard(ctx, guard, log)
	worker := workeradmin.New()
	svc, err := build(deps{Config: cfg, Store: st, Guard: guard, Images: images, DiskQuota: &hoststate.DiskQuota{},
		Worker: worker, Log: log})
	if err != nil {
		log.Error("cannot start: %v", err)
		return exitStartup
	}
	server, err := api.New(api.Options{Key: cfg.ControllerKey, Accounts: svc.Accounts, Updates: svc.Updates,
		Uploads: svc.Uploads, Cleanup: svc.Cleanup, Admin: svc.Admin, Worker: worker, Log: log})
	if err != nil {
		log.Error("cannot start: %v", err)
		return exitStartup
	}
	background, stopBackground := context.WithCancel(ctx)
	defer stopBackground()
	svc.Accounts.RunBackground(background)
	ln, err := net.Listen("tcp", net.JoinHostPort(cfg.Bind, strconv.Itoa(cfg.Port)))
	if err != nil {
		log.Error("cannot listen: %v", err)
		return exitStartup
	}
	log.Info("controller %s listening on %s", cfg.Version, ln.Addr())
	if listening != nil {
		listening(ln.Addr())
	}
	if err := server.Serve(ctx, ln, api.ShutdownGrace); err != nil {
		log.Error("server failed: %v", err)
		return exitStartup
	}
	log.Info("controller stopped")
	return 0
}

// checkGuard is the start-up guard check (02 §4.5 step 5, R17): an
// unreachable guard is only a warning (the controller answers /health and
// 503 for everything that needs the guard); missing features are logged.
func checkGuard(ctx context.Context, g guardapi.Client, log *logx.Logger) {
	cctx, cancel := context.WithTimeout(ctx, guardCheckTimeout)
	defer cancel()
	h, err := g.Health(cctx)
	if err != nil {
		log.Warn("guard not reachable at start: %v", err)
		return
	}
	if missing := h.Missing(guardapi.RequiredFeatures); len(missing) > 0 {
		log.Warn("guard %s lacks required features: %s", h.Version, strings.Join(missing, ", "))
	}
}
