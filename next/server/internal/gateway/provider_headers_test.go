package gateway

import (
	"fmt"
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestProviderErrorHeadersReachHTTPClient(t *testing.T) {
	for _, status := range []int{400, 429, 529} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			e := newEnv(t)
			up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Request-Id", "provider-id")
				w.Header().Set("Retry-After", "7")
				w.Header().Set("Anthropic-Ratelimit-Requests-Remaining", "0")
				w.Header().Set("Set-Cookie", "private")
				w.Header().Set("Authorization", "private")
				w.WriteHeader(status)
				fmt.Fprint(w, `{"type":"error","error":{"type":"fixture","message":"original"}}`)
			}))
			defer up.Close()
			e.plat.base = up.URL
			e.plat.classifyHook = func(_ *pluginv1.ClassifyErrorRequest, out *pluginv1.ClassifyErrorResponse) {
				out.Action = pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT
				out.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED
			}
			res := e.do("/v1/messages", body(testModel, false), map[string]string{"request-id": "caller-forged", "retry-after": "999"})
			if res.status != status || res.header.Get("Request-Id") != "provider-id" || res.header.Get("Retry-After") != "7" || res.header.Get("Anthropic-Ratelimit-Requests-Remaining") != "0" {
				t.Fatalf("provider headers lost: %d %v %s", res.status, res.header, res.body)
			}
			if res.header.Get("Set-Cookie") != "" || res.header.Get("Authorization") != "" {
				t.Fatal("upstream credential leaked")
			}
			e.record()
		})
	}
}
