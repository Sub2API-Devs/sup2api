package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestOrdinaryRefusalRequiresCompleteNativeMessage(t *testing.T) {
	req, err := parsePolicyRequest(mustServerJSON(basic()), nil)
	require.NoError(t, err)
	p := &Prepared{}
	session := newCLISession(context.Background(), req, p, &runConfig{native: &nativeRunState{}, control: &modControl{ready: true}}, nil, func(Object) error { return nil })
	session.initialized = true
	for _, event := range []Object{
		{"type": "message_start", "message": Object{"id": "msg_refusal", "type": "message", "role": "assistant", "content": []any{}, "usage": Object{"input_tokens": 1, "output_tokens": 0}}},
		{"type": "message_delta", "delta": Object{"stop_reason": "refusal"}, "usage": Object{"output_tokens": 0}},
	} {
		require.NoError(t, session.onStreamEvent(Object{"event": event}))
	}
	assert.False(t, session.acc.Done)
	_, err = session.onResult(Object{"subtype": "success"})
	require.ErrorContains(t, err, "without a complete model message")
	require.NoError(t, session.onStreamEvent(Object{"event": Object{"type": "message_stop"}}))
	assert.True(t, session.acc.Done)
	message, err := session.onResult(Object{"subtype": "success"})
	require.NoError(t, err)
	assert.Equal(t, "refusal", str(message, "stop_reason"))
	assert.Equal(t, "message_stop", str(p.finalResponseStop(), "type"))
	assert.False(t, session.cfg.native.canFallback())
}

func TestRealCLIOrdinaryRefusalIsSingleNormalResponse(t *testing.T) {
	for _, text := range []bool{false, true} {
		for _, stream := range []bool{false, true} {
			t.Run(fmt.Sprintf("text=%v/stream=%v", text, stream), func(t *testing.T) {
				var calls atomic.Int32
				handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if !strings.HasSuffix(r.URL.Path, "/messages") {
						fmt.Fprint(w, `{"input_tokens":20}`)
						return
					}
					calls.Add(1)
					raw, _ := io.ReadAll(r.Body)
					body, _ := decodeObject(raw)
					blocks := []Object{}
					if text {
						blocks = append(blocks, Object{"type": "text", "text": "refusal fixture"})
					}
					fixture := httptest.NewRecorder()
					writeSurfaceFixture(fixture, str(body, "model"), blocks)
					w.Header().Set("Content-Type", "text/event-stream")
					fmt.Fprint(w, strings.ReplaceAll(fixture.Body.String(), `"stop_reason":"end_turn"`, `"stop_reason":"refusal"`))
				})
				endpoint, _ := newThinkingOutputFixture(t, handler)
				body := Object{"model": "claude-opus-5-5", "max_tokens": 64, "stream": stream, "messages": []any{Object{"role": "user", "content": "refusal fixture"}}}
				raw, _ := json.Marshal(body)
				res, err := http.Post(endpoint+"/v1/messages", "application/json", bytes.NewReader(raw))
				if err != nil {
					t.Fatal(err)
				}
				out, _ := io.ReadAll(res.Body)
				res.Body.Close()
				if res.StatusCode != 200 || calls.Load() != 1 || !strings.Contains(string(out), `"stop_reason":"refusal"`) || strings.Contains(string(out), `"type":"error"`) {
					t.Fatalf("refusal changed/retried: HTTP%d calls%d %s", res.StatusCode, calls.Load(), out)
				}
				if stream && strings.Count(string(out), "event: message_stop") != 1 {
					t.Fatal("refusal stream did not end exactly once")
				}
			})
		}
	}
}
