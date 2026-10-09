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

const inlineMetadataBetas = "mid-conversation-system-clear-at-2026-08-21,mid-conversation-output-config-2026-07-01"

func TestInlineMetadataExactAlignment(t *testing.T) {
	directive := Message{Role: "system", Content: []Object{}, OutputConfig: json.RawMessage(`{"effort":"high"}`)}
	user := Message{Role: "user", Content: []Object{{"type": "text", "text": "same"}}}
	assistant := Message{Role: "assistant", Content: []Object{{"type": "text", "text": "answer"}}}
	req := &Request{ToolSearch: "true", Messages: []Message{user, assistant, directive, user}}
	base := func() Object {
		return Object{"messages": []any{Object{"role": "user", "content": "same"}, Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "internal-search", "name": "ToolSearch", "input": Object{}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "internal-search", "content": "found"}}}, Object{"role": "assistant", "content": "answer"}, Object{"role": "system", "content": []any{}, "output_config": Object{"effort": "medium"}}, Object{"role": "user", "content": "same"}}}
	}
	body := base()
	if err := restoreInlineSystemMetadata(req, body); err != nil {
		t.Fatal(err)
	}
	messages := body["messages"].([]any)
	if len(messages) != 6 || messages[4].(Object)["output_config"].(Object)["effort"] != "high" {
		t.Fatal("directive moved or internal effort retained")
	}
	// A client-owned ToolSearch is never skipped just because its name matches.
	req.Tools = []Tool{{Name: "ToolSearch", Schema: Object{}}}
	req.Native = map[string]bool{"ToolSearch": true}
	if err := restoreInlineSystemMetadata(req, base()); err == nil {
		t.Fatal("skipped client-owned ToolSearch")
	}
	req.Tools = nil
	req.Native = nil
	body = base()
	body["messages"] = append(body["messages"].([]any), Object{"role": "user", "content": "unmatched"})
	if err := restoreInlineSystemMetadata(req, body); err == nil {
		t.Fatal("accepted extra user turn")
	}
}

func TestInlineMetadataAdmissionAndFingerprint(t *testing.T) {
	body := basic()
	body["messages"] = []any{Object{"role": "system", "content": []any{}, "output_config": Object{"effort": "high"}}, Object{"role": "user", "content": "q"}, Object{"role": "system", "content": "temporary", "clear_at": "next_user_message"}}
	raw, _ := json.Marshal(body)
	headers := http.Header{"Anthropic-Beta": []string{inlineMetadataBetas}}
	req, err := parsePolicyRequest(raw, headers)
	if err != nil {
		t.Fatal(err)
	}
	if req.pendingStart() != 1 || len(req.Messages[0].OutputConfig) == 0 {
		t.Fatal("directive position lost")
	}
	if _, err := parsePolicyRequest(raw, http.Header{}); err == nil {
		t.Fatal("accepted missing beta")
	}
	blocked := headers.Clone()
	policy := defaultRequestPolicy()
	policy.AllowEffort = false
	policyJSON, _ := json.Marshal(policy)
	blocked.Set(policyHeader, string(policyJSON))
	if _, err := parsePolicyRequest(raw, blocked); err == nil {
		t.Fatal("ignored AllowEffort for inline directive")
	}
	before := fingerprints(req.Messages)
	req.Messages[2].ClearAt = json.RawMessage(`"never"`)
	if digest(before) == digest(fingerprints(req.Messages)) {
		t.Fatal("clear_at missing from fingerprint")
	}
	for _, bad := range []Object{
		{"role": "system", "content": "x", "clear_at": "next_user_message", "output_config": Object{"effort": "high"}},
		{"role": "system", "content": []any{}, "output_config": Object{}},
		{"role": "system", "content": "x", "output_config": Object{"format": Object{}}},
	} {
		body["messages"] = []any{Object{"role": "user", "content": "q"}, bad}
		raw, _ = json.Marshal(body)
		if _, err := parseRequest(raw); err == nil {
			t.Fatal("accepted incompatible inline metadata")
		}
	}
}

func TestRealCLIInlineMetadataCompatibility(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated inline metadata test")
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
	var mu sync.Mutex
	var wires []Object
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		for _, beta := range strings.Split(inlineMetadataBetas, ",") {
			if !strings.Contains(r.Header.Get("anthropic-beta"), beta) {
				t.Errorf("required beta missing on final wire: %s", beta)
			}
		}
		if bytes.Contains(raw, []byte("<ccgateway-request:")) {
			t.Error("scope marker leaked")
		}
		mu.Lock()
		wires = append(wires, body)
		mu.Unlock()
		writeDocumentProbeReply(w, str(body, "model"), false)
	}))
	defer fake.Close()
	runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: messageProbeEnv(root, fake.URL)}
	gateway := func() *Gateway {
		cache, e := newCache(filepath.Join(t.TempDir(), "cache"), 32<<20)
		if e != nil {
			t.Fatal(e)
		}
		return &Gateway{Runner: runner, Cache: cache, Timeout: 30 * time.Second, Slots: make(chan struct{}, 2), RequestLogDir: filepath.Join(t.TempDir(), "request-logs")}
	}
	for _, mode := range []string{"clear-at", "effort-text", "effort-only", "effort-between-users", "effort-after-assistant", "effort-long", "default-effort", "top-effort"} {
		t.Run(mode, func(t *testing.T) {
			g := gateway()
			directive := Object{"role": "system", "content": "INLINE_META_TEXT", "clear_at": "next_user_message"}
			if mode == "effort-text" {
				directive = Object{"role": "system", "content": "INLINE_META_TEXT", "output_config": Object{"effort": "high"}}
			}
			if strings.HasPrefix(mode, "effort-") && mode != "effort-text" {
				directive = Object{"role": "system", "content": []any{}, "output_config": Object{"effort": "high"}}
			}
			messages := []any{Object{"role": "user", "content": "FIRST"}, directive}
			if strings.HasPrefix(mode, "effort-") && mode != "effort-text" {
				messages = []any{directive, Object{"role": "user", "content": "FIRST"}}
			}
			post := func(label string, g *Gateway) Object {
				t.Helper()
				body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "messages": messages}
				if mode == "top-effort" {
					body["output_config"] = Object{"effort": "high"}
				}
				raw, _ := json.Marshal(body)
				req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
				req.Header.Set("anthropic-beta", inlineMetadataBetas)
				setTestSession(t, req, "inline-metadata-fixture")
				res := httptest.NewRecorder()
				g.ServeHTTP(res, req)
				if res.Code != 200 {
					metadataSystemShape(t, g.RequestLogDir, nil, messages)
					t.Fatalf("%s HTTP%d %s", label, res.Code, res.Body.String())
				}
				answer, e := decodeObject(res.Body.Bytes())
				if e != nil {
					t.Fatal(e)
				}
				mu.Lock()
				wire := wires[len(wires)-1]
				mu.Unlock()
				parsedBody, _ := parsePolicyRequest(raw, req.Header)
				if _, e := alignClientHistory(parsedBody, wire); e != nil {
					t.Fatalf("%s history alignment: %v", label, e)
				}
				found := 0
				for _, value := range wire["messages"].([]any) {
					m := value.(map[string]any)
					if str(m, "role") != "system" {
						continue
					}
					if mode == "default-effort" || mode == "top-effort" {
						if config, ok := m["output_config"].(map[string]any); ok && config["effort"] != nil {
							t.Fatalf("%s CLI inline effort overrides API request", label)
						}
					}
					if m["clear_at"] == "next_user_message" {
						blocks, _ := historyContent(m["content"])
						for _, block := range blocks {
							if block["cache_control"] != nil {
								t.Fatal("synthetic cache marker on turn-scoped system")
							}
						}
					}
					if digest(m["clear_at"]) == digest(directive["clear_at"]) && digest(m["output_config"]) == digest(directive["output_config"]) {
						blocks, _ := historyContent(m["content"])
						want, _ := historyContent(directive["content"])
						if digest(historySkeleton(blocks)) == digest(historySkeleton(want)) {
							found++
						}
					}
				}
				wantCount := 1
				if mode == "default-effort" || mode == "top-effort" {
					wantCount = 0
				}
				if found != wantCount {
					t.Fatalf("%s directive count=%d", label, found)
				}
				if mode == "top-effort" && str(wire["output_config"].(Object), "effort") != "high" {
					t.Fatal("top effort changed")
				}
				if mode == "default-effort" && wire["output_config"] != nil {
					t.Fatal("default effort injected")
				}
				t.Logf("%s history=%s", label, res.Header().Get("X-CCGateway-History"))
				return answer
			}
			if mode == "effort-between-users" {
				messages = []any{Object{"role": "user", "content": "FIRST_A"}, directive, Object{"role": "user", "content": "FIRST_B"}}
			}
			if mode == "effort-after-assistant" {
				messages = []any{Object{"role": "user", "content": "OLD"}, Object{"role": "assistant", "content": "OLD_ANSWER"}, directive, Object{"role": "user", "content": "FIRST"}}
			}
			if mode == "effort-long" {
				messages = []any{directive}
				for i := 0; i < 12; i++ {
					messages = append(messages, Object{"role": "user", "content": strings.Repeat("long repeated fixture context ", 256)}, Object{"role": "assistant", "content": "same repeated answer"})
				}
				messages = append(messages, Object{"role": "user", "content": "FIRST"})
			}
			if mode == "default-effort" || mode == "top-effort" {
				messages = []any{Object{"role": "user", "content": "FIRST"}}
			}
			first := post("new", g)
			base := append([]any(nil), messages...)
			base = append(base, Object{"role": "assistant", "content": first["content"]})
			messages = append(append([]any(nil), base...), Object{"role": "user", "content": "SECOND"})
			second := post("continue", g)
			messages = append(messages, Object{"role": "assistant", "content": second["content"]}, Object{"role": "user", "content": "THIRD"})
			post("longer", g)
			messages = append(append([]any(nil), base...), Object{"role": "user", "content": "BRANCH"})
			post("rollback", g)
			post("new-cache-import", gateway())
		})
	}
}
