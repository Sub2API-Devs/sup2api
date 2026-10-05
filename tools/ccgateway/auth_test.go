package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestRealCLIAuthLink(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated CLI authorization test")
	}
	config := t.TempDir()
	t.Setenv("CLAUDE_CONFIG_DIR", config)
	t.Setenv("CLAUDE_SECURESTORAGE_CONFIG_DIR", config)
	a := &authManager{cli: cli, key: "test-management-key"}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	result, err := a.start(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		a.session.cancel()
		// done closes after the CLI has exited. Wait before TempDir cleanup
		// so its final writes cannot race removal of the private config folder.
		select {
		case <-a.session.done:
		case <-time.After(5 * time.Second):
			t.Error("authorization CLI did not exit after cancellation")
		}
	}()
	if result["session_id"] == "" || result["url"] == "" {
		t.Fatal("missing authorization session")
	}
}

const peerState = "peer-state"

// authPeer stands in for the Claude Code CLI (TestMain runs it when
// CCG_TEST_AUTH_PEER is set). Modes: ok, badurl, init-reject, exit-after-link,
// fail (auth status/logout exit 1).
func authPeer(mode string) {
	if args := os.Args[1:]; len(args) >= 2 && args[0] == "auth" {
		if mode == "fail" {
			os.Exit(1)
		}
		if args[1] == "status" {
			_ = json.NewEncoder(os.Stdout).Encode(Object{"loggedIn": true, "authMethod": "claude.ai"})
		}
		return
	}
	dec, enc := json.NewDecoder(os.Stdin), json.NewEncoder(os.Stdout)
	for {
		var frame Object
		if dec.Decode(&frame) != nil {
			return
		}
		request, _ := frame["request"].(map[string]any)
		reply := func(subtype string, value Object) {
			_ = enc.Encode(Object{"type": "control_response", "response": Object{"subtype": subtype, "request_id": frame["request_id"], "response": value}})
		}
		switch str(request, "subtype") {
		case "initialize":
			if mode == "init-reject" {
				reply("error", nil)
				continue
			}
			reply("success", Object{})
		case "claude_authenticate":
			host := "claude.ai"
			if mode == "badurl" {
				host = "evil.example"
			}
			reply("success", Object{"manualUrl": "https://" + host + "/oauth/authorize?code_challenge=c&code_challenge_method=S256&state=" + peerState})
			if mode == "exit-after-link" {
				return
			}
		case "claude_oauth_callback":
			if str(request, "authorizationCode") == "good" && str(request, "state") == peerState {
				reply("success", Object{"account": "ignored"})
			} else {
				reply("error", nil)
			}
			return
		}
	}
}

// peerManager returns an authManager whose CLI is this test binary in the given mode.
func peerManager(t *testing.T, mode string) *authManager {
	t.Helper()
	exe, err := lifecycleTestExecutable()
	if err != nil {
		t.Fatal(err)
	}
	t.Setenv("CCG_TEST_AUTH_PEER", mode)
	a := &authManager{cli: exe, key: "admin-key"}
	t.Cleanup(func() {
		if s := a.session; s != nil {
			s.cancel()
			if s.done != nil {
				<-s.done
			}
		}
	})
	return a
}

func authRequest(a *authManager, method, path, body, key string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	r.Header.Set("Authorization", "Bearer "+key)
	w := httptest.NewRecorder()
	a.ServeHTTP(w, r)
	return w
}

// expectCode asserts an error response and returns nothing; status 0 skips the status check.
func expectCode(t *testing.T, w *httptest.ResponseRecorder, status int, code string) {
	t.Helper()
	var body struct {
		Type  string `json:"type"`
		Error struct {
			Type    string `json:"type"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("not JSON: %q", w.Body.String())
	}
	if w.Code != status || body.Type != "error" || body.Error.Type != code {
		t.Fatalf("want %d %s, got %d %s", status, code, w.Code, w.Body.String())
	}
	for _, r := range body.Error.Message {
		if r > 127 || body.Error.Message == "" {
			t.Fatalf("message must be English: %q", body.Error.Message)
		}
	}
}

func okBody(t *testing.T, w *httptest.ResponseRecorder) Object {
	t.Helper()
	if w.Code != 200 {
		t.Fatalf("got %d %s", w.Code, w.Body.String())
	}
	var out Object
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	return out
}

func TestManagementAuthentication(t *testing.T) {
	for _, key := range []string{"", "gateway-key", "wrong"} {
		a := &authManager{key: "admin-key"}
		if got := authRequest(a, "POST", "/admin/auth/logout", "", key).Code; got != 401 {
			t.Fatalf("got %d", got)
		}
	}
	a := &authManager{}
	if got := authRequest(a, "GET", "/admin/status", "", "").Code; got != 401 {
		t.Fatal(got)
	}
	a = &authManager{key: "admin-key"}
	expectCode(t, authRequest(a, "GET", "/admin/auth/start", "", "admin-key"), 404, "not_found_error")
}

func TestAuthFlowThroughCLI(t *testing.T) {
	a := peerManager(t, "ok")
	if got := okBody(t, authRequest(a, "GET", "/admin/auth/session", "", "admin-key")); got["session"] != nil {
		t.Fatalf("unexpected session %v", got)
	}
	first := okBody(t, authRequest(a, "POST", "/admin/auth/start", "", "admin-key"))
	if first["session_id"] == "" || !strings.Contains(first["url"].(string), "state="+peerState) || first["expires_at"] == nil {
		t.Fatalf("bad session %v", first)
	}
	// start while pending returns the same login; the process is not replaced.
	process := a.session
	second := okBody(t, authRequest(a, "POST", "/admin/auth/start", "", "admin-key"))
	if second["session_id"] != first["session_id"] || second["url"] != first["url"] || second["expires_at"] != first["expires_at"] || a.session != process {
		t.Fatalf("start not idempotent: %v vs %v", first, second)
	}
	got := okBody(t, authRequest(a, "GET", "/admin/auth/session", "", "admin-key"))
	if s, _ := got["session"].(map[string]any); s["session_id"] != first["session_id"] || s["url"] != first["url"] {
		t.Fatalf("session view %v", got)
	}
	// A wrong state keeps the login so the user can paste again.
	expectCode(t, authRequest(a, "POST", "/admin/auth/complete", `{"code":"good#other"}`, "admin-key"), 400, codeInvalidCode)
	if a.session != process {
		t.Fatal("invalid_code ended the session")
	}
	// The CLI rejecting the code ends the login (session_id omitted).
	expectCode(t, authRequest(a, "POST", "/admin/auth/complete", `{"code":"bad#`+peerState+`"}`, "admin-key"), 400, codeAuthRejected)
	if a.session != nil {
		t.Fatal("auth_rejected kept the session")
	}
	<-process.done
	if got := okBody(t, authRequest(a, "GET", "/admin/auth/session", "", "admin-key")); got["session"] != nil {
		t.Fatalf("session survived rejection %v", got)
	}
	third := okBody(t, authRequest(a, "POST", "/admin/auth/start", "", "admin-key"))
	if third["session_id"] == first["session_id"] {
		t.Fatal("new login reused the ended session id")
	}
	process = a.session
	w := authRequest(a, "POST", "/admin/auth/complete", `{"session_id":"`+third["session_id"].(string)+`","code":"good#`+peerState+`"}`, "admin-key")
	if okBody(t, w)["success"] != true || a.session != nil {
		t.Fatalf("complete failed %s", w.Body.String())
	}
	if strings.Contains(w.Body.String(), "account") {
		t.Fatal("leaked CLI account details")
	}
	<-process.done
}

func TestAuthStartFailures(t *testing.T) {
	for mode, code := range map[string]string{"badurl": codeInvalidAuthURL, "init-reject": codeAuthProcessFailed} {
		a := peerManager(t, mode)
		expectCode(t, authRequest(a, "POST", "/admin/auth/start", "", "admin-key"), 400, code)
		if a.session != nil {
			t.Fatalf("%s left a session", mode)
		}
	}
	a := &authManager{cli: filepath.Join(t.TempDir(), "missing-claude"), key: "admin-key"}
	expectCode(t, authRequest(a, "POST", "/admin/auth/start", "", "admin-key"), 400, codeAuthProcessFailed)
}

func TestAuthProcessExitEndsSession(t *testing.T) {
	a := peerManager(t, "exit-after-link")
	okBody(t, authRequest(a, "POST", "/admin/auth/start", "", "admin-key"))
	select {
	case <-a.session.done:
	case <-time.After(10 * time.Second):
		t.Fatal("peer did not exit")
	}
	if got := okBody(t, authRequest(a, "GET", "/admin/auth/session", "", "admin-key")); got["session"] != nil || a.session != nil {
		t.Fatalf("dead login still pending %v", got)
	}
	expectCode(t, authRequest(a, "POST", "/admin/auth/complete", `{"code":"good#`+peerState+`"}`, "admin-key"), 400, codeSessionNotFound)
}

func TestAuthCallbackBoundToSessionAndState(t *testing.T) {
	input, reader := io.Pipe()
	defer input.Close()
	defer reader.Close()
	cancelled := false
	s := &authSession{id: "login-id", state: "expected-state", expires: time.Now().Add(time.Minute), input: reader, frames: make(chan Object, 1), cancel: func() { cancelled = true }}
	a := &authManager{key: "admin-key", session: s}
	for body, code := range map[string]string{
		`not json`:                  codeInvalidRequest,
		``:                          codeInvalidRequest,
		`{"session_id":"login-id"}`: codeInvalidRequest,
		`{"session_id":"other","code":"code#expected-state"}`: codeSessionNotFound,
		`{"session_id":"login-id","code":"code#other"}`:       codeInvalidCode,
		`{"session_id":"login-id","code":"code"}`:             codeInvalidCode,
		`{"code":"#expected-state"}`:                          codeInvalidCode,
	} {
		expectCode(t, authRequest(a, "POST", "/admin/auth/complete", body, "admin-key"), 400, code)
	}
	if cancelled || a.session != s {
		t.Fatal("invalid callback cancelled valid session")
	}
	go func() {
		var frame Object
		_ = json.NewDecoder(input).Decode(&frame)
		request, _ := frame["request"].(map[string]any)
		if str(request, "authorizationCode") != "valid-code" || str(request, "state") != "expected-state" {
			t.Error("callback mismatch")
		}
		s.frames <- Object{"response": map[string]any{"request_id": frame["request_id"], "subtype": "success", "response": map[string]any{"account": "ignored"}}}
	}()
	w := authRequest(a, "POST", "/admin/auth/complete", `{"session_id":"login-id","code":" valid-code#expected-state "}`, "admin-key")
	if w.Code != 200 || a.session != nil || !cancelled {
		t.Fatalf("callback failed: %d", w.Code)
	}
	expectCode(t, authRequest(a, "POST", "/admin/auth/complete", `{"session_id":"login-id","code":"valid-code#expected-state"}`, "admin-key"), 400, codeSessionNotFound)
}

func TestAuthProcessFailureDuringCallbackEndsSession(t *testing.T) {
	input, reader := io.Pipe()
	defer input.Close()
	defer reader.Close()
	go func() { _, _ = io.Copy(io.Discard, input) }()
	cancelled := false
	s := &authSession{id: "id", state: "st", expires: time.Now().Add(time.Minute), input: reader, frames: make(chan Object), cancel: func() { cancelled = true }}
	close(s.frames) // the CLI exited
	a := &authManager{key: "key", session: s}
	expectCode(t, authRequest(a, "POST", "/admin/auth/complete", `{"code":"x#st"}`, "key"), 400, codeAuthProcessFailed)
	if a.session != nil || !cancelled {
		t.Fatal("auth_process_failed kept the session")
	}
}

func TestAuthExpiredAndCancel(t *testing.T) {
	cancelled := false
	a := &authManager{key: "key", session: &authSession{id: "id", state: "y", expires: time.Now().Add(-time.Second), cancel: func() { cancelled = true }}}
	expectCode(t, authRequest(a, "POST", "/admin/auth/complete", `{"session_id":"id","code":"x#y"}`, "key"), 400, codeSessionNotFound)
	if !cancelled || a.session != nil {
		t.Fatal("expired session not cleaned up")
	}
	expectCode(t, authRequest(a, "POST", "/admin/auth/complete", `{"code":"x#y"}`, "key"), 400, codeSessionNotFound)

	// cancel is idempotent and the body is optional.
	for _, body := range []string{``, `{}`, `{"session_id":"id"}`} {
		if w := authRequest(a, "POST", "/admin/auth/cancel", body, "key"); okBody(t, w)["success"] != true {
			t.Fatalf("cancel without session: %s", w.Body.String())
		}
	}
	expectCode(t, authRequest(a, "POST", "/admin/auth/cancel", `{`, "key"), 400, codeInvalidRequest)

	cancelled = false
	a.session = &authSession{id: "id", expires: time.Now().Add(time.Minute), cancel: func() { cancelled = true }}
	if okBody(t, authRequest(a, "POST", "/admin/auth/cancel", `{"session_id":"other"}`, "key"))["success"] != true || cancelled || a.session == nil {
		t.Fatal("cancel of another session_id ended the pending login")
	}
	if okBody(t, authRequest(a, "POST", "/admin/auth/cancel", `{"session_id":"id"}`, "key"))["success"] != true || !cancelled || a.session != nil {
		t.Fatal("cancel failed")
	}
	cancelled = false
	a.session = &authSession{id: "id2", expires: time.Now().Add(time.Minute), cancel: func() { cancelled = true }}
	if okBody(t, authRequest(a, "POST", "/admin/auth/cancel", ``, "key"))["success"] != true || !cancelled || a.session != nil {
		t.Fatal("cancel without session_id failed")
	}
}

func TestStatusAndLogout(t *testing.T) {
	a := peerManager(t, "ok")
	got := okBody(t, authRequest(a, "GET", "/admin/status", "", "admin-key"))
	if got["healthy"] != true || got["logged_in"] != true || got["auth_method"] != "claude.ai" {
		t.Fatalf("status %v", got)
	}
	if okBody(t, authRequest(a, "POST", "/admin/auth/logout", "", "admin-key"))["success"] != true {
		t.Fatal("logout failed")
	}
	a = peerManager(t, "fail")
	expectCode(t, authRequest(a, "GET", "/admin/status", "", "admin-key"), 400, codeStatusUnavailable)
	expectCode(t, authRequest(a, "POST", "/admin/auth/logout", "", "admin-key"), 400, codeLogoutFailed)
}
