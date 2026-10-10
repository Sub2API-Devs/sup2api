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
	"runtime"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"
)

// Capture definitions from real outbound requests, never from SDK declarations.
// The fake upstream always answers with text, so no captured tool is executed.
// Set CCG_NATIVE_CATALOG_OUTPUT explicitly to regenerate a versioned fixture.
func TestCaptureRealCLINativeCatalog(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	definitions := map[string]Object{}
	var evidence []Object
	allNames := "Agent,AskUserQuestion,Bash,CronCreate,CronDelete,CronList,Edit,EnterPlanMode,EnterWorktree,ExitPlanMode,ExitWorktree,ListAgents,NotebookEdit,Read,ReportFindings,ScheduleWakeup,SendMessage,TaskCreate,TaskGet,TaskList,TaskStop,TaskUpdate,WebFetch,WebSearch,Workflow,Write,Glob,Grep,ToolSearch,PowerShell,Monitor,GetTask,Skill"
	for _, scenario := range []struct {
		name, mode, tools string
		teams             bool
		sdk               bool
		powershell        bool
	}{
		{"default", "default", "", false, false, false},
		{"plan", "plan", "", false, false, false},
		{"dont-ask", "dontAsk", "", false, false, false},
		{"team-discovery", "default", "", true, false, false},
		{"explicit-catalogued", "default", allNames, true, false, false},
		{"sdk-default", "default", "", false, true, false},
		{"sdk-explicit", "default", allNames, false, true, false},
		// Windows clients with CLAUDE_CODE_USE_POWERSHELL_TOOL (2026-10-10).
		{"powershell", "default", "", false, false, true},
	} {
		root := t.TempDir()
		var mu sync.Mutex
		var captured []Object
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !strings.HasSuffix(r.URL.Path, "/messages") {
				w.Header().Set("Content-Type", "application/json")
				fmt.Fprint(w, `{"input_tokens":1}`)
				return
			}
			raw, _ := io.ReadAll(r.Body)
			body, err := decodeObject(raw)
			if err != nil {
				http.Error(w, "invalid fixture", 400)
				return
			}
			mu.Lock()
			for _, item := range body["tools"].([]any) {
				definition, ok := item.(map[string]any)
				if ok {
					captured = append(captured, definition)
				}
			}
			mu.Unlock()
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "CATALOG_CAPTURE_COMPLETE"}})
		}))
		base := []string{}
		for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
			if value := os.Getenv(key); value != "" {
				base = append(base, key+"="+value)
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		args := []string{"-p", "Reply with a short sentence. Do not call any tool.", "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--max-turns", "1", "--permission-mode", scenario.mode, "--setting-sources", "", "--settings", `{"disableAllHooks":true}`, "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`}
		if scenario.sdk {
			args = append(append([]string{"-p"}, args[2:]...), "--input-format", "stream-json", "--permission-prompt-tool", "stdio")
		}
		if scenario.tools != "" {
			args = append(args, "--tools", scenario.tools)
		}
		cmd := exec.CommandContext(ctx, cli, args...)
		if scenario.sdk {
			var input bytes.Buffer
			encoder := json.NewEncoder(&input)
			_ = encoder.Encode(Object{"type": "control_request", "request_id": "catalog-fixture-init", "request": Object{"subtype": "initialize", "systemPrompt": []string{"Isolated tool definition capture"}, "systemPromptSnapshot": false, "sdkMcpServers": []string{}, "hooks": Object{}, "supportedDialogKinds": []string{}, "promptSuggestions": false, "excludeDynamicSections": true}})
			_ = encoder.Encode(Object{"type": "user", "session_id": uuid(), "uuid": uuid(), "parent_tool_use_id": nil, "message": Object{"role": "user", "content": "Reply with a sentence; do not use tools."}})
			cmd.Stdin = &input
		}
		cmd.Dir = root
		cmd.Env = envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-native-catalog", "ANTHROPIC_BASE_URL": server.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1"})
		if scenario.teams {
			cmd.Env = append(cmd.Env, "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1")
		}
		if scenario.powershell {
			cmd.Env = append(cmd.Env, "CLAUDE_CODE_USE_POWERSHELL_TOOL=1")
		}
		out, err := cmd.CombinedOutput()
		cancel()
		server.Close()
		if err != nil || !bytes.Contains(out, []byte("CATALOG_CAPTURE_COMPLETE")) {
			t.Fatalf("CLI %s scenario %s failed (%v, %d output bytes)", version, scenario.name, err, len(out))
		}
		mu.Lock()
		names := map[string]bool{}
		schemas := Object{}
		for _, definition := range captured {
			name := str(definition, "name")
			schema, ok := definition["input_schema"].(map[string]any)
			if name == "" || !ok {
				t.Fatal("invalid native definition")
			}
			delete(definition, "cache_control") // Request caching metadata is not tool identity.
			raw, _ := json.Marshal(definition)
			if bytes.Contains(raw, []byte(strings.ReplaceAll(root, `\`, `\\`))) {
				t.Fatal("catalog contains machine-specific workspace data")
			}
			key := name + ":" + digest(schema)
			schemas[name] = digest(schema)
			if _, exists := definitions[key]; !exists {
				definitions[key] = definition
			}
			names[name] = true
		}
		mu.Unlock()
		ordered := []string{}
		for name := range names {
			ordered = append(ordered, name)
		}
		sort.Strings(ordered)
		evidence = append(evidence, Object{"scenario": scenario.name, "permission_mode": scenario.mode, "agent_teams_requested": scenario.teams, "sdk_stream_input": scenario.sdk, "powershell_tool": scenario.powershell, "names": ordered, "schema_hashes": schemas, "count": len(ordered)})
		t.Logf("CLI %s scenario=%s count=%d tools=%s", version, scenario.name, len(ordered), strings.Join(ordered, ","))
	}
	keys := []string{}
	for key := range definitions {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	all := []Object{}
	for _, key := range keys {
		all = append(all, definitions[key])
	}
	if len(all) == 0 {
		t.Fatal("no tools captured")
	}
	if output := os.Getenv("CCG_NATIVE_CATALOG_OUTPUT"); output != "" {
		if filepath.Base(output) != "claude-"+version+".json" {
			t.Fatal("output filename must match actual CLI version")
		}
		raw, _ := json.MarshalIndent(all, "", "  ")
		if err := os.WriteFile(output, append(raw, '\n'), 0600); err != nil {
			t.Fatal(err)
		}
		meta, _ := json.MarshalIndent(Object{"cli_version": version, "os": runtime.GOOS, "arch": runtime.GOARCH, "model": "claude-opus-5-5", "source": "real CLI outbound requests to isolated fake upstream; text-only answers; no tools executed", "native_definition_variants": len(all), "scenarios": evidence}, "", "  ")
		if err := os.WriteFile(strings.TrimSuffix(output, ".json")+".capture.json", append(meta, '\n'), 0600); err != nil {
			t.Fatal(err)
		}
	}
}
