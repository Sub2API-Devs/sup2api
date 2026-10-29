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

// limitsOf returns the sets of caps a request for model is checked against:
// the account's own, then the model list holding model.
func limitsOf(ref core.AccountRef, model string) []ratelimit.Limits {
	out := []ratelimit.Limits{{ID: ref.ID, RPM: ref.RPMLimit, TPM: ref.TPMLimit, SPM: ref.SPMLimit}}
	if l := ref.ModelLimitFor(model); l != nil {
		out = append(out, ratelimit.Limits{ID: ref.ID, Sub: listSub(l.Key()), RPM: l.RPMLimit, TPM: l.TPMLimit, SPM: l.SPMLimit})
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

func mappingJSON(m map[string]string) string {
	if m == nil {
		m = map[string]string{}
	}
	b, _ := json.Marshal(m)
	return string(b)
}
