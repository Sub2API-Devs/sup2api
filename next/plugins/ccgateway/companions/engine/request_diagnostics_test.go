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

	diag "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/diagnostics"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/stretchr/testify/require"
)

// diagnosticsTestGateway is a request-mode Worker whose resource identity was
// verified a moment ago, so the identity comes from the cache without a CLI.
func diagnosticsTestGateway(t *testing.T) (*Gateway, resources.Identity) {
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

// The request command answers the host's diagnostics tracking with the
// account's identity and the ready header, so the host can record the
// response's message ID; it refuses a grant or identity that does not match,
// and leaves an untracked request alone.
func TestRequestCommandDiagnosticsGrant(t *testing.T) {
	hash, err := diag.Hash("msg_previous")
	require.NoError(t, err)
	for _, tc := range []struct {
		name, diagnostics, grant, principal string
		track                               bool
		want                                int
	}{
		{name: "untracked", diagnostics: `{"previous_message_id":"msg_previous"}`, want: 200},
		{name: "first turn", diagnostics: `{"previous_message_id":null}`, track: true, want: 200},
		{name: "granted", diagnostics: `{"previous_message_id":"msg_previous"}`, grant: hash, track: true, want: 200},
		{name: "grant for another message", diagnostics: `{"previous_message_id":"msg_other"}`, grant: hash, track: true, want: 400},
		{name: "grant without previous", diagnostics: `{"previous_message_id":null}`, grant: hash, track: true, want: 400},
		{name: "tracking without diagnostics", track: true, want: 400},
		{name: "another identity", diagnostics: `{"previous_message_id":null}`, principal: "another-principal", track: true, want: 409},
	} {
		t.Run(tc.name, func(t *testing.T) {
			g, identity := diagnosticsTestGateway(t)
			body := `{"model":"fixture","max_tokens":16,"messages":[{"role":"user","content":"hello"}]`
			if tc.diagnostics != "" {
				body += `,"diagnostics":` + tc.diagnostics
			}
			request := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(body+"}"))
			request.Header.Set("x-api-key", "fixture")
			if tc.track {
				request.Header.Set(diag.TrackingHeader, "1")
				principal := identity.PrincipalID
				if tc.principal != "" {
					principal = tc.principal
				}
				request.Header.Set(resources.PrincipalHeader, principal)
				request.Header.Set(resources.GenerationHeader, identity.Generation)
			}
			if tc.grant != "" {
				request.Header.Set(diag.GrantHeader, tc.grant)
			}
			response := httptest.NewRecorder()
			g.ServeHTTP(response, request)
			require.Equal(t, tc.want, response.Code, response.Body.String())
			ready := response.Header().Get(diag.ReadyHeader)
			if tc.track && tc.want == 200 {
				require.Equal(t, "1", ready)
				require.Equal(t, identity.PrincipalID, response.Header().Get(resources.PrincipalHeader))
				require.Equal(t, identity.Generation, response.Header().Get(resources.GenerationHeader))
			} else {
				require.Empty(t, ready)
			}
		})
	}
}

// A verified identity is reused only for the same credential and only for a
// while; any other credential verifies again.
func TestResourceIdentityCacheFollowsTheCredential(t *testing.T) {
	g, identity := diagnosticsTestGateway(t)
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
	g, _ := diagnosticsTestGateway(t)
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
