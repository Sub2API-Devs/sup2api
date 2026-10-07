package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
)

// Re-authorizing a saved Claude Code account (CONTRACTS §49.17): a draft
// runtime for the account (for_account) is signed in while the account keeps
// serving with its current runtime; committing swaps the two in one
// transaction and the old runtime is retired (deleted by the sweep after
// retiredGrace). The account module serves the HTTP endpoints, checks the
// account permission and clears the account's own state.

// reauthLockSQL serialises the re-authorization drafts of one account.
const reauthLockSQL = `SELECT pg_advisory_xact_lock(hashtextextended('ccg-reauth:' || $1::bigint::text, 0))`

// ReauthDraft returns the open re-authorization draft of account accountID
// (created=false) or creates one (created=true) egressing through the
// account's current proxy, and asks this node to prepare its runtime. scope
// is the caller's draft visibility (nil: settings:manage): an open draft the
// caller cannot see is handed over to it, so whoever may re-authorize the
// account can always drive the flow. uid is the caller.
//
// Errors: 503 not_configured (runtimes off), 404 (not a ccgateway account),
// 400 api_key_account, no_proxy or proxy_disabled.
func (s *Service) ReauthDraft(ctx context.Context, accountID, uid int64, scope *int64) (key string, created bool, err error) {
	if !s.runtimesOn(ctx) {
		return "", false, reasonError(core.ErrUnavailable, "not_configured")
	}
	var kind string
	var proxyID *int64
	var proxyStatus *string
	e := s.DB.Pool.QueryRow(ctx, `SELECT a.type, a.proxy_id, p.status FROM accounts a LEFT JOIN proxies p ON p.id=a.proxy_id
		WHERE a.id=$1 AND a.plugin_key='ccgateway' AND a.type IN ('managed','apikey') AND a.deleted_at IS NULL`, accountID).
		Scan(&kind, &proxyID, &proxyStatus)
	if store.IsNoRows(e) {
		return "", false, core.ErrNotFound
	}
	if e != nil {
		return "", false, e
	}
	switch {
	case kind != "managed":
		return "", false, reasonError(core.ErrInvalidArgument, "api_key_account")
	case proxyID == nil || proxyStatus == nil:
		return "", false, reasonError(core.ErrInvalidArgument, "no_proxy")
	case *proxyStatus == "disabled":
		return "", false, reasonError(core.ErrInvalidArgument, "proxy_disabled")
	}
	e = s.DB.Tx(ctx, func(tx pgx.Tx) error {
		if _, e := tx.Exec(ctx, reauthLockSQL, accountID); e != nil {
			return e
		}
		// An expired draft is left to the sweep: resuming it could have it
		// deleted under the console.
		e := tx.QueryRow(ctx, `UPDATE ccgateway_runtimes SET proxy_id=$2, last_seen_at=now(), created_by=COALESCE($3::bigint, created_by)
			WHERE key = (SELECT key FROM ccgateway_runtimes WHERE for_account=$1 AND account_id IS NULL AND retired_at IS NULL
				AND last_seen_at >= now() - $4::bigint * interval '1 second' AND created_at >= now() - $5::bigint * interval '1 second'
				ORDER BY created_at DESC LIMIT 1)
			RETURNING key`, accountID, *proxyID, scope, int64(draftIdle.Seconds()), int64(draftMaxAge.Seconds())).Scan(&key)
		if e == nil || !store.IsNoRows(e) {
			return e
		}
		key, created = newDraftKey(), true
		_, e = tx.Exec(ctx, `INSERT INTO ccgateway_runtimes(key, proxy_id, created_by, for_account)
			VALUES($1, $2, NULLIF($3::bigint, 0), $4)`, key, *proxyID, uid, accountID)
		return e
	})
	if e != nil {
		return "", false, e
	}
	s.Kick(key)
	return key, created, nil
}

// CommitReauth makes the signed-in re-authorization draft key the runtime of
// account accountID. The draft must be an open re-authorization draft of
// that account visible in scope (else 400 draft_not_found) and Claude Code
// must be signed in in it (else 400 draft_not_authorized). Under the draft
// runtime's advisory lock, in one transaction: the account's current runtime
// is retired (account_id NULL, retired_at now; an account still on its
// id-named runtime gets that row inserted), the draft adopted, and fn runs
// (the account module clears the account's state and audits). Before the
// commit the draft runtime is configured as the account's runtime, read in
// the transaction, so the gateway finds it ready the moment it routes there;
// a controller failure rolls everything back (503 sync_failed). retired is
// the key of the replaced runtime.
func (s *Service) CommitReauth(ctx context.Context, accountID int64, key string, scope *int64, fn func(tx pgx.Tx, retired string) error) (retired string, err error) {
	if !s.runtimesOn(ctx) {
		return "", reasonError(core.ErrUnavailable, "not_configured")
	}
	if e := s.checkDraftLogin(ctx, key, scope, accountID); e != nil {
		return "", e
	}
	e := s.lockedTx(ctx, key, true, func(tx pgx.Tx) error {
		if _, e := tx.Exec(ctx, reauthLockSQL, accountID); e != nil {
			return e
		}
		var open bool
		if e := tx.QueryRow(ctx, `SELECT true FROM ccgateway_runtimes WHERE key=$1 AND for_account=$2
			AND account_id IS NULL AND retired_at IS NULL AND ($3::bigint IS NULL OR created_by=$3) FOR UPDATE`,
			key, accountID, scope).Scan(&open); e != nil {
			if store.IsNoRows(e) {
				return draftNotFound(core.ErrInvalidArgument)
			}
			return e
		}
		e := tx.QueryRow(ctx, `UPDATE ccgateway_runtimes SET account_id=NULL, retired_at=now(), last_seen_at=now()
			WHERE account_id=$1 RETURNING key`, accountID).Scan(&retired)
		if store.IsNoRows(e) {
			retired = strconv.FormatInt(accountID, 10)
			_, e = tx.Exec(ctx, `INSERT INTO ccgateway_runtimes(key, retired_at) VALUES($1, now())
				ON CONFLICT (key) DO UPDATE SET account_id=NULL, retired_at=now(), last_seen_at=now()`, retired)
		}
		if e != nil {
			return e
		}
		if _, e = tx.Exec(ctx, `UPDATE ccgateway_runtimes SET account_id=$2, adopted_at=now(), last_seen_at=now()
			WHERE key=$1`, key, accountID); e != nil {
			return e
		}
		if fn != nil {
			if e = fn(tx, retired); e != nil {
				return e
			}
		}
		d, e := s.desiredIn(ctx, tx, accountID, true)
		if e != nil {
			return e
		}
		if d.Key != key {
			return draftNotFound(core.ErrInvalidArgument)
		}
		if !d.Enabled {
			return nil // blocked: the kick after the commit stops the runtime
		}
		if e = s.putConfig(ctx, key, d); e != nil {
			if errors.Is(e, errNotConfigured) || errors.Is(e, errUnreachable) {
				return reasonError(core.ErrUnavailable, "not_configured")
			}
			return reasonError(core.ErrUnavailable, "sync_failed")
		}
		return nil
	})
	if e != nil {
		return "", e
	}
	s.Kick(key)
	return retired, nil
}

// MigrateReauth copies the current account's CLI configuration into its new
// draft. Runtime keys are resolved server-side; callers cannot name a source.
// Only an explicit account update calls this method, never reconciliation.
func (s *Service) MigrateReauth(ctx context.Context, accountID int64, key string, scope *int64) error {
	return s.lockedTx(ctx, key, true, func(tx pgx.Tx) error {
		if _, e := tx.Exec(ctx, reauthLockSQL, accountID); e != nil {
			return e
		}
		var valid bool
		if e := tx.QueryRow(ctx, `SELECT true FROM ccgateway_runtimes WHERE key=$1 AND for_account=$2
			AND account_id IS NULL AND retired_at IS NULL AND ($3::bigint IS NULL OR created_by=$3) FOR UPDATE`, key, accountID, scope).Scan(&valid); e != nil {
			if store.IsNoRows(e) {
				return draftNotFound(core.ErrInvalidArgument)
			}
			return e
		}
		source, e := s.desiredIn(ctx, tx, accountID, false)
		if e != nil {
			return e
		}
		if source.Kind != "managed" || source.Key == key {
			return core.ErrInvalidArgument
		}
		d, e := s.draftDesired(ctx, key, true)
		if e != nil {
			return e
		}
		if !d.Enabled {
			return reasonError(core.ErrInvalidArgument, d.Blocked)
		}
		if e = s.putConfig(ctx, key, d); e != nil {
			return e
		}
		body, _ := json.Marshal(map[string]string{"source": source.Key})
		res, close, e := s.runtimeRequest(ctx, key, http.MethodPost, "migrate-auth", body, d.Revision)
		if e != nil {
			return transportError(e)
		}
		defer close()
		defer res.Body.Close()
		raw, e := io.ReadAll(io.LimitReader(res.Body, 65536))
		if e != nil {
			return e
		}
		if res.StatusCode != http.StatusOK {
			return runtimeError(res.StatusCode, raw)
		}
		return s.putConfig(ctx, key, d)
	})
}
