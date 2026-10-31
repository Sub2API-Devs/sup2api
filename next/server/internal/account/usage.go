package account

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Account usage and usage limits (CONTRACTS §73). Usage is the core's own
// record of what an account served, journaled from usage_logs by the 0064 /
// 0068 trigger and folded into hourly and lifetime sums in the background;
// the usage limit caps the cost of a period and, once reached, auto-disables
// the account until the next period starts.

// usageLimitReason starts the status_reason the usage limit writes, for
// people to read: the limit knows its own disable by usageLimitSource.
const usageLimitReason = "usage limit reached"

// usageLimitSource is accounts.auto_disabled_source of a disable the usage
// limit wrote. Only such accounts are the limit's to re-enable or update.
const usageLimitSource = "usage_limit"

// limitDisabled reports whether the usage limit auto-disabled an account (a
// trigger clears the source once the account leaves auto_disabled).
func limitDisabled(status, source string) bool {
	return status == "auto_disabled" && source == usageLimitSource
}

const (
	usagePeriodHour  = "hour"
	usagePeriodDay   = "day"
	usagePeriodWeek  = "week"
	usagePeriodMonth = "month"
	// usagePeriodNone is a lifetime limit: no reset, the account stays
	// disabled until the limit is raised or turned off.
	usagePeriodNone = "none"

	maxUsageLimitAmount = 1_000_000_000
	// usageFoldBatch is how many journal rows one fold statement takes.
	usageFoldBatch = 5000
	// usageLimitsLock serialises folding and enforcing across nodes.
	usageLimitsLock = "account.usage_limits"
)

// maxPeriodCount caps period_count so that one period lasts at most 366
// days, the longest automatic disable (maxAutomaticDisableDuration). A
// lifetime limit has no periods: its period_count is always stored as 1
// (normalizeUsageLimit), whatever was submitted. The database checks only
// the widest bound (1-8784, 0064).
var maxPeriodCount = map[string]int{
	usagePeriodHour: 366 * 24, usagePeriodDay: 366, usagePeriodWeek: 52, usagePeriodMonth: 12, usagePeriodNone: 1,
}

// Anchors are accepted in [2000, 2100) so window math never nears the
// limits of time.Duration.
var (
	minUsageAnchor = time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)
	maxUsageAnchor = time.Date(2100, 1, 1, 0, 0, 0, 0, time.UTC)
)

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
	// Timezone. Floored to the hour (anchorStart).
	Anchor *time.Time `json:"anchor"`
	// Timezone (IANA) is the wall clock the periods follow: days start at its
	// midnight and keep it across daylight saving. Required on save; empty
	// in GET /usage-limit until a configuration is saved (configured=false),
	// so the console knows to fill in the browser's zone (CONTRACTS §73.3).
	Timezone string `json:"timezone"`

	waived *time.Time
}

// defaultUsageLimit is the configuration of an account that never saved
// one: off, monthly, no time zone yet (periods of an unset zone read as UTC).
func defaultUsageLimit() UsageLimit {
	return UsageLimit{Period: usagePeriodMonth, PeriodCount: 1, Amount: decimal.Zero}
}

func (l UsageLimit) active() bool { return l.Enabled && l.Amount.IsPositive() }

func (l UsageLimit) location() *time.Location {
	if loc, ok := core.LoadTimeZone(l.Timezone); ok {
		return loc
	}
	return time.UTC
}

// anchorStart is where the periods are counted from: the anchor (default
// 2024-01-01 00:00) floored to the hour of the limit's wall clock. Hourly
// periods floor it to the UTC hour instead: usage is summed in UTC hours,
// and an hour period of a half-hour zone (Asia/Kolkata) would otherwise
// split every bucket it touches.
func (l UsageLimit) anchorStart() time.Time {
	loc := l.location()
	a := time.Date(2024, 1, 1, 0, 0, 0, 0, loc)
	if l.Anchor != nil {
		a = l.Anchor.In(loc)
	}
	if l.Period == usagePeriodHour {
		return a.Truncate(time.Hour)
	}
	return time.Date(a.Year(), a.Month(), a.Day(), a.Hour(), 0, 0, 0, loc)
}

// window returns the period containing now: [start, end); end is nil for a
// lifetime limit, whose start is the Unix epoch.
func (l UsageLimit) window(now time.Time) (time.Time, *time.Time) {
	if l.Period == usagePeriodNone {
		return time.Unix(0, 0).UTC(), nil
	}
	loc := l.location()
	anchor := l.anchorStart()
	n := max(l.PeriodCount, 1)
	at := func(k int) time.Time { return periodStart(anchor, l.Period, k*n) }
	// The estimate is off by at most one period (daylight saving, month
	// lengths); the loops settle it.
	k := floorDiv(elapsedUnits(anchor, now.In(loc), l.Period), n)
	for at(k).After(now) {
		k--
	}
	for !at(k + 1).After(now) {
		k++
	}
	start, end := at(k), at(k+1)
	return start, &end
}

// periodStart is anchor moved by units periods on its wall clock: days and
// weeks keep the hour across daylight saving, months keep the day of the
// month, clamped to its last day (an anchor on the 31st falls on Feb 28).
func periodStart(anchor time.Time, period string, units int) time.Time {
	switch period {
	case usagePeriodHour:
		return anchor.Add(time.Duration(units) * time.Hour)
	case usagePeriodDay:
		return anchor.AddDate(0, 0, units)
	case usagePeriodWeek:
		return anchor.AddDate(0, 0, 7*units)
	}
	first := time.Date(anchor.Year(), anchor.Month()+time.Month(units), 1, anchor.Hour(), 0, 0, 0, anchor.Location())
	last := first.AddDate(0, 1, -1).Day()
	return first.AddDate(0, 0, min(anchor.Day(), last)-1)
}

// elapsedUnits estimates how many period units lie between anchor and now.
func elapsedUnits(anchor, now time.Time, period string) int {
	switch period {
	case usagePeriodMonth:
		return (now.Year()-anchor.Year())*12 + int(now.Month()-anchor.Month())
	case usagePeriodDay:
		return int(now.Sub(anchor) / (24 * time.Hour))
	case usagePeriodWeek:
		return int(now.Sub(anchor) / (7 * 24 * time.Hour))
	}
	return int(now.Sub(anchor) / time.Hour)
}

func floorDiv(a, b int) int {
	q := a / b
	if a%b != 0 && (a < 0) != (b < 0) {
		q--
	}
	return q
}

// periodText describes the period in the status reason ("per month", "per 2
// weeks", "total"); the console renders its own text from View.Usage.
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
	// Waived: an administrator brought the account back by hand in this
	// period, so the limit does not disable it again until the next one
	// (CONTRACTS §73.4).
	Waived bool `json:"waived"`
}

// reached reports whether the limit disables the account now.
func (st *UsageLimitState) reached() bool {
	return st != nil && !st.Waived && !st.Used.LessThan(st.Amount)
}

// UsageView is View.Usage: lifetime and today's usage, which cost is the
// main figure, and the usage limit when one is on.
type UsageView struct {
	RawCostAccounting bool             `json:"raw_cost_accounting"`
	Total             UsageFigures     `json:"total"`
	Today             UsageFigures     `json:"today"`
	Limit             *UsageLimitState `json:"limit"`
	// LimitDisabled: the account is auto-disabled by its usage limit.
	LimitDisabled bool `json:"limit_disabled"`
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

// dayStart is midnight of now's day in loc ("today" of the request's tz).
func dayStart(now time.Time, loc *time.Location) time.Time {
	y, m, d := now.In(loc).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, loc)
}

const usageLimitColumns = `raw_cost, enabled, amount, period, period_count, anchor, timezone, waived_window`

func (l *UsageLimit) scanTargets() []any {
	return []any{&l.RawCost, &l.Enabled, &l.Amount, &l.Period, &l.PeriodCount, &l.Anchor, &l.Timezone, &l.waived}
}

// usageLimits loads the configured limits of the given accounts.
func usageLimits(ctx context.Context, q store.Querier, ids []int64) (map[int64]UsageLimit, error) {
	rows, err := q.Query(ctx, `SELECT account_id, `+usageLimitColumns+` FROM account_usage_limits WHERE account_id = ANY($1)`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[int64]UsageLimit, len(ids))
	for rows.Next() {
		var id int64
		var l UsageLimit
		if err := rows.Scan(append([]any{&id}, l.scanTargets()...)...); err != nil {
			return nil, err
		}
		out[id] = l
	}
	return out, rows.Err()
}

// usageWindow is the usage of one account from since up to until (nil = now).
type usageWindow struct {
	account int64
	since   time.Time
	until   *time.Time
}

// usageIn sums the hourly usage of each window, in one query; the result is
// aligned with windows.
func usageIn(ctx context.Context, q store.Querier, windows []usageWindow) ([]UsageFigures, error) {
	out := make([]UsageFigures, len(windows))
	if len(windows) == 0 {
		return out, nil
	}
	ids, since, until := make([]int64, len(windows)), make([]time.Time, len(windows)), make([]*time.Time, len(windows))
	for i, w := range windows {
		ids[i], since[i], until[i] = w.account, w.since, w.until
	}
	rows, err := q.Query(ctx, `SELECT w.i, coalesce(sum(h.cost),0), coalesce(sum(h.raw_cost),0), coalesce(sum(h.requests),0)::bigint, coalesce(sum(h.tokens),0)::bigint
		FROM unnest($1::bigint[], $2::timestamptz[], $3::timestamptz[]) WITH ORDINALITY AS w(id, since, until, i)
		LEFT JOIN account_usage_hourly h ON h.account_id = w.id AND h.hour >= w.since AND (w.until IS NULL OR h.hour < w.until)
		GROUP BY w.i`, ids, since, until)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var i int
		var f UsageFigures
		if err := rows.Scan(&i, &f.Cost, &f.RawCost, &f.Requests, &f.Tokens); err != nil {
			return nil, err
		}
		out[i-1] = f
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

// limitStates computes what the current period of each active limit used; a
// lifetime limit reads the totals.
func limitStates(ctx context.Context, q store.Querier, limits map[int64]UsageLimit, totals map[int64]UsageFigures, now time.Time) (map[int64]*UsageLimitState, error) {
	out := map[int64]*UsageLimitState{}
	var windows []usageWindow
	for id, l := range limits {
		if !l.active() {
			continue
		}
		start, end := l.window(now)
		st := &UsageLimitState{Amount: l.Amount, Period: l.Period, PeriodCount: l.PeriodCount, Waived: l.waived != nil && l.waived.Equal(start)}
		out[id] = st
		if l.Period == usagePeriodNone {
			st.Used = basis(l.RawCost, totals[id])
			continue
		}
		st.WindowStart, st.WindowEnd = &start, end
		windows = append(windows, usageWindow{id, start, end})
	}
	used, err := usageIn(ctx, q, windows)
	if err != nil {
		return nil, err
	}
	for i, w := range windows {
		out[w.account].Used = basis(limits[w.account].RawCost, used[i])
	}
	return out, nil
}

func basis(raw bool, f UsageFigures) decimal.Decimal {
	if raw {
		return f.RawCost
	}
	return f.Cost
}

// fillUsage sets View.Usage for every listed account; "today" follows the
// request's time zone.
func (s *Service) fillUsage(ctx context.Context, out []*View) {
	if s.d.DB == nil || len(out) == 0 {
		return
	}
	q := s.d.DB.Pool
	now := time.Now()
	midnight := dayStart(now, core.TimeZone(ctx))
	ids, today := make([]int64, len(out)), make([]usageWindow, len(out))
	for i, v := range out {
		ids[i], today[i] = v.ID, usageWindow{account: v.ID, since: midnight}
	}
	totals, err := usageTotals(ctx, q, ids)
	if err != nil {
		slog.WarnContext(ctx, "account: read usage totals", "err", err)
		return
	}
	todays, err := usageIn(ctx, q, today)
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
	for i, v := range out {
		v.Usage = &UsageView{RawCostAccounting: limits[v.ID].RawCost, Total: totals[v.ID], Today: todays[i], Limit: states[v.ID],
			LimitDisabled: v.limitDisabled}
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
	windows, err := usageIn(ctx, q, []usageWindow{
		{account: id, since: dayStart(now, core.TimeZone(ctx))},
		{account: id, since: hour.Add(-7 * 24 * time.Hour)},
		{account: id, since: hour.Add(-30 * 24 * time.Hour)},
	})
	if err != nil {
		return nil, err
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

// usageLimitView is GET /accounts/:id/usage-limit. Configured is false
// until a configuration is saved: the defaults then carry an empty time
// zone, for the console to fill in the browser's (CONTRACTS §73.3).
type usageLimitView struct {
	UsageLimit
	Configured bool `json:"configured"`
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
	httpapi.OK(c, usageLimitView{UsageLimit: l, Configured: found})
}

// usageLimitInput is the PUT body. amount is read by hand: a limit being
// turned off may come with the field cleared ("" or null, stored as 0).
type usageLimitInput struct {
	UsageLimit
	Amount json.RawMessage `json:"amount"`
}

// limit returns the submitted configuration, normalised: a lifetime limit
// has period_count 1, an empty amount is 0 (enabling then fails validation).
// An amount that is not a number is a field error.
func (in usageLimitInput) limit(ctx context.Context) (UsageLimit, []core.FieldError) {
	l := in.UsageLimit
	if l.Period == usagePeriodNone {
		l.PeriodCount = 1
	}
	raw := strings.TrimSpace(string(in.Amount))
	empty := raw == "" || raw == "null"
	var err error
	if strings.HasPrefix(raw, `"`) {
		if raw, err = strconv.Unquote(raw); err == nil {
			raw = strings.TrimSpace(raw)
			empty = raw == ""
		}
	}
	l.Amount = decimal.Zero
	if err == nil && !empty {
		l.Amount, err = decimal.NewFromString(raw)
	}
	if err != nil {
		return l, []core.FieldError{{Field: "amount", Code: "invalid", Message: t(ctx, "amount must be a number", "限额必须是数字")}}
	}
	return l, nil
}

// validateUsageLimit checks a submitted configuration.
func validateUsageLimit(ctx context.Context, l UsageLimit, fields ...core.FieldError) error {
	add := func(field, en, zh string) {
		if slices.ContainsFunc(fields, func(f core.FieldError) bool { return f.Field == field }) {
			return
		}
		fields = append(fields, core.FieldError{Field: field, Code: "invalid", Message: t(ctx, en, zh)})
	}
	maxCount, ok := maxPeriodCount[l.Period]
	if !ok {
		add("period", "period must be hour, day, week, month or none", "重置周期必须为每小时、每天、每周、每月或不重置")
	} else if l.PeriodCount < 1 || l.PeriodCount > maxCount {
		add("period_count", fmt.Sprintf("period count must be 1-%d (one period lasts at most 366 days)", maxCount),
			fmt.Sprintf("周期长度必须为 1-%d（单个周期最长 366 天）", maxCount))
	}
	if l.Amount.IsNegative() || l.Amount.GreaterThan(decimal.NewFromInt(maxUsageLimitAmount)) || !l.Amount.Equal(l.Amount.Truncate(8)) {
		add("amount", "amount must be 0-1000000000 USD with at most 8 decimals", "限额必须为 0-1000000000 美元，最多 8 位小数")
	}
	if l.Enabled && !l.Amount.IsPositive() {
		add("amount", "set an amount above 0 to enable the usage limit", "开启用量限制需要填写大于 0 的限额")
	}
	if l.Anchor != nil && (l.Anchor.Before(minUsageAnchor) || !l.Anchor.Before(maxUsageAnchor)) {
		add("anchor", "anchor must be between 2000 and 2100", "周期起点必须在 2000 年到 2100 年之间")
	}
	if _, ok := core.LoadTimeZone(l.Timezone); !ok {
		add("timezone", "timezone is required and must be an IANA time zone name", "时区必填，且必须是 IANA 时区名")
	}
	if len(fields) > 0 {
		return core.InvalidFields(fields...)
	}
	return nil
}

// usageLimitWriteError turns a check constraint of account_usage_limits that
// a save still broke (validation drifting from the schema) into the field
// error it is, instead of a 500.
func usageLimitWriteError(ctx context.Context, err error) error {
	var pg *pgconn.PgError
	if !errors.As(err, &pg) || pg.Code != "23514" {
		return err
	}
	field := map[string]string{
		"account_usage_limits_amount_chk": "amount",
		"account_usage_limits_period_chk": "period",
		"account_usage_limits_count_chk":  "period_count",
	}[pg.ConstraintName]
	if field == "" {
		return core.ErrInvalidArgument.WithMessage(t(ctx, "invalid usage limit", "用量限制配置无效"))
	}
	return core.InvalidFields(core.FieldError{Field: field, Code: "invalid", Message: t(ctx, "value out of range", "取值超出范围")})
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
	body := usageLimitInput{UsageLimit: defaultUsageLimit()}
	if !httpapi.BindJSON(c, &body) {
		return
	}
	in, fields := body.limit(ctx)
	if err := validateUsageLimit(ctx, in, fields...); err != nil {
		httpapi.Fail(c, err)
		return
	}
	if in.Anchor != nil {
		a := in.anchorStart()
		in.Anchor = &a
	}
	scope := core.OwnerScope(ctx, "account:update")
	uid, _ := core.UserID(ctx)
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := s.loadRow(ctx, tx, id, scope, true); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO account_usage_limits (account_id, `+usageLimitColumns+`, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, clock_timestamp())
			ON CONFLICT (account_id) DO UPDATE SET raw_cost = EXCLUDED.raw_cost, enabled = EXCLUDED.enabled, amount = EXCLUDED.amount,
				period = EXCLUDED.period, period_count = EXCLUDED.period_count, anchor = EXCLUDED.anchor, timezone = EXCLUDED.timezone,
				waived_window = NULL, updated_at = clock_timestamp()`,
			id, in.RawCost, in.Enabled, in.Amount, in.Period, in.PeriodCount, in.Anchor, in.Timezone); err != nil {
			return usageLimitWriteError(ctx, err)
		}
		return audit.Audit(ctx, tx, uid, "account.usage_limit", "account", itoa(id), map[string]any{
			"raw_cost_accounting": in.RawCost, "enabled": in.Enabled, "amount": in.Amount.String(), "period": in.Period,
			"period_count": in.PeriodCount, "anchor": in.Anchor, "timezone": in.Timezone})
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

// waiveUsageLimit lets an account an administrator brought back by hand run
// for the rest of the period that disabled it, the one ending at its release
// time until (for a lifetime limit: until the limit is saved again). Runs in
// the transaction that re-enables the account, so the sweep never sees it
// active and unwaived.
func waiveUsageLimit(ctx context.Context, q store.Querier, id int64, until *time.Time) error {
	limits, err := usageLimits(ctx, q, []int64{id})
	if err != nil {
		return err
	}
	l, ok := limits[id]
	if !ok || !l.active() {
		return nil
	}
	var at time.Time
	if until != nil {
		at = until.Add(-time.Nanosecond) // periods end before their end
	} else if err := q.QueryRow(ctx, `SELECT clock_timestamp()`).Scan(&at); err != nil {
		return err
	}
	start, _ := l.window(at)
	_, err = q.Exec(ctx, `UPDATE account_usage_limits SET waived_window = $2 WHERE account_id = $1`, id, start)
	return err
}

// foldUsage folds the usage journal into the hourly and lifetime sums. Callers
// hold usageLimitsLock.
func foldUsage(ctx context.Context, q store.Querier) error {
	for range 20 {
		var n int
		if err := q.QueryRow(ctx, `SELECT account_usage_fold($1)`, usageFoldBatch).Scan(&n); err != nil || n < usageFoldBatch {
			return err
		}
	}
	return nil
}

// runUsageLimits is the sweep's share of usage: on one node at a time, fold
// the journal, then apply every usage limit.
func (s *Service) runUsageLimits(ctx context.Context) error {
	conn, err := s.d.DB.Pool.Acquire(ctx)
	if err != nil {
		return err
	}
	defer conn.Release()
	var locked bool
	if err := conn.QueryRow(ctx, `SELECT pg_try_advisory_lock(hashtext($1))`, usageLimitsLock).Scan(&locked); err != nil || !locked {
		return err
	}
	defer func() {
		if _, err := conn.Exec(context.WithoutCancel(ctx), `SELECT pg_advisory_unlock(hashtext($1))`, usageLimitsLock); err != nil {
			_ = conn.Conn().Close(context.WithoutCancel(ctx)) // a closed session drops its locks
		}
	}()
	if err := foldUsage(ctx, conn); err != nil {
		return err
	}
	return s.EnforceUsageLimits(ctx, nil)
}

// usageCandidate is an account EnforceUsageLimits may change, as it read it.
type usageCandidate struct {
	id                     int64
	name, pluginKey, typ   string
	status, reason, source string
	until                  *time.Time
	limit                  UsageLimit
	// limitSaved is account_usage_limits.updated_at (nil: no row). The
	// change is written only while the configuration is still this one.
	limitSaved *time.Time
}

// EnforceUsageLimits applies the usage limits of the given accounts (nil =
// every account with a limit, or disabled by one): an active account at or
// over its limit is auto-disabled until its period ends (no release time for
// a lifetime limit), one still over a changed limit gets the new reason and
// release time, and one the limit disabled that is now under it (limit
// raised, turned off, or released early) is enabled again, or passes to the
// plugin's or failure policy's disable the limit held back while that one
// still runs. The release at the end of a period is the automatic-state
// sweep's. One account's failure does not hold up the others. Periods follow
// the database clock, the one the sweep releases by.
//
// Limits and usage are read outside any transaction; each change is written
// only if the account and its limit configuration are still what was read
// (writeUsageLimitState), so a save on another node in between is never
// enforced with the configuration it replaced.
func (s *Service) EnforceUsageLimits(ctx context.Context, ids []int64) error {
	if s.d.DB == nil {
		return nil
	}
	var filter any
	if ids != nil {
		filter = ids
	}
	def := defaultUsageLimit()
	rows, err := s.d.DB.Pool.Query(ctx, `SELECT a.id, a.name, a.plugin_key, a.type, a.status, a.status_reason, a.auto_disabled_source, a.auto_disabled_until,
			l.updated_at, coalesce(l.raw_cost, false), coalesce(l.enabled, false), coalesce(l.amount, 0), coalesce(l.period, $3), coalesce(l.period_count, 1),
			l.anchor, coalesce(l.timezone, $4), l.waived_window
		FROM accounts a LEFT JOIN account_usage_limits l ON l.account_id = a.id
		WHERE a.deleted_at IS NULL AND ($1::bigint[] IS NULL OR a.id = ANY($1))
			AND ((l.enabled AND a.status = 'active') OR (a.status = 'auto_disabled' AND a.auto_disabled_source = $2))`,
		filter, usageLimitSource, def.Period, def.Timezone)
	if err != nil {
		return err
	}
	cands, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (usageCandidate, error) {
		var c usageCandidate
		err := r.Scan(append([]any{&c.id, &c.name, &c.pluginKey, &c.typ, &c.status, &c.reason, &c.source, &c.until, &c.limitSaved},
			c.limit.scanTargets()...)...)
		return c, err
	})
	if err != nil || len(cands) == 0 {
		return err
	}
	var now time.Time
	if err := s.d.DB.Pool.QueryRow(ctx, `SELECT clock_timestamp()`).Scan(&now); err != nil {
		return err
	}
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
	var failed int
	for _, c := range cands {
		if err := s.enforceUsageLimit(ctx, c, states[c.id]); err != nil {
			failed++
			slog.WarnContext(ctx, "account: apply usage limit", "account", c.id, "err", err)
		}
	}
	if failed > 0 {
		return fmt.Errorf("usage limits: %d of %d accounts failed", failed, len(cands))
	}
	return nil
}

func (s *Service) enforceUsageLimit(ctx context.Context, c usageCandidate, st *UsageLimitState) error {
	over := st.reached()
	limited := limitDisabled(c.status, c.source)
	ch := automaticChange{id: c.id, name: c.name, pluginKey: c.pluginKey, typ: c.typ, from: c.status}
	switch {
	case over && (c.status == "active" || limited && !sameLimitDisable(c, st)):
		ch.to, ch.until, ch.source = "auto_disabled", st.WindowEnd, usageLimitSource
		ch.reason = fmt.Sprintf("%s: $%s / $%s (%s)", usageLimitReason, st.Used.StringFixed(2), st.Amount.StringFixed(2), c.limit.periodText())
	case !over && limited:
		ch.to, ch.eventReason = "active", "usage back under the limit"
	default:
		return nil
	}
	return s.writeUsageLimitState(ctx, c, ch)
}

// writeUsageLimitState writes a change of the usage limit in a transaction
// that locks the account, then its limit row (the order saves and early
// releases lock them in), and goes ahead only if both are still what c was
// read with: the account's status, reason, source and release time, the
// limit's saved configuration and early release. A save in between (another
// node, an administrator raising the limit) is thus never enforced with the
// configuration it replaced; the save applies its own.
//
// A disable of a plugin or failure policy the limit held back (deferred,
// CONTRACTS §73.3) takes over when it outlasts the limit's: a release finds
// it still running, or a changed limit now ends before it.
func (s *Service) writeUsageLimitState(ctx context.Context, c usageCandidate, ch automaticChange) error {
	changed := false
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		var status, reason, source, deferredReason string
		var until, deferredUntil, saved, waived *time.Time
		var deferred bool
		var now time.Time
		err := tx.QueryRow(ctx, `SELECT status, status_reason, auto_disabled_source, auto_disabled_until,
				deferred_auto_disable, deferred_auto_disable_reason, deferred_auto_disabled_until, clock_timestamp()
			FROM accounts WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, c.id).
			Scan(&status, &reason, &source, &until, &deferred, &deferredReason, &deferredUntil, &now)
		if store.IsNoRows(err) {
			return nil
		}
		if err != nil {
			return err
		}
		if status != c.status || reason != c.reason || source != c.source || !sameTime(until, c.until) {
			return nil
		}
		err = tx.QueryRow(ctx, `SELECT updated_at, waived_window FROM account_usage_limits WHERE account_id = $1 FOR SHARE`, c.id).Scan(&saved, &waived)
		if err != nil && !store.IsNoRows(err) {
			return err
		}
		if !sameTime(saved, c.limitSaved) || !sameTime(waived, c.limit.waived) {
			return nil
		}
		running := deferred && (deferredUntil == nil || deferredUntil.After(now))
		if running && (ch.to == "active" || ch.until != nil && (deferredUntil == nil || deferredUntil.After(*ch.until))) {
			ch.to, ch.reason, ch.until, ch.source, ch.eventReason = "auto_disabled", deferredReason, deferredUntil, "", ""
			ch.audit = map[string]any{"deferred_disable": true}
		}
		changed = true
		return s.writeAutomaticStatus(ctx, tx, "account.usage_limit_state", ch)
	})
	if err == nil && changed {
		s.afterStatusChange(ctx, ch.id, ch.pluginKey, ch.typ)
	}
	return err
}

func sameTime(a, b *time.Time) bool {
	return a == nil && b == nil || a != nil && b != nil && a.Equal(*b)
}

// sameLimitDisable reports whether an account the limit disabled already
// carries the current limit and release time (the used figure may move).
func sameLimitDisable(c usageCandidate, st *UsageLimitState) bool {
	tail := fmt.Sprintf(" / $%s (%s)", st.Amount.StringFixed(2), c.limit.periodText())
	return sameTime(c.until, st.WindowEnd) && strings.HasSuffix(c.reason, tail)
}
