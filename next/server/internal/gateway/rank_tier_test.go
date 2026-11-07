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

// The ranking is computed once and reused by failover: a zeroed account is
// out of the request for good, so once the weighted account of its tier
// failed the request drops to the next tier (CONTRACTS §24.3, §74.5,
// 2026-11-07).
func TestRankZeroWeightSkippedAfterFailover(t *testing.T) {
	e := newEnv(t)
	tierRanker(e)
	e.up.set("acc-1", &upstreamRule{status: 500})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if k := strings.Join(e.up.keys(), ","); k != "acc-1,acc-3" {
		t.Fatalf("upstream order %s, want acc-1 then the next tier's acc-3, never acc-2", k)
	}
	e.record()
}

// A weighted account whose concurrency slots are full, or whose rate
// window is exhausted, does not hand its tier to the zeroed peer either.
func TestRankZeroWeightSkippedWhenWeightedBusy(t *testing.T) {
	e := newEnv(t)
	tierRanker(e)
	e.accounts.set(1, func(acc *core.Account) { acc.MaxConcurrency = 1 })
	e.slots.inUse["account:1"] = 1
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if k := strings.Join(e.up.keys(), ","); k != "acc-3" {
		t.Fatalf("upstream %s, want acc-3 (acc-1 busy, acc-2 zeroed)", k)
	}
	e.record()
}

func TestRankZeroWeightSkippedWhenWeightedLimited(t *testing.T) {
	lim := newFakeLimiter()
	e := newEnv(t)
	e.gw.d.Limiter = lim
	tierRanker(e)
	e.accounts.set(1, func(acc *core.Account) { acc.RPMLimit = 1 })
	lim.exhausted[1] = true
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if k := strings.Join(e.up.keys(), ","); k != "acc-3" {
		t.Fatalf("upstream %s, want acc-3 (acc-1 rate-limited, acc-2 zeroed)", k)
	}
	e.record()
}

// Splitting a tier the plugin lowered entirely is the plugin's job: it
// gives each account 1 (as dynweight does) and the tier serves as usual.
func TestRankTierEvenlySplitByPlugin(t *testing.T) {
	e := newEnv(t)
	e.addRanker("dyn", manifest.SchedulerRank{}, &fakeRanker{
		fn: func(context.Context, *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			return []*pluginv1.RankedAccount{rank(1, 10, 1), rank(2, 10, 1), rank(3, 90, 1000)}, nil
		}})
	e.up.set("acc-1", &upstreamRule{status: 500})
	e.up.set("acc-2", &upstreamRule{status: 500})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	k := strings.Join(e.up.keys(), ",")
	if k != "acc-1,acc-2,acc-3" && k != "acc-2,acc-1,acc-3" {
		t.Fatalf("upstream order %s, want both tier-10 accounts before acc-3", k)
	}
	e.record()
}

// A plugin zeroing every candidate is fail open: the accounts' own
// priority and weight decide, failover included.
func TestRankAllZeroFallsBackToOwnWeights(t *testing.T) {
	e := newEnv(t)
	e.addRanker("dyn", manifest.SchedulerRank{}, &fakeRanker{
		fn: func(context.Context, *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			return []*pluginv1.RankedAccount{rank(1, 10, 0), rank(2, 10, 0), rank(3, 90, 0)}, nil
		}})
	e.up.set("acc-1", &upstreamRule{status: 500})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if k := strings.Join(e.up.keys(), ","); k != "acc-1,acc-2" {
		t.Fatalf("upstream order %s, want the accounts' own order acc-1 then acc-2", k)
	}
	if rec := e.record(); len(rec.SchedDecisions) != 0 {
		t.Fatalf("a discarded rewrite must not be recorded: %+v", rec.SchedDecisions)
	}
}
