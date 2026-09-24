package iam

import (
	"context"
	"sort"
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
func (s *Service) Login(ctx context.Context, email, password string) (*TokenPair, error) {
	var id int64
	var hash, status string
	err := s.db.Pool.QueryRow(ctx, `SELECT id, password_hash, status FROM users WHERE lower(email) = lower($1) AND deleted_at IS NULL`,
		strings.ToLower(strings.TrimSpace(email))).Scan(&id, &hash, &status)
	if store.IsNoRows(err) {
		// Burn comparable time so response timing does not reveal accounts.
		_ = bcrypt.CompareHashAndPassword(s.dummyHash, []byte(password))
		return nil, errBadCredentials
	}
	if err != nil {
		return nil, err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return nil, errBadCredentials
	}
	if status != StatusActive {
		return nil, errUserDisabled
	}
	var pair *TokenPair
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `UPDATE users SET last_login_at = now() WHERE id = $1`, id); err != nil {
			return err
		}
		pair, err = s.issueTokens(ctx, tx, id)
		return err
	})
	return pair, err
}

func (s *Service) issueTokens(ctx context.Context, tx pgx.Tx, userID int64) (*TokenPair, error) {
	access, err := s.issueAccessToken(userID)
	if err != nil {
		return nil, err
	}
	refresh, err := randomToken()
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, hashToken(refresh), time.Now().Add(s.cfg.RefreshTokenTTL)); err != nil {
		return nil, err
	}
	u, err := s.getUser(ctx, tx, userID)
	if err != nil {
		return nil, err
	}
	u.Balance = nil
	return &TokenPair{AccessToken: access, RefreshToken: refresh, ExpiresIn: int64(s.cfg.AccessTokenTTL / time.Second), User: u}, nil
}

// Refresh rotates a refresh token: the presented one is revoked and a new
// pair is issued.
func (s *Service) Refresh(ctx context.Context, refreshToken string) (*TokenPair, error) {
	if refreshToken == "" {
		return nil, errBadRefresh
	}
	var pair *TokenPair
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var uid int64
		err := tx.QueryRow(ctx, `
UPDATE refresh_tokens SET revoked_at = now()
WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
RETURNING user_id`, hashToken(refreshToken)).Scan(&uid)
		if store.IsNoRows(err) {
			return errBadRefresh
		}
		if err != nil {
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
		pair, err = s.issueTokens(ctx, tx, uid)
		return err
	})
	return pair, err
}

// Logout revokes refreshToken if it belongs to userID; an empty token
// revokes every refresh token of the user.
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
