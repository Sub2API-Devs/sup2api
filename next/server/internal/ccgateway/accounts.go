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
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

type accountDesired struct {
	Revision string            `json:"revision"`
	Enabled  bool              `json:"enabled"`
	Proxy    map[string]any    `json:"proxy"`
	Auth     map[string]string `json:"auth,omitempty"`
	Kind     string            `json:"-"`
	// Blocked says why a disabled runtime is blocked: account_disabled,
	// no_proxy or proxy_disabled (the controller has no direct fallback).
	Blocked string `json:"-"`
}

// desired reads authoritative state: request forwarding never reconfigures an
// egress and never trusts the scheduler's cached proxy binding.
func (s *Service) desired(ctx context.Context, id int64, credentials bool) (accountDesired, error) {
	var d accountDesired
	var version string
	var spec core.ProxySpec
	var password, accountCredentials []byte
	err := s.DB.Pool.QueryRow(ctx, `SELECT
  a.deleted_at IS NULL AND a.status <> 'disabled' AND COALESCE(p.status <> 'disabled',false),
  CASE WHEN a.deleted_at IS NOT NULL OR a.status = 'disabled' THEN 'account_disabled'
       WHEN p.id IS NULL THEN 'no_proxy' WHEN p.status = 'disabled' THEN 'proxy_disabled' ELSE '' END,
  concat_ws('|',a.id,a.type,a.proxy_id,a.status,a.deleted_at,p.updated_at,p.status,encode(a.credentials_enc,'hex')),
  COALESCE(p.protocol,''),COALESCE(p.host,''),COALESCE(p.port,0),COALESCE(p.username,''),p.password_enc,a.type,a.credentials_enc
  FROM accounts a LEFT JOIN proxies p ON p.id=a.proxy_id
  WHERE a.id=$1 AND a.plugin_key='ccgateway' AND a.type IN ('managed','apikey')`, id).
		Scan(&d.Enabled, &d.Blocked, &version, &spec.Protocol, &spec.Host, &spec.Port, &spec.Username, &password, &d.Kind, &accountCredentials)
	if err != nil {
		return d, err
	}
	sum := sha256.Sum256([]byte(version))
	d.Revision = hex.EncodeToString(sum[:])
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
		if len(password) > 0 {
			plain, e := s.Cipher.Decrypt(password, []byte("proxy"))
			if e != nil {
				return d, e
			}
			spec.Password = string(plain)
		}
		d.Proxy = map[string]any{"protocol": spec.Protocol, "host": spec.Host, "port": spec.Port, "username": spec.Username, "password": spec.Password}
	}
	return d, nil
}

func (s *Service) runtimeRequest(ctx context.Context, id int64, method, path string, body []byte, revision string) (*http.Response, func() error, error) {
	cfg, e := s.Load(ctx)
	if e != nil || !cfg.AccountRuntimes {
		return nil, nil, errors.New("account runtimes are not configured")
	}
	client, base, close, e := s.open(ctx, cfg)
	if e != nil {
		return nil, nil, e
	}
	req, e := http.NewRequestWithContext(ctx, method, fmt.Sprintf("%s/accounts/%d/%s", base, id, path), bytes.NewReader(body))
	if e != nil {
		close()
		return nil, nil, e
	}
	req.Header.Set("Authorization", "Bearer "+cfg.AdminKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CCG-Revision", revision)
	res, e := client.Do(req)
	if e != nil {
		close()
		return nil, nil, e
	}
	return res, close, nil
}

// Reconcile is a control-plane operation. Multiple core nodes serialize via a
// PG advisory lock held across read/apply, preventing stale writes to Docker.
func (s *Service) Reconcile(ctx context.Context, id int64) error {
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
	if e = tx.QueryRow(ctx, `SELECT pg_try_advisory_xact_lock(hashtextextended('ccg-account:' || $1::text,0))`, strconv.FormatInt(id, 10)).Scan(&locked); e != nil {
		return e
	}
	if !locked {
		return nil
	}
	d, e := s.desired(ctx, id, true)
	if e != nil {
		return e
	}
	// Check remote readiness without rewriting an unchanged configuration.
	res, close, e := s.runtimeRequest(ctx, id, "GET", "status", nil, "")
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
	body, _ := json.Marshal(d)
	res, close, e = s.runtimeRequest(ctx, id, "PUT", "config", body, "")
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

// Kick asks this node to reconcile one account now instead of waiting for
// the next sweep (account create/update). It never blocks; a full queue is
// dropped because the sweep still covers the account within seconds.
func (s *Service) Kick(id int64) {
	select {
	case s.kick <- id:
	default:
	}
}

// reconcileKicked serves Kick on its own goroutine so a long sweep (each
// account may take up to 90 s) does not delay a freshly created account.
func (s *Service) reconcileKicked(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case id := <-s.kick:
			if cfg, e := s.Load(ctx); e != nil || !cfg.AccountRuntimes {
				continue
			}
			c, cancel := context.WithTimeout(ctx, 90*time.Second)
			if e := s.Reconcile(c, id); e != nil && ctx.Err() == nil {
				slog.Warn("CCGateway account reconcile failed", "account_id", id, "err", e)
			}
			cancel()
		}
	}
}

func (s *Service) Run(ctx context.Context) {
	if s.kick != nil {
		go s.reconcileKicked(ctx)
	}
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
			rows, e := s.DB.Pool.Query(ctx, `SELECT id FROM accounts WHERE plugin_key='ccgateway' AND type IN ('managed','apikey') ORDER BY id`)
			if e != nil {
				continue
			}
			var ids []int64
			for rows.Next() {
				var id int64
				if rows.Scan(&id) == nil {
					ids = append(ids, id)
				}
			}
			rows.Close()
			for _, id := range ids {
				c, cancel := context.WithTimeout(ctx, 90*time.Second)
				_ = s.Reconcile(c, id)
				cancel()
				if ctx.Err() != nil {
					return
				}
			}
		}
	}
}

// startRetryFor / startRetryEvery bound the "start" retry in accountManage.
var (
	startRetryFor   = 30 * time.Second
	startRetryEvery = 2 * time.Second
)

// Reasons the business container gives (tools/ccgateway/auth.go). They are
// matched as text because the controller image is deployed separately from
// the core and has no error codes.
const (
	reasonPending   = "已有待完成的授权"
	reasonBadFormat = "code#state"
)

// runtimeReason reads the fixed, user-facing reason of a 400 from the
// business container ({"error":{"message":...}}) without control
// characters, at most 200 runes; "" when there is none.
func runtimeReason(raw []byte) string {
	var body struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if json.Unmarshal(raw, &body) != nil {
		return ""
	}
	msg := []rune(strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, body.Error.Message))
	if len(msg) > 200 {
		msg = msg[:200]
	}
	return string(msg)
}

// runtimeError maps a non-200 runtime answer. A 400 reason is shown so the
// administrator knows what to do (e.g. a wrong code#state).
func runtimeError(status int, reason string) error {
	if status == http.StatusConflict {
		return core.ErrUnavailable.WithMessage("账号运行环境尚未同步完成，请稍后重试")
	}
	if status != http.StatusBadRequest || reason == "" {
		return core.ErrUnavailable
	}
	return core.ErrInvalidArgument.WithMessage(reason)
}

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
	action := c.Param("action")
	read := action == "status" || action == "health" || action == "session"
	if (c.Request.Method == "GET") != read {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	if action == "session" {
		if sess := s.loadSession(ctx, id); sess != nil {
			httpapi.OK(c, sess)
			return
		}
		httpapi.OK(c, nil)
		return
	}
	if action == "sync" {
		if e = s.Reconcile(ctx, id); e != nil {
			httpapi.Fail(c, core.ErrUnavailable.WithMessage("账号运行环境同步失败（容器创建或代理连通性检查未通过），请检查代理后重试"))
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
	}
	if action == "status" && !d.Enabled {
		httpapi.OK(c, map[string]string{"account_id": strconv.FormatInt(id, 10), "container": "", "status": "blocked", "revision": "", "reason": d.Blocked})
		return
	}
	path := "status"
	if action == "health" {
		path = "admin/status"
	} else if action != "status" {
		switch action {
		case "start", "complete", "cancel", "logout":
			if d.Kind != "managed" {
				httpapi.Fail(c, core.ErrInvalidArgument)
				return
			}
			path = "admin/auth/" + action
		default:
			httpapi.Fail(c, core.ErrNotFound)
			return
		}
	}
	raw, e := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 8192))
	if e != nil {
		httpapi.Fail(c, core.ErrInvalidArgument)
		return
	}
	if action == "complete" || action == "cancel" {
		// A console that lost the session id (reload) uses the saved one.
		body := map[string]any{}
		if len(bytes.TrimSpace(raw)) > 0 && json.Unmarshal(raw, &body) != nil {
			httpapi.Fail(c, core.ErrInvalidArgument)
			return
		}
		if sid, _ := body["session_id"].(string); sid == "" {
			if sess := s.loadSession(ctx, id); sess != nil {
				body["session_id"] = sess.SessionID
			}
		}
		raw, _ = json.Marshal(body)
	}
	res, close, e := s.runtimeRequest(ctx, id, c.Request.Method, path, raw, d.Revision)
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
				httpapi.Fail(c, core.ErrUnavailable)
				return
			case <-time.After(startRetryEvery):
			}
			res, close, e = s.runtimeRequest(ctx, id, c.Request.Method, path, raw, d.Revision)
		}
	}
	if e != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	defer close()
	defer res.Body.Close()
	if res.StatusCode != 200 {
		reason := ""
		if res.StatusCode == http.StatusBadRequest {
			msg, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
			reason = runtimeReason(msg)
			switch {
			case action == "start" && strings.Contains(reason, reasonPending):
				// The container still holds the login started earlier: hand
				// that one back instead of failing until it expires.
				if sess := s.loadSession(ctx, id); sess != nil {
					httpapi.OK(c, sess)
					return
				}
			case action == "complete" && !strings.Contains(reason, reasonBadFormat), action == "cancel":
				// Except for a malformed code#state the container has ended
				// (or never knew) the session.
				s.dropSession(ctx, id)
			}
		}
		httpapi.Fail(c, runtimeError(res.StatusCode, reason))
		return
	}
	raw, e = io.ReadAll(io.LimitReader(res.Body, 65537))
	if e != nil || len(raw) > 65536 {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	if action == "status" {
		var status struct {
			AccountID string `json:"account_id"`
			Container string `json:"container"`
			Status    string `json:"status"`
			Revision  string `json:"revision"`
		}
		if json.Unmarshal(raw, &status) != nil {
			httpapi.Fail(c, core.ErrUnavailable)
			return
		}
		if status.Revision != d.Revision {
			status.Status = "pending"
		}
		httpapi.OK(c, status)
		return
	}
	safePath := "/auth/" + action
	if action == "health" {
		safePath = "/status"
	}
	out, e := safeResult(safePath, raw)
	if e != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	switch action {
	case "start":
		var sess authSession
		if json.Unmarshal(raw, &sess) == nil {
			s.saveSession(ctx, id, sess)
		}
	case "complete", "cancel", "logout":
		s.dropSession(ctx, id)
	}
	if c.Request.Method != "GET" {
		s.record(c, "account."+strconv.FormatInt(id, 10)+"."+action)
	}
	httpapi.OK(c, out)
}
