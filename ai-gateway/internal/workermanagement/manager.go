package workermanagement

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/workervault"
	"github.com/google/uuid"
)

const (
	ProtocolVersion   = "aicodex.proxy-worker/v2"
	openAIClientID    = "app_EMoamEEZ73f0CkXaXp7hrann"
	defaultAuthorize  = "https://auth.openai.com/oauth/authorize"
	defaultToken      = "https://auth.openai.com/oauth/token"
	defaultRedirect   = "http://localhost:1455/auth/callback"
	oauthSessionTTL   = 30 * time.Minute
	defaultAPIBaseURL = "https://api.openai.com"
	defaultOAuthBase  = "https://chatgpt.com/backend-api/codex"
)

type Config struct {
	WorkerID      string
	InstanceID    string
	ManagementKey string
	Version       string
	LogTransport  string
	VaultPath     string
	VaultKey      []byte
	AuthorizeURL  string
	TokenURL      string
	HTTPClient    *http.Client
	Now           func() time.Time
}

type Manager struct {
	cfg      Config
	vault    *workervault.Vault
	sessions map[string]oauthSession
	mu       sync.Mutex
}

type AccountInput struct {
	Name      string `json:"name"`
	Kind      string `json:"kind,omitempty"`
	APIKey    string `json:"api_key,omitempty"`
	BaseURL   string `json:"base_url,omitempty"`
	Models    string `json:"models,omitempty"`
	Group     string `json:"group,omitempty"`
	TestModel string `json:"test_model,omitempty"`
}

type ProxyInput struct {
	Name     string `json:"name"`
	Protocol string `json:"protocol"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
}

type TestInput struct {
	Model        string `json:"model,omitempty"`
	EndpointType string `json:"endpoint_type,omitempty"`
	Stream       bool   `json:"stream,omitempty"`
}

type OAuthCompleteInput struct {
	SessionID string `json:"session_id"`
	Input     string `json:"input"`
}

type oauthSession struct {
	State        string
	CodeVerifier string
	RedirectURI  string
	Account      AccountInput
	CreatedAt    time.Time
}

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
	ExpiresIn    int64  `json:"expires_in"`
	Error        string `json:"error"`
	Description  string `json:"error_description"`
}

func New(cfg Config) (*Manager, error) {
	cfg.WorkerID = strings.TrimSpace(cfg.WorkerID)
	cfg.InstanceID = strings.TrimSpace(cfg.InstanceID)
	cfg.ManagementKey = strings.TrimSpace(cfg.ManagementKey)
	cfg.LogTransport = strings.TrimSpace(cfg.LogTransport)
	if cfg.WorkerID == "" || cfg.InstanceID == "" {
		return nil, errors.New("worker and instance IDs are required")
	}
	if len(cfg.ManagementKey) < 32 {
		return nil, errors.New("worker management key must contain at least 32 characters")
	}
	if cfg.AuthorizeURL == "" {
		cfg.AuthorizeURL = defaultAuthorize
	}
	if cfg.TokenURL == "" {
		cfg.TokenURL = defaultToken
	}
	if cfg.HTTPClient == nil {
		cfg.HTTPClient = &http.Client{Timeout: 30 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	}
	if cfg.Now == nil {
		cfg.Now = time.Now
	}
	if cfg.LogTransport == "" {
		cfg.LogTransport = "control_plane_grpc"
	}
	vault, err := workervault.Open(cfg.VaultPath, cfg.VaultKey)
	if err != nil {
		return nil, err
	}
	return &Manager{cfg: cfg, vault: vault, sessions: make(map[string]oauthSession)}, nil
}

func (m *Manager) Close() error {
	if m == nil {
		return nil
	}
	return m.vault.Close()
}

func (m *Manager) WorkerID() string   { return m.cfg.WorkerID }
func (m *Manager) InstanceID() string { return m.cfg.InstanceID }
func (m *Manager) Version() string    { return m.cfg.Version }
func (m *Manager) ManagementKey() string {
	if m == nil {
		return ""
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.cfg.ManagementKey
}

func (m *Manager) SetManagementKey(key string) error {
	if m == nil {
		return errors.New("worker manager is unavailable")
	}
	key = strings.TrimSpace(key)
	if len(key) < 32 {
		return errors.New("worker management key must contain at least 32 characters")
	}
	m.mu.Lock()
	m.cfg.ManagementKey = key
	m.mu.Unlock()
	return nil
}

func (m *Manager) RekeyVault(key []byte) error {
	if m == nil || m.vault == nil {
		return errors.New("worker manager is unavailable")
	}
	return m.vault.Rekey(key)
}

func (m *Manager) Ready(_ context.Context) error {
	if m == nil || m.vault == nil {
		return errors.New("worker manager is unavailable")
	}
	if err := m.vault.Ping(); err != nil {
		return err
	}
	return nil
}

func (m *Manager) Status(_ context.Context) map[string]any {
	accounts, accountErr := m.ListAccounts()
	proxies, proxyErr := m.ListProxies()
	status := map[string]any{
		"worker_id": m.WorkerID(), "instance_id": m.InstanceID(),
		"vault_ready": accountErr == nil && proxyErr == nil, "account_count": len(accounts),
		"proxy_count": len(proxies), "log_transport": m.cfg.LogTransport,
	}
	if accountErr != nil {
		status["vault_error"] = accountErr.Error()
	} else if proxyErr != nil {
		status["vault_error"] = proxyErr.Error()
	}
	return status
}

func (m *Manager) ListAccounts() ([]workervault.Summary, error) {
	accounts, err := m.vault.List()
	if err != nil {
		return nil, err
	}
	result := make([]workervault.Summary, 0, len(accounts))
	for _, account := range accounts {
		result = append(result, account.Summary())
	}
	return result, nil
}

func (m *Manager) CreateAPIKeyAccount(input AccountInput) (*workervault.Summary, error) {
	if strings.TrimSpace(input.Kind) == "" {
		input.Kind = "openai_api_key"
	}
	return m.CreateAccount(input)
}

func (m *Manager) CreateAccount(input AccountInput) (*workervault.Summary, error) {
	if err := validateAccountInput(input); err != nil {
		return nil, err
	}
	kind, err := normalizeAccountKind(input.Kind)
	if err != nil {
		return nil, err
	}
	if kind == "openai_oauth" {
		return nil, errors.New("OpenAI OAuth accounts must be created through the Worker OAuth endpoints")
	}
	name := strings.TrimSpace(input.Name)
	key := strings.TrimSpace(input.APIKey)
	if name == "" || key == "" {
		return nil, errors.New("account name and API key are required")
	}
	fallback := defaultBaseURLForKind(kind)
	baseURL, err := normalizeBaseURL(input.BaseURL, fallback)
	if err != nil {
		return nil, err
	}
	now := m.cfg.Now().UTC()
	account := &workervault.Account{
		ID: uuid.NewString(), Name: name, Kind: kind, Status: "active",
		BaseURL: baseURL, Models: strings.TrimSpace(input.Models), Group: strings.TrimSpace(input.Group),
		TestModel: strings.TrimSpace(input.TestModel), APIKey: key, CreatedAt: now, UpdatedAt: now,
	}
	if err := m.vault.Put(account); err != nil {
		return nil, err
	}
	summary := account.Summary()
	return &summary, nil
}

func (m *Manager) UpdateAccount(id string, input AccountInput) (*workervault.Summary, error) {
	existing, err := m.vault.Get(strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}
	if err := validateAccountInput(input); err != nil {
		return nil, err
	}
	if strings.TrimSpace(input.Kind) != "" {
		kind, kindErr := normalizeAccountKind(input.Kind)
		if kindErr != nil {
			return nil, kindErr
		}
		if kind != existing.Kind {
			return nil, errors.New("Worker account kind cannot be changed")
		}
	}
	baseURL := existing.BaseURL
	if strings.TrimSpace(input.BaseURL) != "" {
		baseURL, err = normalizeBaseURL(input.BaseURL, defaultBaseURLForKind(existing.Kind))
		if err != nil {
			return nil, err
		}
	}
	existing.Name = strings.TrimSpace(input.Name)
	existing.BaseURL = baseURL
	existing.Models = strings.TrimSpace(input.Models)
	existing.Group = strings.TrimSpace(input.Group)
	existing.TestModel = strings.TrimSpace(input.TestModel)
	existing.UpdatedAt = m.cfg.Now().UTC()
	if err := m.vault.Put(existing); err != nil {
		return nil, err
	}
	summary := existing.Summary()
	return &summary, nil
}

func (m *Manager) ListProxies() ([]workervault.ProxySummary, error) {
	proxies, err := m.vault.ListProxies()
	if err != nil {
		return nil, err
	}
	result := make([]workervault.ProxySummary, 0, len(proxies))
	for _, proxy := range proxies {
		result = append(result, proxy.Summary())
	}
	return result, nil
}

func (m *Manager) CreateProxy(input ProxyInput) (*workervault.ProxySummary, error) {
	proxy, err := buildWorkerProxy(input, uuid.NewString(), m.cfg.Now().UTC(), nil)
	if err != nil {
		return nil, err
	}
	if err := m.vault.PutProxy(proxy); err != nil {
		return nil, err
	}
	summary := proxy.Summary()
	return &summary, nil
}

func (m *Manager) UpdateProxy(id string, input ProxyInput) (*workervault.ProxySummary, error) {
	existing, err := m.vault.GetProxy(strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(input.Password) == "" {
		input.Password = existing.Password
	}
	proxy, err := buildWorkerProxy(input, existing.ID, existing.CreatedAt, existing)
	if err != nil {
		return nil, err
	}
	proxy.UpdatedAt = m.cfg.Now().UTC()
	if err := m.vault.PutProxy(proxy); err != nil {
		return nil, err
	}
	summary := proxy.Summary()
	return &summary, nil
}

func (m *Manager) TestProxy(ctx context.Context, id string) (map[string]any, error) {
	proxy, err := m.vault.GetProxy(strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}
	started := m.cfg.Now()
	dialer := net.Dialer{Timeout: 8 * time.Second}
	conn, dialErr := dialer.DialContext(ctx, "tcp", net.JoinHostPort(proxy.Host, strconv.Itoa(proxy.Port)))
	proxy.LastTestAt = m.cfg.Now().Unix()
	proxy.UpdatedAt = m.cfg.Now().UTC()
	if dialErr != nil {
		proxy.Status = "error"
		proxy.LastTestStatus = 0
		proxy.LastError = "proxy TCP probe failed"
		_ = m.vault.PutProxy(proxy)
		return nil, errors.New("proxy connection test failed")
	}
	_ = conn.Close()
	proxy.Status = "active"
	proxy.LastTestStatus = 1
	proxy.LastError = ""
	if err := m.vault.PutProxy(proxy); err != nil {
		return nil, err
	}
	return map[string]any{"ok": true, "latency_ms": time.Since(started).Milliseconds(), "proxy": proxy.Summary()}, nil
}

func (m *Manager) DeleteProxy(id string) error {
	return m.vault.DeleteProxy(strings.TrimSpace(id))
}

func (m *Manager) StartOAuth(input AccountInput) (map[string]any, error) {
	if err := validateAccountInput(input); err != nil {
		return nil, err
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, errors.New("account name is required")
	}
	if _, err := normalizeBaseURL(input.BaseURL, defaultOAuthBase); err != nil {
		return nil, err
	}
	state, err := randomHex(32)
	if err != nil {
		return nil, err
	}
	verifier, err := randomHex(64)
	if err != nil {
		return nil, err
	}
	sessionID, err := randomHex(24)
	if err != nil {
		return nil, err
	}
	challengeRaw := sha256.Sum256([]byte(verifier))
	params := url.Values{
		"response_type": {"code"}, "client_id": {openAIClientID}, "redirect_uri": {defaultRedirect},
		"scope": {"openid profile email offline_access"}, "state": {state},
		"code_challenge": {base64.RawURLEncoding.EncodeToString(challengeRaw[:])}, "code_challenge_method": {"S256"},
		"id_token_add_organizations": {"true"}, "codex_cli_simplified_flow": {"true"},
	}
	m.mu.Lock()
	m.pruneSessionsLocked()
	m.sessions[sessionID] = oauthSession{State: state, CodeVerifier: verifier, RedirectURI: defaultRedirect, Account: input, CreatedAt: m.cfg.Now()}
	m.mu.Unlock()
	return map[string]any{
		"session_id": sessionID, "authorize_url": strings.TrimRight(m.cfg.AuthorizeURL, "?") + "?" + params.Encode(),
		"expires_in": int(oauthSessionTTL.Seconds()),
	}, nil
}

func (m *Manager) CompleteOAuth(ctx context.Context, input OAuthCompleteInput) (*workervault.Summary, error) {
	sessionID := strings.TrimSpace(input.SessionID)
	// Validate callback input before consuming the session so a paste error
	// does not destroy a still-usable PKCE exchange.
	code, state, err := parseOAuthCallback(input.Input)
	if err != nil {
		return nil, err
	}
	// Consume the one-time session before the network exchange so concurrent
	// complete requests cannot mint two accounts from the same PKCE state.
	m.mu.Lock()
	m.pruneSessionsLocked()
	session, ok := m.sessions[sessionID]
	if ok {
		if state != "" && state != session.State {
			m.mu.Unlock()
			return nil, errors.New("OAuth state does not match the Worker session")
		}
		delete(m.sessions, sessionID)
	}
	m.mu.Unlock()
	if !ok {
		return nil, errors.New("OAuth session was not found or has expired")
	}
	form := url.Values{
		"grant_type": {"authorization_code"}, "client_id": {openAIClientID}, "code": {code},
		"redirect_uri": {session.RedirectURI}, "code_verifier": {session.CodeVerifier},
	}
	token, err := m.requestToken(ctx, form)
	if err != nil {
		return nil, err
	}
	if token.AccessToken == "" || token.RefreshToken == "" {
		return nil, errors.New("OpenAI token response did not contain access and refresh tokens")
	}
	baseURL, _ := normalizeBaseURL(session.Account.BaseURL, defaultOAuthBase)
	now := m.cfg.Now().UTC()
	claims := decodeClaims(token.IDToken)
	account := &workervault.Account{
		ID: uuid.NewString(), Name: strings.TrimSpace(session.Account.Name), Kind: "openai_oauth", Status: "active",
		BaseURL: baseURL, Models: strings.TrimSpace(session.Account.Models), Group: strings.TrimSpace(session.Account.Group),
		TestModel: strings.TrimSpace(session.Account.TestModel), AccessToken: token.AccessToken,
		RefreshToken: token.RefreshToken, IDToken: token.IDToken, ClientID: openAIClientID,
		Email: claims.Email, ChatGPTAccountID: claims.ChatGPTAccountID,
		ExpiresAt: now.Unix() + token.ExpiresIn, CreatedAt: now, UpdatedAt: now,
	}
	if err := m.vault.Put(account); err != nil {
		return nil, err
	}
	summary := account.Summary()
	return &summary, nil
}

func (m *Manager) Refresh(ctx context.Context, id string) (*workervault.Summary, error) {
	// Vault operations are already serialized by BoltDB. Do not hold the OAuth
	// session mutex across the upstream token HTTP call.
	account, err := m.vault.Get(strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}
	if account.Kind != "openai_oauth" || strings.TrimSpace(account.RefreshToken) == "" {
		return nil, errors.New("account does not have a refreshable OpenAI OAuth credential")
	}
	clientID := strings.TrimSpace(account.ClientID)
	if clientID == "" {
		clientID = openAIClientID
	}
	form := url.Values{
		"grant_type": {"refresh_token"}, "refresh_token": {account.RefreshToken},
		"client_id": {clientID}, "scope": {"openid profile email"},
	}
	token, err := m.requestToken(ctx, form)
	if err != nil {
		return nil, err
	}
	if token.AccessToken == "" {
		return nil, errors.New("OpenAI refresh response did not contain an access token")
	}
	account.AccessToken = token.AccessToken
	if token.RefreshToken != "" {
		account.RefreshToken = token.RefreshToken
	}
	if token.IDToken != "" {
		account.IDToken = token.IDToken
		claims := decodeClaims(token.IDToken)
		if claims.Email != "" {
			account.Email = claims.Email
		}
		if claims.ChatGPTAccountID != "" {
			account.ChatGPTAccountID = claims.ChatGPTAccountID
		}
	}
	account.ExpiresAt = m.cfg.Now().Unix() + token.ExpiresIn
	account.Status = "active"
	account.LastError = ""
	account.UpdatedAt = m.cfg.Now().UTC()
	if err := m.vault.Put(account); err != nil {
		return nil, err
	}
	summary := account.Summary()
	return &summary, nil
}

func (m *Manager) TestAccount(ctx context.Context, id string, input TestInput) (map[string]any, error) {
	account, err := m.vault.Get(strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}
	started := m.cfg.Now()
	model, err := resolveAccountTestModel(account, input.Model)
	if err != nil {
		return nil, err
	}
	req, err := accountTestRequest(ctx, account, model)
	if err != nil {
		return nil, err
	}
	resp, requestErr := m.cfg.HTTPClient.Do(req)
	status := 0
	var responseBody []byte
	if resp != nil {
		status = resp.StatusCode
		responseBody, err = io.ReadAll(io.LimitReader(resp.Body, 64<<10))
		_ = resp.Body.Close()
		if err != nil && requestErr == nil {
			requestErr = fmt.Errorf("read upstream test response: %w", err)
		}
	}
	account.LastTestAt = m.cfg.Now().Unix()
	account.LastTestStatus = status
	account.UpdatedAt = m.cfg.Now().UTC()
	if requestErr != nil {
		account.Status = "error"
		account.LastError = "account connection test failed"
		_ = m.vault.Put(account)
		return nil, errors.New(account.LastError)
	}
	if status < 200 || status >= 300 {
		account.Status = "error"
		account.LastError = fmt.Sprintf("upstream returned HTTP %d", status)
		_ = m.vault.Put(account)
		return nil, errors.New(account.LastError)
	}
	account.Status = "active"
	account.LastError = ""
	if err := m.vault.Put(account); err != nil {
		return nil, err
	}
	result := map[string]any{"ok": true, "status_code": status, "latency_ms": time.Since(started).Milliseconds(), "account": account.Summary()}
	if model != "" {
		result["model"] = model
	}
	if responseText := accountTestResponseText(responseBody); responseText != "" {
		result["response_text"] = responseText
	}
	return result, nil
}

func (m *Manager) DeleteAccount(id string) error {
	return m.vault.Delete(strings.TrimSpace(id))
}

func (m *Manager) requestToken(ctx context.Context, form url.Values) (*tokenResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, m.cfg.TokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "codex-cli/0.91.0")
	resp, err := m.cfg.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("OpenAI OAuth request failed: %w", err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	var token tokenResponse
	if err := json.Unmarshal(raw, &token); err != nil {
		return nil, fmt.Errorf("decode OpenAI OAuth response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		message := strings.TrimSpace(token.Description)
		if message == "" {
			message = strings.TrimSpace(token.Error)
		}
		if message == "" {
			message = fmt.Sprintf("HTTP %d", resp.StatusCode)
		}
		return nil, fmt.Errorf("OpenAI OAuth rejected the request: %s", message)
	}
	return &token, nil
}

func (m *Manager) pruneSessionsLocked() {
	now := m.cfg.Now()
	for id, session := range m.sessions {
		if now.Sub(session.CreatedAt) > oauthSessionTTL {
			delete(m.sessions, id)
		}
	}
}

func normalizeBaseURL(raw, fallback string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		raw = fallback
	}
	if len(raw) > 2048 {
		return "", errors.New("OpenAI base URL is too long")
	}
	parsed, err := url.Parse(raw)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return "", errors.New("OpenAI base URL must contain only an http(s) scheme, host, optional port and path")
	}
	return strings.TrimRight(parsed.String(), "/"), nil
}

func validateAccountInput(input AccountInput) error {
	name := strings.TrimSpace(input.Name)
	if name == "" || len(name) > 255 {
		return errors.New("account name must contain between 1 and 255 characters")
	}
	if len(input.APIKey) > 64<<10 || len(input.Models) > 8<<10 || len(input.Group) > 255 || len(input.TestModel) > 255 || len(input.Kind) > 64 {
		return errors.New("Worker account metadata exceeds the supported size")
	}
	return nil
}

var allowedAccountKinds = map[string]string{
	"openai_api_key":      defaultAPIBaseURL,
	"anthropic_api_key":   "https://api.anthropic.com",
	"gemini_api_key":      "https://generativelanguage.googleapis.com",
	"grok_api_key":        "https://api.x.ai/v1",
	"antigravity_api_key": "https://api.anthropic.com",
	"kimi_api_key":        "https://api.moonshot.cn/v1",
	"zhipu_api_key":       "https://open.bigmodel.cn/api/paas/v4",
	"deepseek_api_key":    "https://api.deepseek.com/v1",
}

func normalizeAccountKind(raw string) (string, error) {
	kind := strings.ToLower(strings.TrimSpace(raw))
	if kind == "" {
		kind = "openai_api_key"
	}
	if kind == "openai_oauth" {
		return kind, nil
	}
	if _, ok := allowedAccountKinds[kind]; !ok {
		return "", fmt.Errorf("unsupported Worker account kind %q", kind)
	}
	return kind, nil
}

func defaultBaseURLForKind(kind string) string {
	if base, ok := allowedAccountKinds[kind]; ok && base != "" {
		return base
	}
	return defaultAPIBaseURL
}

func resolveAccountTestModel(account *workervault.Account, requested string) (string, error) {
	model := strings.TrimSpace(requested)
	if model == "" {
		model = strings.TrimSpace(account.TestModel)
	}
	if model == "" {
		model = strings.TrimSpace(strings.Split(account.Models, ",")[0])
	}
	if len(model) > 255 || strings.ContainsAny(model, "\r\n\x00") {
		return "", errors.New("test model is invalid")
	}
	return model, nil
}

func accountTestRequest(ctx context.Context, account *workervault.Account, model string) (*http.Request, error) {
	method := http.MethodGet
	requestURL := accountModelsURL(account.Kind, account.BaseURL)
	var body io.Reader
	if model != "" {
		method = http.MethodPost
		var payload any
		switch account.Kind {
		case "anthropic_api_key", "antigravity_api_key":
			requestURL = accountAPIURL(account.BaseURL, "/messages", "v1")
			payload = map[string]any{
				"model": model, "max_tokens": 256,
				"messages": []map[string]any{{"role": "user", "content": "hi"}},
			}
		case "gemini_api_key":
			requestURL = accountGeminiGenerateURL(account.BaseURL, model)
			payload = map[string]any{
				"contents":         []map[string]any{{"parts": []map[string]string{{"text": "hi"}}}},
				"generationConfig": map[string]any{"maxOutputTokens": 256},
			}
		case "openai_oauth":
			requestURL = accountAPIURL(account.BaseURL, "/responses", "")
			payload = map[string]any{
				"model": model, "input": "hi", "stream": false, "store": false,
				"max_output_tokens": 256,
			}
		default:
			requestURL = accountAPIURL(account.BaseURL, "/chat/completions", "v1")
			payload = map[string]any{
				"model": model, "max_tokens": 256, "stream": false,
				"messages": []map[string]any{{"role": "user", "content": "hi"}},
			}
		}
		encoded, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		body = bytes.NewReader(encoded)
	}
	req, err := http.NewRequestWithContext(ctx, method, requestURL, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "codex-cli/0.91.0")
	if method == http.MethodPost {
		req.Header.Set("Content-Type", "application/json")
	}
	switch account.Kind {
	case "anthropic_api_key", "antigravity_api_key":
		req.Header.Set("x-api-key", account.APIKey)
		req.Header.Set("anthropic-version", "2023-06-01")
	case "gemini_api_key":
		req.Header.Set("x-goog-api-key", account.APIKey)
	case "openai_oauth":
		req.Header.Set("Authorization", "Bearer "+account.AccessToken)
		if account.ChatGPTAccountID != "" {
			req.Header.Set("ChatGPT-Account-ID", account.ChatGPTAccountID)
		}
	default:
		req.Header.Set("Authorization", "Bearer "+account.APIKey)
	}
	return req, nil
}

func accountAPIURL(baseURL, endpoint, defaultVersion string) string {
	base := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if strings.HasSuffix(base, endpoint) {
		return base
	}
	for _, suffix := range []string{"/v1", "/v1beta", "/v3", "/v4", "/paas/v4", "/codex"} {
		if strings.HasSuffix(base, suffix) {
			return base + endpoint
		}
	}
	if defaultVersion != "" {
		return base + "/" + defaultVersion + endpoint
	}
	return base + endpoint
}

func accountGeminiGenerateURL(baseURL, model string) string {
	base := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if !strings.HasSuffix(base, "/v1beta") {
		base += "/v1beta"
	}
	return base + "/models/" + url.PathEscape(model) + ":generateContent"
}

func accountTestResponseText(raw []byte) string {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" {
		return ""
	}
	var payload any
	if json.Unmarshal(raw, &payload) == nil {
		paths := [][]any{
			{"choices", 0, "message", "content"},
			{"choices", 0, "message", "reasoning"},
			{"choices", 0, "text"},
			{"output_text"},
			{"output", 0, "content", 0, "text"},
			{"content", 0, "text"},
			{"candidates", 0, "content", "parts", 0, "text"},
		}
		for _, path := range paths {
			if text := accountTestJSONText(jsonPathValue(payload, path...)); text != "" {
				return truncateAccountTestResponse(text)
			}
		}
		if compact, err := json.Marshal(payload); err == nil {
			trimmed = string(compact)
		}
	}
	return truncateAccountTestResponse(trimmed)
}

func jsonPathValue(value any, path ...any) any {
	current := value
	for _, segment := range path {
		switch key := segment.(type) {
		case string:
			object, ok := current.(map[string]any)
			if !ok {
				return nil
			}
			current = object[key]
		case int:
			items, ok := current.([]any)
			if !ok || key < 0 || key >= len(items) {
				return nil
			}
			current = items[key]
		default:
			return nil
		}
	}
	return current
}

func accountTestJSONText(value any) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case []any:
		parts := make([]string, 0, len(typed))
		for _, item := range typed {
			if text := accountTestJSONText(item); text != "" {
				parts = append(parts, text)
			}
		}
		return strings.Join(parts, "\n")
	case map[string]any:
		if text, ok := typed["text"]; ok {
			return accountTestJSONText(text)
		}
	}
	return ""
}

func truncateAccountTestResponse(value string) string {
	const maxRunes = 8192
	runes := []rune(strings.TrimSpace(value))
	if len(runes) <= maxRunes {
		return string(runes)
	}
	return string(runes[:maxRunes]) + "…"
}

func accountModelsURL(kind, baseURL string) string {
	base := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if strings.HasSuffix(base, "/models") {
		return base
	}
	if kind == "openai_oauth" {
		return base + "/models"
	}
	if kind == "gemini_api_key" {
		if strings.HasSuffix(base, "/v1beta") {
			return base + "/models"
		}
		return base + "/v1beta/models"
	}
	for _, suffix := range []string{"/v1", "/v1beta", "/v3", "/v4", "/paas/v4"} {
		if strings.HasSuffix(base, suffix) {
			return base + "/models"
		}
	}
	return base + "/v1/models"
}

func buildWorkerProxy(input ProxyInput, id string, createdAt time.Time, existing *workervault.Proxy) (*workervault.Proxy, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" || len(name) > 255 {
		return nil, errors.New("proxy name must contain between 1 and 255 characters")
	}
	protocol := strings.ToLower(strings.TrimSpace(input.Protocol))
	switch protocol {
	case "http", "https", "socks5", "socks5h":
	default:
		return nil, errors.New("proxy protocol must be http, https, socks5 or socks5h")
	}
	host, err := normalizeProxyHost(input.Host)
	if err != nil {
		return nil, err
	}
	if input.Port < 1 || input.Port > 65535 {
		return nil, errors.New("proxy port must be between 1 and 65535")
	}
	if len(input.Username) > 255 || len(input.Password) > 255 {
		return nil, errors.New("proxy credentials exceed the supported size")
	}
	now := createdAt
	if now.IsZero() {
		now = time.Now().UTC()
	}
	proxy := &workervault.Proxy{
		ID: id, Name: name, Protocol: protocol, Host: host, Port: input.Port,
		Username: strings.TrimSpace(input.Username), Password: input.Password,
		Status: "active", CreatedAt: now, UpdatedAt: now,
	}
	if existing != nil {
		proxy.LastTestAt = existing.LastTestAt
		proxy.LastTestStatus = existing.LastTestStatus
		proxy.LastError = existing.LastError
		proxy.Status = existing.Status
	}
	return proxy, nil
}

func normalizeProxyHost(raw string) (string, error) {
	host := strings.TrimSpace(raw)
	if host == "" || len(host) > 255 || strings.ContainsAny(host, "/?#@\\") ||
		strings.IndexFunc(host, func(r rune) bool { return unicode.IsSpace(r) || unicode.IsControl(r) }) >= 0 {
		return "", errors.New("proxy host is required and must contain only a hostname or IP address")
	}
	if strings.HasPrefix(host, "[") || strings.HasSuffix(host, "]") {
		if !strings.HasPrefix(host, "[") || !strings.HasSuffix(host, "]") {
			return "", errors.New("proxy host contains invalid IPv6 brackets")
		}
		host = strings.TrimSuffix(strings.TrimPrefix(host, "["), "]")
		if ip := net.ParseIP(host); ip == nil || !strings.Contains(host, ":") {
			return "", errors.New("proxy host contains invalid IPv6 brackets")
		}
		return host, nil
	}
	if net.ParseIP(host) != nil {
		return host, nil
	}
	if strings.Contains(host, ":") {
		return "", errors.New("proxy host must not include a port")
	}
	return host, nil
}

func parseOAuthCallback(raw string) (string, string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", "", errors.New("OAuth callback URL or authorization code is required")
	}
	if parsed, err := url.Parse(raw); err == nil && parsed.Scheme != "" {
		if oauthErr := parsed.Query().Get("error"); oauthErr != "" {
			return "", "", fmt.Errorf("OpenAI OAuth returned %s", oauthErr)
		}
		code := strings.TrimSpace(parsed.Query().Get("code"))
		if code == "" {
			return "", "", errors.New("OAuth callback URL does not contain a code")
		}
		return code, strings.TrimSpace(parsed.Query().Get("state")), nil
	}
	for _, separator := range []string{"#", "|"} {
		if parts := strings.SplitN(raw, separator, 2); len(parts) == 2 {
			return strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1]), nil
		}
	}
	return raw, "", nil
}

func randomHex(size int) (string, error) {
	raw := make([]byte, size)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return hex.EncodeToString(raw), nil
}

type oauthClaims struct {
	Email      string `json:"email"`
	OpenAIAuth struct {
		ChatGPTAccountID string `json:"chatgpt_account_id"`
	} `json:"https://api.openai.com/auth"`
	ChatGPTAccountID string
}

func decodeClaims(token string) oauthClaims {
	var claims oauthClaims
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return claims
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil || json.Unmarshal(raw, &claims) != nil {
		return oauthClaims{}
	}
	claims.ChatGPTAccountID = claims.OpenAIAuth.ChatGPTAccountID
	return claims
}
