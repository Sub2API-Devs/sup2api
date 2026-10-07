package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestCitationsHistoryAndStreaming(t *testing.T) {
	for _, citationType := range []string{"char_location", "page_location", "content_block_location", "web_search_result_location", "search_result_location"} {
		citation := Object{"type": citationType, "cited_text": "source", "document_index": 0, "encrypted_index": "opaque"}
		for _, citations := range []any{nil, []any{}, []any{citation}} {
			v := basic()
			v["messages"].([]any)[1].(Object)["content"] = []any{Object{"type": "text", "text": "hi", "citations": citations}}
			r := parsed(t, v)
			row, _ := transcriptRow(r.Messages[1], "", uuid(), "/fixture", "2.1.288", r.Model)
			var stored Object
			json.Unmarshal(row, &stored)
			content := stored["message"].(map[string]any)["content"].([]any)[0].(map[string]any)
			want, _ := json.Marshal(citations)
			got, _ := json.Marshal(content["citations"])
			if !bytes.Equal(want, got) {
				t.Fatalf("citation history changed: %s", row)
			}
		}
		acc := &Accumulator{}
		events := []Object{
			{"type": "message_start", "message": Object{"id": "msg_cite", "role": "assistant"}},
			{"type": "content_block_start", "index": 0, "content_block": Object{"type": "text", "text": "", "citations": []any{}}},
			{"type": "content_block_delta", "index": 0, "delta": Object{"type": "text_delta", "text": "answer"}},
			{"type": "content_block_delta", "index": 0, "delta": Object{"type": "citations_delta", "citation": citation}},
			{"type": "content_block_stop", "index": 0},
			{"type": "message_delta", "delta": Object{"stop_reason": "end_turn"}},
			{"type": "message_stop"},
		}
		for _, event := range events {
			before, _ := json.Marshal(event)
			if err := acc.push(event, &Request{}); err != nil {
				t.Fatal(err)
			}
			after, _ := json.Marshal(event)
			if !bytes.Equal(before, after) {
				t.Fatal("citation SSE event changed")
			}
		}
		if !reflect.DeepEqual(acc.Blocks[0]["citations"], []any{citation}) {
			t.Fatal("citation delta lost")
		}
	}
	for _, v := range []any{[]any{nil}, []any{Object{}}, "invalid", 1} {
		if checkCitations(v) == nil {
			t.Fatal("malformed envelope accepted")
		}
	}
}

func TestCompleteRefusalIsNormalWithoutNativeHistory(t *testing.T) {
	cli, err := lifecycleTestExecutable()
	if err != nil {
		t.Fatal(err)
	}
	for _, structured := range []bool{false, true} {
		dir := t.TempDir()
		runner := &Runner{CLI: cli, Env: envWith(os.Environ(), map[string]string{"CCG_TEST_CLI_TAIL": "refusal", "CLAUDE_CONFIG_DIR": filepath.Join(dir, "config")})}
		req := parsed(t, basic())
		if structured {
			req.JSONSchema = Object{"type": "object"}
		}
		p := &Prepared{Work: dir, SessionID: uuid(), InputUUID: uuid()}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		var events []Object
		answer, err := runner.run(ctx, req, p, dir, func(e Object) error { events = append(events, e); return nil })
		cancel()
		if err != nil {
			t.Fatal(err)
		}
		if str(answer, "stop_reason") != "refusal" || len(p.NativeRows) != 0 {
			t.Fatal("refusal changed or checkpoint created")
		}
		if len(events) != 2 || str(events[1], "type") != "message_delta" {
			t.Fatalf("wrong refusal stream: %#v", events)
		}
		detailJSON, _ := json.Marshal(answer["stop_details"])
		details, detailErr := decodeObject(detailJSON)
		if detailErr != nil || !reflect.DeepEqual(details, Object{"type": "refusal", "category": "cyber", "explanation": "fixture refusal"}) {
			t.Fatal("refusal detail lost")
		}
	}
}

func TestHTTPRefusalReturns200WithoutErrorEvent(t *testing.T) {
	cli, err := lifecycleTestExecutable()
	if err != nil {
		t.Fatal(err)
	}
	for _, stream := range []bool{false, true} {
		dir := t.TempDir()
		cache, err := newCache(filepath.Join(dir, "cache"), 8<<20)
		if err != nil {
			t.Fatal(err)
		}
		g := &Gateway{Runner: &Runner{CLI: cli, Env: envWith(os.Environ(), map[string]string{"CCG_TEST_CLI_TAIL": "refusal", "CLAUDE_CONFIG_DIR": filepath.Join(dir, "config")})}, Cache: cache, Timeout: 5 * time.Second, Slots: make(chan struct{}, 1)}
		v := basic()
		v["stream"] = stream
		body, _ := json.Marshal(v)
		w := httptest.NewRecorder()
		g.ServeHTTP(w, httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(body)))
		if w.Code != 200 || strings.Contains(w.Body.String(), `"type":"error"`) || !strings.Contains(w.Body.String(), `"stop_reason":"refusal"`) {
			t.Fatalf("stream=%v: %d %s", stream, w.Code, w.Body.String())
		}
		if stream && strings.Count(w.Body.String(), "event: message_stop\n") != 1 {
			t.Fatal("missing or duplicate final message_stop")
		}
	}
}
