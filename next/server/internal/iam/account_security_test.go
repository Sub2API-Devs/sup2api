package iam

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/go-webauthn/webauthn/protocol/webauthncbor"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/hotp"
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
	if err := s.ChangePassword(ctx, id, adminPassword, "another-password-1"); err != nil {
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
	if err := s.ResetSecurity(ctx, root, root); err != nil {
		t.Fatal(err)
	}
	if st, _ := s.TwoFactor(ctx, root); st.Enabled {
		t.Fatal("still enabled after the reset")
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
