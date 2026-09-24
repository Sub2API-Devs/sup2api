package main

import (
	"bufio"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func post(t *testing.T, srv *httptest.Server, path string, headers map[string]string, body string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest(http.MethodPost, srv.URL+path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { resp.Body.Close() })
	return resp
}

func decode(t *testing.T, resp *http.Response) map[string]any {
	t.Helper()
	var m map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&m); err != nil {
		t.Fatal(err)
	}
	return m
}

// sseData returns the data payloads (and event names) of an SSE response.
func sseData(t *testing.T, resp *http.Response) (events, data []string) {
	t.Helper()
	if ct := resp.Header.Get("Content-Type"); ct != "text/event-stream" {
		t.Fatalf("content-type = %s", ct)
	}
	sc := bufio.NewScanner(resp.Body)
	ev := ""
	for sc.Scan() {
		line := sc.Text()
		switch {
		case strings.HasPrefix(line, "event: "):
			ev = strings.TrimPrefix(line, "event: ")
		case strings.HasPrefix(line, "data: "):
			events = append(events, ev)
			data = append(data, strings.TrimPrefix(line, "data: "))
			ev = ""
		}
	}
	return events, data
}

func get(m any, path ...string) any {
	for _, p := range path {
		mm, ok := m.(map[string]any)
		if !ok {
			return nil
		}
		m = mm[p]
	}
	return m
}

func num(v any) int64 {
	f, _ := v.(float64)
	return int64(f)
}

func newTestServer(t *testing.T) (*server, *httptest.Server) {
	s := newServer()
	srv := httptest.NewServer(s.handler())
	t.Cleanup(srv.Close)
	return s, srv
}

func TestOpenAIChat(t *testing.T) {
	s, srv := newTestServer(t)
	auth := map[string]string{"Authorization": "Bearer sk-openai-1", "x-mock-chunk-delay-ms": "1"}

	m := decode(t, post(t, srv, "/v1/chat/completions", auth, `{"model":"gpt-x","messages":[{"role":"user","content":"hi"}]}`))
	if get(m, "model") != "gpt-x" || num(get(m, "usage", "prompt_tokens")) != 120 || num(get(m, "usage", "completion_tokens")) != 42 ||
		num(get(m, "usage", "prompt_tokens_details", "cached_tokens")) != 50 {
		t.Fatalf("chat = %v", m)
	}

	// Stream without include_usage: no usage anywhere.
	_, data := sseData(t, post(t, srv, "/v1/chat/completions", auth, `{"model":"gpt-x","stream":true,"messages":[]}`))
	if data[len(data)-1] != "[DONE]" || strings.Contains(strings.Join(data, ""), "prompt_tokens") || strings.Contains(strings.Join(data, ""), `"usage"`) {
		t.Fatalf("stream without usage: %v", data)
	}
	// Stream with include_usage: a last chunk with empty choices and usage.
	_, data = sseData(t, post(t, srv, "/v1/chat/completions", auth, `{"model":"gpt-x","stream":true,"stream_options":{"include_usage":true},"messages":[]}`))
	var last map[string]any
	_ = json.Unmarshal([]byte(data[len(data)-2]), &last)
	if data[len(data)-1] != "[DONE]" || num(get(last, "usage", "prompt_tokens")) != 120 || num(get(last, "usage", "completion_tokens")) != 42 ||
		len(last["choices"].([]any)) != 0 {
		t.Fatalf("stream with usage: %v", data)
	}
	var first map[string]any
	_ = json.Unmarshal([]byte(data[0]), &first)
	if v, ok := first["usage"]; !ok || v != nil {
		t.Fatalf("first chunk usage should be null: %s", data[0])
	}

	// Error injection in OpenAI format, key recorded from Authorization.
	resp := post(t, srv, "/v1/chat/completions", map[string]string{"Authorization": "Bearer sk-openai-1", "x-mock-status": "429"}, `{"model":"gpt-x"}`)
	e := decode(t, resp)
	if resp.StatusCode != 429 || resp.Header.Get("retry-after") != "2" || get(e, "error", "code") != "rate_limit_exceeded" {
		t.Fatalf("429 = %d %v", resp.StatusCode, e)
	}
	// Key marker.
	if resp := post(t, srv, "/v1/chat/completions", map[string]string{"Authorization": "Bearer sk-x-status-401"}, `{"model":"gpt-x"}`); resp.StatusCode != 401 {
		t.Fatalf("marker = %d", resp.StatusCode)
	}
	s.mu.Lock()
	rec := s.log[len(s.log)-2]
	s.mu.Unlock()
	if rec.APIKey != "sk-openai-1" || rec.Path != "/v1/chat/completions" || rec.Status != 429 || rec.Model != "gpt-x" {
		t.Fatalf("recorded = %+v", rec)
	}
}

func TestOpenAIResponsesAndEmbeddings(t *testing.T) {
	_, srv := newTestServer(t)
	auth := map[string]string{"Authorization": "Bearer sk-openai-2", "x-mock-chunk-delay-ms": "1"}
	m := decode(t, post(t, srv, "/v1/responses", auth, `{"model":"gpt-r","input":"hi"}`))
	if get(m, "status") != "completed" || num(get(m, "usage", "input_tokens")) != 120 || num(get(m, "usage", "output_tokens")) != 42 ||
		num(get(m, "usage", "input_tokens_details", "cached_tokens")) != 50 {
		t.Fatalf("responses = %v", m)
	}
	events, data := sseData(t, post(t, srv, "/v1/responses", auth, `{"model":"gpt-r","input":"hi","stream":true}`))
	if events[0] != "response.created" || events[len(events)-1] != "response.completed" {
		t.Fatalf("events = %v", events)
	}
	var done map[string]any
	_ = json.Unmarshal([]byte(data[len(data)-1]), &done)
	if get(done, "type") != "response.completed" || num(get(done, "response", "usage", "output_tokens")) != 42 || get(done, "response", "model") != "gpt-r" {
		t.Fatalf("completed = %s", data[len(data)-1])
	}
	if resp := post(t, srv, "/v1/responses", map[string]string{"Authorization": "Bearer k", "x-mock-status": "500"}, `{"model":"gpt-r"}`); resp.StatusCode != 500 {
		t.Fatalf("responses error = %d", resp.StatusCode)
	}

	m = decode(t, post(t, srv, "/v1/embeddings", auth, `{"model":"text-embedding-3-small","input":["a","b"]}`))
	if len(m["data"].([]any)) != 2 || num(get(m, "usage", "prompt_tokens")) != 120 || get(m, "model") != "text-embedding-3-small" {
		t.Fatalf("embeddings = %v", m)
	}
	if resp := post(t, srv, "/v1/embeddings", map[string]string{"Authorization": "Bearer k", "x-mock-status": "401"}, `{"model":"e","input":"a"}`); resp.StatusCode != 401 {
		t.Fatalf("embeddings error = %d", resp.StatusCode)
	}
}

func TestGemini(t *testing.T) {
	s, srv := newTestServer(t)
	key := map[string]string{"x-goog-api-key": "AIza-mock-1", "x-mock-chunk-delay-ms": "1"}
	body := `{"contents":[{"role":"user","parts":[{"text":"hi"}]}]}`

	m := decode(t, post(t, srv, "/v1beta/models/gemini-x:generateContent", key, body))
	u := get(m, "usageMetadata")
	if get(m, "modelVersion") != "gemini-x" || num(get(u, "promptTokenCount")) != 120 || num(get(u, "candidatesTokenCount")) != 42 ||
		num(get(u, "thoughtsTokenCount")) != 30 || num(get(u, "cachedContentTokenCount")) != 50 || num(get(u, "totalTokenCount")) != 192 {
		t.Fatalf("generate = %v", m)
	}

	_, data := sseData(t, post(t, srv, "/v1beta/models/gemini-x:streamGenerateContent?alt=sse", key, body))
	var last map[string]any
	_ = json.Unmarshal([]byte(data[len(data)-1]), &last)
	if len(data) < 2 || num(get(last, "usageMetadata", "candidatesTokenCount")) != 42 || num(get(last, "usageMetadata", "thoughtsTokenCount")) != 30 {
		t.Fatalf("stream = %v", data)
	}

	// Without alt=sse: one JSON array.
	resp := post(t, srv, "/v1beta/models/gemini-x:streamGenerateContent", key, body)
	raw, _ := io.ReadAll(resp.Body)
	var arr []map[string]any
	if err := json.Unmarshal(raw, &arr); err != nil || len(arr) < 2 {
		t.Fatalf("array stream: %v %s", err, raw)
	}

	m = decode(t, post(t, srv, "/v1beta/models/gemini-x:countTokens", key, body))
	if num(m["totalTokens"]) <= 0 {
		t.Fatalf("countTokens = %v", m)
	}

	resp = post(t, srv, "/v1beta/models/gemini-x:generateContent", map[string]string{"x-goog-api-key": "AIza-mock-1", "x-mock-status": "429"}, body)
	e := decode(t, resp)
	if resp.StatusCode != 429 || get(e, "error", "status") != "RESOURCE_EXHAUSTED" || resp.Header.Get("retry-after") != "2" {
		t.Fatalf("429 = %d %v", resp.StatusCode, e)
	}
	if resp := post(t, srv, "/v1beta/models/gemini-x:streamGenerateContent?alt=sse&key=AIza-q", map[string]string{"x-mock-status": "503"}, body); resp.StatusCode != 503 {
		t.Fatalf("503 = %d", resp.StatusCode)
	}
	if resp := post(t, srv, "/v1beta/models/gemini-x:countTokens", map[string]string{"x-goog-api-key": "k", "x-mock-status": "400"}, body); resp.StatusCode != 400 {
		t.Fatalf("countTokens error = %d", resp.StatusCode)
	}
	if resp := post(t, srv, "/v1beta/models/gemini-x:nope", key, body); resp.StatusCode != 404 {
		t.Fatalf("unknown action = %d", resp.StatusCode)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	var sse, q *recorded
	for i := range s.log {
		r := &s.log[i]
		if r.Query == "alt=sse" && sse == nil {
			sse = r
		}
		if strings.Contains(r.Query, "key=AIza-q") {
			q = r
		}
	}
	if sse == nil || sse.APIKey != "AIza-mock-1" || !sse.Stream || sse.Model != "gemini-x" || sse.Status != 200 {
		t.Fatalf("recorded sse = %+v", sse)
	}
	if q == nil || q.APIKey != "AIza-q" || q.Status != 503 {
		t.Fatalf("recorded query key = %+v", q)
	}
}

// The Anthropic endpoints keep working and record the key as api_key too.
func TestAnthropicUnchanged(t *testing.T) {
	s, srv := newTestServer(t)
	m := decode(t, post(t, srv, "/v1/messages", map[string]string{"x-api-key": "sk-ant-1"}, `{"model":"claude-x","messages":[]}`))
	if num(get(m, "usage", "input_tokens")) != 120 || num(get(m, "usage", "cache_creation_input_tokens")) != 30 {
		t.Fatalf("messages = %v", m)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if r := s.log[0]; r.APIKey != "sk-ant-1" || r.XAPIKey != "sk-ant-1" {
		t.Fatalf("recorded = %+v", r)
	}
}
