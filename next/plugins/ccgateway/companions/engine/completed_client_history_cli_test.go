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

func TestRealCLICompletedClientHistory(t *testing.T) {
	for _, stream := range []bool{false, true} {
		for _, name := range []string{"retired_fixture", "bash"} {
			t.Run(fmt.Sprintf("%s/%t", name, stream), func(t *testing.T) {
				var calls atomic.Int32
				handler := http.HandlerFunc(func(w http.ResponseWriter, h *http.Request) {
					if !strings.HasSuffix(h.URL.Path, "/messages") {
						fmt.Fprint(w, `{"input_tokens":1}`)
						return
					}
					calls.Add(1)
					raw, _ := io.ReadAll(h.Body)
					wire, _ := decodeObject(raw)
					tools, _ := historyContent(wire["tools"])
					if len(tools) != 0 {
						t.Error("history registered executable tools")
					}
					matched := false
					for _, v := range wire["messages"].([]any) {
						m := v.(Object)
						blocks, _ := historyContent(m["content"])
						for _, b := range blocks {
							if str(b, "type") == "tool_use" && str(b, "id") == "old" {
								matched = true
								if digest(b["cache_control"]) != digest(Object{"type": "ephemeral", "ttl": "1h"}) {
									t.Error("history cache location/TTL lost")
								}
								if str(b, "name") != name || digest(b["input"]) != digest(Object{"n": json.Number("9007199254740993")}) {
									t.Error("historical identity changed")
								}
							}
						}
					}
					if !matched {
						t.Error("history dropped")
					}
					writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "done"}})
				})
				endpoint, _ := newThinkingOutputFixture(t, handler)
				body := completedHistoryBody(name)
				body["messages"].([]any)[1].(Object)["content"].([]any)[0].(Object)["cache_control"] = Object{"type": "ephemeral", "ttl": "1h"}
				body["stream"] = stream
				post := func(url string) string {
					t.Helper()
					raw, _ := json.Marshal(body)
					res, err := http.Post(url+"/v1/messages", "application/json", bytes.NewReader(raw))
					if err != nil {
						t.Fatal(err)
					}
					defer res.Body.Close()
					out, _ := io.ReadAll(res.Body)
					if res.StatusCode != 200 || !bytes.Contains(out, []byte("done")) {
						t.Fatalf("HTTP%d %s", res.StatusCode, out)
					}
					return res.Header.Get("X-CCGateway-History")
				}
				post(endpoint)
				base := append([]any(nil), body["messages"].([]any)...)
				body["messages"] = append(append([]any(nil), base...), Object{"role": "assistant", "content": "done"}, Object{"role": "user", "content": "continue"})
				if mode := post(endpoint); mode != "prefix-hit" {
					t.Fatalf("continuation cache mode=%s", mode)
				}
				cold, _ := newThinkingOutputFixture(t, handler)
				post(cold)
				body["messages"] = append(append([]any(nil), base...), Object{"role": "assistant", "content": "done"}, Object{"role": "user", "content": "branch"})
				post(endpoint)
				if calls.Load() != 4 {
					t.Fatalf("extra calls %d", calls.Load())
				}
			})
		}
	}
}
func TestRealCLICompletedHistoryCannotAuthorizeNewTool(t *testing.T) {
	var calls atomic.Int32
	endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, h *http.Request) {
		if !strings.HasSuffix(h.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		calls.Add(1)
		writeSurfaceFixture(w, "claude-opus-5-5", []Object{{"type": "tool_use", "id": "new_call", "name": "bash", "input": Object{"command": "must never execute"}}})
	})
	raw, _ := json.Marshal(completedHistoryBody("bash"))
	res, e := http.Post(endpoint+"/v1/messages", "application/json", bytes.NewReader(raw))
	if e != nil {
		t.Fatal(e)
	}
	defer res.Body.Close()
	io.ReadAll(res.Body)
	if res.StatusCode != 502 || calls.Load() != 1 {
		t.Fatalf("unknown call accepted or repeated: %d/%d", res.StatusCode, calls.Load())
	}
}

func TestRealCLICompletedHistoryMixedCatalog(t *testing.T) {
	for _, kind := range []string{"web", "mcp"} {
		t.Run(kind, func(t *testing.T) {
			var calls atomic.Int32
			endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, h *http.Request) {
				if !strings.HasSuffix(h.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				calls.Add(1)
				raw, _ := io.ReadAll(h.Body)
				wire, _ := decodeObject(raw)
				tools, _ := historyContent(wire["tools"])
				for _, tool := range tools {
					if strings.Contains(str(tool, "name"), "retired_fixture") {
						t.Error("history added to current directory")
					}
				}
				found := false
				for _, v := range wire["messages"].([]any) {
					m := v.(Object)
					blocks, _ := historyContent(m["content"])
					for _, b := range blocks {
						if str(b, "type") == "tool_use" && str(b, "id") == "old" {
							found = true
							if str(b, "name") != "retired_fixture" || digest(b["input"]) != digest(Object{"n": json.Number("9007199254740993")}) {
								t.Error("retired identity changed")
							}
						}
					}
				}
				if !found {
					t.Error("history lost")
				}
				writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "done"}})
			})
			b := completedHistoryBody("retired_fixture")
			beta := ""
			if kind == "web" {
				b["tools"] = []any{Object{"type": "web_search_20250305", "name": "web_search"}}
			} else {
				mcp := pinnedSearchFixture()
				b["tools"], b["mcp_servers"] = mcp["tools"], mcp["mcp_servers"]
				beta = mcpListingBeta
			}
			raw, _ := json.Marshal(b)
			req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
			if beta != "" {
				req.Header.Set("anthropic-beta", beta)
			}
			res, e := http.DefaultClient.Do(req)
			if e != nil {
				t.Fatal(e)
			}
			defer res.Body.Close()
			out, _ := io.ReadAll(res.Body)
			if res.StatusCode != 200 || calls.Load() != 1 {
				t.Fatalf("HTTP%d calls%d %s", res.StatusCode, calls.Load(), out)
			}
		})
	}
}
