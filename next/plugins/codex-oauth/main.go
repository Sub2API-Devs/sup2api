package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

const (
	oauthClientID      = "app_EMoamEEZ73f0CkXaXp7hrann"
	oauthAuthorizeURL  = "https://auth.openai.com/oauth/authorize"
	oauthTokenURL      = "https://auth.openai.com/oauth/token"
	defaultRedirectURI = "http://localhost:1455/auth/callback"
	defaultScopes      = "openid profile email offline_access"
	refreshScopes      = "openid profile email"
	sessionTTL         = 30 * time.Minute
)

type credentials struct {
	AccessToken    string `json:"access_token"`
	RefreshToken   string `json:"refresh_token,omitempty"`
	IDToken        string `json:"id_token,omitempty"`
	ExpiresAt      int64  `json:"expires_at,omitempty"`
	OrganizationID string `json:"organization_id,omitempty"`
	ProxyID        string `json:"proxy_id,omitempty"`
	ClientID       string `json:"client_id,omitempty"`
	RedirectURI    string `json:"redirect_uri,omitempty"`
}

type oauthSession struct {
	State        string    `json:"state"`
	CodeVerifier string    `json:"code_verifier"`
	ClientID     string    `json:"client_id,omitempty"`
	ProxyURL     string    `json:"proxy_url,omitempty"`
	RedirectURI  string    `json:"redirect_uri"`
	CreatedAt    time.Time `json:"created_at"`
}

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	IDToken      string `json:"id_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
	RefreshToken string `json:"refresh_token,omitempty"`
	Scope        string `json:"scope,omitempty"`
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

func main() {
	pluginsdk.Serve(newPlugin)
}

// Platform interface implementation

func (p *Plugin) ValidateCredentials(ctx context.Context, req *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	var cred credentials
	if err := json.Unmarshal([]byte(req.GetCredentialsJson()), &cred); err != nil {
		return &pluginv1.ValidateCredentialsResponse{
			Errors: []*pluginv1.FieldError{{Field: "/access_token", Code: "invalid", Message: "invalid JSON"}},
		}, nil
	}

	if strings.TrimSpace(cred.AccessToken) == "" {
		return &pluginv1.ValidateCredentialsResponse{
			Errors: []*pluginv1.FieldError{{Field: "/access_token", Code: "required", Message: "access_token is required"}},
		}, nil
	}

	if cred.ExpiresAt > 0 && time.Now().Unix() >= cred.ExpiresAt {
		return &pluginv1.ValidateCredentialsResponse{
			Errors: []*pluginv1.FieldError{{Field: "/access_token", Code: "expired", Message: "access token expired"}},
		}, nil
	}

	return &pluginv1.ValidateCredentialsResponse{}, nil
}

func (p *Plugin) BuildUpstreamRequest(ctx context.Context, req *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	account := req.GetAccount()
	if account == nil {
		return nil, fmt.Errorf("account is nil")
	}

	var cred credentials
	if err := json.Unmarshal([]byte(account.GetCredentialsJson()), &cred); err != nil {
		return nil, fmt.Errorf("parse credentials: %w", err)
	}

	if cred.AccessToken == "" {
		return nil, fmt.Errorf("access_token is required")
	}

	if cred.ExpiresAt > 0 && time.Now().Unix() >= cred.ExpiresAt {
		return nil, fmt.Errorf("access token expired")
	}

	headers := map[string]string{
		"authorization": "Bearer " + cred.AccessToken,
		"content-type":  "application/json",
	}

	if cred.OrganizationID != "" {
		headers["openai-organization"] = cred.OrganizationID
	}

	return &pluginv1.BuildUpstreamRequestResponse{
		Url:     "https://api.openai.com/v1/responses",
		Method:  "POST",
		Headers: headers,
	}, nil
}

func (p *Plugin) ClassifyError(ctx context.Context, req *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	status := req.GetStatus()

	if status == 401 || status == 403 {
		return &pluginv1.ClassifyErrorResponse{
			AccountEffect: pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE,
			Reason:        "authentication failed",
		}, nil
	}

	if status == 429 {
		cooldown := int64(60)
		if headers := req.GetHeaders(); headers != nil {
			if retryAfter := headers["retry-after"]; retryAfter != "" {
				if parsed, err := time.ParseDuration(retryAfter + "s"); err == nil {
					cooldown = int64(parsed.Seconds())
				}
			}
		}
		return &pluginv1.ClassifyErrorResponse{
			AccountEffect:     pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN,
			CooldownUntilUnix: time.Now().Unix() + cooldown,
			Reason:            "rate limit exceeded",
		}, nil
	}

	if status >= 500 {
		return &pluginv1.ClassifyErrorResponse{
			Action: pluginv1.ClassifyErrorResponse_ACTION_FAILOVER,
			Reason: "upstream server error",
		}, nil
	}

	return &pluginv1.ClassifyErrorResponse{
		Action: pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT,
		Reason: "unknown error",
	}, nil
}

func (p *Plugin) BuildTestRequest(ctx context.Context, req *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	account := req.GetAccount()
	if account == nil {
		return nil, fmt.Errorf("account is nil")
	}

	var cred credentials
	if err := json.Unmarshal([]byte(account.GetCredentialsJson()), &cred); err != nil {
		return nil, fmt.Errorf("parse credentials: %w", err)
	}

	headers := map[string]string{
		"authorization": "Bearer " + cred.AccessToken,
		"content-type":  "application/json",
	}
	if cred.OrganizationID != "" {
		headers["openai-organization"] = cred.OrganizationID
	}

	body := `{"model":"gpt-4o-mini","prompt":"test"}`

	return &pluginv1.BuildTestRequestResponse{
		Url:      "https://api.openai.com/v1/responses",
		Method:   "POST",
		Headers:  headers,
		BodyJson: body,
	}, nil
}

// HTTP Handlers

type authStartRequest struct {
	RedirectURI string `json:"redirect_uri,omitempty"`
	ClientID    string `json:"client_id,omitempty"`
}

type authStartResponse struct {
	SessionID        string `json:"session_id"`
	AuthorizationURL string `json:"authorization_url"`
	State            string `json:"state"`
}

func (p *Plugin) handleAuthStart(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var input authStartRequest
	if err := pluginsdk.DecodeJSON(req, &input); err != nil {
		return pluginsdk.ErrorResponse(400, "invalid_request", "invalid JSON"), nil
	}

	state, err := generateState()
	if err != nil {
		return pluginsdk.ErrorResponse(500, "internal", "failed to generate state"), nil
	}

	codeVerifier, err := generateCodeVerifier()
	if err != nil {
		return pluginsdk.ErrorResponse(500, "internal", "failed to generate code verifier"), nil
	}

	codeChallenge := generateCodeChallenge(codeVerifier)
	sessionID, err := generateSessionID()
	if err != nil {
		return pluginsdk.ErrorResponse(500, "internal", "failed to generate session ID"), nil
	}

	redirectURI := input.RedirectURI
	if redirectURI == "" {
		redirectURI = defaultRedirectURI
	}

	clientID := input.ClientID
	if clientID == "" {
		clientID = oauthClientID
	}

	session := &oauthSession{
		State:        state,
		CodeVerifier: codeVerifier,
		ClientID:     clientID,
		RedirectURI:  redirectURI,
		CreatedAt:    time.Now(),
	}

	sessionData, _ := json.Marshal(session)
	if err := p.host.KV().Set(ctx, "oauth_session", sessionID, sessionData, sessionTTL); err != nil {
		return pluginsdk.ErrorResponse(500, "internal", "failed to store session"), nil
	}

	authURL := buildAuthorizationURL(state, codeChallenge, redirectURI, clientID)

	return pluginsdk.JSONResponse(200, authStartResponse{
		SessionID:        sessionID,
		AuthorizationURL: authURL,
		State:            state,
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

	if input.SessionID == "" || input.Code == "" {
		return pluginsdk.ErrorResponse(400, "invalid_request", "session_id and code are required"), nil
	}

	sessionData, ok, err := p.host.KV().Get(ctx, "oauth_session", input.SessionID)
	if err != nil {
		return pluginsdk.ErrorResponse(500, "internal", "failed to retrieve session"), nil
	}
	if !ok {
		return pluginsdk.ErrorResponse(404, "session_not_found", "session not found or expired"), nil
	}

	var session oauthSession
	if err := json.Unmarshal(sessionData, &session); err != nil {
		return pluginsdk.ErrorResponse(500, "internal", "failed to parse session"), nil
	}

	defer p.host.KV().Delete(ctx, "oauth_session", input.SessionID)

	tokenResp, err := exchangeCodeForToken(ctx, input.Code, session.CodeVerifier, session.RedirectURI, session.ClientID)
	if err != nil {
		return pluginsdk.ErrorResponse(500, "exchange_failed", fmt.Sprintf("token exchange failed: %v", err)), nil
	}

	return pluginsdk.JSONResponse(200, tokenResp), nil
}

// Helper functions

func generateRandomBytes(n int) ([]byte, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return nil, err
	}
	return b, nil
}

func generateState() (string, error) {
	bytes, err := generateRandomBytes(32)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func generateSessionID() (string, error) {
	bytes, err := generateRandomBytes(16)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func generateCodeVerifier() (string, error) {
	bytes, err := generateRandomBytes(64)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func generateCodeChallenge(verifier string) string {
	hash := sha256.Sum256([]byte(verifier))
	encoded := base64.URLEncoding.EncodeToString(hash[:])
	return strings.TrimRight(encoded, "=")
}

func buildAuthorizationURL(state, codeChallenge, redirectURI, clientID string) string {
	params := url.Values{}
	params.Set("response_type", "code")
	params.Set("client_id", clientID)
	params.Set("redirect_uri", redirectURI)
	params.Set("scope", defaultScopes)
	params.Set("state", state)
	params.Set("code_challenge", codeChallenge)
	params.Set("code_challenge_method", "S256")
	params.Set("id_token_add_organizations", "true")
	params.Set("codex_cli_simplified_flow", "true")

	return fmt.Sprintf("%s?%s", oauthAuthorizeURL, params.Encode())
}

func exchangeCodeForToken(ctx context.Context, code, codeVerifier, redirectURI, clientID string) (*tokenResponse, error) {
	formData := url.Values{}
	formData.Set("grant_type", "authorization_code")
	formData.Set("client_id", clientID)
	formData.Set("code", code)
	formData.Set("redirect_uri", redirectURI)
	formData.Set("code_verifier", codeVerifier)

	req, err := http.NewRequestWithContext(ctx, "POST", oauthTokenURL, strings.NewReader(formData.Encode()))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "sub2api-codex-oauth/0.1.0")
	req.Header.Set("originator", "sub2api")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("token exchange failed: status %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	var tokenResp tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

func decodeIDToken(idToken string) (map[string]interface{}, error) {
	parts := strings.Split(idToken, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid JWT format")
	}

	payload := parts[1]
	switch len(payload) % 4 {
	case 2:
		payload += "=="
	case 3:
		payload += "="
	}

	decoded, err := base64.URLEncoding.DecodeString(payload)
	if err != nil {
		decoded, err = base64.StdEncoding.DecodeString(payload)
		if err != nil {
			return nil, err
		}
	}

	var claims map[string]interface{}
	if err := json.Unmarshal(decoded, &claims); err != nil {
		return nil, err
	}

	return claims, nil
}

func extractOrganizationID(claims map[string]interface{}) string {
	authClaims, ok := claims["https://api.openai.com/auth"].(map[string]interface{})
	if !ok {
		return ""
	}

	orgs, ok := authClaims["organizations"].([]interface{})
	if !ok || len(orgs) == 0 {
		return ""
	}

	for _, orgIface := range orgs {
		org, ok := orgIface.(map[string]interface{})
		if !ok {
			continue
		}
		if isDefault, ok := org["is_default"].(bool); ok && isDefault {
			if id, ok := org["id"].(string); ok {
				return id
			}
		}
	}

	if firstOrg, ok := orgs[0].(map[string]interface{}); ok {
		if id, ok := firstOrg["id"].(string); ok {
			return id
		}
	}

	return ""
}
