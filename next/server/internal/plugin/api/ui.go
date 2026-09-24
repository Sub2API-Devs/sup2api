package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
)

// UIPlugin is one entry of GET /ui/plugins.
type UIPlugin struct {
	Key          string                   `json:"key"`
	Version      string                   `json:"version"`
	Name         core.LocalizedText       `json:"name"`
	AssetBase    string                   `json:"asset_base"`
	Menus        []manifest.Menu          `json:"menus"`
	Pages        map[string]manifest.Page `json:"pages"`
	Slots        []manifest.Slot          `json:"slots"`
	NativeEntry  string                   `json:"native_entry"`
	Trust        string                   `json:"trust"`
	HostUICompat string                   `json:"host_ui_compat"`
}

// uiPlugins lists console extensions of active plugins, filtered by the
// caller's permissions. Pages only reachable through hidden menus are
// dropped; native entries are only returned for official/verified plugins.
func (a *API) uiPlugins(c *gin.Context) {
	out := []UIPlugin{}
	if a.d.Registry == nil {
		httpapi.OK(c, out)
		return
	}
	gen := a.d.Registry.Current()
	if gen == nil {
		httpapi.OK(c, out)
		return
	}
	rc := c.Request.Context()
	ps, err := a.d.Authz.PermissionSet(rc, actor(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	for _, p := range gen.Plugins() {
		m := p.Manifest
		if m == nil || m.UI == nil {
			continue
		}
		allowed := func(perm string) bool { return perm == "" || ps.Has(install.PermissionKey(p.Key, perm)) }
		item := UIPlugin{Key: p.Key, Version: p.Version, Name: core.LocalizedText(m.Name), AssetBase: p.AssetBase,
			Menus: []manifest.Menu{}, Pages: map[string]manifest.Page{}, Slots: []manifest.Slot{}, Trust: p.Trust, HostUICompat: m.HostUICompat}
		hiddenPages := map[string]bool{}
		for _, mn := range m.UI.Menus {
			if allowed(mn.Permission) {
				item.Menus = append(item.Menus, mn)
			} else {
				hiddenPages[mn.Page] = true
			}
		}
		visiblePages := map[string]bool{}
		for _, mn := range item.Menus {
			visiblePages[mn.Page] = true
		}
		for id, pg := range m.UI.Pages {
			if visiblePages[id] || !hiddenPages[id] {
				item.Pages[id] = pg
			}
		}
		for _, sl := range m.UI.Slots {
			if allowed(sl.Permission) {
				item.Slots = append(item.Slots, sl)
			}
		}
		if m.UI.Native != nil && (p.Trust == pkg.TrustOfficial || p.Trust == pkg.TrustVerified) {
			item.NativeEntry = m.UI.Native.Entry
		}
		if len(item.Menus) == 0 && len(item.Slots) == 0 && len(item.Pages) == 0 {
			continue
		}
		out = append(out, item)
	}
	httpapi.OK(c, out)
}

// ---------------------------------------------------------------- market

func (a *API) marketSources(c *gin.Context) {
	if a.d.Market == nil {
		httpapi.OK(c, []any{})
		return
	}
	srcs, err := a.d.Market.ListSources(c.Request.Context())
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, srcs)
}

func (a *API) marketPlugins(c *gin.Context) {
	if a.d.Market == nil {
		marketList(c, []any{}, a.hostVersion())
		return
	}
	var sourceID int64
	if s := c.Query("source_id"); s != "" {
		id, err := strconv.ParseInt(s, 10, 64)
		if err != nil || id <= 0 {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid source_id"))
			return
		}
		sourceID = id
	}
	refresh, _ := strconv.ParseBool(c.Query("refresh"))
	list, err := a.d.Market.ListPlugins(c.Request.Context(), sourceID, refresh)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	marketList(c, list, a.hostVersion())
}

func (a *API) hostVersion() string {
	if a.d.Install == nil {
		return ""
	}
	return a.d.Install.HostVersion()
}

// marketList renders the market listing. data stays the plugin array (as
// before); host_version is a top-level sibling so existing clients keep
// working: {"data": [...], "host_version": "0.2.0"}.
func marketList(c *gin.Context, list any, hostVersion string) {
	c.JSON(http.StatusOK, gin.H{"data": list, "host_version": hostVersion})
}

// ---------------------------------------------------------------- publishers

func (a *API) listPublishers(c *gin.Context) {
	list, err := a.d.Install.ListPublishers(c.Request.Context())
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, list)
}

func (a *API) createPublisher(c *gin.Context) {
	var in install.CreatePublisherInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	p, err := a.d.Install.CreatePublisher(ctx(c), in, actor(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.Created(c, p)
}

func (a *API) addPublisherKey(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in install.KeyInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	p, err := a.d.Install.AddPublisherKey(ctx(c), id, in, actor(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.Created(c, p)
}

type revokeBody struct {
	Reason string `json:"reason"`
}

func (a *API) revokeBody(c *gin.Context) (string, bool) {
	var in revokeBody
	if c.Request.ContentLength > 0 && !httpapi.BindJSON(c, &in) {
		return "", false
	}
	if in.Reason == "" {
		in.Reason = "revoked by administrator"
	}
	return in.Reason, true
}

func (a *API) revokePublisher(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	reason, ok := a.revokeBody(c)
	if !ok {
		return
	}
	res, err := a.d.Install.RevokePublisher(ctx(c), id, reason, actor(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, res)
}

func (a *API) revokeKey(c *gin.Context) {
	reason, ok := a.revokeBody(c)
	if !ok {
		return
	}
	res, err := a.d.Install.RevokeKey(ctx(c), c.Param("key_id"), reason, actor(c))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, res)
}
