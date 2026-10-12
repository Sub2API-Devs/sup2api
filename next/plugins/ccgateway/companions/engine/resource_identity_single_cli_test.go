package engine

import (
	"context"
	"io"
	"net/http"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// API-key and env-OAuth identity use exactly one real auth-status invocation,
// not native model initialization. Stored OAuth has its own verified suite.
func TestRealCLIResourceIdentityUsesOneNativeProcess(t *testing.T) {
	if !resourceManagedTestProcess(t) {
		return
	}
	for _, method := range []string{"api_key", "oauth_token"} {
		t.Run(method, func(t *testing.T) {
			var calls atomic.Int32
			runner := resourceManagedTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				assert.Equal(t, "oauth_token", method, "API key identity must remain local")
				assert.Equal(t, http.MethodGet, r.Method)
				assert.Equal(t, "/api/oauth/profile", r.URL.Path)
				assert.Equal(t, "Bearer fixture-oauth", r.Header.Get("Authorization"))
				assert.Empty(t, r.Header.Get("X-Api-Key"))
				assert.Contains(t, r.Header.Get("Anthropic-Beta"), "oauth-2025-04-20")
				w.Header().Set("Content-Type", "application/json")
				_, _ = io.WriteString(w, `{"account":{"uuid":"fixture-account"},"organization":{"uuid":"fixture-org"}}`)
			})
			if method == "oauth_token" {
				runner.Env = envWith(runner.Env, map[string]string{"ANTHROPIC_API_KEY": "", "CLAUDE_CODE_OAUTH_TOKEN": "fixture-oauth"})
			}
			// Existing cross-platform test-binary proxy only records arguments and
			// delegates unchanged to CCG_REAL_CLI; it never manufactures auth output.
			resourceManagementTraceCLI(t, runner, []string{"status"})
			b := resourceManagedTestBroker(t, runner)
			ctx, cancel := context.WithTimeout(t.Context(), 20*time.Second)
			defer cancel()
			ctx = withResourceAuthorization(ctx)
			id, err := b.identity(ctx)
			require.NoError(t, err)
			require.NotEmpty(t, id.Generation)
			if method == "api_key" {
				assert.Equal(t, "api_key", id.AuthType)
				assert.Equal(t, digest([]string{"resource-api-issuer-v1", "managed-resource-fixture"}), id.PrincipalID)
				assert.Zero(t, calls.Load())
			} else {
				assert.Equal(t, "oauth", id.AuthType)
				assert.Equal(t, digest([]string{"resource-oauth-issuer-v1", "fixture-account", "fixture-org"}), id.PrincipalID)
				assert.EqualValues(t, 1, calls.Load())
			}
			binding, ok := ctx.Value(resourceAuthorizationKey{}).(*resourceAuthorizationBinding)
			require.True(t, ok)
			require.NotNil(t, binding.auth)
			assert.Equal(t, method, binding.auth.method)
			assertResourceSpoolReleased(t, b.dir, b.budget)
		})
	}
}
