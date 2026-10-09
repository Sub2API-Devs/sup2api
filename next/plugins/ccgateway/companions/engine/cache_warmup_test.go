package engine

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestCacheWarmupBridgeRejectsMalformedAndPreservesUpstreamError(t *testing.T) {
	for _, body := range []string{`{}`, `{"id":"msg","type":"message","role":"assistant","content":[],"stop_reason":"max_tokens","usage":{"output_tokens":1}}`, `{"id":"msg","type":"message","role":"assistant","content":[{"type":"text","text":"unexpected"}],"stop_reason":"max_tokens","usage":{"output_tokens":0}}`} {
		r := &outboundRelay{}
		res := &http.Response{StatusCode: 200, Header: http.Header{"Content-Type": []string{"application/json"}}, Body: io.NopCloser(strings.NewReader(body)), Request: httptest.NewRequest("POST", "http://fixture/v1/messages", nil)}
		if err := r.bridgeWarmupResponse(res); err == nil || r.Failure() == nil {
			t.Fatal("malformed warm-up accepted")
		}
		if _, err := r.completedWarmup(); err == nil {
			t.Fatal("failed response became completion")
		}
	}
	r := &outboundRelay{}
	body := `{"type":"error","error":{"type":"invalid_request_error","message":"fixture upstream rejection"}}`
	res := &http.Response{StatusCode: 400, Header: http.Header{"Content-Type": []string{"application/json"}}, Body: io.NopCloser(strings.NewReader(body)), Request: httptest.NewRequest("POST", "http://fixture/v1/messages", nil)}
	if err := r.bridgeWarmupResponse(res); err != nil {
		t.Fatal(err)
	}
	if up := r.UpstreamError(); up == nil || up.Status != 400 || string(up.Body) != body {
		t.Fatal("upstream error lost")
	}
}

func TestCacheWarmupOnlyChangesAttributedMainRequest(t *testing.T) {
	req := plannedRequest(t, Object{"max_tokens": 0})
	scope := newMainRequestScope()
	relay := &outboundRelay{scope: scope}
	if err := scope.enter(); err != nil {
		t.Fatal(err)
	}
	for _, scenario := range []string{"main", "count", "aux"} {
		body := scopedFixture(scope)
		body["max_tokens"] = 128
		body["stream"] = true
		if scenario == "aux" {
			delete(body, "system")
		}
		raw, _ := json.Marshal(body)
		out, err := relay.adapt(req, nil, raw, scenario == "count")
		if err != nil {
			t.Fatal(err)
		}
		got, _ := decodeObject(out)
		if scenario == "main" {
			if got["stream"] != false || got["max_tokens"] != json.Number("0") {
				t.Fatal("warm-up not applied")
			}
		} else if got["stream"] != true || got["max_tokens"] != json.Number("128") {
			t.Fatal("warm-up leaked into auxiliary/count")
		}
	}
}

func TestCacheWarmupEscapedMarkerRetainsVerifiedAttribution(t *testing.T) {
	req := plannedRequest(t, Object{"max_tokens": 0})
	scope := newMainRequestScope()
	relay := &outboundRelay{scope: scope}
	if err := scope.enter(); err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(scopedFixture(scope))
	if !bytes.Contains(raw, []byte(`\u003c`)) {
		t.Fatal("fixture marker was not escaped")
	}
	r := httptest.NewRequest("POST", "http://fixture/v1/messages", bytes.NewReader(raw))
	w := httptest.NewRecorder()
	if !relay.adaptRequest(w, r, req, nil, true, false) {
		t.Fatalf("adapt failed %s", w.Body.String())
	}
	if warm, _ := r.Context().Value(warmupRequestKey{}).(bool); !warm {
		t.Fatal("decoded main attribution lost due JSON escaping")
	}
	if decode, _ := r.Context().Value(modelRequest{}).(bool); !decode {
		t.Fatal("warm-up transport compression not enabled")
	}
}

func TestCacheWarmupAdmission(t *testing.T) {
	for _, extra := range []Object{
		{"stream": true}, {"thinking": Object{"type": "enabled", "budget_tokens": 1024}},
		{"output_config": Object{"format": Object{"type": "json_schema", "schema": Object{"type": "object"}}}},
		{"tools": []any{Object{"name": "test", "input_schema": Object{"type": "object"}}}, "tool_choice": Object{"type": "any"}},
		{"max_tokens": -1}, {"max_tokens": 0.1}, {"max_tokens": nil}, {"max_tokens": "0"},
	} {
		body := basic()
		body["max_tokens"] = 0
		for k, v := range extra {
			body[k] = v
		}
		raw, _ := json.Marshal(body)
		if _, err := parsePolicyRequest(raw, http.Header{}); err == nil {
			t.Errorf("accepted invalid warm-up: %v", extra)
		}
	}
	for _, thinking := range []any{nil, Object{"type": "disabled"}, Object{"type": "adaptive"}} {
		body := basic()
		body["max_tokens"] = 0
		if thinking != nil {
			body["thinking"] = thinking
		}
		raw, _ := json.Marshal(body)
		req, err := parsePolicyRequest(raw, http.Header{})
		if err != nil || !req.CacheWarmup {
			t.Fatalf("valid warm-up rejected: %v", err)
		}
	}
}

func TestCacheWarmupNeverWritesTheCachedNativeSession(t *testing.T) {
	c, err := newCache(t.TempDir(), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	r := responseHistoryRequest(t)
	answer := responseHistoryAnswer("msg_warmup_prior", "answer")
	prior := commitResponseFixture(t, c, "scope", r, answer)
	before, err := os.ReadFile(prior.NativePath)
	if err != nil {
		t.Fatal(err)
	}
	r.Messages = append(r.Messages, Message{Role: "assistant", Content: answer["content"].([]Object)}, Message{Role: "user", Content: []Object{{"type": "text", "text": "next"}}})
	r.CacheWarmup = true
	r.MaxTokens = 0
	warm, err := prepareHistory(r, c, testBranch("scope"), t.TempDir(), "2.1.292")
	if err != nil {
		t.Fatal(err)
	}
	// Same branch, same session ID; the CLI only ever writes a private copy.
	if warm.Mode != "fork" || warm.SessionID != prior.SessionID || warm.Path == prior.NativePath || warm.Path == c.canonicalPath(prior.SessionID) {
		t.Fatal("warm-up reuses writable native cache")
	}
	if err := os.WriteFile(warm.Path, []byte("fixture CLI writes"), 0600); err != nil {
		t.Fatal(err)
	}
	after, _ := os.ReadFile(prior.NativePath)
	if !bytes.Equal(before, after) {
		t.Fatal("warm-up polluted prior native transcript")
	}
	r.CacheWarmup = false
	r.MaxTokens = 64
	resumed, err := prepareHistory(r, c, testBranch("scope"), t.TempDir(), "2.1.292")
	if err != nil {
		t.Fatal(err)
	}
	if resumed.Mode != "prefix-hit" {
		t.Fatalf("warm-up invalidated next normal cache hit: %s", resumed.Mode)
	}
}
