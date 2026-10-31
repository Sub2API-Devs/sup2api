package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// FlowView is a flow as the API returns it.
type FlowView struct {
	ID          int64           `json:"id"`
	Name        string          `json:"name"`
	Enabled     bool            `json:"enabled"`
	Draft       json.RawMessage `json:"draft"`
	Published   json.RawMessage `json:"published"`
	Version     int             `json:"version"`
	PublishedAt *time.Time      `json:"published_at"`
	PublishedBy *int64          `json:"published_by"`
	Groups      []int64         `json:"groups"`
	Dirty       bool            `json:"dirty"` // draft differs from the published spec
	// StageTimeoutSumMs is the automatic total timeout of the draft (detail only).
	StageTimeoutSumMs int `json:"stage_timeout_sum_ms,omitempty"`
	// Stats24h is the last 24 hours (list only).
	Stats24h  *FlowStat `json:"stats_24h,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (p *Plugin) flowViews(ctx context.Context, q interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
}, where string, args ...any) ([]FlowView, error) {
	rows, err := q.Query(ctx, `SELECT f.id, f.name, f.enabled, f.draft, f.published, f.version, f.published_at, f.published_by,
			coalesce((SELECT array_agg(group_id ORDER BY group_id) FROM flow_groups g WHERE g.flow_id = f.id), '{}'),
			f.published IS NULL OR f.draft <> f.published, f.created_at, f.updated_at
		FROM flows f WHERE f.deleted_at IS NULL `+where+` ORDER BY f.id`, args...)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (FlowView, error) {
		var f FlowView
		err := r.Scan(&f.ID, &f.Name, &f.Enabled, &f.Draft, &f.Published, &f.Version, &f.PublishedAt, &f.PublishedBy,
			&f.Groups, &f.Dirty, &f.CreatedAt, &f.UpdatedAt)
		f.CreatedAt, f.UpdatedAt, f.PublishedAt = f.CreatedAt.UTC(), f.UpdatedAt.UTC(), utcPtr(f.PublishedAt)
		return f, err
	})
	if list == nil {
		list = []FlowView{}
	}
	return list, err
}

func (p *Plugin) listFlows(ctx context.Context, _ *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	list, err := p.flowViews(ctx, db, "")
	if err != nil {
		return nil, err
	}
	stats, err := flowStats24h(ctx, db, p.now().UTC())
	if err != nil {
		return nil, err
	}
	for i := range list {
		st := stats[list[i].ID]
		list[i].Stats24h = &st
	}
	return pluginsdk.DataResponse(list), nil
}

func (p *Plugin) getFlow(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	list, err := p.flowViews(ctx, db, "AND f.id = $1", id)
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return notFound("flow"), nil
	}
	if spec, err := ParseSpec(list[0].Draft); err == nil {
		list[0].StageTimeoutSumMs = p.snap.Load().stageTimeoutSumMs(spec)
	}
	return pluginsdk.DataResponse(list[0]), nil
}

type flowInput struct {
	Name  string          `json:"name"`
	Draft json.RawMessage `json:"draft"`
}

// checkDraft parses and validates a draft against the live auditors.
func checkDraft(ctx context.Context, tx pgx.Tx, raw json.RawMessage) (*Spec, error) {
	spec, err := ParseSpec(raw)
	if err != nil {
		return nil, err
	}
	rows, err := tx.Query(ctx, `SELECT id FROM auditors WHERE deleted_at IS NULL`)
	if err != nil {
		return nil, err
	}
	ids, err := pgx.CollectRows(rows, pgx.RowTo[int64])
	if err != nil {
		return nil, err
	}
	exists := map[int64]bool{}
	for _, id := range ids {
		exists[id] = true
	}
	if spec.ModelFilter.Models == nil {
		spec.ModelFilter.Models = []string{}
	}
	return spec, spec.Validate(func(id int64) bool { return exists[id] })
}

func flowName(s string) (string, pluginsdk.FieldErrors) {
	s = strings.TrimSpace(s)
	if s == "" || utf8.RuneCountInString(s) > 64 {
		return s, pluginsdk.FieldErrors{}.Add("name", "invalid", "name is required, at most 64 characters / 名称必填，最多 64 字")
	}
	return s, nil
}

func (p *Plugin) createFlow(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in flowInput
	if bad := decodeBody(req, &in); bad != nil {
		return bad, nil
	}
	name, errs := flowName(in.Name)
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid flow / 流程参数无效", errs), nil
	}
	var id int64
	var resp *pluginv1.HTTPResponse
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		spec, err := checkDraft(ctx, tx, in.Draft)
		if err != nil {
			resp = pluginsdk.FieldErrorResponse("invalid flow / 流程参数无效", pluginsdk.FieldErrors{}.Add("draft", "invalid", err.Error()))
			return errRollback
		}
		raw, _ := json.Marshal(spec)
		now := p.now().UTC()
		return tx.QueryRow(ctx, `INSERT INTO flows (name, draft, created_at, updated_at) VALUES ($1,$2,$3,$3) RETURNING id`, name, raw, now).Scan(&id)
	})
	if resp != nil {
		return resp, nil
	}
	if err != nil {
		return nil, err
	}
	return p.getFlow(ctx, withParam(req, "id", id))
}

// updateFlow saves the name and the draft; the published version stays
// until publish.
func (p *Plugin) updateFlow(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	var in flowInput
	if bad := decodeBody(req, &in); bad != nil {
		return bad, nil
	}
	name, errs := flowName(in.Name)
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid flow / 流程参数无效", errs), nil
	}
	var resp *pluginv1.HTTPResponse
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		spec, err := checkDraft(ctx, tx, in.Draft)
		if err != nil {
			resp = pluginsdk.FieldErrorResponse("invalid flow / 流程参数无效", pluginsdk.FieldErrors{}.Add("draft", "invalid", err.Error()))
			return errRollback
		}
		raw, _ := json.Marshal(spec)
		tag, err := tx.Exec(ctx, `UPDATE flows SET name=$2, draft=$3, updated_at=$4 WHERE id=$1 AND deleted_at IS NULL`, id, name, raw, p.now().UTC())
		if err == nil && tag.RowsAffected() == 0 {
			resp = notFound("flow")
			return errRollback
		}
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

func (p *Plugin) deleteFlow(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	var resp *pluginv1.HTTPResponse
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE flows SET deleted_at = $2 WHERE id = $1 AND deleted_at IS NULL`, id, p.now().UTC())
		if err == nil && tag.RowsAffected() == 0 {
			resp = notFound("flow")
			return errRollback
		}
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `DELETE FROM flow_groups WHERE flow_id = $1`, id)
		return err
	})
	if resp != nil {
		return resp, nil
	}
	if err != nil {
		return nil, err
	}
	return pluginsdk.DataResponse(map[string]any{"id": id, "deleted": true}), nil
}

// setFlowGroups replaces the groups of a flow: {groups:[ids], force?}. A
// group bound to another flow is a 409 group_conflict unless force moves it.
func (p *Plugin) setFlowGroups(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	var in struct {
		Groups []int64 `json:"groups"`
		Force  bool    `json:"force"`
	}
	if err := json.Unmarshal(req.GetBody(), &in); err != nil {
		return pluginsdk.ErrorResponse(http.StatusBadRequest, "invalid_argument", "invalid JSON body / 请求体不是合法 JSON"), nil
	}
	for _, g := range in.Groups {
		if g < 0 {
			return pluginsdk.FieldErrorResponse("invalid groups / 分组无效", pluginsdk.FieldErrors{}.Add("groups", "invalid", "group ids must be >= 0 / 分组 id 必须 >= 0")), nil
		}
	}
	var resp *pluginv1.HTTPResponse
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		var exists bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM flows WHERE id = $1 AND deleted_at IS NULL)`, id).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			resp = notFound("flow")
			return errRollback
		}
		rows, err := tx.Query(ctx, `SELECT g.group_id, g.flow_id FROM flow_groups g WHERE g.group_id = ANY($1) AND g.flow_id <> $2 ORDER BY g.group_id`, in.Groups, id)
		if err != nil {
			return err
		}
		type conflict struct {
			GroupID int64 `json:"group_id"`
			FlowID  int64 `json:"flow_id"`
		}
		conflicts, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (conflict, error) {
			var c conflict
			return c, r.Scan(&c.GroupID, &c.FlowID)
		})
		if err != nil {
			return err
		}
		if len(conflicts) > 0 && !in.Force {
			resp = conflictResponse("group_conflict", "groups are bound to other flows / 分组已绑定其他流程", map[string]any{"conflicts": conflicts})
			return errRollback
		}
		if _, err := tx.Exec(ctx, `DELETE FROM flow_groups WHERE flow_id = $1 OR group_id = ANY($2)`, id, in.Groups); err != nil {
			return err
		}
		for _, g := range in.Groups {
			if _, err := tx.Exec(ctx, `INSERT INTO flow_groups (group_id, flow_id) VALUES ($1, $2) ON CONFLICT (group_id) DO UPDATE SET flow_id = EXCLUDED.flow_id`, g, id); err != nil {
				return err
			}
		}
		return nil
	})
	if resp != nil {
		return resp, nil
	}
	if err != nil {
		return nil, err
	}
	return p.getFlow(ctx, req)
}

// publishFlow publishes the draft: {expected_version}. total_timeout_ms 0
// stays 0 (automatic: worked out from the channel timeouts on every load).
func (p *Plugin) publishFlow(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	var in struct {
		ExpectedVersion *int `json:"expected_version"`
	}
	if err := json.Unmarshal(req.GetBody(), &in); err != nil || in.ExpectedVersion == nil {
		return pluginsdk.FieldErrorResponse("invalid publish / 发布参数无效",
			pluginsdk.FieldErrors{}.Add("expected_version", "required", "expected_version is required / 请带上当前版本号")), nil
	}
	var resp *pluginv1.HTTPResponse
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		var version int
		var draft []byte
		err := tx.QueryRow(ctx, `SELECT version, draft FROM flows WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, id).Scan(&version, &draft)
		if errors.Is(err, pgx.ErrNoRows) {
			resp = notFound("flow")
			return errRollback
		}
		if err != nil {
			return err
		}
		if version != *in.ExpectedVersion {
			resp = pluginsdk.ErrorResponse(http.StatusConflict, "version_conflict",
				fmt.Sprintf("the flow is at version %d / 流程已被他人发布到版本 %d，请刷新", version, version))
			return errRollback
		}
		spec, err := checkDraft(ctx, tx, draft)
		if err != nil {
			resp = pluginsdk.FieldErrorResponse("invalid flow / 流程参数无效", pluginsdk.FieldErrors{}.Add("draft", "invalid", err.Error()))
			return errRollback
		}
		raw, _ := json.Marshal(spec)
		now := p.now().UTC()
		by := callerID(req)
		if _, err := tx.Exec(ctx, `UPDATE flows SET draft=$2, published=$2, version=$3, published_at=$4, published_by=$5, updated_at=$4 WHERE id=$1`,
			id, raw, version+1, now, by); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `INSERT INTO flow_versions (flow_id, version, spec, published_at, published_by) VALUES ($1,$2,$3,$4,$5)`, id, version+1, raw, now, by)
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

func (p *Plugin) setFlowEnabled(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	var in struct {
		Enabled *bool `json:"enabled"`
	}
	if err := json.Unmarshal(req.GetBody(), &in); err != nil || in.Enabled == nil {
		return pluginsdk.FieldErrorResponse("invalid body / 参数无效", pluginsdk.FieldErrors{}.Add("enabled", "required", "enabled is required / 请指定 enabled")), nil
	}
	var resp *pluginv1.HTTPResponse
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE flows SET enabled=$2, updated_at=$3 WHERE id=$1 AND deleted_at IS NULL`, id, *in.Enabled, p.now().UTC())
		if err == nil && tag.RowsAffected() == 0 {
			resp = notFound("flow")
			return errRollback
		}
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
