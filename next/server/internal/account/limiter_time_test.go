package account

import (
	"context"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestLimiterUsesRedisWindowForEveryOperation(t *testing.T) {
	ctx := context.Background()
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	stamp := time.Date(2020, 1, 2, 23, 59, 50, 0, time.UTC)
	mr.SetTime(stamp)
	a, b := NewLimiter(rdb), NewLimiter(rdb)
	ref := core.AccountRef{ID: 7, RPMLimit: 1, SPMLimit: 1}
	if ok, err := a.TryHit(ctx, ref, "first"); err != nil || !ok {
		t.Fatal(ok, err)
	}
	if ok, err := b.TryHit(ctx, ref, "second"); err != nil || ok {
		t.Fatal("second node bypassed shared limit", ok, err)
	}
	minute, day := windows(stamp)
	if n, err := rdb.Get(ctx, rateKey(7, "rpm", minute)).Int(); err != nil || n != 1 {
		t.Fatal("RPM key used local time", n, err)
	}
	if score, err := rdb.ZScore(ctx, spmKey(7), "first").Result(); err != nil || int64(score) != stamp.UnixMilli() {
		t.Fatal("SPM used local time", score, err)
	}
	a.Hit(ctx, 8, "session")
	a.AddTokens(ctx, 8, 17)
	if n, err := rdb.Get(ctx, rateKey(8, "tpd", day)).Int(); err != nil || n != 17 {
		t.Fatal("TPD key used local time", n, err)
	}
	u, err := b.Usage(ctx, []int64{8})
	if err != nil || u[8].RPM != 1 || u[8].TPM != 17 || u[8].SPM != 1 {
		t.Fatal(u, err)
	}
	ex, err := b.Exhausted(ctx, []core.AccountRef{ref}, "second")
	if err != nil || !ex[7] {
		t.Fatal(ex, err)
	}
	mr.SetTime(stamp.Add(20 * time.Second))
	u, err = b.Usage(ctx, []int64{8})
	if err != nil || u[8].RPM != 0 || u[8].TPD != 0 || u[8].SPM != 1 {
		t.Fatal("window rollover did not use shared time", u, err)
	}
	mr.SetError("ERR shared time unavailable")
	if _, err = b.Usage(ctx, []int64{8}); err == nil {
		t.Fatal("usage fell back to local time")
	}
	if _, err = b.Exhausted(ctx, []core.AccountRef{ref}, "other"); err == nil {
		t.Fatal("exhausted fell back to local time")
	}
	if ok, err := b.TryHit(ctx, ref, "other"); err == nil || ok {
		t.Fatal("admission fell back to local time")
	}
}
