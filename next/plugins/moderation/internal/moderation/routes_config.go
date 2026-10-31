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
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// ---------------------------------------------------------------- channels

// ChannelView is a channel as the API returns it: never the key or proxy.
type ChannelView struct {
	ID         int64  `json:"id"`
	Type       string `json:"type"`
	Protocol   string `json:"protocol"`
	Name       string `json:"name"`
	BaseURL    string `json:"base_url"`
	APIKeyTail string `json:"api_key_tail"`
	HasKey     bool   `json:"has_key"`
	HasProxy   bool   `json:"has_proxy"`
	Model      string `json:"model"`
	// BillingModel is the model the calls are priced on ("" = model).
	BillingModel string    `json:"billing_model"`
	TimeoutMs    int       `json:"timeout_ms"`
	Enabled      bool      `json:"enabled"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	// List and detail only.
	PriceState *PriceState    `json:"price_state,omitempty"`
	Cost30d    *CostSummary   `json:"cost_30d,omitempty"`
	Health     *ChannelHealth `json:"health,omitempty"`
	UsedBy     []IDName       `json:"used_by,omitempty"`
	IsAnalysis bool           `json:"is_analysis"`
}

// IDName names an object by id.
type IDName struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

const channelColumns = `id, type, protocol, name, base_url, api_key_tail, api_key_enc IS NOT NULL, proxy_enc IS NOT NULL, model, billing_model, timeout_ms, enabled, created_at, updated_at`

func scanChannel(r pgx.Row) (ChannelView, error) {
	var c ChannelView
	err := r.Scan(&c.ID, &c.Type, &c.Protocol, &c.Name, &c.BaseURL, &c.APIKeyTail, &c.HasKey, &c.HasProxy, &c.Model, &c.BillingModel, &c.TimeoutMs, &c.Enabled, &c.CreatedAt, &c.UpdatedAt)
	c.CreatedAt, c.UpdatedAt = c.CreatedAt.UTC(), c.UpdatedAt.UTC()
	return c, err
}

// channelInput is the POST / PUT body. api_key absent or "" keeps the stored
// key (PUT); type cannot change.
type channelInput struct {
	Type     string  `json:"type"`
	Protocol string  `json:"protocol"`
	Name     string  `json:"name"`
	BaseURL  string  `json:"base_url"`
	APIKey   *string `json:"api_key"`
	Model    string  `json:"model"`
	// BillingModel: the price row the calls are priced on ("" = model).
	BillingModel string `json:"billing_model"`
	TimeoutMs    int    `json:"timeout_ms"`
	Enabled      *bool  `json:"enabled"`
	// Proxy: http(s):// or socks5:// URL; "" removes it, absent keeps it.
	Proxy *string `json:"proxy"`
}

func (in *channelInput) normalize() pluginsdk.FieldErrors {
	var errs pluginsdk.FieldErrors
	in.Name, in.BaseURL, in.Model = strings.TrimSpace(in.Name), strings.TrimSpace(in.BaseURL), strings.TrimSpace(in.Model)
	in.BillingModel = strings.TrimSpace(in.BillingModel)
	if _, ok := defaultChannelTimeoutMs[in.Type]; !ok {
		errs = errs.Add("type", "enum", "type must be openai_moderation, typesafe or llm / type 取值为 openai_moderation、typesafe、llm")
	}
	if in.Type == ChannelLLM {
		if in.Protocol == "" {
			in.Protocol = ProtocolOpenAIChat
		}
		if llmProtocols[in.Protocol] == nil {
			errs = errs.Add("protocol", "enum", "protocol must be openai_chat, openai_responses or anthropic / 协议取值为 openai_chat、openai_responses、anthropic")
		}
	} else {
		in.Protocol = ""
	}
	if in.Name == "" || utf8.RuneCountInString(in.Name) > 64 {
		errs = errs.Add("name", "invalid", "name is required, at most 64 characters / 名称必填，最多 64 字")
	}
	if !baseURLRe.MatchString(in.BaseURL) || len(in.BaseURL) > 500 {
		errs = errs.Add("base_url", "invalid", "base_url must be an http(s) URL / base_url 必须是 http(s) 地址")
	}
	if in.Model == "" {
		in.Model = defaultChannelModel[in.Type]
	}
	if in.Model == "" || utf8.RuneCountInString(in.Model) > 200 {
		errs = errs.Add("model", "invalid", "model is required, at most 200 characters / 模型必填，最多 200 字")
	}
	if in.Proxy != nil {
		if v := strings.TrimSpace(*in.Proxy); v != "" && (!validProxy(v) || len(v) > 500) {
			errs = errs.Add("proxy", "invalid", "proxy must be an http(s):// or socks5:// URL / 代理必须是 http(s):// 或 socks5:// 地址")
		}
	}
	if utf8.RuneCountInString(in.BillingModel) > 200 {
		errs = errs.Add("billing_model", "too_long", "billing_model is at most 200 characters / 计价模型最多 200 字")
	}
	if in.TimeoutMs == 0 {
		in.TimeoutMs = defaultChannelTimeoutMs[in.Type]
	}
	if in.TimeoutMs < 500 || in.TimeoutMs > 60000 {
		errs = errs.Add("timeout_ms", "out_of_range", "timeout_ms must be between 500 and 60000 / timeout_ms 取值 500–60000")
	}
	if in.APIKey != nil && len(*in.APIKey) > 4000 {
		errs = errs.Add("api_key", "too_long", "api_key is too long / api_key 过长")
	}
	return errs
}

func (p *Plugin) listChannels(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	rows, err := db.Query(ctx, `SELECT `+channelColumns+` FROM channels WHERE deleted_at IS NULL ORDER BY id`)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (ChannelView, error) { return scanChannel(r) })
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []ChannelView{}
	}
	d, err := p.channelFigures(ctx, db, req)
	if err != nil {
		return nil, err
	}
	for i := range list {
		p.decorateChannel(ctx, &list[i], d)
	}
	return pluginsdk.DataResponse(list), nil
}

// channelFigures are the per-channel figures of the list and detail.
type channelFigures struct {
	costs30d map[int64]CostSummary
	health   map[int64]*ChannelHealth
	usedBy   map[int64][]IDName
}

func (p *Plugin) channelFigures(ctx context.Context, db *pgxpool.Pool, req *pluginv1.HTTPRequest) (*channelFigures, error) {
	now := p.now().UTC()
	d := &channelFigures{usedBy: map[int64][]IDName{}}
	var err error
	if d.costs30d, err = channelCosts30d(ctx, db, now.Add(-30*24*time.Hour)); err != nil {
		return nil, err
	}
	if d.health, err = channelsHealth(ctx, db, startOfDay(now, requestTZ(req)), now); err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `SELECT channel_id, id, name FROM auditors WHERE deleted_at IS NULL ORDER BY id`)
	if err != nil {
		return nil, err
	}
	var ch int64
	var a IDName
	_, err = pgx.ForEachRow(rows, []any{&ch, &a.ID, &a.Name}, func() error {
		d.usedBy[ch] = append(d.usedBy[ch], a)
		return nil
	})
	return d, err
}

// decorateChannel adds the price state, costs, health and users.
func (p *Plugin) decorateChannel(ctx context.Context, c *ChannelView, d *channelFigures) {
	model := c.BillingModel
	if model == "" {
		model = c.Model
	}
	st := p.priceState(ctx, c.Type, model)
	c.PriceState = &st
	sum, ok := d.costs30d[c.ID]
	if !ok {
		sum = zeroCost()
	}
	c.Cost30d = &sum
	if c.Health = d.health[c.ID]; c.Health == nil {
		c.Health = newChannelHealth()
	}
	if c.UsedBy = d.usedBy[c.ID]; c.UsedBy == nil {
		c.UsedBy = []IDName{}
	}
	c.IsAnalysis = c.ID == p.cfg.Load().AnalysisChannelID
}

func (p *Plugin) getChannel(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	c, err := scanChannel(db.QueryRow(ctx, `SELECT `+channelColumns+` FROM channels WHERE id = $1 AND deleted_at IS NULL`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return notFound("channel"), nil
	}
	if err != nil {
		return nil, err
	}
	d, err := p.channelFigures(ctx, db, req)
	if err != nil {
		return nil, err
	}
	p.decorateChannel(ctx, &c, d)
	return pluginsdk.DataResponse(c), nil
}

func notFound(what string) *pluginv1.HTTPResponse {
	zh := map[string]string{"channel": "渠道", "auditor": "审核器", "flow": "流程", "event": "记录"}[what]
	return pluginsdk.ErrorResponse(http.StatusNotFound, "not_found", what+" not found / "+zh+"不存在")
}

func (p *Plugin) createChannel(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in channelInput
	if bad := decodeBody(req, &in); bad != nil {
		return bad, nil
	}
	if errs := in.normalize(); len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid channel / 渠道参数无效", errs), nil
	}
	enabled := in.Enabled == nil || *in.Enabled
	var out ChannelView
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		now := p.now().UTC()
		var id int64
		if err := tx.QueryRow(ctx, `INSERT INTO channels (type, protocol, name, base_url, model, billing_model, timeout_ms, enabled, created_at, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING id`, in.Type, in.Protocol, in.Name, in.BaseURL, in.Model, in.BillingModel, in.TimeoutMs, enabled, now).Scan(&id); err != nil {
			return err
		}
		if err := p.storeKey(ctx, tx, id, in.APIKey); err != nil {
			return err
		}
		if err := p.storeProxy(ctx, tx, id, in.Proxy); err != nil {
			return err
		}
		var err error
		out, err = scanChannel(tx.QueryRow(ctx, `SELECT `+channelColumns+` FROM channels WHERE id = $1`, id))
		return err
	})
	if err != nil {
		return nil, err
	}
	return p.getChannel(ctx, withParam(req, "id", out.ID))
}

// storeKey seals and stores the key when one is given.
func (p *Plugin) storeKey(ctx context.Context, tx pgx.Tx, id int64, key *string) error {
	if key == nil || strings.TrimSpace(*key) == "" {
		return nil
	}
	k := strings.TrimSpace(*key)
	enc, err := p.host.SealSecret(ctx, secretContext(id, "key"), []byte(k))
	if err != nil {
		return fmt.Errorf("seal channel key: %w", err)
	}
	_, err = tx.Exec(ctx, `UPDATE channels SET api_key_enc = $2, api_key_tail = $3 WHERE id = $1`, id, enc, keyTail(k))
	return err
}

func (p *Plugin) updateChannel(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	var in channelInput
	if bad := decodeBody(req, &in); bad != nil {
		return bad, nil
	}
	var out ChannelView
	var resp *pluginv1.HTTPResponse
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		cur, err := scanChannel(tx.QueryRow(ctx, `SELECT `+channelColumns+` FROM channels WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, id))
		if errors.Is(err, pgx.ErrNoRows) {
			resp = notFound("channel")
			return errRollback
		}
		if err != nil {
			return err
		}
		if in.Type == "" {
			in.Type = cur.Type
		}
		errs := in.normalize()
		if in.Type != cur.Type {
			errs = errs.Add("type", "immutable", "type cannot change / 渠道类型不能修改")
		}
		newKey := in.APIKey != nil && strings.TrimSpace(*in.APIKey) != ""
		if !newKey && cur.HasKey && hostChanged(cur.BaseURL, in.BaseURL) {
			// new-api channel.go: a key must not follow the channel to another host.
			errs = errs.Add("api_key", "required", "changing the base_url host needs the key again / 修改 base_url 的地址需要重新填写 key")
		}
		if !newKey && cur.HasKey && in.Proxy != nil && len(errs) == 0 {
			// Like a new host: the key must not leave through a new proxy.
			changed, err := p.proxyChanged(ctx, tx, id, strings.TrimSpace(*in.Proxy))
			if err != nil {
				return err
			}
			if changed {
				errs = errs.Add("api_key", "required", "changing the proxy needs the key again / 修改代理需要重新填写 key")
			}
		}
		if len(errs) > 0 {
			resp = pluginsdk.FieldErrorResponse("invalid channel / 渠道参数无效", errs)
			return errRollback
		}
		enabled := cur.Enabled
		if in.Enabled != nil {
			enabled = *in.Enabled
		}
		if _, err := tx.Exec(ctx, `UPDATE channels SET protocol=$2, name=$3, base_url=$4, model=$5, billing_model=$6, timeout_ms=$7, enabled=$8, updated_at=$9 WHERE id=$1`,
			id, in.Protocol, in.Name, in.BaseURL, in.Model, in.BillingModel, in.TimeoutMs, enabled, p.now().UTC()); err != nil {
			return err
		}
		if err := p.storeKey(ctx, tx, id, in.APIKey); err != nil {
			return err
		}
		if err := p.storeProxy(ctx, tx, id, in.Proxy); err != nil {
			return err
		}
		out, err = scanChannel(tx.QueryRow(ctx, `SELECT `+channelColumns+` FROM channels WHERE id = $1`, id))
		return err
	})
	if resp != nil {
		return resp, nil
	}
	if err != nil {
		return nil, err
	}
	return p.getChannel(ctx, withParam(req, "id", out.ID))
}

// hostChanged compares scheme and host of two URLs.
func hostChanged(a, b string) bool {
	norm := func(u string) string {
		u = strings.ToLower(strings.TrimSpace(u))
		scheme, rest, _ := strings.Cut(u, "://")
		host, _, _ := strings.Cut(rest, "/")
		return scheme + "://" + host
	}
	return norm(a) != norm(b)
}

func (p *Plugin) deleteChannel(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	var resp *pluginv1.HTTPResponse
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		if id == p.cfg.Load().AnalysisChannelID {
			resp = conflictResponse("analysis_channel", "the channel is the AI analysis channel; choose another one in the settings first / 该渠道是 AI 分析渠道，请先在设置里换掉", nil)
			return errRollback
		}
		rows, err := tx.Query(ctx, `SELECT id, name FROM auditors WHERE channel_id = $1 AND deleted_at IS NULL ORDER BY id`, id)
		if err != nil {
			return err
		}
		used, err := pgx.CollectRows(rows, pgx.RowToStructByPos[IDName])
		if err != nil {
			return err
		}
		if len(used) > 0 {
			resp = conflictResponse("channel_in_use", "the channel is used by auditors / 该渠道仍被审核器使用", map[string]any{"auditors": used})
			return errRollback
		}
		tag, err := tx.Exec(ctx, `UPDATE channels SET deleted_at = $2, api_key_enc = NULL, proxy_enc = NULL WHERE id = $1 AND deleted_at IS NULL`, id, p.now().UTC())
		if err == nil && tag.RowsAffected() == 0 {
			resp = notFound("channel")
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
	return pluginsdk.DataResponse(map[string]any{"id": id, "deleted": true}), nil
}

// ChannelTestResult is POST /channels/:id/test.
type ChannelTestResult struct {
	OK        bool      `json:"ok"`
	Status    int       `json:"status,omitempty"`
	Error     string    `json:"error,omitempty"`
	Message   string    `json:"message,omitempty"` // upstream error text (key removed)
	URL       string    `json:"url"`               // the address called
	Model     string    `json:"model,omitempty"`
	LatencyMs int64     `json:"latency_ms"`
	Cost      *CallCost `json:"cost,omitempty"`
}

func (p *Plugin) testChannel(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	ch, err := p.loadChannel(ctx, id)
	if errors.Is(err, errNotFound) {
		return notFound("channel"), nil
	}
	if err != nil {
		return nil, err
	}
	cctx, cancel := context.WithTimeout(ctx, ch.Timeout)
	defer cancel()
	start := p.now()
	out := ChannelTestResult{URL: joinURL(ch.BaseURL, endpointOf(ch))}
	var usage EngineUsage
	switch ch.Type {
	case ChannelOpenAI:
		_, out.Model, err = callModerations(cctx, ch, "hello", "")
	case ChannelTypeSafe:
		qs, _ := DefaultQuestions(nil)
		qs.Items = qs.Items[:1]
		qs.wired = qs.wire()
		var r systemOneAnswers
		r, err = callSystemOne(cctx, ch, &qs, "hello", nil)
		out.Model = r.Model
		usage = EngineUsage{InputTokens: r.Usage.InputTokens}
	case ChannelLLM:
		var t llmTurn
		t, err = protocolOf(ch).call(cctx, ch, llmRequest{Messages: []any{llmUserMessage("ping")}, MaxTokens: 16})
		out.Model = t.Model
		usage = engineUsage(t.Usage)
	}
	out.LatencyMs = p.now().Sub(start).Milliseconds()
	out.Cost = p.priceNow(ctx, SourceTest, ch, EngineResult{Usage: usage, Calls: 1}, err)
	out.OK = err == nil
	if err != nil {
		out.Error, out.Status = ErrType(err), upstreamStatus(err)
		var up *UpstreamError
		if errors.As(err, &up) {
			out.Message = up.message
		} else {
			out.Message = truncateRunes(err.Error(), 300)
		}
	}
	return pluginsdk.DataResponse(out), nil
}

// endpointOf is the path a channel calls.
func endpointOf(ch *liveChannel) string {
	switch ch.Type {
	case ChannelOpenAI:
		return pathModerations
	case ChannelTypeSafe:
		return pathSystemOne
	}
	return protocolOf(ch).path
}

// loadChannel reads one channel with its key opened (disabled ones too).
func (p *Plugin) loadChannel(ctx context.Context, id int64) (*liveChannel, error) {
	db, err := p.db(ctx)
	if err != nil {
		return nil, err
	}
	var r channelRecord
	err = db.QueryRow(ctx, `SELECT `+channelRecordColumns+` FROM channels WHERE id = $1 AND deleted_at IS NULL`, id).Scan(r.targets()...)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return p.openChannel(ctx, r)
}

// errRollback aborts a configTx whose response is already decided.
var errRollback = errors.New("rollback")

// configTx runs a configuration write, bumps config_version and reloads.
func (p *Plugin) configTx(ctx context.Context, fn func(pgx.Tx) error) error {
	db, err := p.db(ctx)
	if err != nil {
		return err
	}
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		if err := fn(tx); err != nil {
			return err
		}
		return bumpConfig(ctx, tx)
	})
	if errors.Is(err, errRollback) {
		return nil
	}
	if err == nil {
		p.configChanged(ctx)
	}
	return err
}

// ---------------------------------------------------------------- auditors

// AuditorView is an auditor as the API returns it.
type AuditorView struct {
	ID           int64           `json:"id"`
	Name         string          `json:"name"`
	Type         string          `json:"type"`
	ChannelID    int64           `json:"channel_id"`
	Config       json.RawMessage `json:"config"`
	RulesVersion string          `json:"rules_version,omitempty"`
	Usable       bool            `json:"usable"`          // its channel is enabled and has a key
	Today        *AuditorToday   `json:"today,omitempty"` // list only
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

type auditorInput struct {
	Name      string        `json:"name"`
	Type      string        `json:"type"`
	ChannelID int64         `json:"channel_id"`
	Config    AuditorConfig `json:"config"`
}

func (p *Plugin) auditorViews(ctx context.Context, where string, args ...any) ([]AuditorView, error) {
	db, err := p.db(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `SELECT id, name, type, channel_id, config, created_at, updated_at FROM auditors WHERE deleted_at IS NULL `+where+` ORDER BY id`, args...)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (AuditorView, error) {
		var a AuditorView
		err := r.Scan(&a.ID, &a.Name, &a.Type, &a.ChannelID, &a.Config, &a.CreatedAt, &a.UpdatedAt)
		a.CreatedAt, a.UpdatedAt = a.CreatedAt.UTC(), a.UpdatedAt.UTC()
		return a, err
	})
	if err != nil {
		return nil, err
	}
	snap := p.snap.Load()
	for i := range list {
		if la := snap.auditors[list[i].ID]; la != nil {
			list[i].Usable = la.channel != nil && la.channel.Key != ""
			if la.questions != nil {
				list[i].RulesVersion = la.questions.RulesVersion
			}
		}
	}
	if list == nil {
		list = []AuditorView{}
	}
	return list, nil
}

func (p *Plugin) listAuditors(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	list, err := p.auditorViews(ctx, "")
	if err != nil {
		return nil, err
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	now := p.now().UTC()
	today, err := auditorsToday(ctx, db, startOfDay(now, requestTZ(req)), now)
	if err != nil {
		return nil, err
	}
	for i := range list {
		t, ok := today[list[i].ID]
		if !ok {
			t.Cost = zeroCost()
		}
		list[i].Today = &t
	}
	return pluginsdk.DataResponse(list), nil
}

func (p *Plugin) getAuditor(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	list, err := p.auditorViews(ctx, "AND id = $1", id)
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return notFound("auditor"), nil
	}
	return pluginsdk.DataResponse(list[0]), nil
}

// auditorBindingErrors checks an auditor type and the type of its channel
// ("" = the channel does not exist).
func auditorBindingErrors(typ, chType string) pluginsdk.FieldErrors {
	want, ok := channelTypeOf[typ]
	switch {
	case !ok:
		return pluginsdk.FieldErrors{}.Add("type", "enum", "type must be openai_moderation, typesafe or llm_verdict / type 取值为 openai_moderation、typesafe、llm_verdict")
	case chType == "":
		return pluginsdk.FieldErrors{}.Add("channel_id", "not_found", "channel does not exist / 渠道不存在")
	case chType != want:
		return pluginsdk.FieldErrors{}.Add("channel_id", "type_mismatch", fmt.Sprintf("the auditor needs a %s channel / 该审核器需要 %s 类型的渠道", want, want))
	}
	return nil
}

// validateAuditor checks the type against the bound channel and compiles the
// config.
func (p *Plugin) validateAuditor(ctx context.Context, tx pgx.Tx, in *auditorInput) pluginsdk.FieldErrors {
	var errs pluginsdk.FieldErrors
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" || utf8.RuneCountInString(in.Name) > 64 {
		errs = errs.Add("name", "invalid", "name is required, at most 64 characters / 名称必填，最多 64 字")
	}
	var chType string
	err := tx.QueryRow(ctx, `SELECT type FROM channels WHERE id = $1 AND deleted_at IS NULL`, in.ChannelID).Scan(&chType)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return errs.Add("channel_id", "unavailable", err.Error())
	}
	errs = append(errs, auditorBindingErrors(in.Type, chType)...)
	if _, ok := channelTypeOf[in.Type]; !ok {
		return errs
	}
	def := p.cfg.Load().jevDefault
	if _, err := compileAuditor(0, in.Name, in.Type, in.ChannelID, in.Config, nil, &def); err != nil {
		errs = errs.Add("config", "invalid", err.Error())
	}
	return errs
}

func (p *Plugin) createAuditor(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in auditorInput
	if bad := decodeBody(req, &in); bad != nil {
		return bad, nil
	}
	var id int64
	var resp *pluginv1.HTTPResponse
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		if errs := p.validateAuditor(ctx, tx, &in); len(errs) > 0 {
			resp = pluginsdk.FieldErrorResponse("invalid auditor / 审核器参数无效", errs)
			return errRollback
		}
		cfg, _ := json.Marshal(in.Config)
		now := p.now().UTC()
		return tx.QueryRow(ctx, `INSERT INTO auditors (name, type, channel_id, config, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$5) RETURNING id`,
			in.Name, in.Type, in.ChannelID, cfg, now).Scan(&id)
	})
	if resp != nil {
		return resp, nil
	}
	if err != nil {
		return nil, err
	}
	return p.getAuditor(ctx, withParam(req, "id", id))
}

func (p *Plugin) updateAuditor(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	var in auditorInput
	if bad := decodeBody(req, &in); bad != nil {
		return bad, nil
	}
	var resp *pluginv1.HTTPResponse
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		var curType string
		err := tx.QueryRow(ctx, `SELECT type FROM auditors WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, id).Scan(&curType)
		if errors.Is(err, pgx.ErrNoRows) {
			resp = notFound("auditor")
			return errRollback
		}
		if err != nil {
			return err
		}
		if in.Type == "" {
			in.Type = curType
		}
		errs := p.validateAuditor(ctx, tx, &in)
		if in.Type != curType {
			errs = errs.Add("type", "immutable", "type cannot change / 审核器类型不能修改")
		}
		if len(errs) > 0 {
			resp = pluginsdk.FieldErrorResponse("invalid auditor / 审核器参数无效", errs)
			return errRollback
		}
		cfg, _ := json.Marshal(in.Config)
		_, err = tx.Exec(ctx, `UPDATE auditors SET name=$2, channel_id=$3, config=$4, updated_at=$5 WHERE id=$1`, id, in.Name, in.ChannelID, cfg, p.now().UTC())
		return err
	})
	if resp != nil {
		return resp, nil
	}
	if err != nil {
		return nil, err
	}
	return p.getAuditor(ctx, req)
}

func (p *Plugin) deleteAuditor(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := parseID(req, "id")
	if bad != nil {
		return bad, nil
	}
	var resp *pluginv1.HTTPResponse
	err := p.configTx(ctx, func(tx pgx.Tx) error {
		flows, err := flowsUsing(ctx, tx, id)
		if err != nil {
			return err
		}
		if len(flows) > 0 {
			resp = pluginsdk.ErrorResponse(http.StatusConflict, "in_use", fmt.Sprintf("the auditor is used by flows %v / 该审核器仍被流程 %v 使用", flows, flows))
			return errRollback
		}
		tag, err := tx.Exec(ctx, `UPDATE auditors SET deleted_at = $2 WHERE id = $1 AND deleted_at IS NULL`, id, p.now().UTC())
		if err == nil && tag.RowsAffected() == 0 {
			resp = notFound("auditor")
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
	return pluginsdk.DataResponse(map[string]any{"id": id, "deleted": true}), nil
}

// flowsUsing lists live flows whose draft or published spec names the auditor.
func flowsUsing(ctx context.Context, tx pgx.Tx, auditorID int64) ([]int64, error) {
	rows, err := tx.Query(ctx, `SELECT id FROM flows WHERE deleted_at IS NULL AND (
		jsonb_path_exists(draft, '$.stages[*].auditors[*] ? (@ == $a)', jsonb_build_object('a', $1::bigint)) OR
		jsonb_path_exists(coalesce(published, '{}'), '$.stages[*].auditors[*] ? (@ == $a)', jsonb_build_object('a', $1::bigint)))
		ORDER BY id`, auditorID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowTo[int64])
}

// TryResult is POST /auditors/:id/try.
type TryResult struct {
	Outcome
	Error string `json:"error,omitempty"`
}

func (p *Plugin) tryAuditor(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, err := strconv.ParseInt(pluginsdk.Param(req, "id"), 10, 64)
	if err != nil || id < 0 {
		return pluginsdk.FieldErrorResponse("invalid path parameter / 路径参数无效",
			pluginsdk.FieldErrors{}.Add("id", "invalid", "id must be 0 (a draft) or an auditor id / id 为 0（草稿）或审核器 id")), nil
	}
	in, bad := testInput(req, p.cfg.Load())
	if bad != nil {
		return bad, nil
	}
	var draft auditorDraft
	_ = json.Unmarshal(req.GetBody(), &draft) // the body already parsed as test input
	a, resp, err := p.loadAuditor(ctx, id, draft)
	if resp != nil || err != nil {
		return resp, err
	}
	o := p.audit(ctx, a, in, true, SourceTry)
	out := TryResult{Outcome: o}
	if o.Err != nil {
		out.ErrType, out.Status, out.Error = ErrType(o.Err), upstreamStatus(o.Err), truncateRunes(o.Err.Error(), 300)
	}
	return pluginsdk.DataResponse(out), nil
}

// auditorDraft is the unsaved part of an auditor a try runs with: on id 0 the
// whole auditor, otherwise the fields given override the stored ones.
type auditorDraft struct {
	Name      *string        `json:"name"`
	Type      *string        `json:"type"`
	ChannelID *int64         `json:"channel_id"`
	Config    *AuditorConfig `json:"config"`
}

// loadAuditor compiles one auditor straight from the database with a draft
// on top (its channel may be disabled: a try still runs).
func (p *Plugin) loadAuditor(ctx context.Context, id int64, d auditorDraft) (*liveAuditor, *pluginv1.HTTPResponse, error) {
	var name, typ string
	var chID int64
	var cfg AuditorConfig
	if id > 0 {
		db, err := p.db(ctx)
		if err != nil {
			return nil, pluginsdk.Unavailable(err.Error()), nil
		}
		var raw []byte
		err = db.QueryRow(ctx, `SELECT name, type, channel_id, config FROM auditors WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&name, &typ, &chID, &raw)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, notFound("auditor"), nil
		}
		if err != nil {
			return nil, nil, err
		}
		if err := json.Unmarshal(raw, &cfg); err != nil {
			return nil, pluginsdk.ErrorResponse(http.StatusConflict, "invalid_config", "stored auditor config is invalid / 审核器配置无效"), nil
		}
	}
	if d.Name != nil {
		name = *d.Name
	}
	if d.Type != nil {
		typ = *d.Type
	}
	if d.ChannelID != nil {
		chID = *d.ChannelID
	}
	if d.Config != nil {
		cfg = *d.Config
	}
	ch, err := p.loadChannel(ctx, chID)
	chType := ""
	switch {
	case err == nil:
		chType = ch.Type
	case !errors.Is(err, errNotFound):
		return nil, nil, err
	}
	if errs := auditorBindingErrors(typ, chType); len(errs) > 0 {
		return nil, pluginsdk.FieldErrorResponse("invalid auditor / 审核器参数无效", errs), nil
	}
	def := p.cfg.Load().jevDefault
	a, err := compileAuditor(id, name, typ, chID, cfg, ch, &def)
	if err != nil {
		return nil, pluginsdk.FieldErrorResponse("invalid auditor / 审核器参数无效", pluginsdk.FieldErrors{}.Add("config", "invalid", err.Error())), nil
	}
	return a, nil, nil
}

func (p *Plugin) getJevDefaults(context.Context, *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	builtin, _ := DefaultQuestions(nil)
	c := p.cfg.Load()
	return pluginsdk.DataResponse(map[string]any{
		"builtin": builtin, "builtin_version": RulesVersionZH,
		"default": c.jevDefault, "default_version": RulesVersionOf(&c.jevDefault), "custom": c.JevDefaultSet != nil,
		"openai_categories": OpenAICategories, "openai_thresholds": DefaultThresholds,
		"llm_system_prompt": DefaultSystemPrompt, "llm_categories": DefaultCategories(),
	}), nil
}

// withParam returns a copy of req with a path parameter set.
func withParam(req *pluginv1.HTTPRequest, name string, id int64) *pluginv1.HTTPRequest {
	r := &pluginv1.HTTPRequest{Method: req.GetMethod(), Path: req.GetPath(), Caller: req.GetCaller(), PathParams: map[string]string{}}
	for k, v := range req.GetPathParams() {
		r.PathParams[k] = v
	}
	r.PathParams[name] = fmt.Sprint(id)
	return r
}

func isUniqueViolation(err error) bool {
	var pe *pgconn.PgError
	return errors.As(err, &pe) && pe.Code == "23505"
}
