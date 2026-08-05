package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

const workerLogConsumerGroup = "sub2api-worker-logs-v1"

const workerLogClaimIdle = 30 * time.Second

var errWorkerLogIdentityMismatch = errors.New("worker log identity mismatch")

type WorkerLogConsumer struct {
	repo     WorkerRepository
	redis    *redis.Client
	consumer string
	cancel   context.CancelFunc
	done     chan struct{}
	once     sync.Once
}

func NewWorkerLogConsumer(repo WorkerRepository, redisClient *redis.Client) *WorkerLogConsumer {
	host, _ := os.Hostname()
	consumer := fmt.Sprintf("%s-%d", host, os.Getpid())
	ctx, cancel := context.WithCancel(context.Background())
	c := &WorkerLogConsumer{
		repo: repo, redis: redisClient, consumer: consumer,
		cancel: cancel, done: make(chan struct{}),
	}
	go c.run(ctx)
	return c
}

func (c *WorkerLogConsumer) Close(timeout time.Duration) {
	if c == nil {
		return
	}
	c.once.Do(func() {
		c.cancel()
		if timeout <= 0 {
			<-c.done
			return
		}
		select {
		case <-c.done:
		case <-time.After(timeout):
		}
	})
}

func (c *WorkerLogConsumer) run(ctx context.Context) {
	defer close(c.done)
	if c.repo == nil || c.redis == nil {
		return
	}
	for ctx.Err() == nil {
		workers, err := c.repo.ListWorkers(ctx)
		if err != nil {
			slog.Warn("worker log consumer: list workers failed", "error", err)
			waitWorkerLogConsumer(ctx, 3*time.Second)
			continue
		}
		streams, workerByStream := c.prepareStreams(ctx, workers)
		if len(streams) == 0 {
			waitWorkerLogConsumer(ctx, 3*time.Second)
			continue
		}
		for _, stream := range streams {
			worker := workerByStream[stream]
			c.claimPending(ctx, stream, worker)
		}
		readStreams := append(append([]string(nil), streams...), make([]string, len(streams))...)
		for i := len(streams); i < len(readStreams); i++ {
			readStreams[i] = ">"
		}
		results, err := c.redis.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group: workerLogConsumerGroup, Consumer: c.consumer,
			Streams: readStreams, Count: 200, Block: 3 * time.Second,
		}).Result()
		if err != nil && err != redis.Nil && ctx.Err() == nil {
			slog.Warn("worker log consumer: xreadgroup failed", "error", err)
			waitWorkerLogConsumer(ctx, time.Second)
			continue
		}
		for _, result := range results {
			worker, ok := workerByStream[result.Stream]
			if !ok {
				continue
			}
			for _, message := range result.Messages {
				if err := c.consume(ctx, worker, message); err != nil {
					slog.Warn("worker log consumer: persist failed", "error", err, "worker_id", worker.ID, "redis_id", message.ID)
					if errors.Is(err, errWorkerLogIdentityMismatch) {
						_ = c.redis.XAck(ctx, result.Stream, workerLogConsumerGroup, message.ID).Err()
					}
					continue
				}
				_ = c.redis.XAck(ctx, result.Stream, workerLogConsumerGroup, message.ID).Err()
			}
		}
	}
}

// claimPending recovers messages abandoned by a crashed or replaced sup2api
// consumer. Database uniqueness makes replay idempotent before XACK.
func (c *WorkerLogConsumer) claimPending(ctx context.Context, stream string, worker Worker) {
	start := "0-0"
	for ctx.Err() == nil {
		messages, next, err := c.redis.XAutoClaim(ctx, &redis.XAutoClaimArgs{
			Stream: stream, Group: workerLogConsumerGroup, Consumer: c.consumer,
			MinIdle: workerLogClaimIdle, Start: start, Count: 100,
		}).Result()
		if err != nil {
			if err != redis.Nil {
				slog.Warn("worker log consumer: autoclaim failed", "error", err, "worker_id", worker.ID, "stream", stream)
			}
			return
		}
		for _, message := range messages {
			if err := c.consume(ctx, worker, message); err != nil {
				slog.Warn("worker log consumer: persist claimed message failed", "error", err, "worker_id", worker.ID, "redis_id", message.ID)
				if errors.Is(err, errWorkerLogIdentityMismatch) {
					_ = c.redis.XAck(ctx, stream, workerLogConsumerGroup, message.ID).Err()
				}
				continue
			}
			_ = c.redis.XAck(ctx, stream, workerLogConsumerGroup, message.ID).Err()
		}
		if next == "0-0" || next == start || len(messages) == 0 {
			return
		}
		start = next
	}
}

func (c *WorkerLogConsumer) prepareStreams(ctx context.Context, workers []Worker) ([]string, map[string]Worker) {
	streams := make([]string, 0, len(workers))
	workerByStream := make(map[string]Worker, len(workers))
	for _, worker := range workers {
		stream := strings.TrimSpace(worker.LogStreamKey)
		if stream == "" {
			continue
		}
		err := c.redis.XGroupCreateMkStream(ctx, stream, workerLogConsumerGroup, "0").Err()
		if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
			slog.Warn("worker log consumer: create group failed", "error", err, "worker_id", worker.ID, "stream", stream)
			continue
		}
		streams = append(streams, stream)
		workerByStream[stream] = worker
	}
	return streams, workerByStream
}

func (c *WorkerLogConsumer) consume(ctx context.Context, worker Worker, message redis.XMessage) error {
	messageWorkerID := workerLogString(message.Values["worker_id"])
	if messageWorkerID == "" || messageWorkerID != worker.RemoteWorkerID {
		return fmt.Errorf("%w: registered=%q message=%q", errWorkerLogIdentityMismatch, worker.RemoteWorkerID, messageWorkerID)
	}
	payloadRaw := workerLogString(message.Values["payload_json"])
	payload := map[string]any{}
	if payloadRaw != "" {
		if err := json.Unmarshal([]byte(payloadRaw), &payload); err != nil {
			return fmt.Errorf("decode payload: %w", err)
		}
	}
	logEntry := &WorkerLog{
		WorkerID:        worker.ID,
		EventID:         firstWorkerLogValue(workerLogString(message.Values["event_id"]), message.ID),
		EventType:       firstWorkerLogValue(workerLogString(message.Values["event_type"]), "consume"),
		InstanceID:      workerLogString(message.Values["instance_id"]),
		RequestID:       workerLogString(message.Values["request_id"]),
		ChannelID:       workerLogInt64(message.Values["channel_id"]),
		ModelName:       workerLogString(message.Values["model_name"]),
		WorkerCreatedAt: workerLogInt64(message.Values["created_at"]),
		Payload:         payload,
	}
	return c.repo.InsertWorkerLog(ctx, logEntry)
}

func waitWorkerLogConsumer(ctx context.Context, duration time.Duration) {
	select {
	case <-ctx.Done():
	case <-time.After(duration):
	}
}

func workerLogString(value any) string {
	if value == nil {
		return ""
	}
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case []byte:
		return strings.TrimSpace(string(typed))
	default:
		return strings.TrimSpace(fmt.Sprint(value))
	}
}

func workerLogInt64(value any) int64 {
	n, _ := strconv.ParseInt(workerLogString(value), 10, 64)
	return n
}

func firstWorkerLogValue(values ...string) string {
	for _, value := range values {
		if value = strings.TrimSpace(value); value != "" {
			return value
		}
	}
	return ""
}
