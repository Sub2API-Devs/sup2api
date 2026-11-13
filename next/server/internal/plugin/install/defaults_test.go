package install

import (
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// Permissions sort in manifest order from 10 on: the first one is not 0,
// which the catalog used to take for "unset".
func TestPermissionDefsSort(t *testing.T) {
	defs := PermissionDefs(&manifest.Manifest{Key: "guard", UserPermissions: []manifest.UserPermission{
		{Key: "stats:read"}, {Key: "rules:manage"}, {Key: "audit:read"},
	}}, nil)
	if len(defs) != 3 || defs[0].Sort != 10 || defs[1].Sort != 20 || defs[2].Sort != 30 {
		t.Fatalf("defs = %+v", defs)
	}
	if defs[0].Key != "plugin.guard:stats:read" || defs[0].Module != "plugin.guard" {
		t.Fatalf("first def = %+v", defs[0])
	}
}

// roleGrants: an explicit NewPermissionRoles entry beats the older
// RoleKeysForNewPermissions, which beats the manifest defaultRoles (admin
// when omitted); PermissionDefs hands them on with qualified inheritFrom.
func TestRoleGrantsPriority(t *testing.T) {
	m := &manifest.Manifest{Key: "growth", UserPermissions: []manifest.UserPermission{
		{Key: "growth:use", DefaultRoles: []string{"user", "admin"}, InheritFrom: []string{"growth:read"}},
		{Key: "growth:stats:read"},
		{Key: "growth:manage", DefaultRoles: []string{"operator"}},
	}}
	cases := []struct {
		name string
		req  ConsentRequest
		want map[string][]string
	}{
		{"manifest", ConsentRequest{}, map[string][]string{"growth:use": {"user", "admin"}, "growth:stats:read": {"admin"}, "growth:manage": {"operator"}}},
		{"legacy", ConsentRequest{RoleKeysForNewPermissions: []string{"ops"}}, map[string][]string{"growth:use": {"ops"}, "growth:stats:read": {"ops"}, "growth:manage": {"ops"}}},
		{"explicit", ConsentRequest{RoleKeysForNewPermissions: []string{"ops"}, NewPermissionRoles: map[string][]string{"growth:use": {"auditor"}, "growth:manage": {}}},
			map[string][]string{"growth:use": {"auditor"}, "growth:stats:read": {"ops"}, "growth:manage": {}}},
	}
	for _, c := range cases {
		got := roleGrants(m, c.req)
		if len(got) != len(c.want) {
			t.Fatalf("%s: %v", c.name, got)
		}
		for k, w := range c.want {
			if !slices.Equal(got[k], w) {
				t.Errorf("%s: %s = %v, want %v", c.name, k, got[k], w)
			}
		}
	}
	defs := PermissionDefs(m, roleGrants(m, ConsentRequest{}))
	if !slices.Equal(defs[0].GrantRoles, []string{"user", "admin"}) || !slices.Equal(defs[0].InheritFrom, []string{"plugin.growth:growth:read"}) {
		t.Fatalf("def = %+v", defs[0])
	}
	if defs := PermissionDefs(m, nil); defs[0].GrantRoles != nil || len(defs[0].InheritFrom) != 1 {
		t.Fatalf("no grants: %+v", defs[0])
	}
}

// NewPermissionRoles names declared permissions only.
func TestDecideRejectsUnknownNewPermissionRoles(t *testing.T) {
	m := &manifest.Manifest{Key: "growth", UserPermissions: []manifest.UserPermission{{Key: "growth:use"}}}
	_, errs := decide(m, ConsentRequest{NewPermissionRoles: map[string][]string{"growth:use": nil, "growth:nope": {"admin"}}}, nil, false)
	if len(errs) != 1 || errs[0].Field != "new_permission_roles.growth:nope" || errs[0].Code != "unknown" {
		t.Fatalf("errs = %+v", errs)
	}
}
