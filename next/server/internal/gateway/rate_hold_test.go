package gateway

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/tokenizer"
)

func TestAccountReservationFollowsTheAttempts(t *testing.T) {
	lim := newFakeLimiter()
	e := newEnv(t, func(e *env) {})
	e.gw.d.Limiter = lim
	e.accounts.set(1, func(acc *core.Account) { acc.TPMLimit = 100000; acc.Priority = 99 })
	e.accounts.set(2, func(acc *core.Account) { acc.TPMLimit = 100000; acc.Priority = 98 })
	e.up.set("acc-1", &upstreamRule{status: 503})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	rec := e.record()
	prompt, _, err := tokenizer.Count(context.Background(), "hello there", "")
	if err != nil {
		t.Fatal(err)
	}
	// The prompt plus max_tokens, the same estimate on both attempts.
	if len(lim.reserved) != 2 || lim.reserved[0] != prompt+64 || lim.reserved[1] != prompt+64 {
		t.Fatalf("reserved %v, prompt %d", lim.reserved, prompt)
	}
	want := "1:0,2:" + itoa(rec.Tokens.Throughput(rec.UsageSemantics))
	if got := strings.Join(lim.settled, ","); got != want {
		t.Fatalf("settled %s, want %s", got, want)
	}
}

func TestNoEstimateWithoutATPMCap(t *testing.T) {
	lim := newFakeLimiter()
	e := newEnv(t, func(e *env) {})
	e.gw.d.Limiter = lim
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	e.record()
	if len(lim.reserved) != 1 || lim.reserved[0] != 0 {
		t.Fatalf("reserved %v", lim.reserved)
	}
}

func TestCutStreamWithoutUsageCountsThePrompt(t *testing.T) {
	lim := newFakeLimiter()
	c := &call{g: &Gateway{d: Deps{Limiter: lim}}, rec: &core.UsageRecord{}}
	c.accountHold = &core.RateHold{Subject: 3, Items: []core.RateHoldItem{{Tokens: 100}}}
	c.rateEstimate.prompt = 40
	c.countTokens(context.Background(), 3)
	if got := strings.Join(lim.settled, ","); got != "3:40" {
		t.Fatalf("settled %s", got)
	}
	if c.accountHold != nil {
		t.Fatal("hold kept after settling")
	}
}

func TestKeyReservation(t *testing.T) {
	setup := func(t *testing.T, tpm int64) *env {
		e := newEnv(t)
		e.mr.SetTime(time.Date(2026, 10, 26, 12, 0, 15, 0, time.UTC))
		e.auth.keys[testKey].KeyLimits = core.KeyLimits{TPM: tpm}
		return e
	}
	usage := func(t *testing.T, e *env) core.RateUsage {
		t.Helper()
		u, err := e.gw.d.KeyWindows.Usage(context.Background(), []int64{5})
		if err != nil {
			t.Fatal(err)
		}
		return u[5]
	}

	t.Run("a request in flight holds its tokens", func(t *testing.T) {
		e := setup(t, 70)
		release := make(chan struct{})
		e.up.set("acc-1", &upstreamRule{hold: release})
		e.up.set("acc-2", &upstreamRule{hold: release})
		e.up.set("acc-3", &upstreamRule{hold: release})
		done := make(chan result, 1)
		go func() { done <- e.messages(body(testModel, true)) }()
		deadline := time.Now().Add(5 * time.Second)
		for usage(t, e).TPM == 0 {
			if time.Now().After(deadline) {
				t.Fatal("no reservation seen")
			}
			time.Sleep(5 * time.Millisecond)
		}
		if r := e.messages(body(testModel, true)); r.status != 429 {
			t.Fatalf("second request while the first holds the cap: %d %s", r.status, r.body)
		}
		close(release)
		if r := <-done; r.status != 200 {
			t.Fatalf("first: %d %s", r.status, r.body)
		}
	})
	t.Run("a failed request gives its tokens back", func(t *testing.T) {
		e := setup(t, 100000)
		for _, key := range []string{"acc-1", "acc-2", "acc-3"} {
			e.up.set(key, &upstreamRule{status: 503})
		}
		if r := e.messages(body(testModel, false)); r.status == 200 {
			t.Fatalf("status %d", r.status)
		}
		e.record()
		if u := usage(t, e); u.TPM != 0 || u.RPM != 1 {
			t.Fatalf("%+v", u)
		}
	})
	t.Run("a finished request counts what it used", func(t *testing.T) {
		e := setup(t, 100000)
		if r := e.messages(body(testModel, false)); r.status != 200 {
			t.Fatalf("status %d %s", r.status, r.body)
		}
		rec := e.record()
		if u := usage(t, e); u.TPM != rec.Tokens.Throughput(rec.UsageSemantics) || u.TPM == 0 {
			t.Fatalf("%+v record %+v", u, rec.Tokens)
		}
	})
}
