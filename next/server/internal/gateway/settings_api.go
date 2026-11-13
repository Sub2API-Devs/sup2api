package gateway

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

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
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		if in.MaxAttempts != nil {
			if err := legacyFailureSettingGuard(ctx, tx); err != nil {
				return err
			}
		}
		_, err := store.UpdateSettingJSONTx(ctx, tx, settingsKeyGateway, nullID(updatedBy), func(raw json.RawMessage) (json.RawMessage, error) {
			if err := json.Unmarshal(raw, &v); err != nil {
				return nil, err
			}
			in.applyTo(&v)
			return json.Marshal(v.normalized())
		})
		return err
	})
	return v.normalized(), err
}

// gatewaySettingsInput is the PUT /settings/gateway body; nil fields keep
// their current value.
type gatewaySettingsInput struct {
	MaxAttempts              *int `json:"max_attempts"`
	PlatformCallTimeoutMs    *int `json:"platform_call_timeout_ms"`
	DefaultHookTimeoutMs     *int `json:"default_hook_timeout_ms"`
	PlatformHotpathTimeoutMs *int `json:"platform_hotpath_timeout_ms"`
	QueueStickyMaxWaiting    *int `json:"queue_sticky_max_waiting"`
	QueueStickyWaitSeconds   *int `json:"queue_sticky_wait_seconds"`
	QueueFallbackMaxWaiting  *int `json:"queue_fallback_max_waiting"`
	QueueFallbackWaitSecond  *int `json:"queue_fallback_wait_seconds"`
	// ClaudeMaxTokens replaces the rule as a whole.
	ClaudeMaxTokens    *ClaudeMaxTokensRule `json:"claude_max_tokens"`
	MediaDownloadMaxMB *int                 `json:"media_download_max_mb"`
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
	check("queue_sticky_max_waiting", in.QueueStickyMaxWaiting, 0, maxQueueWaiting)
	check("queue_sticky_wait_seconds", in.QueueStickyWaitSeconds, 0, maxQueueWaitSeconds)
	check("queue_fallback_max_waiting", in.QueueFallbackMaxWaiting, 0, maxQueueWaiting)
	check("queue_fallback_wait_seconds", in.QueueFallbackWaitSecond, 0, maxQueueWaitSeconds)
	check("media_download_max_mb", in.MediaDownloadMaxMB, minMediaDownloadMaxMB, maxMediaDownloadMaxMB)
	if in.ClaudeMaxTokens != nil {
		fe = append(fe, in.ClaudeMaxTokens.validate(zh)...)
	}
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
	if in.QueueStickyMaxWaiting != nil {
		v.QueueStickyMaxWaiting = *in.QueueStickyMaxWaiting
	}
	if in.QueueStickyWaitSeconds != nil {
		v.QueueStickyWaitSeconds = *in.QueueStickyWaitSeconds
	}
	if in.QueueFallbackMaxWaiting != nil {
		v.QueueFallbackMaxWaiting = *in.QueueFallbackMaxWaiting
	}
	if in.QueueFallbackWaitSecond != nil {
		v.QueueFallbackWaitSecond = *in.QueueFallbackWaitSecond
	}
	if in.ClaudeMaxTokens != nil {
		v.ClaudeMaxTokens = *in.ClaudeMaxTokens
	}
	if in.MediaDownloadMaxMB != nil {
		v.MediaDownloadMaxMB = *in.MediaDownloadMaxMB
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
