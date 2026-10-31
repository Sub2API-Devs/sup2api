package rules

// Event kinds. weight_up is only reported to the snapshot, not kept as an
// event; the turning points (down, first climb, restored, revived) are the
// ones notified.
const (
	EventWeightDown     = KindWeightDown
	EventWeightUp       = KindWeightUp
	EventWeightUpStart  = "weight_up_start" // the first climb after a degrade
	EventWeightRestored = "weight_restored" // back to the base
	EventWeightRevived  = KindWeightRevived
	EventReset          = "reset"
	EventAffinityClear  = "affinity_cleared"
)

// Reset reasons.
const (
	ReasonBaseMismatch = "base_mismatch" // the account's weight changed
	ReasonRulesChange  = "rules_change"  // the rules changed: history cleared, weight kept
	ReasonManual       = "manual"
)

// Notified reports whether an event kind is a turning point to notify.
func Notified(kind string) bool {
	switch kind {
	case EventWeightDown, EventWeightUpStart, EventWeightRestored, EventWeightRevived:
		return true
	}
	return false
}

// WindowSummary is the evidence of an evaluation, kept with its events.
type WindowSummary struct {
	Start           int64         `json:"start"`
	Total           int64         `json:"total"`
	Fail            int64         `json:"fail"`
	LookbackWindows int64         `json:"lookback_windows"`
	TTFBSamples     int64         `json:"ttfb_samples"`
	Thresholds      map[int]int64 `json:"thresholds,omitempty"`
}

// Event is something an evaluation did to a key.
type Event struct {
	Kind   string         `json:"kind"`
	Reason string         `json:"reason,omitempty"`
	From   float64        `json:"from"`
	To     float64        `json:"to"`
	Rules  []string       `json:"rules,omitempty"`
	Window *WindowSummary `json:"window,omitempty"`
}

// ChangeKind classifies the weight change of an applied evaluation: down;
// revived from 0; then restored to the base > first climb after a degrade >
// any other climb; "" when the weight did not change or the adjustment is
// off (pinning to the base is not a change).
func ChangeKind(out Output) string {
	switch {
	case !out.Adjust:
		return ""
	case out.WeightTo < out.WeightFrom:
		return EventWeightDown
	case out.Revived:
		return EventWeightRevived
	case out.WeightTo <= out.WeightFrom:
		return ""
	case out.WeightFrom < float64(out.State.WeightBase) && out.WeightTo >= float64(out.State.WeightBase):
		return EventWeightRestored
	case out.PrevDir == dirDown:
		return EventWeightUpStart
	}
	return EventWeightUp
}

// Events expands an evaluation into its events: a base mismatch reset; or,
// once applied, a rules change reset then the weight change, both with the
// rules that fired and the window's evidence.
func Events(cfg *Resolved, window int64, out Output) []Event {
	if out.Action == ActionReset {
		return []Event{{Kind: EventReset, Reason: ReasonBaseMismatch}}
	}
	if out.Action != ActionApplied {
		return nil
	}
	st := out.State
	win := &WindowSummary{Start: window, Total: st.LastTotal, Fail: st.LastFail, LookbackWindows: st.LastLookback,
		TTFBSamples: st.LastTN, Thresholds: st.LastCounts}
	var events []Event
	if out.SigReset {
		// With the adjustment off the evaluation pinned the weight to the
		// base, and nothing else records that step.
		to := out.WeightFrom
		if !out.Adjust {
			to = out.WeightTo
		}
		events = append(events, Event{Kind: EventReset, Reason: ReasonRulesChange, From: out.WeightFrom, To: to, Window: win})
	}
	if kind := ChangeKind(out); kind != "" {
		events = append(events, Event{Kind: kind, From: out.WeightFrom, To: out.WeightTo, Rules: FiredRules(cfg, st.LastRules), Window: win})
	}
	return events
}

// FiredRules names the rules that fired, among those an enabled strategy
// references (a rule of a disabled strategy acts on nothing).
func FiredRules(cfg *Resolved, lastRules string) []string {
	referenced := make([]bool, len(cfg.Rules))
	for _, s := range cfg.Strategies {
		// With every leaf true Eval visits all of them.
		s.Tree.Eval(func(idx int) (bool, bool) {
			referenced[idx] = true
			return true, false
		})
	}
	var names []string
	for idx, r := range cfg.Rules {
		if referenced[idx] && idx < len(lastRules) && (lastRules[idx] == ruleFired || lastRules[idx] == ruleHitFired) {
			names = append(names, r.Name)
		}
	}
	return names
}
