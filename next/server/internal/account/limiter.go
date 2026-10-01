package account

import (
	"context"
	"encoding/json"
	"log/slog"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Limiter implements core.AccountLimiter on Redis (CONTRACTS §18): fixed
// windows rl:account:{id}:rpm:{minute}, rl:account:{id}:tpm:{minute},
// rl:account:{id}:tpd:{yyyymmdd} (STRING counters) and a rolling minute of
// distinct sessions rl:account:{id}:spm (ZSET session → unix ms). Without
// Redis nothing is limited.
type Limiter struct {
	rdb redis.UniversalClient
	now func() time.Time // explicit test clock; production obtains Redis TIME
}

var _ core.AccountLimiter = (*Limiter)(nil)

// NewLimiter returns a limiter on rdb (nil disables limiting).
func NewLimiter(rdb redis.UniversalClient) *Limiter {
	return &Limiter{rdb: rdb}
}

const (
	minuteKeyTTL = 2 * time.Minute
	dayKeyTTL    = 48 * time.Hour
	spmWindow    = time.Minute
)

func rateKey(id int64, kind, window string) string {
	return "rl:account:" + itoa(id) + ":" + kind + ":" + window
}

func spmKey(id int64) string { return "rl:account:" + itoa(id) + ":spm" }

func (l *Limiter) sharedNow(ctx context.Context) (time.Time, error) {
	if l.now != nil {
		return l.now(), nil
	}
	return l.rdb.Time(ctx).Result()
}

func windows(now time.Time) (minute, day string) {
	t := now.UTC()
	return strconv.FormatInt(t.Unix()/60, 10), t.Format("20060102")
}

// spmCutoff is the oldest score still inside the rolling window.
func spmCutoff(now time.Time) string {
	return strconv.FormatInt(now.Add(-spmWindow).UnixMilli(), 10)
}

// Exhausted implements core.AccountLimiter.
func (l *Limiter) Exhausted(ctx context.Context, refs []core.AccountRef, session string) (map[int64]bool, error) {
	out := map[int64]bool{}
	if l.rdb == nil {
		return out, nil
	}
	type probe struct {
		id    int64
		limit int64
	}
	var keys []string
	var probes []probe
	var spmProbes []probe
	now, err := l.sharedNow(ctx)
	if err != nil {
		return out, err
	}
	minute, day := windows(now)
	for _, r := range refs {
		if r.RPMLimit > 0 {
			keys = append(keys, rateKey(r.ID, "rpm", minute))
			probes = append(probes, probe{r.ID, int64(r.RPMLimit)})
		}
		if r.TPMLimit > 0 {
			keys = append(keys, rateKey(r.ID, "tpm", minute))
			probes = append(probes, probe{r.ID, r.TPMLimit})
		}
		if r.TPDLimit > 0 {
			keys = append(keys, rateKey(r.ID, "tpd", day))
			probes = append(probes, probe{r.ID, r.TPDLimit})
		}
		if r.SPMLimit > 0 {
			spmProbes = append(spmProbes, probe{r.ID, int64(r.SPMLimit)})
		}
	}
	if len(keys) == 0 && len(spmProbes) == 0 {
		return out, nil
	}
	pipe := l.rdb.Pipeline()
	var counters *redis.SliceCmd
	if len(keys) > 0 {
		counters = pipe.MGet(ctx, keys...)
	}
	cutoff := spmCutoff(now)
	counts := make([]*redis.IntCmd, len(spmProbes))
	members := make([]*redis.FloatCmd, len(spmProbes))
	for i, p := range spmProbes {
		counts[i] = pipe.ZCount(ctx, spmKey(p.id), "("+cutoff, "+inf")
		members[i] = pipe.ZScore(ctx, spmKey(p.id), session)
	}
	if _, err := pipe.Exec(ctx); err != nil && err != redis.Nil {
		return out, err
	}
	if counters != nil {
		for i, v := range counters.Val() {
			if toInt64(v) >= probes[i].limit {
				out[probes[i].id] = true
			}
		}
	}
	oldest, _ := strconv.ParseFloat(cutoff, 64)
	for i, p := range spmProbes {
		// A session already inside the window keeps its slot.
		if score, err := members[i].Result(); err == nil && score > oldest {
			continue
		}
		if counts[i].Val() >= p.limit {
			out[p.id] = true
		}
	}
	return out, nil
}

// Hit implements core.AccountLimiter.
func (l *Limiter) Hit(ctx context.Context, id int64, session string) {
	if l.rdb == nil {
		return
	}
	now, err := l.sharedNow(ctx)
	if err != nil {
		slog.WarnContext(ctx, "account: read shared time for request count", "account", id, "err", err)
		return
	}
	minute, _ := windows(now)
	pipe := l.rdb.Pipeline()
	k := rateKey(id, "rpm", minute)
	pipe.Incr(ctx, k)
	pipe.Expire(ctx, k, minuteKeyTTL)
	if session != "" {
		sk := spmKey(id)
		pipe.ZAdd(ctx, sk, redis.Z{Score: float64(now.UnixMilli()), Member: session})
		pipe.ZRemRangeByScore(ctx, sk, "-inf", "("+spmCutoff(now))
		pipe.Expire(ctx, sk, minuteKeyTTL)
	}
	if _, err := pipe.Exec(ctx); err != nil {
		slog.WarnContext(ctx, "account: count request", "account", id, "err", err)
	}
}

var admitRequest = redis.NewScript(`
local limits = {tonumber(ARGV[1]),tonumber(ARGV[2]),tonumber(ARGV[3])}
for i=1,3 do
  if limits[i] > 0 and tonumber(redis.call('GET',KEYS[i]) or '0') >= limits[i] then return 0 end
end
local cutoff = tonumber(ARGV[6]) - 60000
redis.call('ZREMRANGEBYSCORE',KEYS[4],'-inf',cutoff)
local session = ARGV[5]
local spm = tonumber(ARGV[4])
if spm > 0 and session ~= '' and not redis.call('ZSCORE',KEYS[4],session) and redis.call('ZCARD',KEYS[4]) >= spm then return 0 end
redis.call('INCR',KEYS[1])
redis.call('PEXPIRE',KEYS[1],ARGV[7])
if session ~= '' then
  redis.call('ZADD',KEYS[4],ARGV[6],session)
  redis.call('PEXPIRE',KEYS[4],ARGV[7])
end
return 1`)

func (l *Limiter) TryHit(ctx context.Context, ref core.AccountRef, session string) (bool, error) {
	if l.rdb == nil {
		return true, nil
	}
	now, err := l.sharedNow(ctx)
	if err != nil {
		return false, err
	}
	minute, day := windows(now)
	n, err := admitRequest.Run(ctx, l.rdb, []string{rateKey(ref.ID, "rpm", minute), rateKey(ref.ID, "tpm", minute), rateKey(ref.ID, "tpd", day), spmKey(ref.ID)},
		ref.RPMLimit, ref.TPMLimit, ref.TPDLimit, ref.SPMLimit, session, now.UnixMilli(), minuteKeyTTL.Milliseconds()).Int()
	return n == 1, err
}

// AddTokens implements core.AccountLimiter.
func (l *Limiter) AddTokens(ctx context.Context, id int64, n int64) {
	if l.rdb == nil || n <= 0 {
		return
	}
	now, err := l.sharedNow(ctx)
	if err != nil {
		slog.WarnContext(ctx, "account: read shared time for token count", "account", id, "err", err)
		return
	}
	minute, day := windows(now)
	pipe := l.rdb.Pipeline()
	km, kd := rateKey(id, "tpm", minute), rateKey(id, "tpd", day)
	pipe.IncrBy(ctx, km, n)
	pipe.Expire(ctx, km, minuteKeyTTL)
	pipe.IncrBy(ctx, kd, n)
	pipe.Expire(ctx, kd, dayKeyTTL)
	if _, err := pipe.Exec(ctx); err != nil {
		slog.WarnContext(ctx, "account: count tokens", "account", id, "err", err)
	}
}

// Usage implements core.AccountLimiter.
func (l *Limiter) Usage(ctx context.Context, ids []int64) (map[int64]core.RateUsage, error) {
	out := make(map[int64]core.RateUsage, len(ids))
	if l.rdb == nil || len(ids) == 0 {
		return out, nil
	}
	now, err := l.sharedNow(ctx)
	if err != nil {
		return out, err
	}
	minute, day := windows(now)
	keys := make([]string, 0, 3*len(ids))
	for _, id := range ids {
		keys = append(keys, rateKey(id, "rpm", minute), rateKey(id, "tpm", minute), rateKey(id, "tpd", day))
	}
	pipe := l.rdb.Pipeline()
	counters := pipe.MGet(ctx, keys...)
	cutoff := spmCutoff(now)
	sessions := make([]*redis.IntCmd, len(ids))
	for i, id := range ids {
		sessions[i] = pipe.ZCount(ctx, spmKey(id), "("+cutoff, "+inf")
	}
	if _, err := pipe.Exec(ctx); err != nil && err != redis.Nil {
		return out, err
	}
	vals := counters.Val()
	for i, id := range ids {
		out[id] = core.RateUsage{RPM: toInt64(vals[3*i]), TPM: toInt64(vals[3*i+1]), TPD: toInt64(vals[3*i+2]),
			SPM: sessions[i].Val()}
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

// mappingJSON encodes a model mapping for the model_mapping column.
func mappingJSON(m map[string]string) string {
	if m == nil {
		m = map[string]string{}
	}
	b, _ := json.Marshal(m)
	return string(b)
}
