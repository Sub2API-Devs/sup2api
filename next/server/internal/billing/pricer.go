package billing

import (
	"context"
	"sort"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
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
	// Plugin defaults only: the declaring plugin and when it was installed
	// (nil when the plugin row is gone).
	pluginKey   string
	installedAt *time.Time
}

type priceSnapshot struct {
	at      time.Time
	byModel map[string]core.PriceRule // the winning entry per model id
}

type resolved struct {
	at   time.Time
	rule *core.PriceRule // nil = no match
}

// less orders entries of one model by precedence (ARCHITECTURE 7.3): the
// admin price first, then plugin defaults by install time (earliest first).
// Prices are keyed by complete model id; there are no wildcards.
func less(a, b priceEntry) bool {
	if (a.source == SourceAdmin) != (b.source == SourceAdmin) {
		return a.source == SourceAdmin
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

func (s *Service) snapshot(ctx context.Context) (*priceSnapshot, error) {
	s.mu.Lock()
	snap := s.prices
	s.mu.Unlock()
	if snap != nil && time.Since(snap.at) < s.cacheTTL {
		return snap, nil
	}
	rows, err := s.db.Pool.Query(ctx, `
		SELECT mp.id, mp.model, mp.mode, mp.expression, mp.expr_version, mp.expr_hash, mp.source,
			COALESCE(mp.plugin_key, ''), p.installed_at
		FROM model_prices mp LEFT JOIN plugins p ON p.key = mp.plugin_key
		WHERE mp.enabled`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var entries []priceEntry
	for rows.Next() {
		var e priceEntry
		r := &e.rule
		if err := rows.Scan(&r.ID, &r.Model, &r.Mode, &r.Expression, &r.ExprVersion, &r.ExprHash, &e.source,
			&e.pluginKey, &e.installedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	snap = newSnapshot(time.Now(), entries)
	s.mu.Lock()
	s.prices = snap
	s.resolved = map[string]resolved{}
	s.mu.Unlock()
	return snap, nil
}

// newSnapshot keeps the highest-precedence entry of every model id.
func newSnapshot(at time.Time, entries []priceEntry) *priceSnapshot {
	sort.Slice(entries, func(i, j int) bool { return less(entries[i], entries[j]) })
	snap := &priceSnapshot{at: at, byModel: map[string]core.PriceRule{}}
	for _, e := range entries {
		if _, ok := snap.byModel[e.rule.Model]; !ok {
			snap.byModel[e.rule.Model] = e.rule
		}
	}
	return snap
}

// match returns the price of the exact model id or nil.
func (snap *priceSnapshot) match(model string) *core.PriceRule {
	r, ok := snap.byModel[model]
	if !ok {
		return nil
	}
	return &r
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

// factsFor returns the u() keys declared anywhere in the generation: usage
// rules of every platform (built-in and plugin) and of their endpoints, and
// the per-platform usage overrides of account types, since a price applies to
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
	add := func(u *manifest.UsageRules) {
		if u == nil {
			return
		}
		for k := range u.Facts {
			facts[k] = true
		}
	}
	for _, b := range gen.Platforms() {
		add(&b.Platform.Usage)
		for _, e := range b.Platform.Endpoints {
			add(e.Usage)
		}
	}
	for _, b := range gen.AccountTypes() {
		for _, p := range b.Type.Platforms {
			for _, u := range p.Usage {
				add(&u)
			}
		}
	}
	return facts
}
