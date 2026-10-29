package usage

import (
	"cmp"
	"context"
	"errors"
	"fmt"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
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

// Overview is GET /me/usage/overview and GET /usage/overview: the dashboard's
// figures in one answer. APIKeys is the caller's (self view only); Users and
// Accounts are the operator's, each only with the permission to read them.
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
	APIKeys *struct {
		Total  int64 `json:"total"`
		Active int64 `json:"active"`
	} `json:"api_keys,omitempty"`
	Users *struct {
		Total       int64 `json:"total"`
		NewToday    int64 `json:"new_today"`
		ActiveToday int64 `json:"active_today"`
	} `json:"users,omitempty"`
	Accounts *struct {
		Total        int64 `json:"total"`
		Available    int64 `json:"available"`
		AutoDisabled int64 `json:"auto_disabled"`
		Disabled     int64 `json:"disabled"`
	} `json:"accounts,omitempty"`
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

// GET /me/usage/overview?tz=: the caller's today and yesterday, last 30 days
// (calendar days in tz), last 5 minutes and API keys, from one scan of the
// caller's last 30 days.
func (s *Service) myOverview(c *gin.Context) {
	uid, _ := core.UserID(c.Request.Context())
	s.overview(c, &uid)
}

// GET /usage/overview?tz= (usage:all:read): the same windows over every user,
// plus users (user:read) and accounts (account:read). Cached for
// overviewTTL per time zone and permission set: it scans everyone's last 30
// days.
func (s *Service) allOverview(c *gin.Context) { s.overview(c, nil) }

const overviewTTL = 30 * time.Second

func (s *Service) overview(c *gin.Context, self *int64) {
	ctx := c.Request.Context()
	tz, loc, err := parseTZ(c)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	uid, _ := core.UserID(ctx)
	users, accounts := false, false
	if self == nil {
		users, accounts = s.can(ctx, uid, "user:read"), s.can(ctx, uid, "account:read")
		if v, ok := s.overviews.get(tz, users, accounts); ok {
			httpapi.OK(c, v)
			return
		}
	}
	now := time.Now()
	w := overviewWindows(now, loc)
	out := Overview{TZ: tz}
	err = s.statsTx(ctx, func(tx pgx.Tx) error {
		targets := append(append(append(out.Today.scanTargets(), out.Yesterday.scanTargets()...), out.Last30d.scanTargets()...),
			&out.Last5m.Requests, &out.Last5m.Tokens)
		where, args := `u.created_at >= least($1, $2)`, []any{w.yesterday, w.last30d, w.today, w.last5m}
		if self != nil {
			where, args = where+` AND u.user_id = $5`, append(args, *self)
		}
		if err := tx.QueryRow(ctx, `SELECT `+
			totalsColumns(`u.created_at >= $3`)+`, `+
			totalsColumns(`u.created_at >= $1 AND u.created_at < $3`)+`, `+
			totalsColumns(`u.created_at >= $2`)+`,
			count(*) FILTER (WHERE u.created_at >= $4),
			COALESCE(sum(u.input_tokens + u.output_tokens + u.cache_read_tokens + u.cache_creation_tokens + u.cache_creation_1h_tokens)
				FILTER (WHERE u.created_at >= $4), 0)
			FROM usage_logs u WHERE `+where, args...).Scan(targets...); err != nil {
			return err
		}
		if self != nil {
			out.APIKeys = &struct {
				Total  int64 `json:"total"`
				Active int64 `json:"active"`
			}{}
			return tx.QueryRow(ctx, `SELECT count(*),
				count(*) FILTER (WHERE status = 'active' AND (expires_at IS NULL OR expires_at > now()))
				FROM api_keys WHERE user_id = $1 AND deleted_at IS NULL`, *self).Scan(&out.APIKeys.Total, &out.APIKeys.Active)
		}
		if users {
			out.Users = &struct {
				Total       int64 `json:"total"`
				NewToday    int64 `json:"new_today"`
				ActiveToday int64 `json:"active_today"`
			}{}
			if err := tx.QueryRow(ctx, `SELECT count(*), count(*) FILTER (WHERE created_at >= $1),
				(SELECT count(DISTINCT user_id) FROM usage_logs WHERE created_at >= $1)
				FROM users WHERE deleted_at IS NULL`, w.today).Scan(&out.Users.Total, &out.Users.NewToday, &out.Users.ActiveToday); err != nil {
				return err
			}
		}
		if accounts {
			out.Accounts = &struct {
				Total        int64 `json:"total"`
				Available    int64 `json:"available"`
				AutoDisabled int64 `json:"auto_disabled"`
				Disabled     int64 `json:"disabled"`
			}{}
			// The console's three statuses: a legacy "error" and an active account out of scheduling read as auto-disabled.
			if err := tx.QueryRow(ctx, `SELECT count(*), count(*) FILTER (WHERE status = 'active' AND schedulable),
				count(*) FILTER (WHERE status IN ('auto_disabled', 'error') OR (status = 'active' AND NOT schedulable)),
				count(*) FILTER (WHERE status = 'disabled')
				FROM accounts WHERE deleted_at IS NULL`).Scan(&out.Accounts.Total, &out.Accounts.Available, &out.Accounts.AutoDisabled, &out.Accounts.Disabled); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if self == nil {
		s.overviews.put(tz, users, accounts, out)
	}
	httpapi.OK(c, out)
}

// can asks the Authorizer; no Authorizer or an error count as "no".
func (s *Service) can(ctx context.Context, uid int64, perm string) bool {
	if s.Authz == nil {
		return false
	}
	ok, err := s.Authz.Can(ctx, uid, perm)
	return err == nil && ok
}

// overviewCache keeps each operator overview for overviewTTL, keyed by time
// zone and by which optional sections the caller may see.
type overviewCache struct {
	mu      sync.Mutex
	entries map[string]cachedOverview
}

type cachedOverview struct {
	at time.Time
	v  Overview
}

func overviewKey(tz string, users, accounts bool) string {
	return fmt.Sprintf("%s|%t|%t", tz, users, accounts)
}

func (c *overviewCache) get(tz string, users, accounts bool) (Overview, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.entries[overviewKey(tz, users, accounts)]
	if !ok || time.Since(e.at) >= overviewTTL {
		return Overview{}, false
	}
	return e.v, true
}

func (c *overviewCache) put(tz string, users, accounts bool, v Overview) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.entries == nil || len(c.entries) > 256 {
		c.entries = map[string]cachedOverview{}
	}
	c.entries[overviewKey(tz, users, accounts)] = cachedOverview{at: time.Now(), v: v}
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

// rankRows applies ?order=cost|requests|tokens&limit=N to grouped summary
// rows: the largest first, the rest folded into one row keyed "__other__".
// Without either parameter the rows are returned unchanged.
func rankRows(c *gin.Context, rows []SummaryRow) ([]SummaryRow, error) {
	order, limitArg := c.Query("order"), c.Query("limit")
	if order == "" && limitArg == "" {
		return rows, nil
	}
	metric := map[string]func(SummaryRow) decimal.Decimal{
		"cost":     func(r SummaryRow) decimal.Decimal { return r.TotalCost },
		"requests": func(r SummaryRow) decimal.Decimal { return decimal.NewFromInt(r.Requests) },
		"tokens":   func(r SummaryRow) decimal.Decimal { return decimal.NewFromInt(r.TotalTokens) },
	}[cmp.Or(order, "cost")]
	if metric == nil {
		return nil, core.ErrInvalidArgument.WithMessage("order must be cost, requests or tokens")
	}
	limit := 200
	if limitArg != "" {
		n, err := strconv.Atoi(limitArg)
		if err != nil || n < 1 || n > 200 {
			return nil, core.ErrInvalidArgument.WithMessage("limit must be 1-200")
		}
		limit = n
	}
	slices.SortStableFunc(rows, func(a, b SummaryRow) int {
		if d := metric(b).Cmp(metric(a)); d != 0 {
			return d
		}
		return strings.Compare(a.Key, b.Key)
	})
	if len(rows) <= limit {
		return rows, nil
	}
	other := SummaryRow{Key: "__other__", PromptTokens: new(int64)}
	var latencyWeight, firstWeight int64
	for _, r := range rows[limit:] {
		other.Requests += r.Requests
		other.Success += r.Success
		other.InputTokens += r.InputTokens
		other.OutputTokens += r.OutputTokens
		other.CacheReadTokens += r.CacheReadTokens
		other.CacheCreationTokens += r.CacheCreationTokens
		other.TotalTokens += r.TotalTokens
		other.TotalCost = other.TotalCost.Add(r.TotalCost)
		other.StandardCost = other.StandardCost.Add(r.StandardCost)
		other.EstimatedCost = other.EstimatedCost.Add(r.EstimatedCost)
		other.Anomalies += r.Anomalies
		other.Estimated += r.Estimated
		if other.PromptTokens != nil && r.PromptTokens != nil {
			*other.PromptTokens += *r.PromptTokens
		} else {
			other.PromptTokens = nil
		}
		// Averages over successful requests, weighted by them.
		other.LatencyMsAvg += r.LatencyMsAvg * r.Success
		other.FirstTokenMsAvg += r.FirstTokenMsAvg * r.Success
		if r.LatencyMsAvg > 0 {
			latencyWeight += r.Success
		}
		if r.FirstTokenMsAvg > 0 {
			firstWeight += r.Success
		}
	}
	if latencyWeight > 0 {
		other.LatencyMsAvg /= latencyWeight
	}
	if firstWeight > 0 {
		other.FirstTokenMsAvg /= firstWeight
	}
	return append(rows[:limit:limit], other), nil
}
