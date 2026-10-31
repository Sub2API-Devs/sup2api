package dynweight

import (
	"context"
	"maps"
	"math"
	"sync"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// maxWeight is the largest weight the host accepts.
const maxWeight = 1000

// RankAccounts implements pluginsdk.AccountRanker: a candidate with an
// effective weight for this (group, client model) gets it in place of its
// own; an effective weight of 0 takes it out. A priority tier whose every
// candidate is at 0 is split evenly instead (weight 1 each), as new-api's
// weighted pick splits a tier whose weights sum to 0: scheduling never skips
// to a lower tier for the effective weights alone. The candidates' own
// weights are what the evaluation degrades from, so they are recorded as
// the bases.
//
// The core hands in weights of at least 1, but a ranker ordered before this
// one may have set 0 (taken the account out). Such a candidate is not ours:
// its base is not learned (the last one stands, so a key does not reset each
// time the other ranker flips it), it keeps its 0, and it neither keeps a
// tier live nor gets the even split.
func (p *Plugin) RankAccounts(_ context.Context, in *pluginv1.RankAccountsRequest) (*pluginv1.RankAccountsResponse, error) {
	resp := &pluginv1.RankAccountsResponse{}
	meta := in.GetMeta()
	if !p.cfg.Load().Enabled || meta.GetGroupId() <= 0 || meta.GetModel() == "" {
		return resp, nil
	}
	cands := in.GetCandidates()
	p.bases.see(meta.GetGroupId(), cands, p.now())
	weights := *p.weights.Load()
	effective := make([]int32, len(cands)) // -1: the candidate's own
	live := map[int32]bool{}               // tiers with a candidate above 0
	for i, c := range cands {
		effective[i] = -1
		if c.GetWeight() <= 0 {
			continue
		}
		w, ok := weights[key{AccountID: c.GetAccountId(), GroupID: meta.GetGroupId(), Model: meta.GetModel()}]
		// A state computed from another base is stale: the evaluation resets it.
		if ok && w.base == int(c.GetWeight()) {
			effective[i] = effectiveWeight(w.eff)
		}
		if effective[i] != 0 {
			live[c.GetPriority()] = true
		}
	}
	for i, c := range cands {
		w := effective[i]
		if w == 0 && !live[c.GetPriority()] {
			w = 1
		}
		if w >= 0 {
			resp.Accounts = append(resp.Accounts, &pluginv1.RankedAccount{AccountId: c.GetAccountId(), Priority: c.GetPriority(), Weight: w})
		}
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

// see records the bases of a request's candidates, under one lock. A weight
// of 0 (an earlier ranker took the account out) is no base.
func (t *baseTracker) see(groupID int64, candidates []*pluginv1.RankCandidate, now time.Time) {
	t.mu.Lock()
	defer t.mu.Unlock()
	for _, c := range candidates {
		if c.GetWeight() <= 0 {
			continue
		}
		p, weight, name := pair{AccountID: c.GetAccountId(), GroupID: groupID}, int(c.GetWeight()), c.GetName()
		if k, ok := t.known[p]; ok && k.Weight == weight && k.Name == name && now.Sub(k.SeenAt) < seenRefresh {
			continue
		}
		b := base{Weight: weight, Name: name, SeenAt: now}
		t.pending[p], t.known[p] = b, b
	}
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
	// Pairs scheduling stopped seeing need not be remembered.
	maps.DeleteFunc(t.known, func(_ pair, b base) bool { return time.Since(b.SeenAt) > 2*seenRefresh })
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
