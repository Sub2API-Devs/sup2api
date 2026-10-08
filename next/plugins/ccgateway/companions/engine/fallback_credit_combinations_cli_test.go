package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestRealCLIReviewCreditPromptCombinations(t *testing.T) {
	for _, mode := range []string{"ptc", "mcp", "ptc-sse"} {
		t.Run(mode, func(t *testing.T) {
			token := "isolated-credit-combination"
			hash, _ := credits.TokenHash(token)
			var calls atomic.Int32
			var original Object
			blocks := []Object{{"type": "text", "text": "partial refusal"}}
			if strings.HasPrefix(mode, "ptc") {
				blocks = []Object{{"type": "server_tool_use", "id": "srv_parent", "name": "code_execution", "input": Object{"code": "await tools.lookup({})"}}, {"type": "tool_use", "id": "child", "name": "mcp__ccgateway__lookup", "input": Object{}, "caller": Object{"type": "code_execution_20260120", "tool_id": "srv_parent"}}, {"type": "text", "text": "partial refusal"}}
			}
			endpoint, identity := executionGatewayFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				n := calls.Add(1)
				if _, exists := body["container"]; exists {
					t.Error("credit invented response container on retry")
				}
				if n == 1 {
					original = body
				} else {
					if mode == "mcp" && digest(body["mcp_servers"]) != digest(original["mcp_servers"]) {
						t.Error("MCP credential destination changed")
					}
					if digest(body["tools"]) != digest(original["tools"]) {
						t.Error("tools changed")
					}
					if str(body, "fallback_credit_token") != token {
						t.Error("token omitted")
					}
				}
				answer := Object{"id": "msg_combo", "type": "message", "role": "assistant", "model": body["model"], "content": blocks, "stop_reason": "refusal", "stop_details": Object{"type": "refusal", "explanation": "fixture", "fallback_credit_token": token, "fallback_has_prefill_claim": true}, "usage": Object{"input_tokens": 3, "output_tokens": 4}}
				if strings.HasPrefix(mode, "ptc") {
					answer["container"] = Object{"id": "container_response", "expires_at": "2026-10-09T00:00:00Z"}
				}
				if n > 1 {
					answer["content"] = []Object{{"type": "text", "text": "REDEEMED"}}
					answer["stop_reason"] = "end_turn"
					answer["stop_details"] = nil
				}
				if strings.HasSuffix(mode, "sse") {
					recorder := httptest.NewRecorder()
					writeSurfaceFixture(recorder, str(body, "model"), answer["content"].([]Object))
					w.Header().Set("Content-Type", "text/event-stream")
					for _, line := range strings.Split(recorder.Body.String(), "\n") {
						if !strings.HasPrefix(line, "data:") {
							continue
						}
						event, _ := decodeObject([]byte(strings.TrimSpace(strings.TrimPrefix(line, "data:"))))
						if str(event, "type") == "message_delta" {
							event["delta"].(Object)["stop_reason"] = answer["stop_reason"]
							event["delta"].(Object)["stop_details"] = answer["stop_details"]
						}
						if str(event, "type") == "message_start" {
							event["message"].(Object)["container"] = answer["container"]
						}
						encoded, _ := json.Marshal(event)
						fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), encoded)
					}
					return
				}
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(answer)
			})
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "messages": []any{Object{"role": "user", "content": "combination fixture"}}}
			body["stream"] = strings.HasSuffix(mode, "sse")
			betas := "fallback-credit-2026-07-01"
			if strings.HasPrefix(mode, "ptc") {
				body["tools"] = []any{Object{"type": "code_execution_20260120", "name": "code_execution"}, Object{"name": "lookup", "input_schema": Object{"type": "object"}, "allowed_callers": []any{"code_execution_20260120"}}}
			} else {
				body["mcp_servers"] = []any{Object{"type": "url", "name": "fixture", "url": "https://fixture.example.test/mcp", "authorization_token": "MCP_PRIVATE_CANARY"}}
				body["tools"] = []any{Object{"type": "mcp_toolset", "mcp_server_name": "fixture"}}
				betas += ",mcp-client-2025-11-20"
			}
			post := func(admission string) (int, []byte, http.Header) {
				raw, _ := json.Marshal(body)
				req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
				req.Header.Set("X-Api-Key", "worker-fixture")
				req.Header.Set("Anthropic-Beta", betas)
				req.Header.Set(credits.TrackingHeader, "1")
				req.Header.Set(credits.AdmissionHeader, admission)
				req.Header.Set(resources.PrincipalHeader, identity.PrincipalID)
				req.Header.Set(resources.GenerationHeader, identity.Generation)
				req.Header.Set(resources.ResourceOutputsHeader, "1")
				p := defaultRequestPolicy()
				p.ToolSearch = "false"
				encoded, _ := json.Marshal(p)
				req.Header.Set(policyHeader, string(encoded))
				res, err := http.DefaultClient.Do(req)
				if err != nil {
					t.Fatal(err)
				}
				out, _ := io.ReadAll(res.Body)
				res.Body.Close()
				return res.StatusCode, out, res.Header
			}
			status, raw, h := post("")
			if status != 200 || h.Get(credits.ReadyHeader) != hash {
				t.Fatalf("initial %d %s ready=%s", status, raw, h.Get(credits.ReadyHeader))
			}
			if strings.HasSuffix(mode, "sse") {
				var frames [][]byte
				for _, frame := range bytes.Split(raw, []byte("\n\n")) {
					if len(bytes.TrimSpace(frame)) > 0 {
						frames = append(frames, frame)
					}
				}
				rebuilt, err := credits.MessageFromEvents(frames)
				if err != nil {
					t.Fatal(err)
				}
				raw = rebuilt
			}
			answer, _ := decodeObject(raw)
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": answer["content"]})
			body["fallback_credit_token"] = token
			body["model"] = "claude-sonnet-4-6"
			status, _, _ = post("")
			if status != 400 || calls.Load() != 1 {
				t.Fatal("unverified token bypassed PTC context")
			}
			status, raw, _ = post(hash)
			if status != 200 || !bytes.Contains(raw, []byte("REDEEMED")) {
				t.Fatalf("redeem %d %s", status, raw)
			}
			if calls.Load() != 2 {
				t.Fatal("unexpected model retry", calls.Load())
			}
		})
	}
}
