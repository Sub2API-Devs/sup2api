// Package ratelimit counts requests and tokens of a kind of subject (accounts,
// API keys) in minute windows shared by every node through Redis. A cap is
// checked against the last 60 seconds, estimated from the current and the
// previous minute window: the previous one counts with the share of it still
// inside the last 60 seconds (CONTRACTS §68.3). Sessions are counted exactly
// over the last 60 seconds (CONTRACTS §71). Windows are taken from Redis
// TIME so nodes with skewed clocks agree on them. Without a Redis client
// nothing is counted and everything is admitted.
package ratelimit

import (
	"context"
	"errors"
	"log/slog"
	"math"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/x"
)

const (
	keyTTL = 2 * time.Minute
	// sessionWindow is the window of the sessions-per-minute caps.
	sessionWindow = time.Minute
)

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
// model list). SPM caps the distinct sessions of the last 60 seconds.
type Limits struct {
	ID  int64
	Sub string
	RPM int
	TPM int64
	SPM int
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

// SessionKey is the Redis key of the sessions of the counters sub of the
// subject: a sorted set of session → Redis time in milliseconds.
func SessionKey(scope string, id int64, sub string) string {
	if sub != "" {
		sub += ":"
	}
	return "rl:" + scope + ":" + x.Itoa64(id) + ":" + sub + "spm"
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

// counterKeys appends the window keys of a set: rpm current, rpm previous,
// tpm current, tpm previous.
func (m *Minute) counterKeys(keys []string, l Limits, now time.Time) []string {
	rc, rp := m.windowKeys(l.ID, l.Sub, "rpm", now)
	tc, tp := m.windowKeys(l.ID, l.Sub, "tpm", now)
	return append(keys, rc, rp, tc, tp)
}

// sessionCutoff is the newest score that is no longer inside the session
// window at now.
func sessionCutoff(now time.Time) int64 { return now.Add(-sessionWindow).UnixMilli() }

// admit checks every set of caps and counts one request in each of them when
// all are under their caps. KEYS: per set its counterKeys, then its
// SessionKey. ARGV: share of the
// previous window, ttl ms, session ("" = none), now ms, session cutoff ms,
// then per set rpm, tpm and spm. A session already active in a set's window
// passes its spm and is refreshed; a new one passes while the set has fewer
// active sessions than spm. Without a session spm is not checked and nothing
// is added to the sessions. A refusal returns {0, current, previous, cap}
// for a window, or {2, ms until a session slot frees}.
var admit = redis.NewScript(`
local share=tonumber(ARGV[1])
local session=ARGV[3]
local now=tonumber(ARGV[4])
local cutoff=tonumber(ARGV[5])
local function get(k) return tonumber(redis.call('GET',k) or '0') end
local function used(cur, prev) return get(cur)+share*get(prev) end
local n=#KEYS/5
for i=0,n-1 do
  local k=5*i
  local rpm=tonumber(ARGV[6+3*i])
  local tpm=tonumber(ARGV[7+3*i])
  local spm=tonumber(ARGV[8+3*i])
  if rpm>0 and used(KEYS[k+1],KEYS[k+2])>=rpm then
    return {0, get(KEYS[k+1]), get(KEYS[k+2]), rpm}
  end
  if tpm>0 and used(KEYS[k+3],KEYS[k+4])>=tpm then
    return {0, get(KEYS[k+3]), get(KEYS[k+4]), tpm}
  end
  if spm>0 and session~='' and tonumber(redis.call('ZSCORE',KEYS[k+5],session) or cutoff)<=cutoff then
    local active=redis.call('ZCOUNT',KEYS[k+5],'('..cutoff,'+inf')
    if active>=spm then
      local at=redis.call('ZCOUNT',KEYS[k+5],'-inf',cutoff)+active-spm
      local frees=redis.call('ZRANGE',KEYS[k+5],at,at,'WITHSCORES')
      return {2, tonumber(frees[2])-cutoff}
    end
  end
end
for i=0,n-1 do
  local k=5*i
  redis.call('INCR',KEYS[k+1])
  redis.call('PEXPIRE',KEYS[k+1],ARGV[2])
  if session~='' then
    redis.call('ZREMRANGEBYSCORE',KEYS[k+5],'-inf',cutoff)
    redis.call('ZADD',KEYS[k+5],now,session)
    redis.call('PEXPIRE',KEYS[k+5],ARGV[2])
  end
end
return {1}`)

// Admit atomically checks the last 60 seconds of id against rpm and tpm
// (0 = unlimited) and counts one request when it is under both. RPM is exact;
// tokens are counted when responses finish (AddTokens), so a burst can pass
// TPM. A refused request gets the time until it would be admitted.
func (m *Minute) Admit(ctx context.Context, id int64, rpm int, tpm int64) (ok bool, retry time.Duration, err error) {
	return m.AdmitAll(ctx, []Limits{{ID: id, RPM: rpm, TPM: tpm}}, "")
}

// AdmitAll is Admit for several sets of caps at once: one request is counted
// in every set, or in none when one of them is at its cap. A non-empty
// session is also checked against each set's SPM on its own and, when
// admitted, counted as active in every set (CONTRACTS §71).
func (m *Minute) AdmitAll(ctx context.Context, sets []Limits, session string) (ok bool, retry time.Duration, err error) {
	if m.rdb == nil || len(sets) == 0 {
		return true, 0, nil
	}
	now, err := m.now(ctx)
	if err != nil {
		return false, 0, err
	}
	keys := make([]string, 0, 5*len(sets))
	args := make([]any, 0, 5+3*len(sets))
	args = append(args, previousShare(now), keyTTL.Milliseconds(), session, now.UnixMilli(), sessionCutoff(now))
	for _, l := range sets {
		keys = append(m.counterKeys(keys, l, now), SessionKey(m.scope, l.ID, l.Sub))
		args = append(args, l.RPM, l.TPM, l.SPM)
	}
	res, err := admit.Run(ctx, m.rdb, keys, args...).Int64Slice()
	if err != nil {
		return false, 0, err
	}
	switch {
	case len(res) > 0 && res[0] == 1:
		return true, 0, nil
	case len(res) == 2 && res[0] == 2:
		return false, max((time.Duration(res[1])*time.Millisecond + time.Second - 1).Truncate(time.Second), time.Second), nil
	case len(res) < 4:
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
	wins, share, err := m.read(ctx, sets, "")
	if err != nil {
		return nil, err
	}
	out := make([]core.RateUsage, len(sets))
	for i, w := range wins {
		out[i] = core.RateUsage{RPM: estimate(w.counters, share), TPM: estimate(w.counters[2:], share), Sessions: w.sessions}
	}
	return out, nil
}

// Reached returns the ids of which a set reached one of its caps for the
// session ("" = none): a set at its SPM refuses a session it does not hold.
// Sets without caps are never read.
func (m *Minute) Reached(ctx context.Context, limits []Limits, session string) (map[int64]bool, error) {
	out := map[int64]bool{}
	var capped []Limits
	for _, l := range limits {
		if l.RPM > 0 || l.TPM > 0 || (session != "" && l.SPM > 0) {
			capped = append(capped, l)
		}
	}
	if m.rdb == nil || len(capped) == 0 {
		return out, nil
	}
	wins, share, err := m.read(ctx, capped, session)
	if err != nil {
		return out, err
	}
	for i, l := range capped {
		w := wins[i]
		if (l.RPM > 0 && used(w.counters, share) >= float64(l.RPM)) || (l.TPM > 0 && used(w.counters[2:], share) >= float64(l.TPM)) ||
			(session != "" && l.SPM > 0 && !w.holds && w.sessions >= int64(l.SPM)) {
			out[l.ID] = true
		}
	}
	return out, nil
}

// window is what read found for one set.
type window struct {
	counters []any // rpm current, rpm previous, tpm current, tpm previous
	sessions int64 // sessions active in the last 60 seconds
	holds    bool  // the session read along is one of them
}

// read fetches in one round trip, for each set, the rpm and tpm windows and
// its active sessions, and whether session ("" = none) is one of them.
func (m *Minute) read(ctx context.Context, sets []Limits, session string) ([]window, float64, error) {
	now, err := m.now(ctx)
	if err != nil {
		return nil, 0, err
	}
	keys := make([]string, 0, len(sets)*4)
	for _, l := range sets {
		keys = m.counterKeys(keys, l, now)
	}
	cutoff := sessionCutoff(now)
	pipe := m.rdb.Pipeline()
	counters := pipe.MGet(ctx, keys...)
	counts := make([]*redis.IntCmd, len(sets))
	scores := make([]*redis.FloatCmd, len(sets))
	for i, l := range sets {
		k := SessionKey(m.scope, l.ID, l.Sub)
		counts[i] = pipe.ZCount(ctx, k, "("+strconv.FormatInt(cutoff, 10), "+inf")
		if session != "" {
			scores[i] = pipe.ZScore(ctx, k, session)
		}
	}
	if _, err := pipe.Exec(ctx); err != nil && !errors.Is(err, redis.Nil) {
		return nil, 0, err
	}
	vals := counters.Val()
	out := make([]window, len(sets))
	for i := range sets {
		out[i] = window{counters: vals[4*i : 4*i+4], sessions: counts[i].Val()}
		if scores[i] != nil {
			at, err := scores[i].Result()
			out[i].holds = err == nil && int64(at) > cutoff
		}
	}
	return out, previousShare(now), nil
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
