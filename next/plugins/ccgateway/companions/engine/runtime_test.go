package engine

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestUsageUsesAccountEnvironment(t *testing.T) {
	usageEnv(t)
	account := t.TempDir()
	if err := os.WriteFile(filepath.Join(account, ".credentials.json"), []byte(`{"claudeAiOauth":{"accessToken":"account-only-token"}}`), 0600); err != nil {
		t.Fatal(err)
	}
	envLog := filepath.Join(t.TempDir(), "env.txt")
	runner, _ := managementTestRunner(t, map[string]string{
		"CCG_TEST_MGMT_ENV":  envLog,
		"CCG_TEST_MGMT_BODY": `{"five_hour":{"utilization":1}}`,
	})
	env := envWith(runner.Env, map[string]string{"CLAUDE_SECURESTORAGE_CONFIG_DIR": account})
	a := &authManager{key: "admin", cli: runner.CLI, work: runner.Work, env: env, managementHTTP: true}
	out := authRequest(a, "GET", "/admin/usage", "", "admin")
	if out.Code != 200 {
		t.Fatalf("account credential was not used: %d %s", out.Code, out.Body.String())
	}
	// The CLI process must see the account's credential storage, not the
	// Worker's own environment.
	raw, err := os.ReadFile(envLog)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw), "CLAUDE_SECURESTORAGE_CONFIG_DIR="+account) {
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
