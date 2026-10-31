package dynweight

import (
	"cmp"
	"context"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"

	"github.com/Sub2API-Devs/sup2api/next/plugins/dynweight/internal/rules"
)

func (p *Plugin) routes() {
	p.Handle("GET", "/config", p.getConfig)
	p.Handle("PUT", "/config", p.putConfig)
	p.Handle("POST", "/config/validate", p.validateConfig)
	p.Handle("GET", "/defaults", p.getDefaults)
	p.Handle("GET", "/channels", p.listChannels)
	p.Handle("GET", "/status", p.listStatus)
	p.Handle("GET", "/events", p.listEvents)
	p.Handle("POST", "/reset", p.reset)
	p.Handle("GET", "/weights", p.getWeights)
	p.Handle("GET", "/stats", p.getStats)
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
	c, version, warnings, err := s.loadConfig(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	return pluginsdk.DataResponse(configBody{Config: c, Version: version, Warnings: warnings}), nil
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
	warnings, resp := p.checkConfig(ctx, &body.Config)
	if resp != nil {
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

// validateConfig checks a configuration as PUT /config would, without
// saving it: the same 400 when it is refused, else the normalized
// configuration and its warnings.
func (p *Plugin) validateConfig(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var body configBody
	if err := pluginsdk.DecodeJSON(req, &body); err != nil {
		return pluginsdk.BadRequest("", "invalid_json", err.Error()), nil
	}
	warnings, resp := p.checkConfig(ctx, &body.Config)
	if resp != nil {
		return resp, nil
	}
	return pluginsdk.DataResponse(configBody{Config: body.Config, Version: body.Version, Warnings: warnings}), nil
}

// checkConfig normalizes a configuration to save and checks its
// notification channel; resp is the refusal.
func (p *Plugin) checkConfig(ctx context.Context, c *rules.Config) (warnings []string, resp *pluginv1.HTTPResponse) {
	warnings, err := c.Normalize()
	if err != nil {
		return nil, pluginsdk.BadRequest("config", "invalid", err.Error())
	}
	return warnings, p.checkChannel(ctx, c.Notify)
}

// checkChannel refuses notifications on a channel no enabled plugin
// declares, or to recipients the channel does not accept.
func (p *Plugin) checkChannel(ctx context.Context, n rules.Notify) *pluginv1.HTTPResponse {
	if !n.Enabled {
		return nil
	}
	channels, err := pluginsdk.ListNotificationChannels(ctx, p.host)
	if status.Code(err) == codes.PermissionDenied {
		return pluginsdk.BadRequest("notify.enabled", "not_granted", "the notify.send permission is not granted to this plugin / 本插件未获授予 notify.send 权限")
	}
	if err != nil {
		return pluginsdk.Unavailable(err.Error())
	}
	i := slices.IndexFunc(channels, func(c *pluginv1.NotificationChannel) bool { return c.GetId() == n.Channel })
	if i < 0 {
		return pluginsdk.BadRequest("notify.channel", "unknown", "no enabled plugin delivers this channel / 没有已启用的插件提供该通知渠道")
	}
	for _, r := range n.Recipients {
		if !manifest.ValidRecipient(channels[i].GetRecipient(), r) {
			return pluginsdk.BadRequest("notify.recipients", "invalid", "the channel does not accept "+strconv.Quote(r)+" / 该渠道不接受此收件人")
		}
	}
	return nil
}

// listChannels lists the notification channels; none without the optional
// notify.send grant.
func (p *Plugin) listChannels(ctx context.Context, _ *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	channels, err := pluginsdk.ListNotificationChannels(ctx, p.host)
	if err != nil && status.Code(err) != codes.PermissionDenied {
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

// ruleResult is an enabled rule of a key's layer and its last result:
// whether it hit and fired, its hits of the last Periods windows (newest
// last) and the evidence it was judged on. The results are left out while
// the state is from other rules or the adjustment is off.
type ruleResult struct {
	Name       string `json:"name"`
	Scope      string `json:"scope"`
	Periods    int    `json:"periods"`
	HitPeriods int    `json:"hit_periods"`
	Hit        bool   `json:"hit"`
	Fired      bool   `json:"fired"`
	Bitmap     string `json:"bitmap"`
	Samples    int64  `json:"samples"`
	Lookback   int    `json:"lookback"`
	NoSamples  bool   `json:"no_samples"` // weight conditions only
}

// thresholdCount is how many samples reached a threshold (ms).
type thresholdCount struct {
	Ms    int   `json:"ms"`
	Count int64 `json:"count"`
}

func thresholdCounts(thresholds []int, counts map[int]int64) []thresholdCount {
	out := make([]thresholdCount, len(thresholds))
	for i, ms := range thresholds {
		out[i] = thresholdCount{Ms: ms, Count: counts[ms]}
	}
	return out
}

// currentWindow is the window still taking observations (as flushed so
// far), with the exempt failures left out like the error rate does.
type currentWindow struct {
	Start             int64            `json:"window_start"`
	Elapsed           int64            `json:"elapsed_seconds"`
	Total             int64            `json:"total"`
	Fail              int64            `json:"fail"`
	StreamTotal       int64            `json:"stream_total"`
	StreamFail        int64            `json:"stream_fail"`
	TTFBSamples       int64            `json:"ttfb_samples"`
	LatencySamples    int64            `json:"latency_samples"`
	Thresholds        []thresholdCount `json:"thresholds"`
	LatencyThresholds []thresholdCount `json:"latency_thresholds"`
}

// keyStatus is a key's state as the console shows it. A key with counters
// but no evaluation yet has no last window (eval_window 0).
type keyStatus struct {
	AccountID       int64   `json:"account_id"`
	AccountName     string  `json:"account_name"`
	GroupID         int64   `json:"group_id"`
	Model           string  `json:"model"`
	Base            int     `json:"base"`
	Effective       float64 `json:"effective"`
	WeightMin       int     `json:"weight_min"`
	State           string  `json:"state"` // normal | degrading | climbing
	Adjusting       bool    `json:"adjusting"`
	GroupConfigured bool    `json:"group_configured"`
	NoClimbStrategy bool    `json:"no_climb_strategy"`
	Reset           bool    `json:"reset"`
	Verdict         string  `json:"verdict"`
	LastChange      string  `json:"last_change"`
	ChangedAt       int64   `json:"changed_at"`
	NextEvalAt      int64   `json:"next_eval_at"`
	// The last evaluated window, merged back over Lookback windows until
	// min_samples (ErrorEvaluable once reached).
	EvalWindow        int64            `json:"eval_window"`
	Total             int64            `json:"total"`
	Fail              int64            `json:"fail"`
	Lookback          int64            `json:"lookback"`
	ErrorEvaluable    bool             `json:"error_evaluable"`
	TTFBSamples       int64            `json:"ttfb_samples"`
	LatencySamples    int64            `json:"latency_samples"`
	Thresholds        []thresholdCount `json:"thresholds"`
	LatencyThresholds []thresholdCount `json:"latency_thresholds"`
	Recent            rules.RecentAgg  `json:"recent"`
	Rules             []ruleResult     `json:"rules"`
	Current           currentWindow    `json:"current"`
}

// listStatus lists the keys with a state or with counters, degraded ones
// first.
func (p *Plugin) listStatus(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	f, bad := filterOf(req)
	if bad != nil {
		return bad, nil
	}
	s, err := p.store(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	cfg, now := p.cfg.Load(), p.now().Unix()
	states, err := s.loadStates(ctx, f)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	obs, err := s.loadObs(ctx, f, obsSince(cfg, now))
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	bases, err := s.loadBases(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	degradedOnly := pluginsdk.Query(req, "degraded") == "1"
	items := make([]keyStatus, 0, len(states))
	for _, k := range keysOf(states, obs) {
		row, hasState := states[k]
		var st *rules.State
		if hasState {
			st = &row.State
		}
		res := cfg.Resolve(k.AccountID, k.GroupID)
		item := statusOf(k, st, &res, bases[pair{k.AccountID, k.GroupID}], obs[k], now)
		item.GroupConfigured = cfg.Groups[k.GroupID] != nil
		if !degradedOnly || (!item.Reset && item.Effective < float64(item.Base)) {
			items = append(items, item)
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

// statusOf is a key's status: its state (nil = none yet) under its resolved
// configuration, the base scheduling last offered, and its counters by
// window start.
func statusOf(k key, st *rules.State, res *rules.Resolved, b base, obs map[int64]rules.Counts, now int64) keyStatus {
	start := rules.WindowStart(k.AccountID, now, res.WindowSeconds)
	out := keyStatus{AccountID: k.AccountID, AccountName: b.Name, GroupID: k.GroupID, Model: k.Model, Base: b.Weight,
		Effective: float64(b.Weight), State: "normal", Adjusting: res.Enabled, NoClimbStrategy: res.NoClimb(),
		NextEvalAt: start + int64(res.WindowSeconds) + rules.CloseGraceSeconds, Rules: []ruleResult{}}
	cur := obs[start]
	out.Current = currentWindow{Start: start, Elapsed: now - start, TTFBSamples: cur.TN, LatencySamples: cur.LN,
		Thresholds: thresholdCounts(res.Thresholds, cur.Thresholds), LatencyThresholds: thresholdCounts(res.LatencyThresholds, cur.Latency)}
	out.Current.Total, out.Current.Fail = cur.Judged(res.ExemptCodes)
	out.Current.StreamTotal, out.Current.StreamFail = cur.Stream.Judged(res.ExemptCodes)
	// A tombstone reads as no state; it only keeps its cuts. So does a state
	// computed from another base than scheduling's (new-api's base check):
	// scheduling ignores it and the next evaluation resets it.
	out.Reset = st != nil && st.Tombstone
	stale := st != nil && !b.SeenAt.IsZero() && st.WeightBase != b.Weight
	evaluated, last := st != nil && !st.Tombstone && !stale, &rules.State{}
	if evaluated {
		last = st
		out.Base, out.Effective = st.WeightBase, st.WeightEff
		out.Verdict, out.LastChange, out.ChangedAt = st.LastVerdict, st.LastChange, st.LastChangeAt
		out.EvalWindow, out.Total, out.Fail, out.Lookback = st.LastEvalWindow, st.LastTotal, st.LastFail, st.LastLookback
		out.ErrorEvaluable = st.LastTotal >= int64(res.MinSamples)
		out.TTFBSamples, out.LatencySamples, out.Recent = st.LastTN, st.LastLN, st.Recent
	}
	out.WeightMin = res.WeightFloor(out.Base)
	out.Thresholds = thresholdCounts(res.Thresholds, last.LastCounts)
	out.LatencyThresholds = thresholdCounts(res.LatencyThresholds, last.LastLatencyCounts)
	switch {
	case !res.Enabled || out.Reset || out.Effective >= float64(out.Base):
	case out.LastChange == rules.EventWeightDown:
		out.State = "degrading"
	default:
		out.State = "climbing"
	}
	// The rule results only match the rules the state was evaluated with.
	same := evaluated && res.Enabled && last.RulesSig == res.RulesSig
	for i, r := range res.Rules {
		rr := ruleResult{Name: r.Name, Scope: cmp.Or(r.Scope, rules.ScopeAll), Periods: r.Periods, HitPeriods: r.HitPeriods}
		if same && i < len(last.LastRules) {
			rr.Hit, rr.Fired = rules.RuleHit(last.LastRules[i]), rules.RuleFired(last.LastRules[i])
		}
		if same && i < len(last.Bitmaps) {
			rr.Bitmap = last.Bitmaps[i]
		}
		if same && i < len(last.LastRuleStats) {
			rr.Samples, rr.Lookback = last.LastRuleStats[i].N, last.LastRuleStats[i].Lookback
			rr.NoSamples = rr.Lookback == 0
		}
		out.Rules = append(out.Rules, rr)
	}
	return out
}

type eventItem struct {
	ID          int64          `json:"id"`
	CreatedAt   time.Time      `json:"created_at"`
	AccountID   int64          `json:"account_id"`
	AccountName string         `json:"account_name"`
	GroupID     int64          `json:"group_id"`
	Model       string         `json:"model"`
	Kind        string         `json:"kind"`
	Reason      string         `json:"reason"`
	From        float64        `json:"from"`
	To          float64        `json:"to"`
	Rules       []string       `json:"rules"`
	Detail      map[string]any `json:"detail"`
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

// maxResetAccounts bounds the accounts of one reset.
const maxResetAccounts = 500

// reset is POST /reset {account_id?, account_ids?, group_id?, model?}
// (resetKeys).
func (p *Plugin) reset(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var f filter
	if err := pluginsdk.DecodeJSON(req, &f); err != nil {
		return pluginsdk.BadRequest("", "invalid_json", err.Error()), nil
	}
	accounts := len(f.accounts())
	if accounts > maxResetAccounts {
		return pluginsdk.BadRequest("account_ids", "too_many", fmt.Sprintf("at most %d accounts / 最多 %d 个账号", maxResetAccounts, maxResetAccounts)), nil
	}
	if accounts == 0 && f.GroupID <= 0 {
		return pluginsdk.BadRequest("account_id", "required", "an account or a group is required / 请指定账号或分组"), nil
	}
	n, err := p.resetKeys(ctx, f, rules.ReasonManual, req.GetCaller().GetUserId())
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
