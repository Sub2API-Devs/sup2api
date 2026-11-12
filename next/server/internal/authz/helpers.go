package authz

import (
	"context"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func t(ctx context.Context, en, zh string) string { return core.Text(ctx, en, zh) }

// rolePermissionSet is what userID's roles grant, whatever the user's status
// (and never narrowed by the caller's access key): the measure of a TARGET in
// SEC-H2 comparisons. PermissionSet, the effective set, is empty for a
// disabled user, which is right for authorizing that user and wrong for
// deciding who may act on it. Tests without a database seed the cache and
// are answered from it.
func (s *Service) rolePermissionSet(ctx context.Context, userID int64) (core.PermissionSet, error) {
	if s.db == nil {
		s.mu.RLock()
		set, ok := s.users[userID]
		s.mu.RUnlock()
		if ok {
			return set, nil
		}
		return core.PermissionSet{Keys: map[string]struct{}{}}, nil
	}
	keys, err := s.UserRoleKeys(ctx, s.db.Pool, userID)
	if err != nil {
		return core.PermissionSet{}, err
	}
	return s.RolesPermissions(ctx, s.db.Pool, keys)
}

// CanGrant checks whether the actor can grant the given permissions. Returns
// an error if any permission in perms is not held by the actor. This prevents
// privilege escalation where a user grants themselves or others permissions
// they don't have (CONTRACTS §4.1, SEC-H2).
func (s *Service) CanGrant(ctx context.Context, actorID int64, perms []string) error {
	return s.canGrantSet(ctx, actorID, core.PermissionSetOf(perms...))
}

// canGrantSet fails unless the actor holds all of want, the superuser flag
// included: only a superuser grants a superuser role (H1).
func (s *Service) canGrantSet(ctx context.Context, actorID int64, want core.PermissionSet) error {
	m, err := s.actorMissing(ctx, actorID, want)
	if err != nil || m.Empty() {
		return err
	}
	return core.ErrPermissionDenied.WithMessage(t(ctx,
		"you cannot grant permissions you don't have",
		"你不能授予自己没有的权限")).WithDetails(m.Details())
}

// CanActOn validates the actor may act on a target with the given permissions (CONTRACTS §4.1, SEC-H2).
// Returns an error if the target holds any permission the actor doesn't have.
func (s *Service) CanActOn(ctx context.Context, actorID int64, targetPerms []string) error {
	return s.canActOnSet(ctx, actorID, core.PermissionSetOf(targetPerms...))
}

// canActOnSet fails unless the actor holds all of target, the superuser flag
// included.
func (s *Service) canActOnSet(ctx context.Context, actorID int64, target core.PermissionSet) error {
	m, err := s.actorMissing(ctx, actorID, target)
	if err != nil || m.Empty() {
		return err
	}
	msg := t(ctx, "you cannot modify a user with higher privileges", "你不能修改权限更高的用户")
	if m.Superuser {
		msg = t(ctx, "you cannot modify a superuser", "你不能修改超级用户")
	}
	return core.ErrPermissionDenied.WithMessage(msg).WithDetails(m.Details())
}

// actorMissing is what want holds beyond the actor's effective set, which
// its access key narrows and never leaves a superuser. The system (actor 0)
// misses nothing, and nothing is missed from an empty want, so neither needs
// the actor's set.
func (s *Service) actorMissing(ctx context.Context, actorID int64, want core.PermissionSet) (core.Missing, error) {
	if actorID == 0 || (!want.Superuser && len(want.Keys) == 0) {
		return core.Missing{}, nil
	}
	set, err := s.permissionSetCached(ctx, actorID)
	if err != nil {
		return core.Missing{}, err
	}
	return set.Missing(want), nil
}

// CanActOnUser checks whether the actor can act on the target user by comparing
// their permission sets. This is a convenience wrapper around CanActOn for user-to-user checks.
//
// The target's side is what its ROLES grant, not what it can do right now:
// a disabled user can do nothing, and comparing against that would let anyone
// with user:update re-enable a disabled admin or set its password and take
// the account over (SEC-H2).
func (s *Service) CanActOnUser(ctx context.Context, actorID, targetID int64) error {
	if actorID == 0 || actorID == targetID {
		return nil
	}
	targetSet, err := s.rolePermissionSet(ctx, targetID)
	if err != nil {
		return err
	}
	return s.canActOnSet(ctx, actorID, targetSet)
}

// permissionSetCached returns the cached permission set or falls back to PermissionSet.
func (s *Service) permissionSetCached(ctx context.Context, userID int64) (core.PermissionSet, error) {
	s.mu.RLock()
	set, ok := s.users[userID]
	min := s.minVersion
	s.mu.RUnlock()
	if ok && set.Version >= min {
		return core.RestrictToAccessKey(ctx, userID, set), nil
	}
	return s.PermissionSet(ctx, userID)
}
