package ccgateway

import (
	"context"
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
	"io"
	"net/http"
)

const reauthLockSQL = `SELECT pg_advisory_xact_lock(hashtextextended('ccg-reauth:' || $1::bigint::text, 0))`

// ReauthDraft keeps its compatibility name, but returns the existing runtime.
// It never creates a draft, copies credentials, or replaces Docker resources.
// The account API checks ownership before invoking this resource.
func (s *Service) ReauthDraft(ctx context.Context, accountID, _ int64, _ *int64) (string, bool, error) {
	if !s.runtimesOn(ctx) {
		return "", false, reasonError(core.ErrUnavailable, "not_configured")
	}
	d, err := s.desired(ctx, accountID, false)
	if store.IsNoRows(err) || (err == nil && d.Deleted) {
		return "", false, core.ErrNotFound
	}
	if err != nil {
		return "", false, err
	}
	if d.Kind != "managed" {
		return "", false, reasonError(core.ErrInvalidArgument, "api_key_account")
	}
	if !d.Enabled {
		return "", false, reasonError(core.ErrInvalidArgument, d.Blocked)
	}
	res, close, err := s.runtimeRequest(ctx, d.Key, http.MethodGet, "status", nil, "")
	if err != nil {
		return "", false, transportError(err)
	}
	defer close()
	defer res.Body.Close()
	var status struct {
		Status   string `json:"status"`
		Revision string `json:"revision"`
	}
	if res.StatusCode != http.StatusOK || json.NewDecoder(io.LimitReader(res.Body, 65536)).Decode(&status) != nil || status.Status != "ready" || status.Revision != d.Revision {
		return "", false, reasonError(core.ErrUnavailable, "runtime_not_ready")
	}
	return d.Key, false, nil
}

// CommitReauth verifies login on the same runtime and resets account-side
// failure/quota state. Runtime mappings, sessions and volumes are retained.
func (s *Service) CommitReauth(ctx context.Context, accountID int64, key string, _ *int64, fn func(pgx.Tx, string) error) (string, error) {
	if !s.runtimesOn(ctx) {
		return "", reasonError(core.ErrUnavailable, "not_configured")
	}
	if !accountKeyPattern.MatchString(key) && !isDraftKey(key) {
		return "", draftNotFound(core.ErrInvalidArgument)
	}
	err := s.lockedTx(ctx, key, true, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, reauthLockSQL, accountID); err != nil {
			return err
		}
		var current string
		err := tx.QueryRow(ctx, `SELECT COALESCE(r.key,a.id::text) FROM accounts a LEFT JOIN ccgateway_runtimes r ON r.account_id=a.id
   WHERE a.id=$1 AND a.plugin_key='ccgateway' AND a.type='managed' AND a.deleted_at IS NULL FOR UPDATE OF a`, accountID).Scan(&current)
		if store.IsNoRows(err) || (err == nil && current != key) {
			return draftNotFound(core.ErrInvalidArgument)
		}
		if err != nil {
			return err
		}
		d, err := s.desiredIn(ctx, tx, accountID, false)
		if err != nil {
			return err
		}
		if !d.Enabled {
			return reasonError(core.ErrInvalidArgument, d.Blocked)
		}
		res, close, err := s.runtimeRequest(ctx, key, http.MethodGet, "admin/status", nil, d.Revision)
		if err != nil {
			return transportError(err)
		}
		defer close()
		defer res.Body.Close()
		var health struct {
			LoggedIn         bool   `json:"logged_in"`
			SubscriptionType string `json:"subscription_type"`
		}
		if res.StatusCode != http.StatusOK || json.NewDecoder(io.LimitReader(res.Body, 65536)).Decode(&health) != nil || !health.LoggedIn {
			return reasonError(core.ErrInvalidArgument, "draft_not_authorized")
		}
		if err := recordSubscription(ctx, tx, accountID, health.SubscriptionType); err != nil {
			return err
		}
		if fn != nil {
			return fn(tx, "")
		}
		return nil
	})
	if err == nil {
		s.Kick(key)
	}
	return "", err
}
