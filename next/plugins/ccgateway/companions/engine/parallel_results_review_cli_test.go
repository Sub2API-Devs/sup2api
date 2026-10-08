package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
)

func TestRealCLIReviewFiveParallelResults(t *testing.T) {
	for _, stream := range []bool{false, true} {
		for _, trailing := range []bool{false, true} {
			t.Run(fmt.Sprintf("stream=%v/trailing=%v", stream, trailing), func(t *testing.T) {
				var calls atomic.Int32
				history := []any{}
				results := []any{}
				blocks := []Object{}
				for i := 0; i < 5; i++ {
					id := fmt.Sprintf("parallel_%d", i)
					input := Object{"index": i}
					blocks = append(blocks, Object{"type": "tool_use", "id": id, "name": "mcp__ccgateway__lookup_fixture", "input": input, "caller": Object{"type": "direct"}})
					history = append(history, Object{"type": "tool_use", "id": id, "name": "lookup_fixture", "input": input, "caller": Object{"type": "direct"}})
					text := fmt.Sprintf("fixture result %d", i)
					if trailing && i == 4 {
						text += "\t"
					}
					results = append(results, Object{"type": "tool_result", "tool_use_id": id, "content": text})
				}
				if trailing {
					for i, j := 0, len(results)-1; i < j; i, j = i+1, j-1 {
						results[i], results[j] = results[j], results[i]
					}
				}
				handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if !strings.HasSuffix(r.URL.Path, "/messages") {
						fmt.Fprint(w, `{"input_tokens":1}`)
						return
					}
					calls.Add(1)
					raw, _ := io.ReadAll(r.Body)
					wire, _ := decodeObject(raw)
					n := 0
					actualIDs := []string{}
					for _, row := range wire["messages"].([]any) {
						m := row.(Object)
						content, _ := historyContent(m["content"])
						for _, b := range content {
							if str(b, "type") == "tool_result" {
								n++
								actualIDs = append(actualIDs, str(b, "tool_use_id"))
							}
						}
					}
					if n == 0 {
						writeSurfaceFixture(w, str(wire, "model"), blocks)
						return
					}
					if n != 5 {
						t.Errorf("provider got %d results", n)
					}
					for i, id := range actualIDs {
						if id != str(results[i].(Object), "tool_use_id") {
							t.Error("client result ordering changed")
						}
					}
					writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "FIVE_DONE"}})
				})
				endpoint, _ := newThinkingOutputFixture(t, handler, func(env []string) []string {
					for _, entry := range env {
						if strings.HasPrefix(entry, "CLAUDE_CONFIG_DIR=") {
							dir := strings.TrimPrefix(entry, "CLAUDE_CONFIG_DIR=")
							if err := os.MkdirAll(dir, 0700); err != nil {
								t.Fatal(err)
							}
							if err := os.WriteFile(filepath.Join(dir, ".claude.json"), []byte(`{"oauthAccount":{"emailAddress":"parallel@example.invalid","accountUuid":"fixture-account","organizationUuid":"fixture-org"}}`), 0600); err != nil {
								t.Fatal(err)
							}
						}
					}
					return envWith(env, map[string]string{"ANTHROPIC_API_KEY": "", "CLAUDE_CODE_OAUTH_TOKEN": "dummy-parallel", "CLAUDE_CODE_USER_EMAIL": "parallel@example.invalid"})
				})
				first := Object{"role": "user", "content": "Read five synthetic fixture items"}
				body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "tools": []any{Object{"name": "lookup_fixture", "input_schema": Object{"type": "object", "properties": Object{"index": Object{"type": "integer"}}}}}, "messages": []any{first}}
				send := func() (int, []byte) {
					raw, _ := json.Marshal(body)
					r, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
					p := defaultRequestPolicy()
					p.AttachmentSource = "gateway"
					r.Header = policyHeaders(p)
					res, err := http.DefaultClient.Do(r)
					if err != nil {
						t.Fatal(err)
					}
					out, _ := io.ReadAll(res.Body)
					res.Body.Close()
					return res.StatusCode, out
				}
				code, out := send()
				if code != 200 || !bytes.Contains(out, []byte("parallel_4")) {
					t.Fatalf("initial HTTP%d %s", code, out)
				}
				body["messages"] = []any{first, Object{"role": "assistant", "content": history}, Object{"role": "user", "content": results[:2]}}
				before := calls.Load()
				code, _ = send()
				if code != 400 || calls.Load() != before {
					t.Fatal("incomplete parallel results reached provider", code)
				}
				body["messages"] = []any{first, Object{"role": "assistant", "content": history}, Object{"role": "user", "content": results}}
				code, out = send()
				if code != 200 || !bytes.Contains(out, []byte("FIVE_DONE")) {
					t.Fatalf("continuation HTTP%d %s", code, out)
				}
				if calls.Load() != 2 {
					t.Fatal("unexpected provider count", calls.Load())
				}
			})
		}
	}
}
