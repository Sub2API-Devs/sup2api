package authz

import (
	"context"
	"fmt"
	"slices"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
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
		for _, k := range u.KeyList() {
			set.Add(k)
		}
	}
	return set
}

// grantSet is what actorID may hand out (grants and role assignment): what
// its roles grant, narrowed by its access key, which never leaves a
// superuser. Whom it acts on is its roles alone (canActOnUsers, FU6). It reads
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
	notManageable := map[string]any{"reason": "not_manageable"}
	if target.Superuser {
		return core.ErrPermissionDenied.WithMessage(t(ctx, "you cannot modify a superuser", "你不能修改超级用户")).WithDetails(notManageable)
	}
	return core.ErrPermissionDenied.WithMessage(t(ctx, "you cannot modify a user with higher privileges", "你不能修改权限更高的用户")).WithDetails(notManageable)
}

// cannotActOnPeer is the denial of an action on a target holding roleKey, a
// role the actor cannot assign: a user it does not manage (canActOnUsers).
func cannotActOnPeer(ctx context.Context, roleKey string) *core.Error {
	return core.ErrPermissionDenied.WithMessage(t(ctx,
		"you cannot modify a user holding a role you cannot assign",
		"你不能修改持有你无权分配的角色的用户")).WithDetails(map[string]any{"role": roleKey, "reason": "not_manageable"})
}

// notPlainUser is the denial of a balance adjustment for a target holding
// roleKey, a role besides the default one, by an actor (or its access key)
// without balance:adjust:any (canActOnUsers, core.ActOnBalance).
func notPlainUser(ctx context.Context, roleKey string) *core.Error {
	return core.ErrPermissionDenied.WithMessage(t(ctx,
		"you can only adjust the balance of users holding no role but user",
		"你只能给只持有普通用户角色的用户调余额")).WithDetails(map[string]any{"role": roleKey, "reason": "not_plain_user", "missing": []string{string(perm.BalanceAdjustAny)}})
}

// cannotActOnRole is the denial of a change to a role granting more than the
// actor holds (editableRole).
func cannotActOnRole(ctx context.Context) *core.Error {
	return core.ErrPermissionDenied.WithMessage(t(ctx,
		"you cannot change a role with permissions you don't have",
		"你不能修改含有你所没有权限的角色"))
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

// CanActOnUser is CanActOnUsers for one target.
func (s *Service) CanActOnUser(ctx context.Context, actorID int64, action core.UserAction, targetID int64) error {
	return s.CanActOnUsers(ctx, actorID, action, targetID)
}

// CanActOnUsers implements core.UserGuard, the one rule of whom a caller may
// act on (FU6): every role a target holds, the default user role aside, must
// be one the actor may assign (its assignable list is the roles it manages;
// with the default lists an admin manages neither other admins nor itself,
// the user role is left out so that a role with user:update and no
// assignable list still serves plain users), and what the targets' roles
// grant must be within the actor's (SEC-H2). A superuser manages everyone,
// itself included. The target's side is what its ROLES grant, not what it
// can do right now: a disabled user can do nothing, and comparing against
// that would let anyone with user:update re-enable a disabled admin and take
// the account over. The actor's side is its roles too: an access key narrows
// what the caller may do (the route's permission), not whom. ActOnIdentity
// on a superuser through an access key needs a step-up proof (期 4 S3, in
// place of decision 1's session-only rule). ActOnBalance on a target holding
// a role besides user needs balance:adjust:any in the actor's roles and,
// being a permission key, in its access key too, as balance:adjust is.
// An action on oneself that passes (only a superuser's, with the default
// lists; also a custom role whose list names itself: assign_custom never
// covers the holder's own roles, RolesPermissions) is audited here, the one
// place. The row
// says the check passed, not that the action then succeeded.
func (s *Service) CanActOnUsers(ctx context.Context, actorID int64, action core.UserAction, targetIDs ...int64) error {
	return s.canActOnUsers(ctx, s.querier(), actorID, action, targetIDs...)
}

// canActOnUsers is CanActOnUsers reading through q, the transaction of the
// change when there is one.
func (s *Service) canActOnUsers(ctx context.Context, q store.Querier, actorID int64, action core.UserAction, targetIDs ...int64) error {
	ids := slices.Compact(slices.Sorted(slices.Values(targetIDs)))
	if actorID == 0 || len(ids) == 0 {
		return nil
	}
	actor, err := s.usersRoleSet(ctx, q, []int64{actorID})
	if err != nil {
		return err
	}
	target, roles, err := s.usersRoles(ctx, q, ids)
	if err != nil {
		return err
	}
	if err := within(actor, target, cannotActOn(ctx, target)); err != nil {
		return err
	}
	for _, key := range roles {
		switch {
		case key == RoleUser:
		case !actor.CanAssign(key):
			return cannotActOnPeer(ctx, key)
		case action == core.ActOnBalance && !core.RestrictToAccessKey(ctx, actorID, actor).Has(string(perm.BalanceAdjustAny)):
			return notPlainUser(ctx, key)
		}
	}
	// Only an actor that manages the superuser gets this far with one: the
	// super admin itself. Through an access key it needs a step-up proof:
	// the one the request spent on its own scope, or one of its own.
	if action == core.ActOnIdentity && target.Superuser && core.ByAccessKey(ctx, actorID) && core.StepUpSpent(ctx) == "" {
		if err := s.stepUpOrDeny().ConsumeStepUp(ctx, core.StepUpSuperAdminIdentity); err != nil {
			return err
		}
	}
	if !slices.Contains(ids, actorID) {
		return nil
	}
	return s.auditSelf(ctx, q, actorID)
}

// auditSelf records an action of actorID on itself that CanActOnUsers let
// through: self, and the session or access key it came by.
func (s *Service) auditSelf(ctx context.Context, q store.Querier, actorID int64) error {
	if s.db == nil {
		return nil // tests without a database: nowhere to audit
	}
	detail := map[string]any{"self": true, "via": "session", "request_id": core.RequestID(ctx)}
	if core.ByAccessKey(ctx, actorID) {
		key, _ := core.AccessKey(ctx)
		detail["via"], detail["access_key_id"] = "access_key", key.KeyID
	}
	return s.audit(ctx, q, actorID, "user.act_on_self", "user", actorID, detail)
}

// UseStepUp sets the verifier of the step-up proofs canActOnUsers asks for
// (iam, which is built after authz).
func (s *Service) UseStepUp(v core.StepUpVerifier) {
	s.mu.Lock()
	s.stepUp = v
	s.mu.Unlock()
}

// stepUpOrDeny is the step-up verifier, or one refusing every proof when
// none is set: failing closed.
func (s *Service) stepUpOrDeny() core.StepUpVerifier {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.stepUp == nil {
		return noStepUp{}
	}
	return s.stepUp
}

type noStepUp struct{}

func (noStepUp) ConsumeStepUp(_ context.Context, scope string) error {
	return core.ErrVerificationRequired.WithDetails(map[string]any{"scope": scope})
}
