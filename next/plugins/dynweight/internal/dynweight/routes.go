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
	p.Handle("GET", "/degraded", p.getDegraded)
	p.Handle("GET", "/accounts/:id/override", p.getOverride)
	p.Handle("PUT", "/accounts/:id/override", p.putOverride)
	p.Handle("GET", "/stats", p.getStats)
}

// conflictMessage answers a save over a configuration another save changed.
const conflictMessage = "the configuration was changed meanwhile, reload it / 配置已被修改，请刷新后重试"

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
		return pluginsdk.ErrorResponse(http.StatusConflict, "conflict", conflictMessage), nil
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

// keyStatus is a key and its status (rules.Describe).
type keyStatus struct {
	AccountID       int64  `json:"account_id"`
	AccountName     string `json:"account_name"`
	GroupID         int64  `json:"group_id"`
	Model           string `json:"model"`
	GroupConfigured bool   `json:"group_configured"`
	rules.Status
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
	cfg, err := p.loadedConfig(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	now := p.now().Unix()
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
		b := bases[pair{k.AccountID, k.GroupID}]
		item := keyStatus{AccountID: k.AccountID, AccountName: b.Name, GroupID: k.GroupID, Model: k.Model, GroupConfigured: cfg.Groups[k.GroupID] != nil,
			Status: rules.Describe(k.AccountID, st, &res, b.Weight, !b.SeenAt.IsZero(), obs[k], now)}
		if !degradedOnly || (!item.Reset && item.Effective < float64(item.Base)) {
			items = append(items, item)
		}
	}
	slices.SortFunc(items, func(a, b keyStatus) int {
		return cmp.Or(cmp.Compare(a.Ratio(), b.Ratio()), compareKeys(a.key(), b.key()))
	})
	page, size := pluginsdk.Pagination(req, 50)
	total := len(items)
	items = items[min((page-1)*size, total):min(page*size, total)]
	return pluginsdk.ListResponse(items, pluginsdk.Page{Page: page, PageSize: size, Total: int64(total)}), nil
}

func (s keyStatus) key() key { return key{AccountID: s.AccountID, GroupID: s.GroupID, Model: s.Model} }

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

const (
	// maxListedAccounts bounds the accounts of GET /weights and GET
	// /degraded: what the core's account list filters by at once.
	maxListedAccounts = 500
	// maxWeightKeys bounds the keys GET /weights details per account.
	maxWeightKeys = 10
)

// accountWeight sums up an account's degraded keys for the account list.
type accountWeight struct {
	Degraded int         `json:"degraded"`
	Lowest   int32       `json:"lowest"`
	Base     int         `json:"base"`
	Keys     []weightKey `json:"keys"` // the lowest maxWeightKeys, by effective weight
}

// weightKey is a degraded key of an account.
type weightKey struct {
	GroupID int64   `json:"group_id"`
	Model   string  `json:"model"`
	Eff     float64 `json:"eff"`
	Base    int     `json:"base"`
}

// getWeights answers ?account_ids=1,2,3 from this node's weights.
func (p *Plugin) getWeights(_ context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	wanted := map[int64]bool{}
	for _, part := range strings.Split(pluginsdk.Query(req, "account_ids"), ",") {
		if id, err := strconv.ParseInt(strings.TrimSpace(part), 10, 64); err == nil && id > 0 && len(wanted) < maxListedAccounts {
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
		a.Keys = append(a.Keys, weightKey{GroupID: k.GroupID, Model: k.Model, Eff: w.eff, Base: w.base})
		out[k.AccountID] = a
	}
	for id, a := range out {
		slices.SortFunc(a.Keys, func(x, y weightKey) int {
			return cmp.Or(cmp.Compare(x.Eff, y.Eff), cmp.Compare(x.GroupID, y.GroupID), strings.Compare(x.Model, y.Model))
		})
		a.Keys = a.Keys[:min(len(a.Keys), maxWeightKeys)]
		out[id] = a
	}
	return pluginsdk.DataResponse(out), nil
}

// getDegraded lists the accounts with a key below its base in this node's
// snapshot: how many, and the first maxListedAccounts ids in order.
func (p *Plugin) getDegraded(context.Context, *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	ids := []int64{}
	for k, w := range *p.weights.Load() {
		if w.eff < float64(w.base) {
			ids = append(ids, k.AccountID)
		}
	}
	slices.Sort(ids)
	ids = slices.Compact(ids)
	return pluginsdk.DataResponse(map[string]any{"count": len(ids), "account_ids": ids[:min(len(ids), maxListedAccounts)]}), nil
}

// overrideBody is an account's override (null for none) and the layers in
// force for it: one per group scheduling has offered the account in (the
// bases), by group id. The console resolves the group names, as it does
// everywhere else (CONTRACTS §74.5 "界面").
type overrideBody struct {
	Override *rules.AccountOverride `json:"override"`
	Layers   []accountLayer         `json:"layers"`
}

// accountLayer is the layer serving an account in a group.
type accountLayer struct {
	GroupID int64  `json:"group_id"`
	Source  string `json:"source"` // global | group
	NoClimb bool   `json:"no_climb"`
}

// overrideOf is an account's override under c and its layers (overrideBody).
func overrideOf(c *rules.Config, id int64, bases map[pair]base) overrideBody {
	out := overrideBody{Layers: []accountLayer{}}
	if o, ok := c.Accounts[id]; ok {
		out.Override = &o
	}
	var groups []int64
	for pr := range bases {
		if pr.AccountID == id {
			groups = append(groups, pr.GroupID)
		}
	}
	slices.Sort(groups)
	for _, gid := range groups {
		l, source := &c.Layer, "global"
		if g := c.Groups[gid]; g != nil {
			l, source = g, "group"
		}
		out.Layers = append(out.Layers, accountLayer{GroupID: gid, Source: source, NoClimb: l.NoClimb()})
	}
	return out
}

// accountParam reads the :id of /accounts/:id/override.
func accountParam(req *pluginv1.HTTPRequest) (int64, *pluginv1.HTTPResponse) {
	id, err := strconv.ParseInt(pluginsdk.Param(req, "id"), 10, 64)
	if err != nil || id <= 0 {
		return 0, pluginsdk.BadRequest("id", "invalid", "the account id must be a positive integer / 账号 id 必须是正整数")
	}
	return id, nil
}

// getOverride is GET /accounts/:id/override from the stored configuration.
// An account the plugin knows nothing about (never offered by scheduling,
// no override) is 404: the plugin cannot see the core's accounts.
func (p *Plugin) getOverride(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := accountParam(req)
	if bad != nil {
		return bad, nil
	}
	s, err := p.store(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	c, _, _, err := s.loadConfig(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	bases, err := s.loadBases(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	body := overrideOf(&c, id, bases)
	if body.Override == nil && len(body.Layers) == 0 {
		return pluginsdk.ErrorResponse(http.StatusNotFound, "not_found", "the plugin has no record of this account / 插件没有这个账号的记录"), nil
	}
	return pluginsdk.DataResponse(body), nil
}

// overrideRetries is how many more times, after its first attempt, PUT
// /accounts/:id/override reloads the configuration and tries again when
// another save changed it meanwhile: 1 + overrideRetries attempts in all.
const overrideRetries = 3

// putOverride is PUT /accounts/:id/override {override: AccountOverride |
// null}: it replaces (or removes) the account's override in the stored
// configuration, checked as PUT /config checks it, over the version it
// read. It does not ask whether the core has the account: a new account's
// form saves its override right after the account is created.
func (p *Plugin) putOverride(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	id, bad := accountParam(req)
	if bad != nil {
		return bad, nil
	}
	var body struct {
		Override *rules.AccountOverride `json:"override"`
	}
	if err := pluginsdk.DecodeJSON(req, &body); err != nil {
		return pluginsdk.BadRequest("", "invalid_json", err.Error()), nil
	}
	s, err := p.store(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	bases, err := s.loadBases(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	for range 1 + overrideRetries {
		c, version, _, err := s.loadConfig(ctx)
		if err != nil {
			return pluginsdk.Unavailable(err.Error()), nil
		}
		if body.Override == nil {
			delete(c.Accounts, id)
		} else {
			if c.Accounts == nil {
				c.Accounts = map[int64]rules.AccountOverride{}
			}
			c.Accounts[id] = *body.Override
		}
		if _, resp := p.checkConfig(ctx, &c); resp != nil {
			return resp, nil
		}
		if p.beforeSave != nil {
			p.beforeSave(ctx)
		}
		if _, err = s.saveConfig(ctx, c, version, req.GetCaller().GetUserId()); errors.Is(err, errVersionConflict) {
			continue
		}
		if err != nil {
			return pluginsdk.Unavailable(err.Error()), nil
		}
		p.publish(ctx, TopicConfig, p.reloadConfig)
		return pluginsdk.DataResponse(overrideOf(&c, id, bases)), nil
	}
	return pluginsdk.ErrorResponse(http.StatusConflict, "conflict", conflictMessage), nil
}
