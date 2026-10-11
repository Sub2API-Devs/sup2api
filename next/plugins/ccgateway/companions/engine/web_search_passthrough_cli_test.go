package engine

import (
	"bytes"
	"context"
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

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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
		cmd := exec.Command(cli, "plugin", "validate", dir)
		cmd.Env = nativeProbeEnv(root, "http://127.0.0.1:1")
		if out, err := cmd.CombinedOutput(); err != nil {
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
	env := nativeProbeEnv(root, fake.URL)
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

func TestNativeWebSearchUsage(t *testing.T) {
	for _, tc := range []struct {
		name      string
		usage     Object
		wantError string
	}{
		{name: "absent", wantError: "input_tokens"},
		{name: "incomplete", usage: Object{"input_tokens": 20}, wantError: "output_tokens"},
		{name: "fractional", usage: Object{"input_tokens": 1.5}, wantError: "input_tokens"},
		{name: "negative", usage: Object{"input_tokens": -1}, wantError: "input_tokens"},
		{name: "cache lifetime missing", usage: Object{"input_tokens": 20, "output_tokens": 8, "cache_creation_input_tokens": 17}, wantError: "5m/1h"},
		{name: "search count missing", usage: Object{"input_tokens": 20, "output_tokens": 8}, wantError: "web_search_requests"},
		{name: "no cache writes", usage: Object{"input_tokens": 20, "output_tokens": 8, "server_tool_use": Object{"web_search_requests": 1}}},
		{name: "both cache lifetimes", usage: Object{"input_tokens": 20, "output_tokens": 8, "cache_creation_input_tokens": 17, "cache_creation": Object{"ephemeral_5m_input_tokens": 11, "ephemeral_1h_input_tokens": 6}, "server_tool_use": Object{"web_search_requests": 1}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			err := validateNativeWebSearchUsage(tc.usage)
			if tc.wantError != "" {
				require.ErrorContains(t, err, tc.wantError)
				return
			}
			require.NoError(t, err)
		})
	}
}

func nativeWebSearchUsageFixture() Object {
	return Object{"input_tokens": 20, "output_tokens": 8, "cache_read_input_tokens": 31, "cache_creation_input_tokens": 17, "cache_creation": Object{"ephemeral_5m_input_tokens": 11, "ephemeral_1h_input_tokens": 6}, "server_tool_use": Object{"web_search_requests": 1, "web_fetch_requests": 0, "code_execution_requests": 0}, "service_tier": "standard", "inference_geo": "us", "speed": "standard", "output_tokens_details": Object{"thinking_tokens": 2}, "iterations": []any{}}
}

func TestNativeWebSearchCompleteAccounting(t *testing.T) {
	for _, tc := range []struct {
		name  string
		patch Object
		want  string
	}{
		{"complete", nil, ""},
		{"unknown fact", Object{"new_billable_tokens": 1}, "unknown"},
		{"unknown detail", Object{"output_tokens_details": Object{"new_tokens": 1}}, "unknown"},
		{"null detail", Object{"output_tokens_details": nil}, "unknown"},
		{"unknown cache reads", Object{"cache_read_input_tokens": nil}, "unknown"},
		{"unknown cache writes", Object{"cache_creation_input_tokens": nil}, "unknown"},
		{"unknown server counter", Object{"server_tool_use": Object{"web_search_requests": 1, "new_requests": 0}}, "unknown"},
		{"thinking subset", Object{"output_tokens_details": Object{"thinking_tokens": 9}}, "exceeds"},
		{"invalid category", Object{"speed": 1}, "category"},
		{"iterations", Object{"iterations": []any{Object{"type": "message", "input_tokens": 1}}}, "iterations"},
		{"fetch", Object{"server_tool_use": Object{"web_search_requests": 1, "web_fetch_requests": 1}}, "undeclared"},
		{"execution", Object{"server_tool_use": Object{"web_search_requests": 1, "code_execution_requests": 1}}, "undeclared"},
		{"zero search with result", Object{"server_tool_use": Object{"web_search_requests": 0}}, "zero requests"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			usage := nativeWebSearchUsageFixture()
			for key, value := range tc.patch {
				usage[key] = value
			}
			err := validateNativeWebSearchUsage(usage)
			if err == nil {
				_, err = nativeWebSearchRecord(Object{"query": "q"}, []Object{{"type": "web_search_tool_result", "content": []any{}}}, usage, 0)
			}
			if tc.want != "" {
				require.ErrorContains(t, err, tc.want)
				return
			}
			require.NoError(t, err)
		})
	}
	for _, key := range searchUsageCategories {
		for _, missing := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s missing=%t", key, missing), func(t *testing.T) {
				total := Object{}
				require.NoError(t, addNativeWebSearchUsage(total, nativeWebSearchUsageFixture()))
				before := copySearchUsage(total)
				current := nativeWebSearchUsageFixture()
				if missing {
					delete(current, key)
				} else {
					current[key] = "different"
				}
				err := addNativeWebSearchUsage(total, current)
				require.Error(t, err)
				var refusal *requestRefusal
				require.ErrorAs(t, err, &refusal)
				assert.Equal(t, before, total)
			})
		}
	}
	t.Run("main and child facts", func(t *testing.T) {
		child := nativeWebSearchUsageFixture()
		main := nativeWebSearchUsageFixture()
		main["server_tool_use"] = Object{"web_search_requests": 0, "web_fetch_requests": 2}
		plan := &webSearchPlan{usage: Object{}}
		require.NoError(t, addNativeWebSearchUsage(plan.usage, child))
		prior := Object{}
		require.NoError(t, addNativeWebSearchUsage(prior, main))
		usage, err := plan.nativeWebSearchUsage(prior, main)
		require.NoError(t, err)
		assert.Equal(t, 60, usage["input_tokens"])
		assert.Equal(t, 24, usage["output_tokens"])
		assert.Equal(t, 6, usage["output_tokens_details"].(Object)["thinking_tokens"])
		assert.Equal(t, 33, usage["cache_creation"].(Object)["ephemeral_5m_input_tokens"])
		assert.Equal(t, 18, usage["cache_creation"].(Object)["ephemeral_1h_input_tokens"])
		assert.Equal(t, 4, usage["server_tool_use"].(Object)["web_fetch_requests"])
		assert.Equal(t, 1, usage["server_tool_use"].(Object)["web_search_requests"])
		assert.Equal(t, []any{}, usage["iterations"])
		for _, key := range searchUsageCategories {
			assert.Equal(t, child[key], usage[key])
		}
		for key := range usage {
			assert.False(t, strings.HasPrefix(key, "_"))
		}
		delete(main, "speed")
		_, err = plan.nativeWebSearchUsage(prior, main)
		require.ErrorContains(t, err, "speed")
		_, err = plan.nativeWebSearchUsage(prior, nil)
		require.ErrorContains(t, err, "final usage")
		prior["_missing_speed"] = true
		_, err = plan.nativeWebSearchUsage(prior, child)
		require.ErrorContains(t, err, "speed")
	})
}

func writeNativeWebSearchFixture(t *testing.T, w http.ResponseWriter, model string, blocks []Object, usage Object) {
	t.Helper()
	fixture := httptest.NewRecorder()
	writeSurfaceFixture(fixture, model, blocks)
	w.Header().Set("Content-Type", "text/event-stream")
	for line := range strings.SplitSeq(fixture.Body.String(), "\n") {
		if data, ok := strings.CutPrefix(line, "data: "); ok {
			event, err := decodeObject([]byte(data))
			if !assert.NoError(t, err) {
				return
			}
			if str(event, "type") == "message_start" {
				start := Object{}
				for key, value := range usage {
					start[key] = value
				}
				start["output_tokens"] = 0
				event["message"].(Object)["usage"] = start
			}
			encoded, err := marshalPlain(event)
			if !assert.NoError(t, err) {
				return
			}
			line = "data: " + string(encoded)
		}
		fmt.Fprintln(w, line)
	}
}

func TestRealCLINativeWebSearchBillingModes(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for search billing mode propagation")
	}
	for _, mode := range []struct {
		speed        string
		missingSpeed bool
	}{{`"standard"`, false}, {`"fast"`, false}, {`"fast"`, true}, {"", false}, {"null", false}} {
		fast := mode.speed == `"fast"`
		t.Run(fmt.Sprintf("speed=%s missingSpeed=%t", mode.speed, mode.missingSpeed), func(t *testing.T) {
			root := t.TempDir()
			plugin, err := extractMod(root)
			require.NoError(t, err)
			usage := nativeWebSearchUsageFixture()
			if fast {
				usage["speed"] = "fast"
			}
			if mode.missingSpeed {
				delete(usage, "speed")
			}
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !assert.Equal(t, "/v1/messages", r.URL.Path) {
					http.Error(w, "unexpected offline endpoint", 403)
					return
				}
				raw, err := io.ReadAll(r.Body)
				if !assert.NoError(t, err) {
					return
				}
				body, err := decodeObject(raw)
				if !assert.NoError(t, err) {
					return
				}
				assert.Equal(t, "claude-opus-4-6", body["model"])
				assert.Equal(t, "auto", body["service_tier"])
				assert.Equal(t, "us", body["inference_geo"])
				if mode.speed == "" || mode.speed == "null" {
					assert.NotContains(t, body, "speed")
				} else {
					assert.Equal(t, strings.Trim(mode.speed, `"`), body["speed"])
				}
				writeNativeWebSearchFixture(t, w, str(body, "model"), []Object{
					{"type": "server_tool_use", "id": "srvtoolu_mode", "name": "web_search", "input": Object{"query": "mode"}},
					{"type": "web_search_tool_result", "tool_use_id": "srvtoolu_mode", "content": []any{}},
					{"type": "text", "text": "mode fixture"},
				}, usage)
			}))
			defer upstream.Close()
			ctx, cancel := context.WithTimeout(t.Context(), 30*time.Second)
			defer cancel()
			runner := &Runner{CLI: cli, Plugin: plugin, Env: nativeProbeEnv(root, upstream.URL)}
			speedField := ""
			if mode.speed != "" {
				speedField = `,"speed":` + mode.speed
			}
			h := http.Header{}
			h.Set(policyHeader, `{"relay_mode":"native","allow_fast":true}`)
			h.Set("Anthropic-Beta", "fast-mode-2026-02-01")
			req, err := parsePolicyRequest([]byte(`{"model":"claude-opus-4-6","max_tokens":256,"service_tier":"auto","inference_geo":"us","messages":[{"role":"user","content":"mode"}],"tools":[{"type":"web_search_20250305","name":"web_search"}]`+speedField+`}`), h)
			require.NoError(t, err)
			record, _, err := runner.runWebSearch(ctx, req, root, Object{"query": "mode"})
			if mode.missingSpeed {
				require.ErrorContains(t, err, "missing requested speed")
				assert.Nil(t, record)
				assert.Empty(t, req.webSearch.usage)
				return
			}
			require.NoError(t, err)
			answer := webSearchAnswer(req, record, "mode")
			got, err := marshalPlain(answer["usage"])
			require.NoError(t, err)
			want, err := marshalPlain(usage)
			require.NoError(t, err)
			assert.JSONEq(t, string(want), string(got))
		})
	}
}

func TestRealCLINativeWebSearchBillingAggregationGateway(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for complete search billing aggregation")
	}
	for _, scenario := range []string{"complete", "conflicting speed", "missing category"} {
		t.Run(scenario, func(t *testing.T) {
			root := t.TempDir()
			plugin, err := extractMod(root)
			require.NoError(t, err)
			var mu sync.Mutex
			requests := 0
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !assert.Equal(t, "/v1/messages", r.URL.Path) {
					http.Error(w, "unexpected endpoint", 403)
					return
				}
				mu.Lock()
				requests++
				n := requests
				mu.Unlock()
				usage := nativeWebSearchUsageFixture()
				usage["server_tool_use"] = Object{"web_search_requests": 0, "web_fetch_requests": 0, "code_execution_requests": 0}
				var blocks []Object
				switch n {
				case 1:
					blocks = []Object{{"type": "tool_use", "id": "toolu_billing", "name": "WebSearch", "input": Object{"query": "billing"}}}
				case 2:
					usage["server_tool_use"].(Object)["web_search_requests"] = 1
					blocks = []Object{{"type": "server_tool_use", "id": "srvtoolu_billing", "name": "web_search", "input": Object{"query": "billing"}}, {"type": "web_search_tool_result", "tool_use_id": "srvtoolu_billing", "content": []any{}}, {"type": "text", "text": "search done"}}
				case 3:
					blocks = []Object{{"type": "text", "text": "final answer"}}
					if scenario == "conflicting speed" {
						usage["speed"] = "fast"
					}
					if scenario == "missing category" {
						delete(usage, "service_tier")
					}
				default:
					assert.Fail(t, "unexpected further inference")
					http.Error(w, "no more requests", 403)
					return
				}
				writeNativeWebSearchFixture(t, w, "claude-sonnet-4-6", blocks, usage)
			}))
			defer upstream.Close()
			cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
			require.NoError(t, err)
			gateway := &Gateway{Runner: &Runner{CLI: cli, Plugin: plugin, Version: "2.1.292", Work: root, Env: nativeProbeEnv(root, upstream.URL)}, Cache: cache, Timeout: 30 * time.Second, Slots: make(chan struct{}, 1)}
			raw, err := marshalPlain(Object{"model": "claude-sonnet-4-6", "max_tokens": 1024, "tools": []any{Object{"type": "web_search_20250305", "name": "web_search"}}, "messages": []any{Object{"role": "user", "content": "billing query"}}})
			require.NoError(t, err)
			request := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(raw)).WithContext(t.Context())
			request.Header.Set(policyHeader, `{"relay_mode":"native"}`)
			response := httptest.NewRecorder()
			gateway.ServeHTTP(response, request)
			mu.Lock()
			assert.Equal(t, 3, requests)
			mu.Unlock()
			if scenario != "complete" {
				assert.Equal(t, 502, response.Code, response.Body.String())
				assert.Equal(t, "request", response.Header().Get(errorScopeHeader))
				return
			}
			require.Equal(t, 200, response.Code, response.Body.String())
			message, err := decodeObject(response.Body.Bytes())
			require.NoError(t, err)
			want := nativeWebSearchUsageFixture()
			want["input_tokens"], want["output_tokens"], want["cache_read_input_tokens"], want["cache_creation_input_tokens"] = 60, 24, 93, 51
			want["cache_creation"] = Object{"ephemeral_5m_input_tokens": 33, "ephemeral_1h_input_tokens": 18}
			want["output_tokens_details"] = Object{"thinking_tokens": 6}
			wantJSON, err := marshalPlain(want)
			require.NoError(t, err)
			gotJSON, err := marshalPlain(message["usage"])
			require.NoError(t, err)
			assert.JSONEq(t, string(wantJSON), string(gotJSON))
		})
	}
}

func TestRealCLINativeWebSearchUsage(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for the native search accounting acceptance test")
	}
	root := t.TempDir()
	plugin, err := extractMod(root)
	require.NoError(t, err)
	var mu sync.Mutex
	requests := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !assert.True(t, strings.HasSuffix(r.URL.Path, "/messages"), r.URL.Path) {
			http.Error(w, "unexpected endpoint", http.StatusForbidden)
			return
		}
		body, err := io.ReadAll(r.Body)
		if !assert.NoError(t, err) {
			return
		}
		assert.Contains(t, string(body), "web_search_20250305")
		mu.Lock()
		requests++
		mu.Unlock()
		wire, err := decodeObject(body)
		if !assert.NoError(t, err) {
			return
		}
		assert.Equal(t, "claude-sonnet-4-6", wire["model"])
		assert.Equal(t, Object{"type": "tool", "name": "web_search"}, wire["tool_choice"])
		assert.Equal(t, []any{Object{"type": "web_search_20250305", "name": "web_search", "max_uses": json.Number("8"), "allowed_domains": []any{"example.com"}}}, wire["tools"])
		writeNativeWebSearchFixture(t, w, str(wire, "model"), []Object{
			{"type": "server_tool_use", "id": "srvtoolu_native", "name": "web_search", "input": Object{"query": "native"}},
			{"type": "web_search_tool_result", "tool_use_id": "srvtoolu_native", "content": []any{Object{"type": "web_search_result", "title": "Native fixture", "url": "https://example.com/native", "encrypted_content": "provider-opaque"}}},
			{"type": "text", "text": "Native search commentary"},
		}, Object{"input_tokens": 20, "output_tokens": 8, "cache_read_input_tokens": 31, "cache_creation_input_tokens": 17, "cache_creation": Object{"ephemeral_5m_input_tokens": 11, "ephemeral_1h_input_tokens": 6}, "server_tool_use": Object{"web_search_requests": 1}})
	}))
	defer upstream.Close()
	ctx, cancel := context.WithTimeout(t.Context(), 90*time.Second)
	defer cancel()
	var stderr bytes.Buffer
	runner := &Runner{CLI: cli, Plugin: plugin, Work: root, Env: nativeProbeEnv(root, upstream.URL), Stderr: &stderr}
	req := &Request{NativeTransport: true, Passthrough: true, Model: "claude-sonnet-4-6", webSearch: &webSearchPlan{usage: Object{}, records: map[string]*webSearchRecord{}}}
	record, upstreamErr, err := runner.runWebSearch(ctx, req, root, Object{"query": "native", "allowed_domains": []any{"example.com"}})
	assert.Nil(t, upstreamErr)
	require.NoError(t, err, "stderr=%s", stderr.String())
	require.NotNil(t, record)
	mu.Lock()
	assert.Equal(t, 1, requests)
	mu.Unlock()
	assert.Contains(t, record.Text, "Native search commentary")
	for key, expected := range map[string]int64{"input_tokens": 20, "output_tokens": 8, "cache_read_input_tokens": 31, "cache_creation_input_tokens": 17} {
		count, ok := usageInt(req.webSearch.usage[key])
		assert.True(t, ok, key)
		assert.Equal(t, expected, count, key)
	}
	split, _ := req.webSearch.usage["cache_creation"].(Object)
	for key, expected := range map[string]int64{"ephemeral_5m_input_tokens": 11, "ephemeral_1h_input_tokens": 6} {
		count, ok := usageInt(split[key])
		assert.True(t, ok, key)
		assert.Equal(t, expected, count, key)
	}
	req.webSearch.records["native"] = record
	assert.Equal(t, 1, req.webSearch.searches())
}

func TestRealCLINativeWebSearchGateway(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for native search gateway acceptance")
	}
	root := t.TempDir()
	plugin, err := extractMod(root)
	require.NoError(t, err)
	var mu sync.Mutex
	var wires []Object
	var searchNumber int
	citation := Object{"type": "web_search_result_location", "url": "https://example.com/native", "title": "Native fixture", "encrypted_index": "provider-citation", "cited_text": "Native fixture"}
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !assert.Equal(t, "/v1/messages", r.URL.Path) {
			http.Error(w, "unexpected endpoint", http.StatusForbidden)
			return
		}
		raw, err := io.ReadAll(r.Body)
		if !assert.NoError(t, err) {
			return
		}
		body, err := decodeObject(raw)
		if !assert.NoError(t, err) {
			return
		}
		mu.Lock()
		wires = append(wires, body)
		mu.Unlock()
		tools, _ := marshalPlain(body["tools"])
		history, _ := marshalPlain(body["messages"])
		if bytes.Contains(tools, []byte("web_search_20250305")) {
			assert.Equal(t, "dummy-native-probe", r.Header.Get("X-Api-Key"))
			assert.Equal(t, "claude-sonnet-4-6", body["model"])
			assert.Equal(t, Object{"type": "tool", "name": "web_search"}, body["tool_choice"])
			query := ""
			for _, message := range body["messages"].([]any) {
				for _, value := range message.(Object)["content"].([]any) {
					if text, ok := strings.CutPrefix(str(value.(Object), "text"), webSearchFastPrompt); ok {
						query = text
					}
				}
			}
			assert.NotEmpty(t, query)
			mu.Lock()
			searchNumber++
			n := searchNumber
			mu.Unlock()
			groups := 1
			if query == "multi" {
				groups = 2
			}
			var blocks []Object
			for i := range groups {
				id := fmt.Sprintf("srvtoolu_native_%d_%d", n, i)
				blocks = append(blocks, Object{"type": "server_tool_use", "id": id, "name": "web_search", "input": Object{"query": query}})
				var content any = []any{Object{"type": "web_search_result", "title": "Native fixture", "url": "https://example.com/native", "encrypted_content": "provider-opaque", "page_age": "1 day ago"}}
				if query == "error" || query == "multi" && i == 1 {
					content = Object{"type": "web_search_tool_result_error", "error_code": "max_uses_exceeded"}
				}
				blocks = append(blocks, Object{"type": "web_search_tool_result", "tool_use_id": id, "content": content})
			}
			blocks = append(blocks, Object{"type": "text", "text": "Native commentary", "citations": []any{citation}})
			writeNativeWebSearchFixture(t, w, str(body, "model"), blocks, Object{"input_tokens": 20, "output_tokens": 8, "cache_read_input_tokens": 31, "cache_creation_input_tokens": 17, "cache_creation": Object{"ephemeral_5m_input_tokens": 11, "ephemeral_1h_input_tokens": 6}, "server_tool_use": Object{"web_search_requests": groups}})
			return
		}
		limit := 1
		if bytes.Contains(history, []byte("SEARCH_TWICE")) {
			limit = 2
		}
		if bytes.Count(history, []byte(`"tool_result"`)) < limit {
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "Searching."}, {"type": "tool_use", "id": fmt.Sprintf("toolu_main%d", bytes.Count(history, []byte(`"tool_result"`))), "name": "WebSearch", "input": Object{"query": "native"}}})
			return
		}
		writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "ANSWER_WITH_SOURCES"}})
	}))
	defer fake.Close()
	cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
	require.NoError(t, err)
	var stderr bytes.Buffer
	g := &Gateway{Runner: &Runner{CLI: cli, Plugin: plugin, Version: "2.1.292", Work: root, Env: nativeProbeEnv(root, fake.URL), Stderr: &stderr}, Cache: cache, Timeout: 90 * time.Second, Slots: make(chan struct{}, 2)}
	post := func(t *testing.T, messages []any, stream bool, tool Object) Object {
		t.Helper()
		raw, err := marshalPlain(Object{"model": "claude-sonnet-4-6", "max_tokens": 1024, "stream": stream, "tools": []any{tool}, "messages": messages})
		require.NoError(t, err)
		req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(raw))
		req.Header.Set(policyHeader, `{"relay_mode":"native"}`)
		res := httptest.NewRecorder()
		g.ServeHTTP(res, req)
		require.Equal(t, 200, res.Code, "%s stderr=%s", res.Body.String(), stderr.String())
		if stream {
			return replaySSE(t, res.Body.String())
		}
		var message Object
		require.NoError(t, json.Unmarshal(res.Body.Bytes(), &message))
		return message
	}
	tool := Object{"type": "web_search_20250305", "name": "web_search", "max_uses": 1, "blocked_domains": []any{"blocked.example"}}
	var prior, priorFast Object
	for _, tc := range []struct {
		name        string
		fast        bool
		stream      bool
		query       string
		calls       int
		searchCount int
	}{
		{"normal JSON", false, false, "SEARCH_ONCE", 3, 1},
		{"normal SSE", false, true, "SEARCH_ONCE", 3, 1},
		{"fast JSON", true, false, "native", 1, 1},
		{"fast SSE", true, true, "native", 1, 1},
		{"multiple groups and error", true, true, "multi", 1, 2},
		{"tool error", true, false, "error", 1, 1},
		{"quoted query", true, false, "quoted \"term\"\nnext", 1, 1},
		{"max uses", false, false, "SEARCH_TWICE", 4, 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			mu.Lock()
			before := len(wires)
			mu.Unlock()
			prompt := tc.query
			if tc.fast {
				prompt = webSearchFastPrompt + prompt
			}
			message := post(t, []any{Object{"role": "user", "content": prompt}}, tc.stream, tool)
			mu.Lock()
			got := append([]Object(nil), wires[before:]...)
			mu.Unlock()
			assert.Len(t, got, tc.calls)
			usage := message["usage"].(Object)
			assert.EqualValues(t, tc.calls*20, usage["input_tokens"])
			assert.EqualValues(t, tc.calls*8, usage["output_tokens"])
			assert.EqualValues(t, 17, usage["cache_creation_input_tokens"])
			assert.EqualValues(t, 31, usage["cache_read_input_tokens"])
			assert.EqualValues(t, 11, usage["cache_creation"].(Object)["ephemeral_5m_input_tokens"])
			assert.EqualValues(t, 6, usage["cache_creation"].(Object)["ephemeral_1h_input_tokens"])
			assert.EqualValues(t, tc.searchCount, usage["server_tool_use"].(Object)["web_search_requests"])
			var errorsFound int
			for _, rawBlock := range message["content"].([]any) {
				block := rawBlock.(Object)
				if str(block, "type") == "web_search_tool_result" {
					if failure, ok := block["content"].(Object); ok {
						assert.Equal(t, "max_uses_exceeded", failure["error_code"])
						errorsFound++
						continue
					}
					entries := block["content"].([]any)
					require.NotEmpty(t, entries)
					entry := entries[0].(Object)
					assert.Equal(t, "1 day ago", entry["page_age"])
					payload, valid := openWebSearchContent(str(entry, "encrypted_content"))
					assert.True(t, valid)
					assert.Contains(t, payload.Text, "Native commentary")
				}
				if tc.fast && str(block, "type") == "text" {
					assert.Equal(t, []any{citation}, block["citations"])
				}
			}
			if tc.query == "multi" || tc.query == "error" || tc.query == "SEARCH_TWICE" {
				assert.Equal(t, 1, errorsFound)
			}
			for _, wire := range got {
				for _, rawTool := range wire["tools"].([]any) {
					entry := rawTool.(Object)
					if str(entry, "type") == "web_search_20250305" {
						assert.Equal(t, []any{"blocked.example"}, entry["blocked_domains"])
						assert.Equal(t, json.Number("8"), entry["max_uses"])
					}
				}
			}
			if tc.name == "normal JSON" {
				prior = message
			}
			if tc.name == "fast JSON" {
				priorFast = message
			}
			if tc.query == "multi" || tc.query == "error" || tc.name == "quoted query" {
				ctx, cancel := context.WithTimeout(t.Context(), 30*time.Second)
				defer cancel()
				input := Object{"query": tc.query}
				legacy, upstream, err := g.Runner.runWebSearch(ctx, &Request{Model: "claude-sonnet-4-6", Passthrough: true}, root, input)
				require.NoError(t, err)
				require.Nil(t, upstream)
				native, upstream, err := g.Runner.runWebSearch(ctx, &Request{Model: "claude-sonnet-4-6", NativeTransport: true}, root, input)
				require.NoError(t, err)
				require.Nil(t, upstream)
				assert.Equal(t, legacy.Text, native.Text, "native WebSearch tool-result text compatibility")
			}
		})
	}
	for name, prior := range map[string]Object{"normal history": prior, "fast citation history": priorFast} {
		t.Run(name, func(t *testing.T) {
			require.NotNil(t, prior)
			message := post(t, []any{Object{"role": "user", "content": "SEARCH_ONCE"}, Object{"role": "assistant", "content": prior["content"]}, Object{"role": "user", "content": "continue"}}, false, tool)
			assert.Contains(t, fmt.Sprint(message["content"]), "ANSWER_WITH_SOURCES")
		})
	}
}

func TestRealCLINativeWebSearchFailures(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for native search failure acceptance")
	}
	for _, kind := range []string{"ready denied", "rate limit", "missing usage", "missing final output", "client tool"} {
		t.Run(kind, func(t *testing.T) {
			root := t.TempDir()
			plugin, err := extractMod(root)
			require.NoError(t, err)
			ctx, cancel := context.WithTimeout(t.Context(), 30*time.Second)
			defer cancel()
			var mu sync.Mutex
			requests := 0
			ready := false
			modServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				raw, err := io.ReadAll(r.Body)
				if !assert.NoError(t, err) {
					return
				}
				r.Body = io.NopCloser(bytes.NewReader(raw))
				ack, _ := decodeObject(raw)
				if kind == "ready denied" && str(ack, "event") == "ready" {
					http.Error(w, "ready rejected", http.StatusForbidden)
					cancel()
					return
				}
				res := httptest.NewRecorder()
				if !serveModControl(res, r) {
					http.NotFound(w, r)
					return
				}
				if res.Code == 200 && str(ack, "event") == "ready" {
					mu.Lock()
					ready = true
					mu.Unlock()
				}
				for key, values := range res.Header() {
					w.Header()[key] = values
				}
				w.WriteHeader(res.Code)
				_, _ = w.Write(res.Body.Bytes())
			}))
			defer modServer.Close()
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				mu.Lock()
				requests++
				assert.True(t, ready, "inference must wait for authenticated Mod ready")
				mu.Unlock()
				assert.Equal(t, "/v1/messages", r.URL.Path)
				if kind == "rate limit" {
					w.Header().Set("Content-Type", "application/json")
					w.Header().Set("Request-Id", "req_native_search_mock")
					w.WriteHeader(http.StatusTooManyRequests)
					fmt.Fprint(w, `{"type":"error","error":{"type":"rate_limit_error","message":"offline native search fixture"}}`)
					return
				}
				if kind == "client tool" {
					writeSurfaceFixture(w, "claude-sonnet-4-6", []Object{{"type": "tool_use", "id": "toolu_client", "name": "Write", "input": Object{"file_path": filepath.Join(root, "must-not-exist"), "content": "forbidden"}}})
					return
				}
				if kind == "missing final output" {
					fixture := httptest.NewRecorder()
					writeNativeWebSearchFixture(t, fixture, "claude-sonnet-4-6", []Object{{"type": "text", "text": "unmetered"}}, Object{"input_tokens": 20, "output_tokens": 8, "server_tool_use": Object{"web_search_requests": 0}})
					w.Header().Set("Content-Type", "text/event-stream")
					fmt.Fprint(w, strings.Replace(fixture.Body.String(), `"usage":{"output_tokens":8}`, `"usage":{}`, 1))
					return
				}
				writeNativeWebSearchFixture(t, w, "claude-sonnet-4-6", []Object{{"type": "text", "text": "unmetered"}}, Object{})
			}))
			defer upstream.Close()
			var stderr bytes.Buffer
			runner := &Runner{CLI: cli, Plugin: plugin, Work: root, InternalBaseURL: modServer.URL, Env: nativeProbeEnv(root, upstream.URL), Stderr: &stderr}
			req := &Request{NativeTransport: true, Model: "claude-sonnet-4-6", webSearch: &webSearchPlan{usage: Object{}}}
			record, rawErr, err := runner.runWebSearch(ctx, req, root, Object{"query": "native"})
			require.Error(t, err, "stderr=%s", stderr.String())
			assert.Nil(t, rawErr)
			assert.Nil(t, record)
			assert.Empty(t, req.webSearch.usage)
			mu.Lock()
			if kind == "ready denied" {
				assert.Zero(t, requests)
			} else {
				assert.Equal(t, 1, requests)
			}
			mu.Unlock()
			if kind == "rate limit" {
				var native *nativeError
				require.ErrorAs(t, err, &native)
				assert.Equal(t, 429, native.Status)
				assert.True(t, native.ObservedStatus)
			}
			if kind == "missing usage" || kind == "missing final output" {
				assert.ErrorContains(t, err, "accounting")
			}
			if kind == "client tool" {
				assert.ErrorContains(t, err, "undeclared tool")
				_, fileErr := os.Stat(filepath.Join(root, "must-not-exist"))
				assert.True(t, os.IsNotExist(fileErr))
			}
		})
	}
}

func TestNativeWebSearchAdmission(t *testing.T) {
	for _, tc := range []struct {
		name, target, provider, want string
		canceled                     bool
	}{
		{name: "canceled", canceled: true, want: "context canceled"},
		{name: "scheme", target: "file:///private", want: "invalid Anthropic base URL"},
		{name: "userinfo", target: "http://user:password@127.0.0.1", want: "invalid Anthropic base URL"},
		{name: "query", target: "http://127.0.0.1?key=value", want: "invalid Anthropic base URL"},
		{name: "fragment", target: "http://127.0.0.1#fragment", want: "invalid Anthropic base URL"},
		{name: "provider", target: "http://127.0.0.1", provider: "1", want: "require the Anthropic API transport"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()
			if tc.canceled {
				cancel()
			}
			runner := &Runner{CLI: "must-not-start", Env: []string{"ANTHROPIC_BASE_URL=" + tc.target, "CLAUDE_CODE_USE_BEDROCK=" + tc.provider}}
			req := &Request{NativeTransport: true, Plan: &RequestPlan{fields: map[string]json.RawMessage{"inference_geo": json.RawMessage(`"us"`)}}}
			record, _, err := runner.runWebSearch(ctx, req, t.TempDir(), Object{"query": "must not run"})
			require.ErrorContains(t, err, tc.want)
			assert.Nil(t, record)
		})
	}
}

func TestRealCLINativeWebSearchAccountingFailureStopsGateway(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for native search accounting failure propagation")
	}
	for _, fallback := range []bool{false, true} {
		t.Run(fmt.Sprintf("fallback=%t", fallback), func(t *testing.T) {
			root := t.TempDir()
			plugin, err := extractMod(root)
			require.NoError(t, err)
			var mu sync.Mutex
			var models []string
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !assert.Equal(t, "/v1/messages", r.URL.Path) {
					http.Error(w, "unexpected endpoint", http.StatusForbidden)
					return
				}
				raw, err := io.ReadAll(r.Body)
				if !assert.NoError(t, err) {
					return
				}
				body, err := decodeObject(raw)
				if !assert.NoError(t, err) {
					return
				}
				mu.Lock()
				models = append(models, str(body, "model"))
				n := len(models)
				mu.Unlock()
				assert.Equal(t, "us", body["inference_geo"])
				switch n {
				case 1:
					writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "tool_use", "id": "toolu_search_accounting", "name": "WebSearch", "input": Object{"query": "accounting fixture"}}})
				case 2:
					tools, err := marshalPlain(body["tools"])
					if !assert.NoError(t, err) {
						return
					}
					assert.Contains(t, string(tools), "web_search_20250305")
					writeNativeWebSearchFixture(t, w, str(body, "model"), []Object{
						{"type": "server_tool_use", "id": "srvtoolu_accounting", "name": "web_search", "input": Object{"query": "accounting fixture"}},
						{"type": "web_search_tool_result", "tool_use_id": "srvtoolu_accounting", "content": []any{Object{"type": "web_search_result", "title": "Fixture", "url": "https://example.com/native", "encrypted_content": "provider-opaque"}}},
						{"type": "text", "text": "must not complete an unmetered search"},
					}, Object{"input_tokens": 20, "output_tokens": 8, "cache_creation_input_tokens": 17, "cache_read_input_tokens": 31, "server_tool_use": Object{"web_search_requests": 1}})
				default:
					assert.Fail(t, "a failed search must not continue the model turn or invoke fallback", "model=%s", str(body, "model"))
					http.Error(w, "no continuation permitted", http.StatusForbidden)
				}
			}))
			defer upstream.Close()
			cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
			require.NoError(t, err)
			var stderr bytes.Buffer
			gateway := &Gateway{Runner: &Runner{CLI: cli, Plugin: plugin, Version: "2.1.292", Work: root, Env: nativeProbeEnv(root, upstream.URL), Stderr: &stderr}, Cache: cache, Timeout: 30 * time.Second, Slots: make(chan struct{}, 1)}
			body := Object{"model": "claude-sonnet-4-6", "max_tokens": 1024, "inference_geo": "us", "tools": []any{Object{"type": "web_search_20250305", "name": "web_search"}}, "messages": []any{Object{"role": "user", "content": "search the accounting fixture"}}}
			if fallback {
				body["fallbacks"] = []any{Object{"model": "claude-haiku-4-5-20251001"}}
			}
			raw, err := marshalPlain(body)
			require.NoError(t, err)
			request := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(raw)).WithContext(t.Context())
			request.Header.Set(policyHeader, `{"relay_mode":"native"}`)
			if fallback {
				request.Header.Set("Anthropic-Beta", "server-side-fallback-2026-06-01")
			}
			response := httptest.NewRecorder()
			gateway.ServeHTTP(response, request)
			require.Equal(t, http.StatusBadGateway, response.Code, "body=%s stderr=%s", response.Body.String(), stderr.String())
			assert.Equal(t, "request", response.Header().Get(errorScopeHeader))
			assert.Contains(t, response.Body.String(), "5m/1h")
			mu.Lock()
			assert.Equal(t, []string{"claude-sonnet-4-6", "claude-sonnet-4-6"}, models)
			mu.Unlock()
		})
	}
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
			case "citations_delta":
				citations, _ := blocks[i]["citations"].([]any)
				blocks[i]["citations"] = append(citations, delta["citation"])
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
