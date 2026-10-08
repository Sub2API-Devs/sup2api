package providerresources

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func TestSkillCompletionRequiresEvidence(t *testing.T) {
	s := New(nil, Options{})
	for _, c := range []core.SkillUploadCompletion{{}, {Owner: core.ResourceOwner{UserID: 1, GroupID: 1}, Binding: core.ResourceBinding{AccountID: 1, PrincipalID: "p", Generation: "g"}, RemoteSkillID: "s", RemoteVersionID: "", OperationID: "o", CreatedAt: time.Now()}, {Owner: core.ResourceOwner{UserID: 1, GroupID: 1}, Binding: core.ResourceBinding{AccountID: 1, PrincipalID: "p", Generation: "g"}, RemoteSkillID: "s", RemoteVersionID: "v", OperationID: "o", CreatedAt: time.Now(), LegacyEpoch: "not-an-epoch"}} {
		if _, e := s.CompleteSkillUpload(context.Background(), c); e == nil {
			t.Fatal("invalid completion admitted")
		}
	}
	if e := s.MarkSkillUpload(context.Background(), core.SkillUploadFailure{Outcome: "rejected", EvidenceCode: "api_error"}); e == nil {
		t.Fatal("unknown remote failure released upload quota")
	}
}

func TestSkillResourcesDBAtomicVersionsOwnershipAndDeletion(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	s := New(db, Options{MaxResources: 5, MaxBytes: 100, DefaultTTL: time.Hour})
	var owner, other core.ResourceOwner
	if e := db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES('skill-owner@example.com','x') RETURNING id`).Scan(&owner.UserID); e != nil {
		t.Fatal(e)
	}
	if e := db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES('skill-other@example.com','x') RETURNING id`).Scan(&other.UserID); e != nil {
		t.Fatal(e)
	}
	if e := db.Pool.QueryRow(ctx, `INSERT INTO groups(name) VALUES('skill-group') RETURNING id`).Scan(&owner.GroupID); e != nil {
		t.Fatal(e)
	}
	other.GroupID = owner.GroupID
	binding := core.ResourceBinding{AccountID: 22, PrincipalID: "synthetic", Generation: "issuer-v1"}
	intent := core.SkillUploadIntent{ResourceIntent: core.ResourceIntent{Owner: owner, Binding: binding, RequestID: "first", PluginKey: "ccgateway", Kind: "skill", Bytes: 10}}
	var count atomic.Int32
	var wg sync.WaitGroup
	results := make(chan core.SkillUploadReservation, 10)
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r, e := s.ReserveSkillUpload(ctx, intent)
			if e != nil {
				t.Error(e)
				return
			}
			if r.Dispatch {
				count.Add(1)
			}
			results <- r
		}()
	}
	wg.Wait()
	close(results)
	if count.Load() != 1 {
		t.Fatalf("dispatches=%d", count.Load())
	}
	var first core.SkillUploadReservation
	for r := range results {
		if first.Parent.PublicID == "" {
			first = r
		}
		if r.Parent.PublicID != first.Parent.PublicID || r.Version.PublicVersionID != first.Version.PublicVersionID {
			t.Fatal("split reservation")
		}
	}
	created := time.Now().UTC().Truncate(time.Microsecond).Add(-time.Hour)
	complete := func(r core.SkillUploadReservation, remote string, at time.Time) core.SkillUploadReservation {
		t.Helper()
		c := core.SkillUploadCompletion{Owner: owner, Binding: binding, ParentID: r.Parent.PublicID, PublicVersionID: r.Version.PublicVersionID, OperationID: r.Version.OperationID, RemoteSkillID: "skill_remote", RemoteVersionID: remote, LegacyEpoch: fmt.Sprint(at.UnixMicro()), CreatedAt: at, ParentMetadata: []byte(`{"type":"skill","source":{"type":"custom"}}`), VersionMetadata: []byte(`{"type":"skill_version"}`)}
		saved, e := s.CompleteSkillUpload(ctx, c)
		if e != nil {
			t.Fatal(e)
		}
		again, e := s.CompleteSkillUpload(ctx, c)
		if e != nil || again.Version.PublicVersionID != saved.Version.PublicVersionID {
			t.Fatal("completion not idempotent", e)
		}
		return saved
	}
	first = complete(first, "skver_first", created)
	owned, e := s.FindOwnedRemote(ctx, owner, binding, "skill", "skill_remote")
	if e != nil || owned.PublicID != first.Parent.PublicID {
		t.Fatal("owned remote lookup", e)
	}
	if _, e := db.Pool.Exec(ctx, `UPDATE provider_resources SET expires_at=now()-interval '1 second' WHERE public_id=$1`, first.Parent.PublicID); e != nil {
		t.Fatal(e)
	}
	if _, e := s.FindOwnedRemote(ctx, owner, binding, "skill", "skill_remote"); e == nil {
		t.Fatal("expired remote lookup admitted")
	}
	if _, e := db.Pool.Exec(ctx, `UPDATE provider_resources SET expires_at=NULL WHERE public_id=$1`, first.Parent.PublicID); e != nil {
		t.Fatal(e)
	}
	wrongBinding := binding
	wrongBinding.Generation = "replaced"
	for _, test := range []struct {
		owner    core.ResourceOwner
		binding  core.ResourceBinding
		kind, id string
	}{{other, binding, "skill", "skill_remote"}, {owner, wrongBinding, "skill", "skill_remote"}, {owner, binding, "file", "skill_remote"}, {owner, binding, "skill", "unknown"}} {
		if _, e := s.FindOwnedRemote(ctx, test.owner, test.binding, test.kind, test.id); e == nil {
			t.Fatal("remote identity scope bypass")
		}
	}

	if !first.Parent.ExpiresAt.IsZero() {
		t.Fatal("file TTL leaked into permanent skill")
	}
	if _, e := s.FindVersion(ctx, other, first.Parent.PublicID, "latest"); e == nil {
		t.Fatal("owner bypass")
	}
	if _, e := s.FindVersion(ctx, owner, first.Parent.PublicID, "skver_first"); e == nil {
		t.Fatal("provider ID bypass")
	}

	observed, e := s.FindObservedVersion(ctx, owner, first.Parent.PublicID, "skver_first")
	if e != nil || observed.PublicVersionID != first.Version.PublicVersionID {
		t.Fatal("trusted observed lookup", e)
	}
	for _, selector := range []string{"latest", "unregistered", first.Version.PublicVersionID} {
		if _, e := s.FindObservedVersion(ctx, owner, first.Parent.PublicID, selector); e == nil {
			t.Fatal("observed lookup accepted unregistered/alias", selector)
		}
	}
	if _, e := s.FindObservedVersion(ctx, other, first.Parent.PublicID, "skver_first"); e == nil {
		t.Fatal("observed lookup owner bypass")
	}
	intent.ParentID = first.Parent.PublicID
	intent.RequestID = "newer"
	newer, e := s.ReserveSkillUpload(ctx, intent)
	if e != nil {
		t.Fatal(e)
	}
	intent.RequestID = "older-late"
	older, e := s.ReserveSkillUpload(ctx, intent)
	if e != nil {
		t.Fatal(e)
	}
	newer = complete(newer, "skver_newer", created.Add(2*time.Minute))
	_ = complete(older, "skver_older", created.Add(time.Minute))
	restarted := New(db, Options{})
	latest, e := restarted.FindVersion(ctx, owner, first.Parent.PublicID, "latest")
	if e != nil || latest.PublicVersionID != newer.Version.PublicVersionID {
		t.Fatal("latest used reservation or completion order", e)
	}
	page, e := s.ListSkillVersions(ctx, owner, first.Parent.PublicID, "", 1)
	if e != nil || !page.HasMore || page.Items[0].PublicVersionID != latest.PublicVersionID {
		t.Fatal("version pagination", e)
	}
	page, e = s.ListSkillVersions(ctx, owner, first.Parent.PublicID, page.Items[0].PublicVersionID, 10)
	if e != nil || len(page.Items) != 2 {
		t.Fatal("continuation page", e)
	}
	deletion, e := s.BeginSkillDelete(ctx, owner, first.Parent.PublicID, "")
	if e != nil {
		t.Fatal(e)
	}
	if _, e = s.FindVersion(ctx, owner, first.Parent.PublicID, "latest"); e == nil {
		t.Fatal("deleting parent remained referenceable")
	}
	done := core.SkillDeleteCompletion{Owner: owner, ParentID: first.Parent.PublicID, OperationID: deletion.OperationID, Outcome: "deleted"}
	if e = s.FinishSkillDelete(ctx, done); e != nil {
		t.Fatal(e)
	}
	if e = s.FinishSkillDelete(ctx, done); e != nil {
		t.Fatal("delete replay", e)
	}
	if _, e := s.FindOwnedRemote(ctx, owner, binding, "skill", "skill_remote"); e == nil {
		t.Fatal("remote tombstone discovered as ready")
	}
	var active int
	if e = db.Pool.QueryRow(ctx, `SELECT count(*) FROM provider_skill_versions WHERE parent_id=$1 AND state!='deleted'`, first.Parent.PublicID).Scan(&active); e != nil || active != 0 {
		t.Fatal("delete did not cascade", active, e)
	}
	intent.ParentID = ""
	intent.RequestID = "try-reuse"
	retry, e := s.ReserveSkillUpload(ctx, intent)
	if e != nil {
		t.Fatal(e)
	}
	_, e = s.CompleteSkillUpload(ctx, core.SkillUploadCompletion{Owner: owner, Binding: binding, ParentID: retry.Parent.PublicID, PublicVersionID: retry.Version.PublicVersionID, OperationID: retry.Version.OperationID, RemoteSkillID: "skill_remote", RemoteVersionID: "skver_new", CreatedAt: created, ParentMetadata: []byte(`{}`)})
	if e == nil {
		t.Fatal("tombstoned provider skill revived")
	}
}

func TestSkillResourcesDBUnknownUploadAndQuota(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	s := New(db, Options{MaxResources: 2, MaxBytes: 20})
	var o core.ResourceOwner
	if e := db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES('skill-quota@example.com','x') RETURNING id`).Scan(&o.UserID); e != nil {
		t.Fatal(e)
	}
	if e := db.Pool.QueryRow(ctx, `INSERT INTO groups(name) VALUES('skill-quota') RETURNING id`).Scan(&o.GroupID); e != nil {
		t.Fatal(e)
	}
	in := core.SkillUploadIntent{ResourceIntent: core.ResourceIntent{Owner: o, Binding: core.ResourceBinding{AccountID: 1, PrincipalID: "issuer", Generation: "g"}, PluginKey: "ccgateway", Kind: "skill", RequestID: "once", Bytes: 20}}
	r, e := s.ReserveSkillUpload(ctx, in)
	if e != nil {
		t.Fatal(e)
	}
	failure := core.SkillUploadFailure{Owner: o, ParentID: r.Parent.PublicID, PublicVersionID: r.Version.PublicVersionID, OperationID: r.Version.OperationID, Outcome: "uncertain"}
	if e = s.MarkSkillUpload(ctx, failure); e != nil {
		t.Fatal(e)
	}
	repeated, e := s.ReserveSkillUpload(ctx, in)
	if e != nil || repeated.Dispatch {
		t.Fatal("unknown upload redispatched", e)
	}
	in.RequestID = "second"
	if _, e = s.ReserveSkillUpload(ctx, in); e == nil {
		t.Fatal("unknown quota released")
	}
	failure.Outcome = "rejected"
	failure.EvidenceCode = "invalid_request_error"
	if e = s.MarkSkillUpload(ctx, failure); e != nil {
		t.Fatal(e)
	}
	if _, e = s.ReserveSkillUpload(ctx, in); e != nil {
		t.Fatal("confirmed failure retained quota", e)
	}
}
