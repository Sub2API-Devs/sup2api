package engine

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRealCLIResourceMissingIssuerIsTypedWithoutProviderCall(t *testing.T) {
	if !resourceManagedTestProcess(t) {
		return
	}
	var calls atomic.Int32
	runner := resourceManagedTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.WriteHeader(500)
	})
	b := resourceManagedTestBroker(t, runner)
	for _, tc := range []struct{ name, issuer, generation string }{
		{"both_missing", "", ""}, {"missing_issuer", "", "1"}, {"missing_generation", "fixture", ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_ID": tc.issuer, "CCG_RESOURCE_ISSUER_GENERATION": tc.generation})
			for _, path := range []string{resources.IdentityPath, resourcePrefix + "/v1/files"} {
				req := httptest.NewRequestWithContext(t.Context(), "GET", path, nil)
				req.Header.Set("X-Api-Key", "worker-fixture")
				w := httptest.NewRecorder()
				b.ServeHTTP(w, req)
				var v struct {
					Error struct {
						Type string `json:"type"`
					} `json:"error"`
				}
				require.NoError(t, json.Unmarshal(w.Body.Bytes(), &v))
				assert.Equal(t, 503, w.Code, w.Body.String())
				assert.Equal(t, resources.IdentityUnsupportedErrorType, v.Error.Type)
				assert.Empty(t, w.Header().Get(resources.PrincipalHeader))
				assert.Empty(t, w.Header().Get(resources.GenerationHeader))
				assert.NotContains(t, w.Body.String(), "dummy-resource-fixture")
				assert.Zero(t, calls.Load(), "ineligible issuer attempted provider IO")
				assert.Empty(t, b.g.Slots)
				require.True(t, b.authority.mu.TryLock())
				b.authority.mu.Unlock()
			}
		})
	}
}
