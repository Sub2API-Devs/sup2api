// Package ratelimit counts requests and tokens of a kind of subject (accounts,
// API keys) in minute windows shared by every node through Redis. A cap is
// checked against the last 60 seconds, estimated from the current and the
// previous minute window: the previous one counts with the share of it still
// inside the last 60 seconds (CONTRACTS §68.3). Windows are taken from Redis
// TIME so nodes with skewed clocks agree on them. Without a Redis client
// nothing is counted and everything is admitted.
package ratelimit

import (
	"context"
	"log/slog"
	"math"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/x"
)

const keyTTL = 2 * time.Minute

var _ core.RateWindows = (*Minute)(nil)

// Minute holds the windows of one scope ("account", "apikey").
type Minute struct {
	rdb   redis.UniversalClient
	scope string
	// Now replaces Redis TIME in tests.
	Now func() time.Time
}

// Limits are a subject's per-minute caps; 0 = unlimited. Sub names a
// separate set of counters of the subject ("" = its own; accounts use one per
// model list).
type Limits struct {
	ID  int64
	Sub string
	RPM int
	TPM int64
}

func NewMinute(rdb redis.UniversalClient, scope string) *Minute {
	return &Minute{rdb: rdb, scope: scope}
}

// Key is the Redis key of the kind ("rpm" | "tpm") window holding at.
func Key(scope string, id int64, kind string, at time.Time) string {
	return SubKey(scope, id, "", kind, at)
}

// SubKey is Key for the counters sub of the subject.
func SubKey(scope string, id int64, sub, kind string, at time.Time) string {
	if sub != "" {
		kind = sub + ":" + kind
	}
	return "rl:" + scope + ":" + x.Itoa64(id) + ":" + kind + ":" + strconv.FormatInt(at.Unix()/60, 10)
}

func (m *Minute) now(ctx context.Context) (time.Time, error) {
	if m.Now != nil {
		return m.Now(), nil
	}
	return m.rdb.Time(ctx).Result()
}

// previousShare is the part of the previous minute window still inside the
// last 60 seconds at now.
func previousShare(now time.Time) float64 {
	into := now.UnixMilli() % 60000
	return float64(60000-into) / 60000
}

// windowKeys returns the current and previous window keys of kind.
func (m *Minute) windowKeys(id int64, sub, kind string, now time.Time) (cur, prev string) {
	return SubKey(m.scope, id, sub, kind, now), SubKey(m.scope, id, sub, kind, now.Add(-time.Minute))
}

// admit checks every set of caps and counts one request in each of them when
// all are under their caps. KEYS: per set its rpm current, rpm previous, tpm
// current, tpm previous window. ARGV: share of the previous window, ttl ms,
// then per set rpm and tpm. A refusal returns {0, current, previous, cap}.
var admit = redis.NewScript(`
local share=tonumber(ARGV[1])
local function used(cur, prev)
  return tonumber(redis.call('GET',cur) or '0')+share*tonumber(redis.call('GET',prev) or '0')
end
local n=#KEYS/4
for i=0,n-1 do
  local rpm=tonumber(ARGV[3+2*i])
  local tpm=tonumber(ARGV[4+2*i])
  if rpm>0 and used(KEYS[4*i+1],KEYS[4*i+2])>=rpm then
    return {0, tonumber(redis.call('GET',KEYS[4*i+1]) or '0'), tonumber(redis.call('GET',KEYS[4*i+2]) or '0'), rpm}
  end
  if tpm>0 and used(KEYS[4*i+3],KEYS[4*i+4])>=tpm then
    return {0, tonumber(redis.call('GET',KEYS[4*i+3]) or '0'), tonumber(redis.call('GET',KEYS[4*i+4]) or '0'), tpm}
  end
end
for i=0,n-1 do
  redis.call('INCR',KEYS[4*i+1])
  redis.call('PEXPIRE',KEYS[4*i+1],ARGV[2])
end
return {1}`)

// Admit atomically checks the last 60 seconds of id against rpm and tpm
// (0 = unlimited) and counts one request when it is under both. RPM is exact;
// tokens are counted when responses finish (AddTokens), so a burst can pass
// TPM. A refused request gets the time until it would be admitted.
func (m *Minute) Admit(ctx context.Context, id int64, rpm int, tpm int64) (ok bool, retry time.Duration, err error) {
	return m.AdmitAll(ctx, []Limits{{ID: id, RPM: rpm, TPM: tpm}})
}

// AdmitAll is Admit for several sets of caps at once: one request is counted
// in every set, or in none when one of them is at its cap.
func (m *Minute) AdmitAll(ctx context.Context, sets []Limits) (ok bool, retry time.Duration, err error) {
	if m.rdb == nil || len(sets) == 0 {
		return true, 0, nil
	}
	now, err := m.now(ctx)
	if err != nil {
		return false, 0, err
	}
	keys := make([]string, 0, 4*len(sets))
	args := make([]any, 0, 2+2*len(sets))
	args = append(args, previousShare(now), keyTTL.Milliseconds())
	for _, l := range sets {
		rc, rp := m.windowKeys(l.ID, l.Sub, "rpm", now)
		tc, tp := m.windowKeys(l.ID, l.Sub, "tpm", now)
		keys = append(keys, rc, rp, tc, tp)
		args = append(args, l.RPM, l.TPM)
	}
	res, err := admit.Run(ctx, m.rdb, keys, args...).Int64Slice()
	if err != nil {
		return false, 0, err
	}
	if len(res) > 0 && res[0] == 1 {
		return true, 0, nil
	}
	if len(res) < 4 {
		return false, time.Until(now.Truncate(time.Minute).Add(time.Minute)), nil
	}
	return false, retryAfter(now, res[1], res[2], res[3]), nil
}

// retryAfter is how long until cur + share*prev falls under limit, assuming
// nothing else is counted meanwhile.
func retryAfter(now time.Time, cur, prev, limit int64) time.Duration {
	into := time.Duration(now.UnixMilli()%60000) * time.Millisecond
	wait := time.Duration(0)
	if cur >= limit {
		// Only the next minute window can help: cur becomes the previous one.
		wait, into, prev, cur = time.Minute-into, 0, cur, 0
	}
	if prev > 0 {
		// share(t) = 1 - t/60s must fall under (limit-cur)/prev.
		need := time.Duration((1 - float64(limit-cur)/float64(prev)) * float64(time.Minute))
		if need > into {
			wait += need - into
		}
	}
	return max(wait.Round(time.Second), time.Second)
}

// AddTokens adds the tokens of a finished response to the current window.
func (m *Minute) AddTokens(ctx context.Context, id, n int64) { m.AddSubTokens(ctx, id, "", n) }

// AddSubTokens adds tokens to the counters sub of id.
func (m *Minute) AddSubTokens(ctx context.Context, id int64, sub string, n int64) {
	if n <= 0 || m.rdb == nil {
		return
	}
	now, err := m.now(ctx)
	if err != nil {
		slog.WarnContext(ctx, "ratelimit: read shared time", "scope", m.scope, "id", id, "err", err)
		return
	}
	k := SubKey(m.scope, id, sub, "tpm", now)
	pipe := m.rdb.Pipeline()
	pipe.IncrBy(ctx, k, n)
	pipe.Expire(ctx, k, keyTTL)
	if _, err = pipe.Exec(ctx); err != nil {
		slog.WarnContext(ctx, "ratelimit: count tokens", "scope", m.scope, "id", id, "sub", sub, "err", err)
	}
}

// Usage returns the last-60-seconds counters of ids.
func (m *Minute) Usage(ctx context.Context, ids []int64) (map[int64]core.RateUsage, error) {
	sets := make([]Limits, len(ids))
	for i, id := range ids {
		sets[i] = Limits{ID: id}
	}
	used, err := m.UsageOf(ctx, sets)
	out := make(map[int64]core.RateUsage, len(ids))
	for i, id := range ids {
		if used != nil {
			out[id] = used[i]
		}
	}
	return out, err
}

// UsageOf returns the last-60-seconds counters of each set (caps ignored),
// in order; nil when they cannot be read.
func (m *Minute) UsageOf(ctx context.Context, sets []Limits) ([]core.RateUsage, error) {
	if m.rdb == nil || len(sets) == 0 {
		return make([]core.RateUsage, len(sets)), nil
	}
	vals, share, err := m.read(ctx, sets)
	if err != nil {
		return nil, err
	}
	out := make([]core.RateUsage, len(sets))
	for i := range sets {
		out[i] = core.RateUsage{RPM: estimate(vals[4*i:], share), TPM: estimate(vals[4*i+2:], share)}
	}
	return out, nil
}

// Reached returns the ids of which a set reached one of its caps. Sets
// without caps are never read.
func (m *Minute) Reached(ctx context.Context, limits []Limits) (map[int64]bool, error) {
	out := map[int64]bool{}
	var capped []Limits
	for _, l := range limits {
		if l.RPM > 0 || l.TPM > 0 {
			capped = append(capped, l)
		}
	}
	if m.rdb == nil || len(capped) == 0 {
		return out, nil
	}
	vals, share, err := m.read(ctx, capped)
	if err != nil {
		return out, err
	}
	for i, l := range capped {
		if (l.RPM > 0 && used(vals[4*i:], share) >= float64(l.RPM)) || (l.TPM > 0 && used(vals[4*i+2:], share) >= float64(l.TPM)) {
			out[l.ID] = true
		}
	}
	return out, nil
}

// read MGETs, for each set, the rpm current, rpm previous, tpm current and
// tpm previous windows.
func (m *Minute) read(ctx context.Context, sets []Limits) ([]any, float64, error) {
	now, err := m.now(ctx)
	if err != nil {
		return nil, 0, err
	}
	keys := make([]string, 0, len(sets)*4)
	for _, l := range sets {
		rc, rp := m.windowKeys(l.ID, l.Sub, "rpm", now)
		tc, tp := m.windowKeys(l.ID, l.Sub, "tpm", now)
		keys = append(keys, rc, rp, tc, tp)
	}
	vals, err := m.rdb.MGet(ctx, keys...).Result()
	return vals, previousShare(now), err
}

// used is the last-60-seconds estimate of a (current, previous) pair.
func used(pair []any, share float64) float64 {
	return float64(toInt64(pair[0])) + share*float64(toInt64(pair[1]))
}

func estimate(pair []any, share float64) int64 { return int64(math.Round(used(pair, share))) }

func toInt64(v any) int64 {
	s, ok := v.(string)
	if !ok {
		return 0
	}
	n, _ := strconv.ParseInt(s, 10, 64)
	return n
}
