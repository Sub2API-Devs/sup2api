package engine

import (
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

// Response spooling keeps its limits under the CLI transport: the answer body
// is a file the CLI wrote, and Go still rejects a declared size, a streamed
// size and a spool budget violation (the fake peer scripts each).
func TestResourceManagementResponseSpoolRejectsIncompleteOrOversize(t *testing.T) {
	for _, mode := range []string{"declared_size", "stream_size", "budget", "truncated"} {
		t.Run(mode, func(t *testing.T) {
			values := map[string]string{}
			op := &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files/file_fixture/content"}, dir: t.TempDir(), limit: 1024, budget: &resourceSpoolBudget{limit: 4096}}
			switch mode {
			case "declared_size":
				values["CCG_TEST_MGMT_BODY_BYTES"] = "2048"
				values["CCG_TEST_MGMT_META_HEADERS"] = `{"Content-Length":"2048"}`
			case "stream_size":
				values["CCG_TEST_MGMT_BODY_BYTES"] = "2048"
			case "budget":
				op.limit, op.budget.limit = 4096, 1024
				values["CCG_TEST_MGMT_BODY_BYTES"] = "2048"
			case "truncated":
				op.limit = 4096
				values["CCG_TEST_MGMT_BODY_BYTES"] = "16"
				values["CCG_TEST_MGMT_META_HEADERS"] = `{"Content-Length":"2048"}`
			}
			runner, argsLog := managementTestRunner(t, values)
			auth := &resourceAuthorization{method: "api_key", header: http.Header{"X-Api-Key": {"spool-fixture-key"}}}
			ctx, cancel := context.WithTimeout(t.Context(), 5*time.Second)
			defer cancel()
			response, err := resourceManagementHTTP(ctx, runner, runner.Env, op, auth)
			require.ErrorContains(t, err, "resource response unavailable")
			assert.Nil(t, response)
			assert.Len(t, managementRecords(t, argsLog), 1)
			assertResourceSpoolReleased(t, op.dir, op.budget)
		})
	}
}
