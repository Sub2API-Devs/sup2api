package cluster

import (
	"context"
	"testing"
	"time"
)

func TestRequestSlotsRenewIndependently(t *testing.T) {
	ctx := context.Background()
	_, rdb := newRedis(t)
	c := newClock()
	reg := newReg(rdb, c, "node-a", "boot-a")
	s := NewSlots(rdb, reg, SlotOptions{Now: c.Now, TTL: time.Minute})
	u, ok, err := s.Acquire(ctx, "user", 1, 1, "request-same")
	if !ok || err != nil {
		t.Fatal(ok, err)
	}
	defer u()
	a, ok, err := s.Acquire(ctx, "account", 2, 1, "request-same")
	if !ok || err != nil {
		t.Fatal(ok, err)
	}
	defer a()
	c.Add(50 * time.Second)
	if err := s.refresh(ctx); err != nil {
		t.Fatal(err)
	}
	c.Add(20 * time.Second)
	un, _ := s.InUse(ctx, "user", 1)
	an, _ := s.InUse(ctx, "account", 2)
	if un != 1 || an != 1 {
		t.Fatalf("live request lost concurrency slot: user=%d account=%d held_entries=%d", un, an, len(s.held))
	}
}

// Accounting never stops a running request: a member that vanished is put back.
func TestRefreshRestoresLostSlots(t *testing.T) {
	ctx := context.Background()
	_, rdb := newRedis(t)
	c := newClock()
	s := NewSlots(rdb, newReg(rdb, c, "node-a", "boot-a"), SlotOptions{Now: c.Now})
	leaseCtx, release, ok, err := s.AcquireLease(ctx, "account", 2, 1, "inflight")
	if !ok || err != nil {
		t.Fatal(ok, err)
	}
	if err := rdb.Del(ctx, SlotKey("account", 2)).Err(); err != nil {
		t.Fatal(err)
	}
	if err := s.refresh(ctx); err != nil {
		t.Fatal(err)
	}
	if n, _ := s.InUse(ctx, "account", 2); n != 1 {
		t.Fatal("lost slot not counted again", n)
	}
	if leaseCtx.Err() != nil {
		t.Fatal("request canceled after slot loss", context.Cause(leaseCtx))
	}
	release()
	if n, _ := s.InUse(ctx, "account", 2); n != 0 {
		t.Fatal("restored slot not released", n)
	}
	if leaseCtx.Err() == nil {
		t.Fatal("lease context outlived its release")
	}
}

// A Redis failure while refreshing does not cancel the request either.
func TestRefreshErrorKeepsTheRequestRunning(t *testing.T) {
	ctx := context.Background()
	mr, rdb := newRedis(t)
	c := newClock()
	s := NewSlots(rdb, newReg(rdb, c, "node-a", "boot-a"), SlotOptions{Now: c.Now})
	leaseCtx, release, ok, err := s.AcquireLease(ctx, "account", 3, 1, "inflight")
	if !ok || err != nil {
		t.Fatal(ok, err)
	}
	defer release()
	mr.SetError("ERR down")
	if err := s.refresh(ctx); err == nil {
		t.Fatal("refresh hid the error")
	}
	mr.SetError("")
	if leaseCtx.Err() != nil {
		t.Fatal("request canceled by a refresh error", context.Cause(leaseCtx))
	}
	if err := s.refresh(ctx); err != nil {
		t.Fatal(err)
	}
	if n, _ := s.InUse(ctx, "account", 3); n != 1 {
		t.Fatal("slot lost", n)
	}
}

// A failed release is retried, so the account is not busy for a whole TTL.
func TestFailedReleaseIsRetried(t *testing.T) {
	ctx := context.Background()
	mr, rdb := newRedis(t)
	c := newClock()
	s := NewSlots(rdb, newReg(rdb, c, "node-a", "boot-a"), SlotOptions{Now: c.Now})
	_, release, ok, err := s.AcquireLease(ctx, "account", 4, 1, "inflight")
	if !ok || err != nil {
		t.Fatal(ok, err)
	}
	mr.SetError("ERR down")
	release()
	mr.SetError("")
	if n, _ := s.InUse(ctx, "account", 4); n != 1 {
		t.Fatal("the failed release should have left the member", n)
	}
	if err := s.refresh(ctx); err != nil {
		t.Fatal(err)
	}
	if n, _ := s.InUse(ctx, "account", 4); n != 0 {
		t.Fatal("release not retried", n)
	}
}

func TestRepeatedSlotReleaseDoesNotRemoveNewLease(t *testing.T) {
	ctx := context.Background()
	_, rdb := newRedis(t)
	c := newClock()
	s := NewSlots(rdb, newReg(rdb, c, "node-a", "boot-a"), SlotOptions{Now: c.Now})
	_, first, ok, err := s.AcquireLease(ctx, "account", 2, 0, "same")
	if err != nil || !ok {
		t.Fatal(ok, err)
	}
	secondCtx, second, ok, err := s.AcquireLease(ctx, "account", 2, 0, "same")
	if err != nil || !ok {
		t.Fatal(ok, err)
	}
	defer second()
	first()
	if n, _ := s.InUse(ctx, "account", 2); n != 1 {
		t.Fatalf("old release removed newer lease: %d", n)
	}
	if err := s.refresh(ctx); err != nil || secondCtx.Err() != nil {
		t.Fatal(err, secondCtx.Err())
	}
}
