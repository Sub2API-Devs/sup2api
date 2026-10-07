package engine

import (
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNativeFallbackOnlyBeforeFirstUpstreamRequest(t *testing.T) {
	for _, alreadyForwarded := range []bool{false, true} {
		relay := &outboundRelay{}
		if alreadyForwarded {
			r := httptest.NewRequest("POST", "http://localhost/v1/messages", strings.NewReader(`{"tools":[]}`))
			if !relay.adaptRequest(httptest.NewRecorder(), r, &Request{}, nil, true, false) {
				t.Fatal("baseline refused")
			}
		}
		req := &Request{Tools: []Tool{verifiedNativeTools["Read"]}, Native: map[string]bool{"Read": true}}
		r := httptest.NewRequest("POST", "http://localhost/v1/messages", strings.NewReader(`{"tools":[]}`))
		if relay.adaptRequest(httptest.NewRecorder(), r, req, nil, true, false) {
			t.Fatal("missing tool forwarded")
		}
		var unavailable *nativeToolAvailabilityError
		if !errors.As(relay.Failure(), &unavailable) || unavailable.RetrySafe == alreadyForwarded {
			t.Fatalf("unsafe retry after forwarded=%v: %v", alreadyForwarded, relay.Failure())
		}
		if strings.Contains(relay.Failure().Error(), "system messages") {
			t.Fatal("tool error mislabelled as system")
		}
	}
}

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
		{"automatic", "2.1.288", false, nil, true},
		{"deferred", "2.1.288", false, func(tool *Tool) { value := true; tool.DeferLoading = &value }, true},
		{"unknown-version", "2.1.289", true, nil, false},
		{"description", "2.1.288", true, func(tool *Tool) { tool.Description += " Client override" }, true},
		{"empty-description", "2.1.288", false, func(tool *Tool) { tool.Description = "" }, true},
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

func TestNativeDefinitionsCheckedAtWireBoundary(t *testing.T) {
	read := verifiedNativeTools["Read"]
	r := &Request{Tools: []Tool{read}}
	matchNativeTools(r, "2.1.288")
	for _, tc := range []struct {
		name   string
		change func(Object)
		fail   bool
	}{
		{"exact", func(Object) {}, false},
		{"cache-control", func(v Object) { v["tools"].([]any)[0].(Object)["cache_control"] = Object{"type": "ephemeral"} }, false},
		{"missing", func(v Object) { v["tools"] = []any{} }, true},
		{"duplicate", func(v Object) { v["tools"] = append(v["tools"].([]any), v["tools"].([]any)[0]) }, true},
		{"schema-drift", func(v Object) { v["tools"].([]any)[0].(Object)["input_schema"].(Object)["required"] = []any{} }, true},
		{"description-independent", func(v Object) { v["tools"].([]any)[0].(Object)["description"] = "different" }, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			data, _ := json.Marshal(Object{"tools": []Tool{read}})
			v, _ := decodeObject(data)
			tc.change(v)
			if err := verifyNativeWireTools(r, v); (err != nil) != tc.fail {
				t.Fatalf("error=%v", err)
			}
		})
	}
	// tool_choice:none is allowed to omit every tool.
	r.NoTools = true
	if err := verifyNativeWireTools(r, Object{}); err != nil {
		t.Fatal(err)
	}
}

func TestNative21292CatalogVariantsAndMixedNames(t *testing.T) {
	catalogue := verifiedNativeToolCatalogues["2.1.292"]
	for _, name := range []string{"Read", "Bash", "Write", "Edit", "Glob", "Grep"} {
		variants := catalogue[name]
		if len(variants) == 0 {
			t.Fatalf("missing captured %s", name)
		}
		for _, known := range variants {
			data, _ := json.Marshal(known)
			var client Tool
			if err := json.Unmarshal(data, &client); err != nil {
				t.Fatal(err)
			}
			client.Description = "Client owns execution and description."
			r := &Request{Tools: []Tool{client, {Name: "mcp__files__lookup", Schema: Object{"type": "object"}}, {Name: "custom", Schema: Object{"type": "object"}}}}
			matchNativeTools(r, "2.1.292")
			if !r.Native[name] || r.wireName(name) != name || r.wireName("mcp__files__lookup") != "mcp__files__lookup" || r.wireName("custom") != "mcp__ccgateway__custom" {
				t.Fatal("incorrect mixed native mapping", name, r.Native)
			}
			client.Schema["x-client-different-definition"] = true
			r.Tools[0] = client
			matchNativeTools(r, "2.1.292")
			if r.Native[name] {
				t.Fatalf("changed %s schema retained native identity", name)
			}
		}
	}
	for _, name := range []string{"Agent", "SendMessage"} {
		if len(catalogue[name]) < 2 {
			t.Fatal("capture variants collapsed", name)
		}
		for _, tool := range catalogue[name] {
			r := &Request{Tools: []Tool{tool}}
			matchNativeTools(r, "2.1.292")
			if !r.Native[name] {
				t.Fatal("captured variant was not matched", name)
			}
		}
	}
	read := catalogue["Read"][0]
	r := &Request{Tools: []Tool{read}}
	matchNativeTools(r, "2.1.293")
	if len(r.Native) != 0 {
		t.Fatal("unverified version reused catalogue")
	}
}
