package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync"
	"time"
)

// Outbound adaptation of the CLI's own model requests, on a loopback relay:
//   - thinking.display has no CLI setting; the relay adds it.
//   - client system messages: Claude Code merges them with its own context
//     into one system message per turn; the relay restores the client's
//     messages (see restoreSystemMessages). A request that cannot be restored
//     exactly is refused, never forwarded altered.
//
// Every other field stays as the CLI wrote it.
type outboundRelay struct {
	path       string
	URL        string
	FirstParty bool
	server     *http.Server
	transport  *http.Transport

	mu       sync.Mutex
	failure  error
	upstream *upstreamError
	stopped  bool
	restored int
	sequence int
	abort    func() // ends the CLI run; set by the Runner
}

func (r *outboundRelay) setAbort(abort func()) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.abort = abort
}

// What the CLI reads when the relay refuses a request or the API rejects a
// restored one. Neither may match Claude Code's 400 classifiers, which retry
// with an altered request: no "system", "role", "cache_control", "thinking",
// "effort", "not supported" or similar wording. With a Runner the CLI is
// stopped before it reads them: Claude Code 2.1.288 also answers any 400 it
// cannot classify by retrying without a beta header and counting a probe
// failure in its persistent configuration.
const (
	relayRefusedMessage  = "ccgateway: the gateway refused to forward this request"
	relayUpstreamMessage = "ccgateway: the upstream API rejected this request; the gateway returns its error"
)

// Statuses whose handling by Claude Code changes nothing in the request:
// credential refresh (401/403) and backoff (408/409/429). They pass through;
// the last one is still the run's error if the run fails.
func cliHandledStatus(status int) bool {
	switch status {
	case 401, 403, 408, 409, 429:
		return true
	}
	return false
}

type restoredRequest struct{}

// The API's own error for a restored request, returned to the API client as is.
type upstreamError struct {
	Status      int
	ContentType string
	Body        []byte
}

func (e *upstreamError) Error() string { return fmt.Sprintf("upstream API returned HTTP %d", e.Status) }

// UpstreamError is the API's last 4xx error for a restored request, if any.
func (r *outboundRelay) UpstreamError() *upstreamError {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.upstream
}

// stop ends the run on the first refusal or rejected request: later model
// requests are refused unforwarded, and the CLI is stopped before it can act
// on the answer. Without a Runner the neutral answer is returned at once.
func (r *outboundRelay) stop(request *http.Request) {
	r.mu.Lock()
	r.stopped = true
	abort := r.abort
	r.mu.Unlock()
	if abort == nil {
		return
	}
	abort()
	select {
	case <-request.Context().Done():
	case <-time.After(30 * time.Second):
	}
}
func (r *outboundRelay) isStopped() bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.stopped
}

var outboundRelayHandlers sync.Map

func serveOutboundRelay(w http.ResponseWriter, r *http.Request) bool {
	parts := strings.SplitN(r.URL.Path, "/", 4)
	if len(parts) != 4 || parts[1] != "ccg-relay" {
		return false
	}
	handler, ok := outboundRelayHandlers.Load("/ccg-relay/" + parts[2])
	if !ok {
		return false
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	ip := net.ParseIP(host)
	if err != nil || ip == nil || !ip.IsLoopback() {
		http.NotFound(w, r)
		return true
	}
	handler.(http.Handler).ServeHTTP(w, r)
	return true
}

func (r *outboundRelay) Close() {
	outboundRelayHandlers.Delete(r.path)
	if r.server != nil {
		_ = r.server.Close()
	}
	r.transport.CloseIdleConnections()
}

// Failure is the first request the relay refused to forward.
func (r *outboundRelay) Failure() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.failure
}

// Restored counts model requests forwarded with the client's system messages.
func (r *outboundRelay) Restored() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.restored
}

func environmentValue(env []string, key string) string {
	for i := len(env) - 1; i >= 0; i-- {
		if strings.HasPrefix(env[i], key+"=") {
			return strings.TrimPrefix(env[i], key+"=")
		}
	}
	return ""
}
func relayProxy(env []string, target *url.URL) (func(*http.Request) (*url.URL, error), error) {
	host := target.Hostname()
	if ip := net.ParseIP(host); ip != nil && ip.IsLoopback() {
		return nil, nil
	}
	if host == "localhost" {
		return nil, nil
	}
	noProxy := environmentValue(env, "NO_PROXY")
	if noProxy == "" {
		noProxy = environmentValue(env, "no_proxy")
	}
	for _, rule := range strings.Split(noProxy, ",") {
		rule = strings.TrimSpace(rule)
		if rule == "*" {
			return nil, nil
		}
		if _, cidr, err := net.ParseCIDR(rule); err == nil && cidr.Contains(net.ParseIP(host)) {
			return nil, nil
		}
		rule = strings.TrimPrefix(rule, "*.")
		rule = strings.TrimPrefix(rule, ".")
		if rule != "" && (target.Host == rule || host == rule || strings.HasSuffix(host, "."+rule)) {
			return nil, nil
		}
	}
	key := "HTTP_PROXY"
	if target.Scheme == "https" {
		key = "HTTPS_PROXY"
	}
	raw := environmentValue(env, key)
	if raw == "" {
		raw = environmentValue(env, strings.ToLower(key))
	}
	if raw == "" {
		return nil, nil
	}
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return nil, fmt.Errorf("invalid relay proxy configuration")
	}
	return http.ProxyURL(u), nil
}

// adapt rewrites one model or token-count request body.
func (r *outboundRelay) adapt(req *Request, groups []systemGroup, body []byte, count bool) ([]byte, error) {
	message, err := decodeObject(body)
	if err != nil {
		return nil, fmt.Errorf("model request body is not a JSON object")
	}
	if len(groups) > 0 {
		if _, has := message["messages"]; has || !count {
			if err = restoreSystemMessages(message, groups); err != nil {
				return nil, err
			}
		}
	}
	if display := str(req.Thinking, "display"); display != "" && !count {
		thinking, ok := message["thinking"].(Object)
		if !ok {
			thinking = Object{"type": str(req.Thinking, "type")}
		}
		thinking["display"] = display
		message["thinking"] = thinking
	}
	var out bytes.Buffer
	encoder := json.NewEncoder(&out)
	encoder.SetEscapeHTML(false)
	if err = encoder.Encode(message); err != nil {
		return nil, err
	}
	return bytes.TrimSuffix(out.Bytes(), []byte("\n")), nil
}

func startOutboundRelay(req *Request, env []string, internalBase ...string) (*outboundRelay, error) {
	raw := environmentValue(env, "ANTHROPIC_BASE_URL")
	if raw == "" {
		raw = "https://api.anthropic.com"
	}
	target, err := url.Parse(raw)
	if err != nil || (target.Scheme != "http" && target.Scheme != "https") || target.Host == "" {
		return nil, fmt.Errorf("invalid Anthropic base URL")
	}
	proxyFn, err := relayProxy(env, target)
	if err != nil {
		return nil, err
	}
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = proxyFn
	path := "/ccg-relay/" + uuid()
	relay := &outboundRelay{path: path, FirstParty: strings.EqualFold(target.Hostname(), "api.anthropic.com"), transport: transport}
	forward := httputil.NewSingleHostReverseProxy(target)
	forward.Transport = transport
	forward.FlushInterval = -1
	director := forward.Director
	forward.Director = func(r *http.Request) {
		r.URL.Path = strings.TrimPrefix(r.URL.Path, path)
		r.URL.RawPath = ""
		director(r)
		r.Host = target.Host
		r.Header.Del("X-Forwarded-For")
		if r.Context().Value(restoredRequest{}) != nil {
			// Let the transport negotiate and decode compression, so an error
			// body can be read and kept as the API sent it.
			r.Header.Del("Accept-Encoding")
		}
	}
	forward.ErrorHandler = func(w http.ResponseWriter, r *http.Request, e error) {
		apiError(w, 502, "api_error", "Relay upstream unavailable")
	}
	// The API's error for a restored request goes to the API client as sent.
	// Claude Code reads many 400 wordings, and any 400 it cannot classify, as
	// a cue to change the request and retry (system turns, thinking, effort,
	// cache_control, beta headers ...), which would alter the client's
	// structure or lock a feature off. The run stops instead; should the CLI
	// still read the answer, it has the same status and neutral wording.
	forward.ModifyResponse = func(resp *http.Response) error {
		if resp.Request.Context().Value(restoredRequest{}) == nil || resp.StatusCode < 400 || resp.StatusCode >= 500 {
			return nil
		}
		body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
		resp.Body.Close()
		if err != nil {
			return err
		}
		relay.mu.Lock()
		relay.upstream = &upstreamError{Status: resp.StatusCode, ContentType: resp.Header.Get("Content-Type"), Body: body}
		relay.mu.Unlock()
		if cliHandledStatus(resp.StatusCode) {
			resp.Body = io.NopCloser(bytes.NewReader(body))
			resp.ContentLength = int64(len(body))
			resp.Header.Set("Content-Length", fmt.Sprint(len(body)))
			resp.Header.Del("Content-Encoding")
			return nil
		}
		relay.stop(resp.Request)
		kind := "invalid_request_error"
		if decoded, err := decodeObject(body); err == nil {
			if e, ok := decoded["error"].(Object); ok && str(e, "type") != "" {
				kind = str(e, "type")
			}
		}
		neutral, _ := json.Marshal(Object{"type": "error", "error": Object{"type": kind, "message": relayUpstreamMessage}})
		resp.Body = io.NopCloser(bytes.NewReader(neutral))
		resp.ContentLength = int64(len(neutral))
		resp.Header.Set("Content-Length", fmt.Sprint(len(neutral)))
		resp.Header.Set("Content-Type", "application/json")
		resp.Header.Del("Content-Encoding")
		return nil
	}
	groups := req.systemGroups()
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, path+"/") {
			http.NotFound(w, r)
			return
		}
		model := strings.HasSuffix(r.URL.Path, "/messages")
		count := strings.HasSuffix(r.URL.Path, "/messages/count_tokens")
		if r.Method == "POST" && model && relay.isStopped() {
			apiError(w, 400, "invalid_request_error", relayRefusedMessage)
			return
		}
		if r.Method == "POST" && (model || count) {
			relay.mu.Lock()
			relay.sequence++
			sequence := relay.sequence
			relay.mu.Unlock()
			body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64<<20))
			var adapted []byte
			if err == nil {
				adapted, err = relay.adapt(req, groups, body, count)
			}
			if err != nil {
				// The gateway reports the cause; the CLI is stopped and reads only
				// neutral text (see ModifyResponse). A refused token count only
				// fails that estimate, not the run.
				err = fmt.Errorf("cannot restore the client's system messages: %w", err)
				if req.diagnostic != nil {
					req.diagnostic.save(fmt.Sprintf("upstream-refused-%03d-%s.body", sequence, uuid()[:8]), body)
				}
				if model {
					relay.mu.Lock()
					if relay.failure == nil {
						relay.failure = err
					}
					relay.mu.Unlock()
					relay.stop(r)
				}
				apiError(w, 400, "invalid_request_error", relayRefusedMessage)
				return
			}
			if len(groups) > 0 && model {
				relay.mu.Lock()
				relay.restored++
				relay.mu.Unlock()
				r = r.WithContext(context.WithValue(r.Context(), restoredRequest{}, true))
			}
			r.Body = io.NopCloser(bytes.NewReader(adapted))
			if req.diagnostic != nil {
				req.diagnostic.save(fmt.Sprintf("upstream-request-%03d-%s.body", sequence, uuid()[:8]), adapted)
			}
			r.ContentLength = int64(len(adapted))
			r.Header.Del("Content-Length")
		}
		forward.ServeHTTP(w, r)
	})
	if len(internalBase) > 0 && internalBase[0] != "" {
		outboundRelayHandlers.Store(path, handler)
		relay.URL = internalBase[0] + path
		return relay, nil
	}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, fmt.Errorf("cannot start relay")
	}
	relay.server = &http.Server{Handler: handler, ReadHeaderTimeout: 10 * time.Second}
	go func() { _ = relay.server.Serve(listener) }()
	relay.URL = "http://" + listener.Addr().String() + path
	return relay, nil
}
