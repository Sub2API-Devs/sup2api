package controlplane

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type apiKeyResolver interface {
	GetByKey(context.Context, string) (*service.APIKey, error)
	GetByID(context.Context, int64) (*service.APIKey, error)
}

type RPCService struct {
	controlv1.UnimplementedDataPlaneControlServer
	apiKeys       apiKeyResolver
	signer        *GrantSigner
	now           func() time.Time
	invalidations *InvalidationHub
	leases        *LeaseStore
	admission     *AdmissionController
	settlement    *SettlementController
	workerLogs    *WorkerLogBridge
}

func (s *RPCService) WatchInvalidations(request *controlv1.WatchInvalidationsRequest, stream controlv1.DataPlaneControl_WatchInvalidationsServer) error {
	if request == nil || request.GetDataPlaneId() == "" || s == nil || s.invalidations == nil {
		return fmt.Errorf("invalidation stream is unavailable")
	}
	events, cancel := s.invalidations.subscribe(request.GetAfterSequence())
	defer cancel()
	for {
		select {
		case <-stream.Context().Done():
			return stream.Context().Err()
		case event, ok := <-events:
			if !ok {
				return fmt.Errorf("invalidation subscriber fell behind")
			}
			if err := stream.Send(event); err != nil {
				return err
			}
		}
	}
}

func NewRPCService(apiKeys *service.APIKeyService, signer *GrantSigner, leases *LeaseStore, admission *AdmissionController, settlement *SettlementController, workerLogs *WorkerLogBridge) *RPCService {
	return &RPCService{apiKeys: apiKeys, signer: signer, leases: leases, admission: admission, settlement: settlement, workerLogs: workerLogs, now: time.Now}
}

func (s *RPCService) SettleRequest(ctx context.Context, request *controlv1.SettleRequestRequest) (*controlv1.SettleRequestResponse, error) {
	if s == nil || s.settlement == nil {
		return nil, status.Error(codes.Unavailable, "settlement authority is unavailable")
	}
	response, err := s.settlement.Settle(ctx, request)
	if err != nil || response == nil || (!response.GetAccepted() && !response.GetDuplicate()) {
		return response, err
	}
	if s.workerLogs != nil {
		if err := s.workerLogs.Publish(ctx, request); err != nil {
			return nil, status.Error(codes.Unavailable, "Worker consumption log MQ is unavailable")
		}
	}
	return response, nil
}

func newRPCService(apiKeys apiKeyResolver, signer *GrantSigner) *RPCService {
	return &RPCService{apiKeys: apiKeys, signer: signer, now: time.Now}
}

func (s *RPCService) OpenRequest(ctx context.Context, request *controlv1.OpenRequestRequest) (*controlv1.OpenRequestResponse, error) {
	if s == nil || s.admission == nil {
		return openDenied(http.StatusServiceUnavailable, "CONTROL_PLANE_UNAVAILABLE", "Admission authority is unavailable"), nil
	}
	return s.admission.Open(ctx, request)
}

func (s *RPCService) SignBedrockRequest(ctx context.Context, request *controlv1.SignBedrockRequestRequest) (*controlv1.SignBedrockRequestResponse, error) {
	if s == nil || s.admission == nil {
		return &controlv1.SignBedrockRequestResponse{
			Decision: controlv1.Decision_DECISION_DENY,
			Denial:   &controlv1.Denial{HttpStatus: http.StatusServiceUnavailable, ErrorCode: "BEDROCK_SIGNER_UNAVAILABLE", Message: "Bedrock signing authority is unavailable"},
		}, nil
	}
	return s.admission.SignBedrock(ctx, request)
}

func (s *RPCService) RenewLease(ctx context.Context, request *controlv1.RenewLeaseRequest) (*controlv1.RenewLeaseResponse, error) {
	if request == nil || request.GetDataPlaneId() == "" || request.GetRequestId() == "" || request.GetLeaseId() == "" || s == nil || s.leases == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid lease renewal")
	}
	record, err := s.leases.Load(ctx, request.GetLeaseId())
	if errors.Is(err, ErrLeaseNotFound) {
		return &controlv1.RenewLeaseResponse{Renewed: false}, nil
	}
	if err != nil {
		return nil, err
	}
	if record.DataPlaneID != request.GetDataPlaneId() || record.RequestID != request.GetRequestId() {
		return nil, status.Error(codes.PermissionDenied, "lease ownership mismatch")
	}
	expiresAt, err := s.leases.Renew(ctx, record.LeaseID)
	if errors.Is(err, ErrLeaseNotFound) {
		return &controlv1.RenewLeaseResponse{Renewed: false}, nil
	}
	if err != nil {
		return nil, err
	}
	return &controlv1.RenewLeaseResponse{Renewed: true, ExpiresAtUnixMs: expiresAt.UnixMilli()}, nil
}

func (s *RPCService) AbortRequest(ctx context.Context, request *controlv1.AbortRequestRequest) (*controlv1.AbortRequestResponse, error) {
	if request == nil || request.GetDataPlaneId() == "" || request.GetRequestId() == "" || request.GetLeaseId() == "" || s == nil || s.leases == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request abort")
	}
	record, err := s.leases.Load(ctx, request.GetLeaseId())
	if errors.Is(err, ErrLeaseNotFound) {
		return &controlv1.AbortRequestResponse{Released: false}, nil
	}
	if err != nil {
		return nil, err
	}
	if record.DataPlaneID != request.GetDataPlaneId() || record.RequestID != request.GetRequestId() {
		return nil, status.Error(codes.PermissionDenied, "lease ownership mismatch")
	}
	_, released, err := s.leases.Release(ctx, record.LeaseID, "aborted")
	if err != nil {
		return nil, err
	}
	return &controlv1.AbortRequestResponse{Released: released}, nil
}

func (s *RPCService) ResolveAPIKey(ctx context.Context, request *controlv1.ResolveAPIKeyRequest) (*controlv1.ResolveAPIKeyResponse, error) {
	if request == nil || request.GetRequestId() == "" || request.GetDataPlaneId() == "" || request.GetApiKey() == "" {
		return denied(http.StatusUnauthorized, "INVALID_API_KEY", "Invalid API key"), nil
	}
	if s == nil || s.apiKeys == nil || s.signer == nil {
		return denied(http.StatusServiceUnavailable, "CONTROL_PLANE_UNAVAILABLE", "API key authority is unavailable"), nil
	}
	apiKey, err := s.apiKeys.GetByKey(ctx, request.GetApiKey())
	if err != nil {
		if errors.Is(err, service.ErrAPIKeyNotFound) {
			return denied(http.StatusUnauthorized, "INVALID_API_KEY", "Invalid API key"), nil
		}
		if errors.Is(err, service.ErrAPIKeyAuthOverloaded) {
			return denied(http.StatusServiceUnavailable, "API_KEY_AUTH_OVERLOADED", "API key authentication is temporarily unavailable"), nil
		}
		return nil, fmt.Errorf("resolve API key: %w", err)
	}
	if denial := validateAPIKeyAuthority(apiKey, s.now()); denial != nil {
		return &controlv1.ResolveAPIKeyResponse{Decision: controlv1.Decision_DECISION_DENY, Denial: denial}, nil
	}

	digest := sha256.Sum256([]byte(request.GetApiKey()))
	return s.issueGrant(apiKey, hex.EncodeToString(digest[:]))
}

func (s *RPCService) RenewAuthGrant(ctx context.Context, request *controlv1.RenewAuthGrantRequest) (*controlv1.ResolveAPIKeyResponse, error) {
	if request == nil || request.GetRequestId() == "" || request.GetDataPlaneId() == "" || request.GetGrantToken() == "" {
		return denied(http.StatusUnauthorized, "INVALID_AUTH_GRANT", "Invalid authorization grant"), nil
	}
	if s == nil || s.apiKeys == nil || s.signer == nil {
		return denied(http.StatusServiceUnavailable, "CONTROL_PLANE_UNAVAILABLE", "API key authority is unavailable"), nil
	}
	claims, err := s.signer.Verify(request.GetGrantToken())
	if err != nil {
		return denied(http.StatusUnauthorized, "INVALID_AUTH_GRANT", "Authorization grant cannot be renewed"), nil
	}
	apiKey, err := s.apiKeys.GetByID(ctx, claims.APIKeyID)
	if err != nil || apiKey == nil {
		if errors.Is(err, service.ErrAPIKeyNotFound) {
			return denied(http.StatusUnauthorized, "INVALID_API_KEY", "Invalid API key"), nil
		}
		return nil, fmt.Errorf("renew API key grant: %w", err)
	}
	if denial := validateAPIKeyAuthority(apiKey, s.now()); denial != nil {
		return &controlv1.ResolveAPIKeyResponse{Decision: controlv1.Decision_DECISION_DENY, Denial: denial}, nil
	}
	groupID := groupIDOf(apiKey)
	if apiKey.User == nil || apiKey.User.ID != claims.UserID || groupID != claims.GroupID || authPolicyVersion(apiKey) != claims.PolicyVersion {
		return denied(http.StatusUnauthorized, "STALE_AUTH_GRANT", "Authorization policy changed; reconnect with the API key"), nil
	}
	return s.issueGrant(apiKey, claims.CredentialDigest)
}

func (s *RPCService) issueGrant(apiKey *service.APIKey, credentialDigest string) (*controlv1.ResolveAPIKeyResponse, error) {
	groupID := int64(0)
	if apiKey.GroupID != nil {
		groupID = *apiKey.GroupID
	}
	policyVersion := authPolicyVersion(apiKey)
	claims := GrantClaims{
		CredentialDigest: credentialDigest,
		APIKeyID:         apiKey.ID,
		UserID:           apiKey.User.ID,
		GroupID:          groupID,
		PolicyVersion:    policyVersion,
	}
	if apiKey.ExpiresAt != nil {
		claims.ExpiresAtUnix = apiKey.ExpiresAt.Unix()
	}
	token, issued, err := s.signer.Issue(claims)
	if err != nil {
		return nil, fmt.Errorf("issue AuthGrant: %w", err)
	}
	apiKeyExpiry := int64(0)
	if apiKey.ExpiresAt != nil {
		apiKeyExpiry = apiKey.ExpiresAt.UnixMilli()
	}
	return &controlv1.ResolveAPIKeyResponse{
		Decision: controlv1.Decision_DECISION_ALLOW,
		Grant: &controlv1.AuthGrant{
			GrantToken:            token,
			CredentialDigest:      claims.CredentialDigest,
			ApiKeyId:              apiKey.ID,
			UserId:                apiKey.User.ID,
			GroupId:               groupID,
			ExpiresAtUnixMs:       issued.ExpiresAtUnix * 1000,
			ApiKeyExpiresAtUnixMs: apiKeyExpiry,
			IpWhitelist:           append([]string(nil), apiKey.IPWhitelist...),
			IpBlacklist:           append([]string(nil), apiKey.IPBlacklist...),
			PolicyVersion:         policyVersion,
		},
	}, nil
}

func validateAPIKeyAuthority(apiKey *service.APIKey, now time.Time) *controlv1.Denial {
	if apiKey == nil || apiKey.ID <= 0 {
		return denial(http.StatusUnauthorized, "INVALID_API_KEY", "Invalid API key")
	}
	if !apiKey.IsActive() && apiKey.Status != service.StatusAPIKeyQuotaExhausted {
		return denial(http.StatusUnauthorized, "API_KEY_DISABLED", "API key is disabled")
	}
	if apiKey.ExpiresAt != nil && !now.Before(*apiKey.ExpiresAt) {
		return denial(http.StatusForbidden, "API_KEY_EXPIRED", "API key has expired")
	}
	if apiKey.User == nil || !apiKey.User.IsActive() {
		return denial(http.StatusUnauthorized, "USER_INACTIVE", "User account is not active")
	}
	if apiKey.GroupID == nil {
		return nil
	}
	if apiKey.Group == nil || !apiKey.Group.IsActive() {
		return denial(http.StatusForbidden, "GROUP_UNAVAILABLE", "API key group is unavailable")
	}
	if !apiKey.Group.IsSubscriptionType() && !apiKey.User.CanBindGroup(apiKey.Group.ID, apiKey.Group.IsExclusive) {
		return denial(http.StatusForbidden, "GROUP_NOT_ALLOWED", "API key group is not allowed for this user")
	}
	return nil
}

func authPolicyVersion(apiKey *service.APIKey) string {
	allowedGroups := []int64(nil)
	if apiKey.User != nil {
		allowedGroups = append(allowedGroups, apiKey.User.AllowedGroups...)
		sort.Slice(allowedGroups, func(i, j int) bool { return allowedGroups[i] < allowedGroups[j] })
	}
	parts := []string{
		strconv.FormatInt(apiKey.ID, 10),
		apiKey.Status,
		apiKey.UpdatedAt.UTC().Format(time.RFC3339Nano),
		strings.Join(apiKey.IPWhitelist, ","),
		strings.Join(apiKey.IPBlacklist, ","),
	}
	if apiKey.User != nil {
		parts = append(parts, strconv.FormatInt(apiKey.User.ID, 10), apiKey.User.Status, apiKey.User.UpdatedAt.UTC().Format(time.RFC3339Nano))
		for _, groupID := range allowedGroups {
			parts = append(parts, strconv.FormatInt(groupID, 10))
		}
	}
	if apiKey.Group != nil {
		parts = append(parts, strconv.FormatInt(apiKey.Group.ID, 10), apiKey.Group.Status, apiKey.Group.UpdatedAt.UTC().Format(time.RFC3339Nano))
	}
	digest := sha256.Sum256([]byte(strings.Join(parts, "\x00")))
	return hex.EncodeToString(digest[:])
}

func denied(status int, code, message string) *controlv1.ResolveAPIKeyResponse {
	return &controlv1.ResolveAPIKeyResponse{Decision: controlv1.Decision_DECISION_DENY, Denial: denial(status, code, message)}
}

func denial(status int, code, message string) *controlv1.Denial {
	return &controlv1.Denial{HttpStatus: int32(status), ErrorCode: code, Message: message}
}
