package features

import (
	"encoding/json"
	"testing"
)

func injection(t *testing.T, raw string) *BuildInjection {
	t.Helper()
	var p *BuildInjection
	if err := json.Unmarshal([]byte(raw), &p); err != nil {
		t.Fatal(err)
	}
	return p
}

// A child layer overrides the system prompt and each attachment and tool on
// its own; only what is added remains, listed in Claude Code's order.
func TestBuildInjectionLayersAndEffectiveForm(t *testing.T) {
	global := injection(t, `{"system_prompt":true,"attachments":{"date":true,"environment":true}}`)
	group := injection(t, `{"tools":{"Read":true,"Agent":true}}`)
	account := injection(t, `{"attachments":{"date":false},"tools":{"Agent":false}}`)
	merged := global.Merge(group).Merge(account)
	out, _ := json.Marshal(merged.Effective())
	if string(out) != `{"system_prompt":true,"attachments":{"environment":true},"tools":{"Read":true}}` {
		t.Fatalf("effective %s", out)
	}
	prompt, attachments, tools := global.Merge(group).Added()
	if !prompt || len(attachments) != 2 || attachments[0] != "environment" || attachments[1] != "date" || len(tools) != 2 || tools[0] != "Read" || tools[1] != "Agent" {
		t.Fatalf("added %v %v %v", prompt, attachments, tools)
	}
	if injection(t, `{"system_prompt":false,"attachments":{"date":false}}`).Effective() != nil || (*BuildInjection)(nil).Effective() != nil {
		t.Fatal("nothing added must be nil")
	}
	if merged.Attachments["date"] || !global.Attachments["date"] {
		t.Fatal("merge must not change the parent")
	}
	for _, raw := range []string{`{"attachments":{"skills":true}}`, `{"tools":{"Glob":true}}`} {
		if injection(t, raw).Validate() == nil {
			t.Fatalf("%s accepted", raw)
		}
	}
}
