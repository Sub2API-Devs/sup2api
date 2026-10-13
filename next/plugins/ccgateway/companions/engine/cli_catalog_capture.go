package engine

import (
	"bytes"
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

var cliCatalogProbes sync.Map

const cliCatalogPrefix = "/ccg-tool-catalog/"

type cliCatalogProbe struct {
	mu          sync.Mutex
	key         string
	tools       map[string]Tool
	requests    int
	env         map[string]string
	profile     cliToolProfile
	err         error
	verify      *Request
	whitelist   bool
	fixturePath string
}

func serveCLICatalogProbe(w http.ResponseWriter, r *http.Request) bool {
	if !strings.HasPrefix(r.URL.Path, cliCatalogPrefix) {
		return false
	}
	id, tail, ok := strings.Cut(strings.TrimPrefix(r.URL.Path, cliCatalogPrefix), "/")
	value, exists := cliCatalogProbes.Load(id)
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	if !ok || !exists || !net.ParseIP(host).IsLoopback() {
		http.NotFound(w, r)
		return true
	}
	probe := value.(*cliCatalogProbe)
	if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Api-Key")), []byte(probe.key)) != 1 {
		http.Error(w, "Invalid catalog probe", http.StatusUnauthorized)
		return true
	}
	if r.Method == "GET" && tail == "ready" {
		w.WriteHeader(http.StatusNoContent)
		return true
	}
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return true
	}
	if tail == "v1/messages/count_tokens" {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"input_tokens":1}`)
		return true
	}
	if tail != "v1/messages" {
		http.NotFound(w, r)
		return true
	}
	probe.capture(w, r)
	return true
}

func (p *cliCatalogProbe) capture(w http.ResponseWriter, r *http.Request) {
	p.mu.Lock()
	defer p.mu.Unlock()
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 8<<20))
	var body Object
	if err == nil {
		body, err = decodeObject(raw)
	}
	if err != nil {
		p.err = fmt.Errorf("invalid catalog probe request")
		http.Error(w, p.err.Error(), http.StatusBadRequest)
		return
	}
	if p.verify != nil {
		err = verifyNativeWireTools(p.verify, body)
		if err == nil && p.whitelist {
			err = verifyToolWhitelist(p.verify, body)
		}
	} else {
		err = p.recordTools(body)
	}
	if err != nil {
		p.err = err
		http.Error(w, "CLI tool definition verification failed", http.StatusBadRequest)
		return
	}
	p.requests++
	w.Header().Set("Content-Type", "text/event-stream")
	events := []Object{
		{"type": "message_start", "message": Object{"id": "msg_ccg_catalog", "type": "message", "role": "assistant", "model": str(body, "model"), "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 1, "output_tokens": 0}}},
		{"type": "content_block_start", "index": 0, "content_block": Object{"type": "text", "text": ""}},
		{"type": "content_block_delta", "index": 0, "delta": Object{"type": "text_delta", "text": "CATALOG_CAPTURE_COMPLETE"}},
		{"type": "content_block_stop", "index": 0},
		{"type": "message_delta", "delta": Object{"stop_reason": "end_turn", "stop_sequence": nil}, "usage": Object{"output_tokens": 1}},
		{"type": "message_stop"},
	}
	if p.verify != nil && p.fixturePath != "" {
		input, _ := json.Marshal(Object{"file_path": p.fixturePath})
		events[1]["content_block"] = Object{"type": "tool_use", "id": "toolu_ccg_compat", "name": "Read", "input": Object{}}
		events[2]["delta"] = Object{"type": "input_json_delta", "partial_json": string(input)}
		events[4]["delta"] = Object{"stop_reason": "tool_use", "stop_sequence": nil}
	}
	for _, event := range events {
		data, _ := json.Marshal(event)
		_, _ = fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), data)
	}
}

func (p *cliCatalogProbe) recordTools(body Object) error {
	items, ok := body["tools"].([]any)
	if !ok || len(items) == 0 || len(items) > 256 {
		return fmt.Errorf("invalid catalog tool count")
	}
	seen := map[string]bool{}
	for _, item := range items {
		obj, _ := item.(map[string]any)
		name := str(obj, "name")
		schema, valid := obj["input_schema"].(map[string]any)
		_, descriptionValid := obj["description"].(string)
		if !toolName.MatchString(name) || seen[name] || strings.HasPrefix(name, "mcp__") || !valid || (obj["description"] != nil && !descriptionValid) || (schema["type"] != nil && schema["type"] != "object") {
			return fmt.Errorf("invalid native tool definition")
		}
		seen[name] = true
		key := name + ":" + digest([]any{str(obj, "description"), schema})
		old, exists := p.tools[key]
		if !exists {
			old = Tool{Name: name, Description: str(obj, "description"), Schema: schema, Metadata: Object{}}
		}
		profiles, _ := old.Metadata["catalog_profiles"].([]cliToolProfile)
		if p.profile.Name != "" {
			found := false
			for _, profile := range profiles {
				found = found || digest(profile) == digest(p.profile)
			}
			if !found {
				profiles = append(profiles, p.profile)
			}
		}
		old.Metadata["catalog_profiles"] = profiles
		p.tools[key] = old
	}
	if len(p.tools) > 1024 {
		return fmt.Errorf("catalog variant budget exceeded")
	}
	return nil
}

func (runner *Runner) captureToolCatalog(ctx context.Context, version string) (nativeCatalogue, error) {
	root, err := os.MkdirTemp(runner.Work, "tool-catalog-")
	if err != nil {
		return nil, fmt.Errorf("cannot create catalog workspace")
	}
	defer os.RemoveAll(root)
	id := uuid()
	probe := &cliCatalogProbe{key: uuid() + uuid(), tools: map[string]Tool{}}
	cliCatalogProbes.Store(id, probe)
	defer cliCatalogProbes.Delete(id)
	baseURL := runner.InternalBaseURL
	if baseURL == "" {
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			return nil, err
		}
		server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { serveCLICatalogProbe(w, r) }), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second}
		go server.Serve(listener)
		defer server.Close()
		baseURL = "http://" + listener.Addr().String()
	}
	ready, stopReady := context.WithTimeout(ctx, 10*time.Second)
	client := &http.Client{Timeout: time.Second, Transport: &http.Transport{}}
	defer client.CloseIdleConnections()
	defer stopReady()
	for {
		request, err := http.NewRequestWithContext(ready, "GET", strings.TrimRight(baseURL, "/")+cliCatalogPrefix+id+"/ready", nil)
		if err != nil {
			return nil, err
		}
		request.Header.Set("X-Api-Key", probe.key)
		response, err := client.Do(request)
		if err == nil {
			response.Body.Close()
			if response.StatusCode == http.StatusNoContent {
				break
			}
		}
		select {
		case <-ready.Done():
			return nil, fmt.Errorf("catalog loopback endpoint unavailable")
		case <-time.After(50 * time.Millisecond):
		}
	}
	base := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if value := os.Getenv(key); value != "" {
			base = append(base, key+"="+value)
		}
	}
	names := map[string]bool{}
	for _, catalogue := range verifiedNativeToolCatalogues {
		for name := range catalogue {
			names[name] = true
		}
	}
	for _, scenario := range []string{"sdk", "named", "teams", "powershell", "fixed-model", "plan"} {
		mode := "default"
		if scenario == "plan" {
			mode = "plan"
		}
		profile := newCLIToolProfile(scenario, mode)
		args := []string{"-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--permission-prompt-tool", "stdio", "--max-turns", "1", "--model", "claude-opus-5-5", "--permission-mode", mode, "--setting-sources", "", "--settings", `{"disableAllHooks":true}`, "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--no-session-persistence"}
		if scenario != "sdk" {
			ordered := make([]string, 0, len(names))
			for name := range names {
				ordered = append(ordered, name)
			}
			sort.Strings(ordered)
			profile.Whitelist = ordered
			args = append(args, "--tools", strings.Join(ordered, ","))
		}
		input := &bytes.Buffer{}
		encoder := json.NewEncoder(input)
		_ = encoder.Encode(Object{"type": "control_request", "request_id": id, "request": Object{"subtype": "initialize", "systemPrompt": []string{"Isolated tool catalog probe"}, "systemPromptSnapshot": false, "sdkMcpServers": []string{}, "hooks": Object{}, "supportedDialogKinds": []string{}, "promptSuggestions": false, "excludeDynamicSections": true}})
		_ = encoder.Encode(Object{"type": "user", "session_id": uuid(), "uuid": uuid(), "parent_tool_use_id": nil, "message": Object{"role": "user", "content": "Reply with a short sentence. Do not call tools."}})
		step, cancel := context.WithTimeout(ctx, 30*time.Second)
		cmd := exec.CommandContext(step, runner.CLI, args...)
		config := filepath.Join(root, scenario)
		cmd.Env = envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": config, "CLAUDE_SECURESTORAGE_CONFIG_DIR": config, "ANTHROPIC_API_KEY": probe.key, "ANTHROPIC_BASE_URL": strings.TrimRight(baseURL, "/") + cliCatalogPrefix + id, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1", "CLAUDE_CODE_MAX_RETRIES": "0", "NO_PROXY": "127.0.0.1,localhost"})
		if scenario == "teams" {
			profile.Env["CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"] = "1"
		}
		if scenario == "powershell" {
			profile.Env["CLAUDE_CODE_USE_POWERSHELL_TOOL"] = "1"
		}
		if scenario == "fixed-model" {
			profile.Env["CLAUDE_CODE_SUBAGENT_MODEL_FORCE"], profile.Env["CLAUDE_CODE_SUBAGENT_MODEL"] = "1", "claude-opus-5-5"
		}
		cmd.Env = envWith(cmd.Env, profile.environment())
		cmd.Stdin, cmd.Stdout, cmd.Stderr, cmd.Dir, cmd.WaitDelay = input, io.Discard, io.Discard, root, time.Second
		probe.mu.Lock()
		before := probe.requests
		probe.profile = profile
		probe.mu.Unlock()
		err := cmd.Run()
		cancel()
		probe.mu.Lock()
		valid := err == nil && probe.err == nil && probe.requests > before
		for _, tool := range probe.tools {
			names[tool.Name] = true
		}
		probe.mu.Unlock()
		if !valid {
			return nil, fmt.Errorf("Claude Code %s tool capture failed (%s)", version, scenario)
		}
	}
	probe.mu.Lock()
	defer probe.mu.Unlock()
	catalogue := nativeCatalogue{}
	for _, tool := range probe.tools {
		catalogue[tool.Name] = append(catalogue[tool.Name], tool)
	}
	return catalogue, nil
}
