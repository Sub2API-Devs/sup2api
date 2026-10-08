package gateway

import (
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	diag "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/diagnostics"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestReviewDiagnosticsFailureKeepsUsageAndRejectsFakeIdentity(t *testing.T) {
	for _, stream := range []bool{false, true} {
		for _, mode := range []string{"storage", "missing-ready", "multiple-issuer", "fake-message"} {
			t.Run(fmt.Sprintf("%s/%t", mode, stream), func(t *testing.T) {
				e, _, _ := resourceTestEnv(t)
				registry := &memoryDiagnostics{rows: map[string]core.DiagnosticMessage{}, fail: mode == "storage"}
				e.gw.d.Diagnostics = registry
				up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if mode != "missing-ready" {
						w.Header().Set(diag.ReadyHeader, "1")
					}
					w.Header().Set(resources.PrincipalHeader, "synthetic_issuer")
					w.Header().Set(resources.GenerationHeader, "v1")
					if mode == "multiple-issuer" {
						w.Header().Add(resources.PrincipalHeader, "another")
					}
					msg := map[string]any{"type": "message", "id": "msg_review_diagnostics", "role": "assistant", "model": testModel, "content": []any{}, "stop_reason": "end_turn", "usage": map[string]any{"input_tokens": 11, "output_tokens": 7}}
					if mode == "fake-message" {
						msg["role"] = "user"
					}
					if !stream {
						w.Header().Set("Content-Type", "application/json")
						json.NewEncoder(w).Encode(msg)
						return
					}
					w.Header().Set("Content-Type", "text/event-stream")
					msg["usage"] = map[string]any{"input_tokens": 11, "output_tokens": 0}
					msg["stop_reason"] = nil
					emit := func(e map[string]any) {
						b, _ := json.Marshal(e)
						fmt.Fprintf(w, "event: %s\ndata: %s\n\n", e["type"], b)
					}
					emit(map[string]any{"type": "message_start", "message": msg})
					emit(map[string]any{"type": "message_delta", "delta": map[string]any{"stop_reason": "end_turn"}, "usage": map[string]any{"output_tokens": 7}})
					emit(map[string]any{"type": "message_stop"})
				}))
				defer up.Close()
				e.plat.base = up.URL
				b := body(testModel, stream)
				b["diagnostics"] = map[string]any{}
				raw, _ := json.Marshal(b)
				status, _ := fileRequest(t, e, "POST", "/v1/messages", testKey, "", raw, "application/json")
				if status != 503 {
					t.Fatalf("unverified diagnostics HTTP%d", status)
				}
				if len(registry.rows) != 0 {
					t.Fatal("unverified response ID registered")
				}
				rec := e.record()
				if rec.Tokens.Input != 11 || rec.Tokens.Output != 7 {
					t.Fatalf("provider usage lost: %+v", rec.Tokens)
				}
			})
		}
	}
}

func TestReviewDiagnosticsStatefulBuffersAccountOnce(t *testing.T) {
	for _, stream := range []bool{false, true} {
		for _, mask := range []int{1, 2, 3} {
			for _, fail := range []bool{false, true} {
				t.Run(fmt.Sprintf("stream=%t/mask=%d/fail=%t", stream, mask, fail), func(t *testing.T) {
					e, _, _ := resourceTestEnv(t)
					d := &memoryDiagnostics{rows: map[string]core.DiagnosticMessage{}, fail: fail}
					cr := &memoryCredits{rows: map[string]core.FallbackCredit{}}
					e.gw.d.Diagnostics = d
					e.gw.d.Credits = cr
					token := "synthetic-diagnostics-combo-credit"
					hash, _ := credits.TokenHash(token)
					up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
						w.Header().Set(diag.ReadyHeader, "1")
						w.Header().Set(resources.PrincipalHeader, "synthetic_issuer")
						w.Header().Set(resources.GenerationHeader, "v1")
						if mask&1 != 0 {
							w.Header().Set(credits.ReadyHeader, hash)
						}
						msg := map[string]any{"id": "msg_combo", "type": "message", "role": "assistant", "model": testModel, "content": []any{map[string]any{"type": "text", "text": "refusal"}}, "stop_reason": "refusal", "usage": map[string]any{"input_tokens": 11, "output_tokens": 7}}
						if mask&1 != 0 {
							msg["stop_details"] = map[string]any{"fallback_credit_token": token, "fallback_has_prefill_claim": true}
						}
						if !stream {
							w.Header().Set("Content-Type", "application/json")
							json.NewEncoder(w).Encode(msg)
							return
						}
						w.Header().Set("Content-Type", "text/event-stream")
						emit := func(typ string, v map[string]any) {
							v["type"] = typ
							b, _ := json.Marshal(v)
							fmt.Fprintf(w, "event: %s\ndata: %s\n\n", typ, b)
						}
						start := map[string]any{"id": msg["id"], "type": "message", "role": "assistant", "model": testModel, "content": []any{}, "usage": map[string]any{"input_tokens": 11, "output_tokens": 0}}
						emit("message_start", map[string]any{"message": start})
						emit("content_block_start", map[string]any{"index": 0, "content_block": map[string]any{"type": "text", "text": ""}})
						emit("content_block_delta", map[string]any{"index": 0, "delta": map[string]any{"type": "text_delta", "text": "refusal"}})
						emit("content_block_stop", map[string]any{"index": 0})
						delta := map[string]any{"stop_reason": "refusal"}
						if mask&1 != 0 {
							delta["stop_details"] = msg["stop_details"]
						}
						emit("message_delta", map[string]any{"delta": delta, "usage": map[string]any{"output_tokens": 7}})
						emit("message_stop", map[string]any{})
					}))
					defer up.Close()
					e.plat.base = up.URL
					req := body(testModel, stream)
					req["diagnostics"] = map[string]any{}
					beta := ""
					if mask&1 != 0 {
						beta = "fallback-credit-2026-07-01"
					}
					if mask&2 != 0 {
						req["tools"] = []any{map[string]any{"type": "code_execution_20250825", "name": "code_execution"}}
					}
					raw, _ := json.Marshal(req)
					status, response := fileRequest(t, e, "POST", "/v1/messages", testKey, beta, raw, "application/json")
					rec := e.record()
					if rec.Tokens.Input != 11 || rec.Tokens.Output != 7 {
						t.Fatalf("stateful usage lost or counted twice: %+v", rec.Tokens)
					}
					if fail {
						if status != 503 || strings.Contains(string(response), token) || len(cr.rows) != 0 {
							t.Fatalf("failure exposed unregistered claim: %d %s", status, response)
						}
					} else {
						if status != 200 || !rec.Success || len(d.rows) != 1 {
							t.Fatalf("normal refusal changed: %d %s", status, response)
						}
						if mask&1 != 0 && len(cr.rows) != 1 {
							t.Fatal("credit lost after diagnostics replay")
						}
					}
				})
			}
		}
	}
}

func TestReviewDiagnosticsKeyRotationGroupAndExpiry(t *testing.T) {
	e, _, _ := resourceTestEnv(t)
	original := *e.auth.keys[testKey]
	rotated := original
	rotated.KeyID++
	e.auth.keys["rotated-key"] = &rotated
	foreign := original
	foreign.Group.ID++
	e.auth.keys["other-group"] = &foreign
	owner := original
	owner.UserID++
	e.auth.keys["other-user"] = &owner
	hash, _ := diag.Hash("msg_owned")
	row := core.DiagnosticMessage{IDHash: hash, Owner: core.ResourceOwner{UserID: original.UserID, GroupID: original.Group.ID}, Binding: core.ResourceBinding{AccountID: 1, PrincipalID: "synthetic_issuer", Generation: "v1"}, RetentionUntil: time.Now().Add(time.Hour)}
	store := &memoryDiagnostics{rows: map[string]core.DiagnosticMessage{hash: row}}
	e.gw.d.Diagnostics = store
	calls := 0
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Header.Get(diag.GrantHeader) != hash {
			t.Error("rotation lost previous grant")
		}
		w.Header().Set(diag.ReadyHeader, "1")
		w.Header().Set(resources.PrincipalHeader, "synthetic_issuer")
		w.Header().Set(resources.GenerationHeader, "v1")
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"id":"msg_rotated","type":"message","role":"assistant","model":%q,"content":[],"stop_reason":"end_turn","usage":{"input_tokens":1,"output_tokens":1}}`, testModel)
	}))
	defer up.Close()
	e.plat.base = up.URL
	request := body(testModel, false)
	request["diagnostics"] = map[string]any{"previous_message_id": "msg_owned"}
	raw, _ := json.Marshal(request)
	for _, key := range []string{"rotated-key", "other-group", "other-user"} {
		status, _ := fileRequest(t, e, "POST", "/v1/messages", key, "", raw, "application/json")
		want := 404
		if key == "rotated-key" {
			want = 200
		}
		if key == "other-group" {
			if status < 400 {
				t.Fatalf("cross-group accepted %d", status)
			}
		} else if status != want {
			t.Fatalf("key %s status%d", key, status)
		}
	}
	row.RetentionUntil = time.Now().Add(-time.Second)
	store.rows[hash] = row
	status, _ := fileRequest(t, e, "POST", "/v1/messages", testKey, "", raw, "application/json")
	if status != 404 || calls != 1 {
		t.Fatalf("expired ownership dispatched: %d calls%d", status, calls)
	}
}
