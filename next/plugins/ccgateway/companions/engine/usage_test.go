package engine

import (
	"fmt"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

// usageEnv points Claude Code's credential storage at a temp dir and returns
// the credentials path; it also clears proxy variables so the fake CLI peer is
// reached without a proxy in its environment.
func usageEnv(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	t.Setenv("CLAUDE_SECURESTORAGE_CONFIG_DIR", dir)
	t.Setenv("CLAUDE_CONFIG_DIR", dir)
	for _, k := range []string{"HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy", "CCG_EXTERNAL_EGRESS"} {
		t.Setenv(k, "")
	}
	return filepath.Join(dir, ".credentials.json")
}

// usageAuth is an authManager whose CLI is the fake management peer.
func usageAuth(t *testing.T, values map[string]string) (*authManager, string) {
	t.Helper()
	runner, argsLog := managementTestRunner(t, values)
	return &authManager{key: "admin-key", cli: runner.CLI, work: runner.Work, env: runner.Env, managementHTTP: true}, argsLog
}

func TestUsageNotLoggedIn(t *testing.T) {
	path := usageEnv(t)
	a, argsLog := usageAuth(t, nil)
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
	// Not signed in never starts a CLI process.
	if records := managementRecords(t, argsLog); len(records) != 0 {
		t.Fatalf("usage started %d CLI processes while signed out", len(records))
	}
}

func TestUsagePassesAnthropicAnswerThrough(t *testing.T) {
	path := usageEnv(t)
	if err := os.WriteFile(path, []byte(`{"claudeAiOauth":{"accessToken":"sk-ant-oat01-test","refreshToken":"r","expiresAt":1,"scopes":["user:profile"]}}`), 0o600); err != nil {
		t.Fatal(err)
	}
	const answer = `{"five_hour":{"utilization":12.5,"resets_at":"2026-10-05T15:00:00Z"},"seven_day_overage_included":{"utilization":3,"resets_at":"2026-10-09T00:00:00Z"}}`
	a, argsLog := usageAuth(t, map[string]string{"CCG_TEST_MGMT_BODY": answer})

	w := authRequest(a, "GET", "/admin/usage", "", "admin-key")
	if w.Code != 200 || w.Body.String() != answer || w.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("got %d %q", w.Code, w.Body.String())
	}
	records := managementRecords(t, argsLog)
	if len(records) != 1 {
		t.Fatalf("usage ran %d CLI processes", len(records))
	}
	if records[0]["path"] != usagePath || records[0]["method"] != "GET" {
		t.Fatalf("management call %v", records[0])
	}
	headers := fmt.Sprint(records[0]["headers"])
	for _, want := range []string{"Accept:application/json, text/plain, */*", "Content-Type:application/json"} {
		if !strings.Contains(headers, want) {
			t.Fatalf("management headers %q lack %q", headers, want)
		}
	}
	// The official usage read carries no Anthropic-Beta header, and the
	// credential stays with the CLI: Go must not pass either.
	if strings.Contains(strings.ToLower(headers), "anthropic-beta") {
		t.Fatalf("usage passed an Anthropic-Beta header: %q", headers)
	}
	if strings.Contains(strings.ToLower(headers), "authorization") || strings.Contains(headers, "sk-ant-oat01-test") {
		t.Fatalf("usage passed a credential to the CLI: %q", headers)
	}
	if got, _ := records[0]["timeout_ms"].(float64); got < float64((usageTimeout-time.Second)/time.Millisecond) || got > float64(usageTimeout/time.Millisecond) {
		t.Fatalf("management timeout %v, want the official usage timeout", records[0]["timeout_ms"])
	}
	if got, _ := records[0]["max_bytes"].(float64); got != float64(usageCLIMaxBytes) {
		t.Fatalf("management max-bytes %v, want the usage body limit", records[0]["max_bytes"])
	}

	for _, c := range []struct {
		values map[string]string
		status int
		want   string
	}{
		{map[string]string{"CCG_TEST_MGMT_STATUS": "401", "CCG_TEST_MGMT_BODY": `{"type":"error","error":{"type":"authentication_error","message":"OAuth token has expired"}}`}, 400, codeTokenExpired},
		{map[string]string{"CCG_TEST_MGMT_STATUS": "403", "CCG_TEST_MGMT_BODY": `{"error":"forbidden é"}`}, 502, codeUpstreamError},
		{map[string]string{"CCG_TEST_MGMT_STATUS": "429"}, 502, codeUpstreamError},
		{map[string]string{"CCG_TEST_MGMT_STATUS": "500", "CCG_TEST_MGMT_BODY": "oops"}, 502, codeUpstreamError},
		{map[string]string{"CCG_TEST_MGMT_BODY": "not json"}, 502, codeUpstreamError},
		{map[string]string{"CCG_TEST_MGMT_BODY": "[1]"}, 502, codeUpstreamError},
		{map[string]string{"CCG_TEST_MGMT_BODY": "null"}, 502, codeUpstreamError},
		{map[string]string{"CCG_TEST_MGMT_EXIT": strconv.Itoa(cliManagementExitTransport)}, 502, codeUpstreamError},
		{map[string]string{"CCG_TEST_MGMT_EXIT": strconv.Itoa(cliManagementExitRejected)}, 502, codeUpstreamError},
	} {
		other, _ := usageAuth(t, c.values)
		expectCode(t, authRequest(other, "GET", "/admin/usage", "", "admin-key"), c.status, c.want)
	}
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

// An expired access token with a refresh token is renewed by the CLI on its
// next request; a revoked one, one refused before expiry, one without a
// refresh token or one a model request was already refused with is not.
func TestUsageTellsExpiredFromRevoked(t *testing.T) {
	path := usageEnv(t)
	write := func(creds string) {
		t.Helper()
		if err := os.WriteFile(path, []byte(creds), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	const expiredBody = `{"type":"error","error":{"type":"authentication_error","message":"OAuth access token has expired. Re-authenticate to continue."}}`
	const revokedBody = `{"type":"error","error":{"type":"authentication_error","message":"OAuth access token has been revoked."}}`
	const plainBody = `{"type":"error","error":{"type":"authentication_error","message":"Invalid bearer token"}}`
	future := time.Now().Add(time.Hour).UnixMilli()
	for _, c := range []struct {
		creds, body, want string
	}{
		{`{"claudeAiOauth":{"accessToken":"a1","refreshToken":"r","expiresAt":1}}`, expiredBody, codeTokenExpired},
		{`{"claudeAiOauth":{"accessToken":"a1","refreshToken":"r","expiresAt":1}}`, plainBody, codeTokenExpired},
		{`{"claudeAiOauth":{"accessToken":"a1","refreshToken":"r"}}`, expiredBody, codeTokenExpired},
		{`{"claudeAiOauth":{"accessToken":"a1","refreshToken":"r","expiresAt":1}}`, revokedBody, codeTokenRevoked},
		{fmt.Sprintf(`{"claudeAiOauth":{"accessToken":"a1","refreshToken":"r","expiresAt":%d}}`, future), plainBody, codeTokenRevoked},
		{`{"claudeAiOauth":{"accessToken":"a1","expiresAt":1}}`, expiredBody, codeTokenRevoked},
		{`{"claudeAiOauth":{"accessToken":"a1","refreshToken":" ","expiresAt":1}}`, expiredBody, codeTokenRevoked},
	} {
		write(c.creds)
		a, _ := usageAuth(t, map[string]string{"CCG_TEST_MGMT_STATUS": "401", "CCG_TEST_MGMT_BODY": c.body})
		expectCode(t, authRequest(a, "GET", "/admin/usage", "", "admin-key"), 400, c.want)
	}

	// A model request refused with the stored token: the CLI could not renew
	// it, so it is reported without asking Anthropic again.
	write(`{"claudeAiOauth":{"accessToken":"a1","refreshToken":"r","expiresAt":1}}`)
	a, argsLog := usageAuth(t, map[string]string{"CCG_TEST_MGMT_STATUS": "401", "CCG_TEST_MGMT_BODY": expiredBody})
	noteAuthenticationRefused(os.Environ())
	expectCode(t, authRequest(a, "GET", "/admin/usage", "", "admin-key"), 400, codeTokenRevoked)
	if records := managementRecords(t, argsLog); len(records) != 0 {
		t.Fatalf("usage asked the CLI %d times for a refused token", len(records))
	}
	// A renewed (or newly authorized) token is judged afresh.
	write(`{"claudeAiOauth":{"accessToken":"a2","refreshToken":"r2","expiresAt":1}}`)
	renewed, _ := usageAuth(t, map[string]string{"CCG_TEST_MGMT_STATUS": "401", "CCG_TEST_MGMT_BODY": expiredBody})
	expectCode(t, authRequest(renewed, "GET", "/admin/usage", "", "admin-key"), 400, codeTokenExpired)
	ok, _ := usageAuth(t, map[string]string{"CCG_TEST_MGMT_BODY": `{"five_hour":{"utilization":1}}`})
	if w := authRequest(ok, "GET", "/admin/usage", "", "admin-key"); w.Code != 200 {
		t.Fatalf("renewed token: %d %s", w.Code, w.Body.String())
	}
}

// An older CLI has no ccgateway-mgmt command: usage says so instead of
// starting a process that can only fail.
func TestUsageRequiresManagementCapability(t *testing.T) {
	path := usageEnv(t)
	if err := os.WriteFile(path, []byte(`{"claudeAiOauth":{"accessToken":"a1","refreshToken":"r","expiresAt":1}}`), 0600); err != nil {
		t.Fatal(err)
	}
	runner, argsLog := managementTestRunner(t, nil)
	a := &authManager{key: "admin-key", cli: runner.CLI, work: runner.Work, env: runner.Env}
	w := authRequest(a, "GET", "/admin/usage", "", "admin-key")
	if w.Code != 502 || !strings.Contains(w.Body.String(), "does not support") {
		t.Fatalf("got %d %s", w.Code, w.Body.String())
	}
	if records := managementRecords(t, argsLog); len(records) != 0 {
		t.Fatalf("an unsupported CLI was still asked %d times", len(records))
	}
}

// A missing login the CLI reports maps back to the endpoint's own
// not_logged_in answer, and an oversized answer says so; neither may collapse
// into a generic upstream failure.
func TestUsageLoginAndSizeFailures(t *testing.T) {
	path := usageEnv(t)
	if err := os.WriteFile(path, []byte(`{"claudeAiOauth":{"accessToken":"a1","refreshToken":"r","expiresAt":1}}`), 0600); err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name    string
		values  map[string]string
		status  int
		code    string
		message string
	}{
		{"login-exit", map[string]string{"CCG_TEST_MGMT_EXIT": strconv.Itoa(cliManagementExitNotLoggedIn)}, 400, codeNotLoggedIn, "not signed in"},
		{"login-frame", map[string]string{"CCG_TEST_MGMT_EXIT": strconv.Itoa(cliManagementExitRejected), "CCG_TEST_MGMT_ERROR_FRAME": "not_logged_in"}, 400, codeNotLoggedIn, "not signed in"},
		{"size-exit", map[string]string{"CCG_TEST_MGMT_EXIT": strconv.Itoa(cliManagementExitTooLarge)}, 502, codeUpstreamError, "too large"},
		{"size-frame", map[string]string{"CCG_TEST_MGMT_EXIT": strconv.Itoa(cliManagementExitRejected), "CCG_TEST_MGMT_ERROR_FRAME": "response_too_large"}, 502, codeUpstreamError, "too large"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			a, _ := usageAuth(t, tc.values)
			w := authRequest(a, "GET", "/admin/usage", "", "admin-key")
			expectCode(t, w, tc.status, tc.code)
			if !strings.Contains(w.Body.String(), tc.message) {
				t.Fatalf("got %s, want a %q message", w.Body.String(), tc.message)
			}
		})
	}
}
