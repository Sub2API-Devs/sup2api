package engine

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// Real CLI, isolated HOME and fake upstream only. Process-count proof remains
// the separate POSIX wrapper release gate.
func TestReviewRealCLIIdentityRejectsUnverifiedOAuth(t *testing.T) {
	for _, status := range []int{http.StatusUnauthorized, http.StatusOK} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			var calls atomic.Int32
			runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				if r.Method != "GET" || r.URL.Path != "/api/oauth/profile" || !strings.Contains(r.Header.Get("Anthropic-Beta"), "oauth-2025-04-20") {
					t.Error("unexpected request or missing native OAuth beta")
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(status)
				fmt.Fprint(w, `{"account":{"uuid":"fixture-private-account"},"token":"fixture-private-token"}`)
			})
			runner.Env = envWith(runner.Env, map[string]string{"ANTHROPIC_API_KEY": "", "CLAUDE_CODE_OAUTH_TOKEN": "fixture-private-oauth"})
			broker, err := newResourceBroker(&Gateway{Runner: runner}, &authManager{}, t.TempDir())
			if err != nil {
				t.Fatal(err)
			}
			defer broker.lease.Close()
			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			defer cancel()
			id, err := broker.identity(ctx)
			if err == nil || id.PrincipalID != "" || calls.Load() != 1 {
				t.Fatalf("invalid profile accepted or unexpected dispatch count: %d, %v", calls.Load(), err)
			}
			if strings.Contains(err.Error(), "fixture-private") {
				t.Fatal("private upstream content leaked")
			}
		})
	}
}

func TestReviewRealCLIAPIKeyIdentityNeverCallsProvider(t *testing.T) {
	runner := resourceTestRunner(t, func(http.ResponseWriter, *http.Request) { t.Error("API key identity called upstream") })
	runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_ID": "fixture-issuer", "CCG_RESOURCE_ISSUER_GENERATION": "fixture-epoch"})
	broker, err := newResourceBroker(&Gateway{Runner: runner}, &authManager{}, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer broker.lease.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	id, err := broker.identity(ctx)
	if err != nil || id.AuthType != "api_key" || id.PrincipalID == "" {
		t.Fatalf("managed native API key identity unavailable: %v", err)
	}
}
