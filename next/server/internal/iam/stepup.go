package iam

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Step-up verification (CONTRACTS §80.2, docs/DESIGN-2026-11-12-AUTHZ-HARDENING.md
// 期 4): the one implementation of core.StepUpVerifier. A caller verifies
// once (VerifyStepUp) and gets a proof: five minutes, one use, bound to the
// user, the session or access key, the scope and the operation. Proofs are
// auth_flows rows like the other short steps (§79.1): shared by the nodes,
// taken once by DELETE ... RETURNING, and they need no Redis.

// The verification methods.
const (
	methodPasskey  = "passkey"
	methodTOTP     = "totp" // a TOTP or backup code
	methodPassword = "password"
)

// Why a method is unavailable.
const (
	reasonNotEnrolled = "not_enrolled"
	reasonAccessKey   = "access_key"    // passkeys need the browser of a session
	reasonStrongFirst = "strong_method" // a passkey or two-factor is set up: the password alone is not enough
)

const (
	flowStepUpProof   = "step_up_proof"
	flowStepUpPasskey = "step_up_passkey"
)

// stepUpScopes are the scopes a proof can be issued for; true marks the
// ones that need the password as well as a second factor (§8.1: the super
// admin transfer cannot be undone, and changing the password replaces the
// credential itself).
var stepUpScopes = map[string]bool{
	core.StepUpCredentialReveal:   false,
	core.StepUpAPIKeyReveal:       false,
	core.StepUpProxyReveal:        false,
	core.StepUpSuperAdminTransfer: true,
	core.StepUpSelfPassword:       true,
	core.StepUpSelfEmail:          false,
	core.StepUpSelf2FADisable:     false,
	core.StepUpSelfBackupCodes:    false,
	core.StepUpSelfPasskeyAdd:     false,
	core.StepUpSelfPasskeyDelete:  false,
	core.StepUpUserPasswordReset:  false,
	core.StepUpUserSecurityReset:  false,
	core.StepUpUserDelete:         false,
	core.StepUpPluginInstall:      false,
	core.StepUpPluginGrant:        false,
	core.StepUpPublisherManage:    false,
	core.StepUpSystemUpdate:       false,
	core.StepUpHostInstall:        false,
	core.StepUpSuperAdminIdentity: false,
}

// KnownStepUpScope reports whether a proof can be issued for scope, for the
// start-up route check.
func KnownStepUpScope(scope string) bool {
	_, ok := stepUpScopes[scope]
	return ok
}

// VerifyMethod is one way to verify, for GET /me/verify/methods.
type VerifyMethod struct {
	Method    string `json:"method"`
	Available bool   `json:"available"`
	Reason    string `json:"reason,omitempty"`
}

// VerifyMethods is the response of GET /me/verify/methods: the methods of
// one scope. With PasswordRequired the password goes with the chosen method
// (with the password method, it is the method).
type VerifyMethods struct {
	Scope            string         `json:"scope"`
	PasswordRequired bool           `json:"password_required"`
	Methods          []VerifyMethod `json:"methods"`
}

// usable reports whether method is available.
func (m *VerifyMethods) usable(method string) bool {
	return slices.ContainsFunc(m.Methods, func(v VerifyMethod) bool { return v.Method == method && v.Available })
}

func unknownScope() error {
	return core.InvalidFields(core.FieldError{Field: "scope", Code: "invalid", Message: "unknown verification scope"})
}

// StepUpMethods applies the policy (§8.1) to userID for scope: a passkey
// (not through an access key) or a two-factor code when the user has set
// one up, the password only when neither is; the password-too scopes ask
// for the password with it.
func (s *Service) StepUpMethods(ctx context.Context, userID int64, scope string) (*VerifyMethods, error) {
	passwordToo, ok := stepUpScopes[scope]
	if !ok {
		return nil, unknownScope()
	}
	var totp, passkey bool
	err := s.db.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM user_totp WHERE user_id = $1),
		EXISTS (SELECT 1 FROM user_passkeys WHERE user_id = $1)`, userID).Scan(&totp, &passkey)
	if err != nil {
		return nil, err
	}
	pk := VerifyMethod{Method: methodPasskey, Available: passkey}
	switch {
	case !passkey:
		pk.Reason = reasonNotEnrolled
	case core.ByAccessKey(ctx, userID):
		pk.Available, pk.Reason = false, reasonAccessKey
	}
	code := VerifyMethod{Method: methodTOTP, Available: totp}
	if !totp {
		code.Reason = reasonNotEnrolled
	}
	pw := VerifyMethod{Method: methodPassword, Available: !totp && !passkey}
	if !pw.Available {
		pw.Reason = reasonStrongFirst
	}
	return &VerifyMethods{Scope: scope, PasswordRequired: passwordToo, Methods: []VerifyMethod{pk, code, pw}}, nil
}

// stepUpSubject is the session or access key a proof is bound to.
func stepUpSubject(ctx context.Context) string {
	if k, ok := core.AccessKey(ctx); ok {
		return "key:" + strconv.FormatInt(k.KeyID, 10)
	}
	return "session:" + core.Session(ctx)
}

// proofPayload is what a proof is bound to.
type proofPayload struct {
	Scope     string `json:"scope"`
	Operation string `json:"operation"`
	Subject   string `json:"subject"`
	Method    string `json:"method"`
}

// VerifyInput is the body of POST /me/verify. Context is the operation the
// proof is for, "METHOD path" (details.context of verification_required).
type VerifyInput struct {
	Scope      string          `json:"scope"`
	Context    string          `json:"context"`
	Method     string          `json:"method"`
	Password   string          `json:"password"`
	Code       string          `json:"code"`
	FlowToken  string          `json:"flow_token"`
	Credential json.RawMessage `json:"credential"`
}

// StepUpProof is the response of POST /me/verify.
type StepUpProof struct {
	Proof     string    `json:"proof"`
	ExpiresAt time.Time `json:"expires_at"`
	Method    string    `json:"method"`
	Scope     string    `json:"scope"`
	Context   string    `json:"context"`
}

var errMethodUnavailable = core.InvalidFields(core.FieldError{Field: "method", Code: "unavailable", Message: "this verification method is not available"})

// VerifyStepUp checks the caller by the chosen method and issues a proof.
// Failures count as they do at login: the password towards the login rate
// limit, a wrong code towards the two-factor lockout, a failed passkey
// towards the IP limit.
func (s *Service) VerifyStepUp(ctx context.Context, r *http.Request, userID int64, in VerifyInput, ip string) (*StepUpProof, error) {
	methods, err := s.StepUpMethods(ctx, userID, in.Scope)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(in.Context) == "" || len(in.Context) > 512 {
		return nil, core.InvalidFields(core.FieldError{Field: "context", Code: "invalid", Message: "the operation to verify for"})
	}
	if !methods.usable(in.Method) {
		return nil, errMethodUnavailable
	}
	if methods.PasswordRequired || in.Method == methodPassword {
		if _, err := s.confirmPassword(ctx, userID, in.Password, ip); err != nil {
			return nil, err
		}
	}
	switch in.Method {
	case methodTOTP:
		err = s.confirmCode(ctx, userID, in.Code)
	case methodPasskey:
		err = s.finishStepUpPasskey(ctx, r, userID, in.FlowToken, in.Credential, ip)
	}
	if err != nil {
		return nil, err
	}
	payload := proofPayload{Scope: in.Scope, Operation: in.Context, Subject: stepUpSubject(ctx), Method: in.Method}
	token, err := s.createFlow(ctx, flowStepUpProof, userID, payload)
	if err != nil {
		return nil, err
	}
	detail := map[string]any{"method": in.Method, "scope": in.Scope, "context": in.Context, "via": "session"}
	if k, ok := core.AccessKey(ctx); ok {
		detail["via"], detail["access_key_id"] = "access_key", k.KeyID
	}
	if err := audit.Audit(ctx, s.db.Pool, userID, "user.security_verify", "user", strconv.FormatInt(userID, 10), detail); err != nil {
		return nil, err
	}
	return &StepUpProof{Proof: token, ExpiresAt: time.Now().Add(flowTTL), Method: in.Method, Scope: in.Scope, Context: in.Context}, nil
}

// confirmCode checks a TOTP or backup code of userID; a wrong one counts
// towards the lockout.
func (s *Service) confirmCode(ctx context.Context, userID int64, code string) error {
	if strings.TrimSpace(code) == "" {
		return errSecondFactorRequired
	}
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		if err := lockRefreshUser(ctx, tx, userID); err != nil {
			return err
		}
		return s.checkSecondFactor(ctx, tx, userID, code)
	})
	if isBadSecondFactor(err) {
		if ferr := s.recordSecondFactorFailure(ctx, userID); ferr != nil {
			return ferr
		}
	}
	return err
}

// errStepUpPasskeyFailed is a refused assertion of a signed-in caller: a
// field error, not the login's 401, which the console would take for an
// expired session.
var errStepUpPasskeyFailed = core.InvalidFields(core.FieldError{Field: "credential", Code: "failed", Message: "passkey verification failed"})

var errSecondFactorRequired = core.InvalidFields(core.FieldError{Field: "code", Code: "required", Message: "enter a verification code"})

// BeginStepUpPasskey starts the passkey assertion of a step-up (POST
// /me/verify/begin): the login ceremony, for the caller's own passkeys.
func (s *Service) BeginStepUpPasskey(ctx context.Context, r *http.Request, userID int64, scope, ip string) (*PasskeyCeremony, error) {
	methods, err := s.StepUpMethods(ctx, userID, scope)
	if err != nil {
		return nil, err
	}
	if !methods.usable(methodPasskey) {
		return nil, errMethodUnavailable
	}
	if wait := s.limiter.check(ctx, "", ip); wait > 0 {
		return nil, rateLimitedError(ctx, wait)
	}
	if wait := s.limiter.allowPasskeyBegin(ctx, ip); wait > 0 {
		return nil, rateLimitedError(ctx, wait)
	}
	wa, err := s.webAuthnFor(r, "")
	if err != nil {
		return nil, err
	}
	u, _, err := s.loadWebAuthnUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	options, session, err := wa.BeginLogin(u, webauthn.WithUserVerification(protocol.VerificationRequired))
	if err != nil {
		return nil, core.ErrInvalidArgument.WithMessage("no passkey can be used here").WithCause(err)
	}
	token, err := s.createFlow(ctx, flowStepUpPasskey, userID, session)
	if err != nil {
		return nil, err
	}
	return &PasskeyCeremony{FlowToken: token, ExpiresIn: flowTTLSeconds, Options: options}, nil
}

// finishStepUpPasskey verifies the assertion of a BeginStepUpPasskey
// ceremony and records the passkey's use.
func (s *Service) finishStepUpPasskey(ctx context.Context, r *http.Request, userID int64, flowToken string, credential json.RawMessage, ip string) error {
	if wait := s.limiter.check(ctx, "", ip); wait > 0 {
		return rateLimitedError(ctx, wait)
	}
	var session webauthn.SessionData
	if _, err := s.takeFlow(ctx, s.db.Pool, flowToken, flowStepUpPasskey, userID, &session); err != nil {
		return err
	}
	wa, err := s.webAuthnFor(r, session.RelyingPartyID)
	if err != nil {
		return err
	}
	u, _, err := s.loadWebAuthnUser(ctx, userID)
	if err != nil {
		return err
	}
	parsed, err := protocol.ParseCredentialRequestResponseBytes(credential)
	var used *webauthn.Credential
	if err == nil {
		used, err = wa.ValidateLogin(u, session, parsed)
	}
	if err != nil {
		s.limiter.fail(ctx, "", ip)
		return errStepUpPasskeyFailed
	}
	raw, err := json.Marshal(used)
	if err != nil {
		return err
	}
	_, err = s.db.Pool.Exec(ctx, `UPDATE user_passkeys SET credential = $3, last_used_at = now() WHERE user_id = $1 AND credential_id = $2`, userID, used.ID, raw)
	return err
}

// ConsumeStepUp implements core.StepUpVerifier.
func (s *Service) ConsumeStepUp(ctx context.Context, scope string) error {
	if core.StepUpSpent(ctx) == scope {
		return nil
	}
	uid, _ := core.UserID(ctx)
	proof, operation, ok := core.StepUpRequest(ctx)
	if !ok || uid == 0 {
		return core.ErrVerificationRequired.WithDetails(map[string]any{"scope": scope})
	}
	if proof != "" {
		var p proofPayload
		_, err := s.takeFlow(ctx, s.db.Pool, proof, flowStepUpProof, uid, &p)
		if err != nil && !errors.Is(err, errFlowExpired) {
			return err
		}
		if err == nil && p.Scope == scope && p.Operation == operation && p.Subject == stepUpSubject(ctx) {
			core.MarkStepUpSpent(ctx, scope)
			return nil
		}
	}
	return s.verificationRequired(ctx, uid, scope, operation)
}

// verificationRequired is the 403 that tells the console what to verify:
// the scope, the operation to bind the proof to and the methods.
func (s *Service) verificationRequired(ctx context.Context, userID int64, scope, operation string) error {
	methods, err := s.StepUpMethods(ctx, userID, scope)
	if err != nil {
		return err
	}
	return core.ErrVerificationRequired.WithMessage(t(ctx, "verify it's you to continue", "请先完成二次验证")).WithDetails(map[string]any{
		"scope": scope, "context": operation, "password_required": methods.PasswordRequired, "methods": methods.Methods,
	})
}

// RenamePasskey changes the name of one of the user's passkeys.
func (s *Service) RenamePasskey(ctx context.Context, userID, id int64, name string) (*Passkey, error) {
	name, err := normalizePasskeyName(name)
	if err != nil {
		return nil, err
	}
	p := &Passkey{ID: id}
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		err := tx.QueryRow(ctx, `UPDATE user_passkeys SET name = $3 WHERE id = $1 AND user_id = $2 RETURNING name, rp_id, created_at, last_used_at`,
			id, userID, name).Scan(&p.Name, &p.RPID, &p.CreatedAt, &p.LastUsedAt)
		if store.IsNoRows(err) {
			return core.ErrNotFound
		}
		if err != nil {
			return err
		}
		return audit.Audit(ctx, tx, userID, "user.passkey.rename", "user", strconv.FormatInt(userID, 10), map[string]any{"passkey_id": id, "name": name})
	})
	if err != nil {
		return nil, err
	}
	return p, nil
}
