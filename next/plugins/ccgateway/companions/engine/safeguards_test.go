package engine

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSafeguardsAdmissionAndNativeRounds(t *testing.T) {
	body := basic()
	body["safeguards"] = []any{Object{"type": "dangerous_tool_use", "classifier_context": Object{"live_cwd": "D:/client"}}}
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	headers := policyHeaders(defaultRequestPolicy())
	headers.Set("anthropic-beta", "dangerous-tool-use-2026-09-03")
	r, err := parsePolicyRequest(raw, headers)
	require.NoError(t, err)
	assert.Equal(t, []string{"dangerous-tool-use-2026-09-03"}, r.Betas)
	cfg, err := r.passthroughBodies()
	require.NoError(t, err)
	for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
		assert.JSONEq(t, `[{"type":"dangerous_tool_use","classifier_context":{"live_cwd":"D:/client"}}]`, string(round["safeguards"]))
	}
}

func TestSafeguardsEnvelope(t *testing.T) {
	for _, raw := range []string{`null`, `{}`, `[]`, `[null]`, `[{}]`, `[1]`, `"x"`, `[{"x":"` + strings.Repeat("x", maxSafeguardsBytes) + `"}]`} {
		o, err := decodeObject([]byte(`{"safeguards":` + raw + `}`))
		if err != nil {
			t.Fatal(err)
		}
		if _, err := parseRequestPlan(nil, o); err == nil {
			t.Fatalf("accepted invalid safeguards envelope (%d bytes)", len(raw))
		}
	}
}

func TestSafeguardsClientExecutionContextPreserved(t *testing.T) {
	const safeguards = `[{"type":"dangerous_tool_use","classifier_context":{"live_cwd":"D:/client","v":9007199254740993,"future":null}}]`
	raw := []byte(`{"model":"claude-opus-5-5","max_tokens":64,"safeguards":` + safeguards + `,"tools":[{"name":"lookup","input_schema":{"type":"object"}}],"messages":[{"role":"user","content":"q"},{"role":"assistant","content":[{"type":"tool_use","id":"toolu_client_identity","name":"lookup","input":{"n":9007199254740993}}]},{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_client_identity","content":"result"}]}]}`)
	r, err := parsePolicyRequest(raw, nil)
	require.NoError(t, err)
	before := digest(r.Messages)
	cfg, err := r.passthroughBodies()
	require.NoError(t, err)
	for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
		assert.Equal(t, safeguards, string(round["safeguards"]))
	}
	assert.Equal(t, before, digest(r.Messages))
	assert.Equal(t, json.Number("9007199254740993"), r.Messages[1].Content[0]["input"].(Object)["n"])
	cfg.First["safeguards"][0] = 'x'
	again, err := r.passthroughBodies()
	require.NoError(t, err)
	assert.Equal(t, safeguards, string(again.First["safeguards"]))
	plain, err := parsePolicyRequest(mustServerJSON(basic()), nil)
	require.NoError(t, err)
	defaults, err := plain.passthroughBodies()
	require.NoError(t, err)
	assert.NotContains(t, defaults.First, "safeguards")
	assert.NotContains(t, defaults.Rest, "safeguards")
}

func TestSafeguardsWithInternalToolSearch(t *testing.T) {
	for _, search := range []string{"true", "false"} {
		t.Run(search, func(t *testing.T) {
			body := basic()
			body["safeguards"] = []any{Object{"type": "dangerous_tool_use"}}
			body["tools"] = []any{Object{"name": "lookup", "input_schema": Object{"type": "object"}, "defer_loading": true}}
			policy := defaultRequestPolicy()
			policy.ToolSearch = search
			r, err := parsePolicyRequest(mustServerJSON(body), policyHeaders(policy))
			require.NoError(t, err)
			cfg, err := r.passthroughBodies()
			require.NoError(t, err)
			assert.Equal(t, `[{"type":"dangerous_tool_use"}]`, string(cfg.First["safeguards"]))
			assert.Equal(t, string(cfg.First["safeguards"]), string(cfg.Rest["safeguards"]))
			assert.Equal(t, search == "true", r.toolSearchEnabled())
		})
	}
}

func TestSafeguardsSubagentHandback(t *testing.T) {
	var schema Object
	require.NoError(t, json.Unmarshal([]byte(subagentHandbackSchema), &schema))
	body := basic()
	body["safeguards"] = []any{Object{"type": "dangerous_tool_use"}}
	body["tools"] = []any{Object{"name": "SubagentHandback", "input_schema": schema}}
	r, err := parsePolicyRequest(mustServerJSON(body), nil)
	require.NoError(t, err)
	matchNativeTools(r, "2.1.292")
	assert.Equal(t, "mcp__ccgateway__SubagentHandback", r.wireName("SubagentHandback"))
	assert.Equal(t, digest(schema), digest(r.Tools[0].Schema))
	reply := controlReply(Object{"request_id": "control_handoff", "request": Object{"subtype": "can_use_tool", "tool_name": r.wireName("SubagentHandback"), "tool_use_id": "toolu_handoff", "input": Object{"message": "report"}}}, r)
	payload := reply["response"].(Object)["response"].(Object)
	assert.Equal(t, "deny", payload["behavior"])
	assert.Equal(t, "toolu_handoff", payload["toolUseID"])
	cfg, err := r.passthroughBodies()
	require.NoError(t, err)
	assert.Equal(t, `[{"type":"dangerous_tool_use"}]`, string(cfg.First["safeguards"]))
}

// Bash and PowerShell match the catalogue with their timeout numbers as
// parameters; any other difference keeps them off the native path.
func TestShellToolTimeoutParameters(t *testing.T) {
	for _, name := range []string{"Bash", "PowerShell"} {
		known := verifiedNativeToolCatalogues["2.1.292"][name][0]
		variant := func(from, to string) Tool {
			raw, _ := json.Marshal(known.Schema)
			raw = bytes.ReplaceAll(raw, []byte(from), []byte(to))
			var schema Object
			_ = json.Unmarshal(raw, &schema)
			return Tool{Name: name, Schema: schema, Description: "client"}
		}
		timeout := variant("max 600000 for a foreground command", "max 1800000 for a foreground command")
		if !catalogueMatch(known, timeout) || sameToolDefinition(known, timeout) {
			t.Fatalf("%s timeout variant", name)
		}
		if other := variant("Set to true to run this command in the background", "Set to true to run this command elsewhere"); catalogueMatch(known, other) {
			t.Fatalf("%s other text change matched", name)
		}
		wire := Object{"name": name, "input_schema": known.Schema, "description": "inner", "cache_control": Object{"type": "ephemeral"}}
		if !restoreShellTool(timeout, wire) || str(wire, "description") != "client" || digest(wire["input_schema"]) != digest(timeout.Schema) || wire["cache_control"] == nil {
			t.Fatalf("%s not restored: %v", name, wire)
		}
		if restoreShellTool(Tool{Name: "Read", Schema: known.Schema}, Object{"input_schema": known.Schema}) {
			t.Fatal("non-shell tool restored")
		}
	}
	r := &Request{Native: map[string]bool{"PowerShell": true}, Tools: []Tool{{Name: "PowerShell"}}}
	if r.shellToolEnv()["CLAUDE_CODE_USE_POWERSHELL_TOOL"] != "1" {
		t.Fatal("PowerShell not offered by the inner CLI")
	}
}

// The inner CLI runs with slash commands (and so offers Skill) only for a
// native client Skill, and never when the input would run as a command.
func TestOffersSkillGuard(t *testing.T) {
	message := func(blocks ...Object) []Message { return []Message{{Role: "user", Content: blocks}} }
	text := func(s string) Object { return Object{"type": "text", "text": s} }
	for _, c := range []struct {
		native bool
		input  []Message
		want   bool
	}{
		{true, message(text("hello")), true},
		{false, message(text("hello")), false},
		{true, message(text("/cost")), false},
		{true, message(text("hello"), text("/compact")), false},
		{true, message(text(" /cost")), true},
		{true, message(Object{"type": "tool_result", "tool_use_id": "toolu_x", "content": "/home/x"}), true},
	} {
		r := &Request{Native: map[string]bool{"Skill": c.native}, Tools: []Tool{{Name: "Skill"}}, Messages: c.input}
		if r.offersSkill() != c.want {
			t.Fatalf("native=%v input=%v: %v", c.native, c.input, !c.want)
		}
		args := strings.Join(cliArgs(r, &Prepared{}, "plugin"), " ")
		if strings.Contains(args, "--disable-slash-commands") == c.want {
			t.Fatalf("args: %s", args)
		}
	}
}
