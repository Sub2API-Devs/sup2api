package ccgateway

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
)

// Runtime keys (CONTRACTS §49.7): an account's runtime is named after the
// draft key it adopted, else after the account id.
var (
	accountKeyPattern = regexp.MustCompile(`^[1-9][0-9]{0,17}$`)
	draftKeyPattern   = regexp.MustCompile(`^d[0-9a-f]{16}$`)
)

func isDraftKey(key string) bool { return draftKeyPattern.MatchString(key) }

var (
	// errNotConfigured: account runtimes are off (or the configuration
	// cannot be read). errUnreachable: the controller cannot be reached.
	// Both are reported as details.reason = not_configured.
	errNotConfigured = errors.New("account runtimes are not configured")
	errUnreachable   = errors.New("account runtime controller unreachable")
)

type accountDesired struct {
	Network  RuntimeNetwork    `json:"network"`
	Revision string            `json:"revision"`
	Enabled  bool              `json:"enabled"`
	Proxy    map[string]any    `json:"proxy"`
	Auth     map[string]string `json:"auth,omitempty"`
	Kind     string            `json:"-"`
	// Blocked says why a disabled runtime is blocked: account_disabled,
	// no_proxy or proxy_disabled (the controller has no direct fallback).
	Blocked string `json:"-"`
	// Key is the runtime key: the adopted draft key or the account id.
	Key string `json:"-"`
	// AccountID is 0 for a draft that is not adopted yet.
	AccountID int64 `json:"-"`
}

// proxyDesired decrypts the proxy password and builds the controller's
// proxy object.
func (s *Service) proxyDesired(spec core.ProxySpec, password []byte) (map[string]any, error) {
	if len(password) > 0 {
		plain, e := s.Cipher.Decrypt(password, []byte("proxy"))
		if e != nil {
			return nil, e
		}
		spec.Password = string(plain)
	}
	return map[string]any{"protocol": spec.Protocol, "host": spec.Host, "port": spec.Port, "username": spec.Username, "password": spec.Password}, nil
}

func revisionOf(version string) string {
	sum := sha256.Sum256([]byte(version))
	return hex.EncodeToString(sum[:])
}

// desired reads authoritative state: request forwarding never reconfigures an
// egress and never trusts the scheduler's cached proxy binding.
func (s *Service) desired(ctx context.Context, id int64, credentials bool) (accountDesired, error) {
	return s.desiredIn(ctx, s.DB.Pool, id, credentials)
}

// desiredIn is desired read through q (a transaction sees its own changes).
func (s *Service) desiredIn(ctx context.Context, q store.Querier, id int64, credentials bool) (accountDesired, error) {
	var d accountDesired
	var version string
	var spec core.ProxySpec
	var password, accountCredentials []byte
	err := q.QueryRow(ctx, `SELECT
  a.deleted_at IS NULL AND a.status <> 'disabled' AND COALESCE(p.status <> 'disabled',false),
  CASE WHEN a.deleted_at IS NOT NULL OR a.status = 'disabled' THEN 'account_disabled'
       WHEN p.id IS NULL THEN 'no_proxy' WHEN p.status = 'disabled' THEN 'proxy_disabled' ELSE '' END,
  concat_ws('|',a.id,a.type,a.proxy_id,a.status,a.deleted_at,p.updated_at,p.status,encode(a.credentials_enc,'hex')),
  COALESCE(p.protocol,''),COALESCE(p.host,''),COALESCE(p.port,0),COALESCE(p.username,''),p.password_enc,a.type,a.credentials_enc,
  COALESCE(r.key, a.id::text)
  FROM accounts a LEFT JOIN proxies p ON p.id=a.proxy_id LEFT JOIN ccgateway_runtimes r ON r.account_id=a.id
  WHERE a.id=$1 AND a.plugin_key='ccgateway' AND a.type IN ('managed','apikey')`, id).
		Scan(&d.Enabled, &d.Blocked, &version, &spec.Protocol, &spec.Host, &spec.Port, &spec.Username, &password, &d.Kind, &accountCredentials, &d.Key)
	if err != nil {
		return d, err
	}
	d.AccountID = id
	d.Revision = revisionOf(version)
	if d.Enabled && credentials {
		d.Auth = map[string]string{"mode": "oauth"}
		if d.Kind == "apikey" {
			plain, err := s.Cipher.Decrypt(accountCredentials, []byte("account:ccgateway"))
			if err != nil {
				return d, errors.New("cannot decrypt account credentials")
			}
			var auth map[string]string
			if json.Unmarshal(plain, &auth) != nil || auth["api_key"] == "" {
				return d, errors.New("invalid account credentials")
			}
			d.Auth = map[string]string{"mode": "api_key", "api_key": auth["api_key"], "base_url": auth["base_url"]}
		}
		if d.Proxy, err = s.proxyDesired(spec, password); err != nil {
			return d, err
		}
	}
	return s.desiredNetwork(ctx, q, d)
}

// draftDesired is the desired state of a draft that is not adopted (nor
// retired) yet: a managed (OAuth) runtime egressing through the draft's
// proxy. The revision only depends on the draft key and the proxy, so every
// node computes the same one. A retired runtime has no desired state: it is
// never reconfigured, only deleted by the sweep.
func (s *Service) draftDesired(ctx context.Context, key string, credentials bool) (accountDesired, error) {
	d := accountDesired{Kind: "managed", Key: key}
	var version string
	var spec core.ProxySpec
	var password []byte
	err := s.DB.Pool.QueryRow(ctx, `SELECT
  COALESCE(p.status <> 'disabled',false),
  CASE WHEN p.id IS NULL THEN 'no_proxy' WHEN p.status = 'disabled' THEN 'proxy_disabled' ELSE '' END,
  concat_ws('|','draft',r.key,r.proxy_id,p.updated_at,p.status),
  COALESCE(p.protocol,''),COALESCE(p.host,''),COALESCE(p.port,0),COALESCE(p.username,''),p.password_enc
  FROM ccgateway_runtimes r LEFT JOIN proxies p ON p.id=r.proxy_id
  WHERE r.key=$1 AND r.account_id IS NULL AND r.retired_at IS NULL`, key).
		Scan(&d.Enabled, &d.Blocked, &version, &spec.Protocol, &spec.Host, &spec.Port, &spec.Username, &password)
	if err != nil {
		return d, err
	}
	d.Revision = revisionOf(version)
	if d.Enabled && credentials {
		d.Auth = map[string]string{"mode": "oauth"}
		if d.Proxy, err = s.proxyDesired(spec, password); err != nil {
			return d, err
		}
	}
	return s.desiredNetwork(ctx, s.DB.Pool, d)
}

// resolveKey maps an account id to its runtime key (the adopted draft key,
// else the id itself); a draft key is returned unchanged. Only the row the
// account currently uses counts (account_id): a runtime retired by a
// re-authorization never resolves.
func (s *Service) resolveKey(ctx context.Context, key string) (string, error) {
	if isDraftKey(key) {
		return key, nil
	}
	if !accountKeyPattern.MatchString(key) {
		return "", fmt.Errorf("invalid runtime key %q", key)
	}
	id, _ := strconv.ParseInt(key, 10, 64)
	e := s.DB.Pool.QueryRow(ctx, `SELECT COALESCE((SELECT key FROM ccgateway_runtimes WHERE account_id=$1), $1::bigint::text)`, id).Scan(&key)
	return key, e
}

// desiredKey is the desired state of a resolved runtime key: the account
// that adopted the draft, the draft itself, or the account with that id.
func (s *Service) desiredKey(ctx context.Context, key string, credentials bool) (accountDesired, error) {
	if !isDraftKey(key) {
		id, e := strconv.ParseInt(key, 10, 64)
		if e != nil {
			return accountDesired{}, e
		}
		d, e := s.desired(ctx, id, credentials)
		if e == nil && d.Key != key {
			return d, fmt.Errorf("account %d uses runtime %s", id, d.Key)
		}
		return d, e
	}
	var accountID *int64
	if e := s.DB.Pool.QueryRow(ctx, `SELECT account_id FROM ccgateway_runtimes WHERE key=$1`, key).Scan(&accountID); e != nil {
		return accountDesired{}, e
	}
	if accountID != nil {
		return s.desired(ctx, *accountID, credentials)
	}
	return s.draftDesired(ctx, key, credentials)
}

// runtimeRequest calls /accounts/<key>/<path> on the controller (path ""
// addresses the runtime itself). header holds extra name/value pairs.
func (s *Service) runtimeRequest(ctx context.Context, key, method, path string, body []byte, revision string, header ...string) (*http.Response, func() error, error) {
	cfg, e := s.Load(ctx)
	if e != nil || !cfg.AccountRuntimes {
		return nil, nil, errNotConfigured
	}
	client, base, close, e := s.open(ctx, cfg)
	if e != nil {
		return nil, nil, fmt.Errorf("%w: %v", errUnreachable, e)
	}
	target := base + "/accounts/" + key
	if path != "" {
		target += "/" + path
	}
	req, e := http.NewRequestWithContext(ctx, method, target, bytes.NewReader(body))
	if e != nil {
		close()
		return nil, nil, e
	}
	req.Header.Set("Authorization", "Bearer "+cfg.AdminKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CCG-Revision", revision)
	for i := 0; i+1 < len(header); i += 2 {
		req.Header.Set(header[i], header[i+1])
	}
	res, e := client.Do(req)
	if e != nil {
		close()
		return nil, nil, fmt.Errorf("%w: %v", errUnreachable, e)
	}
	return res, close, nil
}

// lockSQL takes the per-runtime advisory lock of the current transaction.
// The key text is the account id for runtimes named after their account, as
// before runtime keys existed, so mixed-version nodes still serialize.
const (
	tryLockSQL = `SELECT pg_try_advisory_xact_lock(hashtextextended('ccg-account:' || $1::text,0))`
	lockSQL    = `SELECT true FROM (SELECT pg_advisory_xact_lock(hashtextextended('ccg-account:' || $1::text,0))) l`
)

// Reconcile is a control-plane operation for one runtime: key is a runtime
// key or an account id (resolved to the account's runtime key). Multiple
// core nodes serialize via a PG advisory lock held across read/apply,
// preventing stale writes to Docker.
func (s *Service) Reconcile(ctx context.Context, key string) error {
	key, e := s.resolveKey(ctx, key)
	if e != nil {
		return e
	}
	conn, e := s.DB.Pool.Acquire(ctx)
	if e != nil {
		return e
	}
	defer conn.Release()
	tx, e := conn.Begin(ctx)
	if e != nil {
		return e
	}
	defer func() {
		cleanup, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = tx.Rollback(cleanup)
	}()
	var locked bool
	if e = tx.QueryRow(ctx, tryLockSQL, key).Scan(&locked); e != nil {
		return e
	}
	if !locked {
		return nil
	}
	d, e := s.desiredKey(ctx, key, true)
	if e != nil {
		return e
	}
	// Check remote readiness without rewriting an unchanged configuration.
	res, close, e := s.runtimeRequest(ctx, key, "GET", "status", nil, "")
	if e == nil {
		var status struct {
			Status   string `json:"status"`
			Revision string `json:"revision"`
		}
		_ = json.NewDecoder(res.Body).Decode(&status)
		res.Body.Close()
		close()
		if d.Enabled && status.Status == "ready" && status.Revision == d.Revision {
			return nil
		}
	}
	return s.putConfig(ctx, key, d)
}

// putConfig applies d to the runtime key on the controller (PUT config).
func (s *Service) putConfig(ctx context.Context, key string, d accountDesired) error {
	body, _ := json.Marshal(d)
	res, close, e := s.runtimeRequest(ctx, key, "PUT", "config", body, "")
	if e != nil {
		return e
	}
	defer close()
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return errors.New("account runtime synchronization failed")
	}
	return nil
}

// Kick asks this node to reconcile one runtime now instead of waiting for
// the next sweep (account create/update, draft create/update). key is a
// runtime key or an account id. It never blocks; a full queue is dropped
// because the sweep still covers the runtime within seconds.
func (s *Service) Kick(key string) {
	select {
	case s.kick <- key:
	default:
	}
}

// reconcileKicked serves Kick on its own goroutine so a long sweep (each
// runtime may take up to 90 s) does not delay a freshly created one.
func (s *Service) reconcileKicked(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case key := <-s.kick:
			if cfg, e := s.Load(ctx); e != nil || !cfg.AccountRuntimes {
				continue
			}
			c, cancel := context.WithTimeout(ctx, 90*time.Second)
			if e := s.Reconcile(c, key); e != nil && ctx.Err() == nil {
				slog.Warn("CCGateway runtime reconcile failed", "key", key, "err", e)
			}
			cancel()
		}
	}
}

// runtimeKeys lists every runtime the core wants on the controller: one per
// ccgateway account (deleted and disabled ones too, so they get blocked) and
// one per draft that is not adopted yet (re-authorization drafts included).
// Retired runtimes are left alone until the sweep deletes them.
func (s *Service) runtimeKeys(ctx context.Context) ([]string, error) {
	rows, e := s.DB.Pool.Query(ctx, `SELECT COALESCE(r.key, a.id::text) FROM accounts a
  LEFT JOIN ccgateway_runtimes r ON r.account_id=a.id
  WHERE a.plugin_key='ccgateway' AND a.type IN ('managed','apikey')
  UNION ALL SELECT key FROM ccgateway_runtimes WHERE account_id IS NULL AND retired_at IS NULL
  ORDER BY 1`)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	var keys []string
	for rows.Next() {
		var key string
		if rows.Scan(&key) == nil {
			keys = append(keys, key)
		}
	}
	return keys, rows.Err()
}

func (s *Service) Run(ctx context.Context) {
	if s.kick != nil {
		go s.reconcileKicked(ctx)
	}
	go s.runSweep(ctx)
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			cfg, e := s.Load(ctx)
			if e != nil || !cfg.AccountRuntimes {
				continue
			}
			keys, e := s.runtimeKeys(ctx)
			if e != nil {
				continue
			}
			for _, key := range keys {
				c, cancel := context.WithTimeout(ctx, 90*time.Second)
				_ = s.Reconcile(c, key)
				cancel()
				if ctx.Err() != nil {
					return
				}
			}
		}
	}
}

// startRetryFor / startRetryEvery bound the "start" retry in serveRuntime.
var (
	startRetryFor   = 30 * time.Second
	startRetryEvery = 2 * time.Second
)

// callerScope is nil when the caller holds one of allKeys (it manages every
// account runtime), otherwise the caller id: only accounts it created
// (CONTRACTS §49.5, the account ownership rule of §21.1).
func callerScope(ctx context.Context, allKeys ...string) *int64 {
	for _, k := range allKeys {
		if core.OwnerScope(ctx, k) == nil {
			return nil
		}
	}
	uid, _ := core.UserID(ctx)
	return &uid
}

// accountManage serves /system/ccgateway/accounts/:id/:action for settings
// administrators and for whoever may read (GET) or update (POST) the account
// itself; own-level callers only reach accounts they created, others are 404.
// Arbitrary remote paths are never accepted.
func (s *Service) accountManage(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	id, e := strconv.ParseInt(c.Param("id"), 10, 64)
	if e != nil || id <= 0 {
		httpapi.Fail(c, core.ErrInvalidArgument)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 90*time.Second)
	defer cancel()
	allKeys := []string{"settings:manage", "account:update"}
	if c.Request.Method == "GET" {
		allKeys = []string{"settings:read", "account:read"}
	}
	if scope := callerScope(ctx, allKeys...); scope != nil {
		var mine bool
		if e = s.DB.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM accounts
			WHERE id = $1 AND deleted_at IS NULL AND created_by = $2)`, id, *scope).Scan(&mine); e != nil || !mine {
			httpapi.Fail(c, core.ErrNotFound)
			return
		}
	}
	d, e := s.desired(ctx, id, false)
	if e != nil {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	s.serveRuntime(c, ctx, d, false)
}

// serveRuntime runs one :action on the runtime of d, for an account
// (accountManage) or a draft (draftAction).
func (s *Service) serveRuntime(c *gin.Context, ctx context.Context, d accountDesired, draft bool) {
	action := c.Param("action")
	read := action == "status" || action == "health" || action == "session"
	if (c.Request.Method == "GET") != read {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	var path string
	switch action {
	case "sync":
		if e := s.Reconcile(ctx, d.Key); e != nil {
			reason := "sync_failed"
			if errors.Is(e, errNotConfigured) || errors.Is(e, errUnreachable) {
				reason = "not_configured"
			}
			httpapi.Fail(c, reasonError(core.ErrUnavailable, reason))
			return
		}
		if !d.Enabled {
			// The controller stopped the runtime; polling status would
			// otherwise show "pending" forever.
			httpapi.OK(c, map[string]any{"synced": true, "status": "blocked", "reason": d.Blocked})
			return
		}
		httpapi.OK(c, map[string]any{"synced": true})
		return
	case "status":
		s.serveStatus(c, ctx, d, draft)
		return
	case "health":
		path = "admin/status"
	case "session":
		path = "admin/auth/session"
	case "start", "complete", "cancel", "logout":
		if draft && action == "logout" {
			httpapi.Fail(c, core.ErrNotFound)
			return
		}
		if d.Kind != "managed" {
			httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "api_key_account"))
			return
		}
		path = "admin/auth/" + action
	default:
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	if !d.Enabled {
		// The controller stopped the runtime: say why instead of a 409.
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, d.Blocked))
		return
	}
	var raw []byte
	if !read {
		var e error
		raw, e = io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 8192))
		if e != nil {
			httpapi.Fail(c, core.ErrInvalidArgument)
			return
		}
		// Only a JSON object is forwarded (empty means {}).
		body := map[string]any{}
		if len(bytes.TrimSpace(raw)) > 0 && json.Unmarshal(raw, &body) != nil {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("The request body must be a JSON object."))
			return
		}
		raw, _ = json.Marshal(body)
	}
	res, close, e := s.runtimeRequest(ctx, d.Key, c.Request.Method, path, raw, d.Revision)
	if action == "start" {
		// Right after the runtime turns ready the controller may still answer
		// 409 (revision not recorded yet) or 503 (the app's HTTP server is not
		// listening yet). Neither reached the CLI, so retrying cannot open a
		// second login session; any other answer is final.
		deadline := time.Now().Add(startRetryFor)
		for e == nil && (res.StatusCode == http.StatusConflict || res.StatusCode == http.StatusServiceUnavailable) &&
			time.Now().Add(startRetryEvery).Before(deadline) {
			res.Body.Close()
			close()
			select {
			case <-ctx.Done():
				httpapi.Fail(c, reasonError(core.ErrUnavailable, "not_synchronized"))
				return
			case <-time.After(startRetryEvery):
			}
			res, close, e = s.runtimeRequest(ctx, d.Key, c.Request.Method, path, raw, d.Revision)
		}
	}
	if e != nil {
		httpapi.Fail(c, transportError(e))
		return
	}
	defer close()
	defer res.Body.Close()
	raw, e = io.ReadAll(io.LimitReader(res.Body, 65537))
	if e != nil || len(raw) > 65536 {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	if res.StatusCode != 200 {
		if action == "session" && res.StatusCode == http.StatusNotFound {
			// A business container without GET /admin/auth/session (older
			// image) has no session to resume.
			httpapi.OK(c, nil)
			return
		}
		httpapi.Fail(c, runtimeError(res.StatusCode, raw))
		return
	}
	var out any
	switch action {
	case "health":
		out, e = safeResult("/status", raw)
	case "session":
		out, e = sessionResult(raw)
	case "start":
		out, e = safeResult("/auth/start", raw)
	default:
		out, e = safeResult("/auth/"+action, raw)
	}
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	if c.Request.Method != "GET" {
		if draft {
			s.record(c, "draft."+d.Key+"."+action)
		} else {
			s.record(c, "account."+strconv.FormatInt(d.AccountID, 10)+"."+action)
		}
	}
	httpapi.OK(c, out)
}

// serveStatus answers GET .../status. Accounts: {account_id, key, container,
// status: ready|pending|blocked, revision, reason?}. Drafts: {key, container,
// status: creating|ready|blocked, reason?}.
func (s *Service) serveStatus(c *gin.Context, ctx context.Context, d accountDesired, draft bool) {
	accountID := strconv.FormatInt(d.AccountID, 10)
	if !d.Enabled {
		if draft {
			httpapi.OK(c, map[string]string{"key": d.Key, "container": "", "status": "blocked", "reason": d.Blocked})
			return
		}
		httpapi.OK(c, map[string]string{"account_id": accountID, "key": d.Key, "container": "", "status": "blocked", "revision": "", "reason": d.Blocked})
		return
	}
	res, close, e := s.runtimeRequest(ctx, d.Key, "GET", "status", nil, d.Revision)
	if e != nil {
		httpapi.Fail(c, transportError(e))
		return
	}
	defer close()
	defer res.Body.Close()
	raw, e := io.ReadAll(io.LimitReader(res.Body, 65537))
	if e != nil || len(raw) > 65536 {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	if res.StatusCode != 200 {
		httpapi.Fail(c, runtimeError(res.StatusCode, raw))
		return
	}
	var status struct {
		Container string `json:"container"`
		Status    string `json:"status"`
		Revision  string `json:"revision"`
	}
	if json.Unmarshal(raw, &status) != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	if draft {
		out := "creating"
		if status.Status == "ready" && status.Revision == d.Revision {
			out = "ready"
		}
		httpapi.OK(c, map[string]string{"key": d.Key, "container": status.Container, "status": out})
		return
	}
	if status.Revision != d.Revision {
		status.Status = "pending"
	}
	httpapi.OK(c, map[string]string{"account_id": accountID, "key": d.Key, "container": status.Container, "status": status.Status, "revision": status.Revision})
}
