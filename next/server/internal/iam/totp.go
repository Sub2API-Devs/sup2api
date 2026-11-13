package iam

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"image/png"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/hotp"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

const (
	totpPeriod        = 30
	totpSkewSteps     = 1 // one step either side, for a clock that is off
	totpMaxFailures   = 5
	totpLockout       = 5 * time.Minute
	backupCodeCount   = 10
	backupCodeLetters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O, 1/I
	totpIssuer        = "sup2api"
)

var errBadSecondFactor = core.InvalidFields(core.FieldError{Field: "code", Code: "incorrect", Message: "incorrect verification code"})

// TwoFactorStatus is the response of GET /me/two-factor.
type TwoFactorStatus struct {
	Enabled         bool       `json:"enabled"`
	EnabledAt       *time.Time `json:"enabled_at,omitempty"`
	BackupCodesLeft int        `json:"backup_codes_left"`
}

// TwoFactorSetup is the response of POST /me/two-factor/setup.
type TwoFactorSetup struct {
	FlowToken  string `json:"flow_token"`
	ExpiresIn  int64  `json:"expires_in"`
	Secret     string `json:"secret"`
	OTPAuthURL string `json:"otpauth_url"`
	QRCode     string `json:"qr_code"` // data URL of a PNG
}

func totpAAD(userID int64) []byte { return []byte("user_totp:" + strconv.FormatInt(userID, 10)) }

func (s *Service) sealTOTP(userID int64, secret string) ([]byte, error) {
	if s.cipher == nil {
		return nil, core.ErrInternal.WithMessage("two-factor authentication needs the master key")
	}
	return s.cipher.Encrypt([]byte(secret), totpAAD(userID))
}

func (s *Service) openTOTP(userID int64, sealed []byte) (string, error) {
	if s.cipher == nil {
		return "", core.ErrInternal.WithMessage("two-factor authentication needs the master key")
	}
	plain, err := s.cipher.Decrypt(sealed, totpAAD(userID))
	if err != nil {
		return "", err
	}
	return string(plain), nil
}

// totpMatch returns the time step the code is valid for and newer than
// lastStep. The steps are checked oldest first, so a code cannot be replayed
// by moving forward within the skew.
func totpMatch(secret, code string, lastStep int64, now time.Time) (int64, bool) {
	code = strings.ReplaceAll(strings.TrimSpace(code), " ", "")
	if len(code) != 6 {
		return 0, false
	}
	current := now.Unix() / totpPeriod
	for step := current - totpSkewSteps; step <= current+totpSkewSteps; step++ {
		if step <= lastStep {
			continue
		}
		want, err := hotp.GenerateCodeCustom(secret, uint64(step), hotp.ValidateOpts{Digits: otp.DigitsSix, Algorithm: otp.AlgorithmSHA1})
		if err != nil {
			return 0, false
		}
		if subtle.ConstantTimeCompare([]byte(want), []byte(code)) == 1 {
			return step, true
		}
	}
	return 0, false
}

// normalizeBackupCode accepts a code typed with or without its dash, any case.
func normalizeBackupCode(code string) string {
	return strings.ToUpper(strings.NewReplacer("-", "", " ", "").Replace(code))
}

func newBackupCode() (string, error) {
	var b [10]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = backupCodeLetters[int(b[i])%len(backupCodeLetters)]
	}
	return string(b[:5]) + "-" + string(b[5:]), nil
}

// issueBackupCodes replaces the user's backup codes and returns the new ones,
// which are shown once and kept only as hashes.
func (s *Service) issueBackupCodes(ctx context.Context, tx pgx.Tx, userID int64) ([]string, error) {
	if _, err := tx.Exec(ctx, `DELETE FROM user_totp_backup_codes WHERE user_id = $1`, userID); err != nil {
		return nil, err
	}
	codes := make([]string, backupCodeCount)
	for i := range codes {
		code, err := newBackupCode()
		if err != nil {
			return nil, err
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(normalizeBackupCode(code)), s.cost)
		if err != nil {
			return nil, err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO user_totp_backup_codes (user_id, code_hash) VALUES ($1, $2)`, userID, string(hash)); err != nil {
			return nil, err
		}
		codes[i] = code
	}
	return codes, nil
}

// checkSecondFactor verifies a TOTP or backup code inside tx, which must hold
// the user row. A correct code is used up. Failures count towards a lockout
// and are written by the caller with recordSecondFactorFailure, after the
// transaction, so they survive its rollback.
func (s *Service) checkSecondFactor(ctx context.Context, tx pgx.Tx, userID int64, code string) error {
	var sealed []byte
	var lastStep int64
	var lockedUntil *time.Time
	err := tx.QueryRow(ctx, `SELECT secret_enc, last_step, locked_until FROM user_totp WHERE user_id = $1 FOR UPDATE`, userID).Scan(&sealed, &lastStep, &lockedUntil)
	if store.IsNoRows(err) {
		return core.ErrConflict.WithMessage("two-factor authentication is not enabled")
	}
	if err != nil {
		return err
	}
	if lockedUntil != nil && lockedUntil.After(time.Now()) {
		return rateLimitedError(ctx, time.Until(*lockedUntil))
	}
	secret, err := s.openTOTP(userID, sealed)
	if err != nil {
		return err
	}
	if step, ok := totpMatch(secret, code, lastStep, time.Now()); ok {
		_, err := tx.Exec(ctx, `UPDATE user_totp SET last_step = $2, failed_attempts = 0, locked_until = NULL WHERE user_id = $1`, userID, step)
		return err
	}
	normalized := normalizeBackupCode(code)
	if len(normalized) == 10 {
		rows, err := tx.Query(ctx, `SELECT id, code_hash FROM user_totp_backup_codes WHERE user_id = $1 AND used_at IS NULL`, userID)
		if err != nil {
			return err
		}
		var matched int64
		for rows.Next() {
			var id int64
			var hash string
			if err := rows.Scan(&id, &hash); err != nil {
				rows.Close()
				return err
			}
			if matched == 0 && bcrypt.CompareHashAndPassword([]byte(hash), []byte(normalized)) == nil {
				matched = id
			}
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return err
		}
		if matched != 0 {
			if _, err := tx.Exec(ctx, `UPDATE user_totp_backup_codes SET used_at = now() WHERE id = $1`, matched); err != nil {
				return err
			}
			_, err := tx.Exec(ctx, `UPDATE user_totp SET failed_attempts = 0, locked_until = NULL WHERE user_id = $1`, userID)
			return err
		}
	}
	return errBadSecondFactor
}

// recordSecondFactorFailure counts a wrong code; the fifth locks the factor
// for five minutes. It runs outside the transaction the check failed in.
func (s *Service) recordSecondFactorFailure(ctx context.Context, userID int64) error {
	_, err := s.db.Pool.Exec(ctx, `UPDATE user_totp SET
		failed_attempts = CASE WHEN failed_attempts + 1 >= $2 THEN 0 ELSE failed_attempts + 1 END,
		locked_until = CASE WHEN failed_attempts + 1 >= $2 THEN $3::timestamptz ELSE locked_until END
		WHERE user_id = $1`, userID, totpMaxFailures, time.Now().Add(totpLockout))
	return err
}

// TwoFactor returns the caller's two-factor state.
func (s *Service) TwoFactor(ctx context.Context, userID int64) (*TwoFactorStatus, error) {
	var at time.Time
	err := s.db.Pool.QueryRow(ctx, `SELECT enabled_at FROM user_totp WHERE user_id = $1`, userID).Scan(&at)
	if store.IsNoRows(err) {
		return &TwoFactorStatus{}, nil
	}
	if err != nil {
		return nil, err
	}
	st := &TwoFactorStatus{Enabled: true, EnabledAt: &at}
	err = s.db.Pool.QueryRow(ctx, `SELECT count(*) FROM user_totp_backup_codes WHERE user_id = $1 AND used_at IS NULL`, userID).Scan(&st.BackupCodesLeft)
	return st, err
}

type totpSetupPayload struct {
	Sealed string `json:"sealed"`
}

// StartTwoFactor checks the password and starts enrolment: the secret stays in
// a flow until a code from it proves the authenticator app has it.
func (s *Service) StartTwoFactor(ctx context.Context, userID int64, password, ip string) (*TwoFactorSetup, error) {
	email, err := s.confirmPassword(ctx, userID, password, ip)
	if err != nil {
		return nil, err
	}
	var enabled bool
	if err := s.db.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM user_totp WHERE user_id = $1)`, userID).Scan(&enabled); err != nil {
		return nil, err
	}
	if enabled {
		return nil, core.ErrConflict.WithMessage("two-factor authentication is already enabled")
	}
	key, err := totp.Generate(totp.GenerateOpts{Issuer: totpIssuer, AccountName: email, Period: totpPeriod, Digits: otp.DigitsSix, Algorithm: otp.AlgorithmSHA1})
	if err != nil {
		return nil, err
	}
	sealed, err := s.sealTOTP(userID, key.Secret())
	if err != nil {
		return nil, err
	}
	token, err := s.createFlow(ctx, flowTOTPSetup, userID, totpSetupPayload{Sealed: base64.StdEncoding.EncodeToString(sealed)})
	if err != nil {
		return nil, err
	}
	img, err := key.Image(240, 240)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return &TwoFactorSetup{
		FlowToken: token, ExpiresIn: flowTTLSeconds, Secret: key.Secret(), OTPAuthURL: key.URL(),
		QRCode: "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes()),
	}, nil
}

// EnableTwoFactor finishes enrolment with a code from the new secret and
// returns the backup codes. A wrong code keeps the flow, so it can be retyped
// until the flow expires.
func (s *Service) EnableTwoFactor(ctx context.Context, userID int64, flowToken, code string) ([]string, error) {
	var payload totpSetupPayload
	var raw []byte
	err := s.db.Pool.QueryRow(ctx, `SELECT payload FROM auth_flows WHERE token_hash = $1 AND purpose = $2 AND user_id = $3 AND expires_at > now()`,
		hashToken(flowToken), flowTOTPSetup, userID).Scan(&raw)
	if store.IsNoRows(err) {
		return nil, errFlowExpired
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, err
	}
	sealed, err := base64.StdEncoding.DecodeString(payload.Sealed)
	if err != nil {
		return nil, err
	}
	secret, err := s.openTOTP(userID, sealed)
	if err != nil {
		return nil, err
	}
	step, ok := totpMatch(secret, code, 0, time.Now())
	if !ok {
		return nil, errBadSecondFactor
	}
	var codes []string
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		if err := lockRefreshUser(ctx, tx, userID); err != nil {
			return err
		}
		tag, err := tx.Exec(ctx, `INSERT INTO user_totp (user_id, secret_enc, last_step) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING`, userID, sealed, step)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return core.ErrConflict.WithMessage("two-factor authentication is already enabled")
		}
		var out totpSetupPayload
		if _, err := s.takeFlow(ctx, tx, flowToken, flowTOTPSetup, userID, &out); err != nil {
			return err
		}
		if codes, err = s.issueBackupCodes(ctx, tx, userID); err != nil {
			return err
		}
		return audit.Audit(ctx, tx, userID, "user.two_factor.enable", "user", strconv.FormatInt(userID, 10), nil)
	})
	if err != nil {
		return nil, err
	}
	return codes, nil
}

// withConfirmedFactors runs fn after checking the password and a second factor,
// for the changes that weaken or replace the factor.
func (s *Service) withConfirmedFactors(ctx context.Context, userID int64, password, code, ip string, fn func(tx pgx.Tx) error) error {
	if _, err := s.confirmPassword(ctx, userID, password, ip); err != nil {
		return err
	}
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		if err := lockRefreshUser(ctx, tx, userID); err != nil {
			return err
		}
		if err := s.checkSecondFactor(ctx, tx, userID, code); err != nil {
			return err
		}
		return fn(tx)
	})
	if isBadSecondFactor(err) {
		if ferr := s.recordSecondFactorFailure(ctx, userID); ferr != nil {
			return ferr
		}
	}
	return err
}

// DisableTwoFactor turns the factor off after the password and a code.
func (s *Service) DisableTwoFactor(ctx context.Context, userID int64, password, code, ip string) error {
	return s.withConfirmedFactors(ctx, userID, password, code, ip, func(tx pgx.Tx) error {
		if err := removeTwoFactor(ctx, tx, userID); err != nil {
			return err
		}
		return audit.Audit(ctx, tx, userID, "user.two_factor.disable", "user", strconv.FormatInt(userID, 10), nil)
	})
}

// RegenerateBackupCodes replaces the backup codes after the password and a code.
func (s *Service) RegenerateBackupCodes(ctx context.Context, userID int64, password, code, ip string) ([]string, error) {
	var codes []string
	err := s.withConfirmedFactors(ctx, userID, password, code, ip, func(tx pgx.Tx) error {
		var err error
		if codes, err = s.issueBackupCodes(ctx, tx, userID); err != nil {
			return err
		}
		return audit.Audit(ctx, tx, userID, "user.two_factor.backup_codes", "user", strconv.FormatInt(userID, 10), nil)
	})
	return codes, err
}

func removeTwoFactor(ctx context.Context, tx pgx.Tx, userID int64) error {
	if _, err := tx.Exec(ctx, `DELETE FROM user_totp_backup_codes WHERE user_id = $1`, userID); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `DELETE FROM user_totp WHERE user_id = $1`, userID)
	return err
}

// ResetSecurity is the operator's way back in for a user who lost their
// factors: it removes the user's two-factor and passkeys, only of a user the
// operator manages (authz.CanActOnUsers; oneself only as the super admin,
// FU6); the super admin resetting its own factors proves them first
// (confirm, under the login rate limit for ip).
func (s *Service) ResetSecurity(ctx context.Context, actorID, targetID int64, confirm SelfConfirmation, ip string) error {
	// SEC-H2: removing the factors of a user one does not manage would leave
	// that account one password away from takeover. (No access key gets here
	// over HTTP: the route's permission is session only.)
	if err := s.authz.CanActOnUser(ctx, actorID, core.ActOnIdentity, targetID); err != nil {
		return err
	}
	// SEC-H3: one's own factors go only with proof of them, as on
	// /me/two-factor/disable; a user who lost them needs an operator.
	if actorID == targetID {
		if err := s.confirmSelf(ctx, targetID, confirm, ip); err != nil {
			return err
		}
	}
	return s.db.Tx(ctx, func(tx pgx.Tx) error {
		if err := lockRefreshUser(ctx, tx, targetID); err != nil {
			return err
		}
		if err := removeTwoFactor(ctx, tx, targetID); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM user_passkeys WHERE user_id = $1`, targetID); err != nil {
			return err
		}
		return audit.Audit(ctx, tx, actorID, "user.security.reset", "user", strconv.FormatInt(targetID, 10), nil)
	})
}

// confirmPassword checks the caller's password for a sensitive change, under
// the login rate limit, and returns the caller's email.
func (s *Service) confirmPassword(ctx context.Context, userID int64, password, ip string) (string, error) {
	var email, hash string
	err := s.db.Pool.QueryRow(ctx, `SELECT email, password_hash FROM users WHERE id = $1 AND deleted_at IS NULL`, userID).Scan(&email, &hash)
	if store.IsNoRows(err) {
		return "", core.ErrUnauthenticated
	}
	if err != nil {
		return "", err
	}
	if wait := s.limiter.check(ctx, email, ip); wait > 0 {
		return "", rateLimitedError(ctx, wait)
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		s.limiter.fail(ctx, email, ip)
		return "", core.InvalidFields(core.FieldError{Field: "password", Code: "incorrect", Message: "incorrect password"})
	}
	return email, nil
}

func isBadSecondFactor(err error) bool { return errors.Is(err, errBadSecondFactor) }
