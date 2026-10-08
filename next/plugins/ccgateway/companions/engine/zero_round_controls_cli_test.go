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

func TestRealCLIZeroRoundControls(t *testing.T) {
	for _, mode := range []string{"safeguards", "tool", "any"} {
		for _, stream := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/%t", mode, stream), func(t *testing.T) {
				var calls atomic.Int32
				var expectedBudget any
				expectedChoice := mode
				handler := http.HandlerFunc(func(w http.ResponseWriter, h *http.Request) {
					if !strings.HasSuffix(h.URL.Path, "/messages") {
						fmt.Fprint(w, `{"input_tokens":1}`)
						return
					}
					calls.Add(1)
					raw, _ := io.ReadAll(h.Body)
					wire, _ := decodeObject(raw)
					tools, _ := historyContent(wire["tools"])
					if mode == "safeguards" {
						if len(tools) != 0 || digest(wire["safeguards"]) != digest([]any{Object{"fixture": "opaque"}}) {
							t.Error("safeguards/context changed")
						}
						for _, v := range wire["messages"].([]any) {
							m := v.(Object)
							blocks, _ := historyContent(m["content"])
							for _, b := range blocks {
								if str(b, "id") == "old" && str(b, "name") != "bash" {
									t.Error("history renamed")
								}
							}
						}
					} else {
						output, _ := wire["output_config"].(Object)
						if digest(output["task_budget"]) != digest(expectedBudget) {
							t.Error("budget modified")
						}
						choice, _ := wire["tool_choice"].(Object)
						if str(choice, "type") != expectedChoice {
							t.Error("choice relaxed")
						}
						if expectedChoice != "auto" && (len(tools) != 1 || str(tools[0], "name") != "mcp__ccgateway__fixture") {
							t.Error("helper entered catalog")
						}
					}
					writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "done"}})
				})
				endpoint, _ := newThinkingOutputFixture(t, handler)
				body := completedHistoryBody("bash")
				p := defaultRequestPolicy()
				if mode == "safeguards" {
					body["safeguards"] = []any{Object{"fixture": "opaque"}}
				} else {
					body = basic()
					body["tools"] = []any{Object{"name": "fixture", "defer_loading": false, "input_schema": Object{"type": "object"}}}
					choice := Object{"type": mode}
					if mode == "tool" {
						choice["name"] = "fixture"
					}
					body["tool_choice"] = choice
					p.ToolSearch = "true"
				}
				body["stream"] = stream
				post := func(url string, remaining any) string {
					t.Helper()
					if mode != "safeguards" {
						budget := Object{"type": "tokens", "total": 64000}
						if remaining != "omitted" {
							budget["remaining"] = remaining
						}
						expectedBudget = budget
						body["output_config"] = Object{"task_budget": budget}
						if remaining == "disabled" {
							delete(body, "output_config")
							expectedBudget = nil
						}
					}
					raw, _ := json.Marshal(body)
					req, _ := http.NewRequest("POST", url+"/v1/messages", bytes.NewReader(raw))
					cfg, _ := json.Marshal(p)
					req.Header.Set(policyHeader, string(cfg))
					if mode != "safeguards" {
						req.Header.Set("anthropic-beta", taskBudgetBeta)
					}
					res, e := http.DefaultClient.Do(req)
					if e != nil {
						t.Fatal(e)
					}
					defer res.Body.Close()
					out, _ := io.ReadAll(res.Body)
					if res.StatusCode != 200 || !bytes.Contains(out, []byte("done")) {
						t.Fatalf("HTTP%d %s", res.StatusCode, out)
					}
					return res.Header.Get("X-CCGateway-History")
				}
				expectedCalls := int32(4)
				if mode != "safeguards" {
					original := body["tool_choice"]
					body["tool_choice"] = Object{"type": "auto"}
					expectedChoice = "auto"
					post(endpoint, "disabled")
					prior := append([]any(nil), body["messages"].([]any)...)
					body["messages"] = append(prior, Object{"role": "assistant", "content": "done"}, Object{"role": "user", "content": "start budget now"})
					body["tool_choice"] = original
					expectedChoice = mode
					expectedCalls++
					if got := post(endpoint, "omitted"); got != "rebuild" {
						t.Fatalf("budget switch reused old namespace: %s", got)
					}
				} else {
					post(endpoint, "omitted")
				}
				base := append([]any(nil), body["messages"].([]any)...)
				body["messages"] = append(append([]any(nil), base...), Object{"role": "assistant", "content": "done"}, Object{"role": "user", "content": "continue"})
				post(endpoint, nil)
				cold, _ := newThinkingOutputFixture(t, handler)
				post(cold, 0)
				body["messages"] = append(append([]any(nil), base...), Object{"role": "assistant", "content": "done"}, Object{"role": "user", "content": "branch"})
				post(endpoint, 32000)
				if calls.Load() != expectedCalls {
					t.Fatalf("hidden calls%d", calls.Load())
				}
			})
		}
	}
}
