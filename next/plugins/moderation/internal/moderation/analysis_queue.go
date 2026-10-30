package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// The analysis queue lives on the watch rows (CONTRACTS §72.13.4):
// analysis_requested_at marks a queued analysis, analysis_claim_until and
// analysis_token the node running it. The node that queues one dispatches
// at once; the analysis job (every minute, one node) picks up the rest,
// e.g. claims a node left behind when it stopped.

// JobAnalysis is the job id declared in manifest.json.
const JobAnalysis = "analysis"

// analysisJob is one claimed analysis: the entry as the run found it.
type analysisJob struct {
	UserID  int64
	Token   int64
	Source  string
	Level   string
	SinceAt time.Time
	Timeout time.Duration
}

// analysisReady reports whether analyses can run: moderation on and the
// analysis channel usable.
func (p *Plugin) analysisReady() bool {
	return p.cfg.Load().enabled && p.analysisChannelUsable()
}

// analysisChannelUsable: analysis_channel_id names an enabled llm channel
// with a key that opens.
func (p *Plugin) analysisChannelUsable() bool {
	c := p.cfg.Load()
	if c.AnalysisChannelID == 0 {
		return false
	}
	ch := p.snap.Load().channels[c.AnalysisChannelID]
	return ch != nil && ch.Type == ChannelLLM
}

// kickAnalyses dispatches queued analyses in the background.
func (p *Plugin) kickAnalyses() {
	if p.host == nil || p.bg.Err() != nil {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(p.bg, 30*time.Second)
		defer cancel()
		if _, err := p.dispatchAnalyses(ctx); err != nil && p.bg.Err() == nil {
			p.log.Warn("moderation: analysis dispatch failed", "error", err.Error())
		}
	}()
}

// dispatchAnalyses claims queued analyses while this node has free slots
// (analysis_concurrency) and starts them. It returns how many it started.
func (p *Plugin) dispatchAnalyses(ctx context.Context) (int, error) {
	if !p.analysisReady() {
		return 0, nil
	}
	if !p.dispatching.CompareAndSwap(false, true) {
		return 0, nil
	}
	defer p.dispatching.Store(false)
	db, err := p.db(ctx)
	if err != nil {
		return 0, err
	}
	started := 0
	for {
		free := p.cfg.Load().AnalysisConcurrency - int(p.analysesRunning.Load())
		if free <= 0 {
			return started, nil
		}
		now := p.now().UTC()
		rows, err := db.Query(ctx, `SELECT user_id FROM watchlist
			WHERE analysis_requested_at IS NOT NULL AND (analysis_claim_until IS NULL OR analysis_claim_until < $1)
			ORDER BY analysis_requested_at, user_id LIMIT $2`, now, free)
		if err != nil {
			return started, err
		}
		users, err := pgx.CollectRows(rows, pgx.RowTo[int64])
		if err != nil || len(users) == 0 {
			return started, err
		}
		claimed := 0
		for _, uid := range users {
			job, ok, err := p.claimAnalysis(ctx, uid)
			if err != nil {
				return started, err
			}
			if !ok {
				continue
			}
			claimed++
			started++
			p.analysesRunning.Add(1)
			p.wg.Add(1)
			go p.runAnalysis(job)
		}
		if claimed == 0 {
			return started, nil
		}
	}
}

// claimAnalysis takes the claim of a queued analysis under the user's lock.
// An expired entry is removed instead (its analysis is dropped).
func (p *Plugin) claimAnalysis(ctx context.Context, uid int64) (analysisJob, bool, error) {
	db, err := p.db(ctx)
	if err != nil {
		return analysisJob{}, false, err
	}
	c := p.cfg.Load()
	now := p.now().UTC()
	var job analysisJob
	ok, removed := false, false
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		ok, removed = false, false
		if err := lockBlockSubject(ctx, tx, uid); err != nil {
			return err
		}
		w, found, err := loadWatch(ctx, tx, uid)
		if err != nil || !found || w.AnalysisRequestedAt == nil || (w.claimUntil != nil && now.Before(*w.claimUntil)) {
			return err
		}
		if w.ExpiresAt != nil && !now.Before(*w.ExpiresAt) {
			removed = true
			return removeWatch(ctx, tx, w, "expire", "expired", nil)
		}
		job = analysisJob{UserID: uid, Token: newEpoch(), Source: w.AnalysisSource, Level: w.Level, SinceAt: w.SinceAt, Timeout: c.analysisTimeout}
		_, err = tx.Exec(ctx, `UPDATE watchlist SET analysis_claim_until = $2, analysis_token = $3 WHERE user_id = $1`,
			uid, now.Add(2*c.analysisTimeout), job.Token)
		ok = err == nil
		return err
	})
	if removed {
		p.watchChanged(ctx)
	}
	return job, ok && err == nil, err
}

// runAnalysis runs one claimed analysis and stores its result. At shutdown
// the claim is only released, so another node runs it.
func (p *Plugin) runAnalysis(job analysisJob) {
	defer p.wg.Done()
	defer p.analysesRunning.Add(-1)
	start := p.now()
	a := p.analyzeSafely(p.bg, job)
	a.DurationMs = p.now().Sub(start).Milliseconds()
	ctx, cancel := context.WithTimeout(context.WithoutCancel(p.bg), 15*time.Second)
	defer cancel()
	if p.bg.Err() != nil {
		p.releaseAnalysis(ctx, job)
		return
	}
	if a.Status == AnalysisStatusOK && !p.cfg.Load().enabled {
		a.Status, a.Error, a.RecordVerdicts, a.VerdictCounts = AnalysisStatusFailed, analysisErrDisabled, nil, VerdictCounts{}
	}
	if err := p.applyAnalysis(ctx, job, a); err != nil {
		p.log.Warn("moderation: analysis result write failed", "user_id", job.UserID, "error", err.Error())
		return
	}
	p.kickAnalyses()
}

func (p *Plugin) analyzeSafely(ctx context.Context, job analysisJob) (a *Analysis) {
	defer func() {
		if r := recover(); r != nil {
			p.log.Error("moderation: analysis panicked", "user_id", job.UserID, "panic", r)
			a = &Analysis{Source: job.Source, Status: AnalysisStatusFailed, Error: ErrTypePanic}
		}
	}()
	return p.analyzeUser(ctx, job)
}

// releaseAnalysis gives the claim back and keeps the analysis queued.
func (p *Plugin) releaseAnalysis(ctx context.Context, job analysisJob) {
	db, err := p.db(ctx)
	if err != nil {
		return
	}
	_, _ = db.Exec(ctx, `UPDATE watchlist SET analysis_claim_until = NULL, analysis_token = 0 WHERE user_id = $1 AND analysis_token = $2`,
		job.UserID, job.Token)
}

// Watch history actions written by analyses.
const (
	ActionAutoUpgrade      = "auto_upgrade"
	ActionUpgradeSkipped   = "upgrade_skipped"
	ActionAutoDowngrade    = "auto_downgrade"
	ActionDowngradeSkipped = "downgrade_skipped"
	ActionAutoRemove       = "auto_remove"
	ActionAutoNotAllowed   = "auto_not_allowed"
)

// escalationOf decides what a successful analysis does to the entry (new-api
// escalate.go; its block level is our enforce). Upgrade: block + persistent
// or escalating + at least one violation at observe. Remove: release + a
// mild trend + no violation. Downgrade: observe + a mild trend + no
// violation at enforce. A refused release or downgrade is downgrade_skipped.
func escalationOf(level, trend, suggestion string, violations int) string {
	if level != LevelObserve && level != LevelEnforce {
		return ""
	}
	serious := trend == TrendPersistent || trend == TrendEscalating
	mild := trend == TrendOccasional || trend == TrendLikelyFalsePositive
	switch suggestion {
	case SuggestBlock:
		if level != LevelObserve || !serious {
			return ""
		}
		if violations == 0 {
			return ActionUpgradeSkipped
		}
		return ActionAutoUpgrade
	case SuggestRelease:
		if mild && violations == 0 {
			return ActionAutoRemove
		}
		return ActionDowngradeSkipped
	case SuggestObserve:
		if level != LevelEnforce {
			return ""
		}
		if mild && violations == 0 {
			return ActionAutoDowngrade
		}
		return ActionDowngradeSkipped
	}
	return ""
}

// decideEscalation applies the permission switches: a change that is not
// allowed becomes auto_not_allowed naming the denied action.
func decideEscalation(c *config, level, trend, suggestion string, violations int) (action, denied string) {
	action = escalationOf(level, trend, suggestion, violations)
	allowed := true
	switch action {
	case ActionAutoUpgrade:
		allowed = c.AnalysisAllowUpgrade
	case ActionAutoDowngrade:
		allowed = c.AnalysisAllowDowngrade
	case ActionAutoRemove:
		allowed = c.AnalysisAllowRemove
	}
	if allowed {
		return action, ""
	}
	return ActionAutoNotAllowed, action
}

// applyAnalysis finishes one analysis in one transaction: store it, keep the
// latest analysis_keep_per_user, write the records' ai_* columns, release
// the claim and the queue, record the latest conclusion and apply the AI
// conclusion — unless the entry changed while it ran (stale): then only the
// record verdicts are written.
func (p *Plugin) applyAnalysis(ctx context.Context, job analysisJob, a *Analysis) error {
	db, err := p.db(ctx)
	if err != nil {
		return err
	}
	c := p.cfg.Load()
	now := p.now().UTC()
	changed := false
	var action, from, to string
	var analysisID int64
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		changed, action = false, ""
		if err := lockBlockSubject(ctx, tx, job.UserID); err != nil {
			return err
		}
		w, found, err := loadWatch(ctx, tx, job.UserID)
		if err != nil {
			return err
		}
		ok := a.Status == AnalysisStatusOK
		owned := found && w.analysisToken == job.Token
		stale := ok && (!owned || w.Level != job.Level || !w.SinceAt.Equal(job.SinceAt) || w.ExpiresAt != nil && !now.Before(*w.ExpiresAt))
		if stale {
			a.Error = analysisErrStale
		}
		id, err := insertAnalysis(ctx, tx, job.UserID, a, now)
		if err != nil {
			return err
		}
		analysisID = id
		if _, err := tx.Exec(ctx, `DELETE FROM user_analyses WHERE user_id = $1 AND id IN (
				SELECT id FROM user_analyses WHERE user_id = $1 ORDER BY id DESC OFFSET $2)`, job.UserID, c.AnalysisKeepPerUser); err != nil {
			return err
		}
		if ok {
			for _, v := range a.RecordVerdicts {
				if _, err := tx.Exec(ctx, `UPDATE events SET ai_verdict=$3, ai_severity=$4, ai_category=$5, ai_evidence=$6, ai_reason=$7, ai_analysis_id=$8
					WHERE id = $1 AND user_id = $2 AND result IN ('hit', 'block')`,
					v.RecordID, job.UserID, v.Verdict, v.Severity, v.Category, v.Evidence, v.Reason, id); err != nil {
					return err
				}
			}
		}
		if !owned {
			return nil
		}
		latest := `latest_analysis_id = $2, latest_analysis_status = $3`
		args := []any{job.UserID, id, a.Status}
		if ok && !stale {
			latest += `, latest_trend = $4, latest_suggestion = $5, analyzed_at = $6`
			args = append(args, a.Trend, a.Suggestion, now)
		}
		if _, err := tx.Exec(ctx, `UPDATE watchlist SET analysis_requested_at = NULL, analysis_source = '', analysis_claim_until = NULL,
			analysis_token = 0, `+latest+` WHERE user_id = $1`, args...); err != nil {
			return err
		}
		if !ok || stale {
			return nil
		}
		var denied string
		action, denied = decideEscalation(c, w.Level, a.Trend, a.Suggestion, a.VerdictCounts.Violation)
		reason := "trend:" + a.Trend
		from, to = w.Level, w.Level
		switch action {
		case "":
			return nil
		case ActionAutoUpgrade, ActionAutoDowngrade:
			to = LevelEnforce
			var expires *time.Time
			if action == ActionAutoDowngrade {
				to = LevelObserve
				t := now.Add(c.watchFor)
				expires = &t
			}
			tag, err := tx.Exec(ctx, `UPDATE watchlist SET level = $3, source = 'analysis', since_at = $4, expires_at = $5,
				hit_count = 0, violation_count = 0, violation_epoch = $6, updated_at = $4 WHERE user_id = $1 AND level = $2`,
				job.UserID, w.Level, to, now, expires, newEpoch())
			if err != nil || tag.RowsAffected() != 1 {
				return err
			}
			changed = true
		case ActionAutoRemove:
			to = ""
			if _, err := tx.Exec(ctx, `DELETE FROM watchlist WHERE user_id = $1`, job.UserID); err != nil {
				return err
			}
			changed = true
		case ActionAutoNotAllowed:
			reason = denied + ":" + a.Trend
		}
		if _, err := tx.Exec(ctx, `INSERT INTO watch_events (user_id, action, from_level, to_level, reason, analysis_id) VALUES ($1,$2,$3,$4,$5,$6)`,
			job.UserID, action, w.Level, to, reason, id); err != nil {
			return err
		}
		if changed {
			return bumpWatch(ctx, tx)
		}
		return nil
	})
	if err == nil && changed {
		p.watchChanged(ctx)
		if watchNoticeOf(action) {
			p.notifyWatchChange(job.UserID, action, from, to, a.Trend, a.Suggestion, analysisID)
		}
	}
	return err
}

func insertAnalysis(ctx context.Context, tx pgx.Tx, uid int64, a *Analysis, now time.Time) (int64, error) {
	js := func(v any, empty string) []byte {
		b, err := json.Marshal(v)
		if err != nil || string(b) == "null" {
			return []byte(empty)
		}
		return b
	}
	var verdicts []byte = []byte("[]")
	if a.Status == AnalysisStatusOK {
		verdicts = js(a.RecordVerdicts, "[]")
	}
	var id int64
	err := tx.QueryRow(ctx, `INSERT INTO user_analyses (user_id, source, status, error, trend, suggestion, summary, main_problems,
			record_verdicts, verdict_counts, flows_seen, model, steps, tokens_in, tokens_out, cost, unpriced_calls, trace, duration_ms, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::numeric,$17,$18,$19,$20) RETURNING id`,
		uid, a.Source, a.Status, a.Error, a.Trend, a.Suggestion, a.Summary, js(a.MainProblems, "[]"),
		verdicts, js(a.VerdictCounts, "{}"), js(a.FlowsSeen, "[]"), truncateRunes(a.Model, 200), a.Steps, a.TokensIn, a.TokensOut,
		a.Cost(), a.UnpricedCalls, js(a.Trace, "[]"), a.DurationMs, now).Scan(&id)
	return id, err
}

// queueAnalysisLocked queues an analysis of a locked, active entry and
// restarts its counting window. false when one is already queued.
func queueAnalysisLocked(ctx context.Context, tx pgx.Tx, uid int64, source string, now time.Time) (bool, error) {
	tag, err := tx.Exec(ctx, `UPDATE watchlist SET analysis_requested_at = $2, analysis_source = $3, violation_count = 0, violation_epoch = $4
		WHERE user_id = $1 AND analysis_requested_at IS NULL`, uid, now, source, newEpoch())
	return tag.RowsAffected() == 1, err
}

// ---------------------------------------------------------------- routes

func (p *Plugin) getWatch(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid, bad := parseID(req, "user_id")
	if bad != nil {
		return bad, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	w, err := scanWatch(db.QueryRow(ctx, `SELECT `+watchColumns+` FROM watchlist WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > $2)`, uid, p.now().UTC()))
	if errors.Is(err, pgx.ErrNoRows) {
		return pluginsdk.ErrorResponse(http.StatusNotFound, "not_found", "user is not on the watch list / 该用户不在观察名单中"), nil
	}
	if err != nil {
		return nil, err
	}
	w.fillRunning(p.now())
	return pluginsdk.DataResponse(w), nil
}

// analyzeWatch queues a manual analysis: 202 {queued}. A queued but not yet
// running analysis is left as it is.
func (p *Plugin) analyzeWatch(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid, bad := parseID(req, "user_id")
	if bad != nil {
		return bad, nil
	}
	c := p.cfg.Load()
	if !c.enabled {
		return pluginsdk.ErrorResponse(http.StatusBadRequest, "moderation_off", "moderation is off / 审核模式为关闭，不能分析"), nil
	}
	if !p.analysisChannelUsable() {
		return pluginsdk.ErrorResponse(http.StatusBadRequest, "no_analysis_channel",
			"no usable AI analysis channel is configured / 没有设置可用的 AI 分析渠道（需要启用的大模型渠道）"), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	now := p.now().UTC()
	var resp *pluginv1.HTTPResponse
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		resp = nil
		if err := lockBlockSubject(ctx, tx, uid); err != nil {
			return err
		}
		w, found, err := loadWatch(ctx, tx, uid)
		if err != nil {
			return err
		}
		if !found || w.ExpiresAt != nil && !now.Before(*w.ExpiresAt) {
			resp = pluginsdk.ErrorResponse(http.StatusNotFound, "not_found", "user is not on the watch list / 该用户不在观察名单中")
			return nil
		}
		if w.claimUntil != nil && now.Before(*w.claimUntil) {
			resp = pluginsdk.ErrorResponse(http.StatusConflict, "analysis_pending", "an analysis of this user is running / 该用户正在分析中")
			return nil
		}
		_, err = queueAnalysisLocked(ctx, tx, uid, AnalysisSourceManual, now)
		return err
	})
	if err != nil {
		return nil, err
	}
	if resp != nil {
		return resp, nil
	}
	p.kickAnalyses()
	return pluginsdk.JSONResponse(http.StatusAccepted, map[string]any{"data": map[string]any{"user_id": uid, "queued": true}}), nil
}

// AnalysisView is one user_analyses row; Trace and RecordVerdicts only in
// GET /analyses/:id.
type AnalysisView struct {
	ID             int64           `json:"id"`
	UserID         int64           `json:"user_id"`
	Source         string          `json:"source"`
	Status         string          `json:"status"`
	Error          string          `json:"error"`
	Trend          string          `json:"trend"`
	Suggestion     string          `json:"suggestion"`
	Summary        string          `json:"summary"`
	MainProblems   json.RawMessage `json:"main_problems"`
	VerdictCounts  json.RawMessage `json:"verdict_counts"`
	FlowsSeen      json.RawMessage `json:"flows_seen"`
	Model          string          `json:"model"`
	Steps          int             `json:"steps"`
	TokensIn       int64           `json:"tokens_in"`
	TokensOut      int64           `json:"tokens_out"`
	Cost           *string         `json:"cost"`
	UnpricedCalls  int             `json:"unpriced_calls"`
	DurationMs     int64           `json:"duration_ms"`
	CreatedAt      time.Time       `json:"created_at"`
	RecordVerdicts json.RawMessage `json:"record_verdicts,omitempty"`
	Trace          json.RawMessage `json:"trace,omitempty"`
}

const analysisColumns = `id, user_id, source, status, error, trend, suggestion, summary, main_problems, verdict_counts, flows_seen,
	model, steps, tokens_in, tokens_out, cost::text, unpriced_calls, duration_ms, created_at`

func (v *AnalysisView) targets() []any {
	return []any{&v.ID, &v.UserID, &v.Source, &v.Status, &v.Error, &v.Trend, &v.Suggestion, &v.Summary, &v.MainProblems, &v.VerdictCounts,
		&v.FlowsSeen, &v.Model, &v.Steps, &v.TokensIn, &v.TokensOut, &v.Cost, &v.UnpricedCalls, &v.DurationMs, &v.CreatedAt}
}

func (v *AnalysisView) normalize() {
	v.CreatedAt = v.CreatedAt.UTC()
	if v.Cost != nil {
		if u, ok := parseCost(*v.Cost); ok {
			s := formatCost(u)
			v.Cost = &s
		}
	}
}

func (p *Plugin) listAnalyses(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid, bad := parseID(req, "user_id")
	if bad != nil {
		return bad, nil
	}
	page, size, errs := pagination(req)
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效", errs), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	var total int64
	if err := db.QueryRow(ctx, `SELECT count(*) FROM user_analyses WHERE user_id = $1`, uid).Scan(&total); err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `SELECT `+analysisColumns+` FROM user_analyses WHERE user_id = $1 ORDER BY id DESC LIMIT $2 OFFSET $3`,
		uid, size, (page-1)*size)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (AnalysisView, error) {
		var v AnalysisView
		err := r.Scan(v.targets()...)
		v.normalize()
		return v, err
	})
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []AnalysisView{}
	}
	return pluginsdk.ListResponse(list, pluginsdk.Page{Page: page, PageSize: size, Total: total}), nil
}

func (p *Plugin) getAnalysis(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	var v AnalysisView
	err = db.QueryRow(ctx, `SELECT `+analysisColumns+`, record_verdicts, trace FROM user_analyses WHERE id = $1`, id).
		Scan(append(v.targets(), &v.RecordVerdicts, &v.Trace)...)
	if errors.Is(err, pgx.ErrNoRows) {
		return pluginsdk.ErrorResponse(http.StatusNotFound, "not_found", "analysis not found / 分析记录不存在"), nil
	}
	if err != nil {
		return nil, err
	}
	v.normalize()
	return pluginsdk.DataResponse(v), nil
}

// PromptPreview is GET /analysis/prompt.
type PromptPreview struct {
	GroupID *int64           `json:"group_id"`
	Flow    *FlowVersionView `json:"flow"`
	Dict    []CategoryDef    `json:"dict"`
	Prompt  string           `json:"prompt"`
	Bytes   int              `json:"bytes"`
}

// getAnalysisPrompt previews the system prompt by group (what its users
// get) or by flow (its current version).
func (p *Plugin) getAnalysisPrompt(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	c := p.cfg.Load()
	s := p.snap.Load()
	if v := pluginsdk.Query(req, "flow_id"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id <= 0 {
			return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效", pluginsdk.FieldErrors{}.Add("flow_id", "invalid", "flow_id must be a positive integer / flow_id 必须是正整数")), nil
		}
		view, err := p.flowVersionView(ctx, id, 0, s)
		if errors.Is(err, errNotFound) || err == nil && view.Deleted {
			return notFound("flow"), nil
		}
		if err != nil {
			return nil, err
		}
		prompt := buildAnalysisPrompt(c.AnalysisGuidelines, nil, view, *view.Dict)
		return pluginsdk.DataResponse(PromptPreview{Flow: view, Dict: view.Dict.Items, Prompt: prompt, Bytes: len(prompt)}), nil
	}
	var g int64
	if v := pluginsdk.Query(req, "group_id"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id < 0 {
			return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效", pluginsdk.FieldErrors{}.Add("group_id", "invalid", "group_id must be a non-negative integer / group_id 必须是非负整数")), nil
		}
		g = id
	}
	prompt, view, dict := analysisPrompt(c.AnalysisGuidelines, s, &g)
	return pluginsdk.DataResponse(PromptPreview{GroupID: &g, Flow: view, Dict: dict.Items, Prompt: prompt, Bytes: len(prompt)}), nil
}

func (p *Plugin) getAnalysisTools(context.Context, *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	return pluginsdk.DataResponse(analysisToolViews()), nil
}

// runAnalysisJob is the analysis job: dispatch what is queued.
func (p *Plugin) runAnalysisJob(ctx context.Context) (*pluginv1.RunJobResponse, error) {
	n, err := p.dispatchAnalyses(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "analysis dispatch: %v", err)
	}
	return &pluginv1.RunJobResponse{Message: "started " + strconv.Itoa(n) + " analyses"}, nil
}

// analysisStats is the runtime view of the analysis queue.
type analysisStats struct {
	ChannelConfigured bool  `json:"channel_configured"`
	Pending           int64 `json:"pending"`
	Running           int64 `json:"running"`
}

func (p *Plugin) analysisRuntime(ctx context.Context) analysisStats {
	st := analysisStats{ChannelConfigured: p.analysisChannelUsable()}
	db, err := p.db(ctx)
	if err != nil {
		return st
	}
	_ = db.QueryRow(ctx, `SELECT count(*) FILTER (WHERE analysis_claim_until IS NULL OR analysis_claim_until < $1),
			count(*) FILTER (WHERE analysis_claim_until >= $1)
		FROM watchlist WHERE analysis_requested_at IS NOT NULL`, p.now().UTC()).Scan(&st.Pending, &st.Running)
	return st
}
