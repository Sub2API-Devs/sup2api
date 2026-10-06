package main

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"syscall"
	"time"
)

type Gateway struct {
	Runner        *Runner
	Cache         *HistoryCache
	Key           string
	Timeout       time.Duration
	Slots         chan struct{}
	NativeAllowed map[string]bool
	RequestLogDir string
	RequestLogs   *requestLogStore
	mu            sync.Mutex
	busy          map[string]bool
}

func apiError(w http.ResponseWriter, status int, kind, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Object{"type": "error", "error": Object{"type": kind, "message": msg}})
}
func (g *Gateway) authorized(r *http.Request) bool {
	if g.Key == "" {
		return true
	}
	key := r.Header.Get("x-api-key")
	if key == "" {
		key = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	}
	return subtle.ConstantTimeCompare([]byte(key), []byte(g.Key)) == 1
}

var sessionName = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,128}$`)

func (g *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if serveOutboundRelay(w, r) {
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	if r.URL.Path == "/healthz" && r.Method == "GET" {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(Object{"status": "ok", "claude_version": g.Runner.Version})
		return
	}
	diagnostic := newRequestDiagnostic(w, r)
	diagnostic.store = g.RequestLogs
	w = diagnostic.capture(w, r, g.RequestLogDir)
	defer diagnostic.finish()
	fail := func(status int, kind, message string) {
		diagnostic.fail(status, kind, message)
		apiError(w, status, kind, message)
	}
	if !g.authorized(r) {
		fail(401, "authentication_error", "Invalid gateway API key")
		return
	}
	if r.URL.Path != "/v1/messages" {
		fail(404, "not_found_error", "Unknown endpoint")
		return
	}
	if r.Method != "POST" {
		fail(405, "invalid_request_error", "Use POST")
		return
	}
	if v := r.Header.Get("anthropic-version"); v != "" && v != "2023-06-01" {
		fail(400, "invalid_request_error", "Unsupported anthropic-version")
		return
	}
	diagnostic.stage = "read_body"
	body, e := io.ReadAll(http.MaxBytesReader(w, r.Body, 32<<20))
	if e != nil {
		var large *http.MaxBytesError
		if errors.As(e, &large) {
			fail(413, "request_too_large", "Request exceeds 32 MiB")
		} else {
			fail(400, "invalid_request_error", "Cannot read body")
		}
		return
	}
	diagnostic.request(body, r.Header)
	diagnostic.stage = "parse_request"
	req, e := parsePolicyRequest(body, r.Header)
	if e != nil {
		fail(400, "invalid_request_error", e.Error())
		return
	}
	req.diagnostic = diagnostic
	diagnostic.stage = "admission"
	// Explicit opt-in, plus server allowlist, plus current client declarations.
	// Same-named client tools use SDK MCP unless opted in and their complete
	// definition matches the verified native catalogue below.
	for _, name := range strings.Split(r.Header.Get("X-CCGateway-Native-Tools"), ",") {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		if !g.NativeAllowed[name] {
			fail(400, "invalid_request_error", "Native tool not allowed: "+name)
			return
		}
		found := false
		for _, t := range req.Tools {
			if t.Name == name {
				found = true
				break
			}
		}
		if !found {
			fail(400, "invalid_request_error", "Native tool must be declared in tools: "+name)
			return
		}
		req.Native[name] = true
	}
	matchNativeTools(req, g.Runner.Version)
	if err := validateToolNames(req); err != nil {
		fail(400, "invalid_request_error", err.Error())
		return
	}
	logical := r.Header.Get("X-CCGateway-Session-ID")
	if logical == "" {
		logical = "auto"
	}
	if !sessionName.MatchString(logical) {
		fail(400, "invalid_request_error", "Invalid gateway session ID")
		return
	}
	sessionLabel := logical
	busyKey := digest([]string{r.Header.Get("X-CCGateway-Session-Scope"), logical})
	if r.Header.Get("X-CCGateway-Session-ID") == "" {
		busyKey = uuid()
	}
	logical = digest([]string{r.Header.Get("X-CCGateway-Session-Scope"), logical})
	g.mu.Lock()
	if g.busy == nil {
		g.busy = map[string]bool{}
	}
	if g.busy[busyKey] {
		g.mu.Unlock()
		fail(409, "invalid_request_error", "Session has an active request; use a different session ID for concurrent branches")
		return
	}
	g.busy[busyKey] = true
	g.mu.Unlock()
	defer func() { g.mu.Lock(); delete(g.busy, busyKey); g.mu.Unlock() }()
	select {
	case g.Slots <- struct{}{}:
		defer func() { <-g.Slots }()
	default:
		fail(429, "rate_limit_error", "Gateway concurrency limit reached")
		return
	}
	started := time.Now()
	ctx, cancel := context.WithTimeout(r.Context(), g.Timeout)
	defer cancel()
	dir, e := os.MkdirTemp(g.Runner.Work, "request-")
	if e != nil {
		fail(500, "api_error", "Cannot create request workspace")
		return
	}
	defer os.RemoveAll(dir)
	diagnostic.stage = "prepare_history"
	p, e := prepareHistory(req, g.Cache, logical, dir, g.Runner.Version)
	if e != nil {
		fail(500, "api_error", "Cannot prepare history")
		return
	}
	defer p.release()
	diagnostic.fields["history_mode"] = p.Mode
	w.Header().Set("X-CCGateway-Session-ID", sessionLabel)
	w.Header().Set("X-CCGateway-History", p.Mode)
	w.Header().Set("X-CCGateway-Cache-TTL", fmt.Sprint(int((24 * time.Hour).Seconds())))
	w.Header().Set("X-CCGateway-Cache-Scope", "local-only")
	streaming := false
	send := func(event Object) error {
		if !req.Stream {
			return nil
		}
		controller := http.NewResponseController(w)
		_ = controller.SetWriteDeadline(time.Now().Add(15 * time.Second))
		if !streaming {
			w.Header().Set("Content-Type", "text/event-stream")
			w.Header().Set("X-Accel-Buffering", "no")
			w.WriteHeader(200)
			streaming = true
		}
		b, e := json.Marshal(event)
		if e != nil {
			return e
		}
		if _, e = fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), b); e != nil {
			return e
		}
		return controller.Flush()
	}
	diagnostic.stage = "claude_code"
	answer, e := g.Runner.run(ctx, req, p, dir, send)
	if e == nil {
		if err := p.commit(req, answer, g.Cache, logical, dir, g.Runner.Version, started); err != nil {
			log.Print("history cache write failed; future requests will rebuild")
		}
	}
	if e != nil {
		diagnostic.fail(502, "api_error", e.Error())
		if r.Context().Err() != nil {
			diagnostic.fields["client_canceled"] = true
			return
		}
		status := 502
		kind := "api_error"
		message := e.Error()
		if ctx.Err() != nil {
			status = 504
			message = "Claude Code request timed out"
		}
		var upstream *upstreamError
		if errors.As(e, &upstream) {
			// The API's own error, as a direct client would receive it.
			status = upstream.Status
			official := Object{"type": kind, "message": message}
			if decoded, err := decodeObject(upstream.Body); err == nil {
				if inner, ok := decoded["error"].(Object); ok {
					official = inner
					kind, message = str(inner, "type"), str(inner, "message")
				}
			}
			diagnostic.fail(status, kind, message)
			if streaming {
				_ = send(Object{"type": "error", "error": official})
				return
			}
			contentType := upstream.ContentType
			if contentType == "" {
				contentType = "application/json"
			}
			w.Header().Set("Content-Type", contentType)
			w.WriteHeader(status)
			_, _ = w.Write(upstream.Body)
			return
		}
		diagnostic.fail(status, kind, message)
		if streaming {
			_ = send(Object{"type": "error", "error": Object{"type": kind, "message": message}})
		} else {
			fail(status, kind, message)
		}
		return
	}
	diagnostic.stage = "completed"
	if req.Stream {
		_ = send(Object{"type": "message_stop"})
	} else {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(answer)
	}
}
func envDefault(k, v string) string {
	if s := os.Getenv(k); s != "" {
		return s
	}
	return v
}
func serve() error {
	bind := envDefault("CCG_BIND", "127.0.0.1:8787")
	key := os.Getenv("CCG_API_KEY")
	if adminKey := os.Getenv("CCG_ADMIN_KEY"); adminKey != "" && (key == "" || adminKey == key) {
		return fmt.Errorf("management mode requires distinct non-empty CCG_ADMIN_KEY and CCG_API_KEY")
	}
	host, port, e := net.SplitHostPort(bind)
	if e != nil {
		return e
	}
	ip := net.ParseIP(host)
	if key == "" && (ip == nil || !ip.IsLoopback()) {
		return fmt.Errorf("CCG_API_KEY required when binding outside loopback")
	}
	cli, e := resolveCLI(os.Getenv("CCG_CLAUDE_PATH"))
	if e != nil {
		return e
	}
	version, e := checkVersion(cli)
	if e != nil {
		return e
	}
	root, e := filepath.Abs(envDefault("CCG_DATA_DIR", ".ccgateway"))
	if e != nil {
		return e
	}
	if e = os.MkdirAll(root, 0700); e != nil {
		return e
	}
	work, e := os.MkdirTemp(root, "worker-")
	if e != nil {
		return e
	}
	defer os.RemoveAll(work)
	plugin, e := extractMod(work)
	if e != nil {
		return e
	}
	cache, e := newCache(filepath.Join(root, "cache"), 128<<20)
	if e != nil {
		return e
	}
	timeout, e := time.ParseDuration(envDefault("CCG_TIMEOUT", "1h"))
	if e != nil || timeout <= 0 {
		return fmt.Errorf("invalid CCG_TIMEOUT")
	}
	native := map[string]bool{}
	for _, n := range strings.Split(os.Getenv("CCG_NATIVE_TOOLS"), ",") {
		n = strings.TrimSpace(n)
		if n != "" {
			if !toolName.MatchString(n) || n == "default" {
				return fmt.Errorf("CCG_NATIVE_TOOLS must list exact tool names")
			}
			native[n] = true
		}
	}
	proxy, e := NewProxyConfigStore(root, os.Getenv("CCG_ADMIN_KEY"))
	if e != nil {
		return e
	}
	logDir, e := configureRequestLogs(root)
	if e != nil {
		return e
	}
	g := &Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: work, Proxy: proxy}, Cache: cache, Key: key, Timeout: timeout, Slots: make(chan struct{}, 4), NativeAllowed: native, RequestLogDir: logDir}
	g.RequestLogs = &requestLogStore{root: filepath.Join(root, "request-logs"), enabled: logDir != "", active: map[*requestDiagnostic]bool{}}
	relayHost := "127.0.0.1"
	if ip != nil && ip.IsLoopback() {
		relayHost = ip.String()
	}
	g.Runner.InternalBaseURL = "http://" + net.JoinHostPort(relayHost, port)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	mux := http.NewServeMux()
	mux.Handle("/", g)
	mux.Handle("/admin/", &authManager{cli: cli, key: os.Getenv("CCG_ADMIN_KEY"), proxy: proxy, version: version, requestLogs: g.RequestLogs})
	server := &http.Server{Addr: bind, Handler: mux, ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second, BaseContext: func(net.Listener) context.Context { return ctx }}
	done := make(chan struct{})
	backgroundDone := make(chan struct{})
	defer close(done)
	go func() {
		defer close(backgroundDone)
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				cache.prune()
				if logDir != "" {
					pruneRequestLogs(logDir)
				}
			case <-ctx.Done():
				shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				_ = server.Shutdown(shutdown)
				return
			case <-done:
				return
			}
		}
	}()
	log.Printf("ccgateway listening on %s; Claude Code %s; native session retention 24h", bind, version)
	e = server.ListenAndServe()
	if errors.Is(e, http.ErrServerClosed) {
		<-backgroundDone
		return nil
	}
	return e
}
func main() {
	if e := serve(); e != nil {
		log.Print(e)
		os.Exit(1)
	}
}
