package pkg

import (
	"context"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func TestTrustVerify(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	root := pkgtest.NewKey("root-1")
	ts, err := NewTrustStore([]string{root.ID + "=" + root.PubB64()}, false)
	if err != nil {
		t.Fatal(err)
	}
	open := func(b []byte) *Package {
		t.Helper()
		p, err := Open(b, Limits{})
		if err != nil {
			t.Fatal(err)
		}
		return p
	}

	// Official root key: publisher auto-registered as official.
	v, err := ts.Verify(ctx, db.Pool, open(pkgtest.Build(pkgtest.Guard("guard", "0.1.0", "sub2api"), root)))
	if err != nil {
		t.Fatal(err)
	}
	if v.Trust != TrustOfficial || v.PublisherID == nil || v.SignatureStatus != SigValid {
		t.Fatalf("verification = %+v", v)
	}
	// Second verification reuses the rows.
	if _, err := ts.Verify(ctx, db.Pool, open(pkgtest.Build(pkgtest.Guard("guard", "0.1.1", "sub2api"), root))); err != nil {
		t.Fatal(err)
	}

	// Unsigned rejected unless allowed.
	unsigned := open(pkgtest.Build(pkgtest.Minimal("mini", "0.1.0", "dev"), pkgtest.Key{}))
	if _, err := ts.Verify(ctx, db.Pool, unsigned); err == nil {
		t.Fatal("unsigned should be rejected")
	}
	ts2, _ := NewTrustStore(nil, true)
	if v, err := ts2.Verify(ctx, db.Pool, unsigned); err != nil || v.Trust != TrustUnsigned {
		t.Fatalf("unsigned allowed: %v %+v", err, v)
	}

	// Registered community publisher with a key window.
	var pubID int64
	if err := db.Pool.QueryRow(ctx, `INSERT INTO publishers (name, trust_level) VALUES ('acme', 'community') RETURNING id`).Scan(&pubID); err != nil {
		t.Fatal(err)
	}
	k := pkgtest.NewKey("acme-1")
	if _, err := db.Pool.Exec(ctx, `INSERT INTO publisher_keys (key_id, publisher_id, public_key, not_after) VALUES ($1, $2, $3, $4)`,
		k.ID, pubID, k.PubB64(), time.Now().Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	acme := open(pkgtest.Build(pkgtest.Minimal("acme_tool", "1.0.0", "acme"), k))
	v, err = ts.Verify(ctx, db.Pool, acme)
	if err != nil || v.Trust != TrustCommunity || *v.PublisherID != pubID {
		t.Fatalf("community: %v %+v", err, v)
	}

	// Tampered package fails.
	files := pkgtest.Sign(pkgtest.Files(pkgtest.Minimal("acme_tool", "1.0.0", "acme")), "acme", k)
	files["runtimes/linux-amd64/plugin"] = []byte("evil")
	if _, err := ts.Verify(ctx, db.Pool, open(pkgtest.Zip(files))); err == nil {
		t.Fatal("tampered package accepted")
	}

	// Publisher mismatch.
	other := pkgtest.Minimal("acme_tool", "1.0.0", "someone")
	if _, err := ts.Verify(ctx, db.Pool, open(pkgtest.Zip(pkgtest.Sign(pkgtest.Files(other), "someone", k)))); err == nil {
		t.Fatal("key of another publisher accepted")
	}

	// Expired key.
	ts.SetClock(func() time.Time { return time.Now().Add(2 * time.Hour) })
	if _, err := ts.Verify(ctx, db.Pool, acme); err == nil {
		t.Fatal("expired key accepted")
	}
	ts.SetClock(time.Now)

	// Revoked key.
	if _, err := db.Pool.Exec(ctx, `UPDATE publisher_keys SET status = 'revoked' WHERE key_id = $1`, k.ID); err != nil {
		t.Fatal(err)
	}
	_, err = ts.Verify(ctx, db.Pool, acme)
	if core.AsError(err).Code != "permission_denied" {
		t.Fatalf("revoked key: %v", err)
	}

	// Revoked official publisher.
	if _, err := db.Pool.Exec(ctx, `UPDATE publishers SET status = 'revoked' WHERE name = 'sub2api'`); err != nil {
		t.Fatal(err)
	}
	if _, err := ts.Verify(ctx, db.Pool, open(pkgtest.Build(pkgtest.Guard("guard", "0.1.2", "sub2api"), root))); err == nil {
		t.Fatal("revoked official publisher accepted")
	}
}

func TestTrustSkipSignatureCheck(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	root := pkgtest.NewKey("root-skip")
	ts, err := NewTrustStore([]string{root.ID + "=" + root.PubB64()}, false)
	if err != nil {
		t.Fatal(err)
	}
	files := pkgtest.Sign(pkgtest.Files(pkgtest.Guard("guard_skip", "0.1.0", "sub2api")), "sub2api", root)
	files["runtimes/linux-amd64/plugin"] = []byte("rebuilt")
	p, err := Open(pkgtest.Zip(files), Limits{})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ts.Verify(ctx, db.Pool, p); err == nil {
		t.Fatal("mismatched signature accepted with verification on")
	}
	ts.SetVerifySignatures(false)
	if v, err := ts.Verify(ctx, db.Pool, p); err != nil || v.Trust != TrustOfficial {
		t.Fatalf("verification off: %v %+v", err, v)
	}
}
