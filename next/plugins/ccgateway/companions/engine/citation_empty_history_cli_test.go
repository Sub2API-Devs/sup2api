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

func TestRealCLIEmptyCitationArrayHistory(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			var calls atomic.Int32
			citation := citationFixture(0)
			handler := http.HandlerFunc(func(w http.ResponseWriter, h *http.Request) {
				if !strings.HasSuffix(h.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				calls.Add(1)
				raw, _ := io.ReadAll(h.Body)
				wire, _ := decodeObject(raw)
				for _, v := range wire["messages"].([]any) {
					m := v.(map[string]any)
					if str(m, "role") != "assistant" {
						continue
					}
					blocks, _ := historyContent(m["content"])
					if len(blocks) > 0 && str(blocks[0], "text") == "same" && digest(blocks[0]["citations"]) != digest([]any{citation}) {
						t.Error("original citation not restored on final wire")
					}
				}
				fixture := httptest.NewRecorder()
				writeSurfaceFixture(fixture, str(wire, "model"), []Object{{"type": "text", "text": "same", "citations": []any{citation}}})
				w.Header().Set("Content-Type", "text/event-stream")
				for _, line := range strings.Split(fixture.Body.String(), "\n") {
					if !strings.HasPrefix(line, "data:") {
						continue
					}
					event, _ := decodeObject([]byte(strings.TrimSpace(strings.TrimPrefix(line, "data:"))))
					if str(event, "type") == "content_block_start" {
						event["content_block"].(Object)["citations"] = []any{}
					}
					encoded, _ := json.Marshal(event)
					fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), encoded)
				}
			})
			endpoint, _ := newThinkingOutputFixture(t, handler)
			first := Object{"role": "user", "content": []any{citationDocument("same"), Object{"type": "text", "text": "cite fixture"}}}
			answer := Object{"role": "assistant", "content": []any{Object{"type": "text", "text": "same", "citations": []any{citation}}}}
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "messages": []any{first}}
			post := func(url string) {
				t.Helper()
				raw, _ := json.Marshal(body)
				res, err := http.Post(url+"/v1/messages", "application/json", bytes.NewReader(raw))
				if err != nil {
					t.Fatal(err)
				}
				defer res.Body.Close()
				out, _ := io.ReadAll(res.Body)
				if res.StatusCode != 200 || !bytes.Contains(out, []byte("char_location")) {
					t.Fatalf("HTTP%d %s", res.StatusCode, out)
				}
			}
			post(endpoint)
			body["messages"] = []any{first, answer, Object{"role": "user", "content": "continue"}}
			post(endpoint)
			cold, _ := newThinkingOutputFixture(t, handler)
			post(cold)
			body["messages"] = []any{first, answer, Object{"role": "user", "content": "different branch"}}
			post(endpoint)
			if calls.Load() != 4 {
				t.Fatalf("unexpected model calls: %d", calls.Load())
			}
		})
	}
}
