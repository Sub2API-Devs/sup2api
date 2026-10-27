package usage

import (
	"context"
	"errors"
	"regexp"
	"time"
	_ "time/tzdata" // tz= accepts IANA names on minimal images

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// Console statistics (CONTRACTS §66): the summary's day and hour buckets and
// the overview's "today" follow the caller's time zone, every statistics
// query runs under a statement timeout, and a timeout is an error the console
// shows as one, never as zeros.

// statsTimeout bounds one statistics query. They scan usage_logs live (there
// is no rollup table); a range too large to answer in time is refused rather
// than left to hold a connection.
const statsTimeout = "5s"

// maxHourSpan caps group_by=hour: 31 days is 744 buckets.
const maxHourSpan = 31 * 24 * time.Hour

var tzName = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_+\-]*(/[A-Za-z0-9_+\-]+)*$`)

// parseTZ reads tz=<IANA name> (default UTC). The same name goes to
// PostgreSQL's AT TIME ZONE, so it is checked against Go's database and a
// conservative pattern first.
func parseTZ(c *gin.Context) (string, *time.Location, error) {
	name := c.DefaultQuery("tz", "UTC")
	if len(name) > 64 || name == "Local" || !tzName.MatchString(name) {
		return "", nil, core.ErrInvalidArgument.WithMessage("invalid tz (IANA time zone name)")
	}
	loc, err := time.LoadLocation(name)
	if err != nil {
		return "", nil, core.ErrInvalidArgument.WithMessage("invalid tz (IANA time zone name)")
	}
	return name, loc, nil
}

// statsTx runs fn in a read-only transaction with the statistics timeout.
func (s *Service) statsTx(ctx context.Context, fn func(pgx.Tx) error) error {
	tx, err := s.db.Pool.BeginTx(ctx, pgx.TxOptions{AccessMode: pgx.ReadOnly})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, `SET LOCAL statement_timeout = '`+statsTimeout+`'`); err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		var pe *pgconn.PgError
		if errors.As(err, &pe) && pe.Code == "57014" { // query_canceled
			return core.ErrUnavailable.WithMessage("statistics query timed out; narrow the time range or filters")
		}
		return err
	}
	return tx.Commit(ctx)
}

// promptTokens matches expr.Normalize's inclusive/exclusive input
// convention, including both cache-write buckets. Missing historical
// semantics are not guessed from the client protocol (the gateway may have
// converted it): such a row with cached input gives NULL.
const promptTokens = `CASE
		WHEN u.cache_read_tokens + u.cache_creation_tokens + u.cache_creation_1h_tokens = 0 THEN u.input_tokens
		WHEN u.billing_detail->'inputs'->>'semantics' = 'inclusive' THEN u.input_tokens
		WHEN u.billing_detail->'inputs'->>'semantics' IN ('exclusive', '') THEN
			u.input_tokens + u.cache_read_tokens + u.cache_creation_tokens + u.cache_creation_1h_tokens
		END`

// standardCost is a row's cost before the group multiplier. A free group
// (multiplier 0) charged nothing and reports nothing.
const standardCost = `CASE WHEN u.rate_multiplier > 0 THEN u.total_cost / u.rate_multiplier ELSE u.total_cost END`

// Totals is one window of GET /me/usage/overview.
type Totals struct {
	Requests            int64           `json:"requests"`
	Success             int64           `json:"success"`
	InputTokens         int64           `json:"input_tokens"`
	OutputTokens        int64           `json:"output_tokens"`
	CacheReadTokens     int64           `json:"cache_read_tokens"`
	CacheCreationTokens int64           `json:"cache_creation_tokens"`
	PromptTokens        *int64          `json:"prompt_tokens"`
	TotalCost           decimal.Decimal `json:"total_cost"`
	StandardCost        decimal.Decimal `json:"standard_cost"`
	LatencyMsAvg        int64           `json:"latency_ms_avg"`
	FirstTokenMsAvg     int64           `json:"first_token_ms_avg"`
}

// Overview is GET /me/usage/overview: the dashboard's figures in one answer.
type Overview struct {
	TZ        string `json:"tz"`
	Today     Totals `json:"today"`
	Yesterday Totals `json:"yesterday"`
	Last30d   Totals `json:"last_30d"`
	// Last5m gives the requests and tokens per minute (divide by 5).
	Last5m struct {
		Requests int64 `json:"requests"`
		Tokens   int64 `json:"tokens"`
	} `json:"last_5m"`
	APIKeys struct {
		Total  int64 `json:"total"`
		Active int64 `json:"active"`
	} `json:"api_keys"`
}

// totalsColumns are the aggregates of Totals over the rows matching cond.
func totalsColumns(cond string) string {
	w := ` FILTER (WHERE ` + cond + `)`
	return `count(*)` + w + `, count(*) FILTER (WHERE u.success AND ` + cond + `),
		COALESCE(sum(u.input_tokens)` + w + `, 0), COALESCE(sum(u.output_tokens)` + w + `, 0),
		COALESCE(sum(u.cache_read_tokens)` + w + `, 0),
		COALESCE(sum(u.cache_creation_tokens + u.cache_creation_1h_tokens)` + w + `, 0),
		CASE WHEN count(*)` + w + ` = count(` + promptTokens + `)` + w + ` THEN COALESCE(sum(` + promptTokens + `)` + w + `, 0) END,
		COALESCE(sum(u.total_cost)` + w + `, 0), COALESCE(sum(` + standardCost + `)` + w + `, 0),
		COALESCE(round(avg(u.latency_ms) FILTER (WHERE u.success AND u.latency_ms > 0 AND ` + cond + `)), 0)::bigint,
		COALESCE(round(avg(u.first_token_ms) FILTER (WHERE u.success AND u.first_token_ms > 0 AND ` + cond + `)), 0)::bigint`
}

func (t *Totals) scanTargets() []any {
	return []any{&t.Requests, &t.Success, &t.InputTokens, &t.OutputTokens, &t.CacheReadTokens, &t.CacheCreationTokens,
		&t.PromptTokens, &t.TotalCost, &t.StandardCost, &t.LatencyMsAvg, &t.FirstTokenMsAvg}
}

// GET /me/usage/overview?tz=: today and yesterday, the last 30 days (calendar
// days in tz), the last 5 minutes and the caller's API keys, from one scan
// of the caller's last 30 days.
func (s *Service) myOverview(c *gin.Context) {
	uid, _ := core.UserID(c.Request.Context())
	tz, loc, err := parseTZ(c)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	now := time.Now()
	out := Overview{TZ: tz}
	err = s.statsTx(c.Request.Context(), func(tx pgx.Tx) error {
		targets := append(append(append(out.Today.scanTargets(), out.Yesterday.scanTargets()...), out.Last30d.scanTargets()...),
			&out.Last5m.Requests, &out.Last5m.Tokens)
		w := overviewWindows(now, loc)
		if err := tx.QueryRow(c.Request.Context(), `SELECT `+
			totalsColumns(`u.created_at >= $2`)+`, `+
			totalsColumns(`u.created_at >= $3 AND u.created_at < $2`)+`, `+
			totalsColumns(`u.created_at >= $4`)+`,
			count(*) FILTER (WHERE u.created_at >= $5),
			COALESCE(sum(u.input_tokens + u.output_tokens + u.cache_read_tokens + u.cache_creation_tokens + u.cache_creation_1h_tokens)
				FILTER (WHERE u.created_at >= $5), 0)
			FROM usage_logs u WHERE u.user_id = $1 AND u.created_at >= least($3, $4)`,
			uid, w.today, w.yesterday, w.last30d, w.last5m).Scan(targets...); err != nil {
			return err
		}
		return tx.QueryRow(c.Request.Context(), `SELECT count(*),
			count(*) FILTER (WHERE status = 'active' AND (expires_at IS NULL OR expires_at > now()))
			FROM api_keys WHERE user_id = $1 AND deleted_at IS NULL`, uid).Scan(&out.APIKeys.Total, &out.APIKeys.Active)
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

type windows struct{ today, yesterday, last30d, last5m time.Time }

// overviewWindows gives the lower bounds of the overview's windows. Days are
// calendar days in loc (the last 30 are today and the 29 before it, as the
// console's "last 30 days" range); AddDate keeps a DST day at its real length.
func overviewWindows(now time.Time, loc *time.Location) windows {
	l := now.In(loc)
	today := time.Date(l.Year(), l.Month(), l.Day(), 0, 0, 0, 0, loc)
	return windows{today: today, yesterday: today.AddDate(0, 0, -1), last30d: today.AddDate(0, 0, -29), last5m: now.Add(-5 * time.Minute)}
}
