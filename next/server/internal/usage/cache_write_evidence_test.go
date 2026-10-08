package usage

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/sdk/platforms"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usagerules"
	"testing"
)

func TestCacheWriteEvidenceDBFrozenReplayKeepsPriceAndUniqueReceipt(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	var acc *usagerules.Acc
	for _, p := range platforms.Builtin() {
		if p.ID == "anthropic" {
			acc = usagerules.New(p.Usage)
		}
	}
	acc.ApplyJSON([]byte(`{"usage":{"input_tokens":218,"output_tokens":380,"cache_read_input_tokens":2752,"cache_creation_input_tokens":2595,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":1376}}}`))
	original := f.record("cache-ttl-evidence", true)
	original.Tokens = acc.Tokens()
	original.Metrics = acc.Metrics
	raw, digest, err := core.HelperHistoryUsageBytes(original)
	if err != nil {
		t.Fatal(err)
	}
	// Both the typed producer and decoded cold outbox must be accepted.
	if err = f.svc.PersistHelperUsage(ctx, original, raw, digest); err != nil {
		t.Fatal(err)
	}
	decoded, d2, err := core.DecodeHelperHistoryUsage(raw)
	if err != nil || d2 != digest {
		t.Fatal(err)
	}
	if err = f.svc.PersistHelperUsage(ctx, decoded, raw, digest); err != nil {
		t.Fatal(err)
	}
	control := f.record("cache-ttl-old-fee", true)
	control.Tokens = original.Tokens
	controlRaw, controlDigest, _ := core.HelperHistoryUsageBytes(control)
	if err = f.svc.PersistHelperUsage(ctx, control, controlRaw, controlDigest); err != nil {
		t.Fatal(err)
	}
	for _, r := range []*core.UsageRecord{original, decoded, control} {
		if err = f.svc.settle(ctx, fromRecord(r), false); err != nil {
			t.Fatal(err)
		}
	}
	if f.scalar(`SELECT count(*) FROM usage_logs WHERE request_id=$1`, original.RequestID) != "1" || f.scalar(`SELECT count(*) FROM provider_helper_usage_receipts WHERE request_id=$1`, original.RequestID) != "1" {
		t.Fatal("duplicate frozen receipt")
	}
	if f.scalar(`SELECT count(*) FROM balance_ledger WHERE kind='usage'`) != "2" {
		t.Fatal("duplicate fees")
	}
	if f.scalar(`SELECT total_cost FROM usage_logs WHERE request_id=$1`, original.RequestID) != f.scalar(`SELECT total_cost FROM usage_logs WHERE request_id=$1`, control.RequestID) {
		t.Fatal("compatibility price changed")
	}
	if f.scalar(`SELECT metrics->'cache_write_evidence'->>'unclassified_tokens' FROM usage_logs WHERE request_id=$1`, original.RequestID) != "1219" || f.scalar(`SELECT metrics->'cache_write_evidence'->>'completeness' FROM usage_logs WHERE request_id=$1`, original.RequestID) != "partial" {
		t.Fatal("persistent evidence missing")
	}
	if f.scalar(`SELECT status_code FROM usage_logs WHERE request_id=$1`, original.RequestID) != "200" {
		t.Fatal("legal success changed")
	}
}
