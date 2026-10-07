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
	"testing"
	"time"
)

func TestRealCLIFallbackResponseCompatibility(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated fallback response test")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	for _, position := range []string{"first", "middle"} {
		for _, stream := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s-%t", position, stream), func(t *testing.T) {
				root := t.TempDir()
				plugin, err := extractMod(root)
				if err != nil {
					t.Fatal(err)
				}
				blocks := []Object{fallbackFixture(), {"type": "text", "text": "AFTER_BOUNDARY"}}
				if position == "middle" {
					blocks = append([]Object{{"type": "text", "text": "BEFORE_BOUNDARY"}}, blocks...)
				}
				fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if !strings.HasSuffix(r.URL.Path, "/messages") {
						fmt.Fprint(w, `{"input_tokens":20}`)
						return
					}
					raw, _ := io.ReadAll(r.Body)
					body, _ := decodeObject(raw)
					if messages, _ := body["messages"].([]any); len(messages) > 1 {
						if !messageProbeContainsBlock(body, fallbackFixture()) {
							t.Error("fallback history trigger or boundary lost")
						}
					}
					writeFallbackFixture(w, str(body, "model"), blocks)
				}))
				defer fake.Close()
				cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
				if err != nil {
					t.Fatal(err)
				}
				g := &Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: messageProbeEnv(root, fake.URL)}, Cache: cache, Timeout: 30 * time.Second, Slots: make(chan struct{}, 2)}
				body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "messages": []any{Object{"role": "user", "content": "synthetic fallback response fixture"}}}
				raw, _ := json.Marshal(body)
				res := httptest.NewRecorder()
				g.ServeHTTP(res, httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw)))
				if res.Code != 200 {
					t.Fatalf("HTTP%d %s", res.Code, res.Body.String())
				}
				if !stream {
					answer, e := decodeObject(res.Body.Bytes())
					if e != nil {
						t.Fatal(e)
					}
					if digest(answer["content"]) != digest(blocks) {
						t.Fatal("JSON fallback boundaries changed")
					}
					usage, _ := answer["usage"].(Object)
					if digest(usage["iterations"]) != digest(fallbackUsageIterations()) {
						t.Fatal("JSON per-model iterations lost or summed")
					}
					base := append(body["messages"].([]any), Object{"role": "assistant", "content": answer["content"]})
					for _, label := range []string{"continue", "rollback", "new-cache-import"} {
						body["messages"] = append(append([]any(nil), base...), Object{"role": "user", "content": label})
						if label == "new-cache-import" {
							nextCache, e := newCache(filepath.Join(t.TempDir(), "cache"), 32<<20)
							if e != nil {
								t.Fatal(e)
							}
							g.Cache = nextCache
						}
						data, _ := json.Marshal(body)
						next := httptest.NewRecorder()
						g.ServeHTTP(next, httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(data)))
						if next.Code != 200 {
							t.Fatalf("%s HTTP%d %s", label, next.Code, next.Body.String())
						}
						t.Logf("%s history=%s", label, next.Header().Get("X-CCGateway-History"))
					}
					return
				}
				var acc Accumulator
				for _, part := range strings.Split(res.Body.String(), "\n\n") {
					for _, line := range strings.Split(part, "\n") {
						if strings.HasPrefix(line, "data:") {
							event, e := decodeObject([]byte(strings.TrimSpace(strings.TrimPrefix(line, "data:"))))
							if e != nil {
								t.Fatal(e)
							}
							if e := acc.push(event, &Request{}); e != nil {
								t.Fatal(e)
							}
						}
					}
				}
				if !acc.Done || digest(acc.Blocks) != digest(blocks) {
					t.Fatal("SSE fallback event gap or metadata loss")
				}
				usage, _ := acc.Message["usage"].(Object)
				if digest(usage["iterations"]) != digest(fallbackUsageIterations()) {
					t.Fatal("SSE per-model iterations lost or summed")
				}
			})
		}
	}
}

func fallbackUsageIterations() []Object {
	return []Object{{"type": "message", "model": "claude-opus-5-5", "input_tokens": 37, "output_tokens": 9}, {"type": "fallback_message", "model": "claude-opus-4-8", "input_tokens": 41, "output_tokens": 8}}
}

func writeFallbackFixture(w http.ResponseWriter, model string, blocks []Object) {
	recorder := httptest.NewRecorder()
	writeSurfaceFixture(recorder, model, blocks)
	w.Header().Set("Content-Type", "text/event-stream")
	for _, part := range strings.Split(recorder.Body.String(), "\n\n") {
		for _, line := range strings.Split(part, "\n") {
			if !strings.HasPrefix(line, "data:") {
				continue
			}
			event, _ := decodeObject([]byte(strings.TrimSpace(strings.TrimPrefix(line, "data:"))))
			if str(event, "type") == "message_delta" {
				event["usage"].(Object)["iterations"] = fallbackUsageIterations()
			}
			data, _ := json.Marshal(event)
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), data)
		}
	}
}
