package runtime

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/controlplane"
)

type fakeControlClient struct {
	resolveCalls atomic.Int32
	settled      chan *controlv1.SettleRequestRequest
}

type fakeSettlementPublisher struct {
	published chan *controlv1.SettleRequestRequest
}

func (f *fakeSettlementPublisher) Publish(_ context.Context, request *controlv1.SettleRequestRequest) error {
	f.published <- request
	return nil
}

func (*fakeSettlementPublisher) Close() error { return nil }

func (*fakeControlClient) Ready() bool { return true }

func (f *fakeControlClient) ResolveAPIKey(_ context.Context, request *controlv1.ResolveAPIKeyRequest) (*controlv1.ResolveAPIKeyResponse, error) {
	f.resolveCalls.Add(1)
	return &controlv1.ResolveAPIKeyResponse{
		Decision: controlv1.Decision_DECISION_ALLOW,
		Grant: &controlv1.AuthGrant{
			GrantToken:       "grant-1",
			CredentialDigest: credentialDigest(request.GetApiKey()),
			ApiKeyId:         1,
			UserId:           2,
			GroupId:          3,
			ExpiresAtUnixMs:  time.Now().Add(time.Minute).UnixMilli(),
		},
	}, nil
}
func (f *fakeControlClient) RenewAuthGrant(_ context.Context, request *controlv1.RenewAuthGrantRequest) (*controlv1.ResolveAPIKeyResponse, error) {
	return &controlv1.ResolveAPIKeyResponse{Decision: controlv1.Decision_DECISION_ALLOW, Grant: &controlv1.AuthGrant{
		GrantToken: request.GetGrantToken() + "-renewed", CredentialDigest: "digest", ApiKeyId: 1, UserId: 2, GroupId: 3,
		ExpiresAtUnixMs: time.Now().Add(time.Minute).UnixMilli(),
	}}, nil
}

func (*fakeControlClient) OpenRequest(context.Context, *controlv1.OpenRequestRequest) (*controlv1.OpenRequestResponse, error) {
	return nil, nil
}
func (*fakeControlClient) SignBedrockRequest(context.Context, *controlv1.SignBedrockRequestRequest) (*controlv1.SignBedrockRequestResponse, error) {
	return nil, nil
}

func (*fakeControlClient) RenewLease(context.Context, *controlv1.RenewLeaseRequest) (*controlv1.RenewLeaseResponse, error) {
	return nil, nil
}

func (*fakeControlClient) AbortRequest(context.Context, *controlv1.AbortRequestRequest) (*controlv1.AbortRequestResponse, error) {
	return nil, nil
}

func (f *fakeControlClient) SettleRequest(_ context.Context, request *controlv1.SettleRequestRequest) (*controlv1.SettleRequestResponse, error) {
	if f.settled != nil {
		f.settled <- request
	}
	return &controlv1.SettleRequestResponse{Accepted: true}, nil
}

func TestSettlementPersistsBeforeDeliveryAndDeletesAfterAck(t *testing.T) {
	client := &fakeControlClient{settled: make(chan *controlv1.SettleRequestRequest, 1)}
	runtime, err := NewWithClient(testConfig(t, 1<<20), nil, client)
	if err != nil {
		t.Fatalf("NewWithClient: %v", err)
	}
	request := &controlv1.SettleRequestRequest{RequestId: "request-1", LeaseId: "lease-1"}
	if err := runtime.SubmitSettlement(request); err != nil {
		t.Fatalf("SubmitSettlement: %v", err)
	}
	records, err := runtime.wal.List()
	if err != nil || len(records) != 1 {
		t.Fatalf("persisted records=%d err=%v", len(records), err)
	}

	runtime.drainSettlements()
	delivered := <-client.settled
	if delivered.GetDataPlaneId() != "node-1" || delivered.GetLeaseId() != "lease-1" {
		t.Fatalf("delivered settlement = %+v", delivered)
	}
	records, err = runtime.wal.List()
	if err != nil || len(records) != 0 {
		t.Fatalf("records after ack=%d err=%v", len(records), err)
	}
}

func TestSettlementWALReplaysAfterRuntimeRestart(t *testing.T) {
	dir := t.TempDir()
	cfg := Config{
		NodeID: "node-restarted", ControlPlaneTarget: "test",
		DialTimeout: time.Second, RequestTimeout: time.Second,
		SettlementWALPath: dir, SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	}
	beforeRestart, err := NewWithClient(cfg, nil, new(fakeControlClient))
	if err != nil {
		t.Fatalf("create first runtime: %v", err)
	}
	if err := beforeRestart.SubmitSettlement(&controlv1.SettleRequestRequest{RequestId: "request-restart", LeaseId: "lease-restart"}); err != nil {
		t.Fatalf("persist before restart: %v", err)
	}

	afterClient := &fakeControlClient{settled: make(chan *controlv1.SettleRequestRequest, 1)}
	afterRestart, err := NewWithClient(cfg, nil, afterClient)
	if err != nil {
		t.Fatalf("create restarted runtime: %v", err)
	}
	afterRestart.drainSettlements()
	select {
	case delivered := <-afterClient.settled:
		if delivered.GetRequestId() != "request-restart" || delivered.GetDataPlaneId() != "node-restarted" {
			t.Fatalf("replayed settlement = %+v", delivered)
		}
	case <-time.After(time.Second):
		t.Fatal("persisted settlement was not replayed after restart")
	}
	if records, err := afterRestart.wal.List(); err != nil || len(records) != 0 {
		t.Fatalf("WAL after replay records=%d err=%v", len(records), err)
	}
}

func TestSettlementUsesNATSQueuePublisherWhenConfigured(t *testing.T) {
	client := &fakeControlClient{settled: make(chan *controlv1.SettleRequestRequest, 1)}
	runtime, err := NewWithClient(testConfig(t, 1<<20), nil, client)
	if err != nil {
		t.Fatal(err)
	}
	publisher := &fakeSettlementPublisher{published: make(chan *controlv1.SettleRequestRequest, 1)}
	runtime.settlements = publisher
	if err := runtime.SubmitSettlement(&controlv1.SettleRequestRequest{RequestId: "request-nats", LeaseId: "lease-nats"}); err != nil {
		t.Fatal(err)
	}
	runtime.drainSettlements()
	select {
	case delivered := <-publisher.published:
		if delivered.GetRequestId() != "request-nats" || delivered.GetDataPlaneId() != "node-1" {
			t.Fatalf("published settlement = %+v", delivered)
		}
	case <-time.After(time.Second):
		t.Fatal("settlement was not published to NATS")
	}
	select {
	case <-client.settled:
		t.Fatal("NATS settlement also used the direct gRPC path")
	default:
	}
}

func TestSettlementWALFullFailsReadinessAndAdmissionClosed(t *testing.T) {
	runtime, err := NewWithClient(testConfig(t, 1), nil, new(fakeControlClient))
	if err != nil {
		t.Fatalf("NewWithClient: %v", err)
	}
	err = runtime.SubmitSettlement(&controlv1.SettleRequestRequest{RequestId: "request-1", LeaseId: "lease-1"})
	if !errors.Is(err, ErrBillingWALUnavailable) {
		t.Fatalf("SubmitSettlement error = %v", err)
	}
	if runtime.Ready() {
		t.Fatal("runtime with a full billing WAL must not be ready")
	}
	runtime.drainSettlements()
	if runtime.Ready() {
		t.Fatal("an empty retry scan must not clear a WAL write failure")
	}
	if _, err := runtime.OpenRequest(context.Background(), &controlv1.OpenRequestRequest{}); !errors.Is(err, ErrBillingWALUnavailable) {
		t.Fatalf("OpenRequest error = %v", err)
	}
}

func testConfig(t *testing.T, walMaxBytes int64) Config {
	t.Helper()
	return Config{
		NodeID:                "node-1",
		ControlPlaneTarget:    "test",
		DialTimeout:           time.Second,
		RequestTimeout:        time.Second,
		SettlementWALPath:     t.TempDir(),
		SettlementWALMaxBytes: walMaxBytes,
		AuthCacheTTL:          time.Minute,
		AuthCacheSize:         8,
	}
}

func (*fakeControlClient) WatchInvalidations(context.Context, *controlv1.WatchInvalidationsRequest) (controlplane.InvalidationStream, error) {
	return nil, nil
}

func (*fakeControlClient) Close() error { return nil }

func TestResolveAPIKeyCachesAndInvalidatesGrant(t *testing.T) {
	client := new(fakeControlClient)
	runtime, err := NewWithClient(Config{
		NodeID:                "node-1",
		ControlPlaneTarget:    "test",
		DialTimeout:           time.Second,
		RequestTimeout:        time.Second,
		SettlementWALPath:     t.TempDir(),
		SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL:          time.Minute,
		AuthCacheSize:         8,
	}, nil, client)
	if err != nil {
		t.Fatalf("NewWithClient: %v", err)
	}

	first, cached, err := runtime.ResolveAPIKey(context.Background(), "request-1", "client-key")
	if err != nil || cached || first.GetGrant().GetGrantToken() != "grant-1" {
		t.Fatalf("first resolve: cached=%v response=%+v err=%v", cached, first, err)
	}
	_, cached, err = runtime.ResolveAPIKey(context.Background(), "request-2", "client-key")
	if err != nil || !cached || client.resolveCalls.Load() != 1 {
		t.Fatalf("cached resolve: cached=%v calls=%d err=%v", cached, client.resolveCalls.Load(), err)
	}

	runtime.auth.Invalidate(&controlv1.InvalidationEvent{
		Kind:    controlv1.InvalidationKind_INVALIDATION_KIND_API_KEY,
		Subject: credentialDigest("client-key"),
	})
	_, cached, err = runtime.ResolveAPIKey(context.Background(), "request-3", "client-key")
	if err != nil || cached || client.resolveCalls.Load() != 2 {
		t.Fatalf("post-invalidation resolve: cached=%v calls=%d err=%v", cached, client.resolveCalls.Load(), err)
	}
}
