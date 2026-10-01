package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func videoCall(t *testing.T, h http.Handler, method, path, key string, body any) (int, map[string]any) {
	t.Helper()
	raw, _ := json.Marshal(body)
	r := httptest.NewRequest(method, path, bytes.NewReader(raw))
	r.Header.Set("Authorization", "Bearer "+key)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	var out map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	return w.Code, out
}

func TestVideoStatesAndAccountOwnership(t *testing.T) {
	s := newServer()
	h := s.handler()
	status, submitted := videoCall(t, h, "POST", "/api/v3/contents/generations/tasks", "account-a", map[string]string{"model": "seedance"})
	if status != 200 {
		t.Fatal(status, submitted)
	}
	id := submitted["id"].(string)
	path := "/api/v3/contents/generations/tasks/" + id
	if code, _ := videoCall(t, h, "GET", path, "account-b", nil); code != 404 {
		t.Fatalf("cross-account status %d", code)
	}
	for _, state := range []string{"running", "succeeded", "failed"} {
		if code, _ := videoCall(t, h, "POST", "/__video/control", "", videoControl{APIKey: "account-a", State: state, OutputTokens: 17}); code != 200 {
			t.Fatal(code)
		}
		code, body := videoCall(t, h, "GET", path, "account-a", nil)
		if code != 200 || body["status"] != state || body["id"] != id {
			t.Fatal(code, body)
		}
		if state == "succeeded" && body["usage"].(map[string]any)["completion_tokens"] != float64(17) {
			t.Fatal(body)
		}
	}
	s.video.mu.Lock()
	defer s.video.mu.Unlock()
	task := s.video.tasks[id]
	if task.MaxActive != 1 || task.Active != 0 || len(task.Queries) != 4 || task.Queries[0].APIKey != "account-b" {
		t.Fatalf("stats: %+v", task)
	}
}

func TestVideoBlockReleaseAndClientCancellation(t *testing.T) {
	s := newServer()
	h := s.handler()
	_, body := videoCall(t, h, "POST", "/api/v3/contents/generations/tasks", "account", map[string]string{"model": "seedance"})
	id := body["id"].(string)
	ts := httptest.NewServer(h)
	defer ts.Close()
	for _, cancelClient := range []bool{false, true} {
		videoCall(t, h, "POST", "/__video/control", "", videoControl{APIKey: "account", Block: true})
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		req, _ := http.NewRequestWithContext(ctx, "GET", ts.URL+"/api/v3/contents/generations/tasks/"+id, nil)
		req.Header.Set("Authorization", "Bearer account")
		done := make(chan error, 1)
		go func() {
			resp, err := ts.Client().Do(req)
			if resp != nil {
				_, _ = io.Copy(io.Discard, resp.Body)
				resp.Body.Close()
			}
			done <- err
		}()
		waitVideoActive(t, s, id, 1)
		if cancelClient {
			cancel()
		} else {
			videoCall(t, h, "POST", "/__video/control", "", videoControl{APIKey: "account", State: "succeeded", OutputTokens: 17, DelayMS: 5})
		}
		select {
		case err := <-done:
			if (err != nil) != cancelClient {
				t.Fatalf("canceled=%v err=%v", cancelClient, err)
			}
		case <-ctx.Done():
			if !cancelClient {
				t.Fatal("release timed out")
			}
		}
		cancel()
		waitVideoActive(t, s, id, 0)
	}
	s.video.mu.Lock()
	defer s.video.mu.Unlock()
	q := s.video.tasks[id].Queries
	if q[0].Canceled || q[0].Status != 200 || !q[1].Canceled {
		t.Fatalf("queries: %+v", q)
	}
}

func waitVideoActive(t *testing.T, s *server, id string, want int) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		s.video.mu.Lock()
		n := s.video.tasks[id].Active
		s.video.mu.Unlock()
		if n == want {
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatalf("video active did not reach %d", want)
}
