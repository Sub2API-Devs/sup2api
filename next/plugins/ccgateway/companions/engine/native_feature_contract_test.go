package engine

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Exercise every public Files/Skills method through the current fixed-route
// parser and real management HTTP transport, with fake credentials and TLS.
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
			var calls atomic.Int64
			var payload []byte
			if tc.method == http.MethodPost {
				payload = []byte("--fixture\r\nContent-Disposition: form-data; name=\"file\"; filename=\"fixture.txt\"\r\n\r\nfixture\r\n--fixture--\r\n")
			}
			responseBody := []byte(`{"id":"fixture","object":"list","data":[]}`)
			if strings.HasSuffix(tc.path, "/content") {
				responseBody = []byte{0, 1, 2, 255}
			}
			up := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				assert.Equal(t, tc.method, r.Method)
				assert.Equal(t, tc.path, r.URL.Path)
				assert.Equal(t, "fixture-secret", r.Header.Get("X-Api-Key"))
				assert.Empty(t, r.Header.Get("Authorization"))
				got, err := io.ReadAll(r.Body)
				require.NoError(t, err)
				assert.Equal(t, string(payload), string(got))
				w.Header().Set("Content-Type", "application/octet-stream")
				w.Write(responseBody)
			}))
			defer up.Close()
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
			env := []string{"ANTHROPIC_BASE_URL=" + up.URL}
			auth := &resourceAuthorization{method: "api_key", header: http.Header{"X-Api-Key": {"fixture-secret"}}}
			response, err := resourceManagementHTTP(context.Background(), env, op, auth, resourceManagementTestClient(t, up, env))
			require.NoError(t, err)
			got, err := io.ReadAll(response.body)
			require.NoError(t, err)
			require.NoError(t, response.body.Close())
			assert.Equal(t, 200, response.status)
			assert.Equal(t, responseBody, got)
			assert.Equal(t, int64(1), calls.Load())
		})
	}
}
