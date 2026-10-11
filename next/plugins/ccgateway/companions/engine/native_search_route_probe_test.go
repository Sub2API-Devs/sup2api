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

func TestRealCLINativeSearchRouteProbe(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI to an absolute real CLI executable path")
	}
	require.True(t, filepath.IsAbs(cli))
	const currentModel = "claude-sonnet-4-6"
	const query = "native route fixture"
	blocks := []Object{
		{"type": "server_tool_use", "id": "srvtoolu_route", "name": "web_search", "input": Object{"query": query}},
		{"type": "web_search_tool_result", "tool_use_id": "srvtoolu_route", "content": []any{Object{"type": "web_search_result", "title": "Native route fixture", "url": "https://example.com/native-route", "encrypted_content": "provider-opaque-route", "page_age": "1 day ago"}}},
		{"type": "text", "text": "Native route commentary"},
	}
	wantUsage := Object{"input_tokens": 20, "output_tokens": 8, "cache_read_input_tokens": 31, "cache_creation_input_tokens": 17, "cache_creation": Object{"ephemeral_5m_input_tokens": 11, "ephemeral_1h_input_tokens": 6}, "server_tool_use": Object{"web_search_requests": 1}}
	var baselineWire nativeProbeWire
	var baselineAnswer Object
	run := func(t *testing.T, baseline bool, model string) {
		root := t.TempDir()
		plugin, err := extractMod(root)
		require.NoError(t, err)
		control, err := startModControl(&runConfig{attachments: Object{}, tools: Object{}}, "")
		require.NoError(t, err)
		defer control.Close()
		control.searchOnly = baseline
		var mu sync.Mutex
		var wires []nativeProbeWire
		var otherPaths []string
		var sentEvents []Object
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			mu.Lock()
			defer mu.Unlock()
			if r.URL.Path != "/v1/messages" {
				otherPaths = append(otherPaths, r.URL.Path)
				http.Error(w, "unexpected offline endpoint", http.StatusForbidden)
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
			wires = append(wires, nativeProbeWire{header: r.Header.Clone(), body: body})
			assert.Equal(t, http.MethodPost, r.Method)
			assert.Equal(t, "dummy-native-probe", r.Header.Get("X-Api-Key"))
			assert.Empty(t, r.Header.Get("Authorization"))
			assert.Equal(t, true, body["stream"])
			fixture := httptest.NewRecorder()
			writeSurfaceFixture(fixture, str(body, "model"), blocks)
			w.Header().Set("Content-Type", "text/event-stream")
			for line := range strings.SplitSeq(fixture.Body.String(), "\n") {
				if data, ok := strings.CutPrefix(line, "data: "); ok {
					event, err := decodeObject([]byte(data))
					if !assert.NoError(t, err) {
						return
					}
					if str(event, "type") == "message_start" {
						usage := Object{}
						for key, value := range wantUsage {
							usage[key] = value
						}
						usage["output_tokens"] = 0
						event["message"].(Object)["usage"] = usage
					}
					sentEvents = append(sentEvents, event)
					encoded, err := json.Marshal(event)
					if !assert.NoError(t, err) {
						return
					}
					line = "data: " + string(encoded)
				}
				fmt.Fprintln(w, line)
			}
		}))
		defer upstream.Close()
		args := []string{"-p", webSearchFastPrompt + query, "--model=" + model, "--output-format", "stream-json", "--include-partial-messages", "--verbose", "--tools", "", "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--setting-sources", "", "--settings", `{"disableAllHooks":false}`, "--no-chrome", "--disable-slash-commands", "--no-session-persistence", "--max-turns", "1", "--plugin-dir", plugin}
		env := map[string]string{"CCGATEWAY_MOD_URL": control.URL, "CCGATEWAY_MOD_TOKEN": control.token, "CCGATEWAY_NATIVE_TRANSPORT": "1", "CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS": "1"}
		if baseline {
			for i := range args {
				if args[i] == "--tools" {
					args[i+1] = "WebSearch"
				}
				if args[i] == "--plugin-dir" {
					args[i+1] = filepath.Join(plugin, "search")
				}
			}
			args = append(args, "--allowedTools", "WebSearch")
			input, err := json.Marshal(Object{"query": query})
			require.NoError(t, err)
			env["CCGATEWAY_SEARCH_INPUT"] = string(input)
		} else {
			extra, err := json.Marshal(Object{"tools": baselineWire.body["tools"], "tool_choice": baselineWire.body["tool_choice"]})
			require.NoError(t, err)
			env["CLAUDE_CODE_EXTRA_BODY"] = string(extra)
			args = append(args, "--system-prompt", "You are an assistant for performing a web search tool use", "--thinking", "disabled", "--system-prompt-snapshot", "off")
		}
		ctx, cancel := context.WithTimeout(t.Context(), 60*time.Second)
		defer cancel()
		cmd := exec.CommandContext(ctx, cli, args...)
		cmd.Dir, cmd.Env = root, envWith(nativeProbeEnv(root, upstream.URL), env)
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		stdout, runErr := cmd.Output()
		t.Logf("args=%q extra_body=%s process_error=%v stderr=%s", args, env["CLAUDE_CODE_EXTRA_BODY"], runErr, stderr.String())
		require.NoError(t, ctx.Err())
		if !baseline {
			require.NoError(t, runErr, "stdout=%s stderr=%s", stdout, stderr.String())
		}
		mu.Lock()
		gotWires := append([]nativeProbeWire(nil), wires...)
		gotPaths := append([]string(nil), otherPaths...)
		gotSent := append([]Object(nil), sentEvents...)
		mu.Unlock()
		require.Len(t, gotWires, 1)
		assert.Empty(t, gotPaths)
		wireJSON, err := json.Marshal(gotWires[0].body)
		require.NoError(t, err)
		t.Logf("wire=%s", wireJSON)
		var result Object
		var events []Object
		var assistants []Object
		for line := range strings.SplitSeq(strings.TrimSpace(string(stdout)), "\n") {
			frame, err := decodeObject([]byte(line))
			require.NoError(t, err)
			switch str(frame, "type") {
			case "result":
				require.Nil(t, result)
				result = frame
				t.Logf("result=%s", line)
			case "stream_event":
				event, ok := frame["event"].(Object)
				require.True(t, ok)
				events = append(events, event)
				t.Logf("stream_event=%s", line)
			case "assistant":
				assistants = append(assistants, frame)
				t.Logf("assistant=%s", line)
			case "system":
				assert.NotEqual(t, "api_retry", str(frame, "subtype"))
				if str(frame, "subtype") == "init" {
					t.Logf("cli_version=%s init_model=%s api_key_source=%s", str(frame, "claude_code_version"), str(frame, "model"), str(frame, "apiKeySource"))
					if !baseline {
						assert.Empty(t, frame["tools"])
					}
				}
			}
		}
		require.NotNil(t, result)
		if baseline {
			baselineWire = gotWires[0]
			baselineAnswer = control.searchAnswer()
			require.NotNil(t, baselineAnswer)
			answerJSON, err := json.Marshal(baselineAnswer)
			require.NoError(t, err)
			t.Logf("baseline_answer=%s", answerJSON)
			assert.Contains(t, str(baselineAnswer, "text"), "Native route commentary")
			tools, ok := baselineWire.body["tools"].([]any)
			require.True(t, ok)
			require.Len(t, tools, 1)
			assert.Equal(t, "web_search_20250305", tools[0].(Object)["type"])
			return
		}
		assert.Equal(t, false, result["is_error"])
		assert.Equal(t, model, gotWires[0].body["model"])
		assert.Equal(t, baselineWire.body["tools"], gotWires[0].body["tools"])
		assert.Equal(t, Object{"type": "tool", "name": "web_search"}, gotWires[0].body["tool_choice"])
		assert.Contains(t, string(wireJSON), webSearchFastPrompt+query)
		assert.Equal(t, "success", result["subtype"])
		assert.Equal(t, json.Number("1"), result["num_turns"])
		assert.NotEmpty(t, assistants)
		require.NotEmpty(t, events)
		wantEventsJSON, err := json.Marshal(gotSent)
		require.NoError(t, err)
		gotEventsJSON, err := json.Marshal(events)
		require.NoError(t, err)
		assert.JSONEq(t, string(wantEventsJSON), string(gotEventsJSON), "all native stream blocks and usage must survive unchanged")
		usage := Object{}
		var reconstructed []Object
		inputs := map[int]string{}
		for _, event := range events {
			switch str(event, "type") {
			case "message_start":
				for key, value := range event["message"].(Object)["usage"].(Object) {
					usage[key] = value
				}
			case "message_delta":
				for key, value := range event["usage"].(Object) {
					usage[key] = value
				}
			case "content_block_start":
				block, err := jsonCopyObject(event["content_block"].(Object))
				require.NoError(t, err)
				reconstructed = append(reconstructed, block)
			case "content_block_delta":
				index, ok := usageInt(event["index"])
				require.True(t, ok)
				delta := event["delta"].(Object)
				if str(delta, "type") == "input_json_delta" {
					inputs[int(index)] += str(delta, "partial_json")
				} else if str(delta, "type") == "text_delta" {
					reconstructed[index]["text"] = str(reconstructed[index], "text") + str(delta, "text")
				}
			}
		}
		for index, raw := range inputs {
			input, err := decodeObject([]byte(raw))
			require.NoError(t, err)
			reconstructed[index]["input"] = input
		}
		wantJSON, err := json.Marshal(blocks)
		require.NoError(t, err)
		gotJSON, err := json.Marshal(reconstructed)
		require.NoError(t, err)
		assert.JSONEq(t, string(wantJSON), string(gotJSON))
		wantJSON, err = json.Marshal(wantUsage)
		require.NoError(t, err)
		gotJSON, err = json.Marshal(usage)
		require.NoError(t, err)
		assert.JSONEq(t, string(wantJSON), string(gotJSON), "complete input/output/cache read/cache creation/cache lifetime/search ledger")
		t.Logf("reconstructed_usage=%s", gotJSON)
		sdkUsage, ok := result["usage"].(Object)
		require.True(t, ok)
		for key, value := range usage {
			if key == "server_tool_use" {
				assert.Equal(t, value.(Object)["web_search_requests"], sdkUsage[key].(Object)["web_search_requests"])
				continue
			}
			assert.Equal(t, value, sdkUsage[key], "result.usage.%s", key)
		}
		var parts []string
		for _, block := range reconstructed {
			switch str(block, "type") {
			case "web_search_tool_result":
				var links []Object
				for _, item := range block["content"].([]any) {
					entry := item.(Object)
					links = append(links, Object{"title": entry["title"], "url": entry["url"]})
				}
				encoded, err := json.Marshal(links)
				require.NoError(t, err)
				parts = append(parts, "Links: "+string(encoded))
			case "text":
				parts = append(parts, str(block, "text"))
			}
		}
		text := fmt.Sprintf("Web search results for query: %q\n\n%s\n\n\nREMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks.", query, strings.Join(parts, "\n\n"))
		assert.Equal(t, str(baselineAnswer, "text"), text)
		t.Logf("reconstructed_native_text=%q", text)
	}
	require.True(t, t.Run("capture_native_tool_call", func(t *testing.T) { run(t, true, currentModel) }))
	t.Run("normal_turn_current_model", func(t *testing.T) { run(t, false, currentModel) })
	t.Run("normal_turn_original_search_model", func(t *testing.T) { run(t, false, str(baselineWire.body, "model")) })
	t.Run("normal_turn_explicit_haiku_not_default", func(t *testing.T) { run(t, false, "claude-haiku-4-5-20251001") })
}
