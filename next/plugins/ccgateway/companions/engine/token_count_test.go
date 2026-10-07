package engine

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestTokenCountAdmissionAndExactUpstreamProjection(t *testing.T) {
	original := Object{"model": "fixture", "messages": []any{Object{"role": "user", "content": "count"}}, "thinking": Object{"type": "enabled", "budget_tokens": 4096}, "output_config": Object{"effort": "high"}}
	raw, _ := json.Marshal(original)
	req, err := parseTokenCountRequest(raw, http.Header{})
	if err != nil {
		t.Fatal(err)
	}
	if !req.CountTokens || !bytes.Equal(req.Plan.RawRequest(), raw) {
		t.Fatal("count not marked or raw request changed")
	}
	for _, field := range []string{"max_tokens", "stream", "temperature", "metadata", "service_tier", "output_format"} {
		body := Object{}
		for key, value := range original {
			body[key] = value
		}
		body[field] = 1
		data, _ := json.Marshal(body)
		if _, err := parseTokenCountRequest(data, http.Header{}); err == nil {
			t.Fatalf("unsupported count parameter %s silently accepted", field)
		}
	}
	scope := newMainRequestScope()
	if err := scope.enter(); err != nil {
		t.Fatal(err)
	}
	relay := &outboundRelay{scope: scope}
	body := scopedFixture(scope)
	body["metadata"] = Object{"user_id": "inner"}
	body["max_tokens"] = 128
	body["stream"] = true
	data, _ := json.Marshal(body)
	r := httptest.NewRequest("POST", "http://fixture/v1/messages?beta=true", bytes.NewReader(data))
	w := httptest.NewRecorder()
	if !relay.adaptRequest(w, r, req, nil, true, false) {
		t.Fatal(w.Body.String())
	}
	if r.URL.Path != "/v1/messages/count_tokens" || r.URL.RawQuery != "beta=true" {
		t.Fatal("count route changed target/query", r.URL)
	}
	data, _ = io.ReadAll(r.Body)
	if !bytes.Equal(data, raw) {
		t.Fatalf("standard count must measure raw client input, got %s", data)
	}
	wire, _ := decodeObject(data)
	if wire["max_tokens"] != nil || wire["stream"] != nil || wire["metadata"] != nil || wire["thinking"] == nil || wire["output_config"] == nil {
		t.Fatal("wrong count API body", wire)
	}
}

func TestTokenCountNeverForwardsAuxiliaryGeneration(t *testing.T) {
	raw := []byte(`{"model":"fixture","messages":[{"role":"user","content":"count"}]}`)
	req, err := parseTokenCountRequest(raw, http.Header{})
	if err != nil {
		t.Fatal(err)
	}
	relay := &outboundRelay{scope: newMainRequestScope()}
	r := httptest.NewRequest("POST", "http://fixture/v1/messages", bytes.NewReader(raw))
	w := httptest.NewRecorder()
	if relay.adaptRequest(w, r, req, nil, true, false) || relay.Failure() == nil || !relay.isStopped() {
		t.Fatal("unattributed cloud generation escaped count mode")
	}
}
