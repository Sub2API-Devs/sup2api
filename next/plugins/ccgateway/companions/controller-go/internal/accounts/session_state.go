package accounts

import (
	"context"
	"errors"
	"slices"
	"strings"
	"time"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/rnd"
	"ccgateway/controller/internal/sessionstate"
	"ccgateway/controller/internal/store"
)

// Session state (SESSION-MEMORY-TOOLS-USED-DESIGN.md §5.4, §7.5): every
// account created while the guard mounts the Valkey socket gets a password
// (state.json state_password) and an ACL user acct-<key> limited to its own
// keys. The controller sets the user at provision and apply, switches it
// off on block, deletes it with the runtime, and puts every user back after
// Valkey restarts (it keeps no data, so its runtime users go with it).
//
// Nothing here fails an account operation: a host without Valkey, a
// stopped Valkey or a rejected command is logged and the Worker uses its
// process memory. All calls for one account run under its account lock.

// guardFeatureWait bounds the guard health call of a provision.
const guardFeatureWait = 3 * time.Second

// sessionGuard reports whether the guard gives new account containers the
// socket mount (session-state-v1). Asked at each container creation: the
// guard's switch may change while the controller runs.
func (m *Manager) sessionGuard(ctx context.Context) bool {
	if m.state == nil {
		return false
	}
	cctx, cancel := context.WithTimeout(ctx, guardFeatureWait)
	defer cancel()
	h, err := m.g.Health(cctx)
	if err != nil {
		return false
	}
	return slices.Contains(h.Features, sessionstate.Feature)
}

// ensureStatePassword gives st a password when it has none (32 random
// bytes, hex). It is part of the runtime's credentials, not of its
// authentication: the auth fingerprint (container label) never includes
// it, so adding one never recreates a container.
func (m *Manager) ensureStatePassword(st *store.AccountState) bool {
	if st.StatePassword != "" {
		return false
	}
	st.StatePassword = rnd.TokenHex(m.rand, 32)
	return true
}

// stateEnvironment adds the Worker's Valkey settings.
func stateEnvironment(env map[string]string, aid string, st *store.AccountState) {
	env[sessionstate.EnvSocket] = sessionstate.SocketPath
	env[sessionstate.EnvUser] = sessionstate.UserName(aid)
	env[sessionstate.EnvPassword] = st.StatePassword
}

// setStateUser is ACL SETUSER acct-<aid> with the account's rules: on, or
// off for a blocked runtime. Idempotent; a no-op without a password.
func (m *Manager) setStateUser(ctx context.Context, aid string, st *store.AccountState) {
	if m.state == nil || st == nil || st.StatePassword == "" {
		return
	}
	run := m.stateRun()
	err := m.state.SetUser(ctx, aid, st.StatePassword, st.Status != store.StatusBlocked)
	m.stateMu.Lock()
	if err == nil {
		m.stateSynced[aid] = run
	} else {
		delete(m.stateSynced, aid) // the next background pass tries again
	}
	m.stateMu.Unlock()
	m.stateResult("set the session state user of key="+aid, err)
}

// delStateUser is ACL DELUSER acct-<aid> (the runtime is being deleted).
// A failure leaves an orphan the background pass removes.
func (m *Manager) delStateUser(ctx context.Context, aid string, st *store.AccountState) {
	if m.state == nil || st == nil || st.StatePassword == "" {
		return
	}
	err := m.state.DelUser(ctx, aid)
	m.stateMu.Lock()
	delete(m.stateSynced, aid)
	m.stateMu.Unlock()
	m.stateResult("delete the session state user of key="+aid, err)
}

func (m *Manager) stateRun() string {
	m.stateMu.Lock()
	defer m.stateMu.Unlock()
	if m.stateInfo == nil {
		return ""
	}
	return m.stateInfo.RunID
}

// stateResult logs a failed call once per outage (an unreachable or absent
// Valkey) and every refused command; recovery is logged once.
func (m *Manager) stateResult(what string, err error) {
	m.stateMu.Lock()
	defer m.stateMu.Unlock()
	switch {
	case err == nil:
		if m.stateDown != "" {
			m.log.Info("session state Valkey reachable again")
			m.stateDown = ""
		}
	case sessionstate.IsServerError(err, ""):
		m.log.Warn("%s: %s", what, errs.FailureText(err))
	case errors.Is(err, sessionstate.ErrNotConfigured):
		if m.stateDown != "absent" {
			m.log.Info("session state Valkey not configured on this host (%s); Workers keep their memory in process",
				errs.FailureText(err))
			m.stateDown = "absent"
		}
	default:
		if m.stateDown != "down" {
			m.log.Warn("session state Valkey unavailable (%s: %s); Workers keep their memory in process",
				what, errs.FailureText(err))
			m.stateDown = "down"
		}
	}
}

// observeState is the background pass's first step: INFO and ACL LIST.
// A new run_id (first pass, or Valkey restarted) means every user has to
// be set again; an unreachable Valkey makes this pass skip the users.
func (m *Manager) observeState(ctx context.Context) {
	if m.state == nil {
		return
	}
	info, err := m.state.Observe(ctx)
	m.stateResult("observe the session state Valkey", err)
	m.stateMu.Lock()
	defer m.stateMu.Unlock()
	if err != nil {
		m.stateInfo = nil
		return
	}
	if m.stateInfo == nil || m.stateInfo.RunID != info.RunID {
		if m.stateSeen != "" && m.stateSeen != info.RunID {
			m.log.Info("session state Valkey restarted; restoring the account users")
		}
		m.stateSeen = info.RunID
	}
	m.stateInfo = info
}

// stateUserOnce (recoverKey, under the account lock): the account's user
// is set again when Valkey restarted since it was last set, or when it is
// missing. A failure is retried on the next pass and never takes the
// account offline (the dropOwnEgressOnce pattern).
func (m *Manager) stateUserOnce(ctx context.Context, key string, st *store.AccountState) {
	if m.state == nil || st == nil || st.StatePassword == "" {
		return
	}
	m.stateMu.Lock()
	info := m.stateInfo
	done := info != nil && m.stateSynced[key] == info.RunID && info.HasUser(key)
	m.stateMu.Unlock()
	if info == nil || done {
		return
	}
	m.setStateUser(ctx, key, st)
}

// dropOrphanStateUsers removes acct-* users whose runtime is gone (a
// DELUSER that failed during delete), each under its account lock and only
// when the runtime still has no state.
func (m *Manager) dropOrphanStateUsers(ctx context.Context) {
	if m.state == nil {
		return
	}
	m.stateMu.Lock()
	info := m.stateInfo
	m.stateMu.Unlock()
	if info == nil {
		return
	}
	for _, user := range info.Users {
		key := strings.TrimPrefix(user, "acct-")
		if !names.Key.MatchString(key) {
			continue // not one of ours
		}
		if st, err := m.State(key); err != nil || st != nil {
			continue
		}
		h, ok := m.TryLock(key)
		if !ok {
			continue // an apply is running; the next pass looks again
		}
		if st, err := m.State(key); err == nil && st == nil {
			err := m.state.DelUser(ctx, key)
			if err == nil {
				m.log.Info("removed the session state user of deleted key=%s", key)
			}
			m.stateResult("delete the orphan session state user "+user, err)
		}
		h.Release()
	}
}
