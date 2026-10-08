package providerresources

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func observationReviewOwners(t *testing.T, db *store.DB) (core.ResourceOwner, core.ResourceOwner) {
	t.Helper()
	ctx := context.Background()
	a, b := core.ResourceOwner{}, core.ResourceOwner{}
	if err := db.Pool.QueryRow(ctx, `INSERT INTO groups(name) VALUES('observation-review') RETURNING id`).Scan(&a.GroupID); err != nil {
		t.Fatal(err)
	}
	b.GroupID = a.GroupID
	if err := db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES('review-observation-a@example.com','x') RETURNING id`).Scan(&a.UserID); err != nil {
		t.Fatal(err)
	}
	if err := db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES('review-observation-b@example.com','x') RETURNING id`).Scan(&b.UserID); err != nil {
		t.Fatal(err)
	}
	return a, b
}

func TestReviewObservedDBParentIdentityAcrossOwners(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	a, b := observationReviewOwners(t, db)
	s := New(db, Options{})
	binding := core.ResourceBinding{AccountID: 22, PrincipalID: "fixture-provider", Generation: "1"}
	expiry := time.Now().Add(time.Hour)
	create := func(owner core.ResourceOwner, remote string) core.ProviderResource {
		t.Helper()
		r, err := s.RegisterObserved(ctx, core.ResourceObservation{Owner: owner, Binding: binding, PluginKey: "ccgateway", Kind: "container", RemoteID: remote, ExpiresAt: &expiry, RequestStartedAt: time.Now()})
		if err != nil {
			t.Fatal(err)
		}
		return r
	}
	first, second := create(a, "container_a"), create(b, "container_b")
	x := core.ResourceContext{Owner: a, Binding: binding, PluginKey: "ccgateway", Kind: "ptc", ParentID: "same_provider_parent", ResourceID: first.PublicID}
	y := x
	y.Owner = b
	y.ResourceID = second.PublicID
	if err := s.BindContext(ctx, x); err != nil {
		t.Fatal(err)
	}
	if err := s.BindContext(ctx, y); err == nil {
		t.Fatal("provider parent adopted by a second owner/container")
	}
	if _, err := s.ResolveContext(ctx, y); err == nil {
		t.Fatal("cross-owner parent became resolvable")
	}
	if _, err := db.Pool.Exec(ctx, `UPDATE provider_resources SET expires_at=now()-interval '1 minute' WHERE public_id=$1`, first.PublicID); err != nil {
		t.Fatal(err)
	}
	if err := s.BindContext(ctx, y); err == nil {
		t.Fatal("expired parent reassigned to another tenant")
	}
	// A different parent racing across owners must also have exactly one winner.
	replacement := create(a, "container_replacement")
	x.ResourceID = replacement.PublicID
	x.ParentID = "race_parent"
	y.ParentID = x.ParentID
	var wg sync.WaitGroup
	var successes atomic.Int32
	for _, entry := range []core.ResourceContext{x, y} {
		wg.Add(1)
		go func(entry core.ResourceContext) {
			defer wg.Done()
			if s.BindContext(ctx, entry) == nil {
				successes.Add(1)
			}
		}(entry)
	}
	wg.Wait()
	if successes.Load() != 1 {
		t.Fatalf("cross-owner parent winners=%d", successes.Load())
	}
}

func TestReviewObservedDBRenewalReacquiresAllQuotas(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	owner, _ := observationReviewOwners(t, db)
	s := New(db, Options{MaxResources: 1, MaxBytes: 20, MaxContexts: 1})
	binding := core.ResourceBinding{AccountID: 22, PrincipalID: "fixture-provider", Generation: "1"}
	future := time.Now().Add(time.Hour)
	input := core.ResourceObservation{Owner: owner, Binding: binding, PluginKey: "ccgateway", Kind: "container", RemoteID: "old", Bytes: 10, ExpiresAt: &future, RequestStartedAt: time.Now()}
	first, err := s.RegisterObserved(ctx, input)
	if err != nil {
		t.Fatal(err)
	}
	oldContext := core.ResourceContext{Owner: owner, Binding: binding, PluginKey: "ccgateway", Kind: "ptc", ParentID: "old_parent", ResourceID: first.PublicID}
	if err = s.BindContext(ctx, oldContext); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Pool.Exec(ctx, `UPDATE provider_resources SET expires_at=now()-interval '1 minute' WHERE public_id=$1`, first.PublicID); err != nil {
		t.Fatal(err)
	}
	next := input
	next.RemoteID = "new"
	next.RequestStartedAt = time.Now()
	second, err := s.RegisterObserved(ctx, next)
	if err != nil {
		t.Fatalf("expired container failed to release quota: %v", err)
	}
	nextContext := oldContext
	nextContext.ParentID = "new_parent"
	nextContext.ResourceID = second.PublicID
	if err = s.BindContext(ctx, nextContext); err != nil {
		t.Fatal("expired context failed to release quota", err)
	}
	input.RequestStartedAt = time.Now().Add(-2 * time.Minute)
	for _, limits := range []Options{{MaxResources: 1, MaxBytes: 20, MaxContexts: 2}, {MaxResources: 2, MaxBytes: 15, MaxContexts: 2}, {MaxResources: 2, MaxBytes: 20, MaxContexts: 1}} {
		if _, err = New(db, limits).RegisterObserved(ctx, input); err == nil {
			t.Fatalf("renewal bypassed quota %+v", limits)
		}
		unchanged, e := s.Get(ctx, owner, first.PublicID)
		if e != nil || unchanged.ExpiresAt.After(time.Now()) {
			t.Fatal("failed renewal partially committed", e)
		}
	}
	s = New(db, Options{MaxResources: 2, MaxBytes: 20, MaxContexts: 2})
	renewed, err := s.RegisterObserved(ctx, input)
	if err != nil || !renewed.ExpiresAt.After(time.Now()) {
		t.Fatal("valid in-flight renewal failed", err)
	}
	if _, err = s.RegisterObserved(ctx, input); err != nil {
		t.Fatal("renewal idempotency double-counted capacity", err)
	}
	if _, err = s.ResolveContext(ctx, oldContext); err != nil {
		t.Fatal("valid renewal lost context", err)
	}
}

func TestReviewObservedDBFinalizeCannotRaceAdoption(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	a, b := observationReviewOwners(t, db)
	s := New(db, Options{})
	binding := core.ResourceBinding{AccountID: 22, PrincipalID: "fixture-provider", Generation: "1"}
	reservation, err := s.Reserve(ctx, core.ResourceIntent{Owner: a, Binding: binding, PluginKey: "ccgateway", Kind: "file", RequestID: "upload", Bytes: 10})
	if err != nil {
		t.Fatal(err)
	}
	completion := core.ResourceCompletion{Owner: a, Binding: binding, PublicID: reservation.Resource.PublicID, OperationID: reservation.Resource.OperationID, RemoteID: "same_file", Bytes: 10}
	observed := core.ResourceObservation{Owner: b, Binding: binding, PluginKey: "ccgateway", Kind: "file", RemoteID: "same_file", Bytes: 10}
	var wg sync.WaitGroup
	var successes atomic.Int32
	wg.Add(2)
	go func() {
		defer wg.Done()
		if _, e := s.Finalize(ctx, completion); e == nil {
			successes.Add(1)
		}
	}()
	go func() {
		defer wg.Done()
		if _, e := s.RegisterObserved(ctx, observed); e == nil {
			successes.Add(1)
		}
	}()
	wg.Wait()
	if successes.Load() != 1 {
		t.Fatalf("remote file had %d successful owners", successes.Load())
	}
	var count int
	if err = db.Pool.QueryRow(ctx, `SELECT count(*) FROM provider_resources WHERE remote_id='same_file'`).Scan(&count); err != nil || count != 1 {
		t.Fatal("duplicate provider identity", count, err)
	}
}
