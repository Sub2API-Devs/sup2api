package gateway

import (
	"bytes"
	"encoding/json"
	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"testing"
)

func abcInlineAddition(name, number string) map[string]any {
	return map[string]any{"role": "system", "content": []any{map[string]any{"type": "tool_addition", "tool": map[string]any{"type": "tool_definition", "definition": map[string]any{"name": name, "description": "fixture precise schema", "defer_loading": true, "input_schema": map[string]any{"type": "object", "properties": map[string]any{"n": map[string]any{"const": json.Number(number)}}}}}}}}
}

func verifyABCInline(t *testing.T, messages []json.RawMessage, catalog *string) {
	t.Helper()
	found := false
	joined, _ := json.Marshal(messages)
	hasHidden := bytes.Contains(joined, []byte(`helper_source_call`))
	for i, raw := range messages {
		var m struct {
			Role    string
			Content []json.RawMessage
		}
		if json.Unmarshal(raw, &m) != nil {
			continue
		}
		for _, b := range m.Content {
			var block struct {
				Type string
				Tool struct{ Definition json.RawMessage }
			}
			if json.Unmarshal(b, &block) != nil || block.Type != "tool_addition" {
				continue
			}
			var def struct{ Name string }
			json.Unmarshal(block.Tool.Definition, &def)
			number := "9007199254740995"
			if def.Name == "mcp__ccgateway__spare" {
				found = true
				number = "9007199254740993"
				if i < 1 {
					t.Error("public directive precedes user")
				} else {
					var previous struct{ Role string }
					_ = json.Unmarshal(messages[i-1], &previous)
					actual, _ := wire.CanonicalDigest(messages[i-1])
					if *catalog == "" && previous.Role == "system" && hasHidden {
						*catalog = actual
					}
					if previous.Role != "system" || hasHidden && (*catalog == "" || actual != *catalog) {
						t.Errorf("original internal catalogue before public inline directive lost or moved: directive_index=%d preceding_role=%s", i, previous.Role)
					}
				}
			}
			if def.Name != "mcp__ccgateway__spare" && def.Name != "mcp__ccgateway__weather" {
				t.Error("inline definition name changed")
			}
			want, _ := json.Marshal(abcInlineAddition(def.Name, number))
			actual, _ := wire.CanonicalDigest(raw)
			expected, _ := wire.CanonicalDigest(want)
			if m.Role != "system" || actual != expected {
				t.Error("inline definition/schema/position/metadata changed")
			}
		}
		if bytes.Contains(raw, []byte(`"id":"helper_source_call"`)) && i <= 1 {
			t.Error("helper moved before public inline directive")
		}
	}
	if !found {
		t.Error("original public inline directive missing")
	}
}
