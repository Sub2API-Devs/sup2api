package settlementqueue

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"google.golang.org/protobuf/proto"
)

func TestPublisherJetStreamIntegration(t *testing.T) {
	url := os.Getenv("NATS_TEST_URL")
	controlCredentialsPath := os.Getenv("NATS_TEST_CONTROL_CREDS")
	workerCredentialsPath := os.Getenv("NATS_TEST_WORKER_CREDS")
	if url == "" || controlCredentialsPath == "" || workerCredentialsPath == "" {
		t.Skip("NATS_TEST_URL, NATS_TEST_CONTROL_CREDS, and NATS_TEST_WORKER_CREDS are not configured")
	}
	credentials, err := os.ReadFile(workerCredentialsPath)
	if err != nil {
		t.Fatal(err)
	}
	suffix := time.Now().UnixNano()
	streamName := fmt.Sprintf("TEST_PUBLISHER_%d", suffix)
	subject := "sup2api.usage.settlements.v1"
	connection, err := nats.Connect(url, nats.UserCredentials(controlCredentialsPath))
	if err != nil {
		t.Fatal(err)
	}
	defer connection.Close()
	js, err := jetstream.New(connection)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	stream, err := js.CreateStream(ctx, jetstream.StreamConfig{Name: streamName, Subjects: []string{subject}, Storage: jetstream.FileStorage, MaxBytes: 1 << 20})
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = js.DeleteStream(ctx, streamName) }()
	publisher, err := New(url, subject, string(credentials), time.Second)
	if err != nil {
		t.Fatal(err)
	}
	defer publisher.Close()
	request := &controlv1.SettleRequestRequest{DataPlaneId: "worker-1", RequestId: "request-1", LeaseId: "lease-1"}
	if err := publisher.Publish(ctx, request); err != nil {
		t.Fatal(err)
	}
	stored, err := stream.GetLastMsgForSubject(ctx, subject)
	if err != nil {
		t.Fatal(err)
	}
	decoded := new(controlv1.SettleRequestRequest)
	if err := proto.Unmarshal(stored.Data, decoded); err != nil {
		t.Fatal(err)
	}
	if decoded.GetDataPlaneId() != "worker-1" || decoded.GetRequestId() != "request-1" {
		t.Fatalf("stored settlement = %+v", decoded)
	}
}
