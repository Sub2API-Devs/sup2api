package usage

import (
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Record is the list view of a usage_logs row.
type Record struct {
	ID                    int64           `json:"id"`
	RequestID             string          `json:"request_id"`
	ClientRequestID       string          `json:"client_request_id"` // client X-Request-Id; shown to its owner too
	CreatedAt             time.Time       `json:"created_at"`
	UserID                int64           `json:"user_id"`
	UserEmail             string          `json:"user_email,omitempty"`
	APIKeyID              int64           `json:"api_key_id"`
	APIKeyName            string          `json:"api_key_name,omitempty"`
	GroupID               int64           `json:"group_id"`
	GroupName             string          `json:"group_name,omitempty"`
	AccountID             *int64          `json:"account_id"`
	AccountName           string          `json:"account_name,omitempty"`
	PluginKey             string          `json:"plugin_key"`
	Platform              string          `json:"platform"`
	Protocol              string          `json:"protocol"`
	AccountType           string          `json:"account_type"`
	UpstreamProtocol      string          `json:"upstream_protocol"`
	Endpoint              string          `json:"endpoint"`
	Model                 string          `json:"model"`
	UpstreamModel         string          `json:"upstream_model"`
	Stream                bool            `json:"stream"`
	StatusCode            int             `json:"status_code"`
	Success               bool            `json:"success"`
	ErrorType             string          `json:"error_type"`
	ErrorMessage          string          `json:"error_message"`
	Attempts              int             `json:"attempts"`
	InputTokens           int64           `json:"input_tokens"`
	OutputTokens          int64           `json:"output_tokens"`
	CacheReadTokens       int64           `json:"cache_read_tokens"`
	CacheCreationTokens   int64           `json:"cache_creation_tokens"`
	CacheCreation1hTokens int64           `json:"cache_creation_1h_tokens"`
	TotalCost             decimal.Decimal `json:"total_cost"`
	RateMultiplier        decimal.Decimal `json:"rate_multiplier"`
	BillingStatus         string          `json:"billing_status"`
	BillingMode           string          `json:"billing_mode"`
	MatchedTier           string          `json:"matched_tier"`
	LatencyMs             int             `json:"latency_ms"`
	FirstTokenMs          int             `json:"first_token_ms"`
	StickyHit             bool            `json:"sticky_hit"`
}

// PriceRef identifies the price rule used for a record.
type PriceRef struct {
	ID        int64   `json:"id"`
	Model     string  `json:"model"`
	Source    string  `json:"source"`
	PluginKey *string `json:"plugin_key"`
}

// Detail is the full view of one record.
type Detail struct {
	Record
	PluginVersion string          `json:"plugin_version"`
	Metrics       json.RawMessage `json:"metrics"`
	StickyRule    string          `json:"sticky_rule"`
	HookDecisions json.RawMessage `json:"hook_decisions"`
	PriceID       *int64          `json:"price_id"`
	Price         *PriceRef       `json:"price,omitempty"`
	ExprHash      string          `json:"expr_hash"`
	BillingDetail json.RawMessage `json:"billing_detail"`
	LedgerID      *int64          `json:"ledger_id"`
	ClientIP      string          `json:"client_ip"`
	UserAgent     string          `json:"user_agent"`
	NodeID        string          `json:"node_id"`
}

// RegisterRoutes mounts the usage console API.
func (s *Service) RegisterRoutes(r *httpapi.Router) {
	r.Perm("GET", "/me/usage", "usage:self:read", s.myUsage)
	r.Perm("GET", "/me/usage/:id", "usage:self:read", s.myUsageDetail)
	r.Perm("GET", "/usage", "usage:all:read", s.allUsage)
	r.Perm("GET", "/usage/summary", "usage:all:read", s.summary)
	r.Perm("GET", "/usage/:id", "usage:all:read", s.usageDetail)
}

const recordColumns = `u.id, u.request_id, u.client_request_id, u.created_at, u.user_id, COALESCE(us.email, ''), u.api_key_id,
	COALESCE(k.name, ''), u.group_id, COALESCE(g.name, ''), u.account_id, COALESCE(a.name, ''), u.plugin_key,
	u.platform, u.protocol, u.account_type, u.upstream_protocol, u.endpoint, u.model, u.upstream_model, u.stream,
	u.status_code, u.success,
	u.error_type, u.error_message, u.attempts, u.input_tokens, u.output_tokens, u.cache_read_tokens,
	u.cache_creation_tokens, u.cache_creation_1h_tokens, u.total_cost, u.rate_multiplier, u.billing_status,
	u.billing_mode, u.matched_tier, u.latency_ms, u.first_token_ms, u.sticky_hit`

const recordJoins = ` FROM usage_logs u
	LEFT JOIN users us ON us.id = u.user_id
	LEFT JOIN api_keys k ON k.id = u.api_key_id
	LEFT JOIN groups g ON g.id = u.group_id
	LEFT JOIN accounts a ON a.id = u.account_id`

func (r *Record) scanTargets() []any {
	return []any{&r.ID, &r.RequestID, &r.ClientRequestID, &r.CreatedAt, &r.UserID, &r.UserEmail, &r.APIKeyID, &r.APIKeyName,
		&r.GroupID, &r.GroupName, &r.AccountID, &r.AccountName, &r.PluginKey, &r.Platform, &r.Protocol,
		&r.AccountType, &r.UpstreamProtocol,
		&r.Endpoint, &r.Model, &r.UpstreamModel, &r.Stream, &r.StatusCode, &r.Success, &r.ErrorType,
		&r.ErrorMessage, &r.Attempts, &r.InputTokens, &r.OutputTokens, &r.CacheReadTokens,
		&r.CacheCreationTokens, &r.CacheCreation1hTokens, &r.TotalCost, &r.RateMultiplier, &r.BillingStatus,
		&r.BillingMode, &r.MatchedTier, &r.LatencyMs, &r.FirstTokenMs, &r.StickyHit}
}

// hideUpstream removes upstream account details (account, account type and
// upstream protocol) from self-service views.
func (r *Record) hideUpstream() {
	r.AccountID, r.AccountName = nil, ""
	r.AccountType, r.UpstreamProtocol = "", ""
}

type filter struct {
	where []string
	args  []any
}

func (f *filter) add(cond string, v any) {
	f.args = append(f.args, v)
	f.where = append(f.where, strings.ReplaceAll(cond, "?", "$"+strconv.Itoa(len(f.args))))
}

func (f *filter) sql() string {
	if len(f.where) == 0 {
		return ""
	}
	return " WHERE " + strings.Join(f.where, " AND ")
}

// parseFilter reads the common query parameters. self restricts to userID.
func parseFilter(c *gin.Context, self *int64) (*filter, error) {
	f := &filter{}
	if self != nil {
		f.add("u.user_id = ?", *self)
	}
	ids := []struct{ q, col string }{{"api_key_id", "u.api_key_id"}, {"group_id", "u.group_id"}}
	if self == nil {
		ids = append(ids, struct{ q, col string }{"user_id", "u.user_id"}, struct{ q, col string }{"account_id", "u.account_id"})
	}
	for _, x := range ids {
		if v := c.Query(x.q); v != "" {
			id, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return nil, core.ErrInvalidArgument.WithMessage("invalid " + x.q)
			}
			f.add(x.col+" = ?", id)
		}
	}
	for _, x := range []struct{ q, col string }{{"model", "u.model"}, {"platform", "u.platform"}, {"billing_status", "u.billing_status"}, {"request_id", "u.request_id"},
		{"client_request_id", "u.client_request_id"}} {
		if v := c.Query(x.q); v != "" {
			f.add(x.col+" = ?", v)
		}
	}
	if self == nil {
		if v := c.Query("account_type"); v != "" {
			f.add("u.account_type = ?", v)
		}
	}
	if v := c.Query("success"); v != "" {
		b, err := strconv.ParseBool(v)
		if err != nil {
			return nil, core.ErrInvalidArgument.WithMessage("invalid success")
		}
		f.add("u.success = ?", b)
	}
	for _, x := range []struct{ q, cond string }{{"from", "u.created_at >= ?"}, {"to", "u.created_at < ?"}} {
		if v := c.Query(x.q); v != "" {
			t, err := time.Parse(time.RFC3339, v)
			if err != nil {
				return nil, core.ErrInvalidArgument.WithMessage("invalid " + x.q + " (RFC 3339)")
			}
			f.add(x.cond, t)
		}
	}
	return f, nil
}

func (s *Service) myUsage(c *gin.Context) {
	uid, _ := core.UserID(c.Request.Context())
	s.list(c, &uid)
}

func (s *Service) allUsage(c *gin.Context) { s.list(c, nil) }

func (s *Service) list(c *gin.Context, self *int64) {
	ctx := c.Request.Context()
	f, err := parseFilter(c, self)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	page, size := httpapi.Pagination(c)
	var total int64
	if err := s.db.Pool.QueryRow(ctx, `SELECT count(*) FROM usage_logs u`+f.sql(), f.args...).Scan(&total); err != nil {
		httpapi.Fail(c, err)
		return
	}
	args := append(f.args, size, (page-1)*size)
	rows, err := s.db.Pool.Query(ctx, `SELECT `+recordColumns+recordJoins+f.sql()+
		` ORDER BY u.created_at DESC, u.id DESC LIMIT $`+strconv.Itoa(len(args)-1)+` OFFSET $`+strconv.Itoa(len(args)), args...)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer rows.Close()
	items := []Record{}
	for rows.Next() {
		var r Record
		if err := rows.Scan(r.scanTargets()...); err != nil {
			httpapi.Fail(c, err)
			return
		}
		if self != nil {
			r.hideUpstream()
		}
		items = append(items, r)
	}
	if err := rows.Err(); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.List(c, items, httpapi.Page{Page: page, PageSize: size, Total: total})
}

func (s *Service) myUsageDetail(c *gin.Context) {
	uid, _ := core.UserID(c.Request.Context())
	s.detail(c, &uid)
}

func (s *Service) usageDetail(c *gin.Context) { s.detail(c, nil) }

func (s *Service) detail(c *gin.Context, self *int64) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var d Detail
	targets := append(d.Record.scanTargets(), &d.PluginVersion, &d.Metrics, &d.StickyRule, &d.HookDecisions,
		&d.PriceID, &d.ExprHash, &d.BillingDetail, &d.ClientIP, &d.UserAgent, &d.NodeID)
	err := s.db.Pool.QueryRow(ctx, `SELECT `+recordColumns+`, u.plugin_version, u.metrics, u.sticky_rule,
		u.hook_decisions, u.price_id, u.expr_hash, u.billing_detail, u.client_ip, u.user_agent, u.node_id`+
		recordJoins+` WHERE u.id = $1`, id).Scan(targets...)
	if store.IsNoRows(err) || (err == nil && self != nil && d.UserID != *self) {
		httpapi.Fail(c, core.ErrNotFound.WithMessage("usage record not found"))
		return
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if d.PriceID != nil {
		var p PriceRef
		err := s.db.Pool.QueryRow(ctx, `SELECT id, model, source, plugin_key FROM model_prices WHERE id = $1`, *d.PriceID).
			Scan(&p.ID, &p.Model, &p.Source, &p.PluginKey)
		if err == nil {
			d.Price = &p
		}
	}
	var ledgerID int64
	if err := s.db.Pool.QueryRow(ctx, `SELECT id FROM balance_ledger WHERE idempotency_key = $1`, "usage:"+d.RequestID).Scan(&ledgerID); err == nil {
		d.LedgerID = &ledgerID
	}
	if self != nil {
		d.hideUpstream()
		d.NodeID = ""
	}
	httpapi.OK(c, d)
}

// SummaryRow is one group of GET /usage/summary.
type SummaryRow struct {
	Key                 string          `json:"key"`
	UserEmail           string          `json:"user_email,omitempty"`
	Requests            int64           `json:"requests"`
	Success             int64           `json:"success"`
	InputTokens         int64           `json:"input_tokens"`
	OutputTokens        int64           `json:"output_tokens"`
	CacheReadTokens     int64           `json:"cache_read_tokens"`
	CacheCreationTokens int64           `json:"cache_creation_tokens"`
	TotalCost           decimal.Decimal `json:"total_cost"`
}

// GET /usage/summary?from=&to=&group_by=day|model|user (default: day, last
// 30 days). Days are UTC dates "YYYY-MM-DD"; users are keyed by id.
func (s *Service) summary(c *gin.Context) {
	ctx := c.Request.Context()
	f, err := parseFilter(c, nil)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if c.Query("from") == "" {
		f.add("u.created_at >= ?", time.Now().AddDate(0, 0, -30))
	}
	var key, join, extra string
	switch c.DefaultQuery("group_by", "day") {
	case "day":
		key = `to_char(u.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')`
	case "model":
		key = `u.model`
	case "user":
		key = `u.user_id::text`
		join = ` LEFT JOIN users us ON us.id = u.user_id`
		extra = `, COALESCE(max(us.email), '')`
	default:
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("group_by must be day, model or user"))
		return
	}
	if extra == "" {
		extra = `, ''`
	}
	rows, err := s.db.Pool.Query(ctx, `
		SELECT `+key+` AS k`+extra+`, count(*), count(*) FILTER (WHERE u.success),
		       COALESCE(sum(u.input_tokens), 0), COALESCE(sum(u.output_tokens), 0),
		       COALESCE(sum(u.cache_read_tokens), 0),
		       COALESCE(sum(u.cache_creation_tokens + u.cache_creation_1h_tokens), 0),
		       COALESCE(sum(u.total_cost), 0)
		FROM usage_logs u`+join+f.sql()+` GROUP BY k ORDER BY k`, f.args...)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer rows.Close()
	out := []SummaryRow{}
	for rows.Next() {
		var r SummaryRow
		if err := rows.Scan(&r.Key, &r.UserEmail, &r.Requests, &r.Success, &r.InputTokens, &r.OutputTokens,
			&r.CacheReadTokens, &r.CacheCreationTokens, &r.TotalCost); err != nil {
			httpapi.Fail(c, err)
			return
		}
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}
