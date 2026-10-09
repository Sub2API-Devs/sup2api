package worker

import (
	"bytes"
	"ccgateway/worker/internal/config"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

// Real CLI with a synthetic key and an isolated local upstream: verifies the
// worker entrypoint, account config, full history and protocol conversion.
func TestWorkerRealCLI(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated real CLI verification")
	}
	root := t.TempDir()
	var mu sync.Mutex
	var requests []map[string]any
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || !strings.HasSuffix(r.URL.Path, "/messages") {
			_, _ = io.WriteString(w, `{"input_tokens":8}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		var body map[string]any
		if err := json.Unmarshal(raw, &body); err != nil {
			http.Error(w, "invalid JSON", 400)
			return
		}
		mu.Lock()
		requests = append(requests, body)
		mu.Unlock()
		w.Header().Set("Content-Type", "text/event-stream")
		for _, event := range []map[string]any{
			{"type": "message_start", "message": map[string]any{"id": "msg_real_worker", "type": "message", "role": "assistant", "model": "claude-sonnet-4-6", "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": map[string]any{"input_tokens": 8, "output_tokens": 0}}},
			{"type": "content_block_start", "index": 0, "content_block": map[string]any{"type": "text", "text": ""}},
			{"type": "content_block_delta", "index": 0, "delta": map[string]any{"type": "text_delta", "text": "Hello worker"}},
			{"type": "content_block_stop", "index": 0},
			{"type": "message_delta", "delta": map[string]any{"stop_reason": "end_turn", "stop_sequence": nil}, "usage": map[string]any{"output_tokens": 2}},
			{"type": "message_stop"},
		} {
			data, _ := json.Marshal(event)
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event["type"], data)
		}
	}))
	defer up.Close()
	t.Setenv("ANTHROPIC_BASE_URL", up.URL)
	t.Setenv("ANTHROPIC_API_KEY", "synthetic-worker-key")
	t.Setenv("ANTHROPIC_AUTH_TOKEN", "")
	t.Setenv("CLAUDE_CODE_OAUTH_TOKEN", "")
	t.Setenv("HOME", root)
	t.Setenv("USERPROFILE", root)
	t.Setenv("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "1")
	service := httptest.NewUnstartedServer(nil)
	defer service.Close()
	w, err := New(&config.Config{WorkerID: "real-test", Port: service.Listener.Addr().(*net.TCPAddr).Port, CLIPath: cli, ConfigDir: filepath.Join(root, "config"), HistoryDir: filepath.Join(root, "history"), CacheDir: filepath.Join(root, "cache"), APIKey: "test-gateway-key", AdminKey: "test-admin-key", RequestTimeout: 20 * time.Second})
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()
	service.Config.Handler = w
	service.Start()
	client := &http.Client{Timeout: 25 * time.Second}
	messages := []map[string]any{{"role": "user", "content": "first question"}}
	for turn := 0; turn < 3; turn++ {
		stream := turn == 2
		// The client session is metadata.user_id, as CC sends it (CONTRACTS §53.12).
		request := map[string]any{"model": "claude-sonnet-4-6", "max_tokens": 128, "system": "Client system", "stream": stream, "messages": messages, "metadata": map[string]any{"user_id": "multi-turn"}}
		raw, _ := json.Marshal(request)
		req, _ := http.NewRequest("POST", service.URL+"/v1/messages", bytes.NewReader(raw))
		req.Header.Set("x-api-key", "test-gateway-key")
		res, err := client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		data, err := io.ReadAll(res.Body)
		res.Body.Close()
		if err != nil {
			t.Fatal(err)
		}
		if res.StatusCode != 200 {
			t.Fatalf("turn %d: %d %s", turn, res.StatusCode, data)
		}
		if turn > 0 && res.Header.Get("X-CCGateway-History") != "prefix-hit" {
			t.Fatalf("history not reused: %s", res.Header.Get("X-CCGateway-History"))
		}
		if stream {
			if strings.Count(string(data), "event: message_stop\n") != 1 || !bytes.Contains(data, []byte("Hello worker")) {
				t.Fatal(string(data))
			}
		} else {
			var answer map[string]any
			if err := json.Unmarshal(data, &answer); err != nil {
				t.Fatal(err)
			}
			messages = append(messages, map[string]any{"role": "assistant", "content": answer["content"]}, map[string]any{"role": "user", "content": fmt.Sprintf("follow-up %d", turn)})
		}
	}
	mu.Lock()
	defer mu.Unlock()
	if len(requests) != 3 {
		t.Fatalf("model calls: %d", len(requests))
	}
	for _, request := range requests {
		if !strings.Contains(fmt.Sprint(request["system"]), "Client system") {
			t.Fatal("client system lost")
		}
	}
	if len(requests[2]["messages"].([]any)) < 5 {
		t.Fatal("history lost")
	}
}
