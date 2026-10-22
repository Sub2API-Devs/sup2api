package engine

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	if os.Getenv("CCG_RESOURCE_CLI_RELAY") != "1" {
		return
	}
	kind := "unexpected"
	if len(os.Args) == 2 && os.Args[1] == "--version" {
		kind = "version"
	} else if len(os.Args) == 4 && os.Args[1] == "auth" && os.Args[2] == "status" && os.Args[3] == "--json" {
		kind = "status"
	} else if len(os.Args) > 1 && os.Args[1] == "-p" {
		kind = "initialize"
	}
	log, err := os.OpenFile(os.Getenv("CCG_RESOURCE_CLI_CALLS"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		os.Exit(2)
	}
	_, err = fmt.Fprintln(log, kind)
	closeErr := log.Close()
	if err != nil || closeErr != nil || kind == "unexpected" {
		os.Exit(2)
	}
	if version := os.Getenv("CCG_RESOURCE_CLI_VERSION_FIXTURE"); kind == "version" && version != "" {
		fmt.Fprintln(os.Stdout, version)
		os.Exit(0)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	cmd := exec.CommandContext(ctx, os.Getenv("CCG_REAL_CLI"), os.Args[1:]...)
	cmd.Env = envWith(os.Environ(), nil, "CCG_RESOURCE_CLI_RELAY")
	cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, io.Discard
	cmd.WaitDelay = time.Second
	err = cmd.Run()
	cancel()
	if err != nil {
		os.Exit(2)
	}
	os.Exit(0)
}

func resourceManagementTraceCLI(t *testing.T, runner *Runner, expected []string) {
	t.Helper()
	executable, err := os.Executable()
	require.NoError(t, err)
	calls := filepath.Join(t.TempDir(), "cli-calls")
	runner.Env = envWith(runner.Env, map[string]string{"CCG_REAL_CLI": runner.CLI, "CCG_RESOURCE_CLI_RELAY": "1", "CCG_RESOURCE_CLI_CALLS": calls})
	runner.CLI = executable
	t.Cleanup(func() {
		raw, err := os.ReadFile(calls)
		if len(expected) == 0 {
			assert.True(t, os.IsNotExist(err), "unsupported cached version must not start a CLI subprocess")
			return
		}
		require.NoError(t, err)
		assert.Equal(t, expected, strings.Fields(string(raw)))
	})
}

func TestResourceManagementInitializationVersionBoundary(t *testing.T) {
	for _, version := range []string{"2.1.292", "2.1.296", "2.1.304", "2.1.302", "2.1.291", "2.1.293", "2.1.297", "2.1.303", "2.1.305", "3.0.0", "2.1.292-beta", "2.1.304 unexpected"} {
		t.Run(version, func(t *testing.T) {
			runner := &Runner{CLI: "must-not-execute", Version: version}
			err := runner.verifyResourceInitializationVersion(context.Background(), nil)
			if slices.Contains(verifiedResourceInitializationVersions, version) {
				require.NoError(t, err)
			} else {
				require.ErrorContains(t, err, "requires verified Claude Code")
			}
		})
	}
}

func TestResourceIdentityPersistsAndRotates(t *testing.T) {
	cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 1<<20)
	require.NoError(t, err)
	b := &resourceBroker{g: &Gateway{Cache: cache}, identityPath: filepath.Join(t.TempDir(), "identity-v1.json")}
	first, err := b.persistIdentity(resources.Identity{PrincipalID: "issuer"}, "")
	require.NoError(t, err)
	second, err := b.persistIdentity(resources.Identity{PrincipalID: "issuer"}, "")
	if err != nil || first.Generation != second.Generation {
		t.Fatal("same issuer resource epoch changed after reauthorization", err)
	}
	id, err := b.persistIdentity(resources.Identity{PrincipalID: "different-issuer"}, "")
	if err != nil || id.Generation == first.Generation {
		t.Fatal("changed issuer epoch not rotated", err)
	}
	h := http.Header{}
	h.Set(resources.PrincipalHeader, "issuer")
	h.Set(resources.GenerationHeader, first.Generation)
	if verifyExpectedResourceIdentity(h, id) == nil {
		t.Fatal("old epoch accepted")
	}
}

func TestResourceIdentitySurvivesCacheReplacementAndRestart(t *testing.T) {
	root := t.TempDir()
	broker := func(cacheDir string) *resourceBroker {
		cache, err := newCache(cacheDir, 1<<20)
		if err != nil {
			t.Fatal(err)
		}
		b, err := newResourceBroker(&Gateway{Runner: &Runner{Env: []string{"CCG_RESOURCE_BODY_LIMIT_BYTES=1024"}}, Cache: cache}, &authManager{}, root)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _ = b.lease.Close() })
		return b
	}
	first := broker(filepath.Join(t.TempDir(), "cache"))
	want, err := first.persistIdentity(resources.Identity{PrincipalID: "stable-issuer"}, "")
	require.NoError(t, err)
	first.lease.Close()
	restarted := broker(filepath.Join(t.TempDir(), "replacement-cache"))
	got, err := restarted.persistIdentity(resources.Identity{PrincipalID: "stable-issuer"}, "")
	if err != nil || got.Generation != want.Generation {
		t.Fatal("resource ownership lost when conversation cache changed", err)
	}
	rotated, err := restarted.persistIdentity(resources.Identity{PrincipalID: "stable-issuer"}, "managed-new-epoch")
	if err != nil || rotated.Generation == got.Generation {
		t.Fatal("explicit managed epoch change retained old resource access", err)
	}
}

func TestRealCLIResourceHTTPIdentityAndProviderErrors(t *testing.T) {
	if !resourceManagedTestProcess(t) {
		return
	}
	for _, oauth := range []bool{false, true} {
		t.Run(fmt.Sprint(oauth), func(t *testing.T) {
			var resourcesCalled atomic.Int32
			runner := resourceManagedTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				if r.URL.Path == "/api/oauth/profile" {
					assert.True(t, oauth)
					assert.Equal(t, "Bearer dummy-resource-oauth", r.Header.Get("Authorization"))
					fmt.Fprint(w, `{"account":{"uuid":"account-fixture"},"organization":{"uuid":"organization-fixture"}}`)
					return
				}
				assert.Equal(t, "/v1/files/file_fixture", r.URL.Path)
				assert.Equal(t, "DELETE", r.Method)
				if oauth {
					assert.Equal(t, "oauth-2025-04-20", r.Header.Get("Anthropic-Beta"))
				}
				resourcesCalled.Add(1)
				w.Header().Set("Retry-After", "3")
				w.WriteHeader(429)
				fmt.Fprint(w, `{"type":"error","error":{"type":"rate_limit_error","message":"resource fixture"}}`)
			})
			runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_ID": "fixture-workspace", "CCG_RESOURCE_ISSUER_GENERATION": "fixture-epoch"})
			if oauth {
				runner.Env = envWith(runner.Env, map[string]string{"ANTHROPIC_API_KEY": "", "CLAUDE_CODE_OAUTH_TOKEN": "dummy-resource-oauth"})
			}
			cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 1<<20)
			require.NoError(t, err)
			g := &Gateway{Runner: runner, Cache: cache, Key: "worker-fixture", Slots: make(chan struct{}, 2)}
			broker, err := newResourceBroker(g, &authManager{}, t.TempDir())
			require.NoError(t, err)
			t.Cleanup(func() { _ = broker.lease.Close() })
			call := func(method, path string, id resources.Identity) *httptest.ResponseRecorder {
				r := httptest.NewRequest(method, path, nil)
				r.Header.Set("X-Api-Key", "worker-fixture")
				r.Header.Set(resources.PrincipalHeader, id.PrincipalID)
				r.Header.Set(resources.GenerationHeader, id.Generation)
				w := httptest.NewRecorder()
				broker.ServeHTTP(w, r)
				return w
			}
			first := call("GET", resources.IdentityPath, resources.Identity{})
			require.Equal(t, http.StatusOK, first.Code, first.Body.String())
			var id resources.Identity
			require.NoError(t, json.Unmarshal(first.Body.Bytes(), &id))
			require.NotEmpty(t, id.PrincipalID)
			require.NotEmpty(t, id.Generation)
			assert.NotContains(t, first.Body.String(), "account-fixture")
			assert.NotContains(t, first.Body.String(), "dummy-resource")
			bad := id
			bad.Generation = "old"
			response := call("DELETE", resourcePrefix+"/v1/files/file_fixture", bad)
			require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
			assert.Zero(t, resourcesCalled.Load())
			response = call("DELETE", resourcePrefix+"/v1/files/file_fixture", id)
			assert.Equal(t, http.StatusTooManyRequests, response.Code)
			assert.Equal(t, "3", response.Header().Get("Retry-After"))
			assert.Contains(t, response.Body.String(), "resource fixture")
			assert.EqualValues(t, 1, resourcesCalled.Load())
			assert.Empty(t, cache.entries)
			files, err := os.ReadDir(broker.dir)
			require.NoError(t, err)
			assert.Empty(t, files)
		})
	}
}

func TestRealCLIResourceCancellationReleasesSpool(t *testing.T) {
	if !resourceManagedTestProcess(t) {
		return
	}
	entered := make(chan struct{})
	runner := resourceManagedTestRunner(t, func(w http.ResponseWriter, r *http.Request) { close(entered); <-r.Context().Done() })
	op := &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files"}, dir: t.TempDir(), limit: 1024, budget: &resourceSpoolBudget{limit: 2048}}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ctx = withResourceAuthorization(ctx)
	broker := resourceManagedTestBroker(t, runner)
	_, err := broker.identity(ctx)
	require.NoError(t, err)
	done := make(chan error, 1)
	go func() { _, err := runner.runResource(ctx, op); done <- err }()
	select {
	case <-entered:
		cancel()
	case <-time.After(10 * time.Second):
		cancel()
		require.FailNow(t, "carrier did not dispatch")
	}
	select {
	case err := <-done:
		require.Error(t, err)
	case <-time.After(5 * time.Second):
		require.FailNow(t, "resource cancellation blocked")
	}
	assert.Zero(t, op.budget.used)
}

func resourceManagementFixtureEnv(t *testing.T) []string {
	t.Helper()
	root := t.TempDir()
	return []string{"HOME=" + root, "USERPROFILE=" + root, "CLAUDE_CONFIG_DIR=" + root, "CLAUDE_SECURESTORAGE_CONFIG_DIR=" + root}
}

func TestResourceManagementCandidateFailClosed(t *testing.T) {
	for _, tc := range []struct {
		name, credential, settings string
		extra                      []string
		want                       string
	}{
		{name: "missing"},
		{name: "api", extra: []string{"ANTHROPIC_API_KEY=fixture-secret"}, want: "api_key"},
		{name: "env-oauth", extra: []string{"CLAUDE_CODE_OAUTH_TOKEN=fixture-secret"}, want: "oauth_token"},
		{name: "stored", credential: fmt.Sprintf(`{"claudeAiOauth":{"accessToken":"fixture-secret","expiresAt":%d}}`, time.Now().Add(time.Hour).UnixMilli()), want: "claude.ai"},
		{name: "expired", credential: `{"claudeAiOauth":{"accessToken":"fixture-secret","refreshToken":"never-refresh","expiresAt":1}}`},
		{name: "expiry-unknown", credential: `{"claudeAiOauth":{"accessToken":"fixture-secret"}}`},
		{name: "two-env", extra: []string{"ANTHROPIC_API_KEY=fixture-secret", "CLAUDE_CODE_OAUTH_TOKEN=other-secret"}},
		{name: "env-and-store", credential: `{"claudeAiOauth":{"accessToken":"other-secret","expiresAt":1}}`, extra: []string{"ANTHROPIC_API_KEY=fixture-secret"}},
		{name: "helper", settings: `{"apiKeyHelper":"must-not-execute"}`, extra: []string{"ANTHROPIC_API_KEY=fixture-secret"}},
		{name: "settings-env", settings: `{"env":{"ANTHROPIC_API_KEY":"other-secret"}}`, extra: []string{"ANTHROPIC_API_KEY=fixture-secret"}},
		{name: "opaque-helper", settings: `{"apiKeyHelper":{"command":"must-not-execute"}}`, extra: []string{"ANTHROPIC_API_KEY=fixture-secret"}},
		{name: "fd", extra: []string{"ANTHROPIC_API_KEY=fixture-secret", "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR=9"}},
		{name: "bearer", extra: []string{"ANTHROPIC_AUTH_TOKEN=fixture-secret"}},
		{name: "managed-key", settings: `{"primaryApiKey":"fixture-secret"}`},
		{name: "duplicate", extra: []string{"ANTHROPIC_API_KEY=fixture-secret", "anthropic_api_key=other-secret"}},
		{name: "backend", extra: []string{"ANTHROPIC_API_KEY=fixture-secret", "CLAUDE_CODE_USE_BEDROCK=1"}},
		{name: "custom-headers", extra: []string{"ANTHROPIC_API_KEY=fixture-secret", "ANTHROPIC_CUSTOM_HEADERS=Authorization: hidden-secret"}},
		{name: "invalid-token", extra: []string{"ANTHROPIC_API_KEY=fixture-secret\r\nX: bad"}},
		{name: "oauth-custom-origin", extra: []string{"CLAUDE_CODE_OAUTH_TOKEN=fixture-secret", "ANTHROPIC_BASE_URL=https://example.invalid"}},
		{name: "oauth-http-origin", extra: []string{"CLAUDE_CODE_OAUTH_TOKEN=fixture-secret", "ANTHROPIC_BASE_URL=http://api.anthropic.com"}},
		{name: "oauth-origin-path", extra: []string{"CLAUDE_CODE_OAUTH_TOKEN=fixture-secret", "ANTHROPIC_BASE_URL=https://api.anthropic.com/other"}},
		{name: "oauth-origin-port", extra: []string{"CLAUDE_CODE_OAUTH_TOKEN=fixture-secret", "ANTHROPIC_BASE_URL=https://api.anthropic.com:444"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			env := append(resourceManagementFixtureEnv(t), tc.extra...)
			for path, content := range map[string]string{credentialsPathIn(env): tc.credential, filepath.Join(snapshotConfigDirectory(env), "settings.json"): tc.settings} {
				if content != "" {
					require.NoError(t, os.WriteFile(path, []byte(content), 0600))
				}
			}
			auth, err := resourceAuthorizationCandidate(env)
			if runtime.GOOS == "darwin" && tc.want == "claude.ai" {
				tc.want = "" // file presence does not establish Keychain selection
			}
			if tc.want == "" {
				require.Error(t, err)
				assert.Nil(t, auth)
				assert.NotContains(t, err.Error(), "secret")
				assert.NotContains(t, err.Error(), "never-refresh")
				if tc.name != "expired" {
					_, err = resourceAuthorizationSource(env)
					require.Error(t, err, "preflight must reject unsupported sources before running CLI")
				}
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.want, auth.method)
			}
		})
	}
}

func TestResourceManagementOAuthRefreshBoundary(t *testing.T) {
	if runtime.GOOS == "darwin" {
		t.Skip("file-backed selection is not established for Keychain storage")
	}
	env := resourceManagementFixtureEnv(t)
	write := func(access, refresh string, expiry int64) {
		raw, err := json.Marshal(Object{"claudeAiOauth": Object{"accessToken": access, "refreshToken": refresh, "expiresAt": expiry}})
		require.NoError(t, err)
		require.NoError(t, os.WriteFile(credentialsPathIn(env), raw, 0600))
	}
	write("expired-access", "old-refresh", 1)
	before, err := resourceAuthorizationSource(env)
	require.NoError(t, err)
	_, err = resourceAuthorizationCandidate(env)
	require.ErrorContains(t, err, "not ready")
	status, err := json.Marshal(Object{"loggedIn": true, "authMethod": "claude.ai", "apiProvider": "firstParty", "configDirectory": before.config})
	require.NoError(t, err)
	require.NoError(t, validateResourceCLISelection(status, before))
	_, err = resourceAuthorizationCandidate(env)
	require.Error(t, err, "loggedIn must not establish token readiness")
	for _, expiry := range []int64{1, time.Now().Add(5 * time.Second).UnixMilli()} {
		write("new-access", "new-refresh", expiry)
		_, err := resourceAuthorizationCandidate(env)
		require.Error(t, err, "rotation without a ready expiry must fail")
	}
	expiry := time.Now().Add(time.Hour).UnixMilli()
	write("new-access", "new-refresh", expiry)
	after, err := resourceAuthorizationCandidate(env)
	require.NoError(t, err)
	require.NoError(t, validateResourceAuthorizationTransition(before, after))
	assert.Equal(t, before.sourceIdentity, after.sourceIdentity)
	assert.NotEqual(t, before.fingerprint, after.fingerprint)
	assert.Equal(t, "Bearer new-access", after.header.Get("Authorization"))
	require.NoError(t, os.WriteFile(snapshotGlobalConfigPath(env), []byte(`{"oauthAccount":{"accountUuid":"cached-not-authoritative","organizationUuid":"cached-organization"}}`), 0600))
	metadata, err := resourceAuthorizationCandidate(env)
	require.NoError(t, err)
	assert.Equal(t, after.fingerprint, metadata.fingerprint, "same-source account metadata is not a credential change")
	write("new-access", "another-refresh", expiry)
	rotated, err := resourceAuthorizationCandidate(env)
	require.NoError(t, err)
	require.NoError(t, validateResourceAuthorizationTransition(after, rotated))
	assert.NotEqual(t, after.fingerprint, rotated.fingerprint, "refresh-only rotation must invalidate an existing IO binding")
	ctx := withResourceAuthorization(context.Background())
	bindResourceAuthorization(ctx, after)
	runner := &Runner{CLI: "must-not-execute", Env: env}
	_, err = runner.runResource(ctx, &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files"}})
	require.ErrorContains(t, err, "authorization changed")
	for _, key := range []string{"CCG_RESOURCE_ISSUER_ID", "CCG_RESOURCE_ISSUER_GENERATION", "CLAUDE_CONFIG_DIR", "CLAUDE_SECURESTORAGE_CONFIG_DIR"} {
		t.Run(key, func(t *testing.T) {
			changed, err := resourceAuthorizationSource(envWith(env, map[string]string{key: t.TempDir()}))
			if err == nil {
				require.Error(t, validateResourceAuthorizationTransition(rotated, changed))
			}
		})
	}
	for _, field := range []string{"method", "source", "config", "sourceIdentity"} {
		t.Run(field, func(t *testing.T) {
			changed := *rotated
			switch field {
			case "method":
				changed.method = "oauth_token"
			case "source":
				changed.source = "oauth_token_env"
			case "config":
				changed.config = t.TempDir()
			case "sourceIdentity":
				changed.sourceIdentity = "different"
			}
			require.Error(t, validateResourceAuthorizationTransition(rotated, &changed))
		})
	}
	for _, key := range []string{"ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"} {
		t.Run(key, func(t *testing.T) {
			env := append(resourceManagementFixtureEnv(t), key+"=old-secret")
			before, err := resourceAuthorizationCandidate(env)
			require.NoError(t, err)
			after, err := resourceAuthorizationCandidate(envWith(env, map[string]string{key: "new-secret"}))
			require.NoError(t, err)
			require.Error(t, validateResourceAuthorizationTransition(before, after))
		})
	}
}

func TestResourceManagementRefreshReadiness(t *testing.T) {
	if runtime.GOOS == "darwin" {
		t.Skip("file-backed selection is not established for Keychain storage")
	}
	for _, remaining := range []time.Duration{29 * time.Second, 45 * time.Second, 90 * time.Second, 5 * time.Minute, 8 * time.Minute, 10 * time.Minute} {
		t.Run(remaining.String(), func(t *testing.T) {
			env := resourceManagementFixtureEnv(t)
			raw, err := json.Marshal(Object{"claudeAiOauth": Object{"accessToken": "fixture-access", "refreshToken": "fixture-refresh", "expiresAt": time.Now().Add(remaining).UnixMilli()}})
			require.NoError(t, err)
			require.NoError(t, os.WriteFile(credentialsPathIn(env), raw, 0600))
			_, err = resourceAuthorizationCandidate(env)
			if remaining < 30*time.Second {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
	for _, name := range []string{".oauth_refresh.lock", ".oauth_refresh.lock.owner"} {
		t.Run(name, func(t *testing.T) {
			env := resourceManagementFixtureEnv(t)
			raw, err := json.Marshal(Object{"claudeAiOauth": Object{"accessToken": "fixture-access", "refreshToken": "fixture-refresh", "expiresAt": time.Now().Add(time.Hour).UnixMilli()}})
			require.NoError(t, err)
			require.NoError(t, os.WriteFile(credentialsPathIn(env), raw, 0600))
			auth, err := resourceAuthorizationCandidate(env)
			require.NoError(t, err)
			ctx := withResourceAuthorization(context.Background())
			bindResourceAuthorization(ctx, auth)
			path := filepath.Join(auth.config, name)
			if name == ".oauth_refresh.lock" {
				require.NoError(t, os.Mkdir(path, 0700))
			} else {
				require.NoError(t, os.WriteFile(path, []byte("fixture-owner"), 0600))
			}
			pending, err := resourceOAuthRefreshPending(auth)
			require.NoError(t, err)
			require.True(t, pending)
			_, err = resourceAuthorizationCandidate(env)
			require.ErrorContains(t, err, "not ready")
			runner := &Runner{CLI: "must-not-execute", Env: env}
			_, err = runner.runResource(ctx, &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files"}})
			require.ErrorContains(t, err, "not ready")
			_, err = os.Lstat(path)
			require.NoError(t, err, "management must not remove CLI-owned refresh markers")
		})
	}
}

func TestResourceManagementInitializationSelection(t *testing.T) {
	auth := &resourceAuthorization{config: t.TempDir(), source: "stored_oauth", method: "claude.ai"}
	valid := func() Object {
		return Object{"account": Object{"apiProvider": "firstParty"}, "user_output_styles_dir": filepath.Join(auth.config, "output-styles")}
	}
	require.NoError(t, validateResourceInitialization(valid(), auth))
	for _, key := range []string{"apiKeySource", "tokenSource"} {
		for _, value := range []any{nil, false, 1, Object{}, []string{}} {
			metadata := valid()
			metadata["account"].(Object)[key] = value
			require.Error(t, validateResourceInitialization(metadata, auth))
		}
	}
	for _, key := range []string{"missing-account", "provider", "key-source", "token-source", "directory"} {
		t.Run(key, func(t *testing.T) {
			metadata := valid()
			account := metadata["account"].(Object)
			switch key {
			case "missing-account":
				delete(metadata, "account")
			case "provider":
				account["apiProvider"] = "thirdParty"
			case "key-source":
				account["apiKeySource"] = "apiKeyHelper"
			case "token-source":
				account["tokenSource"] = "unverified"
			case "directory":
				metadata["user_output_styles_dir"] = filepath.Join(t.TempDir(), "output-styles")
			}
			require.Error(t, validateResourceInitialization(metadata, auth))
		})
	}
}

func TestResourceManagementSelectionIsNotPresence(t *testing.T) {
	env := append(resourceManagementFixtureEnv(t), "ANTHROPIC_API_KEY=fixture-secret")
	auth, err := resourceAuthorizationCandidate(env)
	require.NoError(t, err)
	for _, status := range []Object{
		{"loggedIn": true},
		{"loggedIn": true, "authMethod": "api_key", "configDirectory": "other-config"},
		{"loggedIn": true, "authMethod": "api_key_helper", "configDirectory": auth.config},
		{"loggedIn": false, "authMethod": "api_key", "configDirectory": auth.config},
		{"loggedIn": true, "authMethod": "api_key", "apiProvider": "firstParty", "apiKeySource": "helper", "configDirectory": auth.config},
		{"loggedIn": true, "authMethod": "api_key", "apiProvider": "thirdParty", "apiKeySource": "ANTHROPIC_API_KEY", "configDirectory": auth.config},
	} {
		raw, err := json.Marshal(status)
		require.NoError(t, err)
		require.Error(t, validateResourceCLISelection(raw, auth))
	}
	raw, err := json.Marshal(Object{"loggedIn": true, "authMethod": "api_key", "apiProvider": "firstParty", "apiKeySource": "ANTHROPIC_API_KEY", "configDirectory": auth.config})
	require.NoError(t, err)
	require.NoError(t, validateResourceCLISelection(raw, auth))
	output := &resourceStatusOutput{}
	_, err = io.Copy(output, strings.NewReader(strings.Repeat("x", (64<<10)+1)))
	require.Error(t, err)
}

func TestResourceManagementRealCLISelectionWithoutModel(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI; only isolated fake credentials and auth status are used")
	}
	for _, method := range []string{"api_key", "oauth_token", "claude.ai"} {
		t.Run(method, func(t *testing.T) {
			if runtime.GOOS == "darwin" && method == "claude.ai" {
				t.Skip("file-backed selection is not established for Keychain storage")
			}
			env := resourceManagementFixtureEnv(t)
			for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT"} {
				if value := os.Getenv(key); value != "" {
					env = append(env, key+"="+value)
				}
			}
			// Any attempted network request, including refresh, fails locally.
			env = append(env, "HTTPS_PROXY=http://127.0.0.1:1", "HTTP_PROXY=http://127.0.0.1:1", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1", "DISABLE_AUTOUPDATER=1")
			switch method {
			case "api_key":
				env = append(env, "ANTHROPIC_API_KEY=fixture-secret")
			case "oauth_token":
				env = append(env, "CLAUDE_CODE_OAUTH_TOKEN=fixture-secret")
			case "claude.ai":
				raw, _ := json.Marshal(Object{"claudeAiOauth": Object{"accessToken": "fixture-secret", "refreshToken": "never-refresh", "expiresAt": time.Now().Add(time.Hour).UnixMilli(), "scopes": []string{"user:inference", "user:profile"}, "subscriptionType": "max"}})
				if err := os.WriteFile(credentialsPathIn(env), raw, 0600); err != nil {
					t.Fatal(err)
				}
			}
			runner := &Runner{CLI: cli, Work: t.TempDir(), Env: env}
			expected := []string{"status"}
			if method == "claude.ai" {
				expected = []string{"version", "initialize"}
			}
			resourceManagementTraceCLI(t, runner, expected)
			env = runner.Env
			auth, err := runner.selectResourceAuthorization(context.Background(), env)
			require.NoError(t, err)
			assert.Equal(t, method, auth.method)
			ctx, cancel := context.WithCancel(context.Background())
			cancel()
			auth, err = runner.selectResourceAuthorization(ctx, env)
			require.Error(t, err)
			assert.Nil(t, auth)
		})
	}
}

func TestResourceManagementBindingRejectsIdentityDrift(t *testing.T) {
	env := append(resourceManagementFixtureEnv(t), "ANTHROPIC_API_KEY=fixture-secret")
	auth, err := resourceAuthorizationCandidate(env)
	require.NoError(t, err)
	runner := &Runner{CLI: "must-not-execute", Env: env}
	newOp := func() *resourceExchange {
		return &resourceExchange{route: resourceRoute{method: "DELETE", path: "/v1/files/file_fixture"}}
	}
	_, err = runner.runResource(context.Background(), newOp())
	require.Error(t, err)
	ctx := withResourceAuthorization(context.Background())
	bindResourceAuthorization(ctx, auth)
	runner.Env = envWith(env, map[string]string{"ANTHROPIC_API_KEY": "changed-secret"})
	_, err = runner.runResource(ctx, newOp())
	require.ErrorContains(t, err, "changed")
}

func resourceManagementTestClient(t *testing.T, server *httptest.Server, env []string) *http.Client {
	t.Helper()
	client, tr := managementHTTPClient(env)
	// Trust exactly the local fixture certificate; production never skips TLS.
	tr.TLSClientConfig.RootCAs = server.Client().Transport.(*http.Transport).TLSClientConfig.RootCAs
	t.Cleanup(tr.CloseIdleConnections)
	return client
}

func TestResourceManagementHTTPByteExact(t *testing.T) {
	for _, path := range []string{"/v1/files", "/v1/skills", "/v1/skills/skill_fixture/versions"} {
		t.Run(path, func(t *testing.T) {
			payload := []byte("--fixture\r\nContent-Disposition: form-data; name=\"file\"; filename=\"raw.bin\"\r\n\r\n\x00binary\xff\r\n--fixture--\r\n")
			download := []byte("\x1f\x8b\x00raw-encoded\xff")
			var calls atomic.Int32
			up := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				got, err := io.ReadAll(r.Body)
				assert.NoError(t, err)
				assert.Equal(t, path, r.URL.Path)
				assert.Equal(t, "POST", r.Method)
				assert.Equal(t, payload, got)
				assert.Equal(t, int64(len(payload)), r.ContentLength)
				assert.Equal(t, "fixture-secret", r.Header.Get("X-Api-Key"))
				assert.Empty(t, r.Header.Get("Authorization"))
				assert.Equal(t, "identity", r.Header.Get("Accept-Encoding"))
				assert.Equal(t, "fixture-version", r.Header.Get("Anthropic-Version"))
				assert.Equal(t, "fixture-beta", r.Header.Get("Anthropic-Beta"))
				w.Header().Set("Content-Type", "application/octet-stream")
				w.Header().Set("Content-Encoding", "gzip")
				w.Header().Set("Content-Disposition", "attachment; filename=raw.bin")
				w.Header().Set("Request-Id", "fixture-request")
				w.Header().Set("Set-Cookie", "secret-cookie")
				w.Header().Set("Authorization", "secret-header")
				w.Write(download)
			}))
			defer up.Close()
			env := append(resourceManagementFixtureEnv(t), "ANTHROPIC_API_KEY=fixture-secret", "ANTHROPIC_BASE_URL="+up.URL)
			auth, err := resourceAuthorizationCandidate(env)
			require.NoError(t, err)
			op := &resourceExchange{route: resourceRoute{method: "POST", path: path, contentType: "multipart/form-data; boundary=fixture", version: "fixture-version", betas: []string{"fixture-beta"}}, dir: t.TempDir(), limit: 4096, budget: &resourceSpoolBudget{limit: 8192}}
			op.input, err = spoolResource(context.Background(), op.dir, io.NopCloser(bytes.NewReader(payload)), int64(len(payload)), op.limit, op.budget)
			require.NoError(t, err)
			defer op.input.Close()
			response, err := resourceManagementHTTP(context.Background(), env, op, auth, resourceManagementTestClient(t, up, env))
			require.NoError(t, err)
			got, err := io.ReadAll(response.body)
			require.NoError(t, err)
			require.NoError(t, response.body.Close())
			require.NoError(t, op.input.Close())
			assert.Equal(t, download, got)
			assert.EqualValues(t, 1, calls.Load())
			assert.Equal(t, "gzip", response.header.Get("Content-Encoding"))
			assert.NotEmpty(t, response.header.Get("Content-Disposition"))
			assert.Empty(t, response.header.Get("Set-Cookie"))
			assert.Empty(t, response.header.Get("Authorization"))
			files, err := os.ReadDir(op.dir)
			require.NoError(t, err)
			assert.Zero(t, op.budget.used)
			assert.Empty(t, files)
		})
	}
}

func TestResourceManagementHTTPRejectsUnsafeRoutesTLSAndProxy(t *testing.T) {
	var calls atomic.Int32
	up := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { calls.Add(1); w.Write([]byte("ok")) }))
	defer up.Close()
	for _, tc := range []struct {
		name, path, base string
		proxy            []string
		trust            bool
	}{
		{name: "model", path: "/v1/messages", trust: true},
		{name: "traversal", path: "/v1/files/../messages", trust: true},
		{name: "encoded", path: "/v1/files/%2e%2e", trust: true},
		{name: "profile-without-probe", path: "/api/oauth/profile", trust: true},
		{name: "plaintext", base: "http://127.0.0.1:1", trust: true},
		{name: "base-path", base: up.URL + "/base/../", trust: true},
		{name: "userinfo", base: "https://private-secret@localhost", trust: true},
		{name: "untrusted-tls"},
		{name: "malformed-proxy", proxy: []string{"HTTPS_PROXY=://private-secret"}, trust: true},
		{name: "malformed-http-proxy", proxy: []string{"HTTP_PROXY=://private-secret"}, trust: true},
		{name: "proxy-scheme", proxy: []string{"HTTPS_PROXY=ftp://private-secret:password@localhost"}, trust: true},
		{name: "proxy-port", proxy: []string{"HTTPS_PROXY=http://localhost:99999"}, trust: true},
		{name: "proxy-conflict", proxy: []string{"HTTPS_PROXY=http://localhost:1", "https_proxy=http://localhost:2"}, trust: true},
		{name: "all-proxy", proxy: []string{"ALL_PROXY=http://localhost:1"}, trust: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			base, path := tc.base, tc.path
			if base == "" {
				base = up.URL
			}
			if path == "" {
				path = "/v1/files"
			}
			env := append([]string{"ANTHROPIC_BASE_URL=" + base}, tc.proxy...)
			client, tr := managementHTTPClient(env)
			defer tr.CloseIdleConnections()
			if tc.trust {
				tr.TLSClientConfig.RootCAs = up.Client().Transport.(*http.Transport).TLSClientConfig.RootCAs
			}
			op := &resourceExchange{route: resourceRoute{method: "GET", path: path}, dir: t.TempDir(), limit: 1024, budget: &resourceSpoolBudget{limit: 2048}}
			auth := &resourceAuthorization{method: "api_key", header: http.Header{"X-Api-Key": {"fixture-secret"}}}
			_, err := resourceManagementHTTP(context.Background(), env, op, auth, client)
			require.Error(t, err)
			assert.NotContains(t, err.Error(), "private-secret")
			assert.Zero(t, calls.Load())
			assert.Zero(t, op.budget.used)
		})
	}
}

func TestResourceManagementHTTPNoRedirectAndProviderStatus(t *testing.T) {
	for _, status := range []int{307, 429, 401} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			var calls atomic.Int32
			up := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				w.Header().Set("Location", "/v1/messages")
				w.Header().Set("Retry-After", "3")
				w.WriteHeader(status)
				w.Write([]byte("provider-body"))
			}))
			defer up.Close()
			env := []string{"ANTHROPIC_BASE_URL=" + up.URL}
			op := &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files"}, dir: t.TempDir(), limit: 1024, budget: &resourceSpoolBudget{limit: 2048}}
			auth := &resourceAuthorization{method: "api_key", header: http.Header{"X-Api-Key": {"fixture-secret"}}}
			response, err := resourceManagementHTTP(context.Background(), env, op, auth, resourceManagementTestClient(t, up, env))
			require.NoError(t, err)
			defer response.body.Close()
			body, err := io.ReadAll(response.body)
			require.NoError(t, err)
			assert.EqualValues(t, 1, calls.Load())
			assert.Equal(t, status, response.status)
			assert.Equal(t, "provider-body", string(body))
			assert.Equal(t, "3", response.header.Get("Retry-After"))
			assert.Empty(t, response.header.Get("Location"))
		})
	}
}

func TestResourceManagementHTTPSpoolLimitsAndCancellation(t *testing.T) {
	for _, mode := range []string{"size", "budget", "cancel"} {
		t.Run(mode, func(t *testing.T) {
			entered := make(chan struct{})
			up := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(200)
				w.(http.Flusher).Flush()
				close(entered)
				if mode == "cancel" {
					<-r.Context().Done()
					return
				}
				w.Write(bytes.Repeat([]byte("x"), 2048))
			}))
			defer up.Close()
			env := []string{"ANTHROPIC_BASE_URL=" + up.URL}
			op := &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files/file_fixture/content"}, dir: t.TempDir(), limit: 1024, budget: &resourceSpoolBudget{limit: 4096}}
			if mode == "budget" {
				op.limit, op.budget.limit = 4096, 1024
			}
			auth := &resourceAuthorization{method: "api_key", header: http.Header{"X-Api-Key": {"fixture-secret"}}}
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if mode == "cancel" {
				go func() { <-entered; cancel() }()
			}
			_, err := resourceManagementHTTP(ctx, env, op, auth, resourceManagementTestClient(t, up, env))
			require.Error(t, err)
			files, err := os.ReadDir(op.dir)
			require.NoError(t, err)
			assert.Zero(t, op.budget.used)
			assert.Empty(t, files)
		})
	}
}

func TestResourceManagementLinuxOfflineNetNone(t *testing.T) {
	if os.Getenv("CCG_LINUX_RESOURCE_SSH") != "ovh" {
		t.Skip("set CCG_LINUX_RESOURCE_SSH=ovh to run the current-source test binary in a new netnone container")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()
	binary := filepath.Join(t.TempDir(), "engine.test")
	build := exec.CommandContext(ctx, "go", "test", "-c", "-o", binary, ".")
	build.Env = envWith(os.Environ(), map[string]string{"GOOS": "linux", "GOARCH": "amd64", "CGO_ENABLED": "0"})
	output, err := build.CombinedOutput()
	require.NoError(t, err, "%s", output)
	file, err := os.Open(binary)
	require.NoError(t, err)
	defer file.Close()
	info, err := file.Stat()
	require.NoError(t, err)
	var archive bytes.Buffer
	gz := gzip.NewWriter(&archive)
	tarball := tar.NewWriter(gz)
	require.NoError(t, tarball.WriteHeader(&tar.Header{Name: "engine.test", Mode: 0700, Size: info.Size()}))
	_, err = io.Copy(tarball, file)
	require.NoError(t, err)
	require.NoError(t, tarball.Close())
	require.NoError(t, gz.Close())
	name := "ccg-resource-lifecycle-" + uuid()
	// The image and CLI under test; the default is the original 2.1.292
	// verification. Each version in verifiedResourceInitializationVersions is
	// run here before it is added (e.g. CCG_LINUX_RESOURCE_IMAGE=ccgateway-app:0.1.75
	// CCG_LINUX_RESOURCE_CLI=/opt/ccgateway/cli/2.1.304/claude CCG_LINUX_RESOURCE_VERSION=2.1.304).
	image, cli, version, sum := os.Getenv("CCG_LINUX_RESOURCE_IMAGE"), os.Getenv("CCG_LINUX_RESOURCE_CLI"), os.Getenv("CCG_LINUX_RESOURCE_VERSION"), os.Getenv("CCG_LINUX_RESOURCE_SHA256")
	if image == "" {
		image, cli, version, sum = "ccgateway-app:0.1.41", "/usr/local/lib/node_modules/@anthropic-ai/claude-code/bin/claude.exe", "2.1.292", "a967e7b1d8b4e47ee421d5433027880347952b0c0857abf880e2c942a4ec93b3"
	}
	bootstrap := `set -eu; test "$(id -u)" = 1000; ls -ld /tmp; cat /proc/self/status | grep -E '^(Uid|Gid|CapInh|CapPrm|CapEff|CapBnd|CapAmb|NoNewPrivs|Seccomp):'; ls /sys/class/net; cat /proc/net/route; sha256sum ` + cli + `; umask 077; work=$(mktemp -d /tmp/ccg-resource-current-XXXXXX); tar -xz -C "$work"; cd "$work"; exec env -i PATH=/usr/local/bin:/usr/bin:/bin HOME="$work" TMPDIR="$work" CCG_REAL_CLI=` + cli + ` CCG_OFFLINE_AUTHORIZE_PROBE=1 CCG_AUTHORIZE_MOCK_MODE=tls-refresh ./engine.test -test.run='^(TestResourceManagement(OfflineAuthorizeWithoutPrompt|RealCLISelectionWithoutModel|OAuthRefreshBoundary|RefreshReadiness|CandidateFailClosed|InitializationSelection|InitializationVersionBoundary|SelectionIsNotPresence|BindingRejectsIdentityDrift))$' -test.v -test.count=2 -test.timeout=8m`
	// CCG_LINUX_RESOURCE_MOUNT=<host file> mounts a CLI that is not in the
	// image (the official release, say) read-only at CCG_LINUX_RESOURCE_CLI.
	mount := ""
	if host := os.Getenv("CCG_LINUX_RESOURCE_MOUNT"); host != "" {
		mount = "-v " + host + ":" + cli + ":ro "
	}
	command := "docker run --rm --pull never --name " + name + " --network none --cap-drop ALL --security-opt no-new-privileges --user 1000:1000 --no-healthcheck " + mount + "--entrypoint /bin/sh -i " + image + " -c '" + strings.ReplaceAll(bootstrap, "'", "'\"'\"'") + "'"
	run := exec.CommandContext(ctx, "ssh", "-o", "BatchMode=yes", "ovh", command)
	run.Stdin = &archive
	output, err = run.CombinedOutput()
	t.Logf("container=%s; current source cross-compiled GOOS=linux GOARCH=amd64 CGO_ENABLED=0\n%s", name, output)
	require.NoError(t, err)
	require.Contains(t, string(output), version+" (Claude Code); platform: linux")
	if sum != "" {
		require.Contains(t, string(output), sum)
	}
}

func TestResourceManagementOfflineAuthorizeWithoutPrompt(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" || os.Getenv("CCG_OFFLINE_AUTHORIZE_PROBE") != "1" {
		t.Skip("set CCG_REAL_CLI and CCG_OFFLINE_AUTHORIZE_PROBE=1 in a network-isolated fixture")
	}
	node, err := exec.LookPath("node")
	require.NoError(t, err, "offline authorize fixture requires node")
	executable, err := os.Executable()
	require.NoError(t, err)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	cmd := exec.CommandContext(ctx, node, "-e", resourceOfflineAuthorizeScript, cli, os.Getenv("CCG_AUTHORIZE_MOCK_MODE"), executable)
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP"} {
		if value := os.Getenv(key); value != "" {
			cmd.Env = append(cmd.Env, key+"="+value)
		}
	}
	raw, err := cmd.Output()
	require.NoError(t, err, "offline authorize fixture failed; redacted fixture report: %s", raw)
	var report struct {
		Version string `json:"version"`
		Cases   []struct {
			Name                        string   `json:"name"`
			Initialized                 bool     `json:"initialized"`
			InitializationSource        string   `json:"initializationSource"`
			InitializationKeySource     string   `json:"initializationKeySource"`
			InitializationConfigMatches bool     `json:"initializationConfigMatches"`
			StatusMethod                string   `json:"statusMethod"`
			StatusProvider              string   `json:"statusProvider"`
			StatusConfigMatches         bool     `json:"statusConfigMatches"`
			StatusLoggedIn              bool     `json:"statusLoggedIn"`
			StatusRotated               bool     `json:"statusRotated"`
			ManagementOnly              bool     `json:"managementOnly"`
			NearExpiry                  bool     `json:"nearExpiry"`
			ManagementChecked           bool     `json:"managementChecked"`
			ManagementPassed            bool     `json:"managementPassed"`
			ManagementOutput            string   `json:"managementOutput"`
			Denied                      bool     `json:"denied"`
			ExitCode                    int      `json:"exitCode"`
			Events                      []string `json:"events"`
			PromptFramesSent            int      `json:"promptFramesSent"`
			ModelFramesSeen             int      `json:"modelFramesSeen"`
			TimedOut                    bool     `json:"timedOut"`
			AccessTokenChanged          bool     `json:"accessTokenChanged"`
			RefreshTokenChanged         bool     `json:"refreshTokenChanged"`
			ExpiresAtChanged            bool     `json:"expiresAtChanged"`
			Requests                    []struct {
				Path        string `json:"path"`
				Phase       string `json:"phase"`
				FakeRefresh bool   `json:"fakeRefresh"`
			} `json:"requests"`
		} `json:"cases"`
	}
	require.NoError(t, json.Unmarshal(raw, &report))
	if os.Getenv("CCG_AUTHORIZE_MOCK_MODE") == "tls-refresh" {
		require.Len(t, report.Cases, 37)
	} else {
		require.Len(t, report.Cases, 8)
	}
	t.Logf("offline CLI version: %s; platform: %s", report.Version, runtime.GOOS)
	for _, result := range report.Cases {
		t.Run(result.Name, func(t *testing.T) {
			assert.Zero(t, result.PromptFramesSent)
			assert.Zero(t, result.ModelFramesSeen)
			if !result.ManagementOnly {
				require.True(t, result.Initialized)
				assert.Equal(t, "firstParty", result.InitializationSource)
				assert.Empty(t, result.InitializationKeySource)
				assert.True(t, result.InitializationConfigMatches)
				assert.False(t, result.TimedOut)
				assert.Zero(t, result.ExitCode)
				assert.Equal(t, "claude.ai", result.StatusMethod)
				assert.Equal(t, "firstParty", result.StatusProvider)
				assert.True(t, result.StatusConfigMatches)
				assert.True(t, result.StatusLoggedIn)
			}
			refreshes := map[string]int{}
			for _, request := range result.Requests {
				assert.False(t, strings.HasPrefix(request.Path, "/v1/messages"), "offline fixture attempted model HTTP")
				if strings.Contains(result.Name, "unknown-version-") {
					assert.NotEqual(t, "management", request.Phase, "unknown version attempted authentication or provider HTTP")
				}
				if request.FakeRefresh {
					refreshes[request.Phase]++
				}
			}
			t.Logf("status rotated=%t; refresh attempts=%v; initialized=%t; hook events=%v", result.StatusRotated, refreshes, result.Initialized, result.Events)
			if result.ManagementChecked {
				require.True(t, result.ManagementPassed, "production selection/profile/binding assertions failed: %s", result.ManagementOutput)
			}
			if result.ManagementOnly {
				require.True(t, result.ManagementChecked)
				if !result.NearExpiry && strings.HasPrefix(result.Name, "expired_") {
					require.Positive(t, refreshes["management"])
				}
				return
			}
			if os.Getenv("CCG_AUTHORIZE_MOCK_MODE") == "tls-refresh" && strings.HasPrefix(result.Name, "expired_") {
				require.Positive(t, refreshes["status"], "status never attempted CLI-owned refresh")
				require.Positive(t, refreshes["initialize"], "initialization never attempted CLI-owned refresh")
				assert.Equal(t, !result.Denied, result.AccessTokenChanged)
				assert.Equal(t, !result.Denied, result.RefreshTokenChanged)
				assert.Equal(t, !result.Denied, result.ExpiresAtChanged)
				assert.True(t, result.ManagementChecked)
			}
			if strings.Contains(result.Name, "authorize_registered") {
				require.Equal(t, []string{"entered", "authorize_ok"}, result.Events, "missing hook is not a successful authorize probe")
			}
		})
	}
}

func TestResourceManagementOfflineSelectionChild(t *testing.T) {
	if os.Getenv("CCG_RESOURCE_SELECTION_CHILD") != "1" {
		t.Skip("invoked only by the isolated offline fixture")
	}
	raw, err := os.ReadFile(os.Getenv("NODE_EXTRA_CA_CERTS"))
	require.NoError(t, err)
	roots := x509.NewCertPool()
	require.True(t, roots.AppendCertsFromPEM(raw))
	x509.SetFallbackRoots(roots)
	runner := &Runner{CLI: os.Getenv("CCG_REAL_CLI"), Env: os.Environ(), Work: os.Getenv("HOME")}
	switch os.Getenv("CCG_RESOURCE_TEST_MODE") {
	case "command-trace":
		runner.Version = os.Getenv("CCG_RESOURCE_VERIFIED_VERSION")
		require.Contains(t, verifiedResourceInitializationVersions, runner.Version)
		resourceManagementTraceCLI(t, runner, []string{"initialize"})
	case "unknown-version-cached":
		runner.Version = "2.1.297"
		resourceManagementTraceCLI(t, runner, nil)
	case "unknown-version-query":
		runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_CLI_VERSION_FIXTURE": "2.1.297 (Claude Code)"})
		resourceManagementTraceCLI(t, runner, []string{"version"})
	}
	broker, err := newResourceBroker(&Gateway{Runner: runner}, &authManager{}, t.TempDir())
	require.NoError(t, err)
	defer broker.lease.Close()
	before, err := resourceAuthorizationSource(runner.Env)
	require.NoError(t, err)
	limit := 20 * time.Second
	if os.Getenv("CCG_RESOURCE_REFRESH_DENIED") == "1" {
		limit = 3 * time.Second
	}
	ctx, cancel := context.WithTimeout(context.Background(), limit)
	defer cancel()
	ctx = withResourceAuthorization(ctx)
	started := time.Now()
	id, err := broker.identity(ctx)
	assert.Less(t, time.Since(started), limit+2*time.Second, "CLI cancellation or pipe drain exceeded the bound")
	binding := ctx.Value(resourceAuthorizationKey{}).(*resourceAuthorizationBinding)
	if os.Getenv("CCG_RESOURCE_REFRESH_DENIED") == "1" {
		require.Error(t, err)
		if strings.HasPrefix(os.Getenv("CCG_RESOURCE_TEST_MODE"), "unknown-version-") {
			require.ErrorContains(t, err, "requires verified Claude Code")
		}
		if os.Getenv("CCG_RESOURCE_TEST_MODE") == "cancel" {
			require.ErrorIs(t, ctx.Err(), context.DeadlineExceeded)
		}
		if os.Getenv("CCG_RESOURCE_TEST_MODE") == "profile-denied" {
			require.ErrorContains(t, err, "OAuth token rejected")
		}
		if os.Getenv("CCG_RESOURCE_INVALID_GRANT") == "1" {
			credentials, readErr := readSnapshotObject(credentialsPathIn(runner.Env))
			require.NoError(t, readErr)
			oauth, _ := credentials["claudeAiOauth"].(Object)
			assert.Empty(t, str(oauth, "accessToken"))
			assert.Empty(t, str(oauth, "refreshToken"))
		}
		assert.Nil(t, binding.auth)
		_, err = runner.runResource(ctx, &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files"}})
		require.ErrorContains(t, err, "verified identity authorization binding")
		_, err = os.Stat(broker.identityPath)
		assert.True(t, os.IsNotExist(err))
		return
	}
	require.NoError(t, err)
	require.NotNil(t, binding.auth)
	final, err := resourceAuthorizationCandidate(runner.Env)
	require.NoError(t, err)
	assert.Equal(t, final.fingerprint, binding.auth.fingerprint)
	if os.Getenv("CCG_RESOURCE_TEST_MODE") == "short-refresh" {
		assert.LessOrEqual(t, final.expiresAt, float64(time.Now().Add(90*time.Second).UnixMilli()))
	}
	if os.Getenv("CCG_RESOURCE_TEST_MODE") == "access-only" {
		assert.False(t, before.refreshable)
		assert.Equal(t, before.fingerprint, final.fingerprint)
	}
	if os.Getenv("CCG_RESOURCE_EXPECT_ROTATION") == "1" {
		assert.NotEqual(t, before.fingerprint, final.fingerprint)
		assert.Equal(t, "Bearer fixture-access-refreshed", final.header.Get("Authorization"))
	}
	assert.Equal(t, "oauth", id.AuthType)
	principal, err := resourceProfilePrincipal(Object{"account": Object{"uuid": "00000000-0000-4000-8000-000000000001"}, "organization": Object{"uuid": "00000000-0000-4000-8000-000000000002"}})
	require.NoError(t, err)
	assert.Equal(t, principal, id.PrincipalID)
	require.NotEmpty(t, id.Generation)
	headers := http.Header{}
	headers.Set(resources.PrincipalHeader, "different-issuer")
	headers.Set(resources.GenerationHeader, id.Generation)
	require.Error(t, verifyExpectedResourceIdentity(headers, id))
	headers.Set(resources.PrincipalHeader, id.PrincipalID)
	require.NoError(t, verifyExpectedResourceIdentity(headers, id))
	for _, path := range []string{"/v1/files", "/v1/skills"} {
		response, err := runner.runResource(ctx, &resourceExchange{route: resourceRoute{method: "GET", path: path}, dir: broker.dir, limit: broker.limit, budget: broker.budget})
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, response.status)
		require.NoError(t, response.body.Close())
	}
	credentials, err := readSnapshotObject(credentialsPathIn(runner.Env))
	require.NoError(t, err)
	credentials["claudeAiOauth"].(map[string]any)["refreshToken"] = "fixture-refresh-later"
	raw, err = json.Marshal(credentials)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(credentialsPathIn(runner.Env), raw, 0600))
	_, err = runner.runResource(ctx, &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files"}})
	require.ErrorContains(t, err, "authorization changed")
}

const resourceOfflineAuthorizeScript = `
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), http = require("node:http"), tls = require("node:tls"), cp = require("node:child_process");
const cli = process.argv[1], tlsMock = process.argv[2] === "tls-refresh", testExecutable = process.argv[3];
let verifiedVersion;
const baseEnv = {};
for (const key of ["PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP"]) if (process.env[key]) baseEnv[key] = process.env[key];
const listen = server => new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
async function run(command, args, env, cwd) {
  const child = cp.spawn(command, args, { env, cwd, stdio: ["ignore", "pipe", "ignore"] });
  let output = "", timedOut = false;
  child.stdout.on("data", data => { if (output.length < 1048576) output += data; else child.kill("SIGKILL"); });
  const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, 30000);
  try {
    const code = await new Promise((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
    return { code, output, timedOut };
  } finally { clearTimeout(timer); }
}
async function probe(expired, authorize, layout = "explicit", denied = false, delay = 0, nearExpiry = false, invalidGrant = false, managementOnly = false, testMode = "") {
  const rejectManagement = denied || invalidGrant || (!!testMode && !["command-trace", "short-refresh", "access-only"].includes(testMode));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-authorize-fake-"));
  const config = path.join(root, layout === "default" ? ".claude" : "config"), plugin = path.join(root, "plugin");
  const storage = layout === "separate" ? path.join(root, "storage") : config;
  fs.mkdirSync(config); if (storage !== config) fs.mkdirSync(storage);
  fs.mkdirSync(path.join(plugin, ".claude-plugin"), { recursive: true }); fs.mkdirSync(path.join(plugin, "hooks"));
  if (layout === "harmless-settings") fs.writeFileSync(path.join(config, "settings.json"), JSON.stringify({ env: { DISABLE_AUTOUPDATER: "1" } }));
  const credentialsPath = path.join(storage, ".credentials.json");
  const credentials = { claudeAiOauth: { accessToken: "fixture-access-not-real", refreshToken: testMode === "access-only" ? "" : "fixture-refresh-not-real", expiresAt: expired ? 1 : Date.now() + (typeof nearExpiry === "number" ? nearExpiry : nearExpiry ? 90000 : 3600000), scopes: ["user:inference", "user:profile"], subscriptionType: "max" } };
  fs.writeFileSync(credentialsPath, JSON.stringify(credentials), { mode: 0o600 });
  const events = [], requests = [], sockets = new Set(); let child, managementConfig, initializeTimer, initializationSource, initializationKeySource, initializationConfigMatches, phase = "setup", timedOut = false, initialized = false, modelFramesSeen = 0;
  let secureContext;
  const caPath = path.join(root, "test-ca.pem"), keyPath = path.join(root, "test-key.pem");
  if (tlsMock) {
    const cert = await run("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", keyPath, "-out", caPath, "-days", "1", "-subj", "/CN=platform.claude.com", "-addext", "subjectAltName=DNS:platform.claude.com,DNS:api.anthropic.com,DNS:claude.ai"], baseEnv, root);
    if (cert.code !== 0 || cert.timedOut) throw new Error("fixture certificate failed");
    secureContext = tls.createSecureContext({ key: fs.readFileSync(keyPath), cert: fs.readFileSync(caPath) });
  }
  const refreshing = new Set();
  const mock = http.createServer((req, res) => {
    let body = ""; req.on("data", b => { if (body.length < 8192) body += b; });
    req.on("end", async () => {
      let parsed = {}; try { parsed = JSON.parse(body); } catch {}
      const refresh = parsed.grant_type === "refresh_token" && parsed.refresh_token === "fixture-refresh-not-real";
      requests.push({ phase, method: req.method, host: req.headers.host, path: new URL(req.url, "https://fixture").pathname, fakeRefresh: refresh, fakeAccess: ["Bearer fixture-access-not-real", "Bearer fixture-access-refreshed"].includes(req.headers.authorization) });
      res.setHeader("Connection", "close"); res.setHeader("Content-Type", "application/json");
      if (refresh && !denied && !invalidGrant) refreshing.add(phase);
      if (refresh && delay) await new Promise(resolve => setTimeout(resolve, delay));
      if (refresh && phase === "management" && testMode === "source-drift" && fs.existsSync(managementConfig)) fs.writeFileSync(path.join(managementConfig, "settings.json"), '{"env":{"ANTHROPIC_API_KEY":"fixture-injected"}}');
      if (refresh && invalidGrant) { res.writeHead(400); res.end('{"error":"invalid_grant"}'); return; }
      if (refresh && !denied) { res.end(JSON.stringify({ access_token: "fixture-access-refreshed", refresh_token: "fixture-refresh-rotated", expires_in: testMode === "short-refresh" ? 90 : 3600, token_type: "Bearer", scope: "user:inference user:profile", account: { uuid: "00000000-0000-4000-8000-000000000001" }, organization: { uuid: "00000000-0000-4000-8000-000000000002" } })); return; }
      if (["/v1/files", "/v1/skills"].includes(req.url)) {
        const expected = refreshing.has(phase) ? "Bearer fixture-access-refreshed" : "Bearer fixture-access-not-real";
        if (req.headers.authorization !== expected) { res.writeHead(401); res.end('{}'); return; }
        res.end('{"data":[]}'); return;
      }
      if (req.url === "/api/oauth/profile" && testMode === "profile-drift" && req.headers["user-agent"] === "claude-code/2.1.7") fs.writeFileSync(path.join(managementConfig, "settings.json"), '{"env":{"ANTHROPIC_API_KEY":"fixture-injected"}}');
      if (req.url === "/api/oauth/profile" && (testMode === "profile-denied" || (refreshing.has(phase) && req.headers.authorization === "Bearer fixture-access-not-real"))) { res.writeHead(401); res.end('{}'); return; }
      if (req.url === "/api/oauth/profile") { res.end(JSON.stringify({ account: { uuid: "00000000-0000-4000-8000-000000000001" }, organization: { uuid: "00000000-0000-4000-8000-000000000002", organization_type: "claude_max" } })); return; }
      res.writeHead(403); res.end('{}');
    });
  });
  const collector = http.createServer((req, res) => {
    let body = ""; req.on("data", b => { if (body.length < 2048) body += b; });
    req.on("end", () => {
      const allowed = ["entered", "baseline_done", "authorize_ok", "authorize_empty", "authorize_failed", "authorize_missing"];
      if (allowed.includes(body)) events.push(body);
      res.writeHead(204); res.end();
      if (initialized && body !== "entered" && allowed.includes(body)) child.stdin.end();
    });
  });
  const proxy = http.createServer((req, res) => {
    try { const u = new URL(req.url); requests.push({ phase, method: req.method, host: u.hostname, path: u.pathname }); } catch { requests.push({ phase, method: req.method, host: "invalid", path: "" }); }
    req.resume(); res.writeHead(502); res.end();
  });
  for (const server of [collector, proxy]) server.on("connection", socket => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); socket.on("error", () => {}); });
  proxy.on("connect", (req, socket, head) => {
    requests.push({ phase, method: "CONNECT", host: req.url, path: "" });
    if (!tlsMock || !["platform.claude.com:443", "api.anthropic.com:443", "claude.ai:443"].includes(req.url)) { socket.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Length: 0\r\n\r\n"); return; }
    socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length) socket.unshift(head);
    const secure = new tls.TLSSocket(socket, { isServer: true, secureContext });
    sockets.add(secure); secure.on("close", () => sockets.delete(secure)); secure.on("error", () => {});
    mock.emit("connection", secure);
  });
  try {
  await listen(collector); await listen(proxy);
  const reportURL = "http://127.0.0.1:" + collector.address().port + "/status";
  const proxyURL = "http://127.0.0.1:" + proxy.address().port;
  const hook = "export function register(on) { on('session.start', async ($, e, next) => { const report = async status => { await $.http.fetch(" + JSON.stringify(reportURL) + ", {method:'POST',body:status}); }; await report('entered'); try { const auth = await $.session.authorize(); await report(auth && auth.handle ? 'authorize_ok' : 'authorize_empty'); } catch (error) { await report('authorize_failed'); } return next(e); }); }";
  fs.writeFileSync(path.join(plugin, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "resource-authorize-probe", version: "0.0.1" }));
  fs.writeFileSync(path.join(plugin, "hooks", "hooks.json"), JSON.stringify({ modules: ["./probe.js"] }));
  fs.writeFileSync(path.join(plugin, "hooks", "probe.js"), hook);
  for (const dir of ["appdata", "localappdata", "tmp"]) fs.mkdirSync(path.join(root, dir));
  const env = { ...baseEnv, HOME: root, USERPROFILE: root, APPDATA: path.join(root, "appdata"), LOCALAPPDATA: path.join(root, "localappdata"), TEMP: path.join(root, "tmp"), TMP: path.join(root, "tmp"), CLAUDE_CONFIG_DIR: config, CLAUDE_SECURESTORAGE_CONFIG_DIR: storage, HTTP_PROXY: proxyURL, HTTPS_PROXY: proxyURL, NO_PROXY: "127.0.0.1,localhost", DISABLE_AUTOUPDATER: "1" };
  if (layout === "default") { delete env.CLAUDE_CONFIG_DIR; delete env.CLAUDE_SECURESTORAGE_CONFIG_DIR; }
  if (tlsMock) env.NODE_EXTRA_CA_CERTS = caPath;
  function stageEnvironment(stage) {
    const home = path.join(root, stage), config = path.join(home, layout === "default" ? ".claude" : "config"), storage = layout === "separate" ? path.join(home, "storage") : config;
    for (const dir of [config, storage, path.join(home, "appdata"), path.join(home, "localappdata"), path.join(home, "tmp")]) fs.mkdirSync(dir, { recursive: true });
    const credentialsPath = path.join(storage, ".credentials.json");
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials), { mode: 0o600 });
    if (layout === "harmless-settings") fs.writeFileSync(path.join(config, "settings.json"), JSON.stringify({ env: { DISABLE_AUTOUPDATER: "1" } }));
    const stageEnv = { ...env, HOME: home, USERPROFILE: home, APPDATA: path.join(home, "appdata"), LOCALAPPDATA: path.join(home, "localappdata"), TEMP: path.join(home, "tmp"), TMP: path.join(home, "tmp"), CLAUDE_CONFIG_DIR: config, CLAUDE_SECURESTORAGE_CONFIG_DIR: storage };
    if (layout === "default") { delete stageEnv.CLAUDE_CONFIG_DIR; delete stageEnv.CLAUDE_SECURESTORAGE_CONFIG_DIR; }
    return { env: stageEnv, credentialsPath, config, home };
  }
  const caseName = (expired ? "expired" : nearExpiry ? "near_expiry" : "valid") + (authorize ? "_authorize_registered" : "_baseline") + (layout === "explicit" ? "" : "_" + layout) + (denied ? "_denied" : "") + (invalidGrant ? "_invalid_grant" : "") + (delay ? "_delay_" + delay : "") + (nearExpiry ? "_remaining_" + nearExpiry : "") + (testMode ? "_" + testMode : "");
  phase = "status";
  const statusStage = stageEnvironment("status-stage");
  const statusRun = managementOnly ? {code:0,output:'{}'} : await run(cli, ["auth", "status", "--json"], { ...statusStage.env, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" }, statusStage.home);
  if (statusRun.code !== 0 || statusRun.timedOut) throw new Error("fixture status failed");
  const status = JSON.parse(statusRun.output), afterStatus = JSON.parse(fs.readFileSync(statusStage.credentialsPath, "utf8")).claudeAiOauth;
  const statusRotated = afterStatus.accessToken !== credentials.claudeAiOauth.accessToken && afterStatus.refreshToken !== credentials.claudeAiOauth.refreshToken && afterStatus.expiresAt > Date.now() + 30000;
  let managementChecked = false, managementPassed = false, managementOutput = "";
  if (tlsMock && layout === "explicit") {
    const stage = stageEnvironment("management-stage");
    managementConfig = stage.config;
    phase = "management";
    const managed = await run(testExecutable, ["-test.run=^TestResourceManagementOfflineSelectionChild$", "-test.timeout=25s"], { ...stage.env, CCG_RESOURCE_SELECTION_CHILD: "1", CCG_REAL_CLI: cli, CCG_RESOURCE_REFRESH_DENIED: rejectManagement ? "1" : "0", CCG_RESOURCE_VERIFIED_VERSION: verifiedVersion, CCG_RESOURCE_EXPECT_ROTATION: expired ? "1" : "0", CCG_RESOURCE_TEST_MODE: testMode, CCG_RESOURCE_INVALID_GRANT: invalidGrant ? "1" : "0", GODEBUG: "x509usefallbackroots=1", CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" }, stage.home);
    managementChecked = true; managementPassed = managed.code === 0 && !managed.timedOut; managementOutput = managed.output;
  }
  if (managementOnly) return {name:caseName, managementOnly, managementChecked, managementPassed, managementOutput, requests, denied:rejectManagement, nearExpiry:!!nearExpiry, delay, promptFramesSent:0, modelFramesSeen:0};
  phase = "initialize";
  const args = ["-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--tools", "", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}', "--setting-sources", "", "--settings", JSON.stringify({ disableAllHooks: !authorize }), "--no-session-persistence", "--no-chrome", "--disable-slash-commands"];
  if (authorize) args.push("--plugin-dir", plugin);
  child = cp.spawn(cli, args, { cwd: root, env, stdio: ["pipe", "pipe", "ignore"] });
  let buffer = "";
  child.stdout.on("data", data => {
    buffer += data;
    let i; while ((i = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, i); buffer = buffer.slice(i + 1);
      try {
        const frame = JSON.parse(line);
        if (frame.type === "control_response" && frame.response?.subtype === "success") {
          if (frame.response.request_id === "offline-initialize" && !initialized) {
            initialized = true;
            initializationConfigMatches = path.resolve(frame.response.response?.user_output_styles_dir || "") === path.resolve(config, "output-styles");
            initializationSource = frame.response.response?.account?.apiProvider;
            initializationKeySource = frame.response.response?.account?.apiKeySource;
            if (!authorize) initializeTimer = setTimeout(() => child.stdin.end(), 2000); else if (events.length >= 2) child.stdin.end();
          }
        }
        if (["assistant", "stream_event"].includes(frame.type)) modelFramesSeen++;
      } catch {}
    }
    if (buffer.length > 1048576) buffer = "";
  });
  child.stdin.on("error", () => {});
  child.stdin.write(JSON.stringify({ type: "control_request", request_id: "offline-initialize", request: { subtype: "initialize", hooks: {}, sdkMcpServers: [], supportedDialogKinds: [], promptSuggestions: false } }) + "\n");
  const timeout = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, 30000);
  const exitCode = await new Promise((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
  clearTimeout(timeout); clearTimeout(initializeTimer);
  const after = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  const result = { name: caseName, initializationSource, initializationKeySource, initializationConfigMatches, denied, exitCode, statusLoggedIn: status.loggedIn, statusRotated, managementChecked, managementPassed, managementOutput, statusMethod: status.authMethod, statusProvider: status.apiProvider, statusConfigMatches: path.resolve(status.configDirectory || "") === path.resolve(statusStage.config), initialized, events, requests, credentialsChanged: JSON.stringify(after) !== JSON.stringify(credentials), accessTokenChanged: after.claudeAiOauth?.accessToken !== credentials.claudeAiOauth.accessToken, refreshTokenChanged: after.claudeAiOauth?.refreshToken !== credentials.claudeAiOauth.refreshToken, expiresAtChanged: after.claudeAiOauth?.expiresAt !== credentials.claudeAiOauth.expiresAt, promptFramesSent: 0, modelFramesSeen, timedOut };
  return result;
  } finally {
    if (child && child.exitCode === null) child.kill("SIGKILL");
    for (const socket of sockets) socket.destroy();
    collector.closeAllConnections(); proxy.closeAllConnections();
    await new Promise(resolve => collector.close(resolve)); await new Promise(resolve => proxy.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  }
}
(async () => {
  const versionRun = await run(cli, ["--version"], baseEnv);
  if (versionRun.code !== 0 || versionRun.timedOut) throw new Error("fixture version failed");
  const version = versionRun.output.trim();
  verifiedVersion = version.split(" ")[0];
  const cases = [];
  for (const authorize of [false, true]) for (const expired of [false, true]) cases.push(await probe(expired, authorize));
  for (const layout of ["default", "separate", "harmless-settings"]) cases.push(await probe(false, false, layout));
  cases.push(await probe(true, false, "explicit", true));
  if (tlsMock) {
    cases.push(await probe(true, false, "explicit", false, 250, false, false, true, "command-trace"));
    cases.push(await probe(true, false, "explicit", false, 250, false, false, true, "short-refresh"));
    cases.push(await probe(false, false, "explicit", false, 0, 90000, false, true, "access-only"));
    for (const mode of ["unknown-version-cached", "unknown-version-query"]) cases.push(await probe(false, false, "explicit", false, 0, false, false, true, mode));
    for (const delay of [250, 1200]) cases.push(await probe(true, false, "explicit", false, delay, false, false, true));
    for (const remaining of [31000, 45000, 90000, 300000, 480000, 590000]) cases.push(await probe(false, false, "explicit", false, 1200, remaining, false, true));
    for (const delay of [5000, 12000]) cases.push(await probe(false, false, "explicit", false, delay, 90000, false, true));
    for (const remaining of [300100, 301000, 305000]) cases.push(await probe(false, false, "explicit", false, 5000, remaining, false, true));
    cases.push(await probe(false, false, "explicit", true, 0, 90000, false, true));
    cases.push(await probe(false, false, "explicit", true, 250, 90000, false, true));
    cases.push(await probe(false, false, "explicit", false, 250, 90000, true, true));
    cases.push(await probe(false, false, "explicit", false, 5000, 90000, false, true, "cancel"));
    cases.push(await probe(false, false, "explicit", false, 0, false, false, true, "profile-denied"));
    cases.push(await probe(false, false, "explicit", false, 0, false, false, true, "profile-drift"));
    cases.push(await probe(true, false, "explicit", false, 5000, false, false, true, "cancel"));
    cases.push(await probe(true, false, "explicit", false, 250, false, false, true, "source-drift"));
    cases.push(await probe(true, false, "explicit", false, 250, false, false, true, "profile-denied"));
    cases.push(await probe(true, false, "explicit", true, 250, false, false, true));
    cases.push(await probe(true, false, "explicit", false, 250, false, true, true));
  }
  console.log(JSON.stringify({ version, cases }));
})().catch(() => { console.log(JSON.stringify({ probeError: true })); process.exitCode = 1; });
`
