package gateway

import (
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Token counting consumes nothing and says nothing about the account
// (2026-11-04).
func TestTokenCountingConsumesNothing(t *testing.T) {
	count := func(e *env) result { return e.do("/v1/messages/count_tokens", body(testModel, false), nil) }

	t.Run("full key and account slots do not refuse it", func(t *testing.T) {
		e := newEnv(t)
		e.auth.keys[testKey].KeyLimits = core.KeyLimits{Concurrency: 1}
		e.slots.inUse[core.KeySlots+":5"] = 1
		e.accounts.accounts[1].MaxConcurrency = 1
		e.slots.inUse["account:1"] = 1
		if r := count(e); r.status != 200 {
			t.Fatalf("%d %s", r.status, r.body)
		}
		e.record()
		if e.slots.inUse[core.KeySlots+":5"] != 1 || e.slots.inUse["account:1"] != 1 {
			t.Fatalf("slots changed: %v", e.slots.inUse)
		}
	})

	t.Run("the key's requests per minute do not count it", func(t *testing.T) {
		e := newEnv(t)
		e.mr.SetTime(time.Date(2026, 10, 26, 12, 0, 15, 0, time.UTC))
		e.auth.keys[testKey].KeyLimits = core.KeyLimits{RPM: 1}
		for range 3 {
			if r := count(e); r.status != 200 {
				t.Fatalf("%d %s", r.status, r.body)
			}
			e.record()
		}
		if r := e.messages(body(testModel, false)); r.status != 200 {
			t.Fatalf("the model request after them: %d %s", r.status, r.body)
		}
		e.record()
	})

	t.Run("it neither follows nor makes a session's binding", func(t *testing.T) {
		e := newEnv(t)
		e.enableSticky(onFailureFailover)
		countSession := func(session string) *core.UsageRecord {
			t.Helper()
			r := e.do("/v1/messages/count_tokens", withSession(body(testModel, false), session), nil)
			if r.status != 200 {
				t.Fatalf("%d %s", r.status, r.body)
			}
			return e.record()
		}
		countSession("unbound")
		if keys := e.mr.Keys(); slices.ContainsFunc(keys, func(k string) bool { return strings.HasPrefix(k, "sticky:") }) {
			t.Fatalf("a count touched sticky state: %v", keys)
		}
		bindSession(t, e, "bound")
		before := e.mr.Keys()
		if rec := countSession("bound"); rec.StickyRule != "" || rec.StickyHit {
			t.Fatalf("a count followed the binding: %+v", rec)
		}
		if after := e.mr.Keys(); !slices.Equal(before, after) {
			t.Fatalf("sticky state changed: %v -> %v", before, after)
		}
	})

	t.Run("a failed count leaves the account as it was", func(t *testing.T) {
		e := newEnv(t)
		e.up.set("acc-1", &upstreamRule{status: 429})
		count(e)
		e.record()
		if len(e.accounts.cooldowns) != 0 || len(e.accounts.disabled) != 0 {
			t.Fatalf("cooldowns %v disabled %v", e.accounts.cooldowns, e.accounts.disabled)
		}
	})
}
