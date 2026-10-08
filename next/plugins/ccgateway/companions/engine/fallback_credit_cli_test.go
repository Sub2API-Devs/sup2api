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

func TestRealCLIFallbackCreditWireBinding(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprintf("stream-%v", stream), func(t *testing.T) {
			token := "synthetic-credit-fixture"
			hash, _ := credits.TokenHash(token)
			var calls atomic.Int32
			var original Object
			endpoint, identity := executionGatewayFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, err := decodeObject(raw)
				if err != nil {
					t.Error(err)
					return
				}
				n := calls.Add(1)
				for _, name := range []string{credits.TrackingHeader, credits.AdmissionHeader, credits.ReadyHeader} {
					if r.Header.Get(name) != "" {
						t.Error("private capability leaked")
					}
				}
				if n == 1 {
					original = body
				} else {
					if str(body, "fallback_credit_token") != token || str(body, "model") != "claude-sonnet-4-6" {
						t.Error("redemption model/token lost")
					}
					if digest(body["system"]) != digest(original["system"]) || digest(body["tools"]) != digest(original["tools"]) {
						t.Error("original model wire prompt replaced")
					}
					messages := body["messages"].([]any)
					base := original["messages"].([]any)
					if digest(messages[:len(base)]) != digest(base) {
						t.Error("original history changed")
					}
					if bytes.Contains(raw, []byte("ccgateway-continuation-")) {
						t.Error("transport leaked")
					}
				}
				if n == 1 && body["stream"] != stream {
					t.Error("stream flag changed")
				}
				blocks := []Object{{"type": "text", "text": "partial refusal "}}
				reason := "refusal"
				var details any = Object{"type": "refusal", "category": "other", "explanation": "synthetic", "fallback_credit_token": token, "fallback_has_prefill_claim": true}
				if n > 1 {
					blocks = []Object{{"type": "text", "text": "REDEEMED"}}
					reason = "end_turn"
					details = nil
				}
				if body["stream"] != true {
					w.Header().Set("Content-Type", "application/json")
					json.NewEncoder(w).Encode(Object{"id": "msg_credit", "type": "message", "role": "assistant", "model": body["model"], "content": blocks, "stop_reason": reason, "stop_details": details, "stop_sequence": nil, "usage": Object{"input_tokens": 3, "output_tokens": 4}})
					return
				}
				recorder := httptest.NewRecorder()
				writeSurfaceFixture(recorder, str(body, "model"), blocks)
				w.Header().Set("Content-Type", "text/event-stream")
				for _, line := range strings.Split(recorder.Body.String(), "\n") {
					if !strings.HasPrefix(line, "data:") {
						continue
					}
					e, _ := decodeObject([]byte(strings.TrimSpace(strings.TrimPrefix(line, "data:"))))
					if str(e, "type") == "message_delta" {
						e["delta"].(Object)["stop_reason"] = reason
						e["delta"].(Object)["stop_details"] = details
					}
					data, _ := json.Marshal(e)
					fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(e, "type"), data)
				}
			})
			base := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "system": "CLIENT_CREDIT_SYSTEM", "tools": []any{Object{"name": "credit_lookup", "description": "client-owned lookup", "input_schema": Object{"type": "object", "properties": Object{"id": Object{"type": "integer"}}}}}, "messages": []any{Object{"role": "user", "content": "credit fixture"}}}
			post := func(body Object, admission string) (int, []byte, http.Header) {
				raw, _ := json.Marshal(body)
				req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
				req.Header.Set("X-Api-Key", "worker-fixture")
				req.Header.Set("Anthropic-Beta", "fallback-credit-2026-07-01")
				req.Header.Set(credits.TrackingHeader, "1")
				req.Header.Set(resources.PrincipalHeader, identity.PrincipalID)
				req.Header.Set(resources.GenerationHeader, identity.Generation)
				if admission != "" {
					req.Header.Set(credits.AdmissionHeader, admission)
				}
				p := defaultRequestPolicy()
				p.ToolSearch = "false"
				policy, _ := json.Marshal(p)
				req.Header.Set(policyHeader, string(policy))
				response, err := http.DefaultClient.Do(req)
				if err != nil {
					t.Fatal(err)
				}
				defer response.Body.Close()
				out, _ := io.ReadAll(response.Body)
				return response.StatusCode, out, response.Header
			}
			status, out, h := post(base, "")
			if status != 200 || h.Get(credits.ReadyHeader) != hash || !bytes.Contains(out, []byte(token)) {
				t.Fatalf("source HTTP%d ready=%v %s", status, h.Get(credits.ReadyHeader) != "", out)
			}
			for index, echo := range []bool{false, true, false} {
				raw, _ := json.Marshal(base)
				body, _ := decodeObject(raw)
				body["model"] = "claude-sonnet-4-6"
				body["fallback_credit_token"] = token
				body["max_tokens"] = 256
				if index == 2 {
					body["stream"] = !stream
					body["temperature"] = 0.2
					body["metadata"] = Object{"user_id": "changed-at-redemption"}
				}
				if echo {
					body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": []any{Object{"type": "text", "text": "partial refusal"}}})
				}
				status, out, _ = post(body, hash)
				if status != 200 || !bytes.Contains(out, []byte("REDEEMED")) {
					t.Fatalf("redeem echo=%v HTTP%d %s", echo, status, out)
				}
			}
			badRaw, _ := json.Marshal(base)
			bad, _ := decodeObject(badRaw)
			bad["fallback_credit_token"] = token
			bad["system"] = "changed"
			before := calls.Load()
			status, _, _ = post(bad, hash)
			if status != 400 || calls.Load() != before {
				t.Fatal("changed prompt reached provider")
			}
			if calls.Load() != 4 {
				t.Fatalf("unexpected retries: %d", calls.Load())
			}
		})
	}
}
