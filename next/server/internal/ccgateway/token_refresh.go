package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// RefreshToken runs the account action refresh_token (CONTRACTS §49.21): the
// Claude Code of the account's runtime renews its own stored OAuth token
// (POST admin/auth/refresh). The CLI renews a token that expired or expires
// within five minutes and leaves a later one alone; refreshed says which.
// Errors: the container's codes as details.reason (not_logged_in,
// token_revoked, auth_in_progress, refresh_failed), api_key_account, and
// the usual runtime reasons.
func (s *Service) RefreshToken(ctx context.Context, accountID int64) (map[string]any, error) {
	d, e := s.desired(ctx, accountID, false)
	if e != nil {
		return nil, core.ErrNotFound
	}
	if d.Kind != "managed" {
		return nil, reasonError(core.ErrInvalidArgument, "api_key_account")
	}
	if reason := d.unavailable(); reason != "" {
		return nil, reasonError(core.ErrInvalidArgument, reason)
	}
	ctx, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()
	res, closeConn, e := s.runtimeRequest(ctx, d.Key, http.MethodPost, "admin/auth/refresh", nil, d.Revision)
	if e != nil {
		return nil, transportError(e)
	}
	defer closeConn()
	defer res.Body.Close()
	raw, e := io.ReadAll(io.LimitReader(res.Body, 4097))
	if e != nil || len(raw) > 4096 {
		return nil, reasonError(core.ErrUnavailable, "runtime_unavailable")
	}
	if res.StatusCode != http.StatusOK {
		return nil, runtimeError(res.StatusCode, raw)
	}
	var out struct {
		Refreshed *bool     `json:"refreshed"`
		ExpiresAt time.Time `json:"expires_at"`
	}
	if json.Unmarshal(raw, &out) != nil || out.Refreshed == nil || out.ExpiresAt.IsZero() {
		return nil, reasonError(core.ErrUnavailable, "runtime_unavailable")
	}
	return map[string]any{"refreshed": *out.Refreshed, "expires_at": out.ExpiresAt.UTC()}, nil
}
