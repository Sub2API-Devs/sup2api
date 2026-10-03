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
	"net/http"
	"strconv"
	"time"

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
  concat_ws('|',a.id,a.type,a.proxy_id,a.status,a.deleted_at,p.updated_at,p.status,encode(a.credentials_enc,'hex')),
  COALESCE(p.protocol,''),COALESCE(p.host,''),COALESCE(p.port,0),COALESCE(p.username,''),p.password_enc,a.type,a.credentials_enc
  FROM accounts a LEFT JOIN proxies p ON p.id=a.proxy_id
  WHERE a.id=$1 AND a.plugin_key='ccgateway' AND a.type IN ('managed','apikey')`, id).
		Scan(&d.Enabled, &version, &spec.Protocol, &spec.Host, &spec.Port, &spec.Username, &password, &d.Kind, &accountCredentials)
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

func (s *Service) Run(ctx context.Context) {
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

// Account management is scoped to settings administrators. Account ownership
// is checked in desired; arbitrary remote paths are never accepted.
func (s *Service) accountManage(c *gin.Context) {
	id, e := strconv.ParseInt(c.Param("id"), 10, 64)
	if e != nil || id <= 0 {
		httpapi.Fail(c, core.ErrInvalidArgument)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 90*time.Second)
	defer cancel()
	d, e := s.desired(ctx, id, false)
	if e != nil {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	action := c.Param("action")
	if c.Request.Method == "GET" && action != "status" && action != "health" {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	if c.Request.Method == "POST" && (action == "status" || action == "health") {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	if action == "sync" {
		if e = s.Reconcile(ctx, id); e != nil {
			httpapi.Fail(c, core.ErrUnavailable)
			return
		}
		httpapi.OK(c, map[string]bool{"synced": true})
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
	res, close, e := s.runtimeRequest(ctx, id, c.Request.Method, path, raw, d.Revision)
	if e != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	defer close()
	defer res.Body.Close()
	if res.StatusCode != 200 {
		httpapi.Fail(c, core.ErrUnavailable)
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
	if c.Request.Method != "GET" {
		s.record(c, "account."+strconv.FormatInt(id, 10)+"."+action)
	}
	httpapi.OK(c, out)
}
