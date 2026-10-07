package worker

import (
	"bufio"
	"ccgateway/worker/internal/config"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// Run an actual subprocess over OS pipes. Reject any plaintext input, early
// user submission or truncated content, rather than mocking Execute itself.
func TestMain(m *testing.M) {
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

func peer() error {
	dec, enc := json.NewDecoder(os.Stdin), json.NewEncoder(os.Stdout)
	var init, user map[string]any
	if err := dec.Decode(&init); err != nil {
		return err
	}
	if init["type"] != "control_request" || init["request"].(map[string]any)["subtype"] != "initialize" {
		return fmt.Errorf("missing initialize")
	}
	if err := enc.Encode(map[string]any{"type": "control_response", "response": map[string]any{"request_id": init["request_id"], "subtype": "success"}}); err != nil {
		return err
	}
	if err := dec.Decode(&user); err != nil {
		return err
	}
	if user["type"] != "user" || user["uuid"] == "" {
		return fmt.Errorf("missing user frame")
	}
	msg := user["message"].(map[string]any)
	blocks := msg["content"].([]any)
	if len(blocks) != 2 || blocks[1].(map[string]any)["text"] != "second block" {
		return fmt.Errorf("content lost")
	}
	request, err := http.NewRequest("POST", os.Getenv("CCGATEWAY_MOD_URL"), strings.NewReader(`{"event":"ready","version":"ccgateway-v2"}`))
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+os.Getenv("CCGATEWAY_MOD_TOKEN"))
	ack, err := http.DefaultClient.Do(request)
	if err != nil {
		return err
	}
	ack.Body.Close()
	if ack.StatusCode != 200 {
		return fmt.Errorf("Mod callback failed")
	}
	message := map[string]any{"id": "msg_worker", "role": "assistant", "model": "claude-sonnet-4-6", "content": []any{}, "stop_reason": "end_turn", "usage": map[string]any{"input_tokens": 1, "output_tokens": 1}}
	dir := filepath.Join(os.Getenv("CLAUDE_CONFIG_DIR"), "projects", "probe")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	row, _ := json.Marshal(map[string]any{"type": "assistant", "uuid": "77e6ce4c-e0e3-488b-bc40-2c581a42968d", "message": message})
	if err := os.WriteFile(filepath.Join(dir, user["session_id"].(string)+".jsonl"), append(row, '\n'), 0600); err != nil {
		return err
	}
	for _, event := range []map[string]any{
		{"type": "message_start", "message": message},
		{"type": "message_delta", "delta": map[string]any{"stop_reason": "end_turn"}, "usage": map[string]any{"output_tokens": 1}},
		{"type": "message_stop"},
	} {
		if err := enc.Encode(map[string]any{"type": "stream_event", "event": event}); err != nil {
			return err
		}
	}
	return enc.Encode(map[string]any{"type": "result", "subtype": "success"})
}

func fixture(t *testing.T) Worker {
	t.Helper()
	t.Setenv("WORKER_TEST_PEER", "1")
	cli, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	w, err := New(&config.Config{WorkerID: "test", CLIPath: cli, ConfigDir: filepath.Join(root, "config"), HistoryDir: filepath.Join(root, "history"), APIKey: "worker-test-key", AdminKey: "worker-admin-key", RequestTimeout: 5 * time.Second})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := w.Close(); err != nil {
			t.Error(err)
		}
	})
	return w
}

func TestWorkerProtocolAndResponse(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			w := fixture(t)
			body := fmt.Sprintf(`{"model":"claude-sonnet-4-6","max_tokens":128,"stream":%t,"messages":[{"role":"user","content":[{"type":"text","text":"first block"},{"type":"text","text":"second block"}]}]}`, stream)
			req := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(body))
			req.Header.Set("x-api-key", "worker-test-key")
			out := httptest.NewRecorder()
			w.ServeHTTP(out, req)
			if out.Code != 200 {
				t.Fatalf("HTTP %d: %s", out.Code, out.Body.String())
			}
			if stream {
				scanner := bufio.NewScanner(out.Body)
				stops := 0
				for scanner.Scan() {
					line := scanner.Text()
					if strings.Contains(line, "stream_event") || strings.Contains(line, "control_response") {
						t.Fatal("CLI envelope leaked to HTTP")
					}
					if line == "event: message_stop" {
						stops++
					}
				}
				if stops != 1 {
					t.Fatalf("message_stop count: %d", stops)
				}
			} else {
				var result map[string]any
				if err := json.Unmarshal(out.Body.Bytes(), &result); err != nil {
					t.Fatal(err)
				}
				if result["id"] != "msg_worker" || result["role"] != "assistant" {
					t.Fatal(result)
				}
			}
		})
	}
}

func TestWorkerAdmission(t *testing.T) {
	w := fixture(t)
	for _, path := range []string{"/v1/messages", "/admin/status"} {
		out := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req.Header.Set("x-api-key", "wrong")
		w.ServeHTTP(out, req)
		if out.Code != 401 {
			t.Fatalf("%s returned %d", path, out.Code)
		}
	}
	status, err := w.Health(context.Background())
	if err != nil || status.CLIVersion != "2.1.288" {
		t.Fatalf("health: %v %v", status, err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
}

func TestWorkerRequiresKey(t *testing.T) {
	_, err := New(&config.Config{})
	if err == nil || !strings.Contains(err.Error(), "CCG_API_KEY") {
		t.Fatal(err)
	}
}
