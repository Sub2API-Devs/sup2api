package helperhistory

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestReviewHelperHistoryDBReservesCompletionSlots(t *testing.T) {
	s, r := fixture(t)
	s.options.MaxRecords = 1
	if _, err := s.Reserve(context.Background(), r); err == nil {
		t.Fatal("one slot cannot reserve both immutable record and unacknowledged usage")
	}
}

func TestReviewHelperHistoryDBFrozenUsageNumberLexemes(t *testing.T) {
	s, r := fixture(t)
	ctx := context.Background()
	a, err := s.Reserve(ctx, r)
	if err != nil {
		t.Fatal(err)
	}
	if err = s.MarkDispatched(ctx, r.Owner, a.ID); err != nil {
		t.Fatal(err)
	}
	rec := usage(r)
	rec.Metrics = map[string]any{"big": json.Number("9007199254740993"), "fraction": json.Number("1.2300")}
	if err = s.PersistUncertainUsage(ctx, r.Owner, a.ID, rec); err != nil {
		t.Fatal(err)
	}
	items, err := s.PendingUsage(ctx, 10)
	if err != nil || len(items) != 1 {
		t.Fatal(err)
	}
	item := items[0]
	if item.Record.Metrics["big"] != rec.Metrics["big"] || item.Record.Metrics["fraction"] != rec.Metrics["fraction"] {
		t.Fatal("numeric spelling changed")
	}
	_, digest, err := core.DecodeHelperHistoryUsage(item.FrozenEnvelope)
	if err != nil || digest != item.Digest {
		t.Fatal("original frozen bytes lost", err)
	}
}

func TestReviewHelperHistoryRejectsUnpersistableRequestID(t *testing.T) {
	s, r := fixture(t)
	r.RequestID = strings.Repeat("x", 65)
	if _, err := s.Reserve(context.Background(), r); err == nil {
		t.Fatal("request id exceeds usage persistence identity boundary")
	}
}

func TestReviewHelperHistoryDBOutstandingReservationsConsumeFutureSlots(t *testing.T) {
	s, r := fixture(t)
	s.options.MaxRecords = 4
	ctx := context.Background()
	for _, id := range []string{"one", "two"} {
		r.RequestID = id
		if _, err := s.Reserve(ctx, r); err != nil {
			t.Fatal(err)
		}
	}
	r.RequestID = "third"
	if _, err := s.Reserve(ctx, r); err == nil {
		t.Fatal("outstanding reservations did not reserve both future slots")
	}
}

func TestReviewHelperHistoryDBSameOwnerCiphertextSwapRejected(t *testing.T) {
	s, r := fixture(t)
	ctx := context.Background()
	prefixA := strings.Repeat("a", 64)
	prefixB := strings.Repeat("b", 64)
	one := finish(t, s, r, prefixA, "one")
	r.RequestID = "two"
	two := finish(t, s, r, prefixB, "two")
	_, err := s.db.Pool.Exec(ctx, `UPDATE provider_helper_records SET payload=(SELECT payload FROM provider_helper_records WHERE receipt=$1) WHERE receipt=$2`, one.Receipt, two.Receipt)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Resolve(ctx, r.Owner, []string{prefixB}, r.Namespace); err == nil {
		t.Fatal("same-owner wrong-receipt ciphertext accepted")
	}
}
