package install

import (
	"context"
	"errors"
	"maps"
	"slices"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Role grants of an upgrade (DECISIONS "插件升级授权" C): a version may hand
// the permissions it creates to roles through defaultRoles and inheritFrom.
// An upgrade doing so is approved without anyone only when every such grant
// is of a non-sensitive permission to the built-in admin, operator or
// supplier role (autoGrantRoles); otherwise someone decides on the consent
// page, and only one who may name every role a grant needing consent goes
// to (checkRolesGrantable), as confirming withheld grants needs. Built-in plugins upgrade with the core and are approved by
// the system all the same (node readiness needs it), so their grants that
// need consent are withheld and listed for review instead.

// autoGrantRoles are the built-in roles an upgrade may hand non-sensitive
// new permissions without consent.
var autoGrantRoles = []string{"admin", "operator", "supplier"}

// Audit actions of upgrade role grants.
const (
	AuditConsentAuto       = "plugin.consent.auto"
	AuditRoleGrantsConfirm = "plugin.role_grants.confirm"
	AuditRoleGrantsReject  = "plugin.role_grants.reject"
)

// errRoleGrantsNeedConsent stops an automatic consent whose role grants
// need someone's decision; the version stays awaiting consent.
var errRoleGrantsNeedConsent = errors.New("the version's role grants need consent")

// RoleGrant is one role a permission created by a consent goes to.
type RoleGrant struct {
	// Version is the plugin version whose consent withheld the grant (the
	// review list only).
	Version string `json:"version,omitempty"`
	// Permission is the qualified permission key.
	Permission string `json:"permission"`
	Role       string `json:"role"`
	Sensitive  bool   `json:"sensitive"`
	// Via is "default" (defaultRoles) or "inherit" (a holder of an
	// inheritFrom key).
	Via          string `json:"via"`
	NeedsConsent bool   `json:"needs_consent"`
}

// planRoleGrants lists the role grants a consent with roles (roleGrants) makes:
// for every userPermission the catalog does not have yet (existing), its
// roles and the roles holding one of its inheritFrom keys now (authz
// SyncPlugin only inherits grants made before it). Super admin roles hold
// every permission and are left out.
func planRoleGrants(ctx context.Context, q store.Querier, m *manifest.Manifest, existing map[string]bool, roles map[string][]string) ([]RoleGrant, error) {
	var from []string
	for _, up := range m.UserPermissions {
		for _, k := range up.InheritFrom {
			if key := manifest.PermissionKey(m.Key, k); existing[key] {
				from = append(from, key)
			}
		}
	}
	holders, err := inheritHolders(ctx, q, from)
	if err != nil {
		return nil, err
	}
	var out []RoleGrant
	add := func(up manifest.UserPermission, role string, builtin bool, via string) {
		key := manifest.PermissionKey(m.Key, up.Key)
		if slices.ContainsFunc(out, func(g RoleGrant) bool { return g.Permission == key && g.Role == role }) {
			return
		}
		out = append(out, RoleGrant{Permission: key, Role: role, Sensitive: up.Sensitive, Via: via,
			NeedsConsent: up.Sensitive || !builtin || !slices.Contains(autoGrantRoles, role)})
	}
	for _, up := range m.UserPermissions {
		if existing[manifest.PermissionKey(m.Key, up.Key)] {
			continue
		}
		for _, role := range roles[up.Key] {
			// Manifest defaults name built-in roles only (manifest
			// BuiltinRoleKeys). An operator's override may name custom
			// roles: marked built-in here, they need consent all the same,
			// no custom role being one of autoGrantRoles.
			add(up, role, true, "default")
		}
		for _, k := range up.InheritFrom {
			for _, h := range holders[manifest.PermissionKey(m.Key, k)] {
				add(up, h.key, h.builtin, "inherit")
			}
		}
	}
	return out, nil
}

type roleRef struct {
	key     string
	builtin bool
}

// inheritHolders maps each permission key of keys to the roles holding it,
// super admin roles aside.
func inheritHolders(ctx context.Context, q store.Querier, keys []string) (map[string][]roleRef, error) {
	out := map[string][]roleRef{}
	if len(keys) == 0 {
		return out, nil
	}
	rows, err := q.Query(ctx, `SELECT p.key, r.key, r.builtin FROM role_permissions rp
		JOIN permissions p ON p.id = rp.permission_id JOIN roles r ON r.id = rp.role_id
		WHERE p.key = ANY($1) AND NOT r.superuser ORDER BY p.key, r.key`, keys)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var key string
		var r roleRef
		if err := rows.Scan(&key, &r.key, &r.builtin); err != nil {
			return nil, err
		}
		out[key] = append(out[key], r)
	}
	return out, rows.Err()
}

// needConsent reports whether any grant of gs needs consent.
func needConsent(gs []RoleGrant) bool {
	return slices.ContainsFunc(gs, func(g RoleGrant) bool { return g.NeedsConsent })
}

// consentRoles lists the roles of the grants of gs that need consent.
func consentRoles(gs []RoleGrant) []string {
	var out []string
	for _, g := range gs {
		if g.NeedsConsent {
			out = append(out, g.Role)
		}
	}
	return out
}

// withholdGrants splits plan into the grants made now and the ones withheld
// for review (pending: the system's consent; none needs consent otherwise),
// and returns the manifest and roles the consent syncs with: every
// permission created now goes to exactly its planned roles that need no
// consent, by name, and inherits nothing, so that what is granted is what
// was planned (inheritance resolved now cannot pick up a holder added
// meanwhile).
func withholdGrants(m *manifest.Manifest, existing map[string]bool, plan []RoleGrant) (*manifest.Manifest, map[string][]string, []RoleGrant) {
	mm := *m
	mm.UserPermissions = slices.Clone(m.UserPermissions)
	roles := map[string][]string{}
	var pending []RoleGrant
	for _, g := range plan {
		if g.NeedsConsent {
			pending = append(pending, g)
		}
	}
	for i, up := range mm.UserPermissions {
		key := manifest.PermissionKey(m.Key, up.Key)
		if existing[key] {
			continue
		}
		roles[up.Key] = []string{}
		for _, g := range plan {
			if g.Permission == key && !g.NeedsConsent {
				roles[up.Key] = append(roles[up.Key], g.Role)
			}
		}
		mm.UserPermissions[i].InheritFrom = nil
	}
	return &mm, roles, pending
}

// auditAutoGrants records the role grants of a consent nobody gave (an
// upgrade carried over, by its uploader; a built-in plugin, by the system)
// and the ones withheld for review.
// Nothing is written when there are none.
func auditAutoGrants(ctx context.Context, tx pgx.Tx, actorID int64, key, version string, plan, pending []RoleGrant) error {
	if len(plan) == 0 {
		return nil
	}
	granted := []RoleGrant{}
	for _, g := range plan {
		if !slices.ContainsFunc(pending, func(p RoleGrant) bool { return p.Permission == g.Permission && p.Role == g.Role }) {
			granted = append(granted, g)
		}
	}
	if pending == nil {
		pending = []RoleGrant{}
	}
	return audit.Audit(ctx, tx, actorID, AuditConsentAuto, "plugin", key, map[string]any{
		"version": version, "granted": granted, "pending": pending, "review_required": len(pending) > 0,
	})
}

// PendingRoleGrants lists the role grants consents of key withheld for review
// (version "" for every version) since it was installed, that nobody
// confirmed or rejected since and that still mean something: the permission and the role exist and the role
// does not hold it. A confirm or reject clears its version's list; a reject
// also clears the same (permission, role) under every version whose consent
// was recorded before it (earlier or later versions alike), since the list
// shows each pair once (under its earliest version).
func PendingRoleGrants(ctx context.Context, q store.Querier, key, version string) ([]RoleGrant, error) {
	rows, err := q.Query(ctx, `
SELECT a.detail->>'version', g->>'permission', g->>'role', COALESCE((g->>'sensitive')::boolean, false), COALESCE(g->>'via', '')
FROM audit_logs a CROSS JOIN LATERAL jsonb_array_elements(a.detail->'pending') g
WHERE a.action = $3 AND a.target_type = 'plugin' AND a.target_id = $1
  AND jsonb_typeof(a.detail->'pending') = 'array'
  AND a.created_at >= (SELECT installed_at FROM plugins WHERE key = $1)
  AND ($2 = '' OR a.detail->>'version' = $2)
  AND NOT EXISTS (SELECT 1 FROM audit_logs b WHERE b.target_type = 'plugin' AND b.target_id = a.target_id
      AND b.action = ANY($4) AND b.id > a.id
      AND (b.detail->>'version' = a.detail->>'version'
        OR (b.action = $5 AND b.detail->'grants' @> jsonb_build_array(jsonb_build_object('permission', g->>'permission', 'role', g->>'role')))))
  AND EXISTS (SELECT 1 FROM permissions p WHERE p.key = g->>'permission')
  AND EXISTS (SELECT 1 FROM roles r WHERE r.key = g->>'role' AND NOT r.superuser)
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id
      WHERE r.key = g->>'role' AND p.key = g->>'permission')
ORDER BY a.id, 2, 3`, key, version, AuditConsentAuto, []string{AuditRoleGrantsConfirm, AuditRoleGrantsReject}, AuditRoleGrantsReject)
	if err != nil {
		return nil, err
	}
	gs, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (RoleGrant, error) {
		g := RoleGrant{NeedsConsent: true}
		return g, r.Scan(&g.Version, &g.Permission, &g.Role, &g.Sensitive, &g.Via)
	})
	if err != nil {
		return nil, err
	}
	type pair struct{ permission, role string }
	seen := map[pair]bool{}
	return slices.DeleteFunc(gs, func(g RoleGrant) bool {
		p := pair{g.Permission, g.Role}
		dup := seen[p]
		seen[p] = true
		return dup
	}), nil
}

// ReviewRoleGrants confirms (grants) or rejects the role grants the consent
// of version withheld for review. Either needs what naming those roles on
// the consent page needs (checkRolesGrantable: role:define and
// CanGrantToRoles), and clears the version's list, audited; rejecting
// grants nothing and also clears the rejected grants other versions
// withheld (PendingRoleGrants).
func (s *Service) ReviewRoleGrants(ctx context.Context, key, version string, confirm bool, actorID int64) ([]RoleGrant, error) {
	ctx, release, guardErr := core.BeginPluginMutation(ctx, s.d.Mutations)
	if guardErr != nil {
		return nil, guardErr
	}
	defer release()
	var gs []RoleGrant
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT 1 FROM plugins WHERE key = $1 FOR UPDATE`, key); err != nil {
			return err
		}
		var err error
		if gs, err = PendingRoleGrants(ctx, tx, key, version); err != nil {
			return err
		}
		if len(gs) == 0 {
			return core.ErrNotFound.WithMessage("no role grants of this version await review")
		}
		roles := make([]string, 0, len(gs))
		for _, g := range gs {
			roles = append(roles, g.Role)
		}
		if err := s.checkRolesGrantable(ctx, tx, actorID, roles); err != nil {
			return err
		}
		action := AuditRoleGrantsReject
		if confirm {
			action = AuditRoleGrantsConfirm
			if err := s.grantReviewed(ctx, tx, gs); err != nil {
				return err
			}
		}
		return audit.Audit(ctx, tx, actorID, action, "plugin", key, map[string]any{"version": version, "grants": gs})
	})
	if err != nil {
		return nil, err
	}
	if confirm {
		s.Notify(ctx, key)
	}
	return gs, nil
}

// grantReviewed grants gs, which the operator confirmed (checked by the
// caller).
func (s *Service) grantReviewed(ctx context.Context, tx pgx.Tx, gs []RoleGrant) error {
	if s.d.Permissions == nil {
		return core.ErrInternal.WithMessage("the permission catalog is not available")
	}
	byKey := map[string][]string{}
	for _, g := range gs {
		byKey[g.Permission] = append(byKey[g.Permission], g.Role)
	}
	for _, k := range slices.Sorted(maps.Keys(byKey)) {
		if err := s.d.Permissions.GrantPluginPermission(ctx, tx, k, byKey[k]); err != nil {
			return err
		}
	}
	return nil
}
