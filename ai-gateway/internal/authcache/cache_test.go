package authcache

import (
	"testing"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
)

func TestCacheTTLBoundAndClone(t *testing.T) {
	now := time.Now()
	cache := New(2, time.Minute)
	grant := &requeststate.AuthGrant{CredentialDigest: "digest", UserID: 7, ExpiresAtUnixMilli: now.Add(time.Second).UnixMilli(), IPWhitelist: []string{"127.0.0.1"}}
	cache.Put("digest", grant, now)

	got, ok := cache.Get("digest", now.Add(500*time.Millisecond))
	if !ok {
		t.Fatal("expected cache hit")
	}
	got.IPWhitelist[0] = "mutated"
	again, _ := cache.Get("digest", now.Add(600*time.Millisecond))
	if again.IPWhitelist[0] != "127.0.0.1" {
		t.Fatal("cache value was mutated by caller")
	}
	if _, ok := cache.Get("digest", now.Add(2*time.Second)); ok {
		t.Fatal("expired grant remained cached")
	}
}

func TestCacheEvictionAndInvalidation(t *testing.T) {
	now := time.Now()
	cache := New(2, time.Minute)
	cache.Put("a", &requeststate.AuthGrant{UserID: 1, GroupID: 10}, now)
	cache.Put("b", &requeststate.AuthGrant{UserID: 2, GroupID: 10}, now)
	cache.Put("c", &requeststate.AuthGrant{UserID: 3, GroupID: 11}, now)
	if _, ok := cache.Get("a", now); ok {
		t.Fatal("least recently used item was not evicted")
	}
	cache.Invalidate(&controlv1.InvalidationEvent{Kind: controlv1.InvalidationKind_INVALIDATION_KIND_GROUP, Subject: "10"})
	if _, ok := cache.Get("b", now); ok {
		t.Fatal("group invalidation did not evict grant")
	}
	if _, ok := cache.Get("c", now); !ok {
		t.Fatal("unrelated grant was evicted")
	}
}
