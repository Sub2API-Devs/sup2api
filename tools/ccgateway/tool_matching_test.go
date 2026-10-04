package main

import (
	"encoding/json"
	"testing"
)

func TestNativeToolsRequireExactVerifiedDefinition(t *testing.T) {
	known, ok := verifiedNativeTools["Read"]
	if !ok || known.Description == "" || known.Schema == nil {
		t.Fatal("missing verified Read definition")
	}
	for _, tc := range []struct {
		name    string
		version string
		optIn   bool
		change  func(*Tool)
		matched bool
	}{
		{"exact", "2.1.288", true, nil, true},
		{"not-opted-in", "2.1.288", false, nil, false},
		{"unknown-version", "2.1.289", true, nil, false},
		{"description", "2.1.288", true, func(tool *Tool) { tool.Description += " Client override" }, false},
		{"schema", "2.1.288", true, func(tool *Tool) { tool.Schema["additionalProperties"] = true }, false},
		{"unknown-name", "2.1.288", true, func(tool *Tool) { tool.Name = "ClientRead" }, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			data, _ := json.Marshal(known)
			var tool Tool
			if err := json.Unmarshal(data, &tool); err != nil {
				t.Fatal(err)
			}
			if tc.change != nil {
				tc.change(&tool)
			}
			before := digest(tool)
			r := &Request{Tools: []Tool{tool}, Native: map[string]bool{tool.Name: tc.optIn}}
			matchNativeTools(r, tc.version)
			if r.Native[tool.Name] != tc.matched {
				t.Fatalf("native match=%v, want %v", r.Native, tc.matched)
			}
			if digest(r.Tools[0]) != before {
				t.Fatal("matching changed the client definition")
			}
			wantName := "mcp__ccgateway__" + tool.Name
			if tc.matched {
				wantName = tool.Name
			}
			if r.wireName(tool.Name) != wantName {
				t.Fatalf("wire name=%q, want %q", r.wireName(tool.Name), wantName)
			}
		})
	}
}
