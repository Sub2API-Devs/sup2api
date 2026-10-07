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

// Wire-level coverage with a real CLI and a synthetic local API. These tests
// prove gateway/CLI adaptation, not provider or account entitlement.
func TestRealCLIFeaturePlanCompatibility(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated feature-plan compatibility")
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
	var captured []Object
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		request, err := decodeObject(raw)
		if err != nil {
			http.Error(w, "bad fixture request", 400)
			return
		}
		if bytes.Contains(raw, []byte("<ccgateway-request:")) {
			t.Error("request attribution marker leaked to upstream")
		}
		mu.Lock()
		captured = append(captured, request)
		mu.Unlock()
		blocks := []Object{{"type": "text", "text": "PLAN_OK"}}
		choice, _ := request["tool_choice"].(map[string]any)
		if str(choice, "type") == "tool" {
			blocks = []Object{{"type": "tool_use", "id": "toolu_plan", "name": choice["name"], "input": Object{"city": "Paris"}}}
		}
		writeSurfaceFixture(w, str(request, "model"), blocks)
	}))
	defer fake.Close()
	base := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if value := os.Getenv(key); value != "" {
			base = append(base, key+"="+value)
		}
	}
	env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-plan-fixture", "ANTHROPIC_BASE_URL": fake.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"})
	runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}
	newGateway := func() *Gateway {
		cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 32<<20)
		if err != nil {
			t.Fatal(err)
		}
		return &Gateway{Runner: runner, Cache: cache, Timeout: 35 * time.Second, Slots: make(chan struct{}, 2)}
	}
	gateway := newGateway()
	post := func(label string, g *Gateway, body Object) (Object, string, Object) {
		t.Helper()
		data, _ := json.Marshal(body)
		request := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(data))
		request.Header.Set("X-CCGateway-Session-ID", "feature-plan-history")
		response := httptest.NewRecorder()
		g.ServeHTTP(response, request)
		if response.Code != 200 {
			t.Fatalf("%s HTTP %d: %s", label, response.Code, response.Body.String())
		}
		answer := Object{}
		if body["stream"] == true {
			stream := response.Body.String()
			if !strings.Contains(stream, "event: message_stop") || strings.Contains(stream, "event: error") || !strings.Contains(stream, "PLAN_OK") {
				t.Fatalf("%s invalid client stream: %s", label, stream)
			}
		} else {
			var err error
			answer, err = decodeObject(response.Body.Bytes())
			if err != nil {
				t.Fatal(err)
			}
		}
		mu.Lock()
		wire := captured[len(captured)-1]
		mu.Unlock()
		if _, exists := body["temperature"]; exists {
			if fmt.Sprint(wire["temperature"]) != "0.2" || wire["service_tier"] != "standard_only" || digest(wire["stop_sequences"]) != digest([]string{"CLIENT_STOP"}) {
				t.Fatalf("%s client controls not applied: temperature=%v tier=%v stops=%v", label, wire["temperature"], wire["service_tier"], wire["stop_sequences"])
			}
		}
		system, _ := json.Marshal(wire["system"])
		if !bytes.Contains(system, []byte("CLIENT_PLAN_SYSTEM")) {
			t.Fatalf("%s lost client system", label)
		}
		t.Logf("%s history=%s", label, response.Header().Get("X-CCGateway-History"))
		return answer, response.Header().Get("X-CCGateway-History"), wire
	}
	controls := func(messages []any) Object {
		return Object{"model": "claude-sonnet-4-6", "max_tokens": 128, "thinking": Object{"type": "disabled"}, "system": "CLIENT_PLAN_SYSTEM", "messages": messages, "temperature": 0.2, "stop_sequences": []string{"CLIENT_STOP"}, "service_tier": "standard_only"}
	}
	messages := []any{Object{"role": "user", "content": "PLAN_START"}}
	first, _, _ := post("new", gateway, controls(messages))
	messages = append(messages, Object{"role": "assistant", "content": first["content"]}, Object{"role": "user", "content": "PLAN_CONTINUE"})
	second, history, _ := post("continue", gateway, controls(messages))
	if history != "prefix-hit" {
		t.Fatal("feature controls prevented native prefix hit")
	}
	branchMessages := append([]any(nil), messages[:2]...)
	messages = append(messages, Object{"role": "assistant", "content": second["content"]}, Object{"role": "user", "content": "PLAN_DEFAULTS"})
	without := controls(messages)
	delete(without, "temperature")
	delete(without, "stop_sequences")
	delete(without, "service_tier")
	third, history, wire := post("features-off", gateway, without)
	if history != "prefix-hit" {
		t.Fatal("turning controls off discarded native history")
	}
	if value, exists := wire["stop_sequences"]; exists && len(value.([]any)) > 0 {
		t.Fatal("prior request stop sequence leaked into defaults")
	}
	messages = append(messages, Object{"role": "assistant", "content": third["content"]}, Object{"role": "user", "content": "PLAN_FEATURES_AGAIN"})
	_, history, _ = post("features-on-again", gateway, controls(messages))
	if history != "prefix-hit" {
		t.Fatal("turning controls on discarded native history")
	}
	branchMessages = append(branchMessages, Object{"role": "user", "content": "PLAN_ALTERNATE"})
	_, history, wire = post("branch", gateway, controls(branchMessages))
	if history != "fork" {
		t.Fatal("older history did not fork")
	}
	encoded, _ := json.Marshal(wire["messages"])
	if bytes.Contains(encoded, []byte("PLAN_CONTINUE")) || bytes.Contains(encoded, []byte("PLAN_FEATURES_AGAIN")) {
		t.Fatal("fork included later history")
	}
	_, history, _ = post("new-cache-import", newGateway(), controls(messages))
	if history != "rebuild" {
		t.Fatalf("new cache import=%s, want rebuild", history)
	}
	toolBody := controls([]any{Object{"role": "user", "content": "PLAN_FORCE_TOOL"}})
	toolBody["tools"] = []any{Object{"name": "weather", "description": "Fixture tool", "input_schema": Object{"type": "object", "properties": Object{"city": Object{"type": "string"}}, "required": []string{"city"}}}}
	toolDefinition := toolBody["tools"].([]any)[0].(map[string]any)
	toolDefinition["input_schema"].(map[string]any)["additionalProperties"] = false
	toolDefinition["strict"] = true
	toolDefinition["eager_input_streaming"] = true
	toolDefinition["input_examples"] = []any{Object{"city": "Paris"}}
	toolDefinition["allowed_callers"] = []any{"direct"}
	toolDefinition["type"] = "custom"
	toolBody["tool_choice"] = Object{"type": "tool", "name": "weather", "disable_parallel_tool_use": true}
	answer, _, wire := post("forced-tool", gateway, toolBody)
	var foundMetadata bool
	for _, value := range wire["tools"].([]any) {
		tool := value.(map[string]any)
		if str(tool, "name") != "mcp__ccgateway__weather" {
			continue
		}
		foundMetadata = true
		for _, key := range []string{"strict", "eager_input_streaming", "input_examples", "allowed_callers", "type", "input_schema", "description"} {
			if digest(tool[key]) != digest(toolDefinition[key]) {
				t.Fatalf("tool metadata %s lost", key)
			}
		}
	}
	if !foundMetadata {
		t.Fatal("metadata tool missing")
	}
	choice := wire["tool_choice"].(map[string]any)
	if choice["name"] != "mcp__ccgateway__weather" || choice["disable_parallel_tool_use"] != true || answer["stop_reason"] != "tool_use" {
		t.Fatal("forced tool choice or client handoff was not preserved")
	}
	content := answer["content"].([]any)
	if str(content[0].(map[string]any), "name") != "weather" {
		t.Fatal("client tool name was not restored")
	}
	toolBody["messages"] = append(toolBody["messages"].([]any), Object{"role": "assistant", "content": content}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_plan", "content": "CLIENT_PLAN_TOOL_RESULT"}}})
	toolBody["tool_choice"] = Object{"type": "auto", "disable_parallel_tool_use": false}
	_, history, wire = post("forced-tool-result", gateway, toolBody)
	if history != "prefix-hit" {
		t.Fatal("tool result did not reuse the feature-plan history")
	}
	encoded, _ = json.Marshal(wire["messages"])
	if !bytes.Contains(encoded, []byte("CLIENT_PLAN_TOOL_RESULT")) {
		t.Fatal("client tool result missing from continuation")
	}
	streamBody := controls([]any{Object{"role": "user", "content": "PLAN_STREAM"}})
	streamBody["stream"] = true
	post("stream", gateway, streamBody)
	t.Logf("CLI=%s local-only feature-plan requests=%d; no provider inference", version, len(captured))
}
