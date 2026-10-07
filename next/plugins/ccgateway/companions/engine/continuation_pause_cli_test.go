package engine

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
)

func TestRealCLIServerPauseAssistantContinuation(t *testing.T) {
	var mu sync.Mutex
	var calls []Object
	blocks := webFixture("web_search")
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		mu.Lock()
		calls = append(calls, body)
		mu.Unlock()
		history, _ := json.Marshal(body["messages"])
		if bytes.Contains(history, []byte("srv_web")) {
			writeSurfaceFixture(w, str(body, "model"), []Object{blocks[1], {"type": "text", "text": "PAUSE_COMPLETED"}})
			return
		}
		fixture := httptest.NewRecorder()
		writeSurfaceFixture(fixture, str(body, "model"), []Object{blocks[0]})
		w.Header().Set("Content-Type", "text/event-stream")
		w.Write(bytes.ReplaceAll(fixture.Body.Bytes(), []byte(`"stop_reason":"end_turn"`), []byte(`"stop_reason":"pause_turn"`)))
	})
	endpoint, _ := newThinkingOutputFixture(t, handler)
	body := webTestBody("web_search_20250305")
	post := func() Object {
		t.Helper()
		raw, _ := json.Marshal(body)
		res, err := http.Post(endpoint+"/v1/messages", "application/json", bytes.NewReader(raw))
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		out, _ := io.ReadAll(res.Body)
		if res.StatusCode != 200 {
			mu.Lock()
			for _, c := range calls {
				b, _ := json.Marshal(c["messages"])
				t.Logf("wire fixture: %s", b)
			}
			mu.Unlock()
			t.Fatalf("HTTP%d %s", res.StatusCode, out)
		}
		answer, err := decodeObject(out)
		if err != nil {
			t.Fatal(err)
		}
		return answer
	}
	first := post()
	if str(first, "stop_reason") != "pause_turn" {
		t.Fatal("server pause hidden")
	}
	mu.Lock()
	count := len(calls)
	mu.Unlock()
	if count != 1 {
		t.Fatalf("CLI retried paused API: %d", count)
	}
	body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": first["content"]})
	second := post()
	if str(second, "stop_reason") != "end_turn" {
		t.Fatal("continuation did not finish")
	}
	mu.Lock()
	count = len(calls)
	wire := calls[len(calls)-1]
	mu.Unlock()
	if count != 2 {
		t.Fatalf("unexpected requests: %d", count)
	}
	messages, _ := wire["messages"].([]any)
	last, _ := messages[len(messages)-1].(map[string]any)
	if str(last, "role") != "assistant" {
		t.Fatal("pause continuation injected model-visible user turn")
	}
	t.Log("pause_turn returned after one request; assistant-only continuation preserved pending server call and completed its result")
}
