package engine

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The retired model/session-context rewriting assertions are intentionally not
// retained. A resource context now governs management cancellation and cleanup.
func TestRealCLIResourceManagementCancellationReleasesAuthorityAndSpool(t *testing.T) {
	if !resourceManagedTestProcess(t) {
		return
	}
	entered := make(chan struct{})
	var calls atomic.Int32
	runner := resourceManagedTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		assert.Equal(t, "/v1/files/file_fixture/content", r.URL.Path)
		assert.Equal(t, http.MethodGet, r.Method)
		w.Header().Set("Content-Type", "application/octet-stream")
		_, err := io.WriteString(w, "partial-provider-bytes")
		assert.NoError(t, err)
		w.(http.Flusher).Flush()
		close(entered)
		<-r.Context().Done()
	})
	broker := resourceManagedTestBroker(t, runner)
	id, err := broker.identity(withResourceAuthorization(t.Context()))
	require.NoError(t, err)
	ctx, cancel := context.WithTimeout(t.Context(), 20*time.Second)
	defer cancel()
	request := httptest.NewRequestWithContext(ctx, "GET", resourcePrefix+"/v1/files/file_fixture/content", nil)
	request.Header.Set("X-Api-Key", "worker-fixture")
	request.Header.Set(resources.PrincipalHeader, id.PrincipalID)
	request.Header.Set(resources.GenerationHeader, id.Generation)
	response := httptest.NewRecorder()
	done := make(chan struct{})
	go func() { defer close(done); broker.ServeHTTP(response, request) }()
	select {
	case <-entered:
	case <-time.After(15 * time.Second):
		cancel()
		t.Fatal("management HTTP did not dispatch")
	}
	// Cancel after real response bytes have occupied the spool, not just before
	// dispatch. This proves partial output cannot escape or retain quota.
	require.Eventually(t, func() bool {
		broker.budget.mu.Lock()
		defer broker.budget.mu.Unlock()
		return broker.budget.used > 0
	}, 3*time.Second, 10*time.Millisecond)
	cancel()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("management cancellation did not release the request")
	}
	assert.Equal(t, http.StatusBadGateway, response.Code)
	assert.NotContains(t, response.Body.String(), "partial-provider-bytes")
	assert.Empty(t, response.Header().Get(resources.PrincipalHeader))
	assert.Equal(t, int32(1), calls.Load())
	assert.Empty(t, broker.g.Slots)
	require.True(t, broker.authority.mu.TryLock())
	broker.authority.mu.Unlock()
	assertResourceSpoolReleased(t, broker.dir, broker.budget)
}

// Low-level HTTP response spooling needs no CLI process. The real TLS server
// uses an explicitly trusted fixture CA; no transport or response is stubbed.
func TestResourceManagementResponseSpoolRejectsIncompleteOrOversize(t *testing.T) {
	for _, mode := range []string{"declared_size", "stream_size", "budget", "truncated"} {
		t.Run(mode, func(t *testing.T) {
			var calls atomic.Int32
			up := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				assert.Equal(t, "/v1/files/file_fixture/content", r.URL.Path)
				assert.Equal(t, "spool-fixture-key", r.Header.Get("X-Api-Key"))
				if mode == "declared_size" || mode == "truncated" {
					w.Header().Set("Content-Length", "2048")
				}
				w.WriteHeader(http.StatusOK)
				w.(http.Flusher).Flush()
				size := 2048
				if mode == "truncated" {
					size = 16
				}
				_, _ = w.Write(bytes.Repeat([]byte("x"), size))
			}))
			defer up.Close()
			root := t.TempDir()
			env := []string{"HOME=" + root, "USERPROFILE=" + root, "CLAUDE_CONFIG_DIR=" + root, "CLAUDE_SECURESTORAGE_CONFIG_DIR=" + root, "ANTHROPIC_API_KEY=spool-fixture-key", "CCG_RESOURCE_ISSUER_ID=spool-fixture", "CCG_RESOURCE_ISSUER_GENERATION=1", "ANTHROPIC_BASE_URL=" + up.URL}
			auth, err := resourceAuthorizationCandidate(env)
			require.NoError(t, err)
			client, transport := managementHTTPClient(env)
			transport.TLSClientConfig.RootCAs = up.Client().Transport.(*http.Transport).TLSClientConfig.RootCAs
			defer transport.CloseIdleConnections()
			op := &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files/file_fixture/content"}, dir: t.TempDir(), limit: 1024, budget: &resourceSpoolBudget{limit: 4096}}
			if mode == "budget" {
				op.limit, op.budget.limit = 4096, 1024
			}
			if mode == "truncated" {
				op.limit = 4096
			}
			ctx, cancel := context.WithTimeout(t.Context(), 5*time.Second)
			defer cancel()
			response, err := resourceManagementHTTP(ctx, env, op, auth, client)
			require.ErrorContains(t, err, "resource response unavailable")
			assert.Nil(t, response)
			assert.Equal(t, int32(1), calls.Load())
			assertResourceSpoolReleased(t, op.dir, op.budget)
		})
	}
}
