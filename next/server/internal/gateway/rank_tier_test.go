package gateway

import (
	"context"
	"strings"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// tierRanker puts acc-1 (weighted) and acc-2 (zeroed) in tier 10 and acc-3
// in tier 90, as dynweight does when it lowers one account of a tier.
func tierRanker(e *env) {
	e.addRanker("dyn", manifest.SchedulerRank{}, &fakeRanker{
		fn: func(context.Context, *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			return []*pluginv1.RankedAccount{rank(1, 10, 1000), rank(2, 10, 0), rank(3, 90, 1000)}, nil
		}})
}

// The ranking is computed once and reused by failover: once the weighted
// account of a tier failed, its zeroed peer serves before any lower tier
// (CONTRACTS §24.3, §74.5).
func TestRankZeroWeightServesTierAfterFailover(t *testing.T) {
	e := newEnv(t)
	tierRanker(e)
	e.up.set("acc-1", &upstreamRule{status: 500})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if k := strings.Join(e.up.keys(), ","); k != "acc-1,acc-2" {
		t.Fatalf("upstream order %s, want acc-1 then its tier peer acc-2", k)
	}
	e.record()
}

// Without a failure the zeroed account is not used.
func TestRankZeroWeightUnusedWhileTierServes(t *testing.T) {
	e := newEnv(t)
	tierRanker(e)
	for i := 0; i < 10; i++ {
		if r := e.messages(body(testModel, false)); r.status != 200 {
			t.Fatalf("status %d %s", r.status, r.body)
		}
		e.record()
	}
	for _, k := range e.up.keys() {
		if k != "acc-1" {
			t.Fatalf("upstream %v, want only acc-1", e.up.keys())
		}
	}
}

// A weighted account whose concurrency slots are full, or whose rate
// window is exhausted, leaves the tier to its zeroed peer too.
func TestRankZeroWeightServesTierWhenWeightedBusy(t *testing.T) {
	e := newEnv(t)
	tierRanker(e)
	e.accounts.set(1, func(acc *core.Account) { acc.MaxConcurrency = 1 })
	e.slots.inUse["account:1"] = 1
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if k := strings.Join(e.up.keys(), ","); k != "acc-2" {
		t.Fatalf("upstream %s, want acc-2 (acc-1 busy)", k)
	}
	e.record()
}

func TestRankZeroWeightServesTierWhenWeightedLimited(t *testing.T) {
	lim := newFakeLimiter()
	e := newEnv(t)
	e.gw.d.Limiter = lim
	tierRanker(e)
	e.accounts.set(1, func(acc *core.Account) { acc.RPMLimit = 1 })
	lim.exhausted[1] = true
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if k := strings.Join(e.up.keys(), ","); k != "acc-2" {
		t.Fatalf("upstream %s, want acc-2 (acc-1 rate-limited)", k)
	}
	e.record()
}
