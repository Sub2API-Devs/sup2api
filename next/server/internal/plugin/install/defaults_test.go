package install

import (
	"fmt"
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
// RoleKeysForNewPermissions, which beats a rename (inherit only), which
// beats the manifest defaultRoles (admin when omitted, none for []);
// PermissionDefs hands them on with inheritFrom.
func TestRoleGrantsPriority(t *testing.T) {
	m := &manifest.Manifest{Key: "growth", UserPermissions: []manifest.UserPermission{
		{Key: "growth:use", DefaultRoles: []string{"user", "admin"}, InheritFrom: []string{"growth:read"}},
		{Key: "growth:stats:read"},
		{Key: "growth:manage", DefaultRoles: []string{"operator"}},
		{Key: "growth:quiet", DefaultRoles: []string{}},
	}}
	cases := []struct {
		name     string
		req      ConsentRequest
		want     map[string][]string
		existing map[string]bool
	}{
		{"manifest", ConsentRequest{}, map[string][]string{"growth:use": {"user", "admin"}, "growth:stats:read": {"admin"}, "growth:manage": {"operator"}, "growth:quiet": {}}, nil},
		// growth:use inherits growth:read, which the catalog has: a rename
		// keeps the old holders only.
		{"rename", ConsentRequest{}, map[string][]string{"growth:use": {}, "growth:stats:read": {"admin"}, "growth:manage": {"operator"}, "growth:quiet": {}},
			map[string]bool{"plugin.growth:growth:read": true}},
		{"legacy", ConsentRequest{RoleKeysForNewPermissions: []string{"ops"}}, map[string][]string{"growth:use": {"ops"}, "growth:stats:read": {"ops"}, "growth:manage": {"ops"}, "growth:quiet": {"ops"}},
			map[string]bool{"plugin.growth:growth:read": true}},
		{"explicit", ConsentRequest{RoleKeysForNewPermissions: []string{"ops"}, NewPermissionRoles: map[string][]string{"growth:use": {"auditor"}, "growth:manage": {}}},
			map[string][]string{"growth:use": {"auditor"}, "growth:stats:read": {"ops"}, "growth:manage": {}, "growth:quiet": {"ops"}}, nil},
		{"explicit beats rename", ConsentRequest{NewPermissionRoles: map[string][]string{"growth:use": {"auditor"}}},
			map[string][]string{"growth:use": {"auditor"}, "growth:stats:read": {"admin"}, "growth:manage": {"operator"}, "growth:quiet": {}},
			map[string]bool{"plugin.growth:growth:read": true}},
	}
	for _, c := range cases {
		got := roleGrants(m, c.req, c.existing)
		if len(got) != len(c.want) {
			t.Fatalf("%s: %v", c.name, got)
		}
		for k, w := range c.want {
			if !slices.Equal(got[k], w) {
				t.Errorf("%s: %s = %v, want %v", c.name, k, got[k], w)
			}
		}
	}
	defs := PermissionDefs(m, roleGrants(m, ConsentRequest{}, nil))
	if !slices.Equal(defs[0].GrantRoles, []string{"user", "admin"}) || !slices.Equal(defs[0].InheritFrom, []string{"growth:read"}) {
		t.Fatalf("def = %+v", defs[0])
	}
	// Activation (nil) grants nothing, inheritance included.
	if defs := PermissionDefs(m, nil); defs[0].GrantRoles != nil || defs[0].InheritFrom != nil {
		t.Fatalf("no grants: %+v", defs[0])
	}
	if defs := PermissionDefs(m, map[string][]string{}); defs[0].GrantRoles != nil || len(defs[0].InheritFrom) != 1 {
		t.Fatalf("no roles: %+v", defs[0])
	}
}

// NewPermissionRoles names declared permissions only.
func TestDecideRejectsUnknownNewPermissionRoles(t *testing.T) {
	m := &manifest.Manifest{Key: "growth", UserPermissions: []manifest.UserPermission{{Key: "growth:use"}}}
	_, errs := decide(m, ConsentRequest{NewPermissionRoles: map[string][]string{"growth:use": nil, "growth:nope": {"admin"}}}, nil, nil, false)
	if len(errs) != 1 || errs[0].Field != "new_permission_roles.growth:nope" || errs[0].Code != "unknown" {
		t.Fatalf("errs = %+v", errs)
	}
}

// On an upgrade a grant the current one covers is carried, named again or
// not; one wider than the current grant, or on a first install, is new.
func TestDecideCarriesCoveredGrants(t *testing.T) {
	m := &manifest.Manifest{Key: "demo", HostPermissions: []manifest.HostPermission{
		{ID: "ui.native"}, {ID: "accounts.credentials"},
		{ID: "events", Scope: map[string]any{"subscribe": []any{"a", "b"}}},
	}}
	current := map[string]Grant{
		"ui.native":            {Status: GrantGranted},
		"accounts.credentials": {Status: GrantGranted},
		"events":               {Status: GrantGranted, Scope: map[string]any{"subscribe": []any{"a"}}},
	}
	req := ConsentRequest{Grants: []GrantInput{{Permission: "ui.native"}, {Permission: "events"}}}
	carried := func(ds []decision) map[string]bool {
		out := map[string]bool{}
		for _, d := range ds {
			out[d.permission] = d.carried
		}
		return out
	}
	ds, errs := decide(m, req, current, nil, true)
	if len(errs) != 0 || fmt.Sprint(carried(ds)) != "map[accounts.credentials:true events:false ui.native:true]" {
		t.Fatalf("upgrade: %v %+v", carried(ds), errs)
	}
	req.Grants = append(req.Grants, GrantInput{Permission: "accounts.credentials"})
	if ds, _ := decide(m, req, current, nil, false); fmt.Sprint(carried(ds)) != "map[accounts.credentials:false events:false ui.native:false]" {
		t.Fatalf("first install: %v", carried(ds))
	}
}
