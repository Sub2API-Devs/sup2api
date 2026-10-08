package gateway

import (
	"encoding/json"
	"fmt"
	"testing"
)

func TestHelperHistoryABCCatalogRealDBCLI(t *testing.T) {
	runHelperHistoryABCRealDBCLI(t, false, abcHelperOptions{TailReminder: true, SessionContext: true, StrictToolReferences: true})
}

// This fixture models only ordinary custom definitions and public inline
// additions/removals. It never searches opaque tool inputs for references.
func validateABCToolReferences(tools, messages []json.RawMessage) error {
	available := map[string]bool{}
	for _, raw := range tools {
		var tool struct{ Name string }
		if err := json.Unmarshal(raw, &tool); err != nil {
			return err
		}
		if tool.Name != "" {
			available[tool.Name] = true
		}
	}
	for _, raw := range messages {
		var message struct {
			Role    string
			Content json.RawMessage
		}
		if err := json.Unmarshal(raw, &message); err != nil {
			return err
		}
		var blocks []struct {
			Type string
			Tool struct {
				Type       string
				Name       string
				Definition struct{ Name string }
			}
			Content json.RawMessage
		}
		if len(message.Content) == 0 || message.Content[0] != '[' {
			continue
		}
		if err := json.Unmarshal(message.Content, &blocks); err != nil {
			return err
		}
		for _, block := range blocks {
			if message.Role == "system" {
				switch block.Type {
				case "tool_addition":
					if block.Tool.Type == "tool_definition" {
						available[block.Tool.Definition.Name] = true
					}
				case "tool_removal":
					delete(available, block.Tool.Name)
				}
			}
			if message.Role != "user" || block.Type != "tool_result" || len(block.Content) == 0 || block.Content[0] != '[' {
				continue
			}
			var results []struct {
				Type     string
				ToolName string `json:"tool_name"`
			}
			if err := json.Unmarshal(block.Content, &results); err != nil {
				return err
			}
			for _, result := range results {
				if result.Type == "tool_reference" && !available[result.ToolName] {
					return fmt.Errorf("Tool reference %s not found in available tools", result.ToolName)
				}
			}
		}
	}
	return nil
}

func TestABCReferenceCatalogPosition(t *testing.T) {
	ref := json.RawMessage(`{"role":"user","content":[{"type":"tool_result","tool_use_id":"s","content":[{"type":"tool_reference","tool_name":"weather"}]}]}`)
	add := json.RawMessage(`{"role":"system","content":[{"type":"tool_addition","tool":{"type":"tool_definition","definition":{"name":"weather","input_schema":{"type":"object"}}}}]}`)
	remove := json.RawMessage(`{"role":"system","content":[{"type":"tool_removal","tool":{"type":"tool_reference","name":"weather"}}]}`)
	for _, tc := range []struct {
		name     string
		messages []json.RawMessage
		valid    bool
	}{
		{"missing", []json.RawMessage{ref}, false},
		{"add before", []json.RawMessage{add, ref}, true},
		{"future add", []json.RawMessage{ref, add}, false},
		{"past reference stays valid", []json.RawMessage{add, ref, remove}, true},
		{"withdrawn", []json.RawMessage{add, remove, ref}, false},
		{"readd", []json.RawMessage{add, remove, add, ref}, true},
		{"opaque input is not a protocol reference", []json.RawMessage{json.RawMessage(`{"role":"assistant","content":[{"type":"tool_use","name":"outer","id":"t","input":{"type":"tool_reference","tool_name":"missing"}}]}`)}, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if err := validateABCToolReferences(nil, tc.messages); (err == nil) != tc.valid {
				t.Fatalf("valid=%v err=%v", tc.valid, err)
			}
		})
	}
}
