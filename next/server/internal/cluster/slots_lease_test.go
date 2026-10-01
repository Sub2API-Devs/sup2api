package cluster

import (
	"context"
	"errors"
	"github.com/redis/go-redis/v9"
	"net"
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
func TestRefreshDetectsLostSlots(t *testing.T) {
	ctx := context.Background()
	_, rdb := newRedis(t)
	c := newClock()
	s := NewSlots(rdb, newReg(rdb, c, "node-a", "boot-a"), SlotOptions{Now: c.Now})
	leaseCtx, release, ok, err := s.AcquireLease(ctx, "account", 2, 1, "inflight")
	if !ok || err != nil {
		t.Fatal(ok, err)
	}
	defer release()
	if err := rdb.Del(ctx, SlotKey("account", 2)).Err(); err != nil {
		t.Fatal(err)
	}
	err = s.refresh(ctx)
	n, _ := s.InUse(ctx, "account", 2)
	if err == nil && n == 0 {
		t.Fatal("refresh reports success after losing a live request slot; existing request receives no failure signal")
	}
	if !errors.Is(context.Cause(leaseCtx), ErrSlotLost) {
		t.Fatalf("request not canceled after slot loss: %v", context.Cause(leaseCtx))
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

type delayedSlotReply struct{ delay time.Duration }

func (h delayedSlotReply) DialHook(next redis.DialHook) redis.DialHook {
	return func(ctx context.Context, network, addr string) (net.Conn, error) { return next(ctx, network, addr) }
}
func (h delayedSlotReply) ProcessHook(next redis.ProcessHook) redis.ProcessHook {
	return func(ctx context.Context, cmd redis.Cmder) error {
		err := next(ctx, cmd)
		if err == nil && (cmd.Name() == "eval" || cmd.Name() == "evalsha") {
			time.Sleep(h.delay)
		}
		return err
	}
}
func (h delayedSlotReply) ProcessPipelineHook(next redis.ProcessPipelineHook) redis.ProcessPipelineHook {
	return next
}
func TestSlowAcquireReplyDoesNotExtendLocalLease(t *testing.T) {
	ctx := context.Background()
	_, rdb := newRedis(t)
	c := newClock()
	rdb.AddHook(delayedSlotReply{100 * time.Millisecond})
	s := NewSlots(rdb, newReg(rdb, c, "node-a", "boot-a"), SlotOptions{TTL: 50 * time.Millisecond})
	leaseCtx, release, ok, err := s.AcquireLease(ctx, "account", 2, 1, "slow")
	if err != nil || !ok {
		t.Fatal(ok, err)
	}
	defer release()
	if !errors.Is(context.Cause(leaseCtx), ErrSlotLost) {
		t.Fatal("expired lease accepted after delayed Redis reply")
	}
}
