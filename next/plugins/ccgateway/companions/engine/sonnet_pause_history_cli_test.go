package engine

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRealCLISonnetPauseLongHistory(t *testing.T) {
	for _, variant := range []string{"pure", "text", "completed_pairs", "prefix_completed"} {
		for _, stream := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/%v", variant, stream), func(t *testing.T) {
				blocks := webFixture("web_search")
				tail := []Object{blocks[0]}
				if variant == "text" || variant == "completed_pairs" {
					tail = append([]Object{{"type": "text", "text": "A public lookup is pending."}}, tail...)
				}
				if variant == "completed_pairs" {
					old := webFixture("web_search")
					old[0]["id"] = "srv_old"
					old[1]["tool_use_id"] = "srv_old"
					tail = append([]Object{old[0], old[1]}, tail...)
				}
				b := webTestBody("web_search_20250305")
				b["model"] = "claude-sonnet-4-6"
				b["stream"] = stream
				prefix := []any{Object{"role": "user", "content": "Public first question"}, Object{"role": "assistant", "content": "Public first answer"}, Object{"role": "user", "content": "Public next question"}}
				if variant == "prefix_completed" {
					old := webFixture("web_search")
					old[0]["id"] = "srv_earlier"
					old[1]["tool_use_id"] = "srv_earlier"
					prefix[1] = Object{"role": "assistant", "content": []Object{old[0], old[1], {"type": "text", "text": "Public first answer"}}}
				}
				b["messages"] = append(append([]any{}, prefix...), Object{"role": "assistant", "content": tail})
				calls := 0
				handler := func(w http.ResponseWriter, r *http.Request) {
					raw, _ := io.ReadAll(r.Body)
					wire, _ := decodeObject(raw)
					calls++
					messages := wire["messages"].([]any)
					last := messages[len(messages)-1].(Object)
					if str(last, "role") != "assistant" || digest(last["content"]) != digest(tail) {
						t.Error("mixed pause tail changed")
					}
					expectedRequest, err := parseRequest(mustMCPJSON(b))
					if err != nil {
						t.Error(err)
						return
					}
					expectedRequest.Messages = expectedRequest.Messages[:len(expectedRequest.Messages)-1]
					if _, err = alignClientHistory(expectedRequest, Object{"messages": messages[:len(messages)-1]}); err != nil {
						t.Errorf("complete prefix changed: %v", err)
					}
					if bytes.Contains(raw, []byte("ccgateway-continuation-")) {
						t.Error("transport leaked")
					}
					writeSurfaceFixture(w, str(wire, "model"), []Object{blocks[1], {"type": "text", "text": "DONE"}})
				}
				endpoint, cache := newThinkingOutputFixture(t, handler)
				post := func() {
					t.Helper()
					res, err := http.Post(endpoint+"/v1/messages", "application/json", bytes.NewReader(mustMCPJSON(b)))
					if err != nil {
						t.Fatal(err)
					}
					defer res.Body.Close()
					raw, _ := io.ReadAll(res.Body)
					if res.StatusCode != 200 {
						paths, _ := filepath.Glob(filepath.Join(filepath.Dir(cache.dir), "request-logs", "*", "upstream-*-cli-request.body"))
						for _, path := range paths {
							data, _ := os.ReadFile(path)
							wire, _ := decodeObject(data)
							for _, v := range wire["messages"].([]any) {
								m := v.(Object)
								if str(m, "role") != "assistant" {
									continue
								}
								bs, _ := historyContent(m["content"])
								var shapes []Object
								for _, block := range bs {
									shapes = append(shapes, Object{"type": block["type"], "id": block["id"], "interrupted": str(block, "text") == "[Tool use interrupted]", "text_hash": digest(block["text"]), "block_hash": digest(block)})
								}
								t.Logf("assistant shape %s", mustMCPJSON(shapes))
							}
						}
						t.Fatalf("HTTP%d %s", res.StatusCode, raw)
					}
					if !strings.Contains(string(raw), "end_turn") {
						t.Fatal("missing completed terminal")
					}
				}
				post()
				post()
				verifySonnetSafetyPreserved(t, filepath.Join(filepath.Dir(cache.dir), "request-logs"))
				endpoint, cache = newThinkingOutputFixture(t, handler)
				post()
				verifySonnetSafetyPreserved(t, filepath.Join(filepath.Dir(cache.dir), "request-logs"))
				// Roll back to the first user plus the same legally pending assistant.
				b["messages"] = []any{prefix[0], Object{"role": "assistant", "content": tail}}
				prefix = prefix[:1]
				post()
				if calls != 4 {
					t.Fatal("extra inference", calls)
				}
			})
		}
	}
}
