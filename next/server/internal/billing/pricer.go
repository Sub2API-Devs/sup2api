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
	// Plugin defaults only: the declaring plugin and when it was installed
	// (nil when the plugin row is gone).
	pluginKey   string
	installedAt *time.Time
}

type priceSnapshot struct {
	at      time.Time
	entries []priceEntry // sorted by match precedence
}

type resolved struct {
	at   time.Time
	rule *core.PriceRule // nil = no match
}

// less orders entries by precedence (ARCHITECTURE 7.3): admin prices before
// plugin defaults; among plugin defaults the earliest installed plugin first;
// within one source (admin, or one plugin) an exact model before globs and
// longer globs first.
func less(a, b priceEntry) bool {
	// Admin prices always win; within a source the most specific pattern
	// wins (exact before glob, longer glob first). Between plugin defaults
	// of equal specificity the earliest installed plugin wins.
	if (a.source == SourceAdmin) != (b.source == SourceAdmin) {
		return a.source == SourceAdmin
	}
	if a.glob != b.glob {
		return !a.glob
	}
	if len(a.rule.Pattern) != len(b.rule.Pattern) {
		return len(a.rule.Pattern) > len(b.rule.Pattern)
	}
	if a.source != SourceAdmin && a.pluginKey != b.pluginKey {
		switch {
		case a.installedAt == nil && b.installedAt != nil:
			return false
		case a.installedAt != nil && b.installedAt == nil:
			return true
		case a.installedAt != nil && !a.installedAt.Equal(*b.installedAt):
			return a.installedAt.Before(*b.installedAt)
		}
		return a.pluginKey < b.pluginKey
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
		SELECT mp.id, mp.model_pattern, mp.mode, mp.expression, mp.expr_version, mp.expr_hash, mp.source,
			COALESCE(mp.plugin_key, ''), p.installed_at
		FROM model_prices mp LEFT JOIN plugins p ON p.key = mp.plugin_key
		WHERE mp.enabled`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	snap = &priceSnapshot{at: time.Now()}
	for rows.Next() {
		var e priceEntry
		r := &e.rule
		if err := rows.Scan(&r.ID, &r.Pattern, &r.Mode, &r.Expression, &r.ExprVersion, &r.ExprHash, &e.source,
			&e.pluginKey, &e.installedAt); err != nil {
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

// match returns the best entry for model or nil.
func (snap *priceSnapshot) match(model string) *core.PriceRule {
	for i := range snap.entries {
		e := &snap.entries[i]
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

// Resolve implements core.Pricer. Prices are global per model: the platform
// and account type serving the request do not matter (ARCHITECTURE 7.3).
func (s *Service) Resolve(ctx context.Context, model string) (*core.PriceRule, error) {
	key := model
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
		rule = snap.match(model)
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
	return nil, core.ErrPriceNotConfigured.WithDetails(map[string]any{"model": model})
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

// factsFor returns the u() keys declared by any enabled plugin (platform
// usage rules and account type protocol overrides), since a price applies to
// a model whichever platform or account type serves it. It returns nil when
// they cannot be determined (no registry or generation).
func (s *Service) factsFor() map[string]bool {
	if s.registry == nil {
		return nil
	}
	gen := s.registry.Current()
	if gen == nil {
		return nil
	}
	return declaredFacts(gen)
}

func declaredFacts(gen core.Generation) map[string]bool {
	facts := map[string]bool{}
	for _, pl := range gen.Plugins() {
		if pl.Manifest != nil && pl.Manifest.Platform != nil {
			if b, ok := gen.Platform(pl.Manifest.Platform.ID); ok {
				for k := range b.Platform.Usage.Facts {
					facts[k] = true
				}
			}
		}
	}
	for _, b := range gen.AccountTypes() {
		for _, p := range b.Type.Protocols {
			if p.Usage != nil {
				for k := range p.Usage.Facts {
					facts[k] = true
				}
			}
		}
	}
	return facts
}
