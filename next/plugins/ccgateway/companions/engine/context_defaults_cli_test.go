package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
)

func TestRealCLIContextDefaults(t *testing.T) {
	for _, mode := range []string{"absent", "null", "explicit"} {
		for _, stream := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/%v", mode, stream), func(t *testing.T) {
				var count atomic.Int32
				explicit := Object{"edits": []any{Object{"type": "clear_thinking_20251015", "keep": "all"}, Object{"type": "clear_tool_uses_20250919"}}}
				handler := func(w http.ResponseWriter, r *http.Request) {
					raw, _ := io.ReadAll(r.Body)
					wire, err := decodeObject(raw)
					if err != nil {
						t.Error(err)
						return
					}
					count.Add(1)
					value, exists := wire["context_management"]
					if mode == "absent" && exists || mode == "null" && (!exists || value != nil) || mode == "explicit" && digest(value) != digest(explicit) {
						t.Errorf("context %s not preserved", mode)
					}
					if _, exists := wire["thinking"]; exists {
						t.Error("thinking was silently added")
					}
					writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "CONTEXT_DEFAULT_REPLY"}})
				}
				endpoint, cache := newThinkingOutputFixture(t, handler)
				caches := []*HistoryCache{cache}
				initial := []any{Object{"role": "user", "content": "Public context default fixture."}}
				body := Object{"model": "claude-sonnet-4-6", "max_tokens": 512, "messages": initial, "stream": stream}
				if mode == "null" {
					body["context_management"] = nil
				}
				if mode == "explicit" {
					body["context_management"] = explicit
				}
				post := func() {
					t.Helper()
					raw, _ := json.Marshal(body)
					req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
					req.Header.Set("anthropic-beta", contextBeta)
					res, err := http.DefaultClient.Do(req)
					if err != nil {
						t.Fatal(err)
					}
					out, _ := io.ReadAll(res.Body)
					res.Body.Close()
					if res.StatusCode != 200 {
						t.Fatalf("HTTP%d %s", res.StatusCode, out)
					}
				}
				post()
				body["messages"] = append(append([]any{}, initial...), Object{"role": "assistant", "content": "CONTEXT_DEFAULT_REPLY"}, Object{"role": "user", "content": "Continue the public fixture."})
				post()
				endpoint, cache = newThinkingOutputFixture(t, handler)
				caches = append(caches, cache)
				post()
				body["messages"] = initial
				post()
				if count.Load() != 4 {
					t.Fatal("unexpected retries", count.Load())
				}
				observed := 0
				for _, cache := range caches {
					paths, _ := filepath.Glob(filepath.Join(filepath.Dir(cache.dir), "request-logs", "*", "upstream-*-cli-request.body"))
					for _, path := range paths {
						raw, _ := os.ReadFile(path)
						cli, _ := decodeObject(raw)
						if cli["thinking"] != nil && cli["context_management"] != nil {
							observed++
						}
					}
				}
				if observed == 0 {
					t.Fatal("fixture did not exercise native thinking/context defaults")
				}
			})
		}
	}
}
