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
	// MinWindowSeconds is the interval of the evaluate job: a shorter window
	// would close more than once between two runs, and only the newest
	// closed window is evaluated (new-api evaluates lazily, so it allows 3).
	MinWindowSeconds = 10
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
	// WindowSeconds is the evaluation window, 10..3600. Windows are not
	// aligned to the epoch: each account rolls its own phase.
	WindowSeconds int `json:"window_seconds"`
	// MinSamples is how many attempts a condition accumulates, looking back
	// over the key's own earlier windows, before it is judged on them.
	MinSamples int `json:"min_samples"`
	// MinSamplesStrict (default on): a rule an enabled strategy that does not
	// climb references is not judged while its samples, looked back over as
	// far as the cut and the retention allow, stay short of what it needs
	// (min_samples, ceil(100/(100-p)) for a percentile). Off, it is judged on
	// what there is, as new-api does. Rules only climbs reference are always
	// judged on what there is: a degraded key gets less traffic.
	MinSamplesStrict bool `json:"min_samples_strict"`
	// ClearStickyOnZero (default on) clears every sticky binding of a key
	// whose effective weight drops to 0: scheduling stops picking the
	// account, but bound sessions would keep going to it.
	ClearStickyOnZero bool `json:"clear_sticky_on_zero"`
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
	// LogEvents also writes every weight event to the plugin log (global
	// only; on unless a document says false, as in new-api).
	LogEvents bool `json:"log_events"`
}

// defaultRules / defaultStrategies: error rate or p95 too slow in 2 of 3
// windows, a stream's first token or a non-streaming attempt hung in the
// window, a healthy window climbs back, and a weight at 0 for 2 windows is
// revived. The whole attempt of a stream is as long as the answer, so only
// non-streaming attempts are timed whole (0.2.0 timed every attempt, and a
// normal long stream degraded the key and kept it down). The recovery rule
// lets the timing conditions pass without samples: a key with no streams has
// no first token, one with only streams no non-streaming attempt
// (migrations/0002 moves the 0.2.0 defaults over).
const (
	defaultRules = `[{"name":"错误率过高","conditions":[{"metric":"error_rate","op":"gte","value":30}],"periods":3,"hit_periods":2},` +
		`{"name":"首字 p95 过慢","conditions":[{"metric":"ttfb","p":95,"op":"gte","value":10000}],"periods":3,"hit_periods":2},` +
		`{"name":"首字挂死","conditions":[{"metric":"ttfb","p":100,"op":"gte","value":60000},{"join":"or","metric":"latency","p":100,"op":"gte","value":120000,"scope":"non_stream"}],"periods":1,"hit_periods":1},` +
		`{"name":"健康恢复","conditions":[{"metric":"error_rate","op":"lt","value":15},{"join":"and","metric":"ttfb","p":95,"op":"lt","value":10000,"when_empty":"pass"},{"join":"and","metric":"ttfb","p":100,"op":"lt","value":60000,"when_empty":"pass"},{"join":"and","metric":"latency","p":100,"op":"lt","value":120000,"scope":"non_stream","when_empty":"pass"}],"periods":1,"hit_periods":1},` +
		`{"name":"复活探测","conditions":[{"metric":"weight","op":"lte","value":0}],"periods":2,"hit_periods":2}]`
	defaultStrategies = `[{"name":"错误率过高","when":"错误率过高","actions":[{"type":"weight_degrade","mode":"current_percent","value":30}]},` +
		`{"name":"首字 p95 过慢","when":"首字 p95 过慢","actions":[{"type":"weight_degrade","mode":"current_percent","value":30}]},` +
		`{"name":"首字挂死","when":"首字挂死","actions":[{"type":"weight_degrade","mode":"current_percent","value":50}]},` +
		`{"name":"自动回升","when":"健康恢复","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]},` +
		`{"name":"复活探测","when":"复活探测","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]}]`
)

// UnmarshalJSON lays each group over the factory layer, adjusting unless it
// says "enabled": false, as new-api does: a group that leaves a field out
// gets the default, not a zero. A group's field set to null is refused: it
// would read as the default too, unlike the global layer's.
func (c *Config) UnmarshalJSON(data []byte) error {
	groups, err := c.decode(data)
	if err != nil {
		return err
	}
	for id, raw := range groups {
		l, err := decodeGroup(raw)
		if err != nil {
			return fmt.Errorf("groups.%d: %w", id, err)
		}
		c.setGroup(id, l)
	}
	return nil
}

// decode reads all but the groups, which it returns undecoded (a null group
// is none).
func (c *Config) decode(data []byte) (map[int64]json.RawMessage, error) {
	type plain Config
	var doc struct {
		*plain
		Groups map[int64]json.RawMessage `json:"groups"`
	}
	doc.plain = (*plain)(c)
	// Fields that are on unless the document says false.
	c.LogEvents, c.MinSamplesStrict, c.ClearStickyOnZero = true, true, true
	if err := json.Unmarshal(data, &doc); err != nil {
		return nil, err
	}
	c.Groups = nil
	maps.DeleteFunc(doc.Groups, func(_ int64, raw json.RawMessage) bool { return string(raw) == "null" })
	return doc.Groups, nil
}

// decodeGroup lays a group over the factory layer (UnmarshalJSON).
func decodeGroup(raw json.RawMessage) (*Layer, error) {
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil {
		return nil, err
	}
	for _, name := range slices.Sorted(maps.Keys(fields)) {
		if string(fields[name]) == "null" {
			return nil, fmt.Errorf("%s must not be null", name)
		}
	}
	l := DefaultLayer()
	l.Enabled = true
	if err := json.Unmarshal(raw, &l); err != nil {
		return nil, err
	}
	return &l, nil
}

func (c *Config) setGroup(id int64, l *Layer) {
	if c.Groups == nil {
		c.Groups = map[int64]*Layer{}
	}
	c.Groups[id] = l
}

// LoadConfig reads a stored configuration tolerantly, as new-api reads its
// options: a group that does not decode or validate is dropped (the global
// layer serves it), a global scalar out of range falls back to its default,
// an account override that does not validate is dropped and notifications
// that do not validate are turned off. A window below the minimum is raised
// (RaiseWindows). The warnings say what changed, until a save writes it
// back. Only a document that does not decode is an error; what is left
// (the global rules and strategies) is for Normalize to check.
func LoadConfig(data []byte) (Config, []string, error) {
	var c Config
	groups, err := c.decode(data)
	if err != nil {
		return Config{}, nil, err
	}
	var warnings []string
	for _, id := range slices.Sorted(maps.Keys(groups)) {
		l, err := decodeGroup(groups[id])
		if err != nil {
			warnings = append(warnings, dropped("groups", id, err))
			continue
		}
		c.setGroup(id, l)
	}
	warnings = append(warnings, c.RaiseWindows()...)
	return c, append(warnings, c.repair()...), nil
}

func dropped(what string, id int64, err error) string {
	return fmt.Sprintf("%s.%d: %v; it is ignored until the configuration is saved", what, id, err)
}

// repair applies the fallbacks of LoadConfig past decoding.
func (c *Config) repair() []string {
	var warnings []string
	g, def := &c.Layer, DefaultLayer()
	_, codesErr := NormalizeStatusCodes(g.ExemptStatusCodes)
	for _, f := range [...]struct {
		err   error
		reset func()
	}{
		{checkWindow(g.WindowSeconds), func() { g.WindowSeconds = def.WindowSeconds }},
		{checkMinSamples(g.MinSamples), func() { g.MinSamples = def.MinSamples }},
		{codesErr, func() { g.ExemptStatusCodes = def.ExemptStatusCodes }},
		{checkMinWeight(g.MinWeightMode, g.MinWeight), func() { g.MinWeightMode, g.MinWeight = def.MinWeightMode, def.MinWeight }},
	} {
		if f.err != nil {
			f.reset()
			warnings = append(warnings, fmt.Sprintf("%v; the default is used until the configuration is saved", f.err))
		}
	}
	for _, id := range slices.Sorted(maps.Keys(c.Groups)) {
		if _, err := c.Groups[id].normalize(""); err != nil {
			delete(c.Groups, id)
			warnings = append(warnings, dropped("groups", id, err))
		}
	}
	for _, id := range slices.Sorted(maps.Keys(c.Accounts)) {
		o := c.Accounts[id]
		if err := o.normalize(""); err != nil {
			delete(c.Accounts, id)
			warnings = append(warnings, dropped("accounts", id, err))
		}
	}
	if err := c.Notify.normalize(); err != nil {
		c.Notify.Enabled = false
		c.Notify.Recipients = c.Notify.Recipients[:min(len(c.Notify.Recipients), maxRecipients)]
		warnings = append(warnings, fmt.Sprintf("%v; notifications are off until the configuration is saved", err))
	}
	return warnings
}

// DefaultLayer is the factory layer (adjustment off).
func DefaultLayer() Layer {
	l := Layer{WindowSeconds: 60, MinSamples: 10, MinSamplesStrict: true, ClearStickyOnZero: true, ExemptStatusCodes: "400", MinWeightMode: ModeBasePercent}
	if json.Unmarshal([]byte(defaultRules), &l.Rules) != nil || json.Unmarshal([]byte(defaultStrategies), &l.Strategies) != nil {
		panic("dynweight: invalid default rules")
	}
	return l
}

// DefaultConfig is the factory configuration (everything off).
func DefaultConfig() Config { return Config{Layer: DefaultLayer(), LogEvents: true} }

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

// RaiseWindows lifts the windows below MinWindowSeconds of a stored
// configuration to it (0.1.0 allowed 3): such a document still loads, while
// saving a new one below the minimum is refused. It says what it raised.
func (c *Config) RaiseWindows() []string {
	var raised []string
	layers := map[string]*Layer{"": &c.Layer}
	for id, l := range c.Groups {
		if l != nil {
			layers[fmt.Sprintf("groups.%d.", id)] = l
		}
	}
	for _, path := range slices.Sorted(maps.Keys(layers)) {
		if l := layers[path]; l.WindowSeconds < MinWindowSeconds {
			raised = append(raised, fmt.Sprintf("%swindow_seconds %d is below the minimum and was raised to %d; save the configuration to keep it",
				path, l.WindowSeconds, MinWindowSeconds))
			l.WindowSeconds = MinWindowSeconds
		}
	}
	return raised
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
	for _, err := range [...]error{checkWindow(l.WindowSeconds), checkMinSamples(l.MinSamples), checkMinWeight(l.MinWeightMode, l.MinWeight)} {
		if err != nil {
			return nil, fmt.Errorf("%s%w", path, err)
		}
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

// NoClimb reports whether an enabled strategy degrades but none climbs, so a
// degraded weight never recovers on its own.
func (l *Layer) NoClimb() bool { return noClimb(l.Strategies) }

// warnings: a degraded weight that never recovers on its own, and rules the
// traffic of some keys judges wrongly or never.
func (l *Layer) warnings(path string) []string {
	if l.NoClimb() {
		return append([]string{path + "strategies: a strategy degrades the weight but no enabled strategy climbs; it never recovers on its own"}, l.ruleWarnings(path)...)
	}
	warnings := l.ruleWarnings(path)
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
		warnings = append(warnings, path+"strategies: no enabled climb references a rule with a weight condition; a weight that drops to 0 never recovers on its own")
	}
	return warnings
}

// ruleWarnings looks at the conditions of the enabled rules:
//   - latency over streams: a stream's whole attempt is as long as its
//     answer, so a normal long stream trips a "too slow" threshold, and keeps
//     a "healthy" one from holding;
//   - a rule a climb references with a condition some keys have no samples
//     for (ttfb without streams, latency of one kind of request without it)
//     that fails without samples: those keys never climb back;
//   - an AND group with sample conditions only, all passing without samples:
//     it holds in windows without any traffic.
func (l *Layer) ruleWarnings(path string) []string {
	climbs := map[string]bool{}
	for _, s := range l.Strategies {
		if s.IsEnabled() && s.Direction() == Climb && s.When != nil {
			for _, r := range l.Rules {
				if s.When.References(func(name string) bool { return name == r.Name }) {
					climbs[r.Name] = true
				}
			}
		}
	}
	var out []string
	for i, r := range l.Rules {
		if !r.IsEnabled() {
			continue
		}
		at := fmt.Sprintf("%srules[%d] (%s)", path, i, r.Name)
		emptyPassGroup, sampled := true, false
		flush := func() {
			if sampled && emptyPassGroup {
				out = append(out, at+": every condition of an AND group passes without samples; it holds in windows without traffic")
			}
			emptyPassGroup, sampled = true, false
		}
		for j, c := range r.Conditions {
			if j > 0 && c.Join == JoinOr {
				flush()
			}
			if c.Metric == MetricWeight {
				emptyPassGroup = false
				continue
			}
			sampled = true
			emptyPassGroup = emptyPassGroup && c.passEmpty()
			scope := scopeIndex(c.scopeIn(r.Scope))
			if c.Metric == MetricLatency && scope != scopeNonStreamIdx {
				out = append(out, fmt.Sprintf("%s.conditions[%d]: latency of streaming attempts is the whole answer; a normal long stream trips it — set its scope to non_stream", at, j))
			}
			mayBeEmpty := c.Metric == MetricTTFB || (c.Metric == MetricLatency && scope != scopeAllIdx)
			if climbs[r.Name] && mayBeEmpty && !c.passEmpty() {
				out = append(out, fmt.Sprintf("%s.conditions[%d]: keys without such samples never climb back on this rule — set when_empty to pass", at, j))
			}
		}
		flush()
	}
	return out
}

func checkWindow(v int) error {
	if v < MinWindowSeconds || v > maxWindowSeconds {
		return fmt.Errorf("window_seconds must be between %d and %d", MinWindowSeconds, maxWindowSeconds)
	}
	return nil
}

func checkMinSamples(v int) error {
	if v < 1 || v > maxMinSamples {
		return fmt.Errorf("min_samples must be between 1 and %d", maxMinSamples)
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
