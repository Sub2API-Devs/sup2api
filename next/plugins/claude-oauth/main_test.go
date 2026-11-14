package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

//go:embed manifest.json
var manifestRaw []byte

func TestManifest(t *testing.T) {
	var m manifest.Manifest
	if err := json.Unmarshal(manifestRaw, &m); err != nil {
		t.Fatalf("parse manifest: %v", err)
	}
	if m.Key != "claude_oauth" {
		t.Errorf("key = %q, want claude_oauth", m.Key)
	}
	if len(m.AccountTypes) != 2 {
		t.Fatalf("account types = %d, want 2", len(m.AccountTypes))
	}
	oauth := m.AccountTypes[0]
	if oauth.ID != "claude_oauth" {
		t.Errorf("accountTypes[0].id = %q, want claude_oauth", oauth.ID)
	}
	if len(oauth.Platforms) != 1 || oauth.Platforms[0].Platform != "anthropic" {
		t.Errorf("accountTypes[0] platform = %+v, want anthropic", oauth.Platforms)
	}
	if len(oauth.SensitiveFields) != 2 {
		t.Errorf("sensitiveFields = %v, want 2 fields", oauth.SensitiveFields)
	}
	setupToken := m.AccountTypes[1]
	if setupToken.ID != "claude_setup_token" {
		t.Errorf("accountTypes[1].id = %q, want claude_setup_token", setupToken.ID)
	}
}

func TestValidateCredentials(t *testing.T) {
	h := pluginsdktest.Start(t, newPlugin(), pluginsdktest.Options{
		SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestRaw)},
	})

	tests := []struct {
		name      string
		creds     string
		wantError bool
	}{
		{
			name:      "valid",
			creds:     `{"access_token":"sk-ant-test"}`,
			wantError: false,
		},
		{
			name:      "missing access_token",
			creds:     `{}`,
			wantError: true,
		},
		{
			name:      "empty access_token",
			creds:     `{"access_token":""}`,
			wantError: true,
		},
		{
			name:      "invalid JSON",
			creds:     `{invalid`,
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := h.Platform.ValidateCredentials(context.Background(), &pluginv1.ValidateCredentialsRequest{
				AccountType:     "claude_oauth",
				CredentialsJson: tt.creds,
			})
			if err != nil {
				t.Fatalf("ValidateCredentials error: %v", err)
			}
			hasError := len(resp.GetErrors()) > 0
			if hasError != tt.wantError {
				t.Errorf("errors = %v, wantError = %v", resp.GetErrors(), tt.wantError)
			}
		})
	}
}

func TestBuildUpstreamRequest(t *testing.T) {
	h := pluginsdktest.Start(t, newPlugin(), pluginsdktest.Options{
		SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestRaw)},
	})

	req := &pluginv1.BuildUpstreamRequestRequest{
		Meta: &pluginv1.RequestMeta{
			Protocol: "anthropic.messages",
			Model:    "claude-opus-5",
		},
		Account: &pluginv1.Account{
			Id:              1,
			Name:            "test",
			Platform:        "anthropic",
			Type:            "claude_oauth",
			CredentialsJson: `{"access_token":"sk-ant-test123","expires_at":9999999999}`,
		},
	}

	resp, err := h.Platform.BuildUpstreamRequest(context.Background(), req)
	if err != nil {
		t.Fatalf("BuildUpstreamRequest error: %v", err)
	}

	if resp.GetUrl() != MessagesURL {
		t.Errorf("url = %q, want %q", resp.GetUrl(), MessagesURL)
	}
	if resp.GetMethod() != "POST" {
		t.Errorf("method = %q, want POST", resp.GetMethod())
	}

	headers := resp.GetHeaders()
	auth := headers["authorization"]
	if auth != "Bearer sk-ant-test123" {
		t.Errorf("authorization = %q, want Bearer sk-ant-test123", auth)
	}
	if headers["anthropic-version"] != "2023-06-01" {
		t.Errorf("anthropic-version = %q", headers["anthropic-version"])
	}
	if headers["anthropic-beta"] == "" {
		t.Errorf("anthropic-beta header missing")
	}
}

func TestClassifyError(t *testing.T) {
	h := pluginsdktest.Start(t, newPlugin(), pluginsdktest.Options{
		SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestRaw)},
	})

	tests := []struct {
		name       string
		status     int32
		body       string
		wantEffect pluginv1.ClassifyErrorResponse_AccountEffect
	}{
		{
			name:       "401 unauthorized",
			status:     401,
			body:       `{"type":"authentication_error","message":"invalid token"}`,
			wantEffect: pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE,
		},
		{
			name:       "429 rate limit",
			status:     429,
			body:       `{"type":"rate_limit_error"}`,
			wantEffect: pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN,
		},
		{
			name:       "400 invalid request",
			status:     400,
			body:       `{"type":"invalid_request_error","message":"bad input"}`,
			wantEffect: pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := h.Platform.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{
				Status:     tt.status,
				BodyPrefix: []byte(tt.body),
			})
			if err != nil {
				t.Fatalf("ClassifyError error: %v", err)
			}
			if resp.GetAccountEffect() != tt.wantEffect {
				t.Errorf("account_effect = %v, want %v", resp.GetAccountEffect(), tt.wantEffect)
			}
		})
	}
}

func TestAuthStartFlow(t *testing.T) {
	h := pluginsdktest.Start(t, newPlugin(), pluginsdktest.Options{
		SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestRaw)},
		Grants: []*pluginv1.Grant{
			{Permission: "kv"},
			{Permission: "routes.admin"},
		},
	})

	// 启动授权流程
	resp := h.Do("POST", "/auth/start", nil, map[string]any{"scope": "oauth"})
	if resp.GetStatus() != 200 {
		t.Fatalf("auth/start status = %d, want 200, body=%s", resp.GetStatus(), resp.GetBody())
	}

	var startResp authStartResponse
	if err := json.Unmarshal(resp.GetBody(), &startResp); err != nil {
		t.Fatalf("parse start response: %v", err)
	}

	if startResp.AuthURL == "" {
		t.Error("auth_url is empty")
	}
	if !contains(startResp.AuthURL, "claude.com") {
		t.Errorf("auth_url does not contain claude.com: %s", startResp.AuthURL)
	}
	if startResp.SessionID == "" {
		t.Error("session_id is empty")
	}

	// 验证会话已存储
	kvResp, err := h.Host.KVGet(context.Background(), &pluginv1.KVGetRequest{
		Namespace: "oauth_session",
		Key:       startResp.SessionID,
	})
	if err != nil {
		t.Fatalf("KVGet error: %v", err)
	}
	if !kvResp.GetFound() {
		t.Fatal("session not found in KV")
	}
	// 会话绑定发起人（Harness.Do 的调用者是用户 1）
	var stored struct {
		UserID  int64       `json:"uid"`
		Session authSession `json:"v"`
	}
	if err := json.Unmarshal(kvResp.GetValue(), &stored); err != nil {
		t.Fatalf("parse session: %v", err)
	}
	if stored.UserID != 1 || stored.Session.Scope != ScopeOAuth || stored.Session.State == "" || stored.Session.CodeVerifier == "" {
		t.Errorf("stored session = %+v", stored)
	}
}

// startAuth starts an authorization as user 1 and returns its session id and
// state.
func startAuth(t *testing.T, h *pluginsdktest.Harness) (id, state string) {
	t.Helper()
	resp := h.Do("POST", "/auth/start", nil, map[string]any{"scope": "oauth"})
	var start authStartResponse
	if err := json.Unmarshal(resp.GetBody(), &start); err != nil || resp.GetStatus() != 200 {
		t.Fatalf("auth/start = %d %s (%v)", resp.GetStatus(), resp.GetBody(), err)
	}
	u, err := url.Parse(start.AuthURL)
	if err != nil || u.Query().Get("state") == "" {
		t.Fatalf("auth url %q: %v", start.AuthURL, err)
	}
	return start.SessionID, u.Query().Get("state")
}

func sessionStored(t *testing.T, h *pluginsdktest.Harness, id string) bool {
	t.Helper()
	kv, err := h.Host.KVGet(context.Background(), &pluginv1.KVGetRequest{Namespace: kvOAuthSession, Key: id})
	if err != nil {
		t.Fatal(err)
	}
	return kv.GetFound()
}

func errorCode(t *testing.T, resp *pluginv1.HTTPResponse) string {
	t.Helper()
	var out struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(resp.GetBody(), &out); err != nil {
		t.Fatalf("parse error body %s: %v", resp.GetBody(), err)
	}
	return out.Error.Code
}

func authHarness(t *testing.T) *pluginsdktest.Harness {
	t.Helper()
	h, _ := authHarnessWithIssuer(t)
	return h
}

// authHarnessWithIssuer is authHarness with codes exchanged at a fake token
// endpoint, never the real one; the channel receives each exchange body.
func authHarnessWithIssuer(t *testing.T) (*pluginsdktest.Harness, <-chan map[string]any) {
	t.Helper()
	exchanged := make(chan map[string]any, 4)
	issuer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		exchanged <- body
		_, _ = w.Write([]byte(`{"access_token":"at","refresh_token":"rt","expires_in":3600}`))
	}))
	t.Cleanup(issuer.Close)
	p := newPlugin()
	p.tokenURL = issuer.URL
	return pluginsdktest.Start(t, p, pluginsdktest.Options{
		SDK:    []pluginsdk.Option{pluginsdk.WithManifest(manifestRaw)},
		Grants: []*pluginv1.Grant{{Permission: "kv"}, {Permission: "routes.admin"}},
	}), exchanged
}

// Only the user who started an authorization can exchange its code: to anyone
// else the session does not exist, and it is left for its owner.
func TestAuthExchangeNeedsTheStartingUser(t *testing.T) {
	h := authHarness(t)
	id, state := startAuth(t, h)
	body := map[string]any{"session_id": id, "code": "code-1#" + state}
	missing := h.Do("POST", "/auth/exchange", nil, map[string]any{"session_id": "no-such-session", "code": "code-1"})
	for _, uid := range []int64{2, 0} {
		resp := h.DoAs(uid, "POST", "/auth/exchange", nil, body)
		if resp.GetStatus() != 404 || string(resp.GetBody()) != string(missing.GetBody()) {
			t.Fatalf("user %d = %d %s, want the answer of a missing session %s", uid, resp.GetStatus(), resp.GetBody(), missing.GetBody())
		}
	}
	if !sessionStored(t, h, id) {
		t.Fatal("another user's attempt removed the session")
	}
	if resp := h.DoAs(0, "POST", "/auth/start", nil, map[string]any{"scope": "oauth"}); resp.GetStatus() != 401 {
		t.Fatalf("auth/start without a caller = %d %s", resp.GetStatus(), resp.GetBody())
	}
}

// Whitespace pasted around the code or its state is not a different state.
func TestAuthExchangeStateIgnoresPastedWhitespace(t *testing.T) {
	h, exchanged := authHarnessWithIssuer(t)
	id, state := startAuth(t, h)
	resp := h.Do("POST", "/auth/exchange", nil, map[string]any{"session_id": id, "code": "  code-1#" + state + " \n"})
	if resp.GetStatus() != 200 {
		t.Fatalf("padded state = %d %s", resp.GetStatus(), resp.GetBody())
	}
	if body := <-exchanged; body["code"] != "code-1" || body["state"] != state {
		t.Fatalf("exchanged %v, want code-1 and state %q", body, state)
	}
	if sessionStored(t, h, id) {
		t.Fatal("the session survived a completed exchange")
	}
}

// A code carrying another authorization's state is refused before anything
// is sent upstream, and the session is over.
func TestAuthExchangeStateMismatch(t *testing.T) {
	h := authHarness(t)
	id, state := startAuth(t, h)
	resp := h.Do("POST", "/auth/exchange", nil, map[string]any{"session_id": id, "code": "code-1#not-" + state})
	if resp.GetStatus() != 400 || errorCode(t, resp) != "state_mismatch" {
		t.Fatalf("mismatched state = %d %s", resp.GetStatus(), resp.GetBody())
	}
	if sessionStored(t, h, id) {
		t.Fatal("the session survived a state mismatch")
	}
	if resp := h.Do("POST", "/auth/exchange", nil, map[string]any{"session_id": id, "code": "code-1#" + state}); resp.GetStatus() != 404 {
		t.Fatalf("exchange after a mismatch = %d %s", resp.GetStatus(), resp.GetBody())
	}
}

func TestPKCE(t *testing.T) {
	verifier, err := generateRandomString(32)
	if err != nil {
		t.Fatalf("generateRandomString: %v", err)
	}
	if len(verifier) < 40 {
		t.Errorf("verifier length = %d, too short", len(verifier))
	}

	challenge := generateCodeChallenge(verifier)
	if len(challenge) < 40 {
		t.Errorf("challenge length = %d, too short", len(challenge))
	}
	if challenge == verifier {
		t.Error("challenge should differ from verifier")
	}
}

func contains(s, substr string) bool {
	return len(s) > 0 && len(substr) > 0 && len(s) >= len(substr) && findSubstring(s, substr)
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
