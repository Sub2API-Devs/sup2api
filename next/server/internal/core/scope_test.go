package core

import (
	"context"
	"errors"
	"reflect"
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

func holding(keys ...string) fakeAuthorizer {
	m := map[string]bool{}
	for _, k := range keys {
		m[k] = true
	}
	return fakeAuthorizer{keys: m}
}

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

// setAuthorizer answers from a fixed PermissionSet.
type setAuthorizer struct{ set PermissionSet }

func (a setAuthorizer) Can(_ context.Context, _ int64, k string) (bool, error) {
	return a.set.Has(k), nil
}
func (a setAuthorizer) PermissionSet(context.Context, int64) (PermissionSet, error) {
	return a.set, nil
}
func (setAuthorizer) CanGrant(context.Context, int64, []string) error { return nil }

// An account writer references every proxy with the account action for
// every row, otherwise the proxies of its proxy:read and proxy:manage
// scopes together (CONTRACTS §21.4).
func TestProxyRefScope(t *testing.T) {
	ctx := WithUserID(context.Background(), 7)
	for _, tc := range []struct {
		keys []string
		want DataScope
	}{
		{[]string{"account:create"}, AllScope},
		{[]string{"account:create:own", "proxy:read"}, AllScope},
		{[]string{"account:create:own", "proxy:read:own", "proxy:manage:proxy/5", "proxy:read:proxy/3"}, DataScope{Owner: 7, IDs: []int64{3, 5}}},
		{[]string{"account:create:group/2"}, DataScope{}},
	} {
		got, err := ProxyRefScope(ctx, setAuthorizer{PermissionSetOf(tc.keys...)}, perm.AccountCreate)
		if err != nil || !reflect.DeepEqual(got, tc.want) {
			t.Errorf("%v: %+v %v, want %+v", tc.keys, got, err, tc.want)
		}
	}
}
