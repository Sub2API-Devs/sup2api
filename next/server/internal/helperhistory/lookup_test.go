package helperhistory

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestHelperHistoryDBLookupBeforeNamespace(t *testing.T) {
	s, r := fixture(t)
	ctx := context.Background()
	p1 := strings.Repeat("a", 64)
	p2 := strings.Repeat("b", 64)
	unknown := strings.Repeat("c", 64)
	expect := func(owner core.ResourceOwner, prefixes []string, state core.HelperHistoryLookupState) core.HelperHistoryLookup {
		t.Helper()
		v, e := s.Lookup(ctx, owner, prefixes)
		if e != nil || v.State != state {
			t.Fatalf("state=%s want=%s err=%v", v.State, state, e)
		}
		return v
	}
	expect(r.Owner, []string{p1, p2}, core.HelperHistoryUnknown)
	first := finish(t, s, r, p1, "one")
	ready := expect(r.Owner, []string{p1}, core.HelperHistoryKnownReady)
	if ready.Namespace != r.Namespace || ready.Chain.Binding != r.Binding || len(ready.Chain.Records) != 1 || ready.Chain.Records[0].Receipt != first.Receipt {
		t.Fatal("discovery lost routing identity")
	}
	other := r.Owner
	other.UserID++
	expect(other, []string{p1}, core.HelperHistoryUnknown)
	expect(r.Owner, []string{p1, unknown}, core.HelperHistoryKnownUnrestorable)
	r.RequestID = "second"
	r.PriorPrefixes = []string{p1}
	finish(t, s, r, p2, "two")
	expect(r.Owner, []string{p1, p2}, core.HelperHistoryKnownReady)
	expect(r.Owner, []string{p2}, core.HelperHistoryKnownUnrestorable)
	expect(r.Owner, []string{p2, p1}, core.HelperHistoryKnownUnrestorable)
	r.RequestID = "different-namespace"
	r.Namespace = "new-policy"
	r.PriorPrefixes = nil
	finish(t, s, r, p1, "one")
	expect(r.Owner, []string{p1}, core.HelperHistoryKnownUnrestorable)
	expect(r.Owner, []string{p1, p2}, core.HelperHistoryKnownUnrestorable)
}
func TestHelperHistoryDBLookupExpiryAndCorruptionStayKnown(t *testing.T) {
	s, r := fixture(t)
	ctx := context.Background()
	prefix := strings.Repeat("d", 64)
	record := finish(t, s, r, prefix, "fixture")
	if _, e := s.db.Pool.Exec(ctx, `UPDATE provider_helper_records SET payload=decode('00','hex') WHERE receipt=$1`, record.Receipt); e != nil {
		t.Fatal(e)
	}
	v, e := s.Lookup(ctx, r.Owner, []string{prefix})
	if e != nil || v.State != core.HelperHistoryKnownUnrestorable {
		t.Fatal("corruption downgraded", v.State, e)
	}
	future := time.Now().Add(48 * time.Hour)
	s.now = func() time.Time { return future }
	if e = s.ExpirePayloads(ctx); e != nil {
		t.Fatal(e)
	}
	v, e = s.Lookup(ctx, r.Owner, []string{prefix})
	if e != nil || v.State != core.HelperHistoryKnownUnrestorable {
		t.Fatal("tombstone downgraded", v.State, e)
	}
}
