// Package api is the controller's HTTP API (Python http_api.py; behaviour
// H1-H12, R1-R23, T1-T13; 02 §3): authentication, routing on the raw
// request target, the error answers of each endpoint group, the byte
// tunnel and the admin pass-through to account Workers. Runtime work is the
// business packages' (contract.*); this package only translates.
//
// Deliberate differences from Python 0.1.118 (05 §8):
//   - BUG-11: the Authorization value must be "Bearer <key>" (a bare key is
//     401) and a non-ASCII value is 401 instead of a dropped connection;
//   - BUG-12: methods other than GET, POST, PUT and DELETE are
//     authenticated first, then answered 405 {"error":"method_not_allowed"}
//     with Connection: close (Python: 501 HTML before authentication);
//   - POST /runtime/egress/recreate is new (02 §7.4);
//   - no Server header; a request body that ends before its Content-Length
//     is a dropped connection (Python handed the short body on).
package api

import (
	"crypto/sha256"
	"crypto/subtle"
	"errors"
	"net"
	"net/http"
	"regexp"
	"runtime/debug"
	"strings"
	"sync"
	"time"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/logx"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/workeradmin"
)

// Limits and timeouts (http_api.py).
const (
	// MaxAccountBody is MAX_ACCOUNT_BODY: every account route reads its body first.
	MaxAccountBody = 32 << 20
	// MaxSmallBody is read_body's default (worker, uploads, runtime images, upgrade).
	MaxSmallBody = 64 << 10
	// MaxCleanupBody is POST /runtime/cleanup's limit.
	MaxCleanupBody = 8 << 20
	// MaxChunk is images.MAX_CHUNK.
	MaxChunk = 64 << 20
	// IdleTimeout is the per-recv/per-send socket timeout (E4).
	IdleTimeout = 240 * time.Second
	// TunnelIdle is TUNNEL_IDLE_SECONDS (T7).
	TunnelIdle = 3700 * time.Second
	// DialTimeout is the tunnel's upstream connect timeout (T3).
	DialTimeout = 5 * time.Second
)

// Routes (H4), anchored: Python's fullmatch on the raw target.
var (
	routeAccount = regexp.MustCompile(`^/accounts(?:/(` + names.KeyPattern + `)(?:/(config|status|connection|tunnel|worker|egress|` +
		`admin/(?:status|usage|features|request-logs(?:/(?:query|detail|read))?|cli|auth/(?:session|start|complete|cancel|logout|refresh))))?)?$`)
	routeUpload  = regexp.MustCompile(`^/images/uploads(?:/([A-Za-z0-9_-]{22})(/load)?)?$`)
	routeRuntime = regexp.MustCompile(`^/runtime/(images|controller|cleanup|egress/recreate)$`)
	decimal      = regexp.MustCompile(`^[0-9]{1,12}$`)
)

// Options are the Server's dependencies.
type Options struct {
	// Key is CCG_CONTROLLER_KEY.
	Key      string
	Accounts contract.Accounts
	Updates  contract.Updates
	Uploads  contract.Uploads
	Cleanup  contract.Cleanup
	Admin    contract.Admin
	// Worker calls Workers' admin ports (pass-through). nil: workeradmin.New().
	Worker *workeradmin.Client
	// Dial opens the tunnel's upstream connection. nil: net.Dialer.
	Dial func(network, addr string, timeout time.Duration) (net.Conn, error)
	// Log is the controller log ("ccgateway.controller"). nil: logx.Discard().
	Log *logx.Logger
	// Idle and TunnelIdle override IdleTimeout and TunnelIdle (tests).
	Idle       time.Duration
	TunnelIdle time.Duration
}

// Server is the HTTP handler.
type Server struct {
	key      [sha256.Size]byte
	accounts contract.Accounts
	updates  contract.Updates
	uploads  contract.Uploads
	cleanup  contract.Cleanup
	admin    contract.Admin
	worker   *workeradmin.Client
	dial     func(network, addr string, timeout time.Duration) (net.Conn, error)
	log      *logx.Logger
	idle     time.Duration
	tunIdle  time.Duration

	mu      sync.Mutex
	tunnels map[net.Conn]struct{}
	closed  bool
}

// New checks the options and builds the handler.
func New(o Options) (*Server, error) {
	if o.Key == "" || o.Accounts == nil || o.Updates == nil || o.Uploads == nil || o.Cleanup == nil || o.Admin == nil {
		return nil, errors.New("api: Key and every business interface are required")
	}
	s := &Server{key: sha256.Sum256([]byte(o.Key)), accounts: o.Accounts, updates: o.Updates, uploads: o.Uploads,
		cleanup: o.Cleanup, admin: o.Admin, worker: o.Worker, dial: o.Dial, log: o.Log, idle: o.Idle,
		tunIdle: o.TunnelIdle, tunnels: map[net.Conn]struct{}{}}
	if s.worker == nil {
		s.worker = workeradmin.New()
	}
	if s.dial == nil {
		s.dial = net.DialTimeout
	}
	if s.log == nil {
		s.log = logx.Discard()
	}
	if s.idle == 0 {
		s.idle = IdleTimeout
	}
	if s.tunIdle == 0 {
		s.tunIdle = TunnelIdle
	}
	return s, nil
}

// authorized is H1 with BUG-11 fixed: exactly "Bearer <key>", compared in
// constant time (digests, so the length does not shortcut).
func (s *Server) authorized(value string) bool {
	const prefix = "Bearer "
	ok := len(value) >= len(prefix) && value[:len(prefix)] == prefix
	given := ""
	if ok {
		given = value[len(prefix):]
	}
	digest := sha256.Sum256([]byte(given))
	same := subtle.ConstantTimeCompare(digest[:], s.key[:]) == 1
	return ok && same
}

// ServeHTTP is handle_request.
func (s *Server) ServeHTTP(rw http.ResponseWriter, r *http.Request) {
	ex := &exchange{s: s, w: &trackWriter{ResponseWriter: rw}, r: r}
	defer func() {
		if v := recover(); v != nil {
			if v == http.ErrAbortHandler {
				panic(v)
			}
			ex.close = true
			s.log.Error("%s key=%s path=%s -> 503 runtime_unavailable: panic: %v\n%s", r.Method, ex.keyText(),
				ex.pathText(), v, debug.Stack())
			if !ex.w.started && !ex.hijacked {
				ex.fail(http.StatusServiceUnavailable, "runtime_unavailable", true)
			}
		}
	}()
	ex.handle()
	if ex.abort && !ex.w.started && !ex.hijacked {
		// Python never answers a dropped client; net/http would send an
		// empty 200 for a handler that wrote nothing.
		panic(http.ErrAbortHandler)
	}
}

func (ex *exchange) handle() {
	r := ex.r
	if !ex.s.authorized(r.Header.Get("Authorization")) {
		ex.fail(http.StatusUnauthorized, "unauthorized", true)
		return
	}
	switch r.Method {
	case http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete:
	default:
		ex.fail(http.StatusMethodNotAllowed, "method_not_allowed", true) // BUG-12 fixed
		return
	}
	target := r.RequestURI
	if strings.HasPrefix(target, "//") {
		// http.server (3.12, gh-87389) reduces leading slashes to one
		// before the handler sees self.path.
		target = "/" + strings.TrimLeft(target, "/")
	}
	if target == "/health" {
		ex.close = true // any request body is left unread
		if r.Method != http.MethodGet {
			ex.fail(http.StatusMethodNotAllowed, "method_not_allowed", false)
			return
		}
		ex.reply(http.StatusOK, ex.s.admin.Health(r.Context()))
		return
	}
	if m := routeUpload.FindStringSubmatch(target); m != nil {
		ex.handleManagement(target, func() error { return ex.uploadEndpoint(m[1], m[2] != "") })
		return
	}
	if m := routeRuntime.FindStringSubmatch(target); m != nil {
		ex.handleManagement(target, func() error { return ex.runtimeEndpoint(m[1]) })
		return
	}
	m := routeAccount.FindStringSubmatch(target)
	if m == nil {
		ex.fail(http.StatusNotFound, "not_found", true)
		return
	}
	aid, path := m[1], m[2]
	ex.key, ex.path = &aid, &path
	if aid == "" {
		ex.key = nil
	}
	if path == "" {
		ex.path = nil
	}
	switch path {
	case "tunnel":
		ex.handleTunnel(aid) // GET without a body; never read one
		return
	case "worker":
		ex.handleWorker(aid)
		return
	}
	body, err := ex.readBody(MaxAccountBody)
	if err == nil {
		err = ex.accountRequest(aid, path, body)
	}
	if err != nil {
		named := requestErrors
		if path == "" && r.Method == http.MethodDelete {
			named = deleteErrors
		}
		ex.answerError(err, named, false)
	}
}

// track registers a hijacked connection; false when the server is closing.
func (s *Server) track(c net.Conn) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return false
	}
	s.tunnels[c] = struct{}{}
	return true
}

func (s *Server) untrack(c net.Conn) {
	s.mu.Lock()
	delete(s.tunnels, c)
	s.mu.Unlock()
}

// CloseTunnels closes every open tunnel connection and refuses new ones
// (graceful exit, 02 §4.5). It returns how many connections it closed.
func (s *Server) CloseTunnels() int {
	s.mu.Lock()
	s.closed = true
	conns := make([]net.Conn, 0, len(s.tunnels))
	for c := range s.tunnels {
		conns = append(conns, c)
	}
	s.tunnels = map[net.Conn]struct{}{}
	s.mu.Unlock()
	for _, c := range conns {
		c.Close()
	}
	return len(conns)
}

// OpenTunnels is the number of registered tunnel connections (two per tunnel).
func (s *Server) OpenTunnels() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.tunnels)
}
