package engine

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Real CLI selection, isolated credentials and a certificate-verified local
// first-party profile fixture. No public provider or model request is used.
func TestReviewRealCLIIdentityRejectsUnverifiedOAuth(t *testing.T) {
	if !resourceManagedTestProcess(t) {
		return
	}
	for _, status := range []int{http.StatusUnauthorized, http.StatusForbidden, http.StatusOK} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			var calls atomic.Int32
			runner := resourceManagedTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				assert.Equal(t, "GET", r.Method)
				assert.Equal(t, "/api/oauth/profile", r.URL.Path)
				assert.Equal(t, "Bearer fixture-private-oauth", r.Header.Get("Authorization"))
				assert.Contains(t, r.Header.Get("Anthropic-Beta"), "oauth-2025-04-20")
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(status)
				_, err := io.WriteString(w, `{"account":{"uuid":"fixture-private-account"},"token":"fixture-private-token"}`)
				assert.NoError(t, err)
			})
			runner.Env = envWith(runner.Env, map[string]string{"ANTHROPIC_API_KEY": "", "CLAUDE_CODE_OAUTH_TOKEN": "fixture-private-oauth"})
			broker := resourceManagedTestBroker(t, runner)
			ctx, cancel := context.WithTimeout(t.Context(), 20*time.Second)
			defer cancel()
			ctx = withResourceAuthorization(ctx)
			id, err := broker.identity(ctx)
			require.Error(t, err)
			assert.Empty(t, id.PrincipalID)
			assert.Empty(t, id.Generation)
			assert.Equal(t, int32(1), calls.Load())
			assert.NotContains(t, err.Error(), "fixture-private")
			_, statErr := os.Stat(broker.identityPath)
			require.True(t, os.IsNotExist(statErr), "unverified identity was persisted")
			_, err = runner.runResource(ctx, &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files"}, dir: broker.dir, limit: broker.limit, budget: broker.budget})
			require.ErrorContains(t, err, "verified identity authorization binding")
			assert.Equal(t, int32(1), calls.Load(), "failed identity was allowed to dispatch IO")
			assertResourceSpoolReleased(t, broker.dir, broker.budget)
		})
	}
}

func TestReviewRealCLIAPIKeyIdentityNeverCallsProvider(t *testing.T) {
	if !resourceManagedTestProcess(t) {
		return
	}
	var calls atomic.Int32
	runner := resourceManagedTestRunner(t, func(http.ResponseWriter, *http.Request) {
		calls.Add(1)
		t.Error("API key identity called upstream")
	})
	broker := resourceManagedTestBroker(t, runner)
	ctx, cancel := context.WithTimeout(t.Context(), 30*time.Second)
	defer cancel()
	bound := withResourceAuthorization(ctx)
	id, err := broker.identity(bound)
	require.NoError(t, err)
	assert.Equal(t, "api_key", id.AuthType)
	require.NotEmpty(t, id.PrincipalID)
	require.NotEmpty(t, id.Generation)
	repeated, err := broker.identity(withResourceAuthorization(ctx))
	require.NoError(t, err)
	assert.Equal(t, id, repeated)
	runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_GENERATION": "2"})
	_, err = runner.runResource(bound, &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files"}})
	require.ErrorContains(t, err, "authorization changed")
	changed, err := broker.identity(withResourceAuthorization(ctx))
	require.NoError(t, err)
	assert.Equal(t, id.PrincipalID, changed.PrincipalID)
	assert.NotEqual(t, id.Generation, changed.Generation)
	assert.Zero(t, calls.Load())
	assertResourceSpoolReleased(t, broker.dir, broker.budget)
}

func TestReviewRealCLIAPIKeyIdentityRequiresManagedIssuer(t *testing.T) {
	if !resourceManagedTestProcess(t) {
		return
	}
	for _, missing := range []string{"CCG_RESOURCE_ISSUER_ID", "CCG_RESOURCE_ISSUER_GENERATION"} {
		t.Run(missing, func(t *testing.T) {
			runner := resourceManagedTestRunner(t, func(http.ResponseWriter, *http.Request) {
				t.Error("unmanaged API key called provider")
			})
			runner.Env = envWith(runner.Env, map[string]string{missing: ""})
			broker := resourceManagedTestBroker(t, runner)
			ctx := withResourceAuthorization(t.Context())
			id, err := broker.identity(ctx)
			require.ErrorIs(t, err, errManagedResourceIssuerMissing)
			assert.Empty(t, id.PrincipalID)
			_, err = runner.runResource(ctx, &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files"}})
			require.ErrorContains(t, err, "verified identity authorization binding")
			assertResourceSpoolReleased(t, broker.dir, broker.budget)
		})
	}
}
