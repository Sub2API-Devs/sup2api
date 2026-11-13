package authz

import (
	"context"
	"fmt"
	"maps"
	"slices"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

func t(ctx context.Context, en, zh string) string { return core.Text(ctx, en, zh) }

// querier is the pool checks read through outside a transaction; nil for
// tests without a database, which never query.
func (s *Service) querier() store.Querier {
	if s.db == nil {
		return nil
	}
	return s.db.Pool
}

// usersRoleSet is the union of what the roles of userIDs grant (the grant
// view of RolesPermissions), whatever the users' status and never narrowed by
// an access key: the measure of a TARGET in SEC-H2 comparisons, and the base
// of grantSet. PermissionSet, the effective set, is empty for a disabled
// user, which is right for authorizing that user and wrong for deciding who
// may act on it. Tests without a database seed the cache and are answered
// from it.
func (s *Service) usersRoleSet(ctx context.Context, q store.Querier, userIDs []int64) (core.PermissionSet, error) {
	set, _, err := s.usersRoles(ctx, q, userIDs)
	return set, err
}

// usersRoles is usersRoleSet with the keys of those roles, sorted; tests
// without a database have no role keys.
func (s *Service) usersRoles(ctx context.Context, q store.Querier, userIDs []int64) (core.PermissionSet, []string, error) {
	if s.db == nil {
		return s.cachedUnion(userIDs), nil, nil
	}
	var keys []string
	if err := q.QueryRow(ctx, `SELECT COALESCE(array_agg(DISTINCT r.key ORDER BY r.key), '{}') FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ANY($1)`, userIDs).Scan(&keys); err != nil {
		return core.PermissionSet{}, nil, err
	}
	set, err := s.RolesPermissions(ctx, q, keys)
	return set, keys, err
}

// cachedUnion is usersRoleSet for tests without a database.
func (s *Service) cachedUnion(userIDs []int64) core.PermissionSet {
	set := core.PermissionSet{Keys: map[string]struct{}{}}
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, id := range userIDs {
		u := s.users[id]
		set.Superuser = set.Superuser || u.Superuser
		maps.Copy(set.Keys, u.Keys)
	}
	return set
}

// grantSet is what actorID may hand out and act upon: what its roles grant,
// narrowed by its access key, which never leaves a superuser. It reads
// through q, so a check inside a transaction sees that transaction and never
// this node's cache, which may lag another node's change (C-L4).
func (s *Service) grantSet(ctx context.Context, q store.Querier, actorID int64) (core.PermissionSet, error) {
	set, err := s.usersRoleSet(ctx, q, []int64{actorID})
	if err != nil {
		return core.PermissionSet{}, err
	}
	return core.RestrictToAccessKey(ctx, actorID, set), nil
}

// covers fails with deny, detailed by what is missing, unless actorID's
// grantSet holds all of want, the superuser flag included. The system (actor
// 0) is always covered.
func (s *Service) covers(ctx context.Context, q store.Querier, actorID int64, want core.PermissionSet, deny *core.Error) error {
	if actorID == 0 {
		return nil
	}
	set, err := s.grantSet(ctx, q, actorID)
	if err != nil {
		return err
	}
	return within(set, want, deny)
}

// within fails with deny, detailed by what is missing, unless set holds all
// of want.
func within(set, want core.PermissionSet, deny *core.Error) error {
	if m := set.Missing(want); !m.Empty() {
		return deny.WithDetails(m.Details())
	}
	return nil
}

// cannotGrant is the denial of a grant beyond the actor's own.
func cannotGrant(ctx context.Context) *core.Error {
	return core.ErrPermissionDenied.WithMessage(t(ctx,
		"you cannot grant permissions you don't have",
		"你不能授予自己没有的权限"))
}

// notAssignable is the denial of assigning or revoking a role that is not on
// the actor's assignable list.
func notAssignable(ctx context.Context, roleKey string) *core.Error {
	return core.ErrPermissionDenied.WithMessage(t(ctx,
		"you cannot assign or revoke this role",
		"你不能分配或撤销这个角色")).WithDetails(map[string]any{"role": roleKey})
}

// superAdminTransferOnly is the denial of assigning or revoking the super
// admin role, which only changes hands by transfer.
func superAdminTransferOnly(ctx context.Context) *core.Error {
	return core.ErrPermissionDenied.WithMessage(t(ctx,
		"the super admin role cannot be assigned or revoked; transfer it instead",
		"超级管理员角色不能分配或撤销，只能移交"))
}

// cannotActOn is the denial of an action on a target holding more than the
// actor. Only a non-superuser misses anything, so it misses the flag of a
// superuser target.
func cannotActOn(ctx context.Context, target core.PermissionSet) *core.Error {
	if target.Superuser {
		return core.ErrPermissionDenied.WithMessage(t(ctx, "you cannot modify a superuser", "你不能修改超级用户"))
	}
	return core.ErrPermissionDenied.WithMessage(t(ctx, "you cannot modify a user with higher privileges", "你不能修改权限更高的用户"))
}

// cannotActOnPeer is the denial of an action on a target holding roleKey, a
// role the actor cannot assign (peer protection, canActOnUsers).
func cannotActOnPeer(ctx context.Context, roleKey string) *core.Error {
	return core.ErrPermissionDenied.WithMessage(t(ctx,
		"you cannot modify a user holding a role you cannot assign",
		"你不能修改持有你无权分配的角色的用户")).WithDetails(map[string]any{"role": roleKey})
}

// cannotActOnRole is the denial of a change to a role granting more than the
// actor holds (editableRole).
func cannotActOnRole(ctx context.Context) *core.Error {
	return core.ErrPermissionDenied.WithMessage(t(ctx,
		"you cannot change a role with permissions you don't have",
		"你不能修改含有你所没有权限的角色"))
}

// builtinRoleSuperOnly is the denial of a change to a built-in role by anyone
// but the super admin (editableRole).
func builtinRoleSuperOnly(ctx context.Context) *core.Error {
	return core.ErrPermissionDenied.WithMessage(t(ctx,
		"only the super admin can change built-in roles",
		"只有超级管理员可以修改内置角色"))
}

// audit records one audit_logs row of an authz change through q, the
// change's transaction.
func (s *Service) audit(ctx context.Context, q store.Querier, actorID int64, action, targetType string, id any, detail any) error {
	return audit.Audit(ctx, q, actorID, action, targetType, fmt.Sprint(id), detail)
}

// CanGrant checks whether the actor can grant the given permissions. Returns
// an error if any permission in perms is not held by the actor. This prevents
// privilege escalation where a user grants themselves or others permissions
// they don't have (CONTRACTS §4.1, SEC-H2).
func (s *Service) CanGrant(ctx context.Context, actorID int64, perms []string) error {
	return s.covers(ctx, s.querier(), actorID, core.PermissionSetOf(perms...), cannotGrant(ctx))
}

// CanActOn validates the actor may act on a target with the given permissions (CONTRACTS §4.1, SEC-H2).
// Returns an error if the target holds any permission the actor doesn't have.
func (s *Service) CanActOn(ctx context.Context, actorID int64, targetPerms []string) error {
	target := core.PermissionSetOf(targetPerms...)
	return s.covers(ctx, s.querier(), actorID, target, cannotActOn(ctx, target))
}

// CanActOnUser is CanActOnUsers for one target.
func (s *Service) CanActOnUser(ctx context.Context, actorID, targetID int64) error {
	return s.CanActOnUsers(ctx, actorID, targetID)
}

// CanActOnUsers implements core.UserGuard: what the targets' roles grant
// together must be within the actor's grantSet, and every role a target
// holds, the default user role aside, must be one the actor may assign (peer
// protection: with the default lists an admin leaves other admins alone and
// an operator other operators; the user role is left out so that a role with
// user:update and no assignable list still serves plain users). Each target
// within the actor is the same as their union within it, so one query serves
// any number of targets. The target's side is what its ROLES grant, not what
// it can do right now: a disabled user can do nothing, and comparing against
// that would let anyone with user:update re-enable a disabled admin or set
// its password and take the account over (SEC-H2). The actor itself among the
// targets and the system (actor 0) pass; ActOnOthers refuses the former. An
// access key acts with less than its owner's roles, so its owner is a target
// like any other: no access key changes a superuser, its own included
// (decision 1).
func (s *Service) CanActOnUsers(ctx context.Context, actorID int64, targetIDs ...int64) error {
	return s.canActOnUsers(ctx, s.querier(), actorID, targetIDs...)
}

// canActOnUsers is CanActOnUsers reading through q.
func (s *Service) canActOnUsers(ctx context.Context, q store.Querier, actorID int64, targetIDs ...int64) error {
	ids := otherTargets(ctx, actorID, targetIDs)
	if len(ids) == 0 {
		return nil
	}
	actor, err := s.grantSet(ctx, q, actorID)
	if err != nil {
		return err
	}
	return s.targetsWithin(ctx, q, actor, ids)
}

// otherTargets are the targets CanActOnUsers judges, sorted and distinct:
// none for the system, and all but the actor itself unless it acts through
// its access key.
func otherTargets(ctx context.Context, actorID int64, targetIDs []int64) []int64 {
	if actorID == 0 {
		return nil
	}
	self := actorID
	if core.ByAccessKey(ctx, actorID) {
		self = 0
	}
	ids := slices.DeleteFunc(slices.Clone(targetIDs), func(id int64) bool { return id == self })
	slices.Sort(ids)
	return slices.Compact(ids)
}

// targetsWithin fails unless actor, a grantSet, may act on the users ids
// (CanActOnUsers). Tests without a database have no role keys, so peer
// protection is not checked there.
func (s *Service) targetsWithin(ctx context.Context, q store.Querier, actor core.PermissionSet, ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	target, roles, err := s.usersRoles(ctx, q, ids)
	if err != nil {
		return err
	}
	if err := within(actor, target, cannotActOn(ctx, target)); err != nil {
		return err
	}
	for _, key := range roles {
		if key != RoleUser && !actor.CanAssign(key) {
			return cannotActOnPeer(ctx, key)
		}
	}
	return nil
}
