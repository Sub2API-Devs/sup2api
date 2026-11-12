package core

import (
	"context"
	"log/slog"
	"slices"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
)

// Can asks az whether the caller (UserID) holds k; the request's access key
// narrows the answer as usual. A nil az, no caller and errors (logged) count
// as "no".
func Can(ctx context.Context, az Authorizer, k perm.Key) bool {
	if az == nil {
		return false
	}
	uid, ok := UserID(ctx)
	if !ok {
		return false
	}
	granted, err := az.Can(ctx, uid, string(k))
	if err != nil {
		slog.WarnContext(ctx, "permission check", "permission", k, "err", err)
		return false
	}
	return granted
}

// HasGranted reports whether the route middleware matched k for the caller
// (Granted).
func HasGranted(ctx context.Context, k perm.Key) bool {
	return slices.Contains(Granted(ctx), string(k))
}

// OwnerScopeOf is OwnerScope for a route registered with
// Router.PermAny(..., s.Keys()...): nil when the route matched any of s.All,
// otherwise a pointer to the caller id.
func OwnerScopeOf(ctx context.Context, s perm.Scoped) *int64 {
	if slices.ContainsFunc(s.All, func(k perm.Key) bool { return HasGranted(ctx, k) }) {
		return nil
	}
	uid, _ := UserID(ctx)
	return &uid
}

// ScopeOf computes the caller's range of s when the route did not match it
// (e.g. the proxies an account form may reference): (nil, true) with any All
// key, (&uid, true) with any Own key, (nil, false) with neither. Callers
// without a request build ctx with WithUserID.
func ScopeOf(ctx context.Context, az Authorizer, s perm.Scoped) (scope *int64, ok bool) {
	can := func(k perm.Key) bool { return Can(ctx, az, k) }
	if slices.ContainsFunc(s.All, can) {
		return nil, true
	}
	if slices.ContainsFunc(s.Own, can) {
		uid, _ := UserID(ctx)
		return &uid, true
	}
	return nil, false
}

// Allows reports whether a row created by createdBy is within scope: a nil
// scope reaches every row, otherwise only rows created by *scope (rows with
// created_by NULL included only in the nil scope).
func Allows(scope, createdBy *int64) bool {
	return scope == nil || (createdBy != nil && *createdBy == *scope)
}
