package controlplane

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestLeaseRPCsRenewOwnershipAndAbortIdempotently(t *testing.T) {
	mini := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	defer rdb.Close()
	store := NewLeaseStore(&config.Config{DataPlaneControl: config.DataPlaneControlConfig{LeaseTTLSeconds: 60}}, rdb, nil)
	record := testLeaseRecord("lease-1", "request-1", 10)
	if _, _, err := store.Create(context.Background(), record, 100); err != nil {
		t.Fatalf("Create: %v", err)
	}
	rpc := &RPCService{leases: store}
	wrong := &controlv1.RenewLeaseRequest{DataPlaneId: "other", RequestId: "request-1", LeaseId: "lease-1"}
	if _, err := rpc.RenewLease(context.Background(), wrong); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("wrong owner error = %v", err)
	}
	renewed, err := rpc.RenewLease(context.Background(), &controlv1.RenewLeaseRequest{DataPlaneId: "node-1", RequestId: "request-1", LeaseId: "lease-1"})
	if err != nil || !renewed.GetRenewed() || renewed.GetExpiresAtUnixMs() <= 0 {
		t.Fatalf("RenewLease response=%+v err=%v", renewed, err)
	}
	aborted, err := rpc.AbortRequest(context.Background(), &controlv1.AbortRequestRequest{DataPlaneId: "node-1", RequestId: "request-1", LeaseId: "lease-1"})
	if err != nil || !aborted.GetReleased() {
		t.Fatalf("AbortRequest response=%+v err=%v", aborted, err)
	}
	again, err := rpc.AbortRequest(context.Background(), &controlv1.AbortRequestRequest{DataPlaneId: "node-1", RequestId: "request-1", LeaseId: "lease-1"})
	if err != nil || again.GetReleased() {
		t.Fatalf("second AbortRequest response=%+v err=%v", again, err)
	}
}
