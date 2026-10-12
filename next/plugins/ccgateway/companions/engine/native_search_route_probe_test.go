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

// Probe the CLI's typed server-tool route directly, without a second plugin
// or a captured legacy baseline. Raw SSE is the accounting source of truth.
func TestRealCLINativeSearchRouteProbe(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI to an absolute real CLI executable path")
	}
	require.True(t, filepath.IsAbs(cli))
	const query = "native route fixture"
	blocks := []Object{
		{"type": "server_tool_use", "id": "srvtoolu_route", "name": "web_search", "input": Object{"query": query}},
		{"type": "web_search_tool_result", "tool_use_id": "srvtoolu_route", "content": []any{Object{"type": "web_search_result", "title": "Native route fixture", "url": "https://example.com/native-route", "encrypted_content": "provider-opaque-route", "page_age": "1 day ago"}}},
		{"type": "text", "text": "Native route commentary"},
	}
	wantUsage := Object{"input_tokens": 20, "output_tokens": 8, "cache_read_input_tokens": 31, "cache_creation_input_tokens": 17, "cache_creation": Object{"ephemeral_5m_input_tokens": 11, "ephemeral_1h_input_tokens": 6}, "server_tool_use": Object{"web_search_requests": 1}}
	tools := []Object{{"type": "web_search_20250305", "name": "web_search", "max_uses": 8}}
	choice := Object{"type": "tool", "name": "web_search"}
	for _, model := range []string{"claude-sonnet-4-6", "claude-haiku-4-5-20251001"} {
		t.Run(model, func(t *testing.T) {
			root := t.TempDir()
			plugin, err := extractMod(root)
			require.NoError(t, err)
			control, err := startModControl(&runConfig{attachments: Object{}, tools: Object{}}, "")
			require.NoError(t, err)
			defer control.Close()
			var mu sync.Mutex
			var wires []Object
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
				wires = append(wires, body)
				assert.Equal(t, http.MethodPost, r.Method)
				assert.Equal(t, "dummy-native-probe", r.Header.Get("X-Api-Key"))
				assert.Empty(t, r.Header.Get("Authorization"))
				assert.Equal(t, true, body["stream"])
				assert.NoError(t, control.verify(), "inference follows Mod readiness")
				fixture := httptest.NewRecorder()
				writeNativeWebSearchFixture(t, fixture, str(body, "model"), blocks, wantUsage)
				w.Header().Set("Content-Type", "text/event-stream")
				for line := range strings.SplitSeq(fixture.Body.String(), "\n") {
					if data, ok := strings.CutPrefix(line, "data: "); ok {
						event, err := decodeObject([]byte(data))
						if !assert.NoError(t, err) {
							return
						}
						sentEvents = append(sentEvents, event)
					}
					fmt.Fprintln(w, line)
				}
			}))
			defer upstream.Close()
			extra, err := json.Marshal(Object{"tools": tools, "tool_choice": choice})
			require.NoError(t, err)
			args := []string{"-p", webSearchFastPrompt + query, "--model=" + model, "--output-format", "stream-json", "--include-partial-messages", "--verbose", "--tools", "", "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--setting-sources", "", "--settings", `{"disableAllHooks":false}`, "--no-chrome", "--disable-slash-commands", "--no-session-persistence", "--max-turns", "1", "--plugin-dir", plugin, "--system-prompt", "You are an assistant for performing a web search tool use", "--thinking", "disabled", "--system-prompt-snapshot", "off"}
			env := map[string]string{"CCGATEWAY_MOD_URL": control.URL, "CCGATEWAY_MOD_TOKEN": control.token, "CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS": "1", "CLAUDE_CODE_EXTRA_BODY": string(extra)}
			ctx, cancel := context.WithTimeout(t.Context(), 60*time.Second)
			defer cancel()
			cmd := exec.CommandContext(ctx, cli, args...)
			cmd.Dir, cmd.Env = root, envWith(nativeProbeEnv(root, upstream.URL), env)
			var stderr bytes.Buffer
			cmd.Stderr = &stderr
			stdout, runErr := cmd.Output()
			require.NoError(t, ctx.Err())
			require.NoError(t, runErr, "stdout=%s stderr=%s", stdout, stderr.String())
			mu.Lock()
			gotWires := append([]Object(nil), wires...)
			gotPaths := append([]string(nil), otherPaths...)
			gotSent := append([]Object(nil), sentEvents...)
			mu.Unlock()
			require.Len(t, gotWires, 1, "typed server tool execution must not trigger a duplicate model request")
			assert.Empty(t, gotPaths)
			assert.Equal(t, model, gotWires[0]["model"])
			assert.Equal(t, normalizeJSON(t, tools), normalizeJSON(t, gotWires[0]["tools"]))
			assert.Equal(t, choice, gotWires[0]["tool_choice"])
			wireJSON, err := json.Marshal(gotWires[0])
			require.NoError(t, err)
			assert.Contains(t, string(wireJSON), webSearchFastPrompt+query)
			var result Object
			var events []Object
			var assistants []Object
			for line := range strings.SplitSeq(strings.TrimSpace(string(stdout)), "\n") {
				frame, err := decodeObject([]byte(line))
				require.NoError(t, err)
				switch str(frame, "type") {
				case "result":
					require.Nil(t, result, "duplicate terminal result")
					result = frame
				case "stream_event":
					event, ok := frame["event"].(Object)
					require.True(t, ok)
					events = append(events, event)
				case "assistant":
					assistants = append(assistants, frame)
				case "system":
					assert.NotEqual(t, "api_retry", str(frame, "subtype"))
					if str(frame, "subtype") == "init" {
						assert.Empty(t, frame["tools"], "no executable client tools")
					}
				}
			}
			require.NotNil(t, result)
			assert.Equal(t, false, result["is_error"])
			assert.Equal(t, "success", result["subtype"])
			assert.Equal(t, json.Number("1"), result["num_turns"])
			assert.NotEmpty(t, assistants)
			require.NotEmpty(t, events)
			assert.Equal(t, gotSent, events, "all native stream blocks and raw usage must survive unchanged")
			var stream strings.Builder
			for _, event := range events {
				data, err := json.Marshal(event)
				require.NoError(t, err)
				fmt.Fprintf(&stream, "event: %s\ndata: %s\n\n", str(event, "type"), data)
			}
			message := replaySSE(t, stream.String())
			assert.Equal(t, normalizeJSON(t, blocks), message["content"])
			assert.Equal(t, normalizeJSON(t, wantUsage), message["usage"], "input/output/cache read/cache creation/5m/1h/search ledger")
			sdkUsage, ok := result["usage"].(Object)
			require.True(t, ok)
			for key, value := range wantUsage {
				if key == "server_tool_use" {
					server, ok := sdkUsage[key].(Object)
					require.True(t, ok)
					assert.Equal(t, normalizeJSON(t, value.(Object)["web_search_requests"]), normalizeJSON(t, server["web_search_requests"]))
					continue
				}
				assert.Equal(t, normalizeJSON(t, value), normalizeJSON(t, sdkUsage[key]), "result.usage.%s", key)
			}
		})
	}
}
