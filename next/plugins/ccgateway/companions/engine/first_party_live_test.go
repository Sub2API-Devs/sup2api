package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

// The 2026-11-03 live test (account 82, CLI v45, the official Claude Code
// 2.1.316 client through a custom base URL): a tool loop and a turn that
// spawns a general-purpose subagent, the requests as the client sent them
// (testdata/first-party-live-2.1.316.json, sanitized). Every real answer is
// compressed upstream; the CLI writes it decoded but records the upstream's
// Content-Encoding, and v45's Worker read no answer with one: no continuation
// was given its previous message ID (diagnostics) and no subagent its
// parent's prompt ID and agent type.

type liveCase struct {
	Name      string          `json:"name"`
	AgentID   string          `json:"agent_id"`
	RequestID string          `json:"request_id"`
	Body      json.RawMessage `json:"body"`
	Answer    struct {
		ID         string            `json:"id"`
		StopReason string            `json:"stop_reason"`
		Content    []json.RawMessage `json:"content"`
	} `json:"answer"`
}

func liveCases(t *testing.T) map[string]liveCase {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join("testdata", "first-party-live-2.1.316.json"))
	require.NoError(t, err)
	var fixture struct {
		Cases []liveCase `json:"cases"`
	}
	require.NoError(t, json.Unmarshal(raw, &fixture))
	out := map[string]liveCase{}
	for _, c := range fixture.Cases {
		out[c.Name] = c
	}
	require.Len(t, out, 6)
	return out
}

// liveStream is the answer as the upstream streams it.
func liveStream(c liveCase) string {
	var b strings.Builder
	event := func(kind string, data any) {
		raw, _ := json.Marshal(data)
		fmt.Fprintf(&b, "event: %s\ndata: %s\n\n", kind, raw)
	}
	event("message_start", map[string]any{"type": "message_start", "message": map[string]any{"id": c.Answer.ID, "type": "message", "role": "assistant", "content": []any{}}})
	for i, raw := range c.Answer.Content {
		var block map[string]any
		_ = json.Unmarshal(raw, &block)
		switch block["type"] {
		case "tool_use":
			input, _ := json.Marshal(block["input"])
			event("content_block_start", map[string]any{"type": "content_block_start", "index": i, "content_block": map[string]any{"type": "tool_use", "id": block["id"], "name": block["name"], "input": map[string]any{}}})
			event("content_block_delta", map[string]any{"type": "content_block_delta", "index": i, "delta": map[string]any{"type": "input_json_delta", "partial_json": string(input)}})
		case "thinking":
			event("content_block_start", map[string]any{"type": "content_block_start", "index": i, "content_block": map[string]any{"type": "thinking", "thinking": ""}})
			event("content_block_delta", map[string]any{"type": "content_block_delta", "index": i, "delta": map[string]any{"type": "signature_delta", "signature": block["signature"]}})
		default:
			event("content_block_start", map[string]any{"type": "content_block_start", "index": i, "content_block": map[string]any{"type": "text", "text": ""}})
			event("content_block_delta", map[string]any{"type": "content_block_delta", "index": i, "delta": map[string]any{"type": "text_delta", "text": block["text"]}})
		}
		event("content_block_stop", map[string]any{"type": "content_block_stop", "index": i})
	}
	event("message_delta", map[string]any{"type": "message_delta", "delta": map[string]any{"stop_reason": c.Answer.StopReason}})
	event("message_stop", map[string]any{"type": "message_stop"})
	return b.String()
}

const livePromptID = "5d5c3a2e-1b0f-4c9d-8e7a-6f5b4c3d2e1f"

// liveReport is the session the converting CLI reports for a case.
func liveReport(c liveCase, turn int) string {
	if c.AgentID != "" {
		return fmt.Sprintf(`{"thread":%q,"prompt_id":%q,"agent_type":"general-purpose"}`, c.AgentID, livePromptID)
	}
	return fmt.Sprintf(`{"thread":"main","turn_position":{"prompt_index":0,"turn_index":%d},"prompt_hash":"%s","prompt_id":%q}`, turn, fixtureHash, livePromptID)
}

// liveGateway is a converting Worker whose CLI answers each case (by the
// marker build puts in its input) with the case's answer, recorded with the
// upstream's Content-Encoding; linger keeps a case's CLI running after it.
type liveGateway struct {
	g      *Gateway
	root   string
	cases  map[string]liveCase
	turns  map[string]int
	linger map[string]int
}

func newLiveGateway(t *testing.T, cases map[string]liveCase, turns, linger map[string]int) *liveGateway {
	t.Helper()
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	config := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(config, ".claude.json"), []byte(`{"oauthAccount":{"emailAddress":"account@example.invalid"}}`), 0600))
	require.NoError(t, os.WriteFile(filepath.Join(config, ".credentials.json"), []byte(`{"claudeAiOauth":{"accessToken":"fixture"}}`), 0600))
	type entry struct {
		Marker string            `json:"marker"`
		Env    map[string]string `json:"env"`
	}
	var script []entry
	for name, c := range cases {
		script = append(script, entry{Marker: liveMarker(name), Env: map[string]string{
			"CCG_TEST_REQUEST_ENV_CAPTURE": filepath.Join(root, name+".env.json"), "CCG_TEST_REQUEST_ANSWER_ID": c.RequestID,
			"CCG_TEST_REQUEST_ANSWER_SESSION": liveReport(c, turns[name]), "CCG_TEST_REQUEST_ANSWER_BODY": liveStream(c),
			"CCG_TEST_REQUEST_ANSWER_ENCODING": "gzip", "CCG_TEST_REQUEST_LINGER_MS": fmt.Sprint(linger[name]),
		}})
	}
	data, err := json.Marshal(script)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(filepath.Join(root, "script.json"), data, 0600))
	capabilities := []string{"request_direct", "request_build", features.RequestIdentityCapability, features.BuildContentPreservationCapability, features.SessionStateCapability, features.RequestLevelsCapability, features.DirectBillingCapability, features.FirstPartyShapeCapability}
	g := &Gateway{RequestMode: "build", Key: "fixture", Slots: make(chan struct{}, 4), Timeout: 20 * time.Second,
		CLIInfo: cliRequestInfo{Version: "2.1.316", Capabilities: capabilities}}
	require.NoError(t, g.configureRequestIdentity(root))
	g.Runner = &Runner{CLI: exe, Work: root, Version: "2.1.316", Env: envWith(os.Environ(), map[string]string{
		"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"), "CCG_TEST_REQUEST_FRAME": "",
		"CCG_TEST_REQUEST_SCRIPT": filepath.Join(root, "script.json"),
		"HOME":                    config, "CLAUDE_CONFIG_DIR": config, "CLAUDE_SECURESTORAGE_CONFIG_DIR": config,
	}, "CLAUDE_CODE_USER_EMAIL", "ANTHROPIC_API_KEY")}
	return &liveGateway{g: g, root: root, cases: cases, turns: turns, linger: linger}
}

func liveMarker(name string) string { return "ccg-live-case-" + name + "-end" }

// request is the case's request as the client sent it, marked.
func (l *liveGateway) request(t *testing.T, name string) *http.Request {
	t.Helper()
	c := l.cases[name]
	var body map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(c.Body, &body))
	body["x_fixture_case"], _ = json.Marshal(liveMarker(name))
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	r := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
	r.Header.Set("x-api-key", "fixture")
	r.Header.Set("anthropic-beta", "claude-code-20250219,interleaved-thinking-2025-05-14")
	if c.AgentID != "" {
		r.Header.Set("X-Claude-Code-Agent-Id", c.AgentID)
	}
	return r
}

// identity is what the Worker gave the case's CLI.
func (l *liveGateway) identity(t *testing.T, name string) requestIdentity {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(l.root, name+".env.json"))
	require.NoError(t, err)
	var env map[string]string
	require.NoError(t, json.Unmarshal(data, &env))
	require.Equal(t, "1", env[firstPartyShapeEnv], name)
	var identity requestIdentity
	require.NoError(t, json.Unmarshal([]byte(env[requestIdentityEnv]), &identity))
	return identity
}

func (l *liveGateway) send(t *testing.T, name string) requestIdentity {
	t.Helper()
	w := httptest.NewRecorder()
	l.g.ServeHTTP(w, l.request(t, name))
	require.Equal(t, http.StatusOK, w.Code, name+": "+w.Body.String())
	require.Contains(t, w.Body.String(), "message_stop", name)
	return l.identity(t, name)
}

func TestFirstPartyShapeLiveConversation(t *testing.T) {
	cases := liveCases(t)
	l := newLiveGateway(t, cases, map[string]int{"tool-1": 1, "tool-2": 2, "spawn-main-1": 1, "spawn-main-2": 2}, nil)
	// The tool loop: the second request continues the first, whose answer's
	// message ID is its diagnostics' previous message.
	require.Nil(t, l.send(t, "tool-1").Previous)
	next := l.send(t, "tool-2").Previous
	require.NotNil(t, next, "the continuation is proven")
	require.Equal(t, cases["tool-1"].RequestID, next.RequestID)
	require.Equal(t, cases["tool-1"].Answer.ID, next.MessageID)
	// The turn that spawns a general-purpose subagent: its first request is
	// given the parent's prompt ID and the agent type its Agent call named.
	require.Nil(t, l.send(t, "spawn-main-1").Previous)
	sub := l.send(t, "spawn-sub-1")
	require.Equal(t, &spawnContext{PromptID: livePromptID, AgentType: "general-purpose"}, sub.Spawn)
	require.Nil(t, sub.Previous)
	subNext := l.send(t, "spawn-sub-2")
	require.NotNil(t, subNext.Previous)
	require.Equal(t, cases["spawn-sub-1"].Answer.ID, subNext.Previous.MessageID)
	require.Equal(t, "general-purpose", subNext.Previous.AgentType)
	require.Nil(t, subNext.Spawn)
	mainNext := l.send(t, "spawn-main-2")
	require.NotNil(t, mainNext.Previous)
	require.Equal(t, cases["spawn-main-1"].RequestID, mainNext.Previous.RequestID)
	require.Equal(t, cases["spawn-main-1"].Answer.ID, mainNext.Previous.MessageID)
	require.Equal(t, livePromptID, mainNext.Previous.PromptID)
}

// streamWriter is a client reading the answer as it streams: ended is closed
// once it has the answer's message_stop.
type streamWriter struct {
	mu     sync.Mutex
	header http.Header
	body   bytes.Buffer
	code   int
	ended  chan struct{}
	once   sync.Once
}

func (w *streamWriter) Header() http.Header { return w.header }
func (w *streamWriter) WriteHeader(code int) {
	w.mu.Lock()
	w.code = code
	w.mu.Unlock()
}
func (w *streamWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.body.Write(p)
	if strings.Contains(w.body.String(), "event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n") {
		w.once.Do(func() { close(w.ended) })
	}
	return len(p), nil
}
func (w *streamWriter) Flush() {}

// The client sends the conversation's next request as soon as it has the
// whole answer, while the CLI may still be finishing: the memory takes the
// answer before its end reaches the client, and gives the thread back.
func TestFirstPartyShapeMemoryIsReadyWhenTheAnswerEnds(t *testing.T) {
	cases := liveCases(t)
	l := newLiveGateway(t, cases, map[string]int{"spawn-main-1": 1, "spawn-main-2": 2}, map[string]int{"spawn-main-1": 4000})
	w := &streamWriter{header: http.Header{}, ended: make(chan struct{})}
	done := make(chan struct{})
	started := time.Now()
	go func() {
		defer close(done)
		l.g.ServeHTTP(w, l.request(t, "spawn-main-1"))
	}()
	select {
	case <-w.ended:
	case <-time.After(15 * time.Second):
		t.Fatal("the answer did not end")
	}
	// The parent's CLI is still running (it lingers 4 s).
	sub := l.send(t, "spawn-sub-1")
	require.Equal(t, &spawnContext{PromptID: livePromptID, AgentType: "general-purpose"}, sub.Spawn)
	mainNext := l.send(t, "spawn-main-2")
	require.NotNil(t, mainNext.Previous)
	require.Equal(t, cases["spawn-main-1"].Answer.ID, mainNext.Previous.MessageID)
	select {
	case <-done:
		t.Fatal("the parent's CLI should still be running")
	default:
	}
	require.Less(t, time.Since(started), 4*time.Second)
	<-done
	w.mu.Lock()
	require.Equal(t, http.StatusOK, w.code)
	w.mu.Unlock()
	// The parent's late finish does not move the thread again: it stays at
	// the request that continued it.
	state, _ := l.g.sessionStates.latest(sessionKey(l.identity(t, "spawn-main-2").Session, mainThread))
	require.NotNil(t, state)
	require.Equal(t, cases["spawn-main-2"].RequestID, state.RequestID)
}
