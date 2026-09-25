// Package api exposes the plugin lifecycle console API (CONTRACTS §5.7):
// /plugins, /publishers, /market, /nodes and /ui/plugins.
package api

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/market"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Deps are the API collaborators. Nodes, Registry, Bus, Jobs and HookStats may be nil.
type Deps struct {
	DB        *store.DB
	Install   *install.Service
	Market    *market.Service
	Rollout   core.RolloutController
	Nodes     core.NodeRegistry
	Registry  core.PluginRegistry
	Authz     core.Authorizer
	Cipher    *secret.Cipher
	Bus       core.Bus
	Jobs      core.JobTrigger
	HookStats core.HookStatsSource
	Plugins   config.PluginConfig
}

// API holds the handlers.
type API struct{ d Deps }

// New builds the API.
func New(d Deps) *API { return &API{d: d} }

// Console permissions used by this module.
const (
	PermRead       = "plugin:read"
	PermInstall    = "plugin:install"
	PermManage     = "plugin:manage"
	PermUninstall  = "plugin:uninstall"
	PermEgressRead = "plugin:egress:read"
	PermMarketRead = "plugin:market:read"
	PermPubRead    = "publisher:read"
	PermPubManage  = "publisher:manage"
	PermNodeRead   = "node:read"
)

// RegisterRoutes mounts every route of the module.
func (a *API) RegisterRoutes(r *httpapi.Router) {
	r.Perm(http.MethodGet, "/plugins", PermRead, a.listPlugins)
	r.Perm(http.MethodPost, "/plugins/upload", PermInstall, a.upload)
	r.Perm(http.MethodPost, "/plugins/install-from-market", PermInstall, a.installFromMarket)
	r.Perm(http.MethodGet, "/plugins/:key", PermRead, a.getPlugin)
	r.Perm(http.MethodDelete, "/plugins/:key", PermUninstall, a.uninstall)
	r.Perm(http.MethodGet, "/plugins/:key/versions/:version/review", PermRead, a.review)
	r.Perm(http.MethodPost, "/plugins/:key/versions/:version/consent", PermInstall, a.consent)
	r.Perm(http.MethodPost, "/plugins/:key/versions/:version/reject", PermInstall, a.reject)
	r.Perm(http.MethodPost, "/plugins/:key/enable", PermManage, a.enable)
	r.Perm(http.MethodPost, "/plugins/:key/disable", PermManage, a.disable)
	r.Perm(http.MethodPost, "/plugins/:key/upgrade", PermManage, a.upgrade)
	r.Perm(http.MethodGet, "/plugins/:key/rollouts/current", PermRead, a.currentRollout)
	r.Perm(http.MethodPost, "/plugins/:key/rollouts/:id/cancel", PermManage, a.cancelRollout)
	r.Perm(http.MethodGet, "/plugins/:key/settings", PermRead, a.getSettings)
	r.Perm(http.MethodPut, "/plugins/:key/settings", PermManage, a.putSettings)
	r.Perm(http.MethodGet, "/plugins/:key/grants", PermRead, a.listGrants)
	r.Perm(http.MethodDelete, "/plugins/:key/grants/:permission", PermManage, a.revokeGrant)
	r.Perm(http.MethodPut, "/plugins/:key/resources", PermManage, a.putResources)
	r.Perm(http.MethodPut, "/plugins/:key/egress-policy", PermManage, a.putEgressPolicy)
	r.Perm(http.MethodGet, "/plugins/:key/egress", PermEgressRead, a.egress)
	r.Perm(http.MethodGet, "/plugins/:key/jobs", PermRead, a.jobs)
	r.Perm(http.MethodPost, "/plugins/:key/jobs/:job_id/run", PermManage, a.runJob)
	r.Perm(http.MethodGet, "/plugins/:key/events", PermRead, a.events)

	r.Authed(http.MethodGet, "/ui/plugins", a.uiPlugins)
	r.Perm(http.MethodGet, "/nodes", PermNodeRead, a.nodes)

	r.Perm(http.MethodGet, "/market/sources", PermMarketRead, a.marketSources)
	r.Perm(http.MethodGet, "/market/plugins", PermMarketRead, a.marketPlugins)

	r.Perm(http.MethodGet, "/publishers", PermPubRead, a.listPublishers)
	r.Perm(http.MethodPost, "/publishers", PermPubManage, a.createPublisher)
	r.Perm(http.MethodPost, "/publishers/:id/keys", PermPubManage, a.addPublisherKey)
	r.Perm(http.MethodPost, "/publishers/:id/revoke", PermPubManage, a.revokePublisher)
	r.Perm(http.MethodPost, "/publisher-keys/:key_id/revoke", PermPubManage, a.revokeKey)
}

// ctx returns the request context carrying the client IP for audit logs.
func ctx(c *gin.Context) context.Context {
	return audit.WithClientIP(c.Request.Context(), c.ClientIP())
}

func actor(c *gin.Context) int64 {
	id, _ := core.UserID(c.Request.Context())
	return id
}

// audit writes an audit row outside a transaction (after controller calls).
func (a *API) audit(c *gin.Context, action, key string, detail any) {
	_ = audit.Audit(ctx(c), a.d.DB.Pool, actor(c), action, "plugin", key, detail)
}

// pluginExists returns the plugin status or renders not_found.
func (a *API) pluginStatus(c *gin.Context, key string) (string, bool) {
	var st string
	err := a.d.DB.Pool.QueryRow(c.Request.Context(), `SELECT status FROM plugins WHERE key = $1`, key).Scan(&st)
	if store.IsNoRows(err) {
		httpapi.Fail(c, core.ErrNotFound.WithMessage("plugin not found"))
		return "", false
	}
	if err != nil {
		httpapi.Fail(c, err)
		return "", false
	}
	return st, true
}

func (a *API) rollout(c *gin.Context) (core.RolloutController, bool) {
	if a.d.Rollout == nil {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("rollout controller unavailable"))
		return nil, false
	}
	return a.d.Rollout, true
}
