package core

import (
	"reflect"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
)

func scopesOf(t *testing.T, keys ...string) []perm.Scope {
	t.Helper()
	var out []perm.Scope
	for _, k := range keys {
		p, err := perm.Parse(k)
		if err != nil {
			t.Fatalf("%s: %v", k, err)
		}
		out = append(out, p.Scope)
	}
	return out
}

func TestCompile(t *testing.T) {
	t.Parallel()
	got := Compile(7, scopesOf(t,
		"account:read:group/12", "account:read:account/5", "account:read:own", "account:read:group/*/account/9",
		"account:read:group/3/account/9", "account:read:group/12", "account:read:account/2", "account:read:group/*"))
	want := DataScope{Owner: 7, Groups: []int64{0, 12}, IDs: []int64{2, 5}, PairG: []int64{0, 3}, PairID: []int64{9, 9}}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("Compile = %+v, want %+v", got, want)
	}
	if !got.Restricted() || got.Empty() || !got.Grouped() {
		t.Fatal("flags")
	}
	if all := Compile(7, scopesOf(t, "account:read:own", "account:read")); !reflect.DeepEqual(all, AllScope) || all.Restricted() {
		t.Fatalf("all = %+v", all)
	}
	if none := Compile(7, nil); !none.Empty() || !none.Restricted() {
		t.Fatalf("none = %+v", none)
	}
	if own := Compile(7, scopesOf(t, "account:read:own")); own.Grouped() || own.Owner != 7 {
		t.Fatalf("own = %+v", own)
	}
}

func TestAllowsRow(t *testing.T) {
	t.Parallel()
	me, other := int64(7), int64(8)
	cases := []struct {
		keys    []string
		id      int64
		creator *int64
		groups  []int64
		want    bool
	}{
		{[]string{"account:read"}, 1, nil, nil, true},
		{[]string{"account:read:own"}, 1, &me, nil, true},
		{[]string{"account:read:own"}, 1, &other, nil, false},
		{[]string{"account:read:own"}, 1, nil, nil, false},
		{[]string{"account:read:account/1"}, 1, nil, nil, true},
		{[]string{"account:read:account/1"}, 2, nil, []int64{1}, false},
		{[]string{"account:read:group/12"}, 1, nil, []int64{3, 12}, true},
		{[]string{"account:read:group/12"}, 1, nil, []int64{3}, false},
		{[]string{"account:read:group/*"}, 1, nil, []int64{3}, true},
		{[]string{"account:read:group/*"}, 1, nil, nil, false},
		{[]string{"account:read:group/12/account/1"}, 1, nil, []int64{12}, true},
		{[]string{"account:read:group/12/account/1"}, 1, nil, []int64{13}, false},
		{[]string{"account:read:group/12/account/1"}, 2, nil, []int64{12}, false},
		{[]string{"account:read:group/*/account/1"}, 1, nil, []int64{13}, true},
		{[]string{"account:read:group/*/account/1"}, 1, nil, nil, false},
		{nil, 1, &me, []int64{1}, false},
	}
	for _, c := range cases {
		if got := Compile(me, scopesOf(t, c.keys...)).AllowsRow(c.id, c.creator, c.groups); got != c.want {
			t.Errorf("%v row %d by %v in %v: %v, want %v", c.keys, c.id, c.creator, c.groups, got, c.want)
		}
	}
}

// The predicate text is fixed per table (one plan whatever the ids) and
// numbered from the given placeholder.
func TestScopeTableSQL(t *testing.T) {
	t.Parallel()
	if got, want := ProxyRows.SQL(2), "($2::boolean OR COALESCE(p.created_by = $3::bigint, false) OR p.id = ANY($4::bigint[]))"; got != want {
		t.Fatalf("proxy SQL = %s", got)
	}
	want := "($3::boolean OR COALESCE(a.created_by = $4::bigint, false) OR a.id = ANY($5::bigint[])" +
		" OR EXISTS (SELECT 1 FROM account_groups ag WHERE ag.account_id = a.id AND ($6::boolean OR ag.group_id = ANY($7::bigint[])))" +
		" OR EXISTS (SELECT 1 FROM account_groups ag JOIN unnest($8::bigint[], $9::bigint[]) sp(g, x) ON sp.x = ag.account_id AND (sp.g = 0 OR sp.g = ag.group_id) WHERE ag.account_id = a.id))"
	if got := AccountRows.SQL(3); got != want {
		t.Fatalf("account SQL =\n%s\nwant\n%s", got, want)
	}
	if args := AccountRows.Args(DataScope{Groups: []int64{0, 12}}); len(args) != 7 || args[3] != true || len(args[4].([]int64)) != 1 {
		t.Fatalf("account args = %#v", args)
	}
	if args := ProxyRows.Args(DataScope{}); len(args) != 3 || args[2] == nil {
		t.Fatalf("proxy args = %#v", args)
	}
}
