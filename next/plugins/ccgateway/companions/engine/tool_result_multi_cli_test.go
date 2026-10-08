package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
)

func TestRealCLIMultipleToolResultsTrailingContext(t *testing.T) {
	for _, tail := range []string{"\t", "\r\n", "  ", "", "\u00a0\ufeff\u2028"} {
		for _, stream := range []bool{false, true} {
			t.Run(fmt.Sprintf("tail=%q/stream=%t", tail, stream), func(t *testing.T) {
				var embedded atomic.Int32
				var assistant, results []any
				for i := 0; i < 5; i++ {
					assistant = append(assistant, Object{"type": "tool_use", "id": fmt.Sprintf("tool_multi_%d", i), "name": "lookup_fixture", "input": Object{}})
					text := fmt.Sprintf("public fixture %d", i)
					if i == 4 {
						text += tail
					}
					results = append(results, Object{"type": "tool_result", "tool_use_id": fmt.Sprintf("tool_multi_%d", i), "content": text})
				}
				handler := func(w http.ResponseWriter, r *http.Request) {
					if !strings.HasSuffix(r.URL.Path, "/messages") {
						fmt.Fprint(w, `{"input_tokens":1}`)
						return
					}
					raw, _ := io.ReadAll(r.Body)
					wire, _ := decodeObject(raw)
					var found []Object
					for _, v := range wire["messages"].([]any) {
						m := v.(Object)
						blocks, _ := historyContent(m["content"])
						for _, b := range blocks {
							if str(b, "type") == "tool_result" {
								found = append(found, b)
							}
						}
					}
					var blocks []Object
					if len(found) == 0 {
						for _, v := range assistant {
							b := v.(Object)
							blocks = append(blocks, Object{"type": "tool_use", "id": b["id"], "name": "mcp__ccgateway__lookup_fixture", "input": Object{}})
						}
					} else {
						if len(found) != 5 {
							t.Errorf("result count=%d", len(found))
						}
						for i, b := range found {
							if i >= 5 {
								break
							}
							want := results[i].(Object)
							if b["tool_use_id"] != want["tool_use_id"] {
								t.Error("result order changed")
							}
							original := str(want, "content")
							actual := str(b, "content")
							if actual == original {
								continue
							}
							if i != 4 || !strings.HasPrefix(actual, original+"\n\n<system-reminder>\n") || !strings.HasSuffix(actual, "\n</system-reminder>") {
								t.Error("client trailing bytes or suffix changed")
							}
							if strings.Count(actual, "fixture@example.invalid") != 1 {
								t.Error("context duplicated")
							}
							embedded.Add(1)
						}
						blocks = []Object{{"type": "text", "text": "MULTI_DONE"}}
					}
					rec := httptest.NewRecorder()
					writeSurfaceFixture(rec, str(wire, "model"), blocks)
					w.Header().Set("Content-Type", "text/event-stream")
					w.Write(bytes.ReplaceAll(rec.Body.Bytes(), []byte("msg_surface_probe"), []byte("msg_"+uuid())))
				}
				tweak := func(env []string) []string {
					for _, entry := range env {
						if strings.HasPrefix(entry, "CLAUDE_CONFIG_DIR=") {
							dir := strings.TrimPrefix(entry, "CLAUDE_CONFIG_DIR=")
							if err := os.MkdirAll(dir, 0700); err != nil {
								t.Fatal(err)
							}
							if err := os.WriteFile(filepath.Join(dir, ".claude.json"), []byte(`{"oauthAccount":{"emailAddress":"fixture@example.invalid","accountUuid":"fixture-account","organizationUuid":"fixture-org"}}`), 0600); err != nil {
								t.Fatal(err)
							}
						}
					}
					return envWith(env, map[string]string{"ANTHROPIC_API_KEY": "", "CLAUDE_CODE_OAUTH_TOKEN": "dummy-session-context-fixture", "CLAUDE_CODE_USER_EMAIL": "fixture@example.invalid"})
				}
				endpoint, _ := newThinkingOutputFixture(t, handler, tweak)
				user := Object{"role": "user", "content": "five public fixtures"}
				body := Object{"model": "claude-opus-5-5", "max_tokens": 256, "stream": stream, "tools": []any{Object{"name": "lookup_fixture", "input_schema": Object{"type": "object", "properties": Object{}}}}, "messages": []any{user}}
				post := func(endpoint, expected string) {
					t.Helper()
					raw, _ := json.Marshal(body)
					req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
					req.Header.Set("Content-Type", "application/json")
					req.Header.Set(policyHeader, `{"attachment_source":"gateway"}`)
					res, err := http.DefaultClient.Do(req)
					if err != nil {
						t.Fatal(err)
					}
					out, _ := io.ReadAll(res.Body)
					res.Body.Close()
					if res.StatusCode != 200 || !bytes.Contains(out, []byte(expected)) {
						t.Fatalf("HTTP%d %s", res.StatusCode, out)
					}
				}
				post(endpoint, "tool_multi_4")
				body["messages"] = []any{user, Object{"role": "assistant", "content": assistant}, Object{"role": "user", "content": results}}
				post(endpoint, "MULTI_DONE")
				cold, _ := newThinkingOutputFixture(t, handler, tweak)
				post(cold, "MULTI_DONE")
				body["messages"] = []any{user}
				post(endpoint, "tool_multi_4")
				if embedded.Load() == 0 {
					t.Fatal("fixture did not exercise appended context")
				}
			})
		}
	}
}
