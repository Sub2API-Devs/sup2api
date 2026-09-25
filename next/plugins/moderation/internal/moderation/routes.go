package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// JobCleanup is the job id declared in manifest.json.
const JobCleanup = "cleanup"

func (p *Plugin) routes() {
	p.Handle("GET", "/overview", p.getOverview)
	p.Handle("GET", "/events", p.listEvents)
	p.Handle("GET", "/events/:id", p.getEvent)
	p.Handle("DELETE", "/events/:id", p.deleteEvent)
	p.Handle("GET", "/blocks", p.listBlocks)
	p.Handle("POST", "/blocks", p.createBlock)
	p.Handle("DELETE", "/blocks/:user_id", p.deleteBlock)
	p.Handle("POST", "/test", p.testModeration)
	p.Handle("GET", "/defaults", p.getDefaults)
}

func unavailable(err error) *pluginv1.HTTPResponse {
	return pluginsdk.ErrorResponse(http.StatusServiceUnavailable, "unavailable", err.Error())
}

// pathParam returns a path parameter, falling back to the last path
// segment.
func pathParam(req *pluginv1.HTTPRequest, name string) string {
	if v, ok := req.GetPathParams()[name]; ok {
		return v
	}
	path := strings.TrimSuffix(req.GetPath(), "/")
	if i := strings.LastIndexByte(path, '/'); i >= 0 && !strings.HasPrefix(path[i+1:], ":") {
		return path[i+1:]
	}
	return ""
}

func parseID(req *pluginv1.HTTPRequest, name string) (int64, *pluginv1.HTTPResponse) {
	id, err := strconv.ParseInt(pathParam(req, name), 10, 64)
	if err != nil || id <= 0 {
		return 0, pluginsdk.FieldErrorResponse("invalid path parameter / 路径参数无效",
			pluginsdk.FieldErrors{}.Add(name, "invalid", name+" must be a positive integer / "+name+" 必须是正整数"))
	}
	return id, nil
}

// ---------------------------------------------------------------- overview

// Totals counts events by verdict; Denied counts refused requests.
type Totals struct {
	Total  int64 `json:"total"`
	Pass   int64 `json:"pass"`
	Flag   int64 `json:"flag"`
	Block  int64 `json:"block"`
	Error  int64 `json:"error"`
	Denied int64 `json:"denied"`
}

// TrendPoint is one bucket (UTC hour for 24h, UTC day otherwise).
type TrendPoint struct {
	Bucket time.Time `json:"bucket"`
	Pass   int64     `json:"pass"`
	Flag   int64     `json:"flag"`
	Block  int64     `json:"block"`
	Error  int64     `json:"error"`
}

// CategoryCount is one row of the category ranking.
type CategoryCount struct {
	Category string `json:"category"`
	Count    int64  `json:"count"`
}

// UserCount is one row of the violating user ranking (block verdicts).
type UserCount struct {
	UserID int64 `json:"user_id"`
	Count  int64 `json:"count"`
}

// Runtime is this node's live state.
type Runtime struct {
	Mode         string `json:"mode"`
	Configured   bool   `json:"configured"`
	SettingsHash string `json:"settings_hash"`
	QueueLen     int    `json:"queue_len"`
	QueueCap     int    `json:"queue_cap"`
	Dropped      int64  `json:"dropped"`
	Inflight     int64  `json:"inflight"`
	Calls        int64  `json:"calls"`
	Errors       int64  `json:"errors"`
	CacheHits    int64  `json:"cache_hits"`
	AvgLatencyMs int64  `json:"avg_latency_ms"`
	BlockedUsers int    `json:"blocked_users"`
}

// Overview is the GET /overview response data.
type Overview struct {
	Range         string          `json:"range"`
	From          time.Time       `json:"from"`
	To            time.Time       `json:"to"`
	Bucket        string          `json:"bucket"` // hour | day
	Totals        Totals          `json:"totals"`
	Trend         []TrendPoint    `json:"trend"`
	TopCategories []CategoryCount `json:"top_categories"`
	TopUsers      []UserCount     `json:"top_users"`
	Runtime       Runtime         `json:"runtime"`
}

func (p *Plugin) runtimeState() Runtime {
	c := p.cfg.Load()
	qlen, qcap := p.queueLen()
	calls := p.stats.calls.Load()
	var avg int64
	if calls > 0 {
		avg = p.stats.latencyMsSum.Load() / calls
	}
	return Runtime{
		Mode: c.Mode, Configured: c.configured, SettingsHash: c.settingsHash, QueueLen: qlen, QueueCap: qcap,
		Dropped: p.stats.dropped.Load(), Inflight: p.stats.inflight.Load(), Calls: calls,
		Errors: p.stats.errors.Load(), CacheHits: p.stats.cacheHits.Load(), AvgLatencyMs: avg,
		BlockedUsers: p.blockedCount(),
	}
}

func (p *Plugin) getOverview(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	now := p.now().UTC()
	o := Overview{Range: pluginsdk.Query(req, "range"), To: now, Bucket: "day",
		Trend: []TrendPoint{}, TopCategories: []CategoryCount{}, TopUsers: []UserCount{}}
	switch o.Range {
	case "", "24h":
		o.Range, o.Bucket, o.From = "24h", "hour", now.Add(-24*time.Hour)
	case "7d":
		o.From = now.Add(-7 * 24 * time.Hour)
	case "30d":
		o.From = now.Add(-30 * 24 * time.Hour)
	default:
		return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效",
			pluginsdk.FieldErrors{}.Add("range", "enum", "range must be 24h, 7d or 30d / range 取值为 24h、7d、30d")), nil
	}
	o.Runtime = p.runtimeState()
	db, err := p.db(ctx)
	if err != nil {
		return unavailable(err), nil
	}
	if err := db.QueryRow(ctx, `SELECT count(*),
			count(*) FILTER (WHERE verdict = 'pass'), count(*) FILTER (WHERE verdict = 'flag'),
			count(*) FILTER (WHERE verdict = 'block'), count(*) FILTER (WHERE verdict = 'error'),
			count(*) FILTER (WHERE action = 'deny')
		FROM events WHERE created_at >= $1`, o.From).Scan(
		&o.Totals.Total, &o.Totals.Pass, &o.Totals.Flag, &o.Totals.Block, &o.Totals.Error, &o.Totals.Denied); err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `SELECT date_trunc($2, created_at, 'UTC') AS b,
			count(*) FILTER (WHERE verdict = 'pass'), count(*) FILTER (WHERE verdict = 'flag'),
			count(*) FILTER (WHERE verdict = 'block'), count(*) FILTER (WHERE verdict = 'error')
		FROM events WHERE created_at >= $1 GROUP BY 1 ORDER BY 1`, o.From, o.Bucket)
	if err != nil {
		return nil, err
	}
	points, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (TrendPoint, error) {
		var tp TrendPoint
		err := r.Scan(&tp.Bucket, &tp.Pass, &tp.Flag, &tp.Block, &tp.Error)
		return tp, err
	})
	if err != nil {
		return nil, err
	}
	byBucket := make(map[int64]TrendPoint, len(points))
	for _, tp := range points {
		byBucket[tp.Bucket.Unix()] = tp
	}
	step := 24 * time.Hour
	b := time.Date(o.From.Year(), o.From.Month(), o.From.Day(), 0, 0, 0, 0, time.UTC)
	if o.Bucket == "hour" {
		step, b = time.Hour, o.From.Truncate(time.Hour)
	}
	for ; !b.After(now); b = b.Add(step) {
		tp, ok := byBucket[b.Unix()]
		if !ok {
			tp = TrendPoint{}
		}
		tp.Bucket = b
		o.Trend = append(o.Trend, tp)
	}
	rows, err = db.Query(ctx, `SELECT c, count(*) FROM events, unnest(categories) AS c
		WHERE created_at >= $1 GROUP BY c ORDER BY count(*) DESC, c LIMIT 10`, o.From)
	if err != nil {
		return nil, err
	}
	if o.TopCategories, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (CategoryCount, error) {
		var cc CategoryCount
		err := r.Scan(&cc.Category, &cc.Count)
		return cc, err
	}); err != nil {
		return nil, err
	}
	rows, err = db.Query(ctx, `SELECT user_id, count(*) FROM events
		WHERE created_at >= $1 AND verdict = 'block' AND user_id > 0
		GROUP BY user_id ORDER BY count(*) DESC, user_id LIMIT 10`, o.From)
	if err != nil {
		return nil, err
	}
	if o.TopUsers, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (UserCount, error) {
		var uc UserCount
		err := r.Scan(&uc.UserID, &uc.Count)
		return uc, err
	}); err != nil {
		return nil, err
	}
	return pluginsdk.DataResponse(o), nil
}

// ---------------------------------------------------------------- events

// Event is one moderation record. List items carry text_excerpt (first 120
// characters) instead of text.
type Event struct {
	ID               int64     `json:"id"`
	CreatedAt        time.Time `json:"created_at"`
	RequestID        string    `json:"request_id"`
	UserID           int64     `json:"user_id"`
	APIKeyID         int64     `json:"api_key_id"`
	GroupID          int64     `json:"group_id"`
	Model            string    `json:"model"`
	Protocol         string    `json:"protocol"`
	Mode             string    `json:"mode"`
	Verdict          string    `json:"verdict"`
	Action           string    `json:"action"`
	Categories       []string  `json:"categories"`
	Severity         string    `json:"severity"`
	Reason           string    `json:"reason"`
	Error            string    `json:"error"`
	TextChars        int       `json:"text_chars"`
	TextHash         string    `json:"text_hash"`
	Cached           bool      `json:"cached"`
	LLMModel         string    `json:"llm_model"`
	Turns            int       `json:"turns"`
	LatencyMs        int       `json:"latency_ms"`
	PromptTokens     int64     `json:"prompt_tokens"`
	CompletionTokens int64     `json:"completion_tokens"`
}

// EventListItem is an Event in GET /events.
type EventListItem struct {
	Event
	TextExcerpt string `json:"text_excerpt"`
}

// EventDetail is GET /events/:id; text is null when store_text was off.
type EventDetail struct {
	Event
	Text *string `json:"text"`
}

const eventColumns = `id, created_at, request_id, user_id, api_key_id, group_id, model, protocol, mode, verdict, action,
	categories, severity, reason, error, text_chars, text_hash, cached, llm_model, turns, latency_ms, prompt_tokens, completion_tokens`

func (e *Event) scanTargets() []any {
	return []any{&e.ID, &e.CreatedAt, &e.RequestID, &e.UserID, &e.APIKeyID, &e.GroupID, &e.Model, &e.Protocol, &e.Mode,
		&e.Verdict, &e.Action, &e.Categories, &e.Severity, &e.Reason, &e.Error, &e.TextChars, &e.TextHash, &e.Cached,
		&e.LLMModel, &e.Turns, &e.LatencyMs, &e.PromptTokens, &e.CompletionTokens}
}

// eventFilter builds the WHERE clause of GET /events.
func eventFilter(req *pluginv1.HTTPRequest) (where string, args []any, errs pluginsdk.FieldErrors) {
	conds := []string{"TRUE"}
	arg := func(v any) string {
		args = append(args, v)
		return "$" + strconv.Itoa(len(args))
	}
	enum := func(name string, allowed ...string) {
		v := pluginsdk.Query(req, name)
		if v == "" {
			return
		}
		for _, a := range allowed {
			if v == a {
				conds = append(conds, name+" = "+arg(v))
				return
			}
		}
		errs = errs.Add(name, "enum", fmt.Sprintf("%s must be one of %s / %s 取值为 %s", name, strings.Join(allowed, ", "), name, strings.Join(allowed, "、")))
	}
	enum("verdict", VerdictPass, VerdictFlag, VerdictBlock, VerdictError)
	enum("action", ActionAllow, ActionDeny)
	enum("mode", ModeObserve, ModeEnforce)
	for _, name := range []string{"user_id", "api_key_id", "group_id"} {
		v := pluginsdk.Query(req, name)
		if v == "" {
			continue
		}
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id < 0 {
			errs = errs.Add(name, "invalid", name+" must be a non-negative integer / "+name+" 必须是非负整数")
			continue
		}
		conds = append(conds, name+" = "+arg(id))
	}
	if v := pluginsdk.Query(req, "category"); v != "" {
		if !categoryIDRe.MatchString(v) {
			errs = errs.Add("category", "invalid", "category must match ^[a-z0-9_]{1,32}$ / 分类 id 格式无效")
		} else {
			conds = append(conds, arg(v)+" = ANY(categories)")
		}
	}
	if v := strings.TrimSpace(pluginsdk.Query(req, "q")); v != "" {
		if utf8.RuneCountInString(v) > 200 {
			errs = errs.Add("q", "too_long", "q must be at most 200 characters / 搜索词最多 200 字")
		} else {
			like := "%" + strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(v) + "%"
			a := arg(like)
			conds = append(conds, "(request_id ILIKE "+a+" OR reason ILIKE "+a+" OR text ILIKE "+a+")")
		}
	}
	var from, to time.Time
	for _, name := range []string{"from", "to"} {
		v := pluginsdk.Query(req, name)
		if v == "" {
			continue
		}
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			errs = errs.Add(name, "format", name+" must be RFC 3339 / "+name+" 必须是 RFC 3339 时间")
			continue
		}
		if name == "from" {
			from = t
			conds = append(conds, "created_at >= "+arg(t))
		} else {
			to = t
			conds = append(conds, "created_at < "+arg(t))
		}
	}
	if !from.IsZero() && !to.IsZero() && !from.Before(to) {
		errs = errs.Add("from", "range", "from must be before to / from 必须早于 to")
	}
	return strings.Join(conds, " AND "), args, errs
}

// pagination reads page (>= 1, default 1) and page_size (1-100, default 20).
func pagination(req *pluginv1.HTTPRequest) (page, size int, errs pluginsdk.FieldErrors) {
	page, size = 1, 20
	if v := pluginsdk.Query(req, "page"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			errs = errs.Add("page", "invalid", "page must be a positive integer / page 必须是正整数")
		} else {
			page = n
		}
	}
	if v := pluginsdk.Query(req, "page_size"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 || n > 100 {
			errs = errs.Add("page_size", "out_of_range", "page_size must be between 1 and 100 / page_size 取值 1–100")
		} else {
			size = n
		}
	}
	return page, size, errs
}

func (p *Plugin) listEvents(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	where, args, errs := eventFilter(req)
	page, size, perrs := pagination(req)
	errs = append(errs, perrs...)
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效", errs), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return unavailable(err), nil
	}
	var total int64
	if err := db.QueryRow(ctx, `SELECT count(*) FROM events WHERE `+where, args...).Scan(&total); err != nil {
		return nil, err
	}
	n := len(args)
	args = append(args, size, (page-1)*size)
	rows, err := db.Query(ctx, `SELECT `+eventColumns+`, left(coalesce(text, ''), 120) FROM events WHERE `+where+
		fmt.Sprintf(` ORDER BY created_at DESC, id DESC LIMIT $%d OFFSET $%d`, n+1, n+2), args...)
	if err != nil {
		return nil, err
	}
	items, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (EventListItem, error) {
		var it EventListItem
		err := r.Scan(append(it.scanTargets(), &it.TextExcerpt)...)
		it.CreatedAt = it.CreatedAt.UTC()
		return it, err
	})
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []EventListItem{}
	}
	return pluginsdk.ListResponse(items, pluginsdk.Page{Page: page, PageSize: size, Total: total}), nil
}

func (p *Plugin) getEvent(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return unavailable(err), nil
	}
	var d EventDetail
	err = db.QueryRow(ctx, `SELECT `+eventColumns+`, text FROM events WHERE id = $1`, id).Scan(append(d.scanTargets(), &d.Text)...)
	if errors.Is(err, pgx.ErrNoRows) {
		return pluginsdk.ErrorResponse(http.StatusNotFound, "not_found", "event not found / 记录不存在"), nil
	}
	if err != nil {
		return nil, err
	}
	d.CreatedAt = d.CreatedAt.UTC()
	return pluginsdk.DataResponse(d), nil
}

func (p *Plugin) deleteEvent(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return unavailable(err), nil
	}
	tag, err := db.Exec(ctx, `DELETE FROM events WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return pluginsdk.ErrorResponse(http.StatusNotFound, "not_found", "event not found / 记录不存在"), nil
	}
	return pluginsdk.DataResponse(map[string]any{"id": id, "deleted": true}), nil
}

// ---------------------------------------------------------------- blocks

// Block is one banned user.
type Block struct {
	UserID     int64      `json:"user_id"`
	Reason     string     `json:"reason"`
	Violations int        `json:"violations"`
	Source     string     `json:"source"` // auto | manual
	CreatedAt  time.Time  `json:"created_at"`
	ExpiresAt  *time.Time `json:"expires_at"` // null = until unblocked
	CreatedBy  *int64     `json:"created_by"`
}

const blockColumns = `user_id, reason, violations, source, created_at, expires_at, created_by`

func scanBlock(r pgx.Row) (Block, error) {
	var b Block
	err := r.Scan(&b.UserID, &b.Reason, &b.Violations, &b.Source, &b.CreatedAt, &b.ExpiresAt, &b.CreatedBy)
	b.CreatedAt = b.CreatedAt.UTC()
	if b.ExpiresAt != nil {
		t := b.ExpiresAt.UTC()
		b.ExpiresAt = &t
	}
	return b, err
}

func (p *Plugin) listBlocks(ctx context.Context, _ *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	db, err := p.db(ctx)
	if err != nil {
		return unavailable(err), nil
	}
	rows, err := db.Query(ctx, `SELECT `+blockColumns+` FROM blocks
		WHERE expires_at IS NULL OR expires_at > $1 ORDER BY created_at DESC, user_id`, p.now().UTC())
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (Block, error) { return scanBlock(r) })
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []Block{}
	}
	return pluginsdk.DataResponse(list), nil
}

// blockInput is the POST /blocks body.
type blockInput struct {
	UserID        json.Number `json:"user_id"`
	Reason        string      `json:"reason"`
	DurationHours json.Number `json:"duration_hours"`
}

func (p *Plugin) createBlock(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in blockInput
	dec := json.NewDecoder(strings.NewReader(string(req.GetBody())))
	dec.UseNumber()
	if err := dec.Decode(&in); err != nil {
		return pluginsdk.ErrorResponse(http.StatusBadRequest, "invalid_argument", "invalid JSON body / 请求体不是合法 JSON"), nil
	}
	var errs pluginsdk.FieldErrors
	uid, err := strconv.ParseInt(in.UserID.String(), 10, 64)
	if err != nil || uid <= 0 {
		errs = errs.Add("user_id", "invalid", "user_id must be a positive integer / user_id 必须是正整数")
	}
	var hours int64
	if in.DurationHours != "" {
		hours, err = strconv.ParseInt(in.DurationHours.String(), 10, 64)
		if err != nil || hours < 0 || hours > 87600 {
			errs = errs.Add("duration_hours", "out_of_range", "duration_hours must be an integer between 0 and 87600 / duration_hours 取值 0–87600")
		}
	}
	reason := strings.TrimSpace(in.Reason)
	if utf8.RuneCountInString(reason) > 500 {
		errs = errs.Add("reason", "too_long", "reason must be at most 500 characters / 原因最多 500 字")
	}
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid block / 封禁参数无效", errs), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return unavailable(err), nil
	}
	now := p.now().UTC()
	var expires *time.Time
	if hours > 0 {
		t := now.Add(time.Duration(hours) * time.Hour)
		expires = &t
	}
	var by *int64
	if id := req.GetCaller().GetUserId(); id > 0 {
		by = &id
	}
	b, err := scanBlock(db.QueryRow(ctx, `INSERT INTO blocks (user_id, reason, violations, source, created_at, expires_at, created_by)
		VALUES ($1, $2, 0, 'manual', $3, $4, $5)
		ON CONFLICT (user_id) DO UPDATE SET reason = EXCLUDED.reason, source = 'manual', created_at = EXCLUDED.created_at,
			expires_at = EXCLUDED.expires_at, created_by = EXCLUDED.created_by
		RETURNING `+blockColumns, uid, reason, now, expires, by))
	if err != nil {
		return nil, err
	}
	p.blocksChanged(ctx)
	return pluginsdk.DataResponse(b), nil
}

func (p *Plugin) deleteBlock(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid, bad := parseID(req, "user_id")
	if bad != nil {
		return bad, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return unavailable(err), nil
	}
	var found bool
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `DELETE FROM blocks WHERE user_id = $1`, uid)
		if err != nil {
			return err
		}
		if found = tag.RowsAffected() > 0; !found {
			return nil
		}
		_, err = tx.Exec(ctx, `INSERT INTO unblocks (user_id, at) VALUES ($1, $2)
			ON CONFLICT (user_id) DO UPDATE SET at = EXCLUDED.at`, uid, p.now().UTC())
		return err
	})
	if err != nil {
		return nil, err
	}
	if !found {
		return pluginsdk.ErrorResponse(http.StatusNotFound, "not_found", "user is not blocked / 该用户未被封禁"), nil
	}
	p.blocksChanged(ctx)
	return pluginsdk.DataResponse(map[string]any{"user_id": uid, "unblocked": true}), nil
}

// ---------------------------------------------------------------- test & defaults

// TestResult is the POST /test response data.
type TestResult struct {
	Verdict    string            `json:"verdict"` // pass | flag | block | error
	Categories []string          `json:"categories"`
	Severity   string            `json:"severity"`
	Reason     string            `json:"reason"`
	Error      string            `json:"error,omitempty"`
	LatencyMs  int64             `json:"latency_ms"`
	Turns      int               `json:"turns"`
	Usage      Usage             `json:"usage"`
	Transcript []json.RawMessage `json:"transcript"`
}

func (p *Plugin) testModeration(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in struct {
		Text *string `json:"text"`
	}
	if err := json.Unmarshal(req.GetBody(), &in); err != nil {
		return pluginsdk.ErrorResponse(http.StatusBadRequest, "invalid_argument", "invalid JSON body / 请求体不是合法 JSON"), nil
	}
	text := ""
	if in.Text != nil {
		text = strings.TrimSpace(stripSystemReminders(*in.Text))
	}
	if text == "" {
		return pluginsdk.FieldErrorResponse("invalid test input / 测试输入无效",
			pluginsdk.FieldErrors{}.Add("text", "required", "text is required / 请输入要审核的文本")), nil
	}
	c := p.cfg.Load()
	if !c.configured {
		return pluginsdk.ErrorResponse(http.StatusBadRequest, "not_configured",
			"set base_url, api_key and model in the plugin settings first / 请先在插件设置中填写 base_url、api_key 和 model"), nil
	}
	text = truncateText(text, c.InputMaxChars)
	jctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()
	start := time.Now()
	res, err := p.judge(jctx, c, text, true)
	out := TestResult{Categories: []string{}, Transcript: []json.RawMessage{}, LatencyMs: time.Since(start).Milliseconds()}
	if res != nil {
		out.Turns, out.Usage = res.Turns, res.Usage
		if res.Transcript != nil {
			out.Transcript = res.Transcript
		}
	}
	if err != nil {
		out.Verdict, out.Error = VerdictError, err.Error()
	} else {
		out.Verdict, out.Severity, out.Reason = res.Verdict.Verdict, res.Verdict.Severity, res.Verdict.Reason
		if len(res.Verdict.Categories) > 0 {
			out.Categories = res.Verdict.Categories
		}
	}
	return pluginsdk.DataResponse(out), nil
}

func (p *Plugin) getDefaults(context.Context, *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	return pluginsdk.DataResponse(map[string]any{"system_prompt": DefaultSystemPrompt, "categories": DefaultCategories()}), nil
}

// ---------------------------------------------------------------- jobs

// RunJob implements pluginsdk.JobRunner. cleanup deletes records older than
// retention_days and expired blocks; an expired ban counts as an unblock at
// its expiry, so violations before it are not counted again.
func (p *Plugin) RunJob(ctx context.Context, in *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error) {
	if in.GetJobId() != JobCleanup {
		return nil, status.Errorf(codes.NotFound, "unknown job %q", in.GetJobId())
	}
	db, err := p.db(ctx)
	if err != nil {
		return nil, status.Error(codes.Unavailable, err.Error())
	}
	c := p.cfg.Load()
	now := p.now().UTC()
	var events, blocks int64
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `DELETE FROM events WHERE created_at < $1`, now.Add(-c.retention))
		if err != nil {
			return err
		}
		events = tag.RowsAffected()
		tag, err = tx.Exec(ctx, `WITH expired AS (
				DELETE FROM blocks WHERE expires_at IS NOT NULL AND expires_at <= $1 RETURNING user_id, expires_at)
			INSERT INTO unblocks (user_id, at) SELECT user_id, expires_at FROM expired
			ON CONFLICT (user_id) DO UPDATE SET at = GREATEST(unblocks.at, EXCLUDED.at)`, now)
		if err != nil {
			return err
		}
		blocks = tag.RowsAffected()
		_, err = tx.Exec(ctx, `DELETE FROM unblocks WHERE at < $1`, now.Add(-366*24*time.Hour))
		return err
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "cleanup: %v", err)
	}
	return &pluginv1.RunJobResponse{Message: fmt.Sprintf("deleted %d events and %d expired blocks", events, blocks)}, nil
}
