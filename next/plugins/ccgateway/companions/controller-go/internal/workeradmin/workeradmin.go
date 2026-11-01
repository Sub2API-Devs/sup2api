// Package workeradmin is the controller's HTTP client of an account
// Worker's admin port (Python common.worker_session / worker_request /
// admin_headers and runtime_updates.maintenance; behaviour T11, PV7, P11).
//
// Every request carries exactly Authorization: Bearer <admin_key> and
// Content-Type: application/json (plus Host, Content-Length and
// Accept-Encoding: identity); nothing of a caller's request is forwarded;
// no proxy, no redirects, no transparent decompression.
//
// FROZEN: Client, Timeouts and every method.
package workeradmin

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"strconv"
	"time"

	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
)

// Timeouts are (connect, idle read) like requests' (connect, read) tuple.
type Timeouts struct {
	Connect time.Duration
	Idle    time.Duration
}

// Request timeouts of the controller's calls.
var (
	PassThrough = Timeouts{Connect: 5 * time.Second, Idle: 240 * time.Second}
	Environment = Timeouts{Connect: 3 * time.Second, Idle: 10 * time.Second}
	Maintenance = Timeouts{Connect: 5 * time.Second, Idle: 10 * time.Second}
)

// MaxMaintenanceAnswer is the largest admin/runtime answer accepted.
const MaxMaintenanceAnswer = 4096

// Client calls Workers.
type Client struct {
	// Port is the Worker port (names.WorkerPort; tests use a loopback port).
	Port int
	// Dial opens the TCP connection (nil: net.Dialer). Tests redirect it.
	Dial func(ctx context.Context, network, addr string) (net.Conn, error)
	// HostOverride replaces state.app_ip in the URL (tests: 127.0.0.1).
	HostOverride string
}

// New is the production client.
func New() *Client { return &Client{Port: names.WorkerPort} }

type idleConn struct {
	net.Conn
	idle time.Duration
}

func (c *idleConn) Read(p []byte) (int, error) {
	c.Conn.SetReadDeadline(time.Now().Add(c.idle))
	return c.Conn.Read(p)
}

func (c *idleConn) Write(p []byte) (int, error) {
	c.Conn.SetWriteDeadline(time.Now().Add(c.idle))
	return c.Conn.Write(p)
}

func (c *Client) httpClient(t Timeouts) *http.Client {
	dial := c.Dial
	if dial == nil {
		dial = (&net.Dialer{}).DialContext
	}
	return &http.Client{
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
		Transport: &http.Transport{
			Proxy:              nil,
			DisableKeepAlives:  true,
			DisableCompression: true,
			ForceAttemptHTTP2:  false,
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				cctx, cancel := context.WithTimeout(ctx, t.Connect)
				defer cancel()
				conn, err := dial(cctx, network, addr)
				if err != nil {
					return nil, err
				}
				return &idleConn{Conn: conn, idle: t.Idle}, nil
			},
			ResponseHeaderTimeout: t.Idle,
		},
	}
}

// URL is http://<app_ip>:<port>/<path>.
func (c *Client) URL(st *store.AccountState, path string) string {
	host := st.AppIP
	if c.HostOverride != "" {
		host = c.HostOverride
	}
	return "http://" + net.JoinHostPort(host, strconv.Itoa(c.Port)) + "/" + path
}

// Do sends method <path> with body (nil: empty) to the account's Worker
// with its admin key. The caller closes the response body; the connection
// is not reused.
func (c *Client) Do(ctx context.Context, st *store.AccountState, method, path string, body []byte, t Timeouts) (*http.Response, error) {
	var rd io.Reader
	if body != nil {
		rd = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.URL(st, path), rd)
	if err != nil {
		return nil, err
	}
	if body == nil && (method == http.MethodPost || method == http.MethodPut || method == http.MethodPatch) {
		req.Body = http.NoBody
		req.ContentLength = 0
	}
	req.Header = http.Header{
		"Authorization":   {"Bearer " + st.AdminKey},
		"Content-Type":    {"application/json"},
		"Accept-Encoding": {"identity"},
		"User-Agent":      {""}, // present but empty: Go sends no User-Agent
	}
	return c.httpClient(t).Do(req)
}

// PutEnvironment is _sync_environment's call: PUT admin/environment with
// the desired {locale, timezone}; true when the Worker answered 200 with an
// object whose locale and timezone equal the request. Every failure is false.
func (c *Client) PutEnvironment(ctx context.Context, st *store.AccountState, env store.Environment) bool {
	body, err := pyjson.Marshal(env)
	if err != nil {
		return false
	}
	resp, err := c.Do(ctx, st, http.MethodPut, "admin/environment", body, Environment)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return false
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return false
	}
	view, err := pyjson.DecodeObject(raw)
	if err != nil {
		return false
	}
	locale, _ := view.Get("locale")
	timezone, _ := view.Get("timezone")
	return pyjson.Equal(locale, env.Locale) && pyjson.Equal(timezone, env.Timezone)
}

// ErrNoMaintenance is the RuntimeError of a Worker without paired runtime
// maintenance (non-200, oversized answer).
var ErrNoMaintenance = errors.New("Worker lacks paired runtime maintenance; upgrade Worker first")

// ErrInvalidAck is an answer that is not an object with active_requests == 0.
var ErrInvalidAck = errors.New("invalid runtime maintenance acknowledgement")

// Maintenance is runtime_updates.maintenance: POST admin/runtime
// {"action", "lease"?}. 409 is (nil, nil): busy.
func (c *Client) Maintenance(ctx context.Context, st *store.AccountState, action, lease string) (pyjson.Ordered, error) {
	req := pyjson.Ordered{{Key: "action", Value: action}}
	if lease != "" {
		req = append(req, pyjson.KV{Key: "lease", Value: lease})
	}
	body, err := pyjson.Marshal(req)
	if err != nil {
		return nil, err
	}
	resp, err := c.Do(ctx, st, http.MethodPost, "admin/runtime", body, Maintenance)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusConflict {
		return nil, nil
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, MaxMaintenanceAnswer+1))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK || len(raw) > MaxMaintenanceAnswer {
		return nil, ErrNoMaintenance
	}
	v, err := pyjson.Decode(raw)
	if err != nil {
		return nil, err
	}
	o, ok := v.(pyjson.Ordered)
	active, _ := o.Get("active_requests")
	if !ok || !pyjson.Equal(active, 0) {
		return nil, ErrInvalidAck
	}
	return o, nil
}

// Resume reopens the Worker's admission; true when it acknowledged. It never fails.
func (c *Client) Resume(ctx context.Context, st *store.AccountState, lease string) bool {
	ack, err := c.Maintenance(ctx, st, "resume", lease)
	return err == nil && ack != nil
}
