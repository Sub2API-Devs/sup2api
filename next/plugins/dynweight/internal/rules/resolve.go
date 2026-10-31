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
	thresholds, latency := map[int]bool{}, map[int]bool{}
	for _, r := range l.Rules {
		if !r.IsEnabled() {
			continue
		}
		cfg.Rules = append(cfg.Rules, r)
		for _, c := range r.Conditions {
			if spec, _ := specOf(c.Metric); spec.percentile {
				bucket := thresholds
				if spec.latency {
					bucket = latency
				}
				bucket[int(c.Value)] = true
			}
		}
	}
	index := ruleIndex(cfg.Rules)
	var enabled []Strategy
	for _, s := range l.Strategies {
		if !s.IsEnabled() || s.When == nil {
			continue
		}
		tree, err := compileWhen(*s.When, cfg.Rules, index, true, 0)
		if err != nil {
			continue // Normalize rejects it; never reached for a saved config
		}
		cfg.Strategies = append(cfg.Strategies, ResolvedStrategy{Strategy: s, Tree: tree})
		enabled = append(enabled, s)
	}
	cfg.Thresholds = slices.Sorted(maps.Keys(thresholds))
	cfg.LatencyThresholds = slices.Sorted(maps.Keys(latency))
	rulesJSON, _ := json.Marshal(cfg.Rules)
	strategiesJSON, _ := json.Marshal(enabled)
	d.sigHead = strconv.Itoa(l.WindowSeconds) + "|" + strconv.Itoa(l.MinSamples) + "|"
	d.sigTail = "|" + string(rulesJSON) + "|" + string(strategiesJSON)
	return d.withExempt(l.ExemptStatusCodes)
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
