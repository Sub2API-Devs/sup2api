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
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

// Keep all four boundaries visible: an API file, the real generated transcript,
// native CLI execution, and the raw HTTP body received by a fake provider.
func TestRealCLIRequestFileRoundtrip(t *testing.T) {
	input, err := os.ReadFile("testdata/file_roundtrip_request.json")
	require.NoError(t, err)
	for _, pendingResult := range []bool{false, true} {
		t.Run(fmt.Sprintf("pending-tool-results=%t", pendingResult), func(t *testing.T) {
			body, err := decodeObject(input)
			require.NoError(t, err)
			if pendingResult {
				messages := body["messages"].([]any)
				body["messages"] = append(messages[:4:4], messages[6])
				body["stream"] = true
			}
			raw, err := marshalPlain(body)
			require.NoError(t, err)
			captured := make(chan []byte, 8)
			g, _ := nativeFeatureGatewayFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":20}`)
					return
				}
				outbound, err := io.ReadAll(r.Body)
				if err != nil {
					http.Error(w, err.Error(), 500)
					return
				}
				captured <- outbound
				writeSurfaceFixture(w, "claude-sonnet-4-6", []Object{{"type": "text", "text": "ROUNDTRIP_OK"}})
			})
			artifact := t.TempDir()
			if root := os.Getenv("CCG_NATIVE_EVIDENCE_DIR"); root != "" {
				artifact = filepath.Join(root, strings.ReplaceAll(t.Name(), "/", "_"))
				require.NoError(t, os.MkdirAll(artifact, 0700))
			}
			write := func(name string, data []byte) {
				t.Helper()
				require.NoError(t, os.WriteFile(filepath.Join(artifact, name), data, 0600))
			}
			writeJSON := func(name string, value any) {
				t.Helper()
				data, err := json.MarshalIndent(value, "", "  ")
				require.NoError(t, err)
				write(name, data)
			}
			write("01-client-request.json", raw)
			// Read the actual request file back before admission and conversion.
			fromFile, err := os.ReadFile(filepath.Join(artifact, "01-client-request.json"))
			require.NoError(t, err)
			httpReq := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(fromFile))
			httpReq.Header.Set(policyHeader, `{"relay_mode":"native"}`)
			httpReq.Header.Set("Anthropic-Beta", "fine-grained-tool-streaming-2025-05-14")
			response := httptest.NewRecorder()
			diagnostic := newRequestDiagnostic(response, httpReq)
			x := &exchange{g: g, w: response, r: httpReq, diagnostic: diagnostic}
			defer x.resources.close()
			require.True(t, x.admit(), response.Body.String())
			ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
			defer cancel()
			require.NoError(t, g.Runner.prepareNativeTools(ctx, x.req))
			branch, ok := x.session()
			require.True(t, ok, response.Body.String())
			p, err := prepareHistory(x.req, g.Cache, branch, t.TempDir(), g.Runner.Version)
			require.NoError(t, err)
			require.Equal(t, "rebuild", p.Mode)
			require.NotEmpty(t, p.Path)
			transcript, err := os.ReadFile(p.Path)
			require.NoError(t, err)
			write("02-history-before-cli.jsonl", transcript)
			writeJSON("03-cli-configuration.json", Object{
				"version": g.Runner.Version, "args": cliArgs(x.req, p, g.Runner.Plugin),
				"resume_file": p.Path, "resume_anchor": p.Anchor,
				"system_prompt": x.req.System, "pending_input": x.req.pendingWireMessage(),
				"pending_systems": x.req.pendingSystems(),
				"note":            "Top-level system and current input are supplied through the native initialization/input protocol; JSONL holds the replayable history.",
			})
			answer, err := g.Runner.run(ctx, x.req, p, p.dir, func(Object) error { return nil })
			require.NoError(t, err)
			writeJSON("06-response.json", answer)
			if native, err := os.ReadFile(p.NativePath); err == nil {
				write("07-history-after-cli.jsonl", native)
			}
			require.Len(t, captured, 1, "the fixture must make exactly one model request")
			outbound := <-captured
			var pretty bytes.Buffer
			require.NoError(t, json.Indent(&pretty, outbound, "", "  "))
			write("04-outbound-request.json", pretty.Bytes())
			wire, err := decodeObject(outbound)
			require.NoError(t, err)
			checks := []Object{}
			check := func(name string, expected, actual any) {
				pass := digest(expected) == digest(actual)
				checks = append(checks, Object{"name": name, "expected": expected, "actual": actual, "pass": pass})
				if !pass {
					t.Errorf("%s: expected %v, got %v", name, expected, actual)
				}
			}
			for _, name := range []string{"model", "max_tokens", "temperature", "top_p", "top_k", "stop_sequences", "thinking", "tool_choice"} {
				check(name, body[name], wire[name])
			}
			check("CLI model request uses SSE", true, wire["stream"])
			config, _ := wire["output_config"].(Object)
			check("effort", "medium", config["effort"])
			markers := []string{"TOP_SYSTEM_A", "TOP_SYSTEM_B", "HISTORY_USER_A", "HISTORY_USER_B", "HISTORY_SYSTEM", "HISTORY_ASSISTANT", "TOOL_RESULT_A", "TOOL_RESULT_B", "CURRENT_SYSTEM"}
			if !pendingResult {
				markers = append(markers, "AFTER_RESULTS", "CURRENT_USER")
			}
			for _, marker := range markers {
				check("content occurs once: "+marker, 1, strings.Count(string(outbound), marker))
			}
			var expectedMessages, actualMessages []Object
			for _, message := range x.req.Messages {
				converted := x.req.wireMessage(message)
				expectedMessages = append(expectedMessages, Object{"role": converted.Role, "content": converted.Content})
			}
			for _, value := range wire["messages"].([]any) {
				message := value.(Object)
				blocks, err := historyContent(message["content"])
				require.NoError(t, err)
				actualMessages = append(actualMessages, Object{"role": message["role"], "content": withoutProtocolCache(blocks)})
			}
			check("full message order and normalized content", expectedMessages, actualMessages)
			writeJSON("04b-normalized-messages.json", actualMessages)
			calls, results := map[string]Object{}, map[string]Object{}
			for _, value := range wire["messages"].([]any) {
				message := value.(Object)
				blocks, err := historyContent(message["content"])
				require.NoError(t, err)
				for _, block := range blocks {
					switch str(block, "type") {
					case "tool_use":
						calls[str(block, "id")] = block
					case "tool_result":
						results[str(block, "tool_use_id")] = block
					}
				}
			}
			check("tool call count", 2, len(calls))
			check("tool result count", 2, len(results))
			original := body["messages"].([]any)
			for _, value := range original[2].(Object)["content"].([]any) {
				block := value.(Object)
				if str(block, "type") == "tool_use" {
					actual := calls[str(block, "id")]
					check("tool name "+str(block, "id"), x.req.wireName(str(block, "name")), actual["name"])
					check("tool input "+str(block, "id"), block["input"], actual["input"])
				}
			}
			for _, value := range original[3].(Object)["content"].([]any) {
				block := value.(Object)
				actual := results[str(block, "tool_use_id")]
				check("tool result content "+str(block, "tool_use_id"), block["content"], actual["content"])
			}
			tools, err := historyContent(wire["tools"])
			require.NoError(t, err)
			check("tool definition count", 1, len(tools))
			if len(tools) == 1 {
				check("tool schema", body["tools"].([]any)[0].(Object)["input_schema"], tools[0]["input_schema"])
			}
			writeJSON("05-checks.json", Object{"version": g.Runner.Version, "checks": checks, "whole_body_equal": digest(body) == digest(wire), "expected_native_differences": []string{"metadata uses derived CLI identity", "CLI supplies native system wrappers", "custom tool names use MCP namespace", "CLI model transport always uses stream=true", "default fields and native cache breakpoints may be added"}})
			t.Logf("CLI=%s request-file -> %d-byte JSONL -> one captured request; %d checks; artifacts=%s", g.Runner.Version, len(transcript), len(checks), artifact)
		})
	}
}
