package features

import (
	"strings"
	"testing"
)

func TestValidToolsUsed(t *testing.T) {
	for _, value := range []string{
		`[]`,
		`[{"name":"Bash"}]`,
		`[{"name":"mcp__github__create_issue"},{"name":"web_search"},{"name":"Bash"},{"name":"Agent"}]`,
		`[{"name":"docs:search"}]`,
		`[{"name":"unreadable-tools-used-before-summary"},{"name":"Read"}]`,
		`[{"name":"mcp__c__t","url":"https://example.com/mcp","directory_entry":"c","unresolved":true}]`,
	} {
		if !ValidToolsUsed(value) {
			t.Errorf("refused %s", value)
		}
	}
	tooMany := "[" + strings.TrimSuffix(strings.Repeat(`{"name":"t"},`, MaxToolsUsedItems+1), ",") + "]"
	for _, value := range []string{
		``, `null`, `{}`, `"Bash"`, `["Bash"]`, `[{}]`, `[{"name":""}]`, `[{"name":"bad name"}]`,
		`[{"name":"Bash","extra":1}]`, `[{"name":"Bash","unresolved":false}]`, `[{"name":"Bash","url":1}]`,
		`[{"name":"Bash"}] []`, tooMany, "[" + strings.Repeat(" ", MaxToolsUsedHeaderBytes) + "]",
	} {
		if ValidToolsUsed(value) {
			t.Errorf("accepted %q", value)
		}
	}
}

func TestToolsUsedNames(t *testing.T) {
	got := ToolsUsedNames(`[{"name":"unreadable-tools-used-before-summary"},{"name":"Read"},{"name":"Bash"}]`)
	if strings.Join(got, ",") != "Read,Bash" {
		t.Fatalf("names %v", got)
	}
	if got := ToolsUsedNames(`[{"name":"unreadable-tools-used-before-summary"}]`); len(got) != 1 {
		t.Fatalf("a lone stand-in is a name: %v", got)
	}
	if ToolsUsedNames(`["Bash"]`) != nil {
		t.Fatal("invalid value has no names")
	}
}
