package helperhistory

import (
	"bytes"
	"context"
	"encoding/json"
	"strings"
	"sync"
	"testing"
	"time"

	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func payload(text string) []byte {
	b, _ := json.Marshal(wire.Payload{Version: 1, Segments: []wire.Segment{{AfterMessage: 0, PublicAnchorDigest: strings.Repeat("a", 64), ToolCatalogDigest: strings.Repeat("b", 64), Messages: []json.RawMessage{json.RawMessage(`{"role":"assistant","content":[{"type":"tool_use","name":"ToolSearch","id":"tool_a","input":{"n":9007199254740993}}]}`), json.RawMessage(`{"role":"user","content":[{"type":"tool_result","tool_use_id":"tool_a","content":"` + text + `"}]}`)}}}})
	return b
}
func fixture(t *testing.T) (*Service, core.HelperHistoryReservation) {
	t.Helper()
	db := testutil.DB(t)
	c, e := secret.New(bytes.Repeat([]byte{7}, 32))
	if e != nil {
		t.Fatal(e)
	}
	s := New(db, c, Options{MaxRecords: 100})
	r := core.HelperHistoryReservation{RequestID: "request_one", RequestDigest: strings.Repeat("a", 64), Namespace: "wire-v1", Binding: core.ResourceBinding{AccountID: 22, PrincipalID: "issuer", Generation: "one"}, ReserveBytes: 4096}
	ctx := context.Background()
	if e = db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES('helper@example.com','x') RETURNING id`).Scan(&r.Owner.UserID); e != nil {
		t.Fatal(e)
	}
	if e = db.Pool.QueryRow(ctx, `INSERT INTO groups(name) VALUES('helper') RETURNING id`).Scan(&r.Owner.GroupID); e != nil {
		t.Fatal(e)
	}
	return s, r
}
func usage(r core.HelperHistoryReservation) *core.UsageRecord {
	id := r.Binding.AccountID
	return &core.UsageRecord{RequestID: r.RequestID, UserID: r.Owner.UserID, GroupID: r.Owner.GroupID, AccountID: &id, Tokens: core.UsageTokens{Input: 12, Output: 3}}
}
func finish(t *testing.T, s *Service, r core.HelperHistoryReservation, prefix, text string) core.HelperHistoryRecord {
	t.Helper()
	ctx := context.Background()
	a, e := s.Reserve(ctx, r)
	if e != nil {
		t.Fatal(e)
	}
	if e = s.MarkDispatched(ctx, r.Owner, a.ID); e != nil {
		t.Fatal(e)
	}
	out, e := s.Commit(ctx, r.Owner, a.ID, core.HelperHistoryCompletion{PublicPrefixDigest: prefix, Payload: payload(text), Usage: usage(r)})
	if e != nil {
		t.Fatal(e)
	}
	return out
}
func TestHelperHistoryDBChainColdIntegrity(t *testing.T) {
	s, r := fixture(t)
	ctx := context.Background()
	p1 := strings.Repeat("1", 64)
	p2 := strings.Repeat("2", 64)
	one := finish(t, s, r, p1, "one")
	r.RequestID = "request_two"
	r.PriorPrefixes = []string{p1}
	two := finish(t, s, r, p2, "two")
	cold := New(s.db, s.cipher, s.options)
	chain, e := cold.Resolve(ctx, r.Owner, []string{p1, p2}, r.Namespace)
	if e != nil || len(chain.Records) != 2 || !bytes.Equal(chain.Records[0].Payload, one.Payload) || chain.Records[1].ParentReceipt != one.Receipt {
		t.Fatalf("chain=%+v err=%v", chain, e)
	}
	for _, prefixes := range [][]string{{p2}, {p2, p1}, {p1, p1}} {
		if _, e = cold.Resolve(ctx, r.Owner, prefixes, r.Namespace); e == nil {
			t.Fatal("bad prefix accepted")
		}
	}
	other := r.Owner
	other.UserID++
	if _, e = cold.Resolve(ctx, other, []string{p1}, r.Namespace); e == nil {
		t.Fatal("owner leak")
	}
	r.RequestID = "wrong_issuer"
	r.Binding.Generation = "two"
	if _, e = cold.Reserve(ctx, r); e == nil {
		t.Fatal("issuer changed")
	}
	if _, e = s.db.Pool.Exec(ctx, `UPDATE provider_helper_records SET payload=decode('00','hex') WHERE receipt=$1`, two.Receipt); e != nil {
		t.Fatal(e)
	}
	if _, e = cold.Resolve(ctx, r.Owner, []string{p1, p2}, r.Namespace); e == nil {
		t.Fatal("corrupt ciphertext accepted")
	}
}
func TestHelperHistoryDBAmbiguityConcurrent(t *testing.T) {
	s, r := fixture(t)
	ctx := context.Background()
	prefix := strings.Repeat("3", 64)
	var wg sync.WaitGroup
	errs := make(chan error, 2)
	for _, name := range []string{"left", "right"} {
		wg.Add(1)
		go func(name string) {
			defer wg.Done()
			q := r
			q.RequestID = name
			a, e := s.Reserve(ctx, q)
			if e == nil {
				e = s.MarkDispatched(ctx, q.Owner, a.ID)
			}
			if e == nil {
				_, e = s.Commit(ctx, q.Owner, a.ID, core.HelperHistoryCompletion{PublicPrefixDigest: prefix, Payload: payload(name), Usage: usage(q)})
			}
			errs <- e
		}(name)
	}
	wg.Wait()
	close(errs)
	fail := 0
	for e := range errs {
		if e != nil {
			fail++
		}
	}
	if fail != 1 {
		t.Fatalf("expected one conflict got %d", fail)
	}
	if _, e := s.Resolve(ctx, r.Owner, []string{prefix}, r.Namespace); e == nil {
		t.Fatal("ambiguous prefix selected")
	}
	var n int
	if e := s.db.Pool.QueryRow(ctx, `SELECT count(*) FROM provider_helper_records`).Scan(&n); e != nil || n != 2 {
		t.Fatal("conflict evidence rolled back", n, e)
	}
	pending, e := s.PendingUsage(ctx, 100)
	if e != nil || len(pending) != 2 {
		t.Fatal("incurred usage missing", len(pending), e)
	}
	failures := 0
	for _, v := range pending {
		if v.Record.StatusCode == 503 && v.Record.ErrorType == "gateway_helper_history_storage" {
			failures++
			if e = s.PersistUncertainUsage(ctx, r.Owner, v.AttemptID, v.Record); e != nil {
				t.Fatal("committed failure persistence not idempotent", e)
			}
		}
		if v.Record.Tokens.Input != 12 {
			t.Fatal("usage erased")
		}
	}
	if failures != 1 {
		t.Fatal("conflict status not frozen", failures)
	}
}
func TestHelperHistoryDBExpiryQuotaAndOutbox(t *testing.T) {
	s, r := fixture(t)
	s.options.MaxRecords = 2
	ctx := context.Background()
	p := strings.Repeat("4", 64)
	out := finish(t, s, r, p, "one")
	pending, e := s.PendingUsage(ctx, 100)
	if e != nil || len(pending) != 1 || pending[0].Record.Tokens.Output != 3 {
		t.Fatal(pending, e)
	}
	if e = s.AckUsage(ctx, pending[0].RequestID, strings.Repeat("0", 64)); e == nil {
		t.Fatal("wrong digest ack")
	}
	if e = s.AckUsage(ctx, pending[0].RequestID, pending[0].Digest); e != nil {
		t.Fatal(e)
	}
	if _, e = s.Commit(ctx, r.Owner, out.Receipt, core.HelperHistoryCompletion{PublicPrefixDigest: p, Payload: payload("one"), Usage: usage(r)}); e != nil {
		t.Fatal("idempotent commit", e)
	}
	pending, e = s.PendingUsage(ctx, 100)
	if e != nil || len(pending) != 0 {
		t.Fatal("acked usage recreated", e)
	}
	bad := usage(r)
	bad.Tokens.Output++
	if _, e = s.Commit(ctx, r.Owner, out.Receipt, core.HelperHistoryCompletion{PublicPrefixDigest: p, Payload: payload("one"), Usage: bad}); e == nil {
		t.Fatal("frozen usage changed")
	}
	future := time.Now().Add(72 * time.Hour)
	s.now = func() time.Time { return future }
	if _, e = s.Resolve(ctx, r.Owner, []string{p}, r.Namespace); e == nil {
		t.Fatal("expired read")
	}
	if e = s.ExpirePayloads(ctx); e != nil {
		t.Fatal(e)
	}
	var retained bool
	if e = s.db.Pool.QueryRow(ctx, `SELECT payload IS NOT NULL FROM provider_helper_records WHERE receipt=$1`, out.Receipt).Scan(&retained); e != nil || retained {
		t.Fatal("expired ciphertext retained", e)
	}
	r.RequestID = "new_root"
	if _, e = s.Reserve(ctx, r); e == nil {
		t.Fatal("identity tombstone quota released")
	}
	var n int
	if e = s.db.Pool.QueryRow(ctx, `SELECT count(*) FROM provider_helper_records`).Scan(&n); e != nil || n != 1 {
		t.Fatal("tombstone removed", e)
	}
}
func TestHelperHistoryDBUncertainNoRedispatch(t *testing.T) {
	s, r := fixture(t)
	ctx := context.Background()
	a, e := s.Reserve(ctx, r)
	if e != nil {
		t.Fatal(e)
	}
	if e = s.MarkDispatched(ctx, r.Owner, a.ID); e != nil {
		t.Fatal(e)
	}
	if e = s.MarkDispatched(ctx, r.Owner, a.ID); e == nil {
		t.Fatal("duplicate dispatch authorized")
	}
	if e = s.Abort(ctx, r.Owner, a.ID); e == nil {
		t.Fatal("dispatched aborted")
	}
	if e = s.PersistUncertainUsage(ctx, r.Owner, a.ID, usage(r)); e != nil {
		t.Fatal(e)
	}
	again, e := s.Reserve(ctx, r)
	if e != nil || again.State != "uncertain" {
		t.Fatal(again, e)
	}
	if e = s.MarkDispatched(ctx, r.Owner, a.ID); e == nil {
		t.Fatal("uncertain retry authorized")
	}
	pending, e := s.PendingUsage(ctx, 100)
	if e != nil || len(pending) != 1 {
		t.Fatal(pending, e)
	}
}
func TestHelperHistoryLocalEncryptionAndValidation(t *testing.T) {
	c, _ := secret.New(bytes.Repeat([]byte{7}, 32))
	o := core.ResourceOwner{UserID: 1, GroupID: 2}
	r := core.HelperHistoryRecord{Receipt: "receipt", Namespace: "v1"}
	raw := payload("one")
	enc, e := c.Encrypt(raw, aad(o, r, wire.Digest(raw)))
	if e != nil || bytes.Contains(enc, []byte("ToolSearch")) {
		t.Fatal("not encrypted", e)
	}
	o.UserID++
	if _, e = c.Decrypt(enc, aad(o, r, wire.Digest(raw))); e == nil {
		t.Fatal("cross-owner AAD accepted")
	}
	s := New(nil, c, Options{})
	if _, e = s.Reserve(context.Background(), core.HelperHistoryReservation{}); e == nil {
		t.Fatal("invalid reserve")
	}
}

func TestHelperHistoryDBInvalidCompletionKeepsUncertainUsage(t *testing.T) {
	s, r := fixture(t)
	ctx := context.Background()
	a, e := s.Reserve(ctx, r)
	if e != nil {
		t.Fatal(e)
	}
	if e = s.MarkDispatched(ctx, r.Owner, a.ID); e != nil {
		t.Fatal(e)
	}
	invalid := usage(r)
	invalid.UserID++
	if _, e = s.Commit(ctx, r.Owner, a.ID, core.HelperHistoryCompletion{PublicPrefixDigest: strings.Repeat("5", 64), Payload: payload("one"), Usage: invalid}); e == nil {
		t.Fatal("wrong usage owner accepted")
	}
	var n int
	if e = s.db.Pool.QueryRow(ctx, `SELECT count(*) FROM provider_helper_records`).Scan(&n); e != nil || n != 0 {
		t.Fatal("partial receipt committed", e)
	}
	u := usage(r)
	u.Success = false
	u.StatusCode = 503
	u.ErrorType = "helper_history_storage"
	if e = s.PersistUncertainUsage(ctx, r.Owner, a.ID, u); e != nil {
		t.Fatal(e)
	}
	pending, e := s.PendingUsage(ctx, 10)
	if e != nil || len(pending) != 1 || pending[0].Record.StatusCode != 503 || pending[0].Record.Tokens.Input != 12 {
		t.Fatal(pending, e)
	}
}
