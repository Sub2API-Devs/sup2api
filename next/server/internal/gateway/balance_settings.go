package gateway

import (
	"context"
	"encoding/json"
	"slices"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

const settingsKeyScheduling = "scheduling"

// Values of SchedulingSettings.Mode and SchedulingSettings.Metric (CONTRACTS §89).
const (
	balanceModeTraffic = "traffic"

	balanceMetricRPM         = "rpm"
	balanceMetricConcurrency = "concurrency"
	balanceMetricTPM         = "tpm"
	balanceMetricSessions    = "sessions"
)

var balanceMetrics = []string{balanceMetricRPM, balanceMetricConcurrency, balanceMetricTPM, balanceMetricSessions}

// SchedulingSettings is the "scheduling" row of the settings table: how the
// core balances new sessions inside one (priority, route grade) tier
// (CONTRACTS §89). The traffic balance is always on.
type SchedulingSettings struct {
	// Mode is always "traffic": the field stays for the cores before
	// 2026-11-12, which balance by traffic only when it says so.
	Mode   string `json:"mode"`
	Metric string `json:"metric"`
	// LimitLoad lowers an account's weight as Metric nears its limit.
	LimitLoad bool `json:"limit_load"`
	// ModelLimits balances by the request's model: the traffic balance
	// compares the model's own usage on each account, and LimitLoad also
	// counts the model list holding it when the account has one.
	ModelLimits bool `json:"model_limits"`
}

func defaultSchedulingSettings() SchedulingSettings {
	return SchedulingSettings{Mode: balanceModeTraffic, Metric: balanceMetricSessions}
}

// normalized turns a stored row into the settings the core runs. A row of the
// former "default" mode (or any other) with the limit load off had the metric
// and model limits greyed out, not chosen: they take the defaults. Otherwise
// they are kept, an unknown metric becoming the default.
func (s SchedulingSettings) normalized() SchedulingSettings {
	d := defaultSchedulingSettings()
	if s.Mode != balanceModeTraffic && !s.LimitLoad {
		s.Metric, s.ModelLimits = d.Metric, d.ModelLimits
	}
	if !slices.Contains(balanceMetrics, s.Metric) {
		s.Metric = d.Metric
	}
	s.Mode = d.Mode
	return s
}

func loadSchedulingSettings(ctx context.Context, q store.Querier) (SchedulingSettings, error) {
	v := defaultSchedulingSettings()
	err := loadSettingsRow(ctx, q, settingsKeyScheduling, &v)
	return v.normalized(), err
}

// validate checks the metric (the mode is not checked: it is always stored
// as "traffic"); messages follow the request locale.
func (s SchedulingSettings) validate(ctx context.Context) []core.FieldError {
	msg := "invalid value"
	if core.Locale(ctx) == "zh" {
		msg = "取值无效"
	}
	var fe []core.FieldError
	if !slices.Contains(balanceMetrics, s.Metric) {
		fe = append(fe, core.FieldError{Field: "metric", Code: "invalid", Message: msg})
	}
	return fe
}

func (g *Gateway) getSchedulingHandler(c *gin.Context) {
	db, err := g.db()
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	v, err := loadSchedulingSettings(c.Request.Context(), db.Pool)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, v)
}

// putSchedulingHandler replaces the row (absent fields take their defaults;
// the mode sent is ignored and "traffic" stored), then invalidates the local
// settings cache and broadcasts config:changed.
func (g *Gateway) putSchedulingHandler(c *gin.Context) {
	ctx := c.Request.Context()
	db, err := g.db()
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	in := defaultSchedulingSettings()
	if !httpapi.BindJSON(c, &in) {
		return
	}
	in.Mode = balanceModeTraffic
	if fe := in.validate(ctx); len(fe) > 0 {
		httpapi.Fail(c, core.InvalidFields(fe...))
		return
	}
	uid, _ := core.UserID(ctx)
	if err := db.Tx(ctx, func(tx pgx.Tx) error {
		_, err := store.UpdateSettingJSONTx(ctx, tx, settingsKeyScheduling, nullID(uid), func(json.RawMessage) (json.RawMessage, error) {
			return json.Marshal(in)
		})
		return err
	}); err != nil {
		httpapi.Fail(c, err)
		return
	}
	g.changed(ctx, "settings.scheduling")
	httpapi.OK(c, in)
}
