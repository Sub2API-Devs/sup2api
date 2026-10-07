package engine

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestUsageUsesAccountEnvironment(t *testing.T) {
	usageEnv(t)
	account := t.TempDir()
	if err := os.WriteFile(filepath.Join(account, ".credentials.json"), []byte(`{"claudeAiOauth":{"accessToken":"account-only-token"}}`), 0600); err != nil {
		t.Fatal(err)
	}
	seen := false
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = r.Header.Get("Authorization") == "Bearer account-only-token"
		_, _ = w.Write([]byte(`{"five_hour":{"utilization":1}}`))
	}))
	defer up.Close()
	a := &authManager{key: "admin", usageURL: up.URL, env: []string{"CLAUDE_SECURESTORAGE_CONFIG_DIR=" + account}}
	out := authRequest(a, "GET", "/admin/usage", "", "admin")
	if out.Code != 200 || !seen {
		t.Fatalf("account credential was not used: %d", out.Code)
	}
}

func TestRuntimeCloseCancelsActiveRequest(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	close(done)
	entered := make(chan struct{})
	canceled := make(chan struct{})
	runtime := &Runtime{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		close(entered)
		<-r.Context().Done()
		close(canceled)
	}), admin: &authManager{}, work: t.TempDir(), life: ctx, stop: cancel, done: done}
	go runtime.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/", nil))
	select {
	case <-entered:
	case <-time.After(time.Second):
		t.Fatal("request did not start")
	}
	if err := runtime.Close(); err != nil {
		t.Fatal(err)
	}
	select {
	case <-canceled:
	default:
		t.Fatal("work removed before request canceled")
	}
	out := httptest.NewRecorder()
	runtime.ServeHTTP(out, httptest.NewRequest("GET", "/", nil))
	if out.Code != 503 {
		t.Fatal(out.Code)
	}
}
