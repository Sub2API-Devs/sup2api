package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Flow version history, rollback and simulation (CONTRACTS §72.13.5).

// flowVersionView returns one version of a flow: deleted when the flow is
// gone, current for version <= 0 or the published version, historical for
// an older one (structure and spec only). errNotFound for an unknown
// version or an unpublished flow.
func (p *Plugin) flowVersionView(ctx context.Context, flowID int64, version int, s *snapshot) (*FlowVersionView, error) {
	db, err := p.db(ctx)
	if err != nil {
		return nil, err
	}
	var name string
	var cur int
	var published []byte
	var publishedAt *time.Time
	var deleted bool
	err = db.QueryRow(ctx, `SELECT name, version, published, published_at, deleted_at IS NOT NULL FROM flows WHERE id = $1`, flowID).
		Scan(&name, &cur, &published, &publishedAt, &deleted)
	if errors.Is(err, pgx.ErrNoRows) || err == nil && deleted {
		return &FlowVersionView{FlowID: flowID, Version: version, Deleted: true, Note: NoteFlowDeleted, Stages: []StageView{}}, nil
	}
	if err != nil {
		return nil, err
	}
	if cur == 0 {
		return nil, errNotFound
	}
	if version <= 0 || version == cur {
		f := s.flows[flowID]
		if f == nil || f.Version != cur {
			spec, err := ParseSpec(published)
			if err != nil {
				return nil, err
			}
			f = &liveFlow{ID: flowID, Name: name, Version: cur, Spec: spec}
		}
		v := currentFlowView(f, s.auditors, s.groupsOf(flowID))
		v.PublishedAt = rfc3339(publishedAt)
		return v, nil
	}
	var raw []byte
	var at time.Time
	err = db.QueryRow(ctx, `SELECT spec, published_at FROM flow_versions WHERE flow_id = $1 AND version = $2`, flowID, version).Scan(&raw, &at)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	spec, err := ParseSpec(raw)
	if err != nil {
		return nil, err
	}
	return &FlowVersionView{FlowID: flowID, Name: name, Version: version, CurrentVersion: cur, Historical: true, Note: NoteHistorical,
		PublishedAt: rfc3339(&at), Spec: spec, Stages: stageStructure(spec, s.auditors)}, nil
}

func rfc3339(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.UTC().Format(time.RFC3339)
}

// FlowVersionItem is one row of GET /flows/:id/versions.
type FlowVersionItem struct {
	Version     int       `json:"version"`
	PublishedAt time.Time `json:"published_at"`
	PublishedBy *int64    `json:"published_by"`
	Current     bool      `json:"current"`
}

func (p *Plugin) listFlowVersions(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	var cur int
	err = db.QueryRow(ctx, `SELECT version FROM flows WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&cur)
	if errors.Is(err, pgx.ErrNoRows) {
		return notFound("flow"), nil
	}
	if err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `SELECT version, published_at, published_by FROM flow_versions WHERE flow_id = $1 ORDER BY version DESC`, id)
	if err != nil {
		return nil, err
	}
	items, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (FlowVersionItem, error) {
		var it FlowVersionItem
		err := r.Scan(&it.Version, &it.PublishedAt, &it.PublishedBy)
		it.PublishedAt, it.Current = it.PublishedAt.UTC(), it.Version == cur
		return it, err
	})
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []FlowVersionItem{}
	}
	return pluginsdk.DataResponse(map[string]any{"current_version": cur, "items": items}), nil
}

func (p *Plugin) getFlowVersion(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	version, err := strconv.Atoi(pluginsdk.Param(req, "version"))
	if err != nil || version < 0 {
		return pluginsdk.FieldErrorResponse("invalid path parameter / 路径参数无效",
			pluginsdk.FieldErrors{}.Add("version", "invalid", "version must be a non-negative integer / version 必须是非负整数")), nil
	}
	v, err := p.flowVersionView(ctx, id, version, p.snap.Load())
	if errors.Is(err, errNotFound) {
		return pluginsdk.ErrorResponse(http.StatusNotFound, "not_found", "flow version not found / 流程版本不存在"), nil
	}
	if err != nil {
		return nil, err
	}
	return pluginsdk.DataResponse(v), nil
}

// rollbackFlow publishes an old version's spec as the next version:
// {version, expected_version}. An old version naming deleted auditors is a
// 400 missing_auditors.
func (p *Plugin) rollbackFlow(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	var in struct {
		Version         int  `json:"version"`
		ExpectedVersion *int `json:"expected_version"`
	}
	if err := json.Unmarshal(req.GetBody(), &in); err != nil || in.Version <= 0 || in.ExpectedVersion == nil {
		return pluginsdk.FieldErrorResponse("invalid rollback / 回滚参数无效",
			pluginsdk.FieldErrors{}.Add("version", "required", "version and expected_version are required / 请指定要回滚到的版本和当前版本号")), nil
	}
	var resp *pluginv1.HTTPResponse
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		var cur int
		err := tx.QueryRow(ctx, `SELECT version FROM flows WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, id).Scan(&cur)
		if errors.Is(err, pgx.ErrNoRows) {
			resp = notFound("flow")
			return errRollback
		}
		if err != nil {
			return err
		}
		if cur != *in.ExpectedVersion {
			resp = pluginsdk.ErrorResponse(http.StatusConflict, "version_conflict",
				fmt.Sprintf("the flow is at version %d / 流程已被他人发布到版本 %d，请刷新", cur, cur))
			return errRollback
		}
		var raw []byte
		err = tx.QueryRow(ctx, `SELECT spec FROM flow_versions WHERE flow_id = $1 AND version = $2`, id, in.Version).Scan(&raw)
		if errors.Is(err, pgx.ErrNoRows) {
			resp = pluginsdk.ErrorResponse(http.StatusNotFound, "not_found", "flow version not found / 流程版本不存在")
			return errRollback
		}
		if err != nil {
			return err
		}
		spec, err := checkDraft(ctx, tx, raw)
		var missing *MissingAuditorsError
		if errors.As(err, &missing) {
			resp = pluginsdk.JSONResponse(http.StatusBadRequest, map[string]any{"error": map[string]any{
				"code": "missing_auditors", "message": "the version uses deleted auditors / 该版本使用了已删除的审核器",
				"details": map[string]any{"auditor_ids": missing.IDs}}})
			return errRollback
		}
		if err != nil {
			resp = pluginsdk.FieldErrorResponse("invalid flow / 流程参数无效", pluginsdk.FieldErrors{}.Add("version", "invalid", err.Error()))
			return errRollback
		}
		raw, _ = json.Marshal(spec)
		now, by := p.now().UTC(), callerID(req)
		if _, err := tx.Exec(ctx, `UPDATE flows SET draft=$2, published=$2, version=$3, published_at=$4, published_by=$5, updated_at=$4 WHERE id=$1`,
			id, raw, cur+1, now, by); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `INSERT INTO flow_versions (flow_id, version, spec, published_at, published_by) VALUES ($1,$2,$3,$4,$5)`, id, cur+1, raw, now, by)
		return err
	})
	if resp != nil {
		return resp, nil
	}
	if err != nil {
		return nil, err
	}
	return p.getFlow(ctx, req)
}

// simulateFlow runs a spec of the flow (draft, published or an old version)
// on {text, images} or the saved text of a record, with the current
// auditors. Nothing is recorded, counted or cached.
func (p *Plugin) simulateFlow(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	var sel struct {
		EventID int64  `json:"event_id"`
		Source  string `json:"source"`
		Version int    `json:"version"`
		// UserState: none | observe (moderated after the request, post) or
		// enforce (before it, pre: a hit refuses).
		UserState string `json:"user_state"`
	}
	if err := json.Unmarshal(req.GetBody(), &sel); err != nil {
		return pluginsdk.ErrorResponse(http.StatusBadRequest, "invalid_argument", "invalid JSON body / 请求体不是合法 JSON"), nil
	}
	timing := TimingPost
	switch sel.UserState {
	case "", "none", LevelObserve:
	case LevelEnforce:
		timing = TimingPre
	default:
		return pluginsdk.FieldErrorResponse("invalid simulate / 模拟参数无效",
			pluginsdk.FieldErrors{}.Add("user_state", "enum", "user_state must be none, observe or enforce / user_state 取值为 none、observe、enforce")), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	c := p.cfg.Load()
	var input *Input
	if sel.EventID > 0 {
		var text *string
		err := db.QueryRow(ctx, `SELECT text FROM events WHERE id = $1`, sel.EventID).Scan(&text)
		if errors.Is(err, pgx.ErrNoRows) {
			return notFound("event"), nil
		}
		if err != nil {
			return nil, err
		}
		if text == nil || *text == "" {
			return pluginsdk.ErrorResponse(http.StatusBadRequest, "no_text", "the record has no saved text / 该记录没有保存原文"), nil
		}
		var b inputBuilder
		b.addText(*text)
		input = b.build(FormatMessages, nil, c.InputMaxChars)
	} else {
		var bad *pluginv1.HTTPResponse
		if input, bad = testInput(req, c); bad != nil {
			return bad, nil
		}
	}
	var name string
	var cur int
	var draft, published []byte
	err = db.QueryRow(ctx, `SELECT name, version, draft, published FROM flows WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&name, &cur, &draft, &published)
	if errors.Is(err, pgx.ErrNoRows) {
		return notFound("flow"), nil
	}
	if err != nil {
		return nil, err
	}
	raw, version := draft, 0
	switch sel.Source {
	case "", "draft":
	case "published":
		if published == nil {
			return pluginsdk.ErrorResponse(http.StatusBadRequest, "not_published", "the flow is not published / 流程还没有发布"), nil
		}
		raw, version = published, cur
	case "version":
		err := db.QueryRow(ctx, `SELECT spec FROM flow_versions WHERE flow_id = $1 AND version = $2`, id, sel.Version).Scan(&raw)
		if errors.Is(err, pgx.ErrNoRows) {
			return pluginsdk.ErrorResponse(http.StatusNotFound, "not_found", "flow version not found / 流程版本不存在"), nil
		}
		if err != nil {
			return nil, err
		}
		version = sel.Version
	default:
		return pluginsdk.FieldErrorResponse("invalid simulate / 模拟参数无效",
			pluginsdk.FieldErrors{}.Add("source", "enum", "source must be draft, published or version / source 取值为 draft、published、version")), nil
	}
	spec, err := ParseSpec(raw)
	if err != nil || len(spec.Stages) == 0 {
		return pluginsdk.ErrorResponse(http.StatusBadRequest, "invalid_flow", "the flow spec has no stages / 流程没有审核级"), nil
	}
	if spec.TotalTimeoutMs <= 0 {
		timeouts, err := auditorTimeouts(ctx, db)
		if err != nil {
			return nil, err
		}
		spec.TotalTimeoutMs = spec.DefaultTotalTimeoutMs(func(a int64) int { return timeouts[a] })
	}
	f := &liveFlow{ID: id, Name: name, Version: version, Spec: spec, timeout: time.Duration(spec.TotalTimeoutMs) * time.Millisecond}
	m := &moderation{cfg: c, flow: f, snap: p.snap.Load(), in: input, timing: timing, source: SourceSimulate}
	out := p.testResult(ctx, m)
	out.Timing, out.Refused = timing, timing == TimingPre && out.Result == ResultHit
	return pluginsdk.DataResponse(out), nil
}
