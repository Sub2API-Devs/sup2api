package messagediagnostics

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestDiagnosticsDBOwnershipRetentionAndConcurrentRecords(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	s := New(db, 1, time.Hour)
	r := core.DiagnosticMessage{IDHash: strings.Repeat("a", 64), Binding: core.ResourceBinding{AccountID: 22, PrincipalID: "issuer", Generation: "one"}, ObservedAt: time.Now().Add(-time.Second)}
	if err := db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES('diag-test@example.com','x') RETURNING id`).Scan(&r.Owner.UserID); err != nil {
		t.Fatal(err)
	}
	if err := db.Pool.QueryRow(ctx, `INSERT INTO groups(name) VALUES('diag-test') RETURNING id`).Scan(&r.Owner.GroupID); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := s.Record(ctx, r); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	original, err := New(db, 1, time.Hour).LookupOwned(ctx, r.Owner, r.IDHash)
	if err != nil {
		t.Fatal(err)
	}
	r.ObservedAt = time.Now()
	if err = s.Record(ctx, r); err != nil {
		t.Fatal(err)
	}
	again, err := s.LookupOwned(ctx, r.Owner, r.IDHash)
	if err != nil || !again.RetentionUntil.Equal(original.RetentionUntil) {
		t.Fatal("repeat extended retention", err)
	}
	other := r.Owner
	other.UserID++
	if _, err = s.LookupOwned(ctx, other, r.IDHash); err == nil {
		t.Fatal("cross-owner read")
	}
	changed := r
	changed.Owner = other
	if err = s.Record(ctx, changed); err == nil {
		t.Fatal("cross-owner ID reclaimed")
	}
	changed = r
	changed.Binding.Generation = "two"
	if err = s.Record(ctx, changed); err == nil {
		t.Fatal("ID issuer overwritten")
	}
	changed = r
	changed.IDHash = strings.Repeat("b", 64)
	if err = s.Record(ctx, changed); err == nil {
		t.Fatal("quota ignored")
	}
	if _, err = db.Pool.Exec(ctx, `UPDATE provider_diagnostic_messages SET observed_at=now()-interval '2 hours',retention_until=now()-interval '1 hour' WHERE id_hash=$1`, r.IDHash); err != nil {
		t.Fatal(err)
	}
	if _, err = s.LookupOwned(ctx, r.Owner, r.IDHash); err == nil {
		t.Fatal("expired platform ownership read")
	}
	if err = s.Record(ctx, r); err == nil {
		t.Fatal("expired observation falsely re-registered")
	}
	if err = s.Record(ctx, changed); err != nil {
		t.Fatal("expired capacity not released", err)
	}
}
func TestDiagnosticsHashValidation(t *testing.T) {
	for _, s := range []string{"", "not-an-id", strings.Repeat("A", 64), strings.Repeat("a", 63)} {
		if validHash(s) {
			t.Fatal("invalid hash accepted")
		}
	}
}
