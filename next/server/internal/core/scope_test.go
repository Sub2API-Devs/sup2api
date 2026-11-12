package core

import (
	"context"
	"errors"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
)

// fakeAuthorizer answers Can from a fixed key set for user 7.
type fakeAuthorizer struct {
	keys map[string]bool
	err  error
}

func (f fakeAuthorizer) Can(_ context.Context, uid int64, k string) (bool, error) {
	return uid == 7 && f.keys[k], f.err
}
func (fakeAuthorizer) PermissionSet(context.Context, int64) (PermissionSet, error) {
	return PermissionSet{}, nil
}
func (fakeAuthorizer) CanGrant(context.Context, int64, []string) error { return nil }
func (fakeAuthorizer) CanActOn(context.Context, int64, []string) error { return nil }

func holding(keys ...string) fakeAuthorizer {
	m := map[string]bool{}
	for _, k := range keys {
		m[k] = true
	}
	return fakeAuthorizer{keys: m}
}

var proxyVisible = perm.Scoped{All: []perm.Key{"proxy:read"}, Own: []perm.Key{"proxy:own:read", "proxy:own:manage"}}

func TestCan(t *testing.T) {
	user := WithUserID(context.Background(), 7)
	tests := []struct {
		name string
		ctx  context.Context
		az   Authorizer
		want bool
	}{
		{"held", user, holding("x:a"), true},
		{"not held", user, holding("x:b"), false},
		{"nil authorizer", user, nil, false},
		{"error", user, fakeAuthorizer{keys: map[string]bool{"x:a": true}, err: errors.New("boom")}, false},
		{"no caller", context.Background(), holding("x:a"), false},
	}
	for _, tt := range tests {
		if got := Can(tt.ctx, tt.az, "x:a"); got != tt.want {
			t.Errorf("%s: Can = %v, want %v", tt.name, got, tt.want)
		}
	}
}

func TestHasGranted(t *testing.T) {
	ctx := WithGranted(context.Background(), []string{"x:a", "x:b"})
	if !HasGranted(ctx, "x:b") || HasGranted(ctx, "x:c") || HasGranted(context.Background(), "x:a") {
		t.Fatal("HasGranted does not follow Granted")
	}
}

func TestOwnerScopeOf(t *testing.T) {
	s := perm.Pair("x:read", "x:own:read").OrAll("settings:manage")
	user := WithUserID(context.Background(), 7)
	for _, all := range []string{"x:read", "settings:manage"} {
		if got := OwnerScopeOf(WithGranted(user, []string{all, "x:own:read"}), s); got != nil {
			t.Errorf("granted %s: scope = %v, want nil", all, *got)
		}
	}
	got := OwnerScopeOf(WithGranted(user, []string{"x:own:read"}), s)
	if got == nil || *got != 7 {
		t.Fatalf("own only: scope = %v, want &7", got)
	}
}

func TestScopeOf(t *testing.T) {
	user := WithUserID(context.Background(), 7)
	tests := []struct {
		name   string
		az     Authorizer
		scope  *int64
		wantOK bool
	}{
		{"all", holding("proxy:read", "proxy:own:read"), nil, true},
		{"own", holding("proxy:own:manage"), i64(7), true},
		{"none", holding("account:read"), nil, false},
		{"nil authorizer", nil, nil, false},
	}
	for _, tt := range tests {
		scope, ok := ScopeOf(user, tt.az, proxyVisible)
		if ok != tt.wantOK || !samePtr(scope, tt.scope) {
			t.Errorf("%s: ScopeOf = (%v, %v), want (%v, %v)", tt.name, scope, ok, tt.scope, tt.wantOK)
		}
	}
}

func TestAllows(t *testing.T) {
	seven, eight := i64(7), i64(8)
	tests := []struct {
		name             string
		scope, createdBy *int64
		want             bool
	}{
		{"nil scope reaches own rows", nil, seven, true},
		{"nil scope reaches ownerless rows", nil, nil, true},
		{"own scope reaches own rows", seven, i64(7), true},
		{"own scope misses others' rows", seven, eight, false},
		{"own scope misses ownerless rows", seven, nil, false},
	}
	for _, tt := range tests {
		if got := Allows(tt.scope, tt.createdBy); got != tt.want {
			t.Errorf("%s: Allows = %v, want %v", tt.name, got, tt.want)
		}
	}
}

func samePtr(a, b *int64) bool { return (a == nil) == (b == nil) && (a == nil || *a == *b) }

func i64(v int64) *int64 { return &v }
