package billing

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Missing-price policies.
const (
	PolicyReject = "reject"
	PolicyFree   = "free"
)

const settingsKey = "billing"

// Settings is the "billing" row of the settings table (CONTRACTS §8).
type Settings struct {
	PreConsumeTokens    int64           `json:"pre_consume_tokens"`
	MissingPricePolicy  string          `json:"missing_price_policy"`
	MinBalance          decimal.Decimal `json:"min_balance"`
	BigCostWarningUSD   decimal.Decimal `json:"big_cost_warning_usd"`
	OutputReserveTokens int64           `json:"output_reserve_tokens"`
	MaxOverdraftPerUser decimal.Decimal `json:"max_overdraft_per_user"`
	// ClientDisconnectPolicy is what a request pays when its client hangs up
	// while the upstream is answering (CONTRACTS §25.8): the pre-charge
	// estimate, the real usage after reading the upstream to its end, or
	// nothing. ClientDisconnectWaitSeconds bounds that reading.
	ClientDisconnectPolicy      string `json:"client_disconnect_policy"`
	ClientDisconnectWaitSeconds int    `json:"client_disconnect_wait_seconds"`
}

// Accepted range and default of client_disconnect_wait_seconds.
const (
	minClientDisconnectWaitSeconds     = 5
	maxClientDisconnectWaitSeconds     = 1800
	defaultClientDisconnectWaitSeconds = 120
)

// normalizeClientDisconnect makes a stored document usable: a policy outside
// the accepted set becomes the default rather than one nobody chose, and the
// wait is brought into its range.
func (v *Settings) normalizeClientDisconnect() {
	if !validDisconnectPolicy(v.ClientDisconnectPolicy) {
		v.ClientDisconnectPolicy = DefaultSettings().ClientDisconnectPolicy
	}
	v.ClientDisconnectWaitSeconds = min(max(v.ClientDisconnectWaitSeconds, minClientDisconnectWaitSeconds), maxClientDisconnectWaitSeconds)
}

func validDisconnectPolicy(p string) bool {
	return p == core.DisconnectPrecharge || p == core.DisconnectContinue || p == core.DisconnectFree
}

// DefaultSettings are used when the row is absent.
func DefaultSettings() Settings {
	return Settings{
		PreConsumeTokens:            500,
		MissingPricePolicy:          PolicyReject,
		MinBalance:                  decimal.Zero,
		BigCostWarningUSD:           decimal.NewFromInt(10),
		OutputReserveTokens:         4000,
		MaxOverdraftPerUser:         decimal.NewFromInt(5),
		ClientDisconnectPolicy:      core.DisconnectContinue,
		ClientDisconnectWaitSeconds: defaultClientDisconnectWaitSeconds,
	}
}

type settingsSnapshot struct {
	at time.Time
	v  Settings
}

// Settings returns the cached billing settings.
func (s *Service) Settings(ctx context.Context) (Settings, error) {
	s.mu.Lock()
	snap := s.settings
	epoch := s.epoch
	s.mu.Unlock()
	if snap != nil && time.Since(snap.at) < s.cacheTTL {
		return snap.v, nil
	}
	v, err := loadSettings(ctx, s.db.Pool)
	if err != nil {
		return DefaultSettings(), err
	}
	s.mu.Lock()
	if s.epoch == epoch {
		s.settings = &settingsSnapshot{at: time.Now(), v: v}
	}
	s.mu.Unlock()
	return v, nil
}

func loadSettings(ctx context.Context, q store.Querier) (Settings, error) {
	v := DefaultSettings()
	var raw []byte
	err := q.QueryRow(ctx, `SELECT value FROM settings WHERE key = $1`, settingsKey).Scan(&raw)
	if store.IsNoRows(err) {
		return v, nil
	}
	if err != nil {
		return v, err
	}
	// Fields absent from the stored document keep their defaults.
	var partial struct {
		PreConsumeTokens            *int64           `json:"pre_consume_tokens"`
		MissingPricePolicy          *string          `json:"missing_price_policy"`
		MinBalance                  *decimal.Decimal `json:"min_balance"`
		BigCostWarningUSD           *decimal.Decimal `json:"big_cost_warning_usd"`
		OutputReserveTokens         *int64           `json:"output_reserve_tokens"`
		MaxOverdraftPerUser         *decimal.Decimal `json:"max_overdraft_per_user"`
		ClientDisconnectPolicy      *string          `json:"client_disconnect_policy"`
		ClientDisconnectWaitSeconds *int             `json:"client_disconnect_wait_seconds"`
	}
	if err := json.Unmarshal(raw, &partial); err != nil {
		return v, err
	}
	if partial.MissingPricePolicy != nil {
		v.MissingPricePolicy = *partial.MissingPricePolicy
	}
	if partial.PreConsumeTokens != nil {
		v.PreConsumeTokens = *partial.PreConsumeTokens
	}
	if partial.MinBalance != nil {
		v.MinBalance = *partial.MinBalance
	}
	if partial.BigCostWarningUSD != nil {
		v.BigCostWarningUSD = *partial.BigCostWarningUSD
	}
	if partial.OutputReserveTokens != nil {
		v.OutputReserveTokens = *partial.OutputReserveTokens
	}
	if partial.MaxOverdraftPerUser != nil {
		v.MaxOverdraftPerUser = *partial.MaxOverdraftPerUser
	}
	if partial.ClientDisconnectPolicy != nil {
		v.ClientDisconnectPolicy = *partial.ClientDisconnectPolicy
	}
	if partial.ClientDisconnectWaitSeconds != nil {
		v.ClientDisconnectWaitSeconds = *partial.ClientDisconnectWaitSeconds
	}
	v.normalizeClientDisconnect()
	return v, nil
}

func (s *Service) registerSettingsRoutes(r *httpapi.Router) {
	r.Perm("GET", "/settings/billing", "settings:read", s.getSettings)
	r.Perm("PUT", "/settings/billing", "settings:manage", s.putSettings)
}

func (s *Service) getSettings(c *gin.Context) {
	v, err := loadSettings(c.Request.Context(), s.db.Pool)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, v)
}

func (s *Service) putSettings(c *gin.Context) {
	ctx := c.Request.Context()
	cur := DefaultSettings()
	var in struct {
		PreConsumeTokens            *int64           `json:"pre_consume_tokens"`
		MissingPricePolicy          *string          `json:"missing_price_policy"`
		MinBalance                  *decimal.Decimal `json:"min_balance"`
		BigCostWarningUSD           *decimal.Decimal `json:"big_cost_warning_usd"`
		ClientDisconnectPolicy      *string          `json:"client_disconnect_policy"`
		ClientDisconnectWaitSeconds *int             `json:"client_disconnect_wait_seconds"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	var fields []core.FieldError
	if in.PreConsumeTokens != nil {
		if *in.PreConsumeTokens < 0 || *in.PreConsumeTokens > 100000000 {
			fields = append(fields, core.FieldError{Field: "pre_consume_tokens", Code: "invalid", Message: "must be an integer from 0 to 100000000"})
		}
		cur.PreConsumeTokens = *in.PreConsumeTokens
	}
	if in.MissingPricePolicy != nil {
		if p := *in.MissingPricePolicy; p != PolicyReject && p != PolicyFree {
			fields = append(fields, core.FieldError{Field: "missing_price_policy", Code: "invalid", Message: "must be reject or free"})
		}
		cur.MissingPricePolicy = *in.MissingPricePolicy
	}
	if in.MinBalance != nil {
		cur.MinBalance = *in.MinBalance
	}
	if in.BigCostWarningUSD != nil {
		if in.BigCostWarningUSD.Sign() <= 0 {
			fields = append(fields, core.FieldError{Field: "big_cost_warning_usd", Code: "invalid", Message: "must be positive"})
		}
		cur.BigCostWarningUSD = *in.BigCostWarningUSD
	}
	if in.ClientDisconnectPolicy != nil {
		if !validDisconnectPolicy(*in.ClientDisconnectPolicy) {
			fields = append(fields, core.FieldError{Field: "client_disconnect_policy", Code: "invalid", Message: "must be precharge, continue or free"})
		}
		cur.ClientDisconnectPolicy = *in.ClientDisconnectPolicy
	}
	if in.ClientDisconnectWaitSeconds != nil {
		if w := *in.ClientDisconnectWaitSeconds; w < minClientDisconnectWaitSeconds || w > maxClientDisconnectWaitSeconds {
			fields = append(fields, core.FieldError{Field: "client_disconnect_wait_seconds", Code: "invalid",
				Message: fmt.Sprintf("must be an integer from %d to %d", minClientDisconnectWaitSeconds, maxClientDisconnectWaitSeconds)})
		}
		cur.ClientDisconnectWaitSeconds = *in.ClientDisconnectWaitSeconds
	}
	if len(fields) > 0 {
		httpapi.Fail(c, core.InvalidFields(fields...))
		return
	}
	uid, _ := core.UserID(ctx)
	if err := store.PatchSettingJSON(ctx, s.db, settingsKey, nullID(uid), in, &cur); err != nil {
		httpapi.Fail(c, err)
		return
	}
	cur.normalizeClientDisconnect()
	s.changed(ctx, "settings.billing")
	httpapi.OK(c, cur)
}

func nullID(id int64) *int64 {
	if id <= 0 {
		return nil
	}
	return &id
}
