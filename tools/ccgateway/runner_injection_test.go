package main

import (
	"strings"
	"testing"
)

// TestModelNameParameterInjection verifies that model names starting with "-"
// do not inject extra CLI arguments. The fix uses --model=<value> format.
func TestModelNameParameterInjection(t *testing.T) {
	cases := []struct {
		model string
		want  string
	}{
		{"claude-opus-5-5", "--model=claude-opus-5-5"},
		{"-malicious-flag", "--model=-malicious-flag"},
		{"--verbose", "--model=--verbose"},
		{"-p", "--model=-p"},
		{"normal-model-name", "--model=normal-model-name"},
	}
	for _, tc := range cases {
		t.Run(tc.model, func(t *testing.T) {
			req := &Request{Model: tc.model, MaxTokens: 64}
			p := &Prepared{SnapshotEnabled: false}
			args := cliArgs(req, p, "/plugin")
			var found bool
			for _, arg := range args {
				if arg == tc.want {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("args=%v\nwant to contain: %s", args, tc.want)
			}
			// Ensure the model value is not a separate argument that could be
			// misinterpreted as a flag
			if strings.HasPrefix(tc.model, "-") {
				for i, arg := range args {
					if i > 0 && args[i-1] == "--model" && arg == tc.model {
						t.Errorf("model %q appears as separate argument after --model, could be interpreted as flag", tc.model)
					}
				}
			}
		})
	}
}
