package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRealCLIEmptyInputDeltaRoundtrip(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			handler := func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				wire, _ := decodeObject(raw)
				messages, _ := json.Marshal(wire["messages"])
				blocks := []Object{{"type": "tool_use", "id": "tool_empty_args", "name": "mcp__ccgateway__lookup_fixture", "input": Object{}, "caller": Object{"type": "direct"}}}
				if bytes.Contains(messages, []byte("tool_result")) {
					blocks = []Object{{"type": "text", "text": "EMPTY_ARGS_DONE"}}
				}
				rec := httptest.NewRecorder()
				writeSurfaceFixture(rec, str(wire, "model"), blocks)
				data := bytes.ReplaceAll(rec.Body.Bytes(), []byte("msg_surface_probe"), []byte("msg_"+uuid()))
				if str(blocks[0], "type") == "tool_use" {
					extra := []byte("event: ping\ndata: {\"type\":\"ping\"}\n\nevent: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"input_json_delta\",\"partial_json\":\"\"}}\n\n")
					data = bytes.Replace(data, []byte("event: content_block_stop"), append(extra, []byte("event: content_block_stop")...), 1)
				}
				w.Header().Set("Content-Type", "text/event-stream")
				w.Write(data)
			}
			endpoint, _ := newThinkingOutputFixture(t, handler)
			user := Object{"role": "user", "content": "invoke lookup fixture"}
			body := Object{"model": "claude-opus-5-5", "max_tokens": 64, "stream": stream, "tools": []any{Object{"name": "lookup_fixture", "input_schema": Object{"type": "object", "properties": Object{}}}}, "messages": []any{user}}
			post := func(url, expected string) {
				t.Helper()
				raw, _ := json.Marshal(body)
				resp, err := http.Post(url+"/v1/messages", "application/json", bytes.NewReader(raw))
				if err != nil {
					t.Fatal(err)
				}
				out, _ := io.ReadAll(resp.Body)
				resp.Body.Close()
				if resp.StatusCode != 200 || !bytes.Contains(out, []byte(expected)) {
					t.Fatalf("HTTP%d %s", resp.StatusCode, out)
				}
			}
			post(endpoint, "tool_empty_args")
			body["messages"] = []any{user, Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "tool_empty_args", "name": "lookup_fixture", "input": Object{}, "caller": Object{"type": "direct"}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "tool_empty_args", "content": "done"}}}}
			post(endpoint, "EMPTY_ARGS_DONE")
			cold, _ := newThinkingOutputFixture(t, handler)
			post(cold, "EMPTY_ARGS_DONE")
			body["messages"] = []any{user}
			post(endpoint, "tool_empty_args")
		})
	}
}
