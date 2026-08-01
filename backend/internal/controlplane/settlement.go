package controlplane

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/redis/go-redis/v9"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const settlementMarkerRetention = 7 * 24 * time.Hour

type SettlementController struct {
	rdb           *redis.Client
	apiKeys       *service.APIKeyService
	accounts      service.AccountRepository
	subscriptions *service.SubscriptionService
	gateway       *service.GatewayService
	openAI        *service.OpenAIGatewayService
	leases        *LeaseStore
}

func NewSettlementController(
	rdb *redis.Client,
	apiKeys *service.APIKeyService,
	accounts service.AccountRepository,
	subscriptions *service.SubscriptionService,
	gateway *service.GatewayService,
	openAI *service.OpenAIGatewayService,
	leases *LeaseStore,
) *SettlementController {
	return &SettlementController{
		rdb: rdb, apiKeys: apiKeys, accounts: accounts, subscriptions: subscriptions,
		gateway: gateway, openAI: openAI, leases: leases,
	}
}

func (s *SettlementController) Settle(ctx context.Context, request *controlv1.SettleRequestRequest) (*controlv1.SettleRequestResponse, error) {
	if request == nil || request.GetDataPlaneId() == "" || request.GetRequestId() == "" || request.GetLeaseId() == "" {
		return nil, status.Error(codes.InvalidArgument, "invalid settlement")
	}
	if s == nil || s.rdb == nil || s.leases == nil {
		return nil, status.Error(codes.Unavailable, "settlement authority is unavailable")
	}
	record, err := s.leases.LoadForSettlement(ctx, request.GetLeaseId())
	if errors.Is(err, ErrLeaseNotFound) {
		return nil, status.Error(codes.NotFound, "request lease not found")
	}
	if err != nil {
		return nil, err
	}
	if err := validateSettlementOwnership(record, request); err != nil {
		return nil, err
	}
	if record.ReleaseReason == "aborted" {
		return &controlv1.SettleRequestResponse{Duplicate: true}, nil
	}
	marker := settlementMarkerKey(record.RequestID, record.APIKeyID)
	if exists, err := s.rdb.Exists(ctx, marker).Result(); err != nil {
		return nil, err
	} else if exists > 0 {
		if _, activeErr := s.leases.Load(ctx, record.LeaseID); activeErr == nil {
			if _, _, releaseErr := s.leases.Release(ctx, record.LeaseID, "settled"); releaseErr != nil {
				return nil, releaseErr
			}
		}
		return &controlv1.SettleRequestResponse{Duplicate: true}, nil
	}
	if s.apiKeys == nil || s.accounts == nil {
		return nil, status.Error(codes.Unavailable, "settlement authority is unavailable")
	}

	apiKey, err := s.apiKeys.GetByIDForSettlement(ctx, record.APIKeyID)
	if err != nil {
		return nil, fmt.Errorf("load settlement API key: %w", err)
	}
	accountLoader, ok := s.accounts.(interface {
		GetByIDForSettlement(context.Context, int64) (*service.Account, error)
	})
	if !ok {
		return nil, status.Error(codes.Unavailable, "settlement account tombstone loader is unavailable")
	}
	account, err := accountLoader.GetByIDForSettlement(ctx, record.AccountID)
	if err != nil {
		return nil, fmt.Errorf("load settlement account: %w", err)
	}
	var subscription *service.UserSubscription
	if record.BillingMode == "subscription" {
		if s.subscriptions == nil || record.SubscriptionID <= 0 {
			return nil, status.Error(codes.Unavailable, "subscription settlement authority is unavailable")
		}
		subscription, err = s.subscriptions.GetByIDForSettlement(ctx, record.SubscriptionID)
		if err != nil {
			return nil, fmt.Errorf("load settlement subscription: %w", err)
		}
	}
	usage := request.GetUsage()
	if !validSettlementUsage(usage) {
		return nil, status.Error(codes.InvalidArgument, "invalid settlement usage")
	}
	duration := settlementDuration(request)
	firstTokenMS := settlementFirstTokenMS(request)
	platform := platformForAdmission(apiKey.Group, controlv1.Protocol_PROTOCOL_UNSPECIFIED)
	if platform == service.PlatformOpenAI || platform == service.PlatformGrok {
		if s.openAI == nil || !s.openAI.SupportsDurableIdempotentBilling() {
			return nil, status.Error(codes.Unavailable, "OpenAI settlement service is unavailable")
		}
		err = s.openAI.RecordUsage(ctx, &service.OpenAIRecordUsageInput{
			Result: &service.OpenAIForwardResult{
				RequestID: record.RequestID, Model: record.RequestedModel, UpstreamModel: record.MappedModel,
				UpstreamEndpoint: upstreamEndpoint(record), Stream: record.Stream, Duration: duration,
				FirstTokenMs: firstTokenMS, ClientDisconnect: request.GetClientCancelled(),
				Usage: service.OpenAIUsage{
					InputTokens: boundedInt(usage.GetInputTokens()), OutputTokens: boundedInt(usage.GetOutputTokens()),
					CacheReadInputTokens: boundedInt(usage.GetCacheReadTokens()), CacheCreationInputTokens: boundedInt(usage.GetCacheCreationTokens()),
				},
			},
			APIKey: apiKey, User: apiKey.User, Account: account, Subscription: subscription,
			InboundEndpoint: record.Path, UpstreamEndpoint: upstreamEndpoint(record),
			UserAgent: record.UserAgent, IPAddress: record.ClientIP, APIKeyService: s.apiKeys,
			QuotaPlatform: platform, AllowDeletedSubjects: true,
		})
	} else {
		if s.gateway == nil || !s.gateway.SupportsDurableIdempotentBilling() {
			return nil, status.Error(codes.Unavailable, "gateway settlement service is unavailable")
		}
		err = s.gateway.RecordUsage(ctx, &service.RecordUsageInput{
			Result: &service.ForwardResult{
				RequestID: record.RequestID, Model: record.RequestedModel, UpstreamModel: record.MappedModel,
				Stream: record.Stream, Duration: duration, FirstTokenMs: firstTokenMS,
				ClientDisconnect: request.GetClientCancelled(),
				Usage: service.ClaudeUsage{
					InputTokens: boundedInt(usage.GetInputTokens()), OutputTokens: boundedInt(usage.GetOutputTokens()),
					CacheReadInputTokens: boundedInt(usage.GetCacheReadTokens()), CacheCreationInputTokens: boundedInt(usage.GetCacheCreationTokens()),
				},
			},
			APIKey: apiKey, User: apiKey.User, Account: account, Subscription: subscription,
			InboundEndpoint: record.Path, UpstreamEndpoint: upstreamEndpoint(record),
			UserAgent: record.UserAgent, IPAddress: record.ClientIP, APIKeyService: s.apiKeys,
			QuotaPlatform: platform, AllowDeletedSubjects: true,
		})
	}
	if err != nil {
		return nil, fmt.Errorf("apply authoritative settlement: %w", err)
	}
	// RecordUsage claims (request_id, api_key_id) transactionally with the
	// authoritative balance/subscription mutations. Therefore a crash before
	// this Redis marker is safe: WAL replay reaches the database dedup claim and
	// cannot charge twice. This marker only avoids repeating the heavier reads.
	if err := s.rdb.SetNX(ctx, marker, "1", settlementMarkerRetention).Err(); err != nil {
		return nil, fmt.Errorf("persist settlement acknowledgement: %w", err)
	}
	if _, activeErr := s.leases.Load(ctx, record.LeaseID); activeErr == nil {
		if _, _, err := s.leases.Release(ctx, record.LeaseID, "settled"); err != nil {
			return nil, err
		}
	}
	return &controlv1.SettleRequestResponse{Accepted: true}, nil
}

func validSettlementUsage(usage *controlv1.Usage) bool {
	return usage != nil && usage.GetInputTokens() >= 0 && usage.GetOutputTokens() >= 0 &&
		usage.GetCacheReadTokens() >= 0 && usage.GetCacheCreationTokens() >= 0 &&
		usage.GetReasoningTokens() >= 0 && usage.GetResponseBytes() >= 0
}

func validateSettlementOwnership(record *LeaseRecord, request *controlv1.SettleRequestRequest) error {
	if record.DataPlaneID != request.GetDataPlaneId() || record.RequestID != request.GetRequestId() || record.LeaseID != request.GetLeaseId() {
		return status.Error(codes.PermissionDenied, "settlement lease ownership mismatch")
	}
	if request.GetAccountId() != record.AccountID || request.GetPricingVersion() != record.PricingVersion || request.GetRequestedModel() != record.RequestedModel || request.GetMappedModel() != record.MappedModel {
		return status.Error(codes.FailedPrecondition, "settlement facts do not match the admitted lease")
	}
	return nil
}

func settlementMarkerKey(requestID string, apiKeyID int64) string {
	digest := sha256.Sum256([]byte(requestID + "\x00" + fmt.Sprint(apiKeyID)))
	return "sup2api:dp:settled:" + hex.EncodeToString(digest[:])
}

func settlementDuration(request *controlv1.SettleRequestRequest) time.Duration {
	if request.GetFinishedAtUnixMs() <= request.GetStartedAtUnixMs() {
		return 0
	}
	return time.Duration(request.GetFinishedAtUnixMs()-request.GetStartedAtUnixMs()) * time.Millisecond
}

func settlementFirstTokenMS(request *controlv1.SettleRequestRequest) *int {
	if request.GetFirstByteAtUnixMs() <= request.GetStartedAtUnixMs() {
		return nil
	}
	value := boundedInt(request.GetFirstByteAtUnixMs() - request.GetStartedAtUnixMs())
	return &value
}

func upstreamEndpoint(record *LeaseRecord) string {
	if record == nil || record.Plan == nil {
		return ""
	}
	parsed, err := url.Parse(record.Plan.GetUpstreamUrl())
	if err != nil {
		return ""
	}
	return strings.TrimSpace(parsed.Path)
}
