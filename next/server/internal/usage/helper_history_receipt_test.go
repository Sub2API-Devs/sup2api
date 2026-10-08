package usage

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestHelperUsageReceiptDBConflictAndMissingRow(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	rec := f.record("durable-one", false)
	raw, digest, err := core.HelperHistoryUsageBytes(rec)
	if err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if err = f.svc.PersistHelperUsage(ctx, rec, raw, digest); err != nil {
			t.Fatal(err)
		}
	}
	if f.scalar(`SELECT count(*) FROM usage_logs WHERE request_id=$1`, rec.RequestID) != "1" || f.scalar(`SELECT count(*) FROM provider_helper_usage_receipts WHERE request_id=$1`, rec.RequestID) != "1" {
		t.Fatal("replay duplicated persistence")
	}
	bad := *rec
	bad.Tokens.Output++
	badRaw, badDigest, _ := core.HelperHistoryUsageBytes(&bad)
	o := &reviewHelperOutbox{items: []core.HelperHistoryUsage{{RequestID: rec.RequestID, Digest: badDigest, Record: &bad, FrozenEnvelope: badRaw}}}
	if f.svc.DrainHelperHistoryUsage(ctx, o) == nil || o.acks != 0 {
		t.Fatal("different frozen facts acknowledged")
	}
	if err = f.svc.PersistHelperUsage(ctx, &bad, raw, digest); err == nil {
		t.Fatal("record not bound to supplied envelope")
	}
	if _, err = f.db.Pool.Exec(ctx, `DELETE FROM usage_logs WHERE request_id=$1`, rec.RequestID); err != nil {
		t.Fatal(err)
	}
	if err = f.svc.PersistHelperUsage(ctx, rec, raw, digest); err == nil {
		t.Fatal("receipt without usage resurrected a charge")
	}
	legacy := f.record("ordinary-existing", false)
	if _, err = f.svc.insert(ctx, []*core.UsageRecord{legacy}); err != nil {
		t.Fatal(err)
	}
	legacyRaw, legacyDigest, _ := core.HelperHistoryUsageBytes(legacy)
	if err = f.svc.PersistHelperUsage(ctx, legacy, legacyRaw, legacyDigest); err == nil {
		t.Fatal("ordinary row without receipt was acknowledged")
	}
	old := f.record("older-envelope", false)
	oldRaw, _, _ := core.HelperHistoryUsageBytes(old)
	var envelope map[string]json.RawMessage
	json.Unmarshal(oldRaw, &envelope)
	var fields map[string]json.RawMessage
	json.Unmarshal(envelope["Record"], &fields)
	delete(fields, "NodeID")
	envelope["Record"], _ = json.Marshal(fields)
	oldRaw, _ = json.Marshal(envelope)
	decoded, oldDigest, err := core.DecodeHelperHistoryUsage(oldRaw)
	if err != nil {
		t.Fatal(err)
	}
	if err = f.svc.PersistHelperUsage(ctx, decoded, oldRaw, oldDigest); err != nil {
		t.Fatal("older frozen envelope could not persist", err)
	}
}
