package providerresources

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"testing"
	"time"
)

func TestResourceQuotaExpiryClassification(t *testing.T) {
	now := time.Now()
	r := core.ProviderResource{Kind: "container", State: "ready", ExpiresAt: now.Add(-time.Second)}
	if resourceOccupiesQuota(r, now) {
		t.Fatal("expired container consumes active quota")
	}
	r.Kind = "file"
	if !resourceOccupiesQuota(r, now) {
		t.Fatal("Files expiry policy changed")
	}
	r.Kind = "container"
	r.ExpiresAt = time.Time{}
	if !resourceOccupiesQuota(r, now) {
		t.Fatal("unknown lifetime was treated as expired")
	}
	r.State = "deleted"
	if resourceOccupiesQuota(r, now) {
		t.Fatal("deleted record counted")
	}
}

func TestObservedResourcesDBExpiredCapacityAndRenewal(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	var owner core.ResourceOwner
	if e := db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES('expiryquota@example.com','x') RETURNING id`).Scan(&owner.UserID); e != nil {
		t.Fatal(e)
	}
	if e := db.Pool.QueryRow(ctx, `INSERT INTO groups(name) VALUES('expiryquota') RETURNING id`).Scan(&owner.GroupID); e != nil {
		t.Fatal(e)
	}
	s := New(db, Options{MaxResources: 1, MaxBytes: 100, MaxContexts: 1})
	expires := time.Now().Add(time.Hour)
	binding := core.ResourceBinding{AccountID: 22, PrincipalID: "issuer", Generation: "epoch"}
	first := core.ResourceObservation{Owner: owner, Binding: binding, PluginKey: "ccgateway", Kind: "container", RemoteID: "container_A", Bytes: 60, ExpiresAt: &expires, RequestStartedAt: time.Now()}
	a, e := s.RegisterObserved(ctx, first)
	if e != nil {
		t.Fatal(e)
	}
	contextA := core.ResourceContext{Owner: owner, Binding: binding, PluginKey: "ccgateway", Kind: "ptc", ParentID: "parent_A", ResourceID: a.PublicID}
	if e = s.BindContext(ctx, contextA); e != nil {
		t.Fatal(e)
	}
	if _, e = db.Pool.Exec(ctx, `UPDATE provider_resources SET expires_at=now()-interval '1 minute' WHERE public_id=$1`, a.PublicID); e != nil {
		t.Fatal(e)
	}
	second := first
	second.RemoteID = "container_B"
	b, e := s.RegisterObserved(ctx, second)
	if e != nil {
		t.Fatal("expired count/bytes blocked new container", e)
	}
	contextB := contextA
	contextB.ParentID = "parent_B"
	contextB.ResourceID = b.PublicID
	if e = s.BindContext(ctx, contextB); e != nil {
		t.Fatal("expired context blocked new binding", e)
	}
	first.RequestStartedAt = time.Now().Add(-2 * time.Minute)
	for _, options := range []Options{{MaxResources: 2, MaxBytes: 200, MaxContexts: 1}, {MaxResources: 1, MaxBytes: 200, MaxContexts: 2}, {MaxResources: 2, MaxBytes: 100, MaxContexts: 2}} {
		if _, e = New(db, options).RegisterObserved(ctx, first); e == nil {
			t.Fatalf("renewal evaded quota %+v", options)
		}
	}
	renewed, e := New(db, Options{MaxResources: 2, MaxBytes: 200, MaxContexts: 2}).RegisterObserved(ctx, first)
	if e != nil || renewed.PublicID != a.PublicID {
		t.Fatal("authorized renewal with capacity failed", e)
	}
	if _, e = s.ResolveContext(ctx, contextA); e != nil {
		t.Fatal("renewed original context lost", e)
	}
	var count int
	if e = db.Pool.QueryRow(ctx, `SELECT count(*) FROM provider_resources`).Scan(&count); e != nil || count != 2 {
		t.Fatal("expiry deleted tombstones or allocated duplicate", count, e)
	}
}
