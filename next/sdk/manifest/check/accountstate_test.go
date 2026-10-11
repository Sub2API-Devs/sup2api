package check

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func TestAutomaticStatePermissionIsOwnOnly(t *testing.T) {
	for _, tc := range []struct {
		scope map[string]any
		valid bool
	}{
		{map[string]any{"types": "own"}, true},
		{nil, false},
		{map[string]any{"types": "all"}, false},
		{map[string]any{"types": "own", "other": true}, false},
	} {
		v := &validator{m: &manifest.Manifest{HostPermissions: []manifest.HostPermission{{ID: "accounts.auto_state", Scope: tc.scope}}}, perms: map[string]*manifest.HostPermission{}}
		v.hostPermissions()
		if (len(v.errs) == 0) != tc.valid {
			t.Fatalf("scope %v: %v", tc.scope, v.errs)
		}
	}
}
