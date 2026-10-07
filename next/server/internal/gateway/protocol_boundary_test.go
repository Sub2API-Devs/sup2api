package gateway

import (
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
	"testing"
)

func TestUnregisteredOpenAIProtocolNeverReachesAnthropicAccount(t *testing.T) {
	for _, path := range []string{"/v1/chat/completions", "/v1/responses"} {
		t.Run(path, func(t *testing.T) {
			e := newEnv(t)
			e.gw.conv = convert.NewRegistry()
			b := map[string]any{"model": testModel, "messages": []any{map[string]any{"role": "user", "content": "fixture"}}}
			if path == "/v1/responses" {
				delete(b, "messages")
				b["input"] = "fixture"
			}
			res := e.do(path, b, map[string]string{"Authorization": "Bearer " + testKey})
			if res.status == 200 || len(e.up.keys()) != 0 {
				t.Fatalf("unregistered protocol accidentally forwarded: %d %v", res.status, e.up.keys())
			}
		})
	}
}
