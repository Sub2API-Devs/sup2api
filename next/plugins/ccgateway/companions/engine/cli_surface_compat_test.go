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
	"sort"
	"strings"
	"sync"
	"testing"
	"time"
)

// This opt-in probe uses the installed CLI directly, not the gateway decoder.
// Synthetic upstream blocks establish transport behavior only, not model support.
func TestRealCLISurfaceCompatibility(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated real CLI compatibility probe")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	for _, scenario := range []struct {
		name   string
		blocks []Object
		want   []string
	}{
		{"text", []Object{{"type": "text", "text": "SURFACE_OK"}}, []string{"SURFACE_OK"}},
		{"auxiliary", []Object{{"type": "text", "text": "SURFACE_OK"}}, []string{"SURFACE_OK"}},
		{"auxiliary-classify", []Object{{"type": "text", "text": "SURFACE_OK"}}, []string{"SURFACE_OK"}},
		{"auxiliary-fork", []Object{{"type": "text", "text": "SURFACE_OK"}}, []string{"SURFACE_OK"}},
		{"initialize", []Object{{"type": "text", "text": "SURFACE_OK"}}, []string{"SURFACE_OK"}},
		{"resume-snapshot", []Object{{"type": "text", "text": "SURFACE_OK"}}, []string{"SURFACE_OK"}},
		{"resume-without-snapshot", []Object{{"type": "text", "text": "SURFACE_OK"}}, []string{"SURFACE_OK"}},
		{"structured", []Object{{"type": "text", "text": "SURFACE_OK"}}, []string{"structured_output"}},
		{"internal-search", []Object{{"type": "text", "text": "SURFACE_OK"}}, []string{"SURFACE_OK"}},
		{"server-search", []Object{
			{"type": "server_tool_use", "id": "srvtoolu_probe", "name": "web_search", "input": Object{"query": "fixture"}},
			{"type": "web_search_tool_result", "tool_use_id": "srvtoolu_probe", "content": []any{}},
			{"type": "text", "text": "SEARCH_OK"},
		}, []string{"server_tool_use", "web_search_tool_result", "SEARCH_OK"}},
		{"tool-reference", []Object{
			{"type": "server_tool_use", "id": "srvtoolu_probe", "name": "tool_search_tool_regex", "input": Object{"pattern": "fixture"}},
			{"type": "tool_search_tool_result", "tool_use_id": "srvtoolu_probe", "content": Object{"type": "tool_search_tool_search_result", "tool_references": []any{Object{"type": "tool_reference", "tool_name": "fixture_tool"}}}},
			{"type": "text", "text": "REFERENCE_OK"},
		}, []string{"tool_search_tool_result", "tool_reference", "REFERENCE_OK"}},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			root := t.TempDir()
			var mu sync.Mutex
			var events []Object
			var requests []Object
			var headerNames []string
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				body, _ := io.ReadAll(r.Body)
				if r.URL.Path == "/probe" {
					event, err := decodeObject(body)
					if err != nil {
						http.Error(w, "invalid probe event", 400)
						return
					}
					mu.Lock()
					events = append(events, event)
					mu.Unlock()
					fmt.Fprint(w, `{}`)
					return
				}
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					w.Header().Set("Content-Type", "application/json")
					fmt.Fprint(w, `{"input_tokens":20}`)
					return
				}
				request, err := decodeObject(body)
				if err != nil {
					http.Error(w, "bad request", 400)
					return
				}
				mu.Lock()
				requests = append(requests, request)
				requestIndex := len(requests)
				for name := range r.Header {
					headerNames = append(headerNames, name)
				}
				mu.Unlock()
				if request["stream"] != true {
					w.Header().Set("Content-Type", "application/json")
					_ = json.NewEncoder(w).Encode(Object{"id": "msg_auxiliary_probe", "type": "message", "role": "assistant", "model": request["model"], "content": []Object{{"type": "text", "text": "AUXILIARY_OK"}}, "stop_reason": "end_turn", "stop_sequence": nil, "usage": Object{"input_tokens": 20, "output_tokens": 8}})
					return
				}
				blocks := scenario.blocks
				if scenario.name == "structured" && requestIndex > 1 {
					blocks = []Object{{"type": "tool_use", "name": "StructuredOutput", "id": "toolu_structured_probe", "input": Object{"ok": true}}}
				}
				if scenario.name == "internal-search" && requestIndex == 1 {
					blocks = []Object{{"type": "tool_use", "name": "ToolSearch", "id": "toolu_search_probe", "input": Object{"query": "select:Read"}}}
				}
				writeSurfaceFixture(w, str(request, "model"), blocks)
			}))
			defer upstream.Close()
			plugin := filepath.Join(root, "plugin")
			for name, body := range map[string]string{
				".claude-plugin/plugin.json": `{"name":"surface-probe","version":"1.0.0"}`,
				"hooks/hooks.json":           `{"modules":["./register.js"]}`,
				"hooks/register.js": `async function report($, kind, e) {
    await $.http.fetch(await $.env.get('CCG_SURFACE_PROBE_URL'), {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind,keys:Object.keys(e),turnId:e.turnId,agentId:e.agentId,model:e.model,requestId:e.requestId,reason:e.reason,isAnswered:e.isAnswered})});
}
export function register(on) {
  on('turn.start', async ($, e, next) => { await report($,'turn.start',e); if (await $.env.get('CCG_SURFACE_AUX') === '1') await $.model.complete({model:'haiku',prompt:'AUXILIARY_PROBE',maxTokens:16}); return next(e); });
  on('turn.step', async function* ($, e, next) { await report($,'turn.step',e); if(await $.env.get('CCG_SURFACE_AUX') === 'classify') await $.model.classify('AUXILIARY_CLASSIFY_PROBE',['yes','no'],{model:'haiku'}); const answer = yield* next(e); if (await $.env.get('CCG_SURFACE_AUX') === 'fork') { const r = await $.model.fork({prompt:'AUXILIARY_FORK_PROBE',maxTokens:16}); await report($,'fork.result',{reason:r.reason,isAnswered:r.isAnswered}); } return answer; });
  on('model.complete', async ($, e, next) => { await report($,'model.complete',e); return next(e); });
  on('model.classify', async ($, e, next) => { await report($,'model.classify',e); return next(e); });
}`,
			} {
				path := filepath.Join(plugin, name)
				if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
					t.Fatal(err)
				}
				if err := os.WriteFile(path, []byte(body), 0600); err != nil {
					t.Fatal(err)
				}
			}
			base := []string{}
			for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
				if value := os.Getenv(key); value != "" {
					base = append(base, key+"="+value)
				}
			}
			ctx, cancel := context.WithTimeout(context.Background(), 35*time.Second)
			defer cancel()
			debugFile := filepath.Join(root, "debug.log")
			marker := "CCG_ISOLATED_REQUEST_MARKER_" + uuid()
			previousMarker := ""
			cmd := exec.CommandContext(ctx, cli, "-p", "SURFACE_PROBE", "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--tools", "", "--max-turns", "1", "--setting-sources", "", "--settings", `{"disableAllHooks":false}`, "--plugin-dir", plugin, "--debug-file", debugFile, "--append-system-prompt", marker)
			cmd.Dir = root
			cmd.Env = envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-surface-probe", "ANTHROPIC_BASE_URL": upstream.URL, "CCG_SURFACE_PROBE_URL": upstream.URL + "/probe", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1"})
			if scenario.name == "auxiliary" {
				cmd.Env = append(cmd.Env, "CCG_SURFACE_AUX=1")
			} else if scenario.name == "auxiliary-fork" {
				cmd.Env = append(cmd.Env, "CCG_SURFACE_AUX=fork")
			} else if scenario.name == "auxiliary-classify" {
				cmd.Env = append(cmd.Env, "CCG_SURFACE_AUX=classify")
			}
			if scenario.name == "structured" {
				cmd.Args = append(cmd.Args, "--json-schema", `{"type":"object","properties":{"ok":{"type":"boolean"}},"required":["ok"]}`, "--max-turns", "3")
			} else if scenario.name == "internal-search" {
				cmd.Args = append(cmd.Args, "--tools", "ToolSearch", "--max-turns", "2")
				cmd.Env = append(cmd.Env, "ENABLE_TOOL_SEARCH=true")
			}
			var out []byte
			if scenario.name == "initialize" || strings.HasPrefix(scenario.name, "resume-") {
				cmd.Args = append(cmd.Args[:2], cmd.Args[3:]...) // no positional prompt in stream-json mode
				cmd.Args = append(cmd.Args, "--input-format", "stream-json")
				if strings.HasPrefix(scenario.name, "resume-") {
					cmd.Args = append(cmd.Args, "--system-prompt-snapshot", "on")
				}
				out, err = runInitializedSurfaceProbe(cmd, strings.HasPrefix(scenario.name, "resume-"))
			} else {
				out, err = cmd.CombinedOutput()
			}
			if err != nil {
				// Do not print arbitrary CLI diagnostics or inherited values.
				t.Fatalf("CLI %s failed: %v; output bytes=%d", version, err, len(out))
			}
			if strings.HasPrefix(scenario.name, "resume-") {
				sessionID := ""
				for _, line := range bytes.Split(out, []byte{'\n'}) {
					frame, _ := decodeObject(line)
					if str(frame, "session_id") != "" {
						sessionID = str(frame, "session_id")
						break
					}
				}
				if sessionID == "" {
					t.Fatal("first CLI run did not publish session ID")
				}
				previousMarker, marker = marker, "CCG_ISOLATED_REQUEST_MARKER_"+uuid()
				args := append([]string{}, cmd.Args[1:]...)
				for i, arg := range args {
					if arg == previousMarker {
						args[i] = marker
					}
					if arg == "--system-prompt-snapshot" && scenario.name == "resume-without-snapshot" {
						args[i+1] = "off"
					}
				}
				args = append(args, "--resume", sessionID)
				resumed := exec.CommandContext(ctx, cli, args...)
				resumed.Dir, resumed.Env = cmd.Dir, cmd.Env
				after, err := runInitializedSurfaceProbe(resumed, scenario.name == "resume-snapshot")
				if err != nil {
					t.Fatalf("resume CLI failed: %v output bytes=%d", err, len(after))
				}
				out = append(out, after...)
			}
			if scenario.name == "text" {
				types, _ := os.ReadFile(filepath.Join(plugin, ".claude-plugin", "types", "claude-code", "index.d.ts"))
				lines := strings.Split(string(types), "\n")
				for _, line := range lines {
					if strings.Contains(line, "classify:") {
						t.Logf("generated classifier type: %s", strings.TrimSpace(line))
					}
				}
			}
			for _, expected := range scenario.want {
				if !bytes.Contains(out, []byte(expected)) {
					t.Errorf("CLI output lost synthetic block/token %q", expected)
				}
			}
			mu.Lock()
			defer mu.Unlock()
			wantRequests := 1
			if scenario.name == "auxiliary" || scenario.name == "auxiliary-classify" || scenario.name == "structured" || scenario.name == "internal-search" || strings.HasPrefix(scenario.name, "resume-") {
				wantRequests = 2
			}
			if len(requests) != wantRequests {
				t.Errorf("model requests=%d, want %d", len(requests), wantRequests)
			}
			for i, request := range requests {
				keys := []string{}
				for key := range request {
					keys = append(keys, key)
				}
				sort.Strings(keys)
				systemBytes, _ := json.Marshal(request["system"])
				messageBytes, _ := json.Marshal(request["messages"])
				t.Logf("request=%d model=%s stream=%v body_keys=%v system_marker=%t auxiliary_prompt=%t", i, request["model"], request["stream"], keys, bytes.Contains(systemBytes, []byte(marker)), bytes.Contains(messageBytes, []byte("AUXILIARY")))
				if strings.HasPrefix(scenario.name, "resume-") && i == 1 {
					stale := bytes.Contains(systemBytes, []byte(previousMarker))
					t.Logf("resumed_system_previous_marker=%t current_marker=%t", stale, bytes.Contains(systemBytes, []byte(marker)))
					if scenario.name == "resume-snapshot" {
						// A negative compatibility baseline: snapshots are NOT safe for
						// per-request markers on this CLI. Production must disable them.
						if !stale || bytes.Contains(systemBytes, []byte(marker)) {
							t.Error("snapshot behavior changed; re-evaluate the unsupported marker/snapshot combination")
						}
						t.Log("UNSAFE_COMBINATION: enabled native snapshot retained the prior request marker")
					} else if stale || !bytes.Contains(systemBytes, []byte(marker)) {
						t.Error("resume snapshot did not replace request-local marker")
					}
				}
				expectedMarker := marker
				if strings.HasPrefix(scenario.name, "resume-") && (i == 0 || scenario.name == "resume-snapshot") {
					expectedMarker = previousMarker
				}
				isAuxiliary := bytes.Contains(messageBytes, []byte("AUXILIARY"))
				if bytes.Contains(systemBytes, []byte(expectedMarker)) == isAuxiliary {
					t.Error("marker did not distinguish the main request from this synthetic auxiliary request")
				}
				systemBlocks, _ := request["system"].([]any)
				for index, value := range systemBlocks {
					block, _ := value.(map[string]any)
					if strings.Contains(str(block, "text"), marker) {
						t.Logf("marker block=%d standalone=%t suffix=%t text_length=%d custom_system_preserved=%t", index, strings.TrimSpace(str(block, "text")) == marker, strings.HasSuffix(str(block, "text"), "\n\n"+marker), len(str(block, "text")), bytes.Contains(systemBytes, []byte("INITIALIZED_CLIENT_SYSTEM")))
					}
				}
			}
			stepSeen := false
			for _, event := range events {
				stepSeen = stepSeen || str(event, "kind") == "turn.step"
				// IDs are correlation candidates; print only whether they exist.
				t.Logf("hook=%s keys=%v turnId=%t agentId=%t requestId=%t", event["kind"], event["keys"], event["turnId"] != nil, event["agentId"] != nil, event["requestId"] != nil)
				if str(event, "kind") == "fork.result" {
					t.Logf("fork isAnswered=%v reason=%v", event["isAnswered"], event["reason"])
					if event["isAnswered"] != false || str(event, "reason") != "nothing-to-fork" {
						t.Errorf("fork baseline changed; re-evaluate marker propagation before claiming support")
					}
				}
			}
			if !stepSeen {
				t.Error("turn.step hook did not run")
				debug, _ := os.ReadFile(debugFile)
				for _, line := range strings.Split(string(debug), "\n") {
					if strings.Contains(line, "surface-probe") || strings.Contains(line, "register.js") {
						t.Log(line)
					}
				}
			}
			sort.Strings(headerNames)
			t.Logf("CLI=%s local_model_requests=%d header_names=%v; no header values logged", version, len(requests), headerNames)
		})
	}
}

func runInitializedSurfaceProbe(cmd *exec.Cmd, snapshot bool) ([]byte, error) {
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	cmd.Stderr = io.Discard
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	defer func() {
		_ = stdin.Close()
		if cmd.ProcessState == nil {
			_ = cmd.Process.Kill()
			_ = cmd.Wait()
		}
	}()
	encode := json.NewEncoder(stdin)
	if err := encode.Encode(Object{"type": "control_request", "request_id": "surface-init", "request": Object{"subtype": "initialize", "systemPrompt": []string{"INITIALIZED_CLIENT_SYSTEM"}, "systemPromptSnapshot": snapshot, "sdkMcpServers": []any{}, "hooks": Object{}, "supportedDialogKinds": []string{}, "promptSuggestions": false}}); err != nil {
		return nil, err
	}
	var out bytes.Buffer
	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 64*1024), 8<<20)
	for scanner.Scan() {
		line := scanner.Bytes()
		out.Write(line)
		out.WriteByte('\n')
		frame, err := decodeObject(line)
		if err != nil {
			continue
		}
		if str(frame, "type") == "control_response" {
			response, _ := frame["response"].(map[string]any)
			if str(response, "request_id") == "surface-init" {
				if str(response, "subtype") != "success" {
					_ = cmd.Process.Kill()
					_ = cmd.Wait()
					return out.Bytes(), fmt.Errorf("initialize rejected")
				}
				if err := encode.Encode(Object{"type": "user", "message": Object{"role": "user", "content": "SURFACE_PROBE"}}); err != nil {
					return out.Bytes(), err
				}
				_ = stdin.Close()
			}
		}
	}
	if err := scanner.Err(); err != nil {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
		return out.Bytes(), err
	}
	return out.Bytes(), cmd.Wait()
}

func writeSurfaceFixture(w http.ResponseWriter, model string, blocks []Object) {
	w.Header().Set("Content-Type", "text/event-stream")
	event := func(value Object) {
		data, _ := json.Marshal(value)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(value, "type"), data)
	}
	event(Object{"type": "message_start", "message": Object{"id": "msg_surface_probe", "type": "message", "role": "assistant", "model": model, "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 20, "output_tokens": 0}}})
	for i, block := range blocks {
		if str(block, "type") == "text" {
			event(Object{"type": "content_block_start", "index": i, "content_block": Object{"type": "text", "text": ""}})
			event(Object{"type": "content_block_delta", "index": i, "delta": Object{"type": "text_delta", "text": block["text"]}})
		} else if str(block, "type") == "tool_use" || str(block, "type") == "server_tool_use" {
			start := Object{}
			for key, value := range block {
				start[key] = value
			}
			start["input"] = Object{}
			input, _ := json.Marshal(block["input"])
			event(Object{"type": "content_block_start", "index": i, "content_block": start})
			event(Object{"type": "content_block_delta", "index": i, "delta": Object{"type": "input_json_delta", "partial_json": string(input)}})
		} else {
			event(Object{"type": "content_block_start", "index": i, "content_block": block})
		}
		event(Object{"type": "content_block_stop", "index": i})
	}
	stop := "end_turn"
	for _, block := range blocks {
		if str(block, "type") == "tool_use" {
			stop = "tool_use"
		}
	}
	event(Object{"type": "message_delta", "delta": Object{"stop_reason": stop, "stop_sequence": nil}, "usage": Object{"output_tokens": 8}})
	event(Object{"type": "message_stop"})
}
