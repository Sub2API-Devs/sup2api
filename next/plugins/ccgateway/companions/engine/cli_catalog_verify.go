package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func (r *Runner) verifyCLICatalog(ctx context.Context, version string, catalogue nativeCatalogue) error {
	if len(catalogue["Read"]) == 0 {
		return fmt.Errorf("CLI compatibility probe requires Read")
	}
	root, err := os.MkdirTemp(r.Work, "cli-compat-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(root)
	tool := catalogue["Read"][0]
	raw, _ := json.Marshal(Object{"model": "claude-opus-5-5", "max_tokens": 32, "tools": []Tool{tool}, "messages": []Object{{"role": "user", "content": "Read the isolated fixture"}}})
	req, err := parsePolicyRequest(raw, nil)
	if err != nil {
		return err
	}
	req.diagnostic = &requestDiagnostic{fields: Object{}}
	req.cliSnapshot = &cliSnapshot{version: version, tools: catalogue}
	matchNativeTools(req, version)
	id := uuid()
	probe := &cliCatalogProbe{key: uuid() + uuid(), tools: map[string]Tool{}, verify: req, fixturePath: filepath.Join(root, "never-execute")}
	cliCatalogProbes.Store(id, probe)
	defer cliCatalogProbes.Delete(id)
	base := r.InternalBaseURL
	if base == "" {
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			return err
		}
		server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !serveCLICatalogProbe(w, r) {
				serveModControl(w, r)
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
	candidate := &Runner{CLI: r.CLI, Plugin: r.Plugin, Version: version, Work: root, InternalBaseURL: base, Env: env}
	prepared := &Prepared{Work: root, SessionID: uuid(), InputUUID: uuid()}
	bounded, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	answer, err := candidate.run(bounded, req, prepared, root, func(Object) error { return nil })
	probe.mu.Lock()
	valid := err == nil && probe.err == nil && probe.requests == 1 && str(answer, "stop_reason") == "tool_use"
	probe.mu.Unlock()
	if !valid {
		return fmt.Errorf("Claude Code %s failed Mod and tool handoff compatibility verification", version)
	}
	return nil
}
