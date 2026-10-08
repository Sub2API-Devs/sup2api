package gateway

import (
	"encoding/json"
	"fmt"
	diag "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/diagnostics"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestIdentityHeaderMultiplicityAcrossStatefulResponses(t *testing.T) {
	for _, path := range []string{"resource", "credit", "diagnostics"} {
		for _, stream := range []bool{false, true} {
			for _, header := range []string{resources.PrincipalHeader, resources.GenerationHeader} {
				t.Run(fmt.Sprintf("%s/%t/%s", path, stream, header), func(t *testing.T) {
					e, store, _ := resourceTestEnv(t)
					d := &memoryDiagnostics{rows: map[string]core.DiagnosticMessage{}}
					cr := &memoryCredits{rows: map[string]core.FallbackCredit{}}
					e.gw.d.Diagnostics = d
					e.gw.d.Credits = cr
					calls := 0
					up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
						calls++
						w.Header().Set(resources.PrincipalHeader, "synthetic_issuer")
						w.Header().Set(resources.GenerationHeader, "v1")
						w.Header().Add(header, "conflicting-second-value")
						w.Header().Set(diag.ReadyHeader, "1")
						msg := map[string]any{"id": "msg_identity_review", "type": "message", "role": "assistant", "model": testModel, "content": []any{}, "stop_reason": "end_turn", "usage": map[string]any{"input_tokens": 11, "output_tokens": 7}}
						if !stream {
							w.Header().Set("Content-Type", "application/json")
							json.NewEncoder(w).Encode(msg)
							return
						}
						w.Header().Set("Content-Type", "text/event-stream")
						msg["usage"] = map[string]any{"input_tokens": 11, "output_tokens": 0}
						msg["stop_reason"] = nil
						emit := func(o map[string]any) {
							raw, _ := json.Marshal(o)
							fmt.Fprintf(w, "event: %s\ndata: %s\n\n", o["type"], raw)
						}
						emit(map[string]any{"type": "message_start", "message": msg})
						emit(map[string]any{"type": "message_delta", "delta": map[string]any{"stop_reason": "end_turn"}, "usage": map[string]any{"output_tokens": 7}})
						emit(map[string]any{"type": "message_stop"})
					}))
					defer up.Close()
					e.plat.base = up.URL
					req := body(testModel, stream)
					beta := ""
					switch path {
					case "resource":
						req["tools"] = []any{map[string]any{"type": "code_execution_20250825", "name": "code_execution"}}
					case "credit":
						beta = "fallback-credit-2026-07-01"
					case "diagnostics":
						req["diagnostics"] = map[string]any{}
					}
					raw, _ := json.Marshal(req)
					status, _ := fileRequest(t, e, "POST", "/v1/messages", testKey, beta, raw, "application/json")
					if status < 400 || calls != 1 {
						t.Fatalf("ambiguous identity allowed or retried: status%d calls%d", status, calls)
					}
					if len(d.rows) != 0 || len(cr.rows) != 0 || len(store.rows) != 0 {
						t.Fatal("unverified response registered")
					}
					record := e.record()
					if record.Tokens.Input != 11 || record.Tokens.Output != 7 {
						t.Fatalf("usage lost %+v", record.Tokens)
					}
				})
			}
		}
	}
}
