package gateway

import (
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// The caps an API key's owner sets (CONTRACTS §60) refuse the request with a
// 429 and Retry-After before any account is chosen.
func TestAPIKeyCaps(t *testing.T) {
	limited := func(t *testing.T, e *env, r result, retry string) {
		t.Helper()
		if r.status != 429 || r.json().Get("error.type").String() != "rate_limit_error" || !strings.Contains(r.json().Get("error.message").String(), "API key") {
			t.Fatalf("want the key's 429: %d %s", r.status, r.body)
		}
		if got := r.header.Get("Retry-After"); retry != "" && got != retry || got == "" {
			t.Fatalf("Retry-After %q, want %q", got, retry)
		}
		if rec := e.record(); rec.ErrorType != errTypeRateLimited {
			t.Fatalf("record error type %q", rec.ErrorType)
		}
	}
	setup := func(t *testing.T, l core.KeyLimits) *env {
		e := newEnv(t)
		e.mr.SetTime(time.Date(2026, 10, 26, 12, 0, 15, 0, time.UTC)) // one minute window for the whole test
		e.auth.keys[testKey].KeyLimits = l
		return e
	}

	t.Run("concurrency", func(t *testing.T) {
		e := setup(t, core.KeyLimits{Concurrency: 1})
		e.slots.inUse[core.KeySlots+":5"] = 1
		limited(t, e, e.messages(body(testModel, false)), "5")
		if len(e.up.keys()) != 0 {
			t.Fatal("a refused request reached an upstream")
		}
		e.slots.inUse[core.KeySlots+":5"] = 0
		if r := e.messages(body(testModel, false)); r.status != 200 {
			t.Fatalf("free slot: %d %s", r.status, r.body)
		}
		e.record()
		if e.slots.inUse[core.KeySlots+":5"] != 0 {
			t.Fatal("the key's slot was not released")
		}
	})
	t.Run("requests per minute", func(t *testing.T) {
		e := setup(t, core.KeyLimits{RPM: 1})
		if r := e.messages(body(testModel, false)); r.status != 200 {
			t.Fatalf("first: %d %s", r.status, r.body)
		}
		e.record()
		limited(t, e, e.messages(body(testModel, false)), "45") // 12:00:15 -> next window in 45 s
		if n := len(e.up.keys()); n != 1 {
			t.Fatalf("upstream calls %d", n)
		}
	})
	t.Run("tokens per minute", func(t *testing.T) {
		e := setup(t, core.KeyLimits{TPM: 1})
		// Tokens are counted when the response finishes, so the first request
		// passes and fills the window.
		if r := e.messages(body(testModel, false)); r.status != 200 {
			t.Fatalf("first: %d %s", r.status, r.body)
		}
		e.record()
		limited(t, e, e.messages(body(testModel, false)), "")
	})
	t.Run("uncapped keys are counted", func(t *testing.T) {
		e := setup(t, core.KeyLimits{})
		for range 3 {
			if r := e.messages(body(testModel, false)); r.status != 200 {
				t.Fatalf("%d %s", r.status, r.body)
			}
			e.record()
		}
		u, err := e.gw.d.KeyWindows.Usage(t.Context(), []int64{5})
		if err != nil || u[5].RPM != 3 || u[5].TPM == 0 {
			t.Fatalf("usage %+v %v", u, err)
		}
	})
}
