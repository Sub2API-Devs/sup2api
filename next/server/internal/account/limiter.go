package account

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ratelimit"
)

// Limiter enforces the accounts' RPM, TPM and SPM, and those of their model
// lists (CONTRACTS §68, §71), in the shared windows of scope "account". With
// no Redis client, limiting is disabled. It also counts each client model
// apart, uncapped, with its tokens today (CONTRACTS §68.7).
type Limiter struct {
	w      *ratelimit.Minute
	tokens modelTokens
}

var _ core.AccountLimiter = (*Limiter)(nil)

func NewLimiter(rdb redis.UniversalClient) *Limiter {
	return &Limiter{w: ratelimit.NewMinute(rdb, "account"), tokens: modelTokens{rdb: rdb}}
}

// listSub names the counters of a model list within the account's.
func listSub(key string) string { return "m:" + key }

// modelSub names the uncapped counters of one client model within the
// account's: what the list's hover breaks the account's figures down by, and
// what the traffic balance by model compares (CONTRACTS §89).
// List keys are base-36 hashes, so the prefixes never meet.
func modelSub(model string) string { return "md:" + model }

// ownSet are the account's own counters and caps.
func ownSet(ref core.AccountRef) ratelimit.Limits {
	return ratelimit.Limits{ID: ref.ID, RPM: ref.RPMLimit, TPM: ref.TPMLimit, SPM: ref.SPMLimit, SPMWindow: ref.SPMWindowSeconds}
}

// listSet are the counters and caps of a model list of the account.
func listSet(ref core.AccountRef, l *core.ModelLimit) ratelimit.Limits {
	return ratelimit.Limits{ID: ref.ID, Sub: listSub(l.Key()), RPM: l.RPMLimit, TPM: l.TPMLimit, SPM: l.SPMLimit, SPMWindow: l.SPMWindowSeconds}
}

// modelSet are the uncapped counters of a client model on the account,
// whose sessions follow the account's window.
func modelSet(ref core.AccountRef, model string) ratelimit.Limits {
	return ratelimit.Limits{ID: ref.ID, Sub: modelSub(model), SPMWindow: ref.SPMWindowSeconds}
}

// limitsOf returns the sets of caps a request for model is checked against:
// the account's own, then the model list holding model, then the model's
// own counters, which have no caps and so never refuse.
func limitsOf(ref core.AccountRef, model string) []ratelimit.Limits {
	out := []ratelimit.Limits{ownSet(ref)}
	if l := ref.ModelLimitFor(model); l != nil {
		out = append(out, listSet(ref, l))
	}
	if model != "" {
		out = append(out, modelSet(ref, model))
	}
	return out
}

// sessionOf is the limiter's view of a request's session: one that is the
// request alone is counted once and never remembered (CONTRACTS §71.2).
func sessionOf(session string) ratelimit.Session {
	return ratelimit.Session{Key: session, Once: core.IsRequestSession(session)}
}

func (l *Limiter) Exhausted(ctx context.Context, refs []core.AccountRef, model, session string) (map[int64]bool, error) {
	limits := make([]ratelimit.Limits, 0, len(refs))
	for _, r := range refs {
		limits = append(limits, limitsOf(r, model)...)
	}
	return l.w.Reached(ctx, limits, sessionOf(session))
}

func (l *Limiter) TryHit(ctx context.Context, ref core.AccountRef, model, session string) (bool, error) {
	ok, _, err := l.w.AdmitAll(ctx, limitsOf(ref, model), sessionOf(session))
	return ok, err
}

func (l *Limiter) Reserve(ctx context.Context, ref core.AccountRef, model, session string, tokens int64) (core.RateHold, bool, error) {
	hold, ok, _, err := l.w.ReserveAll(ctx, limitsOf(ref, model), sessionOf(session), tokens)
	return hold, ok, err
}

func (l *Limiter) Settle(ctx context.Context, hold core.RateHold, actual int64) {
	l.w.Settle(ctx, hold, actual)
}

func (l *Limiter) ReleaseSession(ctx context.Context, ref core.AccountRef, model, session string, at time.Time) {
	l.w.ReleaseSession(ctx, limitsOf(ref, model), sessionOf(session), at)
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
		sets = append(sets, ownSet(r))
		for i := range r.ModelLimits {
			sets = append(sets, listSet(r, &r.ModelLimits[i]))
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

func (l *Limiter) ModelUsage(ctx context.Context, refs []core.AccountRef, model string) (map[int64]core.RateUsage, error) {
	out := make(map[int64]core.RateUsage, len(refs))
	if model == "" {
		return out, nil
	}
	sets := make([]ratelimit.Limits, len(refs))
	for i, r := range refs {
		sets[i] = modelSet(r, model)
	}
	used, err := l.w.UsageOf(ctx, sets)
	if err != nil {
		return out, err
	}
	for i, r := range refs {
		out[r.ID] = used[i]
	}
	return out, nil
}

func (l *Limiter) CountModelTokens(ctx context.Context, id int64, model string, n int64) {
	l.tokens.add(ctx, id, model, n, l.now())
}

func (l *Limiter) ModelRates(ctx context.Context, ref core.AccountRef, midnight time.Time) ([]core.ModelRates, error) {
	models, tpd, err := l.tokens.today(ctx, ref.ID, midnight, l.now())
	if err != nil {
		return nil, err
	}
	sets := []ratelimit.Limits{ownSet(ref)}
	out := []core.ModelRates{{TPD: tpd}}
	for _, m := range models {
		sets = append(sets, modelSet(ref, m.model))
		out = append(out, core.ModelRates{Model: m.model, TPD: m.tokens})
	}
	used, err := l.w.UsageOf(ctx, sets)
	if err != nil {
		return nil, err
	}
	for i, u := range used {
		out[i].RPM, out[i].TPM, out[i].Sessions = u.RPM, u.TPM, u.Sessions
	}
	return out, nil
}

// now is the windows' test clock, else the local one: the hourly token
// hashes need no shared clock to the second.
func (l *Limiter) now() time.Time {
	if l.w.Now != nil {
		return l.w.Now()
	}
	return time.Now()
}

func mappingJSON(m map[string]string) string {
	if m == nil {
		m = map[string]string{}
	}
	b, _ := json.Marshal(m)
	return string(b)
}
