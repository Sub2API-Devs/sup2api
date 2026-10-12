package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func policyHeaders(p RequestPolicy) http.Header {
	b, _ := json.Marshal(p)
	h := http.Header{}
	h.Set(policyHeader, string(b))
	return h
}
func TestRequestPolicyAdmission(t *testing.T) {
	body, err := json.Marshal(basic())
	require.NoError(t, err)
	for _, unknown := range []string{"reject", "ignore"} {
		t.Run(unknown, func(t *testing.T) {
			policy := defaultRequestPolicy()
			policy.UnknownBeta = unknown
			policy.Betas = []BetaRule{}
			h := policyHeaders(policy)
			h.Add("anthropic-beta", "fine-grained-tool-streaming-2025-05-14")
			h.Add("anthropic-beta", "interleaved-thinking-2025-05-14,interleaved-thinking-2025-05-14")
			h.Add("anthropic-beta", "unknown-feature-2026-01-01")
			r, err := parsePolicyRequest(body, h)
			require.NoError(t, err)
			assert.True(t, r.FineGrainedTools)
			assert.Equal(t, []string{"fine-grained-tool-streaming-2025-05-14", "interleaved-thinking-2025-05-14", "unknown-feature-2026-01-01"}, r.Betas)
			assert.Equal(t, strings.Join(r.Betas, ","), cliEnv(r, false)["ANTHROPIC_BETAS"])
		})
	}
}
func TestRunnerRequestPolicyMapping(t *testing.T) {
	cli, err := lifecycleTestExecutable()
	require.NoError(t, err)
	dir := t.TempDir()
	capture := filepath.Join(dir, "capture.json")
	runner := &Runner{CLI: cli, Env: envWith(os.Environ(), map[string]string{
		"CCG_TEST_CLI_TAIL": "1", "CLAUDE_CONFIG_DIR": filepath.Join(dir, "config"), "CCG_TEST_POLICY_CAPTURE": capture,
		"ANTHROPIC_BETAS": "inherited-unsupported-beta", "CLAUDE_CODE_EXTRA_BODY": `{"temperature":0.1}`, "CLAUDE_CODE_EFFORT_LEVEL": "max", "CLAUDE_CODE_PROMPT_CACHE_TTL": "1h", "MAX_THINKING_TOKENS": "9999", "CCGATEWAY_TOOL_DEFERRAL_FILE": "inherited-path",
	})}
	p := defaultRequestPolicy()
	p.AllowFast = true
	h := policyHeaders(p)
	h.Set("anthropic-beta", "fine-grained-tool-streaming-2025-05-14,fast-mode-2026-02-01,client-beta")
	v := basic()
	v["speed"] = "fast"
	v["output_config"] = Object{"effort": "low"}
	v["cache_control"] = Object{"type": "ephemeral", "ttl": "1h"}
	v["thinking"] = Object{"type": "enabled", "budget_tokens": 1024}
	v["max_tokens"] = 2048
	body, err := json.Marshal(v)
	require.NoError(t, err)
	req, err := parsePolicyRequest(body, h)
	require.NoError(t, err)
	req.diagnostic = newRequestDiagnostic(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(body)))
	// The lifecycle executable only captures argv/environment; EXTRA_BODY is
	// installed by the Mod for each round, not inherited at process startup.
	bodies, err := req.passthroughBodies()
	require.NoError(t, err)
	for _, round := range []map[string]json.RawMessage{bodies.First, bodies.Rest} {
		assert.Equal(t, `2048`, string(round["max_tokens"]))
		assert.Equal(t, `{"budget_tokens":1024,"type":"enabled"}`, string(round["thinking"]))
		assert.Equal(t, `{"effort":"low"}`, string(round["output_config"]))
		assert.Equal(t, `"fast"`, string(round["speed"]))
		assert.NotContains(t, round, "temperature", "inherited EXTRA_BODY must not leak")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = runner.run(ctx, req, &Prepared{Work: dir, SessionID: uuid(), InputUUID: uuid()}, dir, func(Object) error { return nil })
	require.NoError(t, err)
	raw, err := os.ReadFile(capture)
	require.NoError(t, err)
	o, err := decodeObject(raw)
	require.NoError(t, err)
	assert.Empty(t, str(o, "extra"))
	assert.Empty(t, str(o, "effort_env"))
	assert.Equal(t, "1", str(o, "streaming"))
	assert.Equal(t, strings.Join(req.Betas, ","), str(o, "betas"))
	assert.Equal(t, "1h", str(o, "cache_ttl"))
	assert.Empty(t, str(o, "thinking_budget"), "native uses CLI options plus per-round EXTRA_BODY")
	assert.Equal(t, "1", str(o, "structured_retries"))
	assert.Empty(t, str(o, "deferral"))
	args, ok := o["args"].([]any)
	require.True(t, ok)
	settingsFound, effortFound, thinkingFound := false, false, false
	for i, a := range args {
		if a == "--effort" || a == "--settings" || a == "--max-thinking-tokens" {
			require.Less(t, i+1, len(args))
			switch a {
			case "--effort":
				effortFound = args[i+1] == "low"
			case "--max-thinking-tokens":
				thinkingFound = args[i+1] == "1024"
			case "--settings":
				value, ok := args[i+1].(string)
				require.True(t, ok)
				cfg, err := decodeObject([]byte(value))
				require.NoError(t, err)
				settingsFound = cfg["fastMode"] == true && cfg["disableAllHooks"] == false
			}
		}
	}
	assert.True(t, effortFound)
	assert.True(t, thinkingFound)
	assert.True(t, settingsFound)

	body, err = json.Marshal(basic())
	require.NoError(t, err)
	next, err := parsePolicyRequest(body, http.Header{})
	require.NoError(t, err)
	next.diagnostic = newRequestDiagnostic(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(body)))
	_, err = runner.run(ctx, next, &Prepared{Work: dir, SessionID: uuid(), InputUUID: uuid()}, dir, func(Object) error { return nil })
	require.NoError(t, err)
	raw, err = os.ReadFile(capture)
	require.NoError(t, err)
	clean, err := decodeObject(raw)
	require.NoError(t, err)
	for _, name := range []string{"extra", "effort_env", "betas", "cache_ttl", "thinking_budget", "streaming", "deferral"} {
		assert.Empty(t, str(clean, name), "request settings leaked: %s", name)
	}
	bodies, err = next.passthroughBodies()
	require.NoError(t, err)
	for _, round := range []map[string]json.RawMessage{bodies.First, bodies.Rest} {
		assert.Len(t, round, 1)
		assert.Equal(t, "128", string(round["max_tokens"]))
	}
}
func TestRequestPolicyFields(t *testing.T) {
	p := defaultRequestPolicy()
	p.AllowFast = true
	v := basic()
	v["speed"] = "fast"
	v["output_config"] = Object{"effort": "xhigh"}
	body, err := json.Marshal(v)
	require.NoError(t, err)
	r, err := parsePolicyRequest(body, policyHeaders(p))
	require.NoError(t, err)
	require.NotNil(t, r.Fast)
	assert.True(t, *r.Fast)
	assert.Equal(t, "xhigh", r.Effort)

	v["output_config"] = Object{"effort": "low", "format": Object{"type": "json_schema", "schema": Object{"type": "object"}}}
	v["fixture_unknown"] = 0.7
	body, err = json.Marshal(v)
	require.NoError(t, err)
	_, err = parsePolicyRequest(body, policyHeaders(p))
	require.ErrorContains(t, err, "fixture_unknown")
	p.UnknownField = "ignore"
	p.AllowEffort = false // legacy UI policy does not strip native output_config
	r, err = parsePolicyRequest(body, policyHeaders(p))
	require.NoError(t, err)
	assert.Equal(t, "low", r.Effort)
	cfg, err := r.passthroughBodies()
	require.NoError(t, err)
	want, err := json.Marshal(v["output_config"])
	require.NoError(t, err)
	for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
		assert.Equal(t, string(want), string(round["output_config"]))
		assert.NotContains(t, round, "fixture_unknown")
	}
	p.AllowFast = false
	_, err = parsePolicyRequest(body, policyHeaders(p))
	require.ErrorContains(t, err, "speed fast is disabled")
	v["speed"] = "standard"
	body, err = json.Marshal(v)
	require.NoError(t, err)
	r, err = parsePolicyRequest(body, policyHeaders(p))
	require.NoError(t, err)
	require.NotNil(t, r.Fast)
	assert.False(t, *r.Fast)
	assert.Equal(t, "low", r.Effort)
	p.UnknownField = "reject"
	_, err = parsePolicyRequest(body, policyHeaders(p))
	require.ErrorContains(t, err, "fixture_unknown")
	for name, field := range map[string]any{"speed": "turbo", "output_config": Object{"effort": "adaptive"}} {
		v = basic()
		v[name] = field
		body, err = json.Marshal(v)
		require.NoError(t, err)
		_, err = parsePolicyRequest(body, policyHeaders(defaultRequestPolicy()))
		require.ErrorContains(t, err, name)
	}
}
func TestRequestPolicyHistoryIsolation(t *testing.T) {
	body, err := json.Marshal(basic())
	require.NoError(t, err)
	r, err := parsePolicyRequest(body, http.Header{})
	require.NoError(t, err)
	before := r.configKey()
	fast := true
	r.Fast = &fast
	assert.NotEqual(t, before, r.configKey(), "fast mode shares policy history key")
	before = r.configKey()
	r.Betas = []string{"interleaved-thinking-2025-05-14"}
	assert.NotEqual(t, before, r.configKey(), "beta change shares policy history key")
	// Header only is permission, not a request to enable fast mode.
	h := http.Header{}
	h.Set("anthropic-beta", "fast-mode-2026-02-01")
	req, err := parsePolicyRequest(body, h)
	require.NoError(t, err)
	require.NotNil(t, req.Fast)
	assert.False(t, *req.Fast)
}
func TestRequestPolicyInvalidConfiguration(t *testing.T) {
	for _, p := range []RequestPolicy{
		{UnknownBeta: "forward", UnknownField: "reject"},
		{UnknownBeta: "reject", UnknownField: "reject", Betas: []BetaRule{{Name: "x", Mapping: "fast"}}},
		{UnknownBeta: "reject", UnknownField: "reject", Betas: []BetaRule{{Name: "x", Mapping: "forward"}, {Name: "x", Mapping: "native"}}},
	} {
		body, err := json.Marshal(basic())
		require.NoError(t, err)
		_, err = parsePolicyRequest(body, policyHeaders(p))
		require.Error(t, err, "bad policy accepted")
	}
}

func TestStructuredOutputAndCachePolicy(t *testing.T) {
	// Key order, unknown schema keywords, and integers outside float64 precision
	// survive EXTRA_BODY; no StructuredOutput tool or extra turn is synthesized.
	config := `{"format":{"type":"json_schema","schema":{"type":"object","x-id":9007199254740993,"multipleOf":1e-7,"properties":{"ok":{"type":"boolean"}},"required":["ok"],"additionalProperties":false}},"x-client":0.30}`
	body := []byte(`{"model":"claude-sonnet-4-6","max_tokens":128,"messages":[{"role":"user","content":"q"}],"cache_control":{"type":"ephemeral","ttl":"1h"},"output_config":` + config + `}`)
	req, err := parsePolicyRequest(body, http.Header{})
	require.NoError(t, err)
	assert.Nil(t, req.JSONSchema)
	assert.False(t, req.APIOutputFormat)
	assert.False(t, req.structuredOutput())
	assert.Equal(t, "1", req.maxTurns())
	assert.NotContains(t, req.enabledTools(), "StructuredOutput")
	assert.NotContains(t, cliArgs(req, &Prepared{}, "plugin"), "--json-schema")
	assert.Equal(t, "1h", req.PromptCacheTTL)
	cfg, err := req.passthroughBodies()
	require.NoError(t, err)
	for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
		assert.Equal(t, config, string(round["output_config"]))
		assert.NotContains(t, round, "cache_control", "CLI owns cache breakpoint placement")
	}
	// Provider validation, including conflicts and schema semantics, is not a
	// gateway rewrite/rejection policy for raw generation fields.
	for _, config := range []any{
		Object{"format": Object{"type": "json_schema", "schema": "not-a-schema"}},
		Object{"format": Object{"type": "json_schema", "schema": Object{"type": "object"}}},
	} {
		v := basic()
		v["output_config"] = config
		v["output_format"] = Object{"type": "json_schema", "schema": Object{"type": "string"}}
		raw, err := json.Marshal(v)
		require.NoError(t, err)
		r, err := parsePolicyRequest(raw, http.Header{})
		require.NoError(t, err)
		bodies, err := r.passthroughBodies()
		require.NoError(t, err)
		for _, round := range []map[string]json.RawMessage{bodies.First, bodies.Rest} {
			for _, name := range []string{"output_config", "output_format"} {
				want, err := json.Marshal(v[name])
				require.NoError(t, err)
				assert.Equal(t, string(want), string(round[name]))
			}
		}
	}
	v := basic()
	v["tools"] = []Object{{"name": "example", "input_schema": Object{"type": "object", "properties": Object{"cache_control": Object{"type": "string"}}}}}
	raw, err := json.Marshal(v)
	require.NoError(t, err)
	req, err = parsePolicyRequest(raw, http.Header{})
	require.NoError(t, err)
	assert.Empty(t, req.PromptCacheTTL, "schema properties mistaken for cache policy")
}

func TestNativeBetasOverrideLegacyRules(t *testing.T) {
	body, err := json.Marshal(basic())
	require.NoError(t, err)
	p := defaultRequestPolicy()
	p.Betas = []BetaRule{{Name: "custom-beta", Mapping: "forward"}, {Name: "fine-grained-tool-streaming-2025-05-14", Mapping: "forward"}, {Name: "claude-code-20250219", Mapping: "native"}}
	for _, unknown := range []string{"ignore", "reject"} {
		p.UnknownBeta = unknown
		h := policyHeaders(p)
		h.Set("anthropic-beta", "custom-beta,claude-code-20250219,fine-grained-tool-streaming-2025-05-14")
		r, err := parsePolicyRequest(body, h)
		require.NoError(t, err)
		assert.True(t, r.FineGrainedTools)
		assert.Equal(t, []string{"custom-beta", "claude-code-20250219", "fine-grained-tool-streaming-2025-05-14"}, r.Betas)
		assert.Equal(t, h.Get("anthropic-beta"), cliEnv(r, false)["ANTHROPIC_BETAS"])
	}
}
