package core

import "testing"

func TestGroupModelPolicy(t *testing.T) {
	for _, tc := range []struct {
		mode  string
		list  []string
		model string
		want  bool
	}{
		{"", []string{"claude-*"}, "claude-opus-5-5", true},
		{"whitelist", []string{"claude-haiku-*"}, "claude-opus-5-5", false},
		{"blacklist", []string{"claude-opus-*"}, "claude-opus-5-5", false},
		{"blacklist", []string{"claude-opus-*"}, "claude-sonnet-4-6", true},
		{"blacklist", []string{"*"}, "gpt-5", false},
		{"whitelist", []string{"gpt-?"}, "gpt-5", true},
		{"whitelist", []string{"gpt-?"}, "gpt-55", false},
		{"whitelist", nil, "anything", true},
		{"blacklist", nil, "anything", true},
		{"invalid", nil, "anything", false},
	} {
		g := GroupInfo{ModelFilterMode: tc.mode, ModelAllowlist: tc.list}
		if got := g.AllowsModel(tc.model); got != tc.want {
			t.Errorf("%s %v %s: %v", tc.mode, tc.list, tc.model, got)
		}
	}
}
