package features

import (
	"encoding/json"
	"slices"
	"testing"
)

// Each level includes the ones before it; none is direct. The system prompt
// is a choice from low (off without a choice there, on at high), the tools
// high's only (2026-11-02).
func TestRequestLevelsIncludeTheLayersBelow(t *testing.T) {
	for _, c := range []struct {
		level                                string
		relay                                string
		identity, environment, prompt, tools bool
	}{
		{LevelNone, "direct", false, false, false, false},
		{LevelMicro, "build", true, false, false, false},
		{LevelLow, "build", true, true, true, false},
		{LevelHigh, "build", true, true, true, true},
		{"", "build", true, true, true, false},
	} {
		if RelayModeForLevel(c.level) != c.relay || LevelHasIdentity(c.level) != c.identity || LevelHasEnvironment(c.level) != c.environment ||
			LevelHasPrompt(c.level) != c.prompt || LevelHasTools(c.level) != c.tools {
			t.Fatalf("level %q", c.level)
		}
	}
	if ValidateRequestLevel("medium") == nil || ValidateRequestLevel("") != nil || ValidateRequestLevel(LevelHigh) != nil {
		t.Fatal("level validation")
	}
}

// A level adds its layers at their defaults; a choice turns one on or off,
// and choices above the level are not sent: low adds the system prompt only
// when it is chosen and never a tool; high adds the prompt unless it is
// turned off.
func TestLevelInjectionDefaultsAndChoices(t *testing.T) {
	marshal := func(p *BuildInjection) string { out, _ := json.Marshal(p); return string(out) }
	if LevelInjection(LevelMicro, injection(t, `{"system_prompt":true}`)) != nil || LevelInjection(LevelNone, injection(t, `{"system_prompt":true}`)) != nil {
		t.Fatal("micro and none add nothing")
	}
	for _, c := range []struct{ level, configured, want string }{
		{LevelLow, `null`, `{"attachments":{"date":true,"environment":true,"model":true,"total_tokens":true}}`},
		{LevelLow, `{"attachments":{"date":false},"system_prompt":true,"tools":{"Read":true}}`, `{"system_prompt":true,"attachments":{"environment":true,"model":true,"total_tokens":true}}`},
		{LevelLow, `{"system_prompt":false,"tools":{"Bash":true}}`, `{"attachments":{"date":true,"environment":true,"model":true,"total_tokens":true}}`},
		{"", `{"system_prompt":true,"attachments":{"environment":false,"model":false,"total_tokens":false,"date":false}}`, `{"system_prompt":true}`},
		{LevelLow, `{"attachments":{"environment":false,"model":false,"total_tokens":false,"date":false}}`, `null`},
		{LevelHigh, `{"tools":{"Bash":false,"Agent":true}}`, `{"system_prompt":true,"attachments":{"date":true,"environment":true,"model":true,"total_tokens":true},"tools":{"Agent":true,"Edit":true,"Read":true,"Write":true}}`},
		{LevelHigh, `{"system_prompt":false,"tools":{"Skill":true,"ToolSearch":false}}`, `{"attachments":{"date":true,"environment":true,"model":true,"total_tokens":true},"tools":{"Bash":true,"Edit":true,"Read":true,"Skill":true,"Write":true}}`},
	} {
		if got := marshal(LevelInjection(c.level, injection(t, c.configured))); got != c.want {
			t.Fatalf("%q %s: %s", c.level, c.configured, got)
		}
	}
}

// levelInjectionBefore is LevelInjection as it was before 2026-11-02: the
// system prompt, like the tools, only at high.
func levelInjectionBefore(level string, configured *BuildInjection) *BuildInjection {
	if !LevelHasEnvironment(level) {
		return nil
	}
	out := &BuildInjection{Attachments: map[string]bool{}}
	for _, name := range InjectionAttachments {
		out.Attachments[name] = true
	}
	if LevelHasTools(level) {
		on := true
		out.SystemPrompt = &on
		out.Tools = map[string]bool{}
		for _, name := range DefaultInjectionTools {
			out.Tools[name] = true
		}
	}
	if configured != nil {
		for name, on := range configured.Attachments {
			out.Attachments[name] = on
		}
		if LevelHasTools(level) {
			if configured.SystemPrompt != nil {
				value := *configured.SystemPrompt
				out.SystemPrompt = &value
			}
			for name, on := range configured.Tools {
				out.Tools[name] = on
			}
		}
	}
	return out.Effective()
}

// Offering the prompt at low (2026-11-02) changes what a policy adds only
// when it resolves to low with system_prompt explicitly true (it then adds
// the prompt, still no tool); every other combination of level, prompt
// choice, attachments and tools adds what it added before.
func TestPromptAtLowChangesOnlyAnExplicitTrueAtLow(t *testing.T) {
	marshal := func(p *BuildInjection) string { out, _ := json.Marshal(p); return string(out) }
	on, off := true, false
	attachments := []map[string]bool{nil, {"date": false}, {"environment": false, "model": false, "total_tokens": false, "date": false}, {"model": true}}
	tools := []map[string]bool{nil, {"Bash": false}, {"Agent": true}, {"Read": false, "Edit": false, "Write": false, "Bash": false}}
	changed := 0
	for _, level := range append([]string{""}, RequestLevels...) {
		if got := marshal(LevelInjection(level, nil)); got != marshal(levelInjectionBefore(level, nil)) {
			t.Fatalf("%q without a stored injection: %s", level, got)
		}
		for _, prompt := range []*bool{nil, &off, &on} {
			for _, a := range attachments {
				for _, tl := range tools {
					configured := &BuildInjection{SystemPrompt: prompt, Attachments: a, Tools: tl}
					before, after := levelInjectionBefore(level, configured), LevelInjection(level, configured)
					if LevelHasPrompt(level) && !LevelHasTools(level) && prompt == &on {
						// What it added before, plus the prompt.
						changed++
						want := &BuildInjection{SystemPrompt: &on}
						if before != nil {
							want.Attachments = before.Attachments
						}
						if marshal(after) != marshal(want) {
							t.Fatalf("%q %s: %s -> %s", level, marshal(configured), marshal(before), marshal(after))
						}
						continue
					}
					if marshal(before) != marshal(after) {
						t.Fatalf("%q %s changed: %s -> %s", level, marshal(configured), marshal(before), marshal(after))
					}
				}
			}
		}
	}
	if changed == 0 {
		t.Fatal("no explicit true at low was tried")
	}
}

// The tools official Claude Code 2.1.316 sends on a session's first turn are
// all candidates (2026-11-02 user), but high still adds only Bash, Read, Edit
// and Write without a choice, so no stored policy adds a tool it did not add
// (2026-11-02 user: "改动不要影响现在的服务"); the new ones are off unless
// chosen. A name outside the candidates, such as the deferred placeholder, is
// refused.
func TestToolCandidatesCoverTheOfficialFirstTurn(t *testing.T) {
	official := []string{"Agent", "Bash", "Edit", "ListAgents", "Read", "ReportFindings", "ScheduleWakeup", "Skill", "ToolSearch", "Workflow", "Write"}
	for _, name := range official {
		if !slices.Contains(InjectionTools[:len(official)], name) {
			t.Fatalf("%s is not among the first-turn candidates %v", name, InjectionTools)
		}
	}
	if !slices.Equal(InjectionTools[len(official):], []string{"WebSearch", "NotebookEdit"}) {
		t.Fatalf("candidates %v", InjectionTools)
	}
	_, _, added := LevelInjection(LevelHigh, nil).Added()
	if !slices.Equal(added, []string{"Bash", "Read", "Edit", "Write"}) {
		t.Fatalf("high adds %v", added)
	}
	for _, name := range InjectionTools {
		if (&BuildInjection{Tools: map[string]bool{name: true}}).Validate() != nil {
			t.Fatalf("%s refused", name)
		}
	}
	if (&BuildInjection{Tools: map[string]bool{"DeferredToolPlaceholder": true}}).Validate() == nil {
		t.Fatal("the placeholder is not a choice")
	}
}

// A CLI without build_injection_tools_v2 is sent the injection without the
// new tools; everything else it adds stays.
func TestWithoutToolsV2KeepsTheRest(t *testing.T) {
	marshal := func(p *BuildInjection) string { out, _ := json.Marshal(p); return string(out) }
	p := injection(t, `{"system_prompt":true,"attachments":{"date":true},"tools":{"Bash":true,"Skill":true,"ToolSearch":true,"Workflow":false,"WebSearch":true}}`)
	before := marshal(p)
	if !p.UsesToolsV2() || injection(t, `{"tools":{"Skill":false,"Bash":true}}`).UsesToolsV2() || (*BuildInjection)(nil).UsesToolsV2() {
		t.Fatal("UsesToolsV2")
	}
	if got := marshal(p.WithoutToolsV2()); got != `{"system_prompt":true,"attachments":{"date":true},"tools":{"Bash":true,"WebSearch":true}}` {
		t.Fatalf("without %s", got)
	}
	if marshal(p) != before {
		t.Fatal("p changed")
	}
	if injection(t, `{"tools":{"ListAgents":true,"ReportFindings":true}}`).WithoutToolsV2() != nil || (*BuildInjection)(nil).WithoutToolsV2() != nil {
		t.Fatal("nothing left must be nil")
	}
}

func TestLegacyPoliciesMapToALevel(t *testing.T) {
	for _, c := range []struct {
		relay       string
		attachments BuildAttachmentSources
		injection   string
		want        string
	}{
		{"direct", BuildAttachmentSources{"platform_name": "worker"}, `{"tools":{"Read":true}}`, LevelNone},
		{"build", nil, `null`, LevelMicro},
		{"build", BuildAttachmentSources{"platform_name": "client"}, `{"system_prompt":false}`, LevelMicro},
		{"build", BuildAttachmentSources{"platform_name": "worker"}, `null`, LevelLow},
		{"", nil, `{"attachments":{"date":true}}`, LevelLow},
		{"build", nil, `{"system_prompt":true}`, LevelHigh},
		{"build", nil, `{"tools":{"Read":true}}`, LevelHigh},
	} {
		if got := LegacyLevel(c.relay, c.attachments, injection(t, c.injection)); got != c.want {
			t.Fatalf("%+v: %s", c, got)
		}
	}
}
