package iam

import (
	"context"
	"encoding/json"
	"fmt"
	"maps"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// testOperation is the operation the service-level tests bind proofs to.
const testOperation = "TEST /op"

// withProof returns ctx acting as userID through a login session and
// carrying a proof of scope for testOperation, as POST /me/verify issues one.
func withProof(t *testing.T, s *Service, ctx context.Context, userID int64, scope string) context.Context {
	t.Helper()
	ctx = core.WithUserID(ctx, userID)
	token, err := s.createFlow(ctx, flowStepUpProof, userID, proofPayload{Scope: scope, Operation: testOperation, Subject: stepUpSubject(ctx), Method: methodPassword, Password: true})
	if err != nil {
		t.Fatal(err)
	}
	return core.WithStepUp(ctx, token, testOperation)
}

// noProof returns ctx acting as userID in a request without a proof.
func noProof(ctx context.Context, userID int64) context.Context {
	return core.WithStepUp(core.WithUserID(ctx, userID), "", testOperation)
}

func isVerificationRequired(err error) bool {
	return core.AsError(err).Code == core.ErrVerificationRequired.Code
}

func methodsOf(t *testing.T, m *VerifyMethods) map[string]string {
	t.Helper()
	out := map[string]string{}
	for _, v := range m.Methods {
		if v.Available {
			out[v.Method] = "ok"
		} else {
			out[v.Method] = v.Reason
		}
	}
	return out
}

// §8.1: a passkey or two-factor shuts the password out; the password-too
// scopes ask for it besides; an access key cannot use a passkey.
func TestStepUpMethodsPolicy(t *testing.T) {
	t.Parallel()
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	id := mustLogin(t, s, adminEmail, adminPassword).User.ID
	check := func(ctx context.Context, scope string, wantPassword bool, want map[string]string) {
		t.Helper()
		m, err := s.StepUpMethods(ctx, id, scope, "")
		if err != nil {
			t.Fatal(err)
		}
		if got := methodsOf(t, m); m.PasswordRequired != wantPassword || !maps.Equal(got, want) {
			t.Fatalf("%s: password_required=%v %v, want %v %v", scope, m.PasswordRequired, got, wantPassword, want)
		}
	}
	if _, err := s.StepUpMethods(ctx, id, "no.such.scope", ""); !isCode(err, "invalid_argument") {
		t.Fatalf("unknown scope: %v", err)
	}
	check(ctx, core.StepUpUserDelete, false, map[string]string{"passkey": "not_enrolled", "totp": "not_enrolled", "password": "ok"})
	check(ctx, core.StepUpSuperAdminTransfer, true, map[string]string{"passkey": "not_enrolled", "totp": "not_enrolled", "password": "ok"})
	enableTwoFactor(t, s, id)
	check(ctx, core.StepUpUserDelete, false, map[string]string{"passkey": "not_enrolled", "totp": "ok", "password": "strong_method"})
	check(ctx, core.StepUpSelfPassword, true, map[string]string{"passkey": "not_enrolled", "totp": "ok", "password": "strong_method"})
	addPasskey(t, s, newAuthenticator(t, consoleOrigin, consoleHost), id)
	check(ctx, core.StepUpUserDelete, false, map[string]string{"passkey": "ok", "totp": "ok", "password": "strong_method"})
	byKey := core.WithAccessKey(core.WithUserID(ctx, id), core.AccessKeyIdentity{UserID: id, KeyID: 1})
	check(byKey, core.StepUpUserDelete, false, map[string]string{"passkey": "access_key", "totp": "ok", "password": "strong_method"})
}

func TestVerifyStepUpRefusesThePasswordWithTwoFactor(t *testing.T) {
	t.Parallel()
	e := setupAdmin(t)
	s := e.svc
	id := mustLogin(t, s, adminEmail, adminPassword).User.ID
	ctx := core.WithUserID(context.Background(), id)
	in := VerifyInput{Scope: core.StepUpUserDelete, Context: testOperation, Method: methodPassword, Password: adminPassword}
	if _, err := s.VerifyStepUp(ctx, nil, id, in, testIP); err != nil {
		t.Fatalf("password without a second factor: %v", err)
	}
	if _, err := s.VerifyStepUp(ctx, nil, id, VerifyInput{Scope: in.Scope, Context: in.Context, Method: methodPassword, Password: "wrong-password"}, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("wrong password: %v", err)
	}
	secret, _ := enableTwoFactor(t, s, id)
	clearLastStep(t, s, id)
	if _, err := s.VerifyStepUp(ctx, nil, id, in, testIP); !isCode(err, "invalid_argument") || !strings.Contains(fmt.Sprint(core.AsError(err).Details), "unavailable") {
		t.Fatalf("password with two-factor on: %v", err)
	}
	if _, err := s.VerifyStepUp(ctx, nil, id, VerifyInput{Scope: in.Scope, Context: in.Context, Method: methodTOTP, Code: "000000"}, testIP); !isBadSecondFactor(err) {
		t.Fatalf("wrong code: %v", err)
	}
	var failed int
	if err := s.db.Pool.QueryRow(ctx, `SELECT failed_attempts FROM user_totp WHERE user_id = $1`, id).Scan(&failed); err != nil || failed != 1 {
		t.Fatalf("a wrong code is not counted towards the lockout: %d %v", failed, err)
	}
	// The password-too scopes refuse a code without the password.
	if _, err := s.VerifyStepUp(ctx, nil, id, VerifyInput{Scope: core.StepUpSelfPassword, Context: in.Context, Method: methodTOTP, Code: codeAt(t, secret, time.Now())}, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("own password scope without the password: %v", err)
	}
	p, err := s.VerifyStepUp(ctx, nil, id, VerifyInput{Scope: in.Scope, Context: in.Context, Method: methodTOTP, Code: codeAt(t, secret, time.Now())}, testIP)
	if err != nil || p.Proof == "" || p.Scope != in.Scope || p.Context != in.Context || p.Method != methodTOTP || time.Until(p.ExpiresAt) > flowTTL {
		t.Fatalf("code: %+v %v", p, err)
	}
	if err := s.db.Pool.QueryRow(ctx, `SELECT failed_attempts FROM user_totp WHERE user_id = $1`, id).Scan(&failed); err != nil || failed != 0 {
		t.Fatalf("failed attempts after a good code: %d %v", failed, err)
	}
	var n int
	if err := s.db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE action = 'user.security_verify' AND user_id = $1 AND detail->>'scope' = $2`, id, in.Scope).Scan(&n); err != nil || n != 2 {
		t.Fatalf("audit rows: %d %v", n, err)
	}
}

// A proof works once, for its scope, operation, user and session or key,
// and for five minutes.
func TestConsumeStepUpBindings(t *testing.T) {
	t.Parallel()
	e := setupAdmin(t)
	s, base := e.svc, context.Background()
	id := mustLogin(t, s, adminEmail, adminPassword).User.ID
	other := mustCreateUser(t, s, "other@example.com")
	issue := func(ctx context.Context, userID int64, scope string) string {
		t.Helper()
		p, err := s.VerifyStepUp(core.WithUserID(ctx, userID), nil, userID, VerifyInput{Scope: scope, Context: testOperation, Method: methodPassword, Password: adminPassword}, testIP)
		if err != nil {
			t.Fatal(err)
		}
		return p.Proof
	}
	consume := func(ctx context.Context, userID int64, proof, operation, scope string) error {
		return s.ConsumeStepUp(core.WithStepUp(core.WithUserID(ctx, userID), proof, operation), scope)
	}
	session := core.WithSession(base, "family-1")

	proof := issue(session, id, core.StepUpUserDelete)
	if err := consume(session, id, proof, testOperation, core.StepUpUserDelete); err != nil {
		t.Fatalf("first use: %v", err)
	}
	if err := consume(session, id, proof, testOperation, core.StepUpUserDelete); !isVerificationRequired(err) {
		t.Fatalf("replay: %v", err)
	}
	// Bound to the scope, the operation, the session and the user; a proof
	// spent on the wrong one is gone (it was presented for something else).
	for name, try := range map[string]func(string) error{
		"another scope":     func(p string) error { return consume(session, id, p, testOperation, core.StepUpCredentialReveal) },
		"another operation": func(p string) error { return consume(session, id, p, "DELETE /api/v1/users/9", core.StepUpUserDelete) },
		"another session": func(p string) error {
			return consume(core.WithSession(base, "family-2"), id, p, testOperation, core.StepUpUserDelete)
		},
		"an access key": func(p string) error {
			byKey := core.WithAccessKey(base, core.AccessKeyIdentity{UserID: id, KeyID: 7})
			return consume(byKey, id, p, testOperation, core.StepUpUserDelete)
		},
		"another user": func(p string) error { return consume(session, other, p, testOperation, core.StepUpUserDelete) },
	} {
		p := issue(session, id, core.StepUpUserDelete)
		err := try(p)
		if !isVerificationRequired(err) {
			t.Fatalf("%s: %v", name, err)
		}
		details := core.AsError(err).Details
		if details["scope"] == nil || details["context"] == nil || details["methods"] == nil {
			t.Fatalf("%s: details %v", name, details)
		}
	}
	// A proof of the access key works only through that key.
	byKey := core.WithAccessKey(base, core.AccessKeyIdentity{UserID: id, KeyID: 7})
	if err := consume(byKey, id, issue(byKey, id, core.StepUpUserDelete), testOperation, core.StepUpUserDelete); err != nil {
		t.Fatalf("key's own proof: %v", err)
	}
	// Expired.
	proof = issue(session, id, core.StepUpUserDelete)
	if _, err := s.db.Pool.Exec(base, `UPDATE auth_flows SET expires_at = now() - interval '1 second' WHERE purpose = $1`, flowStepUpProof); err != nil {
		t.Fatal(err)
	}
	if err := consume(session, id, proof, testOperation, core.StepUpUserDelete); !isVerificationRequired(err) {
		t.Fatalf("expired: %v", err)
	}
	// No proof, and outside a console request.
	if err := consume(session, id, "", testOperation, core.StepUpUserDelete); !isVerificationRequired(err) {
		t.Fatalf("no proof: %v", err)
	}
	if err := s.ConsumeStepUp(core.WithUserID(base, id), core.StepUpUserDelete); !isVerificationRequired(err) {
		t.Fatalf("no request: %v", err)
	}
	// One request spends one proof; later checks of the same scope pass.
	ctx := core.WithStepUp(core.WithUserID(session, id), issue(session, id, core.StepUpUserDelete), testOperation)
	for range 2 {
		if err := s.ConsumeStepUp(ctx, core.StepUpUserDelete); err != nil {
			t.Fatal(err)
		}
	}
	if err := s.ConsumeStepUp(ctx, core.StepUpCredentialReveal); !isVerificationRequired(err) {
		t.Fatalf("another scope in the same request: %v", err)
	}
}

func TestStepUpWithPasskey(t *testing.T) {
	t.Parallel()
	e := setupAdmin(t)
	s := e.svc
	id := mustLogin(t, s, adminEmail, adminPassword).User.ID
	ctx := core.WithSession(core.WithUserID(context.Background(), id), "family-1")
	r := consoleRequest(consoleOrigin, consoleHost)
	a := newAuthenticator(t, consoleOrigin, consoleHost)
	if _, err := s.BeginStepUpPasskey(ctx, r, id, core.StepUpUserDelete, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("begin without a passkey: %v", err)
	}
	addPasskey(t, s, a, id)
	byKey := core.WithAccessKey(ctx, core.AccessKeyIdentity{UserID: id, KeyID: 3})
	if _, err := s.BeginStepUpPasskey(byKey, r, id, core.StepUpUserDelete, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("begin through an access key: %v", err)
	}
	begin, err := s.BeginStepUpPasskey(ctx, r, id, core.StepUpUserDelete, testIP)
	if err != nil {
		t.Fatal(err)
	}
	in := VerifyInput{Scope: core.StepUpUserDelete, Context: testOperation, Method: methodPasskey, FlowToken: begin.FlowToken, Credential: a.get(t, begin)}
	p, err := s.VerifyStepUp(ctx, r, id, in, testIP)
	if err != nil {
		t.Fatal(err)
	}
	if err := s.ConsumeStepUp(core.WithStepUp(ctx, p.Proof, testOperation), core.StepUpUserDelete); err != nil {
		t.Fatal(err)
	}
	// A refused assertion is a field error, not a 401 (the console would refresh the session).
	bad, err := s.BeginStepUpPasskey(ctx, r, id, core.StepUpUserDelete, testIP)
	if err != nil {
		t.Fatal(err)
	}
	badIn := VerifyInput{Scope: in.Scope, Context: in.Context, Method: methodPasskey, FlowToken: bad.FlowToken, Credential: json.RawMessage(`{"id":"x"}`)}
	if _, err := s.VerifyStepUp(ctx, r, id, badIn, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("refused assertion: %v", err)
	}
	// The ceremony is used up.
	in.Credential = a.get(t, begin)
	if _, err := s.VerifyStepUp(ctx, r, id, in, testIP); err == nil {
		t.Fatal("a ceremony verified twice")
	}
	// A passkey shuts the password out.
	if _, err := s.VerifyStepUp(ctx, r, id, VerifyInput{Scope: in.Scope, Context: in.Context, Method: methodPassword, Password: adminPassword}, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("password with a passkey: %v", err)
	}
}

func TestRenamePasskey(t *testing.T) {
	t.Parallel()
	k := newKeyEnv(t)
	login := mustLogin(t, k.s, adminEmail, adminPassword)
	p := addPasskey(t, k.s, newAuthenticator(t, consoleOrigin, consoleHost), login.User.ID)
	path := "/me/passkeys/" + strconv.FormatInt(p.ID, 10)
	if code, out := k.call(login.AccessToken, "PATCH", path, map[string]any{"name": " Phone "}); code != 200 || out["data"].(map[string]any)["name"] != "Phone" {
		t.Fatalf("rename: %d %v", code, out)
	}
	if code, out := k.call(mustLogin(t, k.s, "key-user@example.com", adminPassword).AccessToken, "PATCH", path, map[string]any{"name": "x"}); code != 404 {
		t.Fatalf("someone else's: %d %v", code, out)
	}
	if code, out := k.call(login.AccessToken, "PATCH", path, map[string]any{"name": strings.Repeat("x", 101)}); code != 400 {
		t.Fatalf("too long: %d %v", code, out)
	}
}

// 期 3 FU6's session-only rule became a step-up (期 4 S3): the super admin's
// access key changes its own account with the permission and a proof.
func TestSuperAdminKeyOnItsOwnAccountNeedsAProof(t *testing.T) {
	t.Parallel()
	k := newKeyEnv(t)
	root := mustLogin(t, k.s, adminEmail, adminPassword).User.ID
	path := "/users/" + strconv.FormatInt(root, 10)
	body := map[string]any{"display_name": "Root"}
	narrow := k.createKey(t, root, "user:read")
	if code, out := k.call(narrow.Key, "PATCH", path, body); code != 403 || errCode(out) != "permission_denied" {
		t.Fatalf("key without user:update: %d %v", code, out)
	}
	key := k.createKey(t, root, "user:read", "user:update")
	code, out := k.call(key.Key, "PATCH", path, body)
	if code != 403 || errCode(out) != "verification_required" || out["error"].(map[string]any)["details"].(map[string]any)["scope"] != core.StepUpSuperAdminIdentity {
		t.Fatalf("key without a proof: %d %v", code, out)
	}
	proof := k.proof(t, key.Key, core.StepUpSuperAdminIdentity, "PATCH", path, map[string]any{"method": "password", "password": adminPassword})
	if code, out := k.callProof(key.Key, proof, "PATCH", path, body); code != 200 {
		t.Fatalf("key with a proof: %d %v", code, out)
	}
	// Its own password: the password scope's proof covers the guard too.
	pw := map[string]any{"password": "root-password-9"}
	proof = k.proof(t, key.Key, core.StepUpSelfPassword, "PATCH", path, map[string]any{"method": "password", "password": adminPassword})
	if code, out := k.callProof(key.Key, proof, "PATCH", path, pw); code != 200 {
		t.Fatalf("own password through a key with a proof: %d %v", code, out)
	}
	mustLogin(t, k.s, adminEmail, "root-password-9")
	// A session needs no proof for its own profile.
	session := mustLogin(t, k.s, adminEmail, "root-password-9").AccessToken
	if code, out := k.call(session, "PATCH", path, body); code != 200 {
		t.Fatalf("session: %d %v", code, out)
	}
}

// The matrix of §80.2: a session, a key with the permission and a key
// without it, each with and without a proof, on a step-up route.
func TestStepUpMatrix(t *testing.T) {
	t.Parallel()
	k := newKeyEnv(t)
	login := mustLogin(t, k.s, adminEmail, adminPassword)
	withPerm := k.createKey(t, login.User.ID, "user:read", "user:delete").Key
	without := k.createKey(t, login.User.ID, "user:read").Key
	n := 0
	target := func() string {
		n++
		return "/users/" + strconv.FormatInt(mustCreateUser(t, k.s, "m"+strconv.Itoa(n)+"@example.com"), 10)
	}
	verify := func(token, path string) string {
		return k.proof(t, token, core.StepUpUserDelete, "DELETE", path, map[string]any{"method": "password", "password": adminPassword})
	}
	for _, tc := range []struct {
		name, token string
		proof       bool
		code        int
		err         string
	}{
		{"session, no proof", login.AccessToken, false, 403, "verification_required"},
		{"session, proof", login.AccessToken, true, 204, ""},
		{"key with the permission, no proof", withPerm, false, 403, "verification_required"},
		{"key with the permission, proof", withPerm, true, 204, ""},
		{"key without the permission, no proof", without, false, 403, "permission_denied"},
		{"key without the permission, proof", without, true, 403, "permission_denied"},
	} {
		path, proof := target(), ""
		if tc.proof {
			proof = verify(tc.token, path)
		}
		code, out := k.callProof(tc.token, proof, "DELETE", path, nil)
		if code != tc.code || (tc.err != "" && errCode(out) != tc.err) {
			t.Errorf("%s: %d %v, want %d %s", tc.name, code, out, tc.code, tc.err)
		}
	}
	// Cross-subject: a session's proof does not work through a key, nor one
	// for another target.
	path := target()
	if code, out := k.callProof(withPerm, verify(login.AccessToken, path), "DELETE", path, nil); code != 403 || errCode(out) != "verification_required" {
		t.Errorf("session proof through a key: %d %v", code, out)
	}
	if code, out := k.callProof(withPerm, verify(withPerm, target()), "DELETE", path, nil); code != 403 || errCode(out) != "verification_required" {
		t.Errorf("proof for another user: %d %v", code, out)
	}
}

// The super admin's own roles through an access key: the proof is spent
// before the role transaction (review fix).
func TestSuperAdminKeyOnItsOwnRolesNeedsAProof(t *testing.T) {
	t.Parallel()
	k := newKeyEnv(t)
	root := mustLogin(t, k.s, adminEmail, adminPassword).User.ID
	path := "/users/" + strconv.FormatInt(root, 10) + "/roles"
	// A key assigns no roles (it has no assignable list): the same roles.
	body := map[string]any{"role_keys": []string{"super_admin"}}
	key := k.createKey(t, root, "user:read", "role:assign")
	code, out := k.call(key.Key, "PUT", path, body)
	if code != 403 || errCode(out) != "verification_required" {
		t.Fatalf("key without a proof: %d %v", code, out)
	}
	proof := k.proof(t, key.Key, core.StepUpSuperAdminIdentity, "PUT", path, map[string]any{"method": "password", "password": adminPassword})
	if code, out := k.callProof(key.Key, proof, "PUT", path, body); code != 200 {
		t.Fatalf("key with a proof: %d %v", code, out)
	}
}

// Adding a second factor is a step-up operation (self.2fa.enable): a
// password alone must not enrol a TOTP that then passes every step-up of a
// passkey-only user. With no factor yet the proof takes the password.
func TestTwoFactorSetupNeedsAProof(t *testing.T) {
	t.Parallel()
	k := newKeyEnv(t)
	session := mustLogin(t, k.s, adminEmail, adminPassword).AccessToken
	const path = "/me/two-factor/setup"
	if code, out := k.call(session, "POST", path, nil); code != 403 || errCode(out) != "verification_required" {
		t.Fatalf("no proof: %d %v", code, out)
	}
	proof := k.proof(t, session, core.StepUpSelf2FAEnable, "POST", path, map[string]any{"method": "password", "password": adminPassword})
	if code, out := k.callProof(session, proof, "POST", path, nil); code != 200 {
		t.Fatalf("with a proof: %d %v", code, out)
	}
}

// The super admin removing the last of its strong factors (its own security
// reset, disabling two-factor without a passkey, deleting its only passkey
// without two-factor) gives the password with the factor, as the transfer
// does; the same operations of other users, or that leave a factor, do not.
func TestSuperAdminLastFactorTakesThePassword(t *testing.T) {
	t.Parallel()
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	root := mustLogin(t, s, adminEmail, adminPassword).User.ID
	if su, err := s.authz.IsSuperuser(ctx, s.db.Pool, root); err != nil || !su {
		t.Fatalf("the bootstrap admin is not the super admin: %v", err)
	}
	plain, err := s.CreateUser(ctx, 0, CreateUserInput{Email: "plain@example.com", Password: adminPassword})
	if err != nil {
		t.Fatal(err)
	}
	reset := func(id int64) string { return fmt.Sprintf("DELETE /api/v1/users/%d/security", id) }
	check := func(id int64, scope, operation string, want bool) {
		t.Helper()
		m, err := s.StepUpMethods(ctx, id, scope, operation)
		if err != nil || m.PasswordRequired != want {
			t.Fatalf("user %d %s %q: password_required=%v (%v), want %v", id, scope, operation, m != nil && m.PasswordRequired, err, want)
		}
	}
	secret, _ := enableTwoFactor(t, s, root)
	enableTwoFactor(t, s, plain.ID)
	// Two-factor only.
	check(root, core.StepUpSelf2FADisable, "POST /api/v1/me/two-factor/disable", true)
	check(root, core.StepUpUserSecurityReset, reset(root), true)
	check(root, core.StepUpUserSecurityReset, reset(plain.ID), false)
	// The id as the route reads it, however it is spelled.
	for _, id := range []string{"0" + fmt.Sprint(root), "+" + fmt.Sprint(root)} {
		check(root, core.StepUpUserSecurityReset, "DELETE /api/v1/users/"+id+"/security", true)
	}
	check(plain.ID, core.StepUpSelf2FADisable, "POST /api/v1/me/two-factor/disable", false)
	check(plain.ID, core.StepUpUserSecurityReset, reset(plain.ID), false)
	// A code alone is refused, with the password it issues a proof.
	clearLastStep(t, s, root)
	in := VerifyInput{Scope: core.StepUpSelf2FADisable, Context: "POST /api/v1/me/two-factor/disable", Method: methodTOTP, Code: codeAt(t, secret, time.Now())}
	if _, err := s.VerifyStepUp(core.WithUserID(ctx, root), nil, root, in, testIP); !isCode(err, "invalid_argument") {
		t.Fatalf("code without the password: %v", err)
	}
	in.Password = adminPassword
	if _, err := s.VerifyStepUp(core.WithUserID(ctx, root), nil, root, in, testIP); err != nil {
		t.Fatalf("code and password: %v", err)
	}

	// Two-factor and a passkey: dropping one leaves the other.
	addPasskey(t, s, newAuthenticator(t, consoleOrigin, consoleHost), root)
	check(root, core.StepUpSelf2FADisable, "POST /api/v1/me/two-factor/disable", false)
	// A proof issued then, without the password, is not enough once the
	// passkey is gone: the policy is applied again when it is spent.
	disable := "POST /api/v1/me/two-factor/disable"
	clearLastStep(t, s, root)
	p, err := s.VerifyStepUp(core.WithUserID(ctx, root), nil, root, VerifyInput{Scope: core.StepUpSelf2FADisable, Context: disable, Method: methodTOTP, Code: codeAt(t, secret, time.Now())}, testIP)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.db.Pool.Exec(ctx, `DELETE FROM user_passkeys WHERE user_id = $1`, root); err != nil {
		t.Fatal(err)
	}
	if err := s.ConsumeStepUp(core.WithStepUp(core.WithUserID(ctx, root), p.Proof, disable), core.StepUpSelf2FADisable); !isVerificationRequired(err) {
		t.Fatalf("a proof without the password after the last passkey went: %v", err)
	}
	addPasskey(t, s, newAuthenticator(t, consoleOrigin, consoleHost), root)
	check(root, core.StepUpSelfPasskeyDelete, "DELETE /api/v1/me/passkeys/1", false)
	check(root, core.StepUpUserSecurityReset, reset(root), true)
	// The only passkey, without two-factor.
	if _, err := s.db.Pool.Exec(ctx, `DELETE FROM user_totp WHERE user_id = $1`, root); err != nil {
		t.Fatal(err)
	}
	check(root, core.StepUpSelfPasskeyDelete, "DELETE /api/v1/me/passkeys/1", true)
	// The console asks with the operation (GET /me/verify/methods?context=).
	check(root, core.StepUpUserSecurityReset, "", false)
}

// Two removals spent at once, each leaving the other's factor when its proof
// was spent, cannot both go through: the removal checks the rule again with
// the user's row locked, unless its proof was issued with the password.
func TestSuperAdminConcurrentFactorRemovals(t *testing.T) {
	t.Parallel()
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	root := mustLogin(t, s, adminEmail, adminPassword).User.ID
	spent := func(scope, operation string, password bool) context.Context {
		c := core.WithStepUp(core.WithUserID(ctx, root), "spent", operation)
		core.MarkStepUpSpent(c, scope, password)
		return c
	}
	disable := "POST /api/v1/me/two-factor/disable"
	enableTwoFactor(t, s, root)
	// The passkey the proof counted on went meanwhile.
	if err := s.DisableTwoFactor(spent(core.StepUpSelf2FADisable, disable, false), root); !isVerificationRequired(err) {
		t.Fatalf("two-factor-only proof, no passkey left: %v", err)
	}
	if err := s.DisableTwoFactor(spent(core.StepUpSelf2FADisable, disable, true), root); err != nil {
		t.Fatalf("proof with the password: %v", err)
	}
	pk := addPasskey(t, s, newAuthenticator(t, consoleOrigin, consoleHost), root)
	del := fmt.Sprintf("DELETE /api/v1/me/passkeys/%d", pk.ID)
	if err := s.DeletePasskey(spent(core.StepUpSelfPasskeyDelete, del, false), root, pk.ID); !isVerificationRequired(err) {
		t.Fatalf("passkey-only proof for the last passkey: %v", err)
	}
	if err := s.DeletePasskey(spent(core.StepUpSelfPasskeyDelete, del, true), root, pk.ID); err != nil {
		t.Fatalf("proof with the password: %v", err)
	}

	// A proof issued with the password (asked for: two-factor is the last
	// factor) is spent without a second look.
	secret, _ := enableTwoFactor(t, s, root)
	clearLastStep(t, s, root)
	p, err := s.VerifyStepUp(core.WithUserID(ctx, root), nil, root, VerifyInput{Scope: core.StepUpSelf2FADisable, Context: disable, Method: methodTOTP, Code: codeAt(t, secret, time.Now()), Password: adminPassword}, testIP)
	if err != nil {
		t.Fatal(err)
	}
	spentCtx := core.WithStepUp(core.WithUserID(ctx, root), p.Proof, disable)
	if err := s.ConsumeStepUp(spentCtx, core.StepUpSelf2FADisable); err != nil || !core.StepUpPassword(spentCtx) {
		t.Fatalf("proof given with the password: %v", err)
	}
	if err := s.DisableTwoFactor(spentCtx, root); err != nil {
		t.Fatalf("disable with that proof: %v", err)
	}
}
