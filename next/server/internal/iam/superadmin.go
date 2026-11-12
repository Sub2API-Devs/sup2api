package iam

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
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
