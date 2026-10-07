package engine

import (
	"bytes"
	"compress/gzip"
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

func TestRealCLIHTTPMaxTokensIsExact(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	for _, limit := range []int{0, 1, 1000000} {
		t.Run(fmt.Sprint(limit), func(t *testing.T) {
			root := t.TempDir()
			plugin, err := extractMod(root)
			if err != nil {
				t.Fatal(err)
			}
			seen := make(chan json.Number, 8)
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, err := decodeObject(raw)
				if err != nil {
					http.Error(w, "fixture", 400)
					return
				}
				n, _ := body["max_tokens"].(json.Number)
				seen <- n
				if n.String() == "0" {
					if body["stream"] != false {
						t.Error("warm-up upstream must be nonstreaming")
					}
					w.Header().Set("Content-Type", "application/json")
					w.Header().Set("Content-Encoding", "gzip")
					compressed := gzip.NewWriter(w)
					fmt.Fprint(compressed, `{"id":"msg_warmup_exact","type":"message","role":"assistant","model":"claude-opus-5-5","content":[],"stop_reason":"max_tokens","stop_sequence":null,"usage":{"input_tokens":17,"output_tokens":0,"cache_creation_input_tokens":2048}}`)
					compressed.Close()
					return
				}
				writeResponseHTTPFixture(w, str(body, "model"), "start", false)
			}))
			defer upstream.Close()
			base := []string{}
			for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
				if v := os.Getenv(key); v != "" {
					base = append(base, key+"="+v)
				}
			}
			env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-limit-fixture", "ANTHROPIC_BASE_URL": upstream.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1"})
			cache, err := newCache(filepath.Join(root, "cache"), 8<<20)
			if err != nil {
				t.Fatal(err)
			}
			g := httptest.NewServer(&Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}, Cache: cache, Timeout: 20 * time.Second, Slots: make(chan struct{}, 1)})
			defer g.Close()
			raw, _ := json.Marshal(Object{"model": "claude-opus-5-5", "max_tokens": limit, "messages": []any{Object{"role": "user", "content": "limit fixture"}}})
			client := &http.Client{Timeout: 25 * time.Second}
			res, err := client.Post(g.URL+"/v1/messages", "application/json", bytes.NewReader(raw))
			if err != nil {
				t.Fatal(err)
			}
			out, _ := io.ReadAll(res.Body)
			res.Body.Close()
			if res.StatusCode != 200 {
				t.Fatalf("%d: %s", res.StatusCode, out)
			}
			if limit == 0 {
				answer, err := decodeObject(out)
				if err != nil || str(answer, "id") != "msg_warmup_exact" || len(answer["content"].([]any)) != 0 {
					t.Fatalf("warm-up response changed: %s (%v)", out, err)
				}
				usage := answer["usage"].(map[string]any)
				if usage["cache_creation_input_tokens"] != json.Number("2048") || usage["output_tokens"] != json.Number("0") {
					t.Fatalf("warm-up usage changed: %s", out)
				}
				cache.mu.Lock()
				entries := len(cache.entries)
				cache.mu.Unlock()
				if entries != 0 {
					t.Fatal("empty assistant checkpoint was committed")
				}
			}
			select {
			case got := <-seen:
				if got.String() != fmt.Sprint(limit) {
					t.Fatalf("max_tokens silently changed: want %d got %s", limit, got)
				}
			default:
				t.Fatal("no upstream request")
			}
			select {
			case <-seen:
				t.Fatal("unexpected repeated upstream request")
			default:
			}
			if limit == 0 {
				post := func(body Object) (Object, http.Header) {
					t.Helper()
					data, _ := json.Marshal(body)
					res, err := client.Post(g.URL+"/v1/messages", "application/json", bytes.NewReader(data))
					if err != nil {
						t.Fatal(err)
					}
					data, _ = io.ReadAll(res.Body)
					res.Body.Close()
					if res.StatusCode != 200 {
						t.Fatalf("warm-up continuation: %d %s", res.StatusCode, data)
					}
					answer, err := decodeObject(data)
					if err != nil {
						t.Fatal(err)
					}
					return answer, res.Header
				}
				body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "messages": []any{Object{"role": "user", "content": "seed before warm-up"}}}
				answer, _ := post(body)
				cache.mu.Lock()
				var cachedPath string
				for _, snapshot := range cache.entries {
					cachedPath = snapshot.NativePath
				}
				beforeEntries := len(cache.entries)
				cache.mu.Unlock()
				before, err := os.ReadFile(cachedPath)
				if err != nil {
					t.Fatal(err)
				}
				body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": answer["content"]}, Object{"role": "user", "content": "next after warm-up"})
				body["max_tokens"] = 0
				_, headers := post(body)
				if headers.Get("X-CCGateway-History") != "fork" {
					t.Fatalf("warm-up did not isolate cached native history: %v", headers)
				}
				after, _ := os.ReadFile(cachedPath)
				if !bytes.Equal(before, after) {
					t.Fatal("real CLI warm-up changed cached native history")
				}
				cache.mu.Lock()
				afterEntries := len(cache.entries)
				cache.mu.Unlock()
				if afterEntries != beforeEntries {
					t.Fatal("warm-up committed an empty checkpoint")
				}
				body["max_tokens"] = 128
				_, headers = post(body)
				if headers.Get("X-CCGateway-History") != "prefix-hit" {
					t.Fatalf("normal request lost cache after warm-up: %v", headers)
				}
				if len(seen) != 3 {
					t.Fatalf("warm-up retried upstream: expected 3 subsequent calls, got %d", len(seen))
				}
			}
		})
	}
}
