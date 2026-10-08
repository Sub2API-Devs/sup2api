package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
)

func thinkingFixtureEvents(thinking, signature string) []Object {
	return []Object{
		{"type": "message_start", "message": Object{"id": "thinking_fixture", "type": "message", "role": "assistant", "model": "fixture", "content": []any{}, "usage": Object{"input_tokens": 2}}},
		{"type": "content_block_start", "index": 0, "content_block": Object{"type": "thinking", "thinking": thinking, "signature": signature}},
		{"type": "content_block_stop", "index": 0},
		{"type": "message_delta", "delta": Object{"stop_reason": "end_turn"}, "usage": Object{"output_tokens": 3}},
		{"type": "message_stop"},
	}
}
func thinkingEventData(raw []byte) [][]byte {
	var out [][]byte
	for _, line := range strings.Split(string(raw), "\n") {
		if strings.HasPrefix(line, "data:") {
			out = append(out, []byte(strings.TrimSpace(line[5:])))
		}
	}
	return out
}
func TestInitialThinkingCarrierPreservesOriginalSource(t *testing.T) {
	for _, values := range [][2]string{{"initial 中文\t", "opaque-signature+/="}, {"initial", ""}, {"", "opaque"}, {"", ""}} {
		t.Run(values[0]+"/"+values[1], func(t *testing.T) {
			relay := &outboundRelay{}
			var raw []byte
			for _, e := range thinkingFixtureEvents(values[0], values[1]) {
				raw = append(raw, mcpCarrierEvent(e)...)
			}
			request := httptest.NewRequest("POST", "http://fixture/v1/messages", nil)
			var observed []byte
			body := &sseWatch{body: io.NopCloser(bytes.NewReader(raw)), relay: relay, request: request, ignoreErrors: true, observe: func(e []byte) { observed = append(observed, e...) }}
			response := &http.Response{Header: http.Header{"Content-Length": []string{strconv.Itoa(len(raw))}}, Body: body, Request: request, ContentLength: int64(len(raw)), TransferEncoding: []string{"chunked"}}
			if e := relay.bridgeInitialThinking(response); e != nil {
				t.Fatal(e)
			}
			out, e := io.ReadAll(response.Body)
			response.Body.Close()
			if e != nil {
				t.Fatal(e)
			}
			if !bytes.Equal(observed, raw) {
				t.Fatal("source observer saw transformed stream")
			}
			original, e := credits.MessageFromEvents(thinkingEventData(raw))
			if e != nil {
				t.Fatal(e)
			}
			normalized, e := credits.MessageFromEvents(thinkingEventData(out))
			if e != nil {
				t.Fatal(e)
			}
			a, _ := decodeObject(original)
			b, _ := decodeObject(normalized)
			if digest(a) != digest(b) {
				t.Fatal("logical response changed")
			}
			if response.ContentLength != -1 || response.Header.Get("Content-Length") != "" || len(response.TransferEncoding) != 0 {
				t.Fatal("stale byte framing")
			}
		})
	}
}
func TestInitialThinkingCarrierNarrowAndTruncated(t *testing.T) {
	for _, event := range []Object{{"type": "content_block_start", "index": 0, "content_block": Object{"type": "redacted_thinking", "data": "opaque"}}, {"type": "content_block_start", "index": 0, "content_block": Object{"type": "text", "text": "unchanged"}}, {"type": "future_event", "field": true}, {"type": "error", "error": Object{"type": "overloaded_error", "message": "fixture"}}} {
		raw := mcpCarrierEvent(event)
		got, e := initialThinkingEvent(raw)
		if e != nil || !bytes.Equal(got, raw) {
			t.Fatal("unrelated frame changed", e)
		}
	}
	for _, value := range []any{nil, 7, true, Object{}} {
		event := thinkingFixtureEvents("a", "b")[1]
		event["content_block"].(Object)["signature"] = value
		if _, e := initialThinkingEvent(mcpCarrierEvent(event)); e == nil {
			t.Fatal("invalid signature accepted")
		}
	}
	relay := &outboundRelay{}
	request := httptest.NewRequest("POST", "http://fixture", nil)
	raw := mcpCarrierEvent(thinkingFixtureEvents("a", "b")[1])
	raw = raw[:len(raw)-2]
	response := &http.Response{Header: http.Header{}, Body: io.NopCloser(bytes.NewReader(raw)), Request: request}
	relay.bridgeInitialThinking(response)
	out, e := io.ReadAll(response.Body)
	if e == nil || bytes.Contains(out, []byte("message_stop")) || relay.UpstreamError() == nil {
		t.Fatal("incomplete frame manufactured success", e)
	}
}

func TestInitialThinkingKeepsStartExtensions(t *testing.T) {
	event := thinkingFixtureEvents("a", "sig")[1]
	event["content_block"].(Object)["future_additive_metadata"] = Object{"n": json.Number("9007199254740993")}
	out, e := initialThinkingEvent(mcpCarrierEvent(event))
	if e != nil || !bytes.Contains(out, []byte("9007199254740993")) {
		t.Fatal("start extension changed", e)
	}
}

func TestInitialThinkingAllowsSignatureDeliveredLater(t *testing.T) {
	event := thinkingFixtureEvents("", "")[1]
	delete(event["content_block"].(Object), "signature")
	raw := mcpCarrierEvent(event)
	out, e := initialThinkingEvent(raw)
	if e != nil || !bytes.Equal(raw, out) {
		t.Fatal("normal empty thinking start changed", e)
	}
	event["content_block"].(Object)["thinking"] = "initial"
	out, e = initialThinkingEvent(mcpCarrierEvent(event))
	if e != nil || !bytes.Contains(out, []byte("thinking_delta")) || bytes.Contains(out, []byte("signature_delta")) {
		t.Fatal("missing signature fabricated", e)
	}
}

func TestRealCLIInitialThinkingWithReplacementSignature(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(strconv.FormatBool(stream), func(t *testing.T) {
			calls := 0
			endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					w.Write([]byte(`{"input_tokens":1}`))
					return
				}
				calls++
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				if calls == 2 {
					found := false
					for _, value := range body["messages"].([]any) {
						message, _ := value.(Object)
						blocks, _ := historyContent(message["content"])
						for _, b := range blocks {
							if str(b, "type") == "thinking" {
								found = true
								if str(b, "signature") != "final-signature" || str(b, "thinking") != "initialtail" {
									t.Errorf("history thinking/signature changed: %v", b)
								}
							}
						}
					}
					if !found {
						t.Error("thinking history missing")
					}
				}
				events := thinkingFixtureEvents("initial", "initial-signature")
				events[0]["message"].(Object)["model"] = body["model"]
				events[0]["message"].(Object)["id"] = "msg_" + uuid()
				replacement := []Object{{"type": "content_block_delta", "index": 0, "delta": Object{"type": "thinking_delta", "thinking": "tail"}}, {"type": "content_block_delta", "index": 0, "delta": Object{"type": "signature_delta", "signature": "first-signature"}}, {"type": "content_block_delta", "index": 0, "delta": Object{"type": "signature_delta", "signature": "final-signature"}}}
				expanded := append(append(append([]Object{}, events[:2]...), replacement...), events[2:]...)
				extra := []Object{{"type": "content_block_start", "index": 1, "content_block": Object{"type": "text", "text": ""}}, {"type": "content_block_delta", "index": 1, "delta": Object{"type": "text_delta", "text": "ready"}}, {"type": "content_block_stop", "index": 1}}
				expanded = append(append(append([]Object{}, expanded[:len(expanded)-2]...), extra...), expanded[len(expanded)-2:]...)
				w.Header().Set("Content-Type", "text/event-stream")
				for _, event := range expanded {
					rawEvent, _ := json.Marshal(event)
					fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), rawEvent)
				}
			})
			messages := []any{Object{"role": "user", "content": "synthetic signature fixture"}}
			for turn := 0; turn < 2; turn++ {
				body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "thinking": Object{"type": "adaptive"}, "messages": messages}
				raw, _ := json.Marshal(body)
				response, err := http.Post(endpoint+"/v1/messages", "application/json", bytes.NewReader(raw))
				if err != nil {
					t.Fatal(err)
				}
				data, _ := io.ReadAll(response.Body)
				response.Body.Close()
				if response.StatusCode != 200 {
					t.Fatalf("status%d %s", response.StatusCode, data)
				}
				if stream {
					data, err = credits.MessageFromEvents(thinkingEventData(data))
					if err != nil {
						t.Fatal(err)
					}
				}
				answer, err := decodeObject(data)
				if err != nil {
					t.Fatal(err)
				}
				blocks, _ := historyContent(answer["content"])
				if len(blocks) != 2 || str(blocks[0], "thinking") != "initialtail" || str(blocks[0], "signature") != "final-signature" {
					t.Fatalf("final logical content changed: %s", data)
				}
				messages = append(messages, Object{"role": "assistant", "content": answer["content"]}, Object{"role": "user", "content": "continue fixture"})
			}
			if calls != 2 {
				t.Fatalf("unexpected calls %d", calls)
			}
		})
	}
}
