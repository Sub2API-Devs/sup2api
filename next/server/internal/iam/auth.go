package iam

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// TokenPair is the response of login and refresh.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"` // access token lifetime, seconds
	User         *User  `json:"user"`
}

var (
	errBadCredentials = core.ErrUnauthenticated.WithMessage("invalid email or password")
	errUserDisabled   = core.ErrPermissionDenied.WithMessage("this account is disabled")
	errBadRefresh     = core.ErrUnauthenticated.WithMessage("invalid or expired refresh token")
)

// Login checks the password and issues tokens. Disabled users are rejected.
// ip is the client address used by the failed-login rate limit (CONTRACTS
// §14.2); while email+IP or IP is locked out the password is not checked.
func (s *Service) Login(ctx context.Context, email, password, ip string) (*TokenPair, error) {
	if wait := s.limiter.check(ctx, email, ip); wait > 0 {
		return nil, rateLimitedError(ctx, wait)
	}
	var id int64
	var hash, status string
	err := s.db.Pool.QueryRow(ctx, `SELECT id, password_hash, status FROM users WHERE lower(email) = lower($1) AND deleted_at IS NULL`,
		strings.ToLower(strings.TrimSpace(email))).Scan(&id, &hash, &status)
	if store.IsNoRows(err) {
		// Burn comparable time so response timing does not reveal accounts.
		_ = bcrypt.CompareHashAndPassword(s.dummyHash, []byte(password))
		s.limiter.fail(ctx, email, ip)
		return nil, errBadCredentials
	}
	if err != nil {
		return nil, err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		s.limiter.fail(ctx, email, ip)
		return nil, errBadCredentials
	}
	s.limiter.reset(ctx, email, ip)
	if status != StatusActive {
		return nil, errUserDisabled
	}
	var pair *TokenPair
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `UPDATE users SET last_login_at = now() WHERE id = $1`, id); err != nil {
			return err
		}
		pair, err = s.issueTokens(ctx, tx, id, "")
		return err
	})
	return pair, err
}

// newFamilyID returns a random refresh token family id.
func newFamilyID() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(b[:]), nil
}

// issueTokens issues an access token and a refresh token in familyID (a new
// family when empty, i.e. on login).
func (s *Service) issueTokens(ctx context.Context, tx pgx.Tx, userID int64, familyID string) (*TokenPair, error) {
	access, err := s.issueAccessToken(userID)
	if err != nil {
		return nil, err
	}
	refresh, err := randomToken()
	if err != nil {
		return nil, err
	}
	if familyID == "" {
		if familyID, err = newFamilyID(); err != nil {
			return nil, err
		}
	}
	if _, err := tx.Exec(ctx, `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, family_id) VALUES ($1, $2, $3, $4)`,
		userID, hashToken(refresh), time.Now().Add(s.cfg.RefreshTokenTTL), familyID); err != nil {
		return nil, err
	}
	u, err := s.getUser(ctx, tx, userID)
	if err != nil {
		return nil, err
	}
	u.Balance = nil
	return &TokenPair{AccessToken: access, RefreshToken: refresh, ExpiresIn: int64(s.cfg.AccessTokenTTL / time.Second), User: u}, nil
}

// refreshVerdict is the outcome of presenting a stored refresh token.
type refreshVerdict int

const (
	refreshValid    refreshVerdict = iota
	refreshExpired                 // past expires_at, never used: plain 401
	refreshReplayed                // already rotated or revoked: revoke the family
)

// classifyRefresh decides what presenting a stored refresh token means. A
// token that was rotated (replaced_at) or revoked (revoked_at) must never be
// presented again; seeing it means it leaked, so the whole family is revoked
// even when the token has expired since.
func classifyRefresh(revokedAt, replacedAt *time.Time, expiresAt, now time.Time) refreshVerdict {
	if revokedAt != nil || replacedAt != nil {
		return refreshReplayed
	}
	if !expiresAt.After(now) {
		return refreshExpired
	}
	return refreshValid
}

// Refresh rotates a refresh token: the presented one is marked revoked and
// replaced, and a new pair is issued in the same family. Presenting a token
// that was already rotated or revoked revokes every token of its family
// (CONTRACTS §14.2) and fails with 401.
func (s *Service) Refresh(ctx context.Context, refreshToken string) (*TokenPair, error) {
	if refreshToken == "" {
		return nil, errBadRefresh
	}
	var pair *TokenPair
	var replayUser int64
	var replayFamily string
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var id, uid int64
		var family string
		var revokedAt, replacedAt *time.Time
		var expiresAt time.Time
		err := tx.QueryRow(ctx, `SELECT id, user_id, family_id, revoked_at, replaced_at, expires_at
			FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE`, hashToken(refreshToken)).
			Scan(&id, &uid, &family, &revokedAt, &replacedAt, &expiresAt)
		if store.IsNoRows(err) {
			return errBadRefresh
		}
		if err != nil {
			return err
		}
		switch classifyRefresh(revokedAt, replacedAt, expiresAt, time.Now()) {
		case refreshReplayed:
			// Commit the family revocation; the 401 is returned after the tx.
			// A row without a family (never written by this code) only
			// revokes itself.
			if family == "" {
				family = "token:" + strconv.FormatInt(id, 10)
				_, err = tx.Exec(ctx, `UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, id)
			} else {
				_, err = tx.Exec(ctx, `UPDATE refresh_tokens SET revoked_at = now()
					WHERE family_id = $1 AND revoked_at IS NULL`, family)
			}
			if err != nil {
				return err
			}
			replayUser, replayFamily = uid, family
			return nil
		case refreshExpired:
			return errBadRefresh
		}
		if _, err := tx.Exec(ctx, `UPDATE refresh_tokens SET revoked_at = now(), replaced_at = now() WHERE id = $1`, id); err != nil {
			return err
		}
		var status string
		err = tx.QueryRow(ctx, `SELECT status FROM users WHERE id = $1 AND deleted_at IS NULL`, uid).Scan(&status)
		if store.IsNoRows(err) {
			return errBadRefresh
		}
		if err != nil {
			return err
		}
		if status != StatusActive {
			return errUserDisabled
		}
		pair, err = s.issueTokens(ctx, tx, uid, family)
		return err
	})
	if err != nil {
		return nil, err
	}
	if replayFamily != "" {
		slog.WarnContext(ctx, "iam: refresh token reuse detected, token family revoked",
			"user_id", replayUser, "family_id", replayFamily)
		return nil, errBadRefresh
	}
	return pair, nil
}

// Logout revokes refreshToken (only that token, not its family) if it
// belongs to userID; an empty token revokes every refresh token of the user.
func (s *Service) Logout(ctx context.Context, userID int64, refreshToken string) error {
	if refreshToken == "" {
		return revokeAllRefreshTokens(ctx, s.db.Pool, userID)
	}
	_, err := s.db.Pool.Exec(ctx, `UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND user_id = $2 AND revoked_at IS NULL`,
		hashToken(refreshToken), userID)
	return err
}

// ChangePassword changes the caller's password and revokes all refresh
// tokens (other sessions end when their access tokens expire).
func (s *Service) ChangePassword(ctx context.Context, userID int64, oldPassword, newPassword string) error {
	if f := validatePassword("new_password", newPassword); f != nil {
		return core.InvalidFields(*f)
	}
	var hash string
	err := s.db.Pool.QueryRow(ctx, `SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL`, userID).Scan(&hash)
	if store.IsNoRows(err) {
		return core.ErrUnauthenticated
	}
	if err != nil {
		return err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(oldPassword)) != nil {
		return core.InvalidFields(core.FieldError{Field: "old_password", Code: "incorrect", Message: "incorrect password"})
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), s.cost)
	if err != nil {
		return err
	}
	return s.db.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, userID, string(newHash)); err != nil {
			return err
		}
		return revokeAllRefreshTokens(ctx, tx, userID)
	})
}

// Me is the response of GET /me.
type Me struct {
	ID          int64    `json:"id"`
	Email       string   `json:"email"`
	DisplayName string   `json:"display_name"`
	Roles       []string `json:"roles"`
	Permissions []string `json:"permissions"`
	Superuser   bool     `json:"superuser"`
}

// GetMe returns the caller's profile and effective permissions (superusers
// get every active permission).
func (s *Service) GetMe(ctx context.Context, userID int64) (*Me, error) {
	u, err := s.GetUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	set, err := s.authz.PermissionSet(ctx, userID)
	if err != nil {
		return nil, err
	}
	me := &Me{ID: u.ID, Email: u.Email, DisplayName: u.DisplayName, Roles: u.Roles, Superuser: set.Superuser}
	if set.Superuser {
		if me.Permissions, err = s.authz.ActivePermissionKeys(ctx); err != nil {
			return nil, err
		}
	} else {
		me.Permissions = make([]string, 0, len(set.Keys))
		for k := range set.Keys {
			me.Permissions = append(me.Permissions, k)
		}
	}
	sort.Strings(me.Permissions)
	return me, nil
}
