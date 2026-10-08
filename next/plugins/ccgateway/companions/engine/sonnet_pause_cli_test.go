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

func TestRealCLISonnetServerPauseContinuation(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
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
			original := body["messages"]
			post := func(want string) Object {
				t.Helper()
				raw, _ := json.Marshal(body)
				res, err := http.Post(endpoint+"/v1/messages", "application/json", bytes.NewReader(raw))
				if err != nil {
					t.Fatal(err)
				}
				defer res.Body.Close()
				out, _ := io.ReadAll(res.Body)
				if res.StatusCode != 200 {
					for _, diagnosticCache := range caches {
						paths, _ := filepath.Glob(filepath.Join(filepath.Dir(diagnosticCache.dir), "request-logs", "*", "upstream-*-cli-request.body"))
						for _, path := range paths {
							source, _ := os.ReadFile(path)
							o, _ := decodeObject(source)
							var shape []Object
							for _, v := range o["messages"].([]any) {
								m := v.(Object)
								bs, _ := historyContent(m["content"])
								var parts []Object
								for _, b := range bs {
									parts = append(parts, Object{"type": b["type"], "text_bytes": len(str(b, "text")), "auto_mode": strings.Contains(str(b, "text"), "Auto Mode"), "marker": strings.Contains(str(b, "text"), "ccgateway-continuation-"), "hash": digest(b)})
								}
								shape = append(shape, Object{"role": m["role"], "blocks": parts})
							}
							t.Logf("CLI shape %s", mustMCPJSON(shape))
						}
					}
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
			}
			t.Logf("CLI2.1.292 Sonnet4.6 stream=%v new/pause continuation/cold/rollback passed; observed Auto Mode blocks=%d", stream, autoAttachments)
		})
	}
}

func verifySonnetSafetyPreserved(t *testing.T, root string) int {
	t.Helper()
	dirs, err := os.ReadDir(root)
	if err != nil {
		t.Fatal(err)
	}
	count := 0
	for _, dir := range dirs {
		files, err := filepath.Glob(filepath.Join(root, dir.Name(), "upstream-*-cli-request.body"))
		if err != nil {
			t.Fatal(err)
		}
		for _, cliPath := range files {
			raw, err := os.ReadFile(cliPath)
			if err != nil {
				t.Fatal(err)
			}
			cli, err := decodeObject(raw)
			if err != nil {
				t.Fatal(err)
			}
			raw, err = os.ReadFile(strings.TrimSuffix(cliPath, "-cli-request.body") + "-request.body")
			if err != nil {
				t.Fatal(err)
			}
			wire, err := decodeObject(raw)
			if err != nil {
				t.Fatal(err)
			}
			before := sonnetSafetyFacts(cli)
			after := sonnetSafetyFacts(wire)
			if digest(before) != digest(after) {
				t.Fatal("Auto Mode safety block moved or changed")
			}
			count += len(before)
		}
	}
	return count
}
func sonnetSafetyFacts(body Object) []Object {
	var facts []Object
	messages, _ := body["messages"].([]any)
	for mi, value := range messages {
		m, _ := value.(Object)
		blocks, _ := historyContent(m["content"])
		for bi, b := range blocks {
			if strings.Contains(str(b, "text"), "Auto Mode") {
				facts = append(facts, Object{"message": mi, "role": m["role"], "block": bi, "hash": digest(b)})
			}
		}
	}
	return facts
}
