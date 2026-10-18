package engine

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"
)

func TestSystemComponentExtractionRestoresExactContent(t *testing.T) {
	raw := `[{"role":"user","content":[{"type":"text","text":"前文\n<system-reminder>ONE</system-reminder> 后文 <system-reminder>TWO</system-reminder>","cache_control":{"type":"ephemeral"}},{"type":"image","source":{"type":"base64","data":"opaque"}},{"type":"tool_result","tool_use_id":"t","content":[{"type":"text","text":"<system-reminder>TOOL</system-reminder>"}]}]},{"role":"system","content":[{"type":"text","text":"A","cache_control":{"type":"ephemeral"}},{"type":"text","text":"B"}],"clear_at":"next_user_message","output_config":{"effort":"low"}},{"role":"assistant","content":"<system-reminder>assistant quote</system-reminder>"},{"role":"user","content":"<system-reminder>unclosed"}]`
	var messages []json.RawMessage
	if err := json.Unmarshal([]byte(raw), &messages); err != nil {
		t.Fatal(err)
	}
	rows, attachments, err := extractSystemComponents(messages)
	if err != nil {
		t.Fatal(err)
	}
	if len(attachments) != 4 || len(rows) != 4 {
		t.Fatalf("rows %d attachments %d", len(rows), len(attachments))
	}
	lookup := map[string]map[string]any{}
	for _, item := range attachments {
		lookup[item["id"].(string)] = item
	}
	var restore func(any) any
	restore = func(v any) any {
		switch node := v.(type) {
		case map[string]any:
			if id, ok := node["attachment"].(string); ok {
				var message any
				_ = json.Unmarshal(lookup[id]["message"].(json.RawMessage), &message)
				return message
			}
			if node["type"] == "ccgateway_text" {
				text := ""
				for _, part := range node["parts"].([]any) {
					p := part.(map[string]any)
					if literal, ok := p["text"].(string); ok {
						text += literal
					} else {
						var block map[string]string
						_ = json.Unmarshal(lookup[p["attachment"].(string)]["block"].(json.RawMessage), &block)
						text += block["text"]
					}
				}
				block := node["block"].(map[string]any)
				block["text"] = text
				return block
			}
			for key, value := range node {
				node[key] = restore(value)
			}
			return node
		case []any:
			for i, value := range node {
				node[i] = restore(value)
			}
			return node
		default:
			return node
		}
	}
	var original, actual any
	_ = json.Unmarshal([]byte(raw), &original)
	encoded, _ := json.Marshal(rows)
	_ = json.Unmarshal(encoded, &actual)
	if !reflect.DeepEqual(original, restore(actual)) {
		t.Fatalf("content or system lifecycle changed: %s", encoded)
	}
	if strings.Contains(string(rows[0]), "ONE") || strings.Contains(string(rows[1]), `"role":"system"`) {
		t.Fatal("extracted content duplicated at original slot")
	}
}

func TestReminderSpanBoundaries(t *testing.T) {
	for _, c := range []struct {
		text  string
		count int
	}{
		{"plain", 0}, {"<system-reminder>unclosed", 0}, {"</system-reminder>unopened", 0},
		{"<system-reminder>a</system-reminder>mid<system-reminder>b</system-reminder>", 2},
		{"<system-reminder>outer<system-reminder>inner</system-reminder>end</system-reminder>", 1},
	} {
		if got := len(reminderSpans(c.text)); got != c.count {
			t.Fatalf("%q: %d", c.text, got)
		}
	}
}

func TestBuildRejectsReservedReferencesAndUnsafeNumbers(t *testing.T) {
	for _, raw := range []string{
		`{"model":"m","messages":[{"role":"user","content":[{"type":"ccgateway_attachment","id":"x"}]}]}`,
		`{"model":"m","messages":[{"role":"user","content":null}]}`,
		`{"model":"m","messages":[{"role":"user","content":"x"}],"max_tokens":9007199254740993}`,
	} {
		if _, err := messagesBuildComponents([]byte(raw)); err == nil {
			t.Fatal("accepted", raw)
		}
	}
}
