package account

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Account usage and usage limits (CONTRACTS §73). Usage is the core's own
// record of what an account served, summed from usage_logs by the 0064
// trigger; the usage limit caps the cost of a period and, once reached,
// auto-disables the account until the next period starts.

// usageLimitReason starts the status_reason the usage limit writes; the
// console recognises it, and only accounts disabled with it are re-enabled by
// the limit.
const usageLimitReason = "usage limit reached"

const (
	usagePeriodHour  = "hour"
	usagePeriodDay   = "day"
	usagePeriodWeek  = "week"
	usagePeriodMonth = "month"
	// usagePeriodNone is a lifetime limit: no reset, the account stays
	// disabled until the limit is raised or turned off.
	usagePeriodNone = "none"

	maxUsageLimitAmount = 1_000_000_000
	maxUsagePeriodCount = 1000
)

// defaultUsageAnchor anchors windows without an explicit start: a Monday at
// local midnight, so days, weeks and months fall on their natural boundaries.
func defaultUsageAnchor() time.Time { return time.Date(2024, 1, 1, 0, 0, 0, 0, time.Local) }

// UsageLimit is the usage-limit configuration of an account.
type UsageLimit struct {
	// RawCost counts usage before the group multiplier ("原始倍率计费"), both
	// for the limit and for the usage the console shows as the main figure.
	RawCost     bool            `json:"raw_cost_accounting"`
	Enabled     bool            `json:"enabled"`
	Amount      decimal.Decimal `json:"amount"`
	Period      string          `json:"period"`
	PeriodCount int             `json:"period_count"`
	// Anchor is where periods are counted from; null = 2024-01-01 00:00 in
	// the server's time zone. Truncated to the hour (usage is kept per hour).
	Anchor *time.Time `json:"anchor"`

	waived *time.Time
}

func defaultUsageLimit() UsageLimit {
	return UsageLimit{Period: usagePeriodMonth, PeriodCount: 1, Amount: decimal.Zero}
}

func (l UsageLimit) active() bool { return l.Enabled && l.Amount.IsPositive() }

// window returns the period containing now: [start, end); end is nil for a
// lifetime limit, whose start is the Unix epoch.
func (l UsageLimit) window(now time.Time) (time.Time, *time.Time) {
	if l.Period == usagePeriodNone {
		return time.Unix(0, 0).UTC(), nil
	}
	anchor := defaultUsageAnchor()
	if l.Anchor != nil {
		anchor = l.Anchor.In(time.Local)
	}
	anchor = anchor.Truncate(time.Hour)
	n := max(l.PeriodCount, 1)
	if l.Period == usagePeriodMonth {
		months := (now.Year()-anchor.Year())*12 + int(now.Month()-anchor.Month())
		k := months / n
		if months < 0 && months%n != 0 {
			k--
		}
		start := anchor.AddDate(0, k*n, 0)
		for start.After(now) {
			k--
			start = anchor.AddDate(0, k*n, 0)
		}
		for !anchor.AddDate(0, (k+1)*n, 0).After(now) {
			k++
		}
		start, end := anchor.AddDate(0, k*n, 0), anchor.AddDate(0, (k+1)*n, 0)
		return start, &end
	}
	unit := time.Hour
	switch l.Period {
	case usagePeriodDay:
		unit = 24 * time.Hour
	case usagePeriodWeek:
		unit = 7 * 24 * time.Hour
	}
	length := unit * time.Duration(n)
	k := now.Sub(anchor) / length
	if now.Before(anchor) && now.Sub(anchor)%length != 0 {
		k--
	}
	start := anchor.Add(k * length)
	end := start.Add(length)
	return start, &end
}

// periodText describes the period in the status reason ("per month", "per 2
// weeks", "total"); the console shows the reason as is on hover.
func (l UsageLimit) periodText() string {
	if l.Period == usagePeriodNone {
		return "total"
	}
	if l.PeriodCount <= 1 {
		return "per " + l.Period
	}
	return fmt.Sprintf("per %d %ss", l.PeriodCount, l.Period)
}

// UsageFigures is the usage of an account over some time.
type UsageFigures struct {
	Cost     decimal.Decimal `json:"cost"`
	RawCost  decimal.Decimal `json:"raw_cost"`
	Requests int64           `json:"requests"`
	Tokens   int64           `json:"tokens"`
}

// UsageLimitState is the usage limit of an account and what the current
// period used, in the limit's basis (raw or charged cost).
type UsageLimitState struct {
	Amount      decimal.Decimal `json:"amount"`
	Used        decimal.Decimal `json:"used"`
	Period      string          `json:"period"`
	PeriodCount int             `json:"period_count"`
	WindowStart *time.Time      `json:"window_start"`
	WindowEnd   *time.Time      `json:"window_end"`
}

// UsageView is View.Usage: lifetime and today's usage, which cost is the
// main figure, and the usage limit when one is on.
type UsageView struct {
	RawCostAccounting bool             `json:"raw_cost_accounting"`
	Total             UsageFigures     `json:"total"`
	Today             UsageFigures     `json:"today"`
	Limit             *UsageLimitState `json:"limit"`
}

// UsageDetail is GET /accounts/:id/usage: the hover details of the usage cell.
type UsageDetail struct {
	RawCostAccounting bool             `json:"raw_cost_accounting"`
	Today             UsageFigures     `json:"today"`
	Last7Days         UsageFigures     `json:"last_7_days"`
	Last30Days        UsageFigures     `json:"last_30_days"`
	Total             UsageFigures     `json:"total"`
	Limit             *UsageLimitState `json:"limit"`
}

func localMidnight(now time.Time) time.Time {
	y, m, d := now.In(time.Local).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.Local)
}

// usageLimits loads the configured limits of the given accounts.
func usageLimits(ctx context.Context, q store.Querier, ids []int64) (map[int64]UsageLimit, error) {
	rows, err := q.Query(ctx, `SELECT account_id, raw_cost, enabled, amount, period, period_count, anchor, waived_window
		FROM account_usage_limits WHERE account_id = ANY($1)`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[int64]UsageLimit, len(ids))
	for rows.Next() {
		var id int64
		var l UsageLimit
		if err := rows.Scan(&id, &l.RawCost, &l.Enabled, &l.Amount, &l.Period, &l.PeriodCount, &l.Anchor, &l.waived); err != nil {
			return nil, err
		}
		out[id] = l
	}
	return out, rows.Err()
}

// usageSince sums the hourly usage of each account from its own start time
// (nil end = up to now), one query for all.
func usageSince(ctx context.Context, q store.Querier, ids []int64, starts []time.Time, ends []*time.Time) (map[int64]UsageFigures, error) {
	out := make(map[int64]UsageFigures, len(ids))
	if len(ids) == 0 {
		return out, nil
	}
	rows, err := q.Query(ctx, `SELECT w.id, coalesce(sum(h.cost),0), coalesce(sum(h.raw_cost),0), coalesce(sum(h.requests),0)::bigint, coalesce(sum(h.tokens),0)::bigint
		FROM unnest($1::bigint[], $2::timestamptz[], $3::timestamptz[]) AS w(id, since, until)
		LEFT JOIN account_usage_hourly h ON h.account_id = w.id AND h.hour >= w.since AND (w.until IS NULL OR h.hour < w.until)
		GROUP BY w.id`, ids, starts, ends)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		var f UsageFigures
		if err := rows.Scan(&id, &f.Cost, &f.RawCost, &f.Requests, &f.Tokens); err != nil {
			return nil, err
		}
		out[id] = f
	}
	return out, rows.Err()
}

func usageTotals(ctx context.Context, q store.Querier, ids []int64) (map[int64]UsageFigures, error) {
	rows, err := q.Query(ctx, `SELECT account_id, cost, raw_cost, requests, tokens FROM account_usage_totals WHERE account_id = ANY($1)`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[int64]UsageFigures, len(ids))
	for rows.Next() {
		var id int64
		var f UsageFigures
		if err := rows.Scan(&id, &f.Cost, &f.RawCost, &f.Requests, &f.Tokens); err != nil {
			return nil, err
		}
		out[id] = f
	}
	return out, rows.Err()
}

// limitStates computes what the current period of each active limit used.
func limitStates(ctx context.Context, q store.Querier, limits map[int64]UsageLimit, totals map[int64]UsageFigures, now time.Time) (map[int64]*UsageLimitState, error) {
	out := map[int64]*UsageLimitState{}
	var ids []int64
	var starts []time.Time
	var ends []*time.Time
	for id, l := range limits {
		if !l.active() {
			continue
		}
		start, end := l.window(now)
		st := &UsageLimitState{Amount: l.Amount, Period: l.Period, PeriodCount: l.PeriodCount, WindowEnd: end}
		if l.Period != usagePeriodNone {
			st.WindowStart = &start
			ids, starts, ends = append(ids, id), append(starts, start), append(ends, end)
		} else {
			st.Used = basis(l.RawCost, totals[id])
		}
		out[id] = st
	}
	used, err := usageSince(ctx, q, ids, starts, ends)
	if err != nil {
		return nil, err
	}
	for _, id := range ids {
		out[id].Used = basis(limits[id].RawCost, used[id])
	}
	return out, nil
}

func basis(raw bool, f UsageFigures) decimal.Decimal {
	if raw {
		return f.RawCost
	}
	return f.Cost
}

// fillUsage sets View.Usage for every listed account.
func (s *Service) fillUsage(ctx context.Context, out []*View) {
	if s.d.DB == nil || len(out) == 0 {
		return
	}
	ids := make([]int64, len(out))
	for i, v := range out {
		ids[i] = v.ID
	}
	q := s.d.DB.Pool
	now := time.Now()
	totals, err := usageTotals(ctx, q, ids)
	if err != nil {
		slog.WarnContext(ctx, "account: read usage totals", "err", err)
		return
	}
	midnight := localMidnight(now)
	starts, ends := make([]time.Time, len(ids)), make([]*time.Time, len(ids))
	for i := range ids {
		starts[i] = midnight
	}
	today, err := usageSince(ctx, q, ids, starts, ends)
	if err != nil {
		slog.WarnContext(ctx, "account: read usage of today", "err", err)
		return
	}
	limits, err := usageLimits(ctx, q, ids)
	if err != nil {
		slog.WarnContext(ctx, "account: read usage limits", "err", err)
		return
	}
	states, err := limitStates(ctx, q, limits, totals, now)
	if err != nil {
		slog.WarnContext(ctx, "account: read usage limit periods", "err", err)
		return
	}
	for _, v := range out {
		v.Usage = &UsageView{RawCostAccounting: limits[v.ID].RawCost, Total: totals[v.ID], Today: today[v.ID], Limit: states[v.ID]}
	}
}

// getUsage is GET /accounts/:id/usage: today, the last 7 and 30 days, the
// lifetime and the current limit period.
func (s *Service) getUsage(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	if _, err := s.loadRow(ctx, s.d.DB.Pool, id, core.OwnerScope(ctx, "account:read"), false); err != nil {
		httpapi.Fail(c, err)
		return
	}
	d, err := s.usageDetail(ctx, id, time.Now())
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, d)
}

func (s *Service) usageDetail(ctx context.Context, id int64, now time.Time) (*UsageDetail, error) {
	q := s.d.DB.Pool
	ids := []int64{id}
	hour := now.Truncate(time.Hour)
	since := []time.Time{localMidnight(now), hour.Add(-7 * 24 * time.Hour), hour.Add(-30 * 24 * time.Hour)}
	windows := make([]UsageFigures, len(since))
	for i, start := range since {
		m, err := usageSince(ctx, q, ids, []time.Time{start}, []*time.Time{nil})
		if err != nil {
			return nil, err
		}
		windows[i] = m[id]
	}
	totals, err := usageTotals(ctx, q, ids)
	if err != nil {
		return nil, err
	}
	limits, err := usageLimits(ctx, q, ids)
	if err != nil {
		return nil, err
	}
	states, err := limitStates(ctx, q, limits, totals, now)
	if err != nil {
		return nil, err
	}
	return &UsageDetail{RawCostAccounting: limits[id].RawCost, Today: windows[0], Last7Days: windows[1], Last30Days: windows[2],
		Total: totals[id], Limit: states[id]}, nil
}

// getUsageLimit is GET /accounts/:id/usage-limit: the configuration, with
// the defaults when none was saved.
func (s *Service) getUsageLimit(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	if _, err := s.loadRow(ctx, s.d.DB.Pool, id, core.OwnerScope(ctx, "account:read"), false); err != nil {
		httpapi.Fail(c, err)
		return
	}
	limits, err := usageLimits(ctx, s.d.DB.Pool, []int64{id})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	l, found := limits[id]
	if !found {
		l = defaultUsageLimit()
	}
	httpapi.OK(c, l)
}

// validateUsageLimit checks a submitted configuration.
func validateUsageLimit(ctx context.Context, l *UsageLimit) error {
	var fields []core.FieldError
	add := func(field, en, zh string) {
		fields = append(fields, core.FieldError{Field: field, Code: "invalid", Message: t(ctx, en, zh)})
	}
	switch l.Period {
	case usagePeriodHour, usagePeriodDay, usagePeriodWeek, usagePeriodMonth, usagePeriodNone:
	default:
		add("period", "period must be hour, day, week, month or none", "重置周期必须为每小时、每天、每周、每月或不重置")
	}
	if l.PeriodCount < 1 || l.PeriodCount > maxUsagePeriodCount {
		add("period_count", "period count must be 1-1000", "周期长度必须为 1-1000")
	}
	if l.Amount.IsNegative() || l.Amount.GreaterThan(decimal.NewFromInt(maxUsageLimitAmount)) || l.Amount.Exponent() < -8 {
		add("amount", "amount must be 0-1000000000 USD with at most 8 decimals", "限额必须为 0-1000000000 美元，最多 8 位小数")
	}
	if l.Enabled && !l.Amount.IsPositive() {
		add("amount", "set an amount above 0 to enable the usage limit", "开启用量限制需要填写大于 0 的限额")
	}
	if l.Anchor != nil {
		a := l.Anchor.Truncate(time.Hour)
		l.Anchor = &a
	}
	if len(fields) > 0 {
		return core.InvalidFields(fields...)
	}
	return nil
}

// putUsageLimit is PUT /accounts/:id/usage-limit. Saving clears an early
// release ("reset status") and applies the limit at once: an account over the
// new limit is disabled, one disabled by the old limit and now under it is
// enabled again.
func (s *Service) putUsageLimit(c *gin.Context) {
	ctx := audit.Context(c)
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	in := defaultUsageLimit()
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if err := validateUsageLimit(ctx, &in); err != nil {
		httpapi.Fail(c, err)
		return
	}
	scope := core.OwnerScope(ctx, "account:update")
	uid, _ := core.UserID(ctx)
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := s.loadRow(ctx, tx, id, scope, true); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO account_usage_limits (account_id, raw_cost, enabled, amount, period, period_count, anchor, waived_window, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, now())
			ON CONFLICT (account_id) DO UPDATE SET raw_cost = EXCLUDED.raw_cost, enabled = EXCLUDED.enabled, amount = EXCLUDED.amount,
				period = EXCLUDED.period, period_count = EXCLUDED.period_count, anchor = EXCLUDED.anchor, waived_window = NULL, updated_at = now()`,
			id, in.RawCost, in.Enabled, in.Amount, in.Period, in.PeriodCount, in.Anchor); err != nil {
			return err
		}
		return audit.Audit(ctx, tx, uid, "account.usage_limit", "account", itoa(id), map[string]any{
			"raw_cost_accounting": in.RawCost, "enabled": in.Enabled, "amount": in.Amount.String(), "period": in.Period, "period_count": in.PeriodCount, "anchor": in.Anchor})
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if err := s.EnforceUsageLimits(ctx, []int64{id}); err != nil {
		slog.WarnContext(ctx, "account: apply usage limit", "account", id, "err", err)
	}
	d, err := s.usageDetail(ctx, id, time.Now())
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, d)
}

// waiveUsageLimit lets an account that "reset status" brought back run for
// the rest of the current period: the limit does not disable it again until
// the next period (or until its configuration is saved).
func (s *Service) waiveUsageLimit(ctx context.Context, id int64) error {
	limits, err := usageLimits(ctx, s.d.DB.Pool, []int64{id})
	if err != nil {
		return err
	}
	l, ok := limits[id]
	if !ok || !l.active() {
		return nil
	}
	start, _ := l.window(time.Now())
	_, err = s.d.DB.Pool.Exec(ctx, `UPDATE account_usage_limits SET waived_window = $2 WHERE account_id = $1`, id, start)
	return err
}

// EnforceUsageLimits applies the usage limits of the given accounts (nil =
// every account with a limit, or disabled by one): an active account at or
// over its limit is auto-disabled until its period ends (no release time for
// a lifetime limit), and an account the limit disabled that is now under it
// (limit raised, turned off, or released early) is enabled again. The
// release itself at the end of a period is the automatic-state sweep's.
func (s *Service) EnforceUsageLimits(ctx context.Context, ids []int64) error {
	if s.d.DB == nil {
		return nil
	}
	type candidate struct {
		id                   int64
		limit                UsageLimit
		status, reason       string
		name, pluginKey, typ string
		hasLimit             bool
	}
	var filter any
	if ids != nil {
		filter = ids
	}
	rows, err := s.d.DB.Pool.Query(ctx, `SELECT a.id, a.status, a.status_reason, a.name, a.plugin_key, a.type, l.account_id IS NOT NULL,
			coalesce(l.raw_cost, false), coalesce(l.enabled, false), coalesce(l.amount, 0), coalesce(l.period, 'month'), coalesce(l.period_count, 1), l.anchor, l.waived_window
		FROM accounts a LEFT JOIN account_usage_limits l ON l.account_id = a.id
		WHERE a.deleted_at IS NULL AND ($1::bigint[] IS NULL OR a.id = ANY($1))
			AND ((l.enabled AND a.status = 'active') OR (a.status = 'auto_disabled' AND a.status_reason LIKE $2))`,
		filter, usageLimitReason+"%")
	if err != nil {
		return err
	}
	cands, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (candidate, error) {
		var c candidate
		err := r.Scan(&c.id, &c.status, &c.reason, &c.name, &c.pluginKey, &c.typ, &c.hasLimit,
			&c.limit.RawCost, &c.limit.Enabled, &c.limit.Amount, &c.limit.Period, &c.limit.PeriodCount, &c.limit.Anchor, &c.limit.waived)
		return c, err
	})
	if err != nil || len(cands) == 0 {
		return err
	}
	now := time.Now()
	limits := make(map[int64]UsageLimit, len(cands))
	var lifetime []int64
	for _, c := range cands {
		limits[c.id] = c.limit
		if c.limit.Period == usagePeriodNone {
			lifetime = append(lifetime, c.id)
		}
	}
	totals, err := usageTotals(ctx, s.d.DB.Pool, lifetime)
	if err != nil {
		return err
	}
	states, err := limitStates(ctx, s.d.DB.Pool, limits, totals, now)
	if err != nil {
		return err
	}
	for _, c := range cands {
		st := states[c.id]
		over := st != nil && !st.Used.LessThan(st.Amount)
		if over && c.limit.waived != nil {
			start, _ := c.limit.window(now)
			over = !c.limit.waived.Equal(start)
		}
		switch {
		case over && c.status == "active":
			reason := fmt.Sprintf("%s: $%s / $%s (%s)", usageLimitReason, st.Used.StringFixed(2), st.Amount.StringFixed(2), c.limit.periodText())
			err = s.setUsageLimitState(ctx, c.id, c.name, c.pluginKey, c.typ, "active", "auto_disabled", reason, st.WindowEnd)
		case !over && c.status == "auto_disabled" && strings.HasPrefix(c.reason, usageLimitReason):
			err = s.setUsageLimitState(ctx, c.id, c.name, c.pluginKey, c.typ, "auto_disabled", "active", "", nil)
		}
		if err != nil {
			return err
		}
	}
	return nil
}

// setUsageLimitState moves one account between active and auto-disabled for
// its usage limit, only from the expected status (another node, an operator
// or a plugin may have changed it since), with the audit row and the
// account.status_changed event of any automatic change.
func (s *Service) setUsageLimitState(ctx context.Context, id int64, name, pluginKey, typ, from, to, reason string, until *time.Time) error {
	changed := false
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		cond := "status = 'active'"
		if from == "auto_disabled" {
			cond = "status = 'auto_disabled' AND status_reason LIKE '" + usageLimitReason + "%'"
		}
		tag, err := tx.Exec(ctx, `UPDATE accounts SET status = $2, status_reason = $3, auto_disabled_until = $4, updated_at = clock_timestamp()
			WHERE id = $1 AND deleted_at IS NULL AND `+cond, id, to, reason, until)
		if err != nil || tag.RowsAffected() == 0 {
			return err
		}
		changed = true
		if err := audit.Audit(ctx, tx, 0, "account.usage_limit_state", "account", itoa(id), map[string]any{
			"plugin_key": pluginKey, "previous_status": from, "status": to, "reason": reason, "until": until}); err != nil {
			return err
		}
		eventReason := reason
		if to == "active" {
			eventReason = "usage back under the limit"
		}
		payload := statusPayload(id, pluginKey, typ, name, to, eventReason, nil)
		if until != nil {
			payload["auto_disabled_until"] = until.UTC().Format(time.RFC3339)
		}
		return s.d.Events.Emit(ctx, tx, core.Event{Type: core.EventAccountStatusChanged, Payload: payload})
	})
	if err != nil || !changed {
		return err
	}
	s.changed(ctx, id)
	s.kickCCGateway(id, pluginKey, typ)
	return nil
}
