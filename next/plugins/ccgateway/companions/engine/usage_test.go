package engine

import (
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
)

func TestUsageNotLoggedIn(t *testing.T) {
	path := usageEnv(t)
	a, log := usageAuth(t, nil)
	expectCode(t, authRequest(a, "GET", "/admin/usage", "", "admin-key"), 400, codeNotLoggedIn)
	for _, body := range []string{`not json`, `{}`, `{"claudeAiOauth":{"accessToken":"  "}}`} {
		writeUsageLogin(t, path, body)
		expectCode(t, authRequest(a, "GET", "/admin/usage", "", "admin-key"), 400, codeNotLoggedIn)
	}
	// The admin key guards it like every management endpoint.
	if got := authRequest(a, "GET", "/admin/usage", "", "gateway-key").Code; got != 401 {
		t.Fatalf("wrong key: %d", got)
	}
	expectCode(t, authRequest(a, "POST", "/admin/usage", "", "admin-key"), 405, "invalid_request_error")
	// Not signed in never starts a CLI process.
	if runs := usageRuns(t, log); len(runs) != 0 {
		t.Fatalf("usage started %d CLI processes while signed out", len(runs))
	}
}

// The answer is the usage read Claude Code's /usage stored, verbatim (made
// compact), and the command runs alone with nonessential traffic allowed.
func TestUsageReturnsClaudeCodeStoredRead(t *testing.T) {
	path := usageEnv(t)
	writeUsageLogin(t, path, usageLogin)
	const stored = `{
  "five_hour": {"utilization": 12.5, "resets_at": "2026-10-05T15:00:00Z"},
  "limits": [{"kind": "weekly_scoped", "percent": 3, "scope": {"model": {"display_name": "Fable"}}}]
}`
	const want = `{"five_hour":{"utilization":12.5,"resets_at":"2026-10-05T15:00:00Z"},"limits":[{"kind":"weekly_scoped","percent":3,"scope":{"model":{"display_name":"Fable"}}}]}`
	a, log := usageAuth(t, map[string]string{"CCG_TEST_USAGE_STORE": stored, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"})

	w := authRequest(a, "GET", "/admin/usage", "", "admin-key")
	if w.Code != 200 || w.Body.String() != want || w.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("got %d %q", w.Code, w.Body.String())
	}
	runs := usageRuns(t, log)
	if len(runs) != 1 {
		t.Fatalf("usage ran %d CLI processes", len(runs))
	}
	args := runs[0].Args
	if len(args) < 2 || args[0] != "-p" || args[1] != "/usage" || !slices.Contains(args, "--no-session-persistence") || slices.Contains(args, "--disable-slash-commands") {
		t.Fatalf("usage command %q", args)
	}
	// Claude Code skips the usage read as nonessential traffic: this process
	// alone runs without the switch, and is never handed the token.
	for _, item := range runs[0].Env {
		if strings.HasPrefix(strings.ToUpper(item), "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=") {
			t.Fatalf("usage process kept %s", item)
		}
	}
	if strings.Contains(strings.Join(args, " "), "sk-ant-oat01-test") {
		t.Fatalf("usage passed the token: %q", args)
	}
}

// A read Claude Code answered from its own recent snapshot is fresh; an
// older stored read, another account's or a malformed one is not an answer.
func TestUsageStoredReadMustBeFresh(t *testing.T) {
	const read = `{"five_hour":{"utilization":1}}`
	for _, c := range []struct {
		name   string
		values map[string]string
		status int
	}{
		{"recent snapshot", map[string]string{"CCG_TEST_USAGE_STORE": read, "CCG_TEST_USAGE_AGE_MS": "30000"}, 200},
		{"stale", map[string]string{"CCG_TEST_USAGE_STORE": read, "CCG_TEST_USAGE_AGE_MS": "120000"}, 502},
		{"other account", map[string]string{"CCG_TEST_USAGE_STORE": read, "CCG_TEST_USAGE_ACCOUNT": "acct-other"}, 502},
		{"not an object", map[string]string{"CCG_TEST_USAGE_STORE": `[1]`}, 502},
		{"null", map[string]string{"CCG_TEST_USAGE_STORE": `null`}, 502},
		{"too large", map[string]string{"CCG_TEST_USAGE_STORE": `{"pad":"` + strings.Repeat("x", usageMaxBody) + `"}`}, 502},
		{"nothing stored", nil, 502},
	} {
		t.Run(c.name, func(t *testing.T) {
			writeUsageLogin(t, usageEnv(t), usageLogin)
			a, _ := usageAuth(t, c.values)
			w := authRequest(a, "GET", "/admin/usage", "", "admin-key")
			if c.status == 200 {
				if w.Code != 200 || w.Body.String() != read {
					t.Fatalf("got %d %s", w.Code, w.Body.String())
				}
				return
			}
			expectCode(t, w, c.status, codeUpstreamError)
		})
	}
}

// Claude Code drops a login Anthropic refused and it could not renew: that
// is a revoked authorization, not a passing failure.
func TestUsageDroppedLoginIsRevoked(t *testing.T) {
	path := usageEnv(t)
	writeUsageLogin(t, path, usageLogin)
	a, _ := usageAuth(t, map[string]string{"CCG_TEST_USAGE_DROP_LOGIN": "1"})
	expectCode(t, authRequest(a, "GET", "/admin/usage", "", "admin-key"), 400, codeTokenRevoked)
}

// A token a model request was refused with is reported without running the
// command; a renewed one is judged afresh.
func TestUsageRefusedTokenSkipsTheCommand(t *testing.T) {
	path := usageEnv(t)
	writeUsageLogin(t, path, usageLogin)
	a, log := usageAuth(t, map[string]string{"CCG_TEST_USAGE_STORE": `{"five_hour":{"utilization":1}}`})
	noteAuthenticationRefused(a.environment())
	expectCode(t, authRequest(a, "GET", "/admin/usage", "", "admin-key"), 400, codeTokenRevoked)
	if runs := usageRuns(t, log); len(runs) != 0 {
		t.Fatalf("usage ran the command %d times for a refused token", len(runs))
	}
	writeUsageLogin(t, path, `{"claudeAiOauth":{"accessToken":"a2","refreshToken":"r2","expiresAt":1}}`)
	if w := authRequest(a, "GET", "/admin/usage", "", "admin-key"); w.Code != 200 {
		t.Fatalf("renewed token: %d %s", w.Code, w.Body.String())
	}
}

// Without a fresh read and with the login still stored, a failed command and
// a read that did not succeed are both passing upstream failures.
func TestUsageCommandFailures(t *testing.T) {
	path := usageEnv(t)
	writeUsageLogin(t, path, usageLogin)
	for _, c := range []struct {
		name   string
		values map[string]string
		text   string
	}{
		{"exit", map[string]string{"CCG_TEST_USAGE_EXIT": "1"}, "command failed"},
		{"error result", map[string]string{"CCG_TEST_USAGE_IS_ERROR": "1", "CCG_TEST_USAGE_RESULT": "boom"}, "boom"},
		{"no limits", nil, "using your subscription"},
	} {
		t.Run(c.name, func(t *testing.T) {
			a, _ := usageAuth(t, c.values)
			w := authRequest(a, "GET", "/admin/usage", "", "admin-key")
			expectCode(t, w, 502, codeUpstreamError)
			if !strings.Contains(w.Body.String(), c.text) {
				t.Fatalf("got %s, want %q", w.Body.String(), c.text)
			}
		})
	}
}

func TestEnvProxy(t *testing.T) {
	if envProxy([]string{"PATH=/bin", "HTTP_PROXY=http://ignored:1"}) != nil {
		t.Fatal("HTTP_PROXY alone must not proxy the HTTPS call")
	}
	p := envProxy([]string{"https_proxy=http://u:p@proxy.example:8080"})
	if p == nil {
		t.Fatal("no proxy")
	}
	u, _ := p(httptest.NewRequest("GET", "https://downloads.claude.ai/claude-code-releases/stable", nil))
	if u == nil || u.Host != "proxy.example:8080" {
		t.Fatalf("proxy %v", u)
	}
}
