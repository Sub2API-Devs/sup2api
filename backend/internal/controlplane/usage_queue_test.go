package controlplane

import (
	"context"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
)

type fakeUsageSettlementHandler struct {
	request  *controlv1.SettleRequestRequest
	response *controlv1.SettleRequestResponse
	err      error
	received chan *controlv1.SettleRequestRequest
}

func (f *fakeUsageSettlementHandler) SettleRequest(_ context.Context, request *controlv1.SettleRequestRequest) (*controlv1.SettleRequestResponse, error) {
	f.request = request
	if f.received != nil {
		f.received <- request
	}
	return f.response, f.err
}

func TestUsageQueueJetStreamIntegration(t *testing.T) {
	url := os.Getenv("NATS_TEST_URL")
	controlCredentials := os.Getenv("NATS_TEST_CONTROL_CREDS")
	workerCredentials := os.Getenv("NATS_TEST_WORKER_CREDS")
	if url == "" || controlCredentials == "" || workerCredentials == "" {
		t.Skip("NATS_TEST_URL, NATS_TEST_CONTROL_CREDS, and NATS_TEST_WORKER_CREDS are not configured")
	}
	suffix := time.Now().UnixNano()
	stream := fmt.Sprintf("TEST_USAGE_%d", suffix)
	subject := "sup2api.usage.settlements.v1"
	durable := fmt.Sprintf("test-usage-%d", suffix)
	handler := &fakeUsageSettlementHandler{
		response: &controlv1.SettleRequestResponse{Accepted: true},
		received: make(chan *controlv1.SettleRequestRequest, 1),
	}
	queue := &UsageQueue{cfg: config.UsageQueueConfig{
		Enabled: true, URL: url, CredentialsFile: controlCredentials, Stream: stream, Subject: subject, Durable: durable,
		MaxAgeHours: 1, MaxBytes: 1 << 20, AckWaitSeconds: 10, RetryDelaySeconds: 1, Consumers: 1,
	}, handler: handler}
	if err := queue.Start(context.Background()); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = queue.Stop(ctx)
	})
	connection, err := nats.Connect(url, nats.UserCredentials(workerCredentials))
	if err != nil {
		t.Fatal(err)
	}
	defer connection.Close()
	js, err := jetstream.New(connection)
	if err != nil {
		t.Fatal(err)
	}
	payload, _ := proto.Marshal(&controlv1.SettleRequestRequest{DataPlaneId: "worker-e2e", RequestId: "request-e2e"})
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := js.Publish(ctx, subject, payload); err != nil {
		t.Fatal(err)
	}
	select {
	case request := <-handler.received:
		if request.GetDataPlaneId() != "worker-e2e" || request.GetRequestId() != "request-e2e" {
			t.Fatalf("received = %+v", request)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("NATS usage settlement was not consumed")
	}
}

func TestUsageQueueProcessesProtobufSettlement(t *testing.T) {
	handler := &fakeUsageSettlementHandler{response: &controlv1.SettleRequestResponse{Accepted: true}}
	queue := &UsageQueue{handler: handler}
	payload, err := proto.Marshal(&controlv1.SettleRequestRequest{
		DataPlaneId: "worker-1", RequestId: "request-1", ServiceTier: "priority",
	})
	if err != nil {
		t.Fatal(err)
	}
	requestID, permanent, err := queue.processPayload(context.Background(), payload)
	if err != nil || permanent || requestID != "request-1" {
		t.Fatalf("requestID=%q permanent=%v err=%v", requestID, permanent, err)
	}
	if handler.request.GetDataPlaneId() != "worker-1" || handler.request.GetServiceTier() != "priority" {
		t.Fatalf("settlement = %+v", handler.request)
	}
}

func TestUsageQueueClassifiesPermanentAndTransientFailures(t *testing.T) {
	queue := &UsageQueue{handler: &fakeUsageSettlementHandler{err: status.Error(codes.FailedPrecondition, "bad facts")}}
	payload, _ := proto.Marshal(&controlv1.SettleRequestRequest{RequestId: "request-1"})
	_, permanent, err := queue.processPayload(context.Background(), payload)
	if err == nil || !permanent {
		t.Fatalf("permanent=%v err=%v", permanent, err)
	}
	queue.handler = &fakeUsageSettlementHandler{err: errors.New("database unavailable")}
	_, permanent, err = queue.processPayload(context.Background(), payload)
	if err == nil || permanent {
		t.Fatalf("permanent=%v err=%v", permanent, err)
	}
	if _, permanent, err = queue.processPayload(context.Background(), []byte("invalid")); err == nil || !permanent {
		t.Fatalf("malformed permanent=%v err=%v", permanent, err)
	}
}
