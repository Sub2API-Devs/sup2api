package manifest

import (
	"slices"
	"testing"
)

func TestPermissionKey(t *testing.T) {
	cases := []struct{ name, local, want string }{
		{"local", "orders:read", "plugin.shop:orders:read"},
		{"own prefix", "plugin.shop:orders:read", "plugin.shop:orders:read"},
		{"other plugin prefix", "plugin.blog:posts:read", "plugin.shop:plugin.blog:posts:read"},
		{"empty", "", ""},
		{"own prefix only", "plugin.shop:", ""},
	}
	for _, c := range cases {
		if got := PermissionKey("shop", c.local); got != c.want {
			t.Errorf("%s: PermissionKey(shop, %q) = %q, want %q", c.name, c.local, got, c.want)
		}
	}
}

func TestPermissionModule(t *testing.T) {
	if got := PermissionModule("shop"); got != "plugin.shop" {
		t.Fatalf("PermissionModule(shop) = %q", got)
	}
}

func TestLocalPermission(t *testing.T) {
	cases := []struct {
		name, key, want string
		ok              bool
	}{
		{"own", "plugin.shop:orders:read", "orders:read", true},
		{"other plugin", "plugin.blog:posts:read", "", false},
		{"plugin key prefix of another", "plugin.shopx:orders:read", "", false},
		{"core", "user:read", "", false},
		{"bare local", "orders:read", "", false},
		{"empty local", "plugin.shop:", "", false},
		{"empty", "", "", false},
	}
	for _, c := range cases {
		got, ok := LocalPermission("shop", c.key)
		if ok != c.ok || (ok && got != c.want) {
			t.Errorf("%s: LocalPermission(shop, %q) = %q, %v, want %q, %v", c.name, c.key, got, ok, c.want, c.ok)
		}
	}
}

func TestUserPermissionRoles(t *testing.T) {
	if got := (UserPermission{}).Roles(); !slices.Equal(got, []string{"admin"}) {
		t.Fatalf("default roles %v", got)
	}
	up := UserPermission{DefaultRoles: []string{"user", "admin"}}
	got := up.Roles()
	got[0] = "x"
	if up.DefaultRoles[0] != "user" {
		t.Fatal("Roles aliases DefaultRoles")
	}
	if slices.Contains(BuiltinRoleKeys, "super_admin") {
		t.Fatal("super_admin is never a default role")
	}
}
