package gateway

import (
	"context"
	"errors"
	"math"
	"math/rand"
	"slices"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// share is the first-draw probability of account i under weights w.
func share(w []float64, i int) float64 {
	sum := 0.0
	for _, v := range w {
		sum += v
	}
	return w[i] / sum
}

// The examples of CONTRACTS §89: 40 to 0 goes 98.8% to the idle account, 100
// to 90 goes 54% to the lighter one, usage in the weight ratio keeps it, and
// an idle tier keeps the weights.
func TestTrafficWeights(t *testing.T) {
	cases := []struct {
		name    string
		w, used []float64
		i       int
		want    float64
	}{
		{"idle account", []float64{1, 1}, []float64{40, 0}, 1, 0.988},
		{"close usage", []float64{1, 1}, []float64{100, 90}, 1, 0.542},
		{"weight ratio kept", []float64{2, 1}, []float64{60, 30}, 0, 2.0 / 3},
		{"idle tier", []float64{3, 1}, []float64{0, 0}, 0, 0.75},
	}
	for _, tc := range cases {
		if got := share(trafficWeights(tc.w, tc.used), tc.i); math.Abs(got-tc.want) > 0.001 {
			t.Errorf("%s: share %.4f, want %.3f", tc.name, got, tc.want)
		}
	}
}

func TestLoadedWeightAndUsageLoad(t *testing.T) {
	if got := loadedWeight(3, 0); got != 3 {
		t.Fatalf("no load: %v", got)
	}
	if got := loadedWeight(1, 90); math.Abs(got-0.1) > 1e-9 {
		t.Fatalf("load 90: %v", got)
	}
	// A full account keeps the §67 floor: max(1, w×0) over the ×100 scale.
	if got := loadedWeight(1000, 100); got != minLoadedWeight {
		t.Fatalf("load 100: %v", got)
	}
	cases := []struct {
		u    accountUsage
		want float64
	}{
		{accountUsage{used: 90, limit: 100}, 90},
		{accountUsage{used: 90}, 0},                                           // no limit
		{accountUsage{used: 300, limit: 100}, 100},                            // capped
		{accountUsage{used: 30, limit: 100, listUsed: 18, listLimit: 20}, 90}, // the list is tighter
		{accountUsage{used: 80, limit: 100, listUsed: 1, listLimit: 20}, 80},  // the account is tighter
		{accountUsage{used: 0, limit: 100, listUsed: 5, listLimit: 0}, 0},     // a list without that limit
	}
	for _, tc := range cases {
		if got := tc.u.load(); math.Abs(got-tc.want) > 1e-9 {
			t.Errorf("%+v: load %v, want %v", tc.u, got, tc.want)
		}
	}
}

// balanceEnv is the test env with the three accounts in one tier, a limiter
// reporting usage and the given scheduling settings.
func balanceEnv(t *testing.T, cfg SchedulingSettings, usage map[int64]core.RateUsage) (*env, *fakeLimiter) {
	e := newEnv(t)
	samePriority(e)
	lim := newFakeLimiter()
	lim.usage = usage
	e.gw.d.Limiter = lim
	e.setScheduling(cfg)
	e.gw.randFloat = rand.New(rand.NewSource(7)).Float64
	return e, lim
}

// setScheduling replaces the scheduling settings, keeping the others.
func (e *env) setScheduling(cfg SchedulingSettings) {
	e.gw.settings.mu.Lock()
	defer e.gw.settings.mu.Unlock()
	o := *e.gw.settings.override
	o.scheduling = cfg
	e.gw.settings.override = &o
}

// serve sends n requests and counts the accounts that served them.
func serve(t *testing.T, e *env, n int) (map[string]int, []*core.UsageRecord) {
	t.Helper()
	served := map[string]int{}
	var recs []*core.UsageRecord
	for range n {
		if r := e.messages(body(testModel, false)); r.status != 200 {
			t.Fatalf("status %d %s", r.status, r.body)
		}
		recs = append(recs, e.record())
		served[e.up.last().key]++
	}
	return served, recs
}

func coreDecision(rec *core.UsageRecord) *core.SchedDecision {
	for i := range rec.SchedDecisions {
		if rec.SchedDecisions[i].PluginKey == "core" {
			return &rec.SchedDecisions[i]
		}
	}
	return nil
}

// The defaults read nothing and change nothing.
func TestBalanceOffReadsNothing(t *testing.T) {
	e, lim := balanceEnv(t, defaultSchedulingSettings(), map[int64]core.RateUsage{1: {RPM: 60}})
	_, recs := serve(t, e, 5)
	if lim.usageCalls != 0 {
		t.Fatalf("usage read %d times with the balancing off", lim.usageCalls)
	}
	if d := coreDecision(recs[0]); d != nil {
		t.Fatalf("core decision with the balancing off: %+v", d)
	}
}

// Traffic mode sends new sessions away from the busy account of the tier.
func TestBalanceTrafficFavoursIdleAccounts(t *testing.T) {
	cfg := SchedulingSettings{Mode: balanceModeTraffic, Metric: balanceMetricRPM}
	e, lim := balanceEnv(t, cfg, map[int64]core.RateUsage{1: {RPM: 60}})
	served, recs := serve(t, e, 200)
	// r = 3 against 0 and 0: acc-1 keeps 0.3% of the draws.
	if served["acc-1"] > 6 || served["acc-2"] < 70 || served["acc-3"] < 70 {
		t.Fatalf("served %v", served)
	}
	if lim.usageCalls != 200 {
		t.Fatalf("usage read %d times for 200 requests", lim.usageCalls)
	}
	d := coreDecision(recs[0])
	if d == nil || len(d.Changed) != 3 {
		t.Fatalf("core decision %+v", d)
	}
}

// The limit load lowers the weight in proportion to the use of the limit and
// is recorded; the traffic balance is off.
func TestBalanceLimitLoad(t *testing.T) {
	cfg := SchedulingSettings{Mode: balanceModeDefault, Metric: balanceMetricRPM, LimitLoad: true}
	e, _ := balanceEnv(t, cfg, map[int64]core.RateUsage{1: {RPM: 90}, 2: {RPM: 90}})
	e.accounts.set(1, func(a *core.Account) { a.RPMLimit = 100 })
	served, recs := serve(t, e, 300)
	// 0.1 : 1 : 1 is about 14, 143 and 143; acc-2 has no limit.
	if served["acc-1"] > 35 || served["acc-2"] < 110 || served["acc-3"] < 110 {
		t.Fatalf("served %v", served)
	}
	d := coreDecision(recs[0])
	if d == nil || len(d.Changed) != 1 || d.Changed[0].AccountID != 1 || d.Changed[0].Load != 90 || d.Changed[0].Weight != 10 {
		t.Fatalf("core decision %+v", d)
	}
}

// With model limits on, the model list holding the request's model counts
// when it is tighter than the account.
func TestBalanceLimitLoadModelList(t *testing.T) {
	cfg := SchedulingSettings{Mode: balanceModeDefault, Metric: balanceMetricRPM, LimitLoad: true, ModelLimits: true}
	usage := map[int64]core.RateUsage{1: {RPM: 30, Models: []core.ModelRateUsage{{Models: []string{testModel}, RPM: 18}}}}
	e, _ := balanceEnv(t, cfg, usage)
	e.accounts.set(1, func(a *core.Account) {
		a.RPMLimit = 100
		a.ModelLimits = []core.ModelLimit{{Models: []string{testModel}, RPMLimit: 20}}
	})
	_, recs := serve(t, e, 1)
	d := coreDecision(recs[0])
	if d == nil || d.Changed[0].Load != 90 {
		t.Fatalf("core decision %+v", d)
	}
}

// Without model limits the model list is ignored: only the account's own
// limit loads it.
func TestBalanceLimitLoadIgnoresListWithoutModelLimits(t *testing.T) {
	cfg := SchedulingSettings{Mode: balanceModeDefault, Metric: balanceMetricRPM, LimitLoad: true}
	usage := map[int64]core.RateUsage{1: {RPM: 30, Models: []core.ModelRateUsage{{Models: []string{testModel}, RPM: 18}}}}
	e, _ := balanceEnv(t, cfg, usage)
	e.accounts.set(1, func(a *core.Account) {
		a.RPMLimit = 100
		a.ModelLimits = []core.ModelLimit{{Models: []string{testModel}, RPMLimit: 20}}
	})
	_, recs := serve(t, e, 1)
	d := coreDecision(recs[0])
	if d == nil || d.Changed[0].Load != 30 {
		t.Fatalf("core decision %+v", d)
	}
}

// The same load on every account of the tier keeps everyone's chance: nothing
// is recorded (CONTRACTS §89.4).
func TestBalanceWholeTierScaledNotRecorded(t *testing.T) {
	cfg := SchedulingSettings{Mode: balanceModeDefault, Metric: balanceMetricRPM, LimitLoad: true}
	e, _ := balanceEnv(t, cfg, map[int64]core.RateUsage{1: {RPM: 50}, 2: {RPM: 50}, 3: {RPM: 50}})
	for id := int64(1); id <= 3; id++ {
		e.accounts.set(id, func(a *core.Account) { a.RPMLimit = 100 })
	}
	_, recs := serve(t, e, 1)
	if d := coreDecision(recs[0]); d != nil {
		t.Fatalf("core decision %+v", d)
	}
}

// The concurrency of a model list is read from its own slots.
func TestBalanceConcurrencyModelListSlots(t *testing.T) {
	cfg := SchedulingSettings{Mode: balanceModeDefault, Metric: balanceMetricConcurrency, LimitLoad: true, ModelLimits: true}
	e, _ := balanceEnv(t, cfg, nil)
	list := core.ModelLimit{Models: []string{testModel}, MaxConcurrency: 4}
	e.accounts.set(1, func(a *core.Account) { a.ModelLimits = []core.ModelLimit{list} })
	e.slots.mu.Lock()
	e.slots.inUse[core.ModelLimitSlots(list.Key())+":1"] = 3
	e.slots.mu.Unlock()
	_, recs := serve(t, e, 1)
	d := coreDecision(recs[0])
	if d == nil || d.Changed[0].AccountID != 1 || d.Changed[0].Load != 75 {
		t.Fatalf("core decision %+v", d)
	}
}

// Concurrency is read from the account slots.
func TestBalanceConcurrencyFromSlots(t *testing.T) {
	cfg := SchedulingSettings{Mode: balanceModeDefault, Metric: balanceMetricConcurrency, LimitLoad: true}
	e, lim := balanceEnv(t, cfg, nil)
	e.slots.mu.Lock()
	e.slots.inUse["account:1"] = 4 // of MaxConcurrency 5
	e.slots.mu.Unlock()
	_, recs := serve(t, e, 1)
	d := coreDecision(recs[0])
	if d == nil || d.Changed[0].AccountID != 1 || d.Changed[0].Load != 80 {
		t.Fatalf("core decision %+v", d)
	}
	if lim.usageCalls != 0 {
		t.Fatalf("the rate usage was read for the concurrency metric")
	}
}

// A failed read never refuses the request: it is scheduled by the plain
// weights and nothing is recorded.
func TestBalanceReadFailureFailsOpen(t *testing.T) {
	cfg := SchedulingSettings{Mode: balanceModeTraffic, Metric: balanceMetricRPM, LimitLoad: true}
	e, lim := balanceEnv(t, cfg, nil)
	lim.usageErr = errors.New("redis down")
	_, recs := serve(t, e, 3)
	if d := coreDecision(recs[0]); d != nil {
		t.Fatalf("core decision after a failed read: %+v", d)
	}
}

// A sticky hit is served by its binding: no usage is read.
func TestBalanceNotReadOnStickyHit(t *testing.T) {
	cfg := SchedulingSettings{Mode: balanceModeTraffic, Metric: balanceMetricRPM}
	e, lim := balanceEnv(t, cfg, map[int64]core.RateUsage{1: {RPM: 60}})
	e.enableSticky(onFailureFailover)
	e.setScheduling(cfg)
	sess := withSession(body(testModel, false), "balance-sess")
	for i := range 2 {
		if r := e.messages(sess); r.status != 200 {
			t.Fatalf("status %d %s", r.status, r.body)
		}
		if rec := e.record(); i == 1 && !rec.StickyHit {
			t.Fatalf("expected a sticky hit: %+v", rec)
		}
	}
	if lim.usageCalls != 1 {
		t.Fatalf("usage read %d times, want once (the unbound first request)", lim.usageCalls)
	}
}

// Failover reuses the first read, and only the first pick writes the core
// entry.
func TestBalanceFailoverReusesRead(t *testing.T) {
	cfg := SchedulingSettings{Mode: balanceModeTraffic, Metric: balanceMetricRPM}
	e, lim := balanceEnv(t, cfg, map[int64]core.RateUsage{1: {RPM: 60}})
	e.gw.randFloat = func() float64 { return 0 } // the first account of the tier first
	e.up.set("acc-1", &upstreamRule{status: 500})
	_, recs := serve(t, e, 1)
	if keys := e.up.keys(); len(keys) != 2 || keys[0] != "acc-1" {
		t.Fatalf("upstream calls %v, want acc-1 then a failover", keys)
	}
	if lim.usageCalls != 1 {
		t.Fatalf("usage read %d times across failover, want once", lim.usageCalls)
	}
	n := 0
	for _, d := range recs[0].SchedDecisions {
		if d.PluginKey == "core" {
			n++
		}
	}
	if n != 1 || len(coreDecision(recs[0]).Changed) != 3 {
		t.Fatalf("sched decisions %+v", recs[0].SchedDecisions)
	}
}

// A token count reads nothing.
func TestBalanceNotReadForTokenCounting(t *testing.T) {
	cfg := SchedulingSettings{Mode: balanceModeTraffic, Metric: balanceMetricRPM, LimitLoad: true}
	e, lim := balanceEnv(t, cfg, map[int64]core.RateUsage{1: {RPM: 60}})
	if r := e.do("/v1/messages/count_tokens", body(testModel, false), nil); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	e.record()
	if lim.usageCalls != 0 {
		t.Fatalf("usage read %d times for a token count", lim.usageCalls)
	}
}

// A plugin's load and the limit load merge by the larger and apply once; an
// account the core does not change is not recorded by it.
func TestBalanceMergesPluginLoad(t *testing.T) {
	cfg := SchedulingSettings{Mode: balanceModeDefault, Metric: balanceMetricRPM, LimitLoad: true}
	e, _ := balanceEnv(t, cfg, map[int64]core.RateUsage{1: {RPM: 90}, 2: {RPM: 10}})
	e.accounts.set(1, func(a *core.Account) { a.RPMLimit = 100 })
	e.accounts.set(2, func(a *core.Account) { a.RPMLimit = 100 })
	e.addRanker("load", manifest.SchedulerRank{}, &fakeRanker{
		fn: func(_ context.Context, in *pluginv1.RankAccountsRequest) ([]*pluginv1.RankedAccount, error) {
			return []*pluginv1.RankedAccount{
				{AccountId: 1, Priority: 10, Weight: 1, Load: 50},
				{AccountId: 2, Priority: 10, Weight: 1, Load: 50},
			}, nil
		}})
	_, recs := serve(t, e, 1)
	d := coreDecision(recs[0])
	// acc-1: max(50, 90) = 90 → 0.1; acc-2: max(50, 10) = 50, the plugin's own.
	if d == nil || len(d.Changed) != 1 || d.Changed[0].AccountID != 1 || d.Changed[0].Load != 90 || d.Changed[0].Weight != 10 {
		t.Fatalf("core decision %+v", d)
	}
}

// With model limits on, the traffic balance compares the request's model's
// own usage, not the account's.
func TestBalanceTrafficByModel(t *testing.T) {
	cfg := SchedulingSettings{Mode: balanceModeTraffic, Metric: balanceMetricRPM, ModelLimits: true}
	e, lim := balanceEnv(t, cfg, map[int64]core.RateUsage{1: {RPM: 60}}) // acc-1 busy with other models
	lim.modelUsage = map[string]map[int64]core.RateUsage{testModel: {2: {RPM: 60}}}
	served, _ := serve(t, e, 200)
	if served["acc-2"] > 6 || served["acc-1"] < 70 || served["acc-3"] < 70 {
		t.Fatalf("served %v", served)
	}
	if !slices.Contains(lim.modelAsked, testModel) {
		t.Fatalf("model usage asked for %v, want %s", lim.modelAsked, testModel)
	}
	if lim.usageCalls != 0 { // without limit load the account's own use is not needed
		t.Fatalf("account usage read %d times", lim.usageCalls)
	}
}

// A failed read of the model's usage fails open like any other read.
func TestBalanceTrafficByModelReadFailure(t *testing.T) {
	cfg := SchedulingSettings{Mode: balanceModeTraffic, Metric: balanceMetricRPM, ModelLimits: true}
	e, lim := balanceEnv(t, cfg, map[int64]core.RateUsage{1: {RPM: 60}})
	lim.modelErr = errors.New("redis down")
	_, recs := serve(t, e, 2)
	if d := coreDecision(recs[0]); d != nil {
		t.Fatalf("core decision after a failed read: %+v", d)
	}
}

// By model with the concurrency metric reads the model's slots.
func TestBalanceTrafficByModelSlots(t *testing.T) {
	cfg := SchedulingSettings{Mode: balanceModeTraffic, Metric: balanceMetricConcurrency, ModelLimits: true}
	e, _ := balanceEnv(t, cfg, nil)
	e.slots.mu.Lock()
	e.slots.inUse["account:1"] = 4
	e.slots.inUse[core.ModelSlots(testModel)+":2"] = 4
	e.slots.mu.Unlock()
	_, recs := serve(t, e, 1)
	d := coreDecision(recs[0])
	if d == nil {
		t.Fatal("no core decision")
	}
	var w2, w1 int
	for _, ch := range d.Changed {
		switch ch.AccountID {
		case 1:
			w1 = ch.Weight
		case 2:
			w2 = ch.Weight
		}
	}
	// acc-2 carries the model's load; acc-1's other traffic does not count.
	if w2 >= w1 {
		t.Fatalf("core decision %+v", d)
	}
}
