package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"
)

func TestRealCLIResourceStoredOAuthIdentity(t *testing.T) {
	var profiles, other atomic.Int32
	runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/oauth/profile" || r.Method != "GET" {
			other.Add(1)
			w.WriteHeader(400)
			return
		}
		profiles.Add(1)
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"account":{"uuid":"account-fixture"},"organization":{"uuid":"organization-fixture"}}`)
	})
	carrier := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if serveModControl(w, r) || serveOutboundRelay(w, r) {
			return
		}
		t.Error("unexpected internal route")
		w.WriteHeader(400)
	}))
	defer carrier.Close()
	runner.InternalBaseURL = carrier.URL
	config := filepath.Join(runner.Work, "config")
	if err := os.MkdirAll(config, 0700); err != nil {
		t.Fatal(err)
	}
	credentials, _ := json.Marshal(Object{"claudeAiOauth": Object{"accessToken": "dummy-stored-oauth", "refreshToken": "dummy-refresh", "expiresAt": time.Now().Add(time.Hour).UnixMilli(), "scopes": []string{"user:inference", "user:profile"}, "subscriptionType": "max", "rateLimitTier": "default_claude_max_20x"}})
	if err := os.WriteFile(filepath.Join(config, ".credentials.json"), credentials, 0600); err != nil {
		t.Fatal(err)
	}
	runner.Env = envWith(runner.Env, map[string]string{"ANTHROPIC_API_KEY": "", "CLAUDE_CODE_OAUTH_TOKEN": "", "CLAUDE_SECURESTORAGE_CONFIG_DIR": config})
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, runner.CLI, "auth", "status", "--json")
	cmd.Env = runner.baseEnv()
	raw, err := cmd.Output()
	if err != nil {
		t.Fatal(err)
	}
	var status struct {
		LoggedIn   bool
		AuthMethod string
	}
	if json.Unmarshal(raw, &status) != nil || !status.LoggedIn || status.AuthMethod != "claude.ai" {
		t.Fatalf("fixture is not stored OAuth: loggedIn=%v method=%s", status.LoggedIn, status.AuthMethod)
	}
	b, err := newResourceBroker(&Gateway{Runner: runner}, &authManager{}, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer b.lease.Close()
	_, err = b.identity(ctx)
	if err != nil {
		t.Fatalf("identity profiles=%d other=%d: %v", profiles.Load(), other.Load(), err)
	}
	if profiles.Load() != 1 || other.Load() != 0 {
		t.Fatalf("carrier calls profile%d other%d", profiles.Load(), other.Load())
	}
}
