package iam

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-webauthn/webauthn/protocol/webauthncbor"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/hotp"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
)

func setupAdmin(t *testing.T) *env {
	t.Helper()
	e := setup(t)
	if err := e.svc.Bootstrap(context.Background()); err != nil {
		t.Fatal(err)
	}
	return e
}

func codeAt(t *testing.T, secret string, at time.Time) string {
	t.Helper()
	code, err := hotp.GenerateCodeCustom(secret, uint64(at.Unix()/totpPeriod), hotp.ValidateOpts{Digits: otp.DigitsSix, Algorithm: otp.AlgorithmSHA1})
	if err != nil {
		t.Fatal(err)
	}
	return code
}

// enableTwoFactor returns the secret and the backup codes.
func enableTwoFactor(t *testing.T, s *Service, userID int64) (string, []string) {
	t.Helper()
	ctx := context.Background()
	setup, err := s.StartTwoFactor(ctx, userID)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(setup.QRCode, "data:image/png;base64,") || !strings.Contains(setup.OTPAuthURL, setup.Secret) {
		t.Fatalf("setup = %+v", setup)
	}
	codes, err := s.EnableTwoFactor(ctx, userID, setup.FlowToken, codeAt(t, setup.Secret, time.Now()))
	if err != nil {
		t.Fatal(err)
	}
	if len(codes) != backupCodeCount {
		t.Fatalf("codes = %v", codes)
	}
	return setup.Secret, codes
}

// lastStepTime is a time inside the last TOTP step the user consumed.
func lastStepTime(t *testing.T, s *Service, userID int64) time.Time {
	t.Helper()
	var step int64
	if err := s.db.Pool.QueryRow(context.Background(), `SELECT last_step FROM user_totp WHERE user_id = $1`, userID).Scan(&step); err != nil {
		t.Fatal(err)
	}
	return time.Unix(step*totpPeriod, 0)
}

func clearLastStep(t *testing.T, s *Service, userID int64) {
	t.Helper()
	if _, err := s.db.Pool.Exec(context.Background(), `UPDATE user_totp SET last_step = 0 WHERE user_id = $1`, userID); err != nil {
		t.Fatal(err)
	}
}

func TestTwoFactorEnrolmentNeedsACode(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	id := mustLogin(t, s, adminEmail, adminPassword).User.ID
	setupOut, err := s.StartTwoFactor(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.EnableTwoFactor(ctx, id, setupOut.FlowToken, "000000"); !isBadSecondFactor(err) {
		t.Fatalf("wrong code: %v", err)
	}
	if st, _ := s.TwoFactor(ctx, id); st.Enabled {
		t.Fatal("enabled by a wrong code")
	}
	// A wrong code keeps the flow; a flow of another user is not usable.
	if _, err := s.EnableTwoFactor(ctx, id+1, setupOut.FlowToken, codeAt(t, setupOut.Secret, time.Now())); err == nil {
		t.Fatal("another user used the flow")
	}
	codes, err := s.EnableTwoFactor(ctx, id, setupOut.FlowToken, codeAt(t, setupOut.Secret, time.Now()))
	if err != nil || len(codes) != backupCodeCount {
		t.Fatalf("enable: %v %v", codes, err)
	}
	st, err := s.TwoFactor(ctx, id)
	if err != nil || !st.Enabled || st.BackupCodesLeft != backupCodeCount {
		t.Fatalf("status = %+v, %v", st, err)
	}
	var sealed []byte
	if err := s.db.Pool.QueryRow(ctx, `SELECT secret_enc FROM user_totp WHERE user_id = $1`, id).Scan(&sealed); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(sealed), setupOut.Secret) {
		t.Fatal("the secret is stored in the clear")
	}
	if _, err := s.StartTwoFactor(ctx, id); !isCode(err, "conflict") {
		t.Fatalf("second setup: %v", err)
	}
}

func TestLoginAsksForTheSecondFactor(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	id := mustLogin(t, s, adminEmail, adminPassword).User.ID
	secret, backup := enableTwoFactor(t, s, id)

	step := mustLogin(t, s, adminEmail, adminPassword)
	if !step.TwoFactorRequired || step.AccessToken != "" || step.RefreshToken != "" || step.User != nil || step.FlowToken == "" {
		t.Fatalf("password step gave %+v", step)
	}
	if _, err := s.LoginSecondFactor(ctx, step.FlowToken, "000000", testIP); !isBadSecondFactor(err) {
		t.Fatalf("wrong code: %v", err)
	}
	// The code that enabled the factor was consumed: it does not log in. It is
	// the code of the stored step, not of time.Now(), which may be past it.
	if _, err := s.LoginSecondFactor(ctx, step.FlowToken, codeAt(t, secret, lastStepTime(t, s, id)), testIP); !isBadSecondFactor(err) {
		t.Fatalf("replayed code: %v", err)
	}
	clearLastStep(t, s, id)
	pair, err := s.LoginSecondFactor(ctx, step.FlowToken, codeAt(t, secret, time.Now()), testIP)
	if err != nil || pair.AccessToken == "" {
		t.Fatalf("code: %+v %v", pair, err)
	}
	if uid, err := s.VerifyAccessToken(ctx, pair.AccessToken); err != nil || uid != id {
		t.Fatalf("verify: %d %v", uid, err)
	}
	if _, err := s.LoginSecondFactor(ctx, step.FlowToken, codeAt(t, secret, time.Now()), testIP); !isCode(err, "invalid_argument") || isBadSecondFactor(err) {
		t.Fatalf("flow reused: %v", err)
	}

	// A backup code works once, typed in any form.
	step = mustLogin(t, s, adminEmail, adminPassword)
	if _, err := s.LoginSecondFactor(ctx, step.FlowToken, strings.ToLower(strings.ReplaceAll(backup[0], "-", "")), testIP); err != nil {
		t.Fatalf("backup code: %v", err)
	}
	step = mustLogin(t, s, adminEmail, adminPassword)
	if _, err := s.LoginSecondFactor(ctx, step.FlowToken, backup[0], testIP); !isBadSecondFactor(err) {
		t.Fatalf("backup code reused: %v", err)
	}
	if st, _ := s.TwoFactor(ctx, id); st.BackupCodesLeft != backupCodeCount-1 {
		t.Fatalf("left = %d", st.BackupCodesLeft)
	}
}

func TestSecondFactorLocksAfterFiveWrongCodes(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	id := mustLogin(t, s, adminEmail, adminPassword).User.ID
	secret, _ := enableTwoFactor(t, s, id)
	clearLastStep(t, s, id)
	step := mustLogin(t, s, adminEmail, adminPassword)
	for i := range totpMaxFailures {
		// A new address each time, so this measures the account's lock, not the
		// per-address login limit.
		ip := "192.0.2." + string(rune('a'+i))
		if _, err := s.LoginSecondFactor(ctx, step.FlowToken, "000000", ip); !isBadSecondFactor(err) {
			t.Fatalf("attempt %d: %v", i, err)
		}
	}
	if _, err := s.LoginSecondFactor(ctx, step.FlowToken, codeAt(t, secret, time.Now()), "192.0.2.200"); !isCode(err, "rate_limited") {
		t.Fatalf("locked: %v", err)
	}
}

func TestPasswordChangeEndsAPendingSecondStep(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	id := mustLogin(t, s, adminEmail, adminPassword).User.ID
	secret, _ := enableTwoFactor(t, s, id)
	clearLastStep(t, s, id)
	step := mustLogin(t, s, adminEmail, adminPassword)
	if err := s.ChangePassword(ctx, id, "", "another-password-1"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.LoginSecondFactor(ctx, step.FlowToken, codeAt(t, secret, time.Now()), testIP); err == nil {
		t.Fatal("the old password's step still logs in")
	}
}

func TestDisableTwoFactor(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	id := mustLogin(t, s, adminEmail, adminPassword).User.ID
	if err := s.DisableTwoFactor(ctx, id); !isCode(err, "conflict") {
		t.Fatalf("disable without two-factor: %v", err)
	}
	enableTwoFactor(t, s, id)
	if err := s.DisableTwoFactor(ctx, id); err != nil {
		t.Fatal(err)
	}
	if p := mustLogin(t, s, adminEmail, adminPassword); p.TwoFactorRequired {
		t.Fatal("still asked for a code")
	}
}

func TestOperatorResetProtectsSuperusers(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	root := mustLogin(t, s, adminEmail, adminPassword).User.ID
	enableTwoFactor(t, s, root)
	staff, err := s.CreateUser(ctx, root, CreateUserInput{Email: "staff@example.com", DisplayName: "Staff", Password: "staff-password-1"})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.ResetSecurity(ctx, staff.ID, root); err == nil {
		t.Fatal("a non-superuser reset a superuser")
	}
	if st, _ := s.TwoFactor(ctx, root); !st.Enabled {
		t.Fatal("the refused reset removed the factor")
	}
	// Over HTTP the route verifies the caller (step-up user.security.reset).
	if err := s.ResetSecurity(ctx, root, root); err != nil {
		t.Fatal(err)
	}
	if st, _ := s.TwoFactor(ctx, root); st.Enabled {
		t.Fatal("still enabled after the reset")
	}
}

// SEC-H3: a user changing their own password or email through the operator
// route spends a step-up proof of that scope, as on /me/password; an
// operator changing someone else's password spends a user.password.reset one.
func TestSelfUpdateRequiresConfirmation(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	root := mustLogin(t, s, adminEmail, adminPassword).User.ID
	newPassword, email, name := "root-password-2", "root2@example.com", "Root"
	if _, err := s.UpdateUser(noProof(ctx, root), root, root, UpdateUserInput{Password: &newPassword}); !isVerificationRequired(err) {
		t.Fatalf("own password without a proof: %v", err)
	}
	// A proof of another scope does not do.
	if _, err := s.UpdateUser(withProof(t, s, ctx, root, core.StepUpSelfEmail), root, root, UpdateUserInput{Password: &newPassword}); !isVerificationRequired(err) {
		t.Fatalf("own password with an email proof: %v", err)
	}
	if _, err := s.Login(ctx, adminEmail, newPassword, testIP); err == nil {
		t.Fatal("the refused change took effect")
	}
	if _, err := s.UpdateUser(noProof(ctx, root), root, root, UpdateUserInput{Email: &email}); !isVerificationRequired(err) {
		t.Fatalf("own email without a proof: %v", err)
	}
	if _, err := s.UpdateUser(noProof(ctx, root), root, root, UpdateUserInput{DisplayName: &name}); err != nil {
		t.Fatalf("own display name needs no proof: %v", err)
	}
	if _, err := s.UpdateUser(withProof(t, s, ctx, root, core.StepUpSelfPassword), root, root, UpdateUserInput{Password: &newPassword}); err != nil {
		t.Fatal(err)
	}
	mustLogin(t, s, adminEmail, newPassword)
	if _, err := s.UpdateUser(withProof(t, s, ctx, root, core.StepUpSelfEmail), root, root, UpdateUserInput{Email: &email}); err != nil {
		t.Fatal(err)
	}
	mustLogin(t, s, email, newPassword)

	// An operator resetting someone else's password spends its own proof.
	staff, err := s.CreateUser(ctx, root, CreateUserInput{Email: "staff2@example.com", Password: "staff-password-1"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.UpdateUser(noProof(ctx, root), root, staff.ID, UpdateUserInput{Password: &newPassword}); !isVerificationRequired(err) {
		t.Fatalf("operator reset without a proof: %v", err)
	}
	if _, err := s.UpdateUser(withProof(t, s, ctx, root, core.StepUpUserPasswordReset), root, staff.ID, UpdateUserInput{Password: &newPassword}); err != nil {
		t.Fatalf("operator reset: %v", err)
	}
}

// SEC-H1: setting someone else's password needs user:password:reset, even
// for an editor who may otherwise update the target.
func TestOthersPasswordNeedsReset(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	root := mustLogin(t, s, adminEmail, adminPassword).User.ID
	roles, err := e.authz.ListRoles(ctx)
	if err != nil {
		t.Fatal(err)
	}
	i := slices.IndexFunc(roles, func(r *authz.Role) bool { return r.Key == authz.RoleOperator })
	keys := slices.DeleteFunc(slices.Clone(roles[i].PermissionKeys), func(k string) bool { return k == "user:password:reset" })
	if _, err := e.authz.CreateRole(ctx, root, authz.CreateRoleInput{Key: "editor", Name: core.LocalizedText{"en": "Editor"}, PermissionKeys: keys}); err != nil {
		t.Fatal(err)
	}
	editor, err := s.CreateUser(ctx, root, CreateUserInput{Email: "editor@example.com", Password: "editor-password-1", RoleKeys: []string{"editor"}})
	if err != nil {
		t.Fatal(err)
	}
	plain, err := s.CreateUser(ctx, root, CreateUserInput{Email: "plain@example.com", Password: "plain-password-1"})
	if err != nil {
		t.Fatal(err)
	}
	name, pw := "renamed", "taken-over-1"
	if _, err := s.UpdateUser(ctx, editor.ID, plain.ID, UpdateUserInput{DisplayName: &name}); err != nil {
		t.Fatalf("editor update: %v", err)
	}
	_, err = s.UpdateUser(ctx, editor.ID, plain.ID, UpdateUserInput{Password: &pw})
	var ce *core.Error
	if !errors.As(err, &ce) || ce.Code != "permission_denied" || ce.Details["permission"] != "user:password:reset" {
		t.Fatalf("editor set a password: %v", err)
	}
}

// SEC-H2: a disabled user is measured by what its roles grant, so a lesser
// operator can neither set the password of a disabled admin nor re-enable
// it, which would otherwise hand them the admin's permissions.
func TestDisabledAdminStaysOutOfReach(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	root := mustLogin(t, s, adminEmail, adminPassword).User.ID
	admin, err := s.CreateUser(ctx, root, CreateUserInput{Email: "admin2@example.com", Password: "admin-password-1", RoleKeys: []string{authz.RoleAdmin}})
	if err != nil {
		t.Fatal(err)
	}
	operator, err := s.CreateUser(ctx, root, CreateUserInput{Email: "operator@example.com", Password: "operator-password-1", RoleKeys: []string{authz.RoleOperator}})
	if err != nil {
		t.Fatal(err)
	}
	pw := "taken-over-1"
	if _, err := s.UpdateUser(ctx, operator.ID, admin.ID, UpdateUserInput{Password: &pw}); !isCode(err, "permission_denied") {
		t.Fatalf("operator set an active admin's password: %v", err)
	}
	disabled, active := StatusDisabled, StatusActive
	if _, err := s.UpdateUser(ctx, root, admin.ID, UpdateUserInput{Status: &disabled}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.UpdateUser(ctx, operator.ID, admin.ID, UpdateUserInput{Password: &pw}); !isCode(err, "permission_denied") {
		t.Fatalf("operator set a disabled admin's password: %v", err)
	}
	if _, err := s.UpdateUser(ctx, operator.ID, admin.ID, UpdateUserInput{Status: &active}); !isCode(err, "permission_denied") {
		t.Fatalf("operator re-enabled a disabled admin: %v", err)
	}
	if err := s.ResetSecurity(ctx, operator.ID, admin.ID); !isCode(err, "permission_denied") {
		t.Fatalf("operator reset a disabled admin's factors: %v", err)
	}
	if err := s.DeleteUser(ctx, operator.ID, admin.ID); !isCode(err, "permission_denied") {
		t.Fatalf("operator deleted a disabled admin: %v", err)
	}
	if _, err := s.Login(ctx, "admin2@example.com", pw, testIP); err == nil {
		t.Fatal("the disabled admin was taken over")
	}
	// The superuser, who outranks the admin, still can.
	if _, err := s.UpdateUser(ctx, root, admin.ID, UpdateUserInput{Status: &active}); err != nil {
		t.Fatal(err)
	}
}

// Peer protection (T56) reaches every entry acting on a user: an admin
// cannot change, reset or delete another admin, nor an operator another
// operator; users below them are unaffected.
// FU6: whom a caller acts on is the roles it manages, itself included. An
// admin or operator does not manage itself: changing its own account goes
// through /me; the super admin manages itself too. Disabling or deleting
// oneself stays refused for everyone (a safety rule, not a permission).
func TestManagedUsersIncludeOneself(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	root := mustLogin(t, s, adminEmail, adminPassword).User.ID
	mk := func(email string, roles ...string) int64 {
		t.Helper()
		u, err := s.CreateUser(ctx, root, CreateUserInput{Email: email, Password: "self-password-1", RoleKeys: roles})
		if err != nil {
			t.Fatal(err)
		}
		return u.ID
	}
	admin := mk("admin@example.com", authz.RoleUser, authz.RoleAdmin)
	op := mk("op@example.com", authz.RoleUser, authz.RoleOperator)
	supplier := mk("supplier@example.com", authz.RoleUser, authz.RoleSupplier)
	name, pw := "renamed", "self-password-2"
	notManageable := func(err error) bool {
		return isCode(err, "permission_denied") && core.AsError(err).Details["reason"] == "not_manageable"
	}
	for _, actor := range []int64{admin, op} {
		if _, err := s.UpdateUser(ctx, actor, actor, UpdateUserInput{DisplayName: &name}); !notManageable(err) {
			t.Errorf("user %d renames itself through /users/:id: %v", actor, err)
		}
		if _, err := s.UpdateUser(withProof(t, s, ctx, actor, core.StepUpSelfPassword), actor, actor, UpdateUserInput{Password: &pw}); !notManageable(err) {
			t.Errorf("user %d sets its password through /users/:id: %v", actor, err)
		}
		if err := s.ResetSecurity(ctx, actor, actor); !notManageable(err) {
			t.Errorf("user %d resets its own security: %v", actor, err)
		}
		if _, err := s.SetUserRoles(ctx, actor, actor, []string{authz.RoleUser, authz.RoleSupplier}); !isCode(err, "permission_denied") {
			t.Errorf("user %d assigns itself a role: %v", actor, err)
		}
	}
	// The operator manages suppliers and users.
	if _, err := s.UpdateUser(ctx, op, supplier, UpdateUserInput{DisplayName: &name}); err != nil {
		t.Fatalf("operator renames a supplier: %v", err)
	}
	// The super admin manages itself.
	if _, err := s.UpdateUser(ctx, root, root, UpdateUserInput{DisplayName: &name}); err != nil {
		t.Fatalf("super admin renames itself: %v", err)
	}
	// Nobody disables or deletes itself, the super admin included.
	disabled := StatusDisabled
	if _, err := s.UpdateUser(ctx, root, root, UpdateUserInput{Status: &disabled}); !errors.Is(err, errSelfDisable) {
		t.Fatalf("super admin disables itself: %v", err)
	}
	if err := s.DeleteUser(ctx, root, root); !errors.Is(err, errSelfDisable) {
		t.Fatalf("super admin deletes itself: %v", err)
	}
}

func TestPeersCannotActOnEachOther(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	root := mustLogin(t, s, adminEmail, adminPassword).User.ID
	mk := func(email string, roles ...string) int64 {
		t.Helper()
		u, err := s.CreateUser(ctx, root, CreateUserInput{Email: email, Password: "peer-password-1", RoleKeys: roles})
		if err != nil {
			t.Fatal(err)
		}
		return u.ID
	}
	admin, admin2 := mk("admin1@example.com", authz.RoleUser, authz.RoleAdmin), mk("admin2@example.com", authz.RoleUser, authz.RoleAdmin)
	op, op2 := mk("op1@example.com", authz.RoleUser, authz.RoleOperator), mk("op2@example.com", authz.RoleUser, authz.RoleOperator)
	plain := mk("plain@example.com", authz.RoleUser)

	name, pw := "renamed", "taken-over-1"
	// roles drops the default role from the target, which every actor here
	// may revoke, so only the target check can refuse it.
	acts := func(actor, target int64, roles ...string) map[string]error {
		out := map[string]error{}
		_, out["rename"] = s.UpdateUser(ctx, actor, target, UpdateUserInput{DisplayName: &name})
		_, out["password"] = s.UpdateUser(withProof(t, s, ctx, actor, core.StepUpUserPasswordReset), actor, target, UpdateUserInput{Password: &pw})
		out["reset security"] = s.ResetSecurity(ctx, actor, target)
		_, out["roles"] = s.SetUserRoles(ctx, actor, target, roles)
		out["delete"] = s.DeleteUser(ctx, actor, target)
		return out
	}
	for _, peer := range []struct {
		actor, target int64
		role          string
	}{{admin, admin2, authz.RoleAdmin}, {op, op2, authz.RoleOperator}} {
		for act, err := range acts(peer.actor, peer.target, peer.role) {
			if !isCode(err, "permission_denied") || core.AsError(err).Details["role"] != peer.role {
				t.Errorf("user %d may %s its peer %d: %v", peer.actor, act, peer.target, err)
			}
		}
	}
	// Below them: the admin acts on the operator and on a user as before
	// (the operator has no user:password:reset or user:delete by default).
	if _, err := s.UpdateUser(ctx, op, plain, UpdateUserInput{DisplayName: &name}); err != nil {
		t.Fatalf("operator renames a user: %v", err)
	}
	for target, roles := range map[int64][]string{op2: {authz.RoleOperator}, plain: {authz.RoleUser, authz.RoleOperator}} {
		for act, err := range acts(admin, target, roles...) {
			if err != nil {
				t.Errorf("admin may not %s user %d: %v", act, target, err)
			}
		}
	}
	// The super admin is unaffected.
	if _, err := s.UpdateUser(ctx, root, admin2, UpdateUserInput{DisplayName: &name}); err != nil {
		t.Fatalf("super admin renames an admin: %v", err)
	}
}

func TestLoginSessions(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	first := mustLogin(t, s, adminEmail, adminPassword)
	second := mustLogin(t, s, adminEmail, adminPassword)
	id := first.User.ID
	list, err := s.Sessions(ctx, id, "")
	if err != nil || len(list) != 2 {
		t.Fatalf("sessions = %v, %v", list, err)
	}
	// The refresh keeps the session: same family, still two.
	if _, err := s.Refresh(ctx, second.RefreshToken); err != nil {
		t.Fatal(err)
	}
	if list, _ = s.Sessions(ctx, id, ""); len(list) != 2 {
		t.Fatalf("after refresh: %v", list)
	}
	if err := s.RevokeSession(ctx, id+1000, list[0].ID); err == nil {
		t.Fatal("revoked another user's session")
	}
	keep, other := list[0].ID, list[1].ID
	if err := s.RevokeOtherSessions(ctx, id, keep); err != nil {
		t.Fatal(err)
	}
	if list, _ = s.Sessions(ctx, id, keep); len(list) != 1 || list[0].ID != keep || !list[0].Current {
		t.Fatalf("after revoke others: %+v", list)
	}
	if err := s.RevokeSession(ctx, id, other); !isCode(err, "not_found") {
		t.Fatalf("already revoked: %v", err)
	}
	// The revoked session cannot refresh.
	if _, err := s.Refresh(ctx, first.RefreshToken); err == nil {
		if _, err2 := s.Refresh(ctx, second.RefreshToken); err2 == nil {
			t.Fatal("both sessions still refresh")
		}
	}
}

// ------------------------------------------------------------ passkeys

// authenticator is a software passkey: ES256, "none" attestation, always
// verifying the user, the way a browser and a platform authenticator answer.
type authenticator struct {
	t      *testing.T
	key    *ecdsa.PrivateKey
	credID []byte
	handle []byte
	rpID   string
	origin string
	count  uint32
}

func newAuthenticator(t *testing.T, origin, rpID string) *authenticator {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	id := make([]byte, 32)
	if _, err := rand.Read(id); err != nil {
		t.Fatal(err)
	}
	return &authenticator{t: t, key: key, credID: id, origin: origin, rpID: rpID}
}

var b64 = base64.RawURLEncoding

func (a *authenticator) clientData(kind, challenge string) []byte {
	raw, err := json.Marshal(map[string]any{"type": kind, "challenge": challenge, "origin": a.origin, "crossOrigin": false})
	if err != nil {
		a.t.Fatal(err)
	}
	return raw
}

func (a *authenticator) authData(attested []byte) []byte {
	rp := sha256.Sum256([]byte(a.rpID))
	flags := byte(0x01 | 0x04) // user present, user verified
	if attested != nil {
		flags |= 0x40
	}
	out := append([]byte{}, rp[:]...)
	out = append(out, flags)
	out = binary.BigEndian.AppendUint32(out, a.count)
	return append(out, attested...)
}

func (a *authenticator) create(t *testing.T, ceremony *PasskeyCeremony) json.RawMessage {
	t.Helper()
	var opts struct {
		PublicKey struct {
			Challenge string `json:"challenge"`
			RP        struct {
				ID string `json:"id"`
			} `json:"rp"`
			User struct {
				ID string `json:"id"`
			} `json:"user"`
		} `json:"publicKey"`
	}
	roundTrip(t, ceremony.Options, &opts)
	if opts.PublicKey.RP.ID != a.rpID {
		t.Fatalf("rp id = %q, want %q", opts.PublicKey.RP.ID, a.rpID)
	}
	handle, err := b64.DecodeString(opts.PublicKey.User.ID)
	if err != nil {
		t.Fatal(err)
	}
	a.handle = handle
	cose, err := webauthncbor.Marshal(map[int]any{1: 2, 3: -7, -1: 1, -2: a.key.X.FillBytes(make([]byte, 32)), -3: a.key.Y.FillBytes(make([]byte, 32))})
	if err != nil {
		t.Fatal(err)
	}
	attested := append(make([]byte, 16), byte(len(a.credID)>>8), byte(len(a.credID)))
	attested = append(append(attested, a.credID...), cose...)
	object, err := webauthncbor.Marshal(map[string]any{"fmt": "none", "attStmt": map[string]any{}, "authData": a.authData(attested)})
	if err != nil {
		t.Fatal(err)
	}
	out, err := json.Marshal(map[string]any{
		"id": b64.EncodeToString(a.credID), "rawId": b64.EncodeToString(a.credID), "type": "public-key",
		"response": map[string]any{
			"clientDataJSON":    b64.EncodeToString(a.clientData("webauthn.create", opts.PublicKey.Challenge)),
			"attestationObject": b64.EncodeToString(object),
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	return out
}

func (a *authenticator) get(t *testing.T, ceremony *PasskeyCeremony) json.RawMessage {
	t.Helper()
	var opts struct {
		PublicKey struct {
			Challenge string `json:"challenge"`
		} `json:"publicKey"`
	}
	roundTrip(t, ceremony.Options, &opts)
	a.count++
	data := a.authData(nil)
	client := a.clientData("webauthn.get", opts.PublicKey.Challenge)
	hash := sha256.Sum256(client)
	digest := sha256.Sum256(append(append([]byte{}, data...), hash[:]...))
	sig, err := ecdsa.SignASN1(rand.Reader, a.key, digest[:])
	if err != nil {
		t.Fatal(err)
	}
	out, err := json.Marshal(map[string]any{
		"id": b64.EncodeToString(a.credID), "rawId": b64.EncodeToString(a.credID), "type": "public-key",
		"response": map[string]any{
			"clientDataJSON":    b64.EncodeToString(client),
			"authenticatorData": b64.EncodeToString(data),
			"signature":         b64.EncodeToString(sig),
			"userHandle":        b64.EncodeToString(a.handle),
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	return out
}

func roundTrip(t *testing.T, in, out any) {
	t.Helper()
	raw, err := json.Marshal(in)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, out); err != nil {
		t.Fatal(err)
	}
}

func consoleRequest(origin, host string) *http.Request {
	r, _ := http.NewRequest(http.MethodPost, "http://"+host+"/api/v1/auth/passkey/begin", nil)
	r.Host = host
	r.Header.Set("Origin", origin)
	return r
}

const consoleOrigin, consoleHost = "https://console.example.com", "console.example.com"

func addPasskey(t *testing.T, s *Service, a *authenticator, userID int64) *Passkey {
	t.Helper()
	ctx, r := context.Background(), consoleRequest(consoleOrigin, consoleHost)
	begin, err := s.BeginPasskeyRegistration(ctx, r, userID)
	if err != nil {
		t.Fatal(err)
	}
	p, err := s.FinishPasskeyRegistration(ctx, r, userID, begin.FlowToken, "My laptop", a.create(t, begin))
	if err != nil {
		t.Fatal(err)
	}
	return p
}

func TestPasskeyRegistrationAndLogin(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	id := mustLogin(t, s, adminEmail, adminPassword).User.ID
	r := consoleRequest(consoleOrigin, consoleHost)
	a := newAuthenticator(t, consoleOrigin, consoleHost)
	p := addPasskey(t, s, a, id)
	if p.Name != "My laptop" || p.RPID != consoleHost {
		t.Fatalf("passkey = %+v", p)
	}

	// Two-factor does not get in the way of a passkey login.
	enableTwoFactor(t, s, id)
	begin, err := s.BeginPasskeyLogin(ctx, r, testIP)
	if err != nil {
		t.Fatal(err)
	}
	credential := a.get(t, begin)
	pair, err := s.FinishPasskeyLogin(ctx, r, begin.FlowToken, credential, testIP)
	if err != nil {
		t.Fatal(err)
	}
	if uid, err := s.VerifyAccessToken(ctx, pair.AccessToken); err != nil || uid != id {
		t.Fatalf("verify: %d %v", uid, err)
	}
	list, _ := s.Passkeys(ctx, id)
	if len(list) != 1 || list[0].LastUsedAt == nil {
		t.Fatalf("list = %+v", list)
	}
	var method string
	if err := s.db.Pool.QueryRow(ctx, `SELECT method FROM login_sessions ORDER BY created_at DESC LIMIT 1`).Scan(&method); err != nil || method != loginMethodPasskey {
		t.Fatalf("method = %q, %v", method, err)
	}

	// The same answer does not work twice: the challenge is single use.
	if _, err := s.FinishPasskeyLogin(ctx, r, begin.FlowToken, credential, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("replay: %v", err)
	}
}

func TestPasskeyLoginRejects(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	id := mustLogin(t, s, adminEmail, adminPassword).User.ID
	a := newAuthenticator(t, consoleOrigin, consoleHost)
	addPasskey(t, s, a, id)
	r := consoleRequest(consoleOrigin, consoleHost)

	t.Run("a phishing origin", func(t *testing.T) {
		begin, err := s.BeginPasskeyLogin(ctx, r, testIP)
		if err != nil {
			t.Fatal(err)
		}
		phished := *a
		phished.origin = "https://console.example.com.evil.test"
		if _, err := s.FinishPasskeyLogin(ctx, r, begin.FlowToken, phished.get(t, begin), testIP); !isCode(err, "unauthenticated") {
			t.Fatalf("got %v", err)
		}
	})
	t.Run("an unknown key", func(t *testing.T) {
		begin, err := s.BeginPasskeyLogin(ctx, r, testIP)
		if err != nil {
			t.Fatal(err)
		}
		stranger := newAuthenticator(t, consoleOrigin, consoleHost)
		stranger.handle = userHandle(id)
		if _, err := s.FinishPasskeyLogin(ctx, r, begin.FlowToken, stranger.get(t, begin), testIP); !isCode(err, "unauthenticated") {
			t.Fatalf("got %v", err)
		}
	})
	t.Run("a registered key signing with another private key", func(t *testing.T) {
		begin, err := s.BeginPasskeyLogin(ctx, r, testIP)
		if err != nil {
			t.Fatal(err)
		}
		forged := newAuthenticator(t, consoleOrigin, consoleHost)
		forged.credID, forged.handle = a.credID, a.handle
		if _, err := s.FinishPasskeyLogin(ctx, r, begin.FlowToken, forged.get(t, begin), testIP); !isCode(err, "unauthenticated") {
			t.Fatalf("got %v", err)
		}
	})
	t.Run("a disabled user", func(t *testing.T) {
		if _, err := s.db.Pool.Exec(ctx, `UPDATE users SET status = 'disabled' WHERE id = $1`, id); err != nil {
			t.Fatal(err)
		}
		defer func() {
			if _, err := s.db.Pool.Exec(ctx, `UPDATE users SET status = 'active' WHERE id = $1`, id); err != nil {
				t.Fatal(err)
			}
		}()
		begin, err := s.BeginPasskeyLogin(ctx, r, testIP)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := s.FinishPasskeyLogin(ctx, r, begin.FlowToken, a.get(t, begin), testIP); !isCode(err, "unauthenticated") {
			t.Fatalf("got %v", err)
		}
	})
	t.Run("an address that is not the request's host", func(t *testing.T) {
		if _, err := s.BeginPasskeyLogin(ctx, consoleRequest("https://evil.test", consoleHost), testIP); !isCode(err, "invalid_argument") {
			t.Fatalf("got %v", err)
		}
		if _, err := s.BeginPasskeyLogin(ctx, consoleRequest("http://192.0.2.1:3130", "192.0.2.1:3130"), testIP); !isCode(err, "invalid_argument") {
			t.Fatalf("an IP address: %v", err)
		}
	})
	t.Run("a deleted passkey", func(t *testing.T) {
		list, _ := s.Passkeys(ctx, id)
		if err := s.DeletePasskey(ctx, id+1000, list[0].ID); !isCode(err, "not_found") {
			t.Fatalf("another user's: %v", err)
		}
		if err := s.DeletePasskey(ctx, id, list[0].ID); err != nil {
			t.Fatal(err)
		}
		begin, err := s.BeginPasskeyLogin(ctx, r, testIP)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := s.FinishPasskeyLogin(ctx, r, begin.FlowToken, a.get(t, begin), testIP); !isCode(err, "unauthenticated") {
			t.Fatalf("got %v", err)
		}
	})
}

func TestPasskeyParentDomain(t *testing.T) {
	e := setupAdmin(t)
	e.cfg.WebAuthnRPID = "example.com"
	s, ctx := e.svc, context.Background()
	id := mustLogin(t, s, adminEmail, adminPassword).User.ID
	a := newAuthenticator(t, consoleOrigin, "example.com")
	addPasskey(t, s, a, id)
	r := consoleRequest(consoleOrigin, consoleHost)
	begin, err := s.BeginPasskeyLogin(ctx, r, testIP)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.FinishPasskeyLogin(ctx, r, begin.FlowToken, a.get(t, begin), testIP); err != nil {
		t.Fatal(err)
	}
	if _, err := s.BeginPasskeyLogin(ctx, consoleRequest("https://notexample.com", "notexample.com"), testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("a look-alike domain: %v", err)
	}
	// A proxy that rewrites Host, as the failover path does, changes nothing.
	begin, err = s.BeginPasskeyLogin(ctx, consoleRequest(consoleOrigin, "backup.internal"), testIP)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.FinishPasskeyLogin(ctx, consoleRequest(consoleOrigin, "backup.internal"), begin.FlowToken, a.get(t, begin), testIP); err != nil {
		t.Fatal(err)
	}
}

func TestPasskeyBeginIsRateLimited(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	r := consoleRequest(consoleOrigin, consoleHost)
	for i := range passkeyBeginMax {
		if _, err := s.BeginPasskeyLogin(ctx, r, testIP); err != nil {
			t.Fatalf("attempt %d: %v", i, err)
		}
	}
	if _, err := s.BeginPasskeyLogin(ctx, r, testIP); !isCode(err, "rate_limited") {
		t.Fatalf("over the limit: %v", err)
	}
	if _, err := s.BeginPasskeyLogin(ctx, r, "192.0.2.77"); err != nil {
		t.Fatalf("another address: %v", err)
	}
}

// ------------------------------------------------------------ access keys

// keyEnv routes requests through the real router and permission checks, as a
// console client sees them.
type keyEnv struct {
	*env
	s      *Service
	h      *gin.Engine
	r      *httpapi.Router
	userID int64
}

func newKeyEnv(t *testing.T) *keyEnv {
	t.Helper()
	e := setupAdmin(t)
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	r := httpapi.NewRouter(engine, e.svc, e.authz)
	e.svc.RegisterRoutes(r)
	e.authz.RegisterRoutes(r)
	u, err := e.svc.CreateUser(context.Background(), 0, CreateUserInput{Email: "key-user@example.com", DisplayName: "Key", Password: adminPassword})
	if err != nil {
		t.Fatal(err)
	}
	return &keyEnv{env: e, s: e.svc, h: engine, r: r, userID: u.ID}
}

func (k *keyEnv) call(token, method, path string, body any) (int, map[string]any) {
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest(method, "/api/v1"+path, bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	k.h.ServeHTTP(w, req)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

// callProof is call with a step-up proof.
func (k *keyEnv) callProof(token, proof, method, path string, body any) (int, map[string]any) {
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest(method, "/api/v1"+path, bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set(core.HeaderVerifyProof, proof)
	w := httptest.NewRecorder()
	k.h.ServeHTTP(w, req)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

// proof verifies token's caller for scope and the operation "method path"
// (path under /api/v1) with the fields of how, and returns the proof.
func (k *keyEnv) proof(t *testing.T, token, scope, method, path string, how map[string]any) string {
	t.Helper()
	body := map[string]any{"scope": scope, "context": method + " /api/v1" + path}
	maps.Copy(body, how)
	code, out := k.call(token, "POST", "/me/verify", body)
	if code != 200 {
		t.Fatalf("verify %s: %d %v", scope, code, out)
	}
	return out["data"].(map[string]any)["proof"].(string)
}

func (k *keyEnv) createKey(t *testing.T, userID int64, perms ...string) *AccessKey {
	t.Helper()
	key, err := k.s.CreateAccessKey(context.Background(), userID, CreateAccessKeyInput{Name: "ci", Permissions: perms})
	if err != nil {
		t.Fatal(err)
	}
	return key
}

func (k *keyEnv) grantRole(t *testing.T, userID int64, key string, perms ...string) int64 {
	t.Helper()
	ctx := context.Background()
	var id int64
	if err := k.s.db.Pool.QueryRow(ctx, `INSERT INTO roles (key, name) VALUES ($1, '{"en":"x"}') RETURNING id`, key).Scan(&id); err != nil {
		t.Fatal(err)
	}
	for _, p := range perms {
		pat, err := perm.Parse(p)
		if err != nil {
			t.Fatal(err)
		}
		sql := `INSERT INTO role_permissions (role_id, permission_id) SELECT $1, id FROM permissions WHERE key = $2`
		args := []any{id, string(pat.Action)}
		if scope := pat.Suffix(); scope != "" {
			sql = `INSERT INTO role_permission_scopes (role_id, permission_id, scope) SELECT $1, id, $3 FROM permissions WHERE key = $2`
			args = append(args, scope)
		}
		if _, err := k.s.db.Pool.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := k.s.db.Pool.Exec(ctx, `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, userID, id); err != nil {
		t.Fatal(err)
	}
	k.bump(t)
	return id
}

// bump drops the cached permissions, as a change through the role API does.
func (k *keyEnv) bump(t *testing.T) {
	t.Helper()
	ctx := context.Background()
	var v int64
	if err := k.s.db.Pool.QueryRow(ctx, `UPDATE authz_meta SET version = version + 1 WHERE id = 1 RETURNING version`).Scan(&v); err != nil {
		t.Fatal(err)
	}
	k.authz.Committed(ctx, v)
}

func TestAccessKeyIsASubsetOfItsUser(t *testing.T) {
	k := newKeyEnv(t)
	ctx := context.Background()
	k.grantRole(t, k.userID, "reader", "user:read", "role:read")

	// Permissions the user does not hold cannot be chosen, nor unknown ones.
	for _, perms := range [][]string{{"user:delete"}, {"user:read", "user:delete"}, {"nonsense:key"}} {
		_, err := k.s.CreateAccessKey(ctx, k.userID, CreateAccessKeyInput{Name: "x", Permissions: perms})
		if !isCode(err, "permission_denied") {
			t.Fatalf("%v: %v", perms, err)
		}
	}
	if _, err := k.s.CreateAccessKey(ctx, k.userID, CreateAccessKeyInput{Name: "x"}); !isCode(err, "invalid_argument") {
		t.Fatalf("no permissions: %v", err)
	}

	key := k.createKey(t, k.userID, "user:read")
	if !strings.HasPrefix(key.Key, core.AccessKeyPrefix) {
		t.Fatalf("key = %q", key.Key)
	}
	var stored string
	if err := k.s.db.Pool.QueryRow(ctx, `SELECT token_hash FROM user_access_keys WHERE id = $1`, key.ID).Scan(&stored); err != nil {
		t.Fatal(err)
	}
	if stored == key.Key || strings.Contains(stored, key.Key) {
		t.Fatal("the key is stored in the clear")
	}
	list, err := k.s.AccessKeys(ctx, k.userID)
	if err != nil || len(list) != 1 || list[0].Key != "" {
		t.Fatalf("list repeats the secret: %+v, %v", list, err)
	}

	// The key has what it was given; the user's other permission is not in it.
	if code, _ := k.call(key.Key, "GET", "/users", nil); code != 200 {
		t.Fatalf("a granted permission: %d", code)
	}
	if code, _ := k.call(key.Key, "GET", "/permissions", nil); code != 403 {
		t.Fatalf("a permission of the user, not of the key: %d", code)
	}

	// When the user loses a permission, so does the key, at once, and it says so.
	if _, err := k.s.db.Pool.Exec(ctx, `DELETE FROM role_permissions WHERE permission_id = (SELECT id FROM permissions WHERE key = 'user:read')`); err != nil {
		t.Fatal(err)
	}
	k.bump(t)
	if code, _ := k.call(key.Key, "GET", "/users", nil); code != 403 {
		t.Fatalf("a permission the user lost: %d", code)
	}
	if list, _ = k.s.AccessKeys(ctx, k.userID); len(list[0].Lost) != 1 || list[0].Lost[0] != "user:read" {
		t.Fatalf("lost = %v", list[0].Lost)
	}
}

func TestSuperuserKeyIsNotASuperuser(t *testing.T) {
	k := newKeyEnv(t)
	ctx := context.Background()
	login := mustLogin(t, k.s, adminEmail, adminPassword)
	root := login.User.ID
	key := k.createKey(t, root, "user:read", "user:update")
	if code, _ := k.call(key.Key, "GET", "/users", nil); code != 200 {
		t.Fatalf("granted: %d", code)
	}
	// Decision 1: no access key changes the super admin, its own included;
	// the superuser's session still may.
	self := "/users/" + strconv.FormatInt(root, 10)
	if code, out := k.call(key.Key, "PATCH", self, map[string]any{"display_name": "x"}); code != 403 {
		t.Fatalf("key PATCH its superuser: %d %v", code, out)
	}
	if code, out := k.call(login.AccessToken, "PATCH", self, map[string]any{"display_name": "x"}); code != 200 {
		t.Fatalf("session PATCH itself: %d %v", code, out)
	}
	// Its factors no key reaches at all: the route's permission is session
	// only, a superuser's key included.
	code, out := k.call(key.Key, "DELETE", self+"/security", map[string]any{"current_password": adminPassword})
	if e, _ := out["error"].(map[string]any); code != 403 || e["details"].(map[string]any)["permission"] != "user:password:reset" {
		t.Fatalf("key DELETE its superuser's security: %d %v", code, out)
	}
	for _, p := range []struct{ method, path string }{{"GET", "/permissions"}, {"DELETE", "/users/" + strconv.FormatInt(k.userID, 10)}} {
		if code, _ := k.call(key.Key, p.method, p.path, nil); code != 403 {
			t.Fatalf("%s %s: %d", p.method, p.path, code)
		}
	}
	code, me := k.call(key.Key, "GET", "/me", nil)
	data := me["data"].(map[string]any)
	if code != 200 || data["superuser"] != false || len(data["permissions"].([]any)) != 2 {
		t.Fatalf("/me: %d %v", code, me)
	}
	// Grant checks see the key, not the superuser behind it.
	authed := core.WithAccessKey(core.WithUserID(ctx, root), core.AccessKeyIdentity{UserID: root, Permissions: []string{"user:read"}})
	if err := k.authz.CanGrant(authed, root, []string{"user:delete"}); err == nil {
		t.Fatal("a limited key granted a permission it does not have")
	}
	if err := k.authz.CanGrant(ctx, root, []string{"user:delete"}); err != nil {
		t.Fatalf("the superuser itself: %v", err)
	}
	// Questions about another user are not limited by the caller's key.
	other, err := k.authz.PermissionSet(authed, k.userID)
	if err != nil || other.Superuser {
		t.Fatalf("other: %+v, %v", other, err)
	}
}

// H1: a superuser's access key cannot hand out the super admin role, not even
// one with role:assign (a key is never a superuser); nor can
// the superuser's own session, since the role only changes hands by transfer.
func TestSuperuserKeyCannotGrantSuperAdmin(t *testing.T) {
	k := newKeyEnv(t)
	ctx := context.Background()
	login := mustLogin(t, k.s, adminEmail, adminPassword)
	key := k.createKey(t, login.User.ID, "user:create")
	if _, err := k.s.db.Pool.Exec(ctx, `UPDATE user_access_keys SET permissions = array_append(permissions, 'role:assign') WHERE id = $1`, key.ID); err != nil {
		t.Fatal(err)
	}
	// A target without roles, so acting on it needs nothing.
	if _, err := k.s.db.Pool.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1`, k.userID); err != nil {
		t.Fatal(err)
	}
	k.bump(t)
	path := "/users/" + strconv.FormatInt(k.userID, 10) + "/roles"
	grant := map[string]any{"role_keys": []string{authz.RoleSuperAdmin}}
	if code, out := k.call(key.Key, "PUT", path, grant); code != 403 {
		t.Fatalf("key PUT roles: %d %v", code, out)
	}
	create := func(email string) map[string]any {
		return map[string]any{"email": email, "display_name": "x", "password": adminPassword, "role_keys": []string{authz.RoleSuperAdmin}}
	}
	if code, out := k.call(key.Key, "POST", "/users", create("key-super@example.com")); code != 403 {
		t.Fatalf("key POST users: %d %v", code, out)
	}
	if code, out := k.call(login.AccessToken, "PUT", path, grant); code != 403 {
		t.Fatalf("session PUT roles: %d %v", code, out)
	}
	if code, out := k.call(login.AccessToken, "POST", "/users", create("jwt-super@example.com")); code != 403 {
		t.Fatalf("session POST users: %d %v", code, out)
	}
}

// Decision 1: no one but the super admin changes the super admin; an admin,
// in a session or through an access key, misses the superuser flag.
func TestAdminCannotModifySuperAdmin(t *testing.T) {
	k := newKeyEnv(t)
	ctx := context.Background()
	login := mustLogin(t, k.s, adminEmail, adminPassword)
	root := login.User.ID
	makeAdmin := map[string]any{"role_keys": []string{authz.RoleAdmin}}
	if code, out := k.call(login.AccessToken, "PUT", "/users/"+strconv.FormatInt(k.userID, 10)+"/roles", makeAdmin); code != 200 {
		t.Fatalf("make admin: %d %v", code, out)
	}
	session := mustLogin(t, k.s, "key-user@example.com", adminPassword).AccessToken
	key := k.createKey(t, k.userID, "user:update", "user:delete").Key
	target := "/users/" + strconv.FormatInt(root, 10)
	for _, token := range []string{session, key} {
		for _, r := range []struct {
			method, path string
			body         any
		}{
			{"PATCH", target, map[string]any{"display_name": "taken"}},
			{"DELETE", target, nil},
			{"DELETE", target + "/security", nil},
			{"PUT", target + "/roles", map[string]any{"role_keys": []string{authz.RoleUser}}},
		} {
			if code, out := k.call(token, r.method, r.path, r.body); code != 403 {
				t.Fatalf("%s %s: %d %v", r.method, r.path, code, out)
			}
		}
	}
	code, out := k.call(session, "PATCH", target, map[string]any{"display_name": "taken"})
	details, _ := out["error"].(map[string]any)["details"].(map[string]any)
	if code != 403 || details["superuser"] != true {
		t.Fatalf("PATCH denial: %d %v", code, out)
	}
	if u, err := k.s.GetUser(ctx, root); err != nil || !slices.Contains(u.Roles, authz.RoleSuperAdmin) || u.DisplayName == "taken" {
		t.Fatalf("super admin changed: %+v %v", u, err)
	}
}

// role:manage was split: the /roles writes need role:define, assigning roles
// (PUT /users/:id/roles, POST /users with non-default roles) role:assign, and
// holding one grants nothing of the other.
func TestRoleRoutesSplitDefineAndAssign(t *testing.T) {
	k := newKeyEnv(t)
	ctx := context.Background()
	newUser := func(email string) int64 {
		t.Helper()
		u, err := k.s.CreateUser(ctx, 0, CreateUserInput{Email: email, DisplayName: "x", Password: adminPassword})
		if err != nil {
			t.Fatal(err)
		}
		return u.ID
	}
	k.grantRole(t, k.userID, "definer", "role:define", "user:create")
	k.grantRole(t, newUser("assigner@example.com"), "assigner", "role:assign", "user:create")
	target := newUser("target@example.com")
	// The assigner may assign every custom role; the definer none.
	if _, err := k.s.db.Pool.Exec(ctx, `UPDATE roles SET assign_custom = true WHERE key = 'assigner'`); err != nil {
		t.Fatal(err)
	}
	if _, err := k.s.db.Pool.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1`, target); err != nil {
		t.Fatal(err)
	}
	k.bump(t)
	definer := mustLogin(t, k.s, "key-user@example.com", adminPassword).AccessToken
	assigner := mustLogin(t, k.s, "assigner@example.com", adminPassword).AccessToken
	call := func(token, method, path string, body any, want int, perm string) map[string]any {
		t.Helper()
		code, out := k.call(token, method, path, body)
		e, _ := out["error"].(map[string]any)
		details, _ := e["details"].(map[string]any)
		if code != want || (perm != "" && details["permission"] != perm) {
			t.Fatalf("%s %s: %d %v, want %d %s", method, path, code, out, want, perm)
		}
		return out
	}
	created := call(definer, "POST", "/roles", map[string]any{"key": "split_probe", "name": map[string]string{"en": "Probe"}}, 201, "")
	role := "/roles/" + strconv.FormatInt(int64(created["data"].(map[string]any)["id"].(float64)), 10)
	for _, r := range []struct{ method, path string }{
		{"POST", "/roles"}, {"PATCH", role}, {"DELETE", role}, {"PUT", role + "/permissions"}, {"POST", role + "/reset"},
	} {
		call(assigner, r.method, r.path, map[string]any{}, 403, "role:define")
	}
	call(definer, "PATCH", role, map[string]any{"name": map[string]string{"en": "Probe 2"}}, 200, "")

	assign := map[string]any{"role_keys": []string{"split_probe"}}
	roles := "/users/" + strconv.FormatInt(target, 10) + "/roles"
	call(definer, "PUT", roles, assign, 403, "role:assign")
	call(assigner, "PUT", roles, assign, 200, "")
	create := func(email string, roleKeys ...string) map[string]any {
		return map[string]any{"email": email, "display_name": "x", "password": adminPassword, "role_keys": roleKeys}
	}
	call(definer, "POST", "/users", create("by-definer@example.com", "split_probe"), 403, "role:assign")
	call(definer, "POST", "/users", create("plain@example.com"), 201, "")
	call(assigner, "POST", "/users", create("by-assigner@example.com", "split_probe"), 201, "")
}

func TestAccessKeyCannotManageSignIn(t *testing.T) {
	k := newKeyEnv(t)
	root := mustLogin(t, k.s, adminEmail, adminPassword).User.ID
	key := k.createKey(t, root, "user:read")
	// Anything that only verifies JWTs refuses it (plugin routes refuse keys
	// explicitly with 403).
	if _, err := k.s.VerifyAccessToken(context.Background(), key.Key); err == nil {
		t.Fatal("a key passed as a console token")
	}
	for _, p := range []struct{ method, path string }{
		{"POST", "/me/access-keys"}, {"GET", "/me/access-keys"}, {"DELETE", "/me/access-keys/1"},
		{"PUT", "/me/password"}, {"PUT", "/me"}, {"POST", "/auth/logout"},
		{"POST", "/me/two-factor/setup"}, {"POST", "/me/two-factor/disable"},
		{"POST", "/me/passkeys/begin"}, {"DELETE", "/me/passkeys/1"},
		{"GET", "/me/sessions"}, {"POST", "/me/sessions/revoke-others"},
	} {
		if code, _ := k.call(key.Key, p.method, p.path, map[string]any{}); code != 403 {
			t.Fatalf("%s %s: %d", p.method, p.path, code)
		}
	}
}

func TestAccessKeyLifecycle(t *testing.T) {
	k := newKeyEnv(t)
	ctx := context.Background()
	root := mustLogin(t, k.s, adminEmail, adminPassword).User.ID

	// Expired, rejected, deleted, disabled: 401.
	soon := time.Now().Add(30 * time.Minute)
	if _, err := k.s.CreateAccessKey(ctx, root, CreateAccessKeyInput{Name: "x", Permissions: []string{"user:read"}, ExpiresAt: &soon}); !isCode(err, "invalid_argument") {
		t.Fatalf("too soon: %v", err)
	}
	expiring := k.createKey(t, root, "user:read")
	if _, err := k.s.db.Pool.Exec(ctx, `UPDATE user_access_keys SET expires_at = now() - interval '1 second' WHERE id = $1`, expiring.ID); err != nil {
		t.Fatal(err)
	}
	if code, _ := k.call(expiring.Key, "GET", "/users", nil); code != 401 {
		t.Fatalf("expired: %d", code)
	}
	if code, _ := k.call(core.AccessKeyPrefix+"unknown", "GET", "/users", nil); code != 401 {
		t.Fatalf("unknown: %d", code)
	}

	key := k.createKey(t, root, "user:read")
	if code, _ := k.call(key.Key, "GET", "/users", nil); code != 200 {
		t.Fatalf("live: %d", code)
	}
	list, _ := k.s.AccessKeys(ctx, root)
	if list[0].LastUsedAt == nil {
		t.Fatal("last use not recorded")
	}

	// Editing checks the same rule, and only the owner can.
	if _, err := k.s.UpdateAccessKey(ctx, k.userID, key.ID, UpdateAccessKeyInput{Name: ptr("x")}); !isCode(err, "not_found") {
		t.Fatalf("another user's: %v", err)
	}
	updated, err := k.s.UpdateAccessKey(ctx, root, key.ID, UpdateAccessKeyInput{Name: ptr("renamed"), Permissions: []string{"role:read"}})
	if err != nil || updated.Name != "renamed" {
		t.Fatalf("update: %+v, %v", updated, err)
	}
	if code, _ := k.call(key.Key, "GET", "/users", nil); code != 403 {
		t.Fatalf("after narrowing: %d", code)
	}

	if err := k.s.DeleteAccessKey(ctx, k.userID, key.ID); !isCode(err, "not_found") {
		t.Fatalf("another user's: %v", err)
	}
	limited := k.createKey(t, k.userID, "apikey:self:manage")
	if _, err := k.s.db.Pool.Exec(ctx, `UPDATE users SET status = 'disabled' WHERE id = $1`, k.userID); err != nil {
		t.Fatal(err)
	}
	k.s.forgetStatus(k.userID)
	if code, _ := k.call(limited.Key, "GET", "/me", nil); code != 401 {
		t.Fatalf("a disabled user's key: %d", code)
	}
	if err := k.s.DeleteAccessKey(ctx, root, key.ID); err != nil {
		t.Fatal(err)
	}
	if code, _ := k.call(key.Key, "GET", "/permissions", nil); code != 401 {
		t.Fatalf("deleted: %d", code)
	}
}

func ptr[T any](v T) *T { return &v }

func TestAccessKeyCatalogHasOnlyWhatTheUserHolds(t *testing.T) {
	k := newKeyEnv(t)
	ctx := context.Background()
	k.grantRole(t, k.userID, "reader", "user:read")
	mods, err := k.s.AccessKeyPermissions(ctx, k.userID)
	if err != nil {
		t.Fatal(err)
	}
	seen := map[string]bool{}
	for _, m := range mods {
		for _, p := range m.Permissions {
			seen[p.Key] = true
		}
	}
	if !seen["user:read"] || seen["user:delete"] || seen["role:assign"] {
		t.Fatalf("catalog = %v", seen)
	}
	// A plugin permission the user holds can be chosen (§80, 期 4 S4).
	if _, err := k.s.db.Pool.Exec(ctx, `INSERT INTO plugins (key, name, status) VALUES ('demo', '{"en":"x"}', 'enabled')`); err != nil {
		t.Fatal(err)
	}
	if _, err := k.s.db.Pool.Exec(ctx, `INSERT INTO permissions (key, module, label, source, plugin_key, status) VALUES ('plugin.demo:read', 'plugin.demo', '{"en":"x"}', 'plugin', 'demo', 'active')`); err != nil {
		t.Fatal(err)
	}
	k.grantRole(t, k.userID, "demo_reader", "plugin.demo:read")
	mods, err = k.s.AccessKeyPermissions(ctx, k.userID)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.ContainsFunc(mods, func(m *authz.PermissionModule) bool { return m.Module == "plugin.demo" && m.Source == "plugin" }) {
		t.Fatalf("the selector does not offer the held plugin permission: %+v", mods)
	}
	key, err := k.s.CreateAccessKey(ctx, k.userID, CreateAccessKeyInput{Name: "x", Permissions: []string{"plugin.demo:read", "user:read"}})
	if err != nil {
		t.Fatalf("a plugin permission: %v", err)
	}
	if id, err := k.s.VerifyAccessKey(ctx, key.Key, testIP); err != nil || !slices.Equal(id.Permissions, []string{"plugin.demo:read", "user:read"}) {
		t.Fatalf("verified permissions = %v, %v", id.Permissions, err)
	}
	// Disabled with its plugin, it is lost until the plugin is back.
	if _, err := k.s.db.Pool.Exec(ctx, `UPDATE permissions SET status = 'disabled' WHERE key = 'plugin.demo:read'`); err != nil {
		t.Fatal(err)
	}
	k.bump(t)
	if list, err := k.s.AccessKeys(ctx, k.userID); err != nil || len(list) != 1 || !slices.Equal(list[0].Lost, []string{"plugin.demo:read"}) {
		t.Fatalf("lost = %+v, %v", list, err)
	}
	mods, err = k.s.AccessKeyPermissions(ctx, k.userID)
	if err != nil {
		t.Fatal(err)
	}
	if slices.ContainsFunc(mods, func(m *authz.PermissionModule) bool { return m.Module == "plugin.demo" }) {
		t.Fatal("the selector offers a disabled plugin permission")
	}
}

// The former session-only permissions (期 4 S3) are offered to a key like any
// other; the routes that execute code, reveal secrets or change trust roots
// take a key with the permission only with a step-up proof.
func TestFormerSessionOnlyPermissionsInAccessKeys(t *testing.T) {
	k := newKeyEnv(t)
	ctx := context.Background()
	cipher, err := secret.New(make([]byte, 32))
	if err != nil {
		t.Fatal(err)
	}
	ccgateway.New(k.s.db, cipher).RegisterRoutes(k.r)
	login := mustLogin(t, k.s, adminEmail, adminPassword)
	root := login.User.ID
	former := []string{"role:define", "role:assign", "settings:manage", "user:password:reset",
		"plugin:install", "plugin:uninstall", "plugin:grant:high", "plugin:grant:critical", "plugin:grant:db_schema_unconfined",
		"publisher:manage", "system:update:execute", "system:update:recover",
		"account:credential:view", "account:credential:view:own"}
	// A stand-in for the plugin upload route, guarded the same way.
	k.r.StepUp(core.StepUpPluginInstall).Perm(http.MethodPost, "/plugins/upload", "plugin:install", func(c *gin.Context) { c.Status(http.StatusNoContent) })

	mods, err := k.s.AccessKeyPermissions(ctx, root)
	if err != nil {
		t.Fatal(err)
	}
	offered := map[string]bool{}
	for _, m := range mods {
		for _, p := range m.Permissions {
			offered[p.Key] = true
		}
	}
	for _, p := range former {
		// A scoped key is offered as its action.
		if c, _ := perm.Parse(p); !offered[string(c.Action)] {
			t.Fatalf("%s is not offered to access keys", p)
		}
	}
	key := k.createKey(t, root, append([]string{"settings:read"}, former...)...)
	if list, err := k.s.AccessKeys(ctx, root); err != nil || len(list[0].Lost) != 0 {
		t.Fatalf("lost = %+v, %v", list, err)
	}
	// Pointing the ccgateway at a host takes a host.install proof (R0).
	if code, out := k.call(key.Key, "PUT", "/system/ccgateway/remote-config", map[string]any{"mode": "disabled"}); code != 403 || errCode(out) != "verification_required" {
		t.Fatalf("key with settings:manage, no proof: %d %v", code, out)
	}
	hostProof := k.proof(t, key.Key, core.StepUpHostInstall, "PUT", "/system/ccgateway/remote-config", map[string]any{"method": "password", "password": adminPassword})
	if code, out := k.callProof(key.Key, hostProof, "PUT", "/system/ccgateway/remote-config", map[string]any{"mode": "disabled"}); code != 200 {
		t.Fatalf("key with settings:manage and a proof: %d %v", code, out)
	}
	if code, out := k.call(key.Key, "POST", "/plugins/upload", nil); code != 403 || errCode(out) != "verification_required" {
		t.Fatalf("key with plugin:install, no proof: %d %v", code, out)
	}
	proof := k.proof(t, key.Key, core.StepUpPluginInstall, "POST", "/plugins/upload", map[string]any{"method": "password", "password": adminPassword})
	if code, out := k.callProof(key.Key, proof, "POST", "/plugins/upload", nil); code != 204 {
		t.Fatalf("key with plugin:install and a proof: %d %v", code, out)
	}
	if code, out := k.callProof(key.Key, proof, "POST", "/plugins/upload", nil); code != 403 || errCode(out) != "verification_required" {
		t.Fatalf("replayed proof: %d %v", code, out)
	}
	narrow := k.createKey(t, root, "settings:read")
	if code, out := k.callProof(narrow.Key, k.proof(t, narrow.Key, core.StepUpPluginInstall, "POST", "/plugins/upload", map[string]any{"method": "password", "password": adminPassword}), "POST", "/plugins/upload", nil); code != 403 || errCode(out) != "permission_denied" {
		t.Fatalf("key without plugin:install: %d %v", code, out)
	}
}

// One proof covers an operation of several requests (CONTRACTS §80.2, the
// ccgateway image upload): the request that spent it opens a step-up
// session, and only the same user through the same access key or login
// session continues it, until it has been idle for an hour or a day has
// passed since the proof.
func TestStepUpSessions(t *testing.T) {
	k := newKeyEnv(t)
	ctx := context.Background()
	login := mustLogin(t, k.s, adminEmail, adminPassword)
	keyA := k.createKey(t, login.User.ID, "settings:manage")
	keyB := k.createKey(t, login.User.ID, "settings:manage")
	// Stand-ins for the upload routes, guarded the same way.
	k.r.StepUp(core.StepUpHostInstall).Perm(http.MethodPost, "/x/uploads", "settings:manage", func(c *gin.Context) {
		if err := httpapi.OpenStepUpSession(c, "x/1"); err != nil {
			httpapi.Fail(c, err)
			return
		}
		c.Status(http.StatusNoContent)
	})
	k.r.StepUpSession(core.StepUpHostInstall, func(c *gin.Context) string { return "x/" + c.Param("id") }).
		Perm(http.MethodPut, "/x/uploads/:id", "settings:manage", func(c *gin.Context) { c.Status(http.StatusNoContent) })
	refused := func(token, path, want string) {
		t.Helper()
		if code, out := k.call(token, "PUT", path, nil); code != 403 || errCode(out) != want {
			t.Fatalf("PUT %s: %d %v, want %s", path, code, out, want)
		}
	}
	if code, out := k.call(keyA.Key, "POST", "/x/uploads", nil); code != 403 || errCode(out) != "verification_required" {
		t.Fatalf("open without a proof: %d %v", code, out)
	}
	refused(keyA.Key, "/x/uploads/1", "verification_expired")
	proof := k.proof(t, keyA.Key, core.StepUpHostInstall, "POST", "/x/uploads", map[string]any{"method": "password", "password": adminPassword})
	if code, out := k.callProof(keyA.Key, proof, "POST", "/x/uploads", nil); code != 204 {
		t.Fatalf("open with a proof: %d %v", code, out)
	}
	for range 2 {
		if code, out := k.call(keyA.Key, "PUT", "/x/uploads/1", nil); code != 204 {
			t.Fatalf("continued: %d %v", code, out)
		}
	}
	refused(keyA.Key, "/x/uploads/2", "verification_expired")
	refused(keyB.Key, "/x/uploads/1", "verification_expired")
	refused(login.AccessToken, "/x/uploads/1", "verification_expired")
	var idle bool
	if err := k.s.db.Pool.QueryRow(ctx, `SELECT expires_at > now() + interval '59 minutes' FROM auth_flows WHERE purpose = 'step_up_session'`).Scan(&idle); err != nil || !idle {
		t.Fatalf("the session is not kept open an hour from its last request: %v %v", idle, err)
	}
	// However busy, a session ends a day after its proof.
	if _, err := k.s.db.Pool.Exec(ctx, `UPDATE auth_flows SET created_at = now() - interval '23 hours 30 minutes' WHERE purpose = 'step_up_session'`); err != nil {
		t.Fatal(err)
	}
	if code, out := k.call(keyA.Key, "PUT", "/x/uploads/1", nil); code != 204 {
		t.Fatalf("continued within the day: %d %v", code, out)
	}
	var capped bool
	if err := k.s.db.Pool.QueryRow(ctx, `SELECT expires_at <= created_at + interval '24 hours' FROM auth_flows WHERE purpose = 'step_up_session'`).Scan(&capped); err != nil || !capped {
		t.Fatalf("the session is kept open past a day from its proof: %v %v", capped, err)
	}
	if _, err := k.s.db.Pool.Exec(ctx, `UPDATE auth_flows SET created_at = now() - interval '25 hours' WHERE purpose = 'step_up_session'`); err != nil {
		t.Fatal(err)
	}
	refused(keyA.Key, "/x/uploads/1", "verification_expired")
	if _, err := k.s.db.Pool.Exec(ctx, `UPDATE auth_flows SET created_at = now(), expires_at = now() - interval '1 second' WHERE purpose = 'step_up_session'`); err != nil {
		t.Fatal(err)
	}
	refused(keyA.Key, "/x/uploads/1", "verification_expired")
}

// An access key's scopes are within its user's (CONTRACTS §21.0, R6): a key
// wider than the user is refused at creation (the former own-level spelling
// names no permission), its keys are stored and listed canonical, and a key
// stored before scopes existed narrows at use to the user's scope of each
// action.
func TestAccessKeyScopes(t *testing.T) {
	k := newKeyEnv(t)
	ctx := context.Background()
	k.grantRole(t, k.userID, "seller", "account:read:own", "account:update:own", "proxy:manage:own")
	for _, wide := range []string{"account:read", "account:update:group/3", "proxy:manage:proxy/1"} {
		_, err := k.s.CreateAccessKey(ctx, k.userID, CreateAccessKeyInput{Name: "w", Permissions: []string{wide}})
		var ce *core.Error
		if !errors.As(err, &ce) || ce.Code != "permission_denied" || fmt.Sprint(ce.Details["missing"]) != "["+wide+"]" {
			t.Fatalf("%s: %v", wide, err)
		}
	}
	if _, err := k.s.CreateAccessKey(ctx, k.userID, CreateAccessKeyInput{Name: "bad", Permissions: []string{"user:read:own"}}); errCodeOf(err) != "invalid_argument" {
		t.Fatalf("invalid key: %v", err)
	}
	if _, err := k.s.CreateAccessKey(ctx, k.userID, CreateAccessKeyInput{Name: "old", Permissions: []string{"account:own:read"}}); errCodeOf(err) != "permission_denied" {
		t.Fatalf("former own-level key: %v", err)
	}
	key := k.createKey(t, k.userID, "account:read:own", "proxy:manage:own", "account:read:own")
	if fmt.Sprint(key.Permissions) != "[account:read:own proxy:manage:own]" {
		t.Fatalf("listed = %v", key.Permissions)
	}
	var stored []string
	if err := k.s.db.Pool.QueryRow(ctx, `SELECT permissions FROM user_access_keys WHERE id = $1`, key.ID).Scan(&stored); err != nil {
		t.Fatal(err)
	}
	if fmt.Sprint(stored) != "[account:read:own proxy:manage:own]" {
		t.Fatalf("stored = %v", stored)
	}
	// A group-range user's key takes a subset of its groups.
	k.grantRole(t, k.userID, "grouped", "user:read")
	if _, err := k.s.db.Pool.Exec(ctx, `INSERT INTO role_permission_scopes (role_id, permission_id, scope)
		SELECT r.id, p.id, 'group/12' FROM roles r, permissions p WHERE r.key = 'grouped' AND p.key = 'account:test'`); err != nil {
		t.Fatal(err)
	}
	k.bump(t)
	if sub := k.createKey(t, k.userID, "account:test:group/12/account/5"); fmt.Sprint(sub.Permissions) != "[account:test:group/12/account/5]" {
		t.Fatalf("subset key = %v", sub.Permissions)
	}
	if _, err := k.s.CreateAccessKey(ctx, k.userID, CreateAccessKeyInput{Name: "x", Permissions: []string{"account:test:account/5"}}); errCodeOf(err) != "permission_denied" {
		t.Fatalf("id outside the group syntax: %v", err)
	}
	// A key from before: account:update and account:delete for every row.
	old := core.AccessKeyIdentity{UserID: k.userID, KeyID: 99, Permissions: []string{"account:update", "account:delete", "proxy:read"}}
	set, err := k.authz.PermissionSet(core.WithAccessKey(core.WithUserID(ctx, k.userID), old), k.userID)
	if err != nil {
		t.Fatal(err)
	}
	if fmt.Sprint(set.KeyList()) != "[account:update:own]" {
		t.Fatalf("old key narrows to %v", set.KeyList())
	}
}

func errCodeOf(err error) string {
	var ce *core.Error
	if errors.As(err, &ce) {
		return ce.Code
	}
	return ""
}

// Creating or changing an access key takes a self.access_key.write proof
// each time (no password in the body); deleting one takes none. A key
// cannot reach these routes even with a proof.
func TestAccessKeyWriteNeedsAProof(t *testing.T) {
	k := newKeyEnv(t)
	login := mustLogin(t, k.s, adminEmail, adminPassword)
	session := login.AccessToken
	pass := map[string]any{"method": "password", "password": adminPassword}
	body := map[string]any{"name": "ci", "permissions": []string{"user:read"}}

	code, out := k.call(session, "POST", "/me/access-keys", body)
	if errCode(out) != "verification_required" || code != 403 {
		t.Fatalf("create without a proof: %d %v", code, out)
	}
	if d := out["error"].(map[string]any)["details"].(map[string]any); d["scope"] != core.StepUpAccessKeyWrite || d["password_required"] != false {
		t.Fatalf("challenge %v", d)
	}
	proof := k.proof(t, session, core.StepUpAccessKeyWrite, "POST", "/me/access-keys", pass)
	code, out = k.callProof(session, proof, "POST", "/me/access-keys", body)
	if code != 201 {
		t.Fatalf("create with a proof: %d %v", code, out)
	}
	key := out["data"].(map[string]any)
	path := fmt.Sprintf("/me/access-keys/%v", key["id"])
	// The proof was spent.
	if code, _ := k.callProof(session, proof, "POST", "/me/access-keys", body); code != 403 {
		t.Fatalf("create with a spent proof: %d", code)
	}

	// Renaming or changing the permissions alike.
	for _, patch := range []map[string]any{{"name": "renamed"}, {"permissions": []string{"user:read"}}} {
		if code, out := k.call(session, "PATCH", path, patch); code != 403 || errCode(out) != "verification_required" {
			t.Fatalf("patch %v without a proof: %d %v", patch, code, out)
		}
		proof := k.proof(t, session, core.StepUpAccessKeyWrite, "PATCH", path, pass)
		if code, out := k.callProof(session, proof, "PATCH", path, patch); code != 200 {
			t.Fatalf("patch %v with a proof: %d %v", patch, code, out)
		}
	}

	// A key is refused before any proof is looked at.
	other := k.createKey(t, login.User.ID, "user:read").Key
	keyProof := k.proof(t, other, core.StepUpAccessKeyWrite, "POST", "/me/access-keys", pass)
	if code, out := k.callProof(other, keyProof, "POST", "/me/access-keys", body); code != 403 || errCode(out) == "verification_required" {
		t.Fatalf("key creates a key: %d %v", code, out)
	}

	if code, out := k.call(session, "DELETE", path, nil); code != 204 {
		t.Fatalf("delete without a proof: %d %v", code, out)
	}
}

// GET /me/verify/methods takes the operation, so the console asks the super
// admin for its password before it resets its own security.
func TestVerifyMethodsTakeTheOperation(t *testing.T) {
	k := newKeyEnv(t)
	login := mustLogin(t, k.s, adminEmail, adminPassword)
	q := url.Values{"scope": {core.StepUpUserSecurityReset}, "context": {fmt.Sprintf("DELETE /api/v1/users/%d/security", login.User.ID)}}
	code, out := k.call(login.AccessToken, "GET", "/me/verify/methods?"+q.Encode(), nil)
	if code != 200 || out["data"].(map[string]any)["password_required"] != true {
		t.Fatalf("methods = %d %v", code, out)
	}
	code, out = k.call(login.AccessToken, "DELETE", fmt.Sprintf("/users/%d/security", login.User.ID), nil)
	if errCode(out) != "verification_required" || out["error"].(map[string]any)["details"].(map[string]any)["password_required"] != true {
		t.Fatalf("challenge = %d %v", code, out)
	}
}
