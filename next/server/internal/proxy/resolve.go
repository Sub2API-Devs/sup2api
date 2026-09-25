package proxy

import (
	"context"
	"crypto/subtle"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

var _ core.ProxyResolver = (*Service)(nil)

// FindOrCreate implements core.ProxyResolver (CONTRACTS §21.4). The match key
// is protocol, host (case-insensitive), port, username and password; name
// and status are not compared, but disabled proxies are skipped. Candidates
// are pre-filtered in SQL on the first four columns plus "has a password",
// then each stored password is decrypted and compared in constant time.
// Several matches (possible for rows created before this resolver existed)
// resolve to the smallest id.
func (s *Service) FindOrCreate(ctx context.Context, tx pgx.Tx, spec Spec, ownerID int64, scope *int64) (int64, bool, error) {
	if err := checkSpec(spec); err != nil {
		return 0, false, err
	}
	// Serialise concurrent saves of the same URL for the rest of the
	// transaction; the lock key ignores the password on purpose (same key
	// space as the SQL pre-filter).
	lockKey := spec.Protocol + "|" + spec.Host + "|" + strconv.Itoa(spec.Port) + "|" + spec.Username
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, lockKey); err != nil {
		return 0, false, err
	}
	rows, err := tx.Query(ctx, `SELECT id, password_enc FROM proxies
		WHERE protocol = $1 AND lower(host) = $2 AND port = $3 AND username = $4
		  AND (password_enc IS NULL) = $5 AND status <> 'disabled'
		  AND ($6::bigint IS NULL OR created_by = $6)
		ORDER BY id`, spec.Protocol, spec.Host, spec.Port, spec.Username, spec.Password == "", scope)
	if err != nil {
		return 0, false, err
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		var enc []byte
		if err := rows.Scan(&id, &enc); err != nil {
			return 0, false, err
		}
		if spec.Password == "" {
			// Pre-filter already guaranteed password_enc IS NULL.
			return id, false, nil
		}
		pw, err := s.cipher.Decrypt(enc, passwordAAD)
		if err != nil {
			// Undecryptable rows (rotated key) never match; keep looking.
			continue
		}
		if subtle.ConstantTimeCompare(pw, []byte(spec.Password)) == 1 {
			return id, false, nil
		}
	}
	if err := rows.Err(); err != nil {
		return 0, false, err
	}
	rows.Close()

	enc, err := s.encryptPassword(&spec.Password)
	if err != nil {
		return 0, false, err
	}
	name := autoName(spec)
	var id int64
	if err := tx.QueryRow(ctx, `INSERT INTO proxies (name, protocol, host, port, username, password_enc, status, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, 'active', $7) RETURNING id`,
		name, spec.Protocol, spec.Host, spec.Port, spec.Username, enc, ownerID).Scan(&id); err != nil {
		return 0, false, err
	}
	return id, true, nil
}

// autoName is the name of an automatically created proxy:
// <protocol>://<host>:<port>, cut to the 100-character column limit.
func autoName(spec Spec) string {
	name := spec.Protocol + "://" + net.JoinHostPort(spec.Host, strconv.Itoa(spec.Port))
	if utf8.RuneCountInString(name) > 100 {
		name = string([]rune(name)[:100])
	}
	return name
}

// AuditAutoCreate implements core.ProxyResolver: it records proxy.create
// {auto:true, account_id} for a proxy FindOrCreate inserted and announces it
// on config:changed. The broadcast may precede the commit: no node can have
// cached a proxy that did not exist a moment ago, so listeners only drop
// nothing.
func (s *Service) AuditAutoCreate(ctx context.Context, tx pgx.Tx, proxyID, ownerID, accountID int64) error {
	if err := audit.Audit(ctx, tx, ownerID, "proxy.create", "proxy", strconv.FormatInt(proxyID, 10),
		map[string]any{"auto": true, "account_id": accountID}); err != nil {
		return err
	}
	s.changed(ctx, proxyID)
	return nil
}

// HTTPClientFor implements core.ProxyDirectory: a transient, uncached client
// through spec (CONTRACTS §21.4, models/fetch with proxy_url).
func (s *Service) HTTPClientFor(_ context.Context, spec Spec) (*http.Client, error) {
	if err := checkSpec(spec); err != nil {
		return nil, err
	}
	u := &url.URL{Scheme: spec.Protocol, Host: net.JoinHostPort(spec.Host, strconv.Itoa(spec.Port))}
	if spec.Username != "" || spec.Password != "" {
		u.User = url.UserPassword(spec.Username, spec.Password)
	}
	return &http.Client{Transport: newTransport(u, false)}, nil
}
