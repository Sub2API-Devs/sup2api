package billing

import (
	"context"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Price sources: administrators type prices in (manual) or import them from
// a price sync source (sync). Plugins never provide prices.
const (
	SourceManual = "manual"
	SourceSync   = "sync"
)

type priceSnapshot struct {
	at      time.Time
	byModel map[string]core.PriceRule // one price per complete model id
}

type resolved struct {
	at   time.Time
	rule *core.PriceRule // nil = no match
}

func (s *Service) snapshot(ctx context.Context) (*priceSnapshot, error) {
	s.mu.Lock()
	snap := s.prices
	s.mu.Unlock()
	if snap != nil && time.Since(snap.at) < s.cacheTTL {
		return snap, nil
	}
	rows, err := s.db.Pool.Query(ctx, `
		SELECT id, model, mode, expression, expr_version, expr_hash FROM model_prices WHERE enabled`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	snap = &priceSnapshot{at: time.Now(), byModel: map[string]core.PriceRule{}}
	for rows.Next() {
		var r core.PriceRule
		if err := rows.Scan(&r.ID, &r.Model, &r.Mode, &r.Expression, &r.ExprVersion, &r.ExprHash); err != nil {
			return nil, err
		}
		snap.byModel[r.Model] = r
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	s.mu.Lock()
	s.prices = snap
	s.resolved = map[string]resolved{}
	s.mu.Unlock()
	return snap, nil
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
