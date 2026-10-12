package worker

import (
	"bufio"
	"bytes"
	"ccgateway/worker/internal/config"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInternalControlUsesExplicitListenerHost(t *testing.T) {
	for _, tc := range []struct{ host, want string }{{"", "http://127.0.0.1:8787"}, {"0.0.0.0", "http://127.0.0.1:8787"}, {"::", "http://127.0.0.1:8787"}, {"::1", "http://[::1]:8787"}, {"127.0.0.1", "http://127.0.0.1:8787"}, {"10.0.0.2", "http://10.0.0.2:8787"}} {
		assert.Equal(t, tc.want, workerInternalURL(tc.host, 8787), tc.host)
	}
}

// Run an actual subprocess over OS pipes. Reject plaintext input, early user
// submission or truncated content while exercising the native CLI protocol.
func TestMain(m *testing.M) {
	if strings.Contains(os.Getenv("ANTHROPIC_BASE_URL"), "/ccg-tool-catalog/") {
		if err := catalogPeer(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(2)
		}
		os.Exit(0)
	}
	if os.Getenv("WORKER_TEST_PEER") == "1" {
		if len(os.Args) > 1 && os.Args[1] == "--version" {
			fmt.Println("2.1.288")
			os.Exit(0)
		}
		if err := peer(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(2)
		}
		os.Exit(0)
	}
	os.Exit(m.Run())
}

func catalogPeer() error {
	request, err := http.NewRequest("POST", os.Getenv("ANTHROPIC_BASE_URL")+"/v1/messages", strings.NewReader(`{"model":"fixture","tools":[{"name":"Read","description":"fixture","input_schema":{"type":"object"}}]}`))
	if err != nil {
		return err
	}
	request.Header.Set("X-Api-Key", os.Getenv("ANTHROPIC_API_KEY"))
	client := &http.Client{Timeout: 2 * time.Second, Transport: &http.Transport{}}
	defer client.CloseIdleConnections()
	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("catalog status %d", response.StatusCode)
	}
	_, err = io.Copy(io.Discard, response.Body)
	return err
}

func peer() error {
	input, enc := bufio.NewReader(os.Stdin), json.NewEncoder(os.Stdout)
	line, err := input.ReadBytes('\n')
	if err != nil {
		return err
	}
	var init, user map[string]any
	if err := json.Unmarshal(line, &init); err != nil {
		return err
	}
	initialize, _ := init["request"].(map[string]any)
	if init["type"] != "control_request" || initialize["subtype"] != "initialize" || init["request_id"] == nil {
		return fmt.Errorf("missing initialize")
	}
	if err := enc.Encode(map[string]any{"type": "control_response", "response": map[string]any{"request_id": init["request_id"], "subtype": "success"}}); err != nil {
		return err
	}

	// Observe input without consuming a user frame until ready is acknowledged.
	// A short bounded probe catches submission before the authenticated gate.
	available := make(chan error, 1)
	go func() {
		_, err := input.Peek(1)
		available <- err
	}()
	client := &http.Client{Timeout: 2 * time.Second, Transport: &http.Transport{}}
	defer client.CloseIdleConnections()
	control := func(method, token, body string) (*http.Response, error) {
		r, err := http.NewRequest(method, os.Getenv("CCGATEWAY_MOD_URL"), strings.NewReader(body))
		if err != nil {
			return nil, err
		}
		if token != "" {
			r.Header.Set("Authorization", "Bearer "+token)
		}
		return client.Do(r)
	}
	const ready = `{"event":"ready","version":"ccgateway-v3"}`
	for _, token := range []string{"", "wrong"} {
		for _, method := range []string{http.MethodGet, http.MethodPost} {
			res, err := control(method, token, ready)
			if err != nil {
				return err
			}
			res.Body.Close()
			if res.StatusCode != http.StatusNotFound {
				return fmt.Errorf("unauthenticated Mod %s returned %d", method, res.StatusCode)
			}
		}
	}
	res, err := control(http.MethodGet, os.Getenv("CCGATEWAY_MOD_TOKEN"), "")
	if err != nil {
		return err
	}
	var mod struct {
		Passthrough struct {
			First string `json:"first"`
		} `json:"passthrough"`
	}
	err = json.NewDecoder(res.Body).Decode(&mod)
	res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("Mod config returned %d", res.StatusCode)
	}
	if err != nil {
		return err
	}
	if len(mod.Passthrough.First) == 0 {
		return fmt.Errorf("missing Mod passthrough.first")
	}
	select {
	case err := <-available:
		return fmt.Errorf("input before authenticated ready: %v", err)
	case <-time.After(25 * time.Millisecond):
	}
	ack, err := control(http.MethodPost, os.Getenv("CCGATEWAY_MOD_TOKEN"), ready)
	if err != nil {
		return err
	}
	ack.Body.Close()
	if ack.StatusCode != http.StatusOK {
		return fmt.Errorf("Mod ready returned %d", ack.StatusCode)
	}
	if err := <-available; err != nil {
		return err
	}
	if err := json.NewDecoder(input).Decode(&user); err != nil {
		return err
	}
	if user["type"] != "user" || user["uuid"] == nil || user["uuid"] == "" {
		return fmt.Errorf("missing user frame")
	}
	msg, _ := user["message"].(map[string]any)
	blocks, _ := msg["content"].([]any)
	if msg["role"] != "user" || len(blocks) != 2 {
		return fmt.Errorf("content lost")
	}
	for i, text := range []string{"first block", "second block"} {
		block, _ := blocks[i].(map[string]any)
		if block["type"] != "text" || block["text"] != text {
			return fmt.Errorf("content block %d lost", i)
		}
	}

	// Emulate the Mod's first-round EXTRA_BODY merge, preserving raw fields.
	// The native CLI talks directly to this test's provider, never a real one.
	provider := os.Getenv("WORKER_TEST_PROVIDER_URL")
	if !strings.HasPrefix(provider, "http://127.0.0.1:") || os.Getenv("ANTHROPIC_BASE_URL") != provider {
		return fmt.Errorf("fake provider boundary changed")
	}
	upstream := map[string]any{"model": "claude-sonnet-4-6", "max_tokens": 1, "stream": true, "messages": []any{msg}}
	var first map[string]json.RawMessage
	if err := json.Unmarshal([]byte(mod.Passthrough.First), &first); err != nil {
		return err
	}
	for name, value := range first {
		upstream[name] = value
	}
	var body bytes.Buffer
	bodyEncoder := json.NewEncoder(&body)
	bodyEncoder.SetEscapeHTML(false)
	if err := bodyEncoder.Encode(upstream); err != nil {
		return err
	}
	res, err = client.Post(provider+"/v1/messages", "application/json", &body)
	if err != nil {
		return err
	}
	_, err = io.Copy(io.Discard, res.Body)
	res.Body.Close()
	if err != nil {
		return err
	}
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("fake provider returned %d", res.StatusCode)
	}
	message := map[string]any{"id": "msg_worker", "type": "message", "role": "assistant", "model": "claude-sonnet-4-6", "content": []any{map[string]any{"type": "text", "text": "worker answer"}}, "stop_reason": "end_turn", "usage": map[string]any{"input_tokens": 1, "output_tokens": 1}}
	dir := filepath.Join(os.Getenv("CLAUDE_CONFIG_DIR"), "projects", "probe")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	row, err := json.Marshal(map[string]any{"type": "assistant", "uuid": "77e6ce4c-e0e3-488b-bc40-2c581a42968d", "message": message})
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(dir, user["session_id"].(string)+".jsonl"), append(row, '\n'), 0600); err != nil {
		return err
	}
	for _, event := range []map[string]any{
		{"type": "message_start", "message": map[string]any{"id": "msg_worker", "type": "message", "role": "assistant", "model": "claude-sonnet-4-6", "content": []any{}, "usage": map[string]any{"input_tokens": 1, "output_tokens": 0}}},
		{"type": "content_block_start", "index": 0, "content_block": map[string]any{"type": "text", "text": ""}},
		{"type": "content_block_delta", "index": 0, "delta": map[string]any{"type": "text_delta", "text": "worker answer"}},
		{"type": "content_block_stop", "index": 0},
		{"type": "message_delta", "delta": map[string]any{"stop_reason": "end_turn"}, "usage": map[string]any{"output_tokens": 1}},
		{"type": "message_stop"},
	} {
		if err := enc.Encode(map[string]any{"type": "stream_event", "event": event}); err != nil {
			return err
		}
	}
	return enc.Encode(map[string]any{"type": "result", "subtype": "success"})
}

func fixture(t *testing.T, wantRequests int64) Worker {
	t.Helper()
	t.Setenv("WORKER_TEST_PEER", "1")
	var requests atomic.Int64
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "/v1/messages", r.URL.Path)
		assert.Empty(t, r.Header.Get("Authorization"), "Mod credentials must not reach the provider")
		var body map[string]json.RawMessage
		if !assert.NoError(t, json.NewDecoder(r.Body).Decode(&body)) {
			http.Error(w, "bad fixture", http.StatusBadRequest)
			return
		}
		assert.Equal(t, "128", string(body["max_tokens"]), "Mod first-round fields must reach the provider")
		assert.Equal(t, "0.2500", string(body["temperature"]), "raw generation fields must retain their representation")
		assert.JSONEq(t, `["fixture stop"]`, string(body["stop_sequences"]))
		assert.JSONEq(t, `[{"role":"user","content":[{"type":"text","text":"first block"},{"type":"text","text":"second block"}]}]`, string(body["messages"]))
		assert.Equal(t, `"claude-sonnet-4-6"`, string(body["model"]))
		assert.Equal(t, "true", string(body["stream"]))
		fmt.Fprint(w, `{}`)
	}))
	t.Cleanup(func() {
		upstream.Close()
		assert.Equal(t, wantRequests, requests.Load(), "fake provider request count")
	})
	t.Setenv("ANTHROPIC_BASE_URL", upstream.URL)
	t.Setenv("WORKER_TEST_PROVIDER_URL", upstream.URL)
	cli, err := os.Executable()
	require.NoError(t, err)
	root := t.TempDir()
	w, err := New(&config.Config{WorkerID: "test", CLIPath: cli, ConfigDir: filepath.Join(root, "config"), HistoryDir: filepath.Join(root, "history"), APIKey: "worker-test-key", AdminKey: "worker-admin-key", RequestTimeout: 5 * time.Second})
	require.NoError(t, err)
	t.Cleanup(func() { assert.NoError(t, w.Close()) })
	require.Eventually(t, func() bool {
		status, err := w.Health(context.Background())
		return err == nil && status.Status == "healthy"
	}, 10*time.Second, 20*time.Millisecond)
	return w
}

func TestWorkerProtocolAndResponse(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			w := fixture(t, 1)
			body := fmt.Sprintf(`{"model":"claude-sonnet-4-6","max_tokens":128,"temperature":0.2500,"stop_sequences":["fixture stop"],"stream":%t,"messages":[{"role":"user","content":[{"type":"text","text":"first block"},{"type":"text","text":"second block"}]}]}`, stream)
			req := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(body))
			req.Header.Set("x-api-key", "worker-test-key")
			out := httptest.NewRecorder()
			w.ServeHTTP(out, req)
			require.Equal(t, http.StatusOK, out.Code, out.Body.String())
			assert.NotContains(t, out.Body.String(), "stream_event", "CLI envelope leaked to HTTP")
			assert.NotContains(t, out.Body.String(), "control_response", "CLI envelope leaked to HTTP")
			if stream {
				scanner := bufio.NewScanner(out.Body)
				var events []string
				stops := 0
				for scanner.Scan() {
					line := scanner.Text()
					if event, ok := strings.CutPrefix(line, "event: "); ok {
						events = append(events, event)
					}
					if line == "event: message_stop" {
						stops++
					}
				}
				require.NoError(t, scanner.Err())
				assert.Equal(t, 1, stops, "message_stop count")
				assert.Equal(t, []string{"message_start", "content_block_start", "content_block_delta", "content_block_stop", "message_delta", "message_stop"}, events)
			} else {
				var result map[string]any
				require.NoError(t, json.Unmarshal(out.Body.Bytes(), &result))
				assert.Equal(t, "msg_worker", result["id"])
				assert.Equal(t, "assistant", result["role"])
				assert.Equal(t, "end_turn", result["stop_reason"])
				assert.Equal(t, []any{map[string]any{"type": "text", "text": "worker answer"}}, result["content"])
			}
		})
	}
}

func TestWorkerAdmission(t *testing.T) {
	w := fixture(t, 0)
	for _, path := range []string{"/v1/messages", "/admin/status"} {
		out := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req.Header.Set("x-api-key", "wrong")
		w.ServeHTTP(out, req)
		assert.Equal(t, http.StatusUnauthorized, out.Code, path)
	}
	status, err := w.Health(context.Background())
	require.NoError(t, err)
	assert.Equal(t, "2.1.288", status.CLIVersion)
	require.NoError(t, w.Close())
	require.NoError(t, w.Close())
}

func TestWorkerRequiresKey(t *testing.T) {
	_, err := New(&config.Config{})
	require.ErrorContains(t, err, "CCG_API_KEY")
}
