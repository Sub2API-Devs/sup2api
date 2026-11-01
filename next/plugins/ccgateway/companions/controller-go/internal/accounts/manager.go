// Package accounts is the account runtime manager (Python manager.py and the
// orchestration half of shared_egress.py; behaviour A, PV, Y, BL, D, G, N,
// Q, K, S, RB): apply, provision, block, delete, readiness, the shared Xray
// gateway (configure, sync, fence, collect, recover, remove, disconnect,
// ensure under compose, recovery after a rebuild), the proxy recheck and the
// cleanup of sing-box leftovers.
//
// Locks (02 §4): account lock -> sharedOp -> network lock. sharedMu (the
// shared gateway's data) and memMu (online, boots, dropped) are leaves held
// without I/O. The request path (Readiness, Connection, ReadyState, Public)
// never takes sharedOp (BUG-1 fixed) and asks the guard once (BUG-2 fixed).
package accounts

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"

	"ccgateway/controller/internal/clock"
	"ccgateway/controller/internal/config"
	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/hoststate"
	"ccgateway/controller/internal/keylock"
	"ccgateway/controller/internal/logx"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/netplan"
	"ccgateway/controller/internal/rnd"
	"ccgateway/controller/internal/store"
	"ccgateway/controller/internal/workeradmin"
)

// Background periods (B1, B2).
const (
	RecoverEvery = 10 * time.Second
	RecheckEvery = 300 * time.Second
	// stopTimeout is block()'s stop(timeout=10).
	stopTimeout = 10
)

// Manager is the account runtime manager.
type Manager struct {
	cfg      config.Config
	prefix   string
	st       *store.Store
	g        guardapi.Client
	images   *hoststate.Images
	quota    *hoststate.DiskQuota
	locks    *keylock.Locks
	clock    clock.Clock
	rand     rnd.Source
	resolver netplan.Resolver
	worker   *workeradmin.Client
	rules    func(gatewayIP string) (string, error)
	log      *logx.Logger

	// networkMu serialises subnet allocation and provisioning (K3).
	networkMu sync.Mutex

	memMu   sync.Mutex
	online  map[string]string    // M1: revision a runtime is ready at
	boots   map[string][2]string // M2: (app StartedAt, gateway StartedAt) at activation
	dropped map[string]bool      // M5: runtimes rid of sing-box leftovers by this process

	shared *shared

	// Background periods; tests shorten them.
	recoverEvery time.Duration
	recheckEvery time.Duration
	// reqWait is the request path's lock wait (keylock.RequestWait).
	reqWait time.Duration
}

func (m *Manager) requestWait() time.Duration { return m.reqWait }

var (
	_ contract.Accounts    = (*Manager)(nil)
	_ contract.UpdateHost  = (*Manager)(nil)
	_ contract.CleanupHost = (*Manager)(nil)
	_ contract.AdminHost   = (*Manager)(nil)
)

// New builds the Manager and loads the shared gateway state (moving the
// legacy shared-egress/state.json; refusing a conflict or another schema).
func New(opts Options) (*Manager, error) {
	if err := opts.Defaults(); err != nil {
		return nil, err
	}
	cfg := opts.Config
	if cfg.Prefix == "" {
		cfg.Prefix = names.DefaultPrefix
	}
	if !names.Prefix.MatchString(cfg.Prefix) {
		return nil, errors.New("invalid prefix")
	}
	if cfg.AccountDiskBytes == 0 {
		cfg.AccountDiskBytes = int64(config.DefaultDiskGiB) << 30
	}
	if cfg.ProbeURL == "" {
		cfg.ProbeURL = config.DefaultProbeURL
	}
	m := &Manager{
		cfg: cfg, prefix: cfg.Prefix, st: opts.Store, g: opts.Guard, images: opts.Images, quota: opts.DiskQuota,
		locks: opts.Locks, clock: opts.Clock, rand: opts.Rand, resolver: opts.Resolver, worker: opts.Worker,
		rules: opts.BusinessRules, log: opts.Log,
		online: map[string]string{}, boots: map[string][2]string{}, dropped: map[string]bool{},
		recoverEvery: RecoverEvery, recheckEvery: RecheckEvery, reqWait: keylock.RequestWait,
	}
	data, _, err := m.st.LoadShared(func() string { return rnd.TokenHex(m.rand, 32) })
	if err != nil {
		return nil, fmt.Errorf("shared egress state: %w", err)
	}
	m.shared = newShared(m, data)
	return m, nil
}

// Lock waits for aid's account lock until ctx ends (RuntimeBusy then).
func (m *Manager) Lock(ctx context.Context, aid string) (*keylock.Held, error) {
	if err := names.CheckKey(aid); err != nil {
		return nil, err
	}
	return m.locks.Lock(ctx, aid)
}

// TryLock takes aid's account lock only when it is free.
func (m *Manager) TryLock(aid string) (*keylock.Held, bool) {
	if names.CheckKey(aid) != nil {
		return nil, false
	}
	return m.locks.TryLock(aid)
}

func (m *Manager) name(aid, role string) string { return names.Name(m.prefix, aid, role) }

// State is Manager.state(aid) (nil when there is none).
func (m *Manager) State(aid string) (*store.AccountState, error) { return m.st.LoadState(aid) }

// Save is Manager.save under the account lock.
func (m *Manager) Save(h *keylock.Held, st *store.AccountState) error {
	return m.save(h.Key(), st)
}

func (m *Manager) save(aid string, st *store.AccountState) error { return m.st.SaveState(aid, st) }

// ---------------------------------------------------------------------------
// Memory state (M1, M2).

// GoOffline drops readiness; the revision it was online at ("" if none).
func (m *Manager) GoOffline(aid string) string {
	m.memMu.Lock()
	defer m.memMu.Unlock()
	rev := m.online[aid]
	delete(m.online, aid)
	return rev
}

// dropReadiness is go_offline plus forgetting the boots.
func (m *Manager) dropReadiness(aid string) {
	m.memMu.Lock()
	defer m.memMu.Unlock()
	delete(m.online, aid)
	delete(m.boots, aid)
}

// OnlineAt is online_at(aid, revision) (memory only).
func (m *Manager) OnlineAt(aid, revision string) bool {
	m.memMu.Lock()
	defer m.memMu.Unlock()
	return revision != "" && m.online[aid] == revision
}

func (m *Manager) onlineRev(aid string) (string, bool) {
	m.memMu.Lock()
	defer m.memMu.Unlock()
	rev, ok := m.online[aid]
	return rev, ok
}

func (m *Manager) setOnline(aid, revision string, boots [2]string) {
	m.memMu.Lock()
	defer m.memMu.Unlock()
	m.boots[aid] = boots
	m.online[aid] = revision
}

func (m *Manager) bootsOf(aid string) ([2]string, bool) {
	m.memMu.Lock()
	defer m.memMu.Unlock()
	b, ok := m.boots[aid]
	return b, ok
}

func (m *Manager) onlineKeys() []string {
	m.memMu.Lock()
	defer m.memMu.Unlock()
	keys := make([]string, 0, len(m.online))
	for k := range m.online {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

// forgetAllReadiness takes every runtime offline (gateway recreated).
func (m *Manager) forgetAllReadiness() {
	m.memMu.Lock()
	defer m.memMu.Unlock()
	m.online = map[string]string{}
	m.boots = map[string][2]string{}
}

// ---------------------------------------------------------------------------
// Images and containers.

// EnsureImage is ensure_image: inspect, pull once if absent, inspect again;
// errs.ImagePullFailed when it cannot be had (PV18).
func (m *Manager) EnsureImage(ctx context.Context, ref string) (*guardapi.Image, error) {
	img, err := m.g.ImageInspect(ctx, ref)
	if err == nil {
		return img, nil
	}
	if !guardapi.IsNotFound(err) {
		return nil, err
	}
	if err := m.g.ImagePull(ctx, ref); err != nil {
		if errs.Is(err, errs.ImagePullFailed) {
			return nil, err
		}
		return nil, errs.Wrap(errs.ImagePullFailed, "image pull failed", err)
	}
	img, err = m.g.ImageInspect(ctx, ref)
	if err != nil {
		return nil, errs.Wrap(errs.ImagePullFailed, "image pull failed", err)
	}
	return img, nil
}

// errNoApp is the guard 404 of an absent account container.
func errNoApp(name string) error {
	return &guardapi.Error{Status: 404, Code: guardapi.CodeNotFound, Reason: guardapi.ReasonContainer,
		Message: name + " not found", Endpoint: "GET /v1/accounts/{aid}"}
}

// App is owned(aid, 'app'): guardapi.ErrNotFound when absent,
// errs.OwnershipMismatch when the name is someone else's.
func (m *Manager) App(ctx context.Context, aid string) (*guardapi.Container, error) {
	if err := names.CheckKey(aid); err != nil {
		return nil, err
	}
	acct, err := m.g.Account(ctx, aid)
	if err != nil {
		return nil, err
	}
	if acct.App == nil {
		return nil, errNoApp(m.name(aid, "app"))
	}
	return acct.App, nil
}

// appImageID is the target app image's ID (30 s cache, never pulls).
func (m *Manager) appImageID(ctx context.Context) (string, error) {
	return m.images.AppImageID(ctx, func(ctx context.Context, ref string) (string, error) {
		img, err := m.g.ImageInspect(ctx, ref)
		if err != nil {
			return "", err
		}
		return img.ID, nil
	})
}

// failureText is common.failure_text for log lines.
func failureText(err error) string { return errs.FailureText(err) }
