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
	update(ctx context.Context, in gatewaySettingsInput, updatedBy int64) (GatewaySettings, error)
}

type dbGatewaySettings struct{ db *store.DB }

func (s dbGatewaySettings) load(ctx context.Context) (GatewaySettings, error) {
	if s.db == nil {
		return GatewaySettings{}, core.ErrUnavailable
	}
	return loadGatewaySettings(ctx, s.db.Pool)
}

func (s dbGatewaySettings) update(ctx context.Context, in gatewaySettingsInput, updatedBy int64) (GatewaySettings, error) {
	v := defaultGatewaySettings()
	if s.db == nil {
		return v, core.ErrUnavailable
	}
	err := store.PatchSettingJSON(ctx, s.db, settingsKeyGateway, nullID(updatedBy), in, &v)
	return v.normalized(), err
}

// gatewaySettingsInput is the PUT /settings/gateway body; nil fields keep
// their current value.
type gatewaySettingsInput struct {
	MaxAttempts              *int `json:"max_attempts"`
	PlatformCallTimeoutMs    *int `json:"platform_call_timeout_ms"`
	DefaultHookTimeoutMs     *int `json:"default_hook_timeout_ms"`
	PlatformHotpathTimeoutMs *int `json:"platform_hotpath_timeout_ms"`
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
	check("platform_hotpath_timeout_ms", in.PlatformHotpathTimeoutMs, minPlatformHotpathTimeoutMs, maxPlatformHotpathTimeoutMs)
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
	if in.PlatformHotpathTimeoutMs != nil {
		v.PlatformHotpathTimeoutMs = *in.PlatformHotpathTimeoutMs
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
	uid, _ := core.UserID(ctx)
	cur, err := g.gwStore.update(ctx, in, uid)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	g.changed(ctx, "settings.gateway")
	httpapi.OK(c, cur)
}
