// Command mock-upstream simulates the Anthropic, OpenAI and Gemini APIs for
// the sub2api-next test environment (docs/CONTRACTS.md §11.4, §14.1).
//
// Endpoints:
//
//	POST /v1/messages               streaming (SSE) and non-streaming responses with usage
//	POST /v1/messages/count_tokens  {"input_tokens": N}
//	POST /v1/chat/completions       OpenAI chat; streams send the usage chunk only when
//	                                stream_options.include_usage is true
//	POST /v1/responses              OpenAI Responses (usage in response.completed)
//	POST /v1/embeddings             OpenAI embeddings (usage.prompt_tokens)
//	POST /v1beta/models/{m}:generateContent        Gemini, usageMetadata incl. thoughtsTokenCount
//	POST /v1beta/models/{m}:streamGenerateContent  ?alt=sse -> SSE, otherwise a JSON array
//	POST /v1beta/models/{m}:countTokens            {"totalTokens": N}
//	GET  /v1/models                 Anthropic/OpenAI style list {"data":[{"id":...}]}
//	GET  /v1beta/models             Gemini style list {"models":[{"name":"models/..."}]}
//	GET  /__requests[?since=ID]     last 100 recorded requests (newest last)
//	DELETE /__requests              clear the request log
//	GET/POST/DELETE /__control      per-API-key behaviour rules (see controlRule)
//	ANY  /__webhook/*               accepts and records anything (plugin webhook target)
//	GET  /healthz
//
// The upstream API key is read from x-api-key, Authorization: Bearer,
// x-goog-api-key or ?key= (in that order) and recorded as "api_key".
//
// Behaviour for a request is resolved in this order (first match wins):
//  1. request headers x-mock-status / x-mock-delay-ms / x-mock-usage
//  2. a /__control rule for the request's API key (optionally limited to N uses)
//  3. markers inside the API key itself: "...-status-429", "...-delay-500"
//  4. body metadata.mock_status / metadata.mock_delay_ms
//
// Errors use the format of the endpoint's API (Anthropic, OpenAI or Google).
// The core only forwards whitelisted client headers to the upstream, so tests
// that go through the gateway use (2) or (3); (1) is for direct calls.
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand/v2"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

const maxLog = 100

// Usage is the token usage reported by the mock. The same numbers are
// reported in each API's own shape:
//   - Anthropic (exclusive): input_tokens, cache_read_input_tokens,
//     cache_creation_input_tokens (+ ephemeral_1h), output_tokens;
//   - OpenAI (inclusive): prompt_tokens / input_tokens = InputTokens, of
//     which cached_tokens = CacheReadTokens; completion_tokens /
//     output_tokens = OutputTokens (reasoning_tokens = ThoughtsTokens is a
//     detail included in it); cache creation is not reported;
//   - Gemini (inclusive): promptTokenCount = InputTokens, of which
//     cachedContentTokenCount = CacheReadTokens; candidatesTokenCount =
//     OutputTokens and, separately, thoughtsTokenCount = ThoughtsTokens.
type Usage struct {
	InputTokens         int64 `json:"input_tokens"`
	OutputTokens        int64 `json:"output_tokens"`
	CacheReadTokens     int64 `json:"cache_read_input_tokens"`
	CacheCreationTokens int64 `json:"cache_creation_input_tokens"` // 5m + 1h
	CacheCreation1h     int64 `json:"cache_creation_1h_input_tokens"`
	ThoughtsTokens      int64 `json:"thoughts_tokens"`
}

// DefaultUsage is returned unless a rule or header overrides it. Tests assert
// billing against these numbers.
var DefaultUsage = Usage{InputTokens: 120, OutputTokens: 42, CacheReadTokens: 50, CacheCreationTokens: 30, CacheCreation1h: 0, ThoughtsTokens: 30}

// controlRule changes the behaviour for one API key.
type controlRule struct {
	APIKey  string `json:"api_key"`
	Status  int    `json:"status,omitempty"`   // error status to return (429|401|403|529|500|400...)
	DelayMS int    `json:"delay_ms,omitempty"` // delay before the response starts
	// ChunkDelayMS is the pause between SSE events (default 20ms).
	ChunkDelayMS int `json:"chunk_delay_ms,omitempty"`
	// Remaining limits how many requests the rule applies to; 0 = unlimited.
	Remaining int    `json:"remaining,omitempty"`
	Usage     *Usage `json:"usage,omitempty"`
	// Text overrides the assistant text.
	Text string `json:"text,omitempty"`
}

// recorded is one entry of GET /__requests.
type recorded struct {
	ID             int64             `json:"id"`
	Time           time.Time         `json:"time"`
	Method         string            `json:"method"`
	Path           string            `json:"path"`
	Query          string            `json:"query,omitempty"`
	XAPIKey        string            `json:"x_api_key"`
	Authorization  string            `json:"authorization,omitempty"`
	APIKey         string            `json:"api_key"` // from whichever auth header/query carried it
	Headers        map[string]string `json:"headers"`
	Model          string            `json:"model,omitempty"`
	Stream         bool              `json:"stream"`
	MetadataUserID string            `json:"metadata_user_id,omitempty"`
	Body           string            `json:"body"`
	BodyTruncated  bool              `json:"body_truncated,omitempty"`
	Status         int               `json:"status"`
}

type server struct {
	mu     sync.Mutex
	nextID int64
	log    []recorded
	rules  map[string]*controlRule
}

func main() {
	addr := os.Getenv("MOCK_ADDR")
	if addr == "" {
		addr = ":8080"
	}
	log.Printf("mock-upstream listening on %s", addr)
	srv := &http.Server{Addr: addr, Handler: newServer().handler(), ReadHeaderTimeout: 10 * time.Second}
	log.Fatal(srv.ListenAndServe())
}

func newServer() *server { return &server{rules: map[string]*controlRule{}} }

func (s *server) handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, 200, map[string]any{"status": "ok"})
	})
	mux.HandleFunc("POST /v1/messages", s.messages)
	mux.HandleFunc("POST /v1/messages/count_tokens", s.countTokens)
	mux.HandleFunc("POST /v1/chat/completions", s.chatCompletions)
	mux.HandleFunc("POST /v1/responses", s.responses)
	mux.HandleFunc("POST /v1/embeddings", s.embeddings)
	mux.HandleFunc("POST /v1beta/models/{spec}", s.gemini)
	mux.HandleFunc("GET /v1/models", s.listModels)
	mux.HandleFunc("GET /v1beta/models", s.listGeminiModels)
	mux.HandleFunc("GET /__requests", s.listRequests)
	mux.HandleFunc("DELETE /__requests", s.clearRequests)
	mux.HandleFunc("GET /__control", s.listRules)
	mux.HandleFunc("POST /__control", s.setRule)
	mux.HandleFunc("DELETE /__control", s.clearRules)
	mux.HandleFunc("/__webhook/", s.webhook)
	return mux
}

// requestKey returns the upstream API key of r: x-api-key (Anthropic),
// Authorization: Bearer (OpenAI), x-goog-api-key or ?key= (Gemini).
func requestKey(r *http.Request) string {
	if k := r.Header.Get("x-api-key"); k != "" {
		return k
	}
	if a := r.Header.Get("Authorization"); a != "" {
		return strings.TrimSpace(strings.TrimPrefix(a, "Bearer "))
	}
	if k := r.Header.Get("x-goog-api-key"); k != "" {
		return k
	}
	return r.URL.Query().Get("key")
}

// ------------------------------------------------------------------ recording

func (s *server) record(r *http.Request, body []byte, model string, stream bool, userID string) int64 {
	h := map[string]string{}
	for k, v := range r.Header {
		h[strings.ToLower(k)] = strings.Join(v, ", ")
	}
	b := body
	trunc := false
	if len(b) > 4096 {
		b, trunc = b[:4096], true
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.nextID++
	s.log = append(s.log, recorded{
		ID: s.nextID, Time: time.Now().UTC(), Method: r.Method, Path: r.URL.Path, Query: r.URL.RawQuery,
		XAPIKey: r.Header.Get("x-api-key"), Authorization: r.Header.Get("Authorization"), APIKey: requestKey(r), Headers: h,
		Model: model, Stream: stream, MetadataUserID: userID, Body: string(b), BodyTruncated: trunc,
	})
	if len(s.log) > maxLog {
		s.log = s.log[len(s.log)-maxLog:]
	}
	return s.nextID
}

func (s *server) setStatus(id int64, status int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := len(s.log) - 1; i >= 0; i-- {
		if s.log[i].ID == id {
			s.log[i].Status = status
			return
		}
	}
}

func (s *server) listRequests(w http.ResponseWriter, r *http.Request) {
	since, _ := strconv.ParseInt(r.URL.Query().Get("since"), 10, 64)
	s.mu.Lock()
	out := make([]recorded, 0, len(s.log))
	for _, e := range s.log {
		if e.ID > since {
			out = append(out, e)
		}
	}
	last := s.nextID
	s.mu.Unlock()
	writeJSON(w, 200, map[string]any{"data": out, "last_id": last})
}

func (s *server) clearRequests(w http.ResponseWriter, _ *http.Request) {
	s.mu.Lock()
	s.log = nil
	last := s.nextID
	s.mu.Unlock()
	writeJSON(w, 200, map[string]any{"last_id": last})
}

// ------------------------------------------------------------------ control

func (s *server) listRules(w http.ResponseWriter, _ *http.Request) {
	s.mu.Lock()
	out := make([]controlRule, 0, len(s.rules))
	for _, r := range s.rules {
		out = append(out, *r)
	}
	s.mu.Unlock()
	writeJSON(w, 200, map[string]any{"data": out})
}

func (s *server) setRule(w http.ResponseWriter, r *http.Request) {
	var rule controlRule
	if err := json.NewDecoder(r.Body).Decode(&rule); err != nil || rule.APIKey == "" {
		writeJSON(w, 400, map[string]any{"error": "body must be a rule with api_key"})
		return
	}
	s.mu.Lock()
	s.rules[rule.APIKey] = &rule
	s.mu.Unlock()
	writeJSON(w, 200, map[string]any{"data": rule})
}

func (s *server) clearRules(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	if k := r.URL.Query().Get("api_key"); k != "" {
		delete(s.rules, k)
	} else {
		s.rules = map[string]*controlRule{}
	}
	s.mu.Unlock()
	w.WriteHeader(http.StatusNoContent)
}

// behaviour is the resolved per-request behaviour.
type behaviour struct {
	status     int
	delay      time.Duration
	chunkDelay time.Duration
	usage      Usage
	text       string
}

var keyMarker = regexp.MustCompile(`-(status|delay)-(\d+)`)

func (s *server) resolve(r *http.Request, meta map[string]any) behaviour {
	b := behaviour{usage: DefaultUsage, chunkDelay: 20 * time.Millisecond, text: "Hello from mock-upstream."}
	key := requestKey(r)
	// 4. body metadata (lowest precedence, applied first)
	if v, ok := meta["mock_status"].(float64); ok {
		b.status = int(v)
	}
	if v, ok := meta["mock_delay_ms"].(float64); ok {
		b.delay = time.Duration(v) * time.Millisecond
	}
	// 3. markers in the key
	for _, m := range keyMarker.FindAllStringSubmatch(key, -1) {
		n, _ := strconv.Atoi(m[2])
		if m[1] == "status" {
			b.status = n
		} else {
			b.delay = time.Duration(n) * time.Millisecond
		}
	}
	// 2. control rule
	s.mu.Lock()
	if rule := s.rules[key]; rule != nil {
		if rule.Status != 0 {
			b.status = rule.Status
		}
		if rule.DelayMS != 0 {
			b.delay = time.Duration(rule.DelayMS) * time.Millisecond
		}
		if rule.ChunkDelayMS != 0 {
			b.chunkDelay = time.Duration(rule.ChunkDelayMS) * time.Millisecond
		}
		if rule.Usage != nil {
			b.usage = *rule.Usage
		}
		if rule.Text != "" {
			b.text = rule.Text
		}
		if rule.Remaining > 0 {
			rule.Remaining--
			if rule.Remaining == 0 {
				delete(s.rules, key)
			}
		}
	}
	s.mu.Unlock()
	// 1. explicit headers
	if v := r.Header.Get("x-mock-status"); v != "" {
		b.status, _ = strconv.Atoi(v)
	}
	if v := r.Header.Get("x-mock-delay-ms"); v != "" {
		n, _ := strconv.Atoi(v)
		b.delay = time.Duration(n) * time.Millisecond
	}
	if v := r.Header.Get("x-mock-chunk-delay-ms"); v != "" {
		n, _ := strconv.Atoi(v)
		b.chunkDelay = time.Duration(n) * time.Millisecond
	}
	if v := r.Header.Get("x-mock-usage"); v != "" {
		// "input=1,output=2,cache_read=3,cache_creation=4,cache_creation_1h=5,thoughts=6"
		for _, kv := range strings.Split(v, ",") {
			k, val, _ := strings.Cut(strings.TrimSpace(kv), "=")
			n, _ := strconv.ParseInt(val, 10, 64)
			switch k {
			case "input":
				b.usage.InputTokens = n
			case "output":
				b.usage.OutputTokens = n
			case "cache_read":
				b.usage.CacheReadTokens = n
			case "cache_creation":
				b.usage.CacheCreationTokens = n
			case "cache_creation_1h":
				b.usage.CacheCreation1h = n
			case "thoughts":
				b.usage.ThoughtsTokens = n
			}
		}
	}
	return b
}

// ------------------------------------------------------------------ API

type messagesRequest struct {
	Model    string         `json:"model"`
	Stream   bool           `json:"stream"`
	Metadata map[string]any `json:"metadata"`
	Messages []any          `json:"messages"`
	System   any            `json:"system"`
}

func (s *server) messages(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(io.LimitReader(r.Body, 32<<20))
	var req messagesRequest
	if err := json.Unmarshal(body, &req); err != nil {
		id := s.record(r, body, "", false, "")
		s.setStatus(id, 400)
		anthropicError(w, 400, "invalid_request_error", "invalid JSON body")
		return
	}
	uid, _ := req.Metadata["user_id"].(string)
	id := s.record(r, body, req.Model, req.Stream, uid)
	b := s.resolve(r, req.Metadata)
	if !sleep(r, b.delay) {
		s.setStatus(id, 499)
		return
	}
	if b.status >= 400 {
		s.setStatus(id, b.status)
		writeMockError(w, b.status)
		return
	}
	if req.Model == "" {
		s.setStatus(id, 400)
		anthropicError(w, 400, "invalid_request_error", "model: field required")
		return
	}
	s.setStatus(id, 200)
	msgID := fmt.Sprintf("msg_mock_%d_%06d", id, rand.IntN(1000000))
	w.Header().Set("request-id", fmt.Sprintf("req_mock_%d", id))
	w.Header().Set("x-mock-request-id", strconv.FormatInt(id, 10))
	if req.Stream {
		s.stream(w, r, req.Model, msgID, b)
		return
	}
	writeJSON(w, 200, map[string]any{
		"id": msgID, "type": "message", "role": "assistant", "model": req.Model,
		"content":       []any{map[string]any{"type": "text", "text": b.text}},
		"stop_reason":   "end_turn",
		"stop_sequence": nil,
		"usage":         usageJSON(b.usage, b.usage.OutputTokens),
	})
}

func usageJSON(u Usage, output int64) map[string]any {
	return map[string]any{
		"input_tokens":                u.InputTokens,
		"cache_creation_input_tokens": u.CacheCreationTokens,
		"cache_read_input_tokens":     u.CacheReadTokens,
		"cache_creation": map[string]any{
			"ephemeral_5m_input_tokens": u.CacheCreationTokens - u.CacheCreation1h,
			"ephemeral_1h_input_tokens": u.CacheCreation1h,
		},
		"output_tokens": output,
	}
}

func (s *server) stream(w http.ResponseWriter, r *http.Request, model, msgID string, b behaviour) {
	fl, _ := w.(http.Flusher)
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.WriteHeader(200)
	send := func(event string, data any) bool {
		raw, _ := json.Marshal(data)
		if _, err := fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, raw); err != nil {
			return false
		}
		if fl != nil {
			fl.Flush()
		}
		return sleep(r, b.chunkDelay)
	}
	if !send("message_start", map[string]any{"type": "message_start", "message": map[string]any{
		"id": msgID, "type": "message", "role": "assistant", "model": model, "content": []any{},
		"stop_reason": nil, "stop_sequence": nil, "usage": usageJSON(b.usage, 1),
	}}) {
		return
	}
	if !send("content_block_start", map[string]any{"type": "content_block_start", "index": 0,
		"content_block": map[string]any{"type": "text", "text": ""}}) {
		return
	}
	if !send("ping", map[string]any{"type": "ping"}) {
		return
	}
	for _, part := range chunks(b.text) {
		if !send("content_block_delta", map[string]any{"type": "content_block_delta", "index": 0,
			"delta": map[string]any{"type": "text_delta", "text": part}}) {
			return
		}
	}
	if !send("content_block_stop", map[string]any{"type": "content_block_stop", "index": 0}) {
		return
	}
	if !send("message_delta", map[string]any{"type": "message_delta",
		"delta": map[string]any{"stop_reason": "end_turn", "stop_sequence": nil},
		"usage": map[string]any{"output_tokens": b.usage.OutputTokens}}) {
		return
	}
	send("message_stop", map[string]any{"type": "message_stop"})
}

// chunks splits text into word-sized deltas (at least one).
func chunks(text string) []string {
	words := strings.SplitAfter(text, " ")
	out := make([]string, 0, len(words))
	for _, w := range words {
		if w != "" {
			out = append(out, w)
		}
	}
	if len(out) == 0 {
		out = []string{""}
	}
	return out
}

func (s *server) countTokens(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(io.LimitReader(r.Body, 32<<20))
	var req messagesRequest
	_ = json.Unmarshal(body, &req)
	uid, _ := req.Metadata["user_id"].(string)
	id := s.record(r, body, req.Model, false, uid)
	b := s.resolve(r, req.Metadata)
	if !sleep(r, b.delay) {
		s.setStatus(id, 499)
		return
	}
	if b.status >= 400 {
		s.setStatus(id, b.status)
		writeMockError(w, b.status)
		return
	}
	s.setStatus(id, 200)
	// Rough estimate: 1 token per 4 bytes of messages+system.
	n := int64(len(body)/4) + 1
	writeJSON(w, 200, map[string]any{"input_tokens": n})
}

// MockModels are the ids returned by the model list endpoints.
var MockModels = []string{"claude-sonnet-4-5", "claude-opus-4-1", "gpt-4.1", "gemini-2.5-pro"}

// listModels answers GET /v1/models (Anthropic and OpenAI share the shape).
// A rule or key marker with a 4xx/5xx status applies, so tests can check
// how the console reports upstream failures.
func (s *server) listModels(w http.ResponseWriter, r *http.Request) {
	id := s.record(r, nil, "", false, "")
	b := s.resolve(r, nil)
	if b.status >= 400 {
		s.setStatus(id, b.status)
		writeMockError(w, b.status)
		return
	}
	s.setStatus(id, 200)
	data := make([]map[string]any, 0, len(MockModels))
	for _, m := range MockModels {
		data = append(data, map[string]any{"id": m, "type": "model", "object": "model"})
	}
	writeJSON(w, 200, map[string]any{"data": data, "object": "list", "has_more": false})
}

// listGeminiModels answers GET /v1beta/models with resource names.
func (s *server) listGeminiModels(w http.ResponseWriter, r *http.Request) {
	id := s.record(r, nil, "", false, "")
	b := s.resolve(r, nil)
	if b.status >= 400 {
		s.setStatus(id, b.status)
		writeMockError(w, b.status)
		return
	}
	s.setStatus(id, 200)
	models := make([]map[string]any, 0, len(MockModels))
	for _, m := range MockModels {
		models = append(models, map[string]any{"name": "models/" + m, "displayName": m})
	}
	writeJSON(w, 200, map[string]any{"models": models})
}

func (s *server) webhook(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	id := s.record(r, body, "", false, "")
	s.setStatus(id, 200)
	writeJSON(w, 200, map[string]any{"ok": true})
}

// ------------------------------------------------------------------ helpers

func writeMockError(w http.ResponseWriter, status int) {
	switch status {
	case 400:
		anthropicError(w, 400, "invalid_request_error", "mock: invalid request")
	case 401:
		anthropicError(w, 401, "authentication_error", "mock: invalid x-api-key")
	case 403:
		anthropicError(w, 403, "permission_error", "mock: permission denied")
	case 429:
		w.Header().Set("retry-after", "2")
		anthropicError(w, 429, "rate_limit_error", "mock: rate limited")
	case 529:
		anthropicError(w, 529, "overloaded_error", "mock: overloaded")
	default:
		anthropicError(w, status, "api_error", "mock: internal error")
	}
}

func anthropicError(w http.ResponseWriter, status int, typ, msg string) {
	writeJSON(w, status, map[string]any{"type": "error", "error": map[string]any{"type": typ, "message": msg}})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// sleep waits d or until the client goes away; it reports whether to continue.
func sleep(r *http.Request, d time.Duration) bool {
	if d <= 0 {
		return r.Context().Err() == nil
	}
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-t.C:
		return true
	case <-r.Context().Done():
		return false
	}
}
