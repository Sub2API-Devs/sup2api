package controlplane

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
)

type usageSettlementHandler interface {
	SettleRequest(context.Context, *controlv1.SettleRequestRequest) (*controlv1.SettleRequestResponse, error)
}

// UsageQueue consumes Worker usage settlements from a durable NATS JetStream
// consumer. Messages are acknowledged only after authoritative billing and
// usage_logs persistence succeed.
type UsageQueue struct {
	cfg     config.UsageQueueConfig
	handler usageSettlementHandler

	mu         sync.Mutex
	connection *nats.Conn
	consumers  []jetstream.ConsumeContext
}

func NewUsageQueue(cfg *config.Config, handler *RPCService) *UsageQueue {
	if cfg == nil {
		return &UsageQueue{}
	}
	return &UsageQueue{cfg: cfg.UsageQueue, handler: handler}
}

func (q *UsageQueue) Enabled() bool { return q != nil && q.cfg.Enabled }

func (q *UsageQueue) Start(ctx context.Context) error {
	if !q.Enabled() {
		return nil
	}
	if q.handler == nil {
		return fmt.Errorf("usage settlement handler is unavailable")
	}
	q.mu.Lock()
	defer q.mu.Unlock()
	if q.connection != nil {
		return nil
	}
	connection, err := nats.Connect(q.cfg.URL,
		nats.Name("sup2api-usage-settlement-consumer"),
		nats.Timeout(5*time.Second),
		nats.MaxReconnects(-1),
		nats.ReconnectWait(time.Second),
		nats.DrainTimeout(5*time.Second),
	)
	if err != nil {
		return fmt.Errorf("connect to NATS usage queue: %w", err)
	}
	js, err := jetstream.New(connection)
	if err != nil {
		connection.Close()
		return fmt.Errorf("open NATS JetStream context: %w", err)
	}
	startCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	_, err = js.CreateOrUpdateStream(startCtx, jetstream.StreamConfig{
		Name: q.cfg.Stream, Description: "Sup2API canonical Worker usage settlements",
		Subjects: []string{q.cfg.Subject}, Retention: jetstream.WorkQueuePolicy,
		MaxBytes: q.cfg.MaxBytes, MaxAge: time.Duration(q.cfg.MaxAgeHours) * time.Hour,
		MaxMsgSize: 1 << 20, Storage: jetstream.FileStorage, Replicas: 1,
		Discard: jetstream.DiscardNew, Duplicates: time.Duration(q.cfg.MaxAgeHours) * time.Hour,
	})
	if err != nil {
		connection.Close()
		return fmt.Errorf("provision NATS usage stream: %w", err)
	}
	consumer, err := js.CreateOrUpdateConsumer(startCtx, q.cfg.Stream, jetstream.ConsumerConfig{
		Name: q.cfg.Durable, Durable: q.cfg.Durable,
		Description:   "Sup2API authoritative usage settlement subscriber",
		FilterSubject: q.cfg.Subject, AckPolicy: jetstream.AckExplicitPolicy,
		AckWait:    time.Duration(q.cfg.AckWaitSeconds) * time.Second,
		MaxDeliver: -1, MaxAckPending: max(32, q.cfg.Consumers*2),
	})
	if err != nil {
		connection.Close()
		return fmt.Errorf("provision NATS usage consumer: %w", err)
	}
	consumeContexts := make([]jetstream.ConsumeContext, 0, q.cfg.Consumers)
	for range q.cfg.Consumers {
		consumeContext, err := consumer.Consume(q.handleMessage,
			jetstream.PullMaxMessages(1),
			jetstream.ConsumeErrHandler(func(_ jetstream.ConsumeContext, err error) {
				if err != nil && !errors.Is(err, context.Canceled) {
					slog.Error("NATS usage consumer error", "error", err)
				}
			}),
		)
		if err != nil {
			for _, started := range consumeContexts {
				started.Stop()
			}
			connection.Close()
			return fmt.Errorf("start NATS usage consumer: %w", err)
		}
		consumeContexts = append(consumeContexts, consumeContext)
	}
	q.connection = connection
	q.consumers = consumeContexts
	return nil
}

func (q *UsageQueue) handleMessage(message jetstream.Msg) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(q.cfg.AckWaitSeconds)*time.Second)
	defer cancel()
	requestID, permanent, err := q.processPayload(ctx, message.Data())
	if err == nil {
		ackCtx, ackCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer ackCancel()
		if err := message.DoubleAck(ackCtx); err != nil {
			slog.Error("NATS usage settlement acknowledgement failed", "request_id", requestID, "error", err)
		}
		return
	}
	if permanent {
		slog.Error("discarding permanently invalid NATS usage settlement", "request_id", requestID, "error", err)
		_ = message.TermWithReason("permanent settlement rejection")
		return
	}
	slog.Error("NATS usage settlement failed; scheduling redelivery", "request_id", requestID, "error", err)
	_ = message.NakWithDelay(time.Duration(q.cfg.RetryDelaySeconds) * time.Second)
}

func (q *UsageQueue) processPayload(ctx context.Context, payload []byte) (requestID string, permanent bool, err error) {
	request := new(controlv1.SettleRequestRequest)
	if err := proto.Unmarshal(payload, request); err != nil {
		return "", true, fmt.Errorf("decode usage settlement protobuf: %w", err)
	}
	response, err := q.handler.SettleRequest(ctx, request)
	if err == nil && response != nil && (response.GetAccepted() || response.GetDuplicate()) {
		return request.GetRequestId(), false, nil
	}
	if err == nil {
		err = fmt.Errorf("settlement was not acknowledged")
	}
	return request.GetRequestId(), permanentSettlementError(err), err
}

func permanentSettlementError(err error) bool {
	switch status.Code(err) {
	case codes.InvalidArgument, codes.PermissionDenied, codes.FailedPrecondition, codes.NotFound:
		return true
	default:
		return false
	}
}

func (q *UsageQueue) Stop(ctx context.Context) error {
	if q == nil {
		return nil
	}
	q.mu.Lock()
	consumers := q.consumers
	connection := q.connection
	q.consumers = nil
	q.connection = nil
	q.mu.Unlock()
	for _, consumer := range consumers {
		consumer.Drain()
	}
	for _, consumer := range consumers {
		select {
		case <-consumer.Closed():
		case <-ctx.Done():
			consumer.Stop()
		}
	}
	if connection == nil {
		return nil
	}
	if err := connection.Drain(); err != nil {
		connection.Close()
		return err
	}
	return nil
}
