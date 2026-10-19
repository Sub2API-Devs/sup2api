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

// Run the request command through a real subprocess and OS pipes.
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
			fmt.Println("2.1.302")
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
	if len(os.Args) < 3 || os.Args[1] != "request" {
		return fmt.Errorf("expected request command, not agent loop")
	}
	mode := os.Args[2]
	if mode != "--build" && mode != "--direct" {
		return fmt.Errorf("unexpected request mode")
	}
	raw, err := io.ReadAll(os.Stdin)
	if err != nil {
		return err
	}
	if capture := os.Getenv("WORKER_TEST_ENV_CAPTURE"); capture != "" {
		data, _ := json.Marshal(map[string]string{"LANG": os.Getenv("LANG"), "LC_ALL": os.Getenv("LC_ALL"), "TZ": os.Getenv("TZ")})
		if err = os.WriteFile(capture, data, 0600); err != nil {
			return err
		}
	}
	var body map[string]json.RawMessage
	if err = json.Unmarshal(raw, &body); err != nil {
		return err
	}
	if mode == "--build" {
		var parameters map[string]json.RawMessage
		if err = json.Unmarshal(body["parameters"], &parameters); err != nil {
			return err
		}
		for _, key := range []string{"model", "messages", "stream"} {
			parameters[key] = body[key]
		}
		raw, err = json.Marshal(parameters)
		if err != nil {
			return err
		}
	}
	provider := os.Getenv("WORKER_TEST_PROVIDER_URL")
	if !strings.HasPrefix(provider, "http://127.0.0.1:") || os.Getenv("ANTHROPIC_BASE_URL") != provider {
		return fmt.Errorf("fake provider boundary changed")
	}
	client := &http.Client{Timeout: 2 * time.Second, Transport: &http.Transport{}}
	defer client.CloseIdleConnections()
	response, err := client.Post(provider+"/v1/messages", "application/json", bytes.NewReader(raw))
	if err != nil {
		return err
	}
	defer response.Body.Close()
	meta := ""
	for i, arg := range os.Args {
		if arg == "--response-meta" && i+1 < len(os.Args) {
			meta = os.Args[i+1]
		}
	}
	if meta == "" {
		return fmt.Errorf("response metadata missing")
	}
	data, _ := json.Marshal(map[string]any{"status": response.StatusCode, "headers": map[string]string{"content-type": response.Header.Get("Content-Type")}})
	if err = os.WriteFile(meta, data, 0600); err != nil {
		return err
	}
	_, err = io.Copy(os.Stdout, response.Body)
	return err
}

func fixture(t *testing.T, wantRequests int64) Worker {
	t.Helper()
	return fixtureAt(t, wantRequests, t.TempDir())
}

// fixtureAt starts a worker on root; a second worker on the same root
// stands for a restarted container keeping its data volume.
func fixtureAt(t *testing.T, wantRequests int64, root string) Worker {
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
		assert.Equal(t, "128", string(body["max_tokens"]), "request generation fields must reach the provider")
		assert.Equal(t, "0.2500", string(body["temperature"]), "raw generation fields must retain their representation")
		assert.JSONEq(t, `["fixture stop"]`, string(body["stop_sequences"]))
		assert.JSONEq(t, `[{"role":"user","content":[{"type":"text","text":"first block"},{"type":"text","text":"second block"}]}]`, string(body["messages"]))
		assert.Equal(t, `"claude-sonnet-4-6"`, string(body["model"]))
		if string(body["stream"]) == "true" {
			w.Header().Set("Content-Type", "text/event-stream")
			for _, event := range []map[string]any{
				{"type": "message_start", "message": map[string]any{"id": "msg_worker", "type": "message", "role": "assistant", "model": "claude-sonnet-4-6", "content": []any{}, "usage": map[string]int{"input_tokens": 1, "output_tokens": 0}}},
				{"type": "content_block_start", "index": 0, "content_block": map[string]string{"type": "text", "text": ""}},
				{"type": "content_block_delta", "index": 0, "delta": map[string]string{"type": "text_delta", "text": "worker answer"}},
				{"type": "content_block_stop", "index": 0},
				{"type": "message_delta", "delta": map[string]string{"stop_reason": "end_turn"}, "usage": map[string]int{"output_tokens": 1}},
				{"type": "message_stop"},
			} {
				data, _ := json.Marshal(event)
				fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event["type"], data)
			}
		} else {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprint(w, `{"id":"msg_worker","type":"message","role":"assistant","model":"claude-sonnet-4-6","content":[{"type":"text","text":"worker answer"}],"stop_reason":"end_turn","usage":{"input_tokens":1,"output_tokens":1}}`)
		}
	}))
	t.Cleanup(func() {
		upstream.Close()
		assert.Equal(t, wantRequests, requests.Load(), "fake provider request count")
	})
	t.Setenv("ANTHROPIC_BASE_URL", upstream.URL)
	t.Setenv("WORKER_TEST_PROVIDER_URL", upstream.URL)
	cli, err := os.Executable()
	require.NoError(t, err)
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
	assert.Equal(t, "2.1.302", status.CLIVersion)
	require.NoError(t, w.Close())
	require.NoError(t, w.Close())
}

func TestWorkerRequiresKey(t *testing.T) {
	_, err := New(&config.Config{})
	require.ErrorContains(t, err, "CCG_API_KEY")
}

// Account locale/timezone changes reach new CLI processes without a new
// container, and survive a worker restart on the same data directory.
func TestWorkerEnvironmentAppliesToNewCLIProcesses(t *testing.T) {
	t.Setenv("LANG", "C.UTF-8")
	t.Setenv("LC_ALL", "")
	t.Setenv("TZ", "UTC")
	root := t.TempDir()
	capture := filepath.Join(t.TempDir(), "env.json")
	t.Setenv("WORKER_TEST_ENV_CAPTURE", capture)
	admin := func(w Worker, method, body, key string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, "/admin/environment", strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+key)
		out := httptest.NewRecorder()
		w.ServeHTTP(out, req)
		return out
	}
	request := func(w Worker) map[string]string {
		body := `{"model":"claude-sonnet-4-6","max_tokens":128,"temperature":0.2500,"stop_sequences":["fixture stop"],"messages":[{"role":"user","content":[{"type":"text","text":"first block"},{"type":"text","text":"second block"}]}]}`
		req := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(body))
		req.Header.Set("x-api-key", "worker-test-key")
		out := httptest.NewRecorder()
		w.ServeHTTP(out, req)
		require.Equal(t, http.StatusOK, out.Code, out.Body.String())
		raw, err := os.ReadFile(capture)
		require.NoError(t, err)
		var env map[string]string
		require.NoError(t, json.Unmarshal(raw, &env))
		return env
	}

	w := fixtureAt(t, 2, root)
	assert.Equal(t, http.StatusUnauthorized, admin(w, http.MethodPut, `{"timezone":"Asia/Tokyo"}`, "worker-test-key").Code, "the API key is not a management key")
	assert.Equal(t, http.StatusBadRequest, admin(w, http.MethodPut, `{"timezone":"Mars/Olympus"}`, "worker-admin-key").Code)
	assert.Equal(t, map[string]string{"LANG": "C.UTF-8", "LC_ALL": "", "TZ": "UTC"}, request(w))

	out := admin(w, http.MethodPut, `{"locale":"ja_JP","timezone":"Asia/Tokyo"}`, "worker-admin-key")
	require.Equal(t, http.StatusOK, out.Code, out.Body.String())
	assert.Equal(t, map[string]string{"LANG": "ja_JP.UTF-8", "LC_ALL": "ja_JP.UTF-8", "TZ": "Asia/Tokyo"}, request(w))
	require.NoError(t, w.Close())

	restarted := fixtureAt(t, 0, root)
	out = admin(restarted, http.MethodGet, "", "worker-admin-key")
	require.Equal(t, http.StatusOK, out.Code, out.Body.String())
	var view map[string]any
	require.NoError(t, json.Unmarshal(out.Body.Bytes(), &view))
	assert.Equal(t, "ja_JP", view["locale"])
	assert.Equal(t, "Asia/Tokyo", view["timezone"])
	assert.Equal(t, map[string]any{"LANG": "ja_JP.UTF-8", "LC_ALL": "ja_JP.UTF-8", "TZ": "Asia/Tokyo"}, view["effective"])
}
