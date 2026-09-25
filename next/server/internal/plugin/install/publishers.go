package install

import (
	"context"
	"regexp"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pkgsig"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

var nameRe = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$`)

// Publisher is a publishers row with its keys.
type Publisher struct {
	ID         int64          `json:"id"`
	Name       string         `json:"name"`
	TrustLevel string         `json:"trust_level"`
	Status     string         `json:"status"`
	CreatedAt  time.Time      `json:"created_at"`
	RevokedAt  *time.Time     `json:"revoked_at"`
	Keys       []PublisherKey `json:"keys"`
}

// PublisherKey is a publisher_keys row.
type PublisherKey struct {
	KeyID     string     `json:"key_id"`
	PublicKey string     `json:"public_key"`
	Status    string     `json:"status"`
	NotBefore *time.Time `json:"not_before"`
	NotAfter  *time.Time `json:"not_after"`
	CreatedAt time.Time  `json:"created_at"`
}

// CreatePublisherInput is the body of POST /publishers.
type CreatePublisherInput struct {
	Name       string     `json:"name"`
	TrustLevel string     `json:"trust_level"` // verified | community
	Keys       []KeyInput `json:"keys"`
}

// KeyInput is the body of POST /publishers/:id/keys.
type KeyInput struct {
	KeyID     string     `json:"key_id"`
	PublicKey string     `json:"public_key"`
	NotBefore *time.Time `json:"not_before"`
	NotAfter  *time.Time `json:"not_after"`
}

// RevokeResult summarizes a revocation.
type RevokeResult struct {
	RevokedVersions int64    `json:"revoked_versions"`
	DisabledPlugins []string `json:"disabled_plugins"`
}

// ListPublishers returns all publishers with keys.
func (s *Service) ListPublishers(ctx context.Context) ([]Publisher, error) {
	rows, err := s.d.DB.Pool.Query(ctx, `SELECT id, name, trust_level, status, created_at, revoked_at FROM publishers ORDER BY name`)
	if err != nil {
		return nil, err
	}
	var out []Publisher
	idx := map[int64]int{}
	for rows.Next() {
		var p Publisher
		if err := rows.Scan(&p.ID, &p.Name, &p.TrustLevel, &p.Status, &p.CreatedAt, &p.RevokedAt); err != nil {
			rows.Close()
			return nil, err
		}
		p.Keys = []PublisherKey{}
		idx[p.ID] = len(out)
		out = append(out, p)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	krows, err := s.d.DB.Pool.Query(ctx, `SELECT publisher_id, key_id, public_key, status, not_before, not_after, created_at
		FROM publisher_keys ORDER BY created_at`)
	if err != nil {
		return nil, err
	}
	defer krows.Close()
	for krows.Next() {
		var pid int64
		var k PublisherKey
		if err := krows.Scan(&pid, &k.KeyID, &k.PublicKey, &k.Status, &k.NotBefore, &k.NotAfter, &k.CreatedAt); err != nil {
			return nil, err
		}
		if i, ok := idx[pid]; ok {
			out[i].Keys = append(out[i].Keys, k)
		}
	}
	if out == nil {
		out = []Publisher{}
	}
	return out, krows.Err()
}

func validateKey(i int, k KeyInput) []core.FieldError {
	var errs []core.FieldError
	f := "key_id"
	pf := "public_key"
	if i >= 0 {
		f, pf = "keys["+strconv.Itoa(i)+"].key_id", "keys["+strconv.Itoa(i)+"].public_key"
	}
	if !nameRe.MatchString(k.KeyID) {
		errs = append(errs, core.FieldError{Field: f, Code: "invalid_format", Message: "key id must be 1-100 letters, digits, _ . -"})
	}
	if _, err := pkgsig.ParsePublicKey(k.PublicKey); err != nil {
		errs = append(errs, core.FieldError{Field: pf, Code: "invalid", Message: "public key must be a base64 Ed25519 key"})
	}
	if k.NotBefore != nil && k.NotAfter != nil && !k.NotAfter.After(*k.NotBefore) {
		errs = append(errs, core.FieldError{Field: "not_after", Code: "invalid", Message: "not_after must be after not_before"})
	}
	return errs
}

// CreatePublisher registers a verified or community publisher. Official
// publishers come only from the configured root keys.
func (s *Service) CreatePublisher(ctx context.Context, in CreatePublisherInput, actorID int64) (*Publisher, error) {
	var errs []core.FieldError
	if !nameRe.MatchString(in.Name) {
		errs = append(errs, core.FieldError{Field: "name", Code: "invalid_format", Message: "name must be 1-100 letters, digits, _ . -"})
	}
	if in.TrustLevel != pkg.TrustVerified && in.TrustLevel != pkg.TrustCommunity {
		errs = append(errs, core.FieldError{Field: "trust_level", Code: "invalid", Message: "trust_level must be verified or community"})
	}
	for i, k := range in.Keys {
		errs = append(errs, validateKey(i, k)...)
	}
	if len(errs) > 0 {
		return nil, core.InvalidFields(errs...)
	}
	var id int64
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		if err := tx.QueryRow(ctx, `INSERT INTO publishers (name, trust_level) VALUES ($1, $2) RETURNING id`, in.Name, in.TrustLevel).Scan(&id); err != nil {
			return err
		}
		for _, k := range in.Keys {
			if err := insertKey(ctx, tx, id, k); err != nil {
				return err
			}
		}
		return audit.Audit(ctx, tx, actorID, "publisher.create", "publisher", strconv.FormatInt(id, 10), map[string]any{"name": in.Name, "trust_level": in.TrustLevel, "keys": len(in.Keys)})
	})
	if store.IsUniqueViolation(err, "") {
		return nil, core.ErrConflict.WithMessage("publisher or key id already exists")
	}
	if err != nil {
		return nil, err
	}
	return s.getPublisher(ctx, id)
}

func insertKey(ctx context.Context, tx pgx.Tx, pubID int64, k KeyInput) error {
	_, err := tx.Exec(ctx, `INSERT INTO publisher_keys (key_id, publisher_id, public_key, not_before, not_after)
		VALUES ($1, $2, $3, $4, $5)`, k.KeyID, pubID, k.PublicKey, k.NotBefore, k.NotAfter)
	return err
}

// AddPublisherKey adds a signing key (key rotation).
func (s *Service) AddPublisherKey(ctx context.Context, pubID int64, k KeyInput, actorID int64) (*Publisher, error) {
	if errs := validateKey(-1, k); len(errs) > 0 {
		return nil, core.InvalidFields(errs...)
	}
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		var status string
		err := tx.QueryRow(ctx, `SELECT status FROM publishers WHERE id = $1 FOR UPDATE`, pubID).Scan(&status)
		if store.IsNoRows(err) {
			return core.ErrNotFound.WithMessage("publisher not found")
		}
		if err != nil {
			return err
		}
		if status != "active" {
			return core.ErrConflict.WithMessage("publisher is revoked")
		}
		if err := insertKey(ctx, tx, pubID, k); err != nil {
			return err
		}
		return audit.Audit(ctx, tx, actorID, "publisher.key.add", "publisher", strconv.FormatInt(pubID, 10), map[string]any{"key_id": k.KeyID})
	})
	if store.IsUniqueViolation(err, "") {
		return nil, core.ErrConflict.WithMessage("key id already exists")
	}
	if err != nil {
		return nil, err
	}
	return s.getPublisher(ctx, pubID)
}

func (s *Service) getPublisher(ctx context.Context, id int64) (*Publisher, error) {
	all, err := s.ListPublishers(ctx)
	if err != nil {
		return nil, err
	}
	for i := range all {
		if all[i].ID == id {
			return &all[i], nil
		}
	}
	return nil, core.ErrNotFound.WithMessage("publisher not found")
}

// RevokePublisher revokes a publisher and all its keys, marks its versions
// signature-revoked and disables its running plugins.
func (s *Service) RevokePublisher(ctx context.Context, pubID int64, reason string, actorID int64) (*RevokeResult, error) {
	res := &RevokeResult{DisabledPlugins: []string{}}
	var toDisable []string
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE publishers SET status = 'revoked', revoked_at = now() WHERE id = $1`, pubID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return core.ErrNotFound.WithMessage("publisher not found")
		}
		if _, err := tx.Exec(ctx, `UPDATE publisher_keys SET status = 'revoked' WHERE publisher_id = $1`, pubID); err != nil {
			return err
		}
		tag, err = tx.Exec(ctx, `UPDATE plugin_versions SET signature_status = 'revoked' WHERE publisher_id = $1`, pubID)
		if err != nil {
			return err
		}
		res.RevokedVersions = tag.RowsAffected()
		if toDisable, err = collectKeys(ctx, tx, `SELECT key FROM plugins WHERE publisher_id = $1
			AND status IN ('enabled', 'enabling', 'upgrading')`, pubID); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE plugins SET status_reason = $2, updated_at = now() WHERE publisher_id = $1`,
			pubID, "publisher revoked: "+reason); err != nil {
			return err
		}
		return audit.Audit(ctx, tx, actorID, "publisher.revoke", "publisher", strconv.FormatInt(pubID, 10), map[string]any{"reason": reason, "revoked_versions": res.RevokedVersions})
	})
	if err != nil {
		return nil, err
	}
	res.DisabledPlugins = append(res.DisabledPlugins, s.disableRevoked(ctx, toDisable, actorID, "publisher revoked: "+reason)...)
	return res, nil
}

// RevokeKey revokes one signing key, marks the versions it signed and
// disables plugins whose active (or only) version it signed.
func (s *Service) RevokeKey(ctx context.Context, keyID, reason string, actorID int64) (*RevokeResult, error) {
	res := &RevokeResult{DisabledPlugins: []string{}}
	var toDisable []string
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE publisher_keys SET status = 'revoked' WHERE key_id = $1`, keyID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return core.ErrNotFound.WithMessage("key not found")
		}
		tag, err = tx.Exec(ctx, `UPDATE plugin_versions SET signature_status = 'revoked' WHERE key_id = $1`, keyID)
		if err != nil {
			return err
		}
		res.RevokedVersions = tag.RowsAffected()
		if toDisable, err = collectKeys(ctx, tx, `
			SELECT p.key FROM plugins p
			WHERE p.status IN ('enabled', 'enabling', 'upgrading')
			  AND EXISTS (SELECT 1 FROM plugin_versions v WHERE v.plugin_key = p.key AND v.key_id = $1
			              AND (v.version = p.active_version OR v.version = p.desired_version))`, keyID); err != nil {
			return err
		}
		return audit.Audit(ctx, tx, actorID, "publisher_key.revoke", "publisher_key", keyID, map[string]any{"reason": reason, "revoked_versions": res.RevokedVersions})
	})
	if err != nil {
		return nil, err
	}
	res.DisabledPlugins = append(res.DisabledPlugins, s.disableRevoked(ctx, toDisable, actorID, "signing key revoked: "+reason)...)
	return res, nil
}

func collectKeys(ctx context.Context, q store.Querier, sql string, args ...any) ([]string, error) {
	rows, err := q.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var k string
		if err := rows.Scan(&k); err != nil {
			return nil, err
		}
		out = append(out, k)
	}
	return out, rows.Err()
}
