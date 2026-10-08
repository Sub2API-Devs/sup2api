package providerresources

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"testing"
)

func TestSkillsReviewUploadEvidenceImmutableAndBound(t *testing.T) {
	binding := core.ResourceBinding{AccountID: 22, PrincipalID: "issuer", Generation: "epoch"}
	initial := &core.SkillUploadEvidence{Binding: binding, RemoteSkillID: "skill_observed", SourceRequestID: "request"}
	raw, err := mergeSkillUploadEvidence(json.RawMessage(`{"existing":9007199254740993}`), initial, binding)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Contains(raw, []byte("9007199254740993")) {
		t.Fatal("prior metadata rounded")
	}
	next := *initial
	next.RemoteVersionID = "version_observed"
	raw, err = mergeSkillUploadEvidence(raw, &next, binding)
	if err != nil {
		t.Fatal(err)
	}
	unchanged, err := mergeSkillUploadEvidence(raw, nil, binding)
	if err != nil || !bytes.Equal(unchanged, raw) {
		t.Fatal("empty evidence erased observed facts")
	}
	changed := next
	changed.RemoteSkillID = "another"
	if _, err = mergeSkillUploadEvidence(raw, &changed, binding); err == nil {
		t.Fatal("provider identity replaced")
	}
	changed = next
	changed.Binding.Generation = "other"
	if _, err = mergeSkillUploadEvidence(raw, &changed, binding); err == nil {
		t.Fatal("issuer replacement accepted")
	}
}

func TestSkillsReviewUploadEvidenceDB(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	s := New(db, Options{MaxResources: 4, MaxBytes: 100})
	var owner core.ResourceOwner
	if err := db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES('skill-evidence@example.com','x') RETURNING id`).Scan(&owner.UserID); err != nil {
		t.Fatal(err)
	}
	if err := db.Pool.QueryRow(ctx, `INSERT INTO groups(name) VALUES('skill-evidence') RETURNING id`).Scan(&owner.GroupID); err != nil {
		t.Fatal(err)
	}
	binding := core.ResourceBinding{AccountID: 22, PrincipalID: "issuer", Generation: "generation"}
	reserved, err := s.ReserveSkillUpload(ctx, core.SkillUploadIntent{ResourceIntent: core.ResourceIntent{RequestID: "evidence-request", Owner: owner, Binding: binding, PluginKey: "ccgateway", Kind: "skill", Bytes: 1}})
	if err != nil {
		t.Fatal(err)
	}
	evidence := &core.SkillUploadEvidence{Binding: binding, RemoteSkillID: "remote_observed", RemoteVersionID: "version_observed", SourceRequestID: "request"}
	failure := core.SkillUploadFailure{Owner: owner, ParentID: reserved.Parent.PublicID, PublicVersionID: reserved.Version.PublicVersionID, OperationID: reserved.Version.OperationID, Outcome: "uncertain", Evidence: evidence}
	if err = s.MarkSkillUpload(ctx, failure); err != nil {
		t.Fatal(err)
	}
	failure.Evidence = nil
	if err = s.MarkSkillUpload(ctx, failure); err != nil {
		t.Fatal(err)
	}
	var state string
	var meta []byte
	if err = db.Pool.QueryRow(ctx, `SELECT state,metadata FROM provider_skill_versions WHERE public_id=$1`, reserved.Version.PublicVersionID).Scan(&state, &meta); err != nil {
		t.Fatal(err)
	}
	if state != "uncertain" || !bytes.Contains(meta, []byte("remote_observed")) {
		t.Fatal("provider facts not durably retained", state, string(meta))
	}
	changed := *evidence
	changed.Binding.Generation = "replacement"
	failure.Evidence = &changed
	if s.MarkSkillUpload(ctx, failure) == nil {
		t.Fatal("issuer crossed evidence ownership")
	}
	if _, err = s.FindVersion(ctx, owner, reserved.Parent.PublicID, "latest"); err == nil {
		t.Fatal("uncertain evidence granted ready access")
	}
}
