package controlplane

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/google/uuid"
)

const (
	defaultReservationOutputTokens = 4096
	maxAdmissionSelectionAttempts  = 8
)

type AdmissionController struct {
	cfg               *config.Config
	apiKeys           *service.APIKeyService
	billing           *service.BillingCacheService
	subscriptions     *service.SubscriptionService
	concurrency       *service.ConcurrencyService
	gateway           *service.GatewayService
	openAI            *service.OpenAIGatewayService
	geminiTokens      *service.GeminiTokenProvider
	claudeTokens      *service.ClaudeTokenProvider
	antigravityTokens *service.AntigravityTokenProvider
	costs             *service.BillingService
	leases            *LeaseStore
	signer            *GrantSigner
	workers           WorkerAdmissionRepository
	now               func() time.Time
}

type WorkerAdmissionRepository interface {
	GetWorkerByRemoteID(context.Context, string) (*service.Worker, error)
}

func NewAdmissionController(
	cfg *config.Config,
	apiKeys *service.APIKeyService,
	billing *service.BillingCacheService,
	subscriptions *service.SubscriptionService,
	concurrency *service.ConcurrencyService,
	gateway *service.GatewayService,
	openAI *service.OpenAIGatewayService,
	geminiTokens *service.GeminiTokenProvider,
	claudeTokens *service.ClaudeTokenProvider,
	antigravityTokens *service.AntigravityTokenProvider,
	costs *service.BillingService,
	leases *LeaseStore,
	signer *GrantSigner,
	workers WorkerAdmissionRepository,
) *AdmissionController {
	return &AdmissionController{
		cfg: cfg, apiKeys: apiKeys, billing: billing, subscriptions: subscriptions,
		concurrency: concurrency, gateway: gateway, openAI: openAI, geminiTokens: geminiTokens, claudeTokens: claudeTokens, antigravityTokens: antigravityTokens, costs: costs,
		leases: leases, signer: signer, workers: workers, now: time.Now,
	}
}

func (a *AdmissionController) Open(ctx context.Context, request *controlv1.OpenRequestRequest) (*controlv1.OpenRequestResponse, error) {
	if request == nil || request.GetRequestId() == "" || request.GetDataPlaneId() == "" || request.GetAuthGrantToken() == "" {
		return openDenied(http.StatusUnauthorized, "INVALID_AUTH_GRANT", "Invalid authorization grant"), nil
	}
	if a == nil || a.signer == nil || a.apiKeys == nil || a.billing == nil || a.concurrency == nil || a.costs == nil || a.leases == nil {
		return openDenied(http.StatusServiceUnavailable, "CONTROL_PLANE_UNAVAILABLE", "Admission authority is unavailable"), nil
	}
	claims, err := a.signer.Verify(request.GetAuthGrantToken())
	if err != nil || claims.APIKeyID != request.GetApiKeyId() || claims.UserID != request.GetUserId() || claims.GroupID != request.GetGroupId() {
		return openDenied(http.StatusUnauthorized, "INVALID_AUTH_GRANT", "Invalid authorization grant"), nil
	}
	if a.workers != nil {
		worker, workerErr := a.workers.GetWorkerByRemoteID(ctx, strings.TrimSpace(request.GetDataPlaneId()))
		if workerErr != nil {
			return openDenied(http.StatusServiceUnavailable, "WORKER_AUTHORITY_UNAVAILABLE", "Worker authority is unavailable"), nil
		}
		if worker == nil {
			return openDenied(http.StatusForbidden, "WORKER_NOT_REGISTERED", "Worker is not registered"), nil
		}
		if !worker.Enabled {
			return openDenied(http.StatusForbidden, "WORKER_DISABLED", "Worker is disabled"), nil
		}
	}
	if _, _, existingErr := a.leases.LoadActiveByRequest(ctx, request.GetRequestId()); existingErr == nil {
		// Returning an active execution plan twice would allow two upstream
		// requests to share one WAL/financial idempotency key. Fail closed even
		// when the identity matches; an ambiguous client retry must use a new
		// request ID after the original lease expires or settles.
		return openDenied(http.StatusConflict, "REQUEST_ID_IN_PROGRESS", "Request ID is already in progress"), nil
	} else if !errors.Is(existingErr, ErrLeaseNotFound) {
		return nil, fmt.Errorf("load idempotent request lease: %w", existingErr)
	}

	apiKey, err := a.apiKeys.GetByID(ctx, claims.APIKeyID)
	if err != nil {
		if errors.Is(err, service.ErrAPIKeyNotFound) {
			return openDenied(http.StatusUnauthorized, "INVALID_API_KEY", "Invalid API key"), nil
		}
		return nil, err
	}
	if denial := validateAPIKeyAuthority(apiKey, a.now()); denial != nil {
		return &controlv1.OpenRequestResponse{Decision: controlv1.Decision_DECISION_DENY, Denial: denial}, nil
	}
	if apiKey.UserID != claims.UserID || groupIDOf(apiKey) != claims.GroupID || authPolicyVersion(apiKey) != claims.PolicyVersion {
		return openDenied(http.StatusUnauthorized, "STALE_AUTH_GRANT", "Authorization policy changed; retry authentication"), nil
	}

	group := apiKey.Group
	platform := platformForAdmission(group, request.GetProtocol())
	var subscription *service.UserSubscription
	if group != nil && group.IsSubscriptionType() {
		if a.subscriptions == nil {
			return openDenied(http.StatusServiceUnavailable, "SUBSCRIPTION_SERVICE_UNAVAILABLE", "Subscription authority is unavailable"), nil
		}
		subscription, err = a.subscriptions.GetActiveSubscription(ctx, apiKey.User.ID, group.ID)
		if err != nil {
			return openDenied(http.StatusForbidden, "SUBSCRIPTION_NOT_FOUND", "No active subscription found for this group"), nil
		}
		needsMaintenance, validationErr := a.subscriptions.ValidateAndCheckLimits(subscription, group)
		if needsMaintenance {
			subscription, err = a.subscriptions.EnsureWindowMaintenance(ctx, subscription)
			if err != nil {
				return nil, fmt.Errorf("maintain subscription windows: %w", err)
			}
			_, validationErr = a.subscriptions.ValidateAndCheckLimits(subscription, group)
		}
		if validationErr != nil {
			return admissionErrorResponse(validationErr), nil
		}
	}
	if err := a.billing.CheckBillingEligibility(ctx, apiKey.User, apiKey, group, subscription, platform); err != nil {
		return admissionErrorResponse(err), nil
	}

	userSlot, err := a.concurrency.AcquireUserSlot(ctx, apiKey.User.ID, apiKey.User.Concurrency)
	if err != nil {
		return nil, fmt.Errorf("acquire user concurrency: %w", err)
	}
	if userSlot == nil || !userSlot.Acquired {
		return openDenied(http.StatusTooManyRequests, "USER_CONCURRENCY_EXCEEDED", "User concurrency limit exceeded"), nil
	}
	userRelease := userSlot.ReleaseFunc
	defer func() {
		if userRelease != nil {
			userRelease()
		}
	}()

	selection, plan, err := a.selectExecutionPlan(ctx, request, apiKey, platform)
	if err != nil {
		return openDenied(http.StatusServiceUnavailable, "NO_AVAILABLE_ACCOUNT", "No compatible upstream account is available"), nil
	}
	if selection == nil || selection.Account == nil || !selection.Acquired || selection.ReleaseFunc == nil {
		if selection != nil && selection.ReleaseFunc != nil {
			selection.ReleaseFunc()
		}
		return openDenied(http.StatusTooManyRequests, "ACCOUNT_CONCURRENCY_EXCEEDED", "Upstream account concurrency limit exceeded"), nil
	}
	accountRelease := selection.ReleaseFunc
	defer func() {
		if accountRelease != nil {
			accountRelease()
		}
	}()

	reservation, err := a.reservationFor(ctx, request, apiKey, subscription, plan.GetMappedModel())
	if err != nil {
		return openDenied(http.StatusServiceUnavailable, "PRICING_UNAVAILABLE", "Pricing is unavailable for the requested model"), nil
	}
	leaseID := "lease-" + uuid.NewString()
	record := &LeaseRecord{
		LeaseID: leaseID, RequestID: request.GetRequestId(), DataPlaneID: request.GetDataPlaneId(),
		APIKeyID: apiKey.ID, UserID: apiKey.User.ID, GroupID: groupIDOf(apiKey), AccountID: selection.Account.ID,
		RequestedModel: request.GetRequestedModel(), MappedModel: plan.GetMappedModel(),
		PricingVersion: reservation.pricingVersion, BillingMode: reservation.mode,
		BillingReservationID: "reservation-" + uuid.NewString(), ReservationKey: reservation.key,
		ReservedAmountMicrousd: reservation.amountMicrousd, Plan: plan, Stream: request.GetStream(),
		Path: request.GetPath(), ClientIP: request.GetClientIp(), UserAgent: request.GetUserAgent(),
	}
	if subscription != nil {
		record.SubscriptionID = subscription.ID
	}
	acquired, err := a.leases.AcquireConcurrency(ctx, record, selection.Account.Concurrency, apiKey.User.Concurrency)
	if err != nil {
		return nil, fmt.Errorf("acquire distributed request lease: %w", err)
	}
	if !acquired {
		return openDenied(http.StatusTooManyRequests, "CONCURRENCY_EXCEEDED", "Request concurrency limit exceeded"), nil
	}
	// The distributed live lease now replaces both regular scheduler slots.
	accountRelease()
	accountRelease = nil
	userRelease()
	userRelease = nil

	stored, fresh, err := a.leases.Create(ctx, record, reservation.limitMicrousd)
	if err != nil {
		_ = a.leases.ReleaseConcurrency(context.WithoutCancel(ctx), record)
		if errors.Is(err, ErrReservationExceeded) {
			return openDenied(http.StatusPaymentRequired, "INSUFFICIENT_RESERVED_BALANCE", "Insufficient unreserved billing capacity"), nil
		}
		return nil, err
	}
	if !fresh {
		_ = a.leases.ReleaseConcurrency(context.WithoutCancel(ctx), record)
		return openDenied(http.StatusConflict, "REQUEST_ID_IN_PROGRESS", "Request ID is already in progress"), nil
	}
	expiresAt, err := a.leases.ExpiresAt(ctx, stored.LeaseID)
	if err != nil {
		return nil, err
	}
	_ = a.apiKeys.TouchLastUsed(ctx, apiKey.ID)
	return openResponse(stored, expiresAt), nil
}

func (a *AdmissionController) SignBedrock(ctx context.Context, request *controlv1.SignBedrockRequestRequest) (*controlv1.SignBedrockRequestResponse, error) {
	deny := func(status int32, code, message string) *controlv1.SignBedrockRequestResponse {
		return &controlv1.SignBedrockRequestResponse{Decision: controlv1.Decision_DECISION_DENY, Denial: &controlv1.Denial{HttpStatus: status, ErrorCode: code, Message: message}}
	}
	if request == nil || request.GetDataPlaneId() == "" || request.GetRequestId() == "" || request.GetLeaseId() == "" || request.GetPayloadSha256() == "" {
		return deny(http.StatusBadRequest, "INVALID_BEDROCK_SIGN_REQUEST", "Invalid Bedrock signing request"), nil
	}
	if a == nil || a.leases == nil || a.gateway == nil {
		return deny(http.StatusServiceUnavailable, "BEDROCK_SIGNER_UNAVAILABLE", "Bedrock signing authority is unavailable"), nil
	}
	record, err := a.leases.Load(ctx, request.GetLeaseId())
	if errors.Is(err, ErrLeaseNotFound) {
		return deny(http.StatusUnauthorized, "INVALID_REQUEST_LEASE", "Request lease is unavailable"), nil
	}
	if err != nil {
		return nil, err
	}
	if record.DataPlaneID != request.GetDataPlaneId() || record.RequestID != request.GetRequestId() || record.LeaseID != request.GetLeaseId() {
		return deny(http.StatusForbidden, "LEASE_OWNERSHIP_MISMATCH", "Request lease ownership mismatch"), nil
	}
	if record.Plan == nil || record.Plan.GetProtocolProfile() != "bedrock" || record.Plan.GetProtocolOptions()["auth_mode"] != "sigv4" {
		return deny(http.StatusForbidden, "INVALID_BEDROCK_LEASE", "Request lease does not authorize Bedrock SigV4"), nil
	}
	if request.GetMethod() != record.Plan.GetUpstreamMethod() || request.GetUpstreamUrl() != record.Plan.GetUpstreamUrl() {
		return deny(http.StatusForbidden, "BEDROCK_TARGET_MISMATCH", "Bedrock signing target does not match the request lease"), nil
	}
	signed, err := a.gateway.SignDataPlaneBedrockRequest(ctx, record.AccountID, request.GetMethod(), request.GetUpstreamUrl(), request.GetPayloadSha256(), request.GetHeaders())
	if err != nil {
		return deny(http.StatusServiceUnavailable, "BEDROCK_SIGNING_FAILED", "Bedrock request signing failed"), nil
	}
	return &controlv1.SignBedrockRequestResponse{Decision: controlv1.Decision_DECISION_ALLOW, SignedHeaders: signed}, nil
}

func (a *AdmissionController) selectExecutionPlan(ctx context.Context, request *controlv1.OpenRequestRequest, apiKey *service.APIKey, platform string) (*service.AccountSelectionResult, *controlv1.ExecutionPlan, error) {
	excluded := make(map[int64]struct{})
	for attempt := 0; attempt < maxAdmissionSelectionAttempts; attempt++ {
		var selection *service.AccountSelectionResult
		var err error
		if platform == service.PlatformOpenAI || platform == service.PlatformGrok {
			if a.openAI == nil {
				return nil, nil, fmt.Errorf("OpenAI scheduler unavailable")
			}
			selection, err = a.openAI.SelectAccountWithLoadAwareness(ctx, apiKey.GroupID, request.GetSessionHash(), request.GetRequestedModel(), excluded)
		} else {
			if a.gateway == nil {
				return nil, nil, fmt.Errorf("gateway scheduler unavailable")
			}
			selection, err = a.gateway.SelectAccountWithLoadAwareness(ctx, apiKey.GroupID, request.GetSessionHash(), request.GetRequestedModel(), excluded, "", apiKey.User.ID)
		}
		if err != nil || selection == nil || selection.Account == nil {
			return selection, nil, err
		}
		if !selection.Acquired {
			return selection, nil, nil
		}
		plan, planErr := a.executionPlan(ctx, selection.Account, request, platform)
		if planErr == nil {
			return selection, plan, nil
		}
		if selection.ReleaseFunc != nil {
			selection.ReleaseFunc()
		}
		excluded[selection.Account.ID] = struct{}{}
	}
	return nil, nil, fmt.Errorf("no account supports direct data-plane transport")
}

func (a *AdmissionController) executionPlan(ctx context.Context, account *service.Account, request *controlv1.OpenRequestRequest, platform string) (*controlv1.ExecutionPlan, error) {
	// Provider credentials are enabled only after a dedicated protocol module
	// owns their request semantics. Unsupported provider and Bedrock paths
	// continue to fail closed and the scheduler tries another account.
	vertexGemini := account != nil && account.Type == service.AccountTypeServiceAccount &&
		platform == service.PlatformGemini && request.GetProtocol() == controlv1.Protocol_PROTOCOL_GEMINI
	vertexAnthropic := account != nil && account.Type == service.AccountTypeServiceAccount &&
		platform == service.PlatformAnthropic && request.GetProtocol() == controlv1.Protocol_PROTOCOL_ANTHROPIC
	anthropicOAuth := account != nil && account.IsAnthropicOAuthOrSetupToken() &&
		platform == service.PlatformAnthropic && request.GetProtocol() == controlv1.Protocol_PROTOCOL_ANTHROPIC
	openAICodex := account != nil && account.IsOpenAIOAuth() &&
		platform == service.PlatformOpenAI && request.GetProtocol() == controlv1.Protocol_PROTOCOL_OPENAI
	bedrock := account != nil && account.IsBedrock() &&
		platform == service.PlatformAnthropic && request.GetProtocol() == controlv1.Protocol_PROTOCOL_ANTHROPIC
	grokOAuth := account != nil && account.IsGrokOAuth() &&
		platform == service.PlatformGrok && request.GetProtocol() == controlv1.Protocol_PROTOCOL_OPENAI
	geminiOAuth := account != nil && account.Platform == service.PlatformGemini && account.Type == service.AccountTypeOAuth &&
		platform == service.PlatformGemini && request.GetProtocol() == controlv1.Protocol_PROTOCOL_GEMINI
	antigravityGemini := account != nil && account.Platform == service.PlatformAntigravity && account.Type == service.AccountTypeOAuth &&
		platform == service.PlatformGemini && request.GetProtocol() == controlv1.Protocol_PROTOCOL_GEMINI
	antigravityClaude := account != nil && account.Platform == service.PlatformAntigravity && account.Type == service.AccountTypeOAuth &&
		platform == service.PlatformAnthropic && request.GetProtocol() == controlv1.Protocol_PROTOCOL_ANTHROPIC
	antigravityUpstream := account != nil && account.Platform == service.PlatformAntigravity && account.Type == service.AccountTypeUpstream &&
		platform == service.PlatformAnthropic && request.GetProtocol() == controlv1.Protocol_PROTOCOL_ANTHROPIC
	if account == nil || (account.Type != service.AccountTypeAPIKey && !vertexGemini && !vertexAnthropic && !anthropicOAuth && !openAICodex && !bedrock && !grokOAuth && !geminiOAuth && !antigravityGemini && !antigravityClaude && !antigravityUpstream) {
		return nil, fmt.Errorf("account requires an unsupported data-plane transport")
	}
	if antigravityUpstream {
		return a.antigravityUpstreamExecutionPlan(account, request)
	}
	if antigravityClaude {
		return a.antigravityClaudeExecutionPlan(ctx, account, request)
	}
	if antigravityGemini {
		return a.antigravityGeminiExecutionPlan(ctx, account, request)
	}
	if geminiOAuth {
		return a.geminiOAuthExecutionPlan(ctx, account, request)
	}
	if grokOAuth {
		return a.grokExecutionPlan(ctx, account, request)
	}
	if bedrock {
		return a.bedrockExecutionPlan(ctx, account, request)
	}
	if openAICodex {
		return a.openAICodexExecutionPlan(ctx, account, request)
	}
	if vertexGemini {
		return a.vertexGeminiExecutionPlan(ctx, account, request)
	}
	if vertexAnthropic {
		return a.vertexAnthropicExecutionPlan(ctx, account, request)
	}
	if anthropicOAuth {
		return a.anthropicOAuthExecutionPlan(ctx, account, request)
	}
	baseURL := strings.TrimSpace(account.GetCredential("base_url"))
	switch platform {
	case service.PlatformOpenAI:
		if baseURL == "" {
			if account.Type != service.AccountTypeAPIKey {
				return nil, fmt.Errorf("OpenAI OAuth account requires a provider transport")
			}
			baseURL = "https://api.openai.com"
		}
	case service.PlatformGrok:
		if baseURL == "" {
			baseURL = "https://api.x.ai"
		}
	case service.PlatformAnthropic:
		if baseURL == "" {
			baseURL = "https://api.anthropic.com"
		}
	case service.PlatformGemini:
		if baseURL == "" {
			baseURL = "https://generativelanguage.googleapis.com"
		}
	default:
		if baseURL == "" {
			return nil, fmt.Errorf("custom upstream base URL is required")
		}
	}
	var err error
	if platform == service.PlatformOpenAI || platform == service.PlatformGrok {
		baseURL, err = a.openAI.ValidateDataPlaneUpstreamBaseURL(baseURL)
	} else {
		baseURL, err = a.gateway.ValidateDataPlaneUpstreamBaseURL(baseURL)
	}
	if err != nil {
		return nil, err
	}
	mappedModel := account.GetMappedModel(request.GetRequestedModel())
	if mappedModel == "" {
		mappedModel = request.GetRequestedModel()
	}
	requestPath := request.GetPath()
	if request.GetProtocol() == controlv1.Protocol_PROTOCOL_GEMINI && mappedModel != request.GetRequestedModel() {
		requestPath = mapGeminiModelPath(requestPath, mappedModel)
	}
	target, err := buildUpstreamURL(baseURL, requestPath)
	if err != nil {
		return nil, err
	}
	var token, tokenType string
	if platform == service.PlatformOpenAI || platform == service.PlatformGrok {
		token, tokenType, err = a.openAI.GetAccessToken(ctx, account)
	} else {
		token, tokenType, err = a.gateway.GetAccessToken(ctx, account)
	}
	if err != nil || token == "" {
		return nil, fmt.Errorf("resolve upstream credential: %w", err)
	}
	headers := make(map[string]string)
	if platform == service.PlatformAnthropic && tokenType == "apikey" {
		headers["x-api-key"] = token
	} else if platform == service.PlatformGemini && tokenType == "apikey" {
		headers["x-goog-api-key"] = token
	} else {
		headers["Authorization"] = "Bearer " + token
	}
	plan := &controlv1.ExecutionPlan{
		UpstreamUrl: target, UpstreamMethod: request.GetMethod(), UpstreamHeaders: headers,
		MappedModel: mappedModel, TransportProfile: "standard", ProtocolProfile: "passthrough", MaxAttempts: 1,
	}
	if account.Proxy != nil {
		if !account.Proxy.IsActive() || account.Proxy.IsExpired(a.now()) {
			return nil, fmt.Errorf("account proxy is unavailable")
		}
		plan.TransportProfile = "proxy"
		plan.ProxyProfile = strconv.FormatInt(account.Proxy.ID, 10)
		plan.ProxyUrl = account.Proxy.URL()
	}
	if account.IsTLSFingerprintEnabled() {
		if a.gateway == nil {
			return nil, fmt.Errorf("TLS fingerprint profile service is unavailable")
		}
		fingerprint := a.gateway.ResolveDataPlaneTLSFingerprint(account)
		if fingerprint == nil {
			return nil, fmt.Errorf("TLS fingerprint profile is unavailable")
		}
		if plan.ProxyUrl != "" {
			proxyURL, parseErr := url.Parse(plan.ProxyUrl)
			if parseErr != nil || strings.EqualFold(proxyURL.Scheme, "https") {
				return nil, fmt.Errorf("configured proxy cannot preserve the TLS fingerprint")
			}
		}
		plan.TransportProfile = "fingerprint"
		plan.TlsFingerprint = dataPlaneTLSFingerprint(fingerprint)
	}
	return plan, nil
}

func (a *AdmissionController) grokExecutionPlan(ctx context.Context, account *service.Account, request *controlv1.OpenRequestRequest) (*controlv1.ExecutionPlan, error) {
	if a.openAI == nil || account == nil || !account.IsGrokOAuth() {
		return nil, fmt.Errorf("Grok OAuth control services are unavailable")
	}
	parsedPath, err := url.ParseRequestURI(request.GetPath())
	if err != nil || parsedPath.RawQuery != "" || request.GetMethod() != http.MethodPost {
		return nil, fmt.Errorf("unsupported Grok request endpoint")
	}
	compact := false
	switch strings.TrimRight(parsedPath.Path, "/") {
	case "/v1/responses", "/responses", "/backend-api/codex/responses":
	case "/v1/responses/compact", "/responses/compact", "/backend-api/codex/responses/compact":
		compact = true
	default:
		return nil, fmt.Errorf("unsupported Grok request endpoint")
	}
	provider, err := a.openAI.ResolveDataPlaneGrokConfig(ctx, account, request.GetRequestedModel())
	if err != nil {
		return nil, fmt.Errorf("resolve Grok execution config: %w", err)
	}
	target, err := url.Parse(provider.UpstreamURL)
	if err != nil || target.Scheme == "" || target.Host == "" {
		return nil, fmt.Errorf("invalid Grok upstream URL")
	}
	plan := &controlv1.ExecutionPlan{
		UpstreamUrl: provider.UpstreamURL, UpstreamMethod: http.MethodPost, UpstreamHost: target.Host,
		UpstreamHeaders: map[string]string{
			"Authorization":         "Bearer " + provider.AccessToken,
			"Content-Type":          "application/json",
			"Accept":                "application/json, text/event-stream",
			"User-Agent":            "sub2api-grok/1.0",
			"X-Grok-Client-Version": "0.2.93",
			"X-Grok-Client-Mode":    "interactive",
		},
		MappedModel: provider.MappedModel, TransportProfile: "standard", ProtocolProfile: "grok", MaxAttempts: 2,
		ProtocolOptions: map[string]string{
			"compact":                 strconv.FormatBool(compact),
			"known_free_account":      strconv.FormatBool(provider.KnownFreeAccount),
			"allow_client_tool_cache": strconv.FormatBool(provider.AllowClientToolCache),
		},
	}
	if account.Proxy != nil {
		if !account.Proxy.IsActive() || account.Proxy.IsExpired(a.now()) {
			return nil, fmt.Errorf("account proxy is unavailable")
		}
		plan.TransportProfile = "proxy"
		plan.ProxyProfile = strconv.FormatInt(account.Proxy.ID, 10)
		plan.ProxyUrl = account.Proxy.URL()
	}
	return plan, nil
}

func (a *AdmissionController) bedrockExecutionPlan(ctx context.Context, account *service.Account, request *controlv1.OpenRequestRequest) (*controlv1.ExecutionPlan, error) {
	if a.gateway == nil || account == nil || !account.IsBedrock() {
		return nil, fmt.Errorf("Bedrock control services are unavailable")
	}
	parsedPath, err := url.ParseRequestURI(request.GetPath())
	if err != nil || parsedPath.Path != "/v1/messages" || parsedPath.RawQuery != "" || request.GetMethod() != http.MethodPost {
		return nil, fmt.Errorf("unsupported Bedrock request endpoint")
	}
	provider, err := a.gateway.ResolveDataPlaneBedrockConfig(ctx, account, request.GetRequestedModel(), request.GetAnthropicBeta(), request.GetGroupId())
	if err != nil {
		return nil, fmt.Errorf("resolve Bedrock execution config: %w", err)
	}
	target := service.BuildBedrockURL(provider.Region, provider.ModelID, request.GetStream())
	targetURL, err := url.Parse(target)
	if err != nil || targetURL.Host == "" {
		return nil, fmt.Errorf("build Bedrock upstream URL")
	}
	blockedBetas, err := json.Marshal(provider.BlockedAutoBetas)
	if err != nil {
		return nil, fmt.Errorf("encode Bedrock beta policy: %w", err)
	}
	headers := map[string]string{"Content-Type": "application/json", "Accept": "application/json"}
	options := map[string]string{
		"auth_mode":           provider.AuthMode,
		"aws_region":          provider.Region,
		"cc_compat":           strconv.FormatBool(provider.CCCompat),
		"initial_beta_tokens": strings.Join(provider.InitialBetas, ","),
		"allowed_auto_betas":  strings.Join(provider.AllowedAutoBetas, ","),
		"blocked_auto_betas":  string(blockedBetas),
	}
	if provider.AuthMode == "apikey" {
		headers["Authorization"] = "Bearer " + provider.APIKey
	}
	plan := &controlv1.ExecutionPlan{
		UpstreamUrl: target, UpstreamMethod: http.MethodPost, UpstreamHost: targetURL.Host,
		UpstreamHeaders: headers, MappedModel: provider.ModelID,
		TransportProfile: "standard", ProtocolProfile: "bedrock", MaxAttempts: 1, ProtocolOptions: options,
	}
	if account.Proxy != nil {
		if !account.Proxy.IsActive() || account.Proxy.IsExpired(a.now()) {
			return nil, fmt.Errorf("account proxy is unavailable")
		}
		plan.TransportProfile = "proxy"
		plan.ProxyProfile = strconv.FormatInt(account.Proxy.ID, 10)
		plan.ProxyUrl = account.Proxy.URL()
	}
	return plan, nil
}

func (a *AdmissionController) openAICodexExecutionPlan(ctx context.Context, account *service.Account, request *controlv1.OpenRequestRequest) (*controlv1.ExecutionPlan, error) {
	if a.openAI == nil || account == nil || !account.IsOpenAIOAuth() {
		return nil, fmt.Errorf("OpenAI Codex control services are unavailable")
	}
	parsedPath, err := url.ParseRequestURI(request.GetPath())
	if err != nil || request.GetMethod() != http.MethodPost {
		return nil, fmt.Errorf("unsupported OpenAI Codex request endpoint")
	}
	compact := false
	switch strings.TrimRight(parsedPath.Path, "/") {
	case "/v1/responses", "/responses", "/backend-api/codex/responses":
	case "/v1/responses/compact", "/responses/compact", "/backend-api/codex/responses/compact":
		compact = true
	default:
		return nil, fmt.Errorf("unsupported OpenAI Codex request endpoint")
	}
	if parsedPath.RawQuery != "" {
		return nil, fmt.Errorf("OpenAI Codex request query parameters are unsupported")
	}

	provider, err := a.openAI.ResolveDataPlaneOpenAICodexConfig(ctx, account, request.GetRequestedModel(), request.GetUserAgent(), compact)
	if err != nil {
		return nil, fmt.Errorf("resolve OpenAI Codex execution config: %w", err)
	}
	target := "https://chatgpt.com/backend-api/codex/responses"
	if compact {
		target += "/compact"
	}
	headers := map[string]string{
		"Authorization": provider.Authorization,
		"Content-Type":  "application/json",
		"Accept":        "text/event-stream",
		"OpenAI-Beta":   "responses=experimental",
		"User-Agent":    provider.UserAgent,
		"originator":    provider.Originator,
		"version":       provider.Version,
	}
	if compact {
		headers["Accept"] = "application/json"
	}
	if provider.ChatGPTAccountID != "" {
		headers["chatgpt-account-id"] = provider.ChatGPTAccountID
	}
	if provider.FedRAMP {
		headers["x-openai-fedramp"] = "true"
	}
	plan := &controlv1.ExecutionPlan{
		UpstreamUrl: target, UpstreamMethod: http.MethodPost, UpstreamHost: "chatgpt.com", UpstreamHeaders: headers,
		MappedModel: provider.MappedModel, TransportProfile: "standard", ProtocolProfile: "openai_codex", MaxAttempts: 1,
		ProtocolOptions: map[string]string{
			"compact":              strconv.FormatBool(compact),
			"device_id":            provider.DeviceID,
			"default_instructions": provider.DefaultInstructions,
		},
	}
	if account.Proxy != nil {
		if !account.Proxy.IsActive() || account.Proxy.IsExpired(a.now()) {
			return nil, fmt.Errorf("account proxy is unavailable")
		}
		plan.TransportProfile = "proxy"
		plan.ProxyProfile = strconv.FormatInt(account.Proxy.ID, 10)
		plan.ProxyUrl = account.Proxy.URL()
	}
	if account.IsTLSFingerprintEnabled() {
		if a.gateway == nil {
			return nil, fmt.Errorf("TLS fingerprint profile service is unavailable")
		}
		fingerprint := a.gateway.ResolveDataPlaneTLSFingerprint(account)
		if fingerprint == nil {
			return nil, fmt.Errorf("TLS fingerprint profile is unavailable")
		}
		if plan.ProxyUrl != "" {
			proxyURL, parseErr := url.Parse(plan.ProxyUrl)
			if parseErr != nil || strings.EqualFold(proxyURL.Scheme, "https") {
				return nil, fmt.Errorf("configured proxy cannot preserve the TLS fingerprint")
			}
		}
		plan.TransportProfile = "fingerprint"
		plan.TlsFingerprint = dataPlaneTLSFingerprint(fingerprint)
	}
	return plan, nil
}

func (a *AdmissionController) anthropicOAuthExecutionPlan(ctx context.Context, account *service.Account, request *controlv1.OpenRequestRequest) (*controlv1.ExecutionPlan, error) {
	if a.gateway == nil || account == nil || !account.IsAnthropicOAuthOrSetupToken() {
		return nil, fmt.Errorf("Anthropic OAuth control services are unavailable")
	}
	parsedPath, err := url.ParseRequestURI(request.GetPath())
	if err != nil || parsedPath.Path != "/v1/messages" || request.GetMethod() != http.MethodPost {
		return nil, fmt.Errorf("unsupported Anthropic OAuth request endpoint")
	}

	baseURL := "https://api.anthropic.com"
	if account.IsCustomBaseURLEnabled() {
		baseURL = strings.TrimSpace(account.GetCustomBaseURL())
		if baseURL == "" {
			return nil, fmt.Errorf("custom Anthropic OAuth base URL is empty")
		}
	}
	baseURL, err = a.gateway.ValidateDataPlaneUpstreamBaseURL(baseURL)
	if err != nil {
		return nil, err
	}
	target, err := buildUpstreamURL(baseURL, "/v1/messages")
	if err != nil {
		return nil, err
	}
	target += "?beta=true"

	mappedModel := service.ResolveDataPlaneAnthropicOAuthModel(request.GetRequestedModel())
	if mappedModel == "" {
		return nil, fmt.Errorf("resolve Anthropic OAuth model")
	}
	token, err := a.gateway.ResolveDataPlaneAnthropicOAuthAccessToken(ctx, account)
	if err != nil {
		return nil, fmt.Errorf("resolve Anthropic OAuth token: %w", err)
	}
	passthrough := service.IsDataPlaneClaudeCodeRequest(request.GetUserAgent(), request.GetAnthropicMetadataUserId(), request.GetAnthropicBillingAttribution())
	mimic := !passthrough
	finalBeta, err := a.gateway.ResolveDataPlaneAnthropicOAuthBeta(ctx, account, mappedModel, request.GetAnthropicBeta(), mimic)
	if err != nil {
		return nil, err
	}
	headers := map[string]string{
		"Authorization":     "Bearer " + token,
		"Content-Type":      "application/json",
		"Accept":            "application/json",
		"anthropic-version": "2023-06-01",
	}
	if finalBeta != "" {
		headers["anthropic-beta"] = finalBeta
	}
	mode := "claude_code_passthrough"
	options := map[string]string{"client_mode": mode, "anthropic_beta": finalBeta}
	if mimic {
		passthroughBeta, betaErr := a.gateway.ResolveDataPlaneAnthropicOAuthBeta(ctx, account, mappedModel, request.GetAnthropicBeta(), false)
		if betaErr != nil {
			return nil, betaErr
		}
		mimicConfig, configErr := a.gateway.ResolveDataPlaneAnthropicOAuthMimicConfig(ctx)
		if configErr != nil {
			return nil, configErr
		}
		mode = "mimic"
		options["client_mode"] = mode
		options["account_id"] = strconv.FormatInt(account.ID, 10)
		options["original_user_agent"] = request.GetUserAgent()
		options["passthrough_beta"] = passthroughBeta
		options["account_uuid"] = strings.TrimSpace(account.GetExtraString("account_uuid"))
		options["claude_user_id"] = strings.TrimSpace(account.GetClaudeUserID())
		options["system_prompt_enabled"] = strconv.FormatBool(mimicConfig.SystemPromptEnabled)
		options["system_prompt"] = mimicConfig.SystemPrompt
		options["system_prompt_blocks"] = mimicConfig.SystemPromptBlocks
		options["metadata_passthrough"] = strconv.FormatBool(mimicConfig.MetadataPassthrough)
		options["normalize_dateline"] = strconv.FormatBool(mimicConfig.NormalizeDateline)
		options["cache_ttl_1h"] = strconv.FormatBool(mimicConfig.CacheTTL1h)
		options["rewrite_message_cache"] = strconv.FormatBool(mimicConfig.RewriteMessageCache)
		for key, value := range service.DataPlaneClaudeOAuthDefaultHeaders() {
			if value != "" {
				headers[key] = value
			}
		}
		headers["Accept"] = "application/json"
		headers["x-client-request-id"] = uuid.NewString()
		if request.GetStream() {
			headers["x-stainless-helper-method"] = "stream"
		}
	}
	plan := &controlv1.ExecutionPlan{
		UpstreamUrl: target, UpstreamMethod: http.MethodPost, UpstreamHeaders: headers,
		MappedModel: mappedModel, TransportProfile: "standard", ProtocolProfile: "anthropic_oauth", MaxAttempts: 1,
		ProtocolOptions: options,
	}
	if account.Proxy != nil {
		if !account.Proxy.IsActive() || account.Proxy.IsExpired(a.now()) {
			return nil, fmt.Errorf("account proxy is unavailable")
		}
		plan.TransportProfile = "proxy"
		plan.ProxyProfile = strconv.FormatInt(account.Proxy.ID, 10)
		plan.ProxyUrl = account.Proxy.URL()
	}
	if account.IsTLSFingerprintEnabled() {
		fingerprint := a.gateway.ResolveDataPlaneTLSFingerprint(account)
		if fingerprint == nil {
			return nil, fmt.Errorf("TLS fingerprint profile is unavailable")
		}
		if plan.ProxyUrl != "" {
			proxyURL, parseErr := url.Parse(plan.ProxyUrl)
			if parseErr != nil || strings.EqualFold(proxyURL.Scheme, "https") {
				return nil, fmt.Errorf("configured proxy cannot preserve the TLS fingerprint")
			}
		}
		plan.TransportProfile = "fingerprint"
		plan.TlsFingerprint = dataPlaneTLSFingerprint(fingerprint)
	}
	return plan, nil
}

func (a *AdmissionController) vertexAnthropicExecutionPlan(ctx context.Context, account *service.Account, request *controlv1.OpenRequestRequest) (*controlv1.ExecutionPlan, error) {
	if a.claudeTokens == nil || a.gateway == nil {
		return nil, fmt.Errorf("Anthropic Vertex control services are unavailable")
	}
	mappedModel := service.ResolveDataPlaneVertexAnthropicModel(account, request.GetRequestedModel())
	if strings.TrimSpace(mappedModel) == "" {
		return nil, fmt.Errorf("resolve Anthropic Vertex model")
	}
	target, err := service.BuildDataPlaneVertexAnthropicURL(account, mappedModel, request.GetStream())
	if err != nil {
		return nil, err
	}
	token, err := a.claudeTokens.ResolveDataPlaneClaudeAccessToken(ctx, account)
	if err != nil || strings.TrimSpace(token) == "" {
		return nil, fmt.Errorf("resolve Anthropic Vertex service-account token: %w", err)
	}
	finalBeta, err := a.gateway.ResolveDataPlaneVertexAnthropicBeta(ctx, account, mappedModel, request.GetAnthropicBeta())
	if err != nil {
		return nil, err
	}
	headers := map[string]string{
		"Authorization": "Bearer " + token,
		"Content-Type":  "application/json",
	}
	if finalBeta != "" {
		headers["anthropic-beta"] = finalBeta
	}
	plan := &controlv1.ExecutionPlan{
		UpstreamUrl: target, UpstreamMethod: http.MethodPost, UpstreamHeaders: headers,
		MappedModel: mappedModel, TransportProfile: "standard", ProtocolProfile: "vertex_anthropic", MaxAttempts: 1,
		ProtocolOptions: map[string]string{
			"anthropic_version": service.VertexAnthropicDataPlaneVersion,
			"anthropic_beta":    finalBeta,
		},
	}
	if account.Proxy != nil {
		if !account.Proxy.IsActive() || account.Proxy.IsExpired(a.now()) {
			return nil, fmt.Errorf("account proxy is unavailable")
		}
		plan.TransportProfile = "proxy"
		plan.ProxyProfile = strconv.FormatInt(account.Proxy.ID, 10)
		plan.ProxyUrl = account.Proxy.URL()
	}
	return plan, nil
}

func (a *AdmissionController) vertexGeminiExecutionPlan(ctx context.Context, account *service.Account, request *controlv1.OpenRequestRequest) (*controlv1.ExecutionPlan, error) {
	if a.geminiTokens == nil {
		return nil, fmt.Errorf("Gemini service-account token provider is unavailable")
	}
	mappedModel := account.GetMappedModel(request.GetRequestedModel())
	if mappedModel == "" {
		mappedModel = request.GetRequestedModel()
	}
	action, err := vertexGeminiAction(request.GetPath())
	if err != nil {
		return nil, err
	}
	target, err := service.BuildDataPlaneVertexGeminiURL(account, mappedModel, action, false)
	if err != nil {
		return nil, err
	}
	clientPath, _ := url.ParseRequestURI(request.GetPath())
	if request.GetStream() && (clientPath == nil || clientPath.Query().Get("alt") != "sse") {
		target += "?alt=sse"
	}
	token, err := a.geminiTokens.ResolveDataPlaneGeminiAccessToken(ctx, account)
	if err != nil || strings.TrimSpace(token) == "" {
		return nil, fmt.Errorf("resolve Vertex service-account token: %w", err)
	}
	plan := &controlv1.ExecutionPlan{
		UpstreamUrl: target, UpstreamMethod: request.GetMethod(),
		UpstreamHeaders: map[string]string{"Authorization": "Bearer " + token},
		MappedModel:     mappedModel, TransportProfile: "standard", ProtocolProfile: "passthrough", MaxAttempts: 1,
	}
	if account.Proxy != nil {
		if !account.Proxy.IsActive() || account.Proxy.IsExpired(a.now()) {
			return nil, fmt.Errorf("account proxy is unavailable")
		}
		plan.TransportProfile = "proxy"
		plan.ProxyProfile = strconv.FormatInt(account.Proxy.ID, 10)
		plan.ProxyUrl = account.Proxy.URL()
	}
	return plan, nil
}

func (a *AdmissionController) geminiOAuthExecutionPlan(ctx context.Context, account *service.Account, request *controlv1.OpenRequestRequest) (*controlv1.ExecutionPlan, error) {
	if a.gateway == nil || a.geminiTokens == nil || request.GetMethod() != http.MethodPost {
		return nil, fmt.Errorf("Gemini OAuth control services are unavailable")
	}
	action, err := vertexGeminiAction(request.GetPath())
	if err != nil {
		return nil, err
	}
	parsed, err := url.ParseRequestURI(request.GetPath())
	if err != nil {
		return nil, fmt.Errorf("invalid Gemini request path")
	}
	clientStream := action == "streamGenerateContent"
	query := parsed.Query()
	if len(query) > 0 && (!clientStream || len(query) != 1 || len(query["alt"]) != 1 || query.Get("alt") != "sse") {
		return nil, fmt.Errorf("unsupported Gemini request query")
	}
	provider, err := a.gateway.ResolveDataPlaneGeminiOAuthConfig(ctx, a.geminiTokens, account, request.GetRequestedModel(), action, clientStream)
	if err != nil {
		return nil, err
	}
	target, err := url.Parse(provider.UpstreamURL)
	if err != nil || target.Scheme == "" || target.Host == "" {
		return nil, fmt.Errorf("invalid Gemini OAuth upstream URL")
	}
	// ReverseProxy preserves the validated client query. Avoid emitting a
	// duplicate alt=sse when the native streaming path already carries it.
	if clientStream && query.Get("alt") == "sse" {
		target.RawQuery = ""
		provider.UpstreamURL = target.String()
	}
	headers := map[string]string{
		"Authorization": "Bearer " + provider.AccessToken,
		"Content-Type":  "application/json",
		"Accept":        "application/json",
	}
	if provider.UpstreamStream {
		headers["Accept"] = "text/event-stream"
	}
	if provider.Mode == "code_assist" {
		headers["User-Agent"] = "GeminiCLI/0.1.5 (Windows; AMD64)"
	}
	plan := &controlv1.ExecutionPlan{
		UpstreamUrl: provider.UpstreamURL, UpstreamMethod: http.MethodPost, UpstreamHost: target.Host,
		UpstreamHeaders: headers, MappedModel: provider.MappedModel,
		TransportProfile: "standard", ProtocolProfile: "gemini_oauth", MaxAttempts: 1,
		ProtocolOptions: map[string]string{
			"mode":             provider.Mode,
			"project_id":       provider.ProjectID,
			"action":           provider.Action,
			"upstream_stream":  strconv.FormatBool(provider.UpstreamStream),
			"aggregate_stream": strconv.FormatBool(provider.AggregateStream),
			"count_tokens":     strconv.FormatBool(provider.Action == "countTokens"),
		},
	}
	if account.Proxy != nil {
		if !account.Proxy.IsActive() || account.Proxy.IsExpired(a.now()) {
			return nil, fmt.Errorf("account proxy is unavailable")
		}
		plan.TransportProfile = "proxy"
		plan.ProxyProfile = strconv.FormatInt(account.Proxy.ID, 10)
		plan.ProxyUrl = account.Proxy.URL()
	}
	return plan, nil
}

func (a *AdmissionController) antigravityGeminiExecutionPlan(ctx context.Context, account *service.Account, request *controlv1.OpenRequestRequest) (*controlv1.ExecutionPlan, error) {
	if a.gateway == nil || a.antigravityTokens == nil || request.GetMethod() != http.MethodPost {
		return nil, fmt.Errorf("Antigravity control services are unavailable")
	}
	action, err := vertexGeminiAction(request.GetPath())
	if err != nil {
		return nil, err
	}
	parsed, err := url.ParseRequestURI(request.GetPath())
	if err != nil {
		return nil, fmt.Errorf("invalid Antigravity Gemini request path")
	}
	clientStream := action == "streamGenerateContent"
	query := parsed.Query()
	if len(query) > 0 && (!clientStream || len(query) != 1 || len(query["alt"]) != 1 || query.Get("alt") != "sse") {
		return nil, fmt.Errorf("unsupported Antigravity Gemini request query")
	}
	provider, err := a.gateway.ResolveDataPlaneAntigravityConfig(ctx, a.antigravityTokens, account, request.GetRequestedModel(), action, clientStream)
	if err != nil {
		return nil, err
	}
	target, err := url.Parse(provider.UpstreamURL)
	if err != nil || target.Scheme != "https" || target.Host == "" {
		return nil, fmt.Errorf("invalid Antigravity upstream URL")
	}
	// The execution plan owns the sole alt=sse query. ReverseProxy must not
	// merge the validated client copy and emit duplicate query parameters.
	if clientStream && query.Get("alt") == "sse" {
		target.RawQuery = ""
		provider.UpstreamURL = target.String()
	}
	plan := &controlv1.ExecutionPlan{
		UpstreamUrl: provider.UpstreamURL, UpstreamMethod: http.MethodPost, UpstreamHost: target.Host,
		UpstreamHeaders: map[string]string{
			"Authorization": "Bearer " + provider.AccessToken,
			"Content-Type":  "application/json", "Accept": "text/event-stream", "User-Agent": provider.UserAgent,
		},
		MappedModel: provider.MappedModel, TransportProfile: "standard", ProtocolProfile: "antigravity", MaxAttempts: 2,
		ProtocolOptions: map[string]string{
			"mode": "native_gemini", "project_id": provider.ProjectID, "action": provider.Action,
			"upstream_stream":  strconv.FormatBool(provider.UpstreamStream),
			"aggregate_stream": strconv.FormatBool(provider.AggregateStream),
			"count_tokens":     strconv.FormatBool(provider.Action == "countTokens"),
		},
	}
	if account.Proxy != nil {
		if !account.Proxy.IsActive() || account.Proxy.IsExpired(a.now()) {
			return nil, fmt.Errorf("account proxy is unavailable")
		}
		plan.TransportProfile = "proxy"
		plan.ProxyProfile = strconv.FormatInt(account.Proxy.ID, 10)
		plan.ProxyUrl = account.Proxy.URL()
	}
	return plan, nil
}

func (a *AdmissionController) antigravityClaudeExecutionPlan(ctx context.Context, account *service.Account, request *controlv1.OpenRequestRequest) (*controlv1.ExecutionPlan, error) {
	if a.gateway == nil || a.antigravityTokens == nil || request.GetMethod() != http.MethodPost || request.GetPath() != "/v1/messages" {
		return nil, fmt.Errorf("unsupported Antigravity Claude request")
	}
	provider, err := a.gateway.ResolveDataPlaneAntigravityConfig(ctx, a.antigravityTokens, account, request.GetRequestedModel(), "messages", request.GetStream())
	if err != nil {
		return nil, err
	}
	target, err := url.Parse(provider.UpstreamURL)
	if err != nil || target.Scheme != "https" || target.Host == "" || target.RawQuery != "alt=sse" {
		return nil, fmt.Errorf("invalid Antigravity upstream URL")
	}
	plan := &controlv1.ExecutionPlan{
		UpstreamUrl: provider.UpstreamURL, UpstreamMethod: http.MethodPost, UpstreamHost: target.Host,
		UpstreamHeaders: map[string]string{
			"Authorization": "Bearer " + provider.AccessToken,
			"Content-Type":  "application/json", "Accept": "text/event-stream", "User-Agent": provider.UserAgent,
		},
		MappedModel: provider.MappedModel, TransportProfile: "standard", ProtocolProfile: "antigravity", MaxAttempts: 2,
		ProtocolOptions: map[string]string{
			"mode": "claude", "project_id": provider.ProjectID, "action": provider.Action,
			"client_stream": strconv.FormatBool(request.GetStream()), "upstream_stream": "true",
			"aggregate_stream": strconv.FormatBool(!request.GetStream()), "count_tokens": "false",
		},
	}
	if account.Proxy != nil {
		if !account.Proxy.IsActive() || account.Proxy.IsExpired(a.now()) {
			return nil, fmt.Errorf("account proxy is unavailable")
		}
		plan.TransportProfile = "proxy"
		plan.ProxyProfile = strconv.FormatInt(account.Proxy.ID, 10)
		plan.ProxyUrl = account.Proxy.URL()
	}
	return plan, nil
}

func (a *AdmissionController) antigravityUpstreamExecutionPlan(account *service.Account, request *controlv1.OpenRequestRequest) (*controlv1.ExecutionPlan, error) {
	if a.gateway == nil || request.GetMethod() != http.MethodPost || request.GetPath() != "/v1/messages" {
		return nil, fmt.Errorf("unsupported Antigravity upstream request")
	}
	baseURL := strings.TrimSpace(account.GetCredential("base_url"))
	apiKey := strings.TrimSpace(account.GetCredential("api_key"))
	if baseURL == "" || apiKey == "" {
		return nil, fmt.Errorf("Antigravity upstream account is incomplete")
	}
	baseURL, err := a.gateway.ValidateDataPlaneUpstreamBaseURL(baseURL)
	if err != nil {
		return nil, err
	}
	target, err := buildUpstreamURL(baseURL, "/v1/messages")
	if err != nil {
		return nil, err
	}
	mappedModel := strings.TrimSpace(account.GetMappedModel(request.GetRequestedModel()))
	if mappedModel == "" {
		return nil, fmt.Errorf("unsupported Antigravity upstream model")
	}
	plan := &controlv1.ExecutionPlan{
		UpstreamUrl: target, UpstreamMethod: http.MethodPost,
		UpstreamHeaders: map[string]string{
			"Authorization": "Bearer " + apiKey, "x-api-key": apiKey,
			"Content-Type": "application/json", "Accept": "application/json",
			"anthropic-version": "2023-06-01",
		},
		MappedModel: mappedModel, TransportProfile: "standard", ProtocolProfile: "anthropic_upstream", MaxAttempts: 1,
		ProtocolOptions: map[string]string{"anthropic_beta": strings.TrimSpace(request.GetAnthropicBeta())},
	}
	if beta := plan.ProtocolOptions["anthropic_beta"]; beta != "" {
		plan.UpstreamHeaders["anthropic-beta"] = beta
	}
	if account.Proxy != nil {
		if !account.Proxy.IsActive() || account.Proxy.IsExpired(a.now()) {
			return nil, fmt.Errorf("account proxy is unavailable")
		}
		plan.TransportProfile = "proxy"
		plan.ProxyProfile = strconv.FormatInt(account.Proxy.ID, 10)
		plan.ProxyUrl = account.Proxy.URL()
	}
	return plan, nil
}

func vertexGeminiAction(requestPath string) (string, error) {
	parsed, err := url.ParseRequestURI(requestPath)
	if err != nil {
		return "", fmt.Errorf("invalid Gemini request path")
	}
	if !strings.HasPrefix(parsed.Path, "/v1beta/models/") {
		return "", fmt.Errorf("unsupported Gemini request path")
	}
	_, action, found := strings.Cut(parsed.Path, ":")
	if !found {
		return "", fmt.Errorf("Gemini request path does not contain an action")
	}
	switch action {
	case "generateContent", "streamGenerateContent", "countTokens":
		return action, nil
	default:
		return "", fmt.Errorf("unsupported Gemini request action")
	}
}

func dataPlaneTLSFingerprint(profile *service.DataPlaneTLSFingerprint) *controlv1.TLSFingerprintProfile {
	if profile == nil {
		return nil
	}
	toUint32 := func(values []uint16) []uint32 {
		result := make([]uint32, len(values))
		for index, value := range values {
			result[index] = uint32(value)
		}
		return result
	}
	return &controlv1.TLSFingerprintProfile{
		ProfileKey: profile.ProfileKey, EnableGrease: profile.EnableGREASE,
		CipherSuites: toUint32(profile.CipherSuites), Curves: toUint32(profile.Curves),
		PointFormats: toUint32(profile.PointFormats), SignatureAlgorithms: toUint32(profile.SignatureAlgorithms),
		AlpnProtocols: append([]string(nil), profile.ALPNProtocols...), SupportedVersions: toUint32(profile.SupportedVersions),
		KeyShareGroups: toUint32(profile.KeyShareGroups), PskModes: toUint32(profile.PSKModes), Extensions: toUint32(profile.Extensions),
	}
}

func mapGeminiModelPath(requestPath, mappedModel string) string {
	parsed, err := url.ParseRequestURI(requestPath)
	if err != nil {
		return requestPath
	}
	const prefix = "/v1beta/models/"
	if !strings.HasPrefix(parsed.Path, prefix) {
		return requestPath
	}
	remainder := strings.TrimPrefix(parsed.Path, prefix)
	_, operation, found := strings.Cut(remainder, ":")
	mappedModel = strings.TrimPrefix(strings.TrimSpace(mappedModel), "models/")
	if mappedModel == "" {
		return requestPath
	}
	parsed.Path = prefix + mappedModel
	if found {
		parsed.Path += ":" + operation
	}
	parsed.RawPath = ""
	return parsed.String()
}

type reservationPlan struct {
	mode           string
	key            string
	amountMicrousd int64
	limitMicrousd  int64
	pricingVersion string
}

func (a *AdmissionController) reservationFor(ctx context.Context, request *controlv1.OpenRequestRequest, apiKey *service.APIKey, subscription *service.UserSubscription, mappedModel string) (reservationPlan, error) {
	if a.cfg != nil && a.cfg.RunMode == config.RunModeSimple {
		return reservationPlan{mode: "simple", key: "simple:" + strconv.FormatInt(apiKey.User.ID, 10), limitMicrousd: maxInt64, pricingVersion: "simple"}, nil
	}
	outputTokens := request.GetMaxOutputTokens()
	if outputTokens <= 0 {
		outputTokens = defaultReservationOutputTokens
	}
	inputTokens := request.GetRequestContentLength()
	if inputTokens < 0 {
		inputTokens = 0
	}
	inputTokens = (inputTokens + 3) / 4
	multiplier := 1.0
	if apiKey.Group != nil {
		multiplier = apiKey.Group.RateMultiplier * apiKey.Group.PeakMultiplierAt(a.now())
		if a.gateway != nil {
			multiplier = a.gateway.ResolveUserGroupRateMultiplier(ctx, apiKey.User.ID, apiKey.Group.ID, multiplier)
		}
	}
	cost, err := a.costs.CalculateCost(mappedModel, service.UsageTokens{InputTokens: boundedInt(inputTokens), OutputTokens: boundedInt(outputTokens)}, multiplier)
	if err != nil {
		return reservationPlan{}, err
	}
	amount := usdToMicrousd(cost.ActualCost)
	if a.cfg != nil {
		amount = max(amount, usdToMicrousd(a.cfg.Billing.MinimumBalanceReserve))
	}
	pricingDigest := sha256.Sum256([]byte(fmt.Sprintf("%s\x00%s\x00%.9f", request.GetRequestedModel(), mappedModel, multiplier)))
	plan := reservationPlan{amountMicrousd: amount, pricingVersion: hex.EncodeToString(pricingDigest[:])}
	if subscription != nil && apiKey.Group != nil && apiKey.Group.IsSubscriptionType() {
		plan.mode = "subscription"
		plan.key = "subscription:" + strconv.FormatInt(subscription.ID, 10)
		plan.limitMicrousd = subscriptionHeadroomMicrousd(subscription, apiKey.Group)
		return plan, nil
	}
	plan.mode = "balance"
	plan.key = "user:" + strconv.FormatInt(apiKey.User.ID, 10)
	plan.limitMicrousd = usdToMicrousd(apiKey.User.Balance)
	return plan, nil
}

const maxInt64 = int64(^uint64(0) >> 1)

func subscriptionHeadroomMicrousd(subscription *service.UserSubscription, group *service.Group) int64 {
	limit := maxInt64
	found := false
	for _, candidate := range []struct {
		limit *float64
		used  float64
	}{{group.DailyLimitUSD, subscription.DailyUsageUSD}, {group.WeeklyLimitUSD, subscription.WeeklyUsageUSD}, {group.MonthlyLimitUSD, subscription.MonthlyUsageUSD}} {
		if candidate.limit == nil || *candidate.limit <= 0 {
			continue
		}
		found = true
		remaining := usdToMicrousd(max(0, *candidate.limit-candidate.used))
		limit = min(limit, remaining)
	}
	if !found {
		return maxInt64
	}
	return limit
}

func usdToMicrousd(value float64) int64 {
	if math.IsNaN(value) || math.IsInf(value, 0) || value <= 0 {
		return 0
	}
	if value >= float64(maxInt64)/1_000_000 {
		return maxInt64
	}
	return int64(math.Ceil(value * 1_000_000))
}

func boundedInt(value int64) int {
	if value <= 0 {
		return 0
	}
	if value > int64(^uint(0)>>1) {
		return int(^uint(0) >> 1)
	}
	return int(value)
}

func buildUpstreamURL(baseURL, requestPath string) (string, error) {
	base, err := url.Parse(baseURL)
	if err != nil || (base.Scheme != "http" && base.Scheme != "https") || base.Host == "" || base.User != nil {
		return "", fmt.Errorf("invalid upstream base URL")
	}
	parsedPath, err := url.ParseRequestURI(requestPath)
	if err != nil {
		return "", fmt.Errorf("invalid upstream request path")
	}
	requestOnlyPath := parsedPath.Path
	basePath := strings.TrimRight(base.Path, "/")
	if strings.HasSuffix(basePath, "/v1") && strings.HasPrefix(requestOnlyPath, "/v1/") {
		requestOnlyPath = strings.TrimPrefix(requestOnlyPath, "/v1")
	}
	base.Path = path.Join(basePath, requestOnlyPath)
	if !strings.HasPrefix(base.Path, "/") {
		base.Path = "/" + base.Path
	}
	base.RawPath = ""
	base.RawQuery = ""
	base.Fragment = ""
	return base.String(), nil
}

func platformForAdmission(group *service.Group, protocol controlv1.Protocol) string {
	if group != nil && group.Platform != "" {
		return group.Platform
	}
	switch protocol {
	case controlv1.Protocol_PROTOCOL_ANTHROPIC:
		return service.PlatformAnthropic
	case controlv1.Protocol_PROTOCOL_GEMINI:
		return service.PlatformGemini
	default:
		return service.PlatformOpenAI
	}
}

func groupIDOf(apiKey *service.APIKey) int64 {
	if apiKey == nil || apiKey.GroupID == nil {
		return 0
	}
	return *apiKey.GroupID
}

func openResponse(record *LeaseRecord, expiresAt time.Time) *controlv1.OpenRequestResponse {
	return &controlv1.OpenRequestResponse{
		Decision: controlv1.Decision_DECISION_ALLOW,
		Lease: &controlv1.RequestLease{
			LeaseId: record.LeaseID, ExpiresAtUnixMs: expiresAt.UnixMilli(), ApiKeyId: record.APIKeyID,
			UserId: record.UserID, GroupId: record.GroupID, AccountId: record.AccountID,
			PricingVersion: record.PricingVersion, BillingReservationId: record.BillingReservationID,
			ReservedAmountMicrousd: record.ReservedAmountMicrousd, BillingMode: record.BillingMode,
		},
		Plan: record.Plan,
	}
}

func openDenied(status int, code, message string) *controlv1.OpenRequestResponse {
	return &controlv1.OpenRequestResponse{Decision: controlv1.Decision_DECISION_DENY, Denial: denial(status, code, message)}
}

func admissionErrorResponse(err error) *controlv1.OpenRequestResponse {
	status := infraerrors.Code(err)
	if status < 400 || status > 599 {
		status = http.StatusForbidden
	}
	code := infraerrors.Reason(err)
	if code == "" {
		code = "BILLING_NOT_ELIGIBLE"
	}
	message := infraerrors.Message(err)
	if message == "" || status >= 500 {
		message = "Billing admission is temporarily unavailable"
	}
	return openDenied(status, code, message)
}
