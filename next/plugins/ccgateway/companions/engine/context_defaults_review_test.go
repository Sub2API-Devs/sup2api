package engine

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"sync/atomic"
	"testing"
)

func TestReviewContextDefaultAuxiliaryUnchangedAndCountExact(t *testing.T) {
	r := plannedRequest(t, Object{})
	scope := newMainRequestScope()
	scope.enter()
	relay := &outboundRelay{scope: scope}
	aux := []byte(`{"model":"classifier","messages":[{"role":"user","content":"fixture"}],"thinking":{"type":"adaptive"},"context_management":{"edits":[{"type":"clear_thinking_20251015","keep":"all"}]}}`)
	got, attributed, err := relay.adaptAttributed(r, nil, aux, false)
	if err != nil || attributed || !bytes.Equal(got, aux) {
		t.Fatalf("auxiliary changed: %v %v", attributed, err)
	}
	for _, extra := range []string{"", `,"context_management":null`, `,"context_management":{"edits":[{"type":"clear_thinking_20251015","keep":"all"}]}`} {
		raw := []byte(`{"model":"fixture","messages":[{"role":"user","content":"fixture"}]` + extra + `}`)
		count, e := parseTokenCountRequest(raw, http.Header{"Anthropic-Beta": []string{contextBeta}})
		if e != nil {
			t.Fatal(e)
		}
		wire, _ := json.Marshal(scopedFixture(scope))
		got, attributed, e = relay.adaptAttributed(count, nil, wire, false)
		if e != nil || !attributed || !bytes.Equal(got, raw) {
			t.Fatalf("count client's raw context changed: %v", e)
		}
	}
}

func TestRealCLIReviewExplicitContextProvider400(t *testing.T) {
	var calls atomic.Int32
	context := Object{"edits": []any{Object{"type": "clear_thinking_20251015", "keep": "all"}}}
	endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		wire, err := decodeObject(raw)
		if err != nil || digest(wire["context_management"]) != digest(context) {
			t.Error("explicit context changed")
		}
		if _, ok := wire["thinking"]; ok {
			t.Error("invalid client combination silently repaired")
		}
		calls.Add(1)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(400)
		io.WriteString(w, `{"type":"error","error":{"type":"invalid_request_error","message":"fixture requires thinking"}}`)
	})
	body := basic()
	body["model"] = "claude-sonnet-4-6"
	body["context_management"] = context
	policy := defaultRequestPolicy()
	policy.PassUpstreamErrors = true
	req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(mustServerJSON(body)))
	req.Header = policyHeaders(policy)
	req.Header.Set("Anthropic-Beta", contextBeta)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != 400 || !bytes.Contains(raw, []byte("fixture requires thinking")) || calls.Load() != 1 {
		t.Fatalf("error changed or retried: %d calls=%d", res.StatusCode, calls.Load())
	}
}
