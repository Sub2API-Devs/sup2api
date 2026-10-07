package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"
)

func TestRealCLICaptureInternalToolSearchDefinition(t *testing.T) {
	captured := make(chan Object, 2)
	url, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		definitions, _ := body["tools"].([]any)
		for _, value := range definitions {
			definition, _ := value.(Object)
			if str(definition, "name") == "ToolSearch" {
				captured <- definition
			}
		}
		generationFixtureEvents(w, str(body, "model"), "end_turn", "CAPTURE_ONLY", false)
	})
	body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "messages": []any{Object{"role": "user", "content": "capture actual tool definition without calling any tools"}}, "tools": []any{Object{"name": "fixture_deferred", "description": "fixture", "defer_loading": true, "input_schema": Object{"type": "object"}}}}
	raw, _ := json.Marshal(body)
	res, err := (&http.Client{Timeout: 25 * time.Second}).Post(url+"/v1/messages", "application/json", bytes.NewReader(raw))
	if err != nil {
		t.Fatal(err)
	}
	out, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != 200 {
		t.Fatalf("%d %s", res.StatusCode, out)
	}
	select {
	case definition := <-captured:
		t.Logf("actual ToolSearch schema digest=%s", digest(definition["input_schema"]))
		if path := os.Getenv("CCG_TOOL_SEARCH_CAPTURE"); path != "" {
			data, _ := json.MarshalIndent(definition, "", "  ")
			if err := os.WriteFile(path, data, 0600); err != nil {
				t.Fatal(err)
			}
		}
	default:
		t.Fatal("CLI did not expose ToolSearch under deferred MCP discovery")
	}
}

func TestRealCLIClientNativeToolSearchStaysClientOwned(t *testing.T) {
	for _, format := range []bool{false, true} {
		t.Run(fmt.Sprint(format), func(t *testing.T) {
			calls := make(chan Object, 8)
			url, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				calls <- body
				history, _ := json.Marshal(body["messages"])
				if bytes.Contains(history, []byte("CLIENT_SEARCH_RESULT")) {
					generationFixtureEvents(w, str(body, "model"), "end_turn", `{"ok":true}`, false)
					return
				}
				w.Header().Set("Content-Type", "text/event-stream")
				send := func(event Object) {
					data, _ := json.Marshal(event)
					fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), data)
				}
				send(Object{"type": "message_start", "message": Object{"id": "msg_native_search", "type": "message", "role": "assistant", "model": body["model"], "content": []any{}, "stop_reason": nil, "usage": Object{"input_tokens": 2, "output_tokens": 0}}})
				send(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "tool_use", "id": "toolu_client_search", "name": "ToolSearch", "input": Object{}}})
				send(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "input_json_delta", "partial_json": `{"query":"select:fixture_deferred","max_results":5}`}})
				send(Object{"type": "content_block_stop", "index": 0})
				send(Object{"type": "message_delta", "delta": Object{"stop_reason": "tool_use"}, "usage": Object{"output_tokens": 4}})
				send(Object{"type": "message_stop"})
			})
			tool := verifiedNativeToolCatalogues["2.1.292"]["ToolSearch"][0]
			body := Object{"model": "claude-opus-5-5", "max_tokens": 256, "messages": []any{Object{"role": "user", "content": "client owned native ToolSearch fixture"}}, "tools": []any{Object{"name": "ToolSearch", "description": "client owns this search", "input_schema": tool.Schema}, Object{"name": "fixture_deferred", "description": "fixture", "defer_loading": true, "input_schema": Object{"type": "object"}}}}
			if format {
				body["output_config"] = Object{"format": Object{"type": "json_schema", "schema": Object{"type": "object", "properties": Object{"ok": Object{"type": "boolean"}}, "required": []any{"ok"}, "additionalProperties": false}}}
			}
			post := func() (Object, http.Header) {
				t.Helper()
				raw, _ := json.Marshal(body)
				res, err := (&http.Client{Timeout: 25 * time.Second}).Post(url+"/v1/messages", "application/json", bytes.NewReader(raw))
				if err != nil {
					t.Fatal(err)
				}
				out, _ := io.ReadAll(res.Body)
				res.Body.Close()
				if res.StatusCode != 200 {
					t.Fatalf("%d %s", res.StatusCode, out)
				}
				answer, err := decodeObject(out)
				if err != nil {
					t.Fatal(err)
				}
				return answer, res.Header
			}
			answer, _ := post()
			if str(answer, "stop_reason") != "tool_use" || len(calls) != 1 {
				t.Fatal("native ToolSearch executed as internal discovery", answer, len(calls))
			}
			wire := <-calls
			definitions, _ := wire["tools"].([]any)
			native := false
			for _, value := range definitions {
				definition, _ := value.(Object)
				if str(definition, "name") == "ToolSearch" {
					native = true
				}
			}
			if !native {
				t.Fatal("runtime did not retain verified native name")
			}
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": answer["content"]}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_client_search", "content": "CLIENT_SEARCH_RESULT"}}})
			_, headers := post()
			if len(calls) != 1 {
				t.Fatal("tool result caused extra model requests")
			}
			if !format && headers.Get("X-CCGateway-History") != "prefix-hit" {
				t.Fatal("client native ToolSearch lost prefix history", headers)
			}
		})
	}
}
