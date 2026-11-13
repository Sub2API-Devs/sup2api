package core

import (
	"context"
	"net/http"
	"time"
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

// ErrVerificationExpired: a request continuing a step-up session
// (StepUpSessions) whose session is unknown, idle for StepUpSessionIdle,
// or opened by another user, login session or access key. The operation
// starts again, with a new proof.
var ErrVerificationExpired = NewError(http.StatusForbidden, "verification_expired", "this verified operation has expired or belongs to another session; start it again")

// StepUpSessionIdle is how long a step-up session stays open after its last
// request: the ccgateway controller drops an upload untouched for an hour.
const StepUpSessionIdle = time.Hour

// StepUpSessions lets one proof cover an operation made of several requests
// (a ccgateway image upload: creation, chunks, load). The request that spent
// the proof opens a session; the requests that continue it name the session
// and need no proof of their own. iam implements it next to
// StepUpVerifier.
type StepUpSessions interface {
	// OpenStepUpSession binds session, a name unique to the operation, to
	// the request's user and its login session or access key under scope.
	// Only a request that spent a proof on scope calls it
	// (httpapi.OpenStepUpSession).
	OpenStepUpSession(ctx context.Context, scope, session string) error
	// ContinueStepUpSession passes a request of the same user, login
	// session or access key on a session opened under scope, and keeps it
	// open for StepUpSessionIdle from now; otherwise it fails with
	// ErrVerificationExpired.
	ContinueStepUpSession(ctx context.Context, scope, session string) error
}

type stepUpCtxKey struct{}

// stepUpState is the step-up side of one request: the proof it carries, the
// operation it is for, and the scope a proof was spent on.
type stepUpState struct {
	proof     string
	operation string
	spent     string
	// password: the spent proof was issued with the password checked.
	password bool
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

// MarkStepUpSpent records that the request spent its proof on scope, and
// whether that proof was issued with the password checked.
func MarkStepUpSpent(ctx context.Context, scope string, password bool) {
	if st, ok := ctx.Value(stepUpCtxKey{}).(*stepUpState); ok {
		st.spent, st.password = scope, password
	}
}

// StepUpPassword reports whether the proof the request spent was issued
// with the password checked.
func StepUpPassword(ctx context.Context) bool {
	st, ok := ctx.Value(stepUpCtxKey{}).(*stepUpState)
	return ok && st.password
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
