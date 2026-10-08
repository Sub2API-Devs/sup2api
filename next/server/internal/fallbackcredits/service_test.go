package fallbackcredits

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func fixtureCredit() core.FallbackCredit {
	now := time.Now().UTC().Add(-time.Second).Truncate(time.Microsecond)
	return core.FallbackCredit{TokenHash: strings.Repeat("a", 64), PluginKey: "ccgateway", SourceModel: "source-model", Owner: core.ResourceOwner{UserID: 1, GroupID: 1}, Binding: core.ResourceBinding{AccountID: 22, PrincipalID: "issuer", Generation: "1"}, PromptDigests: []string{strings.Repeat("b", 64)}, ObservedAt: now, ExpiresAt: now.Add(credits.Lifetime)}
}
func TestCreditRecordValidation(t *testing.T) {
	original := fixtureCredit()
	normalized, err := normalize(original, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	normalized.PromptDigests[0] = strings.Repeat("c", 64)
	if original.PromptDigests[0] != strings.Repeat("b", 64) {
		t.Fatal("mutable claims escaped normalization")
	}
	for _, mutate := range []func(*core.FallbackCredit){func(v *core.FallbackCredit) { v.ExpiresAt = v.ObservedAt.Add(credits.Lifetime + time.Second) }, func(v *core.FallbackCredit) { v.ExpiresAt = time.Now().Add(-time.Second) }, func(v *core.FallbackCredit) { v.PromptDigests = []string{"raw-prompt"} }, func(v *core.FallbackCredit) { v.TokenHash = "raw-token" }, func(v *core.FallbackCredit) { v.ObservedAt = time.Now().Add(time.Second) }} {
		bad := fixtureCredit()
		mutate(&bad)
		if _, err := normalize(bad, time.Now()); err == nil {
			t.Fatal("invalid credit record admitted")
		}
	}
}

func TestFallbackCreditDBOwnershipExpiryAndRetries(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	s := New(db, 1)
	record := fixtureCredit()
	if err := db.Pool.QueryRow(ctx, `INSERT INTO users(email,password_hash) VALUES('fallback-credit@example.com','x') RETURNING id`).Scan(&record.Owner.UserID); err != nil {
		t.Fatal(err)
	}
	if err := db.Pool.QueryRow(ctx, `INSERT INTO groups(name) VALUES('fallback-credit') RETURNING id`).Scan(&record.Owner.GroupID); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := s.Record(ctx, record); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	lookup := core.FallbackCreditLookup{Owner: record.Owner, TokenHash: record.TokenHash, PromptDigest: record.PromptDigests[0]}
	for i := 0; i < 2; i++ {
		resolved, err := s.Resolve(ctx, lookup)
		if err != nil || resolved.Binding != record.Binding {
			t.Fatal("stateless explicit redemption was consumed or moved", err)
		}
	}
	changed := record
	changed.ExpiresAt = record.ExpiresAt.Add(time.Second)
	changed.ObservedAt = record.ObservedAt.Add(time.Second)
	if err := s.Record(ctx, changed); err != nil {
		t.Fatal(err)
	}
	loaded, err := s.Resolve(ctx, lookup)
	if err != nil || !loaded.ExpiresAt.Equal(record.ExpiresAt) {
		t.Fatal("repeat token extended original expiry", err)
	}
	changed = record
	changed.Binding.AccountID = 21
	if s.Record(ctx, changed) == nil {
		t.Fatal("credit rebound account")
	}
	other := lookup
	other.Owner.GroupID++
	if _, err = s.Resolve(ctx, other); err == nil {
		t.Fatal("cross-owner credit lookup")
	}
	other = lookup
	other.PromptDigest = strings.Repeat("c", 64)
	if _, err = s.Resolve(ctx, other); err == nil {
		t.Fatal("changed prompt redeemed")
	}
	changed = record
	changed.TokenHash = strings.Repeat("d", 64)
	if s.Record(ctx, changed) == nil {
		t.Fatal("tracking capacity ignored")
	}
	if _, err = db.Pool.Exec(ctx, `UPDATE provider_fallback_credits SET observed_at=now()-interval '6 minutes',expires_at=now()-interval '1 minute' WHERE token_hash=$1`, record.TokenHash); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Resolve(ctx, lookup); err == nil {
		t.Fatal("expired token resolved")
	}
	owned, lookupErr := s.LookupOwned(ctx, record.Owner, record.TokenHash)
	if lookupErr != nil || owned.Binding != record.Binding {
		t.Fatal("retained expired custody lost", lookupErr)
	}
	wrongOwner := record.Owner
	wrongOwner.UserID++
	if _, err := s.LookupOwned(ctx, wrongOwner, record.TokenHash); err == nil {
		t.Fatal("expired custody crossed owner")
	}
	if err = s.Record(ctx, record); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Resolve(ctx, lookup); err == nil {
		t.Fatal("re-observation revived expired token")
	}
}
