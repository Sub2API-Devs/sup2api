package engine

import (
	"bytes"
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

func TestRealCLINativeInternalRoundsUsage(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			var calls atomic.Int32
			handler := func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				round := calls.Add(1)
				raw, err := io.ReadAll(r.Body)
				require.NoError(t, err)
				wire, err := decodeObject(raw)
				require.NoError(t, err)
				if round < 3 {
					id := fmt.Sprintf("toolu_native_discovery_%d", round)
					writeInternalCacheFixture(w, str(wire, "model"), []Object{{"type": "tool_use", "id": id, "name": "ToolSearch", "input": Object{"query": "select:mcp__ccgateway__weather"}}})
					return
				}
				messages, err := json.Marshal(wire["messages"])
				require.NoError(t, err)
				assert.Contains(t, string(messages), "toolu_native_discovery_1")
				assert.Contains(t, string(messages), "toolu_native_discovery_2")
				assert.Contains(t, string(messages), "tool_reference")
				writeInternalCacheFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "NATIVE_ROUNDS_DONE"}})
			}
			endpoint, _ := newThinkingOutputFixture(t, http.HandlerFunc(handler))
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream,
				"tools":    []any{Object{"name": "weather", "defer_loading": true, "input_schema": Object{"type": "object"}}},
				"messages": []any{user("look up weather")}}
			raw, err := json.Marshal(body)
			require.NoError(t, err)
			res, err := http.Post(endpoint+"/v1/messages", "application/json", bytes.NewReader(raw))
			require.NoError(t, err)
			defer res.Body.Close()
			out, err := io.ReadAll(res.Body)
			require.NoError(t, err)
			require.Equal(t, http.StatusOK, res.StatusCode, string(out))
			assert.EqualValues(t, 3, calls.Load())
			assert.Contains(t, string(out), "NATIVE_ROUNDS_DONE")
			assert.NotContains(t, string(out), "toolu_native_discovery_")
			assert.Contains(t, string(out), `"input_tokens":60`)
			assert.Contains(t, string(out), `"output_tokens":24`)
			if stream {
				assert.Equal(t, 1, strings.Count(string(out), "event: message_stop"))
			}
		})
	}
}

func writeInternalCacheFixture(w http.ResponseWriter, model string, blocks []Object) {
	rec := httptest.NewRecorder()
	writeSurfaceFixture(rec, model, blocks)
	w.Header().Set("Content-Type", "text/event-stream")
	_, _ = w.Write(bytes.ReplaceAll(rec.Body.Bytes(), []byte("msg_surface_probe"), []byte("msg_"+uuid())))
}
