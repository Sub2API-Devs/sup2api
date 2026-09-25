package account

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// ModelsResult is returned by the "fetch models" endpoints (CONTRACTS §19).
type ModelsResult struct {
	Models []string `json:"models"`
	// Skipped counts upstream ids that are not complete model ids.
	Skipped int `json:"skipped"`
	Status  int `json:"status"`
}

const (
	maxModelsBody   = 8 << 20
	maxFetchedModel = 5000
)

// fetchTypeModels is POST /account-types/:plugin_key/:type/models/fetch:
// lists the models reachable with credentials typed into the form (account
// not saved yet).
func (s *Service) fetchTypeModels(c *gin.Context) {
	ctx := c.Request.Context()
	var in struct {
		Credentials json.RawMessage `json:"credentials"`
		ProxyID     *int64          `json:"proxy_id"`
		// ProxyURL is only parsed and used for this request: no proxy row is
		// looked up or created (CONTRACTS §21.4).
		ProxyURL *string `json:"proxy_url"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	bt, ok := s.accountType(c.Param("plugin_key"), c.Param("type"))
	if !ok || bt.Client == nil {
		httpapi.Fail(c, core.InvalidFields(core.FieldError{Field: "type", Code: "unknown",
			Message: t(ctx, "unknown account type (is its plugin enabled?)", "未知的账号类型（插件是否已启用？）")}))
		return
	}
	proxyURL := ""
	if in.ProxyURL != nil {
		proxyURL = strings.TrimSpace(*in.ProxyURL)
	}
	if proxyURL != "" && in.ProxyID != nil {
		httpapi.Fail(c, core.InvalidFields(core.FieldError{Field: "proxy_url", Code: "conflict",
			Message: t(ctx, "proxy_url and proxy_id cannot both be given", "proxy_url 与 proxy_id 不能同时给出")}))
		return
	}
	var hc *http.Client
	switch {
	case proxyURL != "":
		spec, err := core.ParseProxyURL(proxyURL)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		if hc, err = s.d.Proxies.HTTPClientFor(ctx, spec); err != nil {
			httpapi.Fail(c, err)
			return
		}
		defer hc.CloseIdleConnections()
	default:
		if in.ProxyID != nil {
			// Same visibility rule as POST /accounts (§21.2).
			if err := checkRefs(ctx, s.d.DB.Pool, in.ProxyID, s.proxyRangeFor(ctx, "account:create"), nil); err != nil {
				httpapi.Fail(c, err)
				return
			}
		}
		var err error
		if hc, err = s.d.Proxies.HTTPClient(ctx, in.ProxyID); err != nil {
			httpapi.Fail(c, err)
			return
		}
	}
	p, err := s.prepare(ctx, bt, in.Credentials, nil, s.customSettings(ctx))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	res, err := s.fetchModels(ctx, bt, &pluginv1.Account{Type: bt.Type.ID,
		CredentialsJson: string(p.secret), SettingsJson: string(p.settings)}, hc, in.ProxyID != nil || proxyURL != "")
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, res)
}

// fetchAccountModels is POST /accounts/:id/models/fetch. An optional
// credentials object (Mask keeps stored secrets) overrides the stored one,
// so the edit form can list models with values not saved yet.
func (s *Service) fetchAccountModels(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in struct {
		Credentials json.RawMessage `json:"credentials"`
	}
	if raw, err := c.GetRawData(); err == nil && len(strings.TrimSpace(string(raw))) > 0 {
		if err := json.Unmarshal(raw, &in); err != nil {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage(err.Error()))
			return
		}
	}
	a, err := s.loadRow(ctx, s.d.DB.Pool, id, core.OwnerScope(ctx, "account:test"), false)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	bt, ok := s.accountType(a.PluginKey, a.Type)
	if !ok || bt.Client == nil {
		httpapi.Fail(c, core.ErrPluginUnavailable.WithMessage(t(ctx,
			"the plugin providing this account type is not enabled", "提供该账号类型的插件未启用")))
		return
	}
	plain, err := s.decrypt(a.PluginKey, a.CredEnc)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	secret, settings := plain, a.Settings
	if creds := strings.TrimSpace(string(in.Credentials)); creds != "" && creds != "null" {
		old, err := merge(plain, a.Settings)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		p, err := s.prepare(ctx, bt, in.Credentials, mustJSON(old), s.customSettings(ctx))
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		secret, settings = p.secret, p.settings
	}
	hc, err := s.d.Proxies.HTTPClient(ctx, a.ProxyID)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	res, err := s.fetchModels(ctx, bt, &pluginv1.Account{Id: a.ID, Name: a.Name, Type: a.Type,
		CredentialsJson: string(secret), SettingsJson: string(settings)}, hc, a.ProxyID != nil)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, res)
}

// fetchModels asks the plugin for the models request, sends it with hc (the
// account's proxy client, a transient proxy_url client or the direct one;
// proxied tells the private-address guard) and extracts the ids.
func (s *Service) fetchModels(ctx context.Context, bt core.AccountTypeBinding, acct *pluginv1.Account, hc *http.Client, proxied bool) (*ModelsResult, error) {
	ctx, cancel := context.WithTimeout(ctx, testTimeout)
	defer cancel()
	mr, err := bt.Client.BuildModelsRequest(ctx, &pluginv1.BuildModelsRequestRequest{Account: acct})
	if err != nil {
		if status.Code(err) == codes.Unimplemented {
			return nil, core.ErrUnsupported.WithMessage(t(ctx,
				"this account type cannot list models from the upstream", "该账号类型不支持从上游获取模型列表"))
		}
		return nil, err
	}
	u, err := url.Parse(mr.GetUrl())
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return nil, core.ErrPluginUnavailable.WithMessage("plugin built an invalid models URL")
	}
	if err := s.checkUpstream(ctx, u, proxied); err != nil {
		return nil, core.ErrUnavailable.WithMessage(err.Error())
	}
	method := strings.ToUpper(mr.GetMethod())
	if method == "" {
		method = http.MethodGet
	}
	var body io.Reader
	if mr.GetBodyJson() != "" {
		body = strings.NewReader(mr.GetBodyJson())
	}
	req, err := http.NewRequestWithContext(ctx, method, u.String(), body)
	if err != nil {
		return nil, core.ErrInternal.WithCause(err)
	}
	for k, v := range mr.GetHeaders() {
		req.Header.Set(k, v)
	}
	if body != nil && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := hc.Do(req)
	if err != nil {
		return nil, core.ErrUnavailable.WithMessage(t(ctx, "upstream request failed: ", "上游请求失败：") + err.Error())
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, maxModelsBody))
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		msg := truncate(strings.TrimSpace(string(raw)), 512)
		if msg == "" {
			msg = resp.Status
		}
		return nil, core.ErrUnavailable.WithMessage(t(ctx, "upstream returned ", "上游返回 ") + itoa(int64(resp.StatusCode)) + ": " + msg).
			WithDetails(map[string]any{"status": resp.StatusCode})
	}
	if !gjson.ValidBytes(raw) {
		return nil, core.ErrUnavailable.WithMessage(t(ctx, "upstream response is not JSON", "上游响应不是 JSON"))
	}
	path := mr.GetIdsPath()
	if path == "" {
		path = "data.#.id"
	}
	res := &ModelsResult{Models: []string{}, Status: resp.StatusCode}
	seen := map[string]bool{}
	for _, v := range gjson.GetBytes(raw, path).Array() {
		id := strings.TrimSpace(v.String())
		if p := mr.GetStripPrefix(); p != "" {
			id = strings.TrimPrefix(id, p)
		}
		if id == "" || !manifest.ValidModelID(id) {
			res.Skipped++
			continue
		}
		if !seen[id] {
			seen[id] = true
			res.Models = append(res.Models, id)
		}
		if len(res.Models) >= maxFetchedModel {
			break
		}
	}
	sort.Strings(res.Models)
	return res, nil
}
