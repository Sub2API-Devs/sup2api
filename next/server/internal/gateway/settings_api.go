package gateway

import (
	"context"
	"fmt"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// gatewaySettingsStore persists the "gateway" settings row; replaced by a
// fake in tests.
type gatewaySettingsStore interface {
	load(ctx context.Context) (GatewaySettings, error)
	save(ctx context.Context, v GatewaySettings, updatedBy int64) error
}

type dbGatewaySettings struct{ db *store.DB }

func (s dbGatewaySettings) load(ctx context.Context) (GatewaySettings, error) {
	if s.db == nil {
		return GatewaySettings{}, core.ErrUnavailable
	}
	return loadGatewaySettings(ctx, s.db.Pool)
}

func (s dbGatewaySettings) save(ctx context.Context, v GatewaySettings, updatedBy int64) error {
	if s.db == nil {
		return core.ErrUnavailable
	}
	_, err := s.db.Pool.Exec(ctx, `
		INSERT INTO settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, now())
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
		settingsKeyGateway, mustJSON(v), nullID(updatedBy))
	return err
}

// gatewaySettingsInput is the PUT /settings/gateway body; nil fields keep
// their current value.
type gatewaySettingsInput struct {
	MaxAttempts           *int `json:"max_attempts"`
	PlatformCallTimeoutMs *int `json:"platform_call_timeout_ms"`
	DefaultHookTimeoutMs  *int `json:"default_hook_timeout_ms"`
}

// validate checks the provided fields against the accepted ranges
// (CONTRACTS §14.4); messages follow the request locale.
func (in *gatewaySettingsInput) validate(ctx context.Context) []core.FieldError {
	zh := core.Locale(ctx) == "zh"
	var fe []core.FieldError
	check := func(field string, v *int, lo, hi int) {
		if v == nil || (*v >= lo && *v <= hi) {
			return
		}
		msg := fmt.Sprintf("must be between %d and %d", lo, hi)
		if zh {
			msg = fmt.Sprintf("取值范围为 %d 到 %d", lo, hi)
		}
		fe = append(fe, core.FieldError{Field: field, Code: "out_of_range", Message: msg})
	}
	check("max_attempts", in.MaxAttempts, minMaxAttempts, maxMaxAttempts)
	check("platform_call_timeout_ms", in.PlatformCallTimeoutMs, minPlatformCallTimeoutMs, maxPlatformCallTimeoutMs)
	check("default_hook_timeout_ms", in.DefaultHookTimeoutMs, minDefaultHookTimeoutMs, maxDefaultHookTimeoutMs)
	return fe
}

func (in *gatewaySettingsInput) applyTo(v *GatewaySettings) {
	if in.MaxAttempts != nil {
		v.MaxAttempts = *in.MaxAttempts
	}
	if in.PlatformCallTimeoutMs != nil {
		v.PlatformCallTimeoutMs = *in.PlatformCallTimeoutMs
	}
	if in.DefaultHookTimeoutMs != nil {
		v.DefaultHookTimeoutMs = *in.DefaultHookTimeoutMs
	}
}

// getGatewaySettingsHandler returns the effective gateway settings
// (defaults for missing fields).
func (g *Gateway) getGatewaySettingsHandler(c *gin.Context) {
	v, err := g.gwStore.load(c.Request.Context())
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, v.normalized())
}

// putGatewaySettingsHandler updates the provided fields, then invalidates
// the local settings cache and broadcasts config:changed.
func (g *Gateway) putGatewaySettingsHandler(c *gin.Context) {
	ctx := c.Request.Context()
	var in gatewaySettingsInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if fe := in.validate(ctx); len(fe) > 0 {
		httpapi.Fail(c, core.InvalidFields(fe...))
		return
	}
	cur, err := g.gwStore.load(ctx)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	cur = cur.normalized()
	in.applyTo(&cur)
	uid, _ := core.UserID(ctx)
	if err := g.gwStore.save(ctx, cur, uid); err != nil {
		httpapi.Fail(c, err)
		return
	}
	g.changed(ctx, "settings.gateway")
	httpapi.OK(c, cur)
}
