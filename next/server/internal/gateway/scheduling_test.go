package gateway

import (
	"context"
	"strings"
	"sync"
	"testing"

	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// fakeLimiter records hits and token counts and marks the given accounts as
// exhausted.
type fakeLimiter struct {
	mu        sync.Mutex
	exhausted map[int64]bool
	hits      []string // "<id>:<session>"
	tokens    map[int64]int64
	sessions  []string
}

func newFakeLimiter() *fakeLimiter {
	return &fakeLimiter{exhausted: map[int64]bool{}, tokens: map[int64]int64{}}
}

func (l *fakeLimiter) Exhausted(_ context.Context, refs []core.AccountRef, session string) (map[int64]bool, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.sessions = append(l.sessions, session)
	out := map[int64]bool{}
	for _, r := range refs {
		if l.exhausted[r.ID] {
			out[r.ID] = true
		}
	}
	return out, nil
}

func (l *fakeLimiter) Hit(_ context.Context, id int64, session string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.hits = append(l.hits, itoa(id)+":"+session)
}

func (l *fakeLimiter) AddTokens(_ context.Context, id int64, n int64) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.tokens[id] += n
}

func (l *fakeLimiter) Usage(context.Context, []int64) (map[int64]core.RateUsage, error) {
	return map[int64]core.RateUsage{}, nil
}

func (a *fakeAccounts) set(id int64, fn func(acc *core.Account)) {
	a.mu.Lock()
	defer a.mu.Unlock()
	fn(a.accounts[id])
}

func TestModelListFiltersCandidates(t *testing.T) {
	e := newEnv(t)
	e.accounts.set(1, func(acc *core.Account) { acc.Models = []string{"another-model"} })
	e.accounts.set(2, func(acc *core.Account) { acc.Models = []string{"another-model", testModel} })
	r := e.messages(body(testModel, false))
	if r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if k := e.up.keys(); strings.Join(k, ",") != "acc-2" {
		t.Fatalf("upstream order %v, want acc-2 only", k)
	}
	e.record()

	// No account serves the model: 503 no_available_account.
	e.accounts.set(2, func(acc *core.Account) { acc.Models = []string{"another-model"} })
	e.accounts.set(3, func(acc *core.Account) { acc.Models = []string{"another-model"} })
	r = e.messages(body(testModel, false))
	if r.status != 503 || r.json().Get("error.type").String() == "" {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if rec := e.record(); rec.ErrorType != errTypeNoAccount {
		t.Fatalf("record %+v", rec)
	}
}

func TestModelMappingRewritesUpstreamModel(t *testing.T) {
	e := newEnv(t)
	e.accounts.set(1, func(acc *core.Account) { acc.ModelMapping = map[string]string{testModel: "mapped-model"} })
	r := e.messages(body(testModel, false))
	if r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	call := e.up.last()
	if m := gjson.GetBytes(call.body, "model").String(); m != "mapped-model" {
		t.Fatalf("upstream body model %q", m)
	}
	if b := e.plat.builds[0]; b.GetMeta().GetModel() != "mapped-model" || b.GetFields()["model"] != `"mapped-model"` {
		t.Fatalf("plugin saw meta.model=%q fields=%v", b.GetMeta().GetModel(), b.GetFields())
	}
	rec := e.record()
	if rec.Model != testModel || rec.UpstreamModel != "mapped-model" || rec.Price == nil {
		t.Fatalf("record model=%q upstream=%q price=%v", rec.Model, rec.UpstreamModel, rec.Price)
	}
	// The client response is untouched apart from what the upstream sent.
	if r.json().Get("model").String() != upModel {
		t.Fatalf("response model %s", r.json().Get("model").String())
	}
}

func TestRateLimitedAccountsAreSkipped(t *testing.T) {
	lim := newFakeLimiter()
	e := newEnv(t, func(e *env) {})
	e.gw.d.Limiter = lim
	e.accounts.set(1, func(acc *core.Account) { acc.RPMLimit = 10 })
	e.accounts.set(2, func(acc *core.Account) { acc.SPMLimit = 5 })
	lim.exhausted[1] = true
	r := e.messages(body(testModel, false))
	if r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if k := e.up.keys(); strings.Join(k, ",") != "acc-2" {
		t.Fatalf("upstream order %v, want acc-2 (acc-1 exhausted)", k)
	}
	rec := e.record()
	if len(lim.hits) != 1 || !strings.HasPrefix(lim.hits[0], "2:req:"+rec.RequestID) {
		t.Fatalf("hits %v", lim.hits)
	}
	if lim.tokens[2] != rec.Tokens.Total() || rec.Tokens.Total() == 0 {
		t.Fatalf("tokens counted %d, record %d", lim.tokens[2], rec.Tokens.Total())
	}
	// Account 3 has no limits, so it was not asked about.
	if len(lim.sessions) != 1 {
		t.Fatalf("exhausted calls %v", lim.sessions)
	}

	// Every candidate exhausted: 429 rate_limited.
	lim.exhausted[2], lim.exhausted[3] = true, true
	e.accounts.set(3, func(acc *core.Account) { acc.TPDLimit = 1 })
	r = e.messages(body(testModel, false))
	if r.status != 429 || !strings.Contains(string(r.body), "rate limited") {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if rec := e.record(); rec.ErrorType != errTypeNoAccount {
		t.Fatalf("record %+v", rec)
	}
}

func TestStickySessionIsTheSPMIdentity(t *testing.T) {
	lim := newFakeLimiter()
	e := newEnv(t)
	e.gw.d.Limiter = lim
	e.enableSticky(onFailureFailover)
	e.accounts.set(1, func(acc *core.Account) { acc.SPMLimit = 5 })
	e.messages(withSession(body(testModel, false), "sess-A"))
	e.record()
	e.messages(withSession(body(testModel, false), "sess-A"))
	e.record()
	if len(lim.hits) != 2 || lim.hits[0] != lim.hits[1] || strings.HasPrefix(lim.hits[0], "1:req:") {
		t.Fatalf("hits %v: the sticky key must identify the session", lim.hits)
	}
}

func TestWeightedOrder(t *testing.T) {
	refs := func() []core.AccountRef {
		return []core.AccountRef{{ID: 1, Weight: 1}, {ID: 2, Weight: 3}, {ID: 3, Weight: 6}}
	}
	ids := func(g []core.AccountRef) string {
		var s []string
		for _, r := range g {
			s = append(s, itoa(r.ID))
		}
		return strings.Join(s, ",")
	}
	// rnd=0 keeps the input order (used by the test env).
	g := refs()
	weightedOrder(g, func() float64 { return 0 })
	if ids(g) != "1,2,3" {
		t.Fatalf("rnd=0: %s", ids(g))
	}
	// rnd just below 1 picks the last of the remaining accounts each time.
	g = refs()
	weightedOrder(g, func() float64 { return 0.999 })
	if ids(g) != "3,1,2" {
		t.Fatalf("rnd=0.999: %s", ids(g))
	}
	// 0.5*10=5 lands in account 3's [4,10) range; then 0.5*4=2 in account 2's [1,4).
	g = refs()
	weightedOrder(g, func() float64 { return 0.5 })
	if ids(g) != "3,2,1" {
		t.Fatalf("rnd=0.5: %s", ids(g))
	}
	// 0.15*10=1.5 lands in account 2's range first, then 0.15*7=1.05 in account 3's.
	g = refs()
	weightedOrder(g, func() float64 { return 0.15 })
	if ids(g) != "2,3,1" {
		t.Fatalf("rnd=0.15: %s", ids(g))
	}
	// Statistically: with weights 1:3:6 account 3 comes first ~60% of the time.
	n := 20000
	first := map[int64]int{}
	seq := 0.0
	rnd := func() float64 { seq += 0.6180339887; seq -= float64(int(seq)); return seq }
	for i := 0; i < n; i++ {
		g = refs()
		weightedOrder(g, rnd)
		first[g[0].ID]++
	}
	if p := float64(first[3]) / float64(n); p < 0.55 || p > 0.65 {
		t.Fatalf("account 3 first %.3f, want ~0.6 (%v)", p, first)
	}
	if p := float64(first[1]) / float64(n); p < 0.07 || p > 0.13 {
		t.Fatalf("account 1 first %.3f, want ~0.1 (%v)", p, first)
	}
}
