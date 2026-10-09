package engine

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

// Production 502s after 0.1.19 (2026-10-10, "resource history identity
// changed: client user turn N: client user block sequence changed"): a request
// with a resource grant is checked again after the adaptation, on the body
// that already carries the CLI's session context. Every form the adaptation
// accepts must pass that check, and only with a reminder the Mod acknowledged.
func TestOutboundResourceCheckAfterSessionContext(t *testing.T) {
	const context = "fixture resource session context"
	reminder := "<system-reminder>\n" + context + "\n</system-reminder>"
	cases := map[string]struct {
		client []any
		sent   func(marker string) []any
	}{
		"string fold": {
			client: []any{
				Object{"role": "user", "content": "U1"},
				Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_a", "name": "lookup", "input": Object{}}}},
				Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_a", "content": "R_A\n", "cache_control": Object{"type": "ephemeral"}}}},
			},
			sent: func(string) []any {
				return []any{
					Object{"role": "user", "content": []any{Object{"type": "text", "text": "U1"}}},
					Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_a", "name": "lookup", "input": Object{}}}},
					Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_a", "content": "R_A\n\n" + reminder}}},
				}
			},
		},
		"array appended": {
			client: []any{
				Object{"role": "user", "content": "U1"},
				Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_a", "name": "Agent", "input": Object{}}}},
				Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_a", "content": []any{Object{"type": "text", "text": "report"}}, "cache_control": Object{"type": "ephemeral"}}}},
			},
			sent: func(string) []any {
				return []any{
					Object{"role": "user", "content": []any{Object{"type": "text", "text": "U1"}}},
					Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_a", "name": "Agent", "input": Object{}}}},
					Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_a", "content": []any{
						Object{"type": "text", "text": "report\n"}, Object{"type": "text", "text": reminder}}}}},
				}
			},
		},
		"after tool-result turn": {
			client: []any{
				Object{"role": "user", "content": "U1"},
				Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_a", "name": "Agent", "input": Object{}}}},
				Object{"role": "user", "content": []any{
					Object{"type": "tool_result", "tool_use_id": "toolu_a", "content": "report"},
					Object{"type": "text", "text": "follow-up", "cache_control": Object{"type": "ephemeral"}},
				}},
			},
			sent: func(string) []any {
				return []any{
					Object{"role": "user", "content": []any{Object{"type": "text", "text": "U1"}}},
					Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_a", "name": "Agent", "input": Object{}}}},
					Object{"role": "user", "content": []any{
						Object{"type": "tool_result", "tool_use_id": "toolu_a", "content": "report"},
						Object{"type": "text", "text": "follow-up"},
						Object{"type": "text", "text": reminder},
					}},
				}
			},
		},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			clientBody, _ := json.Marshal(Object{"model": "claude-opus-5-5", "max_tokens": 64, "system": "client system", "messages": tc.client})
			r, err := parsePolicyRequestWithResources(clientBody, http.Header{}, &resourceAdmission{ids: map[string]bool{}})
			if err != nil {
				t.Fatal(err)
			}
			scope := newMainRequestScope()
			if err := scope.enter(); err != nil {
				t.Fatal(err)
			}
			wire, _ := json.Marshal(Object{"model": "claude-opus-5-5", "system": []any{Object{"type": "text", "text": "client system\n\n" + scope.marker}}, "messages": tc.sent(scope.marker)})
			control := &modControl{sessionContexts: map[string]bool{context: true}}
			out, err := (&outboundRelay{scope: scope, control: control}).adapt(r, r.systemGroups(), wire, false)
			if err != nil {
				t.Fatal(err)
			}
			if strings.Count(string(out), context) != 1 {
				t.Fatal("session context lost or duplicated")
			}
			if err := r.validateOutboundResources(out, control); err != nil {
				t.Fatalf("resource check of the adapted body: %v", err)
			}
			// The resource check works on a copy: the body is unchanged.
			if strings.Count(string(out), context) != 1 {
				t.Fatal("resource check changed the body")
			}
			if err := r.validateOutboundResources(out, &modControl{sessionContexts: map[string]bool{"other": true}}); err == nil {
				t.Fatal("unacknowledged reminder accepted by the resource check")
			}
		})
	}
}

// The restored array form is accepted only in the resource check: from the
// CLI it remains an unproven fold.
func TestRestoredArrayFormOnlyAfterAdaptation(t *testing.T) {
	const context = "trusted"
	reminder := "<system-reminder>\n" + context + "\n</system-reminder>"
	original := []any{Object{"type": "text", "text": "report"}}
	actual := []any{Object{"type": "text", "text": "report"}, Object{"type": "text", "text": reminder}}
	suffixes := map[string]bool{"\n\n" + reminder: true}
	if _, _, ok, _ := toolResultContextFold(original, actual, suffixes, []string{reminder}, false); ok {
		t.Fatal("restored form accepted from the CLI")
	}
	if _, _, ok, _ := toolResultContextFold(original, actual, suffixes, []string{reminder}, true); !ok {
		t.Fatal("restored form rejected after adaptation")
	}
}
