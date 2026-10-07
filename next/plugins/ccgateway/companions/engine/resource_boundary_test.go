package engine

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"testing"
)

func TestResourceReferencesRequireExplicitOwnershipContract(t *testing.T) {
	for _, extra := range []Object{
		{"container": "container_other_tenant"},
		{"container": Object{"skills": []any{Object{"type": "custom", "skill_id": "skill_other_tenant", "version": "latest"}}}},
		{"mcp_servers": []any{Object{"type": "url", "name": "remote", "url": "https://example.invalid/mcp"}}},
		{"messages": []any{Object{"role": "user", "content": []any{Object{"type": "document", "source": Object{"type": "file", "file_id": "file_other_tenant"}}}}}},
	} {
		body := Object{"model": "claude-opus-5-5", "max_tokens": 16, "messages": []any{Object{"role": "user", "content": "fixture"}}}
		for key, value := range extra {
			body[key] = value
		}
		raw, _ := json.Marshal(body)
		r := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
		w := httptest.NewRecorder()
		(&Gateway{}).ServeHTTP(w, r)
		if w.Code != 400 {
			t.Fatalf("resource accepted without ownership service: %d %s", w.Code, w.Body.String())
		}
	}
	r := httptest.NewRequest("POST", "/v1/files", bytes.NewBufferString("multipart fixture"))
	r.Header.Set("Content-Type", "multipart/form-data; boundary=fixture")
	w := httptest.NewRecorder()
	(&Gateway{}).ServeHTTP(w, r)
	if w.Code != 404 {
		t.Fatalf("unknown Files endpoint should be explicit: %d", w.Code)
	}
}
