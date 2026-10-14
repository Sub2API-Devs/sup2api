package engine

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type cliValidationCache struct {
	once    sync.Once
	lock    chan struct{}
	results map[string]error
}

func (c *cliValidationCache) verify(ctx context.Context, key string, run func() error) error {
	c.once.Do(func() { c.lock = make(chan struct{}, 1); c.results = map[string]error{} })
	select {
	case c.lock <- struct{}{}:
		defer func() { <-c.lock }()
	case <-ctx.Done():
		return ctx.Err()
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	if result, exists := c.results[key]; exists {
		return result
	}
	err := run()
	var mismatch *nativeToolAvailabilityError
	if err == nil || errors.As(err, &mismatch) {
		if len(c.results) >= 128 {
			c.results = map[string]error{}
		}
		c.results[key] = err
	}
	return err
}

func verifyToolWhitelist(req *Request, body Object) error {
	allowed := map[string]bool{}
	for _, name := range req.enabledTools() {
		allowed[name] = true
	}
	if req.structuredOutput() {
		allowed["StructuredOutput"] = true
	}
	if allowed["ToolSearch"] {
		// With deferred tools the CLI sends its own placeholder next to
		// ToolSearch to keep deferred loading on (searchHelper).
		allowed["DeferredToolPlaceholder"] = true
	}
	tools, err := historyContent(body["tools"])
	if err != nil {
		return fmt.Errorf("CLI did not return a tool list")
	}
	declared := map[string]Tool{}
	for _, tool := range req.Tools {
		declared[req.wireName(tool.Name)] = tool
	}
	seen := map[string]bool{}
	for _, tool := range tools {
		name := str(tool, "name")
		if !allowed[name] || seen[name] {
			return fmt.Errorf("CLI tool whitelist mismatch: %s", name)
		}
		seen[name] = true
		want, client := declared[name]
		if !client {
			continue
		}
		schema, _ := tool["input_schema"].(map[string]any)
		if want.Description != str(tool, "description") || digest(want.Schema) != digest(schema) {
			return fmt.Errorf("CLI client tool definition changed: %s", name)
		}
	}
	forced := req.forcedLoadedClientCatalog()
	for _, tool := range req.Tools {
		if req.NoTools || !req.runtimeToolSearchable(tool.Name) {
			continue
		}
		eager := !req.toolSearchEnabled() || forced || tool.DeferLoading != nil && !*tool.DeferLoading
		if eager && !seen[req.wireName(tool.Name)] {
			return fmt.Errorf("CLI omitted client tool: %s", tool.Name)
		}
	}
	return nil
}

func (r *Runner) prepareNativeTools(ctx context.Context, req *Request) error {
	if req.cliSnapshot == nil || req.NoTools || len(req.Native) == 0 {
		return nil
	}
	for attempt := 0; attempt < 2; attempt++ {
		key := digest([]any{req.nativeProfile, req.Tools, req.Native, req.Model, req.MaxTokens, req.enabledTools(), req.ToolSearch, req.Fast, req.passthroughEffort(), req.passthroughThinkingArgs(), req.Betas, req.JSONSchema, req.APIOutputFormat, req.offersSkill(), req.webSearch != nil, req.AdditionalDirectories})
		err := req.cliSnapshot.validation.verify(ctx, key, func() error { return r.probeNativeConfiguration(ctx, req, false) })
		if err == nil {
			return nil
		}
		var mismatch *nativeToolAvailabilityError
		if attempt != 0 || !errors.As(err, &mismatch) {
			return err
		}
		for _, name := range mismatch.Names {
			delete(req.Native, name)
		}
		if err := validateToolNames(req); err != nil {
			return err
		}
		if err := req.validateInlineNativeMapping(r.Version); err != nil {
			return err
		}
		if req.diagnostic != nil {
			req.diagnostic.trace("native_tools_mcp_fallback", Object{"tools": mismatch.Names, "reason": "isolated configuration verification"})
		}
	}
	return fmt.Errorf("CLI configuration verification failed")
}

func (r *Runner) verifyCLICatalog(ctx context.Context, version string, catalogue nativeCatalogue) error {
	if len(catalogue["Read"]) == 0 {
		return fmt.Errorf("CLI compatibility probe requires Read")
	}
	tool := catalogue["Read"][0]
	tool.Description = " Client Read description\n保留空格 "
	raw, _ := json.Marshal(Object{"model": "claude-opus-5-5", "max_tokens": 32, "tools": []Tool{tool}, "messages": []Object{{"role": "user", "content": "Read the isolated fixture"}}})
	req, err := parsePolicyRequest(raw, nil)
	if err != nil {
		return err
	}
	req.cliSnapshot = &cliSnapshot{version: version, tools: catalogue}
	matchNativeTools(req, version)
	if !req.Native["Read"] {
		return fmt.Errorf("CLI compatibility probe requires a bound Read profile")
	}
	if err := r.probeNativeConfiguration(ctx, req, true); err != nil {
		return fmt.Errorf("Claude Code %s failed Mod and tool handoff compatibility verification: %w", version, err)
	}
	return nil
}

func (r *Runner) probeNativeConfiguration(ctx context.Context, source *Request, handoff bool) error {
	root, err := os.MkdirTemp(r.Work, "cli-compat-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(root)
	prompt := "Reply with text. Do not call any tool."
	if source.Native["Skill"] && !source.offersSkill() {
		prompt = "/"
	}
	raw, _ := json.Marshal(Object{"model": source.Model, "max_tokens": source.MaxTokens, "tools": source.Tools, "messages": []Object{{"role": "user", "content": prompt}}})
	req, err := parsePolicyRequest(raw, nil)
	if err != nil {
		return err
	}
	req.diagnostic = &requestDiagnostic{fields: Object{}}
	req.cliSnapshot, req.nativeProfile, req.catalogueEnv = source.cliSnapshot, source.nativeProfile, source.catalogueEnv
	req.Native = source.Native
	req.CustomToolPrefix, req.AdditionalDirectories = source.CustomToolPrefix, source.AdditionalDirectories
	if source.Plan != nil {
		for _, key := range []string{"tool_choice", "thinking", "output_config", "fast"} {
			if value := source.Plan.fields[key]; len(value) > 0 {
				req.Plan.fields[key] = value
			}
		}
		req.Plan.thinkingCompat = source.Plan.thinkingCompat
	}
	req.Thinking = source.Thinking
	req.ToolSearch, req.Fast, req.Effort, req.Betas = source.ToolSearch, source.Fast, source.Effort, source.Betas
	req.JSONSchema, req.APIOutputFormat, req.webSearch = source.JSONSchema, source.APIOutputFormat, source.webSearch
	id := uuid()
	probe := &cliCatalogProbe{key: uuid() + uuid(), tools: map[string]Tool{}, verify: req, whitelist: true}
	if handoff {
		probe.fixturePath = filepath.Join(root, "never-execute")
	}
	cliCatalogProbes.Store(id, probe)
	defer cliCatalogProbes.Delete(id)
	base := r.InternalBaseURL
	if base == "" {
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			return err
		}
		server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
			if !serveCLICatalogProbe(w, request) {
				serveModControl(w, request)
			}
		}), ReadHeaderTimeout: 5 * time.Second}
		go server.Serve(listener)
		defer server.Close()
		base = "http://" + listener.Addr().String()
	}
	env := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if value := os.Getenv(key); value != "" {
			env = append(env, key+"="+value)
		}
	}
	env = envWith(env, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "CLAUDE_SECURESTORAGE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": probe.key, "ANTHROPIC_BASE_URL": strings.TrimRight(base, "/") + cliCatalogPrefix + id, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1"})
	candidate := &Runner{CLI: r.CLI, Plugin: r.Plugin, Version: r.Version, Work: root, InternalBaseURL: base, Env: env}
	if source.cliSnapshot != nil {
		candidate.Version = source.cliSnapshot.version
	}
	prepared := &Prepared{Work: root, SessionID: uuid(), InputUUID: uuid()}
	bounded, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	answer, runErr := candidate.run(bounded, req, prepared, root, func(Object) error { return nil })
	probe.mu.Lock()
	defer probe.mu.Unlock()
	if probe.err != nil {
		return probe.err
	}
	stop := "end_turn"
	if handoff {
		stop = "tool_use"
	}
	if runErr != nil || probe.requests != 1 || str(answer, "stop_reason") != stop {
		return fmt.Errorf("CLI configuration probe failed")
	}
	return nil
}
