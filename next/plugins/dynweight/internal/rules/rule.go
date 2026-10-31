package rules

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"slices"
	"strings"
	"unicode/utf8"
)

// Condition metrics.
const (
	MetricErrorRate = "error_rate"
	MetricTTFB      = "ttfb"
	MetricLatency   = "latency"
	MetricWeight    = "weight"
)

// Comparison operators; percentile metrics only allow gte and lt.
const (
	OpGt  = "gt"
	OpGte = "gte"
	OpLt  = "lt"
	OpLte = "lte"
)

// Condition joins: "and" binds before "or".
const (
	JoinAnd = "and"
	JoinOr  = "or"
)

// Rule scopes: the counters a rule reads.
const (
	ScopeAll       = "all"
	ScopeStream    = "stream"
	ScopeNonStream = "non_stream"
)

const (
	MaxRules        = 20
	MaxStrategies   = 20
	MaxConditions   = 10
	MaxPeriods      = 60
	MaxNameLength   = 64
	maxLatencyMs    = 86400000
	maxWeightValue  = 1000000
	minRetainPeriod = 5
)

// Rule is a judgement rule: an ordered condition expression, each condition
// `metric op value`, cut into AND groups at every "or"; the rule hits in a
// window when any AND group is entirely true, and fires once it hit in
// HitPeriods of the last Periods windows (the history is then cleared).
// Rules carry no actions: strategies reference them by name.
type Rule struct {
	Name       string      `json:"name"`
	Scope      string      `json:"scope,omitempty"` // all (default) | stream | non_stream
	Enabled    *bool       `json:"enabled,omitempty"`
	Conditions []Condition `json:"conditions"`
	Periods    int         `json:"periods"`     // N, 1..60
	HitPeriods int         `json:"hit_periods"` // M, 1..N
}

// What a sample condition is without any sample (Condition.WhenEmpty).
const (
	WhenEmptyFail = "fail" // false (the default): no evidence, no hit
	WhenEmptyPass = "pass" // true: no evidence against it
)

// Condition is one `metric op value`. ttfb / latency compare the P-th
// percentile in milliseconds, error_rate a percentage and weight the integer
// effective weight at the start of the window.
//
// A sample condition (all but weight) may read other counters than its
// rule's (Scope), so one rule can judge the first token of the streams and
// the whole attempt of the non-streaming requests. WhenEmpty says what it is
// when the lookback found no sample at all: false (fail, the default), or
// true (pass). A pass condition only vetoes: it also holds on old samples
// alone, without needing new ones, so a recovery rule does not wait for a
// kind of traffic the key may never get.
type Condition struct {
	Join      string  `json:"join,omitempty"` // and | or; empty on the first condition
	Metric    string  `json:"metric"`
	P         int     `json:"p,omitempty"` // ttfb / latency: 50..100
	Op        string  `json:"op"`
	Value     float64 `json:"value"`
	Scope     string  `json:"scope,omitempty"`      // "" = the rule's | all | stream | non_stream
	WhenEmpty string  `json:"when_empty,omitempty"` // "" (= fail) | pass
}

// scopeIn is the scope the condition reads under a rule of scope rule.
func (c Condition) scopeIn(rule string) string {
	if c.Scope != "" {
		return c.Scope
	}
	return rule
}

// passEmpty reports whether the condition holds without samples.
func (c Condition) passEmpty() bool { return c.WhenEmpty == WhenEmptyPass }

// UnmarshalJSON leaves a missing value NaN, so normalize refuses it rather
// than reading it as 0.
func (c *Condition) UnmarshalJSON(data []byte) error {
	type plain Condition
	p := plain{Value: math.NaN()}
	if err := json.Unmarshal(data, &p); err != nil {
		return err
	}
	*c = Condition(p)
	return nil
}

// IsEnabled reports whether the rule is evaluated (the default).
func (r Rule) IsEnabled() bool { return r.Enabled == nil || *r.Enabled }

// HasWeightCondition reports whether the rule has a weight condition: only
// such rules can lift a weight from 0.
func (r Rule) HasWeightCondition() bool {
	return slices.ContainsFunc(r.Conditions, func(c Condition) bool { return c.Metric == MetricWeight })
}

// metricSpec describes a condition metric: whether it is a percentile (p
// required, threshold counted per bucket), which bucket table a percentile
// threshold goes to, the operators and the threshold range.
type metricSpec struct {
	name       string
	percentile bool
	latency    bool
	ops        []string
	min, max   float64
}

var metricSpecs = []metricSpec{
	{name: MetricErrorRate, ops: []string{OpGt, OpGte, OpLt, OpLte}, min: 0, max: 100},
	{name: MetricTTFB, percentile: true, ops: []string{OpGte, OpLt}, min: 1, max: maxLatencyMs},
	{name: MetricLatency, percentile: true, latency: true, ops: []string{OpGte, OpLt}, min: 1, max: maxLatencyMs},
	{name: MetricWeight, ops: []string{OpGt, OpGte, OpLt, OpLte}, min: 0, max: maxWeightValue},
}

func specOf(metric string) (metricSpec, bool) {
	i := slices.IndexFunc(metricSpecs, func(s metricSpec) bool { return s.name == metric })
	if i < 0 {
		return metricSpec{}, false
	}
	return metricSpecs[i], true
}

// normalize validates rules[i] and returns it in canonical form.
func (r Rule) normalize(i int) (Rule, error) {
	path := fmt.Sprintf("rules[%d]", i)
	r.Name = strings.TrimSpace(r.Name)
	if err := checkName(path, r.Name); err != nil {
		return r, err
	}
	if r.IsEnabled() {
		r.Enabled = nil
	}
	switch r.Scope {
	case "", ScopeAll:
		r.Scope = ""
	case ScopeStream, ScopeNonStream:
	default:
		return r, fmt.Errorf("%s.scope must be all, stream or non_stream", path)
	}
	if len(r.Conditions) == 0 || len(r.Conditions) > MaxConditions {
		return r, fmt.Errorf("%s.conditions must have 1 to %d conditions", path, MaxConditions)
	}
	conds := make([]Condition, len(r.Conditions))
	for j, c := range r.Conditions {
		c, err := c.normalize(fmt.Sprintf("%s.conditions[%d]", path, j), j, r.Scope)
		if err != nil {
			return r, err
		}
		if scopeIndex(c.scopeIn(r.Scope)) == scopeNonStreamIdx && c.Metric == MetricTTFB {
			return r, fmt.Errorf("%s.conditions[%d]: ttfb has no non_stream samples", path, j)
		}
		conds[j] = c
	}
	r.Conditions = conds
	// 0 (left out) defaults to 1; a negative count is a mistake.
	if r.Periods < 0 || r.HitPeriods < 0 {
		return r, fmt.Errorf("%s.periods and hit_periods must be positive", path)
	}
	r.Periods, r.HitPeriods = max(r.Periods, 1), max(r.HitPeriods, 1)
	if r.Periods > MaxPeriods {
		return r, fmt.Errorf("%s.periods must be between 1 and %d", path, MaxPeriods)
	}
	if r.HitPeriods > r.Periods {
		return r, fmt.Errorf("%s.hit_periods must be between 1 and periods", path)
	}
	return r, nil
}

// normalize validates a condition of a rule of scope ruleScope (already
// canonical): a scope equal to the rule's is left out.
func (c Condition) normalize(path string, j int, ruleScope string) (Condition, error) {
	c.Join, c.Metric, c.Op = strings.TrimSpace(c.Join), strings.TrimSpace(c.Metric), strings.TrimSpace(c.Op)
	c.Scope, c.WhenEmpty = strings.TrimSpace(c.Scope), strings.TrimSpace(c.WhenEmpty)
	switch c.Scope {
	case "", ScopeAll, ScopeStream, ScopeNonStream:
	default:
		return c, fmt.Errorf("%s.scope must be all, stream or non_stream", path)
	}
	switch c.WhenEmpty {
	case "", WhenEmptyFail:
		c.WhenEmpty = ""
	case WhenEmptyPass:
	default:
		return c, fmt.Errorf("%s.when_empty must be fail or pass", path)
	}
	if c.Metric == MetricWeight && (c.Scope != "" || c.WhenEmpty != "") {
		return c, fmt.Errorf("%s: scope and when_empty are only valid for error_rate, ttfb and latency", path)
	}
	if scopeIndex(c.Scope) == scopeIndex(ruleScope) {
		c.Scope = ""
	}
	if j == 0 {
		c.Join = ""
	} else if c.Join != JoinAnd && c.Join != JoinOr {
		return c, fmt.Errorf("%s.join must be and or or", path)
	}
	spec, ok := specOf(c.Metric)
	if !ok {
		return c, fmt.Errorf("%s.metric must be error_rate, ttfb, latency or weight", path)
	}
	if spec.percentile && (c.P < 50 || c.P > 100) {
		return c, fmt.Errorf("%s.p must be between 50 and 100", path)
	}
	if !spec.percentile && c.P != 0 {
		return c, fmt.Errorf("%s.p is only valid for ttfb and latency", path)
	}
	if !slices.Contains(spec.ops, c.Op) {
		return c, fmt.Errorf("%s.op must be one of %s", path, strings.Join(spec.ops, ", "))
	}
	if math.IsNaN(c.Value) || c.Value != math.Trunc(c.Value) || c.Value < spec.min || c.Value > spec.max {
		return c, fmt.Errorf("%s.value must be an integer between %g and %g", path, spec.min, spec.max)
	}
	return c, nil
}

func checkName(path, name string) error {
	if name == "" {
		return fmt.Errorf("%s.name is required", path)
	}
	if utf8.RuneCountInString(name) > MaxNameLength {
		return fmt.Errorf("%s.name must be at most %d characters", path, MaxNameLength)
	}
	return nil
}

// When is a strategy's rule expression, one of: a rule name (a JSON
// string), {"all": [...]} or {"any": [...]}. The members of a combination
// are rule names or one more level of combination.
type When struct {
	Rule string
	All  []When
	Any  []When
}

func (w When) MarshalJSON() ([]byte, error) {
	switch {
	case len(w.All) > 0:
		return json.Marshal(map[string][]When{"all": w.All})
	case len(w.Any) > 0:
		return json.Marshal(map[string][]When{"any": w.Any})
	}
	return json.Marshal(w.Rule)
}

func (w *When) UnmarshalJSON(data []byte) error {
	*w = When{}
	data = bytes.TrimSpace(data)
	if len(data) > 0 && data[0] == '"' {
		return json.Unmarshal(data, &w.Rule)
	}
	var obj struct {
		All []When `json:"all"`
		Any []When `json:"any"`
	}
	if err := json.Unmarshal(data, &obj); err != nil || (obj.All == nil) == (obj.Any == nil) {
		return errors.New("when must be a rule name, or an object with all or any")
	}
	w.All, w.Any = obj.All, obj.Any
	return nil
}

// References reports whether any rule name in the tree satisfies match.
func (w When) References(match func(rule string) bool) bool {
	if len(w.All) == 0 && len(w.Any) == 0 {
		return match(w.Rule)
	}
	return slices.ContainsFunc(append(slices.Clone(w.All), w.Any...), func(c When) bool { return c.References(match) })
}

// WhenNode is a compiled When: a leaf (Op "") references a rule by its index
// among the enabled rules.
type WhenNode struct {
	Op       string // "" | all | any
	Rule     int
	Children []WhenNode
}

const (
	whenAll = "all"
	whenAny = "any"
)

// Eval evaluates the tree with leaf(rule) = (truth, gate) and returns the
// tree's truth and whether a gate leaf lies on a satisfied path: all() passes
// the gate of any child, any() only that of a true child.
func (n WhenNode) Eval(leaf func(rule int) (truth, gate bool)) (truth, gate bool) {
	switch n.Op {
	case whenAll:
		for _, c := range n.Children {
			t, g := c.Eval(leaf)
			if !t {
				return false, false
			}
			gate = gate || g
		}
		return true, gate
	case whenAny:
		for _, c := range n.Children {
			t, g := c.Eval(leaf)
			truth, gate = truth || t, gate || (t && g)
		}
		return truth, gate
	}
	return leaf(n.Rule)
}

// compileWhen compiles w against rules (indexed by name). With
// requireEnabled every referenced rule must be enabled.
func compileWhen(w When, rules []Rule, index map[string]int, requireEnabled bool, depth int) (WhenNode, error) {
	children, op := w.All, whenAll
	if len(w.Any) > 0 {
		children, op = w.Any, whenAny
	}
	if len(children) == 0 {
		if w.Rule == "" {
			return WhenNode{}, errors.New("when is required")
		}
		idx, ok := index[w.Rule]
		if !ok {
			return WhenNode{}, fmt.Errorf("when references unknown rule %q", w.Rule)
		}
		if requireEnabled && !rules[idx].IsEnabled() {
			return WhenNode{}, fmt.Errorf("when references disabled rule %q", w.Rule)
		}
		return WhenNode{Rule: idx}, nil
	}
	if w.Rule != "" || (len(w.All) > 0 && len(w.Any) > 0) {
		return WhenNode{}, errors.New("when must be exactly one of a rule name, all or any")
	}
	if depth >= 2 {
		return WhenNode{}, errors.New("when must not nest deeper than one level")
	}
	node := WhenNode{Op: op, Children: make([]WhenNode, 0, len(children))}
	for _, c := range children {
		child, err := compileWhen(c, rules, index, requireEnabled, depth+1)
		if err != nil {
			return WhenNode{}, err
		}
		node.Children = append(node.Children, child)
	}
	return node, nil
}

func ruleIndex(rules []Rule) map[string]int {
	index := make(map[string]int, len(rules))
	for i, r := range rules {
		index[r.Name] = i
	}
	return index
}
