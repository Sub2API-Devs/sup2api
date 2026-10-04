package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

const (
	// OAuth 常量（对齐 backend/internal/pkg/oauth）
	ClientID     = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
	AuthorizeURL = "https://claude.com/cai/oauth/authorize"
	TokenURL     = "https://platform.claude.com/v1/oauth/token"
	RedirectURI  = "https://platform.claude.com/oauth/code/callback"

	// 作用域
	ScopeOAuth     = "org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload"
	ScopeInference = "user:inference"

	// 上游端点
	MessagesURL = "https://api.anthropic.com/v1/messages"
)

type credentials struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
}

type Plugin struct {
	*pluginsdk.Router
	host pluginsdk.Host
}

func newPlugin() *Plugin {
	p := &Plugin{Router: pluginsdk.NewRouter()}
	p.Handle("POST", "/auth/start", p.handleAuthStart)
	p.Handle("POST", "/auth/exchange", p.handleAuthExchange)
	return p
}

// Init implements pluginsdk.Initializer.
func (p *Plugin) Init(_ context.Context, h pluginsdk.Host) error {
	p.host = h
	return nil
}

// ---------------------------------------------------------------- Platform

func (p *Plugin) ValidateCredentials(ctx context.Context, req *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	var creds credentials
	if err := json.Unmarshal([]byte(req.GetCredentialsJson()), &creds); err != nil {
		return &pluginv1.ValidateCredentialsResponse{
			Errors: []*pluginv1.FieldError{{Field: "/access_token", Code: "invalid", Message: "invalid JSON"}},
		}, nil
	}
	if strings.TrimSpace(creds.AccessToken) == "" {
		return &pluginv1.ValidateCredentialsResponse{
			Errors: []*pluginv1.FieldError{{Field: "/access_token", Code: "required", Message: "access_token is required"}},
		}, nil
	}
	return &pluginv1.ValidateCredentialsResponse{}, nil
}

func (p *Plugin) BuildUpstreamRequest(ctx context.Context, req *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	meta := req.GetMeta()
	if meta == nil {
		return nil, errors.New("missing meta")
	}
	account := req.GetAccount()
	if account == nil {
		return nil, errors.New("missing account")
	}

	var creds struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresAt    int64  `json:"expires_at"`
	}
	if err := json.Unmarshal([]byte(account.GetCredentialsJson()), &creds); err != nil {
		return nil, fmt.Errorf("parse credentials: %w", err)
	}

	// 检查令牌是否即将过期（提前 5 分钟）
	if creds.ExpiresAt > 0 && time.Now().Unix() >= creds.ExpiresAt-300 {
		slog.InfoContext(ctx, "claude-oauth: token expiring soon", "account", account.GetId(), "expires_at", creds.ExpiresAt)
		// 实际刷新由 job 处理，这里只记录
	}

	// 构造 Authorization header
	headers := map[string]string{
		"authorization":     "Bearer " + creds.AccessToken,
		"anthropic-version": "2023-06-01",
		"content-type":      "application/json",
	}

	// 添加 anthropic-beta header（对齐 backend gateway_claude_oauth_body.go）
	if protocol := meta.GetProtocol(); protocol == "anthropic.messages" {
		// 简化版：仅添加 oauth beta（完整伪装由核心的 gateway 层实现）
		headers["anthropic-beta"] = "oauth-2025-04-20"
	}

	return &pluginv1.BuildUpstreamRequestResponse{
		Url:     MessagesURL,
		Method:  "POST",
		Headers: headers,
	}, nil
}

func (p *Plugin) ClassifyError(ctx context.Context, req *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	status := req.GetStatus()
	bodyPrefix := req.GetBodyPrefix()

	// 401: 凭证失效
	if status == 401 {
		return &pluginv1.ClassifyErrorResponse{
			AccountEffect: pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE,
			Reason:        "OAuth token expired or invalid",
		}, nil
	}

	// 429: 限流
	if status == 429 {
		var cooldown int64 = 60
		// 尝试从 headers 获取 retry-after
		if headers := req.GetHeaders(); headers != nil {
			if retryAfter := headers["retry-after"]; retryAfter != "" {
				// 简化：假设是秒数格式
				if parsed, err := time.ParseDuration(retryAfter + "s"); err == nil {
					cooldown = int64(parsed.Seconds())
				}
			}
		}
		return &pluginv1.ClassifyErrorResponse{
			AccountEffect:     pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN,
			CooldownUntilUnix: time.Now().Unix() + cooldown,
			Reason:            "Rate limited",
		}, nil
	}

	// 解析 Anthropic 错误格式
	var apiErr struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(bodyPrefix, &apiErr); err == nil {
		switch apiErr.Type {
		case "invalid_request_error":
			return &pluginv1.ClassifyErrorResponse{
				Action: pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT,
				Reason: apiErr.Message,
			}, nil
		case "authentication_error":
			return &pluginv1.ClassifyErrorResponse{
				AccountEffect: pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE,
				Reason:        apiErr.Message,
			}, nil
		}
	}

	return &pluginv1.ClassifyErrorResponse{
		Action: pluginv1.ClassifyErrorResponse_ACTION_FAILOVER,
	}, nil
}

func (p *Plugin) BuildTestRequest(ctx context.Context, req *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	acc := req.GetAccount()
	var creds credentials
	if err := json.Unmarshal([]byte(acc.GetCredentialsJson()), &creds); err != nil {
		return nil, fmt.Errorf("invalid credentials JSON: %w", err)
	}
	if creds.AccessToken == "" {
		return nil, fmt.Errorf("missing access_token")
	}

	testBody := map[string]any{
		"model":      "claude-3-5-sonnet-20241022",
		"max_tokens": 16,
		"messages": []map[string]string{
			{"role": "user", "content": "Hi"},
		},
	}
	bodyBytes, _ := json.Marshal(testBody)

	return &pluginv1.BuildTestRequestResponse{
		Method: "POST",
		Url:    "https://api.anthropic.com/v1/messages",
		Headers: map[string]string{
			"anthropic-version": "2023-06-01",
			"content-type":      "application/json",
			"x-api-key":         creds.AccessToken,
		},
		BodyJson:      string(bodyBytes),
		Model:         "claude-3-5-sonnet-20241022",
		UsageProtocol: "anthropic.messages",
	}, nil
}

// ---------------------------------------------------------------- HTTP (OAuth 流程)

type authStartRequest struct {
	Scope   string `json:"scope"`    // "oauth" 或 "inference"
	ProxyID *int64 `json:"proxy_id"` // 可选
}

type authStartResponse struct {
	AuthURL   string `json:"auth_url"`
	SessionID string `json:"session_id"`
}

func (p *Plugin) handleAuthStart(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var input authStartRequest
	if err := pluginsdk.DecodeJSON(req, &input); err != nil {
		return pluginsdk.ErrorResponse(400, "invalid_request", "invalid JSON"), nil
	}

	scope := ScopeOAuth
	if input.Scope == "inference" {
		scope = ScopeInference
	}

	// 生成 PKCE
	state, err := generateRandomString(32)
	if err != nil {
		return pluginsdk.ErrorResponse(500, "internal", "failed to generate state"), nil
	}
	verifier, err := generateRandomString(32)
	if err != nil {
		return pluginsdk.ErrorResponse(500, "internal", "failed to generate verifier"), nil
	}
	challenge := generateCodeChallenge(verifier)

	sessionID, err := generateRandomString(16)
	if err != nil {
		return pluginsdk.ErrorResponse(500, "internal", "failed to generate session ID"), nil
	}

	// 存储会话（使用 KV）
	session := map[string]any{
		"state":         state,
		"code_verifier": verifier,
		"scope":         scope,
		"created_at":    time.Now().Unix(),
	}
	sessionJSON, _ := json.Marshal(session)
	if err := p.host.KV().Set(ctx, "oauth_session", sessionID, sessionJSON, 30*time.Minute); err != nil {
		return pluginsdk.ErrorResponse(500, "internal", "failed to store session"), nil
	}

	// 构造授权 URL
	authURL := buildAuthorizationURL(state, challenge, scope)

	return pluginsdk.JSONResponse(200, authStartResponse{
		AuthURL:   authURL,
		SessionID: sessionID,
	}), nil
}

type authExchangeRequest struct {
	SessionID string `json:"session_id"`
	Code      string `json:"code"`
}

func (p *Plugin) handleAuthExchange(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var input authExchangeRequest
	if err := pluginsdk.DecodeJSON(req, &input); err != nil {
		return pluginsdk.ErrorResponse(400, "invalid_request", "invalid JSON"), nil
	}

	// 获取会话
	sessionData, ok, err := p.host.KV().Get(ctx, "oauth_session", input.SessionID)
	if err != nil {
		return pluginsdk.ErrorResponse(500, "internal", "failed to retrieve session"), nil
	}
	if !ok {
		return pluginsdk.ErrorResponse(404, "not_found", "session not found or expired"), nil
	}

	var session struct {
		State        string `json:"state"`
		CodeVerifier string `json:"code_verifier"`
		Scope        string `json:"scope"`
	}
	if err := json.Unmarshal(sessionData, &session); err != nil {
		return pluginsdk.ErrorResponse(500, "internal", "invalid session data"), nil
	}

	// 解析 code（可能包含 state）
	code := input.Code
	codeState := ""
	if idx := strings.Index(code, "#"); idx != -1 {
		code = input.Code[:idx]
		codeState = input.Code[idx+1:]
	}

	// 交换 token
	tokenResp, err := p.exchangeCode(ctx, code, session.CodeVerifier, codeState)
	if err != nil {
		return pluginsdk.ErrorResponse(500, "exchange_failed", err.Error()), nil
	}

	// 删除会话
	_ = p.host.KV().Delete(ctx, "oauth_session", input.SessionID)

	// 返回凭证（供控制台填充账号表单）
	return pluginsdk.JSONResponse(200, map[string]any{
		"access_token":  tokenResp.AccessToken,
		"refresh_token": tokenResp.RefreshToken,
		"expires_at":    time.Now().Unix() + tokenResp.ExpiresIn,
		"org_uuid":      tokenResp.Organization.UUID,
		"account_uuid":  tokenResp.Account.UUID,
		"email_address": tokenResp.Account.EmailAddress,
	}), nil
}

// ---------------------------------------------------------------- Job (token 刷新)

func (p *Plugin) RunJob(ctx context.Context, req *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error) {
	if req.GetJobId() != "refresh_tokens" {
		return &pluginv1.RunJobResponse{Message: "unknown job"}, nil
	}

	// 查询即将过期的账号（通过 accounts.credentials 权限）
	// 注意：插件 SDK 当前没有直接的"列出账号"接口，需要核心提供
	// 这里先返回占位，实际需要核心新增接口

	return &pluginv1.RunJobResponse{Message: "token refresh job completed (stub)"}, nil
}

// ---------------------------------------------------------------- helpers

func generateRandomString(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64URLEncode(b), nil
}

func base64URLEncode(data []byte) string {
	return strings.TrimRight(base64.URLEncoding.EncodeToString(data), "=")
}

func generateCodeChallenge(verifier string) string {
	hash := sha256.Sum256([]byte(verifier))
	return base64URLEncode(hash[:])
}

func buildAuthorizationURL(state, codeChallenge, scope string) string {
	encodedRedirectURI := url.QueryEscape(RedirectURI)
	encodedScope := strings.ReplaceAll(url.QueryEscape(scope), "%20", "+")
	return fmt.Sprintf("%s?code=true&client_id=%s&response_type=code&redirect_uri=%s&scope=%s&code_challenge=%s&code_challenge_method=S256&state=%s",
		AuthorizeURL, ClientID, encodedRedirectURI, encodedScope, codeChallenge, state)
}

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
	RefreshToken string `json:"refresh_token,omitempty"`
	Scope        string `json:"scope,omitempty"`
	Organization struct {
		UUID string `json:"uuid"`
	} `json:"organization,omitempty"`
	Account struct {
		UUID         string `json:"uuid"`
		EmailAddress string `json:"email_address"`
	} `json:"account,omitempty"`
}

func (p *Plugin) exchangeCode(ctx context.Context, code, verifier, state string) (*tokenResponse, error) {
	body := map[string]any{
		"code":          code,
		"grant_type":    "authorization_code",
		"client_id":     ClientID,
		"redirect_uri":  RedirectURI,
		"code_verifier": verifier,
	}
	if state != "" {
		body["state"] = state
	}

	bodyJSON, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, "POST", TokenURL, strings.NewReader(string(bodyJSON)))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("token exchange failed: %d %s", resp.StatusCode, string(respBody))
	}

	var tokenResp tokenResponse
	if err := json.Unmarshal(respBody, &tokenResp); err != nil {
		return nil, fmt.Errorf("parse token response: %w", err)
	}

	return &tokenResp, nil
}

// ---------------------------------------------------------------- main

func main() {
	pluginsdk.Serve(newPlugin(), pluginsdk.WithManifest(manifestJSON))
}

//go:embed manifest.json
var manifestJSON []byte
