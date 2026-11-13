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
