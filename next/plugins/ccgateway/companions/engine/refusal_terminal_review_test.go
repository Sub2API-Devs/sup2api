package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

// The main upstream response can finish before CLI stdio delivers its events.
// Close the retry window at the network boundary, without waiting for onResult
// or an optional format/context mode; refusal is still a normal API response.
func TestOrdinaryRefusalStopsRelayBeforeCLIDelivery(t *testing.T) {
	relay := &outboundRelay{}
	observer := apiTerminalObserver{relay: relay, req: &Request{Plan: &RequestPlan{apiGeneration: true}}}
	observer.observe([]byte("event: message_delta\ndata: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"refusal\"}}\n\n"))
	if relay.stopped {
		t.Fatal("stopped before a complete terminal response")
	}
	observer.observe([]byte("event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n"))
	if !relay.stopped || relay.failure != nil {
		t.Fatal("normal refusal can still be implicitly retried or was marked as an error")
	}
}

func TestRealCLIOrdinaryRefusalIsSingleNormalResponse(t *testing.T) {
	for _, text := range []bool{false, true} {
		for _, stream := range []bool{false, true} {
			t.Run(fmt.Sprintf("text=%v/stream=%v", text, stream), func(t *testing.T) {
				var calls atomic.Int32
				handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if !strings.HasSuffix(r.URL.Path, "/messages") {
						fmt.Fprint(w, `{"input_tokens":20}`)
						return
					}
					calls.Add(1)
					raw, _ := io.ReadAll(r.Body)
					body, _ := decodeObject(raw)
					blocks := []Object{}
					if text {
						blocks = append(blocks, Object{"type": "text", "text": "refusal fixture"})
					}
					fixture := httptest.NewRecorder()
					writeSurfaceFixture(fixture, str(body, "model"), blocks)
					w.Header().Set("Content-Type", "text/event-stream")
					fmt.Fprint(w, strings.ReplaceAll(fixture.Body.String(), `"stop_reason":"end_turn"`, `"stop_reason":"refusal"`))
				})
				endpoint, _ := newThinkingOutputFixture(t, handler)
				body := Object{"model": "claude-opus-5-5", "max_tokens": 64, "stream": stream, "messages": []any{Object{"role": "user", "content": "refusal fixture"}}}
				raw, _ := json.Marshal(body)
				res, err := http.Post(endpoint+"/v1/messages", "application/json", bytes.NewReader(raw))
				if err != nil {
					t.Fatal(err)
				}
				out, _ := io.ReadAll(res.Body)
				res.Body.Close()
				if res.StatusCode != 200 || calls.Load() != 1 || !strings.Contains(string(out), `"stop_reason":"refusal"`) || strings.Contains(string(out), `"type":"error"`) {
					t.Fatalf("refusal changed/retried: HTTP%d calls%d %s", res.StatusCode, calls.Load(), out)
				}
				if stream && strings.Count(string(out), "event: message_stop") != 1 {
					t.Fatal("refusal stream did not end exactly once")
				}
			})
		}
	}
}
