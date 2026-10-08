package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
)

func TestRealCLIInlineServerTimeline(t *testing.T) {
	for _, kind := range []string{"web_search_20250305", "web_fetch_20250910", "advisor_20260301"} {
		for _, compact := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/compaction=%v", kind, compact), func(t *testing.T) {
				name := serverToolName(kind)
				definition := Object{"type": kind, "name": name}
				blocks := webFixture(name)
				if name == "advisor" {
					definition["model"] = "claude-opus-5-5"
					blocks = advisorFixture("advisor_redacted_result")
				}
				add := timelineChange("tool_addition", Object{"type": "tool_definition", "definition": definition})
				user := Object{"role": "user", "content": []any{Object{"type": "text", "text": "TIMELINE_START", "cache_control": Object{"type": "ephemeral", "ttl": "5m"}}}}
				initial := []any{user, Object{"role": "system", "content": []any{add}}}
				var summary Object
				if compact {
					definition["cache_control"] = Object{"type": "ephemeral", "ttl": "1h"}
					summary = Object{"type": "compaction", "content": "TIMELINE_SUMMARY", "signature": "opaque_timeline", "encrypted_content": "opaque_timeline_metadata", "tool_changes": []any{add}}
					initial = []any{Object{"role": "assistant", "content": []any{summary}}, user}
				}
				var calls atomic.Int32
				handler := http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
					if !strings.HasSuffix(request.URL.Path, "/messages") {
						fmt.Fprint(w, `{"input_tokens":1}`)
						return
					}
					calls.Add(1)
					raw, _ := io.ReadAll(request.Body)
					wire, _ := decodeObject(raw)
					catalog, _ := wire["tools"].([]any)
					if len(catalog) != 0 || bytes.Contains(raw, []byte("ccgateway-inline-tools-")) {
						t.Error("future tool hoisted or carrier leaked")
					}
					if !bytes.Contains(raw, []byte(`"ttl":"5m"`)) {
						t.Error("explicit cache marker lost")
					}
					if compact {
						if !bytes.Contains(raw, []byte(`"ttl":"1h"`)) {
							t.Error("compaction definition cache marker lost")
						}
						messages := wire["messages"].([]any)
						content, _ := historyContent(messages[0].(Object)["content"])
						if len(content) == 0 || digest(content[0]) != digest(summary) {
							t.Error("signed compaction changed or moved")
						}
					}
					if bytes.Contains(raw, []byte(`"type":"tool_removal"`)) {
						writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "REMOVED"}})
						return
					}
					writeSurfaceFixture(w, str(wire, "model"), blocks)
				})
				endpoint, _ := newThinkingOutputFixture(t, handler)
				body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "tools": []any{}, "messages": initial}
				post := func(endpoint string) Object {
					t.Helper()
					raw, _ := json.Marshal(body)
					request, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
					request.Header.Set("Anthropic-Beta", "inline-tools-2026-09-15,compact-2026-09-04,advisor-tool-2026-03-01")
					response, err := http.DefaultClient.Do(request)
					if err != nil {
						t.Fatal(err)
					}
					defer response.Body.Close()
					out, _ := io.ReadAll(response.Body)
					if response.StatusCode != 200 {
						t.Fatalf("HTTP%d %s", response.StatusCode, out)
					}
					if body["stream"] == true {
						if !bytes.Contains(out, []byte("event: message_stop")) {
							t.Fatal("incomplete SSE")
						}
						return nil
					}
					answer, err := decodeObject(out)
					if err != nil {
						t.Fatal(err)
					}
					return answer
				}
				answer := post(endpoint)
				body["messages"] = append(append([]any(nil), initial...), Object{"role": "assistant", "content": answer["content"]}, Object{"role": "user", "content": "withdraw now"}, Object{"role": "system", "content": []any{timelineChange("tool_removal", Object{"type": "tool_reference", "name": name})}})
				post(endpoint)
				cold, _ := newThinkingOutputFixture(t, handler)
				post(cold)
				body["stream"] = true
				post(endpoint)
				body["stream"] = false
				body["messages"] = initial
				post(endpoint)
				if calls.Load() != 5 {
					t.Fatalf("hidden upstream rounds: %d", calls.Load())
				}
			})
		}
	}
}
