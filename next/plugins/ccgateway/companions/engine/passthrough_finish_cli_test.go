package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
)

// passthroughFinishFixture is a worker behind the real CLI in relay
// passthrough; answer writes each upstream response.
func passthroughFinishFixture(t *testing.T, answer func(w http.ResponseWriter, body Object, round int32)) (post func(body Object, tracked bool) (int, string), calls *atomic.Int32) {
	calls = &atomic.Int32{}
	endpoint, identity := executionGatewayFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		answer(w, body, calls.Add(1))
	})
	post = func(body Object, tracked bool) (int, string) {
		raw, _ := json.Marshal(body)
		req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
		req.Header.Set("X-Api-Key", "worker-fixture")
		req.Header.Set(policyHeader, `{"relay_mode":"passthrough"}`)
		if tracked {
			req.Header.Set("Anthropic-Beta", "fallback-credit-2026-06-01")
			req.Header.Set(credits.TrackingHeader, "1")
			req.Header.Set(resources.PrincipalHeader, identity.PrincipalID)
			req.Header.Set(resources.GenerationHeader, identity.Generation)
		}
		response, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer response.Body.Close()
		out, _ := io.ReadAll(response.Body)
		return response.StatusCode, string(out)
	}
	return post, calls
}

// A credit-tracked run has no session persistence, so the CLI writes no
// transcript. In relay passthrough the completed response still reaches the
// client; the turn is not committed and the next one rebuilds (2026-10-10:
// every tracked request returned 502 "native transcript missing completed
// response" after the upstream had answered).
func TestRealCLIPassthroughCreditTracking(t *testing.T) {
	post, calls := passthroughFinishFixture(t, func(w http.ResponseWriter, body Object, round int32) {
		writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": fmt.Sprintf("TRACKED_%d", round)}})
	})
	messages := []any{Object{"role": "user", "content": "first"}}
	body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": true, "metadata": Object{"user_id": "passthrough-credit"}, "messages": messages}
	if status, out := post(body, true); status != 200 || !strings.Contains(out, "TRACKED_1") {
		t.Fatalf("first turn HTTP%d %s", status, out)
	}
	body["messages"] = append(messages, Object{"role": "assistant", "content": []any{Object{"type": "text", "text": "TRACKED_1"}}}, Object{"role": "user", "content": "second"})
	if status, out := post(body, true); status != 200 || !strings.Contains(out, "TRACKED_2") {
		t.Fatalf("second turn HTTP%d %s", status, out)
	}
	if calls.Load() != 2 {
		t.Fatalf("%d upstream requests", calls.Load())
	}
}

// Claude Code probes with a non-streaming max_tokens 1 request at startup. An
// empty response that stops at max_tokens is one the CLI does not record; the
// client still gets it as sent (2026-10-10: 502, the account then cooled down).
func TestRealCLIPassthroughMaxTokensStop(t *testing.T) {
	for _, tc := range []struct {
		stream bool
		text   string
	}{{true, ""}, {true, "Hel"}, {false, ""}, {false, "Hel"}} {
		stream, text := tc.stream, tc.text
		t.Run(fmt.Sprintf("stream=%v/text=%q", stream, text), func(t *testing.T) {
			post, calls := passthroughFinishFixture(t, func(w http.ResponseWriter, body Object, _ int32) {
				w.Header().Set("Content-Type", "text/event-stream")
				event := func(value Object) {
					data, _ := json.Marshal(value)
					fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(value, "type"), data)
				}
				event(Object{"type": "message_start", "message": Object{"id": "msg_max_tokens", "type": "message", "role": "assistant", "model": str(body, "model"), "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 8, "output_tokens": 1}}})
				if text != "" {
					event(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "text", "text": ""}})
					event(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "text_delta", "text": text}})
					event(Object{"type": "content_block_stop", "index": 0})
				}
				event(Object{"type": "message_delta", "delta": Object{"stop_reason": "max_tokens", "stop_sequence": nil}, "usage": Object{"output_tokens": 1}})
				event(Object{"type": "message_stop"})
			})
			body := Object{"model": "claude-fable-5-1", "max_tokens": 1, "stream": stream, "metadata": Object{"user_id": "passthrough-max-tokens"}, "messages": []any{Object{"role": "user", "content": "Hi"}}}
			status, out := post(body, false)
			if status != 200 || !strings.Contains(out, `"stop_reason":"max_tokens"`) || !strings.Contains(out, text) {
				t.Fatalf("HTTP%d %s", status, out)
			}
			if !stream && strings.Contains(out, "event:") || stream && !strings.Contains(out, "event: message_stop") {
				t.Fatalf("HTTP%d %s", status, out)
			}
			if calls.Load() != 1 {
				t.Fatalf("%d upstream requests", calls.Load())
			}
		})
	}
}
