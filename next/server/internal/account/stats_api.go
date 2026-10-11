package account

import (
	"encoding/json"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

func (s *Service) getStatsSettings(c *gin.Context) {
	if s.d.Stats == nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	v, err := s.d.Stats.Settings(c.Request.Context())
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, v)
}

func (s *Service) putStatsSettings(c *gin.Context) {
	var in struct {
		WindowSeconds *int `json:"window_seconds"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if in.WindowSeconds == nil || *in.WindowSeconds < 5 || *in.WindowSeconds > statsMaxWindow {
		httpapi.Fail(c, core.InvalidFields(core.FieldError{Field: "window_seconds", Code: "out_of_range", Message: t(c.Request.Context(), "must be between 5 and 3600 seconds", "必须为 5 到 3600 秒")}))
		return
	}
	if s.d.Stats == nil || s.d.DB == nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	ctx := c.Request.Context()
	uid, _ := core.UserID(ctx)
	v := StatsSettings{WindowSeconds: 60}
	if err := store.PatchSettingJSON(ctx, s.d.DB, statsSettingsKey, &uid, in, &v); err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.d.Stats.window.Store(int64(v.WindowSeconds))
	if s.d.Bus != nil {
		raw, _ := json.Marshal(map[string]string{"key": "settings." + statsSettingsKey})
		_ = s.d.Bus.Publish(ctx, core.ChannelConfigChanged, raw)
	}
	httpapi.OK(c, v)
}

func parseStatsIDs(raw string) ([]int64, error) {
	parts := strings.SplitN(raw, ",", statsMaxAccounts+1)
	if len(parts) > statsMaxAccounts {
		return nil, core.ErrInvalidArgument.WithMessage("too many account ids")
	}
	ids := make([]int64, 0, len(parts))
	seen := make(map[int64]bool, len(parts))
	for _, part := range parts {
		id, err := strconv.ParseInt(strings.TrimSpace(part), 10, 64)
		if err != nil || id <= 0 {
			return nil, core.ErrInvalidArgument.WithMessage("invalid account id")
		}
		if !seen[id] {
			ids = append(ids, id)
			seen[id] = true
		}
	}
	return ids, nil
}

func (s *Service) getAccountStats(c *gin.Context) {
	raw := c.Param("id")
	single := raw != ""
	if !single {
		raw = c.Query("ids")
	}
	ids, err := parseStatsIDs(raw)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	window := 0
	if value := c.Query("window_seconds"); value != "" {
		window, err = strconv.Atoi(value)
		if err != nil || window < 5 || window > statsMaxWindow {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("window_seconds must be between 5 and 3600"))
			return
		}
	}
	if s.d.Stats == nil || s.d.DB == nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	ctx := c.Request.Context()
	scope := core.OwnerScope(ctx, "account:read")
	rows, err := s.d.DB.Pool.Query(ctx, `SELECT a.id FROM accounts a WHERE a.id=ANY($1) AND a.deleted_at IS NULL AND `+scoped("$2"), ids, scope)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	visible := make(map[int64]bool, len(ids))
	for rows.Next() {
		var id int64
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			httpapi.Fail(c, err)
			return
		}
		visible[id] = true
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	filtered := ids[:0]
	for _, id := range ids {
		if visible[id] {
			filtered = append(filtered, id)
		}
	}
	if single && len(filtered) == 0 {
		httpapi.Fail(c, notFound(ctx))
		return
	}
	out, err := s.d.Stats.AccountStats(ctx, filtered, window)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}
