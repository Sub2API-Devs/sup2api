package grpcruntime

import (
	"context"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// A plugin's questions about a user it serves through an access key are
// answered as the key allows; with several keys in flight, as all allow.
func TestCallerSetNarrowsByAccessKey(t *testing.T) {
	var s callerSet
	bg := context.Background()
	keyCtx := func(perms ...string) context.Context {
		return core.WithAccessKey(bg, core.AccessKeyIdentity{UserID: 7, KeyID: 1, Permissions: perms})
	}
	perms := func(ctx context.Context) []string {
		k, ok := core.AccessKey(ctx)
		if !ok {
			return nil
		}
		return slices.Sorted(slices.Values(k.Permissions))
	}
	session := s.enter(bg, 7)
	if got := perms(s.narrow(bg, 7)); got != nil {
		t.Fatalf("session only: %v", got)
	}
	first := s.enter(keyCtx("a", "b"), 7)
	if got := perms(s.narrow(bg, 7)); !slices.Equal(got, []string{"a", "b"}) {
		t.Fatalf("one key: %v", got)
	}
	second := s.enter(keyCtx("b", "c"), 7)
	if got := perms(s.narrow(bg, 7)); !slices.Equal(got, []string{"b"}) {
		t.Fatalf("two keys: %v", got)
	}
	if got := perms(s.narrow(bg, 8)); got != nil {
		t.Fatalf("another user: %v", got)
	}
	// Another user's key in flight does not narrow user 7.
	s.enter(core.WithAccessKey(bg, core.AccessKeyIdentity{UserID: 9, Permissions: []string{"x"}}), 7)()
	first()
	second()
	if got := perms(s.narrow(bg, 7)); got != nil || !s.has(7) {
		t.Fatalf("keys left: %v %v", got, s.has(7))
	}
	session()
	if s.has(7) {
		t.Fatal("still in flight")
	}
}
