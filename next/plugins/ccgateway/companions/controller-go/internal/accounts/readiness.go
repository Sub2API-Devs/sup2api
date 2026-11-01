package accounts

import (
	"context"
	"errors"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/store"
)

// probe is the request path's single guard call (02 §5.5): the account
// container's and the gateway's state, checked against online, boots and
// the shared binding snapshot. A guard 404 or a runtime the containers no
// longer back takes the runtime offline; any other failure (the guard is
// unreachable, an ownership conflict) is returned and readiness is kept.
// force asks the guard even when the runtime is not online (public needs
// the current image).
func (m *Manager) probe(ctx context.Context, aid string, st *store.AccountState, force bool) (string, *guardapi.AccountState, error) {
	if _, ok := m.onlineRev(aid); !ok && !force {
		return "", nil, nil
	}
	s, err := m.g.AccountState(ctx, aid)
	if err != nil {
		if !guardapi.IsNotFound(err) {
			return "", nil, err
		}
		m.GoOffline(aid)
		return "", nil, nil
	}
	if _, ok := m.onlineRev(aid); ok {
		if !m.backed(aid, st, s) {
			m.GoOffline(aid)
		}
	}
	rev, _ := m.onlineRev(aid)
	return rev, s, nil
}

// backed is the container half of readiness(): both containers run, neither
// restarted since activation, and the shared binding is healthy (Y1, Y2).
func (m *Manager) backed(aid string, st *store.AccountState, s *guardapi.AccountState) bool {
	if s == nil || s.App == nil || s.Gateway == nil || s.App.Status != "running" || s.Gateway.Status != "running" {
		return false
	}
	boots, ok := m.bootsOf(aid)
	if !ok || boots != [2]string{s.App.StartedAt, s.Gateway.StartedAt} {
		return false
	}
	return m.shared.healthySnapshot(aid, st, s.App.ID, s.Gateway)
}

// Readiness is readiness(aid, state): the revision the runtime is online at
// ("" when none), one guard call (BUG-2 fixed), never the shared operation
// lock (BUG-1 fixed).
func (m *Manager) Readiness(ctx context.Context, aid string, st *store.AccountState) (string, error) {
	if st == nil {
		st = &store.AccountState{}
	}
	rev, _, err := m.probe(ctx, aid, st, false)
	return rev, err
}

// isReady is is_ready(aid, state) (Y6).
func (m *Manager) isReady(ctx context.Context, aid string, st *store.AccountState) (bool, error) {
	if st == nil || st.Revision == "" {
		return false, nil
	}
	rev, err := m.Readiness(ctx, aid, st)
	return err == nil && rev == st.Revision, err
}

// Public is GET status (Y3): never pulls, never changes readiness beyond
// what the containers say; one AccountState call plus the cached target
// image ID.
func (m *Manager) Public(ctx context.Context, aid string) (*contract.Public, error) {
	if err := names.CheckKey(aid); err != nil {
		return nil, err
	}
	st, err := m.State(aid)
	if err != nil {
		return nil, err
	}
	if st == nil {
		st = &store.AccountState{}
	}
	online, s, err := m.probe(ctx, aid, st, true)
	if err != nil {
		return nil, err
	}
	current := ""
	if s != nil && s.App != nil {
		current = s.App.Image
	}
	target, terr := m.appImageID(ctx)
	if terr != nil {
		target = ""
	}
	_, isOnline := m.onlineRev(aid)
	status := "pending"
	if isOnline && online == st.Revision {
		status = "ready"
	}
	p := &contract.Public{
		AccountID:            aid,
		Container:            m.name(aid, "app"),
		CurrentImage:         current,
		TargetImage:          m.images.App(),
		ImageUpdateAvailable: current != "" && target != "" && current != target,
		TargetImageAvailable: target != "",
		EnvironmentPending:   st.EnvironmentPending.Set && st.EnvironmentPending.V,
		DiskQuota:            st.DiskQuotaOrLegacy(),
		Status:               status,
		Revision:             online,
		AuthMode:             st.AuthModeOrOAuth(),
		AppIP:                st.AppIP,
		GatewayIP:            st.GatewayIP,
	}
	if v, ok := st.CLI.Get(); ok {
		p.CLI = v
	}
	if v, ok := st.ActiveRuntime.Get(); ok {
		p.ActiveRuntime = v
	}
	if v, ok := st.Network.Get(); ok {
		p.Network = v
	}
	return p, nil
}

// Runtimes is GET /accounts (Y4): every runtime directory (not a symbolic
// link), byte order; blocked from the state, else the public status.
func (m *Manager) Runtimes(ctx context.Context) (*contract.RuntimeList, error) {
	entries, err := m.st.AccountEntries()
	if err != nil {
		return nil, err
	}
	out := &contract.RuntimeList{Runtimes: []contract.RuntimeRow{}}
	for _, e := range entries {
		if e.IsSymlink || !e.IsDir {
			continue
		}
		st, err := m.State(e.Name)
		if err != nil {
			continue // removed concurrently or unreadable
		}
		created := ""
		if st != nil {
			created = st.CreatedAt
		}
		if created == "" {
			created = names.RFC3339(e.ModTime)
		}
		out.Runtimes = append(out.Runtimes, contract.RuntimeRow{Key: e.Name, Status: m.listedStatus(ctx, e.Name, st), CreatedAt: created})
	}
	return out, nil
}

func (m *Manager) listedStatus(ctx context.Context, aid string, st *store.AccountState) string {
	if st != nil && st.Status == store.StatusBlocked {
		return store.StatusBlocked
	}
	p, err := m.Public(ctx, aid)
	if err != nil {
		return store.StatusPending
	}
	return p.Status
}

// requestLock is request_guard: the account lock for at most
// keylock.RequestWait (K2).
func (m *Manager) requestLock(ctx context.Context, aid string) (release func(), err error) {
	if err := names.CheckKey(aid); err != nil {
		return nil, err
	}
	wctx, cancel := context.WithTimeout(ctx, m.requestWait())
	defer cancel()
	h, err := m.locks.Lock(wctx, aid)
	if err != nil {
		return nil, err
	}
	return h.Release, nil
}

// ReadyState is ready_state(aid, revision) (Y5): the state when the runtime
// is online at revision, nil otherwise.
func (m *Manager) ReadyState(ctx context.Context, aid, revision string) (*store.AccountState, error) {
	release, err := m.requestLock(ctx, aid)
	if err != nil {
		return nil, err
	}
	defer release()
	st, err := m.State(aid)
	if err != nil || st == nil || revision == "" {
		return nil, err
	}
	rev, err := m.Readiness(ctx, aid, st)
	if err != nil {
		return nil, err
	}
	if rev != revision {
		return nil, nil
	}
	return st, nil
}

// Connection is GET connection (R6): nil, nil when not synchronized.
func (m *Manager) Connection(ctx context.Context, aid, revision string) (*contract.Connection, error) {
	st, err := m.ReadyState(ctx, aid, revision)
	if err != nil || st == nil {
		return nil, err
	}
	return &contract.Connection{AppIP: st.AppIP, Port: names.WorkerPort, APIKey: st.APIKey, Revision: revision}, nil
}

// EgressStatus is GET egress (R7): {"backend": "shared_xray", "ready"}.
func (m *Manager) EgressStatus(ctx context.Context, aid string) (*contract.EgressStatus, error) {
	if err := names.CheckKey(aid); err != nil {
		return nil, err
	}
	st, err := m.State(aid)
	if err != nil {
		return nil, err
	}
	ready, err := m.isReady(ctx, aid, st)
	if err != nil {
		return nil, err
	}
	return &contract.EgressStatus{Ready: ready}, nil
}

// errGatewayMissing is the guard state of an absent gateway or app on the
// paths that need them (Python docker.errors.NotFound).
var errGatewayMissing = errors.New("shared gateway not found")

// stateApp returns the app and gateway of one AccountState call or an error
// when either is missing.
func (m *Manager) stateBoth(ctx context.Context, aid string) (*guardapi.AccountState, error) {
	s, err := m.g.AccountState(ctx, aid)
	if err != nil {
		return nil, err
	}
	if s.App == nil {
		return nil, errNoApp(m.name(aid, "app"))
	}
	if s.Gateway == nil {
		return nil, errGatewayMissing
	}
	return s, nil
}
