package account

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestLimiterWindows(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	now := time.Date(2026, 9, 25, 12, 0, 30, 0, time.UTC)
	l := NewLimiter(rdb)
	l.now = func() time.Time { return now }
	ctx := context.Background()
	refs := []core.AccountRef{{ID: 1, RPMLimit: 2}, {ID: 2, TPMLimit: 100}, {ID: 3, TPDLimit: 1000}, {ID: 4, SPMLimit: 2}, {ID: 5}}

	ex, err := l.Exhausted(ctx, refs, "s1")
	if err != nil || len(ex) != 0 {
		t.Fatalf("fresh: %v %v", ex, err)
	}

	// rpm: two hits reach the limit.
	l.Hit(ctx, 1, "s1")
	l.Hit(ctx, 1, "s2")
	// tpm / tpd: tokens.
	l.AddTokens(ctx, 2, 100)
	l.AddTokens(ctx, 3, 999)
	// spm: sessions s1 and s2 fill the window.
	l.Hit(ctx, 4, "s1")
	l.Hit(ctx, 4, "s2")

	ex, _ = l.Exhausted(ctx, refs, "s3")
	if !ex[1] || !ex[2] || ex[3] || !ex[4] || ex[5] {
		t.Fatalf("exhausted: %v", ex)
	}
	// A session already in the window keeps its slot on account 4.
	ex, _ = l.Exhausted(ctx, refs, "s1")
	if ex[4] {
		t.Fatalf("known session must pass: %v", ex)
	}
	l.AddTokens(ctx, 3, 1)
	ex, _ = l.Exhausted(ctx, refs, "s3")
	if !ex[3] {
		t.Fatalf("tpd: %v", ex)
	}

	u, err := l.Usage(ctx, []int64{1, 2, 3, 4, 5})
	if err != nil {
		t.Fatal(err)
	}
	if u[1].RPM != 2 || u[2].TPM != 100 || u[3].TPD != 1000 || u[4].SPM != 2 || u[5] != (core.RateUsage{}) {
		t.Fatalf("usage: %+v", u)
	}

	// Next minute: rpm/tpm/spm windows are fresh, the day window is not.
	now = now.Add(time.Minute)
	ex, _ = l.Exhausted(ctx, refs, "s3")
	if ex[1] || ex[2] || !ex[3] || ex[4] {
		t.Fatalf("next minute: %v", ex)
	}
	// The spm window rolls: at 12:01:20 the sessions written at 12:00:30
	// are still inside the last 60 s; at 12:01:30 they are out.
	now = time.Date(2026, 9, 25, 12, 1, 20, 0, time.UTC)
	ex, _ = l.Exhausted(ctx, refs, "s3")
	if !ex[4] {
		t.Fatalf("spm at 12:01:20: %v", ex)
	}
	if u, _ = l.Usage(ctx, []int64{4}); u[4].SPM != 2 {
		t.Fatalf("spm usage inside window: %+v", u[4])
	}
	now = time.Date(2026, 9, 25, 12, 1, 30, 0, time.UTC)
	if u, _ = l.Usage(ctx, []int64{4}); u[4].SPM != 0 {
		t.Fatalf("spm usage after window: %+v", u[4])
	}

	// Next UTC day: tpd resets.
	now = time.Date(2026, 9, 26, 0, 0, 1, 0, time.UTC)
	ex, _ = l.Exhausted(ctx, refs, "s3")
	if ex[3] {
		t.Fatalf("next day: %v", ex)
	}

	// Without Redis nothing is limited.
	none := NewLimiter(nil)
	if ex, _ := none.Exhausted(ctx, refs, "x"); len(ex) != 0 {
		t.Fatal("nil redis must not limit")
	}
}
