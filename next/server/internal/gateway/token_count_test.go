package gateway

import (
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
