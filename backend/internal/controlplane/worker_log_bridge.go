package controlplane

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
	"github.com/redis/go-redis/v9"
)

const workerLogStreamMaxLen = int64(200000)

// WorkerLogBridge is the only Redis publisher in the Worker log path. The
// data plane sends durable settlement facts over gRPC and never receives
// Redis topology or credentials.
type WorkerLogBridge struct {
	repo  WorkerAdmissionRepository
	redis *redis.Client
}

func NewWorkerLogBridge(repo WorkerAdmissionRepository, redisClient *redis.Client) *WorkerLogBridge {
	return &WorkerLogBridge{repo: repo, redis: redisClient}
}

func (b *WorkerLogBridge) Publish(ctx context.Context, request *controlv1.SettleRequestRequest) error {
	if b == nil || b.repo == nil || b.redis == nil || request == nil {
		return nil
	}
	worker, err := b.repo.GetWorkerByRemoteID(ctx, strings.TrimSpace(request.GetDataPlaneId()))
	if err != nil {
		return fmt.Errorf("resolve registered Worker for settlement log: %w", err)
	}
	// Non-managed data planes remain compatible. A claimed Worker is persisted
	// by the UI before operators expose it to client traffic.
	if worker == nil {
		return nil
	}
	streamKey := strings.TrimSpace(worker.LogStreamKey)
	if streamKey == "" {
		streamKey = "aicodex:worker:consume-logs:" + base64.RawURLEncoding.EncodeToString([]byte(worker.RemoteWorkerID))
	}
	usage := request.GetUsage()
	upstream := request.GetUpstream()
	durationMillis := request.GetFinishedAtUnixMs() - request.GetStartedAtUnixMs()
	if durationMillis < 0 {
		durationMillis = 0
	}
	payload, err := json.Marshal(map[string]any{
		"account_id":   request.GetAccountId(),
		"input_tokens": usage.GetInputTokens(), "output_tokens": usage.GetOutputTokens(),
		"cache_read_tokens": usage.GetCacheReadTokens(), "cache_creation_tokens": usage.GetCacheCreationTokens(),
		"reasoning_tokens": usage.GetReasoningTokens(), "response_bytes": usage.GetResponseBytes(),
		"total_tokens": usage.GetInputTokens() + usage.GetOutputTokens(),
		"use_time":     float64(durationMillis) / 1000, "duration_ms": durationMillis,
		"first_byte_at": request.GetFirstByteAtUnixMs(), "finished_at": request.GetFinishedAtUnixMs(),
		"status_code": upstream.GetStatusCode(), "error_code": upstream.GetErrorCode(), "attempts": upstream.GetAttempts(),
		"client_cancelled": request.GetClientCancelled(), "requested_model": request.GetRequestedModel(),
		"mapped_model": request.GetMappedModel(), "lease_id": request.GetLeaseId(),
	})
	if err != nil {
		return err
	}
	publishCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	if err := b.redis.XAdd(publishCtx, &redis.XAddArgs{
		Stream: streamKey, MaxLen: workerLogStreamMaxLen, Approx: true,
		Values: map[string]any{
			"event_id": request.GetRequestId(), "event_type": "consume",
			"worker_id": worker.RemoteWorkerID, "instance_id": request.GetDataPlaneInstanceId(),
			"request_id": request.GetRequestId(), "channel_id": request.GetAccountId(),
			"model_name": request.GetMappedModel(), "created_at": request.GetFinishedAtUnixMs() / 1000,
			"payload_json": string(payload),
		},
	}).Err(); err != nil {
		return fmt.Errorf("publish Worker consumption log: %w", err)
	}
	return nil
}
