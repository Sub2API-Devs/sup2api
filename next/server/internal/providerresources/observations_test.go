package providerresources

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestObservedContainerExpiryEvidence(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Microsecond)
	past := now.Add(-time.Minute)
	future := now.Add(time.Hour)
	r := core.ProviderResource{State: "ready", ExpiresAt: past}
	in := core.ResourceObservation{Kind: "container", ExpiresAt: &future, RequestStartedAt: past.Add(-time.Second)}
	if got, e := observedExpiry(in, &r, now); e != nil || !got.Equal(future) {
		t.Fatal("valid earlier dispatch did not renew", got, e)
	}
	in.RequestStartedAt = now
	if _, e := observedExpiry(in, &r, now); e == nil {
		t.Fatal("expired new dispatch revived container")
	}
	r.ExpiresAt = now.Add(2 * time.Hour)
	if got, e := observedExpiry(in, &r, now); e != nil || !got.Equal(r.ExpiresAt) {
		t.Fatal("late response shortened newer expiry", got, e)
	}
	r.State = "deleted"
	if _, e := observedExpiry(in, &r, now); e == nil {
		t.Fatal("deleted resource revived")
	}
	in.ExpiresAt = nil
	if _, e := observedExpiry(in, nil, now); e == nil {
		t.Fatal("new container received invented expiry")
	}
	in.ExpiresAt = &future
	in.RequestStartedAt = time.Time{}
	if _, e := observedExpiry(in, nil, now); e == nil {
		t.Fatal("missing dispatch proof accepted")
	}
	in.Kind = "file"
	in.ExpiresAt = nil
	r.State = "ready"
	r.ExpiresAt = past
	if _, e := observedExpiry(in, &r, now); e == nil {
		t.Fatal("expired file revived")
	}
}

func TestObservedResourcesDBConcurrencyAndContexts(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	s := New(db, Options{MaxResources: 4, MaxBytes: 100, MaxContexts: 1})
	var owner, other core.ResourceOwner
	if e := db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES('observed@example.com','x') RETURNING id`).Scan(&owner.UserID); e != nil {
		t.Fatal(e)
	}
	if e := db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES('observed-other@example.com','x') RETURNING id`).Scan(&other.UserID); e != nil {
		t.Fatal(e)
	}
	if e := db.Pool.QueryRow(ctx, `INSERT INTO groups(name) VALUES('observed') RETURNING id`).Scan(&owner.GroupID); e != nil {
		t.Fatal(e)
	}
	other.GroupID = owner.GroupID
	bind := core.ResourceBinding{AccountID: 22, PrincipalID: "issuer_digest", Generation: "epoch1"}
	in := core.ResourceObservation{Owner: owner, Binding: bind, PluginKey: "ccgateway", Kind: "file", RemoteID: "file_generated", Bytes: 10}
	var wg sync.WaitGroup
	ids := make(chan string, 12)
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r, e := s.RegisterObserved(ctx, in)
			if e != nil {
				t.Error(e)
				return
			}
			ids <- r.PublicID
		}()
	}
	wg.Wait()
	close(ids)
	var public string
	for id := range ids {
		if public == "" {
			public = id
		}
		if id != public {
			t.Fatal("duplicate observed IDs")
		}
	}
	var count, bytes int64
	if e := db.Pool.QueryRow(ctx, `SELECT count(*),sum(bytes) FROM provider_resources`).Scan(&count, &bytes); e != nil || count != 1 || bytes != 10 {
		t.Fatal("duplicate quota", count, bytes, e)
	}
	bad := in
	bad.Owner = other
	if _, e := s.RegisterObserved(ctx, bad); e == nil {
		t.Fatal("cross-owner adoption")
	}
	bad = in
	bad.Bytes = 11
	if _, e := s.RegisterObserved(ctx, bad); e == nil {
		t.Fatal("file size mutation")
	}
	expiry := time.Now().Add(time.Hour)
	container := core.ResourceObservation{Owner: owner, Binding: bind, PluginKey: "ccgateway", Kind: "container", RemoteID: "container_first", ExpiresAt: &expiry, RequestStartedAt: time.Now()}
	r, e := s.RegisterObserved(ctx, container)
	if e != nil {
		t.Fatal(e)
	}
	container.RemoteID = "container_second"
	second, e := s.RegisterObserved(ctx, container)
	if e != nil {
		t.Fatal(e)
	}
	contextID := core.ResourceContext{Owner: owner, Binding: bind, PluginKey: "ccgateway", Kind: "ptc", ParentID: "srvtool_parent", ResourceID: r.PublicID}
	if e = s.BindContext(ctx, contextID); e != nil {
		t.Fatal(e)
	}
	if e = s.BindContext(ctx, contextID); e != nil {
		t.Fatal("binding not idempotent", e)
	}
	changed := contextID
	changed.ResourceID = second.PublicID
	if e = s.BindContext(ctx, changed); e == nil {
		t.Fatal("same parent rebound")
	}
	changed = contextID
	changed.ParentID = "another_parent"
	if e = s.BindContext(ctx, changed); e == nil {
		t.Fatal("context quota ignored")
	}
	s = New(db, Options{MaxResources: 4, MaxBytes: 100, MaxContexts: 1})
	if got, e := s.ResolveContext(ctx, contextID); e != nil || got.PublicID != r.PublicID {
		t.Fatal("restart lost parent mapping", e)
	}
	if _, e = db.Pool.Exec(ctx, `UPDATE provider_resources SET expires_at=now()-interval '1 minute' WHERE public_id=$1`, r.PublicID); e != nil {
		t.Fatal(e)
	}
	if _, e = s.ResolveContext(ctx, contextID); e == nil {
		t.Fatal("expired context remained usable")
	}
	container.RemoteID = "container_first"
	container.RequestStartedAt = time.Now()
	extended := time.Now().Add(2 * time.Hour)
	container.ExpiresAt = &extended
	if _, e = s.RegisterObserved(ctx, container); e == nil {
		t.Fatal("new dispatch after expiry revived container")
	}
	container.RequestStartedAt = time.Now().Add(-2 * time.Minute)
	renewed, e := s.RegisterObserved(ctx, container)
	if e != nil {
		t.Fatal("authorized in-flight renewal lost", e)
	}
	shorter := time.Now().Add(30 * time.Minute)
	container.ExpiresAt = &shorter
	late, e := s.RegisterObserved(ctx, container)
	if e != nil || !late.ExpiresAt.Equal(renewed.ExpiresAt) {
		t.Fatal("late observation shortened expiry", e)
	}
	if got, e := s.ResolveContext(ctx, contextID); e != nil || got.PublicID != r.PublicID {
		t.Fatal("renewed parent binding lost", e)
	}
	changed = contextID
	changed.Owner = other
	if _, e = s.ResolveContext(ctx, changed); e == nil {
		t.Fatal("cross-owner context")
	}
	changed = contextID
	changed.Binding.Generation = "epoch2"
	if _, e = s.ResolveContext(ctx, changed); e == nil {
		t.Fatal("changed issuer context")
	}
	tooLarge := in
	tooLarge.RemoteID = "quota_file"
	tooLarge.Bytes = 91
	if _, e = s.RegisterObserved(ctx, tooLarge); e == nil {
		t.Fatal("observed quota ignored")
	}
	del, e := s.BeginDelete(ctx, owner, r.PublicID, bind)
	if e != nil {
		t.Fatal(e)
	}
	if e = s.FinishDelete(ctx, owner, r.PublicID, del.Resource.OperationID, true); e != nil {
		t.Fatal(e)
	}
	container.RemoteID = "container_first"
	if _, e = s.RegisterObserved(ctx, container); e == nil {
		t.Fatal("tombstone resurrected")
	}
	if _, e = s.ResolveContext(ctx, contextID); e == nil {
		t.Fatal("deleted context remains usable")
	}
	// Different owners concurrently observing one verified remote identity have
	// exactly one winner; the unique boundary is not scoped only by tenant.
	var winners atomic.Int32
	for _, o := range []core.ResourceOwner{owner, other} {
		wg.Add(1)
		go func(o core.ResourceOwner) {
			defer wg.Done()
			race := in
			race.Owner = o
			race.RemoteID = "shared_remote_race"
			if _, e := s.RegisterObserved(ctx, race); e == nil {
				winners.Add(1)
			}
		}(o)
	}
	wg.Wait()
	if winners.Load() != 1 {
		t.Fatal("remote identity ownership race", winners.Load())
	}
}
