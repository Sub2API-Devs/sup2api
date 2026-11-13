package core

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// Kinds of rows a scoped grant names (ClearScopeGrants).
const (
	ScopeRefAccount = "account"
	ScopeRefGroup   = "group"
	ScopeRefProxy   = "proxy"
)

// scopeRefPatterns match the scopes naming a row of kind (CONTRACTS §21.0):
// account/X and group/G/account/X; group/G and group/G/account/X; proxy/X.
var scopeRefPatterns = map[string]string{
	ScopeRefAccount: `(^|/)account/%d$`,
	ScopeRefGroup:   `^group/%d(/|$)`,
	ScopeRefProxy:   `^proxy/%d$`,
}

// ClearScopeGrants deletes, inside tx, the scoped grants that name the
// deleted rows ids of kind, audited as authz.scope.clear by actorID (0 =
// the system) per role, and moves the authz version when any went. A grant
// naming a deleted row reaches nothing anyway; clearing it keeps roles
// readable and a reused id from being reached.
func ClearScopeGrants(ctx context.Context, tx pgx.Tx, actorID int64, kind string, ids []int64) error {
	pattern, ok := scopeRefPatterns[kind]
	if !ok {
		return fmt.Errorf("core: unknown scope reference kind %q", kind)
	}
	if len(ids) == 0 {
		return nil
	}
	patterns := make([]string, len(ids))
	for i, id := range ids {
		patterns[i] = fmt.Sprintf(pattern, id)
	}
	var actor *int64
	if actorID > 0 {
		actor = &actorID
	}
	// The authz lock first, as every authz write takes it (a role save in
	// flight would otherwise deadlock with this delete), and only when
	// there is something to clear, so that deletes do not queue behind it.
	var found bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM role_permission_scopes WHERE scope ~ ANY($1))`, patterns).Scan(&found); err != nil || !found {
		return err
	}
	if _, err := tx.Exec(ctx, `SELECT 1 FROM authz_meta WHERE id = 1 FOR UPDATE`); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `WITH cleared AS (
    DELETE FROM role_permission_scopes rs USING permissions p
    WHERE p.id = rs.permission_id AND rs.scope ~ ANY($1)
    RETURNING rs.role_id, p.key || ':' || rs.scope AS key
), audited AS (
    INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
    SELECT $2, 'authz.scope.clear', 'role', role_id::text,
        jsonb_build_object('kind', $3::text, 'ids', to_jsonb($4::bigint[]), 'keys', to_jsonb(array_agg(key ORDER BY key)))
    FROM cleared GROUP BY role_id
)
UPDATE authz_meta SET version = version + 1 WHERE id = 1 AND EXISTS (SELECT 1 FROM cleared)`, patterns, actor, kind, ids)
	return err
}
