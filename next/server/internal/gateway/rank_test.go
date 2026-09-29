package gateway

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// fakeRanker is a plugin declaring scheduler.rank: fn decides what it
// rewrites, and calls records what it saw.
type fakeRanker struct {
	mu    sync.Mutex
	calls []*pluginv1.RankAccountsRequest
	fn    func(ctx context.Context, in *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error)
}

func (r *fakeRanker) ResolveAffinityKey(context.Context, *pluginv1.ResolveAffinityKeyRequest) (*pluginv1.ResolveAffinityKeyResponse, error) {
	return nil, status.Error(codes.Unimplemented, "no")
}

func (r *fakeRanker) RankAccounts(ctx context.Context, in *pluginv1.RankAccountsRequest) (*pluginv1.RankAccountsResponse, error) {
	r.mu.Lock()
	r.calls = append(r.calls, in)
	fn := r.fn
	r.mu.Unlock()
	if fn == nil {
		return &pluginv1.RankAccountsResponse{}, nil
	}
	accs, err := fn(ctx, in)
	if err != nil {
		return nil, err
	}
	return &pluginv1.RankAccountsResponse{Accounts: accs}, nil
}

func (r *fakeRanker) count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.calls)
}

func (r *fakeRanker) last() *pluginv1.RankAccountsRequest {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.calls) == 0 {
		return nil
	}
	return r.calls[len(r.calls)-1]
}

// addRanker registers a plugin taking part in scheduling. The registry hands
// the bindings out already sorted, so tests append in call order.
func (e *env) addRanker(key string, rank manifest.SchedulerRank, client core.SchedulerPlugin) *fakeRanker {
	info := core.PluginInfo{Key: key, Version: "0.1.0",
		Manifest: &manifest.Manifest{Key: key, Scheduler: &manifest.Scheduler{Rank: &rank}}}
	e.gen.rankers = append(e.gen.rankers, core.AccountRankerBinding{Plugin: info, Rank: rank, Client: client})
	if r, ok := client.(*fakeRanker); ok {
		return r
	}
	return nil
}

func rank(id int64, priority, weight int32) *pluginv1.RankedAccount {
	return &pluginv1.RankedAccount{AccountId: id, Priority: priority, Weight: weight}
}

// samePriority puts every fixture account in one priority group, so only the
// weights decide the order.
func samePriority(e *env) {
	for _, id := range []int64{1, 2, 3} {
		e.accounts.set(id, func(acc *core.Account) { acc.Priority = 10 })
	}
}

// A request served by its sticky binding never reaches the plugins.
func TestRankNotCalledOnStickyHit(t *testing.T) {
	e := newEnv(t)
	e.enableSticky(onFailureFailover)
	sched := &fakeScheduler{}
	e.addRanker("guard", manifest.SchedulerRank{}, sched)

	sess := withSession(body(testModel, false), "rank-sess")
	if r := e.messages(sess); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	e.record()
	if sched.gotRank == nil {
		t.Fatal("the first request missed the binding: the plugin should have been asked")
	}
	sched.gotRank = nil
	// Second request: the binding hits, so nothing is asked.
	if r := e.messages(sess); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if rec := e.record(); !rec.StickyHit {
		t.Fatalf("expected a sticky hit: %+v", rec)
	}
	if sched.gotRank != nil {
		t.Fatalf("plugin called on a sticky hit: %+v", sched.gotRank)
	}
}

// One call per request, reused by every failover attempt; the request it
// builds carries the candidates with normalized weights.
func TestRankCalledOncePerRequest(t *testing.T) {
	e := newEnv(t)
	r := e.addRanker("guard", manifest.SchedulerRank{}, &fakeRanker{})
	e.up.set("acc-1", &upstreamRule{status: 500})

	res := e.messages(body(testModel, false))
	if res.status != 200 {
		t.Fatalf("status %d %s", res.status, res.body)
	}
	if k := strings.Join(e.up.keys(), ","); k != "acc-1,acc-2" {
		t.Fatalf("upstream order %s, want the failover acc-1,acc-2", k)
	}
	if rec := e.record(); rec.Attempts != 2 || len(rec.SchedDecisions) != 0 {
		t.Fatalf("record attempts=%d sched=%v", rec.Attempts, rec.SchedDecisions)
	}
	if n := r.count(); n != 1 {
		t.Fatalf("RankAccounts called %d times, want 1 (failover reuses the result)", n)
	}
	in := r.last()
	if len(in.GetCandidates()) != 3 || in.GetMeta().GetModel() != testModel || in.GetMeta().GetRequestId() == "" {
		t.Fatalf("request %+v", in)
	}
	c0 := in.GetCandidates()[0]
	if c0.GetAccountId() != 1 || c0.GetName() != "acc-1" || c0.GetAccountType() != "apikey" ||
		c0.GetTypePluginKey() != "anthropic" || c0.GetPriority() != 1 || c0.GetWeight() != 1 {
		t.Fatalf("candidate %+v: weight must be normalized to 1-1000", c0)
	}
}

// A heavier weight changes which account of a priority group is drawn first.
func TestRankWeightChangesTheDraw(t *testing.T) {
	e := newEnv(t)
	samePriority(e)
	e.gw.randFloat = func() float64 { return 0.5 }

	// Equal weights: 0.5 of the total lands on the second account.
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	e.record()
	if k := strings.Join(e.up.keys(), ","); k != "acc-2" {
		t.Fatalf("without ranking: %s, want acc-2", k)
	}

	e.addRanker("guard", manifest.SchedulerRank{}, &fakeRanker{
		fn: func(context.Context, *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			return []*pluginv1.RankedAccount{rank(3, 10, 1000)}, nil
		}})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	rec := e.record()
	if k := e.up.keys(); k[len(k)-1] != "acc-3" {
		t.Fatalf("with ranking: %v, want acc-3 last", k)
	}
	if len(rec.SchedDecisions) != 1 || rec.SchedDecisions[0].PluginKey != "guard" ||
		len(rec.SchedDecisions[0].Changed) != 1 || rec.SchedDecisions[0].Changed[0] != (core.RankChange{AccountID: 3, Priority: 10, Weight: 1000}) {
		t.Fatalf("sched decisions %+v", rec.SchedDecisions)
	}
}

// weight 0 takes the account out of this request; the others still serve it.
func TestRankWeightZeroExcludesAccount(t *testing.T) {
	e := newEnv(t)
	e.addRanker("guard", manifest.SchedulerRank{}, &fakeRanker{
		fn: func(context.Context, *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			return []*pluginv1.RankedAccount{rank(1, 1, 0)}, nil
		}})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if k := strings.Join(e.up.keys(), ","); k != "acc-2" {
		t.Fatalf("upstream %s, want acc-2 (acc-1 excluded for this request)", k)
	}
	rec := e.record()
	if len(rec.SchedDecisions) != 1 || rec.SchedDecisions[0].Changed[0].Weight != 0 {
		t.Fatalf("sched decisions %+v", rec.SchedDecisions)
	}
	// The account itself is untouched: the next request uses it again.
	e.gen.rankers = nil
	e.messages(body(testModel, false))
	e.record()
	if k := e.up.keys(); k[len(k)-1] != "acc-1" {
		t.Fatalf("after ranking: %v, want acc-1 back", k)
	}
}

// Excluding every candidate is not allowed to leave the gateway without an
// account: the whole rewrite is dropped.
func TestRankExcludingEveryCandidateFallsBack(t *testing.T) {
	e := newEnv(t)
	e.addRanker("guard", manifest.SchedulerRank{}, &fakeRanker{
		fn: func(_ context.Context, in *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			var out []*pluginv1.RankedAccount
			for _, c := range in.GetCandidates() {
				out = append(out, rank(c.GetAccountId(), c.GetPriority(), 0))
			}
			return out, nil
		}})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if k := strings.Join(e.up.keys(), ","); k != "acc-1" {
		t.Fatalf("upstream %s, want acc-1 (the accounts' own values)", k)
	}
	if rec := e.record(); len(rec.SchedDecisions) != 0 {
		t.Fatalf("a discarded rewrite must not be recorded: %+v", rec.SchedDecisions)
	}
}

// Errors and timeouts are fail open.
func TestRankFailuresFallBack(t *testing.T) {
	for _, tc := range []struct {
		name string
		rank manifest.SchedulerRank
		fn   func(ctx context.Context, in *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error)
	}{
		{"error", manifest.SchedulerRank{}, func(context.Context, *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			return nil, errors.New("boom")
		}},
		{"timeout", manifest.SchedulerRank{TimeoutMs: 50}, func(ctx context.Context, _ *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			select {
			case <-time.After(5 * time.Second):
				return nil, nil
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			e := newEnv(t)
			r := e.addRanker("guard", tc.rank, &fakeRanker{fn: tc.fn})
			start := time.Now()
			if res := e.messages(body(testModel, false)); res.status != 200 {
				t.Fatalf("status %d %s", res.status, res.body)
			}
			if k := strings.Join(e.up.keys(), ","); k != "acc-1" {
				t.Fatalf("upstream %s, want acc-1 (the accounts' own values)", k)
			}
			if rec := e.record(); len(rec.SchedDecisions) != 0 {
				t.Fatalf("sched decisions %+v", rec.SchedDecisions)
			}
			if r.count() != 1 {
				t.Fatalf("calls %d", r.count())
			}
			if tc.name == "timeout" && time.Since(start) > 2*time.Second {
				t.Fatalf("the declared timeout did not bound the call: %s", time.Since(start))
			}
		})
	}
}

// Plugins run serially in binding order and each sees the previous result;
// a failing one does not undo what the ones before it did.
func TestRankPluginsRunSerially(t *testing.T) {
	e := newEnv(t)
	samePriority(e)
	first := e.addRanker("first", manifest.SchedulerRank{Order: 10}, &fakeRanker{
		fn: func(context.Context, *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			return []*pluginv1.RankedAccount{rank(3, 0, 700)}, nil
		}})
	var seenPriority, seenWeight int32
	second := e.addRanker("second", manifest.SchedulerRank{Order: 20}, &fakeRanker{
		fn: func(_ context.Context, in *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			for _, c := range in.GetCandidates() {
				if c.GetAccountId() == 3 {
					seenPriority, seenWeight = c.GetPriority(), c.GetWeight()
				}
			}
			return []*pluginv1.RankedAccount{rank(3, 0, 900)}, nil
		}})
	broken := e.addRanker("broken", manifest.SchedulerRank{Order: 30}, &fakeRanker{
		fn: func(context.Context, *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			return nil, errors.New("boom")
		}})

	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	rec := e.record()
	if first.count() != 1 || second.count() != 1 || broken.count() != 1 {
		t.Fatalf("calls %d %d %d", first.count(), second.count(), broken.count())
	}
	if seenPriority != 0 || seenWeight != 700 {
		t.Fatalf("the second plugin saw %d/%d, want the first plugin's 0/700", seenPriority, seenWeight)
	}
	// acc-3 alone in priority 0: the whole rewrite survived the broken plugin.
	if k := strings.Join(e.up.keys(), ","); k != "acc-3" {
		t.Fatalf("upstream %s, want acc-3", k)
	}
	if len(rec.SchedDecisions) != 2 || rec.SchedDecisions[0].PluginKey != "first" ||
		rec.SchedDecisions[1].PluginKey != "second" ||
		rec.SchedDecisions[0].Changed[0].Weight != 700 || rec.SchedDecisions[1].Changed[0].Weight != 900 {
		t.Fatalf("sched decisions %+v", rec.SchedDecisions)
	}
}

// Out-of-range values are clamped, unknown accounts ignored, and accounts
// left at their current values are not recorded.
func TestRankClampsAndIgnoresUnknownAccounts(t *testing.T) {
	e := newEnv(t)
	e.addRanker("guard", manifest.SchedulerRank{}, &fakeRanker{
		fn: func(_ context.Context, in *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			return []*pluginv1.RankedAccount{
				rank(1, -5, 99999), // clamped to 0 / 1000
				rank(2, 1<<30, 1),  // priority clamped to 1000000
				rank(3, 90, 1),     // unchanged: not recorded
				rank(404, 0, 1000), // not a candidate: ignored
			}, nil
		}})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if k := strings.Join(e.up.keys(), ","); k != "acc-1" {
		t.Fatalf("upstream %s, want acc-1 (priority 0)", k)
	}
	rec := e.record()
	if len(rec.SchedDecisions) != 1 {
		t.Fatalf("sched decisions %+v", rec.SchedDecisions)
	}
	want := []core.RankChange{{AccountID: 1, Priority: 0, Weight: maxRankWeight}, {AccountID: 2, Priority: maxRankPriority, Weight: 1}}
	got := rec.SchedDecisions[0].Changed
	if len(got) != len(want) || got[0] != want[0] || got[1] != want[1] {
		t.Fatalf("changed %+v, want %+v", got, want)
	}
}

// Requests the match block does not cover cost nothing.
func TestRankMatchFiltersRequests(t *testing.T) {
	e := newEnv(t)
	r := e.addRanker("guard", manifest.SchedulerRank{Match: manifest.HookMatch{Models: []string{"gpt-*"}}}, &fakeRanker{})
	if res := e.messages(body(testModel, false)); res.status != 200 {
		t.Fatalf("status %d %s", res.status, res.body)
	}
	if rec := e.record(); len(rec.SchedDecisions) != 0 {
		t.Fatalf("sched decisions %+v", rec.SchedDecisions)
	}
	if r.count() != 0 {
		t.Fatalf("a non matching ranker was called %d times", r.count())
	}
}
