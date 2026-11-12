package authz

import (
	"context"
	"regexp"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Role is the API view of a role.
type Role struct {
	ID             int64              `json:"id"`
	Key            string             `json:"key"`
	Name           core.LocalizedText `json:"name"`
	Description    core.LocalizedText `json:"description"`
	Builtin        bool               `json:"builtin"`
	Superuser      bool               `json:"superuser"`
	PermissionKeys []string           `json:"permission_keys"`
	UserCount      int64              `json:"user_count"`
	CreatedAt      time.Time          `json:"created_at"`
	UpdatedAt      time.Time          `json:"updated_at"`
}

var roleKeyRe = regexp.MustCompile(`^[a-z][a-z0-9_]{1,49}$`)

var (
	errRoleNotFound        = core.ErrNotFound.WithMessage("role not found")
	errBuiltinRole         = core.ErrConflict.WithMessage("built-in roles cannot be deleted")
	errNotBuiltinRole      = core.ErrConflict.WithMessage("only built-in roles can be reset")
	errSuperuserRoleFrozen = core.ErrConflict.WithMessage("the super admin role cannot be changed")
	errLastSuperAdmin      = core.ErrConflict.WithMessage("the last super admin cannot be removed")
	errOwnSuperAdmin       = core.ErrConflict.WithMessage("you cannot revoke your own super admin role")
	errSuperuserGrantor    = core.ErrPermissionDenied.WithMessage("only a super admin can grant or revoke the super admin role")
)

const roleSelect = `
SELECT r.id, r.key, r.name, r.description, r.builtin, r.superuser, r.created_at, r.updated_at,
    COALESCE((SELECT array_agg(p.key ORDER BY p.sort, p.key) FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = r.id), '{}'),
    (SELECT count(*) FROM user_roles ur JOIN users u ON u.id = ur.user_id
        WHERE ur.role_id = r.id AND u.deleted_at IS NULL)
FROM roles r`

func scanRole(row pgx.Row) (*Role, error) {
	var r Role
	err := row.Scan(&r.ID, &r.Key, &r.Name, &r.Description, &r.Builtin, &r.Superuser, &r.CreatedAt, &r.UpdatedAt, &r.PermissionKeys, &r.UserCount)
	if err != nil {
		return nil, err
	}
	if r.Name == nil {
		r.Name = core.LocalizedText{}
	}
	if r.Description == nil {
		r.Description = core.LocalizedText{}
	}
	return &r, nil
}

// ListRoles returns all roles, built-in first.
func (s *Service) ListRoles(ctx context.Context) ([]*Role, error) {
	rows, err := s.db.Pool.Query(ctx, roleSelect+` ORDER BY r.builtin DESC, r.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Role{}
	for rows.Next() {
		r, err := scanRole(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// GetRole returns one role or ErrNotFound.
func (s *Service) GetRole(ctx context.Context, id int64) (*Role, error) {
	return s.getRole(ctx, s.db.Pool, id)
}

func (s *Service) getRole(ctx context.Context, q store.Querier, id int64) (*Role, error) {
	r, err := scanRole(q.QueryRow(ctx, roleSelect+` WHERE r.id = $1`, id))
	if store.IsNoRows(err) {
		return nil, errRoleNotFound
	}
	return r, err
}

// editableRole locks role id inside tx, which has called Bump, and returns
// it when actorID may change it: the super admin role is frozen for everyone
// (name, description, permissions, reset, delete), and any other role must be
// within the actor's grantSet (canActOnRole, M5: an actor who could weaken a
// role above it could then act on that role's holders). The system (actor 0)
// passes. Every role write goes through it.
func (s *Service) editableRole(ctx context.Context, tx pgx.Tx, actorID, id int64) (*Role, error) {
	r, err := scanRole(tx.QueryRow(ctx, roleSelect+` WHERE r.id = $1 FOR UPDATE OF r`, id))
	switch {
	case store.IsNoRows(err):
		return nil, errRoleNotFound
	case err != nil:
		return nil, err
	case r.Superuser:
		return nil, errSuperuserRoleFrozen
	case actorID == 0:
		return r, nil
	}
	cur, err := s.RolesPermissions(ctx, tx, []string{r.Key})
	if err != nil {
		return nil, err
	}
	return r, s.covers(ctx, tx, actorID, cur, cannotActOnRole(ctx))
}

// CreateRoleInput is the body of POST /roles.
type CreateRoleInput struct {
	Key            string             `json:"key"`
	Name           core.LocalizedText `json:"name"`
	Description    core.LocalizedText `json:"description"`
	PermissionKeys []string           `json:"permission_keys"`
}

// CreateRole creates a custom (non-superuser) role. The actor must hold all
// permissions being granted, as for SetRolePermissions (CONTRACTS §43.6),
// checked inside the transaction after Bump.
func (s *Service) CreateRole(ctx context.Context, actorID int64, in CreateRoleInput) (*Role, error) {
	var fields []core.FieldError
	if !roleKeyRe.MatchString(in.Key) {
		fields = append(fields, core.FieldError{Field: "key", Code: "invalid", Message: "must match ^[a-z][a-z0-9_]{1,49}$"})
	}
	if in.Name.Get("en") == "" {
		fields = append(fields, core.FieldError{Field: "name", Code: "required", Message: "name is required"})
	}
	if len(fields) > 0 {
		return nil, core.InvalidFields(fields...)
	}
	if in.Description == nil {
		in.Description = core.LocalizedText{}
	}
	var id int64
	err := s.mutate(ctx, func(tx pgx.Tx) error {
		keys, ids, err := resolvePermissions(ctx, tx, in.PermissionKeys)
		if err != nil {
			return err
		}
		if err := s.covers(ctx, tx, actorID, core.PermissionSetOf(keys...), cannotGrant(ctx)); err != nil {
			return err
		}
		err = tx.QueryRow(ctx, `INSERT INTO roles (key, name, description) VALUES ($1, $2, $3) RETURNING id`,
			in.Key, in.Name, in.Description).Scan(&id)
		if store.IsUniqueViolation(err, "") {
			return core.ErrConflict.WithMessage("role key already exists")
		}
		if err != nil {
			return err
		}
		if err := setRolePermissions(ctx, tx, id, ids); err != nil {
			return err
		}
		return s.audit(ctx, tx, actorID, "role.create", "role", id, map[string]any{"key": in.Key, "permission_keys": keys})
	})
	if err != nil {
		return nil, err
	}
	return s.GetRole(ctx, id)
}

// UpdateRoleInput is the body of PATCH /roles/:id.
type UpdateRoleInput struct {
	Name        core.LocalizedText `json:"name"`
	Description core.LocalizedText `json:"description"`
}

// UpdateRole changes name/description of a role actorID may edit
// (editableRole; built-in roles included).
func (s *Service) UpdateRole(ctx context.Context, actorID, id int64, in UpdateRoleInput) (*Role, error) {
	if in.Name != nil && in.Name.Get("en") == "" {
		return nil, core.InvalidFields(core.FieldError{Field: "name", Code: "required", Message: "name is required"})
	}
	err := s.mutate(ctx, func(tx pgx.Tx) error {
		if _, err := s.editableRole(ctx, tx, actorID, id); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE roles SET name = COALESCE($2, name), description = COALESCE($3, description), updated_at = now() WHERE id = $1`,
			id, nilIfEmpty(in.Name), nilIfEmpty(in.Description)); err != nil {
			return err
		}
		return s.audit(ctx, tx, actorID, "role.update", "role", id, in)
	})
	if err != nil {
		return nil, err
	}
	return s.GetRole(ctx, id)
}

func nilIfEmpty(t core.LocalizedText) any {
	if t == nil {
		return nil
	}
	return t
}

// DeleteRole deletes a custom role actorID may edit (editableRole); its
// assignments cascade.
func (s *Service) DeleteRole(ctx context.Context, actorID, id int64) error {
	return s.mutate(ctx, func(tx pgx.Tx) error {
		r, err := s.editableRole(ctx, tx, actorID, id)
		if err != nil {
			return err
		}
		if r.Builtin {
			return errBuiltinRole
		}
		if _, err := tx.Exec(ctx, `DELETE FROM roles WHERE id = $1`, id); err != nil {
			return err
		}
		return s.audit(ctx, tx, actorID, "role.delete", "role", id, map[string]any{"key": r.Key})
	})
}

// ResetRole restores a built-in role actorID may edit (editableRole) to its
// defaults: name, description and core permissions. Plugin permissions on
// the role are left alone, since they are granted per plugin at consent
// time. The actor must hold every default permission, as for
// SetRolePermissions; what the reset drops is within the actor already
// (editableRole), so it cannot weaken a role above the actor (C-L2).
func (s *Service) ResetRole(ctx context.Context, actorID, id int64) (*Role, error) {
	err := s.mutate(ctx, func(tx pgx.Tx) error {
		r, err := s.editableRole(ctx, tx, actorID, id)
		if err != nil {
			return err
		}
		def, ok := builtinRoleByKey(r.Key)
		if !r.Builtin || !ok {
			return errNotBuiltinRole
		}
		keys := def.defaultPermissions()
		if err := s.covers(ctx, tx, actorID, core.PermissionSetOf(keys...), cannotGrant(ctx)); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE roles SET name = $2, description = $3, updated_at = now() WHERE id = $1`,
			id, def.name, def.description); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM role_permissions rp USING permissions p
WHERE rp.role_id = $1 AND p.id = rp.permission_id AND p.source = 'core' AND p.key <> ALL($2)`, id, keys); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO role_permissions (role_id, permission_id)
SELECT $1, p.id FROM permissions p WHERE p.source = 'core' AND p.status <> 'removed' AND p.key = ANY($2)
ON CONFLICT DO NOTHING`, id, keys); err != nil {
			return err
		}
		return s.audit(ctx, tx, actorID, "role.reset", "role", id, map[string]any{"key": r.Key})
	})
	if err != nil {
		return nil, err
	}
	return s.GetRole(ctx, id)
}

// SetRolePermissions replaces the permissions of a role actorID may edit
// (editableRole). The actor must hold the permissions being added (CONTRACTS
// §4.1, SEC-H2); those the role keeps are within it already. Removed
// permissions in keys are ignored and their grant rows kept, so a role saves
// back as listed (P2).
func (s *Service) SetRolePermissions(ctx context.Context, actorID, id int64, keys []string) (*Role, error) {
	err := s.mutate(ctx, func(tx pgx.Tx) error {
		r, err := s.editableRole(ctx, tx, actorID, id)
		if err != nil {
			return err
		}
		live, ids, err := resolvePermissions(ctx, tx, keys)
		if err != nil {
			return err
		}
		added := addedKeys(live, r.PermissionKeys)
		if err := s.covers(ctx, tx, actorID, core.PermissionSetOf(added...), cannotGrant(ctx)); err != nil {
			return err
		}
		if err := setRolePermissions(ctx, tx, id, ids); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE roles SET updated_at = now() WHERE id = $1`, id); err != nil {
			return err
		}
		return s.audit(ctx, tx, actorID, "role.permissions", "role", id, map[string]any{"permission_keys": live, "added": added})
	})
	if err != nil {
		return nil, err
	}
	return s.GetRole(ctx, id)
}

// resolvePermissions dedupes keys and resolves them to permission ids,
// dropping removed permissions. A key that does not exist at all is invalid.
func resolvePermissions(ctx context.Context, tx pgx.Tx, keys []string) ([]string, []int64, error) {
	keys = dedupe(keys)
	rows, err := tx.Query(ctx, `SELECT key, id, status = 'removed' FROM permissions WHERE key = ANY($1)`, keys)
	if err != nil {
		return nil, nil, err
	}
	type perm struct {
		id      int64
		removed bool
	}
	found := map[string]perm{}
	for rows.Next() {
		var k string
		var p perm
		if err := rows.Scan(&k, &p.id, &p.removed); err != nil {
			rows.Close()
			return nil, nil, err
		}
		found[k] = p
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}
	var unknown []string
	kept := make([]string, 0, len(keys))
	ids := make([]int64, 0, len(keys))
	for _, k := range keys {
		p, ok := found[k]
		switch {
		case !ok:
			unknown = append(unknown, k)
		case !p.removed:
			kept = append(kept, k)
			ids = append(ids, p.id)
		}
	}
	if len(unknown) > 0 {
		return nil, nil, core.InvalidFields(core.FieldError{Field: "permission_keys", Code: "unknown", Message: "unknown permissions: " + strings.Join(unknown, ", ")})
	}
	return kept, ids, nil
}

// setRolePermissions makes ids the role's live permissions. Grant rows of
// removed permissions stay: they grant nothing, and revive with the key.
func setRolePermissions(ctx context.Context, tx pgx.Tx, roleID int64, ids []int64) error {
	if _, err := tx.Exec(ctx, `DELETE FROM role_permissions rp USING permissions p
WHERE rp.role_id = $1 AND p.id = rp.permission_id AND p.status <> 'removed' AND rp.permission_id <> ALL($2)`, roleID, ids); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `INSERT INTO role_permissions (role_id, permission_id) SELECT $1, unnest($2::bigint[]) ON CONFLICT DO NOTHING`, roleID, ids)
	return err
}

// ------------------------------------------------------------ user roles (used by iam)

// UserRoleKeys returns the role keys of a user, sorted.
func (s *Service) UserRoleKeys(ctx context.Context, q store.Querier, userID int64) ([]string, error) {
	var keys []string
	err := q.QueryRow(ctx, `SELECT COALESCE(array_agg(r.key ORDER BY r.key), '{}') FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`, userID).Scan(&keys)
	return keys, err
}

// SetUserRoles replaces a user's roles inside tx, bumping the authz version
// (call Committed with the returned version after commit). actorID is the
// acting user (0 = system, which bypasses the actor checks). Rules: only a
// superuser may add or remove a superuser role; nobody may revoke their own
// superuser role; the last active superuser cannot lose it; the actor must
// hold every permission carried by the roles being added (CanGrant,
// CONTRACTS §43.6), the target user included when it is the actor itself.
func (s *Service) SetUserRoles(ctx context.Context, tx pgx.Tx, actorID, userID int64, roleKeys []string) (int64, error) {
	v, err := s.Bump(ctx, tx)
	if err != nil {
		return 0, err
	}
	roleKeys = dedupe(roleKeys)
	rows, err := tx.Query(ctx, `SELECT id, key, superuser FROM roles WHERE key = ANY($1)`, roleKeys)
	if err != nil {
		return 0, err
	}
	type roleRow struct {
		id        int64
		superuser bool
	}
	found := map[string]roleRow{}
	for rows.Next() {
		var r roleRow
		var k string
		if err := rows.Scan(&r.id, &k, &r.superuser); err != nil {
			rows.Close()
			return 0, err
		}
		found[k] = r
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, err
	}
	var unknown []string
	ids := []int64{}
	newSuper := false
	for _, k := range roleKeys {
		r, ok := found[k]
		if !ok {
			unknown = append(unknown, k)
			continue
		}
		ids = append(ids, r.id)
		newSuper = newSuper || r.superuser
	}
	if len(unknown) > 0 {
		return 0, core.InvalidFields(core.FieldError{Field: "role_keys", Code: "unknown", Message: "unknown roles: " + strings.Join(unknown, ", ")})
	}

	// SEC-H2: Actor must be able to act on the target user (what the target's
	// roles grant must not exceed the actor's; a disabled target is measured
	// by its roles too, see CanActOnUsers). Checks read through tx (C-L4).
	if err := s.canActOnUsers(ctx, tx, actorID, userID); err != nil {
		return 0, err
	}

	// Current superuser role ids of the user.
	var curSuper []int64
	if err := tx.QueryRow(ctx, `SELECT COALESCE(array_agg(r.id), '{}') FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1 AND r.superuser`, userID).Scan(&curSuper); err != nil {
		return 0, err
	}
	superChanged := false
	for _, id := range curSuper {
		if !slices.Contains(ids, id) {
			superChanged = true
		}
	}
	for _, k := range roleKeys {
		if r := found[k]; r.superuser && !slices.Contains(curSuper, r.id) {
			superChanged = true
		}
	}
	if superChanged {
		// An access key is never a superuser (H1).
		if err := s.covers(ctx, tx, actorID, core.PermissionSet{Superuser: true}, errSuperuserGrantor); err != nil {
			return 0, err
		}
	}
	if len(curSuper) > 0 && !newSuper {
		if actorID == userID {
			return 0, errOwnSuperAdmin
		}
		if err := s.ensureOtherSuperuser(ctx, tx, userID); err != nil {
			return 0, err
		}
	}
	// Adding a role grants its permissions: the actor must hold all of them.
	// Roles the user already has are not a grant, so only the added ones are
	// checked; that keeps removing or re-saving roles possible for an actor
	// who could not grant the user's existing set.
	if actorID != 0 {
		cur, err := s.UserRoleKeys(ctx, tx, userID)
		if err != nil {
			return 0, err
		}
		if added := addedKeys(roleKeys, cur); len(added) > 0 {
			want, err := s.RolesPermissions(ctx, tx, added)
			if err != nil {
				return 0, err
			}
			if err := s.covers(ctx, tx, actorID, want, cannotGrant(ctx)); err != nil {
				return 0, err
			}
		}
	}
	if _, err := tx.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1 AND role_id <> ALL($2)`, userID, ids); err != nil {
		return 0, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO user_roles (user_id, role_id) SELECT $1, unnest($2::bigint[]) ON CONFLICT DO NOTHING`, userID, ids); err != nil {
		return 0, err
	}
	return v, nil
}

// EnsureNotLastSuperAdmin fails with conflict when userID is a superuser and
// no other active superuser exists. iam calls it inside the transaction that
// disables or deletes a user, after Bump (which serializes the check).
func (s *Service) EnsureNotLastSuperAdmin(ctx context.Context, tx pgx.Tx, userID int64) error {
	var su bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1 AND r.superuser)`, userID).Scan(&su); err != nil {
		return err
	}
	if !su {
		return nil
	}
	return s.ensureOtherSuperuser(ctx, tx, userID)
}

func (s *Service) ensureOtherSuperuser(ctx context.Context, tx pgx.Tx, userID int64) error {
	var n int64
	err := tx.QueryRow(ctx, `SELECT count(DISTINCT u.id) FROM users u
        JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
        WHERE r.superuser AND u.deleted_at IS NULL AND u.status = 'active' AND u.id <> $1`, userID).Scan(&n)
	if err != nil {
		return err
	}
	if n == 0 {
		return errLastSuperAdmin
	}
	return nil
}

// ------------------------------------------------------------ permission listing

// PermissionItem is one permission in GET /permissions.
type PermissionItem struct {
	Key         string             `json:"key"`
	Label       core.LocalizedText `json:"label"`
	Description core.LocalizedText `json:"description"`
	Sensitive   bool               `json:"sensitive"`
	SessionOnly bool               `json:"session_only"`
	Status      string             `json:"status"`
}

// PermissionModule groups permissions by module.
type PermissionModule struct {
	Module      string             `json:"module"`
	Label       core.LocalizedText `json:"label"`
	Source      string             `json:"source"`
	PluginKey   *string            `json:"plugin_key"`
	Status      string             `json:"status"`
	Permissions []PermissionItem   `json:"permissions"`
}

// ListPermissions returns the catalog grouped by module: core modules in
// catalog order, then plugin modules by plugin key.
func (s *Service) ListPermissions(ctx context.Context) ([]*PermissionModule, error) {
	rows, err := s.db.Pool.Query(ctx, `
SELECT p.key, p.module, p.label, p.description, p.source, p.plugin_key, p.sensitive, p.status, pl.name
FROM permissions p LEFT JOIN plugins pl ON pl.key = p.plugin_key
ORDER BY p.source, p.module, p.sort, p.key`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	byModule := map[string]*PermissionModule{}
	var order []*PermissionModule
	for rows.Next() {
		var it PermissionItem
		var module, source string
		var pluginKey *string
		var pluginName core.LocalizedText
		if err := rows.Scan(&it.Key, &module, &it.Label, &it.Description, &source, &pluginKey, &it.Sensitive, &it.Status, &pluginName); err != nil {
			return nil, err
		}
		if it.Description == nil {
			it.Description = core.LocalizedText{}
		}
		it.SessionOnly = sessionOnly(it.Key)
		m := byModule[module]
		if m == nil {
			m = &PermissionModule{Module: module, Source: source, PluginKey: pluginKey, Permissions: []PermissionItem{}}
			if source == "core" {
				m.Label = coreModuleLabels[module]
			} else {
				m.Label = pluginName
			}
			if m.Label == nil {
				m.Label = core.LocalizedText{"en": module}
			}
			byModule[module] = m
			order = append(order, m)
		}
		m.Permissions = append(m.Permissions, it)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for _, m := range order {
		m.Status = m.Permissions[0].Status
		for _, p := range m.Permissions {
			if p.Status == "active" {
				m.Status = "active"
				break
			}
		}
	}
	sort.SliceStable(order, func(i, j int) bool {
		a, b := order[i], order[j]
		if a.Source != b.Source {
			return a.Source == "core"
		}
		if a.Source == "core" {
			oa, oka := coreModuleOrder[a.Module]
			ob, okb := coreModuleOrder[b.Module]
			if oka != okb {
				return oka
			}
			if oa != ob {
				return oa < ob
			}
		}
		return a.Module < b.Module
	})
	return order, nil
}

// addedKeys returns the keys in want that are not in have, in want order.
func addedKeys(want, have []string) []string {
	var out []string
	for _, k := range want {
		if !slices.Contains(have, k) {
			out = append(out, k)
		}
	}
	return out
}

func dedupe(keys []string) []string {
	out := make([]string, 0, len(keys))
	seen := map[string]bool{}
	for _, k := range keys {
		if k == "" || seen[k] {
			continue
		}
		seen[k] = true
		out = append(out, k)
	}
	return out
}

// IsSuperuser reports whether userID holds a superuser role, regardless of
// the user's status.
func (s *Service) IsSuperuser(ctx context.Context, q store.Querier, userID int64) (bool, error) {
	var su bool
	err := q.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1 AND r.superuser)`, userID).Scan(&su)
	return su, err
}
