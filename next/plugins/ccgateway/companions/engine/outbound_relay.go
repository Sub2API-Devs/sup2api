package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
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

// Every model request of the CLI passes a loopback relay:
//   - thinking.display has no CLI setting; the relay adds it.
//   - client system messages: Claude Code merges them with its own context
//     into one system message per turn; the relay restores the client's
//     messages (see restoreSystemMessages). A request that cannot be restored
//     exactly is refused, never forwarded altered.
//   - upstream errors, with the pass_upstream_errors policy: any non-2xx
//     answer, or an error event inside a 200 stream, ends the run and goes to
//     the API client as the API sent it. Claude Code does not get to back
//     off, refresh, or reshape and retry. Without the policy (the default)
//     Claude Code handles them as it would talking to the API directly.
//
// Requests without client system messages keep their body (thinking.display
// aside); every other field stays as the CLI wrote it.
type outboundRelay struct {
	bootstrap       *continuationBootstrap
	exactToolInputs map[string]map[int]exactToolCapture
	fallbackEvents  map[string]map[int]*fallbackCapture
	scope           *mainRequestScope
	control         *modControl
	path            string
	URL             string
	FirstParty      bool
	server          *http.Server
	transport       *http.Transport

	mu                 sync.Mutex
	failure            error
	upstream           *upstreamError
	stopped            bool
	restored           int
	sequence           int
	modelForwarded     bool
	abort              func() // ends the CLI run; set by the Runner
	warmupResponse     json.RawMessage
	jsonResponse       json.RawMessage
	tokenCountResponse json.RawMessage
}

func (r *outboundRelay) setAbort(abort func()) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.abort = abort
}

// What the CLI reads when the relay refuses a request or the API rejects one,
// should it read anything before it is stopped. Neither may match Claude
// Code's 400 classifiers, which retry with an altered request: no "system",
// "role", "cache_control", "thinking", "effort", "not supported" or similar
// wording.
const (
	relayRefusedMessage  = "ccgateway: the gateway refused to forward this request"
	relayUpstreamMessage = "ccgateway: the upstream API rejected this request; the gateway returns its error"
)

type modelRequest struct{}
type traceExchangeKey struct{}
type traceExchange struct {
	diagnostic *requestDiagnostic
	prefix     string
}

// The API's own error, returned to the API client as is.
type upstreamError struct {
	Status      int
	ContentType string
	Body        []byte
	Headers     http.Header
}

func (e *upstreamError) Error() string { return fmt.Sprintf("upstream API returned HTTP %d", e.Status) }

// UpstreamError is the API's error that ended the run, if any.
func (r *outboundRelay) UpstreamError() *upstreamError {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.upstream
}

// reject records the API's error (the first one ends the run) and stops.
func (r *outboundRelay) reject(e *upstreamError, request *http.Request) {
	r.mu.Lock()
	if r.upstream == nil {
		r.upstream = e
	}
	r.mu.Unlock()
	r.stop(request)
}

// stop ends the run on the first refusal or upstream error: later model
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

// HTTP status of the Messages API for an error type, for an error that
// arrives inside a 200 stream. Unknown types are reported as api_error is.
func errorTypeStatus(kind string) int {
	switch kind {
	case "invalid_request_error":
		return 400
	case "authentication_error":
		return 401
	case "billing_error":
		return 402
	case "permission_error":
		return 403
	case "not_found_error":
		return 404
	case "request_too_large":
		return 413
	case "rate_limit_error":
		return 429
	case "timeout_error":
		return 504
	case "overloaded_error":
		return 529
	}
	return 500
}

// sseWatch forwards a model stream event by event and stops at an error
// event, which is kept for the API client and never reaches the CLI.
type sseWatch struct {
	guard        func([]byte) ([]byte, error)
	observe      func([]byte)
	ignoreErrors bool
	requireStop  bool
	sawStop      bool
	body         io.ReadCloser
	relay        *outboundRelay
	request      *http.Request
	pending      []byte
	ready        []byte
	done         bool
	err          error
}

func sseEventEnd(b []byte) (int, int) {
	end, size := -1, 0
	for _, sep := range []string{"\n\n", "\r\n\r\n", "\r\r"} {
		if i := bytes.Index(b, []byte(sep)); i >= 0 && (end < 0 || i < end) {
			end, size = i, len(sep)
		}
	}
	return end, size
}

// The data of an error event: the "error" event name, or data whose type is
// "error" (the Messages API sends both).
func sseErrorPayload(event []byte) ([]byte, bool) {
	name := ""
	var data [][]byte
	for _, line := range bytes.Split(bytes.ReplaceAll(event, []byte("\r\n"), []byte("\n")), []byte("\n")) {
		line = bytes.TrimSuffix(line, []byte("\r"))
		if v, ok := bytes.CutPrefix(line, []byte("event:")); ok {
			name = string(bytes.TrimSpace(v))
		} else if v, ok := bytes.CutPrefix(line, []byte("data:")); ok {
			data = append(data, bytes.TrimPrefix(v, []byte(" ")))
		}
	}
	payload := bytes.Join(data, []byte("\n"))
	if name == "error" {
		return payload, true
	}
	if decoded, err := decodeObject(payload); err == nil && str(decoded, "type") == "error" {
		return payload, true
	}
	return nil, false
}

func (s *sseWatch) Read(p []byte) (int, error) {
	for len(s.ready) == 0 {
		if s.done {
			if s.err != nil {
				return 0, s.err
			}
			return 0, io.EOF
		}
		buf := make([]byte, 32<<10)
		n, err := s.body.Read(buf)
		if s.guard != nil && len(s.pending)+n > 16<<20 {
			s.done = true
			s.err = fmt.Errorf("guarded provider event exceeds inspection limit")
			s.pending = nil
			s.relay.reject(&upstreamError{Status: 502, ContentType: "application/json", Body: []byte(`{"type":"error","error":{"type":"api_error","message":"MCP provider event exceeds credential inspection limit"}}`)}, s.request)
			continue
		}
		s.pending = append(s.pending, buf[:n]...)
		for {
			end, size := sseEventEnd(s.pending)
			if end < 0 {
				break
			}
			event := s.pending[:end+size]
			if s.guard != nil {
				guarded, err := s.guard(event)
				if err != nil {
					s.pending = nil
					s.done = true
					s.err = err
					break
				}
				event = guarded
			}
			if payload, failed := sseErrorPayload(event); failed && !s.ignoreErrors {
				status := 500
				if decoded, err := decodeObject(payload); err == nil {
					inner, _ := decoded["error"].(Object)
					status = errorTypeStatus(str(inner, "type"))
				}
				s.pending, s.done = nil, true
				s.relay.reject(&upstreamError{Status: status, ContentType: "application/json", Body: append([]byte(nil), payload...)}, s.request)
				break
			}
			if s.observe != nil {
				s.observe(event)
			}
			if s.requireStop && sseHasMessageStop(event) {
				s.sawStop = true
			}
			s.ready = append(s.ready, event...)
			s.pending = s.pending[end+size:]
		}
		if err != nil && !s.done {
			if s.requireStop && !s.sawStop {
				// Close the dispatch gate before exposing EOF/read failure to
				// the CLI. Preserve the original stream and error unchanged.
				s.relay.mu.Lock()
				s.relay.stopped = true
				s.relay.mu.Unlock()
			}
			s.done = true
			if err == io.EOF {
				if s.guard != nil && len(bytes.TrimSpace(s.pending)) > 0 {
					s.err = fmt.Errorf("incomplete guarded provider event")
					s.pending = nil
					continue
				}
				s.ready = append(s.ready, s.pending...)
				s.pending = nil
			} else {
				s.err = err
			}
		}
	}
	n := copy(p, s.ready)
	s.ready = s.ready[n:]
	return n, nil
}
func (s *sseWatch) Close() error { return s.body.Close() }

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
	out, _, err := r.adaptAttributed(req, groups, body, count)
	return out, err
}

func (r *outboundRelay) adaptAttributed(req *Request, groups []systemGroup, body []byte, count bool) ([]byte, bool, error) {
	message, err := decodeObject(body)
	if err != nil {
		return nil, false, fmt.Errorf("model request body is not a JSON object")
	}
	main, err := r.scope.identify(message, count)
	if err != nil {
		return nil, false, err
	}
	if !main {
		canonical, _ := json.Marshal(message)
		if req.containsImageCarrier(canonical) {
			return nil, false, fmt.Errorf("image carrier is outside the attributed main request")
		}
		return body, false, nil
	}
	if !count && req.credit != nil && req.credit.previous != nil {
		if r.scope == nil {
			return nil, false, fmt.Errorf("credit redemption requires main request attribution")
		}
		// The verified stored wire prompt is authoritative for redemption.
		// Fresh CLI history is only an authenticated transport trigger.
		r.scope.recordApplied()
		return append([]byte(nil), req.credit.raw...), true, nil
	}
	if req.CountTokens {
		// The standard count API measures the client's submitted input, not
		// Claude Code's augmented prompt. CLI is only the authenticated carrier.
		r.scope.recordApplied()
		return req.Plan.RawRequest(), true, nil
	}
	restoreContexts, err := normalizeToolResultContexts(req, message, r.control)
	if err != nil {
		return nil, false, err
	}
	if err := req.restoreImageCarriers(message); err != nil {
		return nil, false, err
	}
	if err := req.removeContinuation(message, r.control); err != nil {
		return nil, false, err
	}
	if !count {
		if err := verifyNativeWireTools(req, message); err != nil {
			return nil, false, err
		}
	}
	if !count && req.HasMainRequestFeatures() {
		if r.scope == nil {
			return nil, false, fmt.Errorf("client feature plan requires main request attribution")
		}
		if err := req.ApplyMainRequestFeatures(message); err != nil {
			return nil, false, err
		}
		r.scope.recordApplied()
		if req.CacheWarmup || req.fallbackJSON() {
			message["stream"] = false
		}
	}
	exactToolHistoryChanged := false
	if !count {
		var repairErr error
		exactToolHistoryChanged, repairErr = req.restoreExactToolHistoryInputs(message)
		if repairErr != nil {
			return nil, false, repairErr
		}
		if err := req.restoreContinuationTail(message); err != nil {
			return nil, false, err
		}
		if req.InlineTools == nil {
			if err := verifyNativeWireTools(req, message); err != nil {
				return nil, false, err
			}
		}
	}
	// Remove CLI defaults before restoring the client's own system fields.
	// Client inline effort is inserted afterward at its original position.
	if !count && (req.Plan != nil && req.Plan.apiGeneration || req.hasInlineSystemMetadata()) {
		stripCLIInlineEffort(message)
	}
	// System position restoration needs the original assistant turns.
	if !count {
		if changed, err := req.restorePTCCallers(message); err != nil {
			return nil, false, err
		} else {
			exactToolHistoryChanged = exactToolHistoryChanged || changed
		}
		if err := restoreProtocolHistory(req, message); err != nil {
			return nil, false, err
		}
	}
	if len(groups) > 0 {
		if _, has := message["messages"]; has || !count {
			if err = restoreSystemMessages(message, groups, req); err != nil {
				return nil, false, fmt.Errorf("cannot restore the client's system messages: %w", err)
			}
		}
	}
	if !count {
		if err := req.restoreInlineTools(message); err != nil {
			return nil, false, err
		}
		if err := restoreInlineSystemMetadata(req, message); err != nil {
			return nil, false, err
		}
		if err := req.restoreImageTransformations(message); err != nil {
			return nil, false, err
		}
		// Restore known CLI toolset identity omissions before cache's complete
		// block alignment; its skeleton deliberately ignores only cache fields.
		if err := req.verifyAPIClientHistory(message); err != nil {
			return nil, false, err
		}
		if err := restoreHistoryCitations(req, message); err != nil {
			return nil, false, err
		}
		if err := req.applyCachePlan(message); err != nil {
			return nil, false, err
		}
		if err := req.verifyCompactionHistory(message); err != nil {
			return nil, false, err
		}
		if err := req.verifyInlineToolHistory(message); err != nil {
			return nil, false, err
		}
		if exactToolHistoryChanged {
			if _, err := alignClientHistory(req, message); err != nil {
				return nil, false, fmt.Errorf("exact tool history alignment: %w", err)
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
	if !count {
		if err := req.applyHelperHistory(message, restoreContexts); err != nil {
			return nil, false, err
		}
	} else if err := restoreContexts(message); err != nil {
		return nil, false, err
	}
	var out bytes.Buffer
	encoder := json.NewEncoder(&out)
	encoder.SetEscapeHTML(false)
	if err = encoder.Encode(message); err != nil {
		return nil, false, err
	}
	return bytes.TrimSuffix(out.Bytes(), []byte("\n")), true, nil
}

func startOutboundRelay(req *Request, env []string, internalBase ...string) (*outboundRelay, error) {
	if err := req.validateRoutingProvider(env); err != nil {
		return nil, err
	}
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
	handler := relay.handler(req, relay.forwarder(target))
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

// forwarder proxies relay requests, without the relay path, to the API.
func (relay *outboundRelay) forwarder(target *url.URL) *httputil.ReverseProxy {
	forward := httputil.NewSingleHostReverseProxy(target)
	forward.Transport = relay.transport
	forward.FlushInterval = -1
	director := forward.Director
	forward.Director = func(r *http.Request) {
		r.URL.Path = strings.TrimPrefix(r.URL.Path, relay.path)
		r.URL.RawPath = ""
		director(r)
		r.Host = target.Host
		r.Header.Del("X-Forwarded-For")
		pass, _ := r.Context().Value(modelRequest{}).(bool)
		output, _ := r.Context().Value(apiOutputRequestKey{}).(*Request)
		if pass || output != nil {
			// Let the transport negotiate and decode compression, so an error
			// body or event can be read and kept as the API sent it.
			r.Header.Del("Accept-Encoding")
		}
	}
	// Not an answer of the API: the CLI may retry, and if the run fails the
	// gateway reports 502.
	forward.ErrorHandler = func(w http.ResponseWriter, r *http.Request, e error) {
		if tr, ok := r.Context().Value(traceExchangeKey{}).(traceExchange); ok {
			tr.diagnostic.trace("upstream_transport_error", Object{"exchange": tr.prefix})
		}
		apiError(w, 502, "api_error", "Relay upstream unavailable")
	}
	forward.ModifyResponse = func(resp *http.Response) error {
		if op, _ := resp.Request.Context().Value(resourceRequestKey{}).(*resourceExchange); op != nil {
			return relay.captureResourceResponse(resp, op)
		}
		captureProviderResponseFacts(resp)
		if err := relay.protectMCPResponse(resp); err != nil {
			return err
		}
		if tr, ok := resp.Request.Context().Value(traceExchangeKey{}).(traceExchange); ok {
			tr.diagnostic.artifact(tr.prefix+"-response.json", Object{"status": resp.StatusCode, "headers": safeHeaders(resp.Header)})
			tr.diagnostic.trace("upstream_response", Object{"exchange": tr.prefix, "status": resp.StatusCode})
			resp.Body = &traceReader{ReadCloser: resp.Body, diagnostic: tr.diagnostic, name: tr.prefix + "-response.body"}
		}
		if count, _ := resp.Request.Context().Value(tokenCountRequestKey{}).(bool); count {
			return relay.captureTokenCount(resp)
		}
		if warmup, _ := resp.Request.Context().Value(warmupRequestKey{}).(bool); warmup {
			return relay.bridgeWarmupResponse(resp)
		}
		if request, _ := resp.Request.Context().Value(jsonGenerationRequestKey{}).(*Request); request != nil {
			return relay.bridgeJSONGeneration(resp, request)
		}
		if output, _ := resp.Request.Context().Value(apiOutputRequestKey{}).(*Request); output != nil && resp.StatusCode >= 200 && resp.StatusCode < 300 && strings.HasPrefix(resp.Header.Get("Content-Type"), "text/event-stream") {
			pass, _ := resp.Request.Context().Value(modelRequest{}).(bool)
			terminal := &apiTerminalObserver{relay: relay, req: output}
			resp.Body = &sseWatch{body: resp.Body, relay: relay, request: resp.Request, ignoreErrors: !pass, observe: terminal.observe, requireStop: pass || output.helperHistory != nil}
			if err := relay.bridgeMCPInputs(resp, output); err != nil {
				return err
			}
			return relay.bridgeInitialThinking(resp)
		}
		return relay.passUpstreamErrors(resp)
	}
	return forward
}

// passUpstreamErrors: with pass_upstream_errors, any non-2xx answer to a
// model request goes to the API client as sent, and the run stops before
// Claude Code can back off, refresh credentials, or reshape the request and
// retry (it reads many 400 wordings, and any 400 it cannot classify, as such
// a cue). Should the CLI still read the answer, it has the same status and
// neutral wording. Without it, answers reach the CLI unchanged.
func (relay *outboundRelay) passUpstreamErrors(resp *http.Response) error {
	if pass, _ := resp.Request.Context().Value(modelRequest{}).(bool); !pass {
		return nil
	}
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		if strings.HasPrefix(resp.Header.Get("Content-Type"), "text/event-stream") {
			resp.Body = &sseWatch{body: resp.Body, relay: relay, request: resp.Request, requireStop: true}
		}
		return nil
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	resp.Body.Close()
	relay.reject(&upstreamError{Status: resp.StatusCode, ContentType: resp.Header.Get("Content-Type"), Body: body, Headers: mainErrorHeaders(resp)}, resp.Request)
	if err != nil {
		return err
	}
	kind := "api_error"
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

// handler serves the relay path: model requests are refused once the run is
// stopped, and bodies are adapted where the request needs it.
func (relay *outboundRelay) handler(req *Request, forward http.Handler) http.Handler {
	groups := req.systemGroups()
	// Restore all retained client system messages, regardless of environment policy.

	display := str(req.Thinking, "display")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, relay.path+"/") {
			http.NotFound(w, r)
			return
		}
		if relay.bootstrap != nil {
			relay.bootstrap.handle(relay, w, r)
			return
		}
		model := r.Method == "POST" && strings.HasSuffix(r.URL.Path, "/messages")
		count := r.Method == "POST" && strings.HasSuffix(r.URL.Path, "/messages/count_tokens")
		if req.resource != nil && !model {
			apiError(w, 400, "invalid_request_error", "Only the attributed resource carrier is available")
			return
		}
		if (req.CountTokens || req.hasInferenceGeo()) && count {
			apiError(w, 400, "invalid_request_error", "Auxiliary token counting is unavailable for this request mode")
			return
		}
		prefix := ""
		if (model || count) && req.diagnostic.enabled() {
			prefix = "upstream-" + uuid()
			r = r.WithContext(context.WithValue(r.Context(), traceExchangeKey{}, traceExchange{req.diagnostic, prefix}))
			r.Body = &traceReader{ReadCloser: r.Body, diagnostic: req.diagnostic, name: prefix + "-cli-request.body"}
			req.diagnostic.trace("upstream_request", Object{"exchange": prefix, "count_tokens": count})
		}
		if model && relay.isStopped() {
			apiError(w, 400, "invalid_request_error", relayRefusedMessage)
			return
		}
		if model {
			r = r.WithContext(context.WithValue(r.Context(), modelRequest{}, req.PassUpstreamErrors))
		}
		if (model && (len(groups) > 0 || display != "" || len(req.Native) > 0 || req.HasMainRequestFeatures())) || (count && (len(groups) > 0 || relay.scope != nil)) {
			if !relay.adaptRequest(w, r, req, groups, model, count) {
				return
			}
		} else if (model || count) && !relay.rewriteSessionBody(w, r, req) {
			return
		}
		sessionHeaders(req, r.Header)
		if prefix != "" {
			req.diagnostic.artifact(prefix+"-request-headers.json", safeHeaders(r.Header))
			r.Body = &traceReader{ReadCloser: r.Body, diagnostic: req.diagnostic, name: prefix + "-request.body"}
		}
		forward.ServeHTTP(w, r)
	})
}

// sessionHeaders makes every upstream request of the run carry the gateway's
// session identity (§53.12) instead of the CLI's or the client's:
// X-Claude-Code-Session-Id is U, and x-claude-code-agent-id is A' for a client
// subagent and absent for the main thread.
func sessionHeaders(req *Request, h http.Header) {
	if req.upstreamSession != "" && h.Get("X-Claude-Code-Session-Id") != "" {
		h.Set("X-Claude-Code-Session-Id", req.upstreamSession)
	}
	if req.upstreamAgent != "" {
		h.Set("X-Claude-Code-Agent-Id", req.upstreamAgent)
	} else {
		h.Del("X-Claude-Code-Agent-Id")
	}
}

// requestRefusal is the relay refusing the CLI's request to the API: the
// failure belongs to this client request (its history or features could not
// be carried exactly), not to the account or the worker. The gateway marks
// the error so the host neither cools the account down nor fails over.
type requestRefusal struct{ err error }

func (e *requestRefusal) Error() string { return e.err.Error() }
func (e *requestRefusal) Unwrap() error { return e.err }

// errorScopeHeader marks a gateway error that belongs to the request alone.
const errorScopeHeader = "X-Ccgateway-Error-Scope"

// rewriteSessionBody applies upstreamUserID to a request the relay does not
// otherwise adapt; false when the request was refused.
func (relay *outboundRelay) rewriteSessionBody(w http.ResponseWriter, r *http.Request, req *Request) bool {
	if req.upstreamSession == "" {
		return true
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64<<20))
	if err == nil {
		body, err = upstreamUserID(body, req.upstreamSession)
	}
	if err != nil {
		if strings.HasSuffix(r.URL.Path, "/messages") {
			relay.mu.Lock()
			if relay.failure == nil {
				relay.failure = &requestRefusal{fmt.Errorf("cannot prepare the upstream request: %w", err)}
			}
			relay.mu.Unlock()
			relay.stop(r)
		}
		apiError(w, 400, "invalid_request_error", relayRefusedMessage)
		return false
	}
	r.Body = io.NopCloser(bytes.NewReader(body))
	r.ContentLength = int64(len(body))
	r.Header.Del("Content-Length")
	return true
}

// adaptRequest replaces the body with its adapted form, or refuses the
// request and reports false.
func (relay *outboundRelay) adaptRequest(w http.ResponseWriter, r *http.Request, req *Request, groups []systemGroup, model, count bool) bool {
	relay.mu.Lock()
	relay.sequence++
	sequence := relay.sequence
	relay.mu.Unlock()
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64<<20))
	var adapted []byte
	var attributed bool
	if err == nil {
		adapted, attributed, err = relay.adaptAttributed(req, groups, body, count)
	}
	if err == nil && model {
		adapted, err = req.applyInferenceGeo(adapted)
	}
	if err == nil && model && attributed && req.credit != nil {
		adapted, err = req.bindCreditWire(adapted, r.Header)
	}
	if err == nil && req.upstreamSession != "" {
		// After credit binding, which leaves metadata unbound (credits.Prompt).
		adapted, err = upstreamUserID(adapted, req.upstreamSession)
	}
	if err == nil && attributed && req.resources != nil {
		err = req.validateOutboundResources(adapted, relay.control)
	}
	if err == nil && model && req.CountTokens {
		if !attributed {
			err = fmt.Errorf("auxiliary generation is forbidden during token counting")
		}
	}
	if err == nil && req.resource != nil && !attributed {
		err = fmt.Errorf("auxiliary generation is forbidden during resource operations")
	}
	if err != nil {
		// The gateway reports the cause; the CLI is stopped and reads only
		// neutral text (see passUpstreamErrors). A refused token count only
		// fails that estimate, not the run.
		var unavailable *nativeToolAvailabilityError
		if model && errors.As(err, &unavailable) {
			relay.mu.Lock()
			unavailable.RetrySafe = !relay.modelForwarded
			relay.mu.Unlock()
		}
		err = &requestRefusal{fmt.Errorf("cannot prepare the upstream request: %w", err)}
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
		return false
	}
	if len(groups) > 0 && model {
		relay.mu.Lock()
		relay.restored++
		relay.mu.Unlock()
	}
	if model {
		relay.mu.Lock()
		relay.modelForwarded = true
		relay.mu.Unlock()
	}
	if model && req.CacheWarmup && attributed {
		ctx := context.WithValue(r.Context(), warmupRequestKey{}, true)
		*r = *r.WithContext(context.WithValue(ctx, modelRequest{}, true))
	}
	if model && req.fallbackJSON() && attributed {
		ctx := context.WithValue(r.Context(), jsonGenerationRequestKey{}, req)
		*r = *r.WithContext(context.WithValue(ctx, modelRequest{}, true))
	}
	if model && (req.hasFallbacks() || req.credit != nil) && attributed {
		// The provider owns this explicit attempt chain. CC must not start a
		// second chain after a rate limit, transport status, or SSE error.
		*r = *r.WithContext(context.WithValue(r.Context(), modelRequest{}, true))
	}
	if model && req.CountTokens && attributed {
		ctx := context.WithValue(r.Context(), tokenCountRequestKey{}, true)
		*r = *r.WithContext(context.WithValue(ctx, modelRequest{}, true))
		r.URL.Path += "/count_tokens"
	}
	if model && (req.observesAPITerminal() || req.Plan != nil && req.Plan.apiGeneration) && attributed {
		*r = *r.WithContext(context.WithValue(r.Context(), apiOutputRequestKey{}, req))
	}
	if model && attributed {
		*r = *r.WithContext(context.WithValue(r.Context(), providerResponseKey{}, req.responseFacts))
	}
	r.Body = io.NopCloser(bytes.NewReader(adapted))
	if req.diagnostic != nil {
		req.diagnostic.save(fmt.Sprintf("upstream-request-%03d-%s.body", sequence, uuid()[:8]), adapted)
	}
	r.ContentLength = int64(len(adapted))
	r.Header.Del("Content-Length")
	if req.resource != nil {
		return relay.prepareResourceRequest(w, r, req.resource)
	}
	return true
}
