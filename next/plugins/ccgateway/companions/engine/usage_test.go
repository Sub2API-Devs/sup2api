package engine

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// usageEnv points Claude Code's credential storage at a temp dir and returns
// the credentials path; it also clears proxy variables so the fake upstream is
// reached directly.
func usageEnv(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	t.Setenv("CLAUDE_SECURESTORAGE_CONFIG_DIR", dir)
	t.Setenv("CLAUDE_CONFIG_DIR", dir)
	for _, k := range []string{"HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "CCG_EXTERNAL_EGRESS"} {
		t.Setenv(k, "")
	}
	return filepath.Join(dir, ".credentials.json")
}

func TestUsageNotLoggedIn(t *testing.T) {
	path := usageEnv(t)
	a := &authManager{key: "admin-key", usageURL: "http://127.0.0.1:1/unused"}
	expectCode(t, authRequest(a, "GET", "/admin/usage", "", "admin-key"), 400, codeNotLoggedIn)
	for _, body := range []string{`not json`, `{}`, `{"claudeAiOauth":{"accessToken":"  "}}`} {
		if err := os.WriteFile(path, []byte(body), 0o600); err != nil {
			t.Fatal(err)
		}
		expectCode(t, authRequest(a, "GET", "/admin/usage", "", "admin-key"), 400, codeNotLoggedIn)
	}
	// The admin key guards it like every management endpoint.
	if got := authRequest(a, "GET", "/admin/usage", "", "gateway-key").Code; got != 401 {
		t.Fatalf("wrong key: %d", got)
	}
	expectCode(t, authRequest(a, "POST", "/admin/usage", "", "admin-key"), 405, "invalid_request_error")
}

func TestUsagePassesAnthropicAnswerThrough(t *testing.T) {
	path := usageEnv(t)
	if err := os.WriteFile(path, []byte(`{"claudeAiOauth":{"accessToken":"sk-ant-oat01-test","refreshToken":"r","expiresAt":1,"scopes":["user:profile"]}}`), 0o600); err != nil {
		t.Fatal(err)
	}
	const answer = `{"five_hour":{"utilization":12.5,"resets_at":"2026-10-05T15:00:00Z"},"seven_day_overage_included":{"utilization":3,"resets_at":"2026-10-09T00:00:00Z"}}`
	var got *http.Request
	status, body := 200, answer
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}))
	defer up.Close()
	a := &authManager{key: "admin-key", usageURL: up.URL + "/api/oauth/usage", version: "2.1.288"}

	w := authRequest(a, "GET", "/admin/usage", "", "admin-key")
	if w.Code != 200 || w.Body.String() != answer || w.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("got %d %q", w.Code, w.Body.String())
	}
	if got.Method != "GET" || got.URL.Path != "/api/oauth/usage" || got.Header.Get("Authorization") != "Bearer sk-ant-oat01-test" ||
		got.Header.Get("anthropic-beta") != "oauth-2025-04-20" || got.Header.Get("User-Agent") != "claude-code/2.1.288" ||
		got.Header.Get("Accept") != "application/json, text/plain, */*" {
		t.Fatalf("upstream request %s %s %v", got.Method, got.URL, got.Header)
	}

	status, body = 401, `{"type":"error","error":{"type":"authentication_error","message":"OAuth token has expired"}}`
	expectCode(t, authRequest(a, "GET", "/admin/usage", "", "admin-key"), 400, codeTokenExpired)
	for _, c := range []struct {
		status int
		body   string
	}{{403, `{"error":"forbidden é"}`}, {429, ``}, {500, `oops`}, {200, `not json`}, {200, `[1]`}, {200, `null`}} {
		status, body = c.status, c.body
		expectCode(t, authRequest(a, "GET", "/admin/usage", "", "admin-key"), 502, codeUpstreamError)
	}
	up.Close()
	expectCode(t, authRequest(a, "GET", "/admin/usage", "", "admin-key"), 502, codeUpstreamError)
}

func TestEnvProxy(t *testing.T) {
	if envProxy([]string{"PATH=/bin", "HTTP_PROXY=http://ignored:1"}) != nil {
		t.Fatal("HTTP_PROXY alone must not proxy the HTTPS usage call")
	}
	p := envProxy([]string{"https_proxy=http://u:p@proxy.example:8080"})
	if p == nil {
		t.Fatal("no proxy")
	}
	u, _ := p(httptest.NewRequest("GET", "https://api.anthropic.com/api/oauth/usage", nil))
	if u == nil || u.Host != "proxy.example:8080" {
		t.Fatalf("proxy %v", u)
	}
}
