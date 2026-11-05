package accounts

import (
	"context"
	"fmt"
	"runtime/debug"
	"time"

	"ccgateway/controller/internal/netplan"
	"ccgateway/controller/internal/pyjson"
)

// RunBackground starts the 10 s recover/collect loop (B1) and the 300 s
// proxy recheck (B2); both sleep one period before their first pass, run
// one pass at a time and stop when ctx ends. A gateway recreation kicks a
// recover pass at once.
func (m *Manager) RunBackground(ctx context.Context) {
	go m.every(ctx, m.recoverEvery, m.shared.kick, m.sharedPass)
	go m.every(ctx, m.recheckEvery, nil, m.recheckProxies)
}

func (m *Manager) every(ctx context.Context, d time.Duration, kick <-chan struct{}, f func(context.Context)) {
	t := time.NewTimer(d)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		case <-kick:
			if !t.Stop() {
				select {
				case <-t.C:
				default:
				}
			}
		}
		m.safe(ctx, f)
		t.Reset(d)
	}
}

// safe runs f; a panic is logged like Python's `except Exception`.
func (m *Manager) safe(ctx context.Context, f func(context.Context)) {
	defer func() {
		if r := recover(); r != nil {
			m.log.Error("shared egress pass failed: panic: %v\n%s", r, debug.Stack())
		}
	}()
	f(ctx)
}

// sharedPass is SharedEgress.run's body: recover, then collect; a failed
// recover skips collect.
func (m *Manager) sharedPass(ctx context.Context) {
	// Stale paired-activation leftovers first (IT-X02): an expired Worker
	// pause is released even when the recover pass below fails.
	m.releaseMaintenance(ctx)
	// The session Valkey first: a restart since the last pass makes
	// recoverKey put every account's user back.
	m.observeState(ctx)
	if err := m.recover(ctx); err != nil {
		if ctx.Err() == nil {
			m.log.Warn("shared egress pass failed: %s", failureText(err))
		}
		return
	}
	m.dropOrphanStateUsers(ctx)
	if err := m.shared.collect(ctx); err != nil && ctx.Err() == nil {
		m.log.Warn("shared egress pass failed: %s", failureText(err))
	}
}

// pinnedProxy is pinned_proxy(aid) (Q1): host, port and the address the
// gateway dials when the proxy is a host name; ok=false for direct, an
// address literal, no binding, or an unreadable configuration.
func (m *Manager) pinnedProxy(aid string) (host string, port int64, address string, ok bool) {
	desired, err := m.st.LoadDesired(aid)
	if err != nil {
		return "", 0, "", false
	}
	proxy, isObj := field(desired, "proxy").(pyjson.Ordered)
	if !isObj {
		return "", 0, "", false
	}
	host, _ = field(proxy, "host").(string)
	if host == "" || netplan.IsAddressLiteral(host) {
		return "", 0, "", false
	}
	ep := m.shared.endpoint(aid)
	if ep == nil {
		return "", 0, "", false
	}
	port, err = pyjson.IntOf(field(proxy, "port"))
	if err != nil {
		return "", 0, "", false
	}
	return host, port, ep.IP, true
}

// proxyMoved (Q2): the host no longer resolves to the pinned address. A
// failed lookup is no evidence.
func (m *Manager) proxyMoved(ctx context.Context, aid string) bool {
	host, _, address, ok := m.pinnedProxy(aid)
	if !ok {
		return false
	}
	found, err := m.resolver.LookupIPv4(ctx, host)
	if err != nil || len(found) == 0 {
		return false
	}
	for _, a := range found {
		if a.String() == address {
			return false
		}
	}
	return true
}

// recheckProxies (Q3): every online runtime whose lock is free; a moved
// proxy drops readiness (the core's next reconciliation resolves anew).
func (m *Manager) recheckProxies(ctx context.Context) {
	for _, aid := range m.onlineKeys() {
		h, ok := m.TryLock(aid)
		if !ok {
			continue // an apply or update is running; it resolves anew anyway
		}
		func() {
			defer h.Release()
			defer func() {
				if r := recover(); r != nil {
					m.log.Warn("proxy recheck key=%s: %s", aid, fmt.Sprint(r))
				}
			}()
			if _, on := m.onlineRev(aid); on && m.proxyMoved(ctx, aid) {
				m.log.Warn("proxy of key=%s resolves to another address; runtime marked pending", aid)
				m.dropReadiness(aid)
			}
		}()
	}
}
