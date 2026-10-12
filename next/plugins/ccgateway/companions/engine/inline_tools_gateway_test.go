package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync/atomic"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRealCLINativeRefusesInlineToolTimeline(t *testing.T) {
	var calls atomic.Int32
	endpoint, _ := newThinkingOutputFixture(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		calls.Add(1)
		w.WriteHeader(http.StatusInternalServerError)
	}))
	definition := Object{"name": "lookup", "input_schema": Object{"type": "object"}}
	for _, byValue := range []bool{false, true} {
		for _, removal := range []bool{false, true} {
			for _, stream := range []bool{false, true} {
				t.Run(fmt.Sprintf("definition=%t/removal=%t/stream=%t", byValue, removal, stream), func(t *testing.T) {
					target := Object{"type": "tool_reference", "name": "lookup"}
					base := []any{definition}
					if byValue {
						target = Object{"type": "tool_definition", "definition": definition}
						base = []any{}
					}
					messages := []any{user("use lookup"), Object{"role": "system", "content": []any{Object{"type": "tool_addition", "tool": target}}}}
					if removal {
						messages = append(messages, Object{"role": "assistant", "content": "done"}, user("continue"), Object{"role": "system", "content": []any{Object{"type": "tool_removal", "tool": Object{"type": "tool_reference", "name": "lookup"}}}})
					}
					raw, err := json.Marshal(Object{"model": "claude-opus-5-5", "max_tokens": 32, "stream": stream, "tools": base, "messages": messages})
					require.NoError(t, err)
					req, err := http.NewRequest(http.MethodPost, endpoint+"/v1/messages", bytes.NewReader(raw))
					require.NoError(t, err)
					req.Header.Set("Content-Type", "application/json")
					req.Header.Set("Anthropic-Beta", "inline-tools-2026-09-15")
					res, err := http.DefaultClient.Do(req)
					require.NoError(t, err)
					defer res.Body.Close()
					out, err := io.ReadAll(res.Body)
					require.NoError(t, err)
					assert.Equal(t, http.StatusBadRequest, res.StatusCode, string(out))
					assert.Contains(t, string(out), "invalid_request_error")
					assert.Contains(t, string(out), "inline tool definitions is not supported")
					assert.Zero(t, calls.Load())
				})
			}
		}
	}
}
