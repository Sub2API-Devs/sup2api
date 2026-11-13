package iam

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// TransferSuperAdmin hands the caller's super admin role to targetID (POST
// /system/super-admin/transfer): only the super admin itself, in a session,
// with its password and second factor. The caller becomes an admin.
func (s *Service) TransferSuperAdmin(ctx context.Context, actorID, targetID int64, confirm SelfConfirmation, ip string) error {
	// Refuse anyone else before the confirmation spends the login rate limit.
	su, err := s.authz.IsSuperuser(ctx, s.db.Pool, actorID)
	if err != nil {
		return err
	}
	if !su {
		return authz.ErrNotTheSuperAdmin
	}
	if err := s.confirmSelf(ctx, actorID, confirm, ip); err != nil {
		return err
	}
	return s.transferSuperAdmin(ctx, actorID, targetID)
}

// transferSuperAdmin runs authz.TransferSuperAdmin and ends every session of
// the demoted holders and the target in one transaction (authz -> user lock
// order), so each signs in again under its new roles.
func (s *Service) transferSuperAdmin(ctx context.Context, actorID, targetID int64) error {
	var v int64
	var ended []int64
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var demoted []int64
		var err error
		if v, demoted, err = s.authz.TransferSuperAdmin(ctx, tx, actorID, targetID); err != nil {
			return err
		}
		ended = append(demoted, targetID)
		for _, uid := range ended {
			if _, err := invalidateSessions(ctx, tx, uid, allSessions); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	s.authz.Committed(ctx, v)
	s.sessionsChanged(ctx, ended...)
	return nil
}

// RecoverOptions are the flags of `sub2api admin recover-superadmin`.
type RecoverOptions struct {
	ResetPassword  bool
	ResetTwoFactor bool
}

// RecoverSuperAdmin is the server CLI's way back in: the undeleted user with
// email, re-enabled when disabled, becomes the only super admin; every other
// holder becomes an admin (a deleted one only loses the role) and every
// session of them all ends. It only
// composes the system (actor 0) paths and returns the new password when
// ResetPassword is set. Without a bus the other nodes catch up through the
// version poll and the status cache TTL. ctx should carry audit.WithSource.
func (s *Service) RecoverSuperAdmin(ctx context.Context, email string, opts RecoverOptions) (password string, err error) {
	var id int64
	var status string
	err = s.db.Pool.QueryRow(ctx, `SELECT id, status FROM users WHERE lower(email) = lower($1) AND deleted_at IS NULL`,
		strings.TrimSpace(email)).Scan(&id, &status)
	if store.IsNoRows(err) {
		return "", core.ErrNotFound.WithMessage("user not found")
	}
	if err != nil {
		return "", err
	}
	if status != StatusActive {
		active := StatusActive
		if _, err := s.UpdateUser(ctx, 0, id, UpdateUserInput{Status: &active}, ""); err != nil {
			return "", err
		}
	}
	if err := s.transferSuperAdmin(ctx, 0, id); err != nil {
		return "", err
	}
	if opts.ResetPassword {
		password = randomPassword()
		if _, err := s.UpdateUser(ctx, 0, id, UpdateUserInput{Password: &password}, ""); err != nil {
			return "", err
		}
	}
	if opts.ResetTwoFactor {
		if err := s.ResetSecurity(ctx, 0, id, SelfConfirmation{}, ""); err != nil {
			return "", err
		}
	}
	return password, nil
}

// randomPassword returns 24 URL-safe characters (144 random bits).
func randomPassword() string {
	var b [18]byte
	_, _ = rand.Read(b[:]) // never fails (crypto/rand since Go 1.24)
	return base64.RawURLEncoding.EncodeToString(b[:])
}

func (s *Service) handleTransferSuperAdmin(c *gin.Context) {
	var in struct {
		TargetUserID int64 `json:"target_user_id"`
		SelfConfirmation
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if err := s.TransferSuperAdmin(audit.Context(c), actor(c), in.TargetUserID, in.SelfConfirmation, c.ClientIP()); err != nil {
		failLogin(c, err) // Retry-After when the confirmation is rate limited
		return
	}
	httpapi.NoContent(c)
}
