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

// A key ending in :own would read as a scope in the core (CONTRACTS §21.0).
func TestUserPermissionKeyNotAScope(t *testing.T) {
	m := minimal()
	m.UserPermissions = []manifest.UserPermission{
		{Key: "reset:own", Label: manifest.LocalizedText{"en": "Reset"}},
		{Key: "own:reset", Label: manifest.LocalizedText{"en": "Reset"}, InheritFrom: []string{"reset:own"}},
	}
	got := codes(Validate(m, nil, ValidateOptions{Tooling: true}))
	if got["userPermissions[0].key"] != "invalid_format" || got["userPermissions[1].inheritFrom[0]"] != "invalid_value" || got["userPermissions[1].key"] != "" {
		t.Fatalf("codes = %v", got)
	}
}
