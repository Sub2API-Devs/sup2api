package engine

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
	credits       *creditRegistry
	resources     *resourceBroker
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
	messageIDs    *messageOwnership
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
	if serveModControl(w, r) {
		return
	}
	if serveOutboundRelay(w, r) {
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	if r.URL.Path == "/healthz" && r.Method == "GET" {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(Object{"status": "ok", "claude_version": g.Runner.Version})
		return
	}
	if g.serveHelperRequirement(w, r) {
		return
	}
	if g.serveHelperHistory(w, r) {
		return
	}
	diagnostic := newRequestDiagnostic(w, r)
	diagnostic.store = g.RequestLogs
	w = diagnostic.capture(w, r, g.RequestLogDir)
	defer diagnostic.finish()
	x := &exchange{g: g, w: w, r: r, diagnostic: diagnostic}
	defer func() { x.resources.close() }()
	if !x.admit() {
		return
	}
	branch, ok := x.session()
	if !ok {
		return
	}
	// Requests of one session never wait for each other (§53.12): each runs on
	// a private copy of its branch.
	select {
	case g.Slots <- struct{}{}:
		defer func() { <-g.Slots }()
	default:
		// The Worker is full for a moment, not the account rate limited: the
		// core then pauses the account for a second and tries another,
		// instead of its default minute of cooldown.
		x.w.Header().Set("Retry-After", "1")
		x.fail(429, "rate_limit_error", "Gateway concurrency limit reached")
		return
	}
	x.execute(branch)
}

// exchange is one /v1/messages request: admission, the CLI run, and the
// response, which turns into an SSE stream once the first event is sent.
type exchange struct {
	resources    *resourceAdmission
	g            *Gateway
	w            http.ResponseWriter
	r            *http.Request
	diagnostic   *requestDiagnostic
	req          *Request
	streaming    bool
	messageScope string
}

// fail records and writes an error.
func (x *exchange) fail(status int, kind, message string) {
	x.diagnostic.fail(status, kind, message)
	x.writeError(Object{"type": kind, "message": message}, status)
}

// writeError writes an error as an SSE error event once streaming has
// started, otherwise as a JSON error response.
func (x *exchange) writeError(body Object, status int) {
	if x.streaming {
		_ = x.send(Object{"type": "error", "error": body})
		return
	}
	apiError(x.w, status, str(body, "type"), str(body, "message"))
}

// admit authenticates and parses the request and admits its native tools.
func (x *exchange) admit() bool {
	r := x.r
	if !x.g.authorized(r) {
		x.fail(401, "authentication_error", "Invalid gateway API key")
		return false
	}
	if r.URL.Path != "/v1/messages" && r.URL.Path != "/v1/messages/count_tokens" {
		x.fail(404, "not_found_error", "Unknown endpoint")
		return false
	}
	if r.Method != "POST" {
		x.fail(405, "invalid_request_error", "Use POST")
		return false
	}
	if v := r.Header.Get("anthropic-version"); v != "" && v != "2023-06-01" {
		x.fail(400, "invalid_request_error", "Unsupported anthropic-version")
		return false
	}
	x.diagnostic.setStage("read_body")
	body, e := io.ReadAll(http.MaxBytesReader(x.w, r.Body, 32<<20))
	if e != nil {
		var large *http.MaxBytesError
		if errors.As(e, &large) {
			x.fail(413, "request_too_large", "Request exceeds 32 MiB")
		} else {
			x.fail(400, "invalid_request_error", "Cannot read body")
		}
		return false
	}
	x.diagnostic.prepareSecrets(body, r.Header.Values("Anthropic-Beta")...)
	x.diagnostic.request(body, r.Header)
	x.diagnostic.setStage("parse_request")
	x.resources, e = x.g.admitResourceReferences(r.Context(), body, r.Header)
	if e != nil {
		x.fail(400, "invalid_request_error", e.Error())
		return false
	}
	if x.resources != nil {
		x.resources.applyResponseHeaders(x.w.Header())
		x.diagnostic.trace("resource_references_verified", x.resources.diagnosticFacts())
	}
	parse := func(body []byte, h http.Header, access *resourceAdmission) (*Request, error) {
		helper, _ := r.Context().Value(helperHistoryContextKey{}).(*helperHistoryExecution)
		return parsePolicyRequestWithHelper(body, h, access, helper)
	}
	if r.URL.Path == "/v1/messages/count_tokens" {
		// CCGateway offers no token counting (user decision, 2026-10-11). The
		// endpoint stays declared so a client gets this 400 at once; with no
		// route it would get a 529, which SDKs retry. Claude Code then
		// estimates locally.
		if policy, err := requestPolicy(r.Header); err == nil && policy.RelayMode == "passthrough" {
			x.fail(400, "invalid_request_error", "count_tokens is not supported by this gateway")
			return false
		}
		parse = parseTokenCountRequestWithResources
	}
	req, e := parse(body, r.Header, x.resources)
	if e != nil {
		x.fail(400, "invalid_request_error", e.Error())
		return false
	}
	req.diagnostic = x.diagnostic
	req.responseFacts = &providerResponseFacts{}
	x.req = req
	x.ownershipScope()
	if err := x.validateDiagnosticsOwnership(); err != nil {
		x.fail(400, "invalid_request_error", err.Error())
		return false
	}
	x.diagnostic.setStage("admission")
	if e = x.g.admitNativeTools(req, r.Header.Get("X-CCGateway-Native-Tools")); e == nil {
		matchNativeTools(req, x.g.Runner.Version)
		e = validateToolNames(req)
		if e == nil {
			e = req.validateInlineNativeMapping(x.g.Runner.Version)
		}
	}
	if e != nil {
		x.fail(400, "invalid_request_error", e.Error())
		return false
	}
	if e = x.admitCredit(body); e != nil {
		var storage *creditLocalStorageError
		if errors.As(e, &storage) {
			x.fail(503, "gateway_credit_storage", storage.Error())
			return false
		}
		x.fail(400, "invalid_request_error", e.Error())
		return false
	}
	if e = x.req.finalizeCreditPTCAdmission(); e != nil {
		x.fail(400, "invalid_request_error", e.Error())
		return false
	}
	if helper, _ := r.Context().Value(helperHistoryContextKey{}).(*helperHistoryExecution); helper != nil {
		if e = req.admitHelperHistory(helper); e != nil {
			x.fail(400, "invalid_request_error", e.Error())
			return false
		}
	}
	return true
}

// Validate legacy opt-in headers for compatibility. Automatic exact matching
// runs afterwards and does not grant execution permission inside the container.
func (g *Gateway) admitNativeTools(req *Request, header string) error {
	for _, name := range strings.Split(header, ",") {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		if !g.NativeAllowed[name] {
			return fmt.Errorf("Native tool not allowed: %s", name)
		}
		found := false
		for _, t := range req.Tools {
			if t.Name == name {
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("Native tool must be declared in tools: %s", name)
		}
		req.Native[name] = true
	}
	return nil
}

// session resolves the request's session branch (§53.12). Helper history and
// resource identities get their own index namespace within the branch.
func (x *exchange) session() (sessionBranch, bool) {
	var extra [][]string
	if x.req.helperHistory != nil {
		extra = append(extra, []string{x.req.helperHistory.namespace})
	}
	if x.resources != nil {
		extra = append(extra, []string{x.resources.identity.PrincipalID, x.resources.identity.Generation})
	}
	branch, err := newSessionBranch(x.req, x.r.Header, extra...)
	if err != nil {
		x.fail(400, "invalid_request_error", err.Error())
		return sessionBranch{}, false
	}
	x.req.upstreamSession = branch.Upstream
	x.req.upstreamAgent = branch.UpstreamAgent
	return branch, true
}

// occupy marks a session busy; false when it already has an active request.
func (g *Gateway) occupy(key string) bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.busy == nil {
		g.busy = map[string]bool{}
	}
	if g.busy[key] {
		return false
	}
	g.busy[key] = true
	return true
}
func (g *Gateway) vacate(key string) { g.mu.Lock(); delete(g.busy, key); g.mu.Unlock() }

// execute prepares history, runs the CLI, keeps the new history and answers.
func (x *exchange) execute(branch sessionBranch) {
	g, req := x.g, x.req
	started := time.Now()
	ctx, cancel := context.WithTimeout(x.r.Context(), g.Timeout)
	defer cancel()
	dir, e := os.MkdirTemp(g.Runner.Work, "request-")
	if e != nil {
		x.fail(500, "api_error", "Cannot create request workspace")
		return
	}
	defer os.RemoveAll(dir)
	if query, ok := req.webSearchFastQuery(); ok {
		x.serveWebSearchFast(ctx, dir, query)
		return
	}
	// A catalogued tool can be disabled by this CLI session's runtime gates.
	// Rebuild with SDK MCP only before any model request reached the provider.
	for attempt := 0; ; attempt++ {
		x.diagnostic.setStage("prepare_history")
		x.diagnostic.trace("history_prepare_started", nil)
		p, e := prepareHistory(req, g.Cache, branch, dir, g.Runner.Version)
		if e != nil {
			x.fail(500, "api_error", "Cannot prepare history")
			return
		}
		x.diagnostic.setField("history_mode", p.Mode)
		x.diagnostic.artifact("history.json", Object{"mode": p.Mode, "session_id": p.SessionID, "anchor": p.Anchor, "input_uuid": p.InputUUID, "rows": len(p.Rows), "indexed": branch.indexed(), "agent_id": branch.AgentID != ""})
		if x.diagnostic.enabled() {
			x.diagnostic.save("history-prepared.jsonl", nativeBytes(p.Rows))
		}
		x.diagnostic.trace("history_prepared", Object{"mode": p.Mode, "rows": len(p.Rows)})
		x.w.Header().Set("X-CCGateway-History", p.Mode)
		x.w.Header().Set("X-CCGateway-Cache-TTL", fmt.Sprint(int((24 * time.Hour).Seconds())))
		x.w.Header().Set("X-CCGateway-Cache-Scope", "local-only")
		x.diagnostic.setStage("claude_code")
		answer, e := g.Runner.run(ctx, req, p, dir, x.send)
		if e == nil && ctx.Err() != nil {
			e = ctx.Err()
		}
		if e != nil {
			var unavailable *nativeToolAvailabilityError
			if attempt == 0 && !x.streaming && ctx.Err() == nil && errors.As(e, &unavailable) && unavailable.RetrySafe {
				for _, name := range unavailable.Names {
					delete(req.Native, name)
				}
				if err := validateToolNames(req); err != nil {
					x.fail(400, "invalid_request_error", err.Error())
					return
				}
				if branch.indexed() {
					branch.Logical = digest([]string{branch.Logical, "native-runtime-fallback", digest(req.Native)})
				}
				x.diagnostic.trace("native_tools_mcp_fallback", Object{"tools": unavailable.Names, "reason": unavailable.Error()})
				continue
			}
			x.runFailed(ctx, e)
			return
		}
		if err := x.completeCredit(answer); err != nil {
			x.creditCustodyFailed()
		}
		if err := x.flushCreditEvents(); err != nil {
			x.runFailed(ctx, err)
			return
		}
		if req.CountTokens {
			x.diagnostic.setStage("completed")
			req.responseFacts.apply(x.w.Header())
			x.w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(x.w).Encode(answer)
			return
		}
		if req.credit != nil {
			x.diagnostic.trace("history_commit_skipped", Object{"reason": "credential-bearing credit response"})
		} else if req.CacheWarmup {
			x.diagnostic.trace("history_commit_skipped", Object{"reason": "cache_warmup"})
		} else if !branch.indexed() {
			// No session ID: a new session every time, never registered.
			x.diagnostic.trace("history_commit_skipped", Object{"reason": "new_session"})
		} else if p.APIResponseComplete && (len(p.NativeRows) == 0 || str(answer, "stop_reason") == "refusal") {
			if err := p.commitResponseOnly(req, answer, g.Cache, branch.Logical, started); err != nil {
				x.diagnostic.trace("response_checkpoint_failed", Object{"error": err.Error()})
			}
		} else if str(answer, "stop_reason") == "refusal" {
			// No native assistant checkpoint is guaranteed for a refusal.
			// Preserve prior checkpoints; future turns rebuild from client history.
			x.diagnostic.trace("history_commit_skipped", Object{"reason": "upstream_refusal"})
		} else if err := p.commit(req, answer, g.Cache, branch.Logical, dir, g.Runner.Version, started); err != nil {
			x.diagnostic.trace("history_commit_failed", Object{"error": err.Error()})
			log.Print("history cache write failed; future requests will rebuild")
		} else {
			x.diagnostic.trace("history_committed", Object{"session_id": p.SessionID, "anchor": p.NativeAnchor})
		}
		x.diagnostic.setStage("completed")
		if !req.Stream {
			x.rememberMessageID(answer)
		}
		if req.Stream {
			_ = x.send(p.finalResponseStop())
		} else {
			req.responseFacts.apply(x.w.Header())
			x.w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(x.w).Encode(answer)
		}
		return
	}
}

// send writes one SSE event, starting the stream on the first one; it does
// nothing for a non-streaming request.
func (x *exchange) send(event Object) error {
	if !x.req.Stream {
		return nil
	}
	if buffered, err := x.bufferCreditEvent(event); buffered || err != nil {
		return err
	}
	if str(event, "type") == "message_start" {
		if message, ok := event["message"].(map[string]any); ok {
			x.rememberMessageID(message)
		}
	}
	controller := http.NewResponseController(x.w)
	_ = controller.SetWriteDeadline(time.Now().Add(15 * time.Second))
	if !x.streaming {
		x.req.responseFacts.apply(x.w.Header())
		x.w.Header().Set("Content-Type", "text/event-stream")
		x.w.Header().Set("X-Accel-Buffering", "no")
		x.w.WriteHeader(200)
		x.streaming = true
	}
	b, e := json.Marshal(event)
	if e != nil {
		return e
	}
	if _, e = fmt.Fprintf(x.w, "event: %s\ndata: %s\n\n", str(event, "type"), b); e != nil {
		return e
	}
	return controller.Flush()
}

// runFailed maps a failed run to the client's error: 504 on timeout, the
// API's own error when it was passed through, otherwise 502.
func (x *exchange) runFailed(ctx context.Context, e error) {
	x.diagnostic.fail(502, "api_error", e.Error())
	if x.r.Context().Err() != nil {
		x.diagnostic.setField("client_canceled", true)
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
		x.passUpstream(upstream, Object{"type": kind, "message": message})
		return
	}
	var refusal *requestRefusal
	if errors.As(e, &refusal) && !x.streaming {
		x.w.Header().Set(errorScopeHeader, "request")
	}
	x.fail(status, kind, message)
}

// passUpstream returns the API's own error as a direct client would receive
// it: the body as sent, or its error object as an SSE error event.
func (x *exchange) passUpstream(upstream *upstreamError, fallback Object) {
	official := fallback
	if decoded, err := decodeObject(upstream.Body); err == nil {
		if inner, ok := decoded["error"].(Object); ok {
			official = inner
		}
	}
	x.diagnostic.fail(upstream.Status, str(official, "type"), str(official, "message"))
	if x.streaming {
		x.writeError(official, upstream.Status)
		return
	}
	for name, values := range upstream.Headers {
		x.w.Header()[name] = append([]string(nil), values...)
	}
	// Only the gateway itself scopes an error to the request.
	x.w.Header().Del(errorScopeHeader)
	contentType := upstream.ContentType
	if contentType == "" {
		contentType = "application/json"
	}
	x.w.Header().Set("Content-Type", contentType)
	x.w.WriteHeader(upstream.Status)
	_, _ = x.w.Write(upstream.Body)
}
func envDefault(k, v string) string {
	if s := os.Getenv(k); s != "" {
		return s
	}
	return v
}
func Serve() error {
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
	native, e := nativeAllowlist(os.Getenv("CCG_NATIVE_TOOLS"))
	if e != nil {
		return e
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
	admin := &authManager{cli: cli, key: os.Getenv("CCG_ADMIN_KEY"), proxy: proxy, version: version, requestLogs: g.RequestLogs, authorizationChanged: func() error { return g.ownershipIndex().rotateAuthorization() }}
	return g.listen(bind, admin, logDir)
}

// listen serves the gateway and its management API until SIGINT or SIGTERM.
func (g *Gateway) listen(bind string, admin http.Handler, logDir string) error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	mux := http.NewServeMux()
	mux.Handle("/", g)
	mux.Handle("/admin/", admin)
	server := &http.Server{Addr: bind, Handler: mux, ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second, BaseContext: func(net.Listener) context.Context { return ctx }}
	done := make(chan struct{})
	backgroundDone := make(chan struct{})
	defer close(done)
	go func() {
		defer close(backgroundDone)
		maintain(ctx, done, server, g.Cache, logDir)
	}()
	log.Printf("ccgateway listening on %s; Claude Code %s; native session retention 24h", bind, g.Runner.Version)
	e := server.ListenAndServe()
	if errors.Is(e, http.ErrServerClosed) {
		<-backgroundDone
		return nil
	}
	return e
}

// nativeAllowlist parses CCG_NATIVE_TOOLS: exact tool names, comma-separated.
func nativeAllowlist(list string) (map[string]bool, error) {
	native := map[string]bool{}
	for _, n := range strings.Split(list, ",") {
		n = strings.TrimSpace(n)
		if n != "" {
			if !toolName.MatchString(n) || n == "default" {
				return nil, fmt.Errorf("CCG_NATIVE_TOOLS must list exact tool names")
			}
			native[n] = true
		}
	}
	return native, nil
}

// maintain prunes the history cache and request logs every minute, and shuts
// the server down when ctx ends; it returns then, or when done closes.
func maintain(ctx context.Context, done <-chan struct{}, server *http.Server, cache *HistoryCache, logDir string) {
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
}
