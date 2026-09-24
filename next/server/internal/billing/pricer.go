package billing

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Price sources.
const (
	SourceAdmin         = "admin"
	SourcePluginDefault = "plugin_default"
)

type priceEntry struct {
	rule   core.PriceRule
	source string
	glob   bool
}

type priceSnapshot struct {
	at      time.Time
	entries []priceEntry // sorted by match precedence
}

type resolved struct {
	at   time.Time
	rule *core.PriceRule // nil = no match
}

// rank orders entries by precedence: admin before plugin_default, a concrete
// platform before "*", an exact model before globs, longer globs first.
func less(a, b priceEntry) bool {
	if (a.source == SourceAdmin) != (b.source == SourceAdmin) {
		return a.source == SourceAdmin
	}
	if (a.rule.Platform == "*") != (b.rule.Platform == "*") {
		return a.rule.Platform != "*"
	}
	if a.glob != b.glob {
		return !a.glob
	}
	if len(a.rule.Pattern) != len(b.rule.Pattern) {
		return len(a.rule.Pattern) > len(b.rule.Pattern)
	}
	return a.rule.ID < b.rule.ID
}

func isGlob(pattern string) bool { return strings.ContainsAny(pattern, "*?") }

// globMatch matches '*' (any run, including '/') and '?' (one byte).
func globMatch(pattern, s string) bool {
	p, i := 0, 0
	star, mark := -1, 0
	for i < len(s) {
		switch {
		case p < len(pattern) && (pattern[p] == '?' || pattern[p] == s[i]):
			p++
			i++
		case p < len(pattern) && pattern[p] == '*':
			star, mark = p, i
			p++
		case star >= 0:
			p = star + 1
			mark++
			i = mark
		default:
			return false
		}
	}
	for p < len(pattern) && pattern[p] == '*' {
		p++
	}
	return p == len(pattern)
}

func (s *Service) snapshot(ctx context.Context) (*priceSnapshot, error) {
	s.mu.Lock()
	snap := s.prices
	s.mu.Unlock()
	if snap != nil && time.Since(snap.at) < s.cacheTTL {
		return snap, nil
	}
	rows, err := s.db.Pool.Query(ctx, `
		SELECT id, platform, model_pattern, mode, expression, expr_version, expr_hash, source
		FROM model_prices WHERE enabled`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	snap = &priceSnapshot{at: time.Now()}
	for rows.Next() {
		var e priceEntry
		r := &e.rule
		if err := rows.Scan(&r.ID, &r.Platform, &r.Pattern, &r.Mode, &r.Expression, &r.ExprVersion, &r.ExprHash, &e.source); err != nil {
			return nil, err
		}
		e.glob = isGlob(r.Pattern)
		snap.entries = append(snap.entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	sort.Slice(snap.entries, func(i, j int) bool { return less(snap.entries[i], snap.entries[j]) })
	s.mu.Lock()
	s.prices = snap
	s.resolved = map[string]resolved{}
	s.mu.Unlock()
	return snap, nil
}

// match returns the best entry for platform/model or nil.
func (snap *priceSnapshot) match(platform, model string) *core.PriceRule {
	for i := range snap.entries {
		e := &snap.entries[i]
		if e.rule.Platform != "*" && e.rule.Platform != platform {
			continue
		}
		if e.glob {
			if !globMatch(e.rule.Pattern, model) {
				continue
			}
		} else if e.rule.Pattern != model {
			continue
		}
		r := e.rule
		return &r
	}
	return nil
}

// Resolve implements core.Pricer.
func (s *Service) Resolve(ctx context.Context, platform, model string) (*core.PriceRule, error) {
	key := platform + "\x00" + model
	s.mu.Lock()
	hit, ok := s.resolved[key]
	s.mu.Unlock()
	var rule *core.PriceRule
	if ok && time.Since(hit.at) < s.cacheTTL {
		rule = hit.rule
	} else {
		snap, err := s.snapshot(ctx)
		if err != nil {
			return nil, err
		}
		rule = snap.match(platform, model)
		s.mu.Lock()
		if s.prices == snap {
			s.resolved[key] = resolved{at: snap.at, rule: rule}
		}
		s.mu.Unlock()
	}
	if rule != nil {
		r := *rule
		return &r, nil
	}
	st, err := s.Settings(ctx)
	if err != nil {
		return nil, err
	}
	if st.MissingPricePolicy == PolicyFree {
		return nil, nil
	}
	return nil, core.ErrPriceNotConfigured.WithDetails(map[string]any{"platform": platform, "model": model})
}

// Inputs implements core.Pricer: the body paths and header names the
// expression reads, to be captured by the gateway at request time.
func (s *Service) Inputs(rule *core.PriceRule) (bodyPaths []string, headerNames []string) {
	if rule == nil {
		return nil, nil
	}
	p, err := expr.CompileCached(rule.Expression)
	if err != nil {
		return nil, nil
	}
	return p.Params(), p.Headers()
}

// factsFor returns the u() keys declared by the platform plugin(s), or nil
// when they cannot be determined (no registry, platform not active).
func (s *Service) factsFor(platform string) map[string]bool {
	if s.registry == nil {
		return nil
	}
	gen := s.registry.Current()
	if gen == nil {
		return nil
	}
	facts := map[string]bool{}
	add := func(b core.PlatformBinding) {
		for k := range b.Platform.Usage.Facts {
			facts[k] = true
		}
	}
	if platform == "*" || platform == "" {
		for _, pl := range gen.Plugins() {
			if pl.Manifest != nil && pl.Manifest.Platform != nil {
				if b, ok := gen.Platform(pl.Manifest.Platform.ID); ok {
					add(b)
				}
			}
		}
		return facts
	}
	b, ok := gen.Platform(platform)
	if !ok {
		return nil
	}
	add(b)
	return facts
}
