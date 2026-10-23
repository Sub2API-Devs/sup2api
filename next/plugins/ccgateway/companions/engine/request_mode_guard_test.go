package engine

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

func TestRequestModeAndVersionMismatchNeverStartsCLI(t *testing.T) {
	for _, policy := range []string{`{"relay_mode":"build","cli_version":"2.1.302"}`, `{"relay_mode":"direct","cli_version":"2.1.296"}`} {
		g := &Gateway{RequestMode: "direct", Key: "test-key", Runner: &Runner{CLI: "must-not-start", Version: "2.1.302"}}
		req := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{}`))
		req.Header.Set("x-api-key", "test-key")
		req.Header.Set(features.PolicyHeader, policy)
		out := httptest.NewRecorder()
		g.ServeHTTP(out, req)
		if out.Code != 409 || !strings.Contains(out.Body.String(), "configuration_error") {
			t.Fatalf("%d %s", out.Code, out.Body.String())
		}
	}
}
