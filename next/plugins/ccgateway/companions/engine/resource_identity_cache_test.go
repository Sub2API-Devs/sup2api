package engine

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/stretchr/testify/require"
)

// identityTestGateway is a request-mode Worker whose resource identity was
// verified a moment ago, so the identity comes from the cache without a CLI.
func identityTestGateway(t *testing.T) (*Gateway, resources.Identity) {
	t.Helper()
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	config := filepath.Join(root, "config")
	require.NoError(t, os.MkdirAll(config, 0700))
	env := envWith(os.Environ(), map[string]string{
		"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"), "CCG_TEST_REQUEST_ENV_CAPTURE": filepath.Join(root, "env.json"),
		"HOME": root, "CLAUDE_CONFIG_DIR": config, "CLAUDE_SECURESTORAGE_CONFIG_DIR": config, "ANTHROPIC_API_KEY": "fixture-key",
		"CCG_RESOURCE_ISSUER_ID": "diagnostics-fixture", "CCG_RESOURCE_ISSUER_GENERATION": "1",
	}, "CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL")
	g := &Gateway{RequestMode: "build", Key: "fixture", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second,
		CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: []string{"request_direct", "request_build"}},
		Runner:  &Runner{CLI: exe, Work: root, Env: env}}
	broker, err := newResourceBroker(g, &authManager{}, root)
	require.NoError(t, err)
	t.Cleanup(func() { broker.lease.Close() })
	g.resources = broker
	auth, err := resourceAuthorizationCandidate(g.Runner.baseEnv())
	require.NoError(t, err)
	identity := resources.Identity{AuthType: "api_key", PrincipalID: "principal-fixture", Generation: "generation-fixture"}
	broker.verified.Store(&verifiedResourceIdentity{identity: identity, auth: auth, at: time.Now()})
	return g, identity
}

// A verified identity is reused only for the same credential and only for a
// while; any other credential verifies again.
func TestResourceIdentityCacheFollowsTheCredential(t *testing.T) {
	g, identity := identityTestGateway(t)
	broker, env := g.resources, g.Runner.baseEnv()
	cached := broker.cachedIdentity(env)
	require.NotNil(t, cached)
	require.Equal(t, identity, cached.identity)
	got, err := broker.identity(context.Background())
	require.NoError(t, err)
	require.Equal(t, identity, got, "the cached identity answers without a CLI")

	require.Nil(t, broker.cachedIdentity(envWith(env, map[string]string{"ANTHROPIC_API_KEY": "another-key"})), "another credential")
	require.Nil(t, broker.cachedIdentity(envWith(env, map[string]string{"CCG_RESOURCE_ISSUER_GENERATION": "2"})), "another issuer generation")
	stale := *broker.verified.Load()
	stale.at = time.Now().Add(-resourceIdentityTTL - time.Second)
	broker.verified.Store(&stale)
	require.Nil(t, broker.cachedIdentity(env), "expired")
}

// An API key without a managed issuer is told so at once, as the host's
// "no managed resource issuer" (the account is skipped for resources).
func TestResourceIdentityAPIKeyWithoutIssuer(t *testing.T) {
	g, _ := identityTestGateway(t)
	g.resources.verified.Store(nil)
	g.Runner.Env = envWith(g.Runner.Env, nil, "CCG_RESOURCE_ISSUER_ID", "CCG_RESOURCE_ISSUER_GENERATION")
	g.Runner.CLI = "must-not-execute"
	_, err := g.resources.identity(context.Background())
	require.ErrorIs(t, err, errManagedResourceIssuerMissing)

	request := httptest.NewRequest("GET", resources.IdentityPath, nil)
	request.Header.Set("x-api-key", "fixture")
	response := httptest.NewRecorder()
	g.resources.ServeHTTP(response, request)
	require.Equal(t, http.StatusServiceUnavailable, response.Code)
	require.Contains(t, response.Body.String(), resources.IdentityUnsupportedErrorType)
}

// A failure is remembered for the credential it happened with, so a request in
// the backoff window answers without starting another CLI process; another
// credential, or the same one after the window, verifies again.
func TestIdentityFailureBackoff(t *testing.T) {
	g, _ := identityTestGateway(t)
	broker := g.resources
	broker.verified.Store(nil)
	broker.g.Runner.CLI = "must-not-execute"
	env := broker.g.Runner.baseEnv()
	auth, err := resourceAuthorizationCandidate(env)
	require.NoError(t, err)
	sentinel := errors.New("fixture verification failure")
	broker.failed.Store(&identityFailure{fingerprint: auth.fingerprint, at: time.Now(), err: sentinel})

	_, err = broker.identity(context.Background())
	require.ErrorIs(t, err, sentinel, "the recorded failure answers without a CLI")

	// A different credential is not served from that failure.
	broker.g.Runner.Env = envWith(broker.g.Runner.Env, map[string]string{"ANTHROPIC_API_KEY": "another-key"})
	_, err = broker.identity(context.Background())
	require.NotErrorIs(t, err, sentinel)

	// The same credential after the window verifies again.
	broker.g.Runner.Env = env
	broker.failed.Store(&identityFailure{fingerprint: auth.fingerprint, at: time.Now().Add(-2 * identityFailureBackoff), err: sentinel})
	_, err = broker.identity(context.Background())
	require.NotErrorIs(t, err, sentinel)
}

// A stored login CC already cleared (both tokens gone after a refused refresh,
// account 50 on 2026-11-01) is answered at once as the account's verdict: 401
// authentication_error with a CLI source, so the core fails over and the
// auto-disable rules apply, instead of a 503 "no verified resource issuer".
func TestResourceIdentityClearedLogin(t *testing.T) {
	g, _ := identityTestGateway(t)
	g.resources.verified.Store(nil)
	g.Runner.Env = envWith(g.Runner.Env, nil, "ANTHROPIC_API_KEY", "CCG_RESOURCE_ISSUER_ID", "CCG_RESOURCE_ISSUER_GENERATION")
	g.Runner.CLI = "must-not-execute"
	config := environmentValue(g.Runner.Env, "CLAUDE_SECURESTORAGE_CONFIG_DIR")
	require.NoError(t, os.WriteFile(filepath.Join(config, ".credentials.json"),
		[]byte(`{"claudeAiOauth":{"accessToken":"","refreshToken":"","expiresAt":0,"refreshTokenExpiresAt":1795868588935,"subscriptionType":"max"}}`), 0600))
	require.True(t, storedLoginCleared(g.Runner.baseEnv()))

	request := httptest.NewRequest("GET", resources.IdentityPath, nil)
	request.Header.Set("x-api-key", "fixture")
	response := httptest.NewRecorder()
	g.resources.ServeHTTP(response, request)
	require.Equal(t, http.StatusUnauthorized, response.Code)
	require.Equal(t, "input", response.Header().Get("X-CCGateway-Error-Source"))
	require.JSONEq(t, `{"type":"error","error":{"type":"authentication_error","code":"not_logged_in","message":"Claude Code has cleared its stored login (no access or refresh token); reauthorization is required"}}`, response.Body.String())

	// A login that still holds a token, or no Claude login at all, is not this.
	require.NoError(t, os.WriteFile(filepath.Join(config, ".credentials.json"), []byte(`{"claudeAiOauth":{"accessToken":"","refreshToken":"r"}}`), 0600))
	require.False(t, storedLoginCleared(g.Runner.baseEnv()))
	require.NoError(t, os.Remove(filepath.Join(config, ".credentials.json")))
	require.False(t, storedLoginCleared(g.Runner.baseEnv()))
	require.False(t, storedLoginCleared(envWith(g.Runner.baseEnv(), map[string]string{"CLAUDE_CODE_OAUTH_TOKEN": "t"})))
}
