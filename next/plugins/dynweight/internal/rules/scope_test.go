package rules

import (
	"encoding/json"
	"strings"
	"testing"
)

// stepWith evaluates the next window with the given samples.
func (s *sim) stepWith(samples ...Sample) Output {
	s.t.Helper()
	var c Counts
	for _, smp := range samples {
		c.Record(smp, &s.cfg)
	}
	s.win += int64(s.cfg.WindowSeconds)
	s.obs = append([]Counts{c}, s.obs...)
	if n := s.cfg.RetentionPeriods(); len(s.obs) > n {
		s.obs = s.obs[:n]
	}
	out := Evaluate(Input{Base: s.base, Window: s.win, Now: s.win + 70, Obs: s.obs, Cfg: s.cfg, State: s.state})
	if out.Action == ActionApplied {
		st := out.State
		s.state = &st
	}
	return out
}

func repeat(n int, smp Sample) []Sample {
	out := make([]Sample, n)
	for i := range out {
		out[i] = smp
	}
	return out
}

var (
	failed500 = Sample{Fail: true, FailStatus: 500, TTFBMs: -1, LatencyMs: -1}
	// A normal long stream: the first token after 2 s, the answer after 5 min.
	longStream = Sample{Stream: true, TTFBMs: 2000, LatencyMs: 300000}
	// A healthy non-streaming attempt: no first token, 3 s in all.
	plainOK = Sample{TTFBMs: -1, LatencyMs: 3000}
)

// The default rules time the whole attempt of non-streaming requests only: a
// normal long stream neither trips "hung" nor keeps a key from climbing back.
func TestLongStreamsAreNotHung(t *testing.T) {
	s := newSim(t, compiled(t, nil), 100)
	if out := s.stepWith(repeat(20, longStream)...); out.WeightTo != 100 || out.State.LastRules[2] != ruleNone {
		t.Fatalf("long streams: weight %v, rules %q", out.WeightTo, out.State.LastRules)
	}
	s.stepWith(append(repeat(5, longStream), repeat(5, failed500)...)...)
	if out := s.stepWith(append(repeat(5, longStream), repeat(5, failed500)...)...); out.WeightTo != 70 {
		t.Fatalf("degrade: %v", out.WeightTo)
	}
	out := s.stepWith(repeat(20, longStream)...)
	if out.WeightTo != 80 || !RuleHit(out.State.LastRules[3]) {
		t.Fatalf("climb on long streams: weight %v, rules %q", out.WeightTo, out.State.LastRules)
	}
	// A hung non-streaming attempt still trips the rule.
	if out := s.stepWith(Sample{TTFBMs: -1, LatencyMs: 130000}); out.WeightTo != 40 || !RuleFired(out.State.LastRules[2]) {
		t.Fatalf("hung non-stream: weight %v, rules %q", out.WeightTo, out.State.LastRules)
	}
}

// A key with non-streaming traffic only has no first token samples: the
// recovery rule passes them and climbs on the error rate and the latency.
func TestNonStreamOnlyRecovers(t *testing.T) {
	s := newSim(t, compiled(t, nil), 100)
	s.stepWith(append(repeat(5, plainOK), repeat(5, failed500)...)...)
	if out := s.stepWith(append(repeat(5, plainOK), repeat(5, failed500)...)...); out.WeightTo != 70 {
		t.Fatalf("degrade: %v", out.WeightTo)
	}
	out := s.stepWith(repeat(20, plainOK)...)
	if out.WeightTo != 80 || ChangeKind(out) != EventWeightUpStart {
		t.Fatalf("first healthy window: %v %s", out.WeightTo, ChangeKind(out))
	}
	// The passed ttfb conditions gave no evidence: the stat is the error
	// rate's and the latency's.
	if st := out.State.LastRuleStats[3]; st != (RuleStat{N: 20, Lookback: 1}) {
		t.Fatalf("recovery evidence %+v", st)
	}
	// Few attempts still climb: the recovery rule is judged on what there is.
	if out := s.stepWith(repeat(3, plainOK)...); out.WeightTo != 90 {
		t.Fatalf("sparse healthy window: %v", out.WeightTo)
	}
	// A hung one degrades it by half.
	if out := s.stepWith(Sample{TTFBMs: -1, LatencyMs: 125000}); out.WeightTo != 45 {
		t.Fatalf("hung: %v", out.WeightTo)
	}
}

// defaultRules020 are the 0.2.0 defaults, as migrations/0002 finds them.
const defaultRules020 = `[{"name":"错误率过高","conditions":[{"metric":"error_rate","op":"gte","value":30}],"periods":3,"hit_periods":2},` +
	`{"name":"首字 p95 过慢","conditions":[{"metric":"ttfb","p":95,"op":"gte","value":10000}],"periods":3,"hit_periods":2},` +
	`{"name":"首字挂死","conditions":[{"metric":"ttfb","p":100,"op":"gte","value":60000},{"join":"or","metric":"latency","p":100,"op":"gte","value":120000}],"periods":1,"hit_periods":1},` +
	`{"name":"健康恢复","conditions":[{"metric":"error_rate","op":"lt","value":15},{"join":"and","metric":"ttfb","p":95,"op":"lt","value":10000},{"join":"and","metric":"ttfb","p":100,"op":"lt","value":60000},{"join":"and","metric":"latency","p":100,"op":"lt","value":120000}],"periods":1,"hit_periods":1},` +
	`{"name":"复活探测","conditions":[{"metric":"weight","op":"lte","value":0}],"periods":2,"hit_periods":2}]`

// Under the 0.2.0 defaults a long stream hangs a key for good, and a key
// without streams never climbs back: what 0.3.0 fixes.
func TestDefaults020Faults(t *testing.T) {
	c := compiled(t, func(c *Config) {
		if err := json.Unmarshal([]byte(defaultRules020), &c.Rules); err != nil {
			t.Fatal(err)
		}
	})
	s := newSim(t, c, 100)
	if out := s.stepWith(repeat(20, longStream)...); out.WeightTo != 50 {
		t.Fatalf("0.2.0 long streams: %v", out.WeightTo)
	}
	if out := s.stepWith(repeat(20, plainOK)...); out.WeightTo != 50 || RuleHit(out.State.LastRules[3]) {
		t.Fatalf("0.2.0 non-stream recovery: %v %q", out.WeightTo, out.State.LastRules)
	}
}

// Saving rules some traffic judges wrongly or never warns: latency over
// streams, a climb rule failing without samples, an AND group that passes
// without any traffic.
func TestRuleWarnings(t *testing.T) {
	c := DefaultConfig()
	if err := json.Unmarshal([]byte(defaultRules020), &c.Rules); err != nil {
		t.Fatal(err)
	}
	w, err := c.Normalize()
	if err != nil {
		t.Fatal(err)
	}
	// 首字挂死 and 健康恢复 time streams whole; 健康恢复 fails on two ttfb
	// conditions without streams.
	if len(w) != 4 || !strings.Contains(w[0], "rules[2] (首字挂死).conditions[1]: latency") ||
		!strings.Contains(w[1], "rules[3] (健康恢复).conditions[1]: keys without such samples") ||
		!strings.Contains(w[2], "rules[3] (健康恢复).conditions[2]: keys without such samples") ||
		!strings.Contains(w[3], "rules[3] (健康恢复).conditions[3]: latency") {
		t.Fatalf("0.2.0 defaults: %q", w)
	}
	c = DefaultConfig()
	c.Rules[3].Conditions[0].WhenEmpty = WhenEmptyPass
	if w, err := c.Normalize(); err != nil || len(w) != 1 || !strings.Contains(w[0], "holds in windows without traffic") {
		t.Fatalf("all passing: %q %v", w, err)
	}
	// Latency of the streams only times them whole, and a key without
	// streams has none.
	c = DefaultConfig()
	c.Rules[3].Conditions[3].Scope, c.Rules[3].Conditions[3].WhenEmpty = ScopeStream, ""
	if w, err := c.Normalize(); err != nil || len(w) != 2 {
		t.Fatalf("stream latency: %q %v", w, err)
	}
}

// A condition's scope and when_empty are validated and put in canonical
// form.
func TestConditionScope(t *testing.T) {
	for name, mutate := range map[string]func(*Config){
		"scope":           func(c *Config) { c.Rules[0].Conditions[0].Scope = "x" },
		"when_empty":      func(c *Config) { c.Rules[0].Conditions[0].WhenEmpty = "maybe" },
		"weight scope":    func(c *Config) { c.Rules[4].Conditions[0].Scope = ScopeStream },
		"weight empty":    func(c *Config) { c.Rules[4].Conditions[0].WhenEmpty = WhenEmptyPass },
		"ttfb non_stream": func(c *Config) { c.Rules[1].Conditions[0].Scope = ScopeNonStream },
	} {
		c := DefaultConfig()
		mutate(&c)
		if _, err := c.Normalize(); err == nil {
			t.Errorf("%s accepted", name)
		}
	}
	c := DefaultConfig()
	c.Rules[0].Scope = ScopeStream
	c.Rules[0].Conditions[0].Scope, c.Rules[0].Conditions[0].WhenEmpty = ScopeStream, WhenEmptyFail
	c.Rules[1].Conditions[0].Scope = ScopeAll
	if _, err := c.Normalize(); err != nil {
		t.Fatal(err)
	}
	if cond := c.Rules[0].Conditions[0]; cond.Scope != "" || cond.WhenEmpty != "" || c.Rules[1].Conditions[0].Scope != "" {
		t.Fatalf("not canonical: %+v %+v", cond, c.Rules[1].Conditions[0])
	}
	// A condition of all traffic under a stream rule keeps its scope.
	c.Rules[0].Conditions[0].Scope = ScopeAll
	if _, err := c.Normalize(); err != nil || c.Rules[0].Conditions[0].Scope != ScopeAll {
		t.Fatalf("all under stream: %+v %v", c.Rules[0].Conditions[0], err)
	}
}

// Strict (the default): a degrading rule short of min_samples is not judged,
// even once the lookback ran out; the window leaves its bitmap alone, so it
// fires on the last N judgements. A climb rule stays lenient.
func TestStrictMinSamples(t *testing.T) {
	s := newSim(t, compiled(t, nil), 100)
	if !s.cfg.StrictRules[0] || s.cfg.StrictRules[3] {
		t.Fatalf("strict rules %v", s.cfg.StrictRules)
	}
	for i, n := range []int64{4, 8} {
		out := s.stepWith(repeat(4, failed500)...)
		if out.WeightTo != 100 || out.State.LastRules[0] != ruleUnjudged || out.State.LastRuleStats[0].N != n || out.State.Bitmaps[0] != "" {
			t.Fatalf("window %d: weight %v, rules %q, stats %+v", i, out.WeightTo, out.State.LastRules, out.State.LastRuleStats)
		}
	}
	out := s.stepWith(repeat(4, failed500)...)
	if out.WeightTo != 100 || out.State.LastRules[0] != ruleHit || out.State.Bitmaps[0] != "1" || out.State.LastRuleStats[0].N != 12 {
		t.Fatalf("judged: %q %+v", out.State.LastRules, out.State.LastRuleStats)
	}
	// The consumed samples are not judged again: 4, then 8 after the cut.
	s.stepWith(repeat(4, failed500)...)
	if out := s.stepWith(repeat(4, failed500)...); out.WeightTo != 100 || out.State.Bitmaps[0] != "1" {
		t.Fatalf("after the cut: %v %q", out.WeightTo, out.State.Bitmaps)
	}
	if out := s.stepWith(repeat(4, failed500)...); out.WeightTo != 70 || !RuleFired(out.State.LastRules[0]) {
		t.Fatalf("second judgement: %v %q", out.WeightTo, out.State.LastRules)
	}
	// The status shows the unjudged rule.
	out = s.stepWith(repeat(2, failed500)...)
	if r := Describe(1, &out.State, &s.cfg, 100, true, nil, s.win+70).Rules[0]; !r.Unjudged || r.Hit {
		t.Fatalf("status %+v", r)
	}
	// Lenient, the same traffic degrades on the second window.
	s = newSim(t, compiled(t, func(c *Config) { c.MinSamplesStrict = false }), 100)
	if s.cfg.StrictRules != nil {
		t.Fatalf("lenient strict rules %v", s.cfg.StrictRules)
	}
	s.stepWith(repeat(4, failed500)...)
	if out := s.stepWith(repeat(4, failed500)...); out.WeightTo != 70 {
		t.Fatalf("lenient: %v", out.WeightTo)
	}
}

// Strict is the default and keeps the 0.2.0 signature; lenient changes it.
func TestStrictSignature(t *testing.T) {
	var c Config
	if err := json.Unmarshal([]byte(`{"window_seconds":60,"min_samples":10,"min_weight_mode":"base_percent"}`), &c); err != nil {
		t.Fatal(err)
	}
	if !c.MinSamplesStrict || !c.ClearStickyOnZero {
		t.Fatalf("defaults: %+v", c.Layer)
	}
	strict := compiled(t, nil).Resolve(1, 1).RulesSig
	if lenient := compiled(t, func(c *Config) { c.MinSamplesStrict = false }).Resolve(1, 1).RulesSig; lenient == strict {
		t.Fatal("lenient shares the signature")
	}
	// Turning the zero clearing off is not a rules change.
	if off := compiled(t, func(c *Config) { c.ClearStickyOnZero = false }).Resolve(1, 1).RulesSig; off != strict {
		t.Fatal("clear_sticky_on_zero changed the signature")
	}
}

// A key whose weight drops to 0 clears all its sticky bindings once, unless
// turned off.
func TestZeroClearsSticky(t *testing.T) {
	toZero := func(c *Config) {
		c.Strategies[2].Actions[0] = Action{Type: ActionWeightDegrade, Mode: ModeCurrentPercent, Value: 100}
	}
	s := newSim(t, compiled(t, toZero), 100)
	out := s.step(1, 0, 61000)
	if out.WeightTo != 0 || len(out.SideEffects) != 1 || !out.SideEffects[0].Zero || out.SideEffects[0].AffinityPercent != 100 {
		t.Fatalf("to zero: %v %+v", out.WeightTo, out.SideEffects)
	}
	if out := s.step(1, 0, 61000); out.WeightTo != 0 || len(out.SideEffects) != 0 {
		t.Fatalf("already at zero: %+v", out.SideEffects)
	}
	s = newSim(t, compiled(t, func(c *Config) { toZero(c); c.ClearStickyOnZero = false }), 100)
	if out := s.step(1, 0, 61000); out.WeightTo != 0 || len(out.SideEffects) != 0 {
		t.Fatalf("turned off: %+v", out.SideEffects)
	}
}
