package engine

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

const cancellationFirstEvent = "event: message_start\ndata: {}\n\n"

// Invoked by TestMain as a real subprocess on Windows and Linux. Waiting modes
// only finish on cancellation; capture mode records one request and exits.
func requestCancellationPeer() {
	// A fixture peer answers with a recorded upstream answer (request_credit_test.go).
	if fixture := os.Getenv("CCG_TEST_REQUEST_FIXTURE"); fixture != "" {
		requestFixturePeer(fixture)
		return
	}
	if os.Getenv("CCG_TEST_REQUEST_PEER") == "capture" {
		raw, _ := io.ReadAll(os.Stdin)
		file, err := os.OpenFile(os.Getenv("CCG_TEST_REQUEST_READY"), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
		if err != nil {
			panic(err)
		}
		_, _ = file.Write(append(raw, '\n'))
		_ = file.Close()
		if target := os.Getenv("CCG_TEST_REQUEST_ENV_CAPTURE"); target != "" {
			values := map[string]string{}
			for _, name := range []string{"CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "DISABLE_TELEMETRY", "DO_NOT_TRACK", "DISABLE_ERROR_REPORTING", "CLAUDE_CODE_ENABLE_TELEMETRY", "CCG_REPORT_CONTAINER_RESOURCES", "CCG_HARDWARE_PROFILE_PATH", requestIdentityEnv, directPolicyEnv, requestAgentEnv, "CLAUDE_CODE_REMOTE_SESSION_ID", "_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL",
				"CCG_API_KEY", "CCG_ADMIN_KEY", "ccg_api_key", "CCG_ACCOUNT_DISK_QUOTA_BYTES"} {
				if value, ok := os.LookupEnv(name); ok {
					values[name] = value
				}
			}
			data, _ := json.Marshal(values)
			_ = os.WriteFile(target, data, 0600)
		}
		// The request it sent, as a CLI with request_capture_v1 writes it
		// (request_log_upstream_test.go).
		upstreamCapturePeer(raw)
		for i, arg := range os.Args {
			if arg == "--response-meta" && i+1 < len(os.Args) {
				_ = os.WriteFile(os.Args[i+1], []byte(`{"status":200,"headers":{"content-type":"text/event-stream"}}`), 0600)
			}
		}
		_, _ = io.WriteString(os.Stdout, cancellationFirstEvent+"event: message_stop\ndata: {}\n\n")
		return
	}
	_, _ = io.Copy(io.Discard, os.Stdin)
	if os.Getenv("CCG_TEST_REQUEST_PEER") == "stream" {
		for i, arg := range os.Args {
			if arg == "--response-meta" && i+1 < len(os.Args) {
				if err := os.WriteFile(os.Args[i+1], []byte(`{"status":200,"headers":{"content-type":"text/event-stream"}}`), 0600); err != nil {
					panic(err)
				}
			}
		}
		_, _ = io.WriteString(os.Stdout, cancellationFirstEvent)
	}
	if os.Getenv("CCG_TEST_REQUEST_FRAME") == "1" {
		_, _ = io.WriteString(os.Stderr, requestErrorPrefix+`{"protocol":"ccgateway.request.error.v1","source":"transport","status":502,"error":{"type":"api_error","code":"fixture_error","message":"fixture"}}`+"\n")
	}
	if err := os.WriteFile(os.Getenv("CCG_TEST_REQUEST_READY"), []byte("ready"), 0600); err != nil {
		panic(err)
	}
	time.Sleep(time.Minute)
}

func TestRequestCommandSeparatesCancellationAndDeadline(t *testing.T) {
	for _, mode := range []string{"direct", "build"} {
		for _, cause := range []string{"client", "client_with_frame", "worker_deadline", "parent_deadline"} {
			for _, stream := range []bool{false, true} {
				phase := "before_headers"
				if stream {
					phase = "after_headers"
				}
				t.Run(mode+"/"+cause+"/"+phase, func(t *testing.T) {
					root := t.TempDir()
					ready := filepath.Join(root, "ready")
					store := fullLogStore(t, t.TempDir())
					logs := store.root
					exe, err := lifecycleTestExecutable()
					if err != nil {
						t.Fatal(err)
					}
					peerMode := "wait"
					if stream {
						peerMode = "stream"
					}
					env := envWith(os.Environ(), map[string]string{"CCG_TEST_REQUEST_PEER": peerMode, "CCG_TEST_REQUEST_READY": ready})
					if cause == "client_with_frame" {
						env = envWith(env, map[string]string{"CCG_TEST_REQUEST_FRAME": "1"})
					}
					g := &Gateway{RequestMode: mode, Key: "fixture", Runner: &Runner{CLI: exe, Work: root, Env: env}, Slots: make(chan struct{}, 1), Timeout: time.Minute, RequestLogs: store, CLIInfo: buildCLI}
					if cause == "worker_deadline" {
						g.Timeout = 2 * time.Second
					}
					done := make(chan struct{})
					srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
						defer close(done)
						if cause == "parent_deadline" {
							ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
							defer cancel()
							r = r.WithContext(ctx)
						}
						g.ServeHTTP(w, r)
					}))
					defer srv.Close()
					ctx, cancel := context.WithCancel(context.Background())
					defer cancel()
					req, _ := http.NewRequestWithContext(ctx, "POST", srv.URL+"/v1/messages", strings.NewReader(`{"model":"fixture","messages":[{"role":"user","content":"hi"}]}`))
					req.Header.Set("x-api-key", "fixture")
					type outcome struct {
						status int
						body   string
						err    error
					}
					result, first := make(chan outcome, 1), make(chan struct{})
					go func() {
						resp, err := srv.Client().Do(req)
						if err != nil {
							result <- outcome{err: err}
							return
						}
						defer resp.Body.Close()
						prefix := ""
						if stream {
							buf := make([]byte, len(cancellationFirstEvent))
							n, err := io.ReadFull(resp.Body, buf)
							prefix = string(buf[:n])
							if err != nil {
								result <- outcome{resp.StatusCode, prefix, err}
								return
							}
							close(first)
						}
						body, err := io.ReadAll(resp.Body)
						result <- outcome{resp.StatusCode, prefix + string(body), err}
					}()
					deadline := time.Now().Add(5 * time.Second)
					for {
						if _, err := os.Stat(ready); err == nil {
							break
						}
						if time.Now().After(deadline) {
							t.Fatal("peer did not start")
						}
						time.Sleep(time.Millisecond)
					}
					if stream {
						select {
						case <-first:
						case <-time.After(3 * time.Second):
							t.Fatal("client did not receive the first event")
						}
					}
					if strings.HasPrefix(cause, "client") {
						cancel()
					}
					select {
					case <-done:
					case <-time.After(5 * time.Second):
						t.Fatal("subprocess or handler did not terminate")
					}
					var got outcome
					select {
					case got = <-result:
					case <-time.After(time.Second):
						t.Fatal("client did not stop")
					}
					if len(g.Slots) != 0 {
						t.Fatal("slot leaked")
					}
					if paths, _ := filepath.Glob(filepath.Join(root, "request-*")); len(paths) != 0 {
						t.Fatal("temporary request directories leaked", paths)
					}
					store.flush()
					entries, err := os.ReadDir(logs)
					if err != nil || len(entries) != 1 {
						t.Fatal(entries, err)
					}
					logDir := filepath.Join(logs, entries[0].Name())
					raw, err := os.ReadFile(filepath.Join(logDir, "metadata.json"))
					if err != nil {
						t.Fatal(err)
					}
					var m map[string]any
					if err := json.Unmarshal(raw, &m); err != nil {
						t.Fatal(err)
					}
					code, source, status := "client_canceled", "client", float64(499)
					if cause == "worker_deadline" {
						code, source, status = "cli_timeout", "timeout", 504
						if m["canceled"] == true {
							t.Fatal("Worker timeout marked as client cancellation", string(raw))
						}
					} else if m["canceled"] != true || m["error_type"] != "client_canceled" {
						t.Fatal("missing cancellation identity", string(raw))
					}
					if stream {
						status = 200
						if got.status != 200 || got.err == nil || got.body != cancellationFirstEvent || m["http_status"] != float64(200) || m["response_interrupted"] != true {
							t.Fatal("committed response was rewritten or completed cleanly", got, string(raw))
						}
					} else if cause == "worker_deadline" {
						if got.status != 504 || got.err != nil || !strings.Contains(got.body, `"code":"cli_timeout"`) {
							t.Fatal("missing timeout response", got)
						}
					} else if got.status != 0 || got.err == nil || m["http_status"] != nil {
						t.Fatal("fabricated HTTP response after cancellation", got, string(raw))
					}
					if m["status"] != status || m["error_code"] != code || m["error_source"] != source {
						t.Fatal(string(raw))
					}
				})
			}
		}
	}
}
