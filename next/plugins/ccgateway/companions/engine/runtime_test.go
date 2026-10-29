package engine

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"slices"
	"testing"
	"time"
)

func TestUsageUsesAccountEnvironment(t *testing.T) {
	usageEnv(t)
	account := t.TempDir()
	if err := os.WriteFile(filepath.Join(account, ".credentials.json"), []byte(`{"claudeAiOauth":{"accessToken":"account-only-token"}}`), 0600); err != nil {
		t.Fatal(err)
	}
	base, log := usageAuth(t, map[string]string{"CCG_TEST_USAGE_STORE": `{"five_hour":{"utilization":1}}`})
	env := envWith(base.env, map[string]string{"CLAUDE_SECURESTORAGE_CONFIG_DIR": account})
	a := &authManager{key: "admin", cli: base.cli, work: base.work, env: env}
	out := authRequest(a, "GET", "/admin/usage", "", "admin")
	if out.Code != 200 {
		t.Fatalf("account credential was not used: %d %s", out.Code, out.Body.String())
	}
	// The CLI process must see the account's credential storage, not the
	// Worker's own environment.
	runs := usageRuns(t, log)
	if len(runs) != 1 || !slices.Contains(runs[0].Env, "CLAUDE_SECURESTORAGE_CONFIG_DIR="+account) {
		t.Fatalf("usage CLI did not inherit the account environment")
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
