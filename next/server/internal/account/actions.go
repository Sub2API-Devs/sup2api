package account

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// AccountAction is a plugin-registered custom action on an account (CONTRACTS §52).
type AccountAction struct {
	// ID is the action identifier (unique per plugin+type, e.g. "refresh_auth").
	ID string `json:"id"`
	// Label is the button text shown in the UI.
	Label map[string]string `json:"label"`
	// Icon is the optional icon name (e.g. "refresh").
	Icon string `json:"icon,omitempty"`
	// PluginKey is the plugin that registered this action.
	PluginKey string `json:"plugin_key"`
	// AccountType restricts the action to a specific account type; empty means all types of the plugin.
	AccountType string `json:"account_type,omitempty"`
	// Permission is the required permission to see and invoke the action.
	Permission string `json:"permission,omitempty"`
}

// executeAccountAction serves POST /accounts/:id/actions/:plugin_key/:action_id:
// invokes a plugin-registered action on an account.
func (s *Service) executeAccountAction(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	pluginKey := c.Param("plugin_key")
	actionID := c.Param("action_id")

	if pluginKey == "" || actionID == "" {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("plugin_key and action_id are required"))
		return
	}

	scope := core.OwnerScope(ctx, "account:update")
	a, err := s.loadRow(ctx, s.d.DB.Pool, id, scope, false)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}

	// Only the plugin that owns the account type can execute actions on it.
	if a.PluginKey != pluginKey {
		httpapi.Fail(c, core.ErrPermissionDenied.WithMessage(t(ctx,
			"this action is not available for this account type",
			"此操作对该账号类型不可用")))
		return
	}

	// Special handling for ccgateway refresh_auth action.
	if pluginKey == "ccgateway" && actionID == "refresh_auth" {
		s.handleCCGatewayRefreshAuth(c, ctx, id, scope)
		return
	}

	// Future: plugin RPC call to execute custom actions.
	httpapi.Fail(c, core.ErrUnsupported.WithMessage(t(ctx,
		"this action is not implemented",
		"此操作未实现")))
}

// handleCCGatewayRefreshAuth handles the refresh_auth action for CCGateway accounts
// by initiating a re-authorization flow.
func (s *Service) handleCCGatewayRefreshAuth(c *gin.Context, ctx context.Context, id int64, scope *int64) {
	if s.d.CCGateway == nil {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("Account runtimes are not configured.").
			WithDetails(map[string]any{"reason": "not_configured"}))
		return
	}

	uid, _ := core.UserID(ctx)

	// Start a re-authorization draft (or return the existing one).
	key, created, err := s.d.CCGateway.ReauthDraft(ctx, id, uid, core.OwnerScope(ctx, "settings:manage"))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}

	status := 200
	if created {
		status = 201
	}

	c.JSON(status, gin.H{
		"key":     key,
		"created": created,
		"message": t(ctx,
			"Re-authorization draft created. Complete the authorization flow to refresh credentials.",
			"已创建重新授权草稿。完成授权流程以刷新凭证。"),
	})
}

// listAccountActions returns the available actions for an account type.
func (s *Service) listAccountActions(ctx context.Context, pluginKey, accountType string) []AccountAction {
	var actions []AccountAction

	// CCGateway managed accounts support refresh_auth.
	if pluginKey == "ccgateway" && accountType == "managed" {
		actions = append(actions, AccountAction{
			ID:          "refresh_auth",
			Label:       map[string]string{"en": "Refresh Authorization", "zh": "刷新授权"},
			Icon:        "refresh",
			PluginKey:   "ccgateway",
			AccountType: "managed",
			Permission:  "account:update",
		})
	}

	return actions
}

// getAccountActions serves GET /accounts/:id/actions: lists available actions for an account.
func (s *Service) getAccountActions(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}

	scope := core.OwnerScope(ctx, "account:read")
	a, err := s.loadRow(ctx, s.d.DB.Pool, id, scope, false)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}

	actions := s.listAccountActions(ctx, a.PluginKey, a.Type)

	// Filter by permission.
	filtered := make([]AccountAction, 0, len(actions))
	for _, action := range actions {
		if action.Permission == "" || s.can(ctx, action.Permission) || s.can(ctx, "account:own:update") {
			filtered = append(filtered, action)
		}
	}

	httpapi.OK(c, gin.H{"actions": filtered})
}

