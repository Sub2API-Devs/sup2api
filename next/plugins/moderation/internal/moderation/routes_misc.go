package moderation

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// JobCleanup is the job id declared in manifest.json.
const JobCleanup = "cleanup"

// BackfillLegacySQL fills result and retention of 0.1 records; the same
// statement as migrations/0003_flows_watchlist.sql.
const BackfillLegacySQL = `UPDATE events SET
    result = CASE
        WHEN verdict = 'block' AND action = 'deny' THEN 'block'
        WHEN verdict IN ('block', 'flag') THEN 'hit'
        WHEN verdict = 'error' THEN 'error'
        ELSE 'pass' END,
    timing = CASE WHEN mode = 'enforce' THEN 'pre' ELSE 'post' END,
    hit_categories = categories,
    keep_until = coalesce(keep_until, created_at + CASE WHEN verdict IN ('block', 'flag') THEN interval '180 days' ELSE interval '30 days' END)
WHERE result = ''`

type jsonNumber = json.Number

func jsonRaw(b []byte) json.RawMessage { return json.RawMessage(b) }

// testBody is the {text, images?} of a test or a try; images are data URLs
// or URLs.
type testBody struct {
	Text   string   `json:"text"`
	Images []string `json:"images"`
}

func invalidJSON() *pluginv1.HTTPResponse {
	return pluginsdk.ErrorResponse(http.StatusBadRequest, "invalid_argument", "invalid JSON body / 请求体不是合法 JSON")
}

// testInput reads a testBody into an Input, normalized like a request.
func testInput(req *pluginv1.HTTPRequest, c *config) (*Input, *pluginv1.HTTPResponse) {
	var in testBody
	if err := json.Unmarshal(req.GetBody(), &in); err != nil {
		return nil, invalidJSON()
	}
	return in.input(c)
}

func (in testBody) input(c *config) (*Input, *pluginv1.HTTPResponse) {
	var b inputBuilder
	b.addText(in.Text)
	content := []any{map[string]any{"type": "text", "text": in.Text}}
	for _, u := range in.Images {
		b.addImage(imageFromURL(strings.TrimSpace(u)))
		content = append(content, map[string]any{"type": "image_url", "image_url": map[string]string{"url": u}})
	}
	msgs, _ := json.Marshal([]any{map[string]any{"role": "user", "content": content}})
	input := b.build(FormatMessages, msgs, c.InputMaxChars)
	if input.Empty() {
		return nil, pluginsdk.FieldErrorResponse("invalid test input / 测试输入无效",
			pluginsdk.FieldErrors{}.Add("text", "required", "text or images is required / 请输入要审核的文本或图片"))
	}
	return input, nil
}

// TestResult is the POST /test response data.
type TestResult struct {
	FlowID      int64         `json:"flow_id"`
	FlowVersion int           `json:"flow_version"`
	Result      string        `json:"result"`
	Severity    string        `json:"severity,omitempty"`
	Categories  []HitCategory `json:"categories"`
	Trace       Trace         `json:"trace"`
	Cost        *CallCost     `json:"cost,omitempty"` // all calls of the run
	// Simulation only: the timing it ran as and whether a request would
	// have been refused.
	Timing  string `json:"timing,omitempty"`
	Refused bool   `json:"refused,omitempty"`
}

// testModeration runs a published flow on {text, images?, flow_id?}
// (default: the group 0 flow). Nothing is cached, recorded or counted.
func (p *Plugin) testModeration(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	c := p.cfg.Load()
	input, bad := testInput(req, c)
	if bad != nil {
		return bad, nil
	}
	var sel struct {
		FlowID int64 `json:"flow_id"`
	}
	_ = json.Unmarshal(req.GetBody(), &sel)
	snap := p.snap.Load()
	flow := snap.byGroup[0]
	if sel.FlowID > 0 {
		flow = snap.flows[sel.FlowID]
	}
	if flow == nil {
		return pluginsdk.ErrorResponse(http.StatusBadRequest, "not_configured",
			"no published and enabled flow to test (bind one to the default group, or pass flow_id) / 没有可测试的已发布流程（请绑定默认分组或指定 flow_id）"), nil
	}
	m := &moderation{cfg: c, flow: flow, snap: snap, in: input, timing: TimingPre, source: SourceTest}
	return pluginsdk.DataResponse(p.testResult(ctx, m)), nil
}

// testResult runs m and reports the trace and the summed cost.
func (p *Plugin) testResult(ctx context.Context, m *moderation) TestResult {
	flow := m.flow
	tr := p.run(ctx, m)
	var rec eventRec
	rec.fillFromTrace(tr, false)
	out := TestResult{FlowID: flow.ID, FlowVersion: flow.Version, Result: rec.Result, Severity: rec.Severity, Trace: tr, Categories: tr.HitCategories()}
	if out.Categories == nil {
		out.Categories = []HitCategory{}
	}
	for i := range out.Trace.Stages {
		for j := range out.Trace.Stages[i].Outcomes {
			o := &out.Trace.Stages[i].Outcomes[j]
			if o.Err != nil && o.ErrType == "" {
				o.ErrType = ErrType(o.Err)
			}
			out.Cost = sumCost(out.Cost, o.Cost)
		}
	}
	return out
}

// sumCost adds c to total (either may be nil).
func sumCost(total, c *CallCost) *CallCost {
	if c == nil {
		return total
	}
	if total == nil {
		t := CallCost{Mode: c.Mode}
		total = &t
	}
	total.TokensIn += c.TokensIn
	total.TokensOut += c.TokensOut
	switch {
	case c.Mode == PricePriced:
		total.units += c.units
		total.Cost = formatCost(total.units)
		if total.Mode == PriceFree {
			total.Mode = PricePriced
		}
	case c.Mode == PriceUnpriced:
		total.Mode, total.Reason = PriceUnpriced, c.Reason
	}
	return total
}

// ---------------------------------------------------------------- import

// importDoc is what POST /import takes (CONTRACTS §72.12): channels without
// keys, auditors pointing at them by channel_ref (index), the Jev default set.
type importDoc struct {
	Channels []struct {
		Type      string `json:"type"`
		Protocol  string `json:"protocol"`
		Name      string `json:"name"`
		BaseURL   string `json:"base_url"`
		Model     string `json:"model"`
		TimeoutMs int    `json:"timeout_ms"`
		// Optional (§72.13.7): sealed like a key typed in the console.
		APIKey       *string `json:"api_key"`
		BillingModel string  `json:"billing_model"`
	} `json:"channels"`
	Auditors []struct {
		Name         string             `json:"name"`
		Type         string             `json:"type"`
		ChannelRef   int                `json:"channel_ref"`
		Thresholds   map[string]float64 `json:"thresholds"`
		Questions    *JevQuestions      `json:"questions"`
		ReviewImages *bool              `json:"review_images"`
	} `json:"auditors"`
	JevDefaultSet *JevQuestions `json:"jev_default_set"`
}

// importConfig: {data, preview}. Imported channels are disabled and have no
// key; the administrator fills the key and enables them. The Jev default
// set is only returned (it is a setting the administrator saves).
func (p *Plugin) importConfig(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in struct {
		Data    importDoc `json:"data"`
		Preview bool      `json:"preview"`
	}
	if err := json.Unmarshal(req.GetBody(), &in); err != nil {
		return pluginsdk.ErrorResponse(http.StatusBadRequest, "invalid_argument", "invalid JSON body / 请求体不是合法 JSON"), nil
	}
	var errs pluginsdk.FieldErrors
	chans := make([]channelInput, len(in.Data.Channels))
	for i, ch := range in.Data.Channels {
		typ := ch.Type
		if typ == "openai" {
			typ = ChannelOpenAI // new-api name
		}
		chans[i] = channelInput{Type: typ, Protocol: ch.Protocol, Name: ch.Name, BaseURL: ch.BaseURL, Model: ch.Model, TimeoutMs: ch.TimeoutMs,
			APIKey: ch.APIKey, BillingModel: ch.BillingModel}
		for _, fe := range chans[i].normalize() {
			errs = errs.Add(fmt.Sprintf("channels[%d].%s", i, fe.GetField()), fe.GetCode(), fe.GetMessage())
		}
	}
	auds := make([]auditorInput, len(in.Data.Auditors))
	def := p.cfg.Load().jevDefault
	for i, a := range in.Data.Auditors {
		typ := a.Type
		if typ == "openai" {
			typ = AuditorOpenAI
		}
		auds[i] = auditorInput{Name: strings.TrimSpace(a.Name), Type: typ,
			Config: AuditorConfig{Thresholds: a.Thresholds, Questions: a.Questions, ReviewImages: a.ReviewImages}}
		if a.ChannelRef < 0 || a.ChannelRef >= len(chans) || channelTypeOf[typ] != chans[a.ChannelRef].Type {
			errs = errs.Add(fmt.Sprintf("auditors[%d].channel_ref", i), "invalid", "channel_ref must name a channel of the same type / channel_ref 必须指向同类型的渠道")
			continue
		}
		if _, err := compileAuditor(0, auds[i].Name, typ, 0, auds[i].Config, nil, &def); err != nil {
			errs = errs.Add(fmt.Sprintf("auditors[%d].config", i), "invalid", err.Error())
		}
	}
	if in.Data.JevDefaultSet != nil {
		if err := in.Data.JevDefaultSet.Validate(); err != nil {
			errs = errs.Add("jev_default_set", "invalid", err.Error())
		}
	}
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid import / 导入内容无效", errs), nil
	}
	keys := 0
	for _, ch := range chans {
		if ch.APIKey != nil && strings.TrimSpace(*ch.APIKey) != "" {
			keys++
		}
	}
	out := map[string]any{"channels": len(chans), "auditors": len(auds), "keys": keys, "jev_default_set": in.Data.JevDefaultSet, "preview": in.Preview}
	if in.Preview {
		return pluginsdk.DataResponse(out), nil
	}
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		now := p.now().UTC()
		ids := make([]int64, len(chans))
		for i, ch := range chans {
			if err := tx.QueryRow(ctx, `INSERT INTO channels (type, protocol, name, base_url, model, billing_model, timeout_ms, enabled, created_at, updated_at)
				VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8,$8) RETURNING id`, ch.Type, ch.Protocol, ch.Name, ch.BaseURL, ch.Model, ch.BillingModel, ch.TimeoutMs, now).Scan(&ids[i]); err != nil {
				return err
			}
			if err := p.storeKey(ctx, tx, ids[i], ch.APIKey); err != nil {
				return err
			}
		}
		aids := make([]int64, len(auds))
		for i, a := range auds {
			cfg, _ := json.Marshal(a.Config)
			if err := tx.QueryRow(ctx, `INSERT INTO auditors (name, type, channel_id, config, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$5) RETURNING id`,
				a.Name, a.Type, ids[in.Data.Auditors[i].ChannelRef], cfg, now).Scan(&aids[i]); err != nil {
				return err
			}
		}
		out["channel_ids"], out["auditor_ids"] = ids, aids
		return nil
	})
	if err != nil {
		return nil, err
	}
	return pluginsdk.DataResponse(out), nil
}

// ---------------------------------------------------------------- jobs

// RunJob implements pluginsdk.JobRunner. cleanup deletes records past
// keep_until, expired watch entries and expired blocks; an expired ban counts
// as an unblock at its expiry, so violations before it are not counted again.
func (p *Plugin) RunJob(ctx context.Context, in *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error) {
	switch in.GetJobId() {
	case JobCleanup:
	case JobAnalysis:
		return p.runAnalysisJob(ctx)
	case JobAlerts:
		return p.runAlertsJob(ctx)
	default:
		return nil, status.Errorf(codes.NotFound, "unknown job %q", in.GetJobId())
	}
	db, err := p.db(ctx)
	if err != nil {
		return nil, status.Error(codes.Unavailable, err.Error())
	}
	now := p.now().UTC()
	// Rows 0.1 nodes wrote during a rolling upgrade get their result and
	// retention like the migration gave the older ones.
	if _, err := db.Exec(ctx, BackfillLegacySQL); err != nil {
		return nil, status.Errorf(codes.Internal, "cleanup backfill: %v", err)
	}
	tag, err := db.Exec(ctx, `DELETE FROM events WHERE keep_until < $1`, now)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "cleanup events: %v", err)
	}
	events := tag.RowsAffected()
	if _, err := db.Exec(ctx, `DELETE FROM costs WHERE hour < $1`, now.Add(-400*24*time.Hour)); err != nil {
		return nil, status.Errorf(codes.Internal, "cleanup costs: %v", err)
	}
	if err := p.cleanupStats(ctx, db, now); err != nil {
		return nil, status.Errorf(codes.Internal, "cleanup stats: %v", err)
	}
	// analysis_keep_per_user may have been lowered since a user's last analysis.
	if _, err := db.Exec(ctx, `DELETE FROM user_analyses WHERE id IN (SELECT id FROM (
			SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY id DESC) AS n FROM user_analyses) t WHERE n > $1)`,
		p.cfg.Load().AnalysisKeepPerUser); err != nil {
		return nil, status.Errorf(codes.Internal, "cleanup analyses: %v", err)
	}
	watch, err := p.expireWatch(ctx, now)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "cleanup watch list: %v", err)
	}
	var blocks int64
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, `SELECT user_id FROM blocks WHERE expires_at <= $1
			UNION SELECT user_id FROM unblocks WHERE at < $2 ORDER BY user_id`, now, now.Add(-366*24*time.Hour))
		if err != nil {
			return err
		}
		users, err := pgx.CollectRows(rows, pgx.RowTo[int64])
		if err != nil {
			return err
		}
		for _, uid := range users {
			if err := lockBlockSubject(ctx, tx, uid); err != nil {
				return err
			}
		}
		tag, err := tx.Exec(ctx, `WITH expired AS (
				DELETE FROM blocks WHERE user_id = ANY($2) AND expires_at IS NOT NULL AND expires_at <= $1 RETURNING user_id, expires_at)
			INSERT INTO unblocks (user_id, at) SELECT user_id, expires_at FROM expired
			ON CONFLICT (user_id) DO UPDATE SET at = GREATEST(unblocks.at, EXCLUDED.at)`, now, users)
		if err != nil {
			return err
		}
		blocks = tag.RowsAffected()
		_, err = tx.Exec(ctx, `DELETE FROM unblocks WHERE user_id = ANY($2) AND at < $1`, now.Add(-366*24*time.Hour), users)
		return err
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "cleanup blocks: %v", err)
	}
	if watch > 0 {
		p.watchChanged(ctx)
	}
	return &pluginv1.RunJobResponse{Message: fmt.Sprintf("deleted %d events, %d expired watch entries and %d expired blocks", events, watch, blocks)}, nil
}

// expireWatch removes the expired watch entries, writing their history.
func (p *Plugin) expireWatch(ctx context.Context, now time.Time) (int, error) {
	db, err := p.db(ctx)
	if err != nil {
		return 0, err
	}
	rows, err := db.Query(ctx, `SELECT user_id FROM watchlist WHERE expires_at <= $1 ORDER BY user_id`, now)
	if err != nil {
		return 0, err
	}
	users, err := pgx.CollectRows(rows, pgx.RowTo[int64])
	if err != nil {
		return 0, err
	}
	n := 0
	for _, uid := range users {
		err := pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
			if err := lockBlockSubject(ctx, tx, uid); err != nil {
				return err
			}
			w, found, err := loadWatch(ctx, tx, uid)
			if err != nil || !found || w.ExpiresAt == nil || now.Before(*w.ExpiresAt) {
				return err
			}
			n++
			return expireEntry(ctx, tx, w)
		})
		if err != nil {
			return n, err
		}
	}
	return n, nil
}
