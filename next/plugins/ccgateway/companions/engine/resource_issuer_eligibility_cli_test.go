package engine

import (
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
)

func TestRealCLIResourceMissingIssuerIsTypedWithoutProviderCall(t *testing.T) {
	var calls atomic.Int32
	runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) { calls.Add(1); w.WriteHeader(500) })
	runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_ID": "", "CCG_RESOURCE_ISSUER_GENERATION": ""})
	g := &Gateway{Runner: runner, Key: "worker-fixture", Slots: make(chan struct{}, 1)}
	b, err := newResourceBroker(g, &authManager{}, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer b.lease.Close()
	req := httptest.NewRequest("GET", resources.IdentityPath, nil)
	req.Header.Set("X-Api-Key", "worker-fixture")
	w := httptest.NewRecorder()
	b.ServeHTTP(w, req)
	var v struct {
		Error struct {
			Type string `json:"type"`
		} `json:"error"`
	}
	json.Unmarshal(w.Body.Bytes(), &v)
	if w.Code != 503 || v.Error.Type != resources.IdentityUnsupportedErrorType || calls.Load() != 0 {
		t.Fatalf("missing issuer status%d type%s upstream%d", w.Code, v.Error.Type, calls.Load())
	}
}
