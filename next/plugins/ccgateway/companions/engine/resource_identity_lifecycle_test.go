package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRealCLIResourceStoredOAuthIdentity(t *testing.T) {
	if !resourceManagedTestProcess(t) {
		return
	}
	var profiles, resourcesCalled atomic.Int32
	var access, organization atomic.Value
	access.Store("dummy-stored-oauth")
	organization.Store("organization-fixture")
	runner := resourceManagedTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "Bearer "+access.Load().(string), r.Header.Get("Authorization"))
		assert.Empty(t, r.Header.Get("X-Api-Key"))
		assert.Contains(t, r.Header.Get("Anthropic-Beta"), "oauth-2025-04-20")
		assert.Equal(t, http.MethodGet, r.Method)
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/oauth/profile":
			profiles.Add(1)
			_, err := fmt.Fprintf(w, `{"account":{"uuid":"account-fixture"},"organization":{"uuid":%q}}`, organization.Load().(string))
			assert.NoError(t, err)
		case "/v1/files":
			resourcesCalled.Add(1)
			_, err := io.WriteString(w, `{"data":[]}`)
			assert.NoError(t, err)
		default:
			t.Errorf("unexpected management request: %s", r.URL.Path)
			w.WriteHeader(http.StatusBadRequest)
		}
	})
	config := filepath.Join(runner.Work, "config")
	require.NoError(t, os.MkdirAll(config, 0700))
	writeCredentials := func(token string) {
		t.Helper()
		credentials, err := json.Marshal(Object{"claudeAiOauth": Object{"accessToken": token, "refreshToken": "dummy-refresh", "expiresAt": time.Now().Add(time.Hour).UnixMilli(), "scopes": []string{"user:inference", "user:profile"}, "subscriptionType": "max", "rateLimitTier": "default_claude_max_20x"}})
		require.NoError(t, err)
		require.NoError(t, os.WriteFile(filepath.Join(config, ".credentials.json"), credentials, 0600))
		access.Store(token)
	}
	writeCredentials("dummy-stored-oauth")
	runner.Env = envWith(runner.Env, map[string]string{"ANTHROPIC_API_KEY": "", "CLAUDE_CODE_OAUTH_TOKEN": "", "CLAUDE_SECURESTORAGE_CONFIG_DIR": config})
	broker := resourceManagedTestBroker(t, runner)
	ctx, cancel := context.WithTimeout(t.Context(), 45*time.Second)
	defer cancel()
	bound := withResourceAuthorization(ctx)
	id, err := broker.identity(bound)
	require.NoError(t, err)
	assert.Equal(t, "oauth", id.AuthType)
	require.NotEmpty(t, id.PrincipalID)
	require.NotEmpty(t, id.Generation)
	assert.Equal(t, int32(1), profiles.Load())
	assert.Zero(t, resourcesCalled.Load())
	operation := func() *resourceExchange {
		return &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files"}, dir: broker.dir, limit: broker.limit, budget: broker.budget}
	}
	response, err := runner.runResource(bound, operation())
	require.NoError(t, err)
	body, err := io.ReadAll(response.body)
	require.NoError(t, err)
	assert.Equal(t, `{"data":[]}`, string(body))
	require.NoError(t, response.body.Close())
	assertResourceSpoolReleased(t, broker.dir, broker.budget)

	// This simulates an external CLI credential rotation, not a claim that the
	// management broker can refresh OAuth itself. Old bindings must fail closed.
	writeCredentials("dummy-stored-oauth-rotated")
	_, err = runner.runResource(bound, operation())
	require.ErrorContains(t, err, "authorization changed")
	assert.Equal(t, int32(1), resourcesCalled.Load())
	bound = withResourceAuthorization(ctx)
	refreshed, err := broker.identity(bound)
	require.NoError(t, err)
	assert.Equal(t, id, refreshed, "same authenticated issuer lost persistent generation")
	assert.Equal(t, int32(2), profiles.Load())

	organization.Store("different-organization")
	changed, err := broker.identity(withResourceAuthorization(ctx))
	require.NoError(t, err)
	assert.NotEqual(t, id.PrincipalID, changed.PrincipalID)
	assert.NotEqual(t, id.Generation, changed.Generation)
	assert.Equal(t, int32(3), profiles.Load())
	assert.Equal(t, int32(1), resourcesCalled.Load())
	stored, err := os.ReadFile(broker.identityPath)
	require.NoError(t, err)
	for _, private := range []string{"dummy-stored-oauth", "dummy-refresh", "account-fixture", "different-organization"} {
		assert.NotContains(t, string(stored), private)
	}
	assertResourceSpoolReleased(t, broker.dir, broker.budget)
}
