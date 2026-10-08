package providerresources

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"sync"
	"sync/atomic"
	"testing"
)

func TestResourceIntentValidation(t *testing.T) {
	s := New(nil, Options{})
	in := core.ResourceIntent{RequestID: "request", PluginKey: "ccgateway", Kind: "file", Owner: core.ResourceOwner{UserID: 1, GroupID: 2}, Binding: core.ResourceBinding{AccountID: 3, PrincipalID: "sha256:identity", Generation: "issuer1"}, Metadata: json.RawMessage(`{"nested":{"z":1,"a":9007199254740993}}`)}
	n, h, err := s.normalize(in)
	if err != nil || n.TTL != 0 {
		t.Fatalf("default should not invent expiry: %v", err)
	}
	in.Metadata = json.RawMessage(`{"nested":{"a":9007199254740993,"z":1}}`)
	_, h2, err := s.normalize(in)
	if err != nil || h != h2 {
		t.Fatal("semantic metadata fingerprint changed")
	}
	in.Bytes = 513 << 20
	if _, _, err = s.normalize(in); err == nil {
		t.Fatal("oversized accepted")
	}
}

func TestProviderResourceDBLifecycle(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	s := New(db, Options{MaxResources: 1, MaxBytes: 100})
	var owner core.ResourceOwner
	if e := db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES('resources@example.com','x') RETURNING id`).Scan(&owner.UserID); e != nil {
		t.Fatal(e)
	}
	if e := db.Pool.QueryRow(ctx, `INSERT INTO groups(name) VALUES('resources') RETURNING id`).Scan(&owner.GroupID); e != nil {
		t.Fatal(e)
	}
	in := core.ResourceIntent{RequestID: "first", PluginKey: "ccgateway", Kind: "file", Owner: owner, Binding: core.ResourceBinding{AccountID: 21, PrincipalID: "digest", Generation: "issuer1"}, Bytes: 10}
	var dispatched atomic.Int32
	var wg sync.WaitGroup
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r, e := s.Reserve(ctx, in)
			if e != nil {
				t.Error(e)
			}
			if r.Dispatch {
				dispatched.Add(1)
			}
		}()
	}
	wg.Wait()
	if dispatched.Load() != 1 {
		t.Fatalf("dispatch=%d", dispatched.Load())
	}
	r, e := s.Reserve(ctx, in)
	if e != nil || r.Dispatch || !r.Resource.ExpiresAt.IsZero() {
		t.Fatalf("retry/expiry %+v %v", r, e)
	}
	if e = s.MarkUncertain(ctx, owner, r.Resource.PublicID, r.Resource.OperationID); e != nil {
		t.Fatal(e)
	}
	s = New(db, Options{MaxResources: 1, MaxBytes: 100}) // Restart does not allow retransmission.
	if retry, e := s.Reserve(ctx, in); e != nil || retry.Dispatch || retry.Resource.State != "uncertain" {
		t.Fatalf("restart %+v %v", retry, e)
	}
	second := in
	second.RequestID = "second"
	if _, e = s.Reserve(ctx, second); e == nil {
		t.Fatal("uncertain quota released")
	}
	completion := core.ResourceCompletion{Owner: owner, PublicID: r.Resource.PublicID, OperationID: r.Resource.OperationID, RemoteID: "file_remote", Binding: in.Binding, Bytes: 10, Metadata: json.RawMessage(`{"nested":{"b":2,"a":1}}`)}
	bad := completion
	bad.Binding.Generation = "issuer2"
	if _, e = s.Finalize(ctx, bad); e == nil {
		t.Fatal("issuer replaced")
	}
	if _, e = s.Finalize(ctx, completion); e != nil {
		t.Fatal(e)
	}
	if _, e = s.Finalize(ctx, completion); e != nil {
		t.Fatal("non-idempotent finalize", e)
	}
	wrong := owner
	wrong.GroupID++
	if _, e = s.Get(ctx, wrong, r.Resource.PublicID); e == nil {
		t.Fatal("cross group access")
	}
	del, e := s.BeginDelete(ctx, owner, r.Resource.PublicID, in.Binding)
	if e != nil || !del.Dispatch {
		t.Fatal(e)
	}
	if e = s.FinishDelete(ctx, owner, r.Resource.PublicID, del.Resource.OperationID, false); e != nil {
		t.Fatal(e)
	}
	if retry, e := s.BeginDelete(ctx, owner, r.Resource.PublicID, in.Binding); e != nil || retry.Dispatch {
		t.Fatal("ambiguous delete retried", e)
	}
	if e = s.FinishDelete(ctx, owner, r.Resource.PublicID, del.Resource.OperationID, true); e != nil {
		t.Fatal(e)
	}
	if _, e = s.Reserve(ctx, second); e != nil {
		t.Fatal("confirmed delete retained quota", e)
	}
	items, e := s.List(ctx, owner, "", 100)
	if e != nil || len(items) != 2 {
		t.Fatal(fmt.Sprint(items), e)
	}
	secondResource, e := s.Reserve(ctx, second)
	if e != nil {
		t.Fatal(e)
	}
	id, op := secondResource.Resource.PublicID, secondResource.Resource.OperationID
	if e = s.FailCreate(ctx, owner, id, op, "timeout"); e == nil {
		t.Fatal("ambiguous failure released quota")
	}
	if e = s.FailCreate(ctx, owner, id, op, "invalid_request_error"); e != nil {
		t.Fatal(e)
	}
	if e = s.FailCreate(ctx, owner, id, op, "invalid_request_error"); e != nil {
		t.Fatal("confirmed failure not idempotent", e)
	}
	if again, e := s.Reserve(ctx, second); e != nil || again.Dispatch || again.Resource.State != "failed" {
		t.Fatal("failed intent redispatched", e)
	}
	third := in
	third.RequestID = "third"
	if _, e = s.Reserve(ctx, third); e != nil {
		t.Fatal("confirmed rejection retained quota", e)
	}
}
