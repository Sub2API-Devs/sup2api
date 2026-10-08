package engine

import (
	"ccgateway/mod"
	"context"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

var modFiles = mod.Files

type Runner struct {
	bootstrap                  *continuationBootstrap
	InternalBaseURL            string
	CLI, Version, Plugin, Work string
	Env                        []string
	Proxy                      *ProxyConfigStore
	Stderr                     io.Writer // diagnostics only; discarded when nil
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

// baseEnv is the inherited environment with the configured egress applied.
func (r *Runner) baseEnv() []string {
	env := r.Env
	if env == nil {
		env = os.Environ()
	}
	return r.Proxy.Environment(env)
}

// run answers one request with one CLI process: configuration from the
// request, the outbound relay, the process, then the stream-json session.
func (r *Runner) run(ctx context.Context, req *Request, p *Prepared, dir string, emit func(Object) error) (result Object, err error) {
	if r.bootstrap == nil && req.needsContinuationBootstrap(p) {
		if err := r.bootstrapContinuation(ctx, req, p); err != nil {
			return nil, fmt.Errorf("cannot initialize continuation transcript: %w", err)
		}
	}
	cfg := newRunConfig(req, p, r.Plugin, dir)
	if req.resource != nil || req.credit != nil {
		cfg.args = append(cfg.args, "--no-session-persistence")
	}
	req.diagnostic.artifact("feature-decisions.json", req.Plan.FeatureDecisions())
	req.diagnostic.artifact("client-attachment-decisions.json", req.AttachmentDecisions)
	// Only gateway-generated options: never dump inherited credentials or the
	// private relay/Mod URL and token added later.
	req.diagnostic.artifact("effective-config.json", Object{"cli_version": r.Version, "args": cfg.args, "env": cfg.env, "attachment_policy": req.attachmentConfig(), "attachment_source": req.AttachmentSource, "pass_upstream_errors": req.PassUpstreamErrors, "systems": cfg.systems, "groups": cfg.groups})
	req.diagnostic.trace("cli_starting", nil)
	runctx, cancel := context.WithCancel(ctx)
	defer cancel()
	base := r.baseEnv()
	// Every model request passes the outbound relay: it restores client system
	// messages, adds thinking.display, and with pass_upstream_errors ends the
	// run on any upstream error, which the gateway returns as the API sent it.
	relay, err := startOutboundRelay(req, base, r.InternalBaseURL)
	if err != nil {
		return nil, err
	}
	// A refusal, or an upstream error passed to the client, ends the run before
	// the CLI can back off, refresh, or reshape the request and retry.
	relay.setAbort(cancel)
	relay.scope = cfg.scope
	relay.bootstrap = r.bootstrap
	defer relay.Close()
	// Assign the named results: runs after the process has been waited for.
	defer func() {
		result, err = relayOutcome(ctx, relay, result, err)
		if req.resource != nil && ctx.Err() == nil && relay.Failure() == nil && req.resource.completed() {
			result, err = Object{}, nil
		}
		if (req.CountTokens || req.resource != nil) && err == nil {
			err = (&cliSession{cfg: cfg, relay: relay}).checkMod()
		}
	}()
	control, err := startModControl(cfg, r.InternalBaseURL)
	if err != nil {
		return nil, err
	}
	defer control.Close()
	cfg.control = control
	relay.control = control
	cfg.env["CCGATEWAY_MOD_URL"] = control.URL
	cfg.env["CCGATEWAY_MOD_TOKEN"] = control.token
	proc, err := startCLI(runctx, r.CLI, cfg.args, p.Work, cfg.processEnv(base, relay), r.Stderr)
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
	stopReadOnCancel := context.AfterFunc(runctx, func() { _ = proc.stdout.Close() })
	defer stopReadOnCancel()
	return newCLISession(ctx, req, p, cfg, proc, relay, emit).run()
}

// relayOutcome lets the relay's verdict replace the run's: a refused request,
// or an upstream error the client receives as the API sent it.
func relayOutcome(ctx context.Context, relay *outboundRelay, result Object, err error) (Object, error) {
	if failure := relay.Failure(); failure != nil {
		return nil, failure
	}
	if upstream := relay.UpstreamError(); upstream != nil && ctx.Err() == nil {
		return nil, upstream
	}
	if result, ok := relay.completedTokenCount(); ok && ctx.Err() == nil {
		return result, nil
	}
	return result, err
}
