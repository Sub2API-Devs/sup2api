package engine

import (
	"ccgateway/mod"
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

var modFiles = mod.Files

type Runner struct {
	InternalBaseURL            string
	CLI, Version, Plugin, Work string
	WorkingDirectory           string // trusted stable account context; never a request path
	ReportContainerResources   bool   // verified CLI reports allocation rather than host totals
	Env                        []string
	Proxy                      *ProxyConfigStore
	Overrides                  *EnvironmentOverrides // account locale/timezone for new CLI processes
	Stderr                     io.Writer             // diagnostics only; discarded when nil
}

func extractMod(root string) (string, error) {
	dir, e := os.MkdirTemp(root, "mod-")
	if e != nil {
		return "", e
	}
	e = fs.WalkDir(modFiles, ".", func(p string, d fs.DirEntry, e error) error {
		if e != nil {
			return e
		}
		rel := p
		if p == "." {
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
	return checkCLIVersion(context.Background(), cli)
}

func checkCLIVersion(parent context.Context, cli string) (string, error) {
	ctx, cancel := context.WithTimeout(parent, 10*time.Second)
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

// telemetryDefaults are the switches that stop Claude Code's telemetry without
// changing what it does: none of them removes a tool, a connector or a model
// capability, so every CLI process can carry them.
//
// Each value is a non-empty switch on purpose. DISABLE_TELEMETRY, DO_NOT_TRACK,
// DISABLE_ERROR_REPORTING and CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC treat an
// empty string as unset, so an inherited "" would silently re-enable a channel.
//
// Deliberately absent, because they remove features:
//   - CLAUDE_CODE_DISABLE_WEB_FETCH: disables the WebFetch tool itself.
//   - CLAUDE_CODE_DISABLE_ARTIFACT: disables the Artifact tool.
//   - ENABLE_CLAUDEAI_MCP_SERVERS: disables the claude.ai MCP connectors.
//   - CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL: skips marketplace
//     registration, which a plugin install may depend on.
//
// The WebFetch domain check has no environment switch at all; only the
// skipWebFetchPreflight settings key turns it off, so it keeps its normal
// behaviour.
func telemetryDefaults() map[string]string {
	return map[string]string{
		"DISABLE_AUTOUPDATER":                 "1",
		"DISABLE_TELEMETRY":                   "1",
		"DO_NOT_TRACK":                        "1",
		"DISABLE_ERROR_REPORTING":             "1",
		"DISABLE_GROWTHBOOK":                  "1",
		"CLAUDE_CODE_ENABLE_TELEMETRY":        "0",
		"DISABLE_FEEDBACK_COMMAND":            "1",
		"CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY": "1",
	}
}

// baseEnv applies account settings and the managed request privacy defaults.
// This is also the direct/build entrypoint; it does not use cliEnv.
func (r *Runner) baseEnv() []string {
	env := r.Env
	if env == nil {
		env = os.Environ()
	}
	values := telemetryDefaults()
	// Broader than the telemetry switches: this also drops auto-update,
	// release notes, PR badges and availability checks. Request processes have
	// carried it in production, so it stays here and is not applied to the
	// login processes.
	values["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"] = "1"
	if r.ReportContainerResources {
		values["CCG_REPORT_CONTAINER_RESOURCES"] = "1"
	}
	return envWith(r.Proxy.Environment(r.Overrides.Apply(env)), values, "CCG_HARDWARE_PROFILE_PATH", "CCG_REPORT_CONTAINER_RESOURCES", requestIdentityEnv, directPolicyEnv, requestAgentEnv)
}

// run owns one native request lifecycle. Usually it uses one CLI process;
// an expiring inline instruction permits one same-model native continuation.
func (r *Runner) run(ctx context.Context, req *Request, p *Prepared, dir string, emit func(Object) error) (result Object, err error) {
	if err := req.validateSingleTurn(); err != nil {
		return nil, &requestRefusal{err}
	}
	cfg := newRunConfig(req, p, r.Plugin, dir)
	if cfg.passthrough, err = req.passthroughBodies(); err != nil {
		return nil, err
	}
	names := map[string][]string{}
	for name := range cfg.passthrough.First {
		names["first"] = append(names["first"], name)
	}
	for name := range cfg.passthrough.Rest {
		names["rest"] = append(names["rest"], name)
	}
	req.diagnostic.artifact("passthrough.json", Object{"fields": names, "fallbacks": len(cfg.passthrough.Fallbacks), "session": p.runSession(), "agent": req.upstreamAgent != ""})
	if !req.persistsSession() {
		cfg.args = append(cfg.args, "--no-session-persistence")
	}
	if req.Plan != nil && req.Plan.thinkingCompat != "" && req.diagnostic != nil {
		req.diagnostic.setField("thinking_compat", "omit_disabled")
		req.diagnostic.trace("thinking_disabled_omitted", Object{"model": req.Plan.thinkingCompat})
	}
	decisions := req.Plan.FeatureDecisions()
	req.diagnostic.setField("execution_mode", "native")
	req.diagnostic.artifact("feature-decisions.json", decisions)
	req.diagnostic.artifact("client-attachment-decisions.json", req.AttachmentDecisions)
	// Only gateway-generated options: never dump inherited credentials or the
	// private Mod URL and token added later.
	req.diagnostic.artifact("effective-config.json", Object{"cli_version": r.Version, "args": cfg.args, "env": cfg.env, "attachment_policy": req.attachmentConfig(), "attachment_source": req.AttachmentSource, "systems": cfg.systems, "groups": cfg.groups})
	req.diagnostic.trace("cli_starting", nil)
	runctx, cancel := context.WithCancel(ctx)
	defer cancel()
	base := r.baseEnv()
	if err := req.validateRoutingProvider(base); err != nil {
		return nil, err
	}
	if raw := environmentValue(base, "ANTHROPIC_BASE_URL"); raw != "" {
		target, err := url.Parse(raw)
		if err != nil || (target.Scheme != "http" && target.Scheme != "https") || target.Host == "" || target.User != nil || target.RawQuery != "" || target.Fragment != "" {
			return nil, fmt.Errorf("invalid Anthropic base URL")
		}
	}
	cfg.native = &nativeRunState{}
	cfg.passthrough.Fallbacks = nil
	defer func() {
		if ctx.Err() == nil {
			failure := cfg.native.externalFailure()
			var refusal *requestRefusal
			if failure == nil && err != nil && !errors.As(err, &refusal) {
				failure = cfg.native.failure()
			}
			if failure != nil {
				result, err = nil, failure
			}
		}
	}()
	control, err := startModControl(cfg, r.InternalBaseURL)
	if err != nil {
		return nil, err
	}
	defer func() {
		if control != nil {
			control.Close()
		}
	}()
	cfg.control = control
	if req.webSearch != nil {
		control.webSearch = func(id string, input Object) Object {
			return req.webSearch.search(runctx, func(ctx context.Context, input Object) (*webSearchRecord, error) {
				record, err := r.runWebSearch(ctx, req, dir, input)
				if err != nil && cfg.native != nil {
					cfg.native.fail(&requestRefusal{err})
					cancel()
				}
				return record, err
			}, id, input)
		}
	}
	cfg.env["CCGATEWAY_MOD_URL"] = control.URL
	cfg.env["CCGATEWAY_MOD_TOKEN"] = control.token
	proc, err := startCLI(runctx, r.CLI, cfg.args, p.Work, cfg.processEnv(base), r.Stderr)
	if err != nil {
		return nil, err
	}
	proc.diagnostic = req.diagnostic
	if req.diagnostic.enabled() {
		proc.stdout = &traceReader{ReadCloser: proc.stdout, diagnostic: req.diagnostic, name: "cli-stdout.jsonl"}
	}
	req.diagnostic.trace("cli_started", nil)
	defer func() {
		req.diagnostic.snapshot("history-native.jsonl", p.NativePath)
		req.diagnostic.trace("cli_finished", Object{"failed": err != nil})
	}()
	defer func() {
		cancel()
		proc.stdin.Close()
		_ = proc.cmd.Wait()
		if err == nil && p.APIResponseComplete {
			captureErr := p.captureNative(proc.cmd.Env, str(result, "id"))
			if req.InlineTools != nil || req.continuation != "" || req.hasContextControls() || req.hasCompactionHistory() {
				captureErr = fmt.Errorf("assistant continuation uses response-only checkpoint")
			}
			blocks, _ := result["content"].([]Object)
			if captureErr == nil && (!nativeResponseContentMatches(p.NativeRows, str(result, "id"), req, blocks) || len(cfg.systems) > 0 && !nativeSystemRecorded(p.Rows, p.NativeRows, cfg.systems)) {
				captureErr = fmt.Errorf("native response content differs from the completed API response")
			}
			if captureErr != nil {
				p.NativeRows = nil
				p.NativeAnchor = ""
				req.diagnostic.trace("native_checkpoint_unavailable", Object{"reason": "api_terminal_response", "error": captureErr.Error()})
			}
		}
	}()
	// A descendant may inherit stdout and outlive the CLI. Cancellation must
	// also unblock reads, including the final drain, rather than waiting for
	// every descendant to close its copy of the pipe.
	initialOutput := proc.stdout
	stopReadOnCancel := context.AfterFunc(runctx, func() { _ = initialOutput.Close() })
	defer stopReadOnCancel()
	session := newCLISession(ctx, req, p, cfg, proc, emit)
	result, err = session.run()
	if !errors.Is(err, errScopeContinuation) {
		if err != nil && control.scopeEnabled && session.scopeMessage != nil {
			return nil, &requestRefusal{err}
		}
		return result, err
	}
	// A single same-model continuation, not a retry or fallback. The Mod has
	// withheld the next model request; close stdin so native persistence flushes.
	_ = proc.stdin.Close()
	_, _ = io.Copy(io.Discard, proc.stdout)
	_ = proc.cmd.Wait()
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if err := control.verify(); err != nil {
		return nil, &requestRefusal{err}
	}
	retained, _ := req.pendingPersistentSystems()
	control.mu.Lock()
	attachment, searchCalls := control.scopeAttachment, control.scopeSearches
	control.mu.Unlock()
	input, inputID, err := p.resumeScopedTurn(proc.cmd.Env, attachment, cfg.systems, retained, session.scopeMessage, session.responseReq)
	if err != nil {
		return nil, &requestRefusal{err}
	}
	stopReadOnCancel()
	webSearch := control.webSearch
	control.Close()
	cfg.scopeResumed, cfg.searchCalls = true, searchCalls
	cfg.systems = retained
	cfg.args = cliArgs(req, p, r.Plugin)
	control, err = startModControl(cfg, r.InternalBaseURL)
	if err != nil {
		return nil, &requestRefusal{err}
	}
	control.webSearch = webSearch
	cfg.control = control
	cfg.env["CCGATEWAY_MOD_URL"], cfg.env["CCGATEWAY_MOD_TOKEN"] = control.URL, control.token
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	next, err := startCLI(runctx, r.CLI, cfg.args, p.Work, cfg.processEnv(base), r.Stderr)
	if err != nil {
		return nil, &requestRefusal{err}
	}
	proc = next
	proc.diagnostic = req.diagnostic
	if req.diagnostic.enabled() {
		proc.stdout = &traceReader{ReadCloser: proc.stdout, diagnostic: req.diagnostic, name: "cli-stdout.jsonl"}
	}
	stopResumeRead := context.AfterFunc(runctx, func() { _ = proc.stdout.Close() })
	defer stopResumeRead()
	session.proc, session.initID, session.initialized = proc, uuid(), false
	session.resumeInput, session.resumeUUID = &input, inputID
	req.diagnostic.trace("cli_scope_resumed", nil)
	result, err = session.run()
	if err != nil {
		// Completed work must not be replayed by an outer model/account retry.
		return nil, &requestRefusal{err}
	}
	return result, nil
}

// persistsSession reports whether the CLI keeps a transcript of the run. A
// credit-tracked run (its response can carry a credit token) does not.
func (r *Request) persistsSession() bool {
	return r.credit == nil
}
