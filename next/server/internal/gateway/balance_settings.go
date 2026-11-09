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

// Values of SchedulingSettings.Mode and SchedulingSettings.Metric (CONTRACTS §88).
const (
	balanceModeDefault = "default"
	balanceModeTraffic = "traffic"

	balanceMetricRPM         = "rpm"
	balanceMetricConcurrency = "concurrency"
	balanceMetricTPM         = "tpm"
)

var (
	balanceModes   = []string{balanceModeDefault, balanceModeTraffic}
	balanceMetrics = []string{balanceMetricRPM, balanceMetricConcurrency, balanceMetricTPM}
)

// SchedulingSettings is the "scheduling" row of the settings table: how the
// core balances new sessions inside one (priority, route grade) tier
// (CONTRACTS §88). The defaults change nothing.
type SchedulingSettings struct {
	// Mode "traffic" favours the accounts using less of Metric than their
	// weight's share of the tier; "default" keeps the plain weighted draw.
	Mode   string `json:"mode"`
	Metric string `json:"metric"`
	// LimitLoad lowers an account's weight as Metric nears its limit.
	LimitLoad bool `json:"limit_load"`
	// ModelLimits also counts the model list holding the request's model,
	// when the account has one, in LimitLoad.
	ModelLimits bool `json:"model_limits"`
}

func defaultSchedulingSettings() SchedulingSettings {
	return SchedulingSettings{Mode: balanceModeDefault, Metric: balanceMetricRPM}
}

// normalized turns unknown values (an old or hand-edited row) into the defaults.
func (s SchedulingSettings) normalized() SchedulingSettings {
	d := defaultSchedulingSettings()
	if !slices.Contains(balanceModes, s.Mode) {
		s.Mode = d.Mode
	}
	if !slices.Contains(balanceMetrics, s.Metric) {
		s.Metric = d.Metric
	}
	return s
}

// active reports whether the core balancing has anything to do.
func (s SchedulingSettings) active() bool {
	return s.Mode == balanceModeTraffic || s.LimitLoad
}

func loadSchedulingSettings(ctx context.Context, q store.Querier) (SchedulingSettings, error) {
	v := defaultSchedulingSettings()
	err := loadSettingsRow(ctx, q, settingsKeyScheduling, &v)
	return v.normalized(), err
}

// validate checks the enums; messages follow the request locale.
func (s SchedulingSettings) validate(ctx context.Context) []core.FieldError {
	msg := "invalid value"
	if core.Locale(ctx) == "zh" {
		msg = "取值无效"
	}
	var fe []core.FieldError
	if !slices.Contains(balanceModes, s.Mode) {
		fe = append(fe, core.FieldError{Field: "mode", Code: "invalid", Message: msg})
	}
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

// putSchedulingHandler replaces the row (absent fields take their defaults),
// then invalidates the local settings cache and broadcasts config:changed.
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
