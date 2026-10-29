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
	l.w.Now = func() time.Time { return now }
	ctx := context.Background()
	refs := []core.AccountRef{{ID: 1, RPMLimit: 2}, {ID: 2, TPMLimit: 100}, {ID: 3}}
	if ex, err := l.Exhausted(ctx, refs, "m"); err != nil || len(ex) != 0 {
		t.Fatal(ex, err)
	}
	for range 2 {
		if ok, err := l.TryHit(ctx, refs[0], "m"); err != nil || !ok {
			t.Fatal(ok, err)
		}
	}
	l.AddTokens(ctx, 2, "", 100)
	ex, err := l.Exhausted(ctx, refs, "m")
	if err != nil || !ex[1] || !ex[2] || ex[3] {
		t.Fatal(ex, err)
	}
	u, err := l.Usage(ctx, refs)
	if err != nil || u[1].RPM != 2 || u[2].TPM != 100 || u[3].RPM != 0 || u[3].TPM != 0 {
		t.Fatal(u, err)
	}
	// Right after the minute the previous window still counts in full.
	now = now.Add(30 * time.Second)
	ex, err = l.Exhausted(ctx, refs, "m")
	if err != nil || !ex[1] || !ex[2] {
		t.Fatal("previous minute forgotten", ex, err)
	}
	now = now.Add(31 * time.Second)
	ex, err = l.Exhausted(ctx, refs, "m")
	if err != nil || len(ex) != 0 {
		t.Fatal("window slid", ex, err)
	}
	if ok, err := l.TryHit(ctx, refs[0], "m"); err != nil || !ok {
		t.Fatal(ok, err)
	}
	if ex, err := NewLimiter(nil).Exhausted(ctx, refs, "m"); err != nil || len(ex) != 0 {
		t.Fatal(ex, err)
	}
	for _, k := range mr.Keys() {
		if len(k) >= 4 && (k[len(k)-4:] == ":spm") {
			t.Fatal("removed session counter still written", k)
		}
	}
}

func TestLimiterModelLists(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	mr.SetTime(time.Date(2026, 10, 30, 12, 0, 5, 0, time.UTC))
	l := NewLimiter(rdb)
	ctx := context.Background()
	big := core.ModelLimit{Models: []string{"model-b", "model-a"}, RPMLimit: 1}
	small := core.ModelLimit{Models: []string{"model-c"}, TPMLimit: 10}
	ref := core.AccountRef{ID: 4, RPMLimit: 10, ModelLimits: []core.ModelLimit{big, small}}

	if ok, err := l.TryHit(ctx, ref, "model-a"); err != nil || !ok {
		t.Fatal(ok, err)
	}
	// model-b shares the counter of model-a; model-c and other models do not.
	if ok, _ := l.TryHit(ctx, ref, "model-b"); ok {
		t.Fatal("list counter not shared")
	}
	if ex, _ := l.Exhausted(ctx, []core.AccountRef{ref}, "model-b"); !ex[4] {
		t.Fatal("precheck missed the list cap")
	}
	if ex, _ := l.Exhausted(ctx, []core.AccountRef{ref}, "model-x"); ex[4] {
		t.Fatal("unlisted model limited by a list")
	}
	if ok, _ := l.TryHit(ctx, ref, "model-c"); !ok {
		t.Fatal("lists share counters")
	}
	l.AddTokens(ctx, 4, small.Key(), 10)
	if ok, _ := l.TryHit(ctx, ref, "model-c"); ok {
		t.Fatal("list tokens cap ignored")
	}
	u, err := l.Usage(ctx, []core.AccountRef{ref})
	if err != nil || u[4].RPM != 2 || u[4].TPM != 10 || len(u[4].Models) != 2 {
		t.Fatal(u, err)
	}
	if m := u[4].Models; m[0].RPM != 1 || m[1].RPM != 1 || m[1].TPM != 10 || m[0].Models[0] != "model-b" {
		t.Fatal(m)
	}
	// The key ignores the order of the models.
	if (&core.ModelLimit{Models: []string{"model-a", "model-b"}}).Key() != big.Key() {
		t.Fatal("key depends on order")
	}
}
