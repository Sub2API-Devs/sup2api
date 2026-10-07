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

func TestRealCLIAdvisorCompatibility(t *testing.T) {
	for _, variant := range []string{"advisor_result", "advisor_redacted_result", "advisor_tool_result_error"} {
		t.Run(variant, func(t *testing.T) {
			blocks := advisorFixture(variant)
			var calls atomic.Int32
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":20}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				callIndex := calls.Add(1)
				if !strings.Contains(r.Header.Get("anthropic-beta"), "advisor-tool-2026-03-01") {
					t.Error("advisor beta lost")
				}
				history, _ := json.Marshal(body["messages"])
				if callIndex > 1 && !bytes.Contains(history, []byte("srv_advisor")) {
					var view []Object
					for _, value := range body["messages"].([]any) {
						m := value.(map[string]any)
						content, _ := historyContent(m["content"])
						kinds := []string{}
						for _, b := range content {
							kinds = append(kinds, str(b, "type")+":"+str(b, "name"))
						}
						view = append(view, Object{"role": m["role"], "blocks": kinds})
					}
					t.Logf("advisor history missing at call%d: %v", callIndex, view)
				}
				if bytes.Contains(history, []byte("srv_advisor")) {
					found := false
					for _, v := range body["messages"].([]any) {
						m := v.(map[string]any)
						c, _ := historyContent(m["content"])
						if len(c) > 1 && str(c[0], "id") == "srv_advisor" {
							for _, block := range c {
								delete(block, "cache_control")
							}
							found = digest(c) == digest(blocks)
						}
					}
					if !found {
						t.Error("advisor opaque history changed")
					}
					writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "ADVISOR_CONTINUED"}})
					return
				}
				fixture := httptest.NewRecorder()
				writeSurfaceFixture(fixture, str(body, "model"), blocks)
				w.Header().Set("Content-Type", "text/event-stream")
				out := strings.Replace(fixture.Body.String(), `"output_tokens":8`, `"output_tokens":8,"iterations":[{"type":"advisor_message","model":"claude-opus-5-5","input_tokens":21,"output_tokens":2}]`, 1)
				fmt.Fprint(w, out)
			})
			endpoint, _ := newThinkingOutputFixture(t, handler)
			body := advisorTestBody()
			post := func(endpoint string) (Object, http.Header) {
				t.Helper()
				raw, _ := json.Marshal(body)
				req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
				req.Header.Set("anthropic-beta", "advisor-tool-2026-03-01")
				res, err := http.DefaultClient.Do(req)
				if err != nil {
					t.Fatal(err)
				}
				out, _ := io.ReadAll(res.Body)
				res.Body.Close()
				if res.StatusCode != 200 {
					t.Fatalf("HTTP%d %s", res.StatusCode, out)
				}
				answer, err := decodeObject(out)
				if err != nil {
					t.Fatal(err)
				}
				return answer, res.Header
			}
			first, _ := post(endpoint)
			if digest(first["content"]) != digest(blocks) {
				t.Fatal("advisor response changed", first)
			}
			usage := first["usage"].(map[string]any)
			if usage["iterations"] == nil || usage["output_tokens"] != json.Number("8") {
				t.Fatal("nested billing metadata lost or double counted", usage)
			}
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": first["content"]}, Object{"role": "user", "content": "next"})
			_, headers := post(endpoint)
			if headers.Get("X-CCGateway-History") != "prefix-hit" {
				t.Fatal("advisor continuation lost native prefix")
			}
			delete(body, "tools")
			post(endpoint)
			imported, _ := newThinkingOutputFixture(t, handler)
			post(imported)
			if calls.Load() != 4 {
				t.Fatalf("CLI unexpectedly retried advisor request %d", calls.Load())
			}
		})
	}
}
