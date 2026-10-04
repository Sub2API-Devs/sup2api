package authz

import (
	"context"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func t(ctx context.Context, en, zh string) string {
	if core.Locale(ctx) == "zh" {
		return zh
	}
	return en
}

// CanGrant checks whether the actor can grant the given permissions. Returns
// an error if any permission in perms is not held by the actor. This prevents
// privilege escalation where a user grants themselves or others permissions
// they don't have (CONTRACTS §4.1, SEC-H2).
func (s *Service) CanGrant(ctx context.Context, actorID int64, perms []string) error {
	if actorID == 0 || len(perms) == 0 { // 0 is the system, as everywhere else
		return nil
	}
	set, err := s.permissionSetCached(ctx, actorID)
	if err != nil {
		return err
	}
	// superusers can grant anything
	if set.Has("*") {
		return nil
	}
	var missing []string
	for _, p := range perms {
		if !set.Has(p) {
			missing = append(missing, p)
		}
	}
	if len(missing) > 0 {
		return core.ErrPermissionDenied.WithMessage(t(ctx,
			"you cannot grant permissions you don't have",
			"你不能授予自己没有的权限")).
			WithDetails(map[string]any{"missing": missing})
	}
	return nil
}

// CanActOn validates the actor may act on a target with the given permissions (CONTRACTS §4.1, SEC-H2).
// Returns an error if the target holds any permission the actor doesn't have.
func (s *Service) CanActOn(ctx context.Context, actorID int64, targetPerms []string) error {
	if actorID == 0 || len(targetPerms) == 0 { // 0 is the system, as everywhere else
		return nil
	}
	actorSet, err := s.permissionSetCached(ctx, actorID)
	if err != nil {
		return err
	}
	// superusers can act on anyone
	if actorSet.Has("*") {
		return nil
	}
	// check if target has any permission actor doesn't have
	var missing []string
	for _, p := range targetPerms {
		if p == "*" {
			return core.ErrPermissionDenied.WithMessage(t(ctx,
				"you cannot modify a superuser",
				"你不能修改超级用户"))
		}
		if !actorSet.Has(p) {
			missing = append(missing, p)
		}
	}
	if len(missing) > 0 {
		return core.ErrPermissionDenied.WithMessage(t(ctx,
			"you cannot modify a user with higher privileges",
			"你不能修改权限更高的用户")).
			WithDetails(map[string]any{"missing_permissions": missing})
	}
	return nil
}

// CanActOnUser checks whether the actor can act on the target user by comparing
// their permission sets. This is a convenience wrapper around CanActOn for user-to-user checks.
func (s *Service) CanActOnUser(ctx context.Context, actorID, targetID int64) error {
	if actorID == 0 || actorID == targetID {
		return nil
	}
	targetSet, err := s.permissionSetCached(ctx, targetID)
	if err != nil {
		return err
	}
	targetKeys := make([]string, 0, len(targetSet.Keys))
	if targetSet.Has("*") {
		targetKeys = append(targetKeys, "*")
	} else {
		for k := range targetSet.Keys {
			targetKeys = append(targetKeys, k)
		}
	}
	return s.CanActOn(ctx, actorID, targetKeys)
}

// permissionSetCached returns the cached permission set or falls back to PermissionSet.
func (s *Service) permissionSetCached(ctx context.Context, userID int64) (core.PermissionSet, error) {
	s.mu.RLock()
	set, ok := s.users[userID]
	min := s.minVersion
	s.mu.RUnlock()
	if ok && set.Version >= min {
		return set, nil
	}
	return s.PermissionSet(ctx, userID)
}
