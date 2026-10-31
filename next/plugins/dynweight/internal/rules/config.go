package rules

import (
	"encoding/json"
	"fmt"
	"maps"
	"math"
	"slices"
	"strings"
)

const (
	minWindowSeconds = 3
	maxWindowSeconds = 3600
	maxMinSamples    = 100000
	maxRecipients    = 20
)

// Layer is a configuration layer: the global one, or a group's, which
// replaces the global one entirely for that group.
type Layer struct {
	// Enabled turns the adjustment on. On the global layer it is the master
	// switch: off, nothing is observed or adjusted.
	Enabled bool `json:"enabled"`
	// WindowSeconds is the evaluation window, 3..3600. Windows are not
	// aligned to the epoch: each account rolls its own phase.
	WindowSeconds int `json:"window_seconds"`
	// MinSamples is how many attempts a condition accumulates, looking back
	// over the key's own earlier windows, before it is judged on them.
	MinSamples int `json:"min_samples"`
	// ExemptStatusCodes are upstream failures the error rate leaves out of
	// both numerator and denominator ("400,500-503").
	ExemptStatusCodes string `json:"exempt_status_codes"`
	// MinWeightMode / MinWeight are the floor of the effective weight:
	// base_percent of the base (0..100) or fixed (0..1000000, capped by the
	// base). 0 lets the weight drop to 0, which takes the account out.
	MinWeightMode string     `json:"min_weight_mode"`
	MinWeight     int        `json:"min_weight"`
	Rules         []Rule     `json:"rules"`
	Strategies    []Strategy `json:"strategies"`
}

// AccountOverride narrows the effective layer for one account.
type AccountOverride struct {
	Enabled           *bool   `json:"enabled,omitempty"`
	ExemptStatusCodes *string `json:"exempt_status_codes,omitempty"`
	MinWeightMode     *string `json:"min_weight_mode,omitempty"`
	MinWeight         *int    `json:"min_weight,omitempty"`
}

// Notify sends the turning points of a weight (down, first climb, restored,
// revived) through a core notification channel.
type Notify struct {
	Enabled    bool     `json:"enabled"`
	Channel    string   `json:"channel"`
	Recipients []string `json:"recipients"`
	Language   string   `json:"language"` // zh (default) | en
}

// Config is the plugin configuration document.
type Config struct {
	Layer
	// Groups replace the global layer for a group (by id).
	Groups map[int64]*Layer `json:"groups"`
	// Accounts narrow the effective layer for an account (by id).
	Accounts map[int64]AccountOverride `json:"accounts"`
	Notify   Notify                    `json:"notify"`
}

// defaultRules / defaultStrategies: error rate or p95 too slow in 2 of 3
// windows, first token or the whole attempt hung in the window, a healthy
// window climbs back, and a weight at 0 for 2 windows is revived.
const (
	defaultRules = `[{"name":"错误率过高","conditions":[{"metric":"error_rate","op":"gte","value":30}],"periods":3,"hit_periods":2},` +
		`{"name":"首字 p95 过慢","conditions":[{"metric":"ttfb","p":95,"op":"gte","value":10000}],"periods":3,"hit_periods":2},` +
		`{"name":"首字挂死","conditions":[{"metric":"ttfb","p":100,"op":"gte","value":60000},{"join":"or","metric":"latency","p":100,"op":"gte","value":120000}],"periods":1,"hit_periods":1},` +
		`{"name":"健康恢复","conditions":[{"metric":"error_rate","op":"lt","value":15},{"join":"and","metric":"ttfb","p":95,"op":"lt","value":10000},{"join":"and","metric":"ttfb","p":100,"op":"lt","value":60000},{"join":"and","metric":"latency","p":100,"op":"lt","value":120000}],"periods":1,"hit_periods":1},` +
		`{"name":"复活探测","conditions":[{"metric":"weight","op":"lte","value":0}],"periods":2,"hit_periods":2}]`
	defaultStrategies = `[{"name":"错误率过高","when":"错误率过高","actions":[{"type":"weight_degrade","mode":"current_percent","value":30}]},` +
		`{"name":"首字 p95 过慢","when":"首字 p95 过慢","actions":[{"type":"weight_degrade","mode":"current_percent","value":30}]},` +
		`{"name":"首字挂死","when":"首字挂死","actions":[{"type":"weight_degrade","mode":"current_percent","value":50}]},` +
		`{"name":"自动回升","when":"健康恢复","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]},` +
		`{"name":"复活探测","when":"复活探测","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]}]`
)

// UnmarshalJSON lays each group over the factory layer, adjusting unless it
// says "enabled": false, as new-api does: a group that leaves a field out
// gets the default, not a zero.
func (c *Config) UnmarshalJSON(data []byte) error {
	type plain Config
	var doc struct {
		*plain
		Groups map[int64]json.RawMessage `json:"groups"`
	}
	doc.plain = (*plain)(c)
	if err := json.Unmarshal(data, &doc); err != nil {
		return err
	}
	c.Groups = nil
	for id, raw := range doc.Groups {
		if string(raw) == "null" {
			continue
		}
		l := DefaultLayer()
		l.Enabled = true
		if err := json.Unmarshal(raw, &l); err != nil {
			return fmt.Errorf("groups.%d: %w", id, err)
		}
		if c.Groups == nil {
			c.Groups = map[int64]*Layer{}
		}
		c.Groups[id] = &l
	}
	return nil
}

// DefaultLayer is the factory layer (adjustment off).
func DefaultLayer() Layer {
	l := Layer{WindowSeconds: 60, MinSamples: 10, ExemptStatusCodes: "400", MinWeightMode: ModeBasePercent}
	if json.Unmarshal([]byte(defaultRules), &l.Rules) != nil || json.Unmarshal([]byte(defaultStrategies), &l.Strategies) != nil {
		panic("dynweight: invalid default rules")
	}
	return l
}

// DefaultConfig is the factory configuration (everything off).
func DefaultConfig() Config { return Config{Layer: DefaultLayer()} }

// WeightFloor is the floor of the effective weight for a base weight, an
// integer in 0..base.
func (l *Layer) WeightFloor(base int) int {
	if base <= 0 || l.MinWeight <= 0 {
		return 0
	}
	if l.MinWeightMode == ModeBasePercent {
		return min(int(math.Floor(float64(base)*float64(l.MinWeight)/100+0.5)), base)
	}
	return min(l.MinWeight, base)
}

// Normalize validates the configuration and puts it in canonical form. The
// warnings do not block saving.
func (c *Config) Normalize() (warnings []string, err error) {
	if warnings, err = c.Layer.normalize(""); err != nil {
		return nil, err
	}
	for _, id := range slices.Sorted(maps.Keys(c.Groups)) {
		l := c.Groups[id]
		if l == nil {
			delete(c.Groups, id)
			continue
		}
		if id <= 0 {
			return nil, fmt.Errorf("groups.%d: invalid group id", id)
		}
		path := fmt.Sprintf("groups.%d.", id)
		w, err := l.normalize(path)
		if err != nil {
			return nil, err
		}
		warnings = append(warnings, w...)
	}
	for _, id := range slices.Sorted(maps.Keys(c.Accounts)) {
		o := c.Accounts[id]
		if id <= 0 {
			return nil, fmt.Errorf("accounts.%d: invalid account id", id)
		}
		if err := o.normalize(fmt.Sprintf("accounts.%d.", id)); err != nil {
			return nil, err
		}
		c.Accounts[id] = o
	}
	return warnings, c.Notify.normalize()
}

// normalize validates a layer; path prefixes the messages ("groups.7.").
func (l *Layer) normalize(path string) ([]string, error) {
	if l.WindowSeconds < minWindowSeconds || l.WindowSeconds > maxWindowSeconds {
		return nil, fmt.Errorf("%swindow_seconds must be between %d and %d", path, minWindowSeconds, maxWindowSeconds)
	}
	if l.MinSamples < 1 || l.MinSamples > maxMinSamples {
		return nil, fmt.Errorf("%smin_samples must be between 1 and %d", path, maxMinSamples)
	}
	if err := checkMinWeight(l.MinWeightMode, l.MinWeight); err != nil {
		return nil, fmt.Errorf("%s%w", path, err)
	}
	codes, err := NormalizeStatusCodes(l.ExemptStatusCodes)
	if err != nil {
		return nil, fmt.Errorf("%sexempt_status_codes: %w", path, err)
	}
	if len(l.Rules) > MaxRules {
		return nil, fmt.Errorf("%srules: at most %d rules are allowed", path, MaxRules)
	}
	if len(l.Strategies) > MaxStrategies {
		return nil, fmt.Errorf("%sstrategies: at most %d strategies are allowed", path, MaxStrategies)
	}
	rules, err := normalizeNamed("rules", l.Rules, Rule.normalize, func(r Rule) string { return r.Name })
	if err != nil {
		return nil, fmt.Errorf("%s%w", path, err)
	}
	index := ruleIndex(rules)
	normalizeStrategy := func(s Strategy, i int) (Strategy, error) { return s.normalize(i, rules, index) }
	strategies, err := normalizeNamed("strategies", l.Strategies, normalizeStrategy, func(s Strategy) string { return s.Name })
	if err != nil {
		return nil, fmt.Errorf("%s%w", path, err)
	}
	l.ExemptStatusCodes, l.Rules, l.Strategies = codes, rules, strategies
	return l.warnings(path), nil
}

// normalizeNamed normalizes a list of named items whose names are unique.
func normalizeNamed[T any](label string, items []T, normalize func(T, int) (T, error), name func(T) string) ([]T, error) {
	out := make([]T, 0, len(items))
	seen := make(map[string]bool, len(items))
	for i, item := range items {
		item, err := normalize(item, i)
		if err != nil {
			return nil, err
		}
		if seen[name(item)] {
			return nil, fmt.Errorf("%s[%d].name is duplicated: %s", label, i, name(item))
		}
		seen[name(item)] = true
		out = append(out, item)
	}
	return out, nil
}

// warnings: a degraded weight that never recovers on its own.
func (l *Layer) warnings(path string) []string {
	if noClimb(l.Strategies) {
		return []string{path + "strategies: a strategy degrades the weight but no enabled strategy climbs; it never recovers on its own"}
	}
	weightRules := map[string]bool{}
	for _, r := range l.Rules {
		weightRules[r.Name] = r.HasWeightCondition()
	}
	degrade, revive := false, false
	for _, s := range l.Strategies {
		if s.IsEnabled() {
			degrade = degrade || s.Direction() == Degrade
			revive = revive || (s.Direction() == Climb && s.When.References(func(rule string) bool { return weightRules[rule] }))
		}
	}
	if degrade && !revive && l.MinWeight == 0 {
		return []string{path + "strategies: no enabled climb references a rule with a weight condition; a weight that drops to 0 never recovers on its own"}
	}
	return nil
}

func checkMinWeight(mode string, value int) error {
	switch mode {
	case ModeBasePercent:
		if value < 0 || value > 100 {
			return fmt.Errorf("min_weight must be between 0 and 100 for %s", mode)
		}
	case ModeFixed:
		if value < 0 || value > maxWeightValue {
			return fmt.Errorf("min_weight must be between 0 and %d for %s", maxWeightValue, mode)
		}
	default:
		return fmt.Errorf("min_weight_mode must be %s or %s", ModeBasePercent, ModeFixed)
	}
	return nil
}

func (o *AccountOverride) normalize(path string) error {
	if (o.MinWeightMode == nil) != (o.MinWeight == nil) {
		return fmt.Errorf("%smin_weight_mode and min_weight go together", path)
	}
	if o.MinWeightMode != nil {
		if err := checkMinWeight(*o.MinWeightMode, *o.MinWeight); err != nil {
			return fmt.Errorf("%s%w", path, err)
		}
	}
	if o.ExemptStatusCodes != nil {
		codes, err := NormalizeStatusCodes(*o.ExemptStatusCodes)
		if err != nil {
			return fmt.Errorf("%sexempt_status_codes: %w", path, err)
		}
		o.ExemptStatusCodes = &codes
	}
	return nil
}

func (n *Notify) normalize() error {
	n.Channel = strings.TrimSpace(n.Channel)
	recipients := make([]string, 0, len(n.Recipients))
	for _, r := range n.Recipients {
		if r = strings.TrimSpace(r); r != "" {
			recipients = append(recipients, r)
		}
	}
	n.Recipients = recipients
	if n.Language != "en" {
		n.Language = "zh"
	}
	switch {
	case len(recipients) > maxRecipients:
		return fmt.Errorf("notify.recipients: at most %d recipients are allowed", maxRecipients)
	case n.Enabled && n.Channel == "":
		return fmt.Errorf("notify.channel is required")
	case n.Enabled && len(recipients) == 0:
		return fmt.Errorf("notify.recipients: at least one recipient is required")
	}
	return nil
}
