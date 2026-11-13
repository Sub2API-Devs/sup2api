package core

import (
	"context"
	"log/slog"
	"maps"
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

type scopesCtxKey struct{}

// WithScope records the caller's range of action, as Router.PermScoped
// computed it for the request.
func WithScope(ctx context.Context, action perm.Key, s DataScope) context.Context {
	prev := routeScopes(ctx)
	next := make(map[perm.Key]DataScope, len(prev)+1)
	maps.Copy(next, prev)
	next[action] = s
	return context.WithValue(ctx, scopesCtxKey{}, next)
}

// routeScopes are the scopes WithScope recorded.
func routeScopes(ctx context.Context) map[perm.Key]DataScope {
	m, _ := ctx.Value(scopesCtxKey{}).(map[perm.Key]DataScope)
	return m
}

// Scope is the rows the caller (UserID) reaches with action in this
// request, its access key applied: the route's (Router.PermScoped) when it
// computed one, otherwise asked of az. No caller, or a nil az, reaches
// nothing.
func Scope(ctx context.Context, az Authorizer, action perm.Key) (DataScope, error) {
	if s, ok := routeScopes(ctx)[action]; ok {
		return s, nil
	}
	uid, ok := UserID(ctx)
	if !ok || az == nil {
		return DataScope{}, nil
	}
	set, err := az.PermissionSet(ctx, uid)
	if err != nil {
		return DataScope{}, err
	}
	return set.DataScope(uid, action), nil
}

// ProxyRefScope is the proxies the caller may reference from an account
// written under accountAction (proxy_id, proxy_url; CONTRACTS §21.4): every
// proxy when it holds accountAction for every account, otherwise those of
// its proxy:read and proxy:manage scopes.
func ProxyRefScope(ctx context.Context, az Authorizer, accountAction perm.Key) (DataScope, error) {
	if s, err := Scope(ctx, az, accountAction); err != nil || s.All {
		return s, err
	}
	read, err := Scope(ctx, az, perm.ProxyRead)
	if err != nil {
		return DataScope{}, err
	}
	manage, err := Scope(ctx, az, perm.ProxyManage)
	return read.Union(manage), err
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
	scopes := routeScopes(ctx)
	for _, k := range s.All {
		if _, ok := scopes[k]; ok {
			return OwnerScope(ctx, string(k))
		}
	}
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

// AccountScope is the key range of an account action: account:<action>
// reaches every account, account:own:<action> the ones the user created.
// Routes that act on accounts register with its keys.
func AccountScope(action string) perm.Scoped {
	return perm.Pair(perm.Key("account:"+action), perm.Key("account:own:"+action))
}
