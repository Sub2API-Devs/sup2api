package helperhistory

import (
	"bytes"
	"context"
	"strings"
	"testing"
	"time"
)

func TestReviewHelperHistoryDBDeferredRecordSurvivesRestartAndCancel(t *testing.T) {
	s, r := fixture(t)
	ctx := context.Background()
	finish(t, s, r, strings.Repeat("e", 64), "original evidence")
	now := time.Now().UTC().Add(time.Second)
	s.now = func() time.Time { return now }
	before, err := s.PendingUsage(ctx, 64)
	if err != nil || len(before) != 1 {
		t.Fatalf("pending: %d %v", len(before), err)
	}
	if err := s.DeferUsage(ctx, before[0].RequestID, before[0].Digest); err != nil {
		t.Fatal(err)
	}
	cold := New(s.db, s.cipher, s.options)
	cold.now = func() time.Time { return now }
	if pending, err := cold.PendingUsage(ctx, 64); err != nil || len(pending) != 0 {
		t.Fatal("restart lost delay", err)
	}
	var ciphertext []byte
	var retry int
	if err := s.db.Pool.QueryRow(ctx, `SELECT payload,retry_count FROM provider_helper_usage_outbox WHERE request_id=$1`, r.RequestID).Scan(&ciphertext, &retry); err != nil || retry != 1 {
		t.Fatal("delay not persisted", err)
	}
	cancelled, cancel := context.WithCancel(ctx)
	cancel()
	if err := cold.DeferUsage(cancelled, before[0].RequestID, before[0].Digest); err == nil {
		t.Fatal("cancel accepted")
	}
	now = now.Add(2 * time.Minute)
	after, err := cold.PendingUsage(ctx, 64)
	if err != nil || len(after) != 1 || after[0].Digest != before[0].Digest || !bytes.Equal(after[0].FrozenEnvelope, before[0].FrozenEnvelope) {
		t.Fatal("frozen evidence changed", err)
	}
	var final []byte
	if err := s.db.Pool.QueryRow(ctx, `SELECT payload,retry_count FROM provider_helper_usage_outbox WHERE request_id=$1`, r.RequestID).Scan(&final, &retry); err != nil || retry != 1 || !bytes.Equal(ciphertext, final) {
		t.Fatal("cancel modified evidence", err)
	}
}
