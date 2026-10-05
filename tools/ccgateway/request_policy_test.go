package main

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func policyHeaders(p RequestPolicy) http.Header {
	b, _ := json.Marshal(p)
	h := http.Header{}
	h.Set(policyHeader, string(b))
	return h
}
func TestRequestPolicyAdmission(t *testing.T) {
	body, _ := json.Marshal(basic())
	policy := defaultRequestPolicy()
	policy.UnknownBeta = "reject"
	h := policyHeaders(policy)
	h.Add("anthropic-beta", "claude-code-20250219, fine-grained-tool-streaming-2025-05-14")
	h.Add("anthropic-beta", "interleaved-thinking-2025-05-14,interleaved-thinking-2025-05-14")
	r, e := parsePolicyRequest(body, h)
	if e != nil || !r.FineGrainedTools || len(r.Betas) != 2 {
		t.Fatalf("mapping failed: %+v %v", r, e)
	}
	h.Add("anthropic-beta", "unknown-feature-2026-01-01")
	if _, e = parsePolicyRequest(body, h); e == nil || !strings.Contains(e.Error(), "unknown-feature") {
		t.Fatal("unknown beta not rejected", e)
	}
	p := defaultRequestPolicy()
	p.UnknownBeta = "ignore"
	raw, _ := json.Marshal(p)
	h.Set(policyHeader, string(raw))
	if r, e = parsePolicyRequest(body, h); e != nil || len(r.Betas) != 2 {
		t.Fatal("ignore discarded supported beta", e)
	}
	p.Betas = []BetaRule{}
	h = policyHeaders(p)
	h.Set("anthropic-beta", "interleaved-thinking-2025-05-14")
	if r, e = parsePolicyRequest(body, h); e != nil || len(r.Betas) != 0 {
		t.Fatal("empty allowlist not honored", e)
	}
}
func TestRunnerRequestPolicyMapping(t *testing.T) {
	cli, err := lifecycleTestExecutable()
	if err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	capture := filepath.Join(dir, "capture.json")
	runner := &Runner{CLI: cli, Env: envWith(os.Environ(), map[string]string{
		"CCG_TEST_CLI_TAIL": "1", "CLAUDE_CONFIG_DIR": filepath.Join(dir, "config"), "CCG_TEST_POLICY_CAPTURE": capture,
		"ANTHROPIC_BETAS": "inherited-unsupported-beta", "CLAUDE_CODE_EXTRA_BODY": `{"temperature":0.1}`, "CLAUDE_CODE_EFFORT_LEVEL": "max",
	})}
	p := defaultRequestPolicy()
	p.AllowFast = true
	h := policyHeaders(p)
	h.Set("anthropic-beta", "fine-grained-tool-streaming-2025-05-14")
	v := basic()
	v["speed"] = "fast"
	v["output_config"] = Object{"effort": "low"}
	body, _ := json.Marshal(v)
	req, err := parsePolicyRequest(body, h)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = runner.run(ctx, req, &Prepared{Work: dir, SessionID: uuid(), InputUUID: uuid()}, dir, func(Object) error { return nil })
	if err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(capture)
	if err != nil {
		t.Fatal(err)
	}
	o, err := decodeObject(raw)
	if err != nil {
		t.Fatal(err)
	}
	if str(o, "extra") != "" || str(o, "effort_env") != "" || str(o, "streaming") != "1" || str(o, "betas") != "fine-grained-tool-streaming-2025-05-14" {
		t.Fatal("request environment leaked or ignored policy", o)
	}
	args := o["args"].([]any)
	settingsFound, effortFound := false, false
	for i, a := range args {
		if a == "--effort" && args[i+1] == "low" {
			effortFound = true
		}
		if a == "--settings" {
			cfg, _ := decodeObject([]byte(args[i+1].(string)))
			settingsFound = cfg["fastMode"] == true && cfg["disableAllHooks"] == false
		}
	}
	if !effortFound || !settingsFound {
		t.Fatal("CLI did not receive capability settings")
	}
}
func TestRequestPolicyFields(t *testing.T) {
	p := defaultRequestPolicy()
	p.AllowFast = true
	h := policyHeaders(p)
	v := basic()
	v["speed"] = "fast"
	v["output_config"] = Object{"effort": "xhigh"}
	body, _ := json.Marshal(v)
	r, e := parsePolicyRequest(body, h)
	if e != nil || r.Fast == nil || !*r.Fast || r.Effort != "xhigh" {
		t.Fatal("supported fields not mapped", e)
	}
	v["output_config"] = Object{"effort": "low", "format": Object{"type": "json_schema"}}
	v["temperature"] = 0.7
	body, _ = json.Marshal(v)
	if _, e = parsePolicyRequest(body, h); e == nil {
		t.Fatal("extra body accepted")
	}
	p.UnknownField = "ignore"
	h = policyHeaders(p)
	if r, e = parsePolicyRequest(body, h); e != nil || r.Effort != "low" || !*r.Fast {
		t.Fatal("ignore changed supported fields", e)
	}
	p.AllowFast = false
	p.AllowEffort = false
	h = policyHeaders(p)
	if r, e = parsePolicyRequest(body, h); e != nil || *r.Fast || r.Effort != "" {
		t.Fatal("disabled capability applied", e)
	}
	p.UnknownField = "reject"
	h = policyHeaders(p)
	if _, e = parsePolicyRequest(body, h); e == nil {
		t.Fatal("disabled capability accepted")
	}
	v = basic()
	v["speed"] = "turbo"
	body, _ = json.Marshal(v)
	p = defaultRequestPolicy()
	p.AllowFast = true
	h = policyHeaders(p)
	if _, e = parsePolicyRequest(body, h); e == nil {
		t.Fatal("invalid speed accepted")
	}
	v = basic()
	v["output_config"] = Object{"effort": "adaptive"}
	body, _ = json.Marshal(v)
	if _, e = parsePolicyRequest(body, h); e == nil {
		t.Fatal("invalid effort accepted")
	}
}
func TestRequestPolicyHistoryIsolation(t *testing.T) {
	r := parsed(t, basic())
	before := r.configKey()
	fast := true
	r.Fast = &fast
	if before == r.configKey() {
		t.Fatal("fast mode shares policy history key")
	}
	before = r.configKey()
	r.Betas = []string{"interleaved-thinking-2025-05-14"}
	if before == r.configKey() {
		t.Fatal("beta change shares policy history key")
	}
	// Header only is permission, not a request to enable fast mode.
	body, _ := json.Marshal(basic())
	h := http.Header{}
	h.Set("anthropic-beta", "fast-mode-2026-02-01")
	req, e := parsePolicyRequest(body, h)
	if e != nil || *req.Fast {
		t.Fatal("beta implicitly enabled fast mode", e)
	}
}
func TestRequestPolicyInvalidConfiguration(t *testing.T) {
	for _, p := range []RequestPolicy{
		{UnknownBeta: "forward", UnknownField: "reject"},
		{UnknownBeta: "reject", UnknownField: "reject", Betas: []BetaRule{{"x", "fast"}}},
		{UnknownBeta: "reject", UnknownField: "reject", Betas: []BetaRule{{"x", "forward"}, {"x", "native"}}},
	} {
		if _, e := parsePolicyRequest([]byte(`{}`), policyHeaders(p)); e == nil {
			t.Fatal("bad policy accepted")
		}
	}
}
