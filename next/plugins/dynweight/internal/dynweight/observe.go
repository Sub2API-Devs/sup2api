package dynweight

import (
	"cmp"
	"context"
	"slices"
	"sync"
	"sync/atomic"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"

	"github.com/Sub2API-Devs/sup2api/next/plugins/dynweight/internal/rules"
)

// maxPendingKeys bounds the counters a node holds between two flushes;
// beyond it the samples of new keys are dropped (and counted) rather than
// growing without limit while the database is unreachable.
const maxPendingKeys = 50000

// OnObservations implements pluginsdk.Observer: every finished attempt is
// counted in its key's current window.
func (p *Plugin) OnObservations(_ context.Context, in *pluginv1.ObservationBatch) (*pluginv1.ObservationResult, error) {
	cfg := p.cfg.Load()
	if !cfg.Enabled {
		return &pluginv1.ObservationResult{}, nil
	}
	for _, o := range in.GetObservations() {
		k, sample, ok := sampleOf(o)
		if !ok {
			continue
		}
		// What is counted depends on the group only, not on the account.
		layer := cfg.GroupLayer(k.GroupID)
		window := rules.WindowStart(k.AccountID, o.GetOccurredAtUnixMs()/1000, layer.WindowSeconds)
		p.obs.add(obsWindow{key: k, window: window}, sample, layer)
		p.stats.add(cObserved, 1)
	}
	return &pluginv1.ObservationResult{}, nil
}

// sampleOf turns a finished attempt into a sample of its key. Attempts the
// account is not to blame for are left out: requests outside a group or
// without a model, client cancellations, and local failures.
func sampleOf(o *pluginv1.RequestObservation) (key, rules.Sample, bool) {
	k := key{AccountID: o.GetAccountId(), GroupID: o.GetGroupId(), Model: o.GetModel()}
	if o.GetPhase() != observation.AttemptFinished || k.GroupID <= 0 || k.Model == "" || o.GetCanceled() || o.GetLocalFailure() {
		return key{}, rules.Sample{}, false
	}
	s := rules.Sample{Stream: o.GetStream(), Fail: !o.GetSuccess(), TTFBMs: -1, LatencyMs: -1}
	started := o.GetAttemptStartedAtUnixMs()
	// Timings come from successful attempts only, as in new-api: a failure
	// counts in the error rate, not again in the latency picture.
	if first := o.GetFirstStreamEventAtUnixMs(); !s.Fail && s.Stream && started > 0 && first >= started {
		s.TTFBMs = first - started
	}
	if !s.Fail && started > 0 {
		s.LatencyMs = max(o.GetOccurredAtUnixMs()-started, 0)
	}
	// Only an upstream answer has a status to exempt; a connection failure
	// or a timeout stays in bucket 0, which no exemption covers.
	if code := int(o.GetUpstreamStatusCode()); s.Fail && code >= 100 && code <= 599 {
		s.FailStatus = code
	}
	return k, s, true
}

// obsWindow is a key's window.
type obsWindow struct {
	key
	window int64
}

// aggregator sums the samples of this node until the next flush.
type aggregator struct {
	mu      sync.Mutex
	counts  map[obsWindow]*rules.Counts
	dropped atomic.Int64 // samples
}

func newAggregator() *aggregator { return &aggregator{counts: map[obsWindow]*rules.Counts{}} }

func (a *aggregator) add(w obsWindow, s rules.Sample, cfg *rules.Resolved) {
	a.mu.Lock()
	defer a.mu.Unlock()
	c := a.counts[w]
	if c == nil {
		if len(a.counts) >= maxPendingKeys {
			a.dropped.Add(1)
			return
		}
		c = &rules.Counts{}
		a.counts[w] = c
	}
	c.Record(s, cfg)
}

// take hands over the pending counters in key order, so the upserts of
// two nodes lock the same rows in the same order.
func (a *aggregator) take() []obsDelta {
	a.mu.Lock()
	counts := a.counts
	a.counts = map[obsWindow]*rules.Counts{}
	a.mu.Unlock()
	deltas := make([]obsDelta, 0, len(counts))
	for w, c := range counts {
		deltas = append(deltas, obsDelta{key: w.key, window: w.window, counts: *c})
	}
	slices.SortFunc(deltas, func(a, b obsDelta) int {
		return cmp.Or(compareKeys(a.key, b.key), cmp.Compare(a.window, b.window))
	})
	return deltas
}

// restore adds back counters whose write failed, within maxPendingKeys.
func (a *aggregator) restore(deltas []obsDelta) {
	a.mu.Lock()
	defer a.mu.Unlock()
	for _, d := range deltas {
		w := obsWindow{key: d.key, window: d.window}
		c := a.counts[w]
		if c == nil {
			if len(a.counts) >= maxPendingKeys {
				a.dropped.Add(d.counts.Total)
				continue
			}
			c = &rules.Counts{}
			a.counts[w] = c
		}
		c.Add(d.counts)
	}
}

func (a *aggregator) pending() int {
	a.mu.Lock()
	defer a.mu.Unlock()
	return len(a.counts)
}
