package engine

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
)

func TestRealCLINoneChoiceRetainsCachedCatalog(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		wire, _ := decodeObject(raw)
		tools, _ := historyContent(wire["tools"])
		if len(tools) != 1 || str(tools[0], "name") != "mcp__ccgateway__client_task" || tools[0]["cache_control"] == nil {
			t.Error("tool_choice none lost cached catalog", tools)
		}
		choice, _ := wire["tool_choice"].(map[string]any)
		if str(choice, "type") != "none" {
			t.Error("tool choice changed")
		}
		writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "NO_TOOL_EXECUTED"}})
	})
	endpoint, _ := newThinkingOutputFixture(t, handler)
	body := Object{"model": "claude-opus-5-5", "max_tokens": 64, "tool_choice": Object{"type": "none"},
		"tools":    []any{Object{"name": "client_task", "input_schema": Object{"type": "object", "properties": Object{}}, "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}},
		"messages": []any{Object{"role": "user", "content": "say hello without tools"}}}
	raw, _ := json.Marshal(body)
	res, err := http.Post(endpoint+"/v1/messages", "application/json", strings.NewReader(string(raw)))
	if err != nil {
		t.Fatal(err)
	}
	out, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != 200 || !strings.Contains(string(out), "NO_TOOL_EXECUTED") {
		t.Fatalf("HTTP%d %s", res.StatusCode, out)
	}
}
