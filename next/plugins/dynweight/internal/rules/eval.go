package rules

import (
	"math"
	"strings"
)

// The evaluation kernel. Evaluate is a pure function: gate -> start state ->
// ledger -> rules -> strategies -> new state. Effective weights are rounded to
// 6 decimals.

// Verdicts of an evaluation.
const (
	VerdictBad     = "bad"
	VerdictGood    = "good"
	VerdictNeutral = "neutral"
)

// Actions of an evaluation.
const (
	ActionSkip    = "skip"
	ActionReset   = "reset"
	ActionApplied = "applied"
)

// Weight change kinds kept in State.LastChange.
const (
	KindWeightDown    = "weight_down"
	KindWeightUp      = "weight_up"
	KindWeightRevived = "weight_revived" // the window started at 0 and ended above it
)

// The per-rule result characters of State.LastRules. Fired implies hit.
const (
	ruleNone     = '0'
	ruleHit      = '1'
	ruleHitFired = '3'
)

// RuleHit / RuleFired read a State.LastRules character.
func RuleHit(c byte) bool   { return c == ruleHit || c == ruleHitFired }
func RuleFired(c byte) bool { return c == ruleHitFired }

// Directions of the last weight change (State.WeightDir).
const (
	dirDown = "down"
	dirUp   = "up"
)

// RecentAgg sums the windows with traffic in the retention.
type RecentAgg struct {
	Windows int64 `json:"windows"`
	Total   int64 `json:"total"`
	Fail    int64 `json:"fail"`
}

// RuleStat is the evidence a rule was last judged on: N samples gathered
// over Lookback windows (1 = the window alone). For several conditions it is
// the weakest one: the deepest lookback, then the fewest samples.
type RuleStat struct {
	N        int64 `json:"n"`
	Lookback int   `json:"lookback"`
}

// State is the dynamic state of an (account, group, model).
//
// A Tombstone is left by a reset: only LastEvalWindow, ErrCut and Cuts mean
// anything (the newest closed window at the reset). It reads as no state
// (effective = base), but the evaluator skips that window and only looks
// back over later ones, so consumed samples never fire again.
type State struct {
	Tombstone      bool    `json:"tombstone,omitempty"`
	WeightBase     int     `json:"base"`
	WeightEff      float64 `json:"eff"`
	LastEvalWindow int64   `json:"eval_window"`
	RulesSig       string  `json:"sig,omitempty"`
	// Bitmaps holds each enabled rule's hits of the last N windows ("1" =
	// hit, newest last).
	Bitmaps []string `json:"bitmaps,omitempty"`
	// Cuts holds each rule's consumption cut (a window start, 0 = none): the
	// rule only looks back over windows after it. It moves to the window once
	// the evidence was enough or the rule fired.
	Cuts []int64 `json:"cuts,omitempty"`
	// ErrCut is the cut of the displayed error rate.
	ErrCut int64 `json:"err_cut,omitempty"`
	// Cooldowns holds the window each enabled strategy last took effect in
	// (changed the weight or ran a side effect), 0 = never.
	Cooldowns         []int64       `json:"cooldowns,omitempty"`
	WeightDir         string        `json:"dir,omitempty"`
	LastTotal         int64         `json:"last_total"`
	LastFail          int64         `json:"last_fail"`
	LastLookback      int64         `json:"last_lookback"`
	LastTN            int64         `json:"last_tn"`
	LastCounts        map[int]int64 `json:"last_counts,omitempty"`
	LastLN            int64         `json:"last_ln"`
	LastLatencyCounts map[int]int64 `json:"last_latency_counts,omitempty"`
	LastRules         string        `json:"last_rules,omitempty"`
	LastRuleStats     []RuleStat    `json:"last_rule_stats,omitempty"`
	LastVerdict       string        `json:"last_verdict,omitempty"`
	LastChange        string        `json:"last_change,omitempty"`
	LastChangeAt      int64         `json:"last_change_at,omitempty"`
	Recent            RecentAgg     `json:"recent"`
}

// Tombstone is the state a reset leaves at the newest closed window.
func Tombstone(window int64) State {
	cuts := make([]int64, MaxRules)
	for i := range cuts {
		cuts[i] = window
	}
	return State{Tombstone: true, LastEvalWindow: window, ErrCut: window, Cuts: cuts}
}

// Input is everything one window evaluation reads.
type Input struct {
	Base   int
	Window int64 // the window W to evaluate
	Now    int64
	// Obs holds the key's own counts over the retention: Obs[0] = W,
	// Obs[i] = W - i*window. Samples are never borrowed from other keys.
	Obs   []Counts
	Cfg   Resolved
	State *State // nil = no state yet
}


// SideEffect is a non-weight action of a strategy that took effect.
type SideEffect struct {
	Strategy        string
	AffinityPercent int
}

// Output is the result of an evaluation.
type Output struct {
	Action     string
	Verdict    string
	State      State
	WeightFrom float64
	WeightTo   float64
	Adjust     bool // false: the weight was pinned to the base, not changed
	SigReset   bool // the rules changed: the history was cleared, the weight kept
	Revived    bool
	PrevDir    string
	// Missed is how many windows went unevaluated before this one.
	Missed      int64
	SideEffects []SideEffect
}

// Precheck is the gate: a state with another base is reset; a state
// evaluated up to W is skipped; "" means evaluate.
func Precheck(in *Input) string {
	if in.State != nil && !in.State.Tombstone && in.State.WeightBase != in.Base {
		return ActionReset
	}
	if in.State != nil && in.State.LastEvalWindow >= in.Window {
		return ActionSkip
	}
	return ""
}

// ruleSet is what takes part this window. With the adjustment off no rule
// or strategy runs, but every rule slot is written back (empty history, cut
// at the last evaluated window), so windows already evaluated are not
// consumed again when it is turned back on.
func ruleSet(in *Input) (rules []Rule, strategies []ResolvedStrategy, slots int) {
	if !in.Cfg.Enabled {
		return nil, nil, MaxRules
	}
	return in.Cfg.Rules, in.Cfg.Strategies, len(in.Cfg.Rules)
}

func strategyDelta(mode string, value int, eff float64, base int) float64 {
	switch mode {
	case ModeCurrentPercent:
		return eff * float64(value) / 100
	case ModeBasePercent:
		return float64(base) * float64(value) / 100
	}
	return float64(value)
}

// IsZero reports whether an effective weight rounds to 0: the account is not
// scheduled.
func IsZero(eff float64) bool { return eff < 0.5 }

// percentileMin is the sample target of a percentile condition: 1 for p100,
// else max(min_samples, ceil(100/(100-p))) so the (100-p)% share is at least
// one sample.
func percentileMin(p, minSamples int) int64 {
	if p >= 100 {
		return 1
	}
	share := 100 - p
	return int64(max((100+share-1)/share, minSamples))
}

// percentileViolated reports whether "pP >= threshold" holds: any sample
// over it for p100, else a share of at least (100-p)%.
func percentileViolated(p int, count, denom int64) bool {
	if p >= 100 {
		return count >= 1
	}
	return count*100 >= int64(100-p)*denom
}

func opHolds(op string, a, b int64) bool {
	switch op {
	case OpGt:
		return a > b
	case OpGte:
		return a >= b
	case OpLt:
		return a < b
	}
	return a <= b
}

// lookbackDepth is the smallest d with cum[d-1] >= threshold, or len(cum)
// when the windows run out.
func lookbackDepth(cum []int64, threshold int64) int {
	for i, n := range cum {
		if n >= threshold {
			return i + 1
		}
	}
	return len(cum)
}

const (
	scopeAllIdx = iota
	scopeStreamIdx
	scopeNonStreamIdx
)

func scopeIndex(scope string) int {
	switch scope {
	case ScopeStream:
		return scopeStreamIdx
	case ScopeNonStream:
		return scopeNonStreamIdx
	}
	return scopeAllIdx
}

// scopeWindows are the windows of the retention under one scope, with the
// prefix sums the lookback searches: cum*[i] covers W..W-i, and err is the
// error rate dimension with the exempt failures taken out of both sides.
type scopeWindows struct {
	fams         []Family
	cumTN, cumLN []int64
	errTotal     []int64
	errFail      []int64
}

func scopedWindows(obs []Counts, exempt []int, rules []Rule) [3]scopeWindows {
	need := [3]bool{scopeAllIdx: true}
	for _, r := range rules {
		need[scopeIndex(r.Scope)] = true
	}
	var out [3]scopeWindows
	for idx := range out {
		if !need[idx] {
			continue
		}
		s := scopeWindows{fams: make([]Family, len(obs))}
		for i, c := range obs {
			switch idx {
			case scopeStreamIdx:
				s.fams[i] = c.Stream
			case scopeNonStreamIdx:
				s.fams[i] = c.Family.sub(c.Stream)
			default:
				s.fams[i] = c.Family
			}
		}
		n := len(s.fams)
		s.cumTN, s.cumLN, s.errTotal, s.errFail = make([]int64, n), make([]int64, n), make([]int64, n), make([]int64, n)
		var tn, ln, total, fail int64
		for i, f := range s.fams {
			ex := f.exemptFails(exempt)
			tn, ln, total, fail = tn+f.TN, ln+f.LN, total+f.Total-ex, fail+f.Fail-ex
			s.cumTN[i], s.cumLN[i], s.errTotal[i], s.errFail[i] = tn, ln, total, fail
		}
		out[idx] = s
	}
	return out
}

func (s scopeWindows) merge(depth int) Family {
	var m Family
	for _, f := range s.fams[:depth] {
		m.add(f)
	}
	return m
}

// cutLimit is how many windows after the cut can be looked back over (W
// itself always, so at least 1); cut 0 allows the whole retention.
func cutLimit(window int64, windowSeconds, retention int, cut int64) int {
	if cut <= 0 {
		return retention
	}
	limit := 0
	for i := 0; i < retention && window-int64(i)*int64(windowSeconds) > cut; i++ {
		limit++
	}
	return max(limit, 1)
}

// ruleLedger is where a rule reads from: its scope, how far it may look
// back (limit, after its cut) and how many windows are new since the last
// evaluation (fresh). A sample condition only holds with samples in the
// newest min(depth, fresh) windows, or the same unconsumed old samples would
// count again in every quiet window. weight conditions have no samples and
// are judged on the current value, so `error_rate lt 30 or weight lte 0`
// still hits without traffic.
type ruleLedger struct {
	scope scopeWindows
	limit int
	fresh int
}

func (l ruleLedger) freshSamples(depth int, samples func(Family) int64) bool {
	for _, f := range l.scope.fams[:min(depth, l.fresh)] {
		if samples(f) > 0 {
			return true
		}
	}
	return false
}

func weakerStat(cur, cand RuleStat) RuleStat {
	if cur.Lookback == 0 || cand.Lookback > cur.Lookback || (cand.Lookback == cur.Lookback && cand.N < cur.N) {
		return cand
	}
	return cur
}

// carry is what an evaluation inherits from the previous state, sized to
// this window's rules and strategies.
type carry struct {
	bitmaps   []string
	cuts      []int64
	cooldowns []int64
	sigReset  bool
}

// startState inherits everything from a state with the same signature and
// the adjustment on. When the rules changed or the adjustment is off, the
// slots no longer match: the history and the cooldowns are cleared, the
// weight kept, and every cut moves to the last evaluated window so the new
// rule set does not consume those windows again. A tombstone counts as no
// state but keeps its cuts.
func startState(in *Input, ruleCount, strategyCount int) (State, carry) {
	hasState := in.State != nil && !in.State.Tombstone
	st := State{WeightBase: in.Base, WeightEff: float64(in.Base)}
	if hasState {
		st = *in.State
	}
	c := carry{bitmaps: make([]string, ruleCount), cuts: make([]int64, ruleCount), cooldowns: make([]int64, strategyCount)}
	c.sigReset = hasState && st.RulesSig != in.Cfg.RulesSig
	switch {
	case hasState && !c.sigReset && in.Cfg.Enabled:
		copy(c.bitmaps, st.Bitmaps)
		copy(c.cuts, st.Cuts)
		copy(c.cooldowns, st.Cooldowns)
	case hasState:
		for i := range c.cuts {
			c.cuts[i] = st.LastEvalWindow
		}
	case in.State != nil:
		copy(c.cuts, in.State.Cuts)
		st.ErrCut = in.State.ErrCut
	}
	st.RulesSig = in.Cfg.RulesSig
	return st, c
}

// ledger is what an evaluation read: the scopes the rules use, the
// displayed error rate (all traffic, the layer's exempt codes, its own cut)
// and the retention aggregate.
type ledger struct {
	scopes   [3]scopeWindows
	windows  int
	win      Family
	winTotal int64
	winFail  int64
	errDepth int
	recent   RecentAgg
}

func loadLedger(in *Input, rules []Rule, errCut int64) ledger {
	obs := in.Obs
	if len(obs) == 0 {
		obs = []Counts{{}}
	}
	l := ledger{scopes: scopedWindows(obs, in.Cfg.ExemptCodes, rules), windows: len(obs)}
	all := l.scopes[scopeAllIdx]
	var prevTotal, prevFail int64
	for i := range all.fams {
		total, fail := all.errTotal[i]-prevTotal, all.errFail[i]-prevFail
		prevTotal, prevFail = all.errTotal[i], all.errFail[i]
		if total > 0 {
			l.recent.Windows++
			l.recent.Total += total
			l.recent.Fail += fail
		}
	}
	limit := cutLimit(in.Window, in.Cfg.WindowSeconds, len(obs), errCut)
	l.errDepth = lookbackDepth(all.errTotal[:limit], int64(in.Cfg.MinSamples))
	l.win = all.merge(l.errDepth)
	l.winTotal, l.winFail = all.errTotal[l.errDepth-1], all.errFail[l.errDepth-1]
	return l
}

// percentileDim selects the TTFB or the latency counters.
type percentileDim struct {
	cum     func(scopeWindows) []int64
	samples func(Family, int) int64
	count   func(Family, int) int64
}

var (
	ttfbDim = percentileDim{
		cum:     func(s scopeWindows) []int64 { return s.cumTN },
		samples: func(f Family, ms int) int64 { return f.ThresholdSamples[ms] },
		count:   func(f Family, ms int) int64 { return f.Thresholds[ms] },
	}
	latencyDim = percentileDim{
		cum:     func(s scopeWindows) []int64 { return s.cumLN },
		samples: func(f Family, ms int) int64 { return f.LatencySamples[ms] },
		count:   func(f Family, ms int) int64 { return f.Latency[ms] },
	}
)

// condResult is a judged condition: its truth (new samples included), its
// evidence, and whether the evidence is enough to consume (a condition
// without any sample counts as consumed, or it would hold a rule's cut back
// over samples of another dimension until the retention ends).
type condResult struct {
	truth   bool
	stat    RuleStat
	reached bool
}

// percentileCondition looks back until percentileMin samples and judges
// "pP >= threshold" (lt is its exact negation). Without samples neither
// holds.
func percentileCondition(l ruleLedger, c Condition, minSamples int, dim percentileDim) condResult {
	target := percentileMin(c.P, minSamples)
	ms := int(c.Value)
	cum := make([]int64, len(l.scope.fams))
	var n int64
	for i, f := range l.scope.fams {
		n += dim.samples(f, ms)
		cum[i] = n
	}
	depth := lookbackDepth(cum[:l.limit], target)
	n = cum[depth-1]
	var count int64
	for _, f := range l.scope.fams[:depth] {
		count += dim.count(f, ms)
	}
	// Samples of the dimension but none for this threshold (it was just
	// added): unknown, not a healthy quiet window.
	unknown := n == 0 && dim.cum(l.scope)[depth-1] > 0
	truth := n > 0 && percentileViolated(c.P, count, n)
	if c.Op == OpLt {
		truth = n > 0 && !truth
	}
	fresh := l.freshSamples(depth, func(f Family) int64 { return dim.samples(f, ms) })
	return condResult{truth: truth && !unknown && fresh, stat: RuleStat{N: n, Lookback: depth}, reached: !unknown && (n >= target || n == 0)}
}

// errorRateCondition looks back until min_samples attempts and judges
// fail*100 OP value*total.
func errorRateCondition(l ruleLedger, c Condition, exempt []int, minSamples int64) condResult {
	depth := lookbackDepth(l.scope.errTotal[:l.limit], minSamples)
	total, fail := l.scope.errTotal[depth-1], l.scope.errFail[depth-1]
	truth := total > 0 && opHolds(c.Op, fail*100, int64(c.Value)*total)
	fresh := l.freshSamples(depth, func(f Family) int64 { return f.Total - f.exemptFails(exempt) })
	return condResult{truth: truth && fresh, stat: RuleStat{N: total, Lookback: depth}, reached: total >= minSamples || total == 0}
}

// ruleOutcome is the rule layer's result.
type ruleOutcome struct {
	lastRules  []byte
	stats      []RuleStat
	weightHold []bool
	bitmaps    []string
	cuts       []int64
	missed     int64
}

func (o ruleOutcome) fired(idx int) bool {
	return RuleFired(o.lastRules[idx])
}

// evalRule evaluates a rule's expression: every condition (no short
// circuit, the evidence covers them all), "and" before "or". weight
// conditions compare lowView. weightOnly is the expression's value with
// every sample condition false: what the skipped windows are padded with.
func evalRule(cfg *Resolved, idx int, l ruleLedger, lowView int64) (hit, weightOnly bool, res condResult) {
	res.reached = true
	group, weightGroup := true, true
	for ci, c := range cfg.Rules[idx].Conditions {
		if ci > 0 && c.Join == JoinOr {
			hit, weightOnly = hit || group, weightOnly || weightGroup
			group, weightGroup = true, true
		}
		var cond condResult
		switch c.Metric {
		case MetricErrorRate:
			cond = errorRateCondition(l, c, cfg.ExemptCodes, int64(cfg.MinSamples))
		case MetricTTFB:
			cond = percentileCondition(l, c, cfg.MinSamples, ttfbDim)
		case MetricLatency:
			cond = percentileCondition(l, c, cfg.MinSamples, latencyDim)
		case MetricWeight:
			holds := opHolds(c.Op, lowView, int64(c.Value))
			group, weightGroup = group && holds, weightGroup && holds
			continue
		}
		res.reached = res.reached && cond.reached
		res.stat = weakerStat(res.stat, cond.stat)
		group, weightGroup = group && cond.truth, false
	}
	return hit || group, weightOnly || weightGroup, res
}

// weightHolds reports whether a weight condition of the rule holds (the gate
// of a climb from 0).
func weightHolds(r Rule, lowView int64) bool {
	for _, c := range r.Conditions {
		if c.Metric == MetricWeight && opHolds(c.Op, lowView, int64(c.Value)) {
			return true
		}
	}
	return false
}

// evalRules is the rule layer: each rule's hit goes into its bitmap (the
// last N windows); M hits fire it and clear the bitmap. Once the evidence is
// consumed (enough samples, or fired) the cut moves to W; otherwise the next
// window keeps looking back, so a sample is never consumed twice by a rule
// nor lost for being alone.
func evalRules(in *Input, rules []Rule, l ledger, c carry, lowView int64) ruleOutcome {
	out := ruleOutcome{lastRules: make([]byte, len(rules)), stats: make([]RuleStat, len(rules)),
		weightHold: make([]bool, len(rules)), bitmaps: c.bitmaps, cuts: c.cuts}
	if in.State != nil && !in.State.Tombstone && !c.sigReset {
		out.missed = max(0, (in.Window-in.State.LastEvalWindow)/int64(in.Cfg.WindowSeconds)-1)
	}
	fresh := l.windows
	if in.State != nil {
		fresh = cutLimit(in.Window, in.Cfg.WindowSeconds, l.windows, in.State.LastEvalWindow)
	}
	for idx, r := range rules {
		rl := ruleLedger{scope: l.scopes[scopeIndex(r.Scope)], limit: cutLimit(in.Window, in.Cfg.WindowSeconds, l.windows, out.cuts[idx]), fresh: fresh}
		hit, weightOnly, res := evalRule(&in.Cfg, idx, rl, lowView)
		out.stats[idx] = res.stat
		out.weightHold[idx] = weightHolds(r, lowView)
		// Skipped windows have no evidence for sample conditions: they are
		// padded with 0, except for rules a weight branch alone satisfies.
		// lowView is constant over the gap (nothing was written in it), so
		// that branch was true in every skipped window; padding it with 0
		// would keep M > 1 revival rules from ever firing on sparse traffic.
		pad := "0"
		if weightOnly {
			pad = "1"
		}
		bm := out.bitmaps[idx] + strings.Repeat(pad, int(min(out.missed, int64(r.Periods))))
		if hit {
			bm += "1"
		} else {
			bm += "0"
		}
		if len(bm) > r.Periods {
			bm = bm[len(bm)-r.Periods:]
		}
		fired := strings.Count(bm, "1") >= r.HitPeriods
		if fired {
			bm = ""
		}
		if fired || res.reached {
			out.cuts[idx] = in.Window
		}
		out.bitmaps[idx] = bm
		switch {
		case hit && fired:
			out.lastRules[idx] = ruleHitFired
		case hit:
			out.lastRules[idx] = ruleHit
		default:
			out.lastRules[idx] = ruleNone
		}
	}
	return out
}

// applyStrategies is the strategy layer. A strategy in cooldown (counted in
// window starts, so every node agrees) is skipped; otherwise its When is
// evaluated on the rules that fired. Starting from 0, a climb also needs a
// leaf that fired with a weight condition holding on a satisfied path.
//
// A strategy takes effect when it hits and has no weight action or one in
// the winning direction: a degrade beats a climb, and losing climbs are
// dropped along with their affinity_clear. Effective strategies apply in
// order, each on the previous result (two -30% make 100 -> 70 -> 49),
// clamped to [floor, base]; a value rounding to 0 becomes 0, and a climb
// from 0 adds at least 1. A cooldown starts when the strategy changed the
// weight or ran a side effect. The verdict is bad on a degrade, good on a
// climb with base > 0, else neutral.
func applyStrategies(in *Input, strategies []ResolvedStrategy, rules ruleOutcome, eff, floor float64, zeroStart bool, cooldowns []int64) (float64, []int64, string, []SideEffect) {
	leaf := func(idx int) (bool, bool) {
		fired := rules.fired(idx)
		return fired, fired && rules.weightHold[idx]
	}
	hits := make([]int, 0, len(strategies))
	degradeHit, climbHit := false, false
	for idx, s := range strategies {
		if s.CooldownSeconds > 0 && cooldowns[idx] > 0 && in.Window-cooldowns[idx] < int64(s.CooldownSeconds) {
			continue
		}
		dir := s.Direction()
		hit, gate := s.Tree.Eval(leaf)
		if !hit || (dir == Climb && zeroStart && !gate) {
			continue
		}
		hits = append(hits, idx)
		degradeHit = degradeHit || dir == Degrade
		climbHit = climbHit || dir == Climb
	}
	ceiling := float64(in.Base)
	winning, sign, verdict := Climb, 1.0, VerdictNeutral
	switch {
	case degradeHit:
		winning, sign, verdict = Degrade, -1, VerdictBad
	case climbHit && ceiling > 0:
		verdict = VerdictGood
	}
	var effects []SideEffect
	for _, idx := range hits {
		s := strategies[idx]
		dir := s.Direction()
		if dir != "" && dir != winning {
			continue
		}
		changed := false
		if a, ok := s.WeightAction(); ok {
			delta := strategyDelta(a.Mode, a.Value, eff, in.Base)
			if sign > 0 && IsZero(eff) && delta < 1 {
				delta = 1
			}
			next := min(max(eff+sign*delta, floor), ceiling)
			if IsZero(next) {
				next = 0
			}
			changed = next != eff
			eff = next
		}
		// A climb only clears bindings when it raised the weight: a healthy
		// account at its base hits the recovery rule every window. Degrades
		// and pure clearing strategies run on every hit, so an account at 0
		// still sheds its remaining bindings.
		applied := false
		if a, ok := s.AffinityAction(); ok && (changed || dir != Climb) {
			effects = append(effects, SideEffect{Strategy: s.Name, AffinityPercent: a.Percent})
			applied = true
		}
		if changed || applied {
			cooldowns[idx] = in.Window
		}
	}
	// The ceiling always applies: a weight above a lowered base converges at
	// once.
	return min(eff, ceiling), cooldowns, verdict, effects
}

// Evaluate evaluates one closed window. Writing the result back, and
// excluding other writers, is the caller's job.
func Evaluate(in Input) Output {
	switch Precheck(&in) {
	case ActionReset:
		return Output{Action: ActionReset}
	case ActionSkip:
		return Output{Action: ActionSkip, State: *in.State}
	}
	rules, strategies, slots := ruleSet(&in)
	st, c := startState(&in, slots, len(strategies))
	prevDir, from := st.WeightDir, st.WeightEff
	// The floor is hard: a weight under a raised floor is lifted to it
	// first, before the weight conditions and the strategies see it.
	floor := float64(in.Cfg.WeightFloor(in.Base))
	startEff := max(from, floor)
	lowView := int64(math.Floor(startEff + 0.5))
	zeroStart := IsZero(startEff)

	l := loadLedger(&in, rules, st.ErrCut)
	if l.winTotal >= int64(in.Cfg.MinSamples) {
		st.ErrCut = in.Window
	}
	ro := evalRules(&in, rules, l, c, lowView)
	eff, cooldowns, verdict, effects := applyStrategies(&in, strategies, ro, startEff, floor, zeroStart, c.cooldowns)
	st.WeightEff = math.Floor(eff*1000000+0.5) / 1000000
	st.Cooldowns = cooldowns
	revived := IsZero(from) && !IsZero(st.WeightEff)
	change := ""
	switch {
	case !in.Cfg.Enabled:
		// Pinning the weight to the base is what "not adjusting" means, not
		// a change: no new last change, and the old one no longer exists.
		st.WeightEff, st.Cooldowns = float64(in.Base), nil
		st.LastChange, st.LastChangeAt, st.WeightDir = "", 0, ""
	case st.WeightEff < from:
		change, st.WeightDir = KindWeightDown, dirDown
	case revived:
		change, st.WeightDir = KindWeightRevived, dirUp
	case st.WeightEff > from:
		change, st.WeightDir = KindWeightUp, dirUp
	}
	if change != "" {
		st.LastChange, st.LastChangeAt = change, in.Now
	}
	st.Bitmaps, st.Cuts = ro.bitmaps, ro.cuts
	st.LastEvalWindow = in.Window
	st.LastTotal, st.LastFail, st.LastLookback = l.winTotal, l.winFail, int64(l.errDepth)
	st.LastTN, st.LastCounts = l.win.TN, pick(in.Cfg.Thresholds, l.win.Thresholds)
	st.LastLN, st.LastLatencyCounts = l.win.LN, pick(in.Cfg.LatencyThresholds, l.win.Latency)
	st.LastRules, st.LastRuleStats = string(ro.lastRules), ro.stats
	st.LastVerdict, st.Recent = verdict, l.recent
	return Output{Action: ActionApplied, Verdict: verdict, State: st, WeightFrom: from, WeightTo: st.WeightEff,
		Adjust: in.Cfg.Enabled, SigReset: c.sigReset, Revived: revived, PrevDir: prevDir, Missed: ro.missed, SideEffects: effects}
}

// pick keeps the counts of the configured thresholds (0 included).
func pick(thresholds []int, counts map[int]int64) map[int]int64 {
	if len(thresholds) == 0 {
		return nil
	}
	out := make(map[int]int64, len(thresholds))
	for _, ms := range thresholds {
		out[ms] = counts[ms]
	}
	return out
}
