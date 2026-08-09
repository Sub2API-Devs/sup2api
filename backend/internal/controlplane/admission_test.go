package controlplane

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

type workerAdmissionStub struct {
	worker *service.Worker
	err    error
}

func (s workerAdmissionStub) GetWorkerByRemoteID(context.Context, string) (*service.Worker, error) {
	return s.worker, s.err
}

func TestAdmissionRejectsDisabledWorkerBeforeScheduling(t *testing.T) {
	signer, err := NewGrantSigner(strings.Repeat("w", 32), time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	token, _, err := signer.Issue(GrantClaims{CredentialDigest: "digest", APIKeyID: 7, UserID: 8, GroupID: 9})
	if err != nil {
		t.Fatal(err)
	}
	controller := &AdmissionController{
		apiKeys: &service.APIKeyService{}, billing: &service.BillingCacheService{}, concurrency: &service.ConcurrencyService{},
		costs: &service.BillingService{}, leases: &LeaseStore{}, signer: signer, now: time.Now,
		workers: workerAdmissionStub{worker: &service.Worker{RemoteWorkerID: "worker-disabled", Enabled: false}},
	}
	response, err := controller.Open(context.Background(), &controlv1.OpenRequestRequest{
		RequestId: "request-disabled", DataPlaneId: "worker-disabled", AuthGrantToken: token,
		ApiKeyId: 7, UserId: 8, GroupId: 9,
	})
	if err != nil || response.GetDecision() != controlv1.Decision_DECISION_DENY || response.GetDenial().GetHttpStatus() != 403 || response.GetDenial().GetErrorCode() != "WORKER_DISABLED" {
		t.Fatalf("disabled Worker admission response=%+v err=%v", response, err)
	}
}

func TestAdmissionRejectsDuplicateActiveRequestIDBeforeUpstreamExecution(t *testing.T) {
	mini := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	defer rdb.Close()
	store := NewLeaseStore(&config.Config{DataPlaneControl: config.DataPlaneControlConfig{LeaseTTLSeconds: 60}}, rdb, nil)
	record := testLeaseRecord("lease-duplicate", "request-duplicate", 0)
	record.PricingVersion = "pricing"
	record.RequestedModel = "gpt-client"
	record.MappedModel = "gpt-upstream"
	record.Plan = &controlv1.ExecutionPlan{UpstreamUrl: "https://api.example.test/v1/responses"}
	if _, fresh, err := store.Create(context.Background(), record, 100); err != nil || !fresh {
		t.Fatalf("create existing lease fresh=%v err=%v", fresh, err)
	}
	signer, err := NewGrantSigner(strings.Repeat("s", 32), time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	token, _, err := signer.Issue(GrantClaims{CredentialDigest: "digest", APIKeyID: record.APIKeyID, UserID: record.UserID})
	if err != nil {
		t.Fatal(err)
	}
	controller := &AdmissionController{
		apiKeys: &service.APIKeyService{}, billing: &service.BillingCacheService{}, concurrency: &service.ConcurrencyService{},
		costs: &service.BillingService{}, leases: store, signer: signer, now: time.Now,
	}
	response, err := controller.Open(context.Background(), &controlv1.OpenRequestRequest{
		RequestId: "request-duplicate", DataPlaneId: "node-1", AuthGrantToken: token,
		ApiKeyId: record.APIKeyID, UserId: record.UserID,
	})
	if err != nil || response.GetDecision() != controlv1.Decision_DECISION_DENY || response.GetDenial().GetHttpStatus() != 409 || response.GetDenial().GetErrorCode() != "REQUEST_ID_IN_PROGRESS" {
		t.Fatalf("duplicate admission response=%+v err=%v", response, err)
	}
}

func TestBuildUpstreamURLAvoidsVersionPrefixDuplication(t *testing.T) {
	got, err := buildUpstreamURL("https://api.example.test/v1", "/v1/responses?stream=true")
	if err != nil {
		t.Fatalf("buildUpstreamURL: %v", err)
	}
	if got != "https://api.example.test/v1/responses" {
		t.Fatalf("URL = %q", got)
	}
}

func TestMapGeminiModelPathPreservesOperation(t *testing.T) {
	got := mapGeminiModelPath("/v1beta/models/gemini-client:streamGenerateContent?alt=sse", "models/gemini-upstream")
	if got != "/v1beta/models/gemini-upstream:streamGenerateContent?alt=sse" {
		t.Fatalf("mapped path = %q", got)
	}
}

func TestSubscriptionHeadroomUsesTightestWindow(t *testing.T) {
	daily, weekly := 10.0, 100.0
	group := &service.Group{DailyLimitUSD: &daily, WeeklyLimitUSD: &weekly}
	subscription := &service.UserSubscription{DailyUsageUSD: 9.25, WeeklyUsageUSD: 20}
	if got := subscriptionHeadroomMicrousd(subscription, group); got != 750_000 {
		t.Fatalf("headroom = %d", got)
	}
}

func TestExecutionPlanRejectsAccountsThatRequireProviderPlugins(t *testing.T) {
	controller := &AdmissionController{}
	request := &controlv1.OpenRequestRequest{RequestedModel: "model", Path: "/v1/messages", Method: "POST"}
	for _, accountType := range []string{
		service.AccountTypeOAuth,
		service.AccountTypeSetupToken,
		service.AccountTypeBedrock,
		service.AccountTypeServiceAccount,
		service.AccountTypeUpstream,
	} {
		t.Run(accountType, func(t *testing.T) {
			account := &service.Account{Type: accountType, Platform: service.PlatformAnthropic}
			if _, err := controller.executionPlan(context.Background(), account, request, service.PlatformAnthropic); err == nil {
				t.Fatal("expected account to require a provider-specific data-plane plugin")
			}
		})
	}
}

func TestDataPlaneTLSFingerprintConversionCopiesAllFields(t *testing.T) {
	input := &service.DataPlaneTLSFingerprint{
		ProfileKey: "node-24", EnableGREASE: true,
		CipherSuites: []uint16{0x1301}, Curves: []uint16{0x001d}, PointFormats: []uint16{0},
		SignatureAlgorithms: []uint16{0x0403}, ALPNProtocols: []string{"http/1.1"},
		SupportedVersions: []uint16{0x0304}, KeyShareGroups: []uint16{0x001d},
		PSKModes: []uint16{1}, Extensions: []uint16{0, 43},
	}
	got := dataPlaneTLSFingerprint(input)
	if got.GetProfileKey() != input.ProfileKey || !got.GetEnableGrease() || got.GetCipherSuites()[0] != 0x1301 || got.GetExtensions()[1] != 43 {
		t.Fatalf("converted fingerprint = %+v", got)
	}
	input.CipherSuites[0] = 0
	input.ALPNProtocols[0] = "changed"
	if got.GetCipherSuites()[0] != 0x1301 || got.GetAlpnProtocols()[0] != "http/1.1" {
		t.Fatal("protobuf fingerprint aliases mutable service snapshot")
	}
}

func TestVertexGeminiExecutionPlanUsesShortLivedTokenAndNativeBody(t *testing.T) {
	provider := service.NewGeminiTokenProvider(nil, staticGeminiTokenCache{token: "vertex-token"}, nil)
	controller := &AdmissionController{geminiTokens: provider, now: time.Now}
	account := &service.Account{
		ID: 44, Platform: service.PlatformGemini, Type: service.AccountTypeServiceAccount,
		Credentials: map[string]any{
			"project_id": "vertex-project", "location": "us-central1",
			"service_account_json": `{"project_id":"vertex-project","private_key_id":"kid","private_key":"private","client_email":"svc@example.com"}`,
		},
	}
	request := &controlv1.OpenRequestRequest{
		Protocol: controlv1.Protocol_PROTOCOL_GEMINI, RequestedModel: "gemini-2.5-pro",
		Path: "/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse", Method: "POST", Stream: true,
	}
	plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformGemini)
	if err != nil {
		t.Fatalf("executionPlan: %v", err)
	}
	wantURL := "https://us-central1-aiplatform.googleapis.com/v1/projects/vertex-project/locations/us-central1/publishers/google/models/gemini-2.5-pro:streamGenerateContent"
	if plan.GetUpstreamUrl() != wantURL || plan.GetUpstreamHeaders()["Authorization"] != "Bearer vertex-token" {
		t.Fatalf("plan = %+v", plan)
	}
	if plan.GetProtocolProfile() != "passthrough" || plan.GetMappedModel() != "gemini-2.5-pro" {
		t.Fatalf("plan profiles = %+v", plan)
	}
}

func TestGeminiCodeAssistOAuthExecutionPlanUsesWrappedProtocol(t *testing.T) {
	provider := service.NewGeminiTokenProvider(nil, staticGeminiTokenCache{token: "gemini-oauth-token"}, nil)
	controller := &AdmissionController{gateway: &service.GatewayService{}, geminiTokens: provider, now: time.Now}
	account := &service.Account{
		ID: 57, Platform: service.PlatformGemini, Type: service.AccountTypeOAuth,
		Credentials: map[string]any{
			"access_token": "old-token", "refresh_token": "must-stay-control-plane",
			"project_id": "code-assist-project", "oauth_type": "code_assist",
		},
	}
	request := &controlv1.OpenRequestRequest{
		Protocol: controlv1.Protocol_PROTOCOL_GEMINI, RequestedModel: "gemini-3.1-pro-preview",
		Path: "/v1beta/models/gemini-3.1-pro-preview:streamGenerateContent?alt=sse", Method: "POST", Stream: true,
	}
	plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformGemini)
	if err != nil {
		t.Fatalf("executionPlan: %v", err)
	}
	if plan.GetProtocolProfile() != "gemini_oauth" || plan.GetProtocolOptions()["mode"] != "code_assist" || plan.GetProtocolOptions()["project_id"] != "code-assist-project" {
		t.Fatalf("Code Assist plan = %+v", plan)
	}
	if plan.GetUpstreamUrl() != "https://cloudcode-pa.googleapis.com/v1internal:streamGenerateContent" || plan.GetUpstreamHeaders()["Authorization"] != "Bearer gemini-oauth-token" {
		t.Fatalf("Code Assist route = %+v", plan)
	}
	if plan.GetUpstreamHeaders()["User-Agent"] != "GeminiCLI/0.1.5 (Windows; AMD64)" || plan.GetProtocolOptions()["aggregate_stream"] != "false" {
		t.Fatalf("Code Assist identity/options = %+v", plan)
	}
	if strings.Contains(plan.String(), "must-stay-control-plane") {
		t.Fatalf("Gemini plan leaked refresh token: %s", plan)
	}
}

func TestGeminiCodeAssistNonStreamUsesUpstreamSSEAggregation(t *testing.T) {
	provider := service.NewGeminiTokenProvider(nil, staticGeminiTokenCache{token: "gemini-token"}, nil)
	controller := &AdmissionController{gateway: &service.GatewayService{}, geminiTokens: provider, now: time.Now}
	account := &service.Account{
		ID: 58, Platform: service.PlatformGemini, Type: service.AccountTypeOAuth,
		Credentials: map[string]any{"access_token": "token", "project_id": "project-1"},
	}
	request := &controlv1.OpenRequestRequest{Protocol: controlv1.Protocol_PROTOCOL_GEMINI, RequestedModel: "gemini-2.5-flash", Path: "/v1beta/models/gemini-2.5-flash:generateContent", Method: "POST"}
	plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformGemini)
	if err != nil {
		t.Fatal(err)
	}
	if plan.GetUpstreamUrl() != "https://cloudcode-pa.googleapis.com/v1internal:streamGenerateContent?alt=sse" || plan.GetProtocolOptions()["upstream_stream"] != "true" || plan.GetProtocolOptions()["aggregate_stream"] != "true" {
		t.Fatalf("non-stream Code Assist plan = %+v", plan)
	}
}

func TestGeminiAIStudioOAuthAndCountTokensStayNative(t *testing.T) {
	provider := service.NewGeminiTokenProvider(nil, staticGeminiTokenCache{token: "gemini-token"}, nil)
	controller := &AdmissionController{gateway: &service.GatewayService{}, geminiTokens: provider, now: time.Now}
	for _, account := range []*service.Account{
		{ID: 59, Platform: service.PlatformGemini, Type: service.AccountTypeOAuth, Credentials: map[string]any{"access_token": "token", "oauth_type": "ai_studio"}},
		{ID: 60, Platform: service.PlatformGemini, Type: service.AccountTypeOAuth, Credentials: map[string]any{"access_token": "token", "project_id": "code-assist-project"}},
	} {
		request := &controlv1.OpenRequestRequest{Protocol: controlv1.Protocol_PROTOCOL_GEMINI, RequestedModel: "gemini-2.5-flash", Path: "/v1beta/models/gemini-2.5-flash:countTokens", Method: "POST"}
		plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformGemini)
		if err != nil {
			t.Fatal(err)
		}
		if plan.GetProtocolOptions()["mode"] != "ai_studio" || plan.GetProtocolOptions()["count_tokens"] != "true" || plan.GetUpstreamUrl() != "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:countTokens" {
			t.Fatalf("AI Studio countTokens plan = %+v", plan)
		}
		if plan.GetUpstreamHeaders()["User-Agent"] != "" {
			t.Fatalf("AI Studio received Code Assist identity: %+v", plan.GetUpstreamHeaders())
		}
	}
}

func TestGeminiOAuthExecutionPlanRejectsUnsafeQueries(t *testing.T) {
	provider := service.NewGeminiTokenProvider(nil, staticGeminiTokenCache{token: "gemini-token"}, nil)
	controller := &AdmissionController{gateway: &service.GatewayService{}, geminiTokens: provider, now: time.Now}
	account := &service.Account{ID: 61, Platform: service.PlatformGemini, Type: service.AccountTypeOAuth, Credentials: map[string]any{"access_token": "token"}}
	for _, path := range []string{
		"/v1beta/models/gemini:generateContent?debug=true",
		"/v1beta/models/gemini:streamGenerateContent?alt=json",
		"/v1beta/models/gemini:streamGenerateContent?alt=sse&debug=true",
	} {
		request := &controlv1.OpenRequestRequest{Protocol: controlv1.Protocol_PROTOCOL_GEMINI, RequestedModel: "gemini", Path: path, Method: "POST"}
		if _, err := controller.executionPlan(context.Background(), account, request, service.PlatformGemini); err == nil {
			t.Fatalf("unsafe Gemini path %q was accepted", path)
		}
	}
}

func TestAntigravityGeminiExecutionPlanUsesControlPlaneSnapshot(t *testing.T) {
	tokens := service.NewAntigravityTokenProvider(nil, staticGeminiTokenCache{token: "antigravity-token"}, nil)
	controller := &AdmissionController{gateway: &service.GatewayService{}, antigravityTokens: tokens, now: time.Now}
	account := &service.Account{
		ID: 62, Platform: service.PlatformAntigravity, Type: service.AccountTypeOAuth,
		Credentials: map[string]any{
			"access_token": "old-token", "refresh_token": "must-stay-control-plane", "project_id": "ag-project",
			"model_mapping": map[string]any{"gemini-client": "gemini-3.1-pro-high"},
		},
	}
	request := &controlv1.OpenRequestRequest{
		Protocol: controlv1.Protocol_PROTOCOL_GEMINI, RequestedModel: "gemini-client",
		Path: "/v1beta/models/gemini-client:streamGenerateContent?alt=sse", Method: "POST", Stream: true,
	}
	plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformGemini)
	if err != nil {
		t.Fatalf("executionPlan: %v", err)
	}
	if plan.GetProtocolProfile() != "antigravity" || plan.GetProtocolOptions()["mode"] != "native_gemini" || plan.GetMaxAttempts() != 2 {
		t.Fatalf("Antigravity plan = %+v", plan)
	}
	if plan.GetUpstreamUrl() != "https://cloudcode-pa.googleapis.com/v1internal:streamGenerateContent" || plan.GetMappedModel() != "gemini-3.1-pro-high" {
		t.Fatalf("Antigravity route = %+v", plan)
	}
	if plan.GetUpstreamHeaders()["Authorization"] != "Bearer antigravity-token" || !strings.HasPrefix(plan.GetUpstreamHeaders()["User-Agent"], "antigravity/") {
		t.Fatalf("Antigravity identity = %+v", plan.GetUpstreamHeaders())
	}
	if strings.Contains(plan.String(), "must-stay-control-plane") || strings.Contains(plan.String(), "old-token") {
		t.Fatalf("Antigravity plan leaked stored OAuth credentials: %s", plan)
	}
}

func TestAntigravityGeminiExecutionPlanRejectsUnsupportedQuery(t *testing.T) {
	tokens := service.NewAntigravityTokenProvider(nil, staticGeminiTokenCache{token: "token"}, nil)
	controller := &AdmissionController{gateway: &service.GatewayService{}, antigravityTokens: tokens, now: time.Now}
	account := &service.Account{ID: 63, Platform: service.PlatformAntigravity, Type: service.AccountTypeOAuth, Credentials: map[string]any{"project_id": "project"}}
	requests := []*controlv1.OpenRequestRequest{
		{Protocol: controlv1.Protocol_PROTOCOL_GEMINI, RequestedModel: "gemini-2.5-flash", Path: "/v1beta/models/gemini-2.5-flash:streamGenerateContent?debug=true", Method: "POST"},
	}
	for _, request := range requests {
		if _, err := controller.executionPlan(context.Background(), account, request, service.PlatformGemini); err == nil {
			t.Fatalf("request unexpectedly accepted: %+v", request)
		}
	}
}

func TestAntigravityClaudeExecutionPlanUsesDedicatedTransform(t *testing.T) {
	tokens := service.NewAntigravityTokenProvider(nil, staticGeminiTokenCache{token: "antigravity-claude-token"}, nil)
	controller := &AdmissionController{gateway: &service.GatewayService{}, antigravityTokens: tokens, now: time.Now}
	account := &service.Account{
		ID: 64, Platform: service.PlatformAntigravity, Type: service.AccountTypeOAuth,
		Credentials: map[string]any{
			"refresh_token": "must-stay-control-plane", "project_id": "claude-project",
			"model_mapping": map[string]any{"claude-client": "claude-sonnet-4-5"},
		},
	}
	request := &controlv1.OpenRequestRequest{
		Protocol: controlv1.Protocol_PROTOCOL_ANTHROPIC, RequestedModel: "claude-client",
		Path: "/v1/messages", Method: "POST", Stream: true,
	}
	plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformAnthropic)
	if err != nil {
		t.Fatalf("executionPlan: %v", err)
	}
	if plan.GetProtocolProfile() != "antigravity" || plan.GetProtocolOptions()["mode"] != "claude" || plan.GetProtocolOptions()["client_stream"] != "true" || plan.GetMaxAttempts() != 2 {
		t.Fatalf("Antigravity Claude plan = %+v", plan)
	}
	if plan.GetMappedModel() != "claude-sonnet-4-5" || plan.GetUpstreamUrl() != "https://cloudcode-pa.googleapis.com/v1internal:streamGenerateContent?alt=sse" {
		t.Fatalf("Antigravity Claude route = %+v", plan)
	}
	if plan.GetUpstreamHeaders()["Authorization"] != "Bearer antigravity-claude-token" || strings.Contains(plan.String(), "must-stay-control-plane") {
		t.Fatalf("Antigravity Claude credentials = %+v", plan)
	}
}

func TestAntigravityClaudeExecutionPlanRejectsNonMessagesPaths(t *testing.T) {
	tokens := service.NewAntigravityTokenProvider(nil, staticGeminiTokenCache{token: "token"}, nil)
	controller := &AdmissionController{gateway: &service.GatewayService{}, antigravityTokens: tokens, now: time.Now}
	account := &service.Account{ID: 65, Platform: service.PlatformAntigravity, Type: service.AccountTypeOAuth, Credentials: map[string]any{"project_id": "project"}}
	for _, path := range []string{"/v1/messages?debug=true", "/v1/messages/extra", "/v1/responses"} {
		request := &controlv1.OpenRequestRequest{Protocol: controlv1.Protocol_PROTOCOL_ANTHROPIC, RequestedModel: "claude-sonnet-4-5", Path: path, Method: "POST"}
		if _, err := controller.executionPlan(context.Background(), account, request, service.PlatformAnthropic); err == nil {
			t.Fatalf("path %q unexpectedly accepted", path)
		}
	}
}

func TestAntigravityCustomUpstreamExecutionPlanUsesStrictNativeProtocol(t *testing.T) {
	controller := &AdmissionController{gateway: &service.GatewayService{}, now: time.Now}
	account := &service.Account{
		ID: 66, Platform: service.PlatformAntigravity, Type: service.AccountTypeUpstream,
		Credentials: map[string]any{
			"base_url": "https://relay.example.test/api", "api_key": "relay-secret",
			"model_mapping": map[string]any{"claude-client": "claude-upstream"},
		},
	}
	request := &controlv1.OpenRequestRequest{
		Protocol: controlv1.Protocol_PROTOCOL_ANTHROPIC, RequestedModel: "claude-client",
		Path: "/v1/messages", Method: "POST", Stream: true,
		AnthropicBeta: "context-management-2025-06-27,tool-beta",
	}
	plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformAnthropic)
	if err != nil {
		t.Fatalf("executionPlan: %v", err)
	}
	if plan.GetProtocolProfile() != "anthropic_upstream" || plan.GetUpstreamUrl() != "https://relay.example.test/api/v1/messages" || plan.GetMappedModel() != "claude-upstream" {
		t.Fatalf("custom upstream plan = %+v", plan)
	}
	if plan.GetUpstreamHeaders()["Authorization"] != "Bearer relay-secret" || plan.GetUpstreamHeaders()["x-api-key"] != "relay-secret" || plan.GetUpstreamHeaders()["anthropic-beta"] != request.GetAnthropicBeta() {
		t.Fatalf("custom upstream headers = %+v", plan.GetUpstreamHeaders())
	}
}

func TestVertexGeminiActionRejectsPathsOutsideNativeAPI(t *testing.T) {
	for _, requestPath := range []string{
		"/v1/messages:generateContent",
		"/v1beta/models/gemini:delete",
		"://invalid",
	} {
		if _, err := vertexGeminiAction(requestPath); err == nil {
			t.Fatalf("expected path %q to be rejected", requestPath)
		}
	}
}

func TestVertexAnthropicExecutionPlanSelectsProtocolPlugin(t *testing.T) {
	cache := staticGeminiTokenCache{token: "vertex-claude-token"}
	controller := &AdmissionController{
		gateway:      &service.GatewayService{},
		claudeTokens: service.NewClaudeTokenProvider(nil, cache, nil),
		now:          time.Now,
	}
	account := &service.Account{
		ID: 45, Platform: service.PlatformAnthropic, Type: service.AccountTypeServiceAccount,
		Credentials: map[string]any{
			"project_id": "vertex-project", "location": "us-east5",
			"service_account_json": `{"project_id":"vertex-project","private_key_id":"kid","private_key":"private","client_email":"svc@example.com"}`,
		},
	}
	request := &controlv1.OpenRequestRequest{
		Protocol: controlv1.Protocol_PROTOCOL_ANTHROPIC, RequestedModel: "claude-sonnet-4-5-20250929",
		Path: "/v1/messages", Method: "POST", Stream: true,
		AnthropicBeta: "interleaved-thinking-2025-05-14,advisor-tool-2026-03-01",
	}
	plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformAnthropic)
	if err != nil {
		t.Fatalf("executionPlan: %v", err)
	}
	wantURL := "https://us-east5-aiplatform.googleapis.com/v1/projects/vertex-project/locations/us-east5/publishers/anthropic/models/claude-sonnet-4-5@20250929:streamRawPredict"
	if plan.GetUpstreamUrl() != wantURL || plan.GetProtocolProfile() != "vertex_anthropic" {
		t.Fatalf("plan = %+v", plan)
	}
	if plan.GetUpstreamHeaders()["Authorization"] != "Bearer vertex-claude-token" {
		t.Fatalf("authorization header = %q", plan.GetUpstreamHeaders()["Authorization"])
	}
	if got := plan.GetProtocolOptions()["anthropic_beta"]; got != "interleaved-thinking-2025-05-14" {
		t.Fatalf("final beta = %q", got)
	}
	if plan.GetProtocolOptions()["anthropic_version"] != service.VertexAnthropicDataPlaneVersion {
		t.Fatalf("protocol options = %+v", plan.GetProtocolOptions())
	}
}

func TestAnthropicSetupTokenClaudeCodeExecutionPlanSelectsOAuthPlugin(t *testing.T) {
	controller := &AdmissionController{gateway: &service.GatewayService{}, now: time.Now}
	account := &service.Account{
		ID: 46, Platform: service.PlatformAnthropic, Type: service.AccountTypeSetupToken,
		Credentials: map[string]any{"access_token": "short-lived-claude-token"},
	}
	request := &controlv1.OpenRequestRequest{
		Protocol: controlv1.Protocol_PROTOCOL_ANTHROPIC, RequestedModel: "claude-sonnet-4-5",
		Path: "/v1/messages", Method: "POST", Stream: true,
		UserAgent:               "claude-cli/2.1.220 (external, cli)",
		AnthropicMetadataUserId: "user_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef_account__session_12345678-1234-1234-1234-123456789abc",
	}
	plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformAnthropic)
	if err != nil {
		t.Fatalf("executionPlan: %v", err)
	}
	if plan.GetProtocolProfile() != "anthropic_oauth" || plan.GetUpstreamUrl() != "https://api.anthropic.com/v1/messages?beta=true" {
		t.Fatalf("plan = %+v", plan)
	}
	if plan.GetUpstreamHeaders()["Authorization"] != "Bearer short-lived-claude-token" {
		t.Fatalf("authorization = %q", plan.GetUpstreamHeaders()["Authorization"])
	}
	if plan.GetProtocolOptions()["client_mode"] != "claude_code_passthrough" {
		t.Fatalf("protocol options = %+v", plan.GetProtocolOptions())
	}
	if !strings.Contains(plan.GetUpstreamHeaders()["anthropic-beta"], "oauth-2025-04-20") {
		t.Fatalf("beta header = %q", plan.GetUpstreamHeaders()["anthropic-beta"])
	}
}

func TestAnthropicOAuthMimicRequestSelectsBodyTransformer(t *testing.T) {
	controller := &AdmissionController{gateway: &service.GatewayService{}, now: time.Now}
	account := &service.Account{
		ID: 47, Platform: service.PlatformAnthropic, Type: service.AccountTypeSetupToken,
		Credentials: map[string]any{"access_token": "token"},
	}
	request := &controlv1.OpenRequestRequest{
		Protocol: controlv1.Protocol_PROTOCOL_ANTHROPIC, RequestedModel: "claude-sonnet-4-5",
		Path: "/v1/messages", Method: "POST", UserAgent: "third-party-client/1.0",
	}
	plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformAnthropic)
	if err != nil {
		t.Fatalf("executionPlan: %v", err)
	}
	if plan.GetProtocolProfile() != "anthropic_oauth" || plan.GetProtocolOptions()["client_mode"] != "mimic" {
		t.Fatalf("mimic plan = %+v", plan)
	}
	if !strings.HasPrefix(plan.GetUpstreamHeaders()["User-Agent"], "claude-cli/") || plan.GetUpstreamHeaders()["x-client-request-id"] == "" {
		t.Fatalf("mimic headers = %+v", plan.GetUpstreamHeaders())
	}
	if !strings.Contains(plan.GetUpstreamHeaders()["anthropic-beta"], "claude-code-20250219") {
		t.Fatalf("mimic beta = %q", plan.GetUpstreamHeaders()["anthropic-beta"])
	}
}

func TestOpenAICodexOAuthExecutionPlanUsesShortLivedBearerAndPlugin(t *testing.T) {
	controller := &AdmissionController{openAI: &service.OpenAIGatewayService{}, now: time.Now}
	account := &service.Account{
		ID: 48, Platform: service.PlatformOpenAI, Type: service.AccountTypeOAuth,
		Credentials: map[string]any{
			"access_token": "short-lived-openai-token", "chatgpt_account_id": "chatgpt-account",
			"chatgpt_account_is_fedramp": true,
		},
		Extra: map[string]any{"openai_device_id": "device-123"},
	}
	request := &controlv1.OpenRequestRequest{
		Protocol: controlv1.Protocol_PROTOCOL_OPENAI, RequestedModel: "gpt-5",
		Path: "/v1/responses", Method: "POST", Stream: true, UserAgent: "browser-client/1.0",
	}
	plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformOpenAI)
	if err != nil {
		t.Fatalf("executionPlan: %v", err)
	}
	if plan.GetProtocolProfile() != "openai_codex" || plan.GetUpstreamUrl() != "https://chatgpt.com/backend-api/codex/responses" {
		t.Fatalf("plan = %+v", plan)
	}
	if plan.GetUpstreamHeaders()["Authorization"] != "Bearer short-lived-openai-token" {
		t.Fatalf("authorization = %q", plan.GetUpstreamHeaders()["Authorization"])
	}
	if plan.GetUpstreamHeaders()["chatgpt-account-id"] != "chatgpt-account" || plan.GetUpstreamHeaders()["x-openai-fedramp"] != "true" {
		t.Fatalf("account headers = %+v", plan.GetUpstreamHeaders())
	}
	if !strings.HasPrefix(plan.GetUpstreamHeaders()["User-Agent"], "codex_cli_rs/") || plan.GetUpstreamHeaders()["originator"] != "codex_cli_rs" {
		t.Fatalf("Codex identity = %+v", plan.GetUpstreamHeaders())
	}
	if plan.GetMappedModel() != "gpt-5.4" || plan.GetProtocolOptions()["device_id"] != "device-123" {
		t.Fatalf("model/options = %+v", plan)
	}
}

func TestOpenAICodexPATCompactExecutionPlanUsesSameCredentialBoundary(t *testing.T) {
	controller := &AdmissionController{openAI: &service.OpenAIGatewayService{}, now: time.Now}
	account := &service.Account{
		ID: 49, Platform: service.PlatformOpenAI, Type: service.AccountTypeOAuth,
		Credentials: map[string]any{
			"access_token": "at-personal-access-token", "auth_mode": service.OpenAIAuthModePersonalAccessToken,
			"chatgpt_account_id": "pat-account",
		},
	}
	request := &controlv1.OpenRequestRequest{
		Protocol: controlv1.Protocol_PROTOCOL_OPENAI, RequestedModel: "gpt-5.6-sol-max",
		Path: "/backend-api/codex/responses/compact", Method: "POST", UserAgent: "codex_cli_rs/0.144.1 (Linux; x86_64) xterm",
	}
	plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformOpenAI)
	if err != nil {
		t.Fatalf("executionPlan: %v", err)
	}
	if plan.GetUpstreamUrl() != "https://chatgpt.com/backend-api/codex/responses/compact" || plan.GetUpstreamHeaders()["Accept"] != "application/json" {
		t.Fatalf("compact plan = %+v", plan)
	}
	if plan.GetUpstreamHeaders()["Authorization"] != "Bearer at-personal-access-token" || plan.GetProtocolOptions()["compact"] != "true" {
		t.Fatalf("PAT plan = %+v", plan)
	}
}

func TestOpenAICodexExecutionPlanRejectsUnsupportedEndpoint(t *testing.T) {
	controller := &AdmissionController{openAI: &service.OpenAIGatewayService{}, now: time.Now}
	account := &service.Account{
		ID: 50, Platform: service.PlatformOpenAI, Type: service.AccountTypeOAuth,
		Credentials: map[string]any{"access_token": "token", "chatgpt_account_id": "account"},
	}
	for _, requestPath := range []string{"/v1/chat/completions", "/v1/responses/unsafe/path", "/v1/responses?debug=true"} {
		request := &controlv1.OpenRequestRequest{Protocol: controlv1.Protocol_PROTOCOL_OPENAI, RequestedModel: "gpt-5.4", Path: requestPath, Method: "POST"}
		if _, err := controller.executionPlan(context.Background(), account, request, service.PlatformOpenAI); err == nil {
			t.Fatalf("expected path %q to remain fail-closed", requestPath)
		}
	}
}

func TestGrokOAuthExecutionPlanUsesShortLivedBearerAndPlugin(t *testing.T) {
	controller := &AdmissionController{openAI: &service.OpenAIGatewayService{}, now: time.Now}
	account := &service.Account{
		ID: 54, Platform: service.PlatformGrok, Type: service.AccountTypeOAuth,
		Credentials: map[string]any{
			"access_token": "short-lived-grok-token", "refresh_token": "must-stay-control-plane",
			"subscription_tier": "free",
		},
	}
	request := &controlv1.OpenRequestRequest{
		Protocol: controlv1.Protocol_PROTOCOL_OPENAI, RequestedModel: "grok-4.5",
		Path: "/v1/responses", Method: "POST", Stream: true,
	}
	plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformGrok)
	if err != nil {
		t.Fatalf("executionPlan: %v", err)
	}
	if plan.GetProtocolProfile() != "grok" || !strings.HasSuffix(plan.GetUpstreamUrl(), "/responses") {
		t.Fatalf("Grok plan = %+v", plan)
	}
	if plan.GetMaxAttempts() != 2 {
		t.Fatalf("Grok max attempts = %d", plan.GetMaxAttempts())
	}
	if plan.GetUpstreamHeaders()["Authorization"] != "Bearer short-lived-grok-token" {
		t.Fatalf("authorization = %q", plan.GetUpstreamHeaders()["Authorization"])
	}
	if plan.GetUpstreamHeaders()["User-Agent"] != "sub2api-grok/1.0" || plan.GetUpstreamHeaders()["X-Grok-Client-Version"] != "0.2.93" || plan.GetUpstreamHeaders()["X-Grok-Client-Mode"] != "interactive" {
		t.Fatalf("CLI identity = %+v", plan.GetUpstreamHeaders())
	}
	if plan.GetProtocolOptions()["compact"] != "false" || plan.GetProtocolOptions()["known_free_account"] != "true" || plan.GetProtocolOptions()["allow_client_tool_cache"] != "true" {
		t.Fatalf("Grok options = %+v", plan.GetProtocolOptions())
	}
	encoded := plan.String()
	if strings.Contains(encoded, "must-stay-control-plane") || strings.Contains(strings.ToLower(encoded), "refresh_token") {
		t.Fatalf("execution plan leaked refresh credentials: %s", encoded)
	}
}

func TestGrokCompactExecutionPlanUsesResponsesEndpoint(t *testing.T) {
	controller := &AdmissionController{openAI: &service.OpenAIGatewayService{}, now: time.Now}
	account := &service.Account{
		ID: 55, Platform: service.PlatformGrok, Type: service.AccountTypeOAuth,
		Credentials: map[string]any{"access_token": "grok-token"},
	}
	request := &controlv1.OpenRequestRequest{
		Protocol: controlv1.Protocol_PROTOCOL_OPENAI, RequestedModel: "grok-4.5",
		Path: "/responses/compact", Method: "POST",
	}
	plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformGrok)
	if err != nil {
		t.Fatalf("executionPlan: %v", err)
	}
	if plan.GetProtocolProfile() != "grok" || plan.GetProtocolOptions()["compact"] != "true" || strings.HasSuffix(plan.GetUpstreamUrl(), "/compact") {
		t.Fatalf("compact plan = %+v", plan)
	}
}

func TestGrokExecutionPlanRejectsUnsupportedEndpointAndImageModel(t *testing.T) {
	controller := &AdmissionController{openAI: &service.OpenAIGatewayService{}, now: time.Now}
	account := &service.Account{
		ID: 56, Platform: service.PlatformGrok, Type: service.AccountTypeOAuth,
		Credentials: map[string]any{"access_token": "grok-token"},
	}
	for _, request := range []*controlv1.OpenRequestRequest{
		{Protocol: controlv1.Protocol_PROTOCOL_OPENAI, RequestedModel: "grok-4.5", Path: "/v1/chat/completions", Method: "POST"},
		{Protocol: controlv1.Protocol_PROTOCOL_OPENAI, RequestedModel: "grok-4.5", Path: "/v1/responses?debug=true", Method: "POST"},
		{Protocol: controlv1.Protocol_PROTOCOL_OPENAI, RequestedModel: "grok-imagine-image", Path: "/v1/responses", Method: "POST"},
	} {
		if _, err := controller.executionPlan(context.Background(), account, request, service.PlatformGrok); err == nil {
			t.Fatalf("expected request to remain fail-closed: %+v", request)
		}
	}
}

func TestBedrockSigV4ExecutionPlanSelectsProtocolPlugin(t *testing.T) {
	controller := &AdmissionController{gateway: &service.GatewayService{}, now: time.Now}
	account := &service.Account{
		ID: 51, Platform: service.PlatformAnthropic, Type: service.AccountTypeBedrock,
		Credentials: map[string]any{
			"aws_access_key_id": "AKIDEXAMPLE", "aws_secret_access_key": "secret-example",
			"aws_session_token": "session-example", "aws_region": "eu-west-1",
		},
	}
	request := &controlv1.OpenRequestRequest{
		Protocol: controlv1.Protocol_PROTOCOL_ANTHROPIC, RequestedModel: "claude-opus-4-6",
		Path: "/v1/messages", Method: "POST", Stream: true,
		AnthropicBeta: "context-1m-2025-08-07,unsupported-client-beta",
	}
	plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformAnthropic)
	if err != nil {
		t.Fatalf("executionPlan: %v", err)
	}
	if plan.GetProtocolProfile() != "bedrock" || plan.GetTransportProfile() != "standard" {
		t.Fatalf("profiles = %+v", plan)
	}
	if !strings.Contains(plan.GetUpstreamUrl(), "bedrock-runtime.eu-west-1.amazonaws.com") || !strings.Contains(plan.GetUpstreamUrl(), "/invoke-with-response-stream") {
		t.Fatalf("upstream URL = %q", plan.GetUpstreamUrl())
	}
	if plan.GetMappedModel() != "eu.anthropic.claude-opus-4-6-v1" {
		t.Fatalf("mapped model = %q", plan.GetMappedModel())
	}
	options := plan.GetProtocolOptions()
	if options["auth_mode"] != "sigv4" || options["aws_region"] != "eu-west-1" {
		t.Fatalf("SigV4 options = %+v", options)
	}
	for _, key := range []string{"aws_access_key_id", "aws_secret_access_key", "aws_session_token"} {
		if _, exists := options[key]; exists {
			t.Fatalf("SigV4 execution plan leaked %q", key)
		}
	}
	if options["initial_beta_tokens"] != "context-1m-2025-08-07" || !strings.Contains(options["allowed_auto_betas"], "computer-use-2025-11-24") {
		t.Fatalf("beta snapshot = %+v", options)
	}
	if plan.GetUpstreamHeaders()["Authorization"] != "" {
		t.Fatalf("SigV4 authorization must be generated after body transform: %+v", plan.GetUpstreamHeaders())
	}
}

func TestBedrockAPIKeyExecutionPlanUsesBearerWithoutAWSSecret(t *testing.T) {
	controller := &AdmissionController{gateway: &service.GatewayService{}, now: time.Now}
	account := &service.Account{
		ID: 52, Platform: service.PlatformAnthropic, Type: service.AccountTypeBedrock,
		Credentials: map[string]any{"auth_mode": "apikey", "api_key": "bedrock-api-key", "aws_region": "us-east-1"},
	}
	request := &controlv1.OpenRequestRequest{
		Protocol: controlv1.Protocol_PROTOCOL_ANTHROPIC, RequestedModel: "claude-sonnet-4-5",
		Path: "/v1/messages", Method: "POST",
	}
	plan, err := controller.executionPlan(context.Background(), account, request, service.PlatformAnthropic)
	if err != nil {
		t.Fatalf("executionPlan: %v", err)
	}
	if plan.GetUpstreamHeaders()["Authorization"] != "Bearer bedrock-api-key" || plan.GetProtocolOptions()["auth_mode"] != "apikey" {
		t.Fatalf("API-key plan = %+v", plan)
	}
	for _, key := range []string{"aws_access_key_id", "aws_secret_access_key", "aws_session_token"} {
		if _, exists := plan.GetProtocolOptions()[key]; exists {
			t.Fatalf("API-key plan unexpectedly contains %q", key)
		}
	}
}

func TestBedrockExecutionPlanRejectsNonMessagesEndpoint(t *testing.T) {
	controller := &AdmissionController{gateway: &service.GatewayService{}, now: time.Now}
	account := &service.Account{
		ID: 53, Platform: service.PlatformAnthropic, Type: service.AccountTypeBedrock,
		Credentials: map[string]any{"auth_mode": "apikey", "api_key": "bedrock-api-key"},
	}
	for _, path := range []string{"/v1/responses", "/v1/messages?debug=true", "/v1/messages/extra"} {
		request := &controlv1.OpenRequestRequest{Protocol: controlv1.Protocol_PROTOCOL_ANTHROPIC, RequestedModel: "claude-sonnet-4-5", Path: path, Method: "POST"}
		if _, err := controller.executionPlan(context.Background(), account, request, service.PlatformAnthropic); err == nil {
			t.Fatalf("expected path %q to remain fail-closed", path)
		}
	}
}

type staticGeminiTokenCache struct{ token string }

func (c staticGeminiTokenCache) GetAccessToken(context.Context, string) (string, error) {
	return c.token, nil
}
func (staticGeminiTokenCache) SetAccessToken(context.Context, string, string, time.Duration) error {
	return nil
}
func (staticGeminiTokenCache) DeleteAccessToken(context.Context, string) error { return nil }
func (staticGeminiTokenCache) AcquireRefreshLock(context.Context, string, time.Duration) (bool, error) {
	return false, nil
}
func (staticGeminiTokenCache) ReleaseRefreshLock(context.Context, string) error { return nil }
