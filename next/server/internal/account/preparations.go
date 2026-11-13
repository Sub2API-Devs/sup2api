package account

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"slices"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

// maxOpenDrafts is how many open preparations one user may hold (W1-F13);
// a caller with the full account:create is not limited. A preparation takes
// its resource (a runtime container) until it is adopted, cancelled or
// expires.
const maxOpenDrafts = 3

func (s *Service) registerPreparationRoutes(r *httpapi.Router) {
	permissions := []string{"account:create", "account:own:create"}
	r.PermAny("POST", "/account-types/:plugin_key/:type/preparations", s.createPreparation, permissions...)
	r.PermAny("GET", "/account-preparations/:key/:action", s.preparationAction, permissions...)
	r.PermAny("POST", "/account-preparations/:key/:action", s.preparationAction, permissions...)
	r.PermAny("DELETE", "/account-preparations/:key", s.cancelPreparation, permissions...)
	r.PermAny("PUT", "/account-preparations/:key", s.updatePreparation, permissions...)
}

func (s *Service) preparationResource(p core.AccountPreparation) (core.AccountLifecycleResource, error) {
	resource := s.d.LifecycleResources[p.PluginKey]
	if resource == nil {
		return nil, core.ErrUnavailable.WithMessage("Account preparation resource is unavailable")
	}
	return resource, nil
}

func (s *Service) preparationCallback(ctx context.Context, p core.AccountPreparation, phase, action string) error {
	binding, ok := s.accountType(p.PluginKey, p.Type)
	if !ok || binding.Type.Lifecycle == nil || !binding.Type.Lifecycle.Preparation {
		return core.ErrPluginUnavailable
	}
	result, err := s.accountLifecycle(ctx, binding, &pluginv1.AccountLifecycleRequest{
		Phase: phase, Action: action, PreparationKey: p.Key,
		Caller:  &pluginv1.Caller{UserId: p.CreatedBy},
		Account: &pluginv1.Account{Type: p.Type, SettingsJson: string(p.Settings), Properties: &pluginv1.AccountProperties{ProxyId: p.ProxyID}},
	})
	if err != nil {
		return err
	}
	if result == nil || !result.RunResource {
		return core.ErrUnavailable.WithMessage("Plugin did not approve account preparation")
	}
	return nil
}

func (s *Service) createPreparation(c *gin.Context) {
	ctx := audit.Context(c)
	binding, ok := s.accountType(c.Param("plugin_key"), c.Param("type"))
	if !ok || binding.Type.Lifecycle == nil || !binding.Type.Lifecycle.Preparation {
		httpapi.Fail(c, core.ErrUnsupported)
		return
	}
	if err := s.checkCustomUpstream(ctx, core.OwnerScope(ctx, "account:create"), binding); err != nil {
		httpapi.Fail(c, err)
		return
	}
	var in struct {
		ProxyID        *int64          `json:"proxy_id"`
		Settings       json.RawMessage `json:"settings"`
		IdempotencyKey string          `json:"idempotency_key"`
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 65536)
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if err := checkRefs(ctx, s.d.DB.Pool, in.ProxyID, s.proxyRangeFor(ctx, "account:create")); err != nil {
		httpapi.Fail(c, err)
		return
	}
	if len(in.IdempotencyKey) > 128 {
		httpapi.Fail(c, core.ErrInvalidArgument)
		return
	}
	settings, err := s.mergeExtensions(ctx, binding, []byte("{}"), in.Settings)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	var random [8]byte
	if _, err = rand.Read(random[:]); err != nil {
		httpapi.Fail(c, err)
		return
	}
	uid, _ := core.UserID(ctx)
	p := core.AccountPreparation{Key: "d" + hex.EncodeToString(random[:]), PluginKey: binding.Plugin.Key, Type: binding.Type.ID, ProxyID: in.ProxyID, Settings: settings, CreatedBy: uid}
	resource, err := s.preparationResource(p)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	limit := maxOpenDrafts
	if core.OwnerScope(ctx, "account:create") == nil {
		limit = 0 // no limit
	}
	var fresh bool // this request inserted the row
	err = s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		var matches, active bool
		// The count and the insert are one statement, without a lock: two
		// concurrent requests may leave one preparation over the limit. A
		// repeated idempotency key is not a new preparation and passes.
		err := tx.QueryRow(ctx, `INSERT INTO account_preparations(key,plugin_key,account_type,proxy_id,settings,created_by,idempotency_key)
			SELECT $1,$2::text,$3::text,$4,$5::jsonb,$6::bigint,NULLIF($7::text,'')
			WHERE $8::int = 0
				OR (SELECT count(*) FROM account_preparations WHERE created_by=$6::bigint AND account_id IS NULL AND state IN ('pending','ready') AND expires_at>now()) < $8::int
				OR EXISTS (SELECT 1 FROM account_preparations WHERE created_by=$6::bigint AND plugin_key=$2::text AND account_type=$3::text AND idempotency_key=NULLIF($7::text,''))
			ON CONFLICT (created_by,plugin_key,account_type,idempotency_key) DO UPDATE SET last_seen_at=now()
			RETURNING key,settings=$5::jsonb AND proxy_id IS NOT DISTINCT FROM $4::bigint,account_id IS NULL AND state IN ('pending','ready') AND expires_at>now(),xmax=0`,
			p.Key, p.PluginKey, p.Type, p.ProxyID, p.Settings, uid, in.IdempotencyKey, limit).Scan(&p.Key, &matches, &active, &fresh)
		if store.IsNoRows(err) {
			return core.ErrTooManyDrafts
		}
		if err != nil {
			return err
		}
		if !matches || !active {
			return core.ErrConflict.WithMessage("Preparation key was already used with another configuration or is no longer available")
		}
		return audit.Audit(ctx, tx, uid, "account.prepare", "account_preparation", p.Key, map[string]any{"plugin_key": p.PluginKey, "type": p.Type})
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	ctx, release, err := s.lockPreparation(ctx, p.Key)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer release()
	if loaded, e := s.loadPreparation(ctx, p.Key); e != nil {
		err = e
	} else {
		p = loaded
		err = s.preparationCallback(ctx, p, "prepare", "")
	}
	if err == nil {
		err = resource.PrepareAccount(ctx, p)
	}
	if err != nil {
		if fresh {
			s.abandonPreparation(ctx, resource, p)
		}
		httpapi.Fail(c, err)
		return
	}
	httpapi.Created(c, gin.H{"key": p.Key})
}

// abandonPreparation gives back the slot of a preparation whose first
// prepare failed (the caller holds its lock): the key was never returned, so
// nobody could cancel it and it would count against maxOpenDrafts until the
// sweep. The row goes once the resource dropped what it may have started;
// otherwise it stays cancelling, which no longer counts, for the sweep.
func (s *Service) abandonPreparation(ctx context.Context, resource core.AccountLifecycleResource, p core.AccountPreparation) {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 30*time.Second)
	defer cancel()
	_, err := s.d.DB.Pool.Exec(ctx, `UPDATE account_preparations SET state='cancelling' WHERE key=$1 AND account_id IS NULL AND state='pending'`, p.Key)
	if err == nil {
		err = resource.CancelAccountPreparation(ctx, p)
	}
	if err == nil {
		_, err = s.d.DB.Pool.Exec(ctx, `DELETE FROM account_preparations WHERE key=$1 AND account_id IS NULL AND state='cancelling'`, p.Key)
	}
	if err != nil {
		slog.WarnContext(ctx, "account: abandon failed preparation", "key", p.Key, "err", err)
	}
}

func (s *Service) loadPreparation(ctx context.Context, key string) (core.AccountPreparation, error) {
	var p core.AccountPreparation
	uid, _ := core.UserID(ctx)
	err := s.d.DB.Pool.QueryRow(ctx, `UPDATE account_preparations SET last_seen_at=now() WHERE key=$1 AND created_by=$2 AND account_id IS NULL AND state IN ('pending','ready') AND expires_at>now() RETURNING key,plugin_key,account_type,proxy_id,settings,created_by`, key, uid).
		Scan(&p.Key, &p.PluginKey, &p.Type, &p.ProxyID, &p.Settings, &p.CreatedBy)
	if store.IsNoRows(err) {
		return p, core.ErrNotFound
	}
	return p, err
}

func (s *Service) preparationAction(c *gin.Context) {
	ctx, cancel := context.WithTimeout(audit.Context(c), 90*time.Second)
	defer cancel()
	action := c.Param("action")
	read := slices.Contains([]string{"status", "health", "session"}, action)
	if (!read && !slices.Contains([]string{"sync", "start", "complete", "cancel"}, action)) || (c.Request.Method == "GET") != read {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	p, err := s.loadPreparation(ctx, c.Param("key"))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	ctx, release, err := s.lockPreparation(ctx, p.Key)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer release()
	payload := json.RawMessage("{}")
	if !read {
		payload, err = io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 8192))
		var object map[string]json.RawMessage
		if len(payload) == 0 {
			payload = json.RawMessage("{}")
		}
		if err != nil || json.Unmarshal(payload, &object) != nil || object == nil {
			httpapi.Fail(c, core.ErrInvalidArgument)
			return
		}
	}
	if err := s.preparationCallback(ctx, p, "action", action); err != nil {
		httpapi.Fail(c, err)
		return
	}
	resource, err := s.preparationResource(p)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	result, err := resource.AccountPreparationAction(ctx, p, c.Request.Method, action, payload)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if !read {
		uid, _ := core.UserID(ctx)
		if err := audit.Audit(ctx, s.d.DB.Pool, uid, "account.preparation."+action, "account_preparation", p.Key, nil); err != nil {
			httpapi.Fail(c, err)
			return
		}
	}
	httpapi.OK(c, result)
}

func (s *Service) updatePreparation(c *gin.Context) {
	ctx := audit.Context(c)
	p, err := s.loadPreparation(ctx, c.Param("key"))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	ctx, release, err := s.lockPreparation(ctx, p.Key)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer release()
	var in struct {
		ProxyID *int64 `json:"proxy_id"`
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if err := checkRefs(ctx, s.d.DB.Pool, in.ProxyID, s.proxyRangeFor(ctx, "account:create")); err != nil {
		httpapi.Fail(c, err)
		return
	}
	p.ProxyID = in.ProxyID
	if err := s.preparationCallback(ctx, p, "prepare", ""); err != nil {
		httpapi.Fail(c, err)
		return
	}
	resource, err := s.preparationResource(p)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	err = s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE account_preparations SET proxy_id=$2,last_seen_at=now() WHERE key=$1 AND created_by=$3 AND account_id IS NULL AND state IN ('pending','ready') AND expires_at>now()`, p.Key, p.ProxyID, p.CreatedBy)
		if err != nil {
			return err
		}
		if tag.RowsAffected() != 1 {
			return core.ErrConflict
		}
		if err := resource.UpdateAccountPreparation(ctx, tx, p); err != nil {
			return err
		}
		return audit.Audit(ctx, tx, p.CreatedBy, "account.preparation.update", "account_preparation", p.Key, map[string]any{"fields": []string{"proxy_id"}})
	})
	if err == nil {
		_, err = resource.AccountPreparationAction(ctx, p, "POST", "sync", json.RawMessage("{}"))
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, gin.H{"key": p.Key})
}

func (s *Service) cancelPreparation(c *gin.Context) {
	ctx := audit.Context(c)
	uid, _ := core.UserID(ctx)
	var p core.AccountPreparation
	err := s.d.DB.Pool.QueryRow(ctx, `SELECT key,plugin_key,account_type,proxy_id,settings,created_by FROM account_preparations WHERE key=$1 AND created_by=$2 AND account_id IS NULL AND state IN ('pending','ready','cancelling')`, c.Param("key"), uid).
		Scan(&p.Key, &p.PluginKey, &p.Type, &p.ProxyID, &p.Settings, &p.CreatedBy)
	if store.IsNoRows(err) {
		err = core.ErrNotFound
	}
	if err == nil {
		err = s.preparationCallback(ctx, p, "cancel", "")
	}
	if err == nil {
		err = audit.Audit(ctx, s.d.DB.Pool, uid, "account.preparation.cancel", "account_preparation", p.Key, nil)
	}
	if err == nil {
		err = s.disposePreparation(ctx, p, false)
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.NoContent(c)
}

func (s *Service) lockPreparation(ctx context.Context, key string) (context.Context, func(), error) {
	if s.d.Locker == nil {
		return ctx, func() {}, nil
	}
	lock, ok, err := s.d.Locker.TryLock(ctx, "account:preparation:"+key, 2*time.Minute)
	if err != nil {
		return ctx, nil, err
	}
	if !ok {
		return ctx, nil, core.ErrConflict.WithMessage("Account preparation is busy; retry shortly")
	}
	ctx, cancel := core.KeepLock(ctx, lock)
	return ctx, func() { cancel(); lock.Release() }, nil
}

func (s *Service) disposePreparation(ctx context.Context, p core.AccountPreparation, expiredOnly bool) error {
	ctx, release, err := s.lockPreparation(ctx, p.Key)
	if err != nil {
		return err
	}
	defer release()
	resource, err := s.preparationResource(p)
	if err != nil {
		return err
	}
	tag, err := s.d.DB.Pool.Exec(ctx, `UPDATE account_preparations SET state='cancelling' WHERE key=$1 AND account_id IS NULL AND state IN ('pending','ready','cancelling') AND (NOT $2 OR state='cancelling' OR expires_at<=now() OR last_seen_at<now()-interval '15 minutes')`, p.Key, expiredOnly)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		if expiredOnly {
			return nil
		}
		return core.ErrConflict
	}
	if err := resource.CancelAccountPreparation(ctx, p); err != nil {
		return err
	}
	_, err = s.d.DB.Pool.Exec(ctx, `UPDATE account_preparations SET state='cancelled' WHERE key=$1 AND account_id IS NULL AND state='cancelling'`, p.Key)
	return err
}

// checkPreparationForCreate checks the preparation_key of POST /accounts and
// returns what the preparation observed of the account (CONTRACTS §59).
func (s *Service) checkPreparationForCreate(ctx context.Context, bt core.AccountTypeBinding, in *input, settings []byte) (*core.AccountPreparation, core.AccountPreparationFacts, error) {
	var none core.AccountPreparationFacts
	if in.PreparationKey == nil {
		if bt.Type.Lifecycle != nil && bt.Type.Lifecycle.Required && in.CCGatewayRuntime == nil {
			return nil, none, core.ErrInvalidArgument.WithMessage("Account preparation is required")
		}
		return nil, none, nil
	}
	if in.CCGatewayRuntime != nil || in.ProxyURL != nil {
		return nil, none, core.ErrInvalidArgument.WithMessage("Preparation cannot be combined with another runtime or proxy URL")
	}
	p, err := s.loadPreparation(ctx, *in.PreparationKey)
	if err != nil {
		return nil, none, err
	}
	proxyMatches := p.ProxyID == nil && !in.ProxyID.Valid || p.ProxyID != nil && in.ProxyID.Valid && *p.ProxyID == in.ProxyID.V
	if p.PluginKey != bt.Plugin.Key || p.Type != bt.Type.ID || !proxyMatches {
		return nil, none, core.ErrInvalidArgument.WithMessage("Preparation does not match this account")
	}
	var equal bool
	if err := s.d.DB.Pool.QueryRow(ctx, `SELECT $1::jsonb=$2::jsonb`, p.Settings, settings).Scan(&equal); err != nil {
		return nil, none, err
	}
	if !equal {
		return nil, none, core.ErrConflict.WithMessage("Preparation settings changed; prepare a new runtime first")
	}
	if err := s.preparationCallback(ctx, p, "check", ""); err != nil {
		return nil, none, err
	}
	resource, err := s.preparationResource(p)
	if err != nil {
		return nil, none, err
	}
	facts, err := resource.CheckAccountPreparation(ctx, p)
	if err != nil {
		return nil, none, err
	}
	return &p, facts, nil
}

func (s *Service) adoptPreparation(ctx context.Context, tx pgx.Tx, p core.AccountPreparation, id int64) error {
	tag, err := tx.Exec(ctx, `UPDATE account_preparations SET state='adopted',account_id=$2 WHERE key=$1 AND created_by=$3 AND account_id IS NULL AND state IN ('pending','ready') AND expires_at>now() AND proxy_id IS NOT DISTINCT FROM $4::bigint AND settings=$5::jsonb`, p.Key, id, p.CreatedBy, p.ProxyID, p.Settings)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return core.ErrConflict.WithMessage("Account preparation is no longer available")
	}
	resource, err := s.preparationResource(p)
	if err != nil {
		return err
	}
	return resource.AdoptAccountPreparation(ctx, tx, p, id)
}
