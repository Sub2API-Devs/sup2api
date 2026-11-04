package gateway

import (
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// The session in docs/audits/2026-11-04-sticky-load-tier.md moved between 28
// accounts, rewriting its whole context each time. These are the ways it moved.
func TestStickySessionStaysTogether(t *testing.T) {
	const session = "session-together"
	sess := withSession(body(testModel, false), session)
	key := func(e *env) string { return stickyKey(e.gw.rules.override[0], testGroup, testModel, session) }

	t.Run("concurrent requests of a new session land on one account", func(t *testing.T) {
		e := newEnv(t)
		e.enableSticky(onFailureFailover)
		e.up.set("acc-1", &upstreamRule{delay: 80 * time.Millisecond})
		e.up.set("acc-2", &upstreamRule{delay: 80 * time.Millisecond})
		e.up.set("acc-3", &upstreamRule{delay: 80 * time.Millisecond})
		var wg sync.WaitGroup
		for range 4 {
			wg.Go(func() {
				if r := e.messages(sess); r.status != 200 {
					t.Errorf("%d %s", r.status, r.body)
				}
			})
		}
		wg.Wait()
		seen := map[string]bool{}
		for _, k := range e.up.keys() {
			seen[k] = true
		}
		if len(seen) != 1 {
			t.Fatalf("served by %v", e.up.keys())
		}
	})

	t.Run("a request that overflows does not move the binding", func(t *testing.T) {
		e := newEnv(t)
		e.enableSticky(onFailureFailover)
		e.setSettings(noQueueSettings(), StickySettings{Enabled: true, DefaultTTLSeconds: 3600})
		id, bound := bindSession(t, e, session)
		e.setSlots("account:"+id, 1, 1)
		if r := e.messages(sess); r.status != 200 {
			t.Fatalf("%d %s", r.status, r.body)
		}
		e.record()
		if k := e.up.last().key; k == bound {
			t.Fatal("the full account served")
		}
		if v, _ := e.mr.Get(key(e)); v != id {
			t.Fatalf("binding %q, want %q", v, id)
		}
		e.setSlots("account:"+id, 0, 0)
		if r := e.messages(sess); r.status != 200 {
			t.Fatalf("%d %s", r.status, r.body)
		}
		if rec := e.record(); !rec.StickyHit || e.up.last().key != bound {
			t.Fatalf("did not go back: hit %v, served by %s", rec.StickyHit, e.up.last().key)
		}
	})

	t.Run("a hit only renews the binding", func(t *testing.T) {
		e := newEnv(t)
		e.enableSticky(onFailureFailover)
		id, _ := bindSession(t, e, session)
		e.mr.FastForward(30 * time.Minute)
		before := e.mr.TTL(key(e))
		if r := e.messages(sess); r.status != 200 {
			t.Fatalf("%d %s", r.status, r.body)
		}
		e.record()
		if e.mr.TTL(key(e)) <= before {
			t.Fatalf("ttl %v, was %v", e.mr.TTL(key(e)), before)
		}
		if v, _ := e.mr.Get(key(e)); v != id {
			t.Fatalf("binding %q", v)
		}
	})

	t.Run("a new session is not bound to an account being queued for", func(t *testing.T) {
		e := newEnv(t)
		e.enableSticky(onFailureFailover)
		e.accounts.set(1, func(acc *core.Account) { acc.Priority = 1 })
		e.accounts.set(2, func(acc *core.Account) { acc.Priority = 2 })
		e.accounts.set(3, func(acc *core.Account) { acc.Priority = 3 })
		e.setSlots(core.AccountWaitSlots+":1", 1, 0)
		if r := e.messages(sess); r.status != 200 {
			t.Fatalf("%d %s", r.status, r.body)
		}
		e.record()
		if k := e.up.last().key; k != "acc-2" {
			t.Fatalf("served by %s", k)
		}
	})

	t.Run("a binding to an account out of the candidates moves once", func(t *testing.T) {
		e := newEnv(t)
		e.enableSticky(onFailureFailover)
		e.setFailurePolicy(testFailurePolicy())
		id, _ := bindSession(t, e, session)
		e.accounts.AutoDisable(t.Context(), int64FromString(t, id), "quota")
		if r := e.messages(sess); r.status != 200 {
			t.Fatalf("%d %s", r.status, r.body)
		}
		e.record()
		first := e.up.last().key
		for range 3 {
			if r := e.messages(sess); r.status != 200 {
				t.Fatalf("%d %s", r.status, r.body)
			}
			if rec := e.record(); !rec.StickyHit || e.up.last().key != first {
				t.Fatalf("scattered: hit %v, served by %s, want %s", rec.StickyHit, e.up.last().key, first)
			}
		}
	})

	t.Run("a refused rate is no sticky hit", func(t *testing.T) {
		lim := newFakeLimiter()
		e := newEnv(t)
		e.gw.d.Limiter = lim
		e.enableSticky(onFailureFailover)
		id, _ := bindSession(t, e, session)
		lim.refused = map[int64]bool{int64FromString(t, id): true}
		if r := e.messages(sess); r.status != 200 {
			t.Fatalf("%d %s", r.status, r.body)
		}
		if rec := e.record(); rec.StickyHit {
			t.Fatal("reported a hit on an account that did not serve")
		}
	})
}

func int64FromString(t *testing.T, s string) int64 {
	t.Helper()
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		t.Fatal(err)
	}
	return n
}
