package core

import (
	"context"
	"net/http"
)

// Step-up verification (CONTRACTS §80.2): a high-risk operation needs, besides
// its permission, a fresh proof that the caller is the user. The caller
// verifies once (POST /me/verify) and sends the short-lived, single-use proof
// in HeaderVerifyProof; the route spends it (StepUpVerifier).

// HeaderVerifyProof carries a step-up proof on the request it was issued for.
const HeaderVerifyProof = "X-Verify-Proof"

// ErrVerificationRequired: the operation needs a step-up proof and the
// request has none valid for it. Details: scope, context (the operation the
// proof must be bound to), methods (what the caller can verify with) and
// password_required.
var ErrVerificationRequired = NewError(http.StatusForbidden, "verification_required", "verify it's you to continue")

// The step-up scopes: one per kind of high-risk operation. A proof is issued
// for one scope and spent only on it.
const (
	StepUpCredentialReveal   = "credential.reveal"
	StepUpAPIKeyReveal       = "apikey.reveal"
	StepUpProxyReveal        = "proxy.reveal"
	StepUpSuperAdminTransfer = "superadmin.transfer"
	StepUpSelfPassword       = "self.password.change"
	StepUpSelfEmail          = "self.email.change"
	StepUpSelf2FAEnable      = "self.2fa.enable"
	StepUpSelf2FADisable     = "self.2fa.disable"
	StepUpSelfBackupCodes    = "self.2fa.backup_codes"
	StepUpSelfPasskeyAdd     = "self.passkey.add"
	StepUpSelfPasskeyDelete  = "self.passkey.delete"
	StepUpUserPasswordReset  = "user.password.reset"
	StepUpUserSecurityReset  = "user.security.reset"
	StepUpUserDelete         = "user.delete"
	StepUpPluginInstall      = "plugin.install"
	StepUpPluginGrant        = "plugin.grant"
	StepUpPublisherManage    = "publisher.manage"
	StepUpSystemUpdate       = "system.update"
	// StepUpHostInstall: installing or reaching code that runs on a host the
	// core controls (the ccgateway controller and runtimes, SSH targets).
	StepUpHostInstall = "host.install"
	// StepUpAccessKeyWrite: creating an access key or changing one
	// (login sessions only), which signs out a credential with the
	// caller's rights.
	StepUpAccessKeyWrite = "self.access_key.write"
	// StepUpSuperAdminIdentity is the super admin changing its own account
	// through an access key (UserGuard, ActOnIdentity): any proof the request
	// already spent covers it.
	StepUpSuperAdminIdentity = "superadmin.identity"
)

// StepUpVerifier spends step-up proofs (iam implements it).
type StepUpVerifier interface {
	// ConsumeStepUp spends the request's proof (WithStepUp) on scope: it
	// must have been issued to the request's user, through the same session
	// or access key, for scope and for this request's operation (method and
	// path). A proof works once; a request that spent one passes later
	// checks of the same scope. Otherwise it fails with
	// ErrVerificationRequired.
	ConsumeStepUp(ctx context.Context, scope string) error
}

type stepUpCtxKey struct{}

// stepUpState is the step-up side of one request: the proof it carries, the
// operation it is for, and the scope a proof was spent on.
type stepUpState struct {
	proof     string
	operation string
	spent     string
}

// WithStepUp records the proof a request carries (may be empty) and its
// operation, "METHOD path". httpapi.Authenticate calls it for every
// authenticated console request.
func WithStepUp(ctx context.Context, proof, operation string) context.Context {
	return context.WithValue(ctx, stepUpCtxKey{}, &stepUpState{proof: proof, operation: operation})
}

// StepUpRequest returns the request's proof and operation; ok is false
// outside an authenticated console request.
func StepUpRequest(ctx context.Context) (proof, operation string, ok bool) {
	st, ok := ctx.Value(stepUpCtxKey{}).(*stepUpState)
	if !ok {
		return "", "", false
	}
	return st.proof, st.operation, true
}

// StepUpSpent returns the scope the request spent its proof on, "" if none.
func StepUpSpent(ctx context.Context) string {
	if st, ok := ctx.Value(stepUpCtxKey{}).(*stepUpState); ok {
		return st.spent
	}
	return ""
}

// MarkStepUpSpent records that the request spent its proof on scope.
func MarkStepUpSpent(ctx context.Context, scope string) {
	if st, ok := ctx.Value(stepUpCtxKey{}).(*stepUpState); ok {
		st.spent = scope
	}
}

type sessionCtxKey struct{}

// WithSession records the login session (refresh token family) a console
// JWT belongs to.
func WithSession(ctx context.Context, family string) context.Context {
	return context.WithValue(ctx, sessionCtxKey{}, family)
}

// Session returns the request's login session, "" for an access key or a
// token from before sessions had ids.
func Session(ctx context.Context) string {
	s, _ := ctx.Value(sessionCtxKey{}).(string)
	return s
}

// SessionVerifier is optionally implemented by a TokenVerifier: it also
// tells the login session of the token.
type SessionVerifier interface {
	VerifySession(ctx context.Context, token string) (userID int64, session string, err error)
}
