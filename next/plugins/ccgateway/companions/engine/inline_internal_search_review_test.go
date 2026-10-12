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

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRealCLIReviewNativeToolDiscovery(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			var calls atomic.Int32
			alpha := Object{"name": "alpha", "defer_loading": true, "input_schema": Object{"type": "object", "properties": Object{"n": Object{"type": "string", "const": "9007199254740993"}}}}
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "tools": []any{alpha}, "messages": []any{user("search and call alpha")}}
			handler := http.HandlerFunc(func(w http.ResponseWriter, h *http.Request) {
				if !strings.HasSuffix(h.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				calls.Add(1)
				raw, err := io.ReadAll(h.Body)
				require.NoError(t, err)
				wire, err := decodeObject(raw)
				require.NoError(t, err)
				tools, err := historyContent(wire["tools"])
				require.NoError(t, err)
				found := false
				for _, tool := range tools {
					if str(tool, "name") == "mcp__ccgateway__alpha" {
						found = true
						assert.Equal(t, digest(alpha["input_schema"]), digest(tool["input_schema"]))
					}
				}
				msgs, err := json.Marshal(wire["messages"])
				require.NoError(t, err)
				if !bytes.Contains(msgs, []byte("review_search")) {
					writeInternalCacheFixture(w, str(wire, "model"), []Object{{"type": "tool_use", "id": "review_search", "name": "ToolSearch", "input": Object{"query": "select:mcp__ccgateway__alpha"}}})
					return
				}
				assert.True(t, found, "discovered tool missing")
				assert.Contains(t, string(msgs), "tool_reference")
				writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "tool_use", "id": "review_alpha_call", "name": "mcp__ccgateway__alpha", "input": Object{"n": "9007199254740993"}}})
			})
			endpoint, _ := newThinkingOutputFixture(t, handler)
			raw, err := json.Marshal(body)
			require.NoError(t, err)
			p := defaultRequestPolicy()
			p.ToolSearch = "true"
			req, err := http.NewRequestWithContext(t.Context(), "POST", endpoint+"/v1/messages", bytes.NewReader(raw))
			require.NoError(t, err)
			req.Header = policyHeaders(p)
			res, err := http.DefaultClient.Do(req)
			require.NoError(t, err)
			defer res.Body.Close()
			out, err := io.ReadAll(res.Body)
			require.NoError(t, err)
			require.Equal(t, http.StatusOK, res.StatusCode, string(out))
			assert.Contains(t, string(out), "review_alpha_call")
			assert.Contains(t, string(out), "9007199254740993")
			assert.NotContains(t, string(out), "review_search")
			assert.EqualValues(t, 2, calls.Load())
		})
	}
}
