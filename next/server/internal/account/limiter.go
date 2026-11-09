package account

import (
	"context"
	"encoding/json"

	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ratelimit"
)

// Limiter enforces the accounts' RPM, TPM and SPM, and those of their model
// lists (CONTRACTS §68, §71), in the shared windows of scope "account". With
// no Redis client, limiting is disabled.
type Limiter struct{ w *ratelimit.Minute }

var _ core.AccountLimiter = (*Limiter)(nil)

func NewLimiter(rdb redis.UniversalClient) *Limiter {
	return &Limiter{w: ratelimit.NewMinute(rdb, "account")}
}

// listSub names the counters of a model list within the account's.
func listSub(key string) string { return "m:" + key }

// modelSub names the uncapped counters of one client model within the
// account's: what the list's hover breaks the account's figures down by.
// List keys are base-36 hashes, so the prefixes never meet.
func modelSub(model string) string { return "md:" + model }

// limitsOf returns the sets of caps a request for model is checked against:
// the account's own, then the model list holding model, then the model's
// own counters, which have no caps and so never refuse.
func limitsOf(ref core.AccountRef, model string) []ratelimit.Limits {
	out := []ratelimit.Limits{{ID: ref.ID, RPM: ref.RPMLimit, TPM: ref.TPMLimit, SPM: ref.SPMLimit}}
	if l := ref.ModelLimitFor(model); l != nil {
		out = append(out, ratelimit.Limits{ID: ref.ID, Sub: listSub(l.Key()), RPM: l.RPMLimit, TPM: l.TPMLimit, SPM: l.SPMLimit})
	}
	if model != "" {
		out = append(out, ratelimit.Limits{ID: ref.ID, Sub: modelSub(model)})
	}
	return out
}

func (l *Limiter) Exhausted(ctx context.Context, refs []core.AccountRef, model, session string) (map[int64]bool, error) {
	limits := make([]ratelimit.Limits, 0, len(refs))
	for _, r := range refs {
		limits = append(limits, limitsOf(r, model)...)
	}
	return l.w.Reached(ctx, limits, session)
}

func (l *Limiter) TryHit(ctx context.Context, ref core.AccountRef, model, session string) (bool, error) {
	ok, _, err := l.w.AdmitAll(ctx, limitsOf(ref, model), session)
	return ok, err
}

func (l *Limiter) Reserve(ctx context.Context, ref core.AccountRef, model, session string, tokens int64) (core.RateHold, bool, error) {
	hold, ok, _, err := l.w.ReserveAll(ctx, limitsOf(ref, model), session, tokens)
	return hold, ok, err
}

func (l *Limiter) Settle(ctx context.Context, hold core.RateHold, actual int64) {
	l.w.Settle(ctx, hold, actual)
}

func (l *Limiter) ReleaseSession(ctx context.Context, ref core.AccountRef, model, session string) {
	l.w.ReleaseSession(ctx, limitsOf(ref, model), session)
}

func (l *Limiter) AddTokens(ctx context.Context, id int64, list string, n int64) {
	l.w.AddTokens(ctx, id, n)
	if list != "" {
		l.w.AddSubTokens(ctx, id, listSub(list), n)
	}
}

func (l *Limiter) Usage(ctx context.Context, refs []core.AccountRef) (map[int64]core.RateUsage, error) {
	var sets []ratelimit.Limits
	for _, r := range refs {
		sets = append(sets, ratelimit.Limits{ID: r.ID})
		for i := range r.ModelLimits {
			sets = append(sets, ratelimit.Limits{ID: r.ID, Sub: listSub(r.ModelLimits[i].Key())})
		}
	}
	used, err := l.w.UsageOf(ctx, sets)
	out := make(map[int64]core.RateUsage, len(refs))
	if used == nil {
		return out, err
	}
	i := 0
	for _, r := range refs {
		u := used[i]
		i++
		for _, ml := range r.ModelLimits {
			u.Models = append(u.Models, core.ModelRateUsage{Models: ml.Models, RPM: used[i].RPM, TPM: used[i].TPM, Sessions: used[i].Sessions})
			i++
		}
		out[r.ID] = u
	}
	return out, err
}

// ModelUsage returns the counters of the account and of each of models, in
// order after the account's.
func (l *Limiter) ModelUsage(ctx context.Context, id int64, models []string) ([]core.RateUsage, error) {
	sets := make([]ratelimit.Limits, 0, 1+len(models))
	sets = append(sets, ratelimit.Limits{ID: id})
	for _, m := range models {
		sets = append(sets, ratelimit.Limits{ID: id, Sub: modelSub(m)})
	}
	return l.w.UsageOf(ctx, sets)
}

func mappingJSON(m map[string]string) string {
	if m == nil {
		m = map[string]string{}
	}
	b, _ := json.Marshal(m)
	return string(b)
}
