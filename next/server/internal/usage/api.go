package usage

import (
	"cmp"
	"context"
	"encoding/json"
	"net/netip"
	"slices"
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
	// Conversion is usage_logs.conversion (CONTRACTS §88): how the core
	// converted the request, null when native and nothing was refused.
	// Hidden from self-service views like upstream_protocol.
	Conversion json.RawMessage `json:"conversion"`
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
	// RequestLogAccountID opens the CCGateway request log of this request
	// (GET /system/ccgateway/accounts/:id/request-logs, settings:read or
	// account:read): set for a ccgateway row when the caller may read that
	// log, also when account_id is hidden from a caller without account:read.
	RequestLogAccountID *int64 `json:"request_log_account_id,omitempty"`
	LedgerID            *int64 `json:"ledger_id"`
	UserAgent           string `json:"user_agent"`
	NodeID              string `json:"node_id"`
}

// RegisterRoutes mounts the usage console API.
func (s *Service) RegisterRoutes(r *httpapi.Router) {
	r.Perm("GET", "/me/usage", "usage:self:read", s.myUsage)
	r.Perm("GET", "/me/usage/summary", "usage:self:read", s.mySummary)
	r.Perm("GET", "/me/usage/overview", "usage:self:read", s.myOverview)
	r.Perm("GET", "/me/usage/realtime", "usage:self:read", s.myRealtime)
	r.Perm("GET", "/me/usage/:id", "usage:self:read", s.myUsageDetail)
	r.Perm("GET", "/usage", "usage:all:read", s.allUsage)
	r.Perm("GET", "/usage/summary", "usage:all:read", s.summary)
	r.Perm("GET", "/usage/overview", "usage:all:read", s.allOverview)
	r.Perm("GET", "/usage/realtime", "usage:all:read", s.allRealtime)
	r.Perm("GET", "/usage/export", "usage:all:read", s.allExport)
	r.Perm("GET", "/me/usage/export", "usage:self:read", s.myExport)
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
	u.billing_mode, u.matched_tier, u.latency_ms, u.first_token_ms, u.upload_ms, u.sticky_hit, u.client_ip, u.conversion`

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
		&r.BillingMode, &r.MatchedTier, &r.LatencyMs, &r.FirstTokenMs, &r.UploadMs, &r.StickyHit, &r.ClientIP, &r.Conversion}
}

// hideUpstream removes upstream account details (account, account type,
// upstream protocol and conversion, the account's model mapping) from
// self-service views.
func (r *Record) hideUpstream() {
	r.hideAccount()
	r.AccountType, r.UpstreamProtocol, r.UpstreamModel, r.Conversion = "", "", "", nil
	// The error message is shown as recorded, 5xx included: self-service
	// views hide fields, they never rewrite values (user rule, 2026-11-02;
	// replaces SEC-L3's 5xx blanking).
}

// hideAccount removes which account served the request. An operator who may
// not read accounts (no account:read) sees neither its id nor its name.
func (r *Record) hideAccount() { r.AccountID, r.AccountName = nil, "" }

// seesAccounts reports whether the caller may see the account of a usage
// record: operator views only, and only with account:read (CONTRACTS §66.5),
// like the accounts section of the overview.
func (s *Service) seesAccounts(ctx context.Context, self *int64) bool {
	return self == nil && s.can(ctx, uidOf(ctx), "account:read")
}

func uidOf(ctx context.Context) int64 {
	uid, _ := core.UserID(ctx)
	return uid
}

// requestLogPlugin is the plugin whose rows have a request log in the core
// (internal/ccgateway's request log viewer).
const requestLogPlugin = "ccgateway"

// parseFilter reads the common query parameters. self restricts to userID;
// accounts allows the account filters (seesAccounts).
func parseFilter(c *gin.Context, self *int64, accounts bool) (*store.Filter, error) {
	var f store.Filter
	if self != nil {
		f.And("u.user_id = ?", *self)
	}
	ids := []struct{ q, col string }{{"api_key_id", "u.api_key_id"}, {"group_id", "u.group_id"}}
	if self == nil {
		ids = append(ids, struct{ q, col string }{"user_id", "u.user_id"})
	}
	if accounts {
		ids = append(ids, struct{ q, col string }{"account_id", "u.account_id"})
	} else if self == nil && (c.Query("account_id") != "" || c.Query("account_name") != "") {
		// Filtering by account would tell which requests an account served.
		return nil, core.ErrPermissionDenied.WithMessage("filtering by account requires account:read")
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
	for _, x := range []struct{ q, col string }{{"model", "u.model"}, {"platform", "u.platform"}, {"billing_status", "u.billing_status"},
		{"client_request_id", "u.client_request_id"}, {"protocol", "u.protocol"}, {"endpoint", "u.endpoint"}, {"error_type", "u.error_type"}} {
		if v := c.Query(x.q); v != "" {
			f.And(x.col+" = ?", v)
		}
	}
	// request_id takes either ID a user may hold: ours, or the client's own
	// X-Request-Id (CONTRACTS §14.4), so one search box finds the row.
	// client_request_id has no index, so the client half needs a time range
	// (from) to stay a range scan like the other unindexed filters; without
	// one only our indexed request_id is matched.
	if v := c.Query("request_id"); v != "" {
		if c.Query("from") != "" {
			f.And("(u.request_id = ? OR u.client_request_id = ?)", v, v)
		} else {
			f.And("u.request_id = ?", v)
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
		contains = append(contains, struct{ q, cond string }{"user_email", "EXISTS (SELECT 1 FROM users fu WHERE fu.id=u.user_id AND fu.email ILIKE ? ESCAPE E'\\\\')"})
		if accounts {
			contains = append(contains, struct{ q, cond string }{"account_name", "EXISTS (SELECT 1 FROM accounts fa WHERE fa.id=u.account_id AND fa.name ILIKE ? ESCAPE E'\\\\')"})
		}
		for _, name := range []string{"node_id", "upstream_model", "upstream_protocol"} {
			if v := c.Query(name); v != "" {
				f.And("u."+name+" = ?", v)
			}
		}
		if v := c.Query("conversion"); v != "" {
			cond, ok := conversionFilters[v]
			if !ok {
				return nil, core.InvalidFields(core.FieldError{Field: "conversion", Code: "invalid",
					Message: "conversion must be native, converted, good, fair, discouraged, local or lossy"})
			}
			f.And(cond)
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

// conversionFilters are the conditions of the conversion= filter
// (CONTRACTS §88): by usage_logs.conversion's grade, or lossy for a request
// that lost anything.
var conversionFilters = map[string]string{
	"native":      "(u.conversion IS NULL OR u.conversion->>'grade' = 'native')",
	"converted":   "u.conversion->>'grade' IN ('good', 'fair', 'discouraged')",
	"good":        "u.conversion->>'grade' = 'good'",
	"fair":        "u.conversion->>'grade' = 'fair'",
	"discouraged": "u.conversion->>'grade' = 'discouraged'",
	"local":       "u.conversion->>'grade' = 'local'",
	"lossy":       "(u.conversion->'lost' IS NOT NULL OR u.conversion->'response_lost' IS NOT NULL)",
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
	accounts := s.seesAccounts(ctx, self)
	f, err := parseFilter(c, self, accounts)
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
		} else if !accounts {
			r.hideAccount()
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
	} else {
		accounts := s.seesAccounts(ctx, self)
		if d.PluginKey == requestLogPlugin && d.AccountID != nil && (accounts || s.can(ctx, uidOf(ctx), "settings:read")) {
			d.RequestLogAccountID = d.AccountID
		}
		if e, err := s.loadSettlement(ctx, s.db.Pool, d.ID); err == nil {
			d.Settlement = e
		}
		if !accounts {
			d.hideAccount()
			if d.Settlement != nil {
				d.Settlement.AccountID = nil
			}
		}
		d.Anomalies = s.shapeAnomalies(ctx, d.Anomalies, accounts)
	}
	httpapi.OK(c, d)
}

// Keys of usage_logs.anomalies whose JSON names accounts.
const anomalyFailurePolicy = "failure_policy"

// shapeAnomalies prepares the traces in a record's anomalies for an
// operator (CONTRACTS §15.2): without account:read every account id goes
// (the availability samples stay, without their account, and so do the
// failure policy events); with it the availability samples get the
// account names, read in one query. A trace that cannot be parsed is
// dropped for a caller without account:read rather than shown unredacted.
func (s *Service) shapeAnomalies(ctx context.Context, raw json.RawMessage, accounts bool) json.RawMessage {
	if len(raw) == 0 {
		return raw
	}
	var m map[string]json.RawMessage
	if err := json.Unmarshal(raw, &m); err != nil {
		if accounts {
			return raw
		}
		return nil
	}
	changed := false
	if v, ok := m[core.AnomalyAvailability]; ok {
		out, keep := s.shapeAvailability(ctx, v, accounts)
		if keep {
			m[core.AnomalyAvailability] = out
		} else {
			delete(m, core.AnomalyAvailability)
		}
		changed = true
	}
	if v, ok := m[anomalyFailurePolicy]; ok && !accounts {
		if out, ok := redactFailurePolicy(v); ok {
			m[anomalyFailurePolicy] = out
		} else {
			delete(m, anomalyFailurePolicy)
		}
		changed = true
	}
	if !changed {
		return raw
	}
	out, err := json.Marshal(m)
	if err != nil {
		return nil
	}
	return out
}

// decodeTrace reads an anomalies value: a JSON string holding JSON.
func decodeTrace(v json.RawMessage, into any) bool {
	var s string
	return json.Unmarshal(v, &s) == nil && json.Unmarshal([]byte(s), into) == nil
}

func encodeTrace(v any) (json.RawMessage, bool) {
	inner, err := json.Marshal(v)
	if err != nil {
		return nil, false
	}
	out, err := json.Marshal(string(inner))
	return out, err == nil
}

func (s *Service) shapeAvailability(ctx context.Context, v json.RawMessage, accounts bool) (json.RawMessage, bool) {
	var tr core.AvailabilityTrace
	if !decodeTrace(v, &tr) {
		return v, accounts
	}
	lists := [][]core.AvailabilitySample{tr.Samples, tr.Guard}
	if !accounts {
		for _, list := range lists {
			for i := range list {
				list[i].AccountID, list[i].AccountName = 0, ""
			}
		}
		return encodeTrace(&tr)
	}
	var ids []int64
	for _, list := range lists {
		for _, sample := range list {
			if sample.AccountID > 0 {
				ids = append(ids, sample.AccountID)
			}
		}
	}
	if len(ids) == 0 {
		return v, true
	}
	names := map[int64]string{}
	rows, err := s.db.Pool.Query(ctx, `SELECT id, name FROM accounts WHERE id = ANY($1)`, ids)
	if err != nil {
		return v, true // the ids still say which accounts
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		var name string
		if rows.Scan(&id, &name) == nil {
			names[id] = name
		}
	}
	if rows.Err() != nil {
		return v, true
	}
	for _, list := range lists {
		for i := range list {
			list[i].AccountName = names[list[i].AccountID]
		}
	}
	out, ok := encodeTrace(&tr)
	if !ok {
		return v, true
	}
	return out, true
}

// redactFailurePolicy removes account_id from every failure policy event,
// keeping every other field as recorded.
func redactFailurePolicy(v json.RawMessage) (json.RawMessage, bool) {
	var events []map[string]json.RawMessage
	if !decodeTrace(v, &events) {
		return nil, false
	}
	for _, e := range events {
		delete(e, "account_id")
	}
	return encodeTrace(events)
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
	f, err := parseFilter(c, self, s.seesAccounts(ctx, self))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	tz, loc, err := parseTZ(c)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	from, to := summaryRange(c)
	if c.Query("from") == "" {
		f.And("u.created_at >= ?", from)
	}
	end := cmp.Or(to, time.Now())
	groupKey := c.DefaultQuery("group_by", "day")
	// The time zone of day and hour buckets is appended after the filter's
	// own arguments; spanTZ says the rollup must be aligned with it.
	args := f.Args()
	var spanTZ *time.Location
	inTZ := func() string {
		spanTZ = loc
		return `u.created_at AT TIME ZONE ` + addArg(&args, tz) + `::text`
	}
	var key, join, extra string
	order, lastAt, groupBy := ` ORDER BY k`, `NULL::timestamptz`, ` GROUP BY k`
	switch groupKey {
	case "day":
		key = `to_char(` + inTZ() + `, 'YYYY-MM-DD')`
	case "hour":
		if end.Sub(from) > maxHourSpan {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("group_by=hour covers at most 31 days"))
			return
		}
		key = `to_char(date_trunc('hour', ` + inTZ() + `), 'YYYY-MM-DD HH24:00')`
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
	case "protocol":
		// The request type: the protocol id (anthropic.messages, openai.chat, …)
		// the usage records page lists in its request-type filter.
		key = `u.protocol`
	case "platform":
		key = `u.platform`
	case "ip":
		key = `u.client_ip`
		lastAt = `max(u.at)`
		order = ` ORDER BY sum(u.requests) DESC, k LIMIT ` + strconv.Itoa(maxIPGroups)
	case "user":
		if self != nil {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("group_by must be day, hour, none, model, api_key, group, endpoint, platform, protocol or ip"))
			return
		}
		key = `u.user_id::text`
		join = ` LEFT JOIN users us ON us.id = u.user_id`
		extra = `us.email`
	case "upstream_model":
		// The model the upstream was asked for is upstream-side detail
		// (hideUpstream): operators only.
		if self != nil {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("group_by must be day, hour, none, model, api_key, group, endpoint, platform, protocol or ip"))
			return
		}
		key = `u.upstream_model`
	default:
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("group_by must be day, hour, none, model, upstream_model, user, api_key, group, endpoint, platform, protocol or ip"))
		return
	}
	if extra == "" {
		extra = `''`
	}
	outKey := `u.k`
	if groupBy == "" {
		outKey = `''` // one row, also over no rows
	}
	rollable := summaryRollable(c, groupKey)
	rankOrder, rankLimit := c.Query("order"), c.Query("limit")
	load := func(ctx context.Context) ([]SummaryRow, error) {
		out := []SummaryRow{}
		err := s.statsTx(ctx, statsLimitsFor(self), func(tx pgx.Tx) error {
			args := slices.Clone(args)
			var span *hourSpan
			if rollable {
				var err error
				if span, err = rollupSpan(ctx, tx, from, end, spanTZ); err != nil {
					return err
				}
			}
			rows, err := tx.Query(ctx, `
				SELECT `+outKey+` AS k, COALESCE(max(u.e), ''), `+totalsColumns("", true)+`,
				       `+sumOf("u.anomalous_rows", "")+`, `+sumOf("u.estimated_rows", "")+`, `+sumOf("u.estimated_cost", "")+`, `+lastAt+`
				FROM `+statRows(key+` AS k, `+extra+` AS e, u.created_at AS at`, join, f.Cond(), span, &args)+groupBy+order, args...)
			if err != nil {
				return err
			}
			defer rows.Close()
			for rows.Next() {
				var r SummaryRow
				if err := rows.Scan(&r.Key, &r.UserEmail, &r.Requests, &r.Success, &r.InputTokens, &r.OutputTokens,
					&r.CacheReadTokens, &r.CacheCreationTokens, &r.PromptTokens, &r.TotalCost, &r.StandardCost, &r.LatencyMsAvg, &r.FirstTokenMsAvg,
					&r.Anomalies, &r.Estimated, &r.EstimatedCost, &r.LastAt); err != nil {
					return err
				}
				r.TotalTokens = r.InputTokens + r.OutputTokens + r.CacheReadTokens + r.CacheCreationTokens
				out = append(out, r)
			}
			return rows.Err()
		})
		if err != nil {
			return nil, err
		}
		return rankRows(rankOrder, rankLimit, out)
	}
	// The caller's own rows are few; an operator's query scans everyone's, so
	// it is cached (CONTRACTS §66.3). Parsing above has already refused what
	// this caller may not ask, and the answer depends only on the query.
	var out []SummaryRow
	if self != nil {
		out, err = load(ctx)
	} else {
		var hit bool
		out, hit, err = s.summaries.get(ctx, c.Request.URL.Query().Encode(), load)
		c.Header("X-Snapshot-Cache", snapshotHeader(hit))
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

// summaryRange is the summary's range: from (default 30 days ago) to to
// (zero when open). parseFilter has already refused unreadable bounds.
func summaryRange(c *gin.Context) (from, to time.Time) {
	from = time.Now().AddDate(0, 0, -30)
	if v := c.Query("from"); v != "" {
		from, _ = time.Parse(time.RFC3339, v)
	}
	if v := c.Query("to"); v != "" {
		to, _ = time.Parse(time.RFC3339, v)
	}
	return from, to
}

// summaryRollableParams are the query parameters the hourly rollup can
// answer: its columns and the range. Any other filter reads usage_logs only.
var summaryRollableParams = map[string]bool{
	"from": true, "to": true, "tz": true, "group_by": true, "order": true, "limit": true,
	"user_id": true, "api_key_id": true, "group_id": true, "account_id": true,
	"model": true, "upstream_model": true, "protocol": true, "platform": true,
}

// summaryRollable says whether the hourly rollup can answer this summary:
// its grouping is one of the rollup's columns or a time bucket, and every
// filter given is in summaryRollableParams.
func summaryRollable(c *gin.Context, groupBy string) bool {
	switch groupBy {
	case "ip", "endpoint":
		return false
	}
	for name, vs := range c.Request.URL.Query() {
		if !summaryRollableParams[name] && slices.ContainsFunc(vs, func(v string) bool { return v != "" }) {
			return false
		}
	}
	return true
}
