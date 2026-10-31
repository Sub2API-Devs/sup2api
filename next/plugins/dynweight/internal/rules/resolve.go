package rules

import (
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"maps"
	"slices"
	"strconv"
)

// ResolvedStrategy is an enabled strategy with its When compiled against
// the enabled rules.
type ResolvedStrategy struct {
	Strategy
	Tree WhenNode
}

// Resolved is the effective configuration of an (account, group): the
// group's layer or else the global one, narrowed by the account override.
// Every model of the pair shares it. Its slices are shared: never modify them.
type Resolved struct {
	// Layer is the effective layer. Enabled is whether to adjust: global,
	// layer and account switches all on. The exempt codes and the floor
	// include the account override.
	Layer
	Rules      []Rule             // enabled rules only; the index is the rule's slot in State
	Strategies []ResolvedStrategy // enabled strategies only; the index is the cooldown slot
	// StrictRules marks the rules judged only on enough samples: with
	// min_samples_strict, those an enabled strategy that does not climb
	// references (indexed like Rules; nil = none).
	StrictRules []bool
	// Thresholds / LatencyThresholds are the percentile thresholds of the
	// enabled rules (sorted, unique): what observations count per bucket.
	Thresholds        []int
	LatencyThresholds []int
	ExemptCodes       []int
	// RulesSig digests the window, the sample floor, the exempt codes and
	// the enabled rules and strategies; a change clears the rule history.
	// The weight floor is not part of it.
	RulesSig string
}

// RetentionPeriods is how many windows observations are kept and looked
// back over: max(largest N, 5) + 2.
func (r *Resolved) RetentionPeriods() int {
	n := minRetainPeriod
	for _, rule := range r.Rules {
		n = max(n, rule.Periods)
	}
	return n + 2
}

func (r *Resolved) retentionSeconds() int64 {
	return int64(r.RetentionPeriods() * r.WindowSeconds)
}

// derived is a resolved layer without an account override, with the parts
// of its signature that an exempt code override does not change.
type derived struct {
	cfg              Resolved
	sigHead, sigTail string
}

func derive(l Layer) derived {
	d := derived{cfg: Resolved{Layer: l}}
	cfg := &d.cfg
	for _, r := range l.Rules {
		if r.IsEnabled() {
			cfg.Rules = append(cfg.Rules, r)
		}
	}
	cfg.Thresholds, cfg.LatencyThresholds = percentileThresholds(cfg.Rules)
	var enabled []Strategy
	cfg.Strategies, enabled = resolveStrategies(l.Strategies, cfg.Rules)
	if l.MinSamplesStrict {
		cfg.StrictRules = strictRules(cfg.Rules, cfg.Strategies)
	}
	rulesJSON, _ := json.Marshal(cfg.Rules)
	strategiesJSON, _ := json.Marshal(enabled)
	d.sigHead = strconv.Itoa(l.WindowSeconds) + "|" + strconv.Itoa(l.MinSamples) + "|"
	// Strict is the default since 0.3.0: only the lenient mode marks the
	// signature, so the states of 0.2.0 keep theirs.
	if !l.MinSamplesStrict {
		d.sigHead += "lenient|"
	}
	d.sigTail = "|" + string(rulesJSON) + "|" + string(strategiesJSON)
	return d.withExempt(l.ExemptStatusCodes)
}

// strictRules marks the rules an enabled strategy that does not climb
// references: they degrade (or clear sessions) on the evidence, so too few
// samples must not do it. Climb-only rules stay lenient: a degraded key gets
// less traffic, and would otherwise never gather enough to recover.
func strictRules(rules []Rule, strategies []ResolvedStrategy) []bool {
	strict := make([]bool, len(rules))
	for _, s := range strategies {
		if s.Direction() == Climb {
			continue
		}
		// With every leaf true Eval visits all of them.
		s.Tree.Eval(func(idx int) (bool, bool) {
			strict[idx] = true
			return true, false
		})
	}
	return strict
}

// percentileThresholds lists the thresholds of the TTFB and of the latency
// percentile conditions of rules, sorted and unique.
func percentileThresholds(rules []Rule) (ttfb, latency []int) {
	ttfbSet, latencySet := map[int]bool{}, map[int]bool{}
	for _, r := range rules {
		for _, c := range r.Conditions {
			switch spec, _ := specOf(c.Metric); {
			case spec.percentile && spec.latency:
				latencySet[int(c.Value)] = true
			case spec.percentile:
				ttfbSet[int(c.Value)] = true
			}
		}
	}
	return slices.Sorted(maps.Keys(ttfbSet)), slices.Sorted(maps.Keys(latencySet))
}

// resolveStrategies compiles the enabled strategies against the enabled
// rules; enabled lists them as configured, for the signature.
func resolveStrategies(strategies []Strategy, rules []Rule) (resolved []ResolvedStrategy, enabled []Strategy) {
	index := ruleIndex(rules)
	for _, s := range strategies {
		if !s.IsEnabled() || s.When == nil {
			continue
		}
		tree, err := compileWhen(*s.When, rules, index, true, 0)
		if err != nil {
			continue // Normalize rejects it; never reached for a saved config
		}
		resolved = append(resolved, ResolvedStrategy{Strategy: s, Tree: tree})
		enabled = append(enabled, s)
	}
	return resolved, enabled
}

// withExempt recomputes the exempt codes and the signature.
func (d derived) withExempt(codes string) derived {
	d.cfg.ExemptStatusCodes = codes
	d.cfg.ExemptCodes = expandStatusCodes(codes)
	codesJSON, _ := json.Marshal(d.cfg.ExemptCodes)
	sum := sha1.Sum([]byte(d.sigHead + string(codesJSON) + d.sigTail))
	d.cfg.RulesSig = hex.EncodeToString(sum[:])
	return d
}

// Compiled is a normalized Config with every layer derived once.
type Compiled struct {
	Config
	global derived
	groups map[int64]*derived
}

// Compile derives the layers of a normalized configuration.
func Compile(c Config) *Compiled {
	out := &Compiled{Config: c, global: derive(c.Layer), groups: make(map[int64]*derived, len(c.Groups))}
	for id, l := range c.Groups {
		d := derive(*l)
		out.groups[id] = &d
	}
	return out
}

// GroupLayer is the layer of a group as derived, without the global switch
// or any account override: enough for what an account does not change, the
// window and the thresholds counted. It is cheap, for the gateway path.
func (c *Compiled) GroupLayer(groupID int64) *Resolved {
	return &c.derivedOf(groupID).cfg
}

func (c *Compiled) derivedOf(groupID int64) *derived {
	if d, ok := c.groups[groupID]; ok {
		return d
	}
	return &c.global
}

// Resolve is the effective configuration of an (account, group).
func (c *Compiled) Resolve(accountID, groupID int64) Resolved {
	d := *c.derivedOf(groupID)
	o, overridden := c.Accounts[accountID]
	if overridden && o.ExemptStatusCodes != nil {
		d = d.withExempt(*o.ExemptStatusCodes)
	}
	cfg := d.cfg
	cfg.Enabled = c.Enabled && cfg.Enabled && (!overridden || o.Enabled == nil || *o.Enabled)
	if overridden && o.MinWeightMode != nil {
		cfg.MinWeightMode, cfg.MinWeight = *o.MinWeightMode, *o.MinWeight
	}
	return cfg
}

// RetentionSeconds is the longest any layer keeps observations.
func (c *Compiled) RetentionSeconds() int64 {
	n := c.global.cfg.retentionSeconds()
	for _, d := range c.groups {
		n = max(n, d.cfg.retentionSeconds())
	}
	return n
}
