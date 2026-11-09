package gateway

import (
	"context"
	"slices"
	"strings"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// tierRanker puts acc-1 (weighted) and acc-2 (zeroed) in tier 90 and acc-3
// in tier 10, as dynweight does when it lowers one account of a tier.
func tierRanker(e *env) {
	e.addRanker("dyn", manifest.SchedulerRank{}, &fakeRanker{
		fn: func(context.Context, *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			return []*pluginv1.RankedAccount{rank(1, 90, 1000), rank(2, 90, 0), rank(3, 10, 1000)}, nil
		}})
}

// The ranking is computed once and reused by failover: a zeroed account is
// out of the request for good, so once the weighted account of its tier
// failed the request drops to the next tier (CONTRACTS §24.3, §74.5).
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

// While the weighted account of its tier serves, the zeroed peer is never
// picked, request after request.
func TestRankZeroWeightNeverPickedAcrossRequests(t *testing.T) {
	e := newEnv(t)
	tierRanker(e)
	for i := 0; i < 10; i++ {
		if r := e.messages(body(testModel, false)); r.status != 200 {
			t.Fatalf("request %d: status %d %s", i, r.status, r.body)
		}
		e.record()
	}
	if k := e.up.keys(); len(k) != 10 || slices.ContainsFunc(k, func(s string) bool { return s != "acc-1" }) {
		t.Fatalf("upstream %v, want ten requests on acc-1 alone", k)
	}
}

// A tier the plugin zeroed entirely is skipped while a lower tier still has
// weight: the request lands there, no fallback inside the zeroed tier.
func TestRankTierAllZeroFallsToNextTier(t *testing.T) {
	e := newEnv(t)
	e.addRanker("dyn", manifest.SchedulerRank{}, &fakeRanker{
		fn: func(context.Context, *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			return []*pluginv1.RankedAccount{rank(1, 90, 0), rank(2, 90, 0), rank(3, 10, 1000)}, nil
		}})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if k := strings.Join(e.up.keys(), ","); k != "acc-3" {
		t.Fatalf("upstream %s, want acc-3 (tier 90 zeroed entirely)", k)
	}
	e.record()
}

// pick skips a zeroed account before it looks at the rate limiter, so a
// zeroed account's exhausted window never marks the request as limited. With
// no other candidate, though, zeroing it is "every candidate zeroed" and the
// rewrite is discarded (§24.3 fail open): the account serves on its own
// weight, finds its window exhausted, and the client gets 429 rate_limited,
// not 503 no_available_account.
func TestRankZeroWeightSoleCandidateLimitedIsRateLimited(t *testing.T) {
	lim := newFakeLimiter()
	e := newEnv(t)
	e.gw.d.Limiter = lim
	e.accounts.groups[testGroup] = []int64{1}
	e.accounts.set(1, func(acc *core.Account) { acc.RPMLimit = 1 })
	lim.exhausted[1] = true
	dyn := e.addRanker("dyn", manifest.SchedulerRank{}, &fakeRanker{
		fn: func(context.Context, *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			return []*pluginv1.RankedAccount{rank(1, 90, 0)}, nil
		}})
	r := e.messages(body(testModel, false))
	if r.status != 429 || r.json().Get("error.code").String() != core.ErrRateLimited.Code {
		t.Fatalf("status %d %s, want 429 %s", r.status, r.body, core.ErrRateLimited.Code)
	}
	if dyn.count() != 1 || len(e.up.keys()) != 0 {
		t.Fatalf("ranker calls %d, upstream %v", dyn.count(), e.up.keys())
	}
	if rec := e.record(); rec.ErrorType != errTypeNoAccount || len(rec.SchedDecisions) != 0 {
		t.Fatalf("record %+v", rec)
	}
}

// Splitting a tier the plugin lowered entirely is the plugin's job: it
// gives each account 1 (as dynweight does) and the tier serves as usual.
func TestRankTierEvenlySplitByPlugin(t *testing.T) {
	e := newEnv(t)
	e.addRanker("dyn", manifest.SchedulerRank{}, &fakeRanker{
		fn: func(context.Context, *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			return []*pluginv1.RankedAccount{rank(1, 90, 1), rank(2, 90, 1), rank(3, 10, 1000)}, nil
		}})
	e.up.set("acc-1", &upstreamRule{status: 500})
	e.up.set("acc-2", &upstreamRule{status: 500})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	k := strings.Join(e.up.keys(), ",")
	if k != "acc-1,acc-2,acc-3" && k != "acc-2,acc-1,acc-3" {
		t.Fatalf("upstream order %s, want both tier-90 accounts before acc-3", k)
	}
	e.record()
}

// A plugin zeroing every candidate is fail open: the accounts' own
// priority and weight decide, failover included.
func TestRankAllZeroFallsBackToOwnWeights(t *testing.T) {
	e := newEnv(t)
	e.addRanker("dyn", manifest.SchedulerRank{}, &fakeRanker{
		fn: func(context.Context, *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			return []*pluginv1.RankedAccount{rank(1, 90, 0), rank(2, 90, 0), rank(3, 10, 0)}, nil
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
