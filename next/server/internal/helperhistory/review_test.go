package helperhistory

import (
	"context"
	"strings"
	"testing"
)

func TestReviewHelperHistoryDBReservesCompletionSlots(t *testing.T) {
	s, r := fixture(t)
	s.options.MaxRecords = 1
	if _, err := s.Reserve(context.Background(), r); err == nil {
		t.Fatal("one slot cannot reserve both immutable record and unacknowledged usage")
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
