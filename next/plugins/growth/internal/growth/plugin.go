// Package growth implements the growth & engagement plugin: referral
// commission and daily check-in. Referral codes are generated for all users
// (user.created event); invitees' usage.recorded and balance.changed events
// trigger commission credited via ledger.credit. Check-in awards random quota
// once per day per user.
package growth

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"math/big"
	"strings"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

const JobCleanup = "cleanup"

// Plugin implements pluginsdk.App, pluginsdk.HTTP, pluginsdk.JobRunner and
// lifecycle interfaces.
type Plugin struct {
	*pluginsdk.Router

	host pluginsdk.Host
	log  *slog.Logger
	cfg  atomic.Pointer[config]

	bg     context.Context
	cancel context.CancelFunc
}

type config struct {
	ReferralEnabled       bool
	ReferralRatePercent   decimal.Decimal
	ReferralMaxPerInvitee decimal.Decimal // 0 = unlimited
	ReferralDurationDays  int             // 0 = no expiry
	CheckinEnabled        bool
	CheckinMinQuota       decimal.Decimal
	CheckinMaxQuota       decimal.Decimal
	CheckinTimezone       *time.Location
}

func New() *Plugin {
	p := &Plugin{Router: pluginsdk.NewRouter()}
	p.bg, p.cancel = context.WithCancel(context.Background())
	c := defaultConfig()
	p.cfg.Store(&c)
	p.routes()
	return p
}

func (p *Plugin) Init(_ context.Context, h pluginsdk.Host) error {
	p.host = h
	p.log = h.Logger()
	return nil
}

func (p *Plugin) Configure(_ context.Context, cfg pluginsdk.Config) error {
	var s Settings
	if err := cfg.Decode(&s); err != nil {
		return pluginsdk.FieldErrors{}.Add("", "invalid_json", "settings must be a JSON object").Err()
	}
	c, errs := compileSettings(s)
	if len(errs) > 0 {
		return errs.Err()
	}
	p.cfg.Store(&c)
	return nil
}

func (p *Plugin) Shutdown(context.Context) error {
	p.cancel()
	return nil
}

func (p *Plugin) db(ctx context.Context) (*pgxpool.Pool, error) {
	if p.host == nil {
		return nil, errors.New("growth: host not initialized")
	}
	pool, err := p.host.DB(ctx)
	if err != nil {
		return nil, fmt.Errorf("growth: database unavailable: %w", err)
	}
	return pool, nil
}

// ---------------------------------------------------------------- settings

type Settings struct {
	ReferralEnabled       bool    `json:"referral_enabled"`
	ReferralRatePercent   float64 `json:"referral_rate_percent"`
	ReferralMaxPerInvitee float64 `json:"referral_max_per_invitee"`
	ReferralDurationDays  int     `json:"referral_duration_days"`
	CheckinEnabled        bool    `json:"checkin_enabled"`
	CheckinMinQuota       float64 `json:"checkin_min_quota"`
	CheckinMaxQuota       float64 `json:"checkin_max_quota"`
	CheckinTimezone       string  `json:"checkin_timezone"`
}

func defaultConfig() config {
	return config{
		ReferralEnabled:       true,
		ReferralRatePercent:   decimal.NewFromInt(10),
		ReferralMaxPerInvitee: decimal.NewFromInt(100),
		ReferralDurationDays:  0,
		CheckinEnabled:        true,
		CheckinMinQuota:       decimal.NewFromFloat(0.01),
		CheckinMaxQuota:       decimal.NewFromFloat(0.05),
		CheckinTimezone:       time.UTC,
	}
}

func compileSettings(s Settings) (config, pluginsdk.FieldErrors) {
	var errs pluginsdk.FieldErrors
	c := config{
		ReferralEnabled:      s.ReferralEnabled,
		ReferralDurationDays: s.ReferralDurationDays,
		CheckinEnabled:       s.CheckinEnabled,
	}
	if s.ReferralRatePercent < 0 || s.ReferralRatePercent > 100 || math.IsNaN(s.ReferralRatePercent) || math.IsInf(s.ReferralRatePercent, 0) {
		errs = errs.Add("referral_rate_percent", "out_of_range", "must be 0-100")
	} else {
		c.ReferralRatePercent = decimal.NewFromFloat(s.ReferralRatePercent)
	}
	if s.ReferralMaxPerInvitee < 0 || math.IsNaN(s.ReferralMaxPerInvitee) || math.IsInf(s.ReferralMaxPerInvitee, 0) {
		errs = errs.Add("referral_max_per_invitee", "invalid", "must be >= 0")
	} else {
		c.ReferralMaxPerInvitee = decimal.NewFromFloat(s.ReferralMaxPerInvitee)
	}
	if s.ReferralDurationDays < 0 {
		errs = errs.Add("referral_duration_days", "invalid", "must be >= 0")
	}
	if s.CheckinMinQuota < 0 || math.IsNaN(s.CheckinMinQuota) || math.IsInf(s.CheckinMinQuota, 0) {
		errs = errs.Add("checkin_min_quota", "invalid", "must be >= 0")
	} else {
		c.CheckinMinQuota = decimal.NewFromFloat(s.CheckinMinQuota)
	}
	if s.CheckinMaxQuota < 0 || math.IsNaN(s.CheckinMaxQuota) || math.IsInf(s.CheckinMaxQuota, 0) {
		errs = errs.Add("checkin_max_quota", "invalid", "must be >= 0")
	} else {
		c.CheckinMaxQuota = decimal.NewFromFloat(s.CheckinMaxQuota)
	}
	if c.CheckinMaxQuota.LessThan(c.CheckinMinQuota) {
		errs = errs.Add("checkin_max_quota", "invalid", "must be >= checkin_min_quota")
	}
	tz := strings.TrimSpace(s.CheckinTimezone)
	if tz == "" {
		tz = "UTC"
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		errs = errs.Add("checkin_timezone", "invalid", "unknown timezone")
	} else {
		c.CheckinTimezone = loc
	}
	return c, errs
}

// ---------------------------------------------------------------- referral codes

// generateCode returns a random 8-character uppercase alphanumeric code.
func generateCode() (string, error) {
	b := make([]byte, 5)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return strings.ToUpper(base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b))[:8], nil
}

// ensureCode creates a referral code for userID if it doesn't exist.
func (p *Plugin) ensureCode(ctx context.Context, userID int64) (string, error) {
	db, err := p.db(ctx)
	if err != nil {
		return "", err
	}
	var code string
	err = db.QueryRow(ctx, `SELECT code FROM referral_codes WHERE user_id = $1`, userID).Scan(&code)
	if err == nil {
		return code, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}
	// Generate code and insert (conflict: query again).
	for i := 0; i < 10; i++ {
		code, err = generateCode()
		if err != nil {
			return "", err
		}
		_, err = db.Exec(ctx, `INSERT INTO referral_codes (user_id, code) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`, userID, code)
		if err == nil {
			return code, nil
		}
		if strings.Contains(err.Error(), "referral_codes_code_key") {
			continue // collision, retry
		}
		return "", err
	}
	// Fallback: query existing.
	err = db.QueryRow(ctx, `SELECT code FROM referral_codes WHERE user_id = $1`, userID).Scan(&code)
	return code, err
}

// bindInviter sets the inviter for userID (idempotent, only works when inviter_user_id is NULL).
func (p *Plugin) bindInviter(ctx context.Context, userID int64, code string) error {
	code = strings.ToUpper(strings.TrimSpace(code))
	if code == "" || len(code) > 32 {
		return errors.New("invalid code")
	}
	db, err := p.db(ctx)
	if err != nil {
		return err
	}
	var inviterID int64
	var inviterInviter *int64
	err = db.QueryRow(ctx, `SELECT user_id, inviter_user_id FROM referral_codes WHERE code = $1`, code).Scan(&inviterID, &inviterInviter)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("code not found")
		}
		return err
	}
	if inviterID == userID {
		return errors.New("cannot refer yourself")
	}
	// Two users inviting each other would pay each other commission.
	if inviterInviter != nil && *inviterInviter == userID {
		return errors.New("cannot bind to a user you invited")
	}
	// Users created before the plugin was enabled have no row until they
	// open their referral page; without one the update below matches nothing.
	if _, err := p.ensureCode(ctx, userID); err != nil {
		return err
	}
	tag, err := db.Exec(ctx, `UPDATE referral_codes SET inviter_user_id = $2, bound_at = now() WHERE user_id = $1 AND inviter_user_id IS NULL`, userID, inviterID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("already bound")
	}
	return nil
}

// ---------------------------------------------------------------- commission

// recordCommission credits commission to inviter if conditions are met.
// Idempotent on eventType+eventID.
func (p *Plugin) recordCommission(ctx context.Context, inviteeUserID int64, eventType string, eventID int64, baseAmount decimal.Decimal) error {
	if inviteeUserID <= 0 || eventID <= 0 || baseAmount.Sign() <= 0 {
		return nil
	}
	cfg := p.cfg.Load()
	if !cfg.ReferralEnabled || cfg.ReferralRatePercent.Sign() <= 0 {
		return nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return err
	}
	// Check if already processed.
	var exists bool
	err = db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM commissions WHERE event_type = $1 AND event_id = $2)`, eventType, eventID).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	// Load inviter and check duration.
	var inviterID int64
	var boundAt time.Time
	err = db.QueryRow(ctx, `SELECT inviter_user_id, bound_at FROM referral_codes WHERE user_id = $1 AND inviter_user_id IS NOT NULL`, inviteeUserID).Scan(&inviterID, &boundAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil // not invited
		}
		return err
	}
	if cfg.ReferralDurationDays > 0 {
		if time.Now().After(boundAt.AddDate(0, 0, cfg.ReferralDurationDays)) {
			return nil // expired
		}
	}
	// Check per-invitee cap.
	if cfg.ReferralMaxPerInvitee.Sign() > 0 {
		var existing decimal.Decimal
		err = db.QueryRow(ctx, `SELECT COALESCE(SUM(commission), 0) FROM commissions WHERE inviter_user_id = $1 AND invitee_user_id = $2`, inviterID, inviteeUserID).Scan(&existing)
		if err != nil {
			return err
		}
		if existing.GreaterThanOrEqual(cfg.ReferralMaxPerInvitee) {
			return nil // cap reached
		}
	}
	commission := baseAmount.Mul(cfg.ReferralRatePercent).Div(decimal.NewFromInt(100)).Round(8)
	if commission.Sign() <= 0 {
		return nil
	}
	// Apply cap.
	if cfg.ReferralMaxPerInvitee.Sign() > 0 {
		var existing decimal.Decimal
		if err := db.QueryRow(ctx, `SELECT COALESCE(SUM(commission), 0) FROM commissions WHERE inviter_user_id = $1 AND invitee_user_id = $2`, inviterID, inviteeUserID).Scan(&existing); err != nil {
			return err
		}
		remaining := cfg.ReferralMaxPerInvitee.Sub(existing)
		if commission.GreaterThan(remaining) {
			commission = remaining.Round(8)
		}
		if commission.Sign() <= 0 {
			return nil
		}
	}
	// Credit via ledger.
	idemKey := fmt.Sprintf("commission:%s:%d", eventType, eventID)
	res, err := p.host.LedgerCredit(ctx, pluginsdk.LedgerChange{
		UserID:         inviterID,
		Amount:         commission.StringFixed(8),
		IdempotencyKey: idemKey,
		RefType:        "referral",
		RefID:          fmt.Sprintf("%d", eventID),
		Note:           fmt.Sprintf("Referral commission from user %d (%s %d)", inviteeUserID, eventType, eventID),
	})
	if err != nil {
		return err
	}
	// Record commission. A duplicate means an earlier attempt credited the
	// ledger and failed before this insert: record it now, or the
	// per-invitee cap would not count it.
	_, err = db.Exec(ctx, `INSERT INTO commissions (inviter_user_id, invitee_user_id, event_type, event_id, base_amount, rate_percent, commission, ledger_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (ledger_id) DO NOTHING`,
		inviterID, inviteeUserID, eventType, eventID, baseAmount, cfg.ReferralRatePercent, commission, res.LedgerID)
	return err
}

// ---------------------------------------------------------------- check-in

// doCheckin performs daily check-in for userID.
func (p *Plugin) doCheckin(ctx context.Context, userID int64) (*CheckinResult, error) {
	cfg := p.cfg.Load()
	if !cfg.CheckinEnabled {
		return nil, errors.New("check-in not enabled")
	}
	db, err := p.db(ctx)
	if err != nil {
		return nil, err
	}
	now := time.Now().In(cfg.CheckinTimezone)
	today := now.Format("2006-01-02")
	// Check if already checked in today.
	var exists bool
	err = db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM checkins WHERE user_id = $1 AND checkin_date = $2)`, userID, today).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("already checked in today")
	}
	// Random quota between min and max.
	quota := cfg.CheckinMinQuota
	if cfg.CheckinMaxQuota.GreaterThan(cfg.CheckinMinQuota) {
		diff := cfg.CheckinMaxQuota.Sub(cfg.CheckinMinQuota)
		diffFloat, _ := diff.Float64()
		randFloat := randFloat64() * diffFloat
		quota = quota.Add(decimal.NewFromFloat(randFloat)).Round(8)
	}
	if quota.Sign() <= 0 {
		return nil, errors.New("invalid quota range")
	}
	// Credit via ledger.
	idemKey := fmt.Sprintf("checkin:%d:%s", userID, today)
	res, err := p.host.LedgerCredit(ctx, pluginsdk.LedgerChange{
		UserID:         userID,
		Amount:         quota.StringFixed(8),
		IdempotencyKey: idemKey,
		RefType:        "checkin",
		RefID:          today,
		Note:           fmt.Sprintf("Daily check-in %s", today),
	})
	if err != nil {
		return nil, err
	}
	if res.Duplicate {
		return nil, errors.New("already checked in today")
	}
	// Record check-in.
	var id int64
	err = db.QueryRow(ctx, `INSERT INTO checkins (user_id, checkin_date, quota_awarded, ledger_id)
		VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, checkin_date) DO NOTHING RETURNING id`,
		userID, today, quota, res.LedgerID).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("already checked in today")
		}
		return nil, err
	}
	return &CheckinResult{QuotaAwarded: quota, CheckinDate: today}, nil
}

type CheckinResult struct {
	QuotaAwarded decimal.Decimal
	CheckinDate  string
}

func randFloat64() float64 {
	n, _ := rand.Int(rand.Reader, big.NewInt(1<<53))
	return float64(n.Int64()) / float64(1<<53)
}
