// Package proxy implements outbound proxy management and core.ProxyDirectory,
// which hands out cached *http.Client values per proxy.
package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// DefaultProbeURL is requested through a proxy by POST /proxies/:id/test.
const DefaultProbeURL = "https://www.google.com/generate_204"

var passwordAAD = []byte("proxy")

// Options tunes the service; zero values select defaults.
type Options struct {
	ProbeURL     string        // default DefaultProbeURL
	ProbeTimeout time.Duration // default 15s
	// RecheckInterval is how often a cached client re-reads its proxy row to
	// pick up changes made on other nodes (default 30s).
	RecheckInterval time.Duration
}

// Service serves the proxy endpoints and implements core.ProxyDirectory.
type Service struct {
	db     *store.DB
	cipher *secret.Cipher
	bus    core.Bus // optional
	opts   Options

	direct *http.Client

	mu      sync.Mutex
	clients map[int64]*entry
}

type entry struct {
	client    *http.Client
	status    string
	updatedAt time.Time
	checkedAt time.Time
}

var _ core.ProxyDirectory = (*Service)(nil)

// New builds the service. bus may be nil (single node).
func New(db *store.DB, cipher *secret.Cipher, bus core.Bus, opts Options) *Service {
	if opts.ProbeURL == "" {
		opts.ProbeURL = DefaultProbeURL
	}
	if opts.ProbeTimeout <= 0 {
		opts.ProbeTimeout = 15 * time.Second
	}
	if opts.RecheckInterval <= 0 {
		opts.RecheckInterval = 30 * time.Second
	}
	return &Service{
		db: db, cipher: cipher, bus: bus, opts: opts,
		direct:  &http.Client{Transport: newTransport(nil)},
		clients: map[int64]*entry{},
	}
}

// RegisterRoutes mounts the proxy endpoints.
func (s *Service) RegisterRoutes(r *httpapi.Router) {
	r.Perm("GET", "/proxies", "proxy:read", s.list)
	r.Perm("POST", "/proxies", "proxy:manage", s.create)
	r.Perm("GET", "/proxies/:id", "proxy:read", s.get)
	r.Perm("PATCH", "/proxies/:id", "proxy:manage", s.update)
	r.Perm("DELETE", "/proxies/:id", "proxy:manage", s.delete)
	r.Perm("POST", "/proxies/:id/test", "proxy:manage", s.test)
}

// changeMsg is published on config:changed when a proxy changes.
type changeMsg struct {
	Type string `json:"type"` // "proxy"
	ID   int64  `json:"id"`
}

// Run listens for proxy changes from other nodes until ctx is done.
func (s *Service) Run(ctx context.Context) {
	if s.bus == nil {
		<-ctx.Done()
		return
	}
	cancel := s.bus.Subscribe(core.ChannelConfigChanged, func(p []byte) {
		var m changeMsg
		if json.Unmarshal(p, &m) == nil && m.Type == "proxy" && m.ID > 0 {
			s.Invalidate(m.ID)
		}
	})
	<-ctx.Done()
	cancel()
}

// Invalidate drops the cached client of one proxy.
func (s *Service) Invalidate(id int64) {
	s.mu.Lock()
	e := s.clients[id]
	delete(s.clients, id)
	s.mu.Unlock()
	if e != nil {
		e.client.CloseIdleConnections()
	}
}

func (s *Service) changed(ctx context.Context, id int64) {
	s.Invalidate(id)
	if s.bus == nil {
		return
	}
	b, _ := json.Marshal(changeMsg{Type: "proxy", ID: id})
	if err := s.bus.Publish(ctx, core.ChannelConfigChanged, b); err != nil {
		slog.WarnContext(ctx, "proxy: publish config:changed", "err", err)
	}
}

// ---------------------------------------------------------------- directory

func newTransport(proxy *url.URL) *http.Transport {
	tr := &http.Transport{
		DialContext:           (&net.Dialer{Timeout: 15 * time.Second, KeepAlive: 30 * time.Second}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          256,
		MaxIdleConnsPerHost:   32,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   15 * time.Second,
		ExpectContinueTimeout: time.Second,
	}
	if proxy != nil {
		tr.Proxy = http.ProxyURL(proxy)
	}
	return tr
}

type row struct {
	ID          int64
	Name        string
	Protocol    string
	Host        string
	Port        int
	Username    string
	PasswordEnc []byte
	Status      string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (s *Service) proxyURL(r *row) (*url.URL, error) {
	u := &url.URL{Scheme: r.Protocol, Host: net.JoinHostPort(r.Host, strconv.Itoa(r.Port))}
	if r.Username != "" || len(r.PasswordEnc) > 0 {
		pw := ""
		if len(r.PasswordEnc) > 0 {
			b, err := s.cipher.Decrypt(r.PasswordEnc, passwordAAD)
			if err != nil {
				return nil, fmt.Errorf("decrypt proxy password: %w", err)
			}
			pw = string(b)
		}
		u.User = url.UserPassword(r.Username, pw)
	}
	return u, nil
}

func (s *Service) buildClient(r *row) (*http.Client, error) {
	u, err := s.proxyURL(r)
	if err != nil {
		return nil, err
	}
	return &http.Client{Transport: newTransport(u)}, nil
}

// HTTPClient returns the client for proxyID; nil means a direct connection.
// The client has no overall timeout: callers bound requests with ctx.
func (s *Service) HTTPClient(ctx context.Context, proxyID *int64) (*http.Client, error) {
	if proxyID == nil {
		return s.direct, nil
	}
	id := *proxyID
	now := time.Now()
	s.mu.Lock()
	e := s.clients[id]
	s.mu.Unlock()
	if e != nil && now.Sub(e.checkedAt) < s.opts.RecheckInterval {
		return e.result()
	}
	var r row
	err := s.db.Pool.QueryRow(ctx, `SELECT protocol, host, port, username, password_enc, status, updated_at
		FROM proxies WHERE id = $1`, id).Scan(&r.Protocol, &r.Host, &r.Port, &r.Username, &r.PasswordEnc, &r.Status, &r.UpdatedAt)
	if store.IsNoRows(err) {
		s.Invalidate(id)
		return nil, core.ErrNotFound.WithMessage("proxy not found")
	}
	if err != nil {
		if e != nil {
			// Keep serving the last known client when the database hiccups.
			return e.result()
		}
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if cur := s.clients[id]; cur != nil && cur.updatedAt.Equal(r.UpdatedAt) {
		cur.checkedAt = now
		cur.status = r.Status
		return cur.result()
	}
	c, err := s.buildClient(&r)
	if err != nil {
		return nil, err
	}
	if old := s.clients[id]; old != nil {
		old.client.CloseIdleConnections()
	}
	ne := &entry{client: c, status: r.Status, updatedAt: r.UpdatedAt, checkedAt: now}
	s.clients[id] = ne
	return ne.result()
}

func (e *entry) result() (*http.Client, error) {
	if e.status != "active" {
		// Never silently fall back to a direct connection.
		return nil, core.ErrUnavailable.WithMessage("proxy disabled")
	}
	return e.client, nil
}

// ---------------------------------------------------------------- HTTP

// Proxy is the API view of a proxies row (the password is never returned).
type Proxy struct {
	ID           int64     `json:"id"`
	Name         string    `json:"name"`
	Protocol     string    `json:"protocol"`
	Host         string    `json:"host"`
	Port         int       `json:"port"`
	Username     string    `json:"username"`
	HasPassword  bool      `json:"has_password"`
	Status       string    `json:"status"`
	AccountCount int64     `json:"account_count"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

const selectProxy = `SELECT p.id, p.name, p.protocol, p.host, p.port, p.username, p.password_enc IS NOT NULL,
	p.status, (SELECT count(*) FROM accounts a WHERE a.proxy_id = p.id AND a.deleted_at IS NULL),
	p.created_at, p.updated_at FROM proxies p`

func scanProxy(r pgx.Row) (*Proxy, error) {
	var p Proxy
	err := r.Scan(&p.ID, &p.Name, &p.Protocol, &p.Host, &p.Port, &p.Username, &p.HasPassword,
		&p.Status, &p.AccountCount, &p.CreatedAt, &p.UpdatedAt)
	return &p, err
}

func t(ctx context.Context, en, zh string) string {
	if core.Locale(ctx) == "zh" {
		return zh
	}
	return en
}

func notFound(ctx context.Context) error {
	return core.ErrNotFound.WithMessage(t(ctx, "proxy not found", "代理不存在"))
}

func (s *Service) load(ctx context.Context, id int64) (*Proxy, error) {
	p, err := scanProxy(s.db.Pool.QueryRow(ctx, selectProxy+` WHERE p.id = $1`, id))
	if store.IsNoRows(err) {
		return nil, notFound(ctx)
	}
	return p, err
}

func (s *Service) list(c *gin.Context) {
	ctx := c.Request.Context()
	page, size := httpapi.Pagination(c)
	q := strings.TrimSpace(c.Query("q"))
	status := c.Query("status")
	where := ` WHERE ($1 = '' OR p.name ILIKE '%' || $1 || '%' OR p.host ILIKE '%' || $1 || '%') AND ($2 = '' OR p.status = $2)`
	var total int64
	if err := s.db.Pool.QueryRow(ctx, `SELECT count(*) FROM proxies p`+where, q, status).Scan(&total); err != nil {
		httpapi.Fail(c, err)
		return
	}
	rows, err := s.db.Pool.Query(ctx, selectProxy+where+` ORDER BY p.id LIMIT $3 OFFSET $4`, q, status, size, (page-1)*size)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer rows.Close()
	items := []*Proxy{}
	for rows.Next() {
		p, err := scanProxy(rows)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		items = append(items, p)
	}
	if err := rows.Err(); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.List(c, items, httpapi.Page{Page: page, PageSize: size, Total: total})
}

func (s *Service) get(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	p, err := s.load(c.Request.Context(), id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, p)
}

type input struct {
	Name     *string `json:"name"`
	Protocol *string `json:"protocol"`
	Host     *string `json:"host"`
	Port     *int    `json:"port"`
	Username *string `json:"username"`
	// Password: absent or null keeps the current one, "" clears it.
	Password *string `json:"password"`
	Status   *string `json:"status"`
}

func (in *input) validate(ctx context.Context, create bool) error {
	var fe []core.FieldError
	add := func(field, code, en, zh string) {
		fe = append(fe, core.FieldError{Field: field, Code: code, Message: t(ctx, en, zh)})
	}
	req := func(field string, set bool) bool {
		if !set && create {
			add(field, "required", field+" is required", field+" 必填")
			return false
		}
		return set
	}
	if req("name", in.Name != nil) {
		n := strings.TrimSpace(*in.Name)
		in.Name = &n
		if n == "" || utf8.RuneCountInString(n) > 100 {
			add("name", "invalid", "name must be 1-100 characters", "名称长度须为 1-100 个字符")
		}
	}
	if req("protocol", in.Protocol != nil) {
		switch *in.Protocol {
		case "http", "https", "socks5":
		default:
			add("protocol", "invalid", "protocol must be http, https or socks5", "协议必须为 http、https 或 socks5")
		}
	}
	if req("host", in.Host != nil) {
		h := strings.TrimSpace(*in.Host)
		in.Host = &h
		if h == "" || len(h) > 255 || strings.ContainsAny(h, "/?#@ \t") {
			add("host", "invalid", "invalid host", "主机地址无效")
		}
	}
	if req("port", in.Port != nil) && (*in.Port < 1 || *in.Port > 65535) {
		add("port", "invalid", "port must be 1-65535", "端口必须为 1-65535")
	}
	if in.Username != nil && len(*in.Username) > 255 {
		add("username", "too_long", "username is too long", "用户名过长")
	}
	if in.Password != nil && len(*in.Password) > 1024 {
		add("password", "too_long", "password is too long", "密码过长")
	}
	if in.Status != nil && *in.Status != "active" && *in.Status != "disabled" {
		add("status", "invalid", "status must be active or disabled", "状态必须为 active 或 disabled")
	}
	if len(fe) > 0 {
		return core.InvalidFields(fe...)
	}
	return nil
}

func (s *Service) encryptPassword(pw *string) ([]byte, error) {
	if pw == nil || *pw == "" {
		return nil, nil
	}
	return s.cipher.Encrypt([]byte(*pw), passwordAAD)
}

func (s *Service) create(c *gin.Context) {
	ctx := c.Request.Context()
	var in input
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if err := in.validate(ctx, true); err != nil {
		httpapi.Fail(c, err)
		return
	}
	enc, err := s.encryptPassword(in.Password)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	user, status := "", "active"
	if in.Username != nil {
		user = *in.Username
	}
	if in.Status != nil {
		status = *in.Status
	}
	var id int64
	if err := s.db.Pool.QueryRow(ctx, `INSERT INTO proxies (name, protocol, host, port, username, password_enc, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		*in.Name, *in.Protocol, *in.Host, *in.Port, user, enc, status).Scan(&id); err != nil {
		httpapi.Fail(c, err)
		return
	}
	p, err := s.load(ctx, id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.Created(c, p)
}

func (s *Service) update(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in input
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if err := in.validate(ctx, false); err != nil {
		httpapi.Fail(c, err)
		return
	}
	enc, err := s.encryptPassword(in.Password)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	tag, err := s.db.Pool.Exec(ctx, `UPDATE proxies SET
		name = COALESCE($2, name),
		protocol = COALESCE($3, protocol),
		host = COALESCE($4, host),
		port = COALESCE($5, port),
		username = COALESCE($6, username),
		password_enc = CASE WHEN $7 THEN $8 ELSE password_enc END,
		status = COALESCE($9, status),
		updated_at = clock_timestamp()
		WHERE id = $1`, id, in.Name, in.Protocol, in.Host, in.Port, in.Username, in.Password != nil, enc, in.Status)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if tag.RowsAffected() == 0 {
		httpapi.Fail(c, notFound(ctx))
		return
	}
	s.changed(ctx, id)
	p, err := s.load(ctx, id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, p)
}

func (s *Service) delete(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var n int64
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM accounts WHERE proxy_id = $1 AND deleted_at IS NULL`, id).Scan(&n); err != nil {
			return err
		}
		if n > 0 {
			// Deleting would silently switch these accounts to direct connections.
			return core.ErrConflict.WithMessage(t(ctx,
				"the proxy is used by accounts; reassign them first",
				"该代理仍被账号使用，请先修改这些账号的代理")).WithDetails(map[string]any{"account_count": n})
		}
		tag, err := tx.Exec(ctx, `DELETE FROM proxies WHERE id = $1`, id)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return notFound(ctx)
		}
		return nil
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.changed(ctx, id)
	httpapi.NoContent(c)
}

// TestResult is returned by POST /proxies/:id/test.
type TestResult struct {
	OK        bool   `json:"ok"`
	Status    int    `json:"status"`
	LatencyMs int64  `json:"latency_ms"`
	Message   string `json:"message"`
}

func (s *Service) test(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var r row
	err := s.db.Pool.QueryRow(ctx, `SELECT protocol, host, port, username, password_enc FROM proxies WHERE id = $1`, id).
		Scan(&r.Protocol, &r.Host, &r.Port, &r.Username, &r.PasswordEnc)
	if store.IsNoRows(err) {
		httpapi.Fail(c, notFound(ctx))
		return
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	// A fresh client, so the test reflects the stored settings even if the
	// proxy is disabled or the cached client is stale.
	client, err := s.buildClient(&r)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer client.CloseIdleConnections()
	httpapi.OK(c, s.probe(ctx, client))
}

func (s *Service) probe(ctx context.Context, client *http.Client) TestResult {
	ctx, cancel := context.WithTimeout(ctx, s.opts.ProbeTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.opts.ProbeURL, nil)
	if err != nil {
		return TestResult{Message: err.Error()}
	}
	start := time.Now()
	resp, err := client.Do(req)
	latency := time.Since(start).Milliseconds()
	if err != nil {
		return TestResult{LatencyMs: latency, Message: err.Error()}
	}
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 64<<10))
	_ = resp.Body.Close()
	res := TestResult{OK: resp.StatusCode < 400, Status: resp.StatusCode, LatencyMs: latency}
	if !res.OK {
		res.Message = resp.Status
	}
	return res
}
