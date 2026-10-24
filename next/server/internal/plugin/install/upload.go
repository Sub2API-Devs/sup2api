package install

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// UploadOptions constrain an upload (market installs pin key and version).
type UploadOptions struct {
	ExpectKey     string
	ExpectVersion string
	Source        string // "upload" | "market:<source id>"
	// PackageURL is the market download URL; every node fetches the package
	// from it. Empty for uploads, which nodes fetch from the primary.
	PackageURL string
}

// Upload validates a package, stores it and returns the review. New plugins
// start in awaiting_consent; new versions of existing plugins wait for
// consent without touching the running version, unless they request no new
// or wider host permissions, in which case consent is carried over.
func (s *Service) Upload(ctx context.Context, data []byte, actorID int64, opt UploadOptions) (*Review, error) {
	p, err := s.openAndValidate(ctx, data, opt)
	if err != nil {
		return nil, err
	}
	// The bytes must be retrievable before any row names them. A package
	// rejected below stays unreferenced and is collected by the shell.
	if s.d.Packages == nil || s.d.Packages.Store == nil {
		return nil, core.ErrUnavailable.WithMessage("plugin package store is not configured")
	}
	if err := s.d.Packages.Store.Put(ctx, p.SHA256, p.Raw); err != nil {
		return nil, core.ErrUnavailable.WithMessage("store the plugin package on the primary node").WithCause(err)
	}
	ctx, release, guardErr := core.BeginPluginMutation(ctx, s.d.Mutations)
	if guardErr != nil {
		return nil, guardErr
	}
	defer release()
	if err := s.validatePackage(ctx, p, opt); err != nil {
		return nil, err
	}

	rec, err := s.recordUpload(ctx, p, actorID, opt)
	if store.IsUniqueViolation(err, "") {
		return nil, core.ErrConflict.WithMessage("the plugin is being uploaded concurrently; retry").WithCause(err)
	}
	if err != nil {
		return nil, err
	}
	r := buildReview(p.Manifest, p.Files, rec.verification, s.opt.HostVersion, rec.current)
	r.ConsentStatus = rec.consent
	r.PackageSHA256, r.PackageSize, r.UploadedAt = p.SHA256, int64(len(p.Raw)), rec.uploadedAt
	r.UpgradeFrom = rec.upgradeOf
	return r, s.carryOverConsent(ctx, r, p.Manifest.Key, p.Manifest.Version, actorID)
}

// uploadRecord is what the transaction half of Upload leaves for the review.
type uploadRecord struct {
	verification *pkg.Verification
	current      map[string]Grant
	consent      string
	uploadedAt   time.Time
	upgradeOf    string
}

// openAndValidate unpacks the package and checks the caller's key/version
// expectations. Unpacking and hashing a large package depends on nothing
// shared, so it runs before the short cluster change lock.
func (s *Service) openAndValidate(ctx context.Context, data []byte, opt UploadOptions) (*pkg.Package, error) {
	p, err := pkg.Open(data, s.Limits())
	if err != nil {
		return nil, err
	}
	m := p.Manifest
	if opt.ExpectKey != "" && m.Key != opt.ExpectKey {
		return nil, core.ErrInvalidArgument.WithMessage(fmt.Sprintf("package key %q does not match %q", m.Key, opt.ExpectKey))
	}
	if opt.ExpectVersion != "" && m.Version != opt.ExpectVersion {
		return nil, core.ErrInvalidArgument.WithMessage(fmt.Sprintf("package version %q does not match %q", m.Version, opt.ExpectVersion))
	}
	return p, nil
}

// validatePackage runs the manifest validation against the other installed
// plugins' exclusive resources.
func (s *Service) validatePackage(ctx context.Context, p *pkg.Package, opt UploadOptions) error {
	m := p.Manifest
	otherPlatforms, otherEndpoints, err := s.otherPlatforms(ctx, s.d.DB.Pool, m.Key)
	if err != nil {
		return err
	}
	return pkg.Validate(m, p.Files, pkg.ValidateOptions{
		HostVersion:    s.opt.HostVersion,
		DevMode:        s.opt.Plugins.DevMode,
		GOOS:           s.opt.GOOS,
		GOARCH:         s.opt.GOARCH,
		MaxMemoryMB:    s.opt.Plugins.MaxMemoryMB,
		OtherEndpoints: otherEndpoints,
		OtherPlatforms: otherPlatforms,
	})
}

// recordUpload writes the plugin row, the version row and the audit entry in
// one transaction.
func (s *Service) recordUpload(ctx context.Context, p *pkg.Package, actorID int64, opt UploadOptions) (*uploadRecord, error) {
	m := p.Manifest
	rec := &uploadRecord{consent: ConsentAwaiting}
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		ver, err := s.d.Trust.Verify(ctx, tx, p)
		if err != nil {
			return err
		}
		rec.verification = ver
		if err := pkg.CheckTrust(m, ver.Trust); err != nil {
			return err
		}
		var (
			status   string
			pubID    *int64
			existing = true
		)
		err = tx.QueryRow(ctx, `SELECT status, publisher_id FROM plugins WHERE key = $1 FOR UPDATE`, m.Key).Scan(&status, &pubID)
		if store.IsNoRows(err) {
			existing = false
		} else if err != nil {
			return err
		}
		if err := checkReserved(m, opt.Source, ver.Trust, !existing && !s.opt.Plugins.DevMode); err != nil {
			return err
		}
		if !existing {
			if err := claimRetiredKey(ctx, tx, m.Key, ver.PublisherID, opt.Source); err != nil {
				return err
			}
		}
		if existing && !sameID(pubID, ver.PublisherID) {
			return core.ErrConflict.WithMessage(fmt.Sprintf("plugin %q is owned by another publisher", m.Key))
		}
		if existing {
			if err := checkUninstall(ctx, tx, m.Key); err != nil {
				return err
			}
		}
		if !existing {
			name, _ := json.Marshal(m.Name)
			if _, err := tx.Exec(ctx, `
				INSERT INTO plugins (key, name, publisher_id, status, installed_by)
				VALUES ($1, $2, $3, $4, $5)`, m.Key, name, ver.PublisherID, StatusAwaitingConsent, nullID(actorID)); err != nil {
				return err
			}
			status = StatusAwaitingConsent
		}
		insert, priorConsent, err := insertVersionRow(ctx, tx, p, ver, opt, actorID)
		if err != nil {
			return err
		}
		if !insert {
			rec.consent = priorConsent // idempotent re-upload keeps its status
		}
		if err := tx.QueryRow(ctx, `SELECT uploaded_at FROM plugin_versions WHERE plugin_key = $1 AND version = $2`,
			m.Key, m.Version).Scan(&rec.uploadedAt); err != nil {
			return err
		}
		if status != StatusAwaitingConsent {
			if rec.current, err = LoadGrants(ctx, tx, m.Key); err != nil {
				return err
			}
			if rec.upgradeOf, err = s.runningVersion(ctx, tx, m.Key, m.Version); err != nil {
				return err
			}
		}
		return audit.Audit(ctx, tx, actorID, "plugin.upload", "plugin", m.Key, map[string]any{
			"version": m.Version, "sha256": p.SHA256, "trust": ver.Trust, "signature_status": ver.SignatureStatus,
			"source": opt.Source,
		})
	})
	if err != nil {
		return nil, err
	}
	return rec, nil
}

// insertVersionRow inserts the version unless it already exists with the
// same content. inserted is false for an identical re-upload, whose existing
// consent status is returned so the review can report it unchanged.
func insertVersionRow(ctx context.Context, tx pgx.Tx, p *pkg.Package, ver *pkg.Verification, opt UploadOptions, actorID int64) (inserted bool, priorConsent string, err error) {
	m := p.Manifest
	var oldSHA, oldConsent string
	err = tx.QueryRow(ctx, `SELECT package_sha256, consent_status FROM plugin_versions WHERE plugin_key = $1 AND version = $2`,
		m.Key, m.Version).Scan(&oldSHA, &oldConsent)
	switch {
	case store.IsNoRows(err):
	case err != nil:
		return false, "", err
	case oldConsent == ConsentRejected:
		// A rejected upload may be retried (possibly with other content).
		if _, err := tx.Exec(ctx, `DELETE FROM plugin_versions WHERE plugin_key = $1 AND version = $2`, m.Key, m.Version); err != nil {
			return false, "", err
		}
	case oldSHA == p.SHA256:
		return false, oldConsent, nil // idempotent re-upload
	default:
		return false, "", core.ErrConflict.WithMessage(fmt.Sprintf("version %s of %q was already uploaded with different content", m.Version, m.Key))
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO plugin_versions (plugin_key, version, manifest, manifest_hash, package_sha256, package_url,
		  package_size, publisher_id, key_id, signature_status, consent_status, uploaded_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		m.Key, m.Version, p.ManifestRaw, p.ManifestHash, p.SHA256, opt.PackageURL, len(p.Raw),
		ver.PublisherID, nullStr(ver.KeyID), ver.SignatureStatus, ConsentAwaiting, nullID(actorID))
	return true, "", err
}

// carryOverConsent approves an upgrade that neither adds nor widens host
// permissions (ARCHITECTURE §5.5): every grant is carried over automatically.
func (s *Service) carryOverConsent(ctx context.Context, r *Review, key, version string, actorID int64) error {
	if r.UpgradeFrom == "" || r.ConsentStatus != ConsentAwaiting || r.Diff == nil ||
		len(r.Diff.Added) != 0 || len(r.Diff.Widened) != 0 {
		return nil
	}
	if _, err := s.Consent(ctx, key, version, ConsentRequest{}, actorID); err != nil {
		return fmt.Errorf("carry over consent: %w", err)
	}
	r.ConsentStatus = ConsentApproved
	return nil
}

// otherPlatforms lists the platforms and gateway endpoints declared by every
// approved version of other plugins. A version awaiting approval holds no
// exclusive resource (audit 2026-10-09 P1-5): it cannot block a later upload,
// a built-in plugin's above all, and Consent checks it again before it is
// approved.
func (s *Service) otherPlatforms(ctx context.Context, q store.Querier, key string) ([]pkg.PlatformOwner, []pkg.EndpointOwner, error) {
	rows, err := q.Query(ctx, `
		SELECT plugin_key, manifest->'platforms'
		FROM plugin_versions
		WHERE plugin_key <> $1 AND consent_status = 'approved' AND jsonb_typeof(manifest->'platforms') = 'array'
		ORDER BY plugin_key, version`, key)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	var ms []*manifest.Manifest
	for rows.Next() {
		m := &manifest.Manifest{}
		var raw []byte
		if err := rows.Scan(&m.Key, &raw); err != nil {
			return nil, nil, err
		}
		if json.Unmarshal(raw, &m.Platforms) != nil {
			continue
		}
		ms = append(ms, m)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}
	pfs, eps := pkg.OthersFromManifests(ms)
	return pfs, eps, nil
}

func sameID(a, b *int64) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}

func nullID(id int64) *int64 {
	if id <= 0 {
		return nil
	}
	return &id
}

func nullStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
