package controlplane

import (
	"context"
	"errors"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type workerLogBridgeRepository struct {
	workers map[string]*service.Worker
	err     error
}

func (r *workerLogBridgeRepository) CreateWorker(context.Context, *service.Worker) error { return nil }
func (r *workerLogBridgeRepository) ListWorkers(context.Context) ([]service.Worker, error) {
	return nil, nil
}
func (r *workerLogBridgeRepository) GetWorker(context.Context, int64) (*service.Worker, error) {
	return nil, nil
}
func (r *workerLogBridgeRepository) GetWorkerByRemoteID(_ context.Context, id string) (*service.Worker, error) {
	if r.err != nil {
		return nil, r.err
	}
	return r.workers[id], nil
}
func (r *workerLogBridgeRepository) DeleteWorker(context.Context, int64) error { return nil }
func (r *workerLogBridgeRepository) UpdateWorkerObservation(context.Context, int64, service.WorkerIdentity, string, *string) error {
	return nil
}
func (r *workerLogBridgeRepository) UpsertWorkerAccount(context.Context, *service.WorkerAccount) error {
	return nil
}
func (r *workerLogBridgeRepository) DeleteWorkerAccount(context.Context, int64, string) error {
	return nil
}
func (r *workerLogBridgeRepository) DeleteWorkerAccountsExcept(context.Context, int64, []string) error {
	return nil
}
func (r *workerLogBridgeRepository) ListWorkerAccounts(context.Context, int64) ([]service.WorkerAccount, error) {
	return nil, nil
}
func (r *workerLogBridgeRepository) InsertWorkerLog(context.Context, *service.WorkerLog) error {
	return nil
}
func (r *workerLogBridgeRepository) ListWorkerLogs(context.Context, int64, int, int64) ([]service.WorkerLog, error) {
	return nil, nil
}

func TestWorkerLogBridgeRoutesEachWorkerToItsOwnStream(t *testing.T) {
	mini := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	repo := &workerLogBridgeRepository{workers: map[string]*service.Worker{
		"worker-a": {ID: 1, RemoteWorkerID: "worker-a", LogStreamKey: "logs:worker-a"},
		"worker-b": {ID: 2, RemoteWorkerID: "worker-b", LogStreamKey: "logs:worker-b"},
	}}
	bridge := NewWorkerLogBridge(repo, client)

	for _, item := range []struct {
		workerID, instanceID, requestID string
	}{
		{"worker-a", "instance-a", "request-a"},
		{"worker-b", "instance-b", "request-b"},
	} {
		if err := bridge.Publish(context.Background(), workerSettlement(item.workerID, item.instanceID, item.requestID)); err != nil {
			t.Fatal(err)
		}
	}

	for _, item := range []struct {
		stream, workerID, instanceID, requestID string
	}{
		{"logs:worker-a", "worker-a", "instance-a", "request-a"},
		{"logs:worker-b", "worker-b", "instance-b", "request-b"},
	} {
		messages, err := client.XRange(context.Background(), item.stream, "-", "+").Result()
		if err != nil {
			t.Fatal(err)
		}
		if len(messages) != 1 || messages[0].Values["worker_id"] != item.workerID ||
			messages[0].Values["instance_id"] != item.instanceID || messages[0].Values["request_id"] != item.requestID {
			t.Fatalf("stream %s was not Worker-isolated: %+v", item.stream, messages)
		}
	}
	if count, err := client.XLen(context.Background(), "logs:worker-a").Result(); err != nil || count != 1 {
		t.Fatalf("worker A stream count=%d err=%v", count, err)
	}
	if count, err := client.XLen(context.Background(), "logs:worker-b").Result(); err != nil || count != 1 {
		t.Fatalf("worker B stream count=%d err=%v", count, err)
	}
}

func TestWorkerLogBridgeSkipsUnregisteredDataPlane(t *testing.T) {
	mini := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	bridge := NewWorkerLogBridge(&workerLogBridgeRepository{workers: map[string]*service.Worker{}}, client)
	if err := bridge.Publish(context.Background(), workerSettlement("legacy-data-plane", "instance", "request")); err != nil {
		t.Fatal(err)
	}
	if keys := mini.Keys(); len(keys) != 0 {
		t.Fatalf("unregistered data plane created Redis keys: %v", keys)
	}
}

func TestWorkerLogBridgePropagatesRepositoryAndRedisFailures(t *testing.T) {
	request := workerSettlement("worker-a", "instance-a", "request-a")
	bridge := NewWorkerLogBridge(&workerLogBridgeRepository{err: errors.New("database unavailable")}, redis.NewClient(&redis.Options{Addr: "127.0.0.1:1"}))
	if err := bridge.Publish(context.Background(), request); err == nil {
		t.Fatal("repository failure was swallowed")
	}

	mini := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	mini.Close()
	bridge = NewWorkerLogBridge(&workerLogBridgeRepository{workers: map[string]*service.Worker{
		"worker-a": {ID: 1, RemoteWorkerID: "worker-a", LogStreamKey: "logs:worker-a"},
	}}, client)
	if err := bridge.Publish(context.Background(), request); err == nil {
		t.Fatal("Redis failure was swallowed")
	}
}

func TestRPCSettlementReturnsUnavailableWhenWorkerStreamPublishFails(t *testing.T) {
	settlementRedis := miniredis.RunT(t)
	settlementClient := redis.NewClient(&redis.Options{Addr: settlementRedis.Addr()})
	t.Cleanup(func() { _ = settlementClient.Close() })
	store := NewLeaseStore(&config.Config{DataPlaneControl: config.DataPlaneControlConfig{LeaseTTLSeconds: 60}}, settlementClient, nil)
	record := testLeaseRecord("lease-worker", "request-worker", 10)
	record.DataPlaneID = "worker-a"
	if _, _, err := store.Create(context.Background(), record, 100); err != nil {
		t.Fatal(err)
	}
	if _, _, err := store.Release(context.Background(), record.LeaseID, "aborted"); err != nil {
		t.Fatal(err)
	}

	failedRedis := miniredis.RunT(t)
	failedClient := redis.NewClient(&redis.Options{Addr: failedRedis.Addr()})
	failedRedis.Close()
	serviceRPC := &RPCService{
		settlement: &SettlementController{rdb: settlementClient, leases: store},
		workerLogs: NewWorkerLogBridge(&workerLogBridgeRepository{workers: map[string]*service.Worker{
			"worker-a": {ID: 1, RemoteWorkerID: "worker-a", LogStreamKey: "logs:worker-a"},
		}}, failedClient),
	}
	request := workerSettlement("worker-a", "instance-a", record.RequestID)
	request.AccountId = record.AccountID
	request.RequestedModel = record.RequestedModel
	request.MappedModel = record.MappedModel
	request.PricingVersion = record.PricingVersion
	_, err := serviceRPC.SettleRequest(context.Background(), request)
	if status.Code(err) != codes.Unavailable {
		t.Fatalf("settlement should keep Worker WAL pending on Redis failure: %v", err)
	}
}

func workerSettlement(workerID, instanceID, requestID string) *controlv1.SettleRequestRequest {
	return &controlv1.SettleRequestRequest{
		DataPlaneId: workerID, DataPlaneInstanceId: instanceID, RequestId: requestID,
		LeaseId: "lease-worker", AccountId: 42, RequestedModel: "gpt-client", MappedModel: "gpt-upstream",
		PricingVersion: "pricing-v1", StartedAtUnixMs: 1000, FirstByteAtUnixMs: 1100, FinishedAtUnixMs: 1300,
		Usage:    &controlv1.Usage{InputTokens: 2, OutputTokens: 3, ResponseBytes: 50},
		Upstream: &controlv1.UpstreamResult{StatusCode: 200, Attempts: 1},
	}
}
