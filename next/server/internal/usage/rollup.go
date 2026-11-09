package usage

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// The hourly rollup of usage_logs (CONTRACTS §66.8, migration 0092). The
// statistics read it for the whole hours it holds and usage_logs for the rest
// of their range, so their answers are the same as a live scan's.

// RollupTask is the name of the rollup's scheduled task.
const RollupTask = "core.usage.rollup"

const (
	// rollupSeal is how long after an hour ends it is rolled up. The
	// migration's trigger marks a write 15 minutes after the hour ends, so a
	// write it lets pass has the difference to commit.
	rollupSeal = 30 * time.Minute
	// rollupForwardChunk and rollupBackfillChunk are the hours one
	// transaction rolls up going forward and filling the history.
	rollupForwardChunk  = 6 * time.Hour
	rollupBackfillChunk = 24 * time.Hour
	// rollupDirtyHours bounds the marked hours one transaction recomputes.
	rollupDirtyHours = 24
	// rollupBudget bounds the forward and dirty stages of one run.
	rollupBudget = 2 * time.Minute
	// rollupStatementTimeout bounds each statement of a run.
	rollupStatementTimeout = "60s"
)

// rollupDims are the columns a rollup row is keyed by; usage_hourly names
// them as usage_logs does, created_at being the hour.
var rollupDims = []string{"user_id", "api_key_id", "group_id", "account_id", "model", "upstream_model", "protocol", "platform"}

// statMeasure is one additive column of the statistics: row is a usage_logs
// row's share, and usage_hourly keeps the sum of its hour under name. A
// column row reads must be in the update trigger's column list (0092;
// TestRollupTriggerCoversMeasures).
type statMeasure struct{ name, row string }

// rowIf is then for a row where cond holds, else 0 (a NULL cond included).
func rowIf(cond, then string) string { return "CASE WHEN " + cond + " THEN " + then + " ELSE 0 END" }

var (
	// estimatedRow: the row keeps an estimate. 'reconcile' also takes
	// "retrying" (the row is reserved again, not final) and "refunded" (the
	// row is free), neither of which is an estimate in the revenue.
	estimatedRow = fmt.Sprintf(`u.anomalies->>'%s' IN ('%s', '%s')`, core.AnomalyReconcile, core.ReconcileAbandoned, core.ReconcileEstimated)
	// anomalousRow: one value in the column is a fact, not an anomaly:
	// usage_extract "plugin" says the plugin answered, which on a
	// plugin-metered platform is every request; "fallback" (the plugin did
	// not answer) still counts. The failure policy and availability traces
	// describe how the request was routed, not the record: they never count.
	anomalousRow = fmt.Sprintf(`((u.anomalies - '%[1]s' - 'failure_policy' - '%[2]s') <> '{}'::jsonb OR (u.anomalies ? '%[1]s' AND u.anomalies->>'%[1]s' <> '%[3]s'))`,
		core.AnomalyUsageExtract, core.AnomalyAvailability, core.UsageExtractPlugin)
	timedRow      = `u.success AND u.latency_ms > 0`
	firstTokenRow = `u.success AND u.first_token_ms > 0`

	statMeasures = []statMeasure{
		{"requests", "1"},
		{"success", rowIf("u.success", "1")},
		{"input_tokens", "u.input_tokens"},
		{"output_tokens", "u.output_tokens"},
		{"cache_read_tokens", "u.cache_read_tokens"},
		{"cache_write_tokens", "u.cache_creation_tokens + u.cache_creation_1h_tokens"},
		{"total_cost", "u.total_cost"},
		{"standard_cost", standardCost},
		{"prompt_rows", rowIf("("+promptTokens+") IS NOT NULL", "1")},
		{"prompt_tokens", "COALESCE(" + promptTokens + ", 0)"},
		{"anomalous_rows", rowIf(anomalousRow, "1")},
		{"estimated_rows", rowIf(estimatedRow, "1")},
		{"estimated_cost", rowIf(estimatedRow, "u.total_cost")},
		{"latency_sum", rowIf(timedRow, "u.latency_ms")},
		{"latency_rows", rowIf(timedRow, "1")},
		{"first_token_sum", rowIf(firstTokenRow, "u.first_token_ms")},
		{"first_token_rows", rowIf(firstTokenRow, "1")},
	}
)

// measureList joins each measure as f gives it.
func measureList(f func(statMeasure) string) string {
	out := make([]string, len(statMeasures))
	for i, m := range statMeasures {
		out[i] = f(m)
	}
	return strings.Join(out, ", ")
}

// ---------------------------------------------------------------- reading

// hourSpan is the whole hours [from, to) a query reads from the rollup.
type hourSpan struct{ from, to time.Time }

// readRollupState reads the hours [low, high) the rollup holds (nil before
// the first refresh).
func readRollupState(ctx context.Context, tx pgx.Tx) (low, high *time.Time, err error) {
	err = tx.QueryRow(ctx, `SELECT low, high FROM usage_hourly_state`).Scan(&low, &high)
	return low, high, err
}

// rollupSpan is the part of [from, end) the rollup holds, or nil when it
// holds none of it. With a time zone (day and hour buckets, the overview's
// days) it is nil unless the zone is whole hours from UTC all along the
// range, so that its buckets are made of whole UTC hours.
func rollupSpan(ctx context.Context, tx pgx.Tx, from, end time.Time, loc *time.Location) (*hourSpan, error) {
	if loc != nil && !hourAligned(loc, from, end) {
		return nil, nil
	}
	low, high, err := readRollupState(ctx, tx)
	if err != nil || low == nil {
		return nil, err
	}
	span := hourSpan{from: ceilHour(from), to: end.Truncate(time.Hour)}
	if span.from.Before(*low) {
		span.from = *low
	}
	if span.to.After(*high) {
		span.to = *high
	}
	if !span.from.Before(span.to) {
		return nil, nil
	}
	return &span, nil
}

func ceilHour(t time.Time) time.Time {
	if h := t.Truncate(time.Hour); !h.Equal(t) {
		return h.Add(time.Hour)
	}
	return t
}

// hourAligned says whether loc is a whole number of hours from UTC
// throughout [from, end), walking its offset changes.
func hourAligned(loc *time.Location, from, end time.Time) bool {
	for t := from; t.Before(end); {
		l := t.In(loc)
		if _, off := l.Zone(); off%3600 != 0 {
			return false
		}
		_, next := l.ZoneBounds()
		if next.IsZero() {
			return true
		}
		t = next
	}
	return true
}

// statRows is a FROM item named u: the usage_logs rows matching where, each
// measure being the row's share, and with span the rollup rows of span, each
// measure being its hour's sum. Hours of span marked dirty, not recomputed
// yet, are read from usage_logs too, in the same snapshot as their marks.
// cols are the other output columns, expressions over u that hold on both
// tables; args takes the span's bounds. Each usage_logs part is a plain
// range of the created_at index.
func statRows(cols, joins, where string, span *hourSpan, args *[]any) string {
	live := func(from string) string {
		return `SELECT ` + cols + `, ` + measureList(func(m statMeasure) string { return m.row + ` AS ` + m.name }) + ` FROM ` + from + joins
	}
	if span == nil {
		return `(` + live(`usage_logs u`) + where + `) u`
	}
	from, to := addArg(args, span.from), addArg(args, span.to)
	rolled := `SELECT ` + cols + `, ` + measureList(func(m statMeasure) string { return `u.` + m.name }) + ` FROM usage_hourly u` + joins
	dirty := `(SELECT DISTINCT hour FROM usage_hourly_dirty WHERE hour >= ` + from + ` AND hour < ` + to + `) d
		JOIN usage_logs u ON u.created_at >= d.hour AND u.created_at < d.hour + interval '1 hour'`
	return `(` + live(`usage_logs u`) + andWhere(where, `u.created_at < `+from) +
		` UNION ALL ` + rolled + andWhere(where, `u.created_at >= `+from+` AND u.created_at < `+to+
		` AND NOT EXISTS (SELECT 1 FROM usage_hourly_dirty d WHERE d.hour = u.created_at)`) +
		` UNION ALL ` + live(dirty) + where +
		` UNION ALL ` + live(`usage_logs u`) + andWhere(where, `u.created_at >= `+to) + `) u`
}

// addArg appends v and returns its placeholder.
func addArg(args *[]any, v any) string {
	*args = append(*args, v)
	return fmt.Sprintf("$%d", len(*args))
}

// andWhere adds cond to a " WHERE ..." clause (or "").
func andWhere(where, cond string) string {
	if where == "" {
		return ` WHERE ` + cond
	}
	return where + ` AND ` + cond
}

// sumOf is the sum of a measure over the rows matching cond ("": all), 0
// when there are none.
func sumOf(m, cond string) string {
	return `COALESCE(sum(` + m + `)` + filterWhere(cond) + `, 0)`
}

// avgOf is the rounded average a sum and row count measure give, 0 without rows.
func avgOf(sum, rows, cond string) string {
	return `COALESCE(round((sum(` + sum + `)` + filterWhere(cond) + `)::numeric / NULLIF(sum(` + rows + `)` + filterWhere(cond) + `, 0)), 0)::bigint`
}

func filterWhere(cond string) string {
	if cond == "" {
		return ""
	}
	return ` FILTER (WHERE ` + cond + `)`
}

// ---------------------------------------------------------------- refreshing

// RollupTaskSpec registers the refresh: once a minute on one node.
func (s *Service) RollupTaskSpec() core.TaskSpec {
	return core.TaskSpec{
		Name:  RollupTask,
		Title: core.LocalizedText{"en": "Roll up usage by hour", "zh": "按小时汇总用量"},
		Description: core.LocalizedText{
			"en": "Sums the usage records of each hour that ended half an hour ago, recomputes the hours whose records changed later and fills in the history, for the statistics.",
			"zh": "为统计汇总每个结束满半小时的小时的用量记录，重算之后有改动的小时，并补齐历史。",
		},
		Scope:   core.TaskCluster,
		Every:   time.Minute,
		Timeout: rollupBudget + 2*time.Minute, // a last chunk past the budget, then one of history
		Handler: func(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
			n, err := s.refreshRollup(ctx)
			return core.TaskResult{Count: n}, err
		},
	}
}

// rollupState is usage_hourly_state: the hours [low, high) held.
type rollupState struct{ low, high *time.Time }

// rollupStep does one transaction's share of a refresh stage and says
// whether more is left.
type rollupStep func(context.Context, pgx.Tx, *rollupState) (hours int, more bool, err error)

// refreshRollup brings the rollup up to date: it rolls up the sealed hours,
// recomputes the marked ones, then fills in one chunk of the history. Each
// stage runs whatever the others did; it returns the hours (re)computed.
func (s *Service) refreshRollup(ctx context.Context) (int, error) {
	deadline := time.Now().Add(rollupBudget)
	total := 0
	run := func(step rollupStep, repeat bool) error {
		for {
			var n int
			var more bool
			err := s.rollupTx(ctx, func(tx pgx.Tx, st *rollupState) (err error) {
				n, more, err = step(ctx, tx, st)
				return err
			})
			total += n
			if err != nil || !more || !repeat || time.Now().After(deadline) {
				return err
			}
		}
	}
	// History last and one chunk a run: a cold read of a day is what the
	// shared database feels.
	err := errors.Join(run(rollupForward, true), run(rollupDirty, true), run(rollupBackfill, false))
	if total > 0 {
		slog.InfoContext(ctx, "usage: rolled up hours", "hours", total)
	}
	return total, err
}

// rollupTx runs fn under the rollup's lock with its state, saved after fn.
func (s *Service) rollupTx(ctx context.Context, fn func(pgx.Tx, *rollupState) error) error {
	return pgx.BeginFunc(ctx, s.db.Pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext('usage_hourly')); SET LOCAL statement_timeout = '`+rollupStatementTimeout+`'`); err != nil {
			return err
		}
		var st rollupState
		var err error
		if st.low, st.high, err = readRollupState(ctx, tx); err != nil {
			return err
		}
		if err := fn(tx, &st); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `UPDATE usage_hourly_state SET low = $1, high = $2`, st.low, st.high)
		return err
	})
}

// sealedSQL is the end of the hours that may be rolled up, by the database's
// clock: rollupSeal after an hour ends, and none a write transaction of ours
// still open may have written without marking (it marks rows of hours that
// ended 15 minutes before its statement; it started before that).
var sealedSQL = `SELECT date_trunc('hour', LEAST(now() - interval '` + strconv.Itoa(int(rollupSeal/time.Minute)) + ` minutes',
	COALESCE((SELECT min(xact_start) FROM pg_stat_activity WHERE datname = current_database() AND usename = current_user
		AND backend_xid IS NOT NULL AND pid <> pg_backend_pid()), 'infinity') - interval '15 minutes'), 'UTC')`

// rollupForward rolls up a chunk of the sealed hours after the held ones.
func rollupForward(ctx context.Context, tx pgx.Tx, st *rollupState) (int, bool, error) {
	var sealed time.Time
	if err := tx.QueryRow(ctx, sealedSQL).Scan(&sealed); err != nil {
		return 0, false, err
	}
	if st.high == nil {
		st.low, st.high = &sealed, &sealed
	}
	if !st.high.Before(sealed) {
		return 0, false, nil
	}
	to := st.high.Add(rollupForwardChunk)
	if to.After(sealed) {
		to = sealed
	}
	n, err := rollupHours(ctx, tx, *st.high, to)
	st.high = &to
	return n, to.Before(sealed), err
}

// rollupDirty recomputes the first marked hours and clears the marks read
// for them; marks outside the held hours are cleared alone, those hours
// being rolled up from scratch when they are reached.
func rollupDirty(ctx context.Context, tx pgx.Tx, st *rollupState) (int, bool, error) {
	var ids []int64
	var hours []time.Time
	if err := tx.QueryRow(ctx, `WITH h AS (SELECT DISTINCT hour FROM usage_hourly_dirty ORDER BY hour LIMIT $1)
		SELECT COALESCE(array_agg(d.id), '{}'), COALESCE(array_agg(DISTINCT d.hour), '{}')
		FROM usage_hourly_dirty d JOIN h ON h.hour = d.hour`, rollupDirtyHours).Scan(&ids, &hours); err != nil {
		return 0, false, err
	}
	n := 0
	for _, h := range hours {
		if st.high == nil || h.Before(*st.low) || !h.Before(*st.high) {
			continue
		}
		k, err := rollupHours(ctx, tx, h, h.Add(time.Hour))
		if err != nil {
			return 0, false, err
		}
		n += k
	}
	_, err := tx.Exec(ctx, `DELETE FROM usage_hourly_dirty WHERE id = ANY($1)`, ids)
	return n, len(hours) == rollupDirtyHours, err
}

// rollupBackfill rolls up the chunk of history below the held hours, down to
// the hour of the oldest usage row.
func rollupBackfill(ctx context.Context, tx pgx.Tx, st *rollupState) (int, bool, error) {
	if st.low == nil {
		return 0, false, nil
	}
	var oldest *time.Time
	if err := tx.QueryRow(ctx, `SELECT min(created_at) FROM usage_logs`).Scan(&oldest); err != nil {
		return 0, false, err
	}
	if oldest == nil || !oldest.Truncate(time.Hour).Before(*st.low) {
		return 0, false, nil
	}
	from := st.low.Add(-rollupBackfillChunk)
	if first := oldest.Truncate(time.Hour); from.Before(first) {
		from = first
	}
	n, err := rollupHours(ctx, tx, from, *st.low)
	st.low = &from
	return n, true, err
}

// rollupHours recomputes the rollup of the hours [from, to) from usage_logs
// and returns how many hours that was.
func rollupHours(ctx context.Context, tx pgx.Tx, from, to time.Time) (int, error) {
	if _, err := tx.Exec(ctx, `DELETE FROM usage_hourly WHERE created_at >= $1 AND created_at < $2`, from, to); err != nil {
		return 0, err
	}
	dims := strings.Join(rollupDims, ", ")
	if _, err := tx.Exec(ctx, `INSERT INTO usage_hourly (created_at, `+dims+`, `+measureList(func(m statMeasure) string { return m.name })+`)
		SELECT date_trunc('hour', u.created_at, 'UTC'), `+dims+`, `+measureList(func(m statMeasure) string { return `sum(` + m.row + `)` })+`
		FROM usage_logs u WHERE u.created_at >= $1 AND u.created_at < $2
		GROUP BY 1, `+dims, from, to); err != nil {
		return 0, err
	}
	return int(to.Sub(from) / time.Hour), nil
}
