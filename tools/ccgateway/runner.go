package main

import (
	"bufio"
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"
)

//go:embed all:mod
var modFiles embed.FS

type Runner struct {
	CLI, Version, Plugin, Work string
	Env                        []string
	Proxy                      *ProxyConfigStore
}

func extractMod(root string) (string, error) {
	dir, e := os.MkdirTemp(root, "mod-")
	if e != nil {
		return "", e
	}
	e = fs.WalkDir(modFiles, "mod", func(p string, d fs.DirEntry, e error) error {
		if e != nil {
			return e
		}
		rel := strings.TrimPrefix(p, "mod/")
		if p == "mod" {
			rel = "."
		}
		target := filepath.Join(dir, filepath.FromSlash(rel))
		if d.IsDir() {
			return os.MkdirAll(target, 0700)
		}
		b, e := modFiles.ReadFile(p)
		if e != nil {
			return e
		}
		return os.WriteFile(target, b, 0600)
	})
	if e != nil {
		os.RemoveAll(dir)
		return "", e
	}
	return dir, nil
}
func resolveCLI(path string) (string, error) {
	if path == "" {
		path = "claude"
	}
	p, e := exec.LookPath(path)
	if e != nil {
		return "", fmt.Errorf("Claude Code not found; set CCG_CLAUDE_PATH to its executable")
	}
	if strings.EqualFold(filepath.Ext(p), ".cmd") || strings.EqualFold(filepath.Ext(p), ".ps1") {
		native := filepath.Join(filepath.Dir(p), "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe")
		if _, e := os.Stat(native); e == nil {
			return native, nil
		}
		return "", fmt.Errorf("set CCG_CLAUDE_PATH to claude.exe, not a shell wrapper")
	}
	return p, nil
}
func checkVersion(cli string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	b, e := exec.CommandContext(ctx, cli, "--version").Output()
	if e != nil {
		return "", fmt.Errorf("cannot read Claude Code version")
	}
	fields := strings.Fields(string(b))
	if len(fields) == 0 {
		return "", fmt.Errorf("missing CLI version")
	}
	v := fields[0]
	var major, minor, patch int
	if _, e = fmt.Sscanf(v, "%d.%d.%d", &major, &minor, &patch); e != nil || major < 2 || (major == 2 && (minor < 1 || (minor == 1 && patch < 287))) {
		return "", fmt.Errorf("Claude Code >=2.1.287 required, found %s", v)
	}
	return v, nil
}
func envWith(base []string, values map[string]string, remove ...string) []string {
	key := func(k string) string {
		if runtime.GOOS == "windows" {
			return strings.ToUpper(k)
		}
		return k
	}
	m := map[string]string{}
	for _, s := range base {
		if k, v, ok := strings.Cut(s, "="); ok {
			m[key(k)] = v
		}
	}
	for _, k := range remove {
		delete(m, key(k))
	}
	for k, v := range values {
		m[key(k)] = v
	}
	out := make([]string, 0, len(m))
	for k, v := range m {
		out = append(out, k+"="+v)
	}
	return out
}
func (r *Runner) run(ctx context.Context, req *Request, p *Prepared, dir string, emit func(Object) error) (Object, error) {
	enabledTools := []string{}
	if !req.NoTools {
		for _, tool := range req.Tools {
			enabledTools = append(enabledTools, req.wireName(tool.Name))
		}
	}
	sort.Strings(enabledTools)
	snapshotMode := "off"
	if p.SnapshotEnabled {
		snapshotMode = "on"
	}
	args := []string{"-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--permission-prompt-tool", "stdio", "--tools", strings.Join(enabledTools, ","), "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--setting-sources", "", "--settings", `{"disableAllHooks":false}`, "--disable-slash-commands", "--no-chrome", "--max-turns", "1", "--model", req.Model, "--plugin-dir", r.Plugin, "--system-prompt-snapshot", snapshotMode}
	if p.Path != "" {
		args = append(args, "--resume", p.Path)
		if p.Anchor != "" {
			args = append(args, "--resume-session-at", p.Anchor)
		}
		if p.Fork {
			args = append(args, "--fork-session", "--session-id", p.SessionID)
		}
	} else {
		args = append(args, "--session-id", p.SessionID)
	}
	switch str(req.Thinking, "type") {
	case "enabled":
		args = append(args, "--max-thinking-tokens", fmt.Sprint(req.Thinking["budget_tokens"]))
	case "adaptive":
		args = append(args, "--thinking", "adaptive")
	default:
		args = append(args, "--thinking", "disabled")
	}
	if req.Effort != "" {
		args = append(args, "--effort", req.Effort)
	}
	if req.Fast != nil {
		settings, _ := json.Marshal(Object{"disableAllHooks": false, "fastMode": *req.Fast})
		for i := range args {
			if args[i] == "--settings" {
				args[i+1] = string(settings)
				break
			}
		}
	}
	ready := filepath.Join(dir, "mod-ready")
	runctx, cancel := context.WithCancel(ctx)
	defer cancel()
	cmd := exec.CommandContext(runctx, r.CLI, args...)
	cmd.Dir = p.Work
	env := r.Env
	if env == nil {
		env = os.Environ()
	}
	env = r.Proxy.Environment(env)
	cmd.Env = envWith(env, map[string]string{"CCGATEWAY_READY_FILE": ready, "CLAUDE_CODE_MAX_OUTPUT_TOKENS": strconv.Itoa(req.MaxTokens), "DISABLE_AUTOUPDATER": "1", "DISABLE_AUTO_COMPACT": "1", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "CLAUDE_CODE_DISABLE_CLAUDE_MDS": "1", "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "ENABLE_TOOL_SEARCH": "false", "CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION": "0"}, "CLAUDE_CODE_RESUME_INTERRUPTED_TURN", "CLAUDE_CODE_RESUME_FROM_SESSION", "CLAUDE_CODE_PLUGIN_DIRS", "ANTHROPIC_BETAS", "CLAUDE_CODE_EXTRA_BODY", "CLAUDE_CODE_EFFORT_LEVEL", "CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING")
	cmd.Env = envWith(cmd.Env, map[string]string{"ANTHROPIC_BETAS": strings.Join(req.Betas, ",")})
	if req.FineGrainedTools {
		cmd.Env = envWith(cmd.Env, map[string]string{"CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING": "1"})
	}
	stdin, e := cmd.StdinPipe()
	if e != nil {
		return nil, e
	}
	stdout, e := cmd.StdoutPipe()
	if e != nil {
		return nil, e
	}
	cmd.Stderr = io.Discard
	if e = cmd.Start(); e != nil {
		return nil, fmt.Errorf("cannot start Claude Code")
	}
	defer func() { cancel(); stdin.Close(); _ = cmd.Wait() }()
	// A descendant may inherit stdout and outlive the CLI. Cancellation must
	// also unblock reads, including the final drain, rather than waiting for
	// every descendant to close its copy of the pipe.
	stopReadOnCancel := context.AfterFunc(runctx, func() { _ = stdout.Close() })
	defer stopReadOnCancel()
	write := func(v any) error {
		b, e := json.Marshal(v)
		if e != nil {
			return e
		}
		b = append(b, '\n')
		_, e = stdin.Write(b)
		return e
	}
	servers := req.sdkMCPServers()
	initID := uuid()
	if e = write(Object{"type": "control_request", "request_id": initID, "request": Object{"subtype": "initialize", "systemPrompt": req.System, "systemPromptSnapshot": p.SnapshotEnabled, "sdkMcpServers": servers, "hooks": Object{}, "supportedDialogKinds": []string{}, "promptSuggestions": false, "excludeDynamicSections": true}}); e != nil {
		return nil, fmt.Errorf("cannot initialize CLI")
	}
	scan := bufio.NewScanner(stdout)
	scan.Buffer(make([]byte, 64*1024), 32<<20)
	initialized := false
	acc := &Accumulator{}
	for scan.Scan() {
		line := scan.Bytes()
		if len(line) == 0 {
			continue
		}
		f, e := decodeObject(line)
		if e != nil {
			return nil, fmt.Errorf("invalid CLI protocol frame")
		}
		switch str(f, "type") {
		case "control_request":
			reply := controlReply(f, req)
			if e = write(reply); e != nil {
				return nil, fmt.Errorf("cannot answer CLI callback")
			}
		case "control_response":
			resp, _ := f["response"].(map[string]any)
			if str(resp, "request_id") != initID || initialized {
				continue
			}
			if str(resp, "subtype") != "success" {
				return nil, fmt.Errorf("CLI rejected initialize")
			}
			initialized = true
			last := req.Messages[len(req.Messages)-1]
			if e = write(Object{"type": "user", "session_id": p.SessionID, "uuid": p.InputUUID, "parent_tool_use_id": nil, "message": req.wireMessage(last)}); e != nil {
				return nil, fmt.Errorf("cannot submit input")
			}
		case "stream_event":
			if f["parent_tool_use_id"] != nil {
				continue
			}
			if !initialized {
				return nil, fmt.Errorf("model event before initialization")
			}
			// Fail closed if the explicitly injected mod did not run. Permission
			// callbacks independently deny execution, even if mod loading fails.
			b, e := os.ReadFile(ready)
			if e != nil || string(b) != "ccgateway-v1" {
				return nil, fmt.Errorf("ccgateway Mod did not acknowledge loading")
			}
			event, ok := f["event"].(map[string]any)
			if !ok {
				return nil, fmt.Errorf("missing model event")
			}
			if acc.Done {
				return nil, fmt.Errorf("unexpected post-completion CLI event: %s", str(event, "type"))
			}
			if e = acc.push(event, req); e != nil {
				return nil, e
			}
			if acc.Done {
				continue // Wait for native persistence, with max-turns still bounded to one.
			}
			if e = emit(event); e != nil {
				return nil, e
			}
		case "result":
			if acc.Done {
				if sid := str(f, "session_id"); sid != "" && p.Mode == "rebuild" {
					// Importing an external JSONL may assign a fresh native session ID.
					p.SessionID = sid
				}
				_ = stdin.Close()
				// result is terminal, but the CLI can still flush notifications to
				// stdout before exiting. Drain the pipe before Wait, otherwise a
				// full pipe blocks both the child writer and our process wait.
				_, _ = io.Copy(io.Discard, stdout)
				// A tool handoff reaches max-turns and exits nonzero despite a complete response.
				_ = cmd.Wait()
				if ctx.Err() != nil {
					return nil, ctx.Err()
				}
				if e := p.captureNative(cmd.Env, str(acc.Message, "id")); e != nil {
					return nil, e
				}
				return acc.Message, nil
			}
			return nil, fmt.Errorf("CLI ended without a complete model message (%s)", str(f, "subtype"))
		}
	}
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}
	if scan.Err() != nil {
		return nil, fmt.Errorf("CLI frame read failed or exceeded size limit")
	}
	return nil, fmt.Errorf("CLI exited before a complete response; check CLI version and authentication")
}
func controlReply(f Object, r *Request) Object {
	id := f["request_id"]
	q, _ := f["request"].(map[string]any)
	payload := any(nil)
	switch str(q, "subtype") {
	case "can_use_tool":
		payload = Object{"behavior": "deny", "message": "Tools are executed by the API client", "toolUseID": q["tool_use_id"]}
	case "mcp_message":
		payload = Object{"mcp_response": sdkMCPReply(q, r)}
	case "request_user_dialog":
		payload = Object{"behavior": "cancelled"}
	case "elicitation":
		payload = Object{"action": "decline"}
	default:
		return Object{"type": "control_response", "response": Object{"subtype": "error", "request_id": id, "error": "Unsupported callback"}}
	}
	return Object{"type": "control_response", "response": Object{"subtype": "success", "request_id": id, "response": payload}}
}
