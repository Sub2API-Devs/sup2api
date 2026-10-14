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

// The optional fixture is extracted from a real local compacted transcript.
// It is never embedded in the repository or sent to a real provider.
func TestRealCLICompactedRequestRebuild(t *testing.T) {
	inputDir := os.Getenv("CCG_COMPACT_REBUILD_INPUT")
	if inputDir == "" {
		t.Skip("set CCG_COMPACT_REBUILD_INPUT to the extracted fixture directory")
	}
	summary, err := os.ReadFile(filepath.Join(inputDir, "summary.txt"))
	require.NoError(t, err)
	for _, scenario := range []string{"summary-only", "summary-and-retained"} {
		t.Run(scenario, func(t *testing.T) {
			input, err := os.ReadFile(filepath.Join(inputDir, scenario+".json"))
			require.NoError(t, err)
			captured := make(chan []byte, 8)
			g, _ := nativeFeatureGatewayFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":20}`)
					return
				}
				body, err := io.ReadAll(r.Body)
				if err != nil {
					http.Error(w, "fixture read failed", 500)
					return
				}
				captured <- body
				writeSurfaceFixture(w, "claude-sonnet-4-6", []Object{{"type": "text", "text": "COMPACT_REBUILD_OK"}})
			})
			artifact := t.TempDir()
			if out := os.Getenv("CCG_NATIVE_EVIDENCE_DIR"); out != "" {
				artifact = filepath.Join(out, scenario)
				require.NoError(t, os.MkdirAll(artifact, 0700))
			}
			write := func(name string, data []byte) {
				t.Helper()
				require.NoError(t, os.WriteFile(filepath.Join(artifact, name), data, 0600))
			}
			writeJSON := func(name string, data any) {
				t.Helper()
				raw, err := json.MarshalIndent(data, "", "  ")
				require.NoError(t, err)
				write(name, raw)
			}
			write("01-api-request.json", input)
			httpReq := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(input))
			httpReq.Header.Set(policyHeader, `{"relay_mode":"native"}`)
			response := httptest.NewRecorder()
			x := &exchange{g: g, w: response, r: httpReq, diagnostic: newRequestDiagnostic(response, httpReq)}
			defer x.resources.close()
			if !x.admit() {
				write("admission-error.json", response.Body.Bytes())
				t.Fatalf("fixture admission failed: %s", response.Body.String())
			}
			ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
			defer cancel()
			require.NoError(t, g.Runner.prepareNativeTools(ctx, x.req))
			branch, ok := x.session()
			require.True(t, ok)
			prepared, err := prepareHistory(x.req, g.Cache, branch, t.TempDir(), g.Runner.Version)
			require.NoError(t, err)
			require.Equal(t, "rebuild", prepared.Mode)
			require.NotEmpty(t, prepared.Path)
			before, err := os.ReadFile(prepared.Path)
			require.NoError(t, err)
			write("02-new-history.jsonl", before)
			writeJSON("03-runtime-input.json", Object{"system": x.req.System, "input": x.req.pendingWireMessage(), "pending_systems": x.req.pendingSystems(), "cli_args": cliArgs(x.req, prepared, g.Runner.Plugin)})
			answer, err := g.Runner.run(ctx, x.req, prepared, prepared.dir, func(Object) error { return nil })
			require.NoError(t, err)
			writeJSON("06-answer.json", answer)
			require.Len(t, captured, 1)
			outbound := <-captured
			var pretty bytes.Buffer
			require.NoError(t, json.Indent(&pretty, outbound, "", "  "))
			write("04-outbound-request.json", pretty.Bytes())
			wire, err := decodeObject(outbound)
			require.NoError(t, err)
			var expected, actual []Object
			for _, m := range x.req.Messages {
				converted := x.req.wireMessage(m)
				expected = append(expected, Object{"role": converted.Role, "content": converted.Content})
			}
			summaryCount, calls, results := 0, 0, 0
			for _, value := range wire["messages"].([]any) {
				message := value.(Object)
				blocks, err := historyContent(message["content"])
				require.NoError(t, err)
				actual = append(actual, Object{"role": message["role"], "content": withoutProtocolCache(blocks)})
				for _, b := range blocks {
					if str(b, "type") == "text" {
						summaryCount += strings.Count(str(b, "text"), string(summary))
					}
					if str(b, "type") == "tool_use" {
						calls++
					}
					if str(b, "type") == "tool_result" {
						results++
					}
				}
			}
			tools, err := historyContent(wire["tools"])
			require.NoError(t, err)
			// Report exact differences separately. The native CLI drops direct
			// caller metadata and folds system messages, escaping nested tags.
			project := func(messages []Object, source bool) ([]Object, string) {
				var conversation []Object
				var systems []string
				for _, message := range messages {
					blocks, e := historyContent(message["content"])
					require.NoError(t, e)
					if message["role"] == "system" {
						for _, b := range blocks {
							text := str(b, "text")
							if source {
								text = strings.ReplaceAll(text, "<system-reminder>", "&lt;system-reminder>")
								text = strings.ReplaceAll(text, "</system-reminder>", "&lt;/system-reminder>")
							}
							systems = append(systems, text)
						}
						continue
					}
					var copied []Object
					for _, b := range blocks {
						copy := Object{}
						for k, v := range b {
							copy[k] = v
						}
						if source && str(b, "type") == "tool_use" {
							if caller, ok := b["caller"].(Object); ok && len(caller) == 1 && str(caller, "type") == "direct" {
								delete(copy, "caller")
							}
						}
						copied = append(copied, copy)
					}
					conversation = append(conversation, Object{"role": message["role"], "content": copied})
				}
				return conversation, strings.Join(systems, "\n")
			}
			expectedConversation, expectedSystems := project(expected, true)
			actualConversation, actualSystems := project(actual, false)
			expectedTools := 0
			if scenario == "summary-and-retained" {
				expectedTools = 1
			}
			checks := Object{
				"cli_version": g.Runner.Version, "scenario": scenario, "mode": prepared.Mode,
				"summary_unchanged_exactly_once":          summaryCount == 1,
				"normalized_messages_equal":               digest(expected) == digest(actual),
				"conversation_equal_except_direct_caller": digest(expectedConversation) == digest(actualConversation),
				"systems_equal_after_native_rendering":    expectedSystems == actualSystems,
				"expected_messages_digest":                digest(expected), "actual_messages_digest": digest(actual),
				"historical_call_count": calls, "historical_result_count": results,
				"tool_pairs_complete":   calls == expectedTools && results == expectedTools,
				"executable_tool_count": len(tools), "no_tools_registered": len(tools) == 0,
				"no_native_compaction_records_copied": !bytes.Contains(before, []byte(`"subtype":"compact_boundary"`)),
				"note":                                "Equality is over the entire normalized conversation; no original pre-compaction conversation is appended. Summary-only is a new root with the combined user content sent via stdin. The retained scenario seeds summary and historical tool nodes into JSONL.",
			}
			writeJSON("05-checks.json", checks)
			writeJSON("04b-normalized-outbound-messages.json", actual)
			if after, err := os.ReadFile(prepared.NativePath); err == nil {
				write("07-history-after-cli.jsonl", after)
			}
			for _, key := range []string{"summary_unchanged_exactly_once", "conversation_equal_except_direct_caller", "systems_equal_after_native_rendering", "tool_pairs_complete", "no_tools_registered", "no_native_compaction_records_copied"} {
				if checks[key] != true {
					t.Errorf("%s failed; inspect local evidence", key)
				}
			}
			t.Logf("CLI=%s scenario=%s new_jsonl_bytes=%d summary_exact_count=%d messages_equal=%t historical_tools=%d/%d", g.Runner.Version, scenario, len(before), summaryCount, checks["normalized_messages_equal"], calls, results)
		})
	}
}
