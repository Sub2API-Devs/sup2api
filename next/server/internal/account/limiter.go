package account

import (
	"context"
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/redis/go-redis/v9"
	"log/slog"
	"strconv"
	"time"
)

// Limiter uses shared Redis minute windows for requests and tokens.
// With no Redis client, limiting is disabled.
type Limiter struct {
	rdb redis.UniversalClient
	now func() time.Time
}

var _ core.AccountLimiter = (*Limiter)(nil)

func NewLimiter(rdb redis.UniversalClient) *Limiter { return &Limiter{rdb: rdb} }

const minuteKeyTTL = 2 * time.Minute

func rateKey(id int64, kind, window string) string {
	return "rl:account:" + itoa(id) + ":" + kind + ":" + window
}
func (l *Limiter) sharedNow(ctx context.Context) (time.Time, error) {
	if l.now != nil {
		return l.now(), nil
	}
	return l.rdb.Time(ctx).Result()
}
func minuteWindow(now time.Time) string { return strconv.FormatInt(now.Unix()/60, 10) }
func (l *Limiter) Exhausted(ctx context.Context, refs []core.AccountRef, _ string) (map[int64]bool, error) {
	out := map[int64]bool{}
	if l.rdb == nil {
		return out, nil
	}
	now, err := l.sharedNow(ctx)
	if err != nil {
		return out, err
	}
	minute := minuteWindow(now)
	type probe struct{ id, limit int64 }
	var keys []string
	var probes []probe
	for _, r := range refs {
		if r.RPMLimit > 0 {
			keys = append(keys, rateKey(r.ID, "rpm", minute))
			probes = append(probes, probe{r.ID, int64(r.RPMLimit)})
		}
		if r.TPMLimit > 0 {
			keys = append(keys, rateKey(r.ID, "tpm", minute))
			probes = append(probes, probe{r.ID, r.TPMLimit})
		}
	}
	if len(keys) == 0 {
		return out, nil
	}
	vals, err := l.rdb.MGet(ctx, keys...).Result()
	if err != nil {
		return out, err
	}
	for i, v := range vals {
		if toInt64(v) >= probes[i].limit {
			out[probes[i].id] = true
		}
	}
	return out, nil
}
func (l *Limiter) Hit(ctx context.Context, id int64, _ string) {
	if l.rdb == nil {
		return
	}
	now, err := l.sharedNow(ctx)
	if err != nil {
		slog.WarnContext(ctx, "account: read shared time for request count", "account", id, "err", err)
		return
	}
	k := rateKey(id, "rpm", minuteWindow(now))
	pipe := l.rdb.Pipeline()
	pipe.Incr(ctx, k)
	pipe.Expire(ctx, k, minuteKeyTTL)
	if _, err = pipe.Exec(ctx); err != nil {
		slog.WarnContext(ctx, "account: count request", "account", id, "err", err)
	}
}

var admitRequest = redis.NewScript(`
local rpm=tonumber(ARGV[1])
local tpm=tonumber(ARGV[2])
if rpm>0 and tonumber(redis.call('GET',KEYS[1]) or '0')>=rpm then return 0 end
if tpm>0 and tonumber(redis.call('GET',KEYS[2]) or '0')>=tpm then return 0 end
redis.call('INCR',KEYS[1])
redis.call('PEXPIRE',KEYS[1],ARGV[3])
return 1`)

func (l *Limiter) TryHit(ctx context.Context, ref core.AccountRef, _ string) (bool, error) {
	if l.rdb == nil {
		return true, nil
	}
	now, err := l.sharedNow(ctx)
	if err != nil {
		return false, err
	}
	minute := minuteWindow(now)
	n, err := admitRequest.Run(ctx, l.rdb, []string{rateKey(ref.ID, "rpm", minute), rateKey(ref.ID, "tpm", minute)}, ref.RPMLimit, ref.TPMLimit, minuteKeyTTL.Milliseconds()).Int()
	return n == 1, err
}
func (l *Limiter) AddTokens(ctx context.Context, id, n int64) {
	if l.rdb == nil || n <= 0 {
		return
	}
	now, err := l.sharedNow(ctx)
	if err != nil {
		slog.WarnContext(ctx, "account: read shared time for token count", "account", id, "err", err)
		return
	}
	k := rateKey(id, "tpm", minuteWindow(now))
	pipe := l.rdb.Pipeline()
	pipe.IncrBy(ctx, k, n)
	pipe.Expire(ctx, k, minuteKeyTTL)
	if _, err = pipe.Exec(ctx); err != nil {
		slog.WarnContext(ctx, "account: count tokens", "account", id, "err", err)
	}
}
func (l *Limiter) Usage(ctx context.Context, ids []int64) (map[int64]core.RateUsage, error) {
	out := make(map[int64]core.RateUsage, len(ids))
	if l.rdb == nil || len(ids) == 0 {
		return out, nil
	}
	now, err := l.sharedNow(ctx)
	if err != nil {
		return out, err
	}
	minute := minuteWindow(now)
	keys := make([]string, 0, 2*len(ids))
	for _, id := range ids {
		keys = append(keys, rateKey(id, "rpm", minute), rateKey(id, "tpm", minute))
	}
	vals, err := l.rdb.MGet(ctx, keys...).Result()
	if err != nil {
		return out, err
	}
	for i, id := range ids {
		out[id] = core.RateUsage{RPM: toInt64(vals[2*i]), TPM: toInt64(vals[2*i+1])}
	}
	return out, nil
}
func toInt64(v any) int64 {
	s, ok := v.(string)
	if !ok {
		return 0
	}
	n, _ := strconv.ParseInt(s, 10, 64)
	return n
}
func mappingJSON(m map[string]string) string {
	if m == nil {
		m = map[string]string{}
	}
	b, _ := json.Marshal(m)
	return string(b)
}
