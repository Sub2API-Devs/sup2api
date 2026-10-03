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
	w.Header().Set("Cache-Control", "no-store")
	if r.URL.Path == "/healthz" && r.Method == "GET" {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(Object{"status": "ok", "claude_version": g.Runner.Version})
		return
	}
	if !g.authorized(r) {
		apiError(w, 401, "authentication_error", "Invalid gateway API key")
		return
	}
	if r.URL.Path != "/v1/messages" {
		apiError(w, 404, "not_found_error", "Unknown endpoint")
		return
	}
	if r.Method != "POST" {
		apiError(w, 405, "invalid_request_error", "Use POST")
		return
	}
	if v := r.Header.Get("anthropic-version"); v != "" && v != "2023-06-01" {
		apiError(w, 400, "invalid_request_error", "Unsupported anthropic-version")
		return
	}
	if r.Header.Get("anthropic-beta") != "" {
		apiError(w, 400, "invalid_request_error", "anthropic-beta is not supported in v0.1")
		return
	}
	body, e := io.ReadAll(http.MaxBytesReader(w, r.Body, 32<<20))
	if e != nil {
		var large *http.MaxBytesError
		if errors.As(e, &large) {
			apiError(w, 413, "request_too_large", "Request exceeds 32 MiB")
		} else {
			apiError(w, 400, "invalid_request_error", "Cannot read body")
		}
		return
	}
	req, e := parseRequest(body)
	if e != nil {
		apiError(w, 400, "invalid_request_error", e.Error())
		return
	}
	// Explicit opt-in, plus server allowlist, plus current client declarations.
	// A same-named custom tool stays MCP unless this header selects native mode.
	for _, name := range strings.Split(r.Header.Get("X-CCGateway-Native-Tools"), ",") {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		if !g.NativeAllowed[name] {
			apiError(w, 400, "invalid_request_error", "Native tool not allowed: "+name)
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
			apiError(w, 400, "invalid_request_error", "Native tool must be declared in tools: "+name)
			return
		}
		req.Native[name] = true
	}
	logical := r.Header.Get("X-CCGateway-Session-ID")
	if logical == "" {
		logical = uuid()
	}
	if !sessionName.MatchString(logical) {
		apiError(w, 400, "invalid_request_error", "Invalid gateway session ID")
		return
	}
	g.mu.Lock()
	if g.busy == nil {
		g.busy = map[string]bool{}
	}
	if g.busy[logical] {
		g.mu.Unlock()
		apiError(w, 409, "invalid_request_error", "Session has an active request; use a different session ID for concurrent branches")
		return
	}
	g.busy[logical] = true
	g.mu.Unlock()
	defer func() { g.mu.Lock(); delete(g.busy, logical); g.mu.Unlock() }()
	select {
	case g.Slots <- struct{}{}:
		defer func() { <-g.Slots }()
	default:
		apiError(w, 429, "rate_limit_error", "Gateway concurrency limit reached")
		return
	}
	started := time.Now()
	ctx, cancel := context.WithTimeout(r.Context(), g.Timeout)
	defer cancel()
	dir, e := os.MkdirTemp(g.Runner.Work, "request-")
	if e != nil {
		apiError(w, 500, "api_error", "Cannot create request workspace")
		return
	}
	defer os.RemoveAll(dir)
	p, e := prepareHistory(req, g.Cache, logical, dir, g.Runner.Version)
	if e != nil {
		apiError(w, 500, "api_error", "Cannot prepare history")
		return
	}
	w.Header().Set("request-id", uuid())
	w.Header().Set("X-CCGateway-Session-ID", logical)
	w.Header().Set("X-CCGateway-History", p.Mode)
	w.Header().Set("X-CCGateway-Cache-TTL", fmt.Sprint(int(req.TTL.Seconds())))
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
	answer, e := g.Runner.run(ctx, req, p, dir, send)
	if e == nil {
		if err := p.commit(req, answer, g.Cache, logical, dir, g.Runner.Version, started); err != nil {
			log.Print("history cache write failed; future requests will rebuild")
		}
	}
	if e != nil {
		if r.Context().Err() != nil {
			return
		}
		status := 502
		kind := "api_error"
		message := e.Error()
		if ctx.Err() != nil {
			status = 504
			message = "Claude Code request timed out"
		}
		if streaming {
			_ = send(Object{"type": "error", "error": Object{"type": kind, "message": message}})
		} else {
			apiError(w, status, kind, message)
		}
		return
	}
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
	host, _, e := net.SplitHostPort(bind)
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
	timeout, e := time.ParseDuration(envDefault("CCG_TIMEOUT", "3m"))
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
	g := &Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: work}, Cache: cache, Key: key, Timeout: timeout, Slots: make(chan struct{}, 4), NativeAllowed: native}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	mux := http.NewServeMux()
	mux.Handle("/", g)
	mux.Handle("/admin/", &authManager{cli: cli, key: os.Getenv("CCG_ADMIN_KEY")})
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
	log.Printf("ccgateway listening on %s; Claude Code %s; local cache TTL 5m/1h", bind, version)
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
