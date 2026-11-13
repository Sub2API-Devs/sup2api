package iam

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// selfSecurity is the self permission of one's own sign-in: password,
// two-factor, passkeys.
const selfSecurity = "self:security"

// registerSecurityRoutes mounts the second login step, passkeys, two-factor
// and login sessions (CONTRACTS §79).
func (s *Service) registerSecurityRoutes(r *httpapi.Router) {
	r.Public(http.MethodPost, "/auth/login/2fa", s.handleLogin2FA)
	r.Public(http.MethodPost, "/auth/passkey/begin", s.handlePasskeyLoginBegin)
	r.Public(http.MethodPost, "/auth/passkey/finish", s.handlePasskeyLoginFinish)

	r.Self(http.MethodGet, "/me/two-factor", selfSecurity, s.handleTwoFactor)
	r.StepUp(core.StepUpSelf2FAEnable).Self(http.MethodPost, "/me/two-factor/setup", selfSecurity, s.handleTwoFactorSetup)
	r.Self(http.MethodPost, "/me/two-factor/enable", selfSecurity, s.handleTwoFactorEnable)
	r.StepUp(core.StepUpSelf2FADisable).Self(http.MethodPost, "/me/two-factor/disable", selfSecurity, s.handleTwoFactorDisable)
	r.StepUp(core.StepUpSelfBackupCodes).Self(http.MethodPost, "/me/two-factor/backup-codes", selfSecurity, s.handleBackupCodes)

	r.Self(http.MethodGet, "/me/passkeys", selfSecurity, s.handlePasskeys)
	r.StepUp(core.StepUpSelfPasskeyAdd).Self(http.MethodPost, "/me/passkeys/begin", selfSecurity, s.handlePasskeyAddBegin)
	r.Self(http.MethodPost, "/me/passkeys/finish", selfSecurity, s.handlePasskeyAddFinish)
	r.Self(http.MethodPatch, "/me/passkeys/:id", selfSecurity, s.handlePasskeyRename)
	r.StepUp(core.StepUpSelfPasskeyDelete).Self(http.MethodDelete, "/me/passkeys/:id", selfSecurity, s.handlePasskeyDelete)

	// Step-up verification (§80.2): any caller, a session or an access key.
	r.AuthedRead("/me/verify/methods", s.handleVerifyMethods)
	r.Handle(http.MethodPost, "/me/verify/begin", s.handleVerifyBegin)
	r.Handle(http.MethodPost, "/me/verify", s.handleVerify)

	// Only a login session manages login sessions and access keys: a key
	// could otherwise end its owner's sessions, or renew or widen itself
	// (§80).
	session := r.SessionOnly()
	session.Handle(http.MethodGet, "/me/sessions", s.handleSessions)
	session.Handle(http.MethodPost, "/me/sessions/revoke-others", s.handleSessionsRevokeOthers)
	session.Handle(http.MethodDelete, "/me/sessions/:id", s.handleSessionRevoke)

	session.Handle(http.MethodGet, "/me/access-keys", s.handleAccessKeys)
	session.Handle(http.MethodGet, "/me/access-keys/permissions", s.handleAccessKeyPermissions)
	session.Handle(http.MethodPost, "/me/access-keys", s.handleAccessKeyCreate)
	session.Handle(http.MethodPatch, "/me/access-keys/:id", s.handleAccessKeyUpdate)
	session.Handle(http.MethodDelete, "/me/access-keys/:id", s.handleAccessKeyDelete)

	// Removing someone's second factor leaves the account one password away,
	// like resetting the password: the same permission and a step-up (D16).
	r.StepUp(core.StepUpUserSecurityReset).Perm(http.MethodDelete, "/users/:id/security", "user:password:reset", s.handleResetSecurity)
}

func (s *Service) handleAccessKeys(c *gin.Context) {
	out, err := s.AccessKeys(c.Request.Context(), actor(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

func (s *Service) handleAccessKeyPermissions(c *gin.Context) {
	out, err := s.AccessKeyPermissions(c.Request.Context(), actor(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

func (s *Service) handleAccessKeyCreate(c *gin.Context) {
	var in CreateAccessKeyInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	out, err := s.CreateAccessKey(audit.Context(c), actor(c), in, c.ClientIP())
	if err != nil {
		failLogin(c, err)
		return
	}
	httpapi.Created(c, out)
}

func (s *Service) handleAccessKeyUpdate(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in UpdateAccessKeyInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	out, err := s.UpdateAccessKey(audit.Context(c), actor(c), id, in, c.ClientIP())
	if err != nil {
		failLogin(c, err)
		return
	}
	httpapi.OK(c, out)
}

func (s *Service) handleAccessKeyDelete(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	if err := s.DeleteAccessKey(audit.Context(c), actor(c), id); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.NoContent(c)
}

// failLogin answers a failed login step with Retry-After when rate limited.
func failLogin(c *gin.Context, err error) {
	if e := core.AsError(err); e.Code == core.ErrRateLimited.Code {
		if secs, ok := e.Details["retry_after_seconds"].(int64); ok {
			c.Header("Retry-After", strconv.FormatInt(secs, 10))
		}
	}
	httpapi.Fail(c, err)
}

func (s *Service) handleLogin2FA(c *gin.Context) {
	var in struct {
		FlowToken string `json:"flow_token"`
		Code      string `json:"code"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	pair, err := s.LoginSecondFactor(sessionContext(c, loginMethodTwoFactor), in.FlowToken, in.Code, c.ClientIP())
	if err != nil {
		failLogin(c, err)
		return
	}
	httpapi.OK(c, pair)
}

func (s *Service) handlePasskeyLoginBegin(c *gin.Context) {
	out, err := s.BeginPasskeyLogin(c.Request.Context(), c.Request, c.ClientIP())
	if err != nil {
		failLogin(c, err)
		return
	}
	httpapi.OK(c, out)
}

func (s *Service) handlePasskeyLoginFinish(c *gin.Context) {
	var in struct {
		FlowToken  string          `json:"flow_token"`
		Credential json.RawMessage `json:"credential"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	pair, err := s.FinishPasskeyLogin(sessionContext(c, loginMethodPasskey), c.Request, in.FlowToken, in.Credential, c.ClientIP())
	if err != nil {
		failLogin(c, err)
		return
	}
	httpapi.OK(c, pair)
}

func (s *Service) handleTwoFactor(c *gin.Context) {
	out, err := s.TwoFactor(c.Request.Context(), actor(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

func (s *Service) handleTwoFactorSetup(c *gin.Context) {
	out, err := s.StartTwoFactor(c.Request.Context(), actor(c))
	if err != nil {
		failLogin(c, err)
		return
	}
	httpapi.OK(c, out)
}

func (s *Service) handleTwoFactorEnable(c *gin.Context) {
	var in struct {
		FlowToken string `json:"flow_token"`
		Code      string `json:"code"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	codes, err := s.EnableTwoFactor(audit.Context(c), actor(c), in.FlowToken, in.Code)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, gin.H{"backup_codes": codes})
}

func (s *Service) handleTwoFactorDisable(c *gin.Context) {
	if err := s.DisableTwoFactor(audit.Context(c), actor(c)); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.NoContent(c)
}

func (s *Service) handleBackupCodes(c *gin.Context) {
	codes, err := s.RegenerateBackupCodes(audit.Context(c), actor(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, gin.H{"backup_codes": codes})
}

func (s *Service) handlePasskeys(c *gin.Context) {
	out, err := s.Passkeys(c.Request.Context(), actor(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

func (s *Service) handlePasskeyAddBegin(c *gin.Context) {
	out, err := s.BeginPasskeyRegistration(c.Request.Context(), c.Request, actor(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

func (s *Service) handlePasskeyAddFinish(c *gin.Context) {
	var in struct {
		FlowToken  string          `json:"flow_token"`
		Name       string          `json:"name"`
		Credential json.RawMessage `json:"credential"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	out, err := s.FinishPasskeyRegistration(audit.Context(c), c.Request, actor(c), in.FlowToken, in.Name, in.Credential)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.Created(c, out)
}

func (s *Service) handlePasskeyDelete(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	if err := s.DeletePasskey(audit.Context(c), actor(c), id); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.NoContent(c)
}

func (s *Service) handleSessions(c *gin.Context) {
	out, err := s.Sessions(c.Request.Context(), actor(c), s.currentFamily(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

func (s *Service) handleSessionRevoke(c *gin.Context) {
	if err := s.RevokeSession(audit.Context(c), actor(c), c.Param("id")); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.NoContent(c)
}

func (s *Service) handleSessionsRevokeOthers(c *gin.Context) {
	current := s.currentFamily(c)
	if current == "" {
		// A token from before sessions had ids cannot say which one to keep.
		httpapi.Fail(c, core.ErrConflict.WithMessage("sign in again before ending other sessions"))
		return
	}
	if err := s.RevokeOtherSessions(audit.Context(c), actor(c), current); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.NoContent(c)
}

func (s *Service) handleResetSecurity(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	if err := s.ResetSecurity(audit.Context(c), actor(c), id); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.NoContent(c)
}

func (s *Service) handlePasskeyRename(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in struct {
		Name string `json:"name"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	out, err := s.RenamePasskey(audit.Context(c), actor(c), id, in.Name)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

func (s *Service) handleVerifyMethods(c *gin.Context) {
	out, err := s.StepUpMethods(c.Request.Context(), actor(c), c.Query("scope"))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

func (s *Service) handleVerifyBegin(c *gin.Context) {
	var in struct {
		Scope string `json:"scope"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	out, err := s.BeginStepUpPasskey(c.Request.Context(), c.Request, actor(c), in.Scope, c.ClientIP())
	if err != nil {
		failLogin(c, err)
		return
	}
	httpapi.OK(c, out)
}

func (s *Service) handleVerify(c *gin.Context) {
	var in VerifyInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	out, err := s.VerifyStepUp(audit.Context(c), c.Request, actor(c), in, c.ClientIP())
	if err != nil {
		failLogin(c, err)
		return
	}
	httpapi.OK(c, out)
}
