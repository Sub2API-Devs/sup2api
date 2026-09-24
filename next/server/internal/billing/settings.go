package billing

import (
	"context"
	"encoding/json"
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
	MissingPricePolicy string          `json:"missing_price_policy"`
	MinBalance         decimal.Decimal `json:"min_balance"`
	BigCostWarningUSD  decimal.Decimal `json:"big_cost_warning_usd"`
}

// DefaultSettings are used when the row is absent.
func DefaultSettings() Settings {
	return Settings{MissingPricePolicy: PolicyReject, MinBalance: decimal.Zero, BigCostWarningUSD: decimal.NewFromInt(10)}
}

type settingsSnapshot struct {
	at time.Time
	v  Settings
}

// Settings returns the cached billing settings.
func (s *Service) Settings(ctx context.Context) (Settings, error) {
	s.mu.Lock()
	snap := s.settings
	s.mu.Unlock()
	if snap != nil && time.Since(snap.at) < s.cacheTTL {
		return snap.v, nil
	}
	v, err := loadSettings(ctx, s.db.Pool)
	if err != nil {
		return DefaultSettings(), err
	}
	s.mu.Lock()
	s.settings = &settingsSnapshot{at: time.Now(), v: v}
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
		MissingPricePolicy *string          `json:"missing_price_policy"`
		MinBalance         *decimal.Decimal `json:"min_balance"`
		BigCostWarningUSD  *decimal.Decimal `json:"big_cost_warning_usd"`
	}
	if err := json.Unmarshal(raw, &partial); err != nil {
		return v, err
	}
	if partial.MissingPricePolicy != nil {
		v.MissingPricePolicy = *partial.MissingPricePolicy
	}
	if partial.MinBalance != nil {
		v.MinBalance = *partial.MinBalance
	}
	if partial.BigCostWarningUSD != nil {
		v.BigCostWarningUSD = *partial.BigCostWarningUSD
	}
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
	cur, err := loadSettings(ctx, s.db.Pool)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	var in struct {
		MissingPricePolicy *string          `json:"missing_price_policy"`
		MinBalance         *decimal.Decimal `json:"min_balance"`
		BigCostWarningUSD  *decimal.Decimal `json:"big_cost_warning_usd"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	var fields []core.FieldError
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
	if len(fields) > 0 {
		httpapi.Fail(c, core.InvalidFields(fields...))
		return
	}
	raw, _ := json.Marshal(cur)
	uid, _ := core.UserID(ctx)
	_, err = s.db.Pool.Exec(ctx, `
		INSERT INTO settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, now())
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
		settingsKey, raw, nullID(uid))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.changed(ctx, "settings.billing")
	httpapi.OK(c, cur)
}

func nullID(id int64) *int64 {
	if id <= 0 {
		return nil
	}
	return &id
}
