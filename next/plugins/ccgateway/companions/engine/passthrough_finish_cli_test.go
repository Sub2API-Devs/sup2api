package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// passthroughFinishFixture runs the native CLI against an isolated provider;
// answer writes each upstream response.
func passthroughFinishFixture(t *testing.T, answer func(w http.ResponseWriter, body Object, round int32)) (post func(body Object, tracked bool) (int, string), calls *atomic.Int32) {
	t.Helper()
	calls = &atomic.Int32{}
	endpoint, identity := executionGatewayFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		raw, err := io.ReadAll(r.Body)
		if !assert.NoError(t, err) {
			return
		}
		body, err := decodeObject(raw)
		if !assert.NoError(t, err) {
			return
		}
		answer(w, body, calls.Add(1))
	})
	post = func(body Object, tracked bool) (int, string) {
		raw, err := json.Marshal(body)
		require.NoError(t, err)
		req, err := http.NewRequestWithContext(t.Context(), "POST", endpoint+"/v1/messages", bytes.NewReader(raw))
		require.NoError(t, err)
		req.Header.Set("X-Api-Key", "worker-fixture")
		req.Header.Set(policyHeader, `{"relay_mode":"native"}`)
		if tracked {
			req.Header.Set("Anthropic-Beta", "fallback-credit-2026-06-01")
			req.Header.Set(credits.TrackingHeader, "1")
			req.Header.Set(resources.PrincipalHeader, identity.PrincipalID)
			req.Header.Set(resources.GenerationHeader, identity.Generation)
		}
		response, err := http.DefaultClient.Do(req)
		require.NoError(t, err)
		defer response.Body.Close()
		out, err := io.ReadAll(response.Body)
		require.NoError(t, err)
		return response.StatusCode, string(out)
	}
	return post, calls
}

// A credit-tracked run has no session persistence. Its completed native
// response must still reach the client, and the next turn rebuilds.
func TestRealCLIPassthroughCreditTracking(t *testing.T) {
	post, calls := passthroughFinishFixture(t, func(w http.ResponseWriter, body Object, round int32) {
		writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": fmt.Sprintf("TRACKED_%d", round)}})
	})
	messages := []any{Object{"role": "user", "content": "first"}}
	body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": true, "metadata": Object{"user_id": "passthrough-credit"}, "messages": messages}
	status, out := post(body, true)
	require.Equal(t, 200, status, out)
	assert.Contains(t, out, "TRACKED_1")
	body["messages"] = append(messages, Object{"role": "assistant", "content": []any{Object{"type": "text", "text": "TRACKED_1"}}}, Object{"role": "user", "content": "second"})
	status, out = post(body, true)
	require.Equal(t, 200, status, out)
	assert.Contains(t, out, "TRACKED_2")
	assert.Equal(t, int32(2), calls.Load())
}

// An empty max_tokens response may be absent from the CLI transcript; the
// native stream must still complete without inventing another model call.
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
					data, err := json.Marshal(value)
					if assert.NoError(t, err) {
						_, err = fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(value, "type"), data)
						assert.NoError(t, err)
					}
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
			require.Equal(t, 200, status, out)
			assert.Contains(t, out, `"stop_reason":"max_tokens"`)
			assert.Contains(t, out, text)
			var message Object
			if stream {
				assert.Equal(t, 1, strings.Count(out, "event: message_stop"))
				message = replaySSE(t, out)
			} else {
				assert.NotContains(t, out, "event:")
				var err error
				message, err = decodeObject([]byte(out))
				require.NoError(t, err)
			}
			usage, ok := message["usage"].(Object)
			require.True(t, ok)
			assert.Equal(t, "8", fmt.Sprint(usage["input_tokens"]))
			assert.Equal(t, "1", fmt.Sprint(usage["output_tokens"]))
			assert.Equal(t, int32(1), calls.Load())
		})
	}
}
