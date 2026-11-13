package install

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// Permissions sort in manifest order from 10 on: the first one is not 0,
// which the catalog used to take for "unset".
func TestPermissionDefsSort(t *testing.T) {
	defs := PermissionDefs(&manifest.Manifest{Key: "guard", UserPermissions: []manifest.UserPermission{
		{Key: "stats:read"}, {Key: "rules:manage"}, {Key: "audit:read"},
	}})
	if len(defs) != 3 || defs[0].Sort != 10 || defs[1].Sort != 20 || defs[2].Sort != 30 {
		t.Fatalf("defs = %+v", defs)
	}
	if defs[0].Key != "plugin.guard:stats:read" || defs[0].Module != "plugin.guard" {
		t.Fatalf("first def = %+v", defs[0])
	}
}
