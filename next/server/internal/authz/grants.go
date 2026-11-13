package authz

import (
	"context"
	"maps"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
)

// Grants of a role (CONTRACTS §21): an unscoped key is a role_permissions
// row; a scoped one (account:read:group/12) a role_permission_scopes row of
// the action and the scope. Until the former own-level keys retire (R2b),
// the old row (account:own:read) is the record of an own scope of its
// action: writes keep both (mirrorLegacyOwn), reads take the old row
// (ownShadowed), so cores of the previous version, which read only
// role_permissions, and this one agree during a rolling upgrade.

// grant is a resolved grant: the permission and its scope, "" for every row.
type grant struct {
	key   string // canonical
	id    int64
	scope string
}

// resolvePermissions canonicalizes keys, without duplicates or keys another
// implies (canonicalKeys), and resolves them to grants, dropping removed
// permissions. A key that does not parse, or names
// no permission, is invalid.
func resolvePermissions(ctx context.Context, tx pgx.Tx, keys []string) ([]string, []grant, error) {
	var invalid, unknown []string
	pats := make([]perm.Pattern, 0, len(keys))
	actions := make([]string, 0, len(keys))
	for _, k := range dedupe(keys) {
		if _, err := perm.Parse(k); err != nil {
			invalid = append(invalid, k)
		}
	}
	if len(invalid) > 0 {
		return nil, nil, core.InvalidFields(core.FieldError{Field: "permission_keys", Code: "invalid", Message: "invalid permission keys: " + strings.Join(invalid, ", ")})
	}
	for _, k := range canonicalKeys(keys) {
		p, _ := perm.Parse(k)
		pats = append(pats, p)
		actions = append(actions, string(p.Action))
	}
	type row struct {
		id      int64
		removed bool
	}
	found := map[string]row{}
	rows, err := tx.Query(ctx, `SELECT key, id, status = 'removed' FROM permissions WHERE key = ANY($1)`, actions)
	if err != nil {
		return nil, nil, err
	}
	for rows.Next() {
		var k string
		var r row
		if err := rows.Scan(&k, &r.id, &r.removed); err != nil {
			rows.Close()
			return nil, nil, err
		}
		found[k] = r
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}
	kept := make([]string, 0, len(pats))
	grants := make([]grant, 0, len(pats))
	for _, p := range pats {
		r, ok := found[string(p.Action)]
		switch {
		case !ok:
			unknown = append(unknown, string(p.Key()))
		case !r.removed:
			kept = append(kept, string(p.Key()))
			grants = append(grants, grant{key: string(p.Key()), id: r.id, scope: p.Suffix()})
		}
	}
	if len(unknown) > 0 {
		return nil, nil, core.InvalidFields(core.FieldError{Field: "permission_keys", Code: "unknown", Message: "unknown permissions: " + strings.Join(unknown, ", ")})
	}
	return kept, grants, nil
}

// writeGrants makes grants the role's live grants, its core ones only when
// coreOnly (a reset leaves plugin permissions alone). Grants of removed
// permissions stay: they grant nothing, and revive with the key.
func writeGrants(ctx context.Context, tx pgx.Tx, roleID int64, grants []grant, coreOnly bool) error {
	// Never nil: a NULL array would make "<> ALL" delete nothing.
	ids, scopedIDs, scopes := []int64{}, []int64{}, []string{}
	for _, g := range grants {
		if g.scope == "" {
			ids = append(ids, g.id)
		} else {
			scopedIDs, scopes = append(scopedIDs, g.id), append(scopes, g.scope)
		}
	}
	source := ""
	if coreOnly {
		source = ` AND p.source = 'core'`
	}
	if _, err := tx.Exec(ctx, `DELETE FROM role_permissions rp USING permissions p
WHERE rp.role_id = $1 AND p.id = rp.permission_id AND p.status <> 'removed'`+source+` AND rp.permission_id <> ALL($2)`, roleID, ids); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO role_permissions (role_id, permission_id) SELECT $1, unnest($2::bigint[]) ON CONFLICT DO NOTHING`, roleID, ids); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM role_permission_scopes rs USING permissions p
WHERE rs.role_id = $1 AND p.id = rs.permission_id AND p.status <> 'removed'
  AND (rs.permission_id, rs.scope) NOT IN (SELECT * FROM unnest($2::bigint[], $3::text[]))`, roleID, scopedIDs, scopes); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO role_permission_scopes (role_id, permission_id, scope)
SELECT $1, * FROM unnest($2::bigint[], $3::text[]) ON CONFLICT DO NOTHING`, roleID, scopedIDs, scopes); err != nil {
		return err
	}
	return mirrorLegacyOwn(ctx, tx, roleID)
}

// legacyOwnPairs are the actions with a former own-level key and that key.
var legacyOwnPairs = func() (actions, legacy []string) {
	for _, old := range slices.Sorted(maps.Keys(perm.LegacyOwnKeys())) {
		p, _ := perm.Parse(old)
		actions, legacy = append(actions, string(p.Action)), append(legacy, old)
	}
	return actions, legacy
}

// legacyOwnKeys lists the former own-level keys.
func legacyOwnKeys() []string {
	_, legacy := legacyOwnPairs()
	return legacy
}

// mirrorLegacyOwn gives role roleID the former own-level key of each own
// scope it holds (R2a; see above). A row it has without the scope stays:
// it still grants the scope, as an alias.
func mirrorLegacyOwn(ctx context.Context, tx pgx.Tx, roleID int64) error {
	actions, legacy := legacyOwnPairs()
	_, err := tx.Exec(ctx, `INSERT INTO role_permissions (role_id, permission_id)
SELECT s.role_id, lp.id FROM role_permission_scopes s
JOIN permissions ap ON ap.id = s.permission_id
JOIN unnest($2::text[], $3::text[]) l(action, legacy) ON l.action = ap.key
JOIN permissions lp ON lp.key = l.legacy
WHERE s.role_id = $1 AND s.scope = 'own'
ON CONFLICT DO NOTHING`, roleID, actions, legacy)
	return err
}

// ownShadowed is the condition, on a role_permission_scopes row rs of
// permission p, of an own scope whose former own-level key is still live:
// that key's role_permissions row is then the record of the grant (R2a), so
// a revoke by an older core, which deletes only that row, holds on every
// node. Once the aliases are retired (R2b) the scoped row is the record.
var ownShadowed = func() string {
	actions, legacy := legacyOwnPairs()
	c := "rs.scope = 'own' AND EXISTS (SELECT 1 FROM permissions lp WHERE lp.status <> 'removed' AND lp.key = CASE p.key"
	for i, a := range actions {
		c += " WHEN '" + a + "' THEN '" + legacy[i] + "'"
	}
	return c + " END)"
}()

// roleGrantsJoin joins, to each role r, g.key: the canonical grants of r
// (former own-level rows as they are; PermissionSet.Add reads them as
// aliases; own scopes they shadow left out) whose permission p passes
// status, an SQL condition on p.
func roleGrantsJoin(status string) string {
	return `
LEFT JOIN LATERAL (
    SELECT p.key FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id AND ` + status + ` WHERE rp.role_id = r.id
    UNION ALL
    SELECT p.key || ':' || rs.scope FROM role_permission_scopes rs JOIN permissions p ON p.id = rs.permission_id AND ` + status + `
    WHERE rs.role_id = r.id AND NOT (` + ownShadowed + `)
) g ON true`
}

// canonicalKeys is keys canonical, in order, without duplicates or keys
// another of them implies (account:read:own next to account:read): what a
// role editor shows and saves back.
func canonicalKeys(keys []string) []string {
	set := core.PermissionSetOf(keys...)
	out := make([]string, 0, len(keys))
	for _, k := range keys {
		c, err := perm.Canonical(k)
		if err != nil || slices.Contains(out, string(c)) || impliedByOther(set, c) {
			continue
		}
		out = append(out, string(c))
	}
	return out
}

// impliedByOther reports whether set holds a key other than k implying k.
func impliedByOther(set core.PermissionSet, k perm.Key) bool {
	p, _ := perm.Parse(string(k))
	if p.Scope.All {
		return false
	}
	if _, ok := set.Keys[string(p.Action)]; ok {
		return true
	}
	for _, sc := range set.Scoped[p.Action] {
		if sc != p.Scope && perm.Implies(perm.Pattern{Action: p.Action, Scope: sc}, p) {
			return true
		}
	}
	return false
}

// notImplied returns the keys of want that have does not imply, in order:
// what a write adds beyond what a role already grants.
func notImplied(want, have []string) []string {
	set := core.PermissionSetOf(have...)
	return slices.DeleteFunc(slices.Clone(want), set.Has)
}
