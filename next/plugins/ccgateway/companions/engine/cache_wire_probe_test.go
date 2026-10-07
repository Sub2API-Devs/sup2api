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
	"sync"
	"testing"
	"time"
)

// Exact request assertions after the original observation baseline identified
// misplaced breakpoints. A fake endpoint cannot establish upstream billing.
func TestRealCLICacheBreakpointObservation(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated cache wire observations")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	plugin, err := extractMod(root)
	if err != nil {
		t.Fatal(err)
	}
	for _, mode := range []string{"baseline", "mixed-explicit", "automatic", "automatic-1h"} {
		t.Run(mode, func(t *testing.T) {
			var mu sync.Mutex
			var captured []Object
			fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":20}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, err := decodeObject(raw)
				if err != nil {
					t.Error(err)
					w.WriteHeader(400)
					return
				}
				mu.Lock()
				captured = append(captured, body)
				mu.Unlock()
				writeDocumentProbeReply(w, str(body, "model"), false)
			}))
			defer fake.Close()
			sys := []any{Object{"type": "text", "text": "CACHE_SYSTEM_A"}, Object{"type": "text", "text": "CACHE_SYSTEM_B"}}
			user := []any{Object{"type": "text", "text": "CACHE_USER_A"}, Object{"type": "text", "text": "CACHE_USER_B"}}
			tool := Object{"name": "lookup", "description": "fixture", "input_schema": Object{"type": "object"}}
			body := Object{"model": "claude-opus-5-5", "max_tokens": 32, "system": sys, "tools": []any{tool}, "messages": []any{Object{"role": "user", "content": user}}}
			if mode == "mixed-explicit" {
				tool["cache_control"] = Object{"type": "ephemeral", "ttl": "1h"}
				sys[0].(Object)["cache_control"] = Object{"type": "ephemeral", "ttl": "1h"}
				user[0].(Object)["cache_control"] = Object{"type": "ephemeral", "ttl": "5m"}
			}
			if mode == "automatic" || mode == "automatic-1h" {
				body["cache_control"] = Object{"type": "ephemeral", "ttl": "5m"}
				if mode == "automatic-1h" {
					body["cache_control"].(Object)["ttl"] = "1h"
				}
			}
			cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 32<<20)
			if err != nil {
				t.Fatal(err)
			}
			g := &Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: messageProbeEnv(root, fake.URL)}, Cache: cache, Timeout: 35 * time.Second, Slots: make(chan struct{}, 1)}
			raw, _ := json.Marshal(body)
			res := httptest.NewRecorder()
			g.ServeHTTP(res, httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw)))
			if res.Code != 200 {
				t.Fatalf("HTTP %d %s", res.Code, res.Body.String())
			}
			mu.Lock()
			defer mu.Unlock()
			if len(captured) == 0 {
				t.Fatal("no actual wire request")
			}
			wire := captured[len(captured)-1]
			got := cacheProbeMarkers(wire, "")
			if mode == "mixed-explicit" {
				if len(got) != 3 {
					t.Fatal("extra or missing breakpoint", got)
				}
				expected := map[string]string{"mcp__ccgateway__lookup": "1h", "CACHE_SYSTEM_A": "1h", "CACHE_USER_A": "5m"}
				for _, m := range got {
					key := str(m, "fixture_text")
					if key == "" {
						key = str(m, "tool")
					}
					control, _ := m["value"].(map[string]any)
					if expected[key] == "" || expected[key] != str(control, "ttl") {
						t.Fatal("cache breakpoint moved or TTL changed")
					}
					delete(expected, key)
				}
				if len(expected) != 0 {
					t.Fatal("missing client breakpoint")
				}
			}
			if strings.HasPrefix(mode, "automatic") && (len(got) != 1 || str(got[0], "path") != "/cache_control" || digest(got[0]["value"]) != digest(body["cache_control"])) {
				t.Fatal("automatic root policy changed")
			}
			observed, _ := json.Marshal(cacheProbeMarkers(wire, ""))
			expected, _ := json.Marshal(cacheProbeMarkers(body, ""))
			t.Logf("CLI=%s mode=%s original=%s actual=%s", version, mode, expected, observed)
		})
	}
}

func cacheProbeMarkers(value any, path string) []Object {
	var out []Object
	switch v := value.(type) {
	case map[string]any:
		if marker, ok := v["cache_control"]; ok {
			out = append(out, Object{"path": path + "/cache_control", "value": marker, "fixture_text": str(v, "text"), "tool": str(v, "name")})
		}
		for _, key := range []string{"tools", "system", "messages", "content"} {
			out = append(out, cacheProbeMarkers(v[key], path+"/"+key)...)
		}
	case []any:
		for i, item := range v {
			out = append(out, cacheProbeMarkers(item, fmt.Sprintf("%s/%d", path, i))...)
		}
	}
	return out
}
