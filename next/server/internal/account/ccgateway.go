package account

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/environment"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

// connectMaxBody fits the largest models / model_mapping an account accepts
// (500 ids each, CONTRACTS §18): the console prefills the plugin presets (§41).
const connectMaxBody = 512 << 10

// ccgNotReady: the shared CCGateway is not configured or not authorized.
var ccgNotReady = core.ErrUnavailable.WithMessage("Configure and authorize CCGateway first.").
	WithDetails(map[string]any{"reason": "not_configured"})

func containerSettingKeys(plugin string) []string {
	if plugin == "ccgateway" {
		return []string{"locale", "timezone"}
	}
	return nil
}

func mergeContainerSettings(ctx context.Context, plugin string, base, patch []byte) ([]byte, error) {
	if len(patch) == 0 {
		return base, nil
	}
	invalid := func(field string) error {
		return core.InvalidFields(core.FieldError{Field: field, Code: "invalid", Message: t(ctx, "Invalid container environment setting", "容器环境设置无效")})
	}
	keys := containerSettingKeys(plugin)
	var changes map[string]string
	if len(keys) == 0 || json.Unmarshal(patch, &changes) != nil || changes == nil {
		return nil, invalid("settings")
	}
	settings, err := parseObject(base)
	if err != nil {
		return nil, err
	}
	for key, value := range changes {
		if !slices.Contains(keys, key) {
			return nil, invalid("settings")
		}
		value = strings.TrimSpace(value)
		if value == "" {
			delete(settings, key)
			continue
		}
		switch key {
		case "locale":
			canonical, _, ok := environment.Locale(value)
			if !ok {
				return nil, invalid("settings.locale")
			}
			value = canonical
		case "timezone":
			if _, err := time.LoadLocation(value); err != nil || value == "Local" || len(value) > 128 {
				return nil, invalid("settings.timezone")
			}
		}
		settings[key], _ = json.Marshal(value)
	}
	return mustJSON(settings), nil
}

// kickCCGateway prepares a CCGateway account's runtime (container + egress)
// right after it is created or changed instead of waiting for the next
// reconcile pass. The ccgateway service resolves the account's runtime key (adopted
// draft key or id) and ignores the kick unless per-account runtimes are
// enabled.
func (s *Service) kickCCGateway(id int64, pluginKey, typ string) {
	if binding, ok := s.accountType(pluginKey, typ); ok && binding.Type.Lifecycle != nil {
		return
	}
	if s.d.CCGateway != nil && pluginKey == "ccgateway" && (typ == "managed" || typ == "apikey") {
		s.d.CCGateway.Kick(itoa(id))
	}
}

// checkCCGatewayRuntime is the POST /accounts check of ccgateway_runtime
// (CONTRACTS §49.10): only for ccgateway/managed; the draft must be the
// caller's unless it holds settings:manage, unadopted and signed in. It
// returns the scope AdoptDraft uses in the transaction and what the runtime
// reported of the account (CONTRACTS §59).
func (s *Service) checkCCGatewayRuntime(ctx context.Context, key string) (*int64, core.AccountPreparationFacts, error) {
	if s.d.CCGateway == nil {
		return nil, core.AccountPreparationFacts{}, core.ErrInvalidArgument.WithMessage("Account runtimes are not configured.").
			WithDetails(map[string]any{"reason": "not_configured"})
	}
	var scope *int64
	if !s.can(ctx, "settings:manage") {
		uid, _ := core.UserID(ctx)
		scope = &uid
	}
	facts, err := s.d.CCGateway.CheckDraft(ctx, key, scope)
	return scope, facts, err
}

func (s *Service) connectCCGateway(c *gin.Context) {
	ctx := c.Request.Context()
	if !s.can(ctx, "account:create") {
		httpapi.Fail(c, core.ErrPermissionDenied)
		return
	}
	if s.d.CCGateway == nil {
		httpapi.Fail(c, ccgNotReady)
		return
	}
	// The shared container must be configured and authorized; per-account
	// runtimes have no shared /admin/status, each account is authorized on
	// its own after it is created (CONTRACTS §49).
	runtimes := false
	if cfg, err := s.d.CCGateway.Load(ctx); err == nil {
		runtimes = cfg.AccountRuntimes
	}
	if !runtimes && s.d.CCGateway.Ready(ctx) != nil {
		httpapi.Fail(c, ccgNotReady)
		return
	}
	var in struct {
		Name         string            `json:"name"`
		GroupIDs     []int64           `json:"group_ids"`
		Models       []string          `json:"models"`
		ModelMapping map[string]string `json:"model_mapping"`
		// The proxy a per-account runtime egresses through (required there:
		// without one the runtime stays blocked).
		ProxyID  *int64  `json:"proxy_id"`
		ProxyURL *string `json:"proxy_url"`
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, connectMaxBody)
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if in.Name == "" {
		in.Name = "CCGateway"
	}
	payload := map[string]any{"name": in.Name, "group_ids": in.GroupIDs, "models": in.Models, "model_mapping": in.ModelMapping, "plugin_key": "ccgateway", "type": "managed", "credentials": map[string]any{}}
	if in.ProxyID != nil {
		payload["proxy_id"] = *in.ProxyID
	}
	if in.ProxyURL != nil {
		payload["proxy_url"] = *in.ProxyURL
	}
	body, _ := json.Marshal(payload)
	c.Request.Body = io.NopCloser(bytes.NewReader(body))
	c.Request.ContentLength = int64(len(body))
	// account:create was checked above: create the account at that level
	// (the route itself is granted by settings:manage). create kicks the
	// runtime (kickCCGateway).
	c.Request = c.Request.WithContext(core.WithGranted(ctx, append(append([]string{}, core.Granted(ctx)...), "account:create")))
	s.create(c)
}

// ---------------------------------------------------------------- re-authorization (CONTRACTS §49.17)

// ccgReauthScope is the account range of the re-authorization endpoints
// (the §49.5 rule): settings:manage or account:update reach every account,
// account:own:update the accounts the caller created.
func ccgReauthScope(ctx context.Context) *int64 {
	if core.OwnerScope(ctx, "settings:manage") == nil {
		return nil
	}
	return core.OwnerScope(ctx, "account:update")
}

// ccgReauthAccount loads the CCGateway account of a re-authorization
// request; ok=false after the failure was written.
func (s *Service) ccgReauthAccount(c *gin.Context, ctx context.Context) (id int64, scope *int64, ok bool) {
	if id, ok = httpapi.PathID(c, "id"); !ok {
		return 0, nil, false
	}
	scope = ccgReauthScope(ctx)
	a, err := s.loadRow(ctx, s.d.DB.Pool, id, scope, false)
	if err != nil {
		httpapi.Fail(c, err)
		return 0, nil, false
	}
	if a.PluginKey != "ccgateway" {
		httpapi.Fail(c, notFound(ctx))
		return 0, nil, false
	}
	if s.d.CCGateway == nil {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("Account runtimes are not configured.").
			WithDetails(map[string]any{"reason": "not_configured"}))
		return 0, nil, false
	}
	return id, scope, true
}

// reauthorizeCCGateway serves POST /system/ccgateway/accounts/:id/reauthorize:
// validate and return the existing runtime (200 {key,in_place:true}).
// The console starts OAuth through the account endpoints, then commits status.
func (s *Service) reauthorizeCCGateway(c *gin.Context) {
	httpapi.NoStore(c)
	ctx := audit.Context(c)
	id, _, ok := s.ccgReauthAccount(c, ctx)
	if !ok {
		return
	}
	uid, _ := core.UserID(ctx)
	var request struct {
		AuthorizationMode string `json:"authorization_mode"`
	}
	if c.Request.Body != nil {
		err := json.NewDecoder(io.LimitReader(c.Request.Body, 4096)).Decode(&request)
		if err != nil && err != io.EOF {
			httpapi.Fail(c, core.ErrInvalidArgument)
			return
		}
	}
	if request.AuthorizationMode != "" && request.AuthorizationMode != "fresh" && request.AuthorizationMode != "migrate" {
		httpapi.Fail(c, core.ErrInvalidArgument)
		return
	}
	key, _, err := s.d.CCGateway.ReauthDraft(ctx, id, uid, core.OwnerScope(ctx, "settings:manage"))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if err := audit.Audit(ctx, s.d.DB.Pool, uid, "account.ccgateway_reauthorize_start", "account", itoa(id),
		map[string]any{"runtime": key, "authorization_mode": "in_place"}); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, gin.H{"key": key, "in_place": true})
}

// commitCCGatewayReauth serves POST
// /system/ccgateway/accounts/:id/reauthorize/:key/commit: verify login on the
// current runtime and reset account error, cooldown, quota and refresh state.
// The runtime mapping and data remain in place. Returns the account view.
func (s *Service) commitCCGatewayReauth(c *gin.Context) {
	httpapi.NoStore(c)
	ctx := audit.Context(c)
	id, scope, ok := s.ccgReauthAccount(c, ctx)
	if !ok {
		return
	}
	key := c.Param("key")
	uid, _ := core.UserID(ctx)
	tctx, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()
	_, err := s.d.CCGateway.CommitReauth(tctx, id, key, core.OwnerScope(ctx, "settings:manage"), func(tx pgx.Tx, retired string) error {
		a, err := s.loadRow(tctx, tx, id, scope, true)
		if err != nil {
			return err
		}
		statusReset, err := s.resetForReauth(tctx, tx, a)
		if err != nil {
			return err
		}
		cleared, err := s.clearCooldown(tctx, id)
		if err != nil {
			return err
		}
		if err := audit.Audit(tctx, tx, uid, "account.ccgateway_reauthorize", "account", itoa(id),
			map[string]any{"runtime": key, "retired": retired, "status_reset": statusReset, "cooldown_cleared": cleared}); err != nil {
			return err
		}
		evs := []core.Event{{Type: core.EventAccountUpdated, Payload: basicPayload(id, a.PluginKey, a.Type, a.Name)}}
		if statusReset || cleared {
			status := a.Status
			if statusReset {
				status = "active"
			}
			evs = append(evs, core.Event{Type: core.EventAccountStatusChanged,
				Payload: statusPayload(id, a.PluginKey, a.Type, a.Name, status, "re-authorized", nil)})
		}
		return s.d.Events.Emit(tctx, tx, evs...)
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.quota.forget(id)
	s.evictQuotaCache(ctx, id)
	s.evictBalanceCache(ctx, id)
	s.changed(ctx, id)
	v, err := s.fullView(ctx, id, scope)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, v)
}

// resetForReauth clears the core's state of a re-authorized account in tx:
// error/auto_disabled -> active, its reason, last test and quota snapshot,
// balance snapshot and credential refresh state. A manually disabled account stays
// disabled (the operator enables it, 2026-10-05), and so does one its usage
// limit disabled: new credentials do not lower its usage (CONTRACTS §73.4);
// the other automatic disable such a limit held back is dropped like any
// other (§73.3). It
// reports whether the status changed. The quota and balance caches are
// evicted outside this transaction.
func (s *Service) resetForReauth(ctx context.Context, tx pgx.Tx, a *row) (bool, error) {
	release := a.Status == "error" || a.Status == "auto_disabled" && !limitDisabled(a.Status, a.AutoDisabledSource)
	if _, err := tx.Exec(ctx, `UPDATE accounts SET
		status = CASE WHEN $2 THEN 'active' ELSE status END,
		status_reason = CASE WHEN $2 THEN '' ELSE status_reason END,
		auto_disabled_until = CASE WHEN NOT $2 AND status = 'auto_disabled' THEN auto_disabled_until END,
		deferred_auto_disable = false, deferred_auto_disable_reason = '', deferred_auto_disabled_until = NULL,
		last_test_at = NULL, last_test_ok = NULL, last_test_latency_ms = NULL, last_test_model = NULL, last_test_message = NULL,
		last_test_status = NULL, last_test_error_code = NULL, last_test_error_source = NULL,
		updated_at = clock_timestamp()
		WHERE id = $1`, a.ID, release); err != nil {
		return false, err
	}
	if err := store.ResetAccountQuota(ctx, tx, a.ID); err != nil {
		return false, err
	}
	if binding, ok := s.accountType(a.PluginKey, a.Type); ok {
		if err := s.initializeQuota(ctx, tx, a.ID, binding); err != nil {
			return false, err
		}
	}
	if _, err := tx.Exec(ctx, `DELETE FROM account_balances WHERE account_id = $1`, a.ID); err != nil {
		return false, err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM account_credential_refresh WHERE account_id = $1`, a.ID); err != nil {
		return false, err
	}
	return release, nil
}
