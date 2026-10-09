package engine

import (
	"encoding/json"
	"strings"
	"testing"
)

// CONTRACTS §53.12 fix: CC's system blocks reach the upstream API as the
// client sent them. The CLI keeps a leading billing header block, adds its
// SDK identity block when the client has none, and joins the rest into one
// block, followed by the request marker. Lengths of the billing and identity
// blocks are those of CLI 2.1.292; the prompt texts are placeholders.
func TestCacheSystemRestoresClientBlockShapes(t *testing.T) {
	billing := "x-anthropic-billing-header: cc_version=2.1.292.8bf; cc_entrypoint=sdk-cli;"
	sdkIdentity := "You are Claude Code, Anthropic's official CLI for Claude, running within the Claude Agent SDK."
	agentIdentity := "You are a Claude agent, built on Anthropic's Claude Agent SDK."
	if len(billing) != 74 || len(agentIdentity) != 62 || !cliIdentityBlocks[sdkIdentity] || !cliIdentityBlocks[agentIdentity] {
		t.Fatal("fixture lengths changed")
	}
	placeholder := func(tag string, n int) string {
		return tag + strings.Repeat("x", n-len(tag))
	}
	cached := func() Object { return Object{"type": "ephemeral"} }
	text := func(s string, cache bool) Object {
		b := Object{"type": "text", "text": s}
		if cache {
			b["cache_control"] = cached()
		}
		return b
	}
	prompt := placeholder("CLASSIFIER_PROMPT ", 24576)
	tail := placeholder("CLASSIFIER_TAIL ", 1408)
	mainPrompt := placeholder("MAIN_PROMPT ", 5620)
	cases := []struct {
		name   string
		client []any // what CC sends to the gateway
		cli    []any // what the CLI sends, before the request marker
	}{
		{"auto mode classifier", []any{text(billing, false), text(prompt, true), text(tail, false)},
			[]any{text(billing, false), text(sdkIdentity, true), text(prompt+"\n\n"+tail, true)}},
		{"main thread", []any{text(billing, false), text(agentIdentity, true), text(mainPrompt, true)},
			[]any{text(billing, false), text(agentIdentity, true), text(mainPrompt, true)}},
		{"two blocks", []any{text(billing, false), text(prompt, true)},
			[]any{text(billing, false), text(sdkIdentity, true), text(prompt, true)}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			client, _ := json.Marshal(c.client)
			var body Object
			_ = json.Unmarshal(client, &body)
			req := plannedRequest(t, Object{"system": c.client, "messages": []any{Object{"role": "user", "content": []any{text("Is this action allowed?", false)}}}})
			if req.Plan == nil || req.Plan.cache == nil {
				t.Fatal("client cache plan missing")
			}
			scope := newMainRequestScope()
			if err := scope.enter(); err != nil {
				t.Fatal(err)
			}
			relay := &outboundRelay{scope: scope}
			system := append([]any(nil), c.cli...)
			last := system[len(system)-1].(Object)
			system[len(system)-1] = Object{"type": "text", "text": str(last, "text") + "\n\n" + scope.marker, "cache_control": cached()}
			wire := Object{"model": req.Model, "max_tokens": 128, "stream": true, "system": system,
				"messages": []any{Object{"role": "user", "content": []any{Object{"type": "text", "text": "Is this action allowed?", "cache_control": cached()}}}}}
			raw, _ := json.Marshal(wire)
			out, err := relay.adapt(req, nil, raw, false)
			if err != nil {
				t.Fatalf("relay refused the request (502 to the client): %v", err)
			}
			got, _ := decodeObject(out)
			gotSystem, _ := json.Marshal(got["system"])
			if string(gotSystem) != string(client) {
				t.Fatalf("upstream system differs from the client's:\n got %.300s\nwant %.300s", gotSystem, client)
			}
		})
	}
}
