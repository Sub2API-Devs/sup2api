package guardapi

import (
	"bufio"
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"ccgateway/controller/internal/config"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/pyjson"
)

// HTTPClient is the production Client: HTTP/1.1 to the guard on the control
// network, no proxy, no redirects, token in memory only.
type HTTPClient struct {
	base     string
	token    string
	Timeouts Timeouts
	plain    *http.Client // pooled; every call has a total deadline
	stream   *http.Client // one connection per call, idle deadlines on the socket
	testRT   http.RoundTripper
}

// Option customises a client (tests).
type Option func(*HTTPClient)

// WithTimeouts replaces the timeouts.
func WithTimeouts(t Timeouts) Option { return func(c *HTTPClient) { c.Timeouts = t } }

// WithTransport sends every request through rt instead of the network
// (tests: fakeguard serves the guard API in process).
func WithTransport(rt http.RoundTripper) Option { return func(c *HTTPClient) { c.testRT = rt } }

// BaseURL is the guard's base URL.
func (c *HTTPClient) BaseURL() string { return c.base }

type idleKey struct{}

type idlePolicy struct{ read, write time.Duration }

// New is a client of the guard at baseURL (http://<IPv4>:<port>) with the
// 64-hex-character token.
func New(baseURL, token string, opts ...Option) (*HTTPClient, error) {
	base, err := config.CheckGuardURL(baseURL)
	if err != nil {
		return nil, err
	}
	if len(token) != 64 {
		return nil, errors.New("guard token must be 64 hex characters")
	}
	c := &HTTPClient{base: base, token: token, Timeouts: DefaultTimeouts}
	for _, o := range opts {
		o(c)
	}
	dialer := &net.Dialer{Timeout: 5 * time.Second, KeepAlive: 30 * time.Second}
	noRedirect := func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	c.plain = &http.Client{CheckRedirect: noRedirect, Transport: &http.Transport{
		Proxy:               nil,
		DialContext:         dialer.DialContext,
		DisableCompression:  true,
		MaxIdleConnsPerHost: 16,
		IdleConnTimeout:     90 * time.Second,
		ForceAttemptHTTP2:   false,
		TLSNextProto:        map[string]func(string, *tls.Conn) http.RoundTripper{},
	}}
	c.stream = &http.Client{CheckRedirect: noRedirect, Transport: &http.Transport{
		Proxy:              nil,
		DisableKeepAlives:  true,
		DisableCompression: true,
		ForceAttemptHTTP2:  false,
		TLSNextProto:       map[string]func(string, *tls.Conn) http.RoundTripper{},
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			conn, err := dialer.DialContext(ctx, network, addr)
			if err != nil {
				return nil, err
			}
			p, _ := ctx.Value(idleKey{}).(idlePolicy)
			if p.read == 0 && p.write == 0 {
				return conn, nil
			}
			return &idleConn{Conn: conn, read: p.read, write: p.write}, nil
		},
	}}
	if c.testRT != nil {
		c.plain = &http.Client{CheckRedirect: noRedirect, Transport: c.testRT}
		c.stream = &http.Client{CheckRedirect: noRedirect, Transport: c.testRT}
	}
	return c, nil
}

// idleConn renews its deadline before every read and write: the limit is
// time without progress, not total time (02 §5.4).
type idleConn struct {
	net.Conn
	read, write time.Duration
}

func (c *idleConn) Read(p []byte) (int, error) {
	if c.read > 0 {
		c.Conn.SetReadDeadline(time.Now().Add(c.read))
	}
	return c.Conn.Read(p)
}

func (c *idleConn) Write(p []byte) (int, error) {
	if c.write > 0 {
		c.Conn.SetWriteDeadline(time.Now().Add(c.write))
	}
	return c.Conn.Write(p)
}

// call describes one request.
type call struct {
	method, route, path string
	query               url.Values
	json                any       // request JSON body (nil: none)
	raw                 io.Reader // raw request body
	size                int64
	contentType         string
	timeout             time.Duration // total; 0 for streams
	idle                *idlePolicy   // streams
	ok                  []int         // accepted statuses
}

func (c *HTTPClient) roundTrip(ctx context.Context, k call) (*http.Response, context.CancelFunc, error) {
	cancel := context.CancelFunc(func() {})
	if k.timeout > 0 {
		ctx, cancel = context.WithTimeout(ctx, k.timeout)
	} else {
		ctx, cancel = context.WithCancel(ctx)
	}
	client := c.plain
	if k.idle != nil {
		client = c.stream
		ctx = context.WithValue(ctx, idleKey{}, *k.idle)
	}
	u := c.base + k.path
	if len(k.query) > 0 {
		u += "?" + k.query.Encode()
	}
	var body io.Reader
	size := int64(0)
	ctype := ""
	switch {
	case k.json != nil:
		b, err := json.Marshal(k.json)
		if err != nil {
			cancel()
			return nil, nil, err
		}
		body, size, ctype = bytes.NewReader(b), int64(len(b)), "application/json"
	case k.raw != nil:
		body, size, ctype = k.raw, k.size, k.contentType
	}
	req, err := http.NewRequestWithContext(ctx, k.method, u, body)
	if err != nil {
		cancel()
		return nil, nil, err
	}
	if body != nil {
		req.ContentLength = size
		if size == 0 {
			req.Body = http.NoBody
		}
		req.Header.Set("Content-Type", ctype)
	} else if k.method == http.MethodPost || k.method == http.MethodPut {
		req.ContentLength = 0
		req.Body = http.NoBody
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("User-Agent", defaultUserAgent)
	req.Header.Set("Accept-Encoding", "identity")
	resp, err := client.Do(req)
	if err != nil {
		cancel()
		return nil, nil, &TransportError{Endpoint: k.route, Err: scrub(err, c.token)}
	}
	for _, s := range k.ok {
		if resp.StatusCode == s {
			return resp, cancel, nil
		}
	}
	defer cancel()
	defer resp.Body.Close()
	return nil, nil, c.answerError(k.route, resp)
}

// scrub keeps the token out of error text (it is never in a URL, this is a
// belt and braces measure).
func scrub(err error, token string) error {
	if token != "" && strings.Contains(err.Error(), token) {
		return errors.New(strings.ReplaceAll(err.Error(), token, "<token>"))
	}
	return err
}

func (c *HTTPClient) answerError(route string, resp *http.Response) error {
	raw, err := io.ReadAll(io.LimitReader(resp.Body, MaxErrorAnswer))
	e := &Error{Status: resp.StatusCode, Endpoint: route}
	if err == nil {
		var body struct {
			Error   string   `json:"error"`
			Reason  string   `json:"reason"`
			Message string   `json:"message"`
			Names   []string `json:"names"`
		}
		if json.Unmarshal(raw, &body) == nil {
			e.Code, e.Reason, e.Message, e.Names = body.Error, body.Reason, body.Message, body.Names
		}
	}
	if e.Code == "" {
		e.Code = strings.ReplaceAll(strings.ToLower(http.StatusText(resp.StatusCode)), " ", "_")
	}
	return classify(e)
}

// do runs a JSON call and decodes the answer in order (nil for 204).
func (c *HTTPClient) do(ctx context.Context, k call, limit int64) (any, error) {
	resp, cancel, err := c.roundTrip(ctx, k)
	if err != nil {
		return nil, err
	}
	defer cancel()
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNoContent {
		io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<10))
		return nil, nil
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, limit+1))
	if err != nil {
		return nil, &TransportError{Endpoint: k.route, Err: err}
	}
	if int64(len(raw)) > limit {
		return nil, &TransportError{Endpoint: k.route, Err: errors.New("answer too large")}
	}
	v, err := pyjson.Decode(raw)
	if err != nil {
		return nil, &TransportError{Endpoint: k.route, Err: fmt.Errorf("invalid JSON answer: %w", err)}
	}
	return v, nil
}

func (c *HTTPClient) normal(method, route, path string, body any, ok ...int) call {
	return call{method: method, route: route, path: path, json: body, timeout: c.Timeouts.Normal, ok: ok}
}

func esc(s string) string { return url.PathEscape(s) }

// Health is GET /v1/health.
func (c *HTTPClient) Health(ctx context.Context) (*Health, error) {
	k := c.normal("GET", "GET /v1/health", "/v1/health", nil, 200)
	k.timeout = c.Timeouts.Ready
	var h Health
	return &h, c.decodeInto(ctx, k, &h)
}

// decodeInto decodes a JSON answer into a Go struct.
func (c *HTTPClient) decodeInto(ctx context.Context, k call, out any) error {
	v, err := c.do(ctx, k, MaxJSONAnswer)
	if err != nil {
		return err
	}
	b, err := pyjson.Marshal(v)
	if err != nil {
		return &TransportError{Endpoint: k.route, Err: err}
	}
	if err := json.Unmarshal(b, out); err != nil {
		return &TransportError{Endpoint: k.route, Err: err}
	}
	return nil
}

// Subnets is GET /v1/subnets.
func (c *HTTPClient) Subnets(ctx context.Context) (*Subnets, error) {
	var s Subnets
	return &s, c.decodeInto(ctx, c.normal("GET", "GET /v1/subnets", "/v1/subnets", nil, 200), &s)
}

// Inventory is GET /v1/inventory.
func (c *HTTPClient) Inventory(ctx context.Context) (*Inventory, error) {
	v, err := c.do(ctx, c.normal("GET", "GET /v1/inventory", "/v1/inventory", nil, 200), MaxJSONAnswer*4)
	if err != nil {
		return nil, err
	}
	x, perr := parseInventory(v)
	return wrapShape("GET /v1/inventory", x, perr)
}

func wrapShape[T any](route string, v T, err error) (T, error) {
	if err != nil {
		return v, &TransportError{Endpoint: route, Err: err}
	}
	return v, nil
}

// ImageInspect is GET /v1/images/inspect.
func (c *HTTPClient) ImageInspect(ctx context.Context, ref string) (*Image, error) {
	k := c.normal("GET", "GET /v1/images/inspect", "/v1/images/inspect", nil, 200)
	k.query = url.Values{"ref": {ref}}
	var img Image
	if err := c.decodeInto(ctx, k, &img); err != nil {
		return nil, err
	}
	if img.Config.Labels == nil {
		img.Config.Labels = map[string]string{}
	}
	return &img, nil
}

// ImagePull is POST /v1/images/pull; every failure is ImagePullFailed.
func (c *HTTPClient) ImagePull(ctx context.Context, ref string) error {
	k := c.normal("POST", "POST /v1/images/pull", "/v1/images/pull", map[string]string{"ref": ref}, 204, 200)
	k.timeout = c.Timeouts.Pull
	if _, err := c.do(ctx, k, MaxJSONAnswer); err != nil {
		return errs.Wrap(errs.ImagePullFailed, "image pull failed", err)
	}
	return nil
}

// ImageLoad is POST /v1/images/load.
func (c *HTTPClient) ImageLoad(ctx context.Context, archive io.Reader, size int64) ([]LoadedImage, error) {
	br := bufio.NewReaderSize(archive, 4096)
	ctype := "application/x-tar"
	if head, _ := br.Peek(2); len(head) == 2 && head[0] == 0x1f && head[1] == 0x8b {
		ctype = "application/gzip"
	}
	k := call{method: "POST", route: "POST /v1/images/load", path: "/v1/images/load", raw: br, size: size,
		contentType: ctype, idle: &idlePolicy{read: c.Timeouts.Load, write: c.Timeouts.StreamIdle}, ok: []int{200}}
	v, err := c.do(ctx, k, MaxJSONAnswer)
	if err != nil {
		return nil, err
	}
	var out []LoadedImage
	for _, item := range anyList(get(obj(v), "images")) {
		o := obj(item)
		out = append(out, LoadedImage{ID: str(get(o, "id")), Tags: strList(get(o, "tags"))})
	}
	return out, nil
}

// ImageFile is GET /v1/images/file.
func (c *HTTPClient) ImageFile(ctx context.Context, ref, path string, limit int64) (io.ReadCloser, int64, error) {
	k := call{method: "GET", route: "GET /v1/images/file", path: "/v1/images/file",
		query: url.Values{"ref": {ref}, "path": {path}, "limit": {strconv.FormatInt(limit, 10)}},
		idle:  &idlePolicy{read: c.Timeouts.StreamIdle, write: c.Timeouts.StreamIdle}, ok: []int{200}}
	resp, cancel, err := c.roundTrip(ctx, k)
	if err != nil {
		return nil, 0, err
	}
	if resp.ContentLength > limit {
		resp.Body.Close()
		cancel()
		return nil, 0, &TransportError{Endpoint: k.route, Err: errors.New("file larger than its limit")}
	}
	return &limitedBody{rc: resp.Body, cancel: cancel, left: limit, route: k.route}, resp.ContentLength, nil
}

// limitedBody fails a stream that delivers more than its limit (the peer's
// declared size is not trusted).
type limitedBody struct {
	rc     io.ReadCloser
	cancel context.CancelFunc
	left   int64
	route  string
}

func (b *limitedBody) Read(p []byte) (int, error) {
	if b.left < 0 {
		return 0, &TransportError{Endpoint: b.route, Err: errors.New("stream exceeds its limit")}
	}
	if int64(len(p)) > b.left+1 {
		p = p[:b.left+1]
	}
	n, err := b.rc.Read(p)
	b.left -= int64(n)
	if b.left < 0 {
		return n, &TransportError{Endpoint: b.route, Err: errors.New("stream exceeds its limit")}
	}
	if err != nil && err != io.EOF {
		err = &TransportError{Endpoint: b.route, Err: err}
	}
	return n, err
}

func (b *limitedBody) Close() error {
	err := b.rc.Close()
	b.cancel()
	return err
}

func accountPath(aid, rest string) string { return "/v1/accounts/" + esc(aid) + rest }

// Account is GET /v1/accounts/{aid}.
func (c *HTTPClient) Account(ctx context.Context, aid string) (*Account, error) {
	v, err := c.do(ctx, c.normal("GET", "GET /v1/accounts/{aid}", accountPath(aid, ""), nil, 200), MaxJSONAnswer)
	if err != nil {
		return nil, err
	}
	x, perr := parseAccount(v)
	return wrapShape("GET /v1/accounts/{aid}", x, perr)
}

// AccountState is GET /v1/accounts/{aid}?fields=state.
func (c *HTTPClient) AccountState(ctx context.Context, aid string) (*AccountState, error) {
	k := c.normal("GET", "GET /v1/accounts/{aid}?fields=state", accountPath(aid, ""), nil, 200)
	k.query = url.Values{"fields": {"state"}}
	k.timeout = c.Timeouts.Ready
	var s AccountState
	return &s, c.decodeInto(ctx, k, &s)
}

// CreateNetwork is PUT /v1/accounts/{aid}/network (201).
func (c *HTTPClient) CreateNetwork(ctx context.Context, aid string, req NetworkRequest) (*Network, error) {
	v, err := c.do(ctx, c.normal("PUT", "PUT /v1/accounts/{aid}/network", accountPath(aid, "/network"), req, 201, 200), MaxJSONAnswer)
	if err != nil {
		return nil, err
	}
	x, perr := ParseNetwork(v)
	return wrapShape("PUT /v1/accounts/{aid}/network", x, perr)
}

// DeleteNetwork is DELETE /v1/accounts/{aid}/network?role=.
func (c *HTTPClient) DeleteNetwork(ctx context.Context, aid, role string) error {
	k := c.normal("DELETE", "DELETE /v1/accounts/{aid}/network", accountPath(aid, "/network"), nil, 204, 200)
	k.query = url.Values{"role": {role}}
	_, err := c.do(ctx, k, MaxJSONAnswer)
	return err
}

// EnsureVolume is PUT /v1/accounts/{aid}/volume.
func (c *HTTPClient) EnsureVolume(ctx context.Context, aid string, req VolumeRequest) (*VolumeResult, error) {
	v, err := c.do(ctx, c.normal("PUT", "PUT /v1/accounts/{aid}/volume", accountPath(aid, "/volume"), req, 200, 201), MaxJSONAnswer)
	if err != nil {
		return nil, err
	}
	o := obj(v)
	vol, err := ParseVolume(get(o, "volume"))
	if err != nil || vol == nil {
		return nil, &TransportError{Endpoint: "PUT /v1/accounts/{aid}/volume", Err: errShape}
	}
	r := &VolumeResult{Volume: vol}
	r.Created, _ = get(o, "created").(bool)
	if q, ok := get(o, "quota_supported").(bool); ok {
		r.QuotaSupported = &q
	}
	return r, nil
}

// DeleteVolume is DELETE /v1/accounts/{aid}/volume.
func (c *HTTPClient) DeleteVolume(ctx context.Context, aid string) error {
	_, err := c.do(ctx, c.normal("DELETE", "DELETE /v1/accounts/{aid}/volume", accountPath(aid, "/volume"), nil, 204, 200), MaxJSONAnswer)
	return err
}

// CreateApp is PUT /v1/accounts/{aid}/app (201, not started).
func (c *HTTPClient) CreateApp(ctx context.Context, aid string, req AppRequest) (*Container, error) {
	if req.Env == nil {
		req.Env = map[string]string{}
	}
	v, err := c.do(ctx, c.normal("PUT", "PUT /v1/accounts/{aid}/app", accountPath(aid, "/app"), req, 201, 200), MaxJSONAnswer)
	if err != nil {
		return nil, err
	}
	x, perr := ParseContainer(v)
	return wrapShape("PUT /v1/accounts/{aid}/app", x, perr)
}

// AppAction is POST /v1/accounts/{aid}/app/{start|stop|restart}.
func (c *HTTPClient) AppAction(ctx context.Context, aid, action string, timeout *int) error {
	body := map[string]any{}
	total := c.Timeouts.Normal
	if timeout != nil {
		body["timeout"] = *timeout
		total = time.Duration(*timeout)*time.Second + c.Timeouts.ActionPlus
	} else {
		total = 10*time.Second + c.Timeouts.ActionPlus
	}
	k := c.normal("POST", "POST /v1/accounts/{aid}/app/{action}", accountPath(aid, "/app/"+esc(action)), body, 204, 200)
	k.timeout = total
	_, err := c.do(ctx, k, MaxJSONAnswer)
	return err
}

// DeleteContainer is DELETE /v1/accounts/{aid}/containers/{suffix}.
func (c *HTTPClient) DeleteContainer(ctx context.Context, aid, suffix string) error {
	_, err := c.do(ctx, c.normal("DELETE", "DELETE /v1/accounts/{aid}/containers/{suffix}",
		accountPath(aid, "/containers/"+esc(suffix)), nil, 204, 200), MaxJSONAnswer)
	return err
}

func (c *HTTPClient) exec(ctx context.Context, route, path string, body any) (*ExecResult, error) {
	k := c.normal("POST", route, path, body, 200)
	k.timeout = c.Timeouts.Exec
	v, err := c.do(ctx, k, MaxExecAnswer)
	if err != nil {
		return nil, err
	}
	o := obj(v)
	code, err := pyjson.IntOf(get(o, "exit_code"))
	if err != nil || !pyjson.IsInt(get(o, "exit_code")) {
		return nil, &TransportError{Endpoint: route, Err: errShape}
	}
	out, err := decodeBase64(str(get(o, "output")))
	if err != nil {
		return nil, &TransportError{Endpoint: route, Err: err}
	}
	return &ExecResult{ExitCode: int(code), Output: out}, nil
}

// AppExec is POST /v1/accounts/{aid}/app/exec.
func (c *HTTPClient) AppExec(ctx context.Context, aid string, argv []string, user string) (*ExecResult, error) {
	return c.exec(ctx, "POST /v1/accounts/{aid}/app/exec", accountPath(aid, "/app/exec"),
		map[string]any{"argv": argv, "user": user})
}

// AppArchiveGet is GET /v1/accounts/{aid}/app/archive?path=.
func (c *HTTPClient) AppArchiveGet(ctx context.Context, aid, path string) (io.ReadCloser, error) {
	k := call{method: "GET", route: "GET /v1/accounts/{aid}/app/archive", path: accountPath(aid, "/app/archive"),
		query: url.Values{"path": {path}}, idle: &idlePolicy{read: c.Timeouts.StreamIdle, write: c.Timeouts.StreamIdle},
		ok: []int{200}}
	resp, cancel, err := c.roundTrip(ctx, k)
	if err != nil {
		return nil, err
	}
	return &limitedBody{rc: resp.Body, cancel: cancel, left: MaxArchiveGet, route: k.route}, nil
}

// AppArchivePut is PUT /v1/accounts/{aid}/app/archive?path=.
func (c *HTTPClient) AppArchivePut(ctx context.Context, aid, path string, archive io.Reader, size int64) error {
	k := call{method: "PUT", route: "PUT /v1/accounts/{aid}/app/archive", path: accountPath(aid, "/app/archive"),
		query: url.Values{"path": {path}}, raw: archive, size: size, contentType: "application/x-tar",
		idle: &idlePolicy{read: c.Timeouts.StreamIdle, write: c.Timeouts.StreamIdle}, ok: []int{204, 200}}
	if archive == nil {
		k.raw = bytes.NewReader(nil)
	}
	_, err := c.do(ctx, k, MaxJSONAnswer)
	return err
}

// AppTop is GET /v1/accounts/{aid}/app/top.
func (c *HTTPClient) AppTop(ctx context.Context, aid string) (*Top, error) {
	var t Top
	return &t, c.decodeInto(ctx, c.normal("GET", "GET /v1/accounts/{aid}/app/top", accountPath(aid, "/app/top"), nil, 200), &t)
}

// WriteResolv is PUT /v1/accounts/{aid}/resolv.
func (c *HTTPClient) WriteResolv(ctx context.Context, aid, nameserver string) error {
	_, err := c.do(ctx, c.normal("PUT", "PUT /v1/accounts/{aid}/resolv", accountPath(aid, "/resolv"),
		map[string]string{"nameserver": nameserver}, 204, 200), MaxJSONAnswer)
	return err
}

// InstallFirewall is PUT /v1/accounts/{aid}/firewall.
func (c *HTTPClient) InstallFirewall(ctx context.Context, aid, rules, defaultGateway string) error {
	k := c.normal("PUT", "PUT /v1/accounts/{aid}/firewall", accountPath(aid, "/firewall"),
		map[string]string{"rules": rules, "default_gateway": defaultGateway}, 204, 200)
	k.timeout = c.Timeouts.Job
	_, err := c.do(ctx, k, MaxJSONAnswer)
	return err
}

// RunJob is POST /v1/accounts/{aid}/jobs.
func (c *HTTPClient) RunJob(ctx context.Context, aid string, job Job) (*JobResult, error) {
	if job.Argv == nil {
		job.Argv = []string{}
	}
	if job.Caps == nil {
		job.Caps = []string{}
	}
	k := c.normal("POST", "POST /v1/accounts/{aid}/jobs", accountPath(aid, "/jobs"), job, 200)
	k.timeout = c.Timeouts.Job
	v, err := c.do(ctx, k, MaxJSONAnswer)
	if err != nil {
		return nil, err
	}
	o := obj(v)
	code, err := pyjson.IntOf(get(o, "exit_code"))
	if err != nil || !pyjson.IsInt(get(o, "exit_code")) {
		return nil, &TransportError{Endpoint: k.route, Err: errShape}
	}
	out, err := decodeBase64(str(get(o, "stdout")))
	if err != nil {
		return nil, &TransportError{Endpoint: k.route, Err: err}
	}
	if len(out) > MaxJobStdout {
		return nil, &TransportError{Endpoint: k.route, Err: errors.New("job output too large")}
	}
	return &JobResult{ExitCode: int(code), Stdout: out}, nil
}

func parseGatewayAnswer(route string, v any) (*Container, string, error) {
	o := obj(v)
	if o == nil {
		return nil, "", &TransportError{Endpoint: route, Err: errShape}
	}
	c, err := ParseContainer(get(o, "gateway"))
	if err != nil {
		return nil, "", &TransportError{Endpoint: route, Err: err}
	}
	return c, str(get(o, "managed_by")), nil
}

// Gateway is GET /v1/gateway.
func (c *HTTPClient) Gateway(ctx context.Context) (*Gateway, error) {
	v, err := c.do(ctx, c.normal("GET", "GET /v1/gateway", "/v1/gateway", nil, 200), MaxJSONAnswer)
	if err != nil {
		return nil, err
	}
	gw, managed, err := parseGatewayAnswer("GET /v1/gateway", v)
	if err != nil {
		return nil, err
	}
	return &Gateway{Container: gw, ManagedBy: managed}, nil
}

// EnsureGateway is POST /v1/gateway/ensure.
func (c *HTTPClient) EnsureGateway(ctx context.Context, uplink *UplinkRequest) (*EnsureResult, error) {
	body := map[string]any{}
	if uplink != nil {
		body["uplink"] = uplink
	}
	k := c.normal("POST", "POST /v1/gateway/ensure", "/v1/gateway/ensure", body, 200)
	k.timeout = c.Timeouts.Recreate
	v, err := c.do(ctx, k, MaxJSONAnswer)
	if err != nil {
		return nil, err
	}
	gw, _, err := parseGatewayAnswer(k.route, v)
	if err != nil {
		return nil, err
	}
	return &EnsureResult{Gateway: gw, Action: str(get(obj(v), "action"))}, nil
}

// RecreateGateway is POST /v1/gateway/recreate.
func (c *HTTPClient) RecreateGateway(ctx context.Context, image string) (*Container, error) {
	k := c.normal("POST", "POST /v1/gateway/recreate", "/v1/gateway/recreate", map[string]string{"image": image}, 200)
	k.timeout = c.Timeouts.Recreate
	v, err := c.do(ctx, k, MaxJSONAnswer)
	if err != nil {
		return nil, err
	}
	if o := obj(v); o != nil && o.Has("gateway") {
		gw, _, err := parseGatewayAnswer(k.route, v)
		return gw, err
	}
	x, perr := ParseContainer(v)
	return wrapShape(k.route, x, perr)
}

// GatewayExec is POST /v1/gateway/exec.
func (c *HTTPClient) GatewayExec(ctx context.Context, argv []string) (*ExecResult, error) {
	return c.exec(ctx, "POST /v1/gateway/exec", "/v1/gateway/exec", map[string]any{"argv": argv})
}

// ConnectGateway is PUT /v1/gateway/networks/{aid}.
func (c *HTTPClient) ConnectGateway(ctx context.Context, aid, ipv4 string) error {
	_, err := c.do(ctx, c.normal("PUT", "PUT /v1/gateway/networks/{aid}", "/v1/gateway/networks/"+esc(aid),
		map[string]string{"ipv4": ipv4}, 204, 200), MaxJSONAnswer)
	return err
}

// DisconnectGateway is DELETE /v1/gateway/networks/{aid}.
func (c *HTTPClient) DisconnectGateway(ctx context.Context, aid string) error {
	_, err := c.do(ctx, c.normal("DELETE", "DELETE /v1/gateway/networks/{aid}", "/v1/gateway/networks/"+esc(aid), nil, 204, 200), MaxJSONAnswer)
	return err
}

// WriteGatewayFile is PUT /v1/gateway/files/{name}.
func (c *HTTPClient) WriteGatewayFile(ctx context.Context, name string, data []byte) error {
	k := call{method: "PUT", route: "PUT /v1/gateway/files/{name}", path: "/v1/gateway/files/" + esc(name),
		raw: bytes.NewReader(data), size: int64(len(data)), contentType: "application/octet-stream",
		timeout: c.Timeouts.Normal, ok: []int{204, 200}}
	_, err := c.do(ctx, k, MaxJSONAnswer)
	return err
}

// UpgradeController is POST /v1/controller/upgrade (202).
func (c *HTTPClient) UpgradeController(ctx context.Context, image string) error {
	k := c.normal("POST", "POST /v1/controller/upgrade", "/v1/controller/upgrade", map[string]string{"image": image}, 202)
	k.timeout = c.Timeouts.Upgrade
	_, err := c.do(ctx, k, MaxJSONAnswer)
	if e, ok := AsError(err); ok && e.Status == 403 {
		return errs.Wrap(errs.InvalidImage, "controller image does not support the guard", err)
	}
	return err
}

// UpgradeStatus is GET /v1/controller/upgrade.
func (c *HTTPClient) UpgradeStatus(ctx context.Context) (*UpgradeStatus, error) {
	var s UpgradeStatus
	return &s, c.decodeInto(ctx, c.normal("GET", "GET /v1/controller/upgrade", "/v1/controller/upgrade", nil, 200), &s)
}

var _ Client = (*HTTPClient)(nil)
