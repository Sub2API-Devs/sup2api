package account

import (
	"context"
	"strconv"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ratelimit"
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
	ref := core.AccountRef{ID: 7, RPMLimit: 1}
	if ok, err := a.TryHit(ctx, ref, "first", ""); err != nil || !ok {
		t.Fatal(ok, err)
	}
	if ok, err := b.TryHit(ctx, ref, "second", ""); err != nil || ok {
		t.Fatal("second node bypassed shared limit", ok, err)
	}
	segment := strconv.FormatInt(stamp.UnixMilli()/3000, 10)
	if at, err := rdb.HGetAll(ctx, ratelimit.Key("account", 7, ratelimit.Requests)).Result(); err != nil || len(at) != 1 || at[segment] != "1" {
		t.Fatal("RPM counted in a segment of local time", at, err)
	}
	if ok, err := a.TryHit(ctx, core.AccountRef{ID: 8}, "", ""); err != nil || !ok {
		t.Fatal(ok, err)
	}
	a.AddTokens(ctx, 8, "", 17)
	if at, err := rdb.HGetAll(ctx, ratelimit.Key("account", 8, ratelimit.Tokens)).Result(); err != nil || len(at) != 1 || at[segment] != "17" {
		t.Fatal("TPM counted in a segment of local time", at, err)
	}
	u, err := b.Usage(ctx, []core.AccountRef{{ID: 8}})
	if err != nil || u[8].RPM != 1 || u[8].TPM != 17 {
		t.Fatal(u, err)
	}
	ex, err := b.Exhausted(ctx, []core.AccountRef{ref}, "second", "")
	if err != nil || !ex[7] {
		t.Fatal(ex, err)
	}
	mr.SetTime(stamp.Add(70 * time.Second))
	u, err = b.Usage(ctx, []core.AccountRef{{ID: 8}})
	if err != nil || u[8].RPM != 0 || u[8].TPM != 0 {
		t.Fatal("window rollover did not use shared time", u, err)
	}
	mr.SetError("ERR shared time unavailable")
	if _, err = b.Usage(ctx, []core.AccountRef{{ID: 8}}); err == nil {
		t.Fatal("usage fell back to local time")
	}
	if _, err = b.Exhausted(ctx, []core.AccountRef{ref}, "other", ""); err == nil {
		t.Fatal("exhausted fell back to local time")
	}
	if ok, err := b.TryHit(ctx, ref, "other", ""); err == nil || ok {
		t.Fatal("admission fell back to local time")
	}
}
