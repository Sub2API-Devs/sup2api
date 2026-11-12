package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

func (p *Plugin) routes() {
	p.Handle("GET", "/events", p.listEvents)
	p.Handle("POST", "/events/review", p.reviewEvents)
	p.Handle("GET", "/events/:id", p.getEvent)
	p.Handle("GET", "/events/:id/input", p.getEventInput)
	p.Handle("DELETE", "/events/:id", p.deleteEvent)
	p.Handle("GET", "/blocks", p.listBlocks)
	p.Handle("POST", "/blocks", p.createBlock)
	p.Handle("DELETE", "/blocks/:user_id", p.deleteBlock)
	p.Handle("GET", "/watchlist", p.listWatch)
	p.Handle("POST", "/watchlist", p.createWatch)
	p.Handle("PATCH", "/watchlist/:user_id", p.updateWatch)
	p.Handle("DELETE", "/watchlist/:user_id", p.deleteWatch)
	p.Handle("GET", "/watchlist/:user_id/events", p.listWatchEvents)
	p.Handle("GET", "/users", p.getUsers)
	p.Handle("GET", "/users/:user_id", p.getUserDetail)
	p.Handle("POST", "/watchlist/:user_id/seen", p.markWatchSeen)
	p.Handle("GET", "/costs", p.getCosts)
	p.Handle("GET", "/status", p.getStatus)
	p.Handle("GET", "/stats/trend", p.getTrend)
	p.Handle("GET", "/stats/performance", p.getPerformance)
	p.Handle("GET", "/stats/categories", p.getCategories)
	p.Handle("GET", "/channels", p.listChannels)
	p.Handle("POST", "/channels", p.createChannel)
	p.Handle("GET", "/channels/:id", p.getChannel)
	p.Handle("PUT", "/channels/:id", p.updateChannel)
	p.Handle("DELETE", "/channels/:id", p.deleteChannel)
	p.Handle("POST", "/channels/:id/test", p.testChannel)
	p.Handle("GET", "/auditors", p.listAuditors)
	p.Handle("POST", "/auditors", p.createAuditor)
	p.Handle("GET", "/auditors/:id", p.getAuditor)
	p.Handle("PUT", "/auditors/:id", p.updateAuditor)
	p.Handle("DELETE", "/auditors/:id", p.deleteAuditor)
	p.Handle("POST", "/auditors/:id/try", p.tryAuditor)
	p.Handle("POST", "/auditors/try", p.tryDraftAuditor)
	p.Handle("GET", "/jev/default-questions", p.getJevDefaults)
	p.Handle("GET", "/flows", p.listFlows)
	p.Handle("POST", "/flows", p.createFlow)
	p.Handle("GET", "/flows/:id", p.getFlow)
	p.Handle("PUT", "/flows/:id", p.updateFlow)
	p.Handle("DELETE", "/flows/:id", p.deleteFlow)
	p.Handle("PUT", "/flows/:id/groups", p.setFlowGroups)
	p.Handle("GET", "/bindings", p.listBindings)
	p.Handle("PUT", "/bindings", p.putBinding)
	p.Handle("DELETE", "/bindings/:group_id/:account_id", p.deleteBinding)
	p.Handle("POST", "/flows/:id/publish", p.publishFlow)
	p.Handle("PUT", "/flows/:id/enabled", p.setFlowEnabled)
	p.Handle("GET", "/flows/:id/versions", p.listFlowVersions)
	p.Handle("GET", "/flows/:id/versions/:version", p.getFlowVersion)
	p.Handle("POST", "/flows/:id/rollback", p.rollbackFlow)
	p.Handle("POST", "/flows/:id/simulate", p.simulateFlow)
	p.Handle("POST", "/import", p.importConfig)
	p.Handle("POST", "/test", p.testModeration)
	p.Handle("POST", "/verdict-cache/clear", p.clearVerdictCache)
}

func parseID(req *pluginv1.HTTPRequest, name string) (int64, *pluginv1.HTTPResponse) {
	id, err := strconv.ParseInt(pluginsdk.Param(req, name), 10, 64)
	if err != nil || id <= 0 {
		return 0, pluginsdk.FieldErrorResponse("invalid path parameter / 路径参数无效",
			pluginsdk.FieldErrors{}.Add(name, "invalid", name+" must be a positive integer / "+name+" 必须是正整数"))
	}
	return id, nil
}

// ---------------------------------------------------------------- runtime

// Runtime is this node's live state.
type Runtime struct {
	Mode          string `json:"mode"`
	Configured    bool   `json:"configured"` // a flow is bound
	SettingsHash  string `json:"settings_hash"`
	ConfigVersion int64  `json:"config_version"`
	CacheEpoch    int64  `json:"cache_epoch"` // clears of the verdict cache
	Flows         int    `json:"flows"`
	Auditors      int    `json:"auditors"`
	QueueLen      int    `json:"queue_len"`
	QueueCap      int    `json:"queue_cap"`
	Dropped       int64  `json:"dropped"`
	Inflight      int64  `json:"inflight"`
	Calls         int64  `json:"calls"`
	Errors        int64  `json:"errors"`
	CacheHits     int64  `json:"cache_hits"`
	CacheEntries  int    `json:"cache_entries"`
	CacheBytes    int64  `json:"cache_bytes"` // estimated memory of the verdict cache entries
	// KVErrors counts the calls of the host KV that failed (kvFailed), on
	// this node since it started: the batch calls of the verdict cache
	// (lookups, writes and review syncs, one per call) and the reads and
	// writes of the alert state. A call that ended because its caller left
	// or the node stopped is not among them.
	KVErrors int64 `json:"kv_errors"`
	// KVWriting is the number of runs whose verdicts are on their way to the
	// KV right now, waiting for their turn or writing (storeVerdicts). It is
	// 0 or close to it while the KV answers; a number that keeps growing
	// means the KV does not, and nothing new is cached meanwhile.
	KVWriting int64 `json:"kv_writing"`
	// KVSkipped counts the runs whose verdicts were not cached because a
	// review (on this node, or one this node was told of) may have changed
	// the cache since their request asked it, or because the memory cache
	// was replaced since (cleared on this node, cache_entries changed), on
	// this node since it started: their content is moderated again the next
	// time.
	KVSkipped int64 `json:"kv_skipped"`
	// ImagesRefused counts the calls of the LLM auditors whose images the
	// upstream refused, so that the text alone was reviewed
	// (Outcome.ImagesRefused), on this node since it started.
	ImagesRefused int64 `json:"images_refused"`
	// RedrawPanics counts the images skipped because their decoder panicked
	// while they were redrawn for Jev, on this node since it started.
	RedrawPanics int64 `json:"redraw_panics"`
	AvgLatencyMs int64 `json:"avg_latency_ms"`
	BlockedUsers int   `json:"blocked_users"`
	WatchedUsers int   `json:"watched_users"`
	DroppedCosts int64 `json:"dropped_costs"`
}

func (p *Plugin) runtimeState() Runtime {
	c := p.cfg.Load()
	s := p.snap.Load()
	qlen, qcap := p.queueLen()
	calls := p.stats.calls.Load()
	var avg int64
	if calls > 0 {
		avg = p.stats.latencyMsSum.Load() / calls
	}
	return Runtime{
		Mode: c.Mode, Configured: s.bound(), SettingsHash: c.settingsHash, ConfigVersion: s.version, CacheEpoch: s.cacheEpoch,
		Flows: len(s.flows), Auditors: len(s.auditors), QueueLen: qlen, QueueCap: qcap,
		Dropped: p.stats.dropped.Load(), Inflight: p.stats.inflight.Load(), Calls: calls,
		Errors: p.stats.errors.Load(), CacheHits: p.stats.cacheHits.Load(), CacheEntries: p.cache.Load().len(), CacheBytes: p.cache.Load().size(),
		KVErrors: p.stats.kvErrors.Load(), KVWriting: p.stats.kvWriting.Load(), KVSkipped: p.stats.kvSkipped.Load(), ImagesRefused: p.stats.imagesRefused.Load(), RedrawPanics: jevRedrawPanics.Load(),
		AvgLatencyMs: avg, BlockedUsers: p.blockedCount(), WatchedUsers: len(*p.watch.Load()),
		DroppedCosts: p.hourly.dropped.Load(),
	}
}

// ---------------------------------------------------------------- events

// Event is one moderation record. List items carry text_excerpt (first 120
// characters) instead of text; the raw messages are only in /events/:id/input.
type Event struct {
	ID               int64      `json:"id"`
	CreatedAt        time.Time  `json:"created_at"`
	RequestID        string     `json:"request_id"`
	UserID           int64      `json:"user_id"`
	APIKeyID         int64      `json:"api_key_id"`
	GroupID          int64      `json:"group_id"`
	Model            string     `json:"model"`
	Protocol         string     `json:"protocol"`
	Endpoint         string     `json:"endpoint"`   // client endpoint path pattern
	SessionFp        string     `json:"session_fp"` // sticky-session fingerprint, "" = none
	Mode             string     `json:"mode"`
	Timing           string     `json:"timing"`
	Result           string     `json:"result"`
	FlowID           int64      `json:"flow_id"`
	FlowVersion      int        `json:"flow_version"`
	Severity         string     `json:"severity"`
	HitCategories    []string   `json:"hit_categories"`
	HighestCategory  string     `json:"highest_category"`
	HighestScore     float64    `json:"highest_score"`
	ReviewStatus     string     `json:"review_status"`
	ReviewedBy       *int64     `json:"reviewed_by"`
	ReviewedAt       *time.Time `json:"reviewed_at"`
	Counted          bool       `json:"counted"`
	InputFormat      string     `json:"input_format"`
	TextChars        int        `json:"text_chars"`
	ImageCount       int        `json:"image_count"`
	InputMessageSize int        `json:"input_message_size"`
	LatencyMs        int        `json:"latency_ms"`
	QueueMs          int        `json:"queue_ms"`
	KeepUntil        *time.Time `json:"keep_until"`
	// Replayed: decided by a cached hit (trace.cache), not a new violation.
	Replayed bool `json:"replayed"`
	// 0.1 records only.
	Verdict  string `json:"verdict"`
	Reason   string `json:"reason"`
	Error    string `json:"error"`
	LLMModel string `json:"llm_model"`
}

// EventListItem is an Event in GET /events.
type EventListItem struct {
	Event
	TextExcerpt string `json:"text_excerpt"`
	// Trace feeds the stage path and score chips of the list (null on 0.1
	// records).
	Trace json.RawMessage `json:"trace"`
}

// EventDetail is GET /events/:id: text is null when store_text was off,
// trace is the per-stage JSON (null on 0.1 records).
type EventDetail struct {
	Event
	Text  *string `json:"text"`
	Trace any     `json:"trace"`
	// Detail context (new-api GetModerationRecord): the other records of the
	// same request, the flow version that ran, the user's state now and the
	// full text of the saved input message.
	FlowName     string        `json:"flow_name"`
	FlowCurrent  int           `json:"flow_current_version"`
	FlowSnapshot any           `json:"flow_snapshot"`
	Related      []RelatedItem `json:"related"`
	UserState    UserState     `json:"user_state"`
	InputText    string        `json:"input_text"`
}

// RelatedItem is another record of the same request.
type RelatedItem struct {
	ID          int64     `json:"id"`
	CreatedAt   time.Time `json:"created_at"`
	Timing      string    `json:"timing"`
	Result      string    `json:"result"`
	FlowID      int64     `json:"flow_id"`
	FlowVersion int       `json:"flow_version"`
	Severity    string    `json:"severity"`
}

// UserState is the record user's moderation state now.
type UserState struct {
	Watch *Watch `json:"watch"`
	// Allowlisted, Blocklisted: the user lists of the settings (a user on
	// both is blocklisted).
	Allowlisted bool       `json:"allowlisted"`
	Blocklisted bool       `json:"blocklisted"`
	Staff       bool       `json:"staff"`
	Blocked     bool       `json:"blocked"`
	Until       *time.Time `json:"blocked_until"`
}

const eventColumns = `id, created_at, request_id, user_id, api_key_id, group_id, model, protocol, endpoint, session_fp, mode, timing, result,
	flow_id, flow_version, severity, hit_categories, highest_category, highest_score, review_status, reviewed_by, reviewed_at,
	counted, input_format, text_chars, image_count, input_message_size, latency_ms, queue_ms, keep_until, replayed,
	verdict, reason, error, llm_model`

func (e *Event) scanTargets() []any {
	return []any{&e.ID, &e.CreatedAt, &e.RequestID, &e.UserID, &e.APIKeyID, &e.GroupID, &e.Model, &e.Protocol, &e.Endpoint, &e.SessionFp, &e.Mode, &e.Timing, &e.Result,
		&e.FlowID, &e.FlowVersion, &e.Severity, &e.HitCategories, &e.HighestCategory, &e.HighestScore, &e.ReviewStatus, &e.ReviewedBy, &e.ReviewedAt,
		&e.Counted, &e.InputFormat, &e.TextChars, &e.ImageCount, &e.InputMessageSize, &e.LatencyMs, &e.QueueMs, &e.KeepUntil, &e.Replayed,
		&e.Verdict, &e.Reason, &e.Error, &e.LLMModel}
}

func (e *Event) normalize() {
	e.CreatedAt, e.ReviewedAt, e.KeepUntil = e.CreatedAt.UTC(), utcPtr(e.ReviewedAt), utcPtr(e.KeepUntil)
	if e.HitCategories == nil {
		e.HitCategories = []string{}
	}
}

// eventFilter builds the WHERE clause of GET /events.
func eventFilter(req *pluginv1.HTTPRequest) (where string, args []any, errs pluginsdk.FieldErrors) {
	f := &sqlFilter{conds: []string{"TRUE"}}
	if v := pluginsdk.Query(req, "result"); v == "suspicious" {
		f.conds = append(f.conds, suspiciousResult)
	} else {
		f.enum(req, "result", ResultBlock, ResultHit, ResultOverturned, ResultError, ResultPass)
	}
	f.enum(req, "severity", "high", "medium", "low")
	f.enum(req, "review_status", reviewStatuses...)
	f.enum(req, "timing", TimingPre, TimingPost)
	switch v := pluginsdk.Query(req, "replayed"); v {
	case "":
	case "true":
		f.conds = append(f.conds, "replayed")
	case "false":
		f.conds = append(f.conds, "NOT replayed")
	default:
		f.errs = f.errs.Add("replayed", "enum", "replayed must be true or false / replayed 取值为 true、false")
	}
	f.enum(req, "verdict", VerdictPass, VerdictFlag, VerdictBlock, VerdictError)
	f.enum(req, "action", ActionAllow, ActionDeny)
	f.enum(req, "mode", ModeObserve, ModeEnforce)
	f.ids(req)
	f.text(req, "request_id", "request_id = ")
	f.text(req, "endpoint", "endpoint = ")
	f.text(req, "session_fp", "session_fp <> '' AND session_fp = ") // the partial index
	if v := pluginsdk.Query(req, "category"); v != "" {
		if !jevCategoryRe.MatchString(v) && !categoryIDRe.MatchString(v) {
			f.errs = f.errs.Add("category", "invalid", "category is invalid / 分类格式无效")
		} else {
			f.conds = append(f.conds, f.arg(v)+" = ANY(hit_categories)")
		}
	}
	if v := pluginsdk.Query(req, "watch_level"); v != "" {
		switch v {
		case LevelObserve, LevelEnforce:
			f.conds = append(f.conds, "user_id IN (SELECT user_id FROM watchlist WHERE level = "+f.arg(v)+")")
		case "any":
			f.conds = append(f.conds, "user_id IN (SELECT user_id FROM watchlist)")
		default:
			f.errs = f.errs.Add("watch_level", "enum", "watch_level must be observe, enforce or any / watch_level 取值为 observe、enforce、any")
		}
	}
	f.search(req)
	from, to := f.times(req)
	if !from.IsZero() && !to.IsZero() && !from.Before(to) {
		f.errs = f.errs.Add("from", "range", "from must be before to / from 必须早于 to")
	}
	return f.where(), f.args, f.errs
}

func (f *sqlFilter) enum(req *pluginv1.HTTPRequest, name string, allowed ...string) {
	v := pluginsdk.Query(req, name)
	if v == "" {
		return
	}
	for _, a := range allowed {
		if v == a {
			f.conds = append(f.conds, name+" = "+f.arg(v))
			return
		}
	}
	f.errs = f.errs.Add(name, "enum", fmt.Sprintf("%s must be one of %s / %s 取值为 %s", name, strings.Join(allowed, ", "), name, strings.Join(allowed, "、")))
}

func (f *sqlFilter) ids(req *pluginv1.HTTPRequest) {
	for _, name := range []string{"user_id", "api_key_id", "group_id", "flow_id", "flow_version"} {
		f.id(req, name, name)
	}
	f.idList(req, "user_ids", "user_id")
}

func (f *sqlFilter) text(req *pluginv1.HTTPRequest, name, cond string) {
	v := strings.TrimSpace(pluginsdk.Query(req, name))
	if v == "" {
		return
	}
	if len(v) > 200 {
		f.errs = f.errs.Add(name, "too_long", name+" is too long / "+name+" 过长")
		return
	}
	f.conds = append(f.conds, cond+f.arg(v))
}

// search matches the term against request id, reason and text.
func (f *sqlFilter) search(req *pluginv1.HTTPRequest) {
	v := strings.TrimSpace(pluginsdk.Query(req, "q"))
	if v == "" {
		return
	}
	if utf8.RuneCountInString(v) > 200 {
		f.errs = f.errs.Add("q", "too_long", "q must be at most 200 characters / 搜索词最多 200 字")
		return
	}
	like := "%" + strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(v) + "%"
	a := f.arg(like)
	f.conds = append(f.conds, "(request_id ILIKE "+a+" OR reason ILIKE "+a+" OR text ILIKE "+a+")")
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
		return pluginsdk.Unavailable(err.Error()), nil
	}
	var total int64
	if err := db.QueryRow(ctx, `SELECT count(*) FROM events WHERE `+where, args...).Scan(&total); err != nil {
		return nil, err
	}
	n := len(args)
	args = append(args, size, (page-1)*size)
	rows, err := db.Query(ctx, `SELECT `+eventColumns+`, left(coalesce(text, ''), 120), trace FROM events WHERE `+where+
		fmt.Sprintf(` ORDER BY created_at DESC, id DESC LIMIT $%d OFFSET $%d`, n+1, n+2), args...)
	if err != nil {
		return nil, err
	}
	items, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (EventListItem, error) {
		var it EventListItem
		var trace []byte
		err := r.Scan(append(it.scanTargets(), &it.TextExcerpt, &trace)...)
		if len(trace) > 0 {
			it.Trace = trace
		}
		it.normalize()
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
		return pluginsdk.Unavailable(err.Error()), nil
	}
	var d EventDetail
	var trace []byte
	err = db.QueryRow(ctx, `SELECT `+eventColumns+`, text, trace FROM events WHERE id = $1`, id).Scan(append(d.scanTargets(), &d.Text, &trace)...)
	if errors.Is(err, pgx.ErrNoRows) {
		return notFound("event"), nil
	}
	if err != nil {
		return nil, err
	}
	d.normalize()
	if len(trace) > 0 {
		d.Trace = jsonRaw(trace)
	}
	if err := p.eventContext(ctx, db, &d); err != nil {
		return nil, err
	}
	return pluginsdk.DataResponse(d), nil
}

// eventContext fills the detail context of a record.
func (p *Plugin) eventContext(ctx context.Context, db *pgxpool.Pool, d *EventDetail) error {
	for _, load := range []func(context.Context, *pgxpool.Pool, *EventDetail) error{
		relatedEvents, p.flowContext, eventExtras,
	} {
		if err := load(ctx, db, d); err != nil {
			return err
		}
	}
	if d.UserID <= 0 {
		return nil
	}
	var err error
	d.UserState, err = p.userState(ctx, db, d.UserID)
	return err
}

// relatedEvents lists the other records of the same request (pre and post).
func relatedEvents(ctx context.Context, db *pgxpool.Pool, d *EventDetail) error {
	d.Related = []RelatedItem{}
	if d.RequestID == "" {
		return nil
	}
	rows, err := db.Query(ctx, `SELECT id, created_at, timing, result, flow_id, flow_version, severity FROM events
		WHERE request_id = $1 AND id <> $2 ORDER BY id LIMIT 20`, d.RequestID, d.ID)
	if err != nil {
		return err
	}
	related, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (RelatedItem, error) {
		var it RelatedItem
		err := r.Scan(&it.ID, &it.CreatedAt, &it.Timing, &it.Result, &it.FlowID, &it.FlowVersion, &it.Severity)
		it.CreatedAt = it.CreatedAt.UTC()
		return it, err
	})
	if len(related) > 0 {
		d.Related = related
	}
	return err
}

// flowContext adds the flow's name, its current version and the version
// that ran.
func (p *Plugin) flowContext(ctx context.Context, db *pgxpool.Pool, d *EventDetail) error {
	if d.FlowID <= 0 {
		return nil
	}
	err := db.QueryRow(ctx, `SELECT name, version FROM flows WHERE id = $1`, d.FlowID).Scan(&d.FlowName, &d.FlowCurrent)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	v, err := p.flowVersionView(ctx, d.FlowID, d.FlowVersion, p.snap.Load())
	if errors.Is(err, errNotFound) {
		return nil
	}
	d.FlowSnapshot = v
	return err
}

// eventExtras adds the readable input text.
func eventExtras(ctx context.Context, db *pgxpool.Pool, d *EventDetail) error {
	if d.InputMessageSize == 0 {
		return nil
	}
	var msg *string
	err := db.QueryRow(ctx, `SELECT input_message FROM events WHERE id = $1`, d.ID).Scan(&msg)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if msg != nil {
		d.InputText = MessageText(d.InputFormat, *msg)
	}
	return nil
}

// userState is a user's moderation state now: watch entry, user lists,
// moderator, block.
func (p *Plugin) userState(ctx context.Context, db *pgxpool.Pool, uid int64) (UserState, error) {
	now := p.now().UTC()
	c := p.cfg.Load()
	st := UserState{Allowlisted: c.allowlisted(uid), Blocklisted: c.blocklisted(uid), Staff: p.isStaff(ctx, uid)}
	if until, ok := (*p.blocked.Load())[uid]; ok && (until.IsZero() || now.Before(until)) {
		st.Blocked = true
		if !until.IsZero() {
			u := until.UTC()
			st.Until = &u
		}
	}
	w, err := scanWatch(db.QueryRow(ctx, `SELECT `+watchColumns+` FROM watchlist WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > $2)`, uid, now))
	switch {
	case err == nil:
		st.Watch = &w
	case !errors.Is(err, pgx.ErrNoRows):
		return st, err
	}
	return st, nil
}

// getEventInput returns the raw moderated messages of a record (stored
// when a stage hit, and of the other records with
// record_pass_input_message).
func (p *Plugin) getEventInput(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	var msg *string
	var format string
	err = db.QueryRow(ctx, `SELECT input_message, input_format FROM events WHERE id = $1`, id).Scan(&msg, &format)
	if errors.Is(err, pgx.ErrNoRows) {
		return notFound("event"), nil
	}
	if err != nil {
		return nil, err
	}
	out := map[string]any{"id": id, "format": format, "messages": nil, "parts": nil}
	if msg != nil {
		out["messages"] = jsonRaw([]byte(*msg))
		if parts, ok := MessageParts(format, *msg); ok {
			out["parts"] = parts
		}
	}
	return pluginsdk.DataResponse(out), nil
}

func (p *Plugin) deleteEvent(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	tag, err := db.Exec(ctx, `DELETE FROM events WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return notFound("event"), nil
	}
	return pluginsdk.DataResponse(map[string]any{"id": id, "deleted": true}), nil
}

// Review statuses of a suspicious record (events.review_status).
const (
	ReviewPending       = "pending"
	ReviewFalsePositive = "false_positive"
	ReviewConfirmed     = "confirmed"
	// maxReviewIDs is the number of records one review request may name.
	maxReviewIDs = 500
)

var reviewStatuses = []string{ReviewPending, ReviewFalsePositive, ReviewConfirmed}

// reviewEvents sets the review status of suspicious records: {ids, status};
// other records of ids are left alone. Marking a counted record
// false_positive takes its violation back from the user's current window;
// undoing it counts it again in the same window (§72.8). The verdict cache
// follows the review (syncReviewed); cache_synced is the number of records
// whose cached verdict was updated in the shared KV - fewer than the records
// with a cached verdict when KV writes failed or the request ended first.
func (p *Plugin) reviewEvents(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in struct {
		IDs    []int64 `json:"ids"`
		Status string  `json:"status"`
	}
	if bad := decodeBody(req, &in); bad != nil {
		return bad, nil
	}
	var errs pluginsdk.FieldErrors
	if len(in.IDs) == 0 || len(in.IDs) > maxReviewIDs {
		errs = errs.Add("ids", "invalid", fmt.Sprintf("ids must list 1 to %d records / ids 需要 1–%d 条", maxReviewIDs, maxReviewIDs))
	}
	if !slices.Contains(reviewStatuses, in.Status) {
		errs = errs.Add("status", "enum", "status must be pending, false_positive or confirmed / status 取值为 pending、false_positive、confirmed")
	}
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid review / 处理参数无效", errs), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	rows, err := db.Query(ctx, `SELECT DISTINCT user_id FROM events WHERE id = ANY($1) AND `+suspiciousResult+` ORDER BY user_id`, in.IDs)
	if err != nil {
		return nil, err
	}
	users, err := pgx.CollectRows(rows, pgx.RowTo[int64])
	if err != nil {
		return nil, err
	}
	now, by := p.now().UTC(), callerID(req)
	updated := 0
	for _, uid := range users {
		err := pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
			if uid > 0 {
				if err := lockBlockSubject(ctx, tx, uid); err != nil {
					return err
				}
			}
			var epoch int64
			if err := tx.QueryRow(ctx, `SELECT coalesce((SELECT violation_epoch FROM watchlist WHERE user_id = $1 AND level = 'observe'), 0)`, uid).Scan(&epoch); err != nil {
				return err
			}
			// Take back: counted records of the current window turning false_positive.
			tag, err := tx.Exec(ctx, `UPDATE events SET counted = false
				WHERE id = ANY($1) AND user_id = $2 AND counted AND $3 = 'false_positive' AND violation_epoch = $4 AND $4 <> 0`,
				in.IDs, uid, in.Status, epoch)
			if err != nil {
				return err
			}
			delta := -int(tag.RowsAffected())
			// Count again: false positives of the current window turning back.
			tag, err = tx.Exec(ctx, `UPDATE events SET counted = true
				WHERE id = ANY($1) AND user_id = $2 AND NOT counted AND review_status = 'false_positive' AND $3 <> 'false_positive'
				  AND violation_epoch = $4 AND $4 <> 0 AND `+suspiciousResult, in.IDs, uid, in.Status, epoch)
			if err != nil {
				return err
			}
			delta += int(tag.RowsAffected())
			tag, err = tx.Exec(ctx, `UPDATE events SET review_status = $3, reviewed_by = $4, reviewed_at = $5
				WHERE id = ANY($1) AND user_id = $2 AND `+suspiciousResult, in.IDs, uid, in.Status, by, now)
			if err != nil {
				return err
			}
			updated += int(tag.RowsAffected())
			if delta != 0 {
				_, err = tx.Exec(ctx, `UPDATE watchlist SET violation_count = GREATEST(violation_count + $2, 0), updated_at = $3 WHERE user_id = $1`, uid, delta, now)
			}
			return err
		})
		if err != nil {
			return nil, err
		}
	}
	synced := p.syncReviewed(ctx, in.IDs, in.Status)
	return pluginsdk.DataResponse(map[string]any{"updated": updated, "status": in.Status, "cache_synced": synced}), nil
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
	b.CreatedAt, b.ExpiresAt = b.CreatedAt.UTC(), utcPtr(b.ExpiresAt)
	return b, err
}

func (p *Plugin) listBlocks(ctx context.Context, _ *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
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

func (p *Plugin) createBlock(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in struct {
		UserID        jsonNumber `json:"user_id"`
		Reason        string     `json:"reason"`
		DurationHours jsonNumber `json:"duration_hours"`
	}
	if bad := decodeBody(req, &in); bad != nil {
		return bad, nil
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
	if len(errs) == 0 {
		errs = p.unbannableUser(ctx, p.cfg.Load(), uid)
	}
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid block / 封禁参数无效", errs), nil
	}
	if resp := p.missingUser(ctx, uid); resp != nil {
		return resp, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	now := p.now().UTC()
	var expires *time.Time
	if hours > 0 {
		t := now.Add(time.Duration(hours) * time.Hour)
		expires = &t
	}
	var b Block
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		if err := lockBlockSubject(ctx, tx, uid); err != nil {
			return err
		}
		var err error
		b, err = scanBlock(tx.QueryRow(ctx, `INSERT INTO blocks (user_id, reason, violations, source, created_at, expires_at, created_by)
		VALUES ($1, $2, 0, 'manual', $3, $4, $5)
		ON CONFLICT (user_id) DO UPDATE SET reason = EXCLUDED.reason, source = 'manual', created_at = EXCLUDED.created_at,
			expires_at = EXCLUDED.expires_at, created_by = EXCLUDED.created_by
		RETURNING `+blockColumns, uid, reason, now, expires, callerID(req)))
		return err
	})
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
		return pluginsdk.Unavailable(err.Error()), nil
	}
	var found bool
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		if err := lockBlockSubject(ctx, tx, uid); err != nil {
			return err
		}
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
