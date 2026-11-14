package account

import (
	"context"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestAccountsInScope(t *testing.T) {
	authz := fakeAuthz{keys: map[int64][]string{}}
	e := setupWith(t, authz)
	ctx := context.Background()
	admin := e.uid
	alice, bob, nobody := e.addUser("alice@x.com"), e.addUser("bob@x.com"), e.addUser("none@x.com")
	authz.keys[admin], authz.keys[alice], authz.keys[bob] = adminKeys, supplierKeys, supplierKeys
	id := func(uid int64, name string) int64 { return int64(e.createAs(uid, name, nil)["id"].(float64)) }
	a1, a2, gone, b1 := id(alice, "a1"), id(alice, "a2"), id(alice, "gone"), id(bob, "b1")
	e.exec1(`UPDATE accounts SET deleted_at = now() WHERE id = $1 RETURNING id`, gone)

	for _, action := range []string{"read", "update", "test"} {
		all, allowed, err := e.svc.AccountsInScope(ctx, alice, action, []int64{b1, a2, gone, a1, a2, 999999})
		if err != nil || all || !slices.Equal(allowed, []int64{a2, a1}) {
			t.Fatalf("%s own: (%v, %v, %v), want (false, [%d %d], nil)", action, all, allowed, err, a2, a1)
		}
		if all, allowed, err := e.svc.AccountsInScope(ctx, alice, action, nil); err != nil || all || len(allowed) != 0 {
			t.Fatalf("%s own, no ids: (%v, %v, %v)", action, all, allowed, err)
		}
		if all, allowed, err := e.svc.AccountsInScope(ctx, admin, action, []int64{b1, gone}); err != nil || !all || allowed != nil {
			t.Fatalf("%s all: (%v, %v, %v)", action, all, allowed, err)
		}
		_, _, err = e.svc.AccountsInScope(ctx, nobody, action, []int64{a1})
		if ce := core.AsError(err); ce.Code != "permission_denied" || ce.Details["permission"] != "account:"+action {
			t.Fatalf("%s no key: %v %v", action, err, ce.Details)
		}
	}

	if _, _, err := e.svc.AccountsInScope(ctx, admin, "delete", []int64{a1}); core.AsError(err).Code != "invalid_argument" {
		t.Fatalf("unknown action: %v", err)
	}
	// The strict form over the real implementation.
	if err := core.AuthorizeAccounts(ctx, e.svc, alice, "update", []int64{a1, a2, a1}); err != nil {
		t.Fatalf("own ids: %v", err)
	}
	if err := core.AuthorizeAccounts(ctx, e.svc, alice, "update", []int64{a1, b1}); core.AsError(err).Code != "not_found" {
		t.Fatalf("another's id: %v", err)
	}
}
