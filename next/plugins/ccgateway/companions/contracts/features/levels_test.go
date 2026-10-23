package features

import (
	"encoding/json"
	"testing"
)

// Each level includes the ones before it; none is direct.
func TestRequestLevelsIncludeTheLayersBelow(t *testing.T) {
	for _, c := range []struct {
		level                       string
		relay                       string
		identity, environment, high bool
	}{
		{LevelNone, "direct", false, false, false},
		{LevelMicro, "build", true, false, false},
		{LevelLow, "build", true, true, false},
		{LevelHigh, "build", true, true, true},
		{"", "build", true, true, false},
	} {
		if RelayModeForLevel(c.level) != c.relay || LevelHasIdentity(c.level) != c.identity || LevelHasEnvironment(c.level) != c.environment || LevelHasPromptAndTools(c.level) != c.high {
			t.Fatalf("level %q", c.level)
		}
	}
	if ValidateRequestLevel("medium") == nil || ValidateRequestLevel("") != nil || ValidateRequestLevel(LevelHigh) != nil {
		t.Fatal("level validation")
	}
}

// A level adds its layers at their defaults; a choice turns one off, and
// choices above the level are not sent.
func TestLevelInjectionDefaultsAndChoices(t *testing.T) {
	marshal := func(p *BuildInjection) string { out, _ := json.Marshal(p); return string(out) }
	if LevelInjection(LevelMicro, injection(t, `{"system_prompt":true}`)) != nil || LevelInjection(LevelNone, nil) != nil {
		t.Fatal("micro and none add nothing")
	}
	if got := marshal(LevelInjection(LevelLow, injection(t, `{"attachments":{"date":false},"system_prompt":true,"tools":{"Read":true}}`))); got != `{"attachments":{"environment":true,"model":true,"total_tokens":true}}` {
		t.Fatalf("low %s", got)
	}
	if got := marshal(LevelInjection(LevelHigh, injection(t, `{"tools":{"Bash":false,"Agent":true}}`))); got != `{"system_prompt":true,"attachments":{"date":true,"environment":true,"model":true,"total_tokens":true},"tools":{"Agent":true,"Edit":true,"Read":true,"Write":true}}` {
		t.Fatalf("high %s", got)
	}
	if LevelInjection(LevelLow, injection(t, `{"attachments":{"environment":false,"model":false,"total_tokens":false,"date":false}}`)) != nil {
		t.Fatal("all off adds nothing")
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
