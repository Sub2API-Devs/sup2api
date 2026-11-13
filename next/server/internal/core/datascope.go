package core

import (
	"cmp"
	"slices"
	"strconv"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
)

// DataScope is the rows one caller reaches with one action: the union of
// the scopes of its patterns (perm.Pattern), compiled for SQL and memory
// checks (CONTRACTS §21). The zero value reaches nothing. Group membership
// is never compiled in: a group range is checked against account_groups as
// it is now, so binding or unbinding an account takes effect at once.
type DataScope struct {
	All    bool
	Owner  int64   // own: rows created by Owner; 0 = none
	Groups []int64 // group/G; 0 = group/* (bound to any group)
	IDs    []int64 // account/X or proxy/X
	PairG  []int64 // group/G/account/X: G, 0 for group/*; PairID holds X
	PairID []int64
}

// AllScope reaches every row (a superuser, an unscoped grant).
var AllScope = DataScope{All: true}

// Compile is the DataScope of uid holding scopes, sorted and without
// duplicates, so equal inputs give equal scopes.
func Compile(uid int64, scopes []perm.Scope) DataScope {
	var s DataScope
	type pair struct{ g, x int64 }
	var pairs []pair
	for _, sc := range scopes {
		switch {
		case sc.All:
			return AllScope
		case sc.Own:
			s.Owner = uid
		case sc.Group != 0 && sc.ID != 0:
			pairs = append(pairs, pair{max(sc.Group, 0), sc.ID})
		case sc.Group != 0:
			s.Groups = append(s.Groups, max(sc.Group, 0))
		default:
			s.IDs = append(s.IDs, sc.ID)
		}
	}
	s.Groups = sortedSet(s.Groups)
	s.IDs = sortedSet(s.IDs)
	slices.SortFunc(pairs, func(a, b pair) int {
		return cmp.Or(cmp.Compare(a.g, b.g), cmp.Compare(a.x, b.x))
	})
	for _, p := range slices.Compact(pairs) {
		s.PairG = append(s.PairG, p.g)
		s.PairID = append(s.PairID, p.x)
	}
	return s
}

func sortedSet(ids []int64) []int64 {
	slices.Sort(ids)
	return slices.Compact(ids)
}

// Union is what s and o reach together (both of the same caller).
func (s DataScope) Union(o DataScope) DataScope {
	if s.All || o.All {
		return AllScope
	}
	type pair struct{ g, x int64 }
	u := DataScope{Owner: max(s.Owner, o.Owner), Groups: sortedSet(slices.Concat(s.Groups, o.Groups)), IDs: sortedSet(slices.Concat(s.IDs, o.IDs))}
	var pairs []pair
	for i := range s.PairID {
		pairs = append(pairs, pair{s.PairG[i], s.PairID[i]})
	}
	for i := range o.PairID {
		pairs = append(pairs, pair{o.PairG[i], o.PairID[i]})
	}
	slices.SortFunc(pairs, func(a, b pair) int { return cmp.Or(cmp.Compare(a.g, b.g), cmp.Compare(a.x, b.x)) })
	for _, p := range slices.Compact(pairs) {
		u.PairG, u.PairID = append(u.PairG, p.g), append(u.PairID, p.x)
	}
	return u
}

// Empty reports whether s reaches no row.
func (s DataScope) Empty() bool {
	return !s.All && s.Owner == 0 && len(s.Groups) == 0 && len(s.IDs) == 0 && len(s.PairID) == 0
}

// Restricted reports whether s is short of every row: the restricted tier,
// which keeps every limit of the former own level (administrator lock,
// guarded settings, private proxies, relay accounts…).
func (s DataScope) Restricted() bool { return !s.All }

// Grouped reports whether s has a part that depends on group membership.
func (s DataScope) Grouped() bool { return len(s.Groups) > 0 || len(s.PairID) > 0 }

// HasGroup reports whether s reaches every account bound to group g
// (group/g or group/*).
func (s DataScope) HasGroup(g int64) bool {
	return s.All || slices.Contains(s.Groups, 0) || slices.Contains(s.Groups, g)
}

// AllowsRow reports whether the row id, created by createdBy and bound to
// groups (its current account_groups; nil for proxies), is in s.
func (s DataScope) AllowsRow(id int64, createdBy *int64, groups []int64) bool {
	switch {
	case s.All, s.Owner != 0 && createdBy != nil && *createdBy == s.Owner, slices.Contains(s.IDs, id):
		return true
	case len(groups) == 0:
		return false
	case slices.Contains(s.Groups, 0) || slices.ContainsFunc(groups, func(g int64) bool { return slices.Contains(s.Groups, g) }):
		return true
	}
	for i, x := range s.PairID {
		if x == id && (s.PairG[i] == 0 || slices.Contains(groups, s.PairG[i])) {
			return true
		}
	}
	return false
}

// ScopeTable is how a DataScope reads a table: its row id and creator
// columns, and whether its rows belong to groups (account_groups).
type ScopeTable struct {
	ID, Owner string
	Grouped   bool
}

var (
	// AccountRows is accounts aliased a.
	AccountRows = ScopeTable{ID: "a.id", Owner: "a.created_by", Grouped: true}
	// ProxyRows is proxies aliased p.
	ProxyRows = ScopeTable{ID: "p.id", Owner: "p.created_by"}
)

// Cond is the predicate of t with ? placeholders, one per Args value, for
// store.Filter.And. It is never NULL (a NULL creator is no match), so it
// also reads right under NOT or as a selected flag; an Owner of 0 matches
// no row, creators being user ids. Its text does not depend on the scope, so the plan of
// a query is reused whatever ids the scope holds.
func (t ScopeTable) Cond() string {
	c := "(?::boolean OR COALESCE(" + t.Owner + " = ?::bigint, false) OR " + t.ID + " = ANY(?::bigint[])"
	if t.Grouped {
		// group/* is a flag of its own so that the group ids reach
		// account_groups_group_idx (an "= 0 OR =" join would not).
		c += " OR EXISTS (SELECT 1 FROM account_groups ag WHERE ag.account_id = " + t.ID + " AND (?::boolean OR ag.group_id = ANY(?::bigint[])))" +
			" OR EXISTS (SELECT 1 FROM account_groups ag JOIN unnest(?::bigint[], ?::bigint[]) sp(g, x) ON sp.x = ag.account_id AND (sp.g = 0 OR sp.g = ag.group_id) WHERE ag.account_id = " + t.ID + ")"
	}
	return c + ")"
}

// SQL is Cond numbered from $first: Args(s) are $first, $first+1, ….
func (t ScopeTable) SQL(first int) string {
	parts := strings.Split(t.Cond(), "?")
	var b strings.Builder
	for i, p := range parts {
		if i > 0 {
			b.WriteString("$" + strconv.Itoa(first+i-1))
		}
		b.WriteString(p)
	}
	return b.String()
}

// Args are the values of t's placeholders for s.
func (t ScopeTable) Args(s DataScope) []any {
	ids := func(v []int64) []int64 {
		if v == nil {
			return []int64{}
		}
		return v
	}
	args := []any{s.All, s.Owner, ids(s.IDs)}
	if t.Grouped {
		anyGroup := slices.Contains(s.Groups, 0)
		groups := slices.DeleteFunc(slices.Clone(ids(s.Groups)), func(g int64) bool { return g == 0 })
		args = append(args, anyGroup, groups, ids(s.PairG), ids(s.PairID))
	}
	return args
}
