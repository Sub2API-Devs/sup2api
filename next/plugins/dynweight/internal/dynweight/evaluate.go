package dynweight

import (
	"cmp"
	"context"
	"fmt"
	"maps"
	"slices"
	"strconv"
	"strings"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"

	"github.com/Sub2API-Devs/sup2api/next/plugins/dynweight/internal/rules"
)

// Jobs.
const (
	JobEvaluate = "evaluate" // every few seconds: evaluate the closed windows
	JobCleanup  = "cleanup"  // hourly: drop old counters, events and stale keys
)

const (
	eventRetention = 30 * 24 * time.Hour
	// staleAfter drops the keys of an (account, group) scheduling has not
	// offered for that long: the account or the group is gone.
	staleAfter = 7 * 24 * time.Hour
)

// RunJob implements pluginsdk.JobRunner.
func (p *Plugin) RunJob(ctx context.Context, in *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error) {
	switch in.GetJobId() {
	case JobEvaluate:
		return p.runEvaluate(ctx)
	case JobCleanup:
		return p.runCleanup(ctx)
	}
	return nil, status.Errorf(codes.NotFound, "unknown job %q", in.GetJobId())
}

func (p *Plugin) runCleanup(ctx context.Context) (*pluginv1.RunJobResponse, error) {
	s, err := p.store(ctx)
	if err != nil {
		return nil, status.Error(codes.Unavailable, err.Error())
	}
	now := p.now()
	n, err := s.prune(ctx, obsSince(p.cfg.Load(), now.Unix()), now.Add(-eventRetention), now.Add(-staleAfter))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "cleanup: %v", err)
	}
	return &pluginv1.RunJobResponse{Message: fmt.Sprintf("deleted %d rows", n)}, nil
}

// obsSince is the oldest window start whose counters are read and kept. A
// key's series reaches the retention back from its newest closed window,
// which itself starts up to a window, the close grace and the account's
// phase before now; twice the retention covers that with margin, and the
// cleanup uses the same horizon so it never drops what an evaluation reads.
func obsSince(cfg *compiledConfig, now int64) int64 {
	return now - 2*cfg.RetentionSeconds()
}

// evaluation is one evaluation run: what it read and what it did.
type evaluation struct {
	p      *Plugin
	s      store
	cfg    *compiledConfig
	now    int64
	states map[key]stateRow
	obs    map[key]map[int64]rules.Counts
	bases  map[pair]base

	events    []eventRow
	notices   []notice
	evaluated int
	changed   int
}

// runEvaluate evaluates every key. It also runs when the plugin is off:
// the kernel then pins the degraded keys to their base (the adjustment is
// off), so turning it back on starts from the base, as new-api's reset of
// every key on a global disable does.
func (p *Plugin) runEvaluate(ctx context.Context) (*pluginv1.RunJobResponse, error) {
	cfg := p.cfg.Load()
	s, err := p.store(ctx)
	if err != nil {
		return nil, status.Error(codes.Unavailable, err.Error())
	}
	started := time.Now()
	defer func() {
		took := time.Since(started)
		p.stats.add(cRuns, 1)
		p.stats.add(cRunBusyUs, took.Microseconds())
		p.stats[cLastRunMs].Store(took.Milliseconds())
		p.stats[cLastRunAt].Store(time.Now().Unix())
	}()
	// The counters of this node go in first; the other nodes flush every
	// second, well within the close grace.
	p.flush(ctx)
	e := &evaluation{p: p, s: s, cfg: cfg, now: p.now().Unix()}
	if err := e.load(ctx); err != nil {
		p.stats.add(cRunFailures, 1)
		return nil, status.Errorf(codes.Unavailable, "load: %v", err)
	}
	// A key that fails does not stop the others: their states are written
	// already, so their events and weights must follow.
	var errs keyErrors
	for _, k := range keysOf(e.states, e.obs) {
		errs.add(k, e.evaluate(ctx, k))
	}
	p.stats.add(cKeyFailures, int64(errs.n))
	p.stats.add(cChanged, int64(e.changed))
	p.record(ctx, s, e.events, e.changed > 0)
	p.notify(ctx, cfg, e.notices)
	if errs.n > 0 {
		p.stats.add(cRunFailures, 1)
		return nil, status.Errorf(codes.Internal, "%v", errs)
	}
	return &pluginv1.RunJobResponse{Message: fmt.Sprintf("evaluated %d keys, %d changed", e.evaluated, e.changed)}, nil
}

func (e *evaluation) load(ctx context.Context) error {
	var err error
	if e.states, err = e.s.loadStates(ctx, filter{}); err != nil {
		return err
	}
	if e.obs, err = e.s.loadObs(ctx, filter{}, obsSince(e.cfg, e.now)); err != nil {
		return err
	}
	e.bases, err = e.s.loadBases(ctx)
	return err
}

// keyErrors counts the keys that failed and keeps the first error.
type keyErrors struct {
	n     int
	first error
}

func (k *keyErrors) add(key key, err error) {
	if err == nil {
		return
	}
	k.n++
	k.first = cmp.Or(k.first, fmt.Errorf("%v: %w", key, err))
}

func (k keyErrors) Error() string { return fmt.Sprintf("%d keys failed, first %v", k.n, k.first) }

// record writes the events of a run, mirrors them to the plugin log when
// log_events is on, and, when weights changed, has every node reload them.
func (p *Plugin) record(ctx context.Context, s store, events []eventRow, changed bool) {
	if len(events) > 0 {
		if err := s.addEvents(ctx, events); err != nil {
			p.log.Warn("dynweight: write events failed", "error", err.Error(), "events", len(events))
		}
	}
	if changed {
		p.publish(ctx, TopicWeights, p.reloadWeights)
	}
	if !p.cfg.Load().LogEvents || len(events) == 0 {
		return
	}
	granted, dropped := p.logged.take(len(events), p.now().Unix())
	if dropped > 0 {
		p.log.Warn("dynweight: weight event log lines dropped over the cap; the events table has them all",
			"dropped", dropped, "cap", eventLogLimit, "per_seconds", eventLogSeconds)
	}
	for _, e := range events[:granted] {
		p.log.Info("dynweight: weight event", "account_id", e.AccountID, "group_id", e.GroupID, "model", e.Model,
			"kind", e.Kind, "reason", e.Reason, "from", e.From, "to", e.To, "rules", e.Rules, "detail", e.Detail)
	}
	p.stats.add(cEventsLogged, int64(granted))
	p.stats.add(cEventsLogDropped, int64(len(events)-granted))
}

// keysOf lists the keys with a state or with counters.
func keysOf(states map[key]stateRow, obs map[key]map[int64]rules.Counts) []key {
	keys := make([]key, 0, len(states)+len(obs))
	for k := range states {
		keys = append(keys, k)
	}
	for k := range obs {
		if _, ok := states[k]; !ok {
			keys = append(keys, k)
		}
	}
	return keys
}

// evaluate evaluates the newest closed window of a key.
func (e *evaluation) evaluate(ctx context.Context, k key) error {
	b, scheduled := e.bases[pair{k.AccountID, k.GroupID}]
	if !scheduled {
		return nil // no base to degrade from yet
	}
	row, hasState := e.states[k]
	// An idle key at its base has nothing to evaluate.
	if hasState && !row.Tombstone && row.WeightBase == b.Weight && row.WeightEff == float64(b.Weight) && len(e.obs[k]) == 0 {
		return nil
	}
	res := e.cfg.Resolve(k.AccountID, k.GroupID)
	window := rules.LatestClosedWindow(k.AccountID, e.now, res.WindowSeconds)
	in := rules.Input{Base: b.Weight, Window: window, Now: e.now, Obs: e.series(k, window, &res), Cfg: res}
	if hasState {
		in.State = &row.State
	}
	out := rules.Evaluate(in)
	next := out.State
	stats := &e.p.stats
	stats.add(cEvaluations, 1)
	switch out.Action {
	case rules.ActionSkip:
		stats.add(cSkipped, 1)
		return nil
	case rules.ActionReset:
		next = rules.Tombstone(window)
	}
	e.evaluated++
	written, err := e.s.writeState(ctx, k, next, row.gen)
	if err != nil {
		return err
	}
	if !written {
		stats.add(cLost, 1)
		return nil // lost to a reset or an overlapping run: theirs stands
	}
	if out.Action == rules.ActionReset {
		stats.add(cBaseResets, 1)
	} else {
		stats.add(cApplied, 1)
	}
	if out.Action == rules.ActionReset || out.WeightFrom != out.WeightTo {
		e.changed++
	}
	for _, ev := range rules.Events(&res, window, out) {
		e.events = append(e.events, eventRow{key: k, Event: ev})
		if rules.Notified(ev.Kind) {
			e.notices = append(e.notices, notice{k: k, name: b.Name, ev: ev})
		}
	}
	if len(out.SideEffects) > 0 {
		e.events = append(e.events, e.clearAffinity(ctx, k, window, out.WeightTo, out.SideEffects))
	}
	return nil
}

// series lists a key's counters over the retention, newest first.
func (e *evaluation) series(k key, window int64, res *rules.Resolved) []rules.Counts {
	out := make([]rules.Counts, res.RetentionPeriods())
	for i := range out {
		out[i] = e.obs[k][window-int64(i*res.WindowSeconds)]
	}
	return out
}

// clearAffinity deletes a share of the key's sticky bindings. The window
// start is the salt (as in new-api), so successive windows rotate through
// different bindings. Strategies clearing in the same window share it, so
// the largest share selects a superset of the others: one call clears for
// all of them.
func (e *evaluation) clearAffinity(ctx context.Context, k key, window int64, weight float64, effects []rules.SideEffect) eventRow {
	names, percent := make([]string, len(effects)), 0
	for i, se := range effects {
		names[i], percent = se.Strategy, max(percent, se.AffinityPercent)
	}
	ev := eventRow{key: k, Event: rules.Event{Kind: rules.EventAffinityClear, From: weight, To: weight},
		Detail: map[string]any{"strategy": strings.Join(names, ", "), "percent": percent}}
	resp, err := pluginsdk.ClearStickyBindings(ctx, e.p.host, &pluginv1.ClearStickyBindingsRequest{AccountId: k.AccountID, GroupId: k.GroupID,
		Model: k.Model, Percent: int32(percent), Salt: strconv.FormatInt(window, 10)})
	if err != nil {
		e.p.log.Warn("dynweight: clear sticky bindings failed", "account_id", k.AccountID, "error", err.Error())
		ev.Detail["error"] = err.Error()
		return ev
	}
	ev.Detail["matched"], ev.Detail["cleared"] = resp.GetMatched(), resp.GetCleared()
	return ev
}

// resetKeys puts the keys matching f back to their base, all of them or
// none: their history is dropped and the samples so far are never evaluated
// again. reason is the events' (manual, status_change), userID the
// administrator's (0 = none). It reports how many keys were reset.
func (p *Plugin) resetKeys(ctx context.Context, f filter, reason string, userID int64) (int, error) {
	s, err := p.store(ctx)
	if err != nil {
		return 0, err
	}
	cfg, now := p.cfg.Load(), p.now().Unix()
	keys, err := s.keys(ctx, f, obsSince(cfg, now))
	if err != nil {
		return 0, err
	}
	// The weights scheduling used until now, for the events.
	weights := *p.weights.Load()
	if len(keys) > 0 {
		window := func(k key) int64 {
			return rules.LatestClosedWindow(k.AccountID, now, cfg.GroupLayer(k.GroupID).WindowSeconds)
		}
		if err := s.tombstone(ctx, keys, window); err != nil {
			return 0, err
		}
	}
	p.stats.add(cResets, int64(len(keys)))
	p.record(ctx, s, resetEvents(f, keys, weights, reason, userID), len(keys) > 0)
	return len(keys), nil
}

// resetEvents records a reset as new-api does: an event for each key off
// its base, from its effective weight to the base; one for each (account,
// group) whose other keys were at their base, with the model asked for and
// detail.keys their number; and, for an account asked for with nothing to
// reset, one with the group and model asked for and detail.matched 0.
func resetEvents(f filter, keys []key, weights map[key]weight, reason string, userID int64) []eventRow {
	var events []eventRow
	atBase := map[pair]int{}
	for _, k := range slices.SortedFunc(slices.Values(keys), compareKeys) {
		w, off := weights[k]
		if !off {
			atBase[pair{k.AccountID, k.GroupID}]++
			continue
		}
		ev := resetEvent(k, reason, userID)
		ev.From, ev.To = w.eff, float64(w.base)
		events = append(events, ev)
	}
	for _, pr := range slices.SortedFunc(maps.Keys(atBase), comparePairs) {
		ev := resetEvent(key{AccountID: pr.AccountID, GroupID: pr.GroupID, Model: f.Model}, reason, userID)
		ev.Detail["keys"] = atBase[pr]
		events = append(events, ev)
	}
	matched := map[int64]bool{}
	for _, k := range keys {
		matched[k.AccountID] = true
	}
	for _, id := range f.accounts() {
		if !matched[id] {
			ev := resetEvent(key{AccountID: id, GroupID: f.GroupID, Model: f.Model}, reason, userID)
			ev.Detail["matched"] = 0
			events = append(events, ev)
		}
	}
	return events
}

func resetEvent(k key, reason string, userID int64) eventRow {
	detail := map[string]any{}
	if userID > 0 {
		detail["user_id"] = userID
	}
	return eventRow{key: k, Event: rules.Event{Kind: rules.EventReset, Reason: reason}, Detail: detail}
}
