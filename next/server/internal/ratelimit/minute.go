// Package ratelimit counts requests and tokens of a kind of subject (accounts,
// API keys) in fixed minute windows shared by every node through Redis. The
// window is taken from Redis TIME so nodes with skewed clocks agree on it.
// Without a Redis client nothing is counted and everything is admitted.
package ratelimit

import (
	"context"
	"log/slog"
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

// Limits are a subject's per-minute caps; 0 = unlimited.
type Limits struct {
	ID  int64
	RPM int
	TPM int64
}

func NewMinute(rdb redis.UniversalClient, scope string) *Minute {
	return &Minute{rdb: rdb, scope: scope}
}

// Key is the Redis key of the kind ("rpm" | "tpm") window holding at.
func Key(scope string, id int64, kind string, at time.Time) string {
	return "rl:" + scope + ":" + x.Itoa64(id) + ":" + kind + ":" + strconv.FormatInt(at.Unix()/60, 10)
}

func (m *Minute) now(ctx context.Context) (time.Time, error) {
	if m.Now != nil {
		return m.Now(), nil
	}
	return m.rdb.Time(ctx).Result()
}

var admit = redis.NewScript(`
local rpm=tonumber(ARGV[1])
local tpm=tonumber(ARGV[2])
if rpm>0 and tonumber(redis.call('GET',KEYS[1]) or '0')>=rpm then return 0 end
if tpm>0 and tonumber(redis.call('GET',KEYS[2]) or '0')>=tpm then return 0 end
redis.call('INCR',KEYS[1])
redis.call('PEXPIRE',KEYS[1],ARGV[3])
return 1`)

// Admit atomically checks the current window of id against rpm and tpm
// (0 = unlimited) and counts one request when it is under both. RPM is exact; tokens are counted when
// responses finish (AddTokens), so a burst can pass TPM within a minute. A
// refused request gets the time until the next window.
func (m *Minute) Admit(ctx context.Context, id int64, rpm int, tpm int64) (ok bool, retry time.Duration, err error) {
	if m.rdb == nil {
		return true, 0, nil
	}
	now, err := m.now(ctx)
	if err != nil {
		return false, 0, err
	}
	n, err := admit.Run(ctx, m.rdb, []string{Key(m.scope, id, "rpm", now), Key(m.scope, id, "tpm", now)}, rpm, tpm, keyTTL.Milliseconds()).Int()
	if err != nil || n == 1 {
		return err == nil, 0, err
	}
	return false, time.Minute - time.Duration(now.Unix()%60)*time.Second, nil
}

// Count counts one request without checking the caps.
func (m *Minute) Count(ctx context.Context, id int64) { m.add(ctx, id, "rpm", 1) }

// AddTokens adds the tokens of a finished response to the current window.
func (m *Minute) AddTokens(ctx context.Context, id, n int64) {
	if n > 0 {
		m.add(ctx, id, "tpm", n)
	}
}

func (m *Minute) add(ctx context.Context, id int64, kind string, n int64) {
	if m.rdb == nil {
		return
	}
	now, err := m.now(ctx)
	if err != nil {
		slog.WarnContext(ctx, "ratelimit: read shared time", "scope", m.scope, "id", id, "kind", kind, "err", err)
		return
	}
	k := Key(m.scope, id, kind, now)
	pipe := m.rdb.Pipeline()
	pipe.IncrBy(ctx, k, n)
	pipe.Expire(ctx, k, keyTTL)
	if _, err = pipe.Exec(ctx); err != nil {
		slog.WarnContext(ctx, "ratelimit: count", "scope", m.scope, "id", id, "kind", kind, "err", err)
	}
}

// Usage returns the current-window counters of ids.
func (m *Minute) Usage(ctx context.Context, ids []int64) (map[int64]core.RateUsage, error) {
	out := make(map[int64]core.RateUsage, len(ids))
	if m.rdb == nil || len(ids) == 0 {
		return out, nil
	}
	vals, err := m.read(ctx, ids, "rpm", "tpm")
	if err != nil {
		return out, err
	}
	for i, id := range ids {
		out[id] = core.RateUsage{RPM: toInt64(vals[2*i]), TPM: toInt64(vals[2*i+1])}
	}
	return out, nil
}

// Reached returns the ids whose current window reached one of their caps.
// Subjects without caps are never read or listed.
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
	ids := make([]int64, len(capped))
	for i, l := range capped {
		ids[i] = l.ID
	}
	vals, err := m.read(ctx, ids, "rpm", "tpm")
	if err != nil {
		return out, err
	}
	for i, l := range capped {
		if (l.RPM > 0 && toInt64(vals[2*i]) >= int64(l.RPM)) || (l.TPM > 0 && toInt64(vals[2*i+1]) >= l.TPM) {
			out[l.ID] = true
		}
	}
	return out, nil
}

// read MGETs the current window of each kind for each id (id-major order).
func (m *Minute) read(ctx context.Context, ids []int64, kinds ...string) ([]any, error) {
	now, err := m.now(ctx)
	if err != nil {
		return nil, err
	}
	keys := make([]string, 0, len(ids)*len(kinds))
	for _, id := range ids {
		for _, kind := range kinds {
			keys = append(keys, Key(m.scope, id, kind, now))
		}
	}
	return m.rdb.MGet(ctx, keys...).Result()
}

func toInt64(v any) int64 {
	s, ok := v.(string)
	if !ok {
		return 0
	}
	n, _ := strconv.ParseInt(s, 10, 64)
	return n
}
