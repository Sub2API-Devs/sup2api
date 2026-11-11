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

// The evaluate job runs every EvaluateEverySeconds, the shortest interval
// the host gives a job; a window shorter than relaxedEvaluateSeconds needs
// every run. When no layer has one, every other run is enough: a run reads
// every state and the counters of the retention, so this halves the reads.
const (
	EvaluateEverySeconds   = 5
	relaxedEvaluateSeconds = 10
)

// maxCatchUp is how many closed windows of a key one run evaluates. With a
// window shorter than the job's interval, more than one closes between two
// runs: each is judged on its own counters, oldest first, as if evaluated
// on time. A longer gap (the job was late or the plugin down) is padded as
// skipped windows before the oldest of them.
const maxCatchUp = 5

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
		return p.runEvaluate(ctx, in)
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
	cfg, err := p.loadedConfig(ctx)
	if err != nil {
		return nil, status.Error(codes.Unavailable, err.Error())
	}
	now := p.now()
	n, err := s.prune(ctx, obsSince(cfg, now.Unix()), now.Add(-eventRetention), now.Add(-staleAfter), now.Add(-stickyGiveUpAfter))
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

// runEvaluate evaluates every key. It also runs when the plugin is off: a
// key still degraded is tombstoned (evaluation.tombstone), the others are
// pinned to their base by the kernel (the adjustment is off), so turning it
// back on starts from the base, as new-api's reset of every key on a global
// disable does. It never runs on the factory configuration standing in for
// one it could not read, which would pin them all the same.
func (p *Plugin) runEvaluate(ctx context.Context, in *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error) {
	s, err := p.store(ctx)
	if err != nil {
		return nil, status.Error(codes.Unavailable, err.Error())
	}
	cfg, err := p.loadedConfig(ctx)
	if err != nil {
		p.stats.add(cRunFailures, 1)
		return nil, status.Error(codes.Unavailable, err.Error())
	}
	if !evaluateDue(cfg, in) {
		return &pluginv1.RunJobResponse{Message: fmt.Sprintf("not due: no window is shorter than %d s", relaxedEvaluateSeconds)}, nil
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
	// Events and notifications first: the sticky clears are slow (each call
	// scans every binding) and queued with the states, so they can wait for
	// the next run, the events of this one cannot. The states are written:
	// what follows them gets time of its own even if the keys used up the
	// job's.
	rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), recordTimeout)
	p.record(rctx, s, e.events, e.changed > 0)
	p.notify(rctx, cfg, e.notices)
	cancel()
	// The counters age out every few seconds with short windows: dropping
	// them here keeps the table at the retention instead of an hour of them.
	if err := s.pruneObs(ctx, obsSince(cfg, e.now)); err != nil {
		p.log.Warn("dynweight: drop old counters failed", "error", err.Error())
	}
	p.runStickyClears(ctx, s)
	if errs.n > 0 {
		p.stats.add(cRunFailures, 1)
		return nil, status.Errorf(codes.Internal, "%v", errs)
	}
	return &pluginv1.RunJobResponse{Message: fmt.Sprintf("evaluated %d keys, %d changed", e.evaluated, e.changed)}, nil
}

// evaluateDue reports whether a run of the evaluate job evaluates: every
// run when a window is shorter than relaxedEvaluateSeconds, else the runs
// scheduled on a multiple of it. A manual run, or one without a scheduled
// time, always does.
func evaluateDue(cfg *compiledConfig, in *pluginv1.RunJobRequest) bool {
	at := in.GetScheduledAtUnix()
	return in.GetManual() || at <= 0 || cfg.ShortestWindow() < relaxedEvaluateSeconds || at%relaxedEvaluateSeconds < EvaluateEverySeconds
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

// dueWindows lists the closed windows of a key to evaluate, oldest first,
// ending at the newest closed one: those after its last evaluated window,
// at most maxCatchUp; without a state, or when the newest was evaluated
// already, just the newest (Evaluate then skips it, or resets a stale base).
func dueWindows(st *rules.State, latest int64, windowSeconds int) []int64 {
	w, n := int64(windowSeconds), int64(1)
	if st != nil && st.LastEvalWindow < latest {
		n = min((latest-st.LastEvalWindow+w-1)/w, maxCatchUp)
	}
	out := make([]int64, n)
	for i := range out {
		out[i] = latest - (n-1-int64(i))*w
	}
	return out
}

// evaluate evaluates the closed windows of a key not evaluated yet and
// writes the resulting state once.
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
	latest := rules.LatestClosedWindow(k.AccountID, e.now, res.WindowSeconds)
	degraded := hasState && !row.Tombstone && row.WeightEff < float64(row.WeightBase)
	if !e.cfg.Enabled && degraded {
		return e.tombstone(ctx, k, row, max(row.LastEvalWindow, latest)) // off: what resetOnDisable missed
	}
	if degraded && gone(b.SeenAt, res.WindowSeconds, e.now) {
		return nil // nobody schedules the account: nothing to revive it for
	}
	var st *rules.State
	if hasState {
		st = &row.State
	}
	stats := &e.p.stats
	stats.add(cEvaluations, 1)
	var (
		events    []rules.Event
		effects   []rules.SideEffect
		effectsAt int64
		effectsTo float64
		changed   bool
		reset     bool
	)
	// The base changed: the key starts over from it at its last evaluated
	// window, so the windows since (the traffic at the new weight among
	// them) are still evaluated, now on the new base.
	if st != nil && rules.Precheck(&rules.Input{Base: b.Weight, Window: latest, State: st}) == rules.ActionReset {
		tomb := rules.Tombstone(st.LastEvalWindow)
		st, reset, changed = &tomb, true, true
		events = rules.Events(&res, latest, rules.Output{Action: rules.ActionReset})
	}
	for _, window := range dueWindows(st, latest, res.WindowSeconds) {
		out := rules.Evaluate(rules.Input{Base: b.Weight, Window: window, Now: e.now, Obs: e.series(k, window, &res), Cfg: res, State: st})
		if out.Action == rules.ActionSkip {
			if reset {
				break // nothing closed since: the reset alone is written
			}
			stats.add(cSkipped, 1)
			return nil
		}
		st = &out.State
		changed = changed || out.WeightFrom != out.WeightTo
		events = append(events, rules.Events(&res, window, out)...)
		if len(out.SideEffects) > 0 {
			effects = append(effects, out.SideEffects...)
			effectsAt, effectsTo = window, out.WeightTo
		}
	}
	e.evaluated++
	var clear *pendingClear
	if len(effects) > 0 {
		clear = pendingOf(k, effectsAt, effectsTo, effects)
	}
	written, err := e.s.writeState(ctx, k, *st, row.gen, clear)
	if err != nil {
		return err
	}
	if !written {
		stats.add(cLost, 1)
		return nil // lost to a reset or an overlapping run: theirs stands
	}
	if reset {
		stats.add(cBaseResets, 1)
	} else {
		stats.add(cApplied, 1)
	}
	if changed {
		e.changed++
	}
	version := e.cfg.version
	for _, ev := range events {
		row := eventRow{key: k, Event: ev}
		if ev.ByConfig() {
			row.configVersion = &version
		}
		e.events = append(e.events, row)
		if rules.Notified(ev.Kind) {
			e.notices = append(e.notices, notice{k: k, name: b.Name, ev: ev})
		}
	}
	return nil
}

// tombstone starts a degraded key over from its base at the window while
// the plugin is off. Turning it off does so for every key (resetOnDisable);
// this catches what that missed (its write failed, or an evaluation still on
// the configuration before overlapped it), at once rather than when the
// key's next window closes and the kernel pins it, so turning the plugin
// back on meanwhile does not pick up the degraded weight. No event, as for
// turning it off.
func (e *evaluation) tombstone(ctx context.Context, k key, row stateRow, window int64) error {
	written, err := e.s.writeState(ctx, k, rules.Tombstone(window), row.gen, nil)
	if err != nil {
		return err
	}
	if !written {
		e.p.stats.add(cLost, 1)
		return nil
	}
	e.evaluated++
	e.changed++
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

// pendingOf is the sticky clear of a key's side effects in a run, salted
// with the newest window that had any. The window start is the salt (as in
// new-api), so successive windows rotate through different bindings, and a
// retry selects the same ones again. Strategies clearing in the same run
// share it, so the largest share selects a superset of the others: one call
// clears for all of them (a weight dropping to 0 clears everything).
func pendingOf(k key, window int64, weight float64, effects []rules.SideEffect) *pendingClear {
	c := &pendingClear{key: k, Salt: strconv.FormatInt(window, 10), Weight: weight}
	var names []string
	for _, se := range effects {
		c.Percent = max(c.Percent, se.AffinityPercent)
		c.Zero = c.Zero || se.Zero
		if se.Strategy != "" && !slices.Contains(names, se.Strategy) {
			names = append(names, se.Strategy)
		}
	}
	c.Strategies = strings.Join(names, ", ")
	return c
}

const (
	// recordTimeout bounds the events, the weight broadcast and the
	// notification of a run once its states are written.
	recordTimeout = 15 * time.Second
	// stickyBudget bounds the sticky clears of one evaluate run (a call scans
	// every binding, up to 10 s in the core), within the job's own deadline
	// less stickyMargin for their events; what is left waits for the next run.
	stickyBudget = 30 * time.Second
	stickyMargin = 5 * time.Second
	// stickyBatch is how many pending clears one run leases at most.
	stickyBatch = 100
	// stickyMaxAttempts: a clear failing that often is given up (with an
	// event saying why); one the host refuses outright at once.
	stickyMaxAttempts = 10
	// stickyGiveUpAfter: cleanup drops what is still queued after that long.
	stickyGiveUpAfter = time.Hour
)

// runStickyClears runs the queued sticky clears, oldest first, within a
// budget of their own: done or given up, a clear is dropped and recorded as
// an affinity_cleared event; one that fails or runs out of time is handed
// back to the next run. A clear is retried at least until it succeeds or is
// given up; retrying selects the same bindings (same salt), so it does not
// clear more than its share.
func (p *Plugin) runStickyClears(ctx context.Context, s store) {
	budget := stickyBudget
	if deadline, ok := ctx.Deadline(); ok {
		budget = min(budget, time.Until(deadline)-stickyMargin)
	}
	if budget < time.Second {
		return
	}
	cctx, cancel := context.WithTimeout(ctx, budget)
	defer cancel()
	claimed, err := s.claimClears(cctx, budget+stickyMargin, stickyBatch)
	if err != nil {
		p.log.Warn("dynweight: read pending sticky clears failed", "error", err.Error())
		return
	}
	// What follows the budget (handing back, the events) has its own time.
	after, cancelAfter := context.WithTimeout(context.WithoutCancel(ctx), stickyMargin)
	defer cancelAfter()
	var events []eventRow
	for i, c := range claimed {
		if cctx.Err() != nil {
			for _, rest := range claimed[i:] {
				if err := s.releaseClear(after, rest); err != nil {
					p.log.Warn("dynweight: hand back sticky clear failed", "account_id", rest.AccountID, "error", err.Error())
				}
			}
			break
		}
		if ev, done := p.clearSticky(cctx, c); done {
			if err := s.finishClear(after, c); err != nil {
				p.log.Warn("dynweight: drop pending sticky clear failed", "account_id", c.AccountID, "error", err.Error())
			}
			events = append(events, ev)
		} else if err := s.releaseClear(after, c); err != nil {
			p.log.Warn("dynweight: hand back sticky clear failed", "account_id", c.AccountID, "error", err.Error())
		}
	}
	p.record(after, s, events, false)
}

// clearSticky runs one clear: done when it succeeded or is given up, with
// its event.
func (p *Plugin) clearSticky(ctx context.Context, c pendingClear) (eventRow, bool) {
	ev := eventRow{key: c.key, Event: rules.Event{Kind: rules.EventAffinityClear, From: c.Weight, To: c.Weight},
		Detail: map[string]any{"strategy": c.Strategies, "percent": c.Percent}}
	if c.Zero {
		ev.Detail["zero"] = true
	}
	resp, err := pluginsdk.ClearStickyBindings(ctx, p.host, &pluginv1.ClearStickyBindingsRequest{AccountId: c.AccountID, GroupId: c.GroupID,
		Model: c.Model, Percent: int32(c.Percent), Salt: c.Salt})
	if err == nil {
		p.stats.add(cStickyClears, 1)
		ev.Detail["matched"], ev.Detail["cleared"] = resp.GetMatched(), resp.GetCleared()
		return ev, true
	}
	p.stats.add(cStickyClearFailures, 1)
	p.log.Warn("dynweight: clear sticky bindings failed", "account_id", c.AccountID, "group_id", c.GroupID, "model", c.Model,
		"attempt", c.Attempts, "error", err.Error())
	// The host refusing the request will refuse it again; anything else
	// (unavailable, out of time) is retried by the next runs.
	refused := status.Code(err) == codes.PermissionDenied || status.Code(err) == codes.InvalidArgument
	if !refused && c.Attempts < stickyMaxAttempts {
		return ev, false
	}
	ev.Detail["error"], ev.Detail["attempts"] = err.Error(), c.Attempts
	return ev, true
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
	// The weights scheduling used until now, for the events.
	weights := *p.weights.Load()
	keys, err := p.tombstoneKeys(ctx, s, f)
	if err != nil {
		return 0, err
	}
	p.stats.add(cResets, int64(len(keys)))
	p.record(ctx, s, resetEvents(f, keys, weights, reason, userID), len(keys) > 0)
	return len(keys), nil
}

// tombstoneKeys writes a tombstone at its newest closed window for every key
// matching f with a state or with counters, all of them or none, and lists
// them.
func (p *Plugin) tombstoneKeys(ctx context.Context, s store, f filter) ([]key, error) {
	cfg, err := p.loadedConfig(ctx)
	if err != nil {
		return nil, err
	}
	now := p.now().Unix()
	keys, err := s.keys(ctx, f, obsSince(cfg, now))
	if err != nil || len(keys) == 0 {
		return nil, err
	}
	window := func(k key) int64 {
		return rules.LatestClosedWindow(k.AccountID, now, cfg.GroupLayer(k.GroupID).WindowSeconds)
	}
	if err := s.tombstone(ctx, keys, window); err != nil {
		return nil, err
	}
	return keys, nil
}

// resetOnDisable starts every key over from its base when a save turns the
// plugin off, as new-api tombstones every key on a global disable: turning
// it back on, even at once, does not pick up the weights degraded before
// (the evaluation would pin them to the base only once each key's next
// window closed), nor evaluate the samples counted before again. No events,
// as in new-api. When it fails, the evaluate job tombstones what is still
// degraded on its next run (evaluation.tombstone); the warning says so.
func (p *Plugin) resetOnDisable(ctx context.Context) []string {
	s, err := p.store(ctx)
	var keys []key
	if err == nil {
		keys, err = p.tombstoneKeys(ctx, s, filter{})
	}
	if err != nil {
		p.log.Warn("dynweight: reset on turning off failed, left to the next evaluation", "error", err.Error())
		return []string{"the degraded weights could not be reset now; the next evaluation resets them / 降权状态未能立即重置，下一次评估时会重置"}
	}
	if len(keys) > 0 {
		p.publish(ctx, TopicWeights, p.reloadWeights)
	}
	return nil
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
