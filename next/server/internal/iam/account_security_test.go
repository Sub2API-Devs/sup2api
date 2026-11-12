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
	"net/http"
	"net/http/httptest"
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
	setup, err := s.StartTwoFactor(ctx, userID, adminPassword, testIP)
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

func clearLastStep(t *testing.T, s *Service, userID int64) {
	t.Helper()
	if _, err := s.db.Pool.Exec(context.Background(), `UPDATE user_totp SET last_step = 0 WHERE user_id = $1`, userID); err != nil {
		t.Fatal(err)
	}
}

func TestTwoFactorEnrolmentNeedsPasswordAndCode(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	id := mustLogin(t, s, adminEmail, adminPassword).User.ID
	if _, err := s.StartTwoFactor(ctx, id, "wrong-password", testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("wrong password: %v", err)
	}
	setupOut, err := s.StartTwoFactor(ctx, id, adminPassword, testIP)
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
	if _, err := s.StartTwoFactor(ctx, id, adminPassword, testIP); !isCode(err, "conflict") {
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
	// The code that enabled the factor was consumed: it does not log in.
	if _, err := s.LoginSecondFactor(ctx, step.FlowToken, codeAt(t, secret, time.Now()), testIP); !isBadSecondFactor(err) {
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
	if err := s.ChangePassword(ctx, id, "", adminPassword, "another-password-1"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.LoginSecondFactor(ctx, step.FlowToken, codeAt(t, secret, time.Now()), testIP); err == nil {
		t.Fatal("the old password's step still logs in")
	}
}

func TestDisableTwoFactorNeedsPasswordAndCode(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	id := mustLogin(t, s, adminEmail, adminPassword).User.ID
	secret, _ := enableTwoFactor(t, s, id)
	clearLastStep(t, s, id)
	if err := s.DisableTwoFactor(ctx, id, adminPassword, "000000", testIP); !isBadSecondFactor(err) {
		t.Fatalf("wrong code: %v", err)
	}
	if err := s.DisableTwoFactor(ctx, id, "wrong-password", codeAt(t, secret, time.Now()), testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("wrong password: %v", err)
	}
	if err := s.DisableTwoFactor(ctx, id, adminPassword, codeAt(t, secret, time.Now()), testIP); err != nil {
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
	secret, _ := enableTwoFactor(t, s, root)
	clearLastStep(t, s, root)
	staff, err := s.CreateUser(ctx, root, CreateUserInput{Email: "staff@example.com", DisplayName: "Staff", Password: "staff-password-1"})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.ResetSecurity(ctx, staff.ID, root, SelfConfirmation{}, testIP); err == nil {
		t.Fatal("a non-superuser reset a superuser")
	}
	if st, _ := s.TwoFactor(ctx, root); !st.Enabled {
		t.Fatal("the refused reset removed the factor")
	}
	// SEC-H3: one's own factors go only with the password and a code.
	rootPassword := adminPassword
	if err := s.ResetSecurity(ctx, root, root, SelfConfirmation{}, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("self reset without confirmation: %v", err)
	}
	if err := s.ResetSecurity(ctx, root, root, SelfConfirmation{CurrentPassword: &rootPassword}, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("self reset without a code: %v", err)
	}
	if err := s.ResetSecurity(ctx, root, root, SelfConfirmation{CurrentPassword: &rootPassword, Code: "000000"}, testIP); !isBadSecondFactor(err) {
		t.Fatalf("self reset with a wrong code: %v", err)
	}
	if st, _ := s.TwoFactor(ctx, root); !st.Enabled {
		t.Fatal("a refused self reset removed the factor")
	}
	if err := s.ResetSecurity(ctx, root, root, SelfConfirmation{CurrentPassword: &rootPassword, Code: codeAt(t, secret, time.Now())}, testIP); err != nil {
		t.Fatal(err)
	}
	if st, _ := s.TwoFactor(ctx, root); st.Enabled {
		t.Fatal("still enabled after the reset")
	}
}

// SEC-H3: a user changing their own password or email through the operator
// route proves the current sign-in, as on /me/password; an operator changing
// someone else's needs no such proof (they do not have it).
func TestSelfUpdateRequiresConfirmation(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	root := mustLogin(t, s, adminEmail, adminPassword).User.ID
	newPassword, rootPassword, wrongPassword := "root-password-2", adminPassword, "not-the-password"
	if _, err := s.UpdateUser(ctx, root, root, UpdateUserInput{Password: &newPassword}, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("own password without confirmation: %v", err)
	}
	if _, err := s.UpdateUser(ctx, root, root, UpdateUserInput{Password: &newPassword, SelfConfirmation: SelfConfirmation{CurrentPassword: &wrongPassword}}, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("own password with a wrong current password: %v", err)
	}
	if _, err := s.Login(ctx, adminEmail, newPassword, testIP); err == nil {
		t.Fatal("the refused change took effect")
	}
	email := "root2@example.com"
	if _, err := s.UpdateUser(ctx, root, root, UpdateUserInput{Email: &email}, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("own email without confirmation: %v", err)
	}
	name := "Root"
	if _, err := s.UpdateUser(ctx, root, root, UpdateUserInput{DisplayName: &name}, testIP); err != nil {
		t.Fatalf("own display name needs no confirmation: %v", err)
	}
	if _, err := s.UpdateUser(ctx, root, root, UpdateUserInput{Password: &newPassword, SelfConfirmation: SelfConfirmation{CurrentPassword: &rootPassword}}, testIP); err != nil {
		t.Fatal(err)
	}
	mustLogin(t, s, adminEmail, newPassword)
	// Back to the password the two-factor helpers below sign in with.
	if _, err := s.UpdateUser(ctx, root, root, UpdateUserInput{Password: &rootPassword, SelfConfirmation: SelfConfirmation{CurrentPassword: &newPassword}}, testIP); err != nil {
		t.Fatal(err)
	}

	// With two-factor authentication on, the password alone is not enough.
	secret, _ := enableTwoFactor(t, s, root)
	clearLastStep(t, s, root)
	if _, err := s.UpdateUser(ctx, root, root, UpdateUserInput{Email: &email, SelfConfirmation: SelfConfirmation{CurrentPassword: &rootPassword}}, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("own email without a code: %v", err)
	}
	if _, err := s.UpdateUser(ctx, root, root, UpdateUserInput{Email: &email, SelfConfirmation: SelfConfirmation{CurrentPassword: &rootPassword, Code: "000000"}}, testIP); !isBadSecondFactor(err) {
		t.Fatalf("own email with a wrong code: %v", err)
	}
	if _, err := s.UpdateUser(ctx, root, root, UpdateUserInput{Email: &email, SelfConfirmation: SelfConfirmation{CurrentPassword: &rootPassword, Code: codeAt(t, secret, time.Now())}}, testIP); err != nil {
		t.Fatal(err)
	}
	mustLogin(t, s, email, rootPassword)

	// Operators still reset other users without any confirmation.
	staff, err := s.CreateUser(ctx, root, CreateUserInput{Email: "staff2@example.com", Password: "staff-password-1"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.UpdateUser(ctx, root, staff.ID, UpdateUserInput{Password: &newPassword}, testIP); err != nil {
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
	if _, err := s.UpdateUser(ctx, editor.ID, plain.ID, UpdateUserInput{DisplayName: &name}, testIP); err != nil {
		t.Fatalf("editor update: %v", err)
	}
	_, err = s.UpdateUser(ctx, editor.ID, plain.ID, UpdateUserInput{Password: &pw}, testIP)
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
	if _, err := s.UpdateUser(ctx, operator.ID, admin.ID, UpdateUserInput{Password: &pw}, testIP); !isCode(err, "permission_denied") {
		t.Fatalf("operator set an active admin's password: %v", err)
	}
	disabled, active := StatusDisabled, StatusActive
	if _, err := s.UpdateUser(ctx, root, admin.ID, UpdateUserInput{Status: &disabled}, testIP); err != nil {
		t.Fatal(err)
	}
	if _, err := s.UpdateUser(ctx, operator.ID, admin.ID, UpdateUserInput{Password: &pw}, testIP); !isCode(err, "permission_denied") {
		t.Fatalf("operator set a disabled admin's password: %v", err)
	}
	if _, err := s.UpdateUser(ctx, operator.ID, admin.ID, UpdateUserInput{Status: &active}, testIP); !isCode(err, "permission_denied") {
		t.Fatalf("operator re-enabled a disabled admin: %v", err)
	}
	if err := s.ResetSecurity(ctx, operator.ID, admin.ID, SelfConfirmation{}, testIP); !isCode(err, "permission_denied") {
		t.Fatalf("operator reset a disabled admin's factors: %v", err)
	}
	if err := s.DeleteUser(ctx, operator.ID, admin.ID); !isCode(err, "permission_denied") {
		t.Fatalf("operator deleted a disabled admin: %v", err)
	}
	if _, err := s.Login(ctx, "admin2@example.com", pw, testIP); err == nil {
		t.Fatal("the disabled admin was taken over")
	}
	// The superuser, who outranks the admin, still can.
	if _, err := s.UpdateUser(ctx, root, admin.ID, UpdateUserInput{Status: &active}, testIP); err != nil {
		t.Fatal(err)
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
	begin, err := s.BeginPasskeyRegistration(ctx, r, userID, adminPassword, testIP)
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
	if _, err := s.BeginPasskeyRegistration(ctx, r, id, "wrong-password", testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("wrong password: %v", err)
	}
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

func (k *keyEnv) createKey(t *testing.T, userID int64, password string, perms ...string) *AccessKey {
	t.Helper()
	key, err := k.s.CreateAccessKey(context.Background(), userID, CreateAccessKeyInput{Name: "ci", Password: password, Permissions: perms}, testIP)
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
		if _, err := k.s.db.Pool.Exec(ctx, `INSERT INTO role_permissions (role_id, permission_id) SELECT $1, id FROM permissions WHERE key = $2`, id, p); err != nil {
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
		_, err := k.s.CreateAccessKey(ctx, k.userID, CreateAccessKeyInput{Name: "x", Password: adminPassword, Permissions: perms}, testIP)
		if !isCode(err, "permission_denied") {
			t.Fatalf("%v: %v", perms, err)
		}
	}
	if _, err := k.s.CreateAccessKey(ctx, k.userID, CreateAccessKeyInput{Name: "x", Password: adminPassword}, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("no permissions: %v", err)
	}
	if _, err := k.s.CreateAccessKey(ctx, k.userID, CreateAccessKeyInput{Name: "x", Password: "wrong", Permissions: []string{"user:read"}}, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("wrong password: %v", err)
	}

	key := k.createKey(t, k.userID, adminPassword, "user:read")
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
	root := mustLogin(t, k.s, adminEmail, adminPassword).User.ID
	key := k.createKey(t, root, adminPassword, "user:read")
	if code, _ := k.call(key.Key, "GET", "/users", nil); code != 200 {
		t.Fatalf("granted: %d", code)
	}
	for _, p := range []struct{ method, path string }{{"GET", "/permissions"}, {"DELETE", "/users/" + strconv.FormatInt(k.userID, 10)}} {
		if code, _ := k.call(key.Key, p.method, p.path, nil); code != 403 {
			t.Fatalf("%s %s: %d", p.method, p.path, code)
		}
	}
	code, me := k.call(key.Key, "GET", "/me", nil)
	data := me["data"].(map[string]any)
	if code != 200 || data["superuser"] != false || len(data["permissions"].([]any)) != 1 {
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
// one stored with role:assign (sessionOnly, dropped at verification); nor can
// the superuser's own session, since the role only changes hands by transfer.
func TestSuperuserKeyCannotGrantSuperAdmin(t *testing.T) {
	k := newKeyEnv(t)
	ctx := context.Background()
	login := mustLogin(t, k.s, adminEmail, adminPassword)
	key := k.createKey(t, login.User.ID, adminPassword, "user:create")
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
	key := k.createKey(t, root, adminPassword, "user:read")
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
	if _, err := k.s.CreateAccessKey(ctx, root, CreateAccessKeyInput{Name: "x", Password: adminPassword, Permissions: []string{"user:read"}, ExpiresAt: &soon}, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("too soon: %v", err)
	}
	expiring := k.createKey(t, root, adminPassword, "user:read")
	if _, err := k.s.db.Pool.Exec(ctx, `UPDATE user_access_keys SET expires_at = now() - interval '1 second' WHERE id = $1`, expiring.ID); err != nil {
		t.Fatal(err)
	}
	if code, _ := k.call(expiring.Key, "GET", "/users", nil); code != 401 {
		t.Fatalf("expired: %d", code)
	}
	if code, _ := k.call(core.AccessKeyPrefix+"unknown", "GET", "/users", nil); code != 401 {
		t.Fatalf("unknown: %d", code)
	}

	key := k.createKey(t, root, adminPassword, "user:read")
	if code, _ := k.call(key.Key, "GET", "/users", nil); code != 200 {
		t.Fatalf("live: %d", code)
	}
	list, _ := k.s.AccessKeys(ctx, root)
	if list[0].LastUsedAt == nil {
		t.Fatal("last use not recorded")
	}

	// Editing checks the same rule, and only the owner can.
	if _, err := k.s.UpdateAccessKey(ctx, k.userID, key.ID, UpdateAccessKeyInput{Name: ptr("x")}, testIP); !isCode(err, "not_found") {
		t.Fatalf("another user's: %v", err)
	}
	if _, err := k.s.UpdateAccessKey(ctx, root, key.ID, UpdateAccessKeyInput{Permissions: []string{"role:read"}, Password: "wrong"}, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("wrong password: %v", err)
	}
	updated, err := k.s.UpdateAccessKey(ctx, root, key.ID, UpdateAccessKeyInput{Name: ptr("renamed"), Permissions: []string{"role:read"}, Password: adminPassword}, testIP)
	if err != nil || updated.Name != "renamed" {
		t.Fatalf("update: %+v, %v", updated, err)
	}
	if code, _ := k.call(key.Key, "GET", "/users", nil); code != 403 {
		t.Fatalf("after narrowing: %d", code)
	}

	if err := k.s.DeleteAccessKey(ctx, k.userID, key.ID); !isCode(err, "not_found") {
		t.Fatalf("another user's: %v", err)
	}
	limited := k.createKey(t, k.userID, adminPassword, "apikey:self:manage")
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
	// A plugin permission cannot be chosen: plugin routes do not take keys.
	if _, err := k.s.db.Pool.Exec(ctx, `INSERT INTO plugins (key, name, status) VALUES ('demo', '{"en":"x"}', 'enabled')`); err != nil {
		t.Fatal(err)
	}
	if _, err := k.s.db.Pool.Exec(ctx, `INSERT INTO permissions (key, module, label, source, plugin_key, status) VALUES ('plugin.demo:read', 'plugin.demo', '{"en":"x"}', 'plugin', 'demo', 'active')`); err != nil {
		t.Fatal(err)
	}
	k.bump(t)
	root := mustLogin(t, k.s, adminEmail, adminPassword).User.ID
	_, err = k.s.CreateAccessKey(ctx, root, CreateAccessKeyInput{Name: "x", Password: adminPassword, Permissions: []string{"plugin.demo:read"}}, testIP)
	if !isCode(err, "permission_denied") {
		t.Fatalf("a plugin permission: %v", err)
	}
	mods, err = k.s.AccessKeyPermissions(ctx, root)
	if err != nil {
		t.Fatal(err)
	}
	for _, m := range mods {
		if m.Source == "plugin" {
			t.Fatalf("catalog offers %s", m.Module)
		}
	}
	// A stored key carrying one anyway lists it as lost and never uses it.
	key := k.createKey(t, root, adminPassword, "user:read")
	if _, err := k.s.db.Pool.Exec(ctx, `UPDATE user_access_keys SET permissions = array_append(permissions, 'plugin.demo:read') WHERE id = $1`, key.ID); err != nil {
		t.Fatal(err)
	}
	if list, err := k.s.AccessKeys(ctx, root); err != nil || len(list) != 1 || !slices.Equal(list[0].Lost, []string{"plugin.demo:read"}) {
		t.Fatalf("lost = %+v, %v", list, err)
	}
	if id, err := k.s.VerifyAccessKey(ctx, key.Key, testIP); err != nil || !slices.Equal(id.Permissions, []string{"user:read"}) {
		t.Fatalf("verified permissions = %v, %v", id.Permissions, err)
	}
}

// The session-only permissions (CONTRACTS §80) are never offered to a key,
// not even a superuser's, cannot be chosen, and a stored key carrying one
// lists it as lost and is refused on the routes it guards.
func TestSessionOnlyPermissionsStayOutOfAccessKeys(t *testing.T) {
	k := newKeyEnv(t)
	ctx := context.Background()
	cipher, err := secret.New(make([]byte, 32))
	if err != nil {
		t.Fatal(err)
	}
	ccgateway.New(k.s.db, cipher).RegisterRoutes(k.r)
	login := mustLogin(t, k.s, adminEmail, adminPassword)
	root := login.User.ID
	sessionOnly := []string{"role:define", "role:assign", "settings:manage", "user:password:reset"}

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
	if !offered["settings:read"] {
		t.Fatalf("catalog = %v", offered)
	}
	for _, p := range sessionOnly {
		if offered[p] || authz.KeyAllowed(p) {
			t.Fatalf("%s is offered to access keys", p)
		}
	}

	body := map[string]any{"name": "x", "password": adminPassword, "permissions": []string{"settings:read", "settings:manage"}}
	code, out := k.call(login.AccessToken, "POST", "/me/access-keys", body)
	e, _ := out["error"].(map[string]any)
	details, _ := e["details"].(map[string]any)
	if missing, _ := details["missing"].([]any); code != 403 || !slices.Contains(missing, any("settings:manage")) {
		t.Fatalf("choosing settings:manage: %d %v", code, out)
	}

	key := k.createKey(t, root, adminPassword, "settings:read")
	if _, err := k.s.db.Pool.Exec(ctx, `UPDATE user_access_keys SET permissions = array_append(permissions, 'settings:manage') WHERE id = $1`, key.ID); err != nil {
		t.Fatal(err)
	}
	if code, out := k.call(key.Key, "GET", "/system/ccgateway/remote-config", nil); code != 200 {
		t.Fatalf("settings:read: %d %v", code, out)
	}
	if code, out := k.call(key.Key, "PUT", "/system/ccgateway/remote-config", map[string]any{"mode": "disabled"}); code != 403 {
		t.Fatalf("stored settings:manage: %d %v", code, out)
	}
	if code, out := k.call(login.AccessToken, "PUT", "/system/ccgateway/remote-config", map[string]any{"mode": "disabled"}); code != 200 {
		t.Fatalf("session: %d %v", code, out)
	}
	code, out = k.call(login.AccessToken, "GET", "/me/access-keys", nil)
	list, _ := out["data"].([]any)
	if code != 200 || len(list) != 1 {
		t.Fatalf("list: %d %v", code, out)
	}
	if lost, _ := list[0].(map[string]any)["lost"].([]any); !slices.Equal(lost, []any{"settings:manage"}) {
		t.Fatalf("lost = %v", lost)
	}
}
