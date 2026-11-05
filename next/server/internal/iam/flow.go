package iam

import (
	"context"
	"encoding/json"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// The purposes of an auth_flows row.
const (
	flowLogin2FA        = "login_2fa"
	flowTOTPSetup       = "totp_setup"
	flowPasskeyLogin    = "passkey_login"
	flowPasskeyRegister = "passkey_register"
)

const (
	// flowTTL bounds every flow, the WebAuthn ceremonies and the wait for a
	// code included.
	flowTTL = 5 * time.Minute
	// flowTTLSeconds is flowTTL in the API's expires_in.
	flowTTLSeconds = int64(flowTTL / time.Second)
)

var errFlowExpired = core.ErrInvalidArgument.WithMessage("this step has expired, start again")

// createFlow stores payload under a new random token and returns the token.
// userID 0 stores no owner (a discoverable passkey login does not know it yet).
// Expired rows are removed here, so the table never needs a cleanup job.
func (s *Service) createFlow(ctx context.Context, purpose string, userID int64, payload any) (string, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	token, err := randomToken()
	if err != nil {
		return "", err
	}
	var owner *int64
	if userID != 0 {
		owner = &userID
	}
	if _, err := s.db.Pool.Exec(ctx, `DELETE FROM auth_flows WHERE expires_at < now()`); err != nil {
		return "", err
	}
	_, err = s.db.Pool.Exec(ctx, `INSERT INTO auth_flows (token_hash, purpose, user_id, payload, expires_at) VALUES ($1, $2, $3, $4, $5)`,
		hashToken(token), purpose, owner, raw, time.Now().Add(flowTTL))
	if err != nil {
		return "", err
	}
	return token, nil
}

// takeFlow consumes a flow: it can be taken once, by the user it belongs to
// (userID 0 takes a flow of any owner). out receives the payload; the returned
// id is the owner, 0 when none.
func (s *Service) takeFlow(ctx context.Context, q store.Querier, token, purpose string, userID int64, out any) (int64, error) {
	if token == "" {
		return 0, errFlowExpired
	}
	var raw []byte
	var owner *int64
	err := q.QueryRow(ctx, `DELETE FROM auth_flows WHERE token_hash = $1 AND purpose = $2 AND expires_at > now()
		AND ($3::bigint = 0 OR user_id = $3) RETURNING payload, user_id`, hashToken(token), purpose, userID).Scan(&raw, &owner)
	if store.IsNoRows(err) {
		return 0, errFlowExpired
	}
	if err != nil {
		return 0, err
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return 0, err
	}
	if owner == nil {
		return 0, nil
	}
	return *owner, nil
}
