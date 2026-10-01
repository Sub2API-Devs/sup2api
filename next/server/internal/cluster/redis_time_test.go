package cluster

import (
	"context"
	"testing"
	"time"
)

func TestClockSkewCannotReclaimHealthyNode(t *testing.T) {
	ctx := context.Background()
	mr, rdb := newRedis(t)
	serverTime := time.Date(2020, 1, 2, 3, 4, 5, 0, time.UTC)
	mr.SetTime(serverTime)
	slow, fast := newClock(), newClock()
	fast.Add(20 * time.Second)
	// Only the local health clocks differ. Production shared clocks remain
	// unset, so both nodes must use Redis TIME for liveness and slot scores.
	a := NewRegistry(rdb, nil, RegistryOptions{NodeID: "A", BootID: "a"})
	b := NewRegistry(rdb, nil, RegistryOptions{NodeID: "B", BootID: "b"})
	a.nowFn, b.nowFn = slow.Now, fast.Now
	if err := a.Heartbeat(ctx); err != nil {
		t.Fatal(err)
	}
	sa, sb := NewSlots(rdb, a, SlotOptions{}), NewSlots(rdb, b, SlotOptions{})
	work, release, ok, err := sa.AcquireLease(ctx, "account", 1, 1, "running")
	if err != nil || !ok {
		t.Fatal(ok, err)
	}
	defer release()
	if err := b.Heartbeat(ctx); err != nil {
		t.Fatal(err)
	}
	alive, err := b.IsAlive(ctx, "a")
	if err != nil || !alive {
		t.Fatal("healthy node judged dead", alive, err)
	}
	nodes, err := b.LiveNodes(ctx)
	if err != nil || len(nodes) != 2 {
		t.Fatal(nodes, err)
	}
	if removed, err := sb.Reclaim(ctx); err != nil || removed != 0 {
		t.Fatal("active slot reclaimed", removed, err)
	}
	_, release2, entered, err := sb.AcquireLease(ctx, "account", 1, 1, "second")
	defer release2()
	if err != nil || entered || !a.Healthy() || work.Err() != nil {
		t.Fatal("clock skew admitted overlapping work", entered, err, work.Err())
	}
	score, err := rdb.ZScore(ctx, keyNodeLive, "a").Result()
	if err != nil || int64(score) != serverTime.UnixMilli() {
		t.Fatal("node score did not use Redis time", score, err)
	}
	if n, err := sb.InUse(ctx, "account", 1); err != nil || n != 1 {
		t.Fatal("shared slot count", n, err)
	}
	mr.SetTime(serverTime.Add(10 * time.Second))
	if err := sa.refresh(ctx); err != nil {
		t.Fatal(err)
	}
	zs, err := rdb.ZRangeWithScores(ctx, SlotKey("account", 1), 0, -1).Result()
	if err != nil || len(zs) != 1 || int64(zs[0].Score) != serverTime.Add(10*time.Second+DefaultSlotTTL).UnixMilli() {
		t.Fatal("refresh used a node clock", zs, err)
	}
	// Advancing the shared clock really does expire a node; no local wall
	// clock jump or actual sleep is needed to test the decision.
	mr.SetTime(serverTime.Add(16 * time.Second))
	if err := b.Heartbeat(ctx); err != nil {
		t.Fatal(err)
	}
	if alive, err := b.IsAlive(ctx, "a"); err != nil || alive {
		t.Fatal("stale heartbeat retained", alive, err)
	}
}
