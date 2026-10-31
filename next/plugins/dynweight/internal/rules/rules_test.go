package rules

import (
	"encoding/json"
	"math"
	"reflect"
	"strings"
	"testing"
)

func compiled(t *testing.T, mutate func(*Config)) *Compiled {
	t.Helper()
	c := DefaultConfig()
	c.Enabled = true
	if mutate != nil {
		mutate(&c)
	}
	if _, err := c.Normalize(); err != nil {
		t.Fatal(err)
	}
	return Compile(c)
}

// sim drives one key through windows of 60s: each step records samples into
// the newest window and evaluates it, keeping the observation history.
type sim struct {
	t     *testing.T
	cfg   Resolved
	base  int
	state *State
	obs   []Counts // newest first
	win   int64
}

func newSim(t *testing.T, c *Compiled, base int) *sim {
	return &sim{t: t, cfg: c.Resolve(1, 1), base: base, win: 6000}
}

// step evaluates the next window with ok successes and fail failures (status
// 500), the given TTFB for every stream success.
func (s *sim) step(ok, fail int, ttfb int64) Output {
	s.t.Helper()
	var c Counts
	for range ok {
		c.Record(Sample{Stream: ttfb >= 0, TTFBMs: ttfb, LatencyMs: max(ttfb, 100)}, &s.cfg)
	}
	for range fail {
		c.Record(Sample{Fail: true, FailStatus: 500, TTFBMs: -1, LatencyMs: -1}, &s.cfg)
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

func TestDefaultConfigNormalizes(t *testing.T) {
	c := DefaultConfig()
	warnings, err := c.Normalize()
	if err != nil || len(warnings) != 0 {
		t.Fatalf("%v %v", warnings, err)
	}
	raw, _ := json.Marshal(c)
	var back Config
	if err := json.Unmarshal(raw, &back); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(Compile(back).Resolve(0, 0).RulesSig, Compile(c).Resolve(0, 0).RulesSig) {
		t.Fatal("signature changed through JSON")
	}
}

func TestNormalizeRejects(t *testing.T) {
	cases := map[string]func(*Config){
		"window":         func(c *Config) { c.WindowSeconds = MinWindowSeconds - 1 },
		"exempt":         func(c *Config) { c.ExemptStatusCodes = "40x" },
		"min weight":     func(c *Config) { c.MinWeight = 101 },
		"rule name":      func(c *Config) { c.Rules[0].Name = " " },
		"duplicate rule": func(c *Config) { c.Rules[1].Name = c.Rules[0].Name },
		"percentile op":  func(c *Config) { c.Rules[1].Conditions[0].Op = OpGt },
		"p":              func(c *Config) { c.Rules[1].Conditions[0].P = 40 },
		"join":           func(c *Config) { c.Rules[2].Conditions[1].Join = "xor" },
		"hit periods":    func(c *Config) { c.Rules[0].HitPeriods = 4 },
		"neg periods":    func(c *Config) { c.Rules[0].Periods = -3 },
		"no value":       func(c *Config) { c.Rules[0].Conditions[0].Value = math.NaN() },
		"non_stream":     func(c *Config) { c.Rules[1].Scope = ScopeNonStream },
		"unknown rule":   func(c *Config) { c.Strategies[0].When = &When{Rule: "nope"} },
		"disabled rule":  func(c *Config) { f := false; c.Rules[0].Enabled = &f },
		"two weights": func(c *Config) {
			c.Strategies[0].Actions = append(c.Strategies[0].Actions, Action{Type: ActionWeightClimb, Mode: ModeFixed, Value: 1})
		},
		"deep when": func(c *Config) {
			c.Strategies[0].When = &When{All: []When{{Any: []When{{All: []When{{Rule: "错误率过高"}}}}}}}
		},
		"group":        func(c *Config) { c.Groups = map[int64]*Layer{3: {WindowSeconds: 60}} },
		"override":     func(c *Config) { m := ModeFixed; c.Accounts = map[int64]AccountOverride{1: {MinWeightMode: &m}} },
		"notify":       func(c *Config) { c.Notify = Notify{Enabled: true, Recipients: []string{"a@b.co"}} },
		"notify empty": func(c *Config) { c.Notify = Notify{Enabled: true, Channel: "email"} },
	}
	for name, mutate := range cases {
		c := DefaultConfig()
		mutate(&c)
		if _, err := c.Normalize(); err == nil {
			t.Errorf("%s accepted", name)
		}
	}
	// A failed normalize leaves the configuration as it was.
	c := DefaultConfig()
	c.Rules[4].Name = c.Rules[0].Name
	if _, err := c.Normalize(); err == nil || len(c.Rules) != 5 || len(c.Strategies) != 5 {
		t.Fatalf("mutated on error: %v", err)
	}
	c = DefaultConfig()
	c.Strategies = c.Strategies[:3]
	if w, err := c.Normalize(); err != nil || len(w) != 1 || !strings.Contains(w[0], "never recovers") {
		t.Fatalf("no climb: %v %v", w, err)
	}
}

// A condition without a value is refused, not read as 0.
func TestConditionValueRequired(t *testing.T) {
	var c Condition
	if err := json.Unmarshal([]byte(`{"metric":"error_rate","op":"gt"}`), &c); err != nil {
		t.Fatal(err)
	}
	if _, err := c.normalize("c", 0); err == nil {
		t.Fatal("missing value accepted")
	}
}

// A group is laid over the factory layer and adjusts unless it says not to.
func TestDocumentDefaults(t *testing.T) {
	var c Config
	if err := json.Unmarshal([]byte(`{"window_seconds":60,"min_samples":10,"min_weight_mode":"base_percent",
		"groups":{"7":{"window_seconds":30},"8":{"enabled":false},"9":null}}`), &c); err != nil {
		t.Fatal(err)
	}
	g := c.Groups[7]
	if !g.Enabled || g.WindowSeconds != 30 || g.MinSamples != 10 || len(g.Rules) != 5 || c.Groups[8].Enabled || c.Groups[9] != nil {
		t.Fatalf("groups: %+v %+v", g, c.Groups)
	}
	// log_events is on unless the document turns it off, as in new-api.
	if c.WindowSeconds != 60 || c.Enabled || !c.LogEvents {
		t.Fatalf("global: %+v", c.Layer)
	}
	if err := json.Unmarshal([]byte(`{"log_events":false}`), &c); err != nil || c.LogEvents {
		t.Fatalf("log_events off: %v", err)
	}
}

// A null field of a group would read as the default: refused when saved,
// and the group dropped when loaded.
func TestGroupNullField(t *testing.T) {
	var c Config
	err := json.Unmarshal([]byte(`{"groups":{"7":{"window_seconds":30,"min_weight":null}}}`), &c)
	if err == nil || !strings.Contains(err.Error(), "groups.7: min_weight must not be null") {
		t.Fatalf("null accepted: %v", err)
	}
}

// A stored configuration loads with what no longer validates dropped or
// set back to its default, each with a warning.
func TestLoadConfigTolerant(t *testing.T) {
	c, warnings, err := LoadConfig([]byte(`{"enabled":true,"window_seconds":99999,"min_samples":0,"exempt_status_codes":"x",
		"min_weight_mode":"fixed","min_weight":-1,
		"groups":{"7":{"min_weight":null},"8":{"window_seconds":5},"9":{"min_samples":0},"10":{"rules":[{"name":""}]},"11":[]},
		"accounts":{"3":{"min_weight":5},"4":{"enabled":false}},
		"notify":{"enabled":true,"channel":"","recipients":["a"]}}`))
	if err != nil {
		t.Fatal(err)
	}
	def := DefaultLayer()
	if !c.Enabled || c.WindowSeconds != def.WindowSeconds || c.MinSamples != def.MinSamples || c.ExemptStatusCodes != def.ExemptStatusCodes ||
		c.MinWeightMode != def.MinWeightMode || c.MinWeight != def.MinWeight {
		t.Fatalf("global: %+v", c.Layer)
	}
	if len(c.Groups) != 1 || c.Groups[8].WindowSeconds != MinWindowSeconds || len(c.Accounts) != 1 || c.Accounts[4].Enabled == nil || c.Notify.Enabled {
		t.Fatalf("groups %v, accounts %v, notify %+v", c.Groups, c.Accounts, c.Notify)
	}
	// 4 global fields, 4 groups dropped and 1 raised, 1 account, notify.
	if len(warnings) != 11 {
		t.Fatalf("%d warnings: %q", len(warnings), warnings)
	}
	if _, err := c.Normalize(); err != nil {
		t.Fatal(err)
	}
	if _, _, err := LoadConfig([]byte(`{"window_seconds":"x"}`)); err == nil {
		t.Fatal("undecodable document loaded")
	}
}

func TestWhenJSON(t *testing.T) {
	var w When
	if err := json.Unmarshal([]byte(`{"any":["a",{"all":["b","c"]}]}`), &w); err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(w)
	if string(raw) != `{"any":["a",{"all":["b","c"]}]}` {
		t.Fatalf("%s", raw)
	}
	if json.Unmarshal([]byte(`{"all":["a"],"any":["b"]}`), &w) == nil || json.Unmarshal([]byte(`3`), &w) == nil {
		t.Fatal("bad when accepted")
	}
}

func TestStatusCodes(t *testing.T) {
	got, err := NormalizeStatusCodes(" 503, 500-502，400 ")
	if err != nil || got != "400,500-503" {
		t.Fatalf("%q %v", got, err)
	}
	if _, err := NormalizeStatusCodes("99"); err == nil {
		t.Fatal("99 accepted")
	}
	if codes := expandStatusCodes("598-700"); !reflect.DeepEqual(codes, []int{598, 599}) {
		t.Fatalf("%v", codes)
	}
}

func TestCountsFields(t *testing.T) {
	cfg := compiled(t, nil).Resolve(1, 1)
	var c Counts
	c.Record(Sample{Stream: true, TTFBMs: 70000, LatencyMs: 130000}, &cfg)
	c.Record(Sample{Fail: true, FailStatus: 429, TTFBMs: -1, LatencyMs: -1}, &cfg)
	back := CountsOf(c.Fields())
	if !reflect.DeepEqual(back.Fields(), c.Fields()) || back.Total != 2 || back.Stream.Thresholds[60000] != 1 || back.FailStatus[429] != 1 {
		t.Fatalf("%v", back.Fields())
	}
	if got := CountsOf(map[string]int64{"zz1": 1, "fs": 2, "tcx": 3, "s:total": 4}); got.Total != 0 || got.Stream.Total != 4 || len(got.Fields()) != 1 {
		t.Fatalf("unknown fields read: %v", got.Fields())
	}
}

func TestWindowPhase(t *testing.T) {
	for _, id := range []int64{1, 2, 77} {
		start := WindowStart(id, 1_000_000, 60)
		if start > 1_000_000 || 1_000_000-start >= 60 {
			t.Fatalf("account %d: %d", id, start)
		}
		if closed := LatestClosedWindow(id, start+60+CloseGraceSeconds, 60); closed != start {
			t.Fatalf("closed %d want %d", closed, start)
		}
	}
	if WindowStart(1, 1_000_000, 60) == WindowStart(2, 1_000_000, 60) {
		t.Fatal("neighbouring accounts share a phase")
	}
}

func TestDegradeAndRecover(t *testing.T) {
	s := newSim(t, compiled(t, nil), 100)
	// The error rate fires in 2 of 3 windows: 100 -> 70 -> 49.
	if out := s.step(5, 5, -1); out.WeightTo != 100 || out.Verdict != VerdictNeutral {
		t.Fatalf("first bad window: %+v", out)
	}
	out := s.step(5, 5, -1)
	if out.WeightTo != 70 || ChangeKind(out) != EventWeightDown || out.Verdict != VerdictBad {
		t.Fatalf("second bad window: %v %s", out.WeightTo, ChangeKind(out))
	}
	if ev := Events(&s.cfg, s.win, out); len(ev) != 1 || ev[0].Rules[0] != "错误率过高" {
		t.Fatalf("events %+v", ev)
	}
	s.step(5, 5, -1)
	if out := s.step(5, 5, -1); out.WeightTo != 49 {
		t.Fatalf("fourth bad window: %v", out.WeightTo)
	}
	// Healthy windows climb by 10% of the base; the first one is a turning
	// point. The default recovery rule needs TTFB samples (streams).
	out = s.step(20, 0, 1000)
	if out.WeightTo != 59 || ChangeKind(out) != EventWeightUpStart {
		t.Fatalf("first healthy window: %v %s", out.WeightTo, ChangeKind(out))
	}
	if out := s.step(20, 0, 1000); ChangeKind(out) != EventWeightUp {
		t.Fatalf("second healthy window: %s", ChangeKind(out))
	}
	for range 3 {
		out = s.step(20, 0, 1000)
	}
	if out.WeightTo != 99 {
		t.Fatalf("climb: %v", out.WeightTo)
	}
	if out = s.step(20, 0, 1000); out.WeightTo != 100 || ChangeKind(out) != EventWeightRestored {
		t.Fatalf("restored: %v %s", out.WeightTo, ChangeKind(out))
	}
}

func TestSamplesAccumulate(t *testing.T) {
	s := newSim(t, compiled(t, nil), 100)
	// 4 failures are under min_samples 10: the next window looks back over
	// both, and the rule fires on the 8 real samples (never padded).
	if out := s.step(0, 4, -1); out.State.LastRuleStats[0] != (RuleStat{N: 4, Lookback: 1}) || out.State.LastRules[0] != ruleHit {
		t.Fatalf("first: %+v %q", out.State.LastRuleStats, out.State.LastRules)
	}
	out := s.step(0, 4, -1)
	if out.State.LastRuleStats[0] != (RuleStat{N: 8, Lookback: 2}) || out.WeightTo != 70 {
		t.Fatalf("second: %+v %v", out.State.LastRuleStats, out.WeightTo)
	}
	// Quiet windows: the consumed samples never count again.
	for range 3 {
		if out = s.step(0, 0, -1); out.State.LastRules[0] != ruleNone {
			t.Fatalf("old samples hit again: %q", out.State.LastRules)
		}
	}
}

func TestHungFirstToken(t *testing.T) {
	s := newSim(t, compiled(t, nil), 100)
	if out := s.step(1, 0, 61000); out.WeightTo != 50 {
		t.Fatalf("hung: %v", out.WeightTo)
	}
}

func TestReviveFromZero(t *testing.T) {
	c := compiled(t, func(c *Config) {
		c.Strategies[2].Actions[0] = Action{Type: ActionWeightDegrade, Mode: ModeCurrentPercent, Value: 100}
	})
	s := newSim(t, c, 100)
	if out := s.step(1, 0, 61000); out.WeightTo != 0 {
		t.Fatalf("to zero: %v", out.WeightTo)
	}
	// Without traffic the revival rule fires after 2 windows at 0; the
	// healthy rule alone cannot leave 0.
	if out := s.step(0, 0, -1); out.WeightTo != 0 {
		t.Fatalf("first window at 0: %v", out.WeightTo)
	}
	out := s.step(0, 0, -1)
	if out.WeightTo != 10 || !out.Revived || ChangeKind(out) != EventWeightRevived {
		t.Fatalf("revived: %+v", out)
	}
}

func TestMissedWindowsPadWeightRules(t *testing.T) {
	c := compiled(t, func(c *Config) {
		c.Strategies[2].Actions[0] = Action{Type: ActionWeightDegrade, Mode: ModeCurrentPercent, Value: 100}
	})
	s := newSim(t, c, 100)
	s.step(1, 0, 61000)
	// Skip three windows: the weight rule held in all of them.
	s.win += 3 * 60
	s.obs = append(make([]Counts, 3), s.obs...)
	if out := s.step(0, 0, -1); out.WeightTo != 10 {
		t.Fatalf("after a gap: weight %v", out.WeightTo)
	}
}

func TestFloorAndCooldown(t *testing.T) {
	c := compiled(t, func(c *Config) {
		c.MinWeight = 60
		c.Strategies[0].CooldownSeconds = 180
	})
	s := newSim(t, c, 100)
	s.step(5, 5, -1)
	if out := s.step(5, 5, -1); out.WeightTo != 70 {
		t.Fatalf("degrade: %v", out.WeightTo)
	}
	s.step(5, 5, -1)
	if out := s.step(5, 5, -1); out.WeightTo != 70 {
		t.Fatalf("cooldown: %v", out.WeightTo)
	}
	s.step(5, 5, -1)
	if out := s.step(5, 5, -1); out.WeightTo != 60 {
		t.Fatalf("floor: %v", out.WeightTo)
	}
}

func TestResets(t *testing.T) {
	s := newSim(t, compiled(t, nil), 100)
	s.step(5, 5, -1)
	s.step(5, 5, -1)
	// The account's weight changed: the state is reset.
	out := Evaluate(Input{Base: 50, Window: s.win + 60, Cfg: s.cfg, State: s.state})
	if out.Action != ActionReset || Events(&s.cfg, s.win+60, out)[0].Reason != ReasonBaseMismatch {
		t.Fatalf("base mismatch: %+v", out)
	}
	// A tombstone skips its window and does not look back past it.
	tomb := Tombstone(s.win)
	s.state = &tomb
	out = s.step(5, 5, -1)
	if out.WeightTo != 100 || out.State.LastRuleStats[0].Lookback != 1 {
		t.Fatalf("after tombstone: %+v", out.State)
	}
	// New rules keep the weight and clear the history.
	s.step(5, 5, -1)
	other := compiled(t, func(c *Config) { c.MinSamples = 5 }).Resolve(1, 1)
	s.cfg = other
	out = s.step(5, 5, -1)
	if !out.SigReset || out.WeightFrom != 70 || Events(&other, s.win, out)[0].Reason != ReasonRulesChange {
		t.Fatalf("rules change: %+v", out)
	}
}

func TestAdjustOffPinsBase(t *testing.T) {
	s := newSim(t, compiled(t, nil), 100)
	s.step(5, 5, -1)
	s.step(5, 5, -1)
	off := false
	s.cfg = compiled(t, func(c *Config) { c.Accounts = map[int64]AccountOverride{1: {Enabled: &off}} }).Resolve(1, 1)
	out := s.step(5, 5, -1)
	if out.WeightTo != 100 || out.Adjust || ChangeKind(out) != "" || out.State.LastChange != "" {
		t.Fatalf("off: %+v", out)
	}
}

func TestAffinityClear(t *testing.T) {
	c := compiled(t, func(c *Config) {
		c.Strategies[2].Actions = append(c.Strategies[2].Actions, Action{Type: ActionAffinityClear, Percent: 50})
		c.Strategies[3].Actions = append(c.Strategies[3].Actions, Action{Type: ActionAffinityClear, Percent: 20})
	})
	s := newSim(t, c, 100)
	if out := s.step(1, 0, 61000); len(out.SideEffects) != 1 || out.SideEffects[0].AffinityPercent != 50 {
		t.Fatalf("degrade: %+v", out.SideEffects)
	}
	if out := s.step(20, 0, 1000); len(out.SideEffects) != 1 || out.SideEffects[0].AffinityPercent != 20 {
		t.Fatalf("climb: %+v", out.SideEffects)
	}
	for range 5 {
		s.step(20, 0, 1000)
	}
	// At the base the climb changes nothing and clears nothing.
	if out := s.step(20, 0, 1000); out.WeightTo != 100 || len(out.SideEffects) != 0 {
		t.Fatalf("at base: %v %+v", out.WeightTo, out.SideEffects)
	}
}

func TestResolveLayers(t *testing.T) {
	codes, none, mode, floor, off := "429", "", ModeFixed, 5, false
	c := compiled(t, func(c *Config) {
		g := DefaultLayer()
		g.Enabled, g.WindowSeconds = true, 30
		c.Groups = map[int64]*Layer{2: &g, 3: nil}
		c.Accounts = map[int64]AccountOverride{7: {ExemptStatusCodes: &codes, MinWeightMode: &mode, MinWeight: &floor}, 8: {Enabled: &off},
			9: {ExemptStatusCodes: &none}}
	})
	if r := c.Resolve(1, 2); r.WindowSeconds != 30 || !r.Enabled || c.GroupLayer(2).WindowSeconds != 30 {
		t.Fatalf("group: %+v", r.Layer)
	}
	global, narrowed := c.Resolve(1, 1), c.Resolve(7, 1)
	if c.GroupLayer(1).WindowSeconds != 60 || narrowed.RulesSig == global.RulesSig || !reflect.DeepEqual(narrowed.ExemptCodes, []int{429}) || narrowed.WeightFloor(100) != 5 {
		t.Fatalf("override: %+v", narrowed.Layer)
	}
	if c.Resolve(8, 1).Enabled {
		t.Fatal("account switch ignored")
	}
	// An empty override exempts nothing, unlike inheriting the layer's 400.
	if r := c.Resolve(9, 1); len(r.ExemptCodes) != 0 || !reflect.DeepEqual(global.ExemptCodes, []int{400}) {
		t.Fatalf("no exemptions: %v, inherited %v", r.ExemptCodes, global.ExemptCodes)
	}
	if c.RetentionSeconds() != 7*60 {
		t.Fatalf("retention %d", c.RetentionSeconds())
	}
}
