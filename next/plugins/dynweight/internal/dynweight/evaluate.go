package dynweight

import (
	"context"
	"fmt"
	"strconv"
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
	n, err := s.prune(ctx, now.Unix()-2*p.cfg.Load().RetentionSeconds(), now.Add(-eventRetention), now.Add(-staleAfter))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "cleanup: %v", err)
	}
	return &pluginv1.RunJobResponse{Message: fmt.Sprintf("deleted %d rows", n)}, nil
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
	evaluated int
	changed   int
}

func (p *Plugin) runEvaluate(ctx context.Context) (*pluginv1.RunJobResponse, error) {
	cfg := p.cfg.Load()
	if !cfg.Enabled {
		return &pluginv1.RunJobResponse{Message: "disabled"}, nil
	}
	s, err := p.store(ctx)
	if err != nil {
		return nil, status.Error(codes.Unavailable, err.Error())
	}
	// The counters of this node go in first; the other nodes flush every
	// second, well within the close grace.
	p.flush(ctx)
	e := &evaluation{p: p, s: s, cfg: cfg, now: p.now().Unix()}
	if e.states, err = s.loadStates(ctx, filter{}); err == nil {
		if e.obs, err = s.loadObs(ctx, e.now-2*cfg.RetentionSeconds()); err == nil {
			e.bases, err = s.loadBases(ctx)
		}
	}
	if err != nil {
		return nil, status.Errorf(codes.Unavailable, "load: %v", err)
	}
	for _, k := range e.keys() {
		if err := e.evaluate(ctx, k); err != nil {
			return nil, status.Errorf(codes.Internal, "evaluate %v: %v", k, err)
		}
	}
	if err := s.addEvents(ctx, e.events); err != nil {
		p.log.Warn("dynweight: write events failed", "error", err.Error(), "events", len(e.events))
	}
	if e.changed > 0 {
		p.publish(ctx, TopicWeights, p.reloadWeights)
	}
	return &pluginv1.RunJobResponse{Message: fmt.Sprintf("evaluated %d keys, %d changed", e.evaluated, e.changed)}, nil
}

// keys are the keys with a state or with counters.
func (e *evaluation) keys() []key {
	keys := make([]key, 0, len(e.states)+len(e.obs))
	for k := range e.states {
		keys = append(keys, k)
	}
	for k := range e.obs {
		if _, ok := e.states[k]; !ok {
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
	switch out.Action {
	case rules.ActionSkip:
		return nil
	case rules.ActionReset:
		next = rules.Tombstone(window)
	}
	e.evaluated++
	written, err := e.s.writeState(ctx, k, next, row.gen)
	if err != nil || !written {
		return err // lost to a reset: its tombstone stands
	}
	if out.Action == rules.ActionReset || out.WeightFrom != out.WeightTo {
		e.changed++
	}
	for _, ev := range rules.Events(&res, window, out) {
		if ev.Kind == rules.EventWeightUp {
			continue // not a turning point; the state shows it
		}
		e.events = append(e.events, eventRow{key: k, Event: ev})
		if rules.Notified(ev.Kind) {
			e.p.notify(ctx, e.cfg, k, b, ev)
		}
	}
	for _, se := range out.SideEffects {
		e.events = append(e.events, e.clearAffinity(ctx, k, window, out.WeightTo, se))
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

// clearAffinity deletes a share of the key's sticky bindings. The window is
// the salt, so another strategy or window picks other bindings.
func (e *evaluation) clearAffinity(ctx context.Context, k key, window int64, weight float64, se rules.SideEffect) eventRow {
	ev := eventRow{key: k, Event: rules.Event{Kind: rules.EventAffinityClear, From: weight, To: weight},
		Detail: map[string]any{"strategy": se.Strategy, "percent": se.AffinityPercent}}
	resp, err := pluginsdk.ClearStickyBindings(ctx, e.p.host, &pluginv1.ClearStickyBindingsRequest{AccountId: k.AccountID, GroupId: k.GroupID,
		Model: k.Model, Percent: int32(se.AffinityPercent), Salt: strconv.FormatInt(window, 10)})
	if err != nil {
		e.p.log.Warn("dynweight: clear sticky bindings failed", "account_id", k.AccountID, "error", err.Error())
		ev.Detail["error"] = err.Error()
		return ev
	}
	ev.Detail["matched"], ev.Detail["cleared"] = resp.GetMatched(), resp.GetCleared()
	return ev
}
