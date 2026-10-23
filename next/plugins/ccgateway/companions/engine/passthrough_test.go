package engine

import (
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/requestfailure"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeRequestPolicyAndEnvironment(t *testing.T) {
	for _, policy := range []string{"", `{}`, `{"relay_mode":""}`, `{"relay_mode":"native"}`} {
		t.Run("policy="+policy, func(t *testing.T) {
			h := http.Header{}
			h.Set(policyHeader, policy)
			req, err := parsePolicyRequest([]byte(`{"model":"claude-sonnet-4-6","max_tokens":64,"messages":[{"role":"user","content":"hi"}]}`), h)
			require.NoError(t, err)
			cfg := newRunConfig(req, &Prepared{SessionID: "00000000-0000-4000-8000-000000000000"}, "mod", t.TempDir())
			base := []string{"ANTHROPIC_BASE_URL=https://provider.invalid", "_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1", "CLAUDE_CODE_RETRY_WATCHDOG=1"}
			env := cfg.processEnv(base)
			assert.Equal(t, "https://provider.invalid", environmentValue(env, "ANTHROPIC_BASE_URL"))
			assert.Empty(t, environmentValue(env, "_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL"))
			assert.Empty(t, environmentValue(env, "CLAUDE_CODE_RETRY_WATCHDOG"))
			assert.Equal(t, "0", environmentValue(env, "CLAUDE_CODE_MAX_RETRIES"))
			assert.Equal(t, "1", environmentValue(env, "CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK"))
			assert.Contains(t, environmentValue(env, "NO_PROXY"), "127.0.0.1")
		})
	}
	for _, mode := range []string{"legacy", "passthrough", "relay", "unknown"} {
		t.Run("reject="+mode, func(t *testing.T) {
			h := http.Header{}
			h.Set(policyHeader, fmt.Sprintf(`{"relay_mode":%q}`, mode))
			_, err := parsePolicyRequest([]byte(`{"model":"m","max_tokens":64,"messages":[{"role":"user","content":"hi"}]}`), h)
			require.ErrorContains(t, err, "relay_mode: must be native")
		})
	}
}

func TestNativeEnvironmentValidationUsesChildCasing(t *testing.T) {
	base := []string{"ANTHROPIC_BASE_URL=https://primary.invalid", "anthropic_base_url=https://override.invalid"}
	want := "https://primary.invalid"
	if runtime.GOOS == "windows" {
		want = "https://override.invalid"
	}
	require.Equal(t, want, environmentValue(base, "ANTHROPIC_BASE_URL"))
	require.Equal(t, want, environmentValue(envWith(base, nil), "ANTHROPIC_BASE_URL"))
}

func TestNativeFallbackFreshAdmission(t *testing.T) {
	h := http.Header{}
	h.Set(policyHeader, `{"relay_mode":"native","allow_fast":true}`)
	h.Set("Anthropic-Beta", "server-side-fallback-2026-06-01")
	primary, err := parsePolicyRequest([]byte(`{"model":"claude-sonnet-4-6","max_tokens":4096,"thinking":{"type":"enabled","budget_tokens":1024},"output_config":{"effort":"low"},"messages":[{"role":"user","content":"hi"}],"fallbacks":[{"model":"claude-opus-4-6","thinking":null,"output_config":null,"max_tokens":null},{"model":"claude-haiku-4-5","thinking":{"type":"disabled"}}]}`), h)
	require.NoError(t, err)
	before := append([]byte(nil), primary.Plan.RawRequest()...)
	cfg, err := primary.passthroughBodies()
	require.NoError(t, err)
	first, err := primary.nativeFallback(cfg.Fallbacks[0])
	require.NoError(t, err)
	require.Empty(t, first.Thinking)
	require.Empty(t, first.Effort)
	require.Equal(t, 4096, first.MaxTokens)
	firstWire, err := decodeObject(first.Plan.RawRequest())
	require.NoError(t, err)
	require.NotContains(t, firstWire, "thinking")
	require.NotContains(t, firstWire, "output_config")
	second, err := primary.nativeFallback(cfg.Fallbacks[1])
	require.NoError(t, err)
	require.Equal(t, "disabled", str(second.Thinking, "type"))
	require.NotContains(t, second.Thinking, "budget_tokens")
	require.Equal(t, "enabled", str(primary.Thinking, "type"))
	require.Equal(t, "low", primary.Effort)
	require.Equal(t, before, primary.Plan.RawRequest())
}

func TestNativeFallbackSpeedAdmission(t *testing.T) {
	h := http.Header{}
	h.Set(policyHeader, `{"relay_mode":"native","allow_fast":true}`)
	h.Set("Anthropic-Beta", "server-side-fallback-2026-06-01")
	raw := []byte(`{"model":"claude-sonnet-4-6","max_tokens":256,"speed":"fast","messages":[{"role":"user","content":"hi"}],"fallbacks":[{"model":"claude-opus-4-6","speed":"standard"}]}`)
	primary, err := parsePolicyRequest(raw, h)
	require.NoError(t, err)
	cfg, err := primary.passthroughBodies()
	require.NoError(t, err)
	next, err := primary.nativeFallback(cfg.Fallbacks[0])
	require.NoError(t, err)
	require.True(t, *primary.Fast)
	require.Equal(t, `"fast"`, string(cfg.First["speed"]))
	require.False(t, *next.Fast)
	nextCfg, err := next.passthroughBodies()
	require.NoError(t, err)
	require.Equal(t, `"standard"`, string(nextCfg.First["speed"]))
}

func passthroughHeader(betas ...string) http.Header {
	h := http.Header{}
	h.Set(policyHeader, `{"relay_mode":"native"}`)
	if len(betas) > 0 {
		h.Set("anthropic-beta", strings.Join(betas, ","))
	}
	return h
}

// Native EXTRA_BODY preserves the client's raw fields; tool_choice is only
// applied in the first round, under the inner CLI's tool name.
func TestPassthroughBodies(t *testing.T) {
	body := `{"model":"claude-sonnet-4-6","max_tokens":2048,"temperature":0.30,"top_p":1e-1,"stop_sequences":["</a>"],"service_tier":"standard_only","inference_geo":"us",` +
		`"thinking":{"type":"adaptive","display":"omitted"},"output_config":{"effort":"low","format":{"type":"json_schema","schema":{"type":"object","x-unknown":true}},"task_budget":{"type":"tokens","total":30000}},` +
		`"safeguards":[{"type":"dangerous_tool_use","classifier_context":{"opaque":[1,2]}}],"metadata":{"user_id":"u"},"context_management":{"edits":[{"type":"clear_thinking_20251015","keep":"all"}]},` +
		`"tools":[{"name":"lookup","input_schema":{"type":"object"}}],"tool_choice":{"type":"tool","name":"lookup","disable_parallel_tool_use":true},"messages":[{"role":"user","content":"hi"}]}`
	req, err := parsePolicyRequest([]byte(body), passthroughHeader("task-budgets-2026-03-13", "fixture-beta"))
	require.NoError(t, err)
	assert.Equal(t, "low", req.Effort)
	assert.Equal(t, []string{"task-budgets-2026-03-13", "fixture-beta"}, req.Betas)
	cfg, err := req.passthroughBodies()
	require.NoError(t, err)
	want := map[string]string{
		"max_tokens": `2048`, "temperature": `0.30`, "top_p": `1e-1`, "stop_sequences": `["</a>"]`, "service_tier": `"standard_only"`, "inference_geo": `"us"`,
		"thinking":      `{"type":"adaptive","display":"omitted"}`,
		"output_config": `{"effort":"low","format":{"type":"json_schema","schema":{"type":"object","x-unknown":true}},"task_budget":{"type":"tokens","total":30000}}`,
		"safeguards":    `[{"type":"dangerous_tool_use","classifier_context":{"opaque":[1,2]}}]`,
	}
	for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
		for name, value := range want {
			assert.Equal(t, value, string(round[name]), name)
		}
		for _, absent := range []string{"metadata", "context_management", "tools", "messages", "model"} {
			assert.NotContains(t, round, absent, "must not be sent through EXTRA_BODY")
		}
	}
	assert.Equal(t, `{"disable_parallel_tool_use":true,"name":"mcp__ccgateway__lookup","type":"tool"}`, string(cfg.First["tool_choice"]))
	assert.NotContains(t, cfg.Rest, "tool_choice")
	args := strings.Join(cliArgs(req, &Prepared{SessionID: "00000000-0000-4000-8000-000000000000"}, "mod"), " ")
	assert.Contains(t, args, "--thinking adaptive")
	assert.Contains(t, args, "--effort low")
	assert.NotContains(t, args, "--json-schema")
	assert.NotContains(t, args, "--thinking-display")
	env := cliEnv(req, false)
	assert.Equal(t, "0", env["CLAUDE_CODE_MAX_RETRIES"])
	assert.Equal(t, "1", env["CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS"])
	assert.Equal(t, "task-budgets-2026-03-13,fixture-beta", env["ANTHROPIC_BETAS"])
	assert.Empty(t, env["ANTHROPIC_CUSTOM_HEADERS"])
}

// Without thinking or effort the CLI uses API defaults, not per-model defaults.
func TestPassthroughDefaults(t *testing.T) {
	req, err := parsePolicyRequest([]byte(`{"model":"claude-opus-5-5","max_tokens":64,"messages":[{"role":"user","content":"hi"}]}`), passthroughHeader())
	require.NoError(t, err)
	args := strings.Join(cliArgs(req, &Prepared{SessionID: "00000000-0000-4000-8000-000000000000"}, "mod"), " ")
	assert.Contains(t, args, "--thinking disabled")
	assert.Contains(t, args, "--effort high")
	req.upstreamAgent = "a0123456789abcdef"
	assert.Equal(t, "x-claude-code-agent-id: a0123456789abcdef", cliEnv(req, false)["ANTHROPIC_CUSTOM_HEADERS"])
	cfg, err := req.passthroughBodies()
	require.NoError(t, err)
	assert.Equal(t, "64", string(cfg.First["max_tokens"]))
	assert.Len(t, cfg.First, 1)
}

// Native transport keeps client attachments and adds none of the CLI's own.
func TestPassthroughAttachments(t *testing.T) {
	h := http.Header{}
	h.Set(policyHeader, `{"relay_mode":"native","attachment_source":"gateway","attachment_sources":{"date":"both"},"environment_fields":{"platform":"gateway"},"unknown_client_attachment":"ignore","unknown_gateway_attachment":"pass"}`)
	body := `{"model":"m","max_tokens":9,"messages":[{"role":"user","content":"a"},{"role":"system","content":"<ccgateway-attachment type=\"custom\">client</ccgateway-attachment>"}]}`
	req, err := parsePolicyRequest([]byte(body), h)
	require.NoError(t, err)
	assert.Equal(t, "client", req.AttachmentSource)
	assert.Equal(t, "pass", req.UnknownClientAttachment)
	assert.Equal(t, "ignore", req.UnknownGatewayAttachment)
	assert.Empty(t, req.AttachmentSources)
	assert.Empty(t, req.EnvironmentFields)
	last := req.Messages[len(req.Messages)-1]
	assert.Equal(t, "system", last.Role)
	require.NotEmpty(t, last.Content)
	assert.Contains(t, str(last.Content[0], "text"), "client")
}

// What Claude Code cannot express is refused before running the CLI.
func TestPassthroughRefusals(t *testing.T) {
	for name, body := range map[string]string{
		"prefill":         `{"model":"m","max_tokens":9,"messages":[{"role":"user","content":"a"},{"role":"assistant","content":"b"}]}`,
		"code_execution":  `{"model":"m","max_tokens":9,"tools":[{"type":"code_execution_20250825","name":"code_execution"}],"messages":[{"role":"user","content":"a"}]}`,
		"web_fetch":       `{"model":"m","max_tokens":9,"tools":[{"type":"web_fetch_20250910","name":"web_fetch"}],"messages":[{"role":"user","content":"a"}]}`,
		"text_editor":     `{"model":"m","max_tokens":9,"tools":[{"type":"text_editor_20250728","name":"str_replace_based_edit_tool"}],"messages":[{"role":"user","content":"a"}]}`,
		"mcp_servers":     `{"model":"m","max_tokens":9,"mcp_servers":[],"messages":[{"role":"user","content":"a"}]}`,
		"credit":          `{"model":"m","max_tokens":9,"fallback_credit_token":"x","messages":[{"role":"user","content":"a"}]}`,
		"transformations": `{"model":"m","max_tokens":9,"messages":[{"role":"user","content":[{"type":"image","source":{"type":"base64","media_type":"image/png","data":"iVBORw0KGgo="},"transformations":[{"type":"resize","max_dimension":64}]},{"type":"text","text":"a"}]}]}`,
		"server history":  `{"model":"m","max_tokens":9,"messages":[{"role":"user","content":"a"},{"role":"assistant","content":[{"type":"server_tool_use","id":"srvtoolu_1","name":"web_search","input":{"query":"q"}}]},{"role":"user","content":"b"}]}`,
		"code caller":     `{"model":"m","max_tokens":9,"tools":[{"name":"t","input_schema":{"type":"object"}}],"messages":[{"role":"user","content":"a"},{"role":"assistant","content":[{"type":"tool_use","id":"toolu_1","name":"t","input":{},"caller":{"type":"code_execution_20250825","tool_id":"srvtoolu_1"}}]},{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_1","content":"r"}]}]}`,
	} {
		t.Run(name, func(t *testing.T) {
			_, err := parsePolicyRequest([]byte(body), passthroughHeader())
			require.Error(t, err)
		})
	}
	direct := `{"model":"m","max_tokens":9,"tools":[{"name":"t","input_schema":{"type":"object"}}],"messages":[{"role":"user","content":"a"},{"role":"assistant","content":[{"type":"tool_use","id":"toolu_1","name":"t","input":{},"caller":{"type":"direct"}}]},{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_1","content":"r"}]}]}`
	_, err := parsePolicyRequest([]byte(direct), passthroughHeader())
	require.NoError(t, err, "direct caller must be replayable")
}

func TestPassthroughImageSplit(t *testing.T) {
	image := `{"type":"image","source":{"type":"base64","media_type":"image/png","data":"iVBORw0KGgo="}}`
	for body, split := range map[string]bool{
		`{"model":"m","max_tokens":9,"messages":[{"role":"user","content":[` + image + `,{"type":"text","text":"a"}]}]}`:                                                              true,
		`{"model":"m","max_tokens":9,"messages":[{"role":"user","content":[{"type":"text","text":"a"},` + image + `]}]}`:                                                              false,
		`{"model":"m","max_tokens":9,"messages":[{"role":"user","content":[{"type":"image","source":{"type":"url","url":"https://example.com/a.png"}},{"type":"text","text":"a"}]}]}`: false,
		`{"model":"m","max_tokens":9,"messages":[{"role":"user","content":[{"type":"text","text":"a"},{"type":"text","text":"b"}]}]}`:                                                 false,
	} {
		req, err := parsePolicyRequest([]byte(body), passthroughHeader())
		require.NoError(t, err)
		seed, input, ok := req.passthroughImageSplit()
		assert.Equal(t, split, ok, body)
		if ok {
			require.Len(t, seed.Content, 1)
			require.Len(t, input.Content, 1)
			assert.Equal(t, "a", str(input.Content[0], "text"))
			assert.Len(t, req.pendingWireMessage().Content, 1)
		}
	}
}

// Only terminal, observed native API failures can release the next model.
func TestPassthroughFallbackGate(t *testing.T) {
	for status, allowed := range map[int]bool{429: true, 529: true, 500: true, 400: false, 401: false, 413: false} {
		state := &nativeRunState{}
		state.observe(Object{"type": "result", "subtype": "error_during_execution", "is_error": true, "api_error_status": status})
		assert.Equal(t, allowed, state.canFallback(), "HTTP%d", status)
	}
	assert.False(t, (&nativeRunState{}).canFallback(), "fallback without an observed upstream error")
}

func TestWorkerFullRetryAfter(t *testing.T) {
	dir := t.TempDir()
	cache, err := newCache(filepath.Join(dir, "cache"), 8<<20)
	require.NoError(t, err)
	g := &Gateway{Runner: &Runner{CLI: "unused"}, Cache: cache, Timeout: 5 * time.Second, Slots: make(chan struct{}, 1)}
	g.Slots <- struct{}{}
	w := httptest.NewRecorder()
	g.ServeHTTP(w, httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"claude-sonnet-4-6","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}`)))
	assert.Equal(t, 429, w.Code)
	assert.Equal(t, "1", w.Header().Get("Retry-After"))
	assert.Contains(t, w.Body.String(), "Gateway concurrency limit reached")
	// The Worker's own answers say so (audit C2): the plugin never takes
	// them for the upstream's verdict on the account.
	assert.Equal(t, requestfailure.SourceGateway, requestfailure.Source(w.Header()))
	assert.Equal(t, "concurrency_limit", requestfailure.Reason(w.Header()))
}

// Every answer the Worker writes itself carries its source and a reason.
func TestWorkerOwnErrorsCarryTheirSource(t *testing.T) {
	g := &Gateway{RequestMode: "build", Key: "fixture", Runner: &Runner{CLI: "unused", Version: "2.1.304"}, Timeout: 5 * time.Second, Slots: make(chan struct{}, 1),
		CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: []string{"request_build"}}}
	send := func(key, policy string) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"m","messages":[{"role":"user","content":"hi"}]}`))
		if key != "" {
			req.Header.Set("x-api-key", key)
		}
		if policy != "" {
			req.Header.Set(policyHeader, policy)
		}
		g.ServeHTTP(w, req)
		return w
	}
	for _, tc := range []struct {
		key, policy, reason string
		status              int
	}{
		{"wrong", "", "unauthorized", 401},
		{"fixture", `{"relay_mode":"direct","cli_version":"2.1.304"}`, "configuration_error", 409},
		{"fixture", `{"relay_mode":"nope"}`, "invalid_request", 400},
	} {
		w := send(tc.key, tc.policy)
		assert.Equal(t, tc.status, w.Code, tc.reason)
		assert.Equal(t, requestfailure.SourceGateway, requestfailure.Source(w.Header()), tc.reason)
		assert.Equal(t, tc.reason, requestfailure.Reason(w.Header()))
	}
}

func TestWebSearchContentSignature(t *testing.T) {
	content := signWebSearchContent(webSearchPayload{Input: Object{"query": "q"}, Text: "read"})
	payload, ok := openWebSearchContent(content)
	require.True(t, ok)
	assert.Equal(t, "read", payload.Text)
	assert.Equal(t, "q", str(payload.Input, "query"))
	for _, bad := range []string{"provider-opaque", content[:len(content)-2] + "AA", strings.Replace(content, "ccgws1.", "ccgws2.", 1)} {
		_, ok := openWebSearchContent(bad)
		assert.False(t, ok, "%q opened", bad)
	}
}

// Search history becomes WebSearch calls and results, with parallel searches
// kept in the same round.
func TestNativeWebSearchTurns(t *testing.T) {
	result := func(id, text string) Object {
		return Object{"type": "web_search_tool_result", "tool_use_id": id, "content": []any{Object{"type": "web_search_result", "title": "t", "url": "u", "encrypted_content": signWebSearchContent(webSearchPayload{Input: Object{"query": id}, Text: text})}}}
	}
	use := func(id string) Object {
		return Object{"type": "server_tool_use", "id": id, "name": "web_search", "input": Object{"query": id}}
	}
	turns, err := nativeWebSearchTurns(Message{Role: "assistant", Content: []Object{{"type": "text", "text": "a"}, use("srvtoolu_1"), use("srvtoolu_2"), result("srvtoolu_1", "R1"), result("srvtoolu_2", "R2"), {"type": "text", "text": "b"}}})
	require.NoError(t, err)
	var shape []string
	for _, turn := range turns {
		var kinds []string
		for _, block := range turn.Content {
			kinds = append(kinds, str(block, "type")+":"+str(block, "id")+str(block, "tool_use_id")+fmt.Sprint(block["content"]))
		}
		shape = append(shape, turn.Role+"["+strings.Join(kinds, ",")+"]")
	}
	assert.Equal(t, "assistant[text:<nil>,tool_use:toolu_1<nil>,tool_use:toolu_2<nil>] user[tool_result:toolu_1R1,tool_result:toolu_2R2] assistant[text:<nil>]", strings.Join(shape, " "))
	_, err = nativeWebSearchTurns(Message{Role: "assistant", Content: []Object{use("srvtoolu_1"), result("srvtoolu_1", "R1")}})
	require.Error(t, err, "a turn ending with a result must be refused")
}

func TestWebSearchBlocksAndEvents(t *testing.T) {
	plan := &webSearchPlan{records: map[string]*webSearchRecord{"toolu_a": {Input: Object{"query": "q"}, Result: Object{"results": []any{Object{"tool_use_id": "srvtoolu_side", "content": []any{Object{"title": "T", "url": "https://e.com"}}}, "note"}}, Text: "read"}}, usage: Object{"input_tokens": 5, "output_tokens": 2, "cache_creation_input_tokens": 4, "cache_creation": Object{"ephemeral_5m_input_tokens": 0, "ephemeral_1h_input_tokens": 4}, "server_tool_use": Object{"web_search_requests": 1}}}
	blocks, internal := plan.convertBlocks([]Object{{"type": "text", "text": "x"}, {"type": "tool_use", "id": "toolu_a", "name": "WebSearch", "input": Object{"query": "q"}}}, "tool_use")
	require.True(t, internal)
	require.Len(t, blocks, 3)
	assert.Equal(t, "srvtoolu_a", str(blocks[1], "id"))
	assert.Equal(t, "srvtoolu_a", str(blocks[2], "tool_use_id"))
	entry := blocks[2]["content"].([]any)[0].(Object)
	payload, ok := openWebSearchContent(str(entry, "encrypted_content"))
	require.True(t, ok)
	assert.Equal(t, "read", payload.Text)
	assert.Equal(t, "T", str(entry, "title"))
	_, internal = plan.convertBlocks([]Object{{"type": "tool_use", "id": "toolu_b", "name": "WebSearch", "input": Object{}}}, "tool_use")
	assert.False(t, internal, "an unanswered search must not continue")
	usage, err := plan.nativeWebSearchUsage(nil, Object{"input_tokens": json.Number("10"), "output_tokens": json.Number("3"), "cache_creation_input_tokens": json.Number("7"), "cache_creation": Object{"ephemeral_1h_input_tokens": json.Number("6"), "ephemeral_5m_input_tokens": json.Number("1")}})
	require.NoError(t, err)
	assert.Equal(t, "15", fmt.Sprint(usage["input_tokens"]))
	assert.Equal(t, "map[ephemeral_1h_input_tokens:10 ephemeral_5m_input_tokens:1]", fmt.Sprint(usage["cache_creation"]))
	assert.Equal(t, "1", fmt.Sprint(usage["server_tool_use"].(Object)["web_search_requests"]))
	events := messageEvents(Object{"id": "msg_1", "type": "message", "role": "assistant", "model": "m", "content": blocks, "stop_reason": "end_turn", "stop_sequence": nil, "usage": usage, "safeguard_results": []any{"v"}})
	var kinds []string
	for _, event := range events {
		kinds = append(kinds, str(event, "type"))
	}
	assert.Equal(t, "message_start,content_block_start,content_block_delta,content_block_stop,content_block_start,content_block_delta,content_block_stop,content_block_start,content_block_stop,message_delta", strings.Join(kinds, ","))
	assert.NotNil(t, events[len(events)-1]["safeguard_results"])
	assert.NotContains(t, events[0]["message"].(Object), "safeguard_results")
}
