package main

import (
	"context"
	"embed"
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

//go:embed all:mod
var modFiles embed.FS

type Runner struct {
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
	cfg := newRunConfig(req, p, r.Plugin, dir)
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
	defer relay.Close()
	// Assign the named results: runs after the process has been waited for.
	defer func() { result, err = relayOutcome(ctx, relay, result, err) }()
	for _, f := range cfg.files {
		if err := os.WriteFile(f.path, f.data, 0600); err != nil {
			return nil, err
		}
	}
	proc, err := startCLI(runctx, r.CLI, cfg.args, p.Work, cfg.processEnv(base, relay), r.Stderr)
	if err != nil {
		return nil, err
	}
	defer func() { cancel(); proc.stdin.Close(); _ = proc.cmd.Wait() }()
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
	return result, err
}
