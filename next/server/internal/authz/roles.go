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
	// AssignableRoleKeys lists the roles its holders may assign, and
	// AssignCustom adds every custom role (role_assignable_roles).
	AssignableRoleKeys []string  `json:"assignable_role_keys"`
	AssignCustom       bool      `json:"assign_custom"`
	UserCount          int64     `json:"user_count"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

var roleKeyRe = regexp.MustCompile(`^[a-z][a-z0-9_]{1,49}$`)

var (
	errRoleNotFound        = core.ErrNotFound.WithMessage("role not found")
	errBuiltinRole         = core.ErrConflict.WithMessage("built-in roles cannot be deleted")
	errNotBuiltinRole      = core.ErrConflict.WithMessage("only built-in roles can be reset")
	errSuperuserRoleFrozen = core.ErrConflict.WithMessage("the super admin role cannot be changed")
	errLastSuperAdmin      = core.ErrConflict.WithMessage("the last super admin cannot be removed")
)

var roleSelect = `
SELECT r.id, r.key, r.name, r.description, r.builtin, r.superuser, r.created_at, r.updated_at,
    COALESCE((SELECT array_agg(g.key ORDER BY g.sort, g.key) FROM (
        SELECT p.key, p.sort FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = r.id
        UNION ALL
        SELECT p.key || ':' || rs.scope, p.sort FROM role_permission_scopes rs JOIN permissions p ON p.id = rs.permission_id
        WHERE rs.role_id = r.id AND NOT (` + ownShadowed + `)) g), '{}'),
    COALESCE((SELECT array_agg(ar.key ORDER BY ar.key) FROM role_assignable_roles ra
        JOIN roles ar ON ar.id = ra.assignable_role_id AND NOT ar.superuser WHERE ra.role_id = r.id), '{}'),
    r.assign_custom,
    (SELECT count(*) FROM user_roles ur JOIN users u ON u.id = ur.user_id
        WHERE ur.role_id = r.id AND u.deleted_at IS NULL)
FROM roles r`

func scanRole(row pgx.Row) (*Role, error) {
	var r Role
	err := row.Scan(&r.ID, &r.Key, &r.Name, &r.Description, &r.Builtin, &r.Superuser, &r.CreatedAt, &r.UpdatedAt, &r.PermissionKeys, &r.AssignableRoleKeys, &r.AssignCustom, &r.UserCount)
	if err != nil {
		return nil, err
	}
	r.PermissionKeys = canonicalKeys(r.PermissionKeys)
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
// (name, description, permissions, assignable list, reset, delete), any other
// built-in role is the super admin's alone to change (decision 6), and a
// custom role must be within the actor's grantSet (cannotActOnRole, M5: an
// actor who could weaken a role above it could then act on that role's
// holders). The system (actor 0) passes. Every role write goes through it.
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
	case r.Builtin:
		return r, s.covers(ctx, tx, actorID, core.PermissionSet{Superuser: true}, builtinRoleSuperOnly(ctx))
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
	// AssignableRoleKeys and AssignCustom are the role's assignable list.
	AssignableRoleKeys []string `json:"assignable_role_keys"`
	AssignCustom       bool     `json:"assign_custom"`
}

// CreateRole creates a custom (non-superuser) role; its key may not be one
// reserved for a built-in role (reservedRoleKey). The actor must hold all
// permissions being granted and be able to assign every role the new role
// may assign, as for SetRolePermissions and SetRoleAssignable (CONTRACTS
// §43.6), checked inside the transaction after Bump.
func (s *Service) CreateRole(ctx context.Context, actorID int64, in CreateRoleInput) (*Role, error) {
	var fields []core.FieldError
	if !roleKeyRe.MatchString(in.Key) {
		fields = append(fields, core.FieldError{Field: "key", Code: "invalid", Message: "must match ^[a-z][a-z0-9_]{1,49}$"})
	}
	if reservedRoleKey(in.Key) {
		fields = append(fields, core.FieldError{Field: "key", Code: "reserved", Message: "this key is reserved for a built-in role"})
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
		keys, grants, err := resolvePermissions(ctx, tx, in.PermissionKeys)
		if err != nil {
			return err
		}
		assign, err := assignableRoles(ctx, tx, in.AssignableRoleKeys)
		if err != nil {
			return err
		}
		grant, err := grantOf(ctx, tx, in.Key, keys, roleKeysOf(assign), in.AssignCustom)
		if err != nil {
			return err
		}
		if err := s.covers(ctx, tx, actorID, grant, cannotGrant(ctx)); err != nil {
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
		if err := writeGrants(ctx, tx, id, grants, false); err != nil {
			return err
		}
		if err := setRoleAssignable(ctx, tx, id, assign, in.AssignCustom); err != nil {
			return err
		}
		return s.audit(ctx, tx, actorID, "role.create", "role", id, map[string]any{"key": in.Key, "permission_keys": keys,
			"assignable_role_keys": roleKeysOf(assign), "assign_custom": in.AssignCustom})
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
// (editableRole; built-in roles included, by the super admin).
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
// assignments cascade, so while it has holders deleting it revokes it and
// the role must be on the actor's assignable list.
func (s *Service) DeleteRole(ctx context.Context, actorID, id int64) error {
	return s.mutate(ctx, func(tx pgx.Tx) error {
		r, err := s.editableRole(ctx, tx, actorID, id)
		if err != nil {
			return err
		}
		if r.Builtin {
			return errBuiltinRole
		}
		if r.UserCount > 0 && actorID != 0 {
			actor, err := s.grantSet(ctx, tx, actorID)
			if err != nil {
				return err
			}
			if !actor.CanAssign(r.Key) {
				return notAssignable(ctx, r.Key)
			}
		}
		if _, err := tx.Exec(ctx, `DELETE FROM roles WHERE id = $1`, id); err != nil {
			return err
		}
		return s.audit(ctx, tx, actorID, "role.delete", "role", id, map[string]any{"key": r.Key})
	})
}

// ResetRole restores a built-in role actorID may edit (editableRole) to its
// defaults: name, description, core permissions and assignable list. Plugin
// permissions on the role are left alone, since they are granted per plugin
// at consent time. The actor must hold every default, as for
// SetRolePermissions and SetRoleAssignable; what the reset drops is within
// the actor already (editableRole), so it cannot weaken a role above the
// actor (C-L2).
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
		keys, grants, err := resolvePermissions(ctx, tx, def.defaultPermissions())
		if err != nil {
			return err
		}
		// Defaults naming a built-in role not created yet are skipped, as
		// SyncCore does.
		assign, err := queryRoles(ctx, tx, `SELECT id, key, superuser FROM roles WHERE key = ANY($1) AND builtin AND NOT superuser ORDER BY key`, def.assignable)
		if err != nil {
			return err
		}
		grant, err := grantOf(ctx, tx, r.Key, keys, roleKeysOf(assign), def.assignCustom)
		if err != nil {
			return err
		}
		if err := s.covers(ctx, tx, actorID, grant, cannotGrant(ctx)); err != nil {
			return err
		}
		if err := setRoleAssignable(ctx, tx, id, assign, def.assignCustom); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE roles SET name = $2, description = $3, updated_at = now() WHERE id = $1`,
			id, def.name, def.description); err != nil {
			return err
		}
		if err := writeGrants(ctx, tx, id, grants, true); err != nil {
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
		live, grants, err := resolvePermissions(ctx, tx, keys)
		if err != nil {
			return err
		}
		added := notImplied(live, r.PermissionKeys)
		if err := s.covers(ctx, tx, actorID, core.PermissionSetOf(added...), cannotGrant(ctx)); err != nil {
			return err
		}
		if err := writeGrants(ctx, tx, id, grants, false); err != nil {
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

// AssignableInput is the body of PUT /roles/:id/assignable.
type AssignableInput struct {
	RoleKeys     []string `json:"role_keys"`
	AssignCustom bool     `json:"assign_custom"`
}

// SetRoleAssignable replaces the assignable list of a role actorID may edit
// (editableRole). The actor must be able to assign what is added (the
// "every custom role" flag included); what the role keeps is within it
// already.
func (s *Service) SetRoleAssignable(ctx context.Context, actorID, id int64, in AssignableInput) (*Role, error) {
	err := s.mutate(ctx, func(tx pgx.Tx) error {
		r, err := s.editableRole(ctx, tx, actorID, id)
		if err != nil {
			return err
		}
		assign, err := assignableRoles(ctx, tx, in.RoleKeys)
		if err != nil {
			return err
		}
		keys := roleKeysOf(assign)
		added := addedKeys(keys, r.AssignableRoleKeys)
		grant, err := grantOf(ctx, tx, r.Key, nil, added, in.AssignCustom && !r.AssignCustom)
		if err != nil {
			return err
		}
		if err := s.covers(ctx, tx, actorID, grant, cannotGrant(ctx)); err != nil {
			return err
		}
		if err := setRoleAssignable(ctx, tx, id, assign, in.AssignCustom); err != nil {
			return err
		}
		return s.audit(ctx, tx, actorID, "role.assignable", "role", id, map[string]any{"role_keys": keys, "assign_custom": in.AssignCustom, "added": added})
	})
	if err != nil {
		return nil, err
	}
	return s.GetRole(ctx, id)
}

// assignableRoles resolves keys for an assignable list: each must exist and
// none may be a superuser role, which is only ever transferred.
func assignableRoles(ctx context.Context, q store.Querier, keys []string) ([]roleRef, error) {
	roles, err := resolveRoles(ctx, q, dedupe(keys))
	if err != nil {
		return nil, err
	}
	if slices.ContainsFunc(roles, func(r roleRef) bool { return r.superuser }) {
		return nil, core.InvalidFields(core.FieldError{Field: "role_keys", Code: "superuser", Message: "the super admin role cannot be assignable"})
	}
	return roles, nil
}

// grantOf is what a write to role roleKey hands out to its holders: perms,
// and roles plus, when custom, the "every custom role" flag and every custom
// role but roleKey as what they may assign, expanded as RolesPermissions
// does. Expanding it means the actor must be able to assign each of those
// roles: a wildcard never covers the actor's own role (§43.6), so a holder
// of a custom role with assign_custom cannot hand out, through another role,
// a wildcard that manages its own role's holders.
func grantOf(ctx context.Context, q store.Querier, roleKey string, perms, roles []string, custom bool) (core.PermissionSet, error) {
	set := core.PermissionSetOf(perms...)
	set.Assignable = core.PermissionSetOf(roles...).Keys
	set.AssignCustom = custom
	if !custom {
		return set, nil
	}
	var keys []string
	if err := q.QueryRow(ctx, `SELECT COALESCE(array_agg(key), '{}') FROM roles WHERE NOT builtin AND key <> $1`, roleKey).Scan(&keys); err != nil {
		return core.PermissionSet{}, err
	}
	for _, k := range keys {
		set.Assignable[k] = struct{}{}
	}
	return set, nil
}

// setRoleAssignable makes roles, plus every custom role when custom, the
// role's assignable list.
func setRoleAssignable(ctx context.Context, tx pgx.Tx, roleID int64, roles []roleRef, custom bool) error {
	ids := roleIDsOf(roles)
	if _, err := tx.Exec(ctx, `DELETE FROM role_assignable_roles WHERE role_id = $1 AND assignable_role_id <> ALL($2)`, roleID, ids); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO role_assignable_roles (role_id, assignable_role_id) SELECT $1, unnest($2::bigint[]) ON CONFLICT DO NOTHING`, roleID, ids); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `UPDATE roles SET assign_custom = $2, updated_at = now() WHERE id = $1`, roleID, custom)
	return err
}

// ------------------------------------------------------------ user roles (used by iam)

// SetUserRoles replaces a user's roles inside tx, bumping the authz version
// (call Committed with the returned version after commit). actorID is the
// acting user (0 = system); checkAssignment judges what the change adds and
// removes, and a change is audited as user.roles.
func (s *Service) SetUserRoles(ctx context.Context, tx pgx.Tx, actorID, userID int64, roleKeys []string) (int64, error) {
	v, err := s.Bump(ctx, tx)
	if err != nil {
		return 0, err
	}
	want, err := resolveRoles(ctx, tx, dedupe(roleKeys))
	if err != nil {
		return 0, err
	}
	cur, err := queryRoles(ctx, tx, `SELECT r.id, r.key, r.superuser FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1 ORDER BY r.key`, userID)
	if err != nil {
		return 0, err
	}
	added, removed := diffRoles(want, cur), diffRoles(cur, want)
	if len(added)+len(removed) == 0 {
		return v, nil
	}
	if err := s.checkAssignment(ctx, tx, actorID, userID, len(cur) == 0, added, removed); err != nil {
		return 0, err
	}
	if err := writeUserRoles(ctx, tx, userID, want); err != nil {
		return 0, err
	}
	return v, s.audit(ctx, tx, actorID, "user.roles", "user", userID, map[string]any{"added": roleKeysOf(added), "removed": roleKeysOf(removed)})
}

// checkAssignment fails unless actorID may add and remove these roles on
// userID: the super admin role is never assigned or revoked here (it is
// transferred); every role must be on the actor's assignable list, except
// the default role for a user who has none yet (roleless); the actor must
// be able to act on the user; and the added roles, with what they may assign
// in turn, must be within the actor's grantSet. The system (actor 0) may
// grant the initial super admin, never revoke one.
func (s *Service) checkAssignment(ctx context.Context, q store.Querier, actorID, userID int64, roleless bool, added, removed []roleRef) error {
	if actorID == 0 {
		if slices.ContainsFunc(removed, func(r roleRef) bool { return r.superuser }) {
			return superAdminTransferOnly(ctx)
		}
		return nil
	}
	actor, err := s.grantSet(ctx, q, actorID)
	if err != nil {
		return err
	}
	for _, r := range slices.Concat(added, removed) {
		if err := assignable(ctx, actor, r, roleless); err != nil {
			return err
		}
	}
	if err := s.canActOnUsers(ctx, q, actorID, core.ActOnIdentity, userID); err != nil {
		return err
	}
	grant, err := s.RolesPermissions(ctx, q, roleKeysOf(added))
	if err != nil {
		return err
	}
	return within(actor, grant, cannotGrant(ctx))
}

// assignable fails unless actor may assign or revoke r (see checkAssignment).
func assignable(ctx context.Context, actor core.PermissionSet, r roleRef, roleless bool) error {
	switch {
	case r.superuser:
		return superAdminTransferOnly(ctx)
	case actor.CanAssign(r.key), roleless && r.key == RoleUser:
		return nil
	}
	return notAssignable(ctx, r.key)
}

// roleRef is a role as a user's assignment holds it.
type roleRef struct {
	id        int64
	key       string
	superuser bool
}

// queryRoles runs sql, which selects id, key and superuser of roles.
func queryRoles(ctx context.Context, q store.Querier, sql string, args ...any) ([]roleRef, error) {
	rows, err := q.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (roleRef, error) {
		var r roleRef
		err := row.Scan(&r.id, &r.key, &r.superuser)
		return r, err
	})
}

// resolveRoles returns the roles of keys, failing on unknown ones.
func resolveRoles(ctx context.Context, q store.Querier, keys []string) ([]roleRef, error) {
	roles, err := queryRoles(ctx, q, `SELECT id, key, superuser FROM roles WHERE key = ANY($1) ORDER BY key`, keys)
	if err != nil {
		return nil, err
	}
	if unknown := addedKeys(keys, roleKeysOf(roles)); len(unknown) > 0 {
		return nil, core.InvalidFields(core.FieldError{Field: "role_keys", Code: "unknown", Message: "unknown roles: " + strings.Join(unknown, ", ")})
	}
	return roles, nil
}

// diffRoles returns the roles in a that are not in b.
func diffRoles(a, b []roleRef) []roleRef {
	return slices.DeleteFunc(slices.Clone(a), func(r roleRef) bool {
		return slices.ContainsFunc(b, func(o roleRef) bool { return o.id == r.id })
	})
}

func roleKeysOf(roles []roleRef) []string {
	keys := make([]string, len(roles))
	for i, r := range roles {
		keys[i] = r.key
	}
	return keys
}

func roleIDsOf(roles []roleRef) []int64 {
	ids := make([]int64, len(roles))
	for i, r := range roles {
		ids[i] = r.id
	}
	return ids
}

// writeUserRoles makes roles the user's roles.
func writeUserRoles(ctx context.Context, tx pgx.Tx, userID int64, roles []roleRef) error {
	ids := roleIDsOf(roles)
	if _, err := tx.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1 AND role_id <> ALL($2)`, userID, ids); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `INSERT INTO user_roles (user_id, role_id) SELECT $1, unnest($2::bigint[]) ON CONFLICT DO NOTHING`, userID, ids)
	return err
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

// AssignableRole is one role in GET /me/assignable-roles.
type AssignableRole struct {
	Key     string             `json:"key"`
	Name    core.LocalizedText `json:"name"`
	Builtin bool               `json:"builtin"`
	// Grantable: what the role carries is within the caller, so assigning
	// it passes; the Missing fields say what is not, as in a denial.
	Grantable           bool     `json:"grantable"`
	Missing             []string `json:"missing"`
	MissingAssignable   []string `json:"missing_assignable"`
	MissingAssignCustom bool     `json:"missing_assign_custom"`
}

// AssignableRoles lists the roles on actorID's assignable list (its
// grantSet, so none under an access key), built-in first, never a superuser
// role, each with whether the actor may grant it.
func (s *Service) AssignableRoles(ctx context.Context, actorID int64) ([]AssignableRole, error) {
	q := s.db.Pool
	actor, err := s.grantSet(ctx, q, actorID)
	if err != nil {
		return nil, err
	}
	rows, err := q.Query(ctx, `SELECT key, name, builtin FROM roles WHERE NOT superuser ORDER BY builtin DESC, id`)
	if err != nil {
		return nil, err
	}
	roles, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (AssignableRole, error) {
		var r AssignableRole
		err := row.Scan(&r.Key, &r.Name, &r.Builtin)
		return r, err
	})
	if err != nil {
		return nil, err
	}
	out := []AssignableRole{}
	for _, r := range roles {
		if !actor.CanAssign(r.Key) {
			continue
		}
		grant, err := s.RolesPermissions(ctx, q, []string{r.Key})
		if err != nil {
			return nil, err
		}
		m := actor.Missing(grant)
		r.Grantable = m.Empty()
		r.Missing = append([]string{}, m.Keys...)
		r.MissingAssignable = append([]string{}, m.Assign...)
		r.MissingAssignCustom = m.AssignCustom
		out = append(out, r)
	}
	return out, nil
}

// ------------------------------------------------------------ permission listing

// PermissionItem is one permission in GET /permissions.
type PermissionItem struct {
	Key         string             `json:"key"`
	Label       core.LocalizedText `json:"label"`
	Description core.LocalizedText `json:"description"`
	Sensitive   bool               `json:"sensitive"`
	// StepUp: using it may need a step-up proof (catalog stepUp).
	StepUp bool `json:"step_up"`
	// ScopeType: the key takes a scope over this resource ("account",
	// "proxy"; CONTRACTS §21), "" for none.
	ScopeType string `json:"scope_type"`
	Status    string `json:"status"`
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
// catalog order, then plugin modules by plugin key. The former own-level
// keys are left out: the editor grants <action>:own instead.
func (s *Service) ListPermissions(ctx context.Context) ([]*PermissionModule, error) {
	rows, err := s.db.Pool.Query(ctx, `
SELECT p.key, p.module, p.label, p.description, p.source, p.plugin_key, p.sensitive, p.status, p.scope_type, pl.name
FROM permissions p LEFT JOIN plugins pl ON pl.key = p.plugin_key
WHERE p.key <> ALL($1)
ORDER BY p.source, p.module, p.sort, p.key`, legacyOwnKeys())
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
		if err := rows.Scan(&it.Key, &module, &it.Label, &it.Description, &source, &pluginKey, &it.Sensitive, &it.Status, &it.ScopeType, &pluginName); err != nil {
			return nil, err
		}
		if it.Description == nil {
			it.Description = core.LocalizedText{}
		}
		it.StepUp = stepUpFlag(it.Key)
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
