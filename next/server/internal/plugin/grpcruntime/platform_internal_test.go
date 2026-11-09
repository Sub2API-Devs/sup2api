package grpcruntime

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// A process serves platform.adapter.v1 only for what the core does not
// serve from upstream declarations: its own platforms, or account types
// without a declaration or extending one.
func TestServesPlatform(t *testing.T) {
	declared := manifest.AccountType{ID: "d", Upstream: &manifest.Upstream{Preset: "anthropic"}}
	for name, tc := range map[string]struct {
		m    manifest.Manifest
		want bool
	}{
		"all types declared":    {manifest.Manifest{AccountTypes: []manifest.AccountType{declared}}, false},
		"a code type":           {manifest.Manifest{AccountTypes: []manifest.AccountType{declared, {ID: "c"}}}, true},
		"an extended type":      {manifest.Manifest{AccountTypes: []manifest.AccountType{{ID: "e", Upstream: &manifest.Upstream{Preset: "openai", Extend: true}}}}, true},
		"a platform of its own": {manifest.Manifest{Platforms: []manifest.Platform{{ID: "p"}}, AccountTypes: []manifest.AccountType{declared}}, true},
	} {
		if got := servesPlatform(&tc.m); got != tc.want {
			t.Errorf("%s: servesPlatform = %v, want %v", name, got, tc.want)
		}
	}
}
