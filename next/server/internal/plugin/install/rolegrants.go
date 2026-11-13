package install

import (
	"context"
	"errors"
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
// supplier role (autoGrantRoles); otherwise someone entitled to the consent
// page decides. Built-in plugins upgrade with the core and are approved by
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
			// BuiltinRoleKeys); an explicit override is never planned.
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

// withholdGrants splits plan into the grants made now and the ones withheld
// for review, and returns the manifest and roles a consent making only the
// former syncs with: a permission with a withheld grant goes to its other
// planned roles by name and inherits nothing (its holders were resolved in
// plan, in the same transaction). Permissions without one are left as they
// are.
func withholdGrants(m *manifest.Manifest, roles map[string][]string, plan []RoleGrant) (*manifest.Manifest, map[string][]string, []RoleGrant) {
	var pending []RoleGrant
	for _, g := range plan {
		if g.NeedsConsent {
			pending = append(pending, g)
		}
	}
	if len(pending) == 0 {
		return m, roles, nil
	}
	mm := *m
	mm.UserPermissions = slices.Clone(m.UserPermissions)
	out := make(map[string][]string, len(roles))
	for k, v := range roles {
		out[k] = v
	}
	for i, up := range mm.UserPermissions {
		key := manifest.PermissionKey(m.Key, up.Key)
		if !slices.ContainsFunc(pending, func(g RoleGrant) bool { return g.Permission == key }) {
			continue
		}
		granted := []string{}
		for _, g := range plan {
			if g.Permission == key && !g.NeedsConsent {
				granted = append(granted, g.Role)
			}
		}
		out[up.Key] = granted
		mm.UserPermissions[i].InheritFrom = nil
	}
	return &mm, out, pending
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
// (version "" for every version) that nobody confirmed or rejected since and
// that still mean something: the permission and the role exist and the role
// does not hold it.
func PendingRoleGrants(ctx context.Context, q store.Querier, key, version string) ([]RoleGrant, error) {
	rows, err := q.Query(ctx, `
SELECT a.detail->>'version', g->>'permission', g->>'role', COALESCE((g->>'sensitive')::boolean, false), COALESCE(g->>'via', '')
FROM audit_logs a CROSS JOIN LATERAL jsonb_array_elements(a.detail->'pending') g
WHERE a.action = $3 AND a.target_type = 'plugin' AND a.target_id = $1
  AND jsonb_typeof(a.detail->'pending') = 'array'
  AND ($2 = '' OR a.detail->>'version' = $2)
  AND NOT EXISTS (SELECT 1 FROM audit_logs b WHERE b.target_type = 'plugin' AND b.target_id = a.target_id
      AND b.action = ANY($4) AND b.id > a.id AND b.detail->>'version' = a.detail->>'version')
  AND EXISTS (SELECT 1 FROM permissions p WHERE p.key = g->>'permission')
  AND EXISTS (SELECT 1 FROM roles r WHERE r.key = g->>'role' AND NOT r.superuser)
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id
      WHERE r.key = g->>'role' AND p.key = g->>'permission')
ORDER BY a.id, 2, 3`, key, version, AuditConsentAuto, []string{AuditRoleGrantsConfirm, AuditRoleGrantsReject})
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
// of version withheld for review. Confirming needs what naming those roles
// on the consent page needs (checkRoleGrantRights: role:define and
// CanGrantToRoles); rejecting needs nothing more than the route's
// permission and grants nothing. Either clears the version's list, audited.
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
		action := AuditRoleGrantsReject
		if confirm {
			action = AuditRoleGrantsConfirm
			if err := s.grantReviewed(ctx, tx, actorID, gs); err != nil {
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

// grantReviewed grants gs as the operator confirmed them, after the checks
// an explicit consent naming the same roles passes.
func (s *Service) grantReviewed(ctx context.Context, tx pgx.Tx, actorID int64, gs []RoleGrant) error {
	if s.d.Permissions == nil {
		return core.ErrInternal.WithMessage("the permission catalog is not available")
	}
	byKey := map[string][]string{}
	var roles []string
	for _, g := range gs {
		byKey[g.Permission] = append(byKey[g.Permission], g.Role)
		roles = append(roles, g.Role)
	}
	if err := s.checkRolesGrantable(ctx, tx, actorID, roles); err != nil {
		return err
	}
	keys := make([]string, 0, len(byKey))
	for k := range byKey {
		keys = append(keys, k)
	}
	slices.Sort(keys)
	for _, k := range keys {
		if err := s.d.Permissions.GrantPluginPermission(ctx, tx, k, byKey[k]); err != nil {
			return err
		}
	}
	return nil
}
