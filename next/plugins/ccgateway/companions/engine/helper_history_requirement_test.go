package engine

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestNativeDoesNotExposeHelperRequirementEndpoint(t *testing.T) {
	for _, method := range []string{http.MethodGet, http.MethodPost} {
		r := httptest.NewRequest(method, helperhistory.RequirementPath, nil)
		r.Header.Set("x-api-key", "fixture")
		w := httptest.NewRecorder()
		// No Runner or slots: the removed planning route must never execute.
		g := &Gateway{Key: "fixture"}
		g.ServeHTTP(w, r)
		if w.Code != http.StatusNotFound {
			t.Fatalf("removed helper endpoint remains reachable: %d", w.Code)
		}
	}
}
