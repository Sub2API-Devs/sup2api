package engine

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestCustomToolPrefixPolicyAndMapping(t *testing.T) {
	for _, prefix := range []string{"", "ccgateway", "my-tools", "team_1"} {
		header := http.Header{}
		header.Set(policyHeader, `{"custom_tool_prefix":"`+prefix+`"}`)
		body, _ := json.Marshal(basic())
		r, err := parsePolicyRequest(body, header)
		if err != nil {
			t.Fatal(err)
		}
		want := prefix
		if want == "" {
			want = "ccgateway"
		}
		r.Native = map[string]bool{"Read": true}
		if r.wireName("lookup") != "mcp__"+want+"__lookup" || r.wireName("mcp__files__lookup") != "mcp__files__lookup" || r.wireName("Read") != "Read" {
			t.Fatal("incorrect mapping", prefix)
		}
		server, short := r.sdkToolName("lookup")
		if server != want || short != "lookup" {
			t.Fatal("wrong SDK registration")
		}
		r.Tools = []Tool{{Name: "lookup"}}
		if clientToolName(r, r.wireName("lookup")) != "lookup" {
			t.Fatal("response name not restored")
		}
		r.Tools = append(r.Tools, Tool{Name: "mcp__" + want + "__lookup"})
		if validateToolNames(r) == nil {
			t.Fatal("custom namespace collision accepted")
		}
	}
	for _, invalid := range []string{"two words", "bad__name", "slash/name", strings.Repeat("x", 33)} {
		h := http.Header{}
		h.Set(policyHeader, `{"custom_tool_prefix":"`+invalid+`"}`)
		if _, err := requestPolicy(h); err == nil {
			t.Fatal("accepted invalid prefix", invalid)
		}
	}
}

func TestSplitMCPToolName(t *testing.T) {
	for _, tc := range []struct{ name, server, tool string }{
		{"mcp__files__read", "files", "read"},
		{"mcp__server-1__read__file", "server-1", "read__file"},
		{"mcp__ccgateway__existing", "ccgateway", "existing"},
		{"mcp__s__" + strings.Repeat("x", 56), "s", strings.Repeat("x", 56)},
	} {
		s, name, ok := splitMCPToolName(tc.name)
		if !ok || s != tc.server || name != tc.tool {
			t.Fatalf("split %q: %q %q %v", tc.name, s, name, ok)
		}
	}
	for _, name := range []string{"read", "mcp__", "mcp__s", "mcp__s__", "mcp____read", "MCP__s__read", "mcp__s__bad/name", "mcp__s__" + strings.Repeat("x", 57)} {
		if s, tool, ok := splitMCPToolName(name); ok || s != "" || tool != "" {
			t.Fatalf("accepted incomplete/invalid MCP name %q", name)
		}
	}
}

func TestToolWireNamesPreserveQualifiedHistory(t *testing.T) {
	r := &Request{Native: map[string]bool{"Read": true}}
	for name, want := range map[string]string{
		"Read": "Read", "custom": "mcp__ccgateway__custom",
		"mcp__files__read": "mcp__files__read",
		"mcp__incomplete":  "mcp__ccgateway__mcp__incomplete",
	} {
		m := Message{"assistant", []Object{{"type": "tool_use", "id": "one", "name": name, "input": Object{}}}}
		mapped := r.wireMessage(m)
		if got := str(mapped.Content[0], "name"); got != want {
			t.Fatalf("wire history %q = %q, want %q", name, got, want)
		}
		if str(m.Content[0], "name") != name {
			t.Fatal("client history mutated")
		}
	}
}

func TestToolWireNameCollision(t *testing.T) {
	for _, names := range [][]string{{"foo", "mcp__ccgateway__foo"}, {"mcp__ccgateway__foo", "foo"}} {
		v := basic()
		v["tools"] = []Object{
			{"name": names[0], "input_schema": Object{"type": "object"}},
			{"name": names[1], "input_schema": Object{"type": "object"}},
		}
		b, err := json.Marshal(v)
		if err != nil {
			t.Fatal(err)
		}
		r, err := parseRequest(b)
		if err != nil {
			t.Fatal(err)
		}
		if err = validateToolNames(r); err == nil || !strings.Contains(err.Error(), "same upstream name") {
			t.Fatalf("wire collision not rejected for %v: %v", names, err)
		}
	}
	v := basic()
	v["tools"] = []Object{
		{"name": "foo", "input_schema": Object{"type": "object"}},
		{"name": "mcp__ccgateway__bar", "input_schema": Object{"type": "object"}},
		{"name": "mcp__files__foo", "input_schema": Object{"type": "object"}},
	}
	if err := validateToolNames(parsed(t, v)); err != nil {
		t.Fatal(err)
	}
	r := &Request{Tools: []Tool{{Name: "Read"}, {Name: "mcp__ccgateway__Read"}}, Native: map[string]bool{"Read": true}}
	if err := validateToolNames(r); err != nil {
		t.Fatalf("native selection caused false collision: %v", err)
	}
	r.Native = nil
	if err := validateToolNames(r); err == nil {
		t.Fatal("custom Read collision accepted")
	}
}
