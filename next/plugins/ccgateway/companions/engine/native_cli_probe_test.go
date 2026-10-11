package engine

import (
	"bufio"
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
	"slices"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type nativeProbeWire struct {
	header http.Header
	body   Object
}

func nativeProbeEnv(root, endpoint string) []string {
	var base []string
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA", "CLAUDE_CODE_GIT_BASH_PATH"} {
		if value := os.Getenv(key); value != "" {
			base = append(base, key+"="+value)
		}
	}
	return envWith(base, map[string]string{
		"HOME": root, "USERPROFILE": root, "APPDATA": root, "LOCALAPPDATA": root,
		"CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "CLAUDE_SECURESTORAGE_CONFIG_DIR": filepath.Join(root, "config"),
		"ANTHROPIC_API_KEY": "dummy-native-probe", "ANTHROPIC_BASE_URL": endpoint,
		"CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1", "DISABLE_TELEMETRY": "1", "DISABLE_ERROR_REPORTING": "1",
		"CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL": "1", "CLAUDE_CODE_DISABLE_CLAUDE_MDS": "1", "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1",
		"CLAUDE_CODE_MAX_RETRIES": "0", "CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK": "1", "ENABLE_TOOL_SEARCH": "false",
		"HTTP_PROXY": "http://127.0.0.1:1", "HTTPS_PROXY": "http://127.0.0.1:1", "ALL_PROXY": "http://127.0.0.1:1",
		"http_proxy": "http://127.0.0.1:1", "https_proxy": "http://127.0.0.1:1", "all_proxy": "http://127.0.0.1:1",
		"NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost",
	})
}

func TestRealCLINativeProbe(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI to an absolute real CLI executable path")
	}
	require.True(t, filepath.IsAbs(cli))
	t.Run("readiness_initialize_only", func(t *testing.T) {
		root := t.TempDir()
		plugin, err := extractMod(root)
		require.NoError(t, err)
		var mu sync.Mutex
		var order []string
		var modelRequests int
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			mu.Lock()
			defer mu.Unlock()
			if r.URL.Path != "/mod" {
				modelRequests++
				http.Error(w, "no inference allowed", http.StatusForbidden)
				return
			}
			assert.Equal(t, "Bearer dummy-native-mod-token", r.Header.Get("Authorization"))
			w.Header().Set("Content-Type", "application/json")
			if r.Method == http.MethodGet {
				order = append(order, "session.start config GET")
				fmt.Fprint(w, `{"systems":[],"tools":{},"deferred":{}}`)
				return
			}
			var event Object
			assert.NoError(t, json.NewDecoder(r.Body).Decode(&event))
			order = append(order, "session.start "+str(event, "event"))
			fmt.Fprint(w, `{}`)
		}))
		defer upstream.Close()
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		env := envWith(nativeProbeEnv(root, upstream.URL), map[string]string{"CCGATEWAY_MOD_URL": upstream.URL + "/mod", "CCGATEWAY_MOD_TOKEN": "dummy-native-mod-token"})
		validate := exec.CommandContext(ctx, cli, "plugin", "validate", plugin)
		validate.Dir, validate.Env = root, env
		out, err := validate.CombinedOutput()
		require.NoError(t, err, "%s", out)
		cmd := exec.CommandContext(ctx, cli, "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--permission-prompt-tool", "stdio", "--tools", "", "--setting-sources", "", "--settings", `{"disableAllHooks":false}`, "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--plugin-dir", plugin, "--max-turns", "1", "--no-session-persistence")
		cmd.Dir, cmd.Env = root, env
		stdin, err := cmd.StdinPipe()
		require.NoError(t, err)
		stdout, err := cmd.StdoutPipe()
		require.NoError(t, err)
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		require.NoError(t, cmd.Start())
		defer func() { _ = cmd.Process.Kill() }()
		mu.Lock()
		order = append(order, "initialize sent")
		mu.Unlock()
		require.NoError(t, json.NewEncoder(stdin).Encode(Object{"type": "control_request", "request_id": "native-probe-init", "request": Object{"subtype": "initialize", "systemPrompt": []string{"Offline initialization only"}, "sdkMcpServers": []string{}, "hooks": Object{}, "supportedDialogKinds": []string{}, "promptSuggestions": false, "excludeDynamicSections": true}}))
		initialized := false
		scanner := bufio.NewScanner(stdout)
		scanner.Buffer(make([]byte, 64*1024), 4<<20)
		for scanner.Scan() {
			frame, err := decodeObject(scanner.Bytes())
			require.NoError(t, err)
			if str(frame, "type") != "control_response" {
				continue
			}
			response, _ := frame["response"].(map[string]any)
			if str(response, "request_id") == "native-probe-init" {
				assert.Equal(t, "success", response["subtype"])
				initialized = true
				mu.Lock()
				order = append(order, "initialize response")
				mu.Unlock()
				require.NoError(t, stdin.Close())
			}
		}
		require.NoError(t, scanner.Err())
		runErr := cmd.Wait()
		mu.Lock()
		gotOrder, gotRequests := append([]string(nil), order...), modelRequests
		mu.Unlock()
		t.Logf("readiness_order=%v mock_model_requests=%d process_error=%v stderr=%s", gotOrder, gotRequests, runErr, stderr.String())
		require.NoError(t, ctx.Err())
		assert.NoError(t, runErr)
		assert.True(t, initialized)
		assert.Zero(t, gotRequests, "initialization must not invoke any model")
		assert.Equal(t, []string{"initialize sent", "session.start config GET", "session.start ready", "initialize response"}, gotOrder, "Mod must acknowledge readiness before initialize succeeds, without submitting a user turn")
	})
	type wireExpectation struct {
		display     string
		displayBeta bool
		safetyBeta  bool
		effort      string
	}
	type probeCase struct {
		name             string
		status           int
		runnerAligned    bool
		rejection        string
		expectedRequests int
		expectedWire     []wireExpectation
	}
	var cases []probeCase
	for _, status := range []int{200, 401, 403, 408, 409, 429, 500, 502, 503, 504, 529} {
		cases = append(cases, probeCase{name: strconv.Itoa(status), status: status, expectedRequests: 1,
			expectedWire: []wireExpectation{{display: "updates", displayBeta: true, safetyBeta: true, effort: "high"}}})
	}
	cases = append(cases,
		probeCase{name: "400-native-display-and-safety-beta-recovery", status: 400, expectedRequests: 3,
			expectedWire: []wireExpectation{
				{display: "updates", displayBeta: true, safetyBeta: true, effort: "high"},
				{safetyBeta: true, effort: "high"},
				{effort: "high"},
			}},
		probeCase{name: "400-runner-native-safety-beta-recovery", status: 400, runnerAligned: true, expectedRequests: 2,
			expectedWire: []wireExpectation{{safetyBeta: true, effort: "high"}, {effort: "high"}}},
		probeCase{name: "400-runner-native-effort-recovery", status: 400, runnerAligned: true,
			rejection: "output_config.effort: Extra inputs are not permitted", expectedRequests: 2,
			expectedWire: []wireExpectation{{safetyBeta: true, effort: "high"}, {safetyBeta: true}}},
	)
	for _, scenario := range cases {
		t.Run(scenario.name, func(t *testing.T) {
			status := scenario.status
			root := t.TempDir()
			requestID := fmt.Sprintf("req_native_probe_%d", status)
			var mu sync.Mutex
			var wires []nativeProbeWire
			var otherPaths []string
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path != "/v1/messages" {
					mu.Lock()
					otherPaths = append(otherPaths, r.URL.Path)
					mu.Unlock()
					http.Error(w, "unexpected offline fixture endpoint", http.StatusNotFound)
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
				wires = append(wires, nativeProbeWire{header: r.Header.Clone(), body: body})
				mu.Unlock()
				assert.Equal(t, http.MethodPost, r.Method)
				assert.Equal(t, "dummy-native-probe", r.Header.Get("X-Api-Key"))
				assert.Empty(t, r.Header.Get("Authorization"))
				assert.Equal(t, true, body["stream"])
				w.Header().Set("Request-Id", requestID)
				if status == http.StatusOK {
					writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "NATIVE_PROBE_OK"}})
					return
				}
				errorType := map[int]string{400: "invalid_request_error", 401: "authentication_error", 403: "permission_error", 429: "rate_limit_error", 529: "overloaded_error"}[status]
				if errorType == "" {
					errorType = "api_error"
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(status)
				message := scenario.rejection
				if message == "" {
					message = "synthetic native probe rejection"
				}
				assert.NoError(t, json.NewEncoder(w).Encode(Object{"type": "error", "error": Object{"type": errorType, "message": message}, "request_id": requestID}))
			}))
			defer upstream.Close()
			ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
			defer cancel()
			cmd := exec.CommandContext(ctx, cli, "-p", "Return the offline fixture answer without tools.", "--model", "claude-sonnet-4-6", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--max-turns", "1", "--tools", "", "--setting-sources", "", "--settings", `{"disableAllHooks":true}`, "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--no-session-persistence")
			cmd.Dir = root
			cmd.Env = nativeProbeEnv(root, upstream.URL)
			if scenario.runnerAligned {
				cmd.Args = append(cmd.Args[:2], cmd.Args[3:]...)
				cmd.Args = append(cmd.Args, "--input-format", "stream-json", "--permission-prompt-tool", "stdio", "--no-chrome", "--disable-slash-commands", "--system-prompt-snapshot", "off", "--thinking", "disabled", "--effort", "high")
				cmd.Env = envWith(cmd.Env, map[string]string{"CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS": "1", "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "256", "CLAUDE_CODE_EXTRA_BODY": `{"max_tokens":256,"thinking":{"type":"disabled"},"output_config":{"effort":"high"}}`})
				var input bytes.Buffer
				encoder := json.NewEncoder(&input)
				require.NoError(t, encoder.Encode(Object{"type": "control_request", "request_id": "native-recovery-init", "request": Object{"subtype": "initialize", "systemPrompt": []string{"Offline recovery fixture"}, "systemPromptSnapshot": false, "sdkMcpServers": []string{}, "hooks": Object{}, "supportedDialogKinds": []string{}, "promptSuggestions": false, "excludeDynamicSections": true}}))
				require.NoError(t, encoder.Encode(Object{"type": "user", "session_id": uuid(), "uuid": uuid(), "parent_tool_use_id": nil, "message": Object{"role": "user", "content": "Return the offline fixture answer without tools."}}))
				cmd.Stdin = &input
			}
			var stderr bytes.Buffer
			cmd.Stderr = &stderr
			stdout, err := cmd.StdoutPipe()
			require.NoError(t, err)
			require.NoError(t, cmd.Start())
			defer func() { _ = cmd.Process.Kill() }()
			var results, assistants, retries []Object
			scanner := bufio.NewScanner(stdout)
			scanner.Buffer(make([]byte, 64*1024), 4<<20)
			for scanner.Scan() {
				frame, err := decodeObject(scanner.Bytes())
				require.NoError(t, err, "invalid CLI stdout frame")
				switch str(frame, "type") {
				case "result":
					results = append(results, frame)
					t.Logf("terminal_result=%s", scanner.Text())
				case "assistant":
					assistants = append(assistants, frame)
					t.Logf("assistant=%s", scanner.Text())
				case "system":
					if str(frame, "subtype") == "api_retry" {
						retries = append(retries, frame)
						t.Logf("system_api_retry=%s", scanner.Text())
					}
				}
			}
			require.NoError(t, scanner.Err())
			runErr := cmd.Wait()
			mu.Lock()
			gotWires := append([]nativeProbeWire(nil), wires...)
			gotPaths := append([]string(nil), otherPaths...)
			mu.Unlock()
			t.Logf("status=%d messages_requests=%d other_paths=%v process_error=%v stderr=%s", status, len(gotWires), gotPaths, runErr, stderr.String())
			require.NoError(t, ctx.Err(), "CLI did not terminate within the offline probe deadline")
			for i, wire := range gotWires {
				t.Logf("request=%d model=%v stream=%v thinking=%v output_config=%v max_tokens=%v betas=%s", i+1, wire.body["model"], wire.body["stream"], wire.body["thinking"], wire.body["output_config"], wire.body["max_tokens"], wire.header.Get("Anthropic-Beta"))
			}
			require.Equal(t, scenario.expectedRequests, len(gotWires), "native compatibility recovery request count changed")
			for i, wire := range gotWires {
				want := scenario.expectedWire[i]
				thinkingType := "adaptive"
				if scenario.runnerAligned {
					thinkingType = "disabled"
				}
				thinking := map[string]any{"type": thinkingType}
				if want.display != "" {
					thinking["display"] = want.display
				}
				assert.Equal(t, thinking, wire.body["thinking"], "request %d thinking", i+1)
				betas := strings.Split(wire.header.Get("Anthropic-Beta"), ",")
				assert.Equal(t, want.displayBeta, slices.Contains(betas, "thinking-display-updates-2026-08-18"), "request %d display beta", i+1)
				assert.Equal(t, want.safetyBeta, slices.Contains(betas, "dangerous-tool-use-2026-09-03"), "request %d safety beta", i+1)
				if i > 0 {
					previous := strings.Split(gotWires[i-1].header.Get("Anthropic-Beta"), ",")
					for _, beta := range []string{"thinking-display-updates-2026-08-18", "dangerous-tool-use-2026-09-03"} {
						previous = slices.DeleteFunc(previous, func(value string) bool { return value == beta })
						betas = slices.DeleteFunc(betas, func(value string) bool { return value == beta })
					}
					assert.ElementsMatch(t, previous, betas, "request %d must preserve unrelated beta headers", i+1)
				}
				if want.effort == "" {
					assert.NotContains(t, wire.body, "output_config", "request %d rejected effort must be omitted", i+1)
				} else {
					assert.Equal(t, map[string]any{"effort": want.effort}, wire.body["output_config"], "request %d effort", i+1)
				}
				assert.Equal(t, "claude-sonnet-4-6", wire.body["model"], "compatibility recovery must not change model")
				if scenario.runnerAligned {
					assert.Equal(t, json.Number("256"), wire.body["max_tokens"])
				}
			}
			assert.Empty(t, gotPaths)
			assert.Empty(t, retries, "native CLI emitted api_retry with retries disabled")
			require.Len(t, results, 1)
			require.NotEmpty(t, assistants)
			result := results[0]
			t.Logf("observed api_error_status=%v assistant_error=%v assistant_request_id=%v system_api_retry_count=%d", result["api_error_status"], assistants[len(assistants)-1]["error"], assistants[len(assistants)-1]["request_id"], len(retries))
			if status == http.StatusOK {
				assert.NoError(t, runErr)
				assert.Equal(t, false, result["is_error"])
				assert.Equal(t, "NATIVE_PROBE_OK", result["result"])
				assert.Equal(t, requestID, assistants[len(assistants)-1]["request_id"])
				return
			}
			assert.Error(t, runErr)
			assert.Equal(t, true, result["is_error"])
			assert.Equal(t, json.Number(strconv.Itoa(status)), result["api_error_status"], "native terminal result must preserve upstream status")
			assert.NotEmpty(t, assistants[len(assistants)-1]["error"])
			assert.Equal(t, requestID, assistants[len(assistants)-1]["request_id"], "native error assistant must preserve upstream request ID")
		})
	}
}
