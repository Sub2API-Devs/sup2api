package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

// TestRealCLIPassthroughWebSearch: the client's web_search becomes Claude
// Code's WebSearch, answered by a one-shot process of the same account; the
// client receives search blocks whose encrypted_content restores what the
// model read in a later request, and the Claude Code client's own side query
// costs one upstream request.
func TestRealCLIPassthroughWebSearch(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for the real CLI web search test")
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
	for _, dir := range []string{plugin, filepath.Join(plugin, "search")} {
		if out, err := exec.Command(cli, "plugin", "validate", dir).CombinedOutput(); err != nil {
			t.Fatalf("Mod validation %s: %v: %s", dir, err, out)
		}
	}
	var mu sync.Mutex
	var wires []passthroughWire
	searches := 0
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, err := decodeObject(raw)
		if err != nil {
			t.Error(err)
			return
		}
		mu.Lock()
		wires = append(wires, passthroughWire{header: r.Header.Clone(), body: body, raw: raw})
		mu.Unlock()
		tools, _ := json.Marshal(body["tools"])
		history, _ := json.Marshal(body["messages"])
		switch {
		case bytes.Contains(tools, []byte(`"web_search_20250305"`)):
			// The WebSearch side query.
			mu.Lock()
			searches++
			n := searches
			mu.Unlock()
			query := "q"
			if m := strings.SplitN(string(history), webSearchFastPrompt, 2); len(m) == 2 {
				query = strings.SplitN(m[1], `"`, 2)[0]
			}
			writeSurfaceFixture(w, str(body, "model"), []Object{
				{"type": "server_tool_use", "id": fmt.Sprintf("srvtoolu_side%d", n), "name": "web_search", "input": Object{"query": query}},
				{"type": "web_search_tool_result", "tool_use_id": fmt.Sprintf("srvtoolu_side%d", n), "content": []any{
					Object{"type": "web_search_result", "title": "Fixture <" + query + ">", "url": "https://example.com/" + query, "encrypted_content": "provider-opaque", "page_age": nil}}},
				{"type": "text", "text": "Side commentary for " + query},
			})
		case bytes.Contains(history, []byte("SEARCH_TWICE")) && bytes.Count(history, []byte(`"tool_result"`)) < 2:
			id := fmt.Sprintf("toolu_main%d", bytes.Count(history, []byte(`"tool_result"`)))
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "Searching."}, {"type": "tool_use", "id": id, "name": "WebSearch", "input": Object{"query": "second"}}})
		case bytes.Contains(history, []byte("SEARCH_")) && !bytes.Contains(history, []byte(`"tool_result"`)):
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "Searching."}, {"type": "tool_use", "id": "toolu_main0", "name": "WebSearch", "input": Object{"query": "first"}}})
		default:
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "ANSWER_WITH_SOURCES"}})
		}
	}))
	defer fake.Close()
	base := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA", "CLAUDE_CODE_GIT_BASH_PATH"} {
		if value := os.Getenv(key); value != "" {
			base = append(base, key+"="+value)
		}
	}
	env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-passthrough-fixture", "ANTHROPIC_BASE_URL": fake.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"})
	cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
	if err != nil {
		t.Fatal(err)
	}
	g := &Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}, Cache: cache, Timeout: 90 * time.Second, Slots: make(chan struct{}, 2)}
	post := func(t *testing.T, body Object) *httptest.ResponseRecorder {
		t.Helper()
		raw, _ := json.Marshal(body)
		req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
		req.Header.Set(policyHeader, `{"relay_mode":"passthrough"}`)
		res := httptest.NewRecorder()
		g.ServeHTTP(res, req)
		return res
	}
	since := func(n int) []passthroughWire {
		mu.Lock()
		defer mu.Unlock()
		return append([]passthroughWire(nil), wires[n:]...)
	}
	count := func() int {
		mu.Lock()
		defer mu.Unlock()
		return len(wires)
	}
	webSearch := Object{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}
	toolResultText := func(t *testing.T, wire passthroughWire) string {
		messages := wire.body["messages"].([]any)
		for _, message := range messages {
			content, _ := message.(map[string]any)["content"].([]any)
			for _, block := range content {
				if b := block.(map[string]any); str(b, "type") == "tool_result" {
					if text, ok := b["content"].(string); ok {
						return text
					}
					items, _ := b["content"].([]any)
					var parts []string
					for _, item := range items {
						parts = append(parts, str(item.(map[string]any), "text"))
					}
					return strings.Join(parts, "")
				}
			}
		}
		t.Fatalf("no tool result upstream: %s", wire.raw)
		return ""
	}

	var answer Object
	var readText string
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprintf("search stream=%t", stream), func(t *testing.T) {
			n := count()
			res := post(t, Object{"model": "claude-sonnet-4-6", "max_tokens": 1024, "stream": stream, "tools": []any{webSearch}, "messages": []any{Object{"role": "user", "content": "SEARCH_ONCE"}}})
			if res.Code != 200 {
				t.Fatalf("HTTP%d %s", res.Code, res.Body.String())
			}
			message := Object{}
			if stream {
				message = replaySSE(t, res.Body.String())
			} else if err := json.Unmarshal(res.Body.Bytes(), &message); err != nil {
				t.Fatal(err)
			}
			var kinds []string
			for _, block := range message["content"].([]any) {
				kinds = append(kinds, str(block.(map[string]any), "type"))
			}
			if strings.Join(kinds, ",") != "text,server_tool_use,web_search_tool_result,text" {
				t.Fatalf("blocks %v: %s", kinds, res.Body.String())
			}
			result := message["content"].([]any)[2].(map[string]any)
			entry := result["content"].([]any)[0].(map[string]any)
			if str(entry, "title") != "Fixture <first>" || str(entry, "url") != "https://example.com/first" || !strings.HasPrefix(str(entry, "encrypted_content"), webSearchContentPrefix) {
				t.Fatalf("result %v", result)
			}
			usage := message["usage"].(map[string]any)
			if server, _ := usage["server_tool_use"].(map[string]any); fmt.Sprint(server["web_search_requests"]) != "1" {
				t.Fatalf("usage %v", usage)
			}
			got := since(n)
			if len(got) != 3 {
				t.Fatalf("%d upstream requests, want main, search, main", len(got))
			}
			readText = toolResultText(t, got[2])
			if !strings.HasPrefix(readText, `Web search results for query: "first"`) || !strings.Contains(readText, "Side commentary for first") {
				t.Fatalf("model read %q", readText)
			}
			answer = message
		})
	}

	t.Run("history restored elsewhere", func(t *testing.T) {
		n := count()
		history := []any{Object{"role": "user", "content": "SEARCH_ONCE"}, Object{"role": "assistant", "content": answer["content"]}, Object{"role": "user", "content": "AND_THEN"}}
		res := post(t, Object{"model": "claude-sonnet-4-6", "max_tokens": 1024, "tools": []any{webSearch}, "messages": history})
		if res.Code != 200 || !strings.Contains(res.Body.String(), "ANSWER_WITH_SOURCES") {
			t.Fatalf("HTTP%d %s", res.Code, res.Body.String())
		}
		got := since(n)
		if len(got) != 1 {
			t.Fatalf("%d upstream requests", len(got))
		}
		if text := toolResultText(t, got[0]); text != readText {
			t.Fatalf("restored tool result\n%q\nwant\n%q", text, readText)
		}
		if !bytes.Contains(got[0].raw, []byte(`"name":"WebSearch"`)) || bytes.Contains(got[0].raw, []byte("server_tool_use")) {
			t.Fatalf("history not Claude Code's WebSearch: %s", got[0].raw)
		}
		forged := []any{Object{"role": "user", "content": "x"}, Object{"role": "assistant", "content": []any{
			Object{"type": "server_tool_use", "id": "srvtoolu_x", "name": "web_search", "input": Object{"query": "x"}},
			Object{"type": "web_search_tool_result", "tool_use_id": "srvtoolu_x", "content": []any{Object{"type": "web_search_result", "title": "t", "url": "https://example.com", "encrypted_content": "provider-opaque"}}},
			Object{"type": "text", "text": "y"}}}, Object{"role": "user", "content": "z"}}
		if res := post(t, Object{"model": "claude-sonnet-4-6", "max_tokens": 64, "messages": forged}); res.Code != 400 {
			t.Fatalf("provider result admitted: HTTP%d", res.Code)
		}
	})

	t.Run("max_uses", func(t *testing.T) {
		res := post(t, Object{"model": "claude-sonnet-4-6", "max_tokens": 1024, "tools": []any{Object{"type": "web_search_20250305", "name": "web_search", "max_uses": 1}}, "messages": []any{Object{"role": "user", "content": "SEARCH_TWICE"}}})
		if res.Code != 200 || !strings.Contains(res.Body.String(), `"error_code":"max_uses_exceeded"`) || !strings.Contains(res.Body.String(), "ANSWER_WITH_SOURCES") {
			t.Fatalf("HTTP%d %s", res.Code, res.Body.String())
		}
	})

	t.Run("client side query", func(t *testing.T) {
		n := count()
		res := post(t, Object{"model": "claude-sonnet-4-6", "max_tokens": 1024, "stream": true, "tools": []any{Object{"type": "web_search_20250305", "name": "web_search", "max_uses": 8}},
			"system":   "You are an assistant for performing a web search tool use",
			"messages": []any{Object{"role": "user", "content": webSearchFastPrompt + "fast"}}})
		if res.Code != 200 {
			t.Fatalf("HTTP%d %s", res.Code, res.Body.String())
		}
		message := replaySSE(t, res.Body.String())
		var kinds []string
		for _, block := range message["content"].([]any) {
			kinds = append(kinds, str(block.(map[string]any), "type"))
		}
		entries, _ := message["content"].([]any)[1].(map[string]any)["content"].([]any)
		if strings.Join(kinds, ",") != "server_tool_use,web_search_tool_result,text" || len(entries) != 1 || str(entries[0].(map[string]any), "title") != "Fixture <fast>" {
			t.Fatalf("blocks %v: %s", kinds, res.Body.String())
		}
		if got := since(n); len(got) != 1 {
			t.Fatalf("%d upstream requests, want the search only", len(got))
		}
	})
}

// replaySSE rebuilds the message a Messages API stream describes.
func replaySSE(t *testing.T, stream string) Object {
	t.Helper()
	var message Object
	var blocks []map[string]any
	inputs := map[int]string{}
	for _, line := range strings.Split(stream, "\n") {
		data, ok := strings.CutPrefix(line, "data: ")
		if !ok {
			continue
		}
		var event Object
		if err := json.Unmarshal([]byte(data), &event); err != nil {
			t.Fatal(err)
		}
		switch str(event, "type") {
		case "message_start":
			message = event["message"].(map[string]any)
		case "content_block_start":
			blocks = append(blocks, event["content_block"].(map[string]any))
		case "content_block_delta":
			i := int(event["index"].(float64))
			delta := event["delta"].(map[string]any)
			switch str(delta, "type") {
			case "text_delta":
				blocks[i]["text"] = str(blocks[i], "text") + str(delta, "text")
			case "input_json_delta":
				inputs[i] += str(delta, "partial_json")
			}
		case "message_delta":
			message["usage"] = event["usage"]
			for key, value := range event["delta"].(map[string]any) {
				message[key] = value
			}
		case "error":
			t.Fatalf("stream error: %s", data)
		}
	}
	content := []any{}
	for i, block := range blocks {
		if raw, ok := inputs[i]; ok {
			var input any
			_ = json.Unmarshal([]byte(raw), &input)
			block["input"] = input
		}
		content = append(content, block)
	}
	if message == nil {
		t.Fatalf("no message: %s", stream)
	}
	message["content"] = content
	return message
}
