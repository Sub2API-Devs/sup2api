package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func (s *memoryResourceStore) RegisterObserved(_ context.Context, in core.ResourceObservation) (core.ProviderResource, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, r := range s.rows {
		if r.Kind == in.Kind && r.RemoteID == in.RemoteID && r.Binding == in.Binding {
			if r.Owner != in.Owner || r.State != "ready" {
				return r, core.ErrConflict
			}
			return r, nil
		}
	}
	id := fmt.Sprintf("%s_public_%d", in.Kind, len(s.rows)+1)
	r := core.ProviderResource{PublicID: id, PluginKey: in.PluginKey, Kind: in.Kind, RemoteID: in.RemoteID, Owner: in.Owner, Binding: in.Binding, Bytes: in.Bytes, Metadata: in.Metadata, State: "ready"}
	if in.ExpiresAt != nil {
		r.ExpiresAt = *in.ExpiresAt
	}
	s.rows[id] = r
	return r, nil
}
func (s *memoryResourceStore) BindContext(_ context.Context, in core.ResourceContext) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	r := s.rows[in.ResourceID]
	if r.Owner != in.Owner || r.Binding != in.Binding || r.Kind != "container" {
		return core.ErrNotFound
	}
	return nil
}
func responseOutputFixture(expiry string) map[string]any {
	return map[string]any{"id": "msg_resource", "type": "message", "role": "assistant", "model": testModel, "container": map[string]any{"id": "container_remote", "expires_at": expiry}, "content": []any{map[string]any{"type": "bash_code_execution_tool_result", "tool_use_id": "srv_x", "content": map[string]any{"type": "bash_code_execution_result", "stdout": "opaque file_provider_secret", "stderr": "", "return_code": 0, "content": []any{map[string]any{"type": "bash_code_execution_output", "file_id": "file_provider_secret"}}}}}, "stop_reason": "end_turn", "usage": map[string]any{"input_tokens": 11, "output_tokens": 7}}
}
func TestResourceOutputsHTTPRegistrationAndFailure(t *testing.T) {
	for _, mode := range []string{"json", "sse", "metadata-error", "issuer", "partial"} {
		t.Run(mode, func(t *testing.T) {
			e, s, tr := resourceTestEnv(t)
			tr.fn = func(r *http.Request) (*http.Response, error) {
				if strings.HasSuffix(r.URL.Path, "/content") {
					return resourceTestResponse(200, "abc"), nil
				}
				if mode == "metadata-error" {
					return resourceTestResponse(500, `{"error":{}}`), nil
				}
				res := resourceTestResponse(200, fileTestMetadata())
				res.Header.Set(resources.PrincipalHeader, "synthetic_issuer")
				res.Header.Set(resources.GenerationHeader, "v1")
				return res, nil
			}
			fixture := responseOutputFixture(time.Now().Add(time.Hour).UTC().Format(time.RFC3339))
			up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set(resources.PrincipalHeader, "synthetic_issuer")
				w.Header().Set(resources.GenerationHeader, "v1")
				if mode == "issuer" {
					w.Header().Set(resources.GenerationHeader, "other")
				}
				if mode != "sse" && mode != "partial" {
					w.Header().Set("Content-Type", "application/json")
					json.NewEncoder(w).Encode(fixture)
					return
				}
				w.Header().Set("Content-Type", "text/event-stream")
				emit := func(kind string, v map[string]any) {
					v["type"] = kind
					raw, _ := json.Marshal(v)
					fmt.Fprintf(w, "event: %s\ndata: %s\n\n", kind, raw)
				}
				emit("message_start", map[string]any{"message": map[string]any{"id": "msg_resource", "model": testModel, "role": "assistant", "content": []any{}, "usage": fixture["usage"]}})
				emit("content_block_start", map[string]any{"index": 0, "content_block": fixture["content"].([]any)[0]})
				emit("content_block_stop", map[string]any{"index": 0})
				emit("message_delta", map[string]any{"delta": map[string]any{"stop_reason": "end_turn", "container": fixture["container"]}, "usage": map[string]any{"output_tokens": 7}})
				if mode != "partial" {
					emit("message_stop", map[string]any{})
				}
			}))
			defer up.Close()
			e.plat.base = up.URL
			request := body(testModel, mode == "sse" || mode == "partial")
			request["tools"] = []any{map[string]any{"type": "code_execution_20260120", "name": "code_execution"}}
			result := e.messages(request)
			rec := e.record()
			if rec.Tokens.Input != 11 || rec.Tokens.Output != 7 {
				t.Fatalf("usage lost %+v", rec.Tokens)
			}
			if mode == "metadata-error" || mode == "issuer" || mode == "partial" {
				if result.status != 502 || strings.Contains(string(result.body), "file_provider_secret") {
					t.Fatalf("failure %d %s", result.status, result.body)
				}
				if mode == "metadata-error" {
					found := false
					for _, row := range s.rows {
						found = found || row.State == "uncertain"
					}
					if !found {
						t.Fatal("missing reconciliation")
					}
				}
				return
			}
			if result.status != 200 || !rec.Success {
				t.Fatalf("%d %s", result.status, result.body)
			}
			fileID, containerID := "", ""
			for id, row := range s.rows {
				if row.Kind == "file" {
					fileID = id
				} else if row.Kind == "container" {
					containerID = id
				}
			}
			if fileID == "" || containerID == "" || !strings.Contains(string(result.body), fileID) || !strings.Contains(string(result.body), containerID) {
				t.Fatalf("missing public outputs %s", result.body)
			}
			if mode == "json" && gjson.GetBytes(result.body, "content.0.content.stdout").String() != "opaque file_provider_secret" {
				t.Fatal("opaque text rewritten")
			}
			result = e.messages(request)
			e.record()
			if result.status != 200 || len(s.rows) != 2 {
				t.Fatalf("observation not idempotent %s", result.body)
			}
			if mode == "json" {
				status, downloaded := fileRequest(t, e, "GET", "/v1/files/"+fileID+"/content", testKey, "", nil, "")
				if status != 200 || string(downloaded) != "abc" {
					t.Fatalf("generated file download: %d %s", status, downloaded)
				}
				p := *e.auth.keys[testKey]
				p.KeyID++
				e.auth.keys["resource-rotated-key"] = &p
				follow := fileReferenceBody(fileID)
				follow["tools"] = request["tools"]
				encoded, _ := json.Marshal(follow)
				status, next := fileRequest(t, e, "POST", "/v1/messages", "resource-rotated-key", "", encoded, "application/json")
				e.record()
				if status != 200 || !strings.Contains(string(next), fileID) {
					t.Fatalf("rotated owner continuation %d %s", status, next)
				}
			}
		})
	}
}

type closeObservedBody struct {
	*strings.Reader
	closed *bool
}

func (b closeObservedBody) Close() error { *b.closed = true; return nil }
func TestResourceOutputsClosesWorkerBeforeMetadata(t *testing.T) {
	e, _, tr := resourceTestEnv(t)
	closed := false
	tr.fn = func(r *http.Request) (*http.Response, error) {
		if !closed {
			t.Fatal("metadata GET attempted while Worker issuer lock still held")
		}
		res := resourceTestResponse(200, fileTestMetadata())
		res.Header.Set(resources.PrincipalHeader, "synthetic_issuer")
		res.Header.Set(resources.GenerationHeader, "v1")
		return res, nil
	}
	raw, _ := json.Marshal(responseOutputFixture(time.Now().Add(time.Hour).UTC().Format(time.RFC3339)))
	recorder := httptest.NewRecorder()
	gc, _ := gin.CreateTestContext(recorder)
	call := &call{g: e.gw, c: gc, principal: e.auth.keys[testKey], rid: "close-order", rec: &core.UsageRecord{}, start: time.Now(), resourceAccess: &modelResourceAccess{binding: core.ResourceBinding{AccountID: 1, PrincipalID: "synthetic_issuer", Generation: "v1"}, outputs: true, dispatchedAt: time.Now()}}
	resp := resourceTestResponse(200, string(raw))
	resp.Body = closeObservedBody{strings.NewReader(string(raw)), &closed}
	resp.Header.Set(resources.PrincipalHeader, "synthetic_issuer")
	resp.Header.Set(resources.GenerationHeader, "v1")
	rt := &typeRoute{}
	if err := call.forwardResourceResponse(context.Background(), rt, resp, newUsageAcc(rt.usage), nil); err != nil {
		t.Fatal(err)
	}
	if !closed || recorder.Code != 200 {
		t.Fatal("response not closed/emitted")
	}
}

type outputContextStore struct {
	*memoryResourceStore
	contexts map[string]core.ResourceContext
}

func (s *outputContextStore) BindContext(ctx context.Context, in core.ResourceContext) error {
	if err := s.memoryResourceStore.BindContext(ctx, in); err != nil {
		return err
	}
	if old, ok := s.contexts[in.ParentID]; ok && old != in {
		return core.ErrConflict
	}
	s.contexts[in.ParentID] = in
	return nil
}
func (s *outputContextStore) ResolveContext(ctx context.Context, in core.ResourceContext) (core.ProviderResource, error) {
	saved, ok := s.contexts[in.ParentID]
	if !ok || saved.Owner != in.Owner || saved.Binding != in.Binding {
		return core.ProviderResource{}, core.ErrNotFound
	}
	return s.Get(ctx, in.Owner, saved.ResourceID)
}
func TestResourceOutputsProgrammaticBinding(t *testing.T) {
	e, m, _ := resourceTestEnv(t)
	s := &outputContextStore{memoryResourceStore: m, contexts: map[string]core.ResourceContext{}}
	e.gw.d.Resources = s
	fixture := responseOutputFixture(time.Now().Add(time.Hour).UTC().Format(time.RFC3339))
	fixture["stop_reason"] = "tool_use"
	fixture["content"] = []any{
		map[string]any{"type": "server_tool_use", "id": "srv_parent", "name": "code_execution", "input": map[string]any{}},
		map[string]any{"type": "tool_use", "id": "child", "name": "lookup", "input": map[string]any{}, "caller": map[string]any{"type": "code_execution_20260120", "tool_id": "srv_parent"}},
	}
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set(resources.PrincipalHeader, "synthetic_issuer")
		w.Header().Set(resources.GenerationHeader, "v1")
		json.NewEncoder(w).Encode(fixture)
	}))
	defer up.Close()
	e.plat.base = up.URL
	request := body(testModel, false)
	request["tools"] = []any{map[string]any{"type": "code_execution_20260120", "name": "code_execution"}, map[string]any{"name": "lookup", "input_schema": map[string]any{"type": "object"}, "allowed_callers": []string{"code_execution_20260120"}}}
	result := e.messages(request)
	e.record()
	if result.status != 200 {
		t.Fatalf("%d %s", result.status, result.body)
	}
	bound, ok := s.contexts["srv_parent"]
	if !ok || bound.ResourceID == "container_remote" {
		t.Fatal("PTC binding missing/public ID required")
	}
	container := gjson.GetBytes(result.body, "container.id").String()
	if bound.ResourceID != container {
		t.Fatal("PTC bound different container")
	}
	request["container"] = container
	request["messages"] = []any{map[string]any{"role": "user", "content": "first"}, map[string]any{"role": "assistant", "content": fixture["content"]}, map[string]any{"role": "user", "content": []any{map[string]any{"type": "tool_result", "tool_use_id": "child", "content": "ok"}}}}
	fixture["content"] = []any{map[string]any{"type": "text", "text": "continued"}}
	fixture["stop_reason"] = "end_turn"
	result = e.messages(request)
	e.record()
	if result.status != 200 {
		t.Fatalf("bound continuation %d %s", result.status, result.body)
	}
}
