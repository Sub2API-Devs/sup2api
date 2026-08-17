package workermanagement

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/workervault"
	"github.com/google/uuid"
)

const (
	ProtocolVersion   = "aicodex.proxy-worker/v1"
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
	APIKey    string `json:"api_key,omitempty"`
	BaseURL   string `json:"base_url,omitempty"`
	Models    string `json:"models,omitempty"`
	Group     string `json:"group,omitempty"`
	TestModel string `json:"test_model,omitempty"`
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

func (m *Manager) WorkerID() string      { return m.cfg.WorkerID }
func (m *Manager) InstanceID() string    { return m.cfg.InstanceID }
func (m *Manager) Version() string       { return m.cfg.Version }
func (m *Manager) ManagementKey() string { return m.cfg.ManagementKey }

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
	status := map[string]any{
		"worker_id": m.WorkerID(), "instance_id": m.InstanceID(),
		"vault_ready": accountErr == nil, "account_count": len(accounts),
		"log_transport": m.cfg.LogTransport,
	}
	if accountErr != nil {
		status["vault_error"] = accountErr.Error()
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
	if err := validateAccountInput(input); err != nil {
		return nil, err
	}
	name := strings.TrimSpace(input.Name)
	key := strings.TrimSpace(input.APIKey)
	if name == "" || key == "" {
		return nil, errors.New("account name and API key are required")
	}
	baseURL, err := normalizeBaseURL(input.BaseURL, defaultAPIBaseURL)
	if err != nil {
		return nil, err
	}
	now := m.cfg.Now().UTC()
	account := &workervault.Account{
		ID: uuid.NewString(), Name: name, Kind: "openai_api_key", Status: "active",
		BaseURL: baseURL, Models: strings.TrimSpace(input.Models), Group: strings.TrimSpace(input.Group),
		TestModel: strings.TrimSpace(input.TestModel), APIKey: key, CreatedAt: now, UpdatedAt: now,
	}
	if err := m.vault.Put(account); err != nil {
		return nil, err
	}
	summary := account.Summary()
	return &summary, nil
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

func (m *Manager) TestAccount(ctx context.Context, id string, _ TestInput) (map[string]any, error) {
	account, err := m.vault.Get(strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}
	started := m.cfg.Now()
	target := strings.TrimRight(account.BaseURL, "/") + "/models"
	if account.Kind == "openai_api_key" && !strings.HasSuffix(strings.TrimRight(account.BaseURL, "/"), "/v1") {
		target = strings.TrimRight(account.BaseURL, "/") + "/v1/models"
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return nil, err
	}
	token := account.APIKey
	if account.Kind == "openai_oauth" {
		token = account.AccessToken
		if account.ChatGPTAccountID != "" {
			req.Header.Set("ChatGPT-Account-ID", account.ChatGPTAccountID)
		}
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "codex-cli/0.91.0")
	resp, requestErr := m.cfg.HTTPClient.Do(req)
	status := 0
	if resp != nil {
		status = resp.StatusCode
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 64<<10))
		_ = resp.Body.Close()
	}
	account.LastTestAt = m.cfg.Now().Unix()
	account.LastTestStatus = status
	account.UpdatedAt = m.cfg.Now().UTC()
	if requestErr != nil {
		account.Status = "error"
		account.LastError = requestErr.Error()
		_ = m.vault.Put(account)
		return nil, fmt.Errorf("OpenAI connection test failed: %w", requestErr)
	}
	if status < 200 || status >= 300 {
		account.Status = "error"
		account.LastError = fmt.Sprintf("OpenAI returned HTTP %d", status)
		_ = m.vault.Put(account)
		return nil, errors.New(account.LastError)
	}
	account.Status = "active"
	account.LastError = ""
	if err := m.vault.Put(account); err != nil {
		return nil, err
	}
	return map[string]any{"ok": true, "status_code": status, "latency_ms": time.Since(started).Milliseconds(), "account": account.Summary()}, nil
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
	if len(input.APIKey) > 64<<10 || len(input.Models) > 8<<10 || len(input.Group) > 255 || len(input.TestModel) > 255 {
		return errors.New("Worker account metadata exceeds the supported size")
	}
	return nil
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
