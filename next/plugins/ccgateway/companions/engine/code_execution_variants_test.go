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

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func TestRealCLIExecutionImplicitAndErrorResults(t *testing.T) {
	for _, variant := range []string{"web_search_20260209", "web_fetch_20260209", "code_execution_tool_result_error", "bash_code_execution_tool_result_error", "text_editor_code_execution_tool_result_error"} {
		t.Run(variant, func(t *testing.T) {
			definition := Object{"type": "code_execution_20260120", "name": "code_execution"}
			name := "code_execution"
			result := codeResultFixture("code_execution_tool_result", "code_execution_result")
			implicit := strings.HasPrefix(variant, "web_")
			if implicit {
				definition = Object{"type": variant, "name": serverToolName(variant)}
			} else {
				name = strings.TrimSuffix(variant, "_tool_result_error")
				result = Object{"type": name + "_tool_result", "tool_use_id": "srv_exec", "content": Object{"type": variant, "error_code": "execution_time_exceeded"}}
			}
			blocks := []Object{{"type": "server_tool_use", "id": "srv_exec", "name": name, "input": Object{}}, result, {"type": "text", "text": "NORMAL_RESULT"}}
			var calls atomic.Int32
			endpoint, id := executionGatewayFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				calls.Add(1)
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				if digest(body["tools"]) != digest([]any{definition}) {
					t.Error("implicit provider tool catalog changed")
				}
				writeExecutionFixture(w, str(body, "model"), blocks)
			})
			for _, stream := range []bool{false, true} {
				raw, _ := json.Marshal(Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "tools": []any{definition}, "messages": []any{Object{"role": "user", "content": "fixture"}}})
				req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
				req.Header.Set("X-Api-Key", "worker-fixture")
				req.Header.Set(resources.PrincipalHeader, id.PrincipalID)
				req.Header.Set(resources.GenerationHeader, id.Generation)
				req.Header.Set(resources.ResourceOutputsHeader, "1")
				res, err := http.DefaultClient.Do(req)
				if err != nil {
					t.Fatal(err)
				}
				out, _ := io.ReadAll(res.Body)
				res.Body.Close()
				if res.StatusCode != 200 {
					t.Fatalf("HTTP%d %s", res.StatusCode, out)
				}
				if stream {
					if !bytes.Contains(out, []byte("event: message_stop")) || bytes.Contains(out, []byte("event: error")) {
						t.Fatalf("error result corrupted SSE %s", out)
					}
				} else {
					answer, _ := decodeObject(out)
					if digest(answer["content"]) != digest(blocks) {
						t.Fatalf("result changed %s", out)
					}
				}
			}
			if calls.Load() != 2 {
				t.Fatal("tool error triggered an implicit retry")
			}
		})
	}
}
