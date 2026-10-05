package account

import (
	"context"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestAtomicAccountAdmissionAndCooldown(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	ctx := context.Background()
	a, b := NewLimiter(rdb), NewLimiter(rdb)
	for _, ref := range []core.AccountRef{{ID: 11, RPMLimit: 1}, {ID: 12, RPMLimit: 1}} {
		var wins atomic.Int64
		var wg sync.WaitGroup
		for i := range 32 {
			wg.Go(func() {
				l := a
				if i%2 == 0 {
					l = b
				}
				ok, err := l.TryHit(ctx, ref, fmt.Sprint(i))
				if err != nil {
					t.Error(err)
				}
				if ok {
					wins.Add(1)
				}
			})
		}
		wg.Wait()
		if wins.Load() != 1 {
			t.Fatalf("last slot admitted %d requests", wins.Load())
		}
	}
	s := New(Deps{Redis: rdb})
	now := time.Now()
	var wg sync.WaitGroup
	for i := range 20 {
		wg.Go(func() {
			if err := s.SetCooldown(ctx, 7, now.Add(time.Duration(i+1)*time.Minute), "test"); err != nil {
				t.Error(err)
			}
		})
	}
	wg.Wait()
	before := mr.TTL(cooldownKey(7))
	if before < 19*time.Minute {
		t.Fatalf("long cooldown was shortened: %s", before)
	}
	if err := s.SetCooldown(ctx, 7, now.Add(-time.Minute), "stale"); err != nil {
		t.Fatal(err)
	}
	if mr.TTL(cooldownKey(7)) != before {
		t.Fatal("expired update deleted or shortened another cooldown")
	}
}
