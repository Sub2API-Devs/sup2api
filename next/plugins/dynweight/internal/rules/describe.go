package rules

import "cmp"

// RuleResult is an enabled rule of a key's layer and its last result:
// whether it hit and fired, its hits of the last Periods windows (newest
// last) and the evidence it was judged on. The results are left out while
// the state is from other rules or the adjustment is off.
type RuleResult struct {
	Name       string `json:"name"`
	Scope      string `json:"scope"`
	Periods    int    `json:"periods"`
	HitPeriods int    `json:"hit_periods"`
	Hit        bool   `json:"hit"`
	Fired      bool   `json:"fired"`
	Bitmap     string `json:"bitmap"`
	Samples    int64  `json:"samples"`
	Lookback   int    `json:"lookback"`
	NoSamples  bool   `json:"no_samples"` // weight conditions only, or conditions that passed without samples
	// Unjudged: strict (min_samples_strict) and too few samples, even looking
	// back as far as allowed; the window left the bitmap alone.
	Unjudged bool `json:"unjudged"`
}

// ThresholdCount is how many samples reached a threshold (ms).
type ThresholdCount struct {
	Ms    int   `json:"ms"`
	Count int64 `json:"count"`
}

func thresholdCounts(thresholds []int, counts map[int]int64) []ThresholdCount {
	out := make([]ThresholdCount, len(thresholds))
	for i, ms := range thresholds {
		out[i] = ThresholdCount{Ms: ms, Count: counts[ms]}
	}
	return out
}

// CurrentWindow is the window still taking observations (as flushed so
// far), with the exempt failures left out like the error rate does.
type CurrentWindow struct {
	Start             int64            `json:"window_start"`
	Elapsed           int64            `json:"elapsed_seconds"`
	Total             int64            `json:"total"`
	Fail              int64            `json:"fail"`
	StreamTotal       int64            `json:"stream_total"`
	StreamFail        int64            `json:"stream_fail"`
	TTFBSamples       int64            `json:"ttfb_samples"`
	LatencySamples    int64            `json:"latency_samples"`
	Thresholds        []ThresholdCount `json:"thresholds"`
	LatencyThresholds []ThresholdCount `json:"latency_thresholds"`
}

// Status is a key's state as the console shows it. A key with counters but
// no evaluation yet has no last window (EvalWindow 0).
type Status struct {
	Base            int     `json:"base"`
	Effective       float64 `json:"effective"`
	WeightMin       int     `json:"weight_min"`
	State           string  `json:"state"` // normal | degrading | climbing
	Adjusting       bool    `json:"adjusting"`
	NoClimbStrategy bool    `json:"no_climb_strategy"`
	Reset           bool    `json:"reset"`
	Verdict         string  `json:"verdict"`
	LastChange      string  `json:"last_change"`
	ChangedAt       int64   `json:"changed_at"`
	NextEvalAt      int64   `json:"next_eval_at"`
	// The last evaluated window, merged back over Lookback windows until
	// min_samples (ErrorEvaluable once reached).
	EvalWindow        int64            `json:"eval_window"`
	Total             int64            `json:"total"`
	Fail              int64            `json:"fail"`
	Lookback          int64            `json:"lookback"`
	ErrorEvaluable    bool             `json:"error_evaluable"`
	TTFBSamples       int64            `json:"ttfb_samples"`
	LatencySamples    int64            `json:"latency_samples"`
	Thresholds        []ThresholdCount `json:"thresholds"`
	LatencyThresholds []ThresholdCount `json:"latency_thresholds"`
	Recent            RecentAgg        `json:"recent"`
	Rules             []RuleResult     `json:"rules"`
	Current           CurrentWindow    `json:"current"`
}

// Ratio orders a status list: most degraded first, reset keys (base 0)
// with the keys at their base.
func (s *Status) Ratio() float64 {
	if s.Reset || s.Base <= 0 {
		return 1
	}
	return s.Effective / float64(s.Base)
}

// Describe is a key's status: its state (nil = none yet) under its resolved
// configuration, the base weight scheduling last offered (seen = it offered
// one), and its counters by window start.
func Describe(accountID int64, st *State, res *Resolved, base int, seen bool, obs map[int64]Counts, now int64) Status {
	start := WindowStart(accountID, now, res.WindowSeconds)
	out := Status{Base: base, Effective: float64(base), State: "normal", Adjusting: res.Enabled, NoClimbStrategy: res.NoClimb(),
		NextEvalAt: start + int64(res.WindowSeconds) + CloseGraceSeconds}
	out.Current = currentWindow(obs[start], res, start, now)
	// A tombstone reads as no state; it only keeps its cuts. So does a state
	// computed from another base than scheduling's (new-api's base check):
	// scheduling ignores it and the next evaluation resets it.
	out.Reset = st != nil && st.Tombstone
	stale := st != nil && seen && st.WeightBase != base
	evaluated, last := st != nil && !st.Tombstone && !stale, &State{}
	if evaluated {
		last = st
		out.Base, out.Effective = st.WeightBase, st.WeightEff
		out.Verdict, out.LastChange, out.ChangedAt = st.LastVerdict, st.LastChange, st.LastChangeAt
		out.EvalWindow, out.Total, out.Fail, out.Lookback = st.LastEvalWindow, st.LastTotal, st.LastFail, st.LastLookback
		out.ErrorEvaluable = st.LastTotal >= int64(res.MinSamples)
		out.TTFBSamples, out.LatencySamples, out.Recent = st.LastTN, st.LastLN, st.Recent
	}
	out.WeightMin = res.WeightFloor(out.Base)
	out.Thresholds = thresholdCounts(res.Thresholds, last.LastCounts)
	out.LatencyThresholds = thresholdCounts(res.LatencyThresholds, last.LastLatencyCounts)
	switch {
	case !res.Enabled || out.Reset || out.Effective >= float64(out.Base):
	case out.LastChange == EventWeightDown:
		out.State = "degrading"
	default:
		out.State = "climbing"
	}
	// The rule results only match the rules the state was evaluated with.
	out.Rules = ruleResults(res, last, evaluated && res.Enabled && last.RulesSig == res.RulesSig)
	return out
}

func currentWindow(cur Counts, res *Resolved, start, now int64) CurrentWindow {
	out := CurrentWindow{Start: start, Elapsed: now - start, TTFBSamples: cur.TN, LatencySamples: cur.LN,
		Thresholds: thresholdCounts(res.Thresholds, cur.Thresholds), LatencyThresholds: thresholdCounts(res.LatencyThresholds, cur.Latency)}
	out.Total, out.Fail = cur.Judged(res.ExemptCodes)
	out.StreamTotal, out.StreamFail = cur.Stream.Judged(res.ExemptCodes)
	return out
}

// ruleResults lists the enabled rules, with last's results when matched.
func ruleResults(res *Resolved, last *State, matched bool) []RuleResult {
	out := make([]RuleResult, len(res.Rules))
	for i, r := range res.Rules {
		out[i] = RuleResult{Name: r.Name, Scope: cmp.Or(r.Scope, ScopeAll), Periods: r.Periods, HitPeriods: r.HitPeriods}
		if !matched {
			continue
		}
		rr := &out[i]
		if i < len(last.LastRules) {
			rr.Hit, rr.Fired, rr.Unjudged = RuleHit(last.LastRules[i]), RuleFired(last.LastRules[i]), RuleUnjudged(last.LastRules[i])
		}
		if i < len(last.Bitmaps) {
			rr.Bitmap = last.Bitmaps[i]
		}
		if i < len(last.LastRuleStats) {
			rr.Samples, rr.Lookback = last.LastRuleStats[i].N, last.LastRuleStats[i].Lookback
			rr.NoSamples = rr.Lookback == 0
		}
	}
	return out
}
