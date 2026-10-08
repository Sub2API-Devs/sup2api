package engine

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func bootstrapNativeFixture(t *testing.T) (string, *Prepared, *Request, []Object) {
	t.Helper()
	p := &Prepared{SessionID: uuid(), InputUUID: uuid(), Work: t.TempDir()}
	r := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "public"}}}}}
	rows := []Object{{"type": "user", "uuid": p.InputUUID, "sessionId": p.SessionID, "cwd": p.Work, "version": "2.1.292", "parentUuid": nil, "message": Object{"role": "user", "content": []Object{{"type": "text", "text": "public"}}}}, {"type": "attachment", "uuid": uuid(), "parentUuid": p.InputUUID, "sessionId": p.SessionID, "cwd": p.Work, "version": "2.1.292", "attachment": Object{"type": "auto_mode"}}}
	return filepath.Join(t.TempDir(), "native.jsonl"), p, r, rows
}
func writeBootstrapFixture(t *testing.T, path string, rows []Object) {
	t.Helper()
	var data []json.RawMessage
	for _, row := range rows {
		data = append(data, mustMCPJSON(row))
	}
	if err := os.WriteFile(path, nativeBytes(data), 0600); err != nil {
		t.Fatal(err)
	}
}
func TestBootstrapNativePrefixRejectsUnprovenRows(t *testing.T) {
	for _, variant := range []string{"valid", "session", "cwd", "version", "user", "parent", "duplicate", "assistant", "too_large", "too_many"} {
		t.Run(variant, func(t *testing.T) {
			path, p, r, rows := bootstrapNativeFixture(t)
			switch variant {
			case "session":
				rows[1]["sessionId"] = uuid()
			case "cwd":
				rows[1]["cwd"] = "other"
			case "version":
				rows[1]["version"] = "other"
			case "user":
				rows[0]["message"].(Object)["content"] = "changed"
			case "parent":
				rows[1]["parentUuid"] = uuid()
			case "duplicate":
				rows[1]["uuid"] = p.InputUUID
			case "assistant":
				rows = append(rows, Object{"type": "assistant"})
			case "too_large":
				rows[1]["attachment"].(Object)["data"] = strings.Repeat("x", 4<<20)
			case "too_many":
				for len(rows) < 129 {
					rows = append(rows, Object{"type": "queue-operation"})
				}
			}
			writeBootstrapFixture(t, path, rows)
			_, err := readBootstrapPrefix(path, p, r, "2.1.292")
			if (err == nil) != (variant == "valid") {
				t.Fatalf("variant %s err %v", variant, err)
			}
		})
	}
}
func TestBootstrapAllRoutesStayLocal(t *testing.T) {
	for _, path := range []string{"/messages", "/messages/count_tokens", "/classify", "/files", "/unknown"} {
		t.Run(path, func(t *testing.T) {
			b := &continuationBootstrap{ready: make(chan struct{})}
			relay := &outboundRelay{path: "/fixture", bootstrap: b}
			forwarded := 0
			handler := relay.handler(&Request{}, http.HandlerFunc(func(http.ResponseWriter, *http.Request) { forwarded++ }))
			handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("POST", "http://localhost/fixture"+path, strings.NewReader(`{}`)))
			if forwarded != 0 {
				t.Fatal("bootstrap escaped to provider")
			}
			select {
			case <-b.ready:
				t.Fatal("unattributed request captured")
			default:
			}
		})
	}
}
func TestBootstrapCancelledPrefixWait(t *testing.T) {
	path, p, r, _ := bootstrapNativeFixture(t)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	start := time.Now()
	if _, err := waitBootstrapPrefix(ctx, filepath.Dir(path), p, r, "2.1.292"); err == nil {
		t.Fatal("cancel ignored")
	}
	if time.Since(start) > time.Second {
		t.Fatal("cancel blocked")
	}
}
func TestBootstrapLimitedToSimpleServerPause(t *testing.T) {
	body := webTestBody("web_search_20250305")
	body["model"] = "claude-sonnet-4-6"
	body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": []Object{webFixture("web_search")[0]}})
	req, err := parseRequest(mustMCPJSON(body))
	if err != nil {
		t.Fatal(err)
	}
	p := &Prepared{Mode: "rebuild"}
	if !req.needsContinuationBootstrap(p) {
		t.Fatal("simple pause not eligible")
	}
	for _, variant := range []string{"other_model", "prefill", "credit", "resource", "toolsearch", "inline", "signed_history"} {
		t.Run(variant, func(t *testing.T) {
			r := *req
			r.Messages = append([]Message(nil), req.Messages...)
			switch variant {
			case "other_model":
				r.Model = "alias"
			case "prefill":
				r.Messages[1] = Message{Role: "assistant", Content: []Object{{"type": "text", "text": "prefill"}}}
			case "credit":
				r.credit = &creditExecution{}
			case "resource":
				r.resources = &resourceAdmission{}
			case "toolsearch":
				r.ToolSearch = "true"
			case "inline":
				r.InlineTools = &inlineToolTimeline{}
			case "signed_history":
				r.Messages[0].Content = []Object{{"type": "thinking", "thinking": "opaque", "signature": "opaque"}}
			}
			if r.needsContinuationBootstrap(p) {
				t.Fatal("complex combination admitted")
			}
		})
	}
}

func TestMixedPauseRestorationIsExactAndAtomic(t *testing.T) {
	for _, variant := range []string{"valid", "text_changed", "prefix_changed", "completed_missing", "unknown_extra", "wrong_pending_id"} {
		t.Run(variant, func(t *testing.T) {
			b := webTestBody("web_search_20250305")
			b["model"] = "claude-sonnet-4-6"
			old := webFixture("web_search")
			old[0]["id"] = "old"
			old[1]["tool_use_id"] = "old"
			pending := webFixture("web_search")[0]
			tail := []Object{old[0], old[1], {"type": "text", "text": "pending"}, pending}
			b["messages"] = append(b["messages"].([]any), Object{"role": "assistant", "content": tail})
			req, err := parseRequest(mustMCPJSON(b))
			if err != nil {
				t.Fatal(err)
			}
			actual := append([]Object(nil), tail[:3]...)
			switch variant {
			case "text_changed":
				actual[2] = Object{"type": "text", "text": "changed"}
			case "completed_missing":
				actual = actual[1:]
			case "unknown_extra":
				actual = append(actual, Object{"type": "text", "text": "unknown"})
			case "wrong_pending_id":
				v, _ := jsonCopyObject(pending)
				v["id"] = "other"
				actual = append(actual, v)
			}
			first := req.wireMessage(req.Messages[0])
			messages := []any{Object{"role": first.Role, "content": first.Content}, Object{"role": "assistant", "content": actual}}
			if variant == "prefix_changed" {
				messages[0].(Object)["content"] = []Object{{"type": "text", "text": "different"}}
			}
			body := Object{"messages": messages}
			before := digest(body)
			err = req.restoreContinuationTail(body)
			if variant == "valid" {
				if err != nil {
					t.Fatal(err)
				}
				if digest(messages[1].(Object)["content"]) != digest(tail) {
					t.Fatal("restored tail changed")
				}
				return
			}
			if err == nil {
				t.Fatal("unproven omission accepted")
			}
			if digest(body) != before {
				t.Fatal("failure mutated history")
			}
		})
	}
}
