package account

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"testing"
	"time"
)

func TestLimiterWindows(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	now := time.Date(2026, 9, 25, 12, 0, 30, 0, time.UTC)
	l := NewLimiter(rdb)
	l.now = func() time.Time { return now }
	ctx := context.Background()
	refs := []core.AccountRef{{ID: 1, RPMLimit: 2}, {ID: 2, TPMLimit: 100}, {ID: 3}}
	if ex, err := l.Exhausted(ctx, refs, "s1"); err != nil || len(ex) != 0 {
		t.Fatal(ex, err)
	}
	l.Hit(ctx, 1, "s1")
	l.Hit(ctx, 1, "s1")
	l.AddTokens(ctx, 2, 100)
	ex, err := l.Exhausted(ctx, refs, "s1")
	if err != nil || !ex[1] || !ex[2] || ex[3] {
		t.Fatal(ex, err)
	}
	u, err := l.Usage(ctx, []int64{1, 2, 3})
	if err != nil || u[1].RPM != 2 || u[2].TPM != 100 || u[3] != (core.RateUsage{}) {
		t.Fatal(u, err)
	}
	now = now.Add(time.Minute)
	ex, err = l.Exhausted(ctx, refs, "s1")
	if err != nil || len(ex) != 0 {
		t.Fatal("minute reset", ex, err)
	}
	if ok, err := l.TryHit(ctx, refs[0], "s1"); err != nil || !ok {
		t.Fatal(ok, err)
	}
	if ex, err := NewLimiter(nil).Exhausted(ctx, refs, "x"); err != nil || len(ex) != 0 {
		t.Fatal(ex, err)
	}
	for _, k := range mr.Keys() {
		if len(k) >= 4 && (k[len(k)-4:] == ":spm") {
			t.Fatal("removed session counter still written", k)
		}
	}
}
