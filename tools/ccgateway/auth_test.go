package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http/httptest"
	"os"
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
		// frames closes after the CLI has exited. Wait before TempDir cleanup
		// so its final writes cannot race removal of the private config folder.
		deadline := time.NewTimer(5 * time.Second)
		defer deadline.Stop()
		for {
			select {
			case _, ok := <-a.session.frames:
				if !ok {
					return
				}
			case <-deadline.C:
				t.Error("authorization CLI did not exit after cancellation")
				return
			}
		}
	}()
	if result["session_id"] == "" || result["url"] == "" {
		t.Fatal("missing authorization session")
	}
}

func authRequest(a *authManager, method, path, body, key string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	r.Header.Set("Authorization", "Bearer "+key)
	w := httptest.NewRecorder()
	a.ServeHTTP(w, r)
	return w
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
}
func TestAuthCallbackBoundToSessionAndState(t *testing.T) {
	input, reader := io.Pipe()
	defer input.Close()
	defer reader.Close()
	cancelled := false
	s := &authSession{id: "login-id", state: "expected-state", expires: time.Now().Add(time.Minute), input: reader, frames: make(chan Object, 1), cancel: func() { cancelled = true }}
	a := &authManager{key: "admin-key", session: s}
	for _, body := range []string{`{"session_id":"other","code":"code#expected-state"}`, `{"session_id":"login-id","code":"code#other"}`, `{"session_id":"login-id","code":"code"}`} {
		if got := authRequest(a, "POST", "/admin/auth/complete", body, "admin-key").Code; got != 400 {
			t.Fatal(got)
		}
	}
	if cancelled {
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
	w := authRequest(a, "POST", "/admin/auth/complete", `{"session_id":"login-id","code":"valid-code#expected-state"}`, "admin-key")
	if w.Code != 200 || a.session != nil || !cancelled {
		t.Fatalf("callback failed: %d", w.Code)
	}
	if strings.Contains(w.Body.String(), "account") {
		t.Fatal("leaked CLI account details")
	}
	if got := authRequest(a, "POST", "/admin/auth/complete", `{"session_id":"login-id","code":"valid-code#expected-state"}`, "admin-key").Code; got != 400 {
		t.Fatal("replay accepted")
	}
}
func TestAuthExpiredAndCancel(t *testing.T) {
	cancelled := false
	a := &authManager{key: "key", session: &authSession{id: "id", expires: time.Now().Add(-time.Second), cancel: func() { cancelled = true }}}
	if got := authRequest(a, "POST", "/admin/auth/complete", `{"session_id":"id","code":"x#y"}`, "key").Code; got != 400 {
		t.Fatal(got)
	}
	a.session.expires = time.Now().Add(time.Minute)
	if _, err := a.start(context.Background()); err == nil {
		t.Fatal("replaced active session")
	}
	if got := authRequest(a, "POST", "/admin/auth/cancel", `{"session_id":"id"}`, "key").Code; got != 200 || !cancelled || a.session != nil {
		t.Fatal("cancel failed")
	}
}
