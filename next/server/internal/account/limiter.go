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
	now func() time.Time
}

var _ core.AccountLimiter = (*Limiter)(nil)

// NewLimiter returns a limiter on rdb (nil disables limiting).
func NewLimiter(rdb redis.UniversalClient) *Limiter {
	return &Limiter{rdb: rdb, now: time.Now}
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

func (l *Limiter) windows() (minute, day string) {
	t := l.now().UTC()
	return strconv.FormatInt(t.Unix()/60, 10), t.Format("20060102")
}

// spmCutoff is the oldest score still inside the rolling window.
func (l *Limiter) spmCutoff() string {
	return strconv.FormatInt(l.now().Add(-spmWindow).UnixMilli(), 10)
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
	minute, day := l.windows()
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
	cutoff := l.spmCutoff()
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
	minute, _ := l.windows()
	now := l.now()
	pipe := l.rdb.Pipeline()
	k := rateKey(id, "rpm", minute)
	pipe.Incr(ctx, k)
	pipe.Expire(ctx, k, minuteKeyTTL)
	if session != "" {
		sk := spmKey(id)
		pipe.ZAdd(ctx, sk, redis.Z{Score: float64(now.UnixMilli()), Member: session})
		pipe.ZRemRangeByScore(ctx, sk, "-inf", "("+l.spmCutoff())
		pipe.Expire(ctx, sk, minuteKeyTTL)
	}
	if _, err := pipe.Exec(ctx); err != nil {
		slog.WarnContext(ctx, "account: count request", "account", id, "err", err)
	}
}

// AddTokens implements core.AccountLimiter.
func (l *Limiter) AddTokens(ctx context.Context, id int64, n int64) {
	if l.rdb == nil || n <= 0 {
		return
	}
	minute, day := l.windows()
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
	minute, day := l.windows()
	keys := make([]string, 0, 3*len(ids))
	for _, id := range ids {
		keys = append(keys, rateKey(id, "rpm", minute), rateKey(id, "tpm", minute), rateKey(id, "tpd", day))
	}
	pipe := l.rdb.Pipeline()
	counters := pipe.MGet(ctx, keys...)
	cutoff := l.spmCutoff()
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
