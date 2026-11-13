package core

import (
	"context"
	"errors"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
	"reflect"
	"slices"
	"testing"
)

func TestPermissionSetMissing(t *testing.T) {
	super := PermissionSet{Superuser: true}
	plain := PermissionSetOf("user:read", "role:manage")
	superWant := PermissionSet{Superuser: true, Keys: map[string]struct{}{"user:read": {}}}
	roles := func(keys ...string) map[string]struct{} { return PermissionSetOf(keys...).Keys }
	assigner := PermissionSet{Keys: roles("user:read"), Assignable: roles("user", "custom")}
	wildcard := PermissionSet{Keys: roles("user:read"), Assignable: roles("user", "custom"), AssignCustom: true}
	tests := []struct {
		name string
		have PermissionSet
		want PermissionSet
		miss Missing
	}{
		{"superuser covers a superuser", super, superWant, Missing{}},
		{"superuser covers any key", super, PermissionSetOf("user:delete"), Missing{}},
		{"plain misses the superuser flag", plain, superWant, Missing{Superuser: true}},
		{"plain misses the flag and keys", plain, PermissionSet{Superuser: true, Keys: roles("x:b", "x:a")}, Missing{Superuser: true, Keys: []string{"x:a", "x:b"}}},
		{"plain covers its subset", plain, PermissionSetOf("user:read"), Missing{}},
		{"plain misses other keys", plain, PermissionSetOf("user:read", "user:delete"), Missing{Keys: []string{"user:delete"}}},
		{"nothing wanted", plain, PermissionSet{}, Missing{}},
		// An access key narrows a superuser to plain keys (Restrict).
		{"restricted superuser misses the flag", super.Restrict([]string{"role:manage"}), superWant, Missing{Superuser: true, Keys: []string{"user:read"}}},
		{"restricted superuser covers its keys", super.Restrict([]string{"role:manage"}), PermissionSetOf("role:manage"), Missing{}},
		// Assignable roles: compared apart from keys.
		{"assigner covers its roles", assigner, PermissionSet{Assignable: roles("user")}, Missing{}},
		{"assigner misses other roles", assigner, PermissionSet{Keys: roles("user:read"), Assignable: roles("user", "admin", "operator")}, Missing{Assign: []string{"admin", "operator"}}},
		{"assigner misses every custom role", assigner, PermissionSet{Assignable: roles("custom"), AssignCustom: true}, Missing{AssignCustom: true}},
		{"wildcard covers every custom role", wildcard, PermissionSet{Assignable: roles("custom"), AssignCustom: true}, Missing{}},
		{"superuser covers any role", super, PermissionSet{Assignable: roles("admin"), AssignCustom: true}, Missing{}},
		// Restrict keeps no role, so an access key misses any.
		{"restricted wildcard misses roles", wildcard.Restrict([]string{"user:read"}), wildcard, Missing{Assign: []string{"custom", "user"}, AssignCustom: true}},
		{"restricted superuser misses roles", super.Restrict(nil), PermissionSet{Assignable: roles("user")}, Missing{Assign: []string{"user"}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := tt.have.Missing(tt.want)
			if !reflect.DeepEqual(m, tt.miss) {
				t.Fatalf("Missing = %+v, want %+v", m, tt.miss)
			}
			if m.Empty() != reflect.DeepEqual(tt.miss, Missing{}) {
				t.Fatalf("Empty = %v for %+v", m.Empty(), m)
			}
		})
	}
}

func TestPermissionSetCanAssign(t *testing.T) {
	set := PermissionSet{Assignable: map[string]struct{}{"user": {}}}
	if !set.CanAssign("user") || set.CanAssign("admin") {
		t.Fatalf("CanAssign: user %v, admin %v", set.CanAssign("user"), set.CanAssign("admin"))
	}
	if !(PermissionSet{Superuser: true}).CanAssign("admin") {
		t.Fatal("a superuser cannot assign admin")
	}
	if (PermissionSet{Superuser: true}).Restrict([]string{"role:assign"}).CanAssign("user") {
		t.Fatal("an access key can assign a role")
	}
}

func TestMissingDetails(t *testing.T) {
	d := Missing{Superuser: true}.Details()
	if keys, ok := d["missing"].([]string); !ok || keys == nil || len(keys) != 0 || d["superuser"] != true {
		t.Fatalf("details = %#v", d)
	}
	d = Missing{Assign: []string{"admin"}, AssignCustom: true}.Details()
	if roles, ok := d["missing_assignable"].([]string); !ok || !slices.Equal(roles, []string{"admin"}) || d["missing_assign_custom"] != true || len(d["missing"].([]string)) != 0 {
		t.Fatalf("details = %#v", d)
	}
}

// guardFunc adapts a function to UserGuard.
type guardFunc func(actorID int64, targetIDs ...int64) error

func (f guardFunc) CanActOnUsers(_ context.Context, actorID int64, _ UserAction, targetIDs ...int64) error {
	return f(actorID, targetIDs...)
}

func TestGuardOrDeny(t *testing.T) {
	if err := GuardOrDeny(nil).CanActOnUsers(context.Background(), 0, ActOnData); !errors.Is(err, ErrInternal) {
		t.Fatalf("nil guard: %v", err)
	}
	g := guardFunc(func(int64, ...int64) error { return nil })
	if err := GuardOrDeny(g).CanActOnUsers(context.Background(), 1, ActOnIdentity, 2); err != nil {
		t.Fatalf("wired guard: %v", err)
	}
}

// accessFunc is an AccountAccess answering from a function.
type accessFunc func(ids []int64) (bool, []int64, error)

func (f accessFunc) AccountsInScope(_ context.Context, _ int64, _ string, ids []int64) (bool, []int64, error) {
	return f(ids)
}

func TestAuthorizeAccounts(t *testing.T) {
	all := accessFunc(func([]int64) (bool, []int64, error) { return true, nil, nil })
	own := accessFunc(func([]int64) (bool, []int64, error) { return false, []int64{1, 2}, nil })
	none := accessFunc(func([]int64) (bool, []int64, error) { return false, nil, AccountsDenied("update") })
	tests := []struct {
		name string
		aa   AccountAccess
		ids  []int64
		code string // "" = allowed
	}{
		{"all scope", all, []int64{9}, ""},
		{"all scope without ids", all, nil, ""},
		{"own scope, every id in scope", own, []int64{2, 1, 2}, ""},
		{"own scope, one id outside", own, []int64{1, 3}, "not_found"},
		{"own scope without ids", own, nil, "permission_denied"},
		{"no key", none, []int64{1}, "permission_denied"},
	}
	for _, tt := range tests {
		err := AuthorizeAccounts(context.Background(), tt.aa, 7, "update", tt.ids)
		if got := codeOf(err); got != tt.code {
			t.Errorf("%s: code = %q, want %q (%v)", tt.name, got, tt.code, err)
		}
		if tt.code == "permission_denied" && AsError(err).Details["permission"] != "account:update" {
			t.Errorf("%s: details = %v", tt.name, AsError(err).Details)
		}
	}
}

func codeOf(err error) string {
	if err == nil {
		return ""
	}
	return AsError(err).Code
}

// Has asks whether the set implies a key (CONTRACTS §21): an unscoped key
// asks for every row, so a holder of account:read:own does not have
// account:read; the former own-level spelling reads as its scope.
func TestPermissionSetScoped(t *testing.T) {
	t.Parallel()
	own := PermissionSetOf("account:own:read", "account:update:group/12", "proxy:read")
	for k, want := range map[string]bool{
		"account:read":                      false,
		"account:read:own":                  true,
		"account:own:read":                  true,
		"account:read:*":                    false,
		"account:update:group/12":           true,
		"account:update:group/12/account/5": true,
		"account:update:account/5":          false,
		"account:update:group/13":           false,
		"proxy:read:proxy/3":                true,
		"proxy:read":                        true,
		"account:update:group/x":            false,
		"account:delete:own":                false,
	} {
		if got := own.Has(k); got != want {
			t.Errorf("Has(%s) = %v", k, got)
		}
	}
	for a, want := range map[perm.Key]bool{perm.AccountRead: true, perm.AccountUpdate: true, perm.ProxyRead: true, perm.AccountDelete: false} {
		if own.HasAction(a) != want {
			t.Errorf("HasAction(%s) != %v", a, want)
		}
	}
	if got := own.KeyList(); !slices.Equal(got, []string{"account:read:own", "account:update:group/12", "proxy:read"}) {
		t.Fatalf("KeyList = %v", got)
	}
	if s := own.DataScope(7, perm.AccountUpdate); s.All || !slices.Equal(s.Groups, []int64{12}) {
		t.Fatalf("DataScope = %+v", s)
	}
	if s := own.DataScope(7, perm.ProxyRead); !s.All {
		t.Fatalf("proxy scope = %+v", s)
	}
	if m := own.Missing(PermissionSetOf("account:update:group/12/account/9", "account:update:account/9", "account:read")); !slices.Equal(m.Keys, []string{"account:read", "account:update:account/9"}) {
		t.Fatalf("Missing = %v", m.Keys)
	}
}

// An access key keeps, per action, the narrower of its key and the user's
// scopes; scopes neither implies are dropped (no intersection).
func TestRestrictScoped(t *testing.T) {
	t.Parallel()
	user := PermissionSetOf("account:read:own", "account:update:group/12", "account:delete", "proxy:read:own")
	for _, tc := range []struct {
		key  []string
		want []string
	}{
		{[]string{"account:read"}, []string{"account:read:own"}},
		{[]string{"account:own:read"}, []string{"account:read:own"}},
		{[]string{"account:update"}, []string{"account:update:group/12"}},
		{[]string{"account:update:group/12/account/5"}, []string{"account:update:group/12/account/5"}},
		{[]string{"account:update:own"}, nil},
		{[]string{"account:update:group/*"}, []string{"account:update:group/12"}},
		{[]string{"account:delete:group/3", "proxy:read"}, []string{"account:delete:group/3", "proxy:read:own"}},
		{[]string{"account:test", "bogus:key:own"}, nil},
	} {
		got := user.Restrict(tc.key).KeyList()
		if len(got) == 0 {
			got = nil
		}
		if !slices.Equal(got, tc.want) {
			t.Errorf("Restrict(%v) = %v, want %v", tc.key, got, tc.want)
		}
	}
	super := PermissionSet{Superuser: true}
	if got := super.Restrict([]string{"account:update:group/3"}); got.Superuser || !slices.Equal(got.KeyList(), []string{"account:update:group/3"}) {
		t.Fatalf("superuser restrict = %+v", got)
	}
}

// ScopeGroups lists the groups named by group scopes of any action, once,
// sorted; group/*, own, row ids and unscoped keys name none.
func TestScopeGroups(t *testing.T) {
	t.Parallel()
	set := PermissionSetOf("account:read:group/12", "account:update:group/3/account/5", "proxy:read:own",
		"account:test:group/*", "account:delete:account/9", "account:create:group/12", "user:read")
	if got := set.ScopeGroups(); !slices.Equal(got, []int64{3, 12}) {
		t.Fatalf("ScopeGroups = %v", got)
	}
	if got := PermissionSetOf("account:read", "proxy:read:own").ScopeGroups(); len(got) != 0 {
		t.Fatalf("no group scope: %v", got)
	}
}
