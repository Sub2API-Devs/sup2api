package account

import (
	"context"
	"encoding/json"

	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ratelimit"
)

// Limiter enforces the accounts' RPM and TPM in the shared minute windows of
// scope "account". With no Redis client, limiting is disabled.
type Limiter struct{ w *ratelimit.Minute }

var _ core.AccountLimiter = (*Limiter)(nil)

func NewLimiter(rdb redis.UniversalClient) *Limiter {
	return &Limiter{w: ratelimit.NewMinute(rdb, "account")}
}

func limitsOf(ref core.AccountRef) ratelimit.Limits {
	return ratelimit.Limits{ID: ref.ID, RPM: ref.RPMLimit, TPM: ref.TPMLimit}
}

func (l *Limiter) Exhausted(ctx context.Context, refs []core.AccountRef, _ string) (map[int64]bool, error) {
	limits := make([]ratelimit.Limits, len(refs))
	for i, r := range refs {
		limits[i] = limitsOf(r)
	}
	return l.w.Reached(ctx, limits)
}

func (l *Limiter) Hit(ctx context.Context, id int64, _ string) { l.w.Count(ctx, id) }

func (l *Limiter) TryHit(ctx context.Context, ref core.AccountRef, _ string) (bool, error) {
	ok, _, err := l.w.Admit(ctx, ref.ID, ref.RPMLimit, ref.TPMLimit)
	return ok, err
}

func (l *Limiter) AddTokens(ctx context.Context, id, n int64) { l.w.AddTokens(ctx, id, n) }

func (l *Limiter) Usage(ctx context.Context, ids []int64) (map[int64]core.RateUsage, error) {
	return l.w.Usage(ctx, ids)
}

func mappingJSON(m map[string]string) string {
	if m == nil {
		m = map[string]string{}
	}
	b, _ := json.Marshal(m)
	return string(b)
}
