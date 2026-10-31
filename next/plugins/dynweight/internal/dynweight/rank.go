package dynweight

import (
	"context"
	"math"
	"sync"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// maxWeight is the largest weight the host accepts.
const maxWeight = 1000

// RankAccounts implements pluginsdk.AccountRanker: a candidate with an
// effective weight for this (group, client model) gets it in place of its
// own; an effective weight of 0 takes it out (the host keeps every candidate
// when that would leave none). The candidates' own weights are what the
// evaluation degrades from, so they are recorded as the bases.
func (p *Plugin) RankAccounts(_ context.Context, in *pluginv1.RankAccountsRequest) (*pluginv1.RankAccountsResponse, error) {
	resp := &pluginv1.RankAccountsResponse{}
	meta := in.GetMeta()
	if !p.cfg.Load().Enabled || meta.GetGroupId() <= 0 || meta.GetModel() == "" {
		return resp, nil
	}
	now := p.now()
	weights := *p.weights.Load()
	for _, c := range in.GetCandidates() {
		p.bases.see(pair{AccountID: c.GetAccountId(), GroupID: meta.GetGroupId()}, int(c.GetWeight()), c.GetName(), now)
		w, ok := weights[key{AccountID: c.GetAccountId(), GroupID: meta.GetGroupId(), Model: meta.GetModel()}]
		// A state computed from another base is stale: the evaluation resets it.
		if !ok || w.base != int(c.GetWeight()) {
			continue
		}
		resp.Accounts = append(resp.Accounts, &pluginv1.RankedAccount{AccountId: c.GetAccountId(), Priority: c.GetPriority(), Weight: effectiveWeight(w.eff)})
	}
	return resp, nil
}

// effectiveWeight is the scheduling weight of an effective weight.
func effectiveWeight(eff float64) int32 {
	return int32(min(max(math.Floor(eff+0.5), 0), maxWeight))
}

// seenRefresh is how often an unchanged base is written again, to keep its
// pair from being pruned as stale.
const seenRefresh = time.Hour

// baseTracker collects the bases scheduling saw, for the next flush.
type baseTracker struct {
	mu      sync.Mutex
	known   map[pair]base // last written
	pending map[pair]base
}

func newBaseTracker() *baseTracker {
	return &baseTracker{known: map[pair]base{}, pending: map[pair]base{}}
}

func (t *baseTracker) see(p pair, weight int, name string, now time.Time) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if k, ok := t.known[p]; ok && k.Weight == weight && k.Name == name && now.Sub(k.SeenAt) < seenRefresh {
		return
	}
	b := base{Weight: weight, Name: name, SeenAt: now}
	t.pending[p], t.known[p] = b, b
}

// take hands over the bases to write.
func (t *baseTracker) take() map[pair]base {
	t.mu.Lock()
	defer t.mu.Unlock()
	if len(t.pending) == 0 {
		return nil
	}
	out := t.pending
	t.pending = map[pair]base{}
	return out
}

// retry puts back bases whose write failed, unless newer ones came in.
func (t *baseTracker) retry(bases map[pair]base) {
	t.mu.Lock()
	defer t.mu.Unlock()
	for p, b := range bases {
		if _, newer := t.pending[p]; !newer {
			t.pending[p] = b
		}
	}
}
