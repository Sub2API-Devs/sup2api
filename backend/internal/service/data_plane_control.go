package service

import (
	"context"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/antigravity"
	"github.com/Wei-Shaw/sub2api/internal/pkg/claude"
	"github.com/Wei-Shaw/sub2api/internal/pkg/geminicli"
)

// DataPlaneTLSFingerprint is the immutable projection placed in one execution
// plan. It deliberately contains no database identifiers or mutable pointers.
type DataPlaneTLSFingerprint struct {
	ProfileKey          string
	EnableGREASE        bool
	CipherSuites        []uint16
	Curves              []uint16
	PointFormats        []uint16
	SignatureAlgorithms []uint16
	ALPNProtocols       []string
	SupportedVersions   []uint16
	KeyShareGroups      []uint16
	PSKModes            []uint16
	Extensions          []uint16
}

type DataPlaneAnthropicOAuthMimicConfig struct {
	SystemPromptEnabled bool
	SystemPrompt        string
	SystemPromptBlocks  string
	MetadataPassthrough bool
	NormalizeDateline   bool
	CacheTTL1h          bool
	RewriteMessageCache bool
}

// DataPlaneOpenAICodexConfig is the short-lived, request-local projection used
// by the Caddy OpenAI/Codex protocol plugin. OAuth refresh credentials and
// agent-identity private keys never leave the control plane.
type DataPlaneOpenAICodexConfig struct {
	Authorization       string
	ChatGPTAccountID    string
	FedRAMP             bool
	UserAgent           string
	Originator          string
	Version             string
	DeviceID            string
	MappedModel         string
	DefaultInstructions string
}

// DataPlaneBedrockConfig is a request-scoped Bedrock execution snapshot. AWS
// access keys and secret keys never leave the control plane; SigV4 mode sends
// only routing and beta policy here and signs the transformed payload digest
// through the private control RPC.
type DataPlaneBedrockConfig struct {
	ModelID          string
	Region           string
	AuthMode         string
	APIKey           string
	CCCompat         bool
	InitialBetas     []string
	AllowedAutoBetas []string
	BlockedAutoBetas map[string]string
}

type DataPlaneGrokConfig struct {
	UpstreamURL          string
	AccessToken          string
	MappedModel          string
	KnownFreeAccount     bool
	AllowClientToolCache bool
}

type DataPlaneGeminiOAuthConfig struct {
	UpstreamURL     string
	AccessToken     string
	MappedModel     string
	Mode            string
	ProjectID       string
	UpstreamStream  bool
	AggregateStream bool
	Action          string
}

// DataPlaneAntigravityConfig is the request-local projection for the Caddy
// Antigravity protocol plugin. OAuth refresh credentials and project discovery
// remain control-plane concerns; only the current bearer and immutable routing
// instructions cross the private RPC boundary.
type DataPlaneAntigravityConfig struct {
	UpstreamURL     string
	AccessToken     string
	MappedModel     string
	ProjectID       string
	UserAgent       string
	Action          string
	UpstreamStream  bool
	AggregateStream bool
}

const VertexAnthropicDataPlaneVersion = vertexAnthropicVersion

// ValidateDataPlaneUpstreamBaseURL exposes the same SSRF/allowlist policy used
// by the in-process forwarding path to the private data-plane control adapter.
// Keeping validation here prevents the Caddy path from becoming a policy
// bypass for custom account base URLs.
func (s *GatewayService) ValidateDataPlaneUpstreamBaseURL(raw string) (string, error) {
	return s.validateUpstreamBaseURL(raw)
}

func (s *OpenAIGatewayService) ValidateDataPlaneUpstreamBaseURL(raw string) (string, error) {
	return s.validateUpstreamBaseURL(raw)
}

// ResolveDataPlaneOpenAICodexConfig resolves all authority-owned OpenAI OAuth,
// Codex PAT, and agent-identity material. The returned Authorization value is
// already usable for one upstream request; the data plane never receives a
// refresh token or signing key.
func (s *OpenAIGatewayService) ResolveDataPlaneOpenAICodexConfig(ctx context.Context, account *Account, requestedModel, clientUserAgent string, compact bool) (*DataPlaneOpenAICodexConfig, error) {
	if s == nil || account == nil || !account.IsOpenAIOAuth() {
		return nil, fmt.Errorf("account is not an OpenAI OAuth account")
	}
	credentialAccount, err := resolveCredentialAccount(ctx, s.accountRepo, account)
	if err != nil {
		return nil, err
	}
	token, _, err := s.GetAccessToken(ctx, account)
	if err != nil {
		return nil, err
	}
	authHeaders, err := s.buildOpenAIAuthenticationHeaders(ctx, account, token)
	if err != nil {
		return nil, err
	}
	authorization := strings.TrimSpace(authHeaders.Get("Authorization"))
	if authorization == "" {
		return nil, fmt.Errorf("OpenAI authorization is unavailable")
	}

	mappedModel := account.GetMappedModel(requestedModel)
	if compact {
		mappedModel = resolveOpenAICompactForwardModel(account, mappedModel)
	}
	mappedModel = normalizeOpenAIModelForUpstream(account, mappedModel)
	if mappedModel == "" {
		return nil, fmt.Errorf("OpenAI mapped model is unavailable")
	}

	identity := make(http.Header)
	identity.Set("User-Agent", strings.TrimSpace(clientUserAgent))
	if custom := strings.TrimSpace(account.GetOpenAIUserAgent()); custom != "" {
		identity.Set("User-Agent", custom)
	}
	ensureCodexIdentityHeaders(identity)
	enforceCodexIdentityHeaders(identity)

	return &DataPlaneOpenAICodexConfig{
		Authorization:       authorization,
		ChatGPTAccountID:    credentialAccount.GetChatGPTAccountID(),
		FedRAMP:             credentialAccount.IsChatGPTAccountFedRAMP(),
		UserAgent:           identity.Get("User-Agent"),
		Originator:          identity.Get("originator"),
		Version:             identity.Get("version"),
		DeviceID:            credentialAccount.GetOpenAIDeviceID(),
		MappedModel:         mappedModel,
		DefaultInstructions: defaultCodexSynthInstructions(mappedModel),
	}, nil
}

// ResolveDataPlaneGrokConfig keeps OAuth refresh and account routing in the
// control plane while returning only the current bearer and immutable request
// policy needed by the Grok protocol plugin.
func (s *OpenAIGatewayService) ResolveDataPlaneGrokConfig(ctx context.Context, account *Account, requestedModel string) (*DataPlaneGrokConfig, error) {
	if s == nil || account == nil || !account.IsGrokOAuth() {
		return nil, fmt.Errorf("account is not a Grok OAuth account")
	}
	target, err := buildGrokResponsesURL(account, s.cfg)
	if err != nil {
		return nil, err
	}
	token, tokenType, err := s.GetAccessToken(ctx, account)
	if err != nil {
		return nil, err
	}
	if tokenType != "oauth" || strings.TrimSpace(token) == "" {
		return nil, fmt.Errorf("Grok OAuth bearer token is unavailable")
	}
	mappedModel := strings.TrimSpace(account.GetMappedModel(requestedModel))
	if mappedModel == "" {
		mappedModel = grokDefaultResponsesModel
	}
	if isGrokImageGenerationModel(mappedModel) {
		return nil, fmt.Errorf("Grok image models are unavailable on the Responses endpoint")
	}
	allowClientToolCache, _ := grokClientToolCacheAccountPolicy(account)
	return &DataPlaneGrokConfig{
		UpstreamURL: target, AccessToken: token, MappedModel: mappedModel,
		KnownFreeAccount: isKnownGrokFreeAccount(account), AllowClientToolCache: allowClientToolCache,
	}, nil
}

// ResolveDataPlaneGeminiOAuthConfig keeps OAuth refresh, Code Assist project
// discovery, URL policy, and route selection in the control plane. The data
// plane receives only the current bearer and immutable wrapping instructions.
func (s *GatewayService) ResolveDataPlaneGeminiOAuthConfig(ctx context.Context, tokens *GeminiTokenProvider, account *Account, requestedModel, action string, clientStream bool) (*DataPlaneGeminiOAuthConfig, error) {
	if s == nil || tokens == nil || account == nil || account.Platform != PlatformGemini || account.Type != AccountTypeOAuth {
		return nil, fmt.Errorf("account is not a Gemini OAuth account")
	}
	switch action {
	case "generateContent", "streamGenerateContent", "countTokens":
	default:
		return nil, fmt.Errorf("unsupported Gemini request action")
	}
	mappedModel := strings.TrimPrefix(strings.TrimSpace(requestedModel), "models/")
	if mappedModel == "" || !IsSafeGeminiModelPathSegment(mappedModel) {
		return nil, fmt.Errorf("invalid Gemini model")
	}
	token, err := tokens.ResolveDataPlaneGeminiAccessToken(ctx, account)
	if err != nil || strings.TrimSpace(token) == "" {
		return nil, fmt.Errorf("resolve Gemini OAuth token: %w", err)
	}

	config := &DataPlaneGeminiOAuthConfig{
		AccessToken: token, MappedModel: mappedModel, Mode: "ai_studio",
		UpstreamStream: clientStream, Action: action,
	}
	projectID := strings.TrimSpace(account.GetCredential("project_id"))
	if projectID != "" && action != "countTokens" {
		baseURL, err := s.ValidateDataPlaneUpstreamBaseURL(geminicli.GeminiCliBaseURL)
		if err != nil {
			return nil, err
		}
		upstreamAction := action
		if action == "generateContent" && !clientStream {
			upstreamAction = "streamGenerateContent"
			config.UpstreamStream = true
			config.AggregateStream = true
		}
		config.UpstreamURL = strings.TrimRight(baseURL, "/") + "/v1internal:" + upstreamAction
		if config.UpstreamStream {
			config.UpstreamURL += "?alt=sse"
		}
		config.Mode = "code_assist"
		config.ProjectID = projectID
		return config, nil
	}

	baseURL := account.GetGeminiBaseURL(geminicli.AIStudioBaseURL)
	baseURL, err = s.ValidateDataPlaneUpstreamBaseURL(baseURL)
	if err != nil {
		return nil, err
	}
	config.UpstreamURL, err = buildGeminiAIStudioModelActionURL(baseURL, mappedModel, action, clientStream)
	if err != nil {
		return nil, err
	}
	return config, nil
}

// ResolveDataPlaneAntigravityConfig resolves Antigravity authority-owned state
// without exposing refresh tokens or allowing the data plane to choose an
// arbitrary upstream host. The first data-plane implementation intentionally
// supports native Gemini only; other protocols remain fail-closed until their
// response conversion is owned by a dedicated plugin.
func (s *GatewayService) ResolveDataPlaneAntigravityConfig(ctx context.Context, tokens *AntigravityTokenProvider, account *Account, requestedModel, action string, clientStream bool) (*DataPlaneAntigravityConfig, error) {
	if s == nil || tokens == nil || account == nil || account.Platform != PlatformAntigravity || account.Type != AccountTypeOAuth {
		return nil, fmt.Errorf("account is not an Antigravity OAuth account")
	}
	switch action {
	case "generateContent", "streamGenerateContent", "countTokens", "messages":
	default:
		return nil, fmt.Errorf("unsupported Antigravity request action")
	}
	mappedModel := strings.TrimSpace(mapAntigravityModel(account, strings.TrimPrefix(strings.TrimSpace(requestedModel), "models/")))
	if mappedModel == "" || !IsSafeGeminiModelPathSegment(mappedModel) {
		return nil, fmt.Errorf("unsupported Antigravity model")
	}
	accessToken, err := tokens.GetAccessToken(ctx, account)
	if err != nil || strings.TrimSpace(accessToken) == "" {
		return nil, fmt.Errorf("resolve Antigravity OAuth token: %w", err)
	}
	projectID, err := resolveAntigravityProjectID(account)
	if err != nil {
		return nil, err
	}
	baseURLs := antigravity.BaseURLs
	if len(baseURLs) == 0 {
		return nil, fmt.Errorf("Antigravity upstream is unavailable")
	}
	baseURL, err := s.ValidateDataPlaneUpstreamBaseURL(baseURLs[0])
	if err != nil {
		return nil, err
	}
	return &DataPlaneAntigravityConfig{
		UpstreamURL: strings.TrimRight(baseURL, "/") + "/v1internal:streamGenerateContent?alt=sse",
		AccessToken: accessToken, MappedModel: mappedModel, ProjectID: projectID,
		UserAgent: antigravity.GetUserAgentForContext(ctx), Action: action,
		UpstreamStream: action != "countTokens", AggregateStream: (action == "generateContent" || action == "messages") && !clientStream,
	}, nil
}

// ResolveDataPlaneBedrockConfig freezes model routing, authentication, channel
// compatibility, and beta policy before the request reaches the provider
// plugin. Body-derived beta capabilities are checked by the plugin against the
// allowed/blocked snapshot so they cannot bypass control-plane policy.
func (s *GatewayService) ResolveDataPlaneBedrockConfig(ctx context.Context, account *Account, requestedModel, betaHeader string, groupID int64) (*DataPlaneBedrockConfig, error) {
	if s == nil || account == nil || !account.IsBedrock() {
		return nil, fmt.Errorf("account is not an AWS Bedrock account")
	}
	modelID, ok := ResolveBedrockModelID(account, requestedModel)
	if !ok || strings.TrimSpace(modelID) == "" {
		return nil, fmt.Errorf("unsupported Bedrock model")
	}
	region := bedrockRuntimeRegion(account)
	config := &DataPlaneBedrockConfig{
		ModelID: modelID, Region: region, AuthMode: "sigv4",
		BlockedAutoBetas: make(map[string]string),
	}
	if groupID > 0 {
		config.CCCompat = s.isBedrockCCCompatEnabled(ctx, account, &groupID)
	}
	if account.IsBedrockAPIKey() {
		config.AuthMode = "apikey"
		config.APIKey = strings.TrimSpace(account.GetCredential("api_key"))
		if config.APIKey == "" {
			return nil, fmt.Errorf("Bedrock API key is unavailable")
		}
	} else {
		if strings.TrimSpace(account.GetCredential("aws_access_key_id")) == "" || strings.TrimSpace(account.GetCredential("aws_secret_access_key")) == "" {
			return nil, fmt.Errorf("Bedrock SigV4 credentials are unavailable")
		}
	}

	rawPolicy := s.evaluateBetaPolicy(ctx, betaHeader, account, modelID)
	if rawPolicy.blockErr != nil {
		return nil, rawPolicy.blockErr
	}
	initial := ResolveBedrockBetaTokens(betaHeader, []byte(`{}`), modelID)
	if blockErr := s.checkBetaPolicyBlockForTokens(ctx, initial, account, modelID); blockErr != nil {
		return nil, blockErr
	}
	config.InitialBetas = filterBetaTokens(initial, rawPolicy.filterSet)

	candidates := make([]string, 0, len(bedrockSupportedBetaTokens))
	for token := range bedrockSupportedBetaTokens {
		candidates = append(candidates, token)
	}
	sort.Strings(candidates)
	for _, token := range candidates {
		policy := s.evaluateBetaPolicy(ctx, token, account, modelID)
		if policy.blockErr != nil {
			config.BlockedAutoBetas[token] = policy.blockErr.Error()
			continue
		}
		if _, filtered := policy.filterSet[token]; filtered {
			continue
		}
		config.AllowedAutoBetas = append(config.AllowedAutoBetas, token)
	}
	return config, nil
}

// SignDataPlaneBedrockRequest resolves the selected account from the control
// plane repository and signs only the data-plane supplied payload digest.
func (s *GatewayService) SignDataPlaneBedrockRequest(ctx context.Context, accountID int64, method, upstreamURL, payloadHash string, headers map[string]string) (map[string]string, error) {
	if s == nil || s.accountRepo == nil || accountID <= 0 {
		return nil, fmt.Errorf("Bedrock signing authority is unavailable")
	}
	digest, err := hex.DecodeString(strings.TrimSpace(payloadHash))
	if err != nil || len(digest) != 32 || hex.EncodeToString(digest) != strings.TrimSpace(payloadHash) {
		return nil, fmt.Errorf("invalid Bedrock payload digest")
	}
	account, err := s.accountRepo.GetByID(ctx, accountID)
	if err != nil {
		return nil, err
	}
	if account == nil || !account.IsBedrock() || account.IsBedrockAPIKey() {
		return nil, fmt.Errorf("account does not support Bedrock SigV4")
	}
	parsed, err := url.Parse(upstreamURL)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return nil, fmt.Errorf("invalid Bedrock signing URL")
	}
	request, err := http.NewRequestWithContext(ctx, method, parsed.String(), nil)
	if err != nil {
		return nil, err
	}
	request.Host = parsed.Host
	for _, key := range []string{"Content-Type", "Accept"} {
		if value := strings.TrimSpace(headers[key]); value != "" {
			request.Header.Set(key, value)
		}
	}
	signer, err := NewBedrockSignerFromAccount(account)
	if err != nil {
		return nil, err
	}
	if err := signer.SignRequestHash(ctx, request, payloadHash, time.Now()); err != nil {
		return nil, err
	}
	signed := make(map[string]string)
	for _, key := range []string{"Authorization", "X-Amz-Date", "X-Amz-Security-Token", "X-Amz-Content-Sha256"} {
		if value := strings.TrimSpace(request.Header.Get(key)); value != "" {
			signed[key] = value
		}
	}
	return signed, nil
}

// ResolveDataPlaneTLSFingerprint freezes the same profile selected by the
// existing in-process gateway. An enabled account always receives at least the
// built-in Node.js profile, even if the profile cache is unavailable.
func (s *GatewayService) ResolveDataPlaneTLSFingerprint(account *Account) *DataPlaneTLSFingerprint {
	if account == nil || !account.IsTLSFingerprintEnabled() {
		return nil
	}
	var profileName string
	var cipherSuites, curves, pointFormats, signatures []uint16
	var alpn []string
	var versions, keyShares, pskModes, extensions []uint16
	var grease bool
	if s != nil && s.tlsFPProfileService != nil {
		if profile := s.tlsFPProfileService.ResolveTLSProfile(account); profile != nil {
			profileName = profile.Name
			grease = profile.EnableGREASE
			cipherSuites = append([]uint16(nil), profile.CipherSuites...)
			curves = append([]uint16(nil), profile.Curves...)
			pointFormats = append([]uint16(nil), profile.PointFormats...)
			signatures = append([]uint16(nil), profile.SignatureAlgorithms...)
			alpn = append([]string(nil), profile.ALPNProtocols...)
			versions = append([]uint16(nil), profile.SupportedVersions...)
			keyShares = append([]uint16(nil), profile.KeyShareGroups...)
			pskModes = append([]uint16(nil), profile.PSKModes...)
			extensions = append([]uint16(nil), profile.Extensions...)
		}
	}
	if profileName == "" {
		profileName = "Built-in Default (Node.js 24.x)"
	}
	return &DataPlaneTLSFingerprint{
		ProfileKey: profileName, EnableGREASE: grease,
		CipherSuites: cipherSuites, Curves: curves, PointFormats: pointFormats,
		SignatureAlgorithms: signatures, ALPNProtocols: alpn,
		SupportedVersions: versions, KeyShareGroups: keyShares, PSKModes: pskModes, Extensions: extensions,
	}
}

// ResolveDataPlaneGeminiAccessToken keeps service-account key material and
// token exchange in the control plane. Only the short-lived bearer token is
// placed in the execution plan.
func (p *GeminiTokenProvider) ResolveDataPlaneGeminiAccessToken(ctx context.Context, account *Account) (string, error) {
	if p == nil {
		return "", fmt.Errorf("Gemini token provider is unavailable")
	}
	return p.GetAccessToken(ctx, account)
}

// BuildDataPlaneVertexGeminiURL reuses the authoritative project, location,
// model normalization, and URL validation used by the in-process path.
func BuildDataPlaneVertexGeminiURL(account *Account, model, action string, stream bool) (string, error) {
	if account == nil || account.Platform != PlatformGemini || account.Type != AccountTypeServiceAccount {
		return "", fmt.Errorf("account is not a Gemini Vertex service account")
	}
	model = strings.TrimPrefix(strings.TrimSpace(model), "models/")
	return buildVertexGeminiURL(account.VertexProjectID(), account.VertexLocation(model), model, action, stream)
}

// ResolveDataPlaneClaudeAccessToken keeps service-account key material and
// OAuth exchange in the control plane.
func (p *ClaudeTokenProvider) ResolveDataPlaneClaudeAccessToken(ctx context.Context, account *Account) (string, error) {
	if p == nil {
		return "", fmt.Errorf("Claude token provider is unavailable")
	}
	return p.GetAccessToken(ctx, account)
}

// ResolveDataPlaneAnthropicOAuthAccessToken keeps refresh tokens, refresh
// locks, and credential persistence in the control plane. The execution plan
// receives only the current short-lived bearer token.
func (s *GatewayService) ResolveDataPlaneAnthropicOAuthAccessToken(ctx context.Context, account *Account) (string, error) {
	if s == nil || account == nil || !account.IsAnthropicOAuthOrSetupToken() {
		return "", fmt.Errorf("account is not an Anthropic OAuth or setup-token account")
	}
	token, tokenType, err := s.GetAccessToken(ctx, account)
	if err != nil {
		return "", err
	}
	if tokenType != "oauth" || strings.TrimSpace(token) == "" {
		return "", fmt.Errorf("Anthropic OAuth bearer token is unavailable")
	}
	return token, nil
}

// IsDataPlaneClaudeCodeRequest mirrors the existing in-process classification
// without moving the request body into the control plane. A structurally valid
// metadata.user_id requires the Claude CLI user agent; the billing attribution
// marker also covers trusted upstream relays that replace the original UA.
func IsDataPlaneClaudeCodeRequest(userAgent, metadataUserID string, billingAttribution bool) bool {
	return billingAttribution || isClaudeCodeClient(userAgent, metadataUserID)
}

func ResolveDataPlaneAnthropicOAuthModel(requested string) string {
	return claude.NormalizeModelID(strings.TrimSpace(requested))
}

// ResolveDataPlaneAnthropicOAuthBeta evaluates account policy in the control
// plane and returns the exact beta header for a genuine Claude Code passthrough
// request. Body-mimic requests remain fail-closed until their protocol plugin
// owns all nested JSON rewrites.
func (s *GatewayService) ResolveDataPlaneAnthropicOAuthBeta(ctx context.Context, account *Account, model, clientBeta string, mimic bool) (string, error) {
	if s == nil || account == nil || !account.IsAnthropicOAuthOrSetupToken() {
		return "", fmt.Errorf("account is not an Anthropic OAuth or setup-token account")
	}
	policy := s.evaluateBetaPolicy(ctx, clientBeta, account, model)
	if policy.blockErr != nil {
		return "", policy.blockErr
	}
	drop := mergeDropSets(policy.filterSet)
	if mimic {
		return mergeAnthropicBetaDropping(claude.FullClaudeCodeMimicryBetas(), "", drop), nil
	}
	return stripBetaTokensWithSet(s.getBetaHeader(model, clientBeta), drop), nil
}

func (s *GatewayService) ResolveDataPlaneAnthropicOAuthMimicConfig(ctx context.Context) (DataPlaneAnthropicOAuthMimicConfig, error) {
	config := DataPlaneAnthropicOAuthMimicConfig{SystemPromptEnabled: true, NormalizeDateline: true}
	if s == nil || s.settingService == nil {
		return config, nil
	}
	config.SystemPromptEnabled, config.SystemPrompt, config.SystemPromptBlocks = s.settingService.GetClaudeOAuthSystemPromptInjectionSettings(ctx)
	_, config.MetadataPassthrough, _ = s.settingService.GetGatewayForwardingSettings(ctx)
	config.NormalizeDateline = s.settingService.IsClientDatelineNormalizationEnabled(ctx)
	config.CacheTTL1h = s.settingService.IsAnthropicCacheTTL1hInjectionEnabled(ctx)
	config.RewriteMessageCache = s.settingService.IsRewriteMessageCacheControlEnabled(ctx)
	return config, nil
}

func DataPlaneClaudeOAuthDefaultHeaders() map[string]string {
	headers := make(map[string]string, len(claude.DefaultHeaders))
	for key, value := range claude.DefaultHeaders {
		headers[key] = value
	}
	return headers
}

func ResolveDataPlaneVertexAnthropicModel(account *Account, requested string) string {
	if account != nil {
		if candidate, matched := account.ResolveMappedModel(requested); matched {
			return candidate
		}
	}
	return normalizeVertexAnthropicModelID(claude.NormalizeModelID(requested))
}

func BuildDataPlaneVertexAnthropicURL(account *Account, model string, stream bool) (string, error) {
	if account == nil || account.Platform != PlatformAnthropic || account.Type != AccountTypeServiceAccount {
		return "", fmt.Errorf("account is not an Anthropic Vertex service account")
	}
	return buildVertexAnthropicURL(account.VertexProjectID(), account.VertexLocation(model), model, stream)
}

// ResolveDataPlaneVertexAnthropicBeta applies the same account policy and
// Vertex capability whitelist as the existing in-process forwarding path.
func (s *GatewayService) ResolveDataPlaneVertexAnthropicBeta(ctx context.Context, account *Account, model, clientBeta string) (string, error) {
	if s == nil {
		return "", fmt.Errorf("gateway policy service is unavailable")
	}
	policy := s.evaluateBetaPolicy(ctx, clientBeta, account, model)
	if policy.blockErr != nil {
		return "", policy.blockErr
	}
	return filterVertexBetaTokens(clientBeta, mergeDropSets(policy.filterSet)), nil
}
