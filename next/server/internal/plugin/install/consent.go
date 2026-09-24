package install

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// ConsentRequest is the body of POST /plugins/:key/versions/:version/consent.
type ConsentRequest struct {
	Grants                    []GrantInput `json:"grants"`
	Denied                    []string     `json:"denied"`
	RoleKeysForNewPermissions []string     `json:"role_keys_for_new_permissions"`
}

// GrantInput approves one host permission, optionally with a narrower scope.
type GrantInput struct {
	Permission string         `json:"permission"`
	Scope      map[string]any `json:"scope,omitempty"`
}

// ConsentResult is returned after consent.
type ConsentResult struct {
	PluginKey string  `json:"plugin_key"`
	Version   string  `json:"version"`
	Status    string  `json:"status"`
	Upgrade   bool    `json:"upgrade"`
	Grants    []Grant `json:"grants"`
}

type decision struct {
	permission string
	scope      map[string]any
	status     string
	carried    bool // kept from a previous consent without re-approval
}

// decide resolves the consent request against the requested permissions.
// Rules: low-risk permissions are granted automatically; optional ones not
// mentioned are denied; on upgrades an unmentioned permission whose current
// grant already covers the request is carried over; every other required
// permission must be granted explicitly. Granted scopes may be narrower than
// requested, never wider.
func decide(m *manifest.Manifest, req ConsentRequest, current map[string]Grant, upgrade bool) ([]decision, []core.FieldError) {
	var errs []core.FieldError
	requested := map[string]manifest.HostPermission{}
	for _, hp := range m.HostPermissions {
		requested[hp.ID] = hp
	}
	grants := map[string]GrantInput{}
	for i, g := range req.Grants {
		f := fmt.Sprintf("grants[%d]", i)
		if _, ok := requested[g.Permission]; !ok {
			errs = append(errs, core.FieldError{Field: f, Code: "not_requested", Message: fmt.Sprintf("permission %q is not requested by the plugin", g.Permission)})
			continue
		}
		if _, dup := grants[g.Permission]; dup {
			errs = append(errs, core.FieldError{Field: f, Code: "duplicate", Message: fmt.Sprintf("permission %q listed twice", g.Permission)})
		}
		grants[g.Permission] = g
	}
	denied := map[string]bool{}
	for i, d := range req.Denied {
		f := fmt.Sprintf("denied[%d]", i)
		if _, ok := requested[d]; !ok {
			errs = append(errs, core.FieldError{Field: f, Code: "not_requested", Message: fmt.Sprintf("permission %q is not requested by the plugin", d)})
			continue
		}
		if _, both := grants[d]; both {
			errs = append(errs, core.FieldError{Field: f, Code: "conflict", Message: fmt.Sprintf("permission %q is both granted and denied", d)})
		}
		denied[d] = true
	}

	var out []decision
	for _, hp := range m.HostPermissions {
		reqScope := pkg.NormalizeScope(hp.Scope)
		risk := riskOf(hp.ID)
		f := "permission:" + hp.ID
		if g, ok := grants[hp.ID]; ok {
			scope := reqScope
			if g.Scope != nil {
				scope = pkg.NormalizeScope(g.Scope)
				if !pkg.ScopeWithin(scope, reqScope) {
					errs = append(errs, core.FieldError{Field: f, Code: "scope_too_wide", Message: fmt.Sprintf("granted scope of %q is wider than requested", hp.ID)})
					continue
				}
			}
			out = append(out, decision{permission: hp.ID, scope: scope, status: GrantGranted})
			continue
		}
		if denied[hp.ID] {
			if !hp.Optional {
				errs = append(errs, core.FieldError{Field: f, Code: "required", Message: fmt.Sprintf("permission %q is required and cannot be denied", hp.ID)})
				continue
			}
			out = append(out, decision{permission: hp.ID, scope: reqScope, status: GrantDenied})
			continue
		}
		if risk == manifest.RiskLow {
			out = append(out, decision{permission: hp.ID, scope: reqScope, status: GrantGranted})
			continue
		}
		if cur, ok := current[hp.ID]; upgrade && ok && cur.Status == GrantGranted && pkg.ScopeWithin(reqScope, cur.Scope) {
			out = append(out, decision{permission: hp.ID, scope: reqScope, status: GrantGranted, carried: true})
			continue
		}
		if hp.Optional {
			out = append(out, decision{permission: hp.ID, scope: reqScope, status: GrantDenied})
			continue
		}
		errs = append(errs, core.FieldError{Field: f, Code: "consent_required", Message: fmt.Sprintf("permission %q must be granted explicitly", hp.ID)})
	}
	return out, errs
}

// Consent approves a version. First installs apply defaults and move the
// plugin to installed; upgrades only approve the version (the runtime
// applies defaults when it activates).
func (s *Service) Consent(ctx context.Context, key, version string, req ConsentRequest, actorID int64) (*ConsentResult, error) {
	var res *ConsentResult
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		var (
			status        string
			activeVersion *string
			pubID         *int64
		)
		err := tx.QueryRow(ctx, `SELECT status, active_version, publisher_id FROM plugins WHERE key = $1 FOR UPDATE`, key).
			Scan(&status, &activeVersion, &pubID)
		if store.IsNoRows(err) {
			return core.ErrNotFound.WithMessage("plugin not found")
		}
		if err != nil {
			return err
		}
		var consent, sigStatus, manifestHash string
		err = tx.QueryRow(ctx, `SELECT consent_status, signature_status, manifest_hash FROM plugin_versions
			WHERE plugin_key = $1 AND version = $2 FOR UPDATE`, key, version).Scan(&consent, &sigStatus, &manifestHash)
		if store.IsNoRows(err) {
			return core.ErrNotFound.WithMessage("plugin version not found")
		}
		if err != nil {
			return err
		}
		if consent != ConsentAwaiting {
			return core.ErrConflict.WithMessage(fmt.Sprintf("version %s is %s", version, consent))
		}
		if sigStatus == pkg.SigRevoked {
			return core.ErrPermissionDenied.WithMessage("the package signature has been revoked")
		}
		trust := pkg.TrustUnsigned
		if pubID != nil {
			var pubStatus string
			if err := tx.QueryRow(ctx, `SELECT trust_level, status FROM publishers WHERE id = $1`, *pubID).Scan(&trust, &pubStatus); err != nil {
				return err
			}
			if pubStatus != "active" {
				return core.ErrPermissionDenied.WithMessage("the publisher has been revoked")
			}
		} else if !s.d.Trust.AllowUnsigned() {
			return core.ErrPermissionDenied.WithMessage("unsigned plugins are not allowed")
		}
		m, err := LoadManifest(ctx, tx, key, version)
		if err != nil {
			return err
		}
		if err := pkg.CheckTrust(m, trust); err != nil {
			return err
		}
		upgrade := status != StatusAwaitingConsent
		current := map[string]Grant{}
		if upgrade {
			if current, err = LoadGrants(ctx, tx, key); err != nil {
				return err
			}
		}
		decisions, ferrs := decide(m, req, current, upgrade)
		if len(ferrs) > 0 {
			return core.InvalidFields(ferrs...).WithMessage("consent does not match the requested permissions")
		}
		if err := s.checkGrantRights(ctx, actorID, decisions); err != nil {
			return err
		}
		for _, d := range decisions {
			scope, _ := json.Marshal(d.scope)
			if _, err := tx.Exec(ctx, `
				INSERT INTO plugin_permission_grants (plugin_key, permission, scope, status, plugin_version, manifest_hash, granted_by, granted_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, now())
				ON CONFLICT (plugin_key, permission) DO UPDATE SET
				  scope = EXCLUDED.scope, status = EXCLUDED.status, plugin_version = EXCLUDED.plugin_version,
				  manifest_hash = EXCLUDED.manifest_hash, granted_by = EXCLUDED.granted_by, granted_at = now()`,
				key, d.permission, scope, d.status, version, manifestHash, nullID(actorID)); err != nil {
				return err
			}
		}
		if _, err := tx.Exec(ctx, `UPDATE plugin_versions SET consent_status = 'approved' WHERE plugin_key = $1 AND version = $2`, key, version); err != nil {
			return err
		}

		switch {
		case !upgrade:
			if err := s.d.Defaults.ApplyDefaults(ctx, tx, m, req.RoleKeysForNewPermissions); err != nil {
				return err
			}
			name, _ := json.Marshal(m.Name)
			if _, err := tx.Exec(ctx, `UPDATE plugins SET status = $2, name = $3, installed_by = COALESCE(installed_by, $4),
				installed_at = now(), updated_at = now(), row_version = row_version + 1 WHERE key = $1`,
				key, StatusInstalled, name, nullID(actorID)); err != nil {
				return err
			}
			status = StatusInstalled
		case activeVersion == nil:
			// Nothing is running: the newest approved version becomes the
			// one to enable, so its defaults apply now.
			if err := s.d.Defaults.ApplyDefaults(ctx, tx, m, req.RoleKeysForNewPermissions); err != nil {
				return err
			}
		default:
			// Register the new version's permissions next to the running
			// ones so role grants chosen now exist before activation; the
			// runtime's ApplyDefaults at activation removes stale ones.
			if s.d.Permissions != nil {
				old, err := LoadManifest(ctx, tx, key, *activeVersion)
				if err != nil {
					return err
				}
				defs := unionDefs(PermissionDefs(old), PermissionDefs(m))
				if err := s.d.Permissions.SyncPlugin(ctx, tx, key, defs, req.RoleKeysForNewPermissions); err != nil {
					return err
				}
			}
		}

		grants, err := LoadGrants(ctx, tx, key)
		if err != nil {
			return err
		}
		res = &ConsentResult{PluginKey: key, Version: version, Status: status, Upgrade: upgrade, Grants: SortedGrants(grants)}
		summary := make([]map[string]any, 0, len(decisions))
		for _, d := range decisions {
			summary = append(summary, map[string]any{"permission": d.permission, "status": d.status, "scope": d.scope, "carried": d.carried})
		}
		return Audit(ctx, tx, actorID, "plugin.consent", "plugin", key, map[string]any{
			"version": version, "upgrade": upgrade, "decisions": summary, "role_keys": req.RoleKeysForNewPermissions,
		})
	})
	if err != nil {
		return nil, err
	}
	s.Notify(ctx, key)
	return res, nil
}

// checkGrantRights verifies the operator may approve every newly granted
// high/critical permission (carried-over grants were approved before).
func (s *Service) checkGrantRights(ctx context.Context, actorID int64, ds []decision) error {
	need := map[string][]string{}
	for _, d := range ds {
		if d.status != GrantGranted || d.carried {
			continue
		}
		if p := RequiredGrantPermission(riskOf(d.permission)); p != "" {
			need[p] = append(need[p], d.permission)
		}
	}
	perms := make([]string, 0, len(need))
	for p := range need {
		perms = append(perms, p)
	}
	sort.Strings(perms)
	for _, p := range perms {
		ok, err := s.d.Authz.Can(ctx, actorID, p)
		if err != nil {
			return err
		}
		if !ok {
			return core.ErrPermissionDenied.WithMessage(fmt.Sprintf("granting %v requires %s", need[p], p)).
				WithDetails(map[string]any{"permission": p, "host_permissions": need[p]})
		}
	}
	return nil
}

// Reject marks a version rejected. A plugin that was never installed and
// has no other pending version is removed.
func (s *Service) Reject(ctx context.Context, key, version string, actorID int64) error {
	return s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		var status string
		err := tx.QueryRow(ctx, `SELECT status FROM plugins WHERE key = $1 FOR UPDATE`, key).Scan(&status)
		if store.IsNoRows(err) {
			return core.ErrNotFound.WithMessage("plugin not found")
		}
		if err != nil {
			return err
		}
		tag, err := tx.Exec(ctx, `UPDATE plugin_versions SET consent_status = 'rejected'
			WHERE plugin_key = $1 AND version = $2 AND consent_status = 'awaiting_consent'`, key, version)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return core.ErrConflict.WithMessage("version is not awaiting consent")
		}
		removed := false
		if status == StatusAwaitingConsent {
			var pending int
			if err := tx.QueryRow(ctx, `SELECT count(*) FROM plugin_versions WHERE plugin_key = $1 AND consent_status <> 'rejected'`, key).Scan(&pending); err != nil {
				return err
			}
			if pending == 0 {
				if _, err := tx.Exec(ctx, `DELETE FROM plugins WHERE key = $1`, key); err != nil {
					return err
				}
				removed = true
			}
		}
		return Audit(ctx, tx, actorID, "plugin.reject", "plugin", key, map[string]any{"version": version, "plugin_removed": removed})
	})
}

// RevokeGrant marks one host permission grant revoked.
func (s *Service) RevokeGrant(ctx context.Context, key, permission string, actorID int64) error {
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE plugin_permission_grants SET status = 'revoked', granted_by = $3, granted_at = now()
			WHERE plugin_key = $1 AND permission = $2 AND status = 'granted'`, key, permission, nullID(actorID))
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return core.ErrNotFound.WithMessage("grant not found")
		}
		return Audit(ctx, tx, actorID, "plugin.grant.revoke", "plugin", key, map[string]any{"permission": permission})
	})
	if err == nil {
		s.Notify(ctx, key)
	}
	return err
}
