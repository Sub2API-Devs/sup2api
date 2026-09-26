package pkg

import (
	"context"
	"crypto/ed25519"
	"fmt"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pkgsig"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Trust levels.
const (
	TrustOfficial  = "official"
	TrustVerified  = "verified"
	TrustCommunity = "community"
	TrustUnsigned  = "unsigned"
)

// Signature statuses stored in plugin_versions.signature_status.
const (
	SigValid    = "valid"
	SigUnsigned = "unsigned"
	SigRevoked  = "revoked"
)

// Verification is the outcome of signature and trust checks.
type Verification struct {
	Publisher       string `json:"publisher"`
	PublisherID     *int64 `json:"publisher_id,omitempty"`
	KeyID           string `json:"key_id,omitempty"`
	Trust           string `json:"trust"`
	SignatureStatus string `json:"signature_status"`
}

// TrustStore verifies package signatures against publisher_keys and the
// configured official root keys.
type TrustStore struct {
	official      map[string]officialKey
	allowUnsigned bool
	skipSigCheck  bool
	now           func() time.Time
}

type officialKey struct {
	b64 string
	pub ed25519.PublicKey
}

// NewTrustStore parses official root keys ("keyId=base64pub").
func NewTrustStore(officialRootKeys []string, allowUnsigned bool) (*TrustStore, error) {
	t := &TrustStore{official: map[string]officialKey{}, allowUnsigned: allowUnsigned, now: time.Now}
	for _, entry := range officialRootKeys {
		id, b64, ok := strings.Cut(strings.TrimSpace(entry), "=")
		if !ok || id == "" {
			return nil, fmt.Errorf("official root key %q: expected keyId=base64", entry)
		}
		// base64 padding may contain '='; Cut splits on the first one only.
		pub, err := pkgsig.ParsePublicKey(b64)
		if err != nil {
			return nil, fmt.Errorf("official root key %q: %w", id, err)
		}
		t.official[id] = officialKey{b64: strings.TrimSpace(b64), pub: pub}
	}
	return t, nil
}

// SetClock overrides time.Now (tests).
func (t *TrustStore) SetClock(now func() time.Time) { t.now = now }

// SetVerifySignatures(false) skips the cryptographic signature check while
// keeping publisher/key resolution and revocation checks (test deployments).
func (t *TrustStore) SetVerifySignatures(on bool) { t.skipSigCheck = !on }

// AllowUnsigned reports whether unsigned packages are accepted.
func (t *TrustStore) AllowUnsigned() bool { return t.allowUnsigned }

func sigError(msg string) error {
	return core.ErrInvalidArgument.WithMessage("plugin signature: " + msg).
		WithDetails(map[string]any{"fields": []core.FieldError{{Field: "signature", Code: "invalid_signature", Message: msg}}})
}

func revokedError(msg string) error {
	return core.ErrPermissionDenied.WithMessage(msg).WithDetails(map[string]any{"reason": "revoked"})
}

// Verify checks the package signature and resolves publisher trust. Run it
// inside the upload transaction: packages signed by an official root key
// auto-register their publisher (trust official) and key.
func (t *TrustStore) Verify(ctx context.Context, q store.Querier, p *Package) (*Verification, error) {
	return t.verify(ctx, q, p, true)
}

// VerifyInstalled re-checks an already installed package when a node loads
// it: the signature must still verify and neither the publisher nor the key
// may be revoked, but the key's validity window is not checked again (the
// key was valid when the package was uploaded; expiry must not stop plugins
// that are already installed).
func (t *TrustStore) VerifyInstalled(ctx context.Context, q store.Querier, p *Package) (*Verification, error) {
	return t.verify(ctx, q, p, false)
}

func (t *TrustStore) verify(ctx context.Context, q store.Querier, p *Package, checkValidity bool) (*Verification, error) {
	sig := p.Signature
	if sig == nil {
		if !t.allowUnsigned {
			return nil, sigError("package is not signed and unsigned plugins are not allowed")
		}
		return &Verification{Publisher: p.Manifest.Publisher, Trust: TrustUnsigned, SignatureStatus: SigUnsigned}, nil
	}
	if sig.Publisher != p.Manifest.Publisher {
		return nil, sigError(fmt.Sprintf("signature publisher %q does not match manifest publisher %q", sig.Publisher, p.Manifest.Publisher))
	}
	if ok, found := t.official[sig.KeyID]; found {
		if err := t.check(p, sig, ok.pub); err != nil {
			return nil, sigError(err.Error())
		}
		id, err := t.registerOfficial(ctx, q, sig.Publisher, sig.KeyID, ok.b64)
		if err != nil {
			return nil, err
		}
		return &Verification{Publisher: sig.Publisher, PublisherID: &id, KeyID: sig.KeyID, Trust: TrustOfficial, SignatureStatus: SigValid}, nil
	}

	var (
		pubB64, keyStatus, pubName, trust, pubStatus string
		notBefore, notAfter                          *time.Time
		pubID                                        int64
	)
	err := q.QueryRow(ctx, `
		SELECT k.public_key, k.status, k.not_before, k.not_after, p.id, p.name, p.trust_level, p.status
		FROM publisher_keys k JOIN publishers p ON p.id = k.publisher_id
		WHERE k.key_id = $1`, sig.KeyID).
		Scan(&pubB64, &keyStatus, &notBefore, &notAfter, &pubID, &pubName, &trust, &pubStatus)
	if store.IsNoRows(err) {
		return nil, sigError(fmt.Sprintf("unknown signing key %q", sig.KeyID))
	}
	if err != nil {
		return nil, err
	}
	if pubName != sig.Publisher {
		return nil, sigError(fmt.Sprintf("key %q does not belong to publisher %q", sig.KeyID, sig.Publisher))
	}
	if pubStatus != "active" {
		return nil, revokedError(fmt.Sprintf("publisher %q has been revoked", pubName))
	}
	if keyStatus != "active" {
		return nil, revokedError(fmt.Sprintf("signing key %q has been revoked", sig.KeyID))
	}
	now := t.now()
	if checkValidity && notBefore != nil && now.Before(*notBefore) {
		return nil, sigError(fmt.Sprintf("signing key %q is not valid yet", sig.KeyID))
	}
	if checkValidity && notAfter != nil && now.After(*notAfter) {
		return nil, sigError(fmt.Sprintf("signing key %q has expired", sig.KeyID))
	}
	pub, err := pkgsig.ParsePublicKey(pubB64)
	if err != nil {
		return nil, err
	}
	if err := t.check(p, sig, pub); err != nil {
		return nil, sigError(err.Error())
	}
	return &Verification{Publisher: pubName, PublisherID: &pubID, KeyID: sig.KeyID, Trust: trust, SignatureStatus: SigValid}, nil
}

func (t *TrustStore) check(p *Package, sig *pkgsig.Signature, pub ed25519.PublicKey) error {
	if t.skipSigCheck {
		return nil
	}
	return pkgsig.Verify(p.Files, sig, pub)
}

// registerOfficial upserts the publisher as official and records the root
// key so it can be revoked like any other key.
func (t *TrustStore) registerOfficial(ctx context.Context, q store.Querier, name, keyID, b64 string) (int64, error) {
	var (
		id            int64
		trust, status string
		keyPub        *int64
		keyStatus     string
	)
	err := q.QueryRow(ctx, `SELECT id, trust_level, status FROM publishers WHERE name = $1`, name).Scan(&id, &trust, &status)
	switch {
	case store.IsNoRows(err):
		if err := q.QueryRow(ctx,
			`INSERT INTO publishers (name, trust_level) VALUES ($1, 'official') RETURNING id`, name).Scan(&id); err != nil {
			return 0, err
		}
	case err != nil:
		return 0, err
	default:
		if status != "active" {
			return 0, revokedError(fmt.Sprintf("publisher %q has been revoked", name))
		}
		if trust != TrustOfficial {
			if _, err := q.Exec(ctx, `UPDATE publishers SET trust_level = 'official' WHERE id = $1`, id); err != nil {
				return 0, err
			}
		}
	}
	err = q.QueryRow(ctx, `SELECT publisher_id, status FROM publisher_keys WHERE key_id = $1`, keyID).Scan(&keyPub, &keyStatus)
	switch {
	case store.IsNoRows(err):
		if _, err := q.Exec(ctx,
			`INSERT INTO publisher_keys (key_id, publisher_id, public_key) VALUES ($1, $2, $3)`, keyID, id, b64); err != nil {
			return 0, err
		}
	case err != nil:
		return 0, err
	default:
		if keyPub == nil || *keyPub != id {
			return 0, sigError(fmt.Sprintf("official key %q is registered to another publisher", keyID))
		}
		if keyStatus != "active" {
			return 0, revokedError(fmt.Sprintf("signing key %q has been revoked", keyID))
		}
	}
	return id, nil
}

// CheckTrust enforces what a trust level may request: community and
// unsigned packages cannot ask for critical host permissions or native UI.
func CheckTrust(m *manifest.Manifest, trust string) error {
	if trust == TrustOfficial || trust == TrustVerified {
		return nil
	}
	var errs []core.FieldError
	for i, hp := range m.HostPermissions {
		if manifest.HostPermissionRisk[hp.ID] == manifest.RiskCritical {
			errs = append(errs, core.FieldError{
				Field: fmt.Sprintf("hostPermissions[%d]", i), Code: "trust_insufficient",
				Message: fmt.Sprintf("%s publishers cannot request critical permission %q", trust, hp.ID),
			})
		}
	}
	if m.UI != nil && m.UI.Native != nil {
		errs = append(errs, core.FieldError{Field: "ui.native", Code: "trust_insufficient",
			Message: fmt.Sprintf("%s publishers cannot ship native UI", trust)})
	}
	if len(errs) > 0 {
		return core.InvalidFields(errs...).WithMessage("publisher trust level does not allow the requested permissions")
	}
	return nil
}
