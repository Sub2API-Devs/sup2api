package engine

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"time"
)

type Runner struct {
	CLI, Version, Work       string
	WorkingDirectory         string // trusted stable account context; never a request path
	ReportContainerResources bool   // verified CLI reports allocation rather than host totals
	Env                      []string
	Proxy                    *ProxyConfigStore
	Overrides                *EnvironmentOverrides // account locale/timezone for new CLI processes
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
	cmd := exec.CommandContext(ctx, cli, "--version")
	cmd.Env = withoutWorkerSecrets(os.Environ())
	b, e := cmd.Output()
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

// workerSecrets are the Worker's own keys: the gateway key callers present
// and the management key. No CLI process gets them, whoever runs the Worker
// (audit C16); everything else the CLI may read is inherited, as Claude Code
// reads far more variables than a list here could keep up with.
var workerSecrets = []string{"CCG_API_KEY", "CCG_ADMIN_KEY"}

// withoutWorkerSecrets is env without the Worker's keys, in any spelling.
func withoutWorkerSecrets(env []string) []string {
	out := make([]string, 0, len(env))
	for _, item := range env {
		key, _, _ := strings.Cut(item, "=")
		if !slices.ContainsFunc(workerSecrets, func(secret string) bool { return strings.EqualFold(key, secret) }) {
			out = append(out, item)
		}
	}
	return out
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

// baseEnv applies account settings and the managed request privacy defaults:
// the environment every CLI process of the account starts from.
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
