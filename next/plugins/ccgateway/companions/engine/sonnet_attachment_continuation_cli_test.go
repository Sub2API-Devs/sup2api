package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func TestRealCLISonnetAttachmentContinuation(t *testing.T) {
	for _, source := range []string{"client", "gateway", "both"} {
		for _, stream := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/%v", source, stream), func(t *testing.T) {
				var mu sync.Mutex
				var calls []Object
				blocks := webFixture("web_search")
				handler := func(w http.ResponseWriter, r *http.Request) {
					raw, _ := io.ReadAll(r.Body)
					wire, err := decodeObject(raw)
					if err != nil {
						t.Error(err)
						return
					}
					mu.Lock()
					calls = append(calls, wire)
					system, _ := json.Marshal(wire["system"])
					if !bytes.Contains(system, []byte("Public fixture instructions only.")) {
						t.Error("client system lost")
					}
					messages := wire["messages"].([]any)
					var first []Object
					for _, raw := range messages {
						m := raw.(Object)
						if str(m, "role") == "user" {
							b, _ := historyContent(m["content"])
							first = append(first, b...)
						}
					}
					reminders := 0
					for _, block := range first {
						if strings.Contains(str(block, "text"), "<total_tokens>") {
							reminders++
						}
					}
					if source == "client" && reminders != 0 || source != "client" && reminders < 1 {
						t.Errorf("policy %s real-user reminders=%d", source, reminders)
					}
					mu.Unlock()
					history, _ := json.Marshal(wire["messages"])
					if bytes.Contains(history, []byte("ccgateway-continuation-")) {
						t.Error("carrier leaked")
					}
					if bytes.Contains(history, []byte("srv_web")) {
						messages := wire["messages"].([]any)
						last := messages[len(messages)-1].(Object)
						if str(last, "role") != "assistant" || digest(last["content"]) != digest([]Object{blocks[0]}) {
							t.Error("pause assistant tail changed")
						}
						writeSurfaceFixture(w, str(wire, "model"), []Object{blocks[1], {"type": "text", "text": "PAUSE_COMPLETED"}})
						return
					}
					fixture := httptest.NewRecorder()
					writeSurfaceFixture(fixture, str(wire, "model"), []Object{blocks[0]})
					w.Header().Set("Content-Type", "text/event-stream")
					w.Write(bytes.ReplaceAll(fixture.Body.Bytes(), []byte(`"stop_reason":"end_turn"`), []byte(`"stop_reason":"pause_turn"`)))
				}
				endpoint, cache := newThinkingOutputFixture(t, handler)
				caches := []*HistoryCache{cache}
				body := webTestBody("web_search_20250305")
				body["model"] = "claude-sonnet-4-6"
				body["stream"] = stream
				body["system"] = "Public fixture instructions only."
				body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": "Public fixture context acknowledged."}, Object{"role": "user", "content": "Continue the public documentation lookup."})
				original := body["messages"]
				post := func(want string) Object {
					t.Helper()
					raw, _ := json.Marshal(body)
					request, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
					request.Header.Set("Content-Type", "application/json")
					request.Header.Set("X-CCGateway-Request-Policy", string(mustMCPJSON(Object{"schema_version": 1, "attachment_source": source})))
					res, err := http.DefaultClient.Do(request)
					if err != nil {
						t.Fatal(err)
					}
					defer res.Body.Close()
					out, _ := io.ReadAll(res.Body)
					if res.StatusCode != 200 {
						t.Fatalf("HTTP%d %s", res.StatusCode, out)
					}
					if stream {
						var frames [][]byte
						for _, line := range strings.Split(string(out), "\n") {
							if strings.HasPrefix(line, "data:") {
								frames = append(frames, []byte(strings.TrimSpace(strings.TrimPrefix(line, "data:"))))
							}
						}
						out, err = credits.MessageFromEvents(frames)
						if err != nil {
							t.Fatal(err)
						}
					}
					answer, err := decodeObject(out)
					if err != nil {
						t.Fatal(err)
					}
					if str(answer, "stop_reason") != want {
						t.Fatalf("unexpected terminal %s", str(answer, "stop_reason"))
					}
					return answer
				}
				first := post("pause_turn")
				body["messages"] = append(append([]any{}, original.([]any)...), Object{"role": "assistant", "content": first["content"]})
				post("end_turn")
				endpoint, cache = newThinkingOutputFixture(t, handler)
				caches = append(caches, cache)
				post("end_turn")
				body["messages"] = original
				post("pause_turn")
				mu.Lock()
				count := len(calls)
				mu.Unlock()
				if count != 4 {
					t.Fatalf("unexpected retry %d", count)
				}
				autoAttachments := 0
				for _, c := range caches {
					autoAttachments += verifySonnetSafetyPreserved(t, filepath.Join(filepath.Dir(c.dir), "request-logs"))
					verifyRealReminderPositions(t, filepath.Join(filepath.Dir(c.dir), "request-logs"))
				}
				t.Logf("CLI2.1.292 Sonnet4.6 stream=%v new/pause continuation/cold/rollback passed; observed Auto Mode blocks=%d", stream, autoAttachments)
			})
		}
	}
}

func verifyRealReminderPositions(t *testing.T, root string) {
	t.Helper()
	facts := func(body Object) []Object {
		var out []Object
		messages, _ := body["messages"].([]any)
		for mi, raw := range messages {
			m := raw.(Object)
			blocks, _ := historyContent(m["content"])
			if mi == len(messages)-1 && len(blocks) > 0 && strings.HasPrefix(str(blocks[len(blocks)-1], "text"), "ccgateway-continuation-") {
				continue
			}
			for bi, b := range blocks {
				if strings.Contains(str(b, "text"), "<total_tokens>") {
					out = append(out, Object{"message": mi, "block": bi, "role": m["role"], "text": b["text"]})
				}
			}
		}
		return out
	}
	paths, _ := filepath.Glob(filepath.Join(root, "*", "upstream-*-cli-request.body"))
	for _, path := range paths {
		beforeRaw, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		afterRaw, err := os.ReadFile(strings.TrimSuffix(path, "-cli-request.body") + "-request.body")
		if err != nil {
			t.Fatal(err)
		}
		before, _ := decodeObject(beforeRaw)
		after, _ := decodeObject(afterRaw)
		if digest(facts(before)) != digest(facts(after)) {
			t.Fatal("real reminder position/value changed")
		}
	}
}
