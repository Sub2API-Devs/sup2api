package rules

import (
	"fmt"
	"slices"
	"strings"
)

// Action types. weight_degrade and weight_climb are exclusive and give the
// strategy its direction; affinity_clear deletes a share of the sticky
// session bindings that point at the account.
const (
	ActionWeightDegrade = "weight_degrade"
	ActionWeightClimb   = "weight_climb"
	ActionAffinityClear = "affinity_clear"
	MaxActions          = 3
)

// Strategy directions.
const (
	Degrade = "degrade"
	Climb   = "climb"
)

// Amount modes of a weight action.
const (
	ModeBasePercent    = "base_percent"
	ModeCurrentPercent = "current_percent"
	ModeFixed          = "fixed"
)

// Strategy runs its actions, in order, in windows where When holds. Hits of
// the same direction add up in array order; a degrade beats a climb in the
// same window. CooldownSeconds skips the strategy until that long after the
// window it last took effect in.
type Strategy struct {
	Name            string   `json:"name"`
	Enabled         *bool    `json:"enabled,omitempty"`
	When            *When    `json:"when"`
	Actions         []Action `json:"actions"`
	CooldownSeconds int      `json:"cooldown_seconds,omitempty"`
}

// Action is one strategy action. Weight actions use Mode and Value
// (percent modes 1..100, fixed >= 1), affinity_clear uses Percent (1..100).
type Action struct {
	Type    string `json:"type"`
	Mode    string `json:"mode,omitempty"`
	Value   int    `json:"value,omitempty"`
	Percent int    `json:"percent,omitempty"`
}

// IsEnabled reports whether the strategy is evaluated (the default).
func (s Strategy) IsEnabled() bool { return s.Enabled == nil || *s.Enabled }

func (s Strategy) action(types ...string) (Action, bool) {
	i := slices.IndexFunc(s.Actions, func(a Action) bool { return slices.Contains(types, a.Type) })
	if i < 0 {
		return Action{}, false
	}
	return s.Actions[i], true
}

// WeightAction is the strategy's weight action, if any.
func (s Strategy) WeightAction() (Action, bool) {
	return s.action(ActionWeightDegrade, ActionWeightClimb)
}

// AffinityAction is the strategy's affinity_clear action, if any.
func (s Strategy) AffinityAction() (Action, bool) { return s.action(ActionAffinityClear) }

// Direction is Degrade or Climb after the weight action, "" without one.
func (s Strategy) Direction() string {
	a, ok := s.WeightAction()
	switch {
	case !ok:
		return ""
	case a.Type == ActionWeightDegrade:
		return Degrade
	}
	return Climb
}

// normalize validates strategies[i] against the layer's rules.
func (s Strategy) normalize(i int, rules []Rule, index map[string]int) (Strategy, error) {
	path := fmt.Sprintf("strategies[%d]", i)
	s.Name = strings.TrimSpace(s.Name)
	if err := checkName(path, s.Name); err != nil {
		return s, err
	}
	if s.IsEnabled() {
		s.Enabled = nil
	}
	if s.When == nil {
		return s, fmt.Errorf("%s.when is required", path)
	}
	if _, err := compileWhen(*s.When, rules, index, s.IsEnabled(), 0); err != nil {
		return s, fmt.Errorf("%s.%w", path, err)
	}
	if len(s.Actions) == 0 || len(s.Actions) > MaxActions {
		return s, fmt.Errorf("%s.actions must have 1 to %d actions", path, MaxActions)
	}
	actions := make([]Action, 0, len(s.Actions))
	for j, a := range s.Actions {
		a, err := a.normalize(fmt.Sprintf("%s.actions[%d]", path, j))
		if err != nil {
			return s, err
		}
		prev := Strategy{Actions: actions}
		if _, dup := prev.action(a.Type); dup {
			return s, fmt.Errorf("%s.actions[%d].type is duplicated: %s", path, j, a.Type)
		}
		if _, weight := prev.WeightAction(); weight && a.Type != ActionAffinityClear {
			return s, fmt.Errorf("%s.actions: weight_degrade and weight_climb cannot both be used", path)
		}
		actions = append(actions, a)
	}
	s.Actions = actions
	if s.CooldownSeconds < 0 {
		return s, fmt.Errorf("%s.cooldown_seconds must not be negative", path)
	}
	return s, nil
}

func (a Action) normalize(path string) (Action, error) {
	switch a.Type = strings.TrimSpace(a.Type); a.Type {
	case ActionWeightDegrade, ActionWeightClimb:
		a.Percent, a.Mode = 0, strings.TrimSpace(a.Mode)
		switch a.Mode {
		case ModeBasePercent, ModeCurrentPercent:
			if a.Value < 1 || a.Value > 100 {
				return a, fmt.Errorf("%s.value must be between 1 and 100 for %s", path, a.Mode)
			}
		case ModeFixed:
			if a.Value < 1 {
				return a, fmt.Errorf("%s.value must be at least 1 for %s", path, a.Mode)
			}
		default:
			return a, fmt.Errorf("%s.mode must be base_percent, current_percent or fixed", path)
		}
	case ActionAffinityClear:
		a.Mode, a.Value = "", 0
		if a.Percent < 1 || a.Percent > 100 {
			return a, fmt.Errorf("%s.percent must be between 1 and 100", path)
		}
	default:
		return a, fmt.Errorf("%s.type must be weight_degrade, weight_climb or affinity_clear", path)
	}
	return a, nil
}

// noClimb: an enabled strategy degrades but none climbs, so a degraded
// weight never recovers on its own.
func noClimb(strategies []Strategy) bool {
	degrade, climb := false, false
	for _, s := range strategies {
		if s.IsEnabled() {
			degrade = degrade || s.Direction() == Degrade
			climb = climb || s.Direction() == Climb
		}
	}
	return degrade && !climb
}
