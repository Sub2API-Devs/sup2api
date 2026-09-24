package install

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// UploadOptions constrain an upload (market installs pin key and version).
type UploadOptions struct {
	ExpectKey     string
	ExpectVersion string
	Source        string // "upload" | "market:<source id>"
}

// Upload validates a package, stores it and returns the review. New plugins
// start in awaiting_consent; new versions of existing plugins wait for
// consent without touching the running version.
func (s *Service) Upload(ctx context.Context, data []byte, actorID int64, opt UploadOptions) (*Review, error) {
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
	others, err := s.otherEndpoints(ctx, m.Key)
	if err != nil {
		return nil, err
	}
	if err := pkg.Validate(m, p.Files, pkg.ValidateOptions{
		HostVersion:    s.opt.HostVersion,
		DevMode:        s.opt.Plugins.DevMode,
		GOOS:           s.opt.GOOS,
		GOARCH:         s.opt.GOARCH,
		MaxMemoryMB:    s.opt.Plugins.MaxMemoryMB,
		OtherEndpoints: others,
	}); err != nil {
		return nil, err
	}

	var (
		ver        *pkg.Verification
		current    map[string]Grant
		consent    = ConsentAwaiting
		uploadedAt time.Time
		upgradeOf  string
	)
	err = s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		ver, err = s.d.Trust.Verify(ctx, tx, p)
		if err != nil {
			return err
		}
		if err := pkg.CheckTrust(m, ver.Trust); err != nil {
			return err
		}
		var (
			status   string
			pubID    *int64
			existing = true
		)
		err := tx.QueryRow(ctx, `SELECT status, publisher_id FROM plugins WHERE key = $1 FOR UPDATE`, m.Key).Scan(&status, &pubID)
		if store.IsNoRows(err) {
			existing = false
		} else if err != nil {
			return err
		}
		if existing && !sameID(pubID, ver.PublisherID) {
			return core.ErrConflict.WithMessage(fmt.Sprintf("plugin %q is owned by another publisher", m.Key))
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

		var oldSHA, oldConsent string
		insert := true
		err = tx.QueryRow(ctx, `SELECT package_sha256, consent_status FROM plugin_versions WHERE plugin_key = $1 AND version = $2`,
			m.Key, m.Version).Scan(&oldSHA, &oldConsent)
		switch {
		case store.IsNoRows(err):
		case err != nil:
			return err
		case oldConsent == ConsentRejected:
			// A rejected upload may be retried (possibly with other content).
			if _, err := tx.Exec(ctx, `DELETE FROM plugin_versions WHERE plugin_key = $1 AND version = $2`, m.Key, m.Version); err != nil {
				return err
			}
		case oldSHA == p.SHA256:
			insert, consent = false, oldConsent // idempotent re-upload
		default:
			return core.ErrConflict.WithMessage(fmt.Sprintf("version %s of %q was already uploaded with different content", m.Version, m.Key))
		}
		if insert {
			if _, err := tx.Exec(ctx, `
				INSERT INTO plugin_versions (plugin_key, version, manifest, manifest_hash, package_sha256, package,
				  package_size, publisher_id, key_id, signature_status, consent_status, uploaded_by)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
				m.Key, m.Version, p.ManifestRaw, p.ManifestHash, p.SHA256, p.Raw, len(p.Raw),
				ver.PublisherID, nullStr(ver.KeyID), ver.SignatureStatus, ConsentAwaiting, nullID(actorID)); err != nil {
				return err
			}
		}
		if err := tx.QueryRow(ctx, `SELECT uploaded_at FROM plugin_versions WHERE plugin_key = $1 AND version = $2`,
			m.Key, m.Version).Scan(&uploadedAt); err != nil {
			return err
		}
		if status != StatusAwaitingConsent {
			if current, err = LoadGrants(ctx, tx, m.Key); err != nil {
				return err
			}
			if upgradeOf, err = s.runningVersion(ctx, tx, m.Key, m.Version); err != nil {
				return err
			}
		}
		return Audit(ctx, tx, actorID, "plugin.upload", "plugin", m.Key, map[string]any{
			"version": m.Version, "sha256": p.SHA256, "trust": ver.Trust, "signature_status": ver.SignatureStatus,
			"source": opt.Source,
		})
	})
	if store.IsUniqueViolation(err, "") {
		return nil, core.ErrConflict.WithMessage("the plugin is being uploaded concurrently; retry").WithCause(err)
	}
	if err != nil {
		return nil, err
	}
	r := buildReview(m, p.Files, ver, s.opt.HostVersion, current)
	r.ConsentStatus = consent
	r.PackageSHA256, r.PackageSize, r.UploadedAt = p.SHA256, int64(len(p.Raw)), uploadedAt
	r.UpgradeFrom = upgradeOf
	return r, nil
}

// otherEndpoints lists gateway endpoints claimed by every non-rejected
// version of other plugins.
func (s *Service) otherEndpoints(ctx context.Context, key string) ([]pkg.EndpointOwner, error) {
	rows, err := s.d.DB.Pool.Query(ctx, `
		SELECT plugin_key, manifest->'gateway'
		FROM plugin_versions
		WHERE plugin_key <> $1 AND consent_status <> 'rejected' AND manifest ? 'gateway'`, key)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []pkg.EndpointOwner
	for rows.Next() {
		var k string
		var raw []byte
		if err := rows.Scan(&k, &raw); err != nil {
			return nil, err
		}
		var g manifest.Gateway
		if json.Unmarshal(raw, &g) != nil {
			continue
		}
		for _, e := range g.Endpoints {
			out = append(out, pkg.EndpointOwner{PluginKey: k, Method: e.Method, Path: e.Path})
		}
	}
	return out, rows.Err()
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
