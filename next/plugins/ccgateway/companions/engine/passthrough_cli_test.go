package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// passthroughWire is one request the fake upstream received.
type passthroughWire struct {
	header http.Header
	body   Object
	raw    []byte
}

func TestRealCLINativeGateway(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for the native gateway integration test")
	}
	version, err := checkVersion(cli)
	require.NoError(t, err)
	for _, status := range []int{200, 429} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			root := t.TempDir()
			plugin, err := extractMod(root)
			require.NoError(t, err)
			var requests atomic.Int64
			fake := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{}`)
					return
				}
				requests.Add(1)
				assert.NotNil(t, r.TLS)
				body, err := io.ReadAll(r.Body)
				if !assert.NoError(t, err) {
					return
				}
				wire, err := decodeObject(body)
				if !assert.NoError(t, err) {
					return
				}
				assert.Equal(t, "fast", str(wire, "speed"))
				w.Header().Set("Request-Id", "req_native_gateway")
				if status != 200 {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(status)
					fmt.Fprint(w, `{"type":"error","error":{"type":"rate_limit_error","message":"offline quota fixture"},"request_id":"req_native_gateway"}`)
					return
				}
				writeSurfaceFixture(w, "claude-sonnet-4-6", []Object{{"type": "text", "text": "NATIVE_GATEWAY_OK"}})
			}))
			defer fake.Close()
			ca := filepath.Join(root, "mock-ca.pem")
			require.NoError(t, os.WriteFile(ca, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: fake.Certificate().Raw}), 0600))
			env := envWith(nativeProbeEnv(root, fake.URL), map[string]string{"NODE_EXTRA_CA_CERTS": ca})
			runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}
			cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
			require.NoError(t, err)
			g := &Gateway{Runner: runner, Cache: cache, Timeout: 40 * time.Second, Slots: make(chan struct{}, 1)}
			req := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"claude-sonnet-4-6","max_tokens":64,"speed":"fast","messages":[{"role":"user","content":"offline test"}]}`))
			req.Header.Set(policyHeader, `{"relay_mode":"native","allow_fast":true}`)
			res := httptest.NewRecorder()
			g.ServeHTTP(res, req)
			require.Equal(t, status, res.Code, res.Body.String())
			assert.Equal(t, int64(1), requests.Load())
			if status == 200 {
				assert.Contains(t, res.Body.String(), "NATIVE_GATEWAY_OK")
			} else {
				assert.Equal(t, "cli", res.Header().Get("X-CCGateway-Error-Source"))
				assert.Equal(t, "req_native_gateway", res.Header().Get("Request-Id"))
				assert.JSONEq(t, `{"type":"error","error":{"type":"rate_limit_error","message":"Claude Code native error: rate_limit"}}`, res.Body.String())
			}
		})
	}
}

// TestRealCLIRelayPassthrough runs the real CLI behind the passthrough relay
// (PASSTHROUGH-DESIGN.md): what upstream receives is what the CLI built, with
// the client's fields from CLAUDE_CODE_EXTRA_BODY, the CLI's own session U and
// subagent A', no retries, and upstream errors returned as sent.
func TestRealCLIRelayPassthrough(t *testing.T) {
	testRealCLIPassthrough(t, "passthrough")
}

func TestRealCLINativePassthroughCompatibility(t *testing.T) {
	testRealCLIPassthrough(t, "native")
}

func testRealCLIPassthrough(t *testing.T, mode string) {
	t.Helper()
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for the real CLI passthrough test")
	}
	version, err := checkVersion(cli)
	require.NoError(t, err)
	root := t.TempDir()
	plugin, err := extractMod(root)
	require.NoError(t, err)
	var mu sync.Mutex
	var wires []passthroughWire
	var answer func(w http.ResponseWriter, body Object, round int)
	fake := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		if mode == "native" {
			assert.NotNil(t, r.TLS)
		}
		raw, err := io.ReadAll(r.Body)
		if !assert.NoError(t, err) {
			return
		}
		body, err := decodeObject(raw)
		if !assert.NoError(t, err) {
			return
		}
		mu.Lock()
		wires = append(wires, passthroughWire{header: r.Header.Clone(), body: body, raw: raw})
		round := len(wires)
		handle := answer
		mu.Unlock()
		if assert.NotNil(t, handle, "model request before fixture setup") {
			handle(w, body, round)
		}
	}))
	if mode == "native" {
		fake.StartTLS()
	} else {
		fake.Start()
	}
	defer fake.Close()
	env := nativeProbeEnv(root, fake.URL)
	if mode == "native" {
		ca := filepath.Join(root, "mock-ca.pem")
		require.NoError(t, os.WriteFile(ca, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: fake.Certificate().Raw}), 0600))
		env = envWith(env, map[string]string{"NODE_EXTRA_CA_CERTS": ca})
	}
	// The engine refuses a hooks module its validator rejects, silently: the
	// run then fails with "Mod did not acknowledge loading".
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	validate := exec.CommandContext(ctx, cli, "plugin", "validate", plugin)
	validate.Dir, validate.Env = root, env
	out, err := validate.CombinedOutput()
	require.NoError(t, err, "Mod validation: %s", out)
	runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}
	cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
	require.NoError(t, err)
	g := &Gateway{Runner: runner, Cache: cache, Timeout: 60 * time.Second, Slots: make(chan struct{}, 2)}
	lookup := Object{"name": "lookup", "description": "Look up a fixture record.", "input_schema": Object{"type": "object", "properties": Object{"key": Object{"type": "string"}}, "required": []any{"key"}}}
	post := func(t *testing.T, body Object, session, agent string, betas ...string) *httptest.ResponseRecorder {
		t.Helper()
		raw, err := json.Marshal(body)
		require.NoError(t, err)
		req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
		req.Header.Set(policyHeader, fmt.Sprintf(`{"relay_mode":%q}`, mode))
		if len(betas) > 0 {
			req.Header.Set("anthropic-beta", strings.Join(betas, ","))
		}
		if session != "" {
			setTestSession(t, req, session)
		}
		if agent != "" {
			req.Header.Set("X-Claude-Code-Agent-Id", agent)
		}
		res := httptest.NewRecorder()
		require.NotPanics(t, func() { g.ServeHTTP(res, req) }, "mode=%s", mode)
		t.Logf("mode=%s HTTP=%d history=%s response=%s", mode, res.Code, res.Header().Get("X-CCGateway-History"), res.Body.String())
		return res
	}
	start := func(handle func(w http.ResponseWriter, body Object, round int)) int {
		mu.Lock()
		defer mu.Unlock()
		answer = handle
		return len(wires)
	}
	since := func(n int) []passthroughWire {
		mu.Lock()
		defer mu.Unlock()
		return append([]passthroughWire(nil), wires[n:]...)
	}
	text := func(w http.ResponseWriter, body Object, _ int) {
		writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "PASSTHROUGH_OK"}})
	}
	sessionOf := func(t *testing.T, wire passthroughWire) string {
		t.Helper()
		metadata, _ := wire.body["metadata"].(map[string]any)
		var user Object
		require.NoError(t, json.Unmarshal([]byte(str(metadata, "user_id")), &user))
		return str(user, "session_id")
	}

	t.Run("fields", func(t *testing.T) {
		n := start(func(w http.ResponseWriter, body Object, _ int) {
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "tool_use", "id": "toolu_passthrough", "name": "mcp__ccgateway__lookup", "input": Object{"key": "k"}}})
		})
		format := Object{"type": "json_schema", "schema": Object{"type": "object", "properties": Object{"answer": Object{"type": "string"}}, "required": []any{"answer"}, "additionalProperties": false}}
		body := Object{"model": "claude-sonnet-4-6", "max_tokens": 3000, "temperature": 0.25, "top_k": 7, "stop_sequences": []any{"STOP_A"}, "service_tier": "auto",
			"thinking": Object{"type": "enabled", "budget_tokens": 1024, "display": "summarized"}, "output_config": Object{"format": format},
			"tools": []any{lookup}, "tool_choice": Object{"type": "tool", "name": "lookup"},
			"messages": []any{Object{"role": "user", "content": "FIELDS"}}}
		res := post(t, body, "passthrough-fields", "", "fixture-beta-2026-01-01")
		require.Equal(t, 200, res.Code, res.Body.String())
		assert.Contains(t, res.Body.String(), `"name":"lookup"`)
		assert.NotContains(t, res.Body.String(), "mcp__")
		got := since(n)
		require.Equal(t, 1, len(got))
		wire := got[0]
		want := Object{"max_tokens": 3000, "temperature": 0.25, "top_k": 7, "stop_sequences": []any{"STOP_A"}, "service_tier": "auto", "thinking": body["thinking"], "tool_choice": Object{"type": "tool", "name": "mcp__ccgateway__lookup"}}
		for name, value := range want {
			assert.Equal(t, normalizeJSON(t, value), normalizeJSON(t, wire.body[name]), name)
		}
		output, _ := wire.body["output_config"].(map[string]any)
		assert.Equal(t, normalizeJSON(t, format), normalizeJSON(t, output["format"]))
		assert.Equal(t, "high", output["effort"])
		assert.Contains(t, wire.header.Get("anthropic-beta"), "fixture-beta-2026-01-01")
		assert.NotContains(t, wire.header, "X-Forwarded-For")
		branch, err := newSessionBranch(&Request{Plan: &RequestPlan{metadata: json.RawMessage(`{"user_id":"passthrough-fields"}`)}}, http.Header{})
		require.NoError(t, err)
		assert.Equal(t, branch.Upstream, wire.header.Get("X-Claude-Code-Session-Id"))
		assert.Equal(t, branch.Upstream, sessionOf(t, wire))
		assert.Empty(t, wire.header.Get("X-Claude-Code-Agent-Id"))
	})

	t.Run("tool_choice first round only", func(t *testing.T) {
		n := start(func(w http.ResponseWriter, body Object, round int) {
			history, _ := json.Marshal(body["messages"])
			if !bytes.Contains(history, []byte("toolu_search_round")) {
				writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "tool_use", "id": "toolu_search_round", "name": "ToolSearch", "input": Object{"query": "select:mcp__fixture__find"}}})
				return
			}
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "PASSTHROUGH_OK"}})
		})
		deferred := Object{"name": "mcp__fixture__find", "description": "Find a fixture.", "input_schema": Object{"type": "object", "properties": Object{"q": Object{"type": "string"}}}, "defer_loading": true}
		body := Object{"model": "claude-sonnet-4-6", "max_tokens": 1024, "temperature": 0.5, "tools": []any{lookup, deferred}, "tool_choice": Object{"type": "any"},
			"messages": []any{Object{"role": "user", "content": "ROUNDS"}}}
		res := post(t, body, "passthrough-rounds", "")
		require.Equal(t, 200, res.Code, res.Body.String())
		assert.Contains(t, res.Body.String(), "PASSTHROUGH_OK")
		assert.NotContains(t, res.Body.String(), "ToolSearch")
		got := since(n)
		require.Equal(t, 2, len(got))
		choice, _ := got[0].body["tool_choice"].(map[string]any)
		assert.Equal(t, "any", str(choice, "type"))
		assert.NotContains(t, got[1].body, "tool_choice")
		for i, wire := range got {
			assert.Equal(t, "0.5", fmt.Sprint(wire.body["temperature"]), "round %d", i)
		}
	})

	t.Run("safeguards and verdict", func(t *testing.T) {
		safeguards := []any{Object{"type": "dangerous_tool_use", "classifier_context": Object{"v": 1, "permission_mode": "auto", "fixture_only": true}}}
		n := start(func(w http.ResponseWriter, body Object, _ int) {
			recorder := httptest.NewRecorder()
			writeSurfaceFixture(recorder, str(body, "model"), []Object{{"type": "tool_use", "id": "toolu_guarded", "name": "Read", "input": Object{"file_path": "D:/fixture.txt"}}})
			w.Header().Set("Content-Type", "text/event-stream")
			w.Header().Set("Anthropic-Ratelimit-Unified-5h-Utilization", "0.42")
			w.Header().Set("Request-Id", "req_guarded")
			for line := range strings.SplitSeq(recorder.Body.String(), "\n") {
				if strings.HasPrefix(line, "data: ") {
					event, _ := decodeObject([]byte(strings.TrimPrefix(line, "data: ")))
					if str(event, "type") == "message_delta" {
						event["safeguard_results"] = []any{Object{"tool_use_id": "toolu_guarded", "decision": "allow", "synthetic_fixture": true}}
					}
					data, _ := json.Marshal(event)
					line = "data: " + string(data)
				}
				fmt.Fprintln(w, line)
			}
		})
		read := verifiedNativeToolCatalogues[version]["Read"][0]
		body := Object{"model": "claude-sonnet-4-6", "max_tokens": 512, "safeguards": safeguards, "tools": []any{Object{"name": "Read", "description": read.Description, "input_schema": read.Schema}},
			"messages": []any{Object{"role": "user", "content": "GUARDED"}}}
		for _, stream := range []bool{true, false} {
			body["stream"] = stream
			res := post(t, body, "", "", "dangerous-tool-use-2026-09-03")
			assert.Equal(t, 200, res.Code, "stream=%t: %s", stream, res.Body.String())
			assert.Contains(t, res.Body.String(), "synthetic_fixture", "stream=%t", stream)
			assert.Contains(t, res.Body.String(), `"name":"Read"`, "stream=%t", stream)
			if mode == "native" && stream {
				assert.NotEmpty(t, res.Result().Header.Get("Request-Id"))
				assert.NotEqual(t, "req_guarded", res.Result().Header.Get("Request-Id"))
			} else {
				assert.Equal(t, "req_guarded", res.Header().Get("Request-Id"), "stream=%t", stream)
			}
			assert.Empty(t, res.Header().Get("Anthropic-Ratelimit-Unified-5h-Utilization"))
		}
		for _, wire := range since(n) {
			assert.Equal(t, normalizeJSON(t, safeguards), normalizeJSON(t, wire.body["safeguards"]))
			assert.Contains(t, wire.header.Get("anthropic-beta"), "dangerous-tool-use-2026-09-03")
		}
	})

	t.Run("max_tokens 0", func(t *testing.T) {
		n := start(func(w http.ResponseWriter, body Object, _ int) {
			writeSurfaceFixture(w, str(body, "model"), nil)
		})
		// The API takes max_tokens 0 only without streaming; Claude Code
		// always streams, so the request is refused before any run.
		res := post(t, Object{"model": "claude-sonnet-4-6", "max_tokens": 0, "messages": []any{Object{"role": "user", "content": "WARM"}}}, "", "")
		assert.Equal(t, 400, res.Code)
		assert.Contains(t, res.Body.String(), "max_tokens: 0")
		require.Empty(t, since(n))
		// Streamed, it reaches the API, which answers as it does.
		res = post(t, Object{"model": "claude-sonnet-4-6", "max_tokens": 0, "stream": true, "messages": []any{Object{"role": "user", "content": "WARM"}}}, "", "")
		got := since(n)
		require.Equal(t, 1, len(got), res.Body.String())
		assert.Equal(t, "0", fmt.Sprint(got[0].body["max_tokens"]))
	})

	upstreamErrorCase := "upstream error as sent without retry"
	rejectedRequestCase := "rejected request as sent"
	if mode == "native" {
		upstreamErrorCase = "normalized native upstream error"
		rejectedRequestCase = "normalized native rejection with compatibility recovery"
	}
	t.Run(upstreamErrorCase, func(t *testing.T) {
		const overloaded = `{"type":"error","error":{"type":"overloaded_error","message":"Overloaded fixture"},"request_id":"req_fixture_529"}`
		n := start(func(w http.ResponseWriter, _ Object, _ int) {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Anthropic-Ratelimit-Unified-5h-Status", "rejected")
			w.Header().Set("Request-Id", "req_fixture_529")
			w.WriteHeader(529)
			fmt.Fprint(w, overloaded)
		})
		res := post(t, Object{"model": "claude-sonnet-4-6", "max_tokens": 256, "messages": []any{Object{"role": "user", "content": "ERROR"}}}, "passthrough-error", "")
		assert.Equal(t, 529, res.Code)
		if mode == "native" {
			assert.JSONEq(t, `{"type":"error","error":{"type":"overloaded_error","message":"Claude Code native error: server_error"}}`, res.Body.String())
			assert.Equal(t, "cli", res.Header().Get("X-CCGateway-Error-Source"))
		} else {
			assert.Equal(t, overloaded, res.Body.String())
		}
		assert.Equal(t, "req_fixture_529", res.Header().Get("Request-Id"))
		assert.Empty(t, res.Header().Get("Anthropic-Ratelimit-Unified-5h-Status"))
		assert.Equal(t, 1, len(since(n)))
	})

	t.Run(rejectedRequestCase, func(t *testing.T) {
		const invalid = `{"type":"error","error":{"type":"invalid_request_error","message":"temperature: fixture rejection"}}`
		n := start(func(w http.ResponseWriter, _ Object, _ int) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(400)
			fmt.Fprint(w, invalid)
		})
		res := post(t, Object{"model": "claude-sonnet-4-6", "max_tokens": 256, "temperature": 0.1, "messages": []any{Object{"role": "user", "content": "INVALID"}}}, "passthrough-invalid", "")
		assert.Equal(t, 400, res.Code)
		expectedRequests := 1
		if mode == "native" {
			expectedRequests = 2
			assert.JSONEq(t, `{"type":"error","error":{"type":"invalid_request_error","message":"Claude Code native error: unknown"}}`, res.Body.String())
			assert.Equal(t, "cli", res.Header().Get("X-CCGateway-Error-Source"))
		} else {
			assert.Equal(t, invalid, res.Body.String())
		}
		assert.Equal(t, expectedRequests, len(since(n)))
	})

	t.Run("fallbacks", func(t *testing.T) {
		for _, scenario := range []struct {
			name    string
			attempt Object
		}{
			{"model and tokens", Object{"model": "claude-haiku-4-5", "max_tokens": 300}},
			{"thinking and effort", Object{"model": "claude-opus-4-6", "max_tokens": 2048, "thinking": Object{"type": "enabled", "budget_tokens": 1024}, "output_config": Object{"effort": "low"}}},
		} {
			t.Run(scenario.name, func(t *testing.T) {
				n := start(func(w http.ResponseWriter, body Object, _ int) {
					if str(body, "model") == "claude-sonnet-4-6" {
						w.Header().Set("Content-Type", "application/json")
						w.WriteHeader(529)
						fmt.Fprint(w, `{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}`)
						return
					}
					writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "PASSTHROUGH_OK"}})
				})
				body := Object{"model": "claude-sonnet-4-6", "max_tokens": 512, "temperature": 0.2, "fallbacks": []any{scenario.attempt},
					"messages": []any{Object{"role": "user", "content": "FALLBACK"}}}
				res := post(t, body, "passthrough-fallback-"+scenario.name, "", "server-side-fallback-2026-06-01")
				require.Equal(t, 200, res.Code, res.Body.String())
				assert.Contains(t, res.Body.String(), "PASSTHROUGH_OK")
				assert.Contains(t, res.Body.String(), str(scenario.attempt, "model"))
				got := since(n)
				require.Equal(t, 2, len(got))
				assert.Equal(t, "claude-sonnet-4-6", str(got[0].body, "model"))
				assert.Equal(t, "512", fmt.Sprint(got[0].body["max_tokens"]))
				for field, value := range scenario.attempt {
					assert.Equal(t, normalizeJSON(t, value), normalizeJSON(t, got[1].body[field]), "fallback field %s", field)
				}
				assert.Equal(t, "0.2", fmt.Sprint(got[1].body["temperature"]))
				assert.NotContains(t, got[0].body, "fallbacks")
				assert.NotContains(t, got[1].body, "fallbacks")
			})
		}
	})

	t.Run("subagent identity and resume", func(t *testing.T) {
		n := start(func(w http.ResponseWriter, body Object, _ int) {
			history, _ := json.Marshal(body["messages"])
			if bytes.Contains(history, []byte("SUB_RESULT")) {
				writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "PASSTHROUGH_OK"}})
				return
			}
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "tool_use", "id": "toolu_sub", "name": "mcp__ccgateway__lookup", "input": Object{"key": "k"}}})
		})
		body := Object{"model": "claude-sonnet-4-6", "max_tokens": 512, "tools": []any{lookup}, "messages": []any{Object{"role": "user", "content": "SUBAGENT"}}}
		res := post(t, body, "passthrough-sub", "a0123456789abcdef")
		require.Equal(t, 200, res.Code, res.Body.String())
		assert.Contains(t, res.Body.String(), "toolu_sub")
		body["messages"] = append(body["messages"].([]any),
			Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_sub", "name": "lookup", "input": Object{"key": "k"}}}},
			Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_sub", "content": "SUB_RESULT"}}})
		res = post(t, body, "passthrough-sub", "a0123456789abcdef")
		require.Equal(t, 200, res.Code, res.Body.String())
		assert.Contains(t, res.Body.String(), "PASSTHROUGH_OK")
		// The branch file under its own ID resumes under U.
		assert.Equal(t, "prefix-hit", res.Header().Get("X-CCGateway-History"))
		branch, err := newSessionBranch(&Request{Plan: &RequestPlan{metadata: json.RawMessage(`{"user_id":"passthrough-sub"}`)}}, http.Header{"X-Claude-Code-Agent-Id": []string{"a0123456789abcdef"}})
		require.NoError(t, err)
		got := since(n)
		require.Equal(t, 2, len(got))
		for i, wire := range got {
			assert.Equal(t, []string{branch.UpstreamAgent}, wire.header.Values("X-Claude-Code-Agent-Id"), "round %d", i)
			assert.Equal(t, branch.Upstream, wire.header.Get("X-Claude-Code-Session-Id"), "round %d", i)
			assert.Equal(t, branch.Upstream, sessionOf(t, wire), "round %d", i)
			assert.NotContains(t, string(wire.raw), "a0123456789abcdef")
			assert.NotContains(t, string(wire.raw), "passthrough-sub")
		}
	})

	t.Run("pending image unchanged", func(t *testing.T) {
		// A 1x1 PNG.
		const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
		image := Object{"type": "image", "source": Object{"type": "base64", "media_type": "image/png", "data": png}}
		for _, c := range []struct {
			name, session string
			messages      []any
		}{
			{"first turn", "", []any{Object{"role": "user", "content": []any{image, Object{"type": "text", "text": "IMAGE_FIRST"}}}}},
			{"history", "passthrough-image", []any{Object{"role": "user", "content": "hello"}, Object{"role": "assistant", "content": "hi"}, Object{"role": "user", "content": []any{Object{"type": "text", "text": "look"}, image, Object{"type": "text", "text": "IMAGE_LATER"}}}}},
		} {
			n := start(text)
			res := post(t, Object{"model": "claude-sonnet-4-6", "max_tokens": 128, "messages": c.messages}, c.session, "")
			require.Equal(t, 200, res.Code, "%s: %s", c.name, res.Body.String())
			got := since(n)
			require.Equal(t, 1, len(got), c.name)
			assert.NotContains(t, string(got[0].raw), "[Image: source:", c.name)
			assert.Contains(t, string(got[0].raw), png, c.name)
			messages := got[0].body["messages"].([]any)
			last := messages[len(messages)-1].(map[string]any)
			content, _ := last["content"].([]any)
			var kinds []string
			for _, block := range content {
				if kind := str(block.(map[string]any), "type"); kind != "text" || !strings.HasPrefix(str(block.(map[string]any), "text"), "<system-reminder>") {
					kinds = append(kinds, kind)
				}
			}
			want := "image,text"
			if c.name == "history" {
				want = "text,image,text"
			}
			assert.Equal(t, want, strings.Join(kinds, ","), c.name)
			if c.session != "" {
				messages := append(c.messages,
					Object{"role": "assistant", "content": "PASSTHROUGH_OK"},
					Object{"role": "user", "content": "IMAGE_FOLLOWUP"})
				res = post(t, Object{"model": "claude-sonnet-4-6", "max_tokens": 128, "messages": messages}, c.session, "")
				require.Equal(t, 200, res.Code, res.Body.String())
				assert.Equal(t, "prefix-hit", res.Header().Get("X-CCGateway-History"))
				continued := since(n)
				require.Equal(t, 2, len(continued))
				assert.Contains(t, string(continued[1].raw), png, "cached image must survive continuation")
				assert.NotContains(t, string(continued[1].raw), "[Image: source:")
			}
		}
	})

	// The pending turn reaches upstream as the client sent it, without Claude
	// Code's own attachments, so the next request (which carries that turn as
	// history) repeats the earlier request's messages and reads its cache.
	t.Run("history repeats the earlier request", func(t *testing.T) {
		n := start(func(w http.ResponseWriter, body Object, _ int) {
			history, _ := json.Marshal(body["messages"])
			if bytes.Contains(history, []byte("STABLE_RESULT")) {
				writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "PASSTHROUGH_OK"}})
				return
			}
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "tool_use", "id": "toolu_stable", "name": "mcp__ccgateway__lookup", "input": Object{"key": "k"}}})
		})
		body := Object{"model": "claude-sonnet-4-6", "max_tokens": 512, "tools": []any{lookup}, "messages": []any{
			Object{"role": "user", "content": "STABLE"},
			Object{"role": "system", "content": "<total_tokens>900 tokens left</total_tokens>\n\nCLIENT_CONTEXT_ONE"}}}
		res := post(t, body, "passthrough-stable", "")
		require.Equal(t, 200, res.Code, res.Body.String())
		assert.Contains(t, res.Body.String(), "toolu_stable")
		body["messages"] = append(body["messages"].([]any),
			Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_stable", "name": "lookup", "input": Object{"key": "k"}}}},
			Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_stable", "content": "STABLE_RESULT"}}},
			Object{"role": "system", "content": "CLIENT_CONTEXT_TWO"})
		res = post(t, body, "passthrough-stable", "")
		require.Equal(t, 200, res.Code, res.Body.String())
		assert.Contains(t, res.Body.String(), "PASSTHROUGH_OK")
		got := since(n)
		require.Equal(t, 2, len(got))
		// Breakpoints are Claude Code's to move; the content must not change.
		plain := func(messages any) []string {
			var out []string
			for _, message := range messages.([]any) {
				m := message.(map[string]any)
				content, ok := m["content"].([]any)
				if !ok {
					content = []any{Object{"type": "text", "text": m["content"]}}
				}
				for _, block := range content {
					b := block.(map[string]any)
					delete(b, "cache_control")
					raw, _ := json.Marshal(b)
					out = append(out, str(m, "role")+" "+string(raw))
				}
			}
			return out
		}
		first, second := plain(got[0].body["messages"]), plain(got[1].body["messages"])
		require.GreaterOrEqual(t, len(second), len(first))
		assert.Equal(t, first, second[:len(first)], "the second request must repeat the first")
		require.NotEmpty(t, first)
		assert.Contains(t, first[len(first)-1], "CLIENT_CONTEXT_ONE")
	})

	t.Run("refused", func(t *testing.T) {
		n := start(text)
		for name, body := range map[string]Object{
			"prefill":     {"model": "claude-sonnet-4-6", "max_tokens": 64, "messages": []any{Object{"role": "user", "content": "x"}, Object{"role": "assistant", "content": "partial"}}},
			"web_fetch":   {"model": "claude-sonnet-4-6", "max_tokens": 64, "tools": []any{Object{"type": "web_fetch_20250910", "name": "web_fetch"}}, "messages": []any{Object{"role": "user", "content": "x"}}},
			"mcp_servers": {"model": "claude-sonnet-4-6", "max_tokens": 64, "mcp_servers": []any{Object{"type": "url", "url": "https://mcp.example.invalid/sse", "name": "fixture"}}, "messages": []any{Object{"role": "user", "content": "x"}}},
		} {
			res := post(t, body, "", "")
			assert.Equal(t, 400, res.Code, name)
			assert.Contains(t, res.Body.String(), "not supported", name)
		}
		raw, err := json.Marshal(Object{"model": "claude-sonnet-4-6", "messages": []any{Object{"role": "user", "content": "x"}}})
		require.NoError(t, err)
		req := httptest.NewRequest("POST", "/v1/messages/count_tokens", bytes.NewReader(raw))
		req.Header.Set(policyHeader, fmt.Sprintf(`{"relay_mode":%q}`, mode))
		res := httptest.NewRecorder()
		g.ServeHTTP(res, req)
		assert.Equal(t, 400, res.Code)
		assert.Contains(t, res.Body.String(), `"message":"count_tokens is not supported by this gateway"`)
		assert.Empty(t, since(n), "refused requests must not reach upstream")
	})
}

// normalizeJSON gives numbers one representation for comparison.
func normalizeJSON(t *testing.T, v any) any {
	t.Helper()
	raw, err := json.Marshal(v)
	require.NoError(t, err)
	var out any
	require.NoError(t, json.Unmarshal(raw, &out))
	return out
}
