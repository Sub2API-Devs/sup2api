package usage

import (
	"encoding/json"
	"fmt"
	"net/netip"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/x"
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
	ClientIP              string          `json:"client_ip"`
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
	UploadMs              int             `json:"upload_ms"`
	StickyHit             bool            `json:"sticky_hit"`
}

// PriceRef identifies the price rule used for a record.
type PriceRef struct {
	ID     int64  `json:"id"`
	Model  string `json:"model"`
	Source string `json:"source"` // manual | sync
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
	// Anomalies are the observability markers of the row
	// (usage_logs.anomalies, core.Anomaly*): the upstream answered in an
	// undeclared shape, a plugin was asked for the usage and did not answer,
	// the core gave up reconciling a pre-charged row. '{}' is the normal
	// case. Hidden from self-service views: every one of them is a statement
	// about the upstream side of the request.
	Anomalies json.RawMessage `json:"anomalies,omitempty"`
	// PluginDetail is what the plugin said about the upstream response
	// (usage_logs.plugin_detail, CONTRACTS §25.3). Hidden from self-service
	// views like the other upstream-side fields: it is written by the plugin
	// that talked to the upstream, about the upstream.
	PluginDetail json.RawMessage `json:"plugin_detail,omitempty"`
	// Settlement is the pre-charged entry this row is waiting on, or the one
	// it ended up with (CONTRACTS §25.4); absent for the ordinary request
	// whose usage was final when its response ended. Hidden from
	// self-service views like the rest of the upstream side.
	Settlement *Settlement `json:"settlement,omitempty"`
	LedgerID   *int64      `json:"ledger_id"`
	UserAgent  string      `json:"user_agent"`
	NodeID     string      `json:"node_id"`
}

// RegisterRoutes mounts the usage console API.
func (s *Service) RegisterRoutes(r *httpapi.Router) {
	r.Perm("GET", "/me/usage", "usage:self:read", s.myUsage)
	r.Perm("GET", "/me/usage/summary", "usage:self:read", s.mySummary)
	r.Perm("GET", "/me/usage/overview", "usage:self:read", s.myOverview)
	r.Perm("GET", "/me/usage/:id", "usage:self:read", s.myUsageDetail)
	r.Perm("GET", "/usage", "usage:all:read", s.allUsage)
	r.Perm("GET", "/usage/summary", "usage:all:read", s.summary)
	r.Perm("GET", "/usage/:id", "usage:all:read", s.usageDetail)
	// The manual way out of the abandon policy (§25.4). Both move money, so
	// they get their own permission rather than riding on usage:all:read.
	r.Perm("POST", "/usage/:id/reconcile", "usage:settle", s.retryReconcile)
	r.Perm("POST", "/usage/:id/refund", "usage:settle", s.refundAbandoned)
	r.Perm("GET", "/settings/reconcile", "settings:read", s.getReconcileSettings)
	r.Perm("PUT", "/settings/reconcile", "settings:manage", s.putReconcileSettings)
}

const recordColumns = `u.id, u.request_id, u.client_request_id, u.created_at, u.user_id, COALESCE(us.email, ''), u.api_key_id,
	COALESCE(k.name, ''), u.group_id, COALESCE(g.name, ''), u.account_id, COALESCE(a.name, ''), u.plugin_key,
	u.platform, u.protocol, u.account_type, u.upstream_protocol, u.endpoint, u.model, u.upstream_model, u.stream,
	u.status_code, u.success,
	u.error_type, u.error_message, u.attempts, u.input_tokens, u.output_tokens, u.cache_read_tokens,
	u.cache_creation_tokens, u.cache_creation_1h_tokens, u.total_cost, u.rate_multiplier, u.billing_status,
	u.billing_mode, u.matched_tier, u.latency_ms, u.first_token_ms, u.upload_ms, u.sticky_hit, u.client_ip`

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
		&r.BillingMode, &r.MatchedTier, &r.LatencyMs, &r.FirstTokenMs, &r.UploadMs, &r.StickyHit, &r.ClientIP}
}

// hideUpstream removes upstream account details (account, account type and
// upstream protocol) from self-service views.
func (r *Record) hideUpstream() {
	r.AccountID, r.AccountName = nil, ""
	r.AccountType, r.UpstreamProtocol = "", ""
	// SEC-L3: Classify and sanitize error messages for self-service views.
	// Client-side errors (4xx) show the message; server-side errors (5xx) show only the type.
	if r.ErrorMessage != "" && r.StatusCode >= 500 {
		r.ErrorMessage = ""
	}
}

// parseFilter reads the common query parameters. self restricts to userID.
func parseFilter(c *gin.Context, self *int64) (*store.Filter, error) {
	var f store.Filter
	if self != nil {
		f.And("u.user_id = ?", *self)
	}
	ids := []struct{ q, col string }{{"api_key_id", "u.api_key_id"}, {"group_id", "u.group_id"}}
	if self == nil {
		ids = append(ids, struct{ q, col string }{"user_id", "u.user_id"}, struct{ q, col string }{"account_id", "u.account_id"})
	}
	for _, x := range ids {
		if v := c.Query(x.q); v != "" {
			id, err := strconv.ParseInt(v, 10, 64)
			if err != nil || id <= 0 {
				return nil, core.ErrInvalidArgument.WithMessage("invalid " + x.q)
			}
			f.And(x.col+" = ?", id)
		}
	}
	for _, x := range []struct{ q, col string }{{"model", "u.model"}, {"platform", "u.platform"}, {"billing_status", "u.billing_status"}, {"request_id", "u.request_id"},
		{"client_request_id", "u.client_request_id"}, {"protocol", "u.protocol"}, {"endpoint", "u.endpoint"}, {"error_type", "u.error_type"}} {
		if v := c.Query(x.q); v != "" {
			f.And(x.col+" = ?", v)
		}
	}
	if self == nil {
		// An account type is identified by (plugin key, type id): two plugins
		// may both declare "apikey".
		pk, at := c.Query("plugin_key"), c.Query("account_type")
		if at != "" && pk == "" {
			return nil, core.InvalidFields(core.FieldError{Field: "account_type", Code: "requires_plugin_key",
				Message: "account_type filters by (plugin_key, account_type); pass plugin_key too"})
		}
		if pk != "" {
			f.And("u.plugin_key = ?", pk)
		}
		if at != "" {
			f.And("u.account_type = ?", at)
		}
	}
	for _, name := range []string{"success", "stream"} {
		if v := c.Query(name); v != "" {
			b, err := strconv.ParseBool(v)
			if err != nil {
				return nil, core.ErrInvalidArgument.WithMessage("invalid " + name)
			}
			f.And("u."+name+" = ?", b)
		}
	}
	if v := c.Query("status_code"); v != "" {
		status, err := strconv.Atoi(v)
		if err != nil || (status != 0 && (status < 100 || status > 599)) {
			return nil, core.ErrInvalidArgument.WithMessage("invalid status_code")
		}
		f.And("u.status_code = ?", status)
	}
	if v := c.Query("client_ip"); v != "" {
		ip, err := netip.ParseAddr(v)
		if err != nil || ip.Zone() != "" {
			return nil, core.ErrInvalidArgument.WithMessage("invalid client_ip")
		}
		f.And("u.client_ip = ?", ip.Unmap().String())
	}
	contains := []struct{ q, cond string }{
		{"model_contains", "u.model ILIKE ? ESCAPE E'\\\\'"},
		{"api_key_name", "EXISTS (SELECT 1 FROM api_keys fk WHERE fk.id=u.api_key_id AND fk.name ILIKE ? ESCAPE E'\\\\')"},
		{"group_name", "EXISTS (SELECT 1 FROM groups fg WHERE fg.id=u.group_id AND fg.name ILIKE ? ESCAPE E'\\\\')"},
	}
	if self == nil {
		contains = append(contains, struct{ q, cond string }{"user_email", "EXISTS (SELECT 1 FROM users fu WHERE fu.id=u.user_id AND fu.email ILIKE ? ESCAPE E'\\\\')"},
			struct{ q, cond string }{"account_name", "EXISTS (SELECT 1 FROM accounts fa WHERE fa.id=u.account_id AND fa.name ILIKE ? ESCAPE E'\\\\')"})
		for _, name := range []string{"node_id", "upstream_model", "upstream_protocol"} {
			if v := c.Query(name); v != "" {
				f.And("u."+name+" = ?", v)
			}
		}
	}
	if err := addContainsFilters(c, &f, contains); err != nil {
		return nil, err
	}
	if err := addTimeRange(c, &f); err != nil {
		return nil, err
	}
	return &f, nil
}

// addContainsFilters adds the ILIKE filters. Each value is trimmed, capped and
// escaped for the pattern, so a user cannot smuggle wildcards.
func addContainsFilters(c *gin.Context, f *store.Filter, contains []struct{ q, cond string }) error {
	for _, x := range contains {
		v := strings.TrimSpace(c.Query(x.q))
		if v == "" {
			continue
		}
		if len(v) > 256 {
			return core.ErrInvalidArgument.WithMessage("invalid " + x.q)
		}
		f.And(x.cond, "%"+store.Like(v)+"%")
	}
	return nil
}

// addTimeRange adds the RFC 3339 created_at bounds, rejecting an empty or
// inverted range.
func addTimeRange(c *gin.Context, f *store.Filter) error {
	var from time.Time
	for _, x := range []struct{ q, cond string }{{"from", "u.created_at >= ?"}, {"to", "u.created_at < ?"}} {
		v := c.Query(x.q)
		if v == "" {
			continue
		}
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			return core.ErrInvalidArgument.WithMessage("invalid " + x.q + " (RFC 3339)")
		}
		if x.q == "from" {
			from = t
		} else if !from.IsZero() && !t.After(from) {
			return core.ErrInvalidArgument.WithMessage("to must be after from")
		}
		f.And(x.cond, t)
	}
	return nil
}

func (s *Service) myUsage(c *gin.Context) {
	uid, _ := core.UserID(c.Request.Context())
	s.list(c, &uid)
}

func (s *Service) allUsage(c *gin.Context) { s.list(c, nil) }

// list serves the usage lists. By default it pages by number with a total
// (page, page_size; the console's pager). With a cursor parameter - empty
// for the first page - it pages by keyset instead: no count(*) and no
// OFFSET, so deep pages of a large usage_logs stay cheap; the answer carries
// page.next_cursor while there is more.
func (s *Service) list(c *gin.Context, self *int64) {
	ctx := c.Request.Context()
	f, err := parseFilter(c, self)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	page, size := httpapi.Pagination(c)
	cursor, keyset := c.GetQuery("cursor")
	var total int64
	if keyset {
		if cursor != "" {
			at, id, ok := parseCursor(cursor)
			if !ok {
				httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid cursor"))
				return
			}
			f.And("(u.created_at, u.id) < (?, ?)", at, id)
		}
	} else if err := s.db.Pool.QueryRow(ctx, `SELECT count(*) FROM usage_logs u`+f.Cond(), f.Args()...).Scan(&total); err != nil {
		httpapi.Fail(c, err)
		return
	}
	limit, offset := size, (page-1)*size
	if keyset {
		limit, offset = size+1, 0 // one extra row tells whether there is more
	}
	n := f.Len()
	args := append(f.Args(), limit, offset)
	rows, err := s.db.Pool.Query(ctx, `SELECT `+recordColumns+recordJoins+f.Cond()+
		` ORDER BY u.created_at DESC, u.id DESC LIMIT $`+strconv.Itoa(n+1)+` OFFSET $`+strconv.Itoa(n+2), args...)
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
	if !keyset {
		httpapi.List(c, items, httpapi.Page{Page: page, PageSize: size, Total: total})
		return
	}
	p := gin.H{"page_size": size, "has_more": len(items) > size}
	if len(items) > size {
		items = items[:size]
		last := items[len(items)-1]
		p["next_cursor"] = last.CreatedAt.UTC().Format(time.RFC3339Nano) + "," + x.Itoa64(last.ID)
	}
	c.JSON(200, gin.H{"data": items, "page": p})
}

// parseCursor reads "<created_at RFC 3339>,<id>" (page.next_cursor).
func parseCursor(s string) (time.Time, int64, bool) {
	at, id, ok := strings.Cut(s, ",")
	if !ok {
		return time.Time{}, 0, false
	}
	t, err := time.Parse(time.RFC3339Nano, at)
	if err != nil {
		return time.Time{}, 0, false
	}
	n, err := strconv.ParseInt(id, 10, 64)
	return t, n, err == nil && n > 0
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
		&d.PriceID, &d.ExprHash, &d.BillingDetail, &d.UserAgent, &d.NodeID, &d.PluginDetail, &d.Anomalies)
	err := s.db.Pool.QueryRow(ctx, `SELECT `+recordColumns+`, u.plugin_version, u.metrics, u.sticky_rule,
		u.hook_decisions, u.price_id, u.expr_hash, u.billing_detail, u.user_agent, u.node_id,
		u.plugin_detail, u.anomalies`+
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
		err := s.db.Pool.QueryRow(ctx, `SELECT id, model, source FROM model_prices WHERE id = $1`, *d.PriceID).
			Scan(&p.ID, &p.Model, &p.Source)
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
		d.PluginDetail = nil
		d.Anomalies = nil
	} else if e, err := s.loadSettlement(ctx, s.db.Pool, d.ID); err == nil {
		d.Settlement = e
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
	// Anomalies counts the rows of the group that carry a marker in
	// usage_logs.anomalies (a response shape the endpoint did not declare, a
	// plugin that could not report usage, a dropped reservation, a row billed
	// at an estimate) - except usage_extract "plugin", which only says the
	// plugin answered and is on every request of a plugin-metered endpoint.
	// The per-row markers were never silent; the aggregate was (CONTRACTS
	// §25.4), and a summary is where an operator looks first.
	Anomalies int64 `json:"anomalies"`
	// Estimated counts the rows whose tokens and cost are a plugin's
	// ESTIMATE, not a confirmed figure: a pre-charged row the core gave up
	// reconciling (reconcile=abandoned) or one the upstream confirmed without
	// a usage figure (reconcile=estimated). EstimatedCost is what those rows
	// contribute to TotalCost - the part of the revenue that is a guess.
	// Without these two, a platform with many abandoned jobs reports revenue
	// of which a share is invented and nothing in the summary says so.
	Estimated     int64           `json:"estimated"`
	EstimatedCost decimal.Decimal `json:"estimated_cost"`
	// LastAt is the newest request of the group; only group_by=ip sets it.
	LastAt *time.Time `json:"last_at,omitempty"`
	// PromptTokens includes cached input exactly once. Older free records may
	// lack semantics; a group containing such cached usage returns null.
	PromptTokens *int64 `json:"prompt_tokens"`
	// TotalTokens is input + output + cache read + cache write.
	TotalTokens int64 `json:"total_tokens"`
	// StandardCost is the cost before the group multiplier (total_cost /
	// rate_multiplier; a free group reports 0).
	StandardCost decimal.Decimal `json:"standard_cost"`
	// The averages are over the successful requests that report a time.
	LatencyMsAvg    int64 `json:"latency_ms_avg"`
	FirstTokenMsAvg int64 `json:"first_token_ms_avg"`
}

// maxIPGroups caps group_by=ip: a key leaked to the internet can call from
// thousands of addresses, and the console only lists the busiest ones.
const maxIPGroups = 100

// GET /usage/summary?from=&to=&tz=&group_by=day|hour|none|model|user|ip|
// api_key|group|endpoint|platform (default: day, last 30 days). Days
// ("YYYY-MM-DD") and hours ("YYYY-MM-DD HH:00") are calendar buckets in tz
// (default UTC), hours over at most 31 days; none is a single row with key
// ""; users and API keys are keyed by id, groups by name; client IPs come
// busiest first, at most maxIPGroups of them.
func (s *Service) summary(c *gin.Context) { s.summarize(c, nil) }

// GET /me/usage/summary: the same for the caller (group_by=user refused).
func (s *Service) mySummary(c *gin.Context) {
	uid, _ := core.UserID(c.Request.Context())
	s.summarize(c, &uid)
}

func (s *Service) summarize(c *gin.Context, self *int64) {
	ctx := c.Request.Context()
	f, err := parseFilter(c, self)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	tz, _, err := parseTZ(c)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if c.Query("from") == "" {
		f.And("u.created_at >= ?", time.Now().AddDate(0, 0, -30))
	}
	// The estimate markers, the usage_extract value and (for day and hour)
	// the time zone are appended after the filter's own arguments, and their
	// text uses a placeholder more than once, so the numbers come from Len.
	base := f.Len()
	tzArg := fmt.Sprintf("$%d", base+4)
	useTZ := false
	var key, join, extra string
	order, lastAt, groupBy := ` ORDER BY k`, `NULL::timestamptz`, ` GROUP BY k`
	switch c.DefaultQuery("group_by", "day") {
	case "day":
		key, useTZ = `to_char(u.created_at AT TIME ZONE `+tzArg+`::text, 'YYYY-MM-DD')`, true
	case "hour":
		if span, ok := summarySpan(c); !ok || span > maxHourSpan {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("group_by=hour covers at most 31 days"))
			return
		}
		key, useTZ = `to_char(date_trunc('hour', u.created_at AT TIME ZONE `+tzArg+`::text), 'YYYY-MM-DD HH24:00')`, true
	case "none":
		key, groupBy = `''`, ``
	case "model":
		key = `u.model`
	case "api_key":
		key = `u.api_key_id::text`
	case "group":
		key = `COALESCE(gg.name, u.group_id::text)`
		join = ` LEFT JOIN groups gg ON gg.id = u.group_id`
	case "endpoint":
		key = `u.endpoint`
	case "platform":
		key = `u.platform`
	case "ip":
		key = `u.client_ip`
		lastAt = `max(u.created_at)`
		order = ` ORDER BY count(*) DESC, k LIMIT ` + strconv.Itoa(maxIPGroups)
	case "user":
		if self != nil {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("group_by must be day, hour, none, model, api_key, group, endpoint, platform or ip"))
			return
		}
		key = `u.user_id::text`
		join = ` LEFT JOIN users us ON us.id = u.user_id`
		extra = `, COALESCE(max(us.email), '')`
	default:
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("group_by must be day, hour, none, model, user, api_key, group, endpoint, platform or ip"))
		return
	}
	if extra == "" {
		extra = `, ''`
	}
	// The estimate markers are matched by value, not by key: 'reconcile' also
	// takes "retrying" (the row is reserved again, not final) and "refunded"
	// (the row is free), neither of which is an estimate in the revenue.
	est := fmt.Sprintf(`u.anomalies->>'%s' IN ($%d, $%d)`, core.AnomalyReconcile, base+1, base+2)
	// One value in the column is a fact, not an anomaly: usage_extract
	// "plugin" says the plugin answered, which on a plugin-metered platform is
	// every request. Counting it would make this column read "everything is
	// wrong" exactly where nothing is; "fallback" (the plugin did not answer)
	// still counts.
	anomalous := fmt.Sprintf(`(u.anomalies - '%s' - 'failure_policy') <> '{}'::jsonb OR (u.anomalies ? '%s' AND u.anomalies->>'%s' <> $%d)`,
		core.AnomalyUsageExtract, core.AnomalyUsageExtract, core.AnomalyUsageExtract, base+3)
	args := append(f.Args(), core.ReconcileAbandoned, core.ReconcileEstimated, core.UsageExtractPlugin)
	if useTZ {
		args = append(args, tz)
	}
	out := []SummaryRow{}
	err = s.statsTx(ctx, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, `
			SELECT `+key+` AS k`+extra+`, count(*), count(*) FILTER (WHERE u.success),
			       COALESCE(sum(u.input_tokens), 0), COALESCE(sum(u.output_tokens), 0),
			       COALESCE(sum(u.cache_read_tokens), 0),
			       COALESCE(sum(u.cache_creation_tokens + u.cache_creation_1h_tokens), 0),
			       COALESCE(sum(u.total_cost), 0),
			       count(*) FILTER (WHERE `+anomalous+`),
			       count(*) FILTER (WHERE `+est+`),
			       COALESCE(sum(u.total_cost) FILTER (WHERE `+est+`), 0), `+lastAt+`,
			       CASE WHEN count(*) = count(`+promptTokens+`) THEN sum(`+promptTokens+`) END,
			       COALESCE(sum(`+standardCost+`), 0),
			       COALESCE(round(avg(u.latency_ms) FILTER (WHERE u.success AND u.latency_ms > 0)), 0)::bigint,
			       COALESCE(round(avg(u.first_token_ms) FILTER (WHERE u.success AND u.first_token_ms > 0)), 0)::bigint
			FROM usage_logs u`+join+f.Cond()+groupBy+order, args...)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var r SummaryRow
			if err := rows.Scan(&r.Key, &r.UserEmail, &r.Requests, &r.Success, &r.InputTokens, &r.OutputTokens,
				&r.CacheReadTokens, &r.CacheCreationTokens, &r.TotalCost, &r.Anomalies, &r.Estimated, &r.EstimatedCost, &r.LastAt, &r.PromptTokens,
				&r.StandardCost, &r.LatencyMsAvg, &r.FirstTokenMsAvg); err != nil {
				return err
			}
			r.TotalTokens = r.InputTokens + r.OutputTokens + r.CacheReadTokens + r.CacheCreationTokens
			out = append(out, r)
		}
		return rows.Err()
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

// summarySpan is the length of the summary's range: from (default 30 days
// ago) to to (default now). ok is false when either bound is unreadable;
// parseFilter has already refused that, so it does not happen in practice.
func summarySpan(c *gin.Context) (time.Duration, bool) {
	now := time.Now()
	from, to := now.AddDate(0, 0, -30), now
	for _, x := range []struct {
		q string
		t *time.Time
	}{{"from", &from}, {"to", &to}} {
		if v := c.Query(x.q); v != "" {
			t, err := time.Parse(time.RFC3339, v)
			if err != nil {
				return 0, false
			}
			*x.t = t
		}
	}
	return to.Sub(from), true
}
