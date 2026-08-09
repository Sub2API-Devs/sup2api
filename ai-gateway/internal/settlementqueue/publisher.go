// Package settlementqueue publishes durable usage settlements to NATS
// JetStream. The caller keeps its local WAL record until Publish receives a
// JetStream persistence acknowledgement.
package settlementqueue

import (
	"context"
	"fmt"
	"strings"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"google.golang.org/protobuf/proto"
)

type Publisher interface {
	Publish(context.Context, *controlv1.SettleRequestRequest) error
	Close() error
}

type JetStreamPublisher struct {
	connection *nats.Conn
	stream     jetstream.JetStream
	subject    string
}

func New(url, subject string, timeout time.Duration) (*JetStreamPublisher, error) {
	url = strings.TrimSpace(url)
	subject = strings.TrimSpace(subject)
	if url == "" || subject == "" {
		return nil, fmt.Errorf("NATS URL and settlement subject are required")
	}
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	connection, err := nats.Connect(url,
		nats.Name("sup2api-ai-gateway-usage-publisher"),
		nats.Timeout(timeout),
		nats.MaxReconnects(-1),
		nats.ReconnectWait(time.Second),
		nats.DrainTimeout(5*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("connect to NATS usage queue: %w", err)
	}
	stream, err := jetstream.New(connection)
	if err != nil {
		connection.Close()
		return nil, fmt.Errorf("open NATS JetStream context: %w", err)
	}
	return &JetStreamPublisher{connection: connection, stream: stream, subject: subject}, nil
}

func (p *JetStreamPublisher) Publish(ctx context.Context, request *controlv1.SettleRequestRequest) error {
	if p == nil || p.connection == nil || p.stream == nil || request == nil {
		return fmt.Errorf("NATS usage publisher is unavailable")
	}
	payload, err := proto.Marshal(request)
	if err != nil {
		return fmt.Errorf("encode usage settlement: %w", err)
	}
	messageID := strings.TrimSpace(request.GetDataPlaneId()) + ":" + strings.TrimSpace(request.GetRequestId())
	if _, err := p.stream.Publish(ctx, p.subject, payload, jetstream.WithMsgID(messageID)); err != nil {
		return fmt.Errorf("publish usage settlement to NATS: %w", err)
	}
	return nil
}

func (p *JetStreamPublisher) Close() error {
	if p == nil || p.connection == nil {
		return nil
	}
	if err := p.connection.Drain(); err != nil {
		p.connection.Close()
		return err
	}
	return nil
}
