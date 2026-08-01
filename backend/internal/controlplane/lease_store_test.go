package controlplane

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestLeaseStoreAtomicallyReservesDeduplicatesAndReleases(t *testing.T) {
	mini := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	defer rdb.Close()
	store := NewLeaseStore(&config.Config{DataPlaneControl: config.DataPlaneControlConfig{LeaseTTLSeconds: 60}}, rdb, nil)
	ctx := context.Background()
	first := testLeaseRecord("lease-1", "request-1", 60)
	created, fresh, err := store.Create(ctx, first, 100)
	if err != nil || !fresh || created.LeaseID != "lease-1" {
		t.Fatalf("first Create record=%+v fresh=%v err=%v", created, fresh, err)
	}
	duplicate, fresh, err := store.Create(ctx, testLeaseRecord("other", "request-1", 60), 100)
	if err != nil || fresh || duplicate.LeaseID != "lease-1" {
		t.Fatalf("duplicate Create record=%+v fresh=%v err=%v", duplicate, fresh, err)
	}
	if _, _, err := store.Create(ctx, testLeaseRecord("lease-2", "request-2", 50), 100); !errors.Is(err, ErrReservationExceeded) {
		t.Fatalf("over-reservation error = %v", err)
	}
	if _, released, err := store.Release(ctx, "lease-1", "aborted"); err != nil || !released {
		t.Fatalf("Release released=%v err=%v", released, err)
	}
	archived, err := store.LoadArchived(ctx, "lease-1")
	if err != nil || archived.ReleaseReason != "aborted" {
		t.Fatalf("archived=%+v err=%v", archived, err)
	}
	if _, fresh, err := store.Create(ctx, testLeaseRecord("lease-2", "request-2", 50), 100); err != nil || !fresh {
		t.Fatalf("Create after release fresh=%v err=%v", fresh, err)
	}
}

func TestLeaseStoreSweepsExpiredReservation(t *testing.T) {
	mini := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	defer rdb.Close()
	store := NewLeaseStore(&config.Config{DataPlaneControl: config.DataPlaneControlConfig{LeaseTTLSeconds: 15}}, rdb, nil)
	if _, _, err := store.Create(context.Background(), testLeaseRecord("lease-1", "request-1", 60), 100); err != nil {
		t.Fatalf("Create: %v", err)
	}
	released, err := store.SweepExpired(context.Background(), time.Now().Add(time.Minute), 10)
	if err != nil || released != 1 {
		t.Fatalf("SweepExpired released=%d err=%v", released, err)
	}
}

func TestLeaseStoreRecoversActiveAndArchivedRecordsAfterProcessRestart(t *testing.T) {
	mini := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	defer rdb.Close()
	cfg := &config.Config{DataPlaneControl: config.DataPlaneControlConfig{LeaseTTLSeconds: 60}}
	beforeRestart := NewLeaseStore(cfg, rdb, nil)
	ctx := context.Background()
	if _, fresh, err := beforeRestart.Create(ctx, testLeaseRecord("lease-active", "request-active", 40), 100); err != nil || !fresh {
		t.Fatalf("create active lease fresh=%v err=%v", fresh, err)
	}
	if _, fresh, err := beforeRestart.Create(ctx, testLeaseRecord("lease-archived", "request-archived", 20), 100); err != nil || !fresh {
		t.Fatalf("create archived lease fresh=%v err=%v", fresh, err)
	}
	if _, released, err := beforeRestart.Release(ctx, "lease-archived", "expired"); err != nil || !released {
		t.Fatalf("archive lease released=%v err=%v", released, err)
	}

	afterRestart := NewLeaseStore(cfg, rdb, nil)
	active, err := afterRestart.Load(ctx, "lease-active")
	if err != nil || active.RequestID != "request-active" {
		t.Fatalf("recovered active lease=%+v err=%v", active, err)
	}
	archived, err := afterRestart.LoadArchived(ctx, "lease-archived")
	if err != nil || archived.ReleaseReason != "expired" || archived.RequestID != "request-archived" {
		t.Fatalf("recovered archived lease=%+v err=%v", archived, err)
	}
	duplicate, fresh, err := afterRestart.Create(ctx, testLeaseRecord("replacement", "request-active", 1), 100)
	if err != nil || fresh || duplicate.LeaseID != "lease-active" {
		t.Fatalf("restart idempotency record=%+v fresh=%v err=%v", duplicate, fresh, err)
	}
}

func testLeaseRecord(leaseID, requestID string, amount int64) *LeaseRecord {
	return &LeaseRecord{
		LeaseID: leaseID, RequestID: requestID, DataPlaneID: "node-1",
		APIKeyID: 1, UserID: 2, AccountID: 3,
		ReservationKey: "user:2", ReservedAmountMicrousd: amount,
	}
}
