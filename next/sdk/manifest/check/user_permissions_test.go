package check

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// defaultRoles names built-in roles only; inheritFrom names local keys
// other than the permission's own (old keys need not be declared).
func TestUserPermissionDefaultRolesAndInheritFrom(t *testing.T) {
	m := minimal()
	m.UserPermissions = []manifest.UserPermission{
		{Key: "x:use", Label: manifest.LocalizedText{"en": "Use"}, DefaultRoles: []string{"user", "supplier", "operator", "admin"}, InheritFrom: []string{"x:read"}},
		{Key: "x:manage", Label: manifest.LocalizedText{"en": "Manage"}, DefaultRoles: []string{"super_admin", "admin", "custom"}, InheritFrom: []string{"x:manage", "Bad Key", "x:use"}},
	}
	got := codes(Validate(m, nil, ValidateOptions{Tooling: true}))
	want := map[string]string{
		"userPermissions[1].defaultRoles[0]": "invalid_value",
		"userPermissions[1].defaultRoles[2]": "invalid_value",
		"userPermissions[1].inheritFrom[0]":  "invalid_value",
		"userPermissions[1].inheritFrom[1]":  "invalid_value",
	}
	for f, c := range want {
		if got[f] != c {
			t.Errorf("%s: got %q, want %q (all %v)", f, got[f], c, got)
		}
	}
	for f := range got {
		if _, ok := want[f]; !ok && len(f) > 15 && f[:15] == "userPermissions" {
			t.Errorf("unexpected %s %s", f, got[f])
		}
	}
}
