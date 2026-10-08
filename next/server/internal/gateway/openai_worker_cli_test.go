package gateway

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
	"github.com/tidwall/gjson"
)

// This test deliberately uses an independent process: server must not import
// Worker engine or make its Docker build context depend on runtime source.
func protocolWorker(t *testing.T, upstream string) (string, string) {
	t.Helper()
	binary, cli := os.Getenv("CCG_TEST_WORKER_BINARY"), os.Getenv("CCG_REAL_CLI")
	if binary == "" || cli == "" {
		t.Skip("set CCG_TEST_WORKER_BINARY and CCG_REAL_CLI for isolated full-chain verification")
	}
	for _, p := range []string{binary, cli} {
		if !filepath.IsAbs(p) {
			t.Fatal("test executables must be absolute")
		}
		if _, err := os.Stat(p); err != nil {
			t.Fatal(err)
		}
	}
	dir := t.TempDir()
	config := filepath.Join(dir, "config")
	if err := os.MkdirAll(config, 0700); err != nil {
		t.Fatal(err)
	}
	nonce := make([]byte, 24)
	if _, err := rand.Read(nonce); err != nil {
		t.Fatal(err)
	}
	key := "synthetic-" + hex.EncodeToString(nonce)
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	address := listener.Addr().String()
	listener.Close()
	env := []string{}
	for _, k := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "PATHEXT", "TEMP", "TMP"} {
		if v := os.Getenv(k); v != "" {
			env = append(env, k+"="+v)
		}
	}
	env = append(env, "HOME="+dir, "USERPROFILE="+dir, "APPDATA="+dir, "LOCALAPPDATA="+dir, "CLAUDE_CONFIG_DIR="+config, "CLAUDE_SECURESTORAGE_CONFIG_DIR="+config,
		"CCG_BIND="+address, "CCG_DATA_DIR="+filepath.Join(dir, "data"), "CCG_API_KEY="+key, "CCG_ADMIN_KEY="+key+"-admin", "WORKER_CLI_PATH="+cli,
		"ANTHROPIC_BASE_URL="+upstream, "ANTHROPIC_API_KEY=synthetic-loopback-upstream", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1", "DISABLE_AUTOUPDATER=1", "DISABLE_TELEMETRY=1", "DISABLE_ERROR_REPORTING=1", "REQUEST_TIMEOUT=40s", "CLI_TIMEOUT=40s")
	cmd := exec.Command(binary)
	cmd.Dir = dir
	cmd.Env = env
	var output bytes.Buffer
	cmd.Stdout = &output
	cmd.Stderr = &output
	if err = cmd.Start(); err != nil {
		t.Fatal(err)
	}
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()
	stopped := false
	t.Cleanup(func() {
		if stopped {
			return
		}
		if runtime.GOOS == "windows" {
			_ = exec.Command("taskkill", "/PID", strconv.Itoa(cmd.Process.Pid), "/T", "/F").Run()
		} else {
			_ = cmd.Process.Signal(os.Interrupt)
		}
		select {
		case <-done:
		case <-time.After(5 * time.Second):
			_ = cmd.Process.Kill()
			<-done
		}
		stopped = true
		if t.Failed() {
			t.Logf("isolated worker diagnostic: %s", output.String())
		}
	})
	client := &http.Client{Timeout: time.Second}
	endpoint := "http://" + address
	deadline := time.Now().Add(20 * time.Second)
	for time.Now().Before(deadline) {
		select {
		case err := <-done:
			stopped = true
			t.Fatalf("worker exited: %v %s", err, output.String())
		default:
		}
		response, err := client.Get(endpoint + "/health")
		if err == nil {
			_, _ = io.Copy(io.Discard, response.Body)
			response.Body.Close()
			if response.StatusCode == 200 {
				return endpoint, key
			}
		}
		time.Sleep(40 * time.Millisecond)
	}
	t.Fatal("worker health deadline")
	return "", ""
}

func workerChainEnv(t *testing.T, url, key string) *env {
	e := newEnv(t, func(e *env) { e.conv = convert.Default(); e.plat.base = url })
	for _, id := range []int64{1, 2, 3} {
		e.accounts.set(id, func(a *core.Account) {
			a.ModelMapping = map[string]string{testModel: "claude-opus-5-5"}
			a.Credentials = json.RawMessage(fmt.Sprintf(`{"api_key":%q}`, key))
		})
	}
	settings := defaultGatewaySettings()
	settings.MaxAttempts = 1
	e.setSettings(settings, StickySettings{Enabled: false, DefaultTTLSeconds: 3600})
	return e
}

var protocolFixtureSequence atomic.Uint64

func workerChainFixture(w http.ResponseWriter, model, reason string, blocks []map[string]any, initialInput ...bool) {
	w.Header().Set("Content-Type", "text/event-stream")
	emit := func(kind string, b map[string]any) {
		b["type"] = kind
		raw, _ := json.Marshal(b)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", kind, raw)
		w.(http.Flusher).Flush()
	}
	emit("message_start", map[string]any{"message": map[string]any{"id": fmt.Sprintf("msg-worker-chain-%d", protocolFixtureSequence.Add(1)), "type": "message", "role": "assistant", "model": model, "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": map[string]any{"input_tokens": 10, "output_tokens": 0, "cache_read_input_tokens": 20, "cache_creation_input_tokens": 30}}})
	for i, b := range blocks {
		start := b
		if b["type"] == "text" {
			start = map[string]any{"type": "text", "text": ""}
		}
		if b["type"] == "tool_use" && !(len(initialInput) > 0 && initialInput[0]) {
			start = map[string]any{"type": b["type"], "id": b["id"], "name": b["name"], "input": map[string]any{}}
		}
		emit("content_block_start", map[string]any{"index": i, "content_block": start})
		if b["type"] == "text" {
			emit("content_block_delta", map[string]any{"index": i, "delta": map[string]any{"type": "text_delta", "text": b["text"]}})
		}
		if b["type"] == "tool_use" && !(len(initialInput) > 0 && initialInput[0]) {
			args, _ := json.Marshal(b["input"])
			emit("content_block_delta", map[string]any{"index": i, "delta": map[string]any{"type": "input_json_delta", "partial_json": string(args)}})
		}
		emit("content_block_stop", map[string]any{"index": i})
	}
	emit("message_delta", map[string]any{"delta": map[string]any{"stop_reason": reason, "stop_sequence": nil}, "usage": map[string]any{"output_tokens": 4}})
	emit("message_stop", map[string]any{})
}

func TestOpenAIWorkerRealCLIProtocolChain(t *testing.T) {
	if os.Getenv("CCG_TEST_WORKER_BINARY") == "" || os.Getenv("CCG_REAL_CLI") == "" {
		t.Skip("isolated Worker and CLI executables required")
	}
	for _, protocol := range []string{"openai.chat", "openai.responses"} {
		t.Run(protocol, func(t *testing.T) {
			var mu sync.Mutex
			var requests [][]byte
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":10}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				mu.Lock()
				requests = append(requests, append([]byte(nil), raw...))
				mu.Unlock()
				body := gjson.ParseBytes(raw)
				if body.Get("model").String() != "claude-opus-5-5" {
					t.Error("mapped model lost")
				}
				if body.Get("max_tokens").Int() != 37 {
					t.Error("explicit token limit changed")
				}
				if !strings.Contains(body.Get("system").Raw, "keep this system") {
					t.Error("client system lost")
				}
				reason, text := "end_turn", "CHAIN_OK"
				history := body.Get("messages").Raw
				if strings.Contains(history, "LONG_PENDING") {
					for i := 0; i < 30; i++ {
						for _, prefix := range []string{"LONG_USER_", "LONG_ASSISTANT_"} {
							if strings.Count(history, fmt.Sprintf("%s%02d", prefix, i)) != 1 {
								t.Error("long history duplicated or lost a client turn")
							}
						}
					}
				}
				if strings.Contains(history, "CLIENT_TOOL_RESULT") && (!strings.Contains(history, "42")) {
					t.Error("tool history integer changed during CLI resume or import")
				}
				if strings.Contains(history, "REFUSAL_PROBE") {
					reason, text = "refusal", "REFUSAL_OK"
				}
				if body.Get("output_config.format").Exists() {
					text = `{"ok":true}`
				}
				if strings.Contains(history, "CALL_CLIENT_TOOL") && !strings.Contains(history, "CLIENT_TOOL_RESULT") {
					workerChainFixture(w, body.Get("model").String(), "tool_use", []map[string]any{{"type": "tool_use", "id": "call-chain", "name": "mcp__ccgateway__lookup", "input": map[string]any{"value": json.Number("42")}}})
					return
				}
				workerChainFixture(w, body.Get("model").String(), reason, []map[string]any{{"type": "text", "text": text}})
			}))
			t.Cleanup(upstream.Close)
			workerURL, key := protocolWorker(t, upstream.URL)
			e := workerChainEnv(t, workerURL, key)
			path, input := openAIConversionInput(protocol, false)
			input["temperature"] = 0.25
			input["top_p"] = 0.8
			post := func(target *env, body map[string]any) result {
				t.Helper()
				res := target.do(path, body, map[string]string{"authorization": "Bearer " + testKey})
				if res.status != 200 {
					t.Fatalf("HTTP%d %s", res.status, res.body)
				}
				rec := target.record()
				if !rec.Success || rec.UpstreamProtocol != "anthropic.messages" || rec.Tokens != (core.UsageTokens{Input: 10, Output: 4, CacheRead: 20, CacheCreation: 30}) {
					t.Fatalf("upstream accounting changed: %+v", rec)
				}
				return res
			}
			first := post(e, input)
			if !bytes.Contains(first.body, []byte("CHAIN_OK")) {
				t.Fatal(string(first.body))
			}
			mu.Lock()
			firstWire := gjson.ParseBytes(requests[0])
			mu.Unlock()
			if firstWire.Get("temperature").Float() != 0.25 || firstWire.Get("top_p").Float() != 0.8 {
				t.Fatal("sampling changed")
			}
			input["stream"] = true
			if protocol == "openai.chat" {
				input["stream_options"] = map[string]any{"include_usage": true}
			}
			streamed := post(e, input)
			terminal := "data: [DONE]"
			if protocol == "openai.responses" {
				terminal = "event: response.completed"
			}
			if strings.Count(string(streamed.body), terminal) != 1 {
				t.Fatal("stream termination changed")
			}
			input["stream"] = false
			delete(input, "stream_options")
			tool := map[string]any{"name": "lookup", "parameters": map[string]any{"type": "object", "properties": map[string]any{"value": map[string]any{"type": "integer"}}}}
			if protocol == "openai.chat" {
				input["tools"] = []any{map[string]any{"type": "function", "function": tool}}
				input["messages"] = []any{map[string]any{"role": "system", "content": "keep this system"}, map[string]any{"role": "user", "content": "CALL_CLIENT_TOOL"}}
			} else {
				tool["type"] = "function"
				input["tools"] = []any{tool}
				input["input"] = []any{map[string]any{"role": "user", "content": "CALL_CLIENT_TOOL"}}
			}
			call := post(e, input)
			if !bytes.Contains(call.body, []byte("42")) {
				t.Fatal("tool input precision lost")
			}
			input["stream"] = true
			toolStream := post(e, input)
			if !bytes.Contains(toolStream.body, []byte("lookup")) || !bytes.Contains(toolStream.body, []byte("42")) {
				t.Fatal("SSE tool identity or arguments lost")
			}
			input["stream"] = false
			var returned map[string]any
			if err := json.Unmarshal(call.body, &returned); err != nil {
				t.Fatal(err)
			}
			if protocol == "openai.chat" {
				choice := returned["choices"].([]any)[0].(map[string]any)
				input["messages"] = append(input["messages"].([]any), choice["message"], map[string]any{"role": "tool", "tool_call_id": "call-chain", "content": "CLIENT_TOOL_RESULT"})
			} else {
				input["input"] = append(input["input"].([]any), returned["output"].([]any)...)
				input["input"] = append(input["input"].([]any), map[string]any{"type": "function_call_output", "call_id": "call-chain", "output": "CLIENT_TOOL_RESULT"})
			}
			post(e, input)
			coldURL, coldKey := protocolWorker(t, upstream.URL)
			cold := workerChainEnv(t, coldURL, coldKey)
			post(cold, input)
			delete(input, "tools")
			history := []any{}
			if protocol == "openai.chat" {
				history = append(history, map[string]any{"role": "system", "content": "keep this system"})
			}
			for i := 0; i < 30; i++ {
				history = append(history, map[string]any{"role": "user", "content": fmt.Sprintf("LONG_USER_%02d", i)}, map[string]any{"role": "assistant", "content": fmt.Sprintf("LONG_ASSISTANT_%02d", i)})
			}
			history = append(history, map[string]any{"role": "user", "content": "LONG_PENDING"})
			field := "messages"
			if protocol == "openai.responses" {
				field = "input"
			}
			input[field] = history
			post(e, input)
			post(cold, input)
			offset := 0
			if protocol == "openai.chat" {
				offset = 1
			}
			input[field] = append(append([]any(nil), history[:offset+20]...), map[string]any{"role": "user", "content": "ROLLBACK_PENDING"})
			post(e, input)
			mu.Lock()
			last := gjson.ParseBytes(requests[len(requests)-1])
			mu.Unlock()
			if strings.Contains(last.Get("messages").Raw, "LONG_USER_10") || !strings.Contains(last.Get("messages").Raw, "ROLLBACK_PENDING") {
				t.Fatal("rollback history leaked future")
			}
			input[field] = []any{map[string]any{"role": "user", "content": "REFUSAL_PROBE"}}
			if protocol == "openai.chat" {
				input[field] = append([]any{map[string]any{"role": "system", "content": "keep this system"}}, input[field].([]any)...)
			}
			for _, stream := range []bool{false, true} {
				input["stream"] = stream
				refused := post(e, input)
				if !bytes.Contains(refused.body, []byte("refusal")) || !bytes.Contains(refused.body, []byte("REFUSAL_OK")) {
					t.Fatal("normal refusal lost")
				}
			}
			input["stream"] = false
			input[field] = []any{map[string]any{"role": "user", "content": "STRUCTURED_PROBE"}}
			if protocol == "openai.chat" {
				input[field] = append([]any{map[string]any{"role": "system", "content": "keep this system"}}, input[field].([]any)...)
			}
			format := map[string]any{"name": "result", "strict": true, "schema": map[string]any{"type": "object", "properties": map[string]any{"ok": map[string]any{"type": "boolean"}}, "required": []any{"ok"}, "additionalProperties": false}}
			if protocol == "openai.chat" {
				input["response_format"] = map[string]any{"type": "json_schema", "json_schema": format}
			} else {
				format["type"] = "json_schema"
				input["text"] = map[string]any{"format": format}
			}
			post(e, input)
			input["stream"] = true
			structuredStream := post(e, input)
			if !bytes.Contains(structuredStream.body, []byte("ok")) {
				t.Fatal("structured SSE lost")
			}
			input["stream"] = false
			mu.Lock()
			before := len(requests)
			mu.Unlock()
			input["unknown_feature"] = true
			rejected := e.do(path, input, map[string]string{"authorization": "Bearer " + testKey})
			if rejected.status != 400 || rejected.json().Get("error.code").String() != "unsupported_conversion" {
				t.Fatal("unknown field not rejected")
			}
			_ = e.record()
			mu.Lock()
			after := len(requests)
			mu.Unlock()
			if before != after {
				t.Fatal("rejected input reached upstream")
			}
			t.Logf("protocol=%s real Worker+CLI fake-upstream=%d calls; cold worker import, 30 turns, rollback, tools, JSON/SSE, refusal, structured, accounting verified", protocol, after)
		})
	}
}

// Deliberately beyond JavaScript's exact integer range. Keep this regression
// separate from the ordinary matrix; never lower its value to make CLI pass.
func TestOpenAIWorkerRealCLIExactToolNumbers(t *testing.T) {
	if os.Getenv("CCG_TEST_WORKER_BINARY") == "" || os.Getenv("CCG_REAL_CLI") == "" {
		t.Skip("isolated executables required")
	}
	for _, protocol := range []string{"openai.chat", "openai.responses"} {
		for _, initial := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/initial_input=%v", protocol, initial), func(t *testing.T) {
				var mu sync.Mutex
				var histories []string
				up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if !strings.HasSuffix(r.URL.Path, "/messages") {
						fmt.Fprint(w, `{"input_tokens":1}`)
						return
					}
					raw, _ := io.ReadAll(r.Body)
					body := gjson.ParseBytes(raw)
					if body.Get("tools.0.input_schema.properties.value.minimum").Raw != "9007199254740993" {
						t.Error("tool schema minimum changed in real CLI wire")
					}
					history := body.Get("messages").Raw
					if strings.Contains(history, "EXACT_RESULT") {
						mu.Lock()
						histories = append(histories, history)
						mu.Unlock()
						workerChainFixture(w, body.Get("model").String(), "end_turn", []map[string]any{{"type": "text", "text": "EXACT_DONE"}})
						return
					}
					workerChainFixture(w, body.Get("model").String(), "tool_use", []map[string]any{{"type": "tool_use", "id": "exact-call", "name": "mcp__ccgateway__lookup", "input": map[string]any{"value": json.Number("9007199254740993"), "negative": json.Number("-9007199254740993"), "decimal": json.Number("0.100000000000000000001")}}}, initial)
				}))
				t.Cleanup(up.Close)
				url, key := protocolWorker(t, up.URL)
				e := workerChainEnv(t, url, key)
				path, body := openAIConversionInput(protocol, false)
				function := map[string]any{"name": "lookup", "parameters": map[string]any{"type": "object", "properties": map[string]any{"value": map[string]any{"type": "integer", "minimum": json.Number("9007199254740993")}}}}
				if protocol == "openai.chat" {
					body["tools"] = []any{map[string]any{"type": "function", "function": function}}
				} else {
					function["type"] = "function"
					body["tools"] = []any{function}
				}
				post := func(target *env) result {
					t.Helper()
					r := target.do(path, body, map[string]string{"authorization": "Bearer " + testKey})
					_ = target.record()
					if r.status != 200 {
						t.Fatalf("HTTP%d %s", r.status, r.body)
					}
					return r
				}
				first := post(e)
				if !bytes.Contains(first.body, []byte("9007199254740993")) {
					t.Errorf("initial client tool number changed: exact=%v rounded=%v", bytes.Contains(first.body, []byte("9007199254740993")), bytes.Contains(first.body, []byte("9007199254740992")))
				}
				// Feed the original precise client history even if the first response
				// failed the precision assertion, to isolate import from output loss.
				body["stream"] = true
				streamed := post(e)
				if !bytes.Contains(streamed.body, []byte("9007199254740993")) {
					t.Error("SSE tool integer lost")
				}
				body["stream"] = false
				args := `{"value":9007199254740993,"negative":-9007199254740993,"decimal":0.100000000000000000001}`
				if protocol == "openai.chat" {
					body["messages"] = []any{map[string]any{"role": "system", "content": "keep this system"}, map[string]any{"role": "user", "content": "hello"}, map[string]any{"role": "assistant", "tool_calls": []any{map[string]any{"type": "function", "id": "exact-call", "function": map[string]any{"name": "lookup", "arguments": args}}}}, map[string]any{"role": "tool", "tool_call_id": "exact-call", "content": "EXACT_RESULT"}}
				} else {
					body["input"] = []any{map[string]any{"role": "user", "content": "hello"}, map[string]any{"type": "function_call", "call_id": "exact-call", "name": "lookup", "arguments": args}, map[string]any{"type": "function_call_output", "call_id": "exact-call", "output": "EXACT_RESULT"}}
				}
				post(e)
				coldURL, coldKey := protocolWorker(t, up.URL)
				post(workerChainEnv(t, coldURL, coldKey))
				field := "messages"
				if protocol == "openai.responses" {
					field = "input"
				}
				prior := body[field].([]any)
				body[field] = append(append([]any(nil), prior...), map[string]any{"role": "assistant", "content": "EXACT_DONE"}, map[string]any{"role": "user", "content": "AFTER_EXACT"})
				post(e)
				body[field] = prior
				post(e)
				mu.Lock()
				captured := append([]string(nil), histories...)
				mu.Unlock()
				if len(captured) != 4 {
					t.Fatalf("expected resume/import/continue/rollback, got %d", len(captured))
				}
				for i, history := range captured {
					if !strings.Contains(history, "9007199254740993") || !strings.Contains(history, "-9007199254740993") || !strings.Contains(history, "0.100000000000000000001") || strings.Contains(history, "9007199254740992") {
						t.Errorf("%s tool input changed: exact=%v rounded=%v", []string{"resume", "cold-import", "continue", "rollback"}[i], strings.Contains(history, "9007199254740993"), strings.Contains(history, "9007199254740992"))
					}
				}
			})
		}
	}
}
