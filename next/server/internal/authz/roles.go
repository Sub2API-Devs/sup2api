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
	errBuiltinRole      = core.ErrConflict.WithMessage("built-in roles cannot be deleted")
	errSuperuserPerms   = core.ErrConflict.WithMessage("the permissions of the super admin role cannot be changed")
	errLastSuperAdmin   = core.ErrConflict.WithMessage("the last super admin cannot be removed")
	errOwnSuperAdmin    = core.ErrConflict.WithMessage("you cannot revoke your own super admin role")
	errSuperuserGrantor = core.ErrPermissionDenied.WithMessage("only a super admin can grant or revoke the super admin role")
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
		return nil, core.ErrNotFound.WithMessage("role not found")
	}
	return r, err
}

// CreateRoleInput is the body of POST /roles.
type CreateRoleInput struct {
	Key            string             `json:"key"`
	Name           core.LocalizedText `json:"name"`
	Description    core.LocalizedText `json:"description"`
	PermissionKeys []string           `json:"permission_keys"`
}

// CreateRole creates a custom (non-superuser) role.
func (s *Service) CreateRole(ctx context.Context, in CreateRoleInput) (*Role, error) {
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
		err := tx.QueryRow(ctx, `INSERT INTO roles (key, name, description) VALUES ($1, $2, $3) RETURNING id`,
			in.Key, in.Name, in.Description).Scan(&id)
		if store.IsUniqueViolation(err, "") {
			return core.ErrConflict.WithMessage("role key already exists")
		}
		if err != nil {
			return err
		}
		return s.setRolePermissions(ctx, tx, id, in.PermissionKeys)
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

// UpdateRole changes name/description (built-in roles included).
func (s *Service) UpdateRole(ctx context.Context, id int64, in UpdateRoleInput) (*Role, error) {
	if in.Name != nil && in.Name.Get("en") == "" {
		return nil, core.InvalidFields(core.FieldError{Field: "name", Code: "required", Message: "name is required"})
	}
	err := s.mutate(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE roles SET name = COALESCE($2, name), description = COALESCE($3, description), updated_at = now() WHERE id = $1`,
			id, nilIfEmpty(in.Name), nilIfEmpty(in.Description))
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return core.ErrNotFound.WithMessage("role not found")
		}
		return nil
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

// DeleteRole deletes a custom role (its assignments cascade).
func (s *Service) DeleteRole(ctx context.Context, id int64) error {
	return s.mutate(ctx, func(tx pgx.Tx) error {
		var builtin bool
		err := tx.QueryRow(ctx, `SELECT builtin FROM roles WHERE id = $1`, id).Scan(&builtin)
		if store.IsNoRows(err) {
			return core.ErrNotFound.WithMessage("role not found")
		}
		if err != nil {
			return err
		}
		if builtin {
			return errBuiltinRole
		}
		_, err = tx.Exec(ctx, `DELETE FROM roles WHERE id = $1`, id)
		return err
	})
}

// SetRolePermissions replaces the permissions of a (non-superuser) role.
func (s *Service) SetRolePermissions(ctx context.Context, id int64, keys []string) (*Role, error) {
	err := s.mutate(ctx, func(tx pgx.Tx) error {
		var superuser bool
		err := tx.QueryRow(ctx, `SELECT superuser FROM roles WHERE id = $1`, id).Scan(&superuser)
		if store.IsNoRows(err) {
			return core.ErrNotFound.WithMessage("role not found")
		}
		if err != nil {
			return err
		}
		if superuser {
			return errSuperuserPerms
		}
		if err := s.setRolePermissions(ctx, tx, id, keys); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `UPDATE roles SET updated_at = now() WHERE id = $1`, id)
		return err
	})
	if err != nil {
		return nil, err
	}
	return s.GetRole(ctx, id)
}

func (s *Service) setRolePermissions(ctx context.Context, tx pgx.Tx, roleID int64, keys []string) error {
	keys = dedupe(keys)
	rows, err := tx.Query(ctx, `SELECT id, key FROM permissions WHERE key = ANY($1) AND status <> 'removed'`, keys)
	if err != nil {
		return err
	}
	found := map[string]int64{}
	for rows.Next() {
		var id int64
		var k string
		if err := rows.Scan(&id, &k); err != nil {
			rows.Close()
			return err
		}
		found[k] = id
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	var unknown []string
	ids := make([]int64, 0, len(keys))
	for _, k := range keys {
		id, ok := found[k]
		if !ok {
			unknown = append(unknown, k)
			continue
		}
		ids = append(ids, id)
	}
	if len(unknown) > 0 {
		return core.InvalidFields(core.FieldError{Field: "permission_keys", Code: "unknown", Message: "unknown permissions: " + strings.Join(unknown, ", ")})
	}
	if _, err := tx.Exec(ctx, `DELETE FROM role_permissions WHERE role_id = $1 AND permission_id <> ALL($2)`, roleID, ids); err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO role_permissions (role_id, permission_id) SELECT $1, unnest($2::bigint[]) ON CONFLICT DO NOTHING`, roleID, ids)
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
// superuser role; the last active superuser cannot lose it.
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
	if superChanged && actorID != 0 {
		actorSuper, err := s.isSuperuserTx(ctx, tx, actorID)
		if err != nil {
			return 0, err
		}
		if !actorSuper {
			return 0, errSuperuserGrantor
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
	if _, err := tx.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1 AND role_id <> ALL($2)`, userID, ids); err != nil {
		return 0, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO user_roles (user_id, role_id) SELECT $1, unnest($2::bigint[]) ON CONFLICT DO NOTHING`, userID, ids); err != nil {
		return 0, err
	}
	return v, nil
}

// isSuperuserTx reports whether userID currently holds a superuser role.
func (s *Service) isSuperuserTx(ctx context.Context, tx pgx.Tx, userID int64) (bool, error) {
	var su bool
	err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
        JOIN users u ON u.id = ur.user_id AND u.deleted_at IS NULL AND u.status = 'active'
        WHERE ur.user_id = $1 AND r.superuser)`, userID).Scan(&su)
	return su, err
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
