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

// Transport evidence only. These synthetic compaction entries deliberately
// have no invented model/attempt identity. This does not enable the request
// combination or establish how a real provider attributes those entries.
func TestRealCLIFallbackCompactionUsageProbe(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprintf("stream-%t", stream), func(t *testing.T) {
			iterations := []Object{
				{"type": "compaction", "input_tokens": 801, "output_tokens": 31, "cache_creation_input_tokens": 7, "cache_read_input_tokens": 19},
				{"type": "message", "model": "claude-opus-5-5", "input_tokens": 37, "output_tokens": 9},
				{"type": "compaction", "input_tokens": 401, "output_tokens": 17, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 23},
				{"type": "fallback_message", "model": "claude-opus-4-8", "input_tokens": 41, "output_tokens": 8},
			}
			var calls atomic.Int32
			endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				if body["fallbacks"] == nil {
					generationFixtureEvents(w, str(body, "model"), "end_turn", "aux", false)
					return
				}
				calls.Add(1)
				blocks := []Object{fallbackFixture(), {"type": "text", "text": "fixture"}}
				if !stream {
					w.Header().Set("Content-Type", "application/json")
					json.NewEncoder(w).Encode(Object{"id": "msg_compact_probe", "type": "message", "role": "assistant", "model": "claude-opus-4-8", "content": blocks, "stop_reason": "end_turn", "usage": Object{"input_tokens": 41, "output_tokens": 8, "iterations": iterations}})
					return
				}
				recorder := httptest.NewRecorder()
				writeFallbackFixture(recorder, str(body, "model"), blocks)
				w.Header().Set("Content-Type", "text/event-stream")
				for _, line := range strings.Split(recorder.Body.String(), "\n") {
					if !strings.HasPrefix(line, "data:") {
						continue
					}
					event, _ := decodeObject([]byte(strings.TrimSpace(strings.TrimPrefix(line, "data:"))))
					if str(event, "type") == "message_delta" {
						event["usage"].(Object)["iterations"] = iterations
					}
					data, _ := json.Marshal(event)
					fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), data)
				}
			})
			raw, _ := json.Marshal(explicitFallbackFixture(stream))
			r, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
			r.Header.Set("Anthropic-Beta", "server-side-fallback-2026-07-01")
			res, err := http.DefaultClient.Do(r)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			data, _ := io.ReadAll(res.Body)
			if res.StatusCode != 200 {
				t.Fatalf("HTTP%d %s", res.StatusCode, data)
			}
			var usage Object
			if stream {
				for _, line := range strings.Split(string(data), "\n") {
					if strings.HasPrefix(line, "data:") {
						event, _ := decodeObject([]byte(strings.TrimSpace(strings.TrimPrefix(line, "data:"))))
						if str(event, "type") == "message_delta" {
							usage, _ = event["usage"].(Object)
						}
					}
				}
			} else {
				answer, e := decodeObject(data)
				if e != nil {
					t.Fatal(e)
				}
				usage, _ = answer["usage"].(Object)
			}
			if digest(usage["iterations"]) != digest(iterations) {
				t.Fatalf("iteration order, counters or absent identity changed: %v", usage)
			}
			if calls.Load() != 1 {
				t.Fatalf("unexpected extra model request: %d", calls.Load())
			}
		})
	}
}
