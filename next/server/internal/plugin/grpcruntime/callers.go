package grpcruntime

import (
	"context"
	"slices"
	"sync"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// callerSet records, per console user, the HTTP requests an instance is
// serving and the access key each came through (nil for a login session).
// The zero value is ready to use.
type callerSet struct {
	mu sync.Mutex
	n  map[int64][]*caller
}

type caller struct{ key *core.AccessKeyIdentity }

// enter records one request of user uid, made through the access key of ctx
// if any, and returns what ends it. A request without a user (webhook,
// public route) records nothing.
func (s *callerSet) enter(ctx context.Context, uid int64) (leave func()) {
	if uid <= 0 {
		return func() {}
	}
	c := &caller{}
	if k, ok := core.AccessKey(ctx); ok && k.UserID == uid {
		c.key = &k
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.n == nil {
		s.n = map[int64][]*caller{}
	}
	s.n[uid] = append(s.n[uid], c)
	return func() {
		s.mu.Lock()
		defer s.mu.Unlock()
		if s.n[uid] = slices.DeleteFunc(s.n[uid], func(o *caller) bool { return o == c }); len(s.n[uid]) == 0 {
			delete(s.n, uid)
		}
	}
}

// has reports whether a request of user uid is in flight.
func (s *callerSet) has(uid int64) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.n[uid]) > 0
}

// narrow applies to ctx the access keys of uid's requests in flight, so the
// plugin's questions about uid (AuthzCheck, AccountScopeCheck) get the
// answer the key allows, not the user's (CONTRACTS §80). The plugin cannot
// say which request it asks for, so with several keys in flight it gets
// what all of them allow (failing closed); with none, ctx as it is.
func (s *callerSet) narrow(ctx context.Context, uid int64) context.Context {
	s.mu.Lock()
	defer s.mu.Unlock()
	var out *core.AccessKeyIdentity
	for _, c := range s.n[uid] {
		switch {
		case c.key == nil:
		case out == nil:
			out = &core.AccessKeyIdentity{UserID: uid, KeyID: c.key.KeyID, Permissions: slices.Clone(c.key.Permissions)}
		default:
			out.Permissions = slices.DeleteFunc(out.Permissions, func(p string) bool { return !slices.Contains(c.key.Permissions, p) })
		}
	}
	if out == nil {
		return ctx
	}
	return core.WithAccessKey(ctx, *out)
}
