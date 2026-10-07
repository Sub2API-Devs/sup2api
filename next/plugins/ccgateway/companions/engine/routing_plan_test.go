package engine

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestInferenceGeoAppliesToMainAndAuxiliaryWithoutGenerationControls(t *testing.T) {
	for _, geo := range []any{"us", "global", nil} {
		body := Object{"model": "fixture", "max_tokens": 100, "messages": []any{Object{"role": "user", "content": "client"}}, "inference_geo": geo, "service_tier": "standard_only", "temperature": 0.25}
		raw, _ := json.Marshal(body)
		req, err := parsePolicyRequest(raw, http.Header{})
		if err != nil {
			t.Fatal(err)
		}
		for _, main := range []bool{true, false} {
			scope := newMainRequestScope()
			scope.enter()
			relay := &outboundRelay{scope: scope}
			wire := Object{"model": "fixture", "messages": []any{Object{"role": "user", "content": "classifier with client content"}}}
			if main {
				wire = scopedFixture(scope)
			}
			data, _ := json.Marshal(wire)
			r := httptest.NewRequest("POST", "http://fixture/v1/messages", bytes.NewReader(data))
			w := httptest.NewRecorder()
			if !relay.adaptRequest(w, r, req, nil, true, false) {
				t.Fatal(w.Body.String())
			}
			data, _ = io.ReadAll(r.Body)
			got, _ := decodeObject(data)
			if value, exists := got["inference_geo"]; !exists || value != geo {
				t.Fatalf("geo lost main=%v: %v", main, got)
			}
			if !main && (got["service_tier"] != nil || got["temperature"] != nil || got["max_tokens"] != nil) {
				t.Fatal("auxiliary received main controls")
			}
		}
		if _, err := startOutboundRelay(req, []string{"CLAUDE_CODE_USE_BEDROCK=1"}); err == nil {
			t.Fatal("provider geography silently remapped")
		}
	}
}

func TestInferenceGeoDoesNotLeakThroughAuxiliaryCountOrChangeAbsentDefault(t *testing.T) {
	base := []byte(`{"model":"fixture","max_tokens":1,"messages":[{"role":"user","content":"x"}],"inference_geo":"us"}`)
	request, err := parsePolicyRequest(base, http.Header{})
	if err != nil {
		t.Fatal(err)
	}
	relay := &outboundRelay{path: "/relay"}
	called := false
	h := relay.handler(request, http.HandlerFunc(func(http.ResponseWriter, *http.Request) { called = true }))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("POST", "http://fixture/relay/v1/messages/count_tokens", bytes.NewReader(base)))
	if called || w.Code != 400 {
		t.Fatal("count cannot carry geo but was forwarded")
	}
	plain := &Request{}
	raw := []byte(`{"inference_geo":"workspace-default"}`)
	out, _ := plain.applyInferenceGeo(raw)
	if !bytes.Equal(out, raw) {
		t.Fatal("absent client geo changed defaults")
	}
	for _, geo := range []any{"eu", 1, Object{"region": "us"}, []any{"us"}} {
		if validateGenerationField("inference_geo", geo) == nil {
			t.Fatal("invalid geo accepted", geo)
		}
	}
}
