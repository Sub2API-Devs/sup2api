package dynweight

import (
	"cmp"
	"context"
	"errors"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"

	"github.com/Sub2API-Devs/sup2api/next/plugins/dynweight/internal/rules"
)

func (p *Plugin) routes() {
	p.Handle("GET", "/config", p.getConfig)
	p.Handle("PUT", "/config", p.putConfig)
	p.Handle("GET", "/defaults", p.getDefaults)
	p.Handle("GET", "/channels", p.listChannels)
	p.Handle("GET", "/status", p.listStatus)
	p.Handle("GET", "/events", p.listEvents)
	p.Handle("POST", "/reset", p.reset)
	p.Handle("GET", "/weights", p.getWeights)
}

type configBody struct {
	Config   rules.Config `json:"config"`
	Version  int64        `json:"version"`
	Warnings []string     `json:"warnings,omitempty"`
}

// getConfig reads the stored configuration, not this node's copy, so a save
// right after another node's does not meet a stale version.
func (p *Plugin) getConfig(ctx context.Context, _ *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	s, err := p.store(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	c, version, err := s.loadConfig(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	return pluginsdk.DataResponse(configBody{Config: c, Version: version}), nil
}

func (p *Plugin) getDefaults(context.Context, *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	return pluginsdk.DataResponse(rules.DefaultLayer()), nil
}

// putConfig replaces the configuration; version must be the one read, so
// two administrators do not overwrite each other.
func (p *Plugin) putConfig(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var body configBody
	if err := pluginsdk.DecodeJSON(req, &body); err != nil {
		return pluginsdk.BadRequest("", "invalid_json", err.Error()), nil
	}
	warnings, err := body.Config.Normalize()
	if err != nil {
		return pluginsdk.BadRequest("config", "invalid", err.Error()), nil
	}
	if resp := p.checkChannel(ctx, body.Config.Notify); resp != nil {
		return resp, nil
	}
	s, err := p.store(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	version, err := s.saveConfig(ctx, body.Config, body.Version, req.GetCaller().GetUserId())
	if errors.Is(err, errVersionConflict) {
		return pluginsdk.ErrorResponse(http.StatusConflict, "conflict", "the configuration was changed meanwhile, reload it / 配置已被修改，请刷新后重试"), nil
	}
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	p.publish(ctx, TopicConfig, p.reloadConfig)
	return pluginsdk.DataResponse(configBody{Config: body.Config, Version: version, Warnings: warnings}), nil
}

// checkChannel refuses notifications on a channel no enabled plugin declares.
func (p *Plugin) checkChannel(ctx context.Context, n rules.Notify) *pluginv1.HTTPResponse {
	if !n.Enabled {
		return nil
	}
	channels, err := pluginsdk.ListNotificationChannels(ctx, p.host)
	if err != nil {
		return pluginsdk.Unavailable(err.Error())
	}
	if !slices.ContainsFunc(channels, func(c *pluginv1.NotificationChannel) bool { return c.GetId() == n.Channel }) {
		return pluginsdk.BadRequest("notify.channel", "unknown", "no enabled plugin delivers this channel / 没有已启用的插件提供该通知渠道")
	}
	return nil
}

func (p *Plugin) listChannels(ctx context.Context, _ *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	channels, err := pluginsdk.ListNotificationChannels(ctx, p.host)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	type channel struct {
		ID          string            `json:"id"`
		Plugin      string            `json:"plugin"`
		Label       map[string]string `json:"label"`
		Description map[string]string `json:"description,omitempty"`
		Recipient   string            `json:"recipient"`
	}
	out := make([]channel, len(channels))
	for i, c := range channels {
		out[i] = channel{ID: c.GetId(), Plugin: c.GetPluginKey(), Label: c.GetLabel(), Description: c.GetDescription(), Recipient: c.GetRecipient()}
	}
	return pluginsdk.DataResponse(out), nil
}

// filterOf reads account_id, group_id and model from the query; a bad id is
// answered with 400 rather than ignored.
func filterOf(req *pluginv1.HTTPRequest) (filter, *pluginv1.HTTPResponse) {
	f := filter{Model: strings.TrimSpace(pluginsdk.Query(req, "model"))}
	for _, q := range [...]struct {
		name string
		id   *int64
	}{{"account_id", &f.AccountID}, {"group_id", &f.GroupID}} {
		name, id := q.name, q.id
		raw := strings.TrimSpace(pluginsdk.Query(req, name))
		if raw == "" {
			continue
		}
		v, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || v <= 0 {
			return f, pluginsdk.BadRequest(name, "invalid", name+" must be a positive integer / 必须是正整数")
		}
		*id = v
	}
	return f, nil
}

// ruleResult is a rule's last result in a key's status.
type ruleResult struct {
	Name     string `json:"name"`
	Hit      bool   `json:"hit"`
	Fired    bool   `json:"fired"`
	Samples  int64  `json:"samples"`
	Lookback int    `json:"lookback"`
}

// keyStatus is a key's state as the console shows it.
type keyStatus struct {
	AccountID   int64        `json:"account_id"`
	AccountName string       `json:"account_name"`
	GroupID     int64        `json:"group_id"`
	Model       string       `json:"model"`
	Base        int          `json:"base"`
	Effective   float64      `json:"effective"`
	Adjusting   bool         `json:"adjusting"`
	Reset       bool         `json:"reset"`
	Verdict     string       `json:"verdict"`
	LastChange  string       `json:"last_change"`
	ChangedAt   int64        `json:"changed_at"`
	EvalWindow  int64        `json:"eval_window"`
	Total       int64        `json:"total"`
	Fail        int64        `json:"fail"`
	Lookback    int64        `json:"lookback"`
	Recent      any          `json:"recent"`
	Rules       []ruleResult `json:"rules"`
}

// listStatus lists the keys' states, degraded ones first.
func (p *Plugin) listStatus(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	f, bad := filterOf(req)
	if bad != nil {
		return bad, nil
	}
	s, err := p.store(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	states, err := s.loadStates(ctx, f)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	bases, err := s.loadBases(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	cfg := p.cfg.Load()
	degradedOnly := pluginsdk.Query(req, "degraded") == "1"
	items := make([]keyStatus, 0, len(states))
	for k, row := range states {
		res := cfg.Resolve(k.AccountID, k.GroupID)
		st := statusOf(k, row.State, &res, bases[pair{k.AccountID, k.GroupID}].Name)
		if !degradedOnly || (!st.Reset && st.Effective < float64(st.Base)) {
			items = append(items, st)
		}
	}
	slices.SortFunc(items, func(a, b keyStatus) int {
		return cmp.Or(cmp.Compare(a.ratio(), b.ratio()), compareKeys(a.key(), b.key()))
	})
	page, size := pluginsdk.Pagination(req, 50)
	total := len(items)
	items = items[min((page-1)*size, total):min(page*size, total)]
	return pluginsdk.ListResponse(items, pluginsdk.Page{Page: page, PageSize: size, Total: int64(total)}), nil
}

// ratio orders the status list: most degraded first, reset keys (base 0)
// with the keys at their base.
func (s keyStatus) ratio() float64 {
	if s.Reset || s.Base <= 0 {
		return 1
	}
	return s.Effective / float64(s.Base)
}

func (s keyStatus) key() key { return key{AccountID: s.AccountID, GroupID: s.GroupID, Model: s.Model} }

func statusOf(k key, st rules.State, res *rules.Resolved, name string) keyStatus {
	out := keyStatus{AccountID: k.AccountID, AccountName: name, GroupID: k.GroupID, Model: k.Model, Base: st.WeightBase,
		Effective: st.WeightEff, Adjusting: res.Enabled, Reset: st.Tombstone, Verdict: st.LastVerdict, LastChange: st.LastChange,
		ChangedAt: st.LastChangeAt, EvalWindow: st.LastEvalWindow, Total: st.LastTotal, Fail: st.LastFail, Lookback: st.LastLookback,
		Recent: st.Recent, Rules: []ruleResult{}}
	// The rule slots only match the rules the state was evaluated with.
	if st.Tombstone || st.RulesSig != res.RulesSig {
		return out
	}
	for i, r := range res.Rules {
		rr := ruleResult{Name: r.Name}
		if i < len(st.LastRules) {
			c := st.LastRules[i]
			rr.Hit, rr.Fired = rules.RuleHit(c), rules.RuleFired(c)
		}
		if i < len(st.LastRuleStats) {
			rr.Samples, rr.Lookback = st.LastRuleStats[i].N, st.LastRuleStats[i].Lookback
		}
		out.Rules = append(out.Rules, rr)
	}
	return out
}

type eventItem struct {
	ID        int64          `json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	AccountID int64          `json:"account_id"`
	GroupID   int64          `json:"group_id"`
	Model     string         `json:"model"`
	Kind      string         `json:"kind"`
	Reason    string         `json:"reason"`
	From      float64        `json:"from"`
	To        float64        `json:"to"`
	Rules     []string       `json:"rules"`
	Detail    map[string]any `json:"detail"`
}

func (p *Plugin) listEvents(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	f, bad := filterOf(req)
	if bad != nil {
		return bad, nil
	}
	s, err := p.store(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	page, size := pluginsdk.Pagination(req, 50)
	items, total, err := s.listEvents(ctx, f, pluginsdk.Query(req, "kind"), size, (page-1)*size)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	return pluginsdk.ListResponse(items, pluginsdk.Page{Page: page, PageSize: size, Total: total}), nil
}

// reset is POST /reset {account_id?, group_id?, model?} (resetKeys).
func (p *Plugin) reset(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var f filter
	if err := pluginsdk.DecodeJSON(req, &f); err != nil {
		return pluginsdk.BadRequest("", "invalid_json", err.Error()), nil
	}
	if f.AccountID <= 0 && f.GroupID <= 0 {
		return pluginsdk.BadRequest("account_id", "required", "an account or a group is required / 请指定账号或分组"), nil
	}
	n, err := p.resetKeys(ctx, f, req.GetCaller().GetUserId())
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	return pluginsdk.DataResponse(map[string]int{"reset": n}), nil
}

// accountWeight sums up an account's degraded keys for the account list.
type accountWeight struct {
	Degraded int   `json:"degraded"`
	Lowest   int32 `json:"lowest"`
	Base     int   `json:"base"`
}

// getWeights answers ?account_ids=1,2,3 from this node's weights.
func (p *Plugin) getWeights(_ context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	wanted := map[int64]bool{}
	for _, part := range strings.Split(pluginsdk.Query(req, "account_ids"), ",") {
		if id, err := strconv.ParseInt(strings.TrimSpace(part), 10, 64); err == nil && id > 0 && len(wanted) < 500 {
			wanted[id] = true
		}
	}
	out := map[int64]accountWeight{}
	for k, w := range *p.weights.Load() {
		if !wanted[k.AccountID] || w.eff >= float64(w.base) {
			continue
		}
		a, seen := out[k.AccountID]
		eff := effectiveWeight(w.eff)
		if !seen || eff < a.Lowest {
			a.Lowest, a.Base = eff, w.base
		}
		a.Degraded++
		out[k.AccountID] = a
	}
	return pluginsdk.DataResponse(out), nil
}
