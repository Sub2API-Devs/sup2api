package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	diag "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/diagnostics"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

type memoryDiagnostics struct {
	mu   sync.Mutex
	rows map[string]core.DiagnosticMessage
	fail bool
}

func (m *memoryDiagnostics) Record(_ context.Context, r core.DiagnosticMessage) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.fail {
		return core.ErrUnavailable
	}
	r.RetentionUntil = time.Now().Add(time.Hour)
	m.rows[r.IDHash] = r
	return nil
}
func (m *memoryDiagnostics) LookupOwned(_ context.Context, o core.ResourceOwner, h string) (core.DiagnosticMessage, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	r, ok := m.rows[h]
	if !ok || r.Owner != o {
		return r, core.ErrNotFound
	}
	return r, nil
}
func TestDiagnosticsHTTPColdBindingJSONAndSSE(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			e, _, transport := resourceTestEnv(t)
			registry := &memoryDiagnostics{rows: map[string]core.DiagnosticMessage{}}
			e.gw.d.Diagnostics = registry
			calls := 0
			up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls++
				var raw json.RawMessage
				json.NewDecoder(r.Body).Decode(&raw)
				if r.Header.Get(diag.TrackingHeader) != "1" {
					t.Error("missing tracker")
				}
				if calls > 1 {
					hash, _ := diag.Hash("msg_diag_one")
					if r.Header.Get(diag.GrantHeader) != hash || r.Header.Get("X-Api-Key") != "acc-1" {
						t.Error("cold request lost ownership binding")
					}
				}
				w.Header().Set(diag.ReadyHeader, "1")
				w.Header().Set(resources.PrincipalHeader, "synthetic_issuer")
				w.Header().Set(resources.GenerationHeader, "v1")
				msg := map[string]any{"id": "msg_diag_one", "type": "message", "role": "assistant", "model": testModel, "content": []any{}, "stop_reason": "end_turn", "usage": map[string]any{"input_tokens": 1, "output_tokens": 0}, "diagnostics": map[string]any{"cache_miss_reason": map[string]any{"type": "previous_message_not_found"}}}
				if !stream {
					w.Header().Set("Content-Type", "application/json")
					json.NewEncoder(w).Encode(msg)
					return
				}
				w.Header().Set("Content-Type", "text/event-stream")
				b, _ := json.Marshal(map[string]any{"type": "message_start", "message": msg})
				fmt.Fprintf(w, "event: message_start\ndata: %s\n\nevent: message_stop\ndata: {\"type\":\"message_stop\"}\n\n", b)
			}))
			defer up.Close()
			e.plat.base = up.URL
			request := body(testModel, stream)
			request["diagnostics"] = map[string]any{"previous_message_id": nil}
			for i := 0; i < 2; i++ {
				raw, _ := json.Marshal(request)
				status, response := fileRequest(t, e, "POST", "/v1/messages", testKey, "", raw, "application/json")
				if status != 200 {
					t.Fatalf("round%d %d %s", i, status, response)
				}
				request["diagnostics"] = map[string]any{"previous_message_id": "msg_diag_one"}
			}
			if len(registry.rows) != 1 || calls != 2 {
				t.Fatal("missing persistent identity")
			}
			// Changing the actual issuer must not use the prior grant.
			transport.generation = "changed"
			raw, _ := json.Marshal(request)
			status, _ := fileRequest(t, e, "POST", "/v1/messages", testKey, "", raw, "application/json")
			if status < 400 || calls != 2 {
				t.Fatal("identity migration leaked prior ID")
			}
			request["diagnostics"] = map[string]any{"previous_message_id": "unknown"}
			raw, _ = json.Marshal(request)
			status, _ = fileRequest(t, e, "POST", "/v1/messages", testKey, "", raw, "application/json")
			if status != 404 || calls != 2 {
				t.Fatal("unknown ID bypassed registry")
			}
		})
	}
}
func TestDiagnosticsHTTPOwnerStorageAndLegacyWorkerBoundaries(t *testing.T) {
	for _, mode := range []string{"other-owner", "store-failure", "old-worker", "non-cc"} {
		t.Run(mode, func(t *testing.T) {
			e, _, _ := resourceTestEnv(t)
			if mode == "non-cc" {
				e = newEnv(t)
				e.gw.d.ResourceTransport = forbiddenCreditIdentity{}
			}
			registry := &memoryDiagnostics{rows: map[string]core.DiagnosticMessage{}, fail: mode == "store-failure"}
			e.gw.d.Diagnostics = registry
			request := body(testModel, false)
			request["diagnostics"] = map[string]any{"previous_message_id": nil}
			if mode == "other-owner" || mode == "non-cc" {
				request["diagnostics"] = map[string]any{"previous_message_id": "msg_other"}
			}
			if mode == "other-owner" {
				h, _ := diag.Hash("msg_other")
				p := e.auth.keys[testKey]
				registry.rows[h] = core.DiagnosticMessage{IDHash: h, Owner: core.ResourceOwner{UserID: p.UserID + 1, GroupID: p.Group.ID}, Binding: core.ResourceBinding{AccountID: 1, PrincipalID: "synthetic_issuer", Generation: "v1"}}
			}
			calls := 0
			up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls++
				if mode == "non-cc" && r.Header.Get(diag.TrackingHeader) != "" {
					t.Error("private grant leaked")
				}
				w.Header().Set("Content-Type", "application/json")
				if mode != "old-worker" {
					w.Header().Set(diag.ReadyHeader, "1")
				}
				w.Header().Set(resources.PrincipalHeader, "synthetic_issuer")
				w.Header().Set(resources.GenerationHeader, "v1")
				fmt.Fprintf(w, `{"id":"msg_new","type":"message","role":"assistant","model":%q,"content":[],"stop_reason":"end_turn","usage":{"input_tokens":1,"output_tokens":0}}`, testModel)
			}))
			defer up.Close()
			e.plat.base = up.URL
			raw, _ := json.Marshal(request)
			status, response := fileRequest(t, e, "POST", "/v1/messages", testKey, "", raw, "application/json")
			want := 503
			if mode == "other-owner" {
				want = 404
				if calls != 0 {
					t.Fatal("cross-owner sent")
				}
			}
			if mode == "non-cc" {
				want = 200
			}
			if status != want {
				t.Fatalf("%d want%d %s", status, want, response)
			}
		})
	}
}
