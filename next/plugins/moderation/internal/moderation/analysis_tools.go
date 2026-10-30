package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"slices"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
)

// The read-only tools of the analysis agent (new-api analysis_tools.go).
// The analysed user is fixed by the server; no schema has a user_id.

const submitAnalysisTool = "submit_analysis"

type toolHandler func(ctx context.Context, tc *toolCtx, args json.RawMessage) (any, error)

// ToolSpec is one analysis tool; a nil handler is the terminating tool.
type ToolSpec struct {
	Name    string
	Purpose string
	Args    string
	Returns string
	Schema  map[string]any
	Handler toolHandler
}

var analysisTools []ToolSpec

func init() {
	analysisTools = []ToolSpec{
		{Name: "get_user_summary", Purpose: "看这个用户的整体情况", Args: "无",
			Returns: "今天和近 30 天的审核记录数、可疑数，按类别和严重度的计数，名单级别、来源、到期日，名单历史，上一次分析结论；当前分组、该分组当前绑定的流程（id / 名称 / 版本）、近 30 天「分组 → 流程@版本」分布",
			Schema:  objectSchema(nil, map[string]any{}), Handler: toolUserSummary},
		{Name: "list_suspicious_records", Purpose: "列出这个用户的可疑记录（新的在前，分页）",
			Args:    "since_days? 默认 30 · limit? 默认 20，≤50 · before_id? 翻页",
			Returns: "id、时间、group、flow_id、flow_version、命中类别、严重度（按分数）、各级各审核器的得分和阈值（含送审的图片数 sent_images、没送出的 skipped_images）、处理状态（误报 / 确认 / 还没处理）、上次 AI 复核结论、120 字摘录（没保存原文时为空）",
			Schema: objectSchema(nil, map[string]any{
				"since_days": map[string]any{"type": "integer", "minimum": 1, "maximum": 365},
				"limit":      map[string]any{"type": "integer", "minimum": 1, "maximum": 50},
				"before_id":  map[string]any{"type": "integer"},
			}), Handler: toolListRecords},
		{Name: "get_record", Purpose: "看一条可疑记录的详情",
			Args:    "id（必须是这个用户的记录，否则返回错误给模型）· offset? 全文从第几个字开始读，默认 0 · limit? 这次最多读多少字，默认 12000，≤20000",
			Returns: "240 字摘录；记录保存了原文时另有 text：用户消息全文从 offset 起的一段（审核器只看了全文的前 12000 字），以 text 为准，和 text_range（offset 本段起点、returned 本段字数、total 全文字数、complete 是否已读到全文末尾、next_offset 没读完时下一段的 offset）；没读完又需要后文时，用 next_offset 再调一次；hit_categories（类别、得分、阈值、所在级）、group、flow_id、flow_version、各级各审核器的得分和阈值（含送审的图片数 sent_images、没送出的 skipped_images）、处理状态（记录上没有 evidence）",
			Schema: objectSchema([]string{"id"}, map[string]any{
				"id":     map[string]any{"type": "integer"},
				"offset": map[string]any{"type": "integer", "minimum": 0},
				"limit":  map[string]any{"type": "integer", "minimum": 1, "maximum": maxToolTextRunes},
			}), Handler: toolGetRecord},
		{Name: "get_flow", Purpose: "看某一版审核流程（其他分组或旧版本的记录用它）",
			Args:    "flow_id · version（只能是这个用户的记录里出现过的，或这些流程的当前版本）",
			Returns: "当前版本：各级、各审核器（类型、渠道名、模型）、阈值或问题表原文，以及该流程的类别字典；旧版本：只有各级用了哪些审核器（名称、类型）+ historical: true + note，不返回问题表、阈值和字典，以记录里保存的审核结果为准；流程已删除：deleted: true + note",
			Schema: objectSchema([]string{"flow_id", "version"}, map[string]any{
				"flow_id": map[string]any{"type": "integer"},
				"version": map[string]any{"type": "integer", "minimum": 1},
			}), Handler: toolGetFlow},
		{Name: submitAnalysisTool, Purpose: "提交结论并结束这次分析（必须调用一次）",
			Args:    "trend · suggestion · summary · main_problems[] · record_verdicts[]",
			Returns: "—（服务端校验：record_id 只能是工具返回过的，不合法的整项丢弃；evidence 必须是该记录摘录或你读过的原文的子串（NFKC 后比对），不是就只丢 evidence；结论写进记录的 ai_*，不覆盖管理员的处理状态；建议拦截且趋势为持续 / 越来越重、并且至少 1 条 violation 时自动升级；建议解除 / 继续观察且趋势为偶发 / 多半是误报、没有 violation 时自动移出名单 / 把拦截降为观察；这三种自动调整只在管理员于设置里允许时执行，不允许时只记入名单历史、级别不变）",
			Schema: objectSchema([]string{"trend", "suggestion", "summary", "record_verdicts"}, map[string]any{
				"trend":         map[string]any{"type": "string", "enum": trends},
				"suggestion":    map[string]any{"type": "string", "enum": suggestions},
				"summary":       map[string]any{"type": "string", "maxLength": 500},
				"main_problems": map[string]any{"type": "array", "maxItems": 5, "items": map[string]any{"type": "string", "maxLength": 60}},
				"record_verdicts": map[string]any{"type": "array", "items": objectSchema([]string{"record_id", "verdict", "severity", "reason"}, map[string]any{
					"record_id": map[string]any{"type": "integer"},
					"verdict":   map[string]any{"type": "string", "enum": aiVerdicts},
					"severity":  map[string]any{"type": "string", "enum": aiSeverities},
					"category":  map[string]any{"type": "string"},
					"evidence":  map[string]any{"type": "string", "maxLength": 240},
					"reason":    map[string]any{"type": "string", "maxLength": 200},
				})},
			})},
	}
}

func objectSchema(required []string, properties map[string]any) map[string]any {
	s := map[string]any{"type": "object", "additionalProperties": false, "properties": properties}
	if len(required) > 0 {
		s["required"] = required
	}
	return s
}

func llmTools() []LLMTool {
	out := make([]LLMTool, 0, len(analysisTools))
	for _, t := range analysisTools {
		out = append(out, LLMTool{Name: t.Name, Description: t.Purpose + "。返回：" + t.Returns, Schema: t.Schema})
	}
	return out
}

// ToolView is one row of GET /analysis/tools.
type ToolView struct {
	Name    string         `json:"name"`
	Purpose string         `json:"purpose"`
	Args    string         `json:"args"`
	Returns string         `json:"returns"`
	Kind    string         `json:"kind"` // read | end
	Schema  map[string]any `json:"schema"`
}

func analysisToolViews() []ToolView {
	out := make([]ToolView, 0, len(analysisTools))
	for _, t := range analysisTools {
		kind := "read"
		if t.Handler == nil {
			kind = "end"
		}
		out = append(out, ToolView{Name: t.Name, Purpose: t.Purpose, Args: t.Args, Returns: t.Returns, Kind: kind, Schema: t.Schema})
	}
	return out
}

var (
	errUnknownTool = errors.New("unknown tool")
	errBadToolArgs = errors.New("invalid arguments")
	errToolMissing = errors.New("not found")
)

type flowKey struct {
	id      int64
	version int
}

// toolCtx is the server side of one analysis.
type toolCtx struct {
	p         *Plugin
	userID    int64
	group     *int64 // the group of the user's latest record; nil = none
	snap      *snapshot
	records   map[int64]string // ids a tool returned -> the text the model read
	flows     map[flowKey]bool // versions get_flow may read
	views     map[flowKey]*FlowVersionView
	flowsSeen []FlowRef
	codes     map[string]bool
}

const toolWindowDays = 30

func (p *Plugin) newToolCtx(ctx context.Context, uid int64, s *snapshot) *toolCtx {
	tc := &toolCtx{p: p, userID: uid, snap: s, records: map[int64]string{}, flows: map[flowKey]bool{},
		views: map[flowKey]*FlowVersionView{}, codes: map[string]bool{}}
	db, err := p.db(ctx)
	if err != nil {
		return tc
	}
	var g int64
	if err := db.QueryRow(ctx, `SELECT group_id FROM events WHERE user_id = $1 ORDER BY id DESC LIMIT 1`, uid).Scan(&g); err == nil {
		tc.group = &g
	}
	rows, err := db.Query(ctx, `SELECT DISTINCT flow_id, flow_version FROM events WHERE user_id = $1 AND created_at >= $2 AND flow_id > 0`,
		uid, p.now().UTC().AddDate(0, 0, -toolWindowDays))
	if err == nil {
		var fid int64
		var v int
		_, _ = pgx.ForEachRow(rows, []any{&fid, &v}, func() error {
			tc.allowFlow(fid, v)
			return nil
		})
	}
	return tc
}

// notePrompt registers the flow (and dictionary) of the system prompt.
func (tc *toolCtx) notePrompt(v *FlowVersionView, dict CategoryDict) {
	for _, c := range dict.Items {
		tc.codes[c.Code] = true
	}
	if v == nil {
		return
	}
	k := flowKey{v.FlowID, v.Version}
	tc.flows[k], tc.views[k] = true, v
	tc.flowsSeen = append(tc.flowsSeen, FlowRef{FlowID: v.FlowID, Name: v.Name, Version: v.Version, Via: "prompt", Group: tc.group})
}

// allowFlow lets get_flow read a version and its flow's current version.
func (tc *toolCtx) allowFlow(flowID int64, version int) {
	if flowID == 0 {
		return
	}
	tc.flows[flowKey{flowID, version}] = true
	if f := tc.snap.flows[flowID]; f != nil {
		tc.flows[flowKey{flowID, f.Version}] = true
	}
}

func (tc *toolCtx) see(r *toolRow) {
	if _, ok := tc.records[r.ID]; !ok {
		tc.records[r.ID] = r.Excerpt
	}
	tc.allowFlow(r.FlowID, r.FlowVersion)
}

func toolNames() []string {
	names := make([]string, 0, len(analysisTools))
	for _, t := range analysisTools {
		names = append(names, t.Name)
	}
	return names
}

// exec runs one tool call. Unknown tools, bad arguments and handler errors
// go back to the model as {"error": …}; the result is cut to the budget.
func (tc *toolCtx) exec(ctx context.Context, call llmToolCall, budget *int) (toolResult, AnalysisStep) {
	start := time.Now()
	step := AnalysisStep{Tool: call.Name, Args: argsDigest(call.Args)}
	var out any
	err := errUnknownTool
	if i := slices.IndexFunc(analysisTools, func(t ToolSpec) bool { return t.Name == call.Name }); i >= 0 && analysisTools[i].Handler != nil {
		out, err = analysisTools[i].Handler(ctx, tc, argsObject(call.Args))
	}
	if err != nil {
		step.Error = truncateRunes(err.Error(), 200)
		reply := map[string]any{"error": "工具执行失败"}
		switch {
		case errors.Is(err, errUnknownTool):
			reply = map[string]any{"error": "没有这个工具", "available_tools": toolNames()}
		case errors.Is(err, errBadToolArgs):
			reply["error"] = "参数无效"
		case errors.Is(err, errToolMissing):
			reply["error"] = "没有找到"
		}
		out = reply
	}
	if v, ok := out.(*FlowVersionView); ok {
		step.Flow = &FlowRef{FlowID: v.FlowID, Version: v.Version, Historical: v.Historical, Deleted: v.Deleted}
		step.FlowStages = len(v.Stages)
		if v.Dict != nil {
			step.DictItems = len(v.Dict.Items)
		}
	}
	data, _ := json.Marshal(out)
	content, truncated := capResult(data, *budget)
	*budget = max(*budget-len(content), 0)
	step.LatencyMs, step.ResultBytes, step.Truncated = time.Since(start).Milliseconds(), len(content), truncated
	return toolResult{CallID: call.ID, Content: content}, step
}

const minToolResultBytes = 512

// capResult keeps a result within limit (at least 512 bytes).
func capResult(data []byte, limit int) (string, bool) {
	limit = max(limit, minToolResultBytes)
	if len(data) <= limit {
		return string(data), false
	}
	prefix := data[:limit/2]
	for len(prefix) > 0 && !utf8.Valid(prefix) {
		prefix = prefix[:len(prefix)-1]
	}
	out, _ := json.Marshal(map[string]any{"truncated": true, "note": "结果超出大小限制，请用 limit / before_id 缩小范围", "partial": string(prefix)})
	return string(out), true
}

func toolTime(t *time.Time) string {
	if t == nil || t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.DateTime) + " UTC"
}

// ---------------------------------------------------------------- records

// toolRow is one events row as the tools read it.
type toolRow struct {
	ID           int64
	CreatedAt    time.Time
	GroupID      int64
	FlowID       int64
	FlowVersion  int
	Timing       string
	Severity     string
	ReviewStatus string
	AIVerdict    string
	AISeverity   string
	AIReason     string
	Trace        []byte
	Excerpt      string
	TextLen      int
}

const toolRowColumns = `id, created_at, group_id, flow_id, flow_version, timing, severity, review_status,
	ai_verdict, ai_severity, ai_reason, trace, left(coalesce(text, ''), $EXCERPT), coalesce(char_length(text), 0)`

func scanToolRow(r pgx.Row) (toolRow, error) {
	var t toolRow
	err := r.Scan(&t.ID, &t.CreatedAt, &t.GroupID, &t.FlowID, &t.FlowVersion, &t.Timing, &t.Severity, &t.ReviewStatus,
		&t.AIVerdict, &t.AISeverity, &t.AIReason, &t.Trace, &t.Excerpt, &t.TextLen)
	return t, err
}

type toolHit struct {
	Category  string  `json:"category"`
	Score     float64 `json:"score"`
	Threshold float64 `json:"threshold"`
	Stage     int     `json:"stage"`
}

type toolStage struct {
	Stage         int       `json:"stage"`
	Role          string    `json:"role"`
	AuditorID     int64     `json:"auditor_id"`
	Auditor       string    `json:"auditor"`
	Type          string    `json:"type,omitempty"`
	Hit           bool      `json:"hit"`
	TopCategory   string    `json:"top_category,omitempty"`
	TopScore      float64   `json:"top_score"`
	Hits          []toolHit `json:"hits,omitempty"`
	Skipped       bool      `json:"skipped,omitempty"`
	Error         string    `json:"error,omitempty"`
	SentImages    int       `json:"sent_images,omitempty"`
	SkippedImages int       `json:"skipped_images,omitempty"`
}

type toolTextRange struct {
	Offset     int  `json:"offset"`
	Returned   int  `json:"returned"`
	Total      int  `json:"total"`
	Complete   bool `json:"complete"`
	NextOffset int  `json:"next_offset,omitempty"`
}

type toolRecord struct {
	ID            int64          `json:"id"`
	CreatedAt     string         `json:"created_at"`
	Group         int64          `json:"group"`
	FlowID        int64          `json:"flow_id"`
	FlowVersion   int            `json:"flow_version"`
	Timing        string         `json:"timing"`
	HitCategories []toolHit      `json:"hit_categories"`
	Severity      string         `json:"severity"`
	Stages        []toolStage    `json:"stages"`
	ReviewStatus  string         `json:"review_status"`
	AIVerdict     *string        `json:"ai_verdict"`
	AISeverity    string         `json:"ai_severity,omitempty"`
	AIReason      string         `json:"ai_reason,omitempty"`
	Excerpt       string         `json:"excerpt"`
	Text          string         `json:"text,omitempty"`
	TextRange     *toolTextRange `json:"text_range,omitempty"`
}

var reviewStatusNames = map[string]string{"pending": "还没处理", "false_positive": "误报", "confirmed": "确认"}

func (tc *toolCtx) recordOf(r *toolRow, excerptRunes int, detail bool) toolRecord {
	out := toolRecord{ID: r.ID, CreatedAt: toolTime(&r.CreatedAt), Group: r.GroupID, FlowID: r.FlowID, FlowVersion: r.FlowVersion,
		Timing: r.Timing, Severity: r.Severity, ReviewStatus: reviewStatusNames[r.ReviewStatus], Excerpt: truncateRunes(r.Excerpt, excerptRunes),
		HitCategories: []toolHit{}, Stages: []toolStage{}}
	var tr Trace
	if len(r.Trace) > 0 && json.Unmarshal(r.Trace, &tr) == nil {
		auditors := tc.snap.auditors
		for i, st := range tr.Stages {
			role := stageRoleNames[stageRole(i, slices.ContainsFunc(st.Outcomes, func(o Outcome) bool {
				a := auditors[o.AuditorID]
				return a != nil && a.Type == AuditorTypeSafe
			}))]
			for _, o := range st.Outcomes {
				ts := toolStage{Stage: i + 1, Role: role, AuditorID: o.AuditorID, Hit: o.Hit, TopCategory: o.TopCategory, TopScore: o.TopScore,
					Skipped: o.Skipped, Error: o.ErrType, SentImages: o.SentImages, SkippedImages: o.SkippedImages}
				if a := auditors[o.AuditorID]; a != nil {
					ts.Auditor, ts.Type = a.Name, a.Type
				} else {
					ts.Auditor = "审核器已删除"
				}
				for _, h := range o.Hits {
					ts.Hits = append(ts.Hits, toolHit{Category: h.Category, Score: h.Score, Threshold: h.Threshold, Stage: i + 1})
				}
				out.Stages = append(out.Stages, ts)
			}
		}
		for _, h := range tr.HitCategories() {
			out.HitCategories = append(out.HitCategories, toolHit{Category: h.Category, Score: h.Score, Threshold: h.Threshold, Stage: h.Stage})
		}
	}
	if r.AIVerdict != "" {
		v := r.AIVerdict
		out.AIVerdict = &v
		if detail {
			out.AISeverity, out.AIReason = r.AISeverity, r.AIReason
		}
	}
	return out
}

const toolListExcerptRunes = 120

func clampOr(v, def, lo, hi int) int {
	if v == 0 {
		return def
	}
	return min(max(v, lo), hi)
}

// toolListRecords: list_suspicious_records(since_days?, limit?, before_id?).
func toolListRecords(ctx context.Context, tc *toolCtx, args json.RawMessage) (any, error) {
	var a struct {
		SinceDays int   `json:"since_days"`
		Limit     int   `json:"limit"`
		BeforeID  int64 `json:"before_id"`
	}
	if json.Unmarshal(args, &a) != nil {
		return nil, errBadToolArgs
	}
	db, err := tc.p.db(ctx)
	if err != nil {
		return nil, err
	}
	since := tc.p.now().UTC().AddDate(0, 0, -clampOr(a.SinceDays, toolWindowDays, 1, 365))
	before := a.BeforeID
	if before <= 0 {
		before = 1 << 62
	}
	rows, err := db.Query(ctx, `SELECT `+excerptCols(toolListExcerptRunes)+` FROM events
		WHERE user_id = $1 AND result IN ('hit', 'block') AND created_at >= $2 AND id < $3 ORDER BY id DESC LIMIT $4`,
		tc.userID, since, before, clampOr(a.Limit, 20, 1, 50))
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (toolRow, error) { return scanToolRow(r) })
	if err != nil {
		return nil, err
	}
	records := make([]toolRecord, 0, len(list))
	var next int64
	for i := range list {
		tc.see(&list[i])
		records = append(records, tc.recordOf(&list[i], toolListExcerptRunes, false))
		next = list[i].ID
	}
	return map[string]any{"records": records, "next_before_id": next}, nil
}

func excerptCols(n int) string {
	return strings.ReplaceAll(toolRowColumns, "$EXCERPT", strconv.Itoa(n))
}

// get_record reads the saved text in parts (12000 runes by default).
const (
	recordExcerptRunes = 240
	toolTextRunes      = 12000
	maxToolTextRunes   = 20000
)

// toolGetRecord: get_record(id, offset?, limit?); another user's record is
// not found.
func toolGetRecord(ctx context.Context, tc *toolCtx, args json.RawMessage) (any, error) {
	var a struct {
		ID     int64 `json:"id"`
		Offset int   `json:"offset"`
		Limit  int   `json:"limit"`
	}
	if json.Unmarshal(args, &a) != nil || a.ID <= 0 || a.Offset < 0 {
		return nil, errBadToolArgs
	}
	db, err := tc.p.db(ctx)
	if err != nil {
		return nil, err
	}
	row, err := scanToolRow(db.QueryRow(ctx, `SELECT `+excerptCols(recordExcerptRunes)+` FROM events
		WHERE id = $1 AND user_id = $2 AND result IN ('hit', 'block')`, a.ID, tc.userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errToolMissing
	}
	if err != nil {
		return nil, err
	}
	tc.see(&row)
	out := tc.recordOf(&row, recordExcerptRunes, true)
	if row.TextLen > 0 {
		limit := clampOr(a.Limit, toolTextRunes, 1, maxToolTextRunes)
		var part string
		if err := db.QueryRow(ctx, `SELECT substr(text, $2, $3) FROM events WHERE id = $1`, row.ID, a.Offset+1, limit).Scan(&part); err != nil {
			return nil, err
		}
		start := min(a.Offset, row.TextLen)
		n := utf8.RuneCountInString(part)
		end := start + n
		out.Text = part
		out.TextRange = &toolTextRange{Offset: start, Returned: n, Total: row.TextLen, Complete: end >= row.TextLen}
		if end < row.TextLen {
			out.TextRange.NextOffset = end
		}
		tc.records[row.ID] += "\n" + part
	}
	return out, nil
}

// ---------------------------------------------------------------- summary

// toolUserSummary: get_user_summary().
func toolUserSummary(ctx context.Context, tc *toolCtx, _ json.RawMessage) (any, error) {
	db, err := tc.p.db(ctx)
	if err != nil {
		return nil, err
	}
	now := tc.p.now().UTC()
	since := now.AddDate(0, 0, -toolWindowDays)
	today := now.Truncate(24 * time.Hour)
	type counts struct {
		Records    int64 `json:"records"`
		Suspicious int64 `json:"suspicious"`
		High       int64 `json:"high"`
	}
	// Counts come from user_daily (every moderated request, passes included
	// even when record_pass is off); this node's pending counters are written
	// first (other nodes flush within 10 s).
	tc.p.flushStats(ctx)
	var d, m counts
	if err := db.QueryRow(ctx, `SELECT
			coalesce(sum(audited) FILTER (WHERE day >= $3), 0), coalesce(sum(suspicious) FILTER (WHERE day >= $3), 0),
			coalesce(sum(high) FILTER (WHERE day >= $3), 0), coalesce(sum(audited), 0), coalesce(sum(suspicious), 0), coalesce(sum(high), 0)
		FROM user_daily WHERE user_id = $1 AND day >= $2`, tc.userID, since.Truncate(24*time.Hour), today).Scan(&d.Records, &d.Suspicious, &d.High, &m.Records, &m.Suspicious, &m.High); err != nil {
		return nil, err
	}
	byCategory := map[string]int64{}
	rows, err := db.Query(ctx, `SELECT c, count(*) FROM events, unnest(hit_categories) AS c
		WHERE user_id = $1 AND created_at >= $2 AND result IN ('hit','block') GROUP BY c`, tc.userID, since)
	if err != nil {
		return nil, err
	}
	var cat string
	var n int64
	if _, err := pgx.ForEachRow(rows, []any{&cat, &n}, func() error { byCategory[cat] = n; return nil }); err != nil {
		return nil, err
	}
	bySeverity, byReview := map[string]int64{}, map[string]int64{}
	rows, err = db.Query(ctx, `SELECT severity, review_status, count(*) FROM events
		WHERE user_id = $1 AND created_at >= $2 AND result IN ('hit','block') GROUP BY 1, 2`, tc.userID, since)
	if err != nil {
		return nil, err
	}
	var sev, rev string
	if _, err := pgx.ForEachRow(rows, []any{&sev, &rev, &n}, func() error {
		bySeverity[sev] += n
		byReview[reviewStatusNames[rev]] += n
		return nil
	}); err != nil {
		return nil, err
	}
	out := map[string]any{"today": d, "last_30_days": m,
		"suspicious_30_days": map[string]any{"by_category": byCategory, "by_severity": bySeverity, "by_review_status": byReview},
		"group":              tc.group, "flow": nil, "watch": nil, "history": []any{}, "last_analysis": nil}
	if tc.group != nil {
		if f := tc.snap.flowFor(*tc.group); f != nil {
			out["flow"] = map[string]any{"flow_id": f.ID, "name": f.Name, "version": f.Version}
		}
	}
	c := tc.p.cfg.Load()
	var w struct {
		level, source    string
		since            time.Time
		expires          *time.Time
		violations, hits int
	}
	err = db.QueryRow(ctx, `SELECT level, source, since_at, expires_at, violation_count, hit_count FROM watchlist
		WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > $2)`, tc.userID, now).Scan(&w.level, &w.source, &w.since, &w.expires, &w.violations, &w.hits)
	switch {
	case err == nil:
		out["watch"] = map[string]any{"level": w.level, "source": w.source, "since_at": toolTime(&w.since), "expires_at": toolTime(w.expires),
			"violations_since_analysis": w.violations, "hits": w.hits, "analysis_every_violations": c.AnalysisEveryViolations}
	case !errors.Is(err, pgx.ErrNoRows):
		return nil, err
	}
	rows, err = db.Query(ctx, `SELECT action, from_level, to_level, reason, created_at FROM watch_events WHERE user_id = $1 ORDER BY id DESC LIMIT 20`, tc.userID)
	if err != nil {
		return nil, err
	}
	history := []map[string]any{}
	var action, from, to, reason string
	var at time.Time
	if _, err := pgx.ForEachRow(rows, []any{&action, &from, &to, &reason, &at}, func() error {
		history = append(history, map[string]any{"action": action, "from_level": from, "to_level": to, "reason": reason, "at": toolTime(&at)})
		return nil
	}); err != nil {
		return nil, err
	}
	out["history"] = history
	var trend, suggestion, summary string
	err = db.QueryRow(ctx, `SELECT trend, suggestion, summary, created_at FROM user_analyses WHERE user_id = $1 AND status = 'ok' ORDER BY id DESC LIMIT 1`,
		tc.userID).Scan(&trend, &suggestion, &summary, &at)
	switch {
	case err == nil:
		out["last_analysis"] = map[string]any{"trend": trend, "suggestion": suggestion, "summary": summary, "at": toolTime(&at)}
	case !errors.Is(err, pgx.ErrNoRows):
		return nil, err
	}
	rows, err = db.Query(ctx, `SELECT group_id, flow_id, flow_version, count(*),
			count(*) FILTER (WHERE ai_verdict = 'violation'), count(*) FILTER (WHERE ai_verdict = 'false_positive'),
			count(*) FILTER (WHERE ai_verdict = 'unsure'), count(*) FILTER (WHERE ai_verdict = '')
		FROM events WHERE user_id = $1 AND created_at >= $2 AND result IN ('hit','block')
		GROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT 50`, tc.userID, since)
	if err != nil {
		return nil, err
	}
	sources := []map[string]any{}
	var gid, fid int64
	var ver int
	var total, vio, fp, uns, none int64
	if _, err := pgx.ForEachRow(rows, []any{&gid, &fid, &ver, &total, &vio, &fp, &uns, &none}, func() error {
		tc.allowFlow(fid, ver)
		name := ""
		if f := tc.snap.flows[fid]; f != nil {
			name = f.Name
		}
		sources = append(sources, map[string]any{"group": gid, "flow_id": fid, "flow_name": name, "version": ver, "count": total,
			"ai_verdicts": map[string]int64{"violation": vio, "false_positive": fp, "unsure": uns, "none": none}})
		return nil
	}); err != nil {
		return nil, err
	}
	out["sources"] = sources
	return out, nil
}

// ---------------------------------------------------------------- flows

// toolGetFlow: get_flow(flow_id, version), only for versions the analysis
// may read.
func toolGetFlow(ctx context.Context, tc *toolCtx, args json.RawMessage) (any, error) {
	var a struct {
		FlowID  int64 `json:"flow_id"`
		Version int   `json:"version"`
	}
	if json.Unmarshal(args, &a) != nil {
		return nil, errBadToolArgs
	}
	k := flowKey{a.FlowID, a.Version}
	if !tc.flows[k] {
		return nil, errToolMissing
	}
	v := tc.views[k]
	if v == nil {
		var err error
		v, err = tc.p.flowVersionView(ctx, a.FlowID, a.Version, tc.snap)
		if errors.Is(err, errNotFound) {
			return nil, errToolMissing
		}
		if err != nil {
			return nil, err
		}
		tc.views[k] = v
	}
	if v.Historical {
		tc.flows[flowKey{v.FlowID, v.CurrentVersion}] = true
	}
	tc.noteFlow(v)
	out := *v
	out.BoundGroups, out.Spec, out.Note = nil, nil, noteTexts[v.Note]
	out.Stages = make([]StageView, len(v.Stages))
	for i, st := range v.Stages {
		st.Role = stageRoleNames[st.Role]
		out.Stages[i] = st
	}
	return &out, nil
}

func (tc *toolCtx) noteFlow(v *FlowVersionView) {
	for _, r := range tc.flowsSeen {
		if r.FlowID == v.FlowID && r.Version == v.Version {
			return
		}
	}
	tc.flowsSeen = append(tc.flowsSeen, FlowRef{FlowID: v.FlowID, Name: v.Name, Version: v.Version, Via: "get_flow", Historical: v.Historical, Deleted: v.Deleted})
	if v.Dict != nil {
		for _, c := range v.Dict.Items {
			tc.codes[c.Code] = true
		}
	}
}
