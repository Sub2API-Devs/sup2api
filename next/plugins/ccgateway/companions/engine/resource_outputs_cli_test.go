package engine

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Management outputs bind the verified issuer, not private headers returned by
// the provider. No model request, model policy or conversation is involved.
func TestRealCLIResourceOutputsBindIdentity(t *testing.T) {
	if !resourceManagedTestProcess(t) {
		return
	}
	type responseCase struct {
		name, method, path string
		payload            []byte
		provider, want     int
	}
	var broker *resourceBroker
	var active atomic.Pointer[responseCase]
	var calls atomic.Int32
	payload := []byte("\x00resource-output\xff\r\n")
	runner := resourceManagedTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		tc := active.Load()
		if !assert.NotNil(t, tc, "identity lookup attempted provider IO") {
			w.WriteHeader(500)
			return
		}
		assert.Equal(t, tc.method, r.Method)
		assert.Equal(t, tc.path, r.URL.RequestURI())
		assert.Equal(t, "dummy-resource-fixture", r.Header.Get("X-Api-Key"))
		for _, name := range []string{resources.PrincipalHeader, resources.GenerationHeader, resources.ResourceOutputsHeader, resources.ResourceRefsHeader, resources.ResourceContextsHeader} {
			assert.Empty(t, r.Header.Values(name), "private capability reached provider: %s", name)
		}
		if broker.authority.mu.TryLock() {
			broker.authority.mu.Unlock()
			t.Error("resource issuer not locked during management HTTP")
		}
		body, err := io.ReadAll(r.Body)
		assert.NoError(t, err)
		assert.Empty(t, body, "model body leaked into management request")
		w.Header().Set(resources.PrincipalHeader, "forged-upstream-principal")
		w.Header().Set(resources.GenerationHeader, "forged-upstream-generation")
		w.Header().Set("Set-Cookie", "private-cookie")
		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Retry-After", "3")
		w.Header().Set("Request-Id", "req_resource_output")
		w.Header().Set("Location", "/v1/messages")
		w.WriteHeader(tc.provider)
		_, err = w.Write(tc.payload)
		assert.NoError(t, err)
	})
	broker = resourceManagedTestBroker(t, runner)
	cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 8<<20)
	require.NoError(t, err)
	broker.g.Cache = cache
	ctx, cancel := context.WithTimeout(t.Context(), time.Minute)
	defer cancel()
	identityRequest := httptest.NewRequestWithContext(ctx, "GET", resources.IdentityPath, nil)
	identityRequest.Header.Set("X-Api-Key", "worker-fixture")
	identityResponse := httptest.NewRecorder()
	broker.ServeHTTP(identityResponse, identityRequest)
	require.Equal(t, 200, identityResponse.Code, identityResponse.Body.String())
	var id resources.Identity
	require.NoError(t, json.Unmarshal(identityResponse.Body.Bytes(), &id))
	require.NotEmpty(t, id.PrincipalID)
	require.NotEmpty(t, id.Generation)
	assert.Equal(t, id.PrincipalID, identityResponse.Header().Get(resources.PrincipalHeader))
	assert.Equal(t, id.Generation, identityResponse.Header().Get(resources.GenerationHeader))
	assert.Zero(t, calls.Load())
	for _, tc := range []responseCase{
		{name: "binary", provider: 200, want: 200},
		{name: "provider_error", provider: 429, want: 429, payload: []byte(`{"type":"error","error":{"type":"rate_limit_error","message":"fixture limit"}}`)},
		{name: "redirect", provider: 307, want: 307},
		{name: "parse_error", path: "/v1/messages", provider: 200, want: 400},
		{name: "wrong_issuer", provider: 200, want: 409}, {name: "stale_generation", provider: 200, want: 409},
		{name: "missing_identity", provider: 200, want: 409}, {name: "duplicate_identity", provider: 200, want: 409},
		{name: "worker_unauthorized", provider: 200, want: 401},
		{name: "files_list", path: "/v1/files?limit=1&after_id=file_before", provider: 200, want: 200, payload: []byte(`{"data":[{"id":"file_fixture","type":"file"}],"has_more":false}`)},
		{name: "files_delete", method: "DELETE", path: "/v1/files/file_fixture", provider: 200, want: 200, payload: []byte(`{"id":"file_fixture","type":"file_deleted"}`)},
		{name: "skills_list", path: "/v1/skills?source=custom&limit=1&beta=true", provider: 200, want: 200, payload: []byte(`{"data":[{"id":"skill_fixture","type":"skill"}],"has_more":false}`)},
		{name: "skill_versions", path: "/v1/skills/skill_fixture/versions?limit=1", provider: 200, want: 200, payload: []byte(`{"data":[{"skill_id":"skill_fixture","version":"123"}],"has_more":false}`)},
		{name: "skill_content", path: "/v1/skills/skill_fixture/versions/123/content", provider: 200, want: 200},
		{name: "skill_version_delete", method: "DELETE", path: "/v1/skills/skill_fixture/versions/123", provider: 200, want: 200, payload: []byte(`{"id":"skill_fixture","version":"123","type":"skill_version_deleted"}`)},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if tc.method == "" {
				tc.method = http.MethodGet
			}
			if tc.path == "" {
				tc.path = "/v1/files/file_fixture/content"
			}
			if tc.payload == nil {
				tc.payload = payload
			}
			active.Store(&tc)
			request := httptest.NewRequestWithContext(ctx, tc.method, resourcePrefix+tc.path, nil)
			request.Header.Set("X-Api-Key", "worker-fixture")
			request.Header.Set(resources.PrincipalHeader, id.PrincipalID)
			request.Header.Set(resources.GenerationHeader, id.Generation)
			request.Header.Set(resources.ResourceOutputsHeader, "1")
			request.Header.Set(resources.ResourceRefsHeader, `[{"kind":"file","id":"file_fixture"}]`)
			request.Header.Set(resources.ResourceContextsHeader, "private-context")
			switch tc.name {
			case "wrong_issuer":
				request.Header.Set(resources.PrincipalHeader, "other")
			case "stale_generation":
				request.Header.Set(resources.GenerationHeader, "old-generation")
			case "missing_identity":
				request.Header.Del(resources.GenerationHeader)
			case "duplicate_identity":
				request.Header.Add(resources.PrincipalHeader, id.PrincipalID)
			case "worker_unauthorized":
				request.Header.Set("X-Api-Key", "wrong-worker-key")
			}
			before := calls.Load()
			response := httptest.NewRecorder()
			broker.ServeHTTP(response, request)
			require.Equal(t, tc.want, response.Code, response.Body.String())
			if tc.want == tc.provider {
				assert.Equal(t, before+1, calls.Load(), "unexpected retry, redirect or model call")
				assert.Equal(t, tc.payload, response.Body.Bytes())
				assert.Equal(t, strconv.Itoa(len(tc.payload)), response.Header().Get("Content-Length"))
				assert.Equal(t, id.PrincipalID, response.Header().Get(resources.PrincipalHeader))
				assert.Equal(t, id.Generation, response.Header().Get(resources.GenerationHeader))
				assert.Equal(t, "3", response.Header().Get("Retry-After"))
				assert.Equal(t, "req_resource_output", response.Header().Get("Request-Id"))
			} else {
				assert.Equal(t, before, calls.Load(), "rejected request reached provider")
				assert.Empty(t, response.Header().Get(resources.PrincipalHeader))
				assert.Empty(t, response.Header().Get(resources.GenerationHeader))
			}
			assert.Empty(t, response.Header().Get("Set-Cookie"))
			assert.Empty(t, response.Header().Get("Location"))
			assert.Empty(t, cache.entries, "management HTTP created a conversation checkpoint")
			assert.Empty(t, broker.g.Slots, "management operation retained execution slot")
			require.True(t, broker.authority.mu.TryLock(), "completed operation retained issuer lock")
			broker.authority.mu.Unlock()
			assertResourceSpoolReleased(t, broker.dir, broker.budget)
		})
	}
}
