package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
)

func TestResponsesWebSocket(t *testing.T) {
	s := newServer()
	srv := httptest.NewServer(s.handler())
	defer srv.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	url := "ws" + strings.TrimPrefix(srv.URL, "http") + "/v1/responses"
	dial := func(key string) (*websocket.Conn, *http.Response, error) {
		return websocket.Dial(ctx, url, &websocket.DialOptions{HTTPHeader: http.Header{"Authorization": {"Bearer " + key}}})
	}
	conn, _, err := dial("ws-key")
	if err != nil {
		t.Fatal(err)
	}
	defer conn.CloseNow()
	turn := func(model string) []map[string]any {
		raw, _ := json.Marshal(map[string]any{"type": "response.create", "model": model, "input": "hi"})
		if err := conn.Write(ctx, websocket.MessageText, raw); err != nil {
			t.Fatal(err)
		}
		var events []map[string]any
		for {
			_, data, err := conn.Read(ctx)
			if err != nil {
				t.Fatal(err)
			}
			var ev map[string]any
			_ = json.Unmarshal(data, &ev)
			events = append(events, ev)
			if typ := ev["type"]; typ == "response.completed" || typ == "error" {
				return events
			}
		}
	}
	for i := 0; i < 2; i++ {
		events := turn("gpt-ws")
		last := events[len(events)-1]
		if last["type"] != "response.completed" || get(last, "response", "usage", "input_tokens") != float64(DefaultUsage.InputTokens) ||
			get(last, "response", "model") != "gpt-ws" || events[0]["type"] != "response.created" {
			t.Fatalf("turn %d: %v", i, events)
		}
	}
	// A status rule answers the next turn with an error event...
	s.mu.Lock()
	s.rules["ws-key"] = &controlRule{APIKey: "ws-key", Status: 429, Remaining: 1}
	s.rules["bad-key"] = &controlRule{APIKey: "bad-key", Status: 401}
	s.mu.Unlock()
	if events := turn("gpt-ws"); events[0]["type"] != "error" || events[0]["status"] != float64(429) {
		t.Fatalf("rate limited turn: %v", events)
	}
	// ...and rejects a handshake.
	if _, resp, err := dial("bad-key"); err == nil || resp == nil || resp.StatusCode != 401 {
		t.Fatalf("rejected handshake: %v %v", resp, err)
	}
	var methods []string
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, r := range s.log {
		methods = append(methods, r.Method+":"+r.APIKey)
	}
	if got := strings.Join(methods, ","); got != "GET:ws-key,WS:ws-key,WS:ws-key,WS:ws-key,GET:bad-key" {
		t.Fatalf("recorded %s", got)
	}
}
