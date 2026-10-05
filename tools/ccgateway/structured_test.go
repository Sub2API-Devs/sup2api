package main

import "testing"

func TestStructuredValidationAndLocalReferences(t *testing.T) {
	schema := Object{"type": "object", "properties": Object{"ok": Object{"$ref": "#/$defs/bool"}}, "required": []string{"ok"}, "additionalProperties": false, "$defs": Object{"bool": Object{"type": "boolean"}}}
	for _, tc := range []struct {
		text  string
		valid bool
	}{{`{"ok":true}`, true}, {`{"ok":"yes"}`, false}, {`{}`, false}, {`{"ok":true,"extra":1}`, false}, {`not json`, false}} {
		if err := validateStructuredText(schema, []Object{{"type": "text", "text": tc.text}}); (err == nil) != tc.valid {
			t.Errorf("%s: %v", tc.text, err)
		}
	}
	for _, ref := range []string{"https://example.com/schema.json", "file:///etc/passwd"} {
		if _, err := compileOutputSchema(Object{"$ref": ref}); err == nil {
			t.Errorf("external schema accepted: %s", ref)
		}
	}
}

func TestToolSearchUsageAggregation(t *testing.T) {
	total := Object{}
	for range 2 {
		addSearchUsage(total, Object{"usage": Object{"input_tokens": 20, "output_tokens": 8}})
	}
	delta := Object{"usage": Object{"output_tokens": 8}}
	mergeSearchUsage(delta, total, Object{"usage": Object{"input_tokens": 20, "output_tokens": 0}})
	u := delta["usage"].(map[string]any)
	if tokenCount(u["input_tokens"]) != 60 || tokenCount(u["output_tokens"]) != 24 {
		t.Fatal(u)
	}
}
