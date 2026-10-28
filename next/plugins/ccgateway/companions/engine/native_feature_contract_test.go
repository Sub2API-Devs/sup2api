package engine

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// A failed call is classified: a caller-side refusal (exit 1), an oversized
// answer (exit 3), a missing login (exit 4) and a provider reachability failure
// (exit 2) each keep their own answer.
func TestResourceManagementCLIRejected(t *testing.T) {
	for _, tc := range []struct {
		name string
		exit int
		want string
	}{
		{"rejected", cliManagementExitRejected, "refused by the CLI"},
		{"transport", cliManagementExitTransport, "could not be reached"},
		{"too-large", cliManagementExitTooLarge, "exceeds the configured size limit"},
		{"not-logged-in", cliManagementExitNotLoggedIn, "requires a Claude Code login"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			runner, _ := managementTestRunner(t, map[string]string{"CCG_TEST_MGMT_EXIT": strconv.Itoa(tc.exit)})
			op := &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files"}, dir: t.TempDir(), limit: 1024, budget: &resourceSpoolBudget{limit: 2048}}
			auth := &resourceAuthorization{method: "api_key", header: http.Header{"X-Api-Key": {"fixture-secret"}}}
			response, err := resourceManagementHTTP(context.Background(), runner, runner.Env, op, auth)
			require.ErrorContains(t, err, tc.want)
			assert.Nil(t, response)
			assert.Zero(t, op.budget.used)
		})
	}
}

// The response limit Go enforces is also the CLI's --max-bytes, so an answer
// that big is stopped while it is read instead of after it is buffered.
func TestResourceManagementPassesMaxBytes(t *testing.T) {
	runner, argsLog := managementTestRunner(t, nil)
	op := &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files"}, dir: t.TempDir(), limit: 4096, budget: &resourceSpoolBudget{limit: 8192}}
	auth := &resourceAuthorization{method: "api_key", header: http.Header{"X-Api-Key": {"fixture-secret"}}}
	response, err := resourceManagementHTTP(context.Background(), runner, runner.Env, op, auth)
	require.NoError(t, err)
	defer response.body.Close()
	records := managementRecords(t, argsLog)
	require.Len(t, records, 1)
	assert.EqualValues(t, 4096, records[0]["max_bytes"])
}

// The official profile read is a bare GET with no Anthropic-Beta header and
// its own timeout; Files/Skills keep the betas the operation declares.
func TestResourceManagementProfileHeadersAndTimeout(t *testing.T) {
	for _, tc := range []struct {
		name, method string
		route        resourceRoute
		identity     bool
	}{
		{"profile", "claude.ai", resourceRoute{method: "GET", path: "/api/oauth/profile"}, true},
		{"skills", "api_key", resourceRoute{method: "GET", path: "/v1/skills", betas: []string{"skills-2025-10-02"}}, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			runner, argsLog := managementTestRunner(t, nil)
			op := &resourceExchange{route: tc.route, dir: t.TempDir(), limit: 1 << 20, budget: &resourceSpoolBudget{limit: 2 << 20}}
			if tc.identity {
				op.identity = &resourceIdentityProbe{}
			}
			auth := &resourceAuthorization{method: tc.method, header: http.Header{}}
			response, err := resourceManagementHTTP(context.Background(), runner, runner.Env, op, auth)
			require.NoError(t, err)
			defer response.body.Close()
			records := managementRecords(t, argsLog)
			require.Len(t, records, 1)
			headers := fmt.Sprint(records[0]["headers"])
			if tc.identity {
				assert.Equal(t, "/api/oauth/profile", records[0]["path"], "the official profile read has no query")
				assert.NotContains(t, headers, "Anthropic-Beta")
				assert.Equal(t, float64(profileTimeout/time.Millisecond), records[0]["timeout_ms"])
				assert.EqualValues(t, profileCLIMaxBytes, records[0]["max_bytes"])
				assert.NotContains(t, headers, "Authorization")
			} else {
				assert.Contains(t, headers, "Anthropic-Beta:skills-2025-10-02")
			}
		})
	}
}

// A CLI without management_http_v1 is refused before any process starts.
func TestResourceManagementRequiresManagementCapability(t *testing.T) {
	runner, argsLog := managementTestRunner(t, nil)
	root := t.TempDir()
	runner.Env = envWith(runner.Env, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": root, "CLAUDE_SECURESTORAGE_CONFIG_DIR": root, "ANTHROPIC_API_KEY": "fixture-secret"})
	runner.SupportsManagement = false
	auth, err := resourceAuthorizationCandidate(runner.Env)
	require.NoError(t, err)
	ctx := withResourceAuthorization(context.Background())
	bindResourceAuthorization(ctx, auth)
	op := &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files"}, dir: t.TempDir(), limit: 1024, budget: &resourceSpoolBudget{limit: 2048}}
	_, err = runner.runResource(ctx, op)
	require.ErrorContains(t, err, "does not support")
	assert.Empty(t, managementRecords(t, argsLog))
}

// The CLI receives the allowlisted API path and query, not a composed URL: it
// resolves them against the same ANTHROPIC_BASE_URL it already uses.
func TestResourceManagementPassesPathAndQuery(t *testing.T) {
	runner, argsLog := managementTestRunner(t, nil)
	op := &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files", query: "limit=2&page=1"}, dir: t.TempDir(), limit: 1024, budget: &resourceSpoolBudget{limit: 2048}}
	auth := &resourceAuthorization{method: "api_key", header: http.Header{"X-Api-Key": {"fixture-secret"}}}
	response, err := resourceManagementHTTP(context.Background(), runner, runner.Env, op, auth)
	require.NoError(t, err)
	defer response.body.Close()
	records := managementRecords(t, argsLog)
	require.Len(t, records, 1)
	assert.Equal(t, "/v1/files?limit=2&page=1", records[0]["path"])
}

// Exercise every public Files/Skills method through the current fixed-route
// parser and the CLI management transport (the fake peer), with fake
// credentials. The CLI owns the credential and the HTTPS call; Go must pass
// only the operation's own headers and spool the answer verbatim.
func TestNativeFeatureResourceMethods(t *testing.T) {
	cases := []struct{ method, path string }{
		{"POST", "/v1/files"}, {"GET", "/v1/files"}, {"GET", "/v1/files/file_fixture"},
		{"GET", "/v1/files/file_fixture/content"}, {"DELETE", "/v1/files/file_fixture"},
		{"POST", "/v1/skills"}, {"GET", "/v1/skills"}, {"GET", "/v1/skills/skill_fixture"},
		{"DELETE", "/v1/skills/skill_fixture"}, {"POST", "/v1/skills/skill_fixture/versions"},
		{"GET", "/v1/skills/skill_fixture/versions"}, {"GET", "/v1/skills/skill_fixture/versions/version_fixture"},
		{"DELETE", "/v1/skills/skill_fixture/versions/version_fixture"},
	}
	for _, tc := range cases {
		t.Run(tc.method+tc.path, func(t *testing.T) {
			var payload []byte
			if tc.method == http.MethodPost {
				payload = []byte("--fixture\r\nContent-Disposition: form-data; name=\"file\"; filename=\"fixture.txt\"\r\n\r\nfixture\r\n--fixture--\r\n")
			}
			responseBody := []byte(`{"id":"fixture","object":"list","data":[]}`)
			if strings.HasSuffix(tc.path, "/content") {
				responseBody = []byte{0, 1, 2, 255}
			}
			answer := filepath.Join(t.TempDir(), "answer.bin")
			require.NoError(t, os.WriteFile(answer, responseBody, 0600))
			runner, argsLog := managementTestRunner(t, map[string]string{
				"CCG_TEST_MGMT_META_HEADERS": `{"Content-Type":"application/octet-stream"}`,
				"CCG_TEST_MGMT_BODY_FILE":    answer,
			})
			r := httptest.NewRequest(tc.method, resourcePrefix+tc.path, bytes.NewReader(payload))
			if len(payload) > 0 {
				r.Header.Set("Content-Type", "multipart/form-data; boundary=fixture")
			}
			route, err := parseResourceRoute(r)
			require.NoError(t, err)
			op := &resourceExchange{route: route, dir: t.TempDir(), limit: 4096, budget: &resourceSpoolBudget{limit: 8192}}
			if route.upload {
				op.input, err = spoolResource(context.Background(), op.dir, io.NopCloser(bytes.NewReader(payload)), int64(len(payload)), op.limit, op.budget)
				require.NoError(t, err)
				defer op.input.Close()
			}
			auth := &resourceAuthorization{method: "api_key", header: http.Header{"X-Api-Key": {"fixture-secret"}}}
			response, err := resourceManagementHTTP(context.Background(), runner, runner.Env, op, auth)
			require.NoError(t, err)
			got, err := io.ReadAll(response.body)
			require.NoError(t, err)
			require.NoError(t, response.body.Close())
			assert.Equal(t, 200, response.status)
			assert.Equal(t, responseBody, got)

			records := managementRecords(t, argsLog)
			require.Len(t, records, 1)
			assert.Equal(t, tc.method, records[0]["method"])
			assert.Equal(t, tc.path, records[0]["path"])
			if route.upload {
				assert.Equal(t, payload, managementBody(t, records[0]))
				assert.Contains(t, fmt.Sprint(records[0]["headers"]), "Content-Type:multipart/form-data; boundary=fixture")
			} else {
				assert.Nil(t, records[0]["body_bytes"], "a non-upload operation must not pass a body")
			}
			headers := fmt.Sprint(records[0]["headers"])
			assert.Contains(t, headers, "Anthropic-Version:2023-06-01")
			assert.Contains(t, headers, "Accept-Encoding:identity")
			// A content download asks for bytes by name, as the official call does.
			if strings.HasSuffix(tc.path, "/content") {
				assert.Contains(t, headers, "Accept:application/binary")
			} else {
				assert.NotContains(t, headers, "Accept:application")
			}
			// The credential stays with the CLI: Go never passes it.
			assert.NotContains(t, headers, "X-Api-Key")
			assert.NotContains(t, headers, "Authorization")
		})
	}
}
