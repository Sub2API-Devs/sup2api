package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
)

func nestedWebReviewBlocks() []Object {
	caller := Object{"type": "code_execution_20260120", "tool_id": "srv_exec"}
	return []Object{
		{"type": "server_tool_use", "id": "srv_exec", "name": "code_execution", "input": Object{}},
		{"type": "server_tool_use", "id": "srv_web", "name": "web_search", "input": Object{"query": "fixture"}, "caller": caller},
		{"type": "web_search_tool_result", "tool_use_id": "srv_web", "caller": caller, "content": []any{}},
		codeResultFixture("code_execution_tool_result", "code_execution_result"),
		{"type": "text", "text": "NESTED_DONE"},
	}
}
func TestReviewNestedServerCallerCausality(t *testing.T) {
	blocks := nestedWebReviewBlocks()
	if err := checkWebResult(blocks[2]); err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name   string
		blocks []Object
		fail   bool
	}{
		{"valid", blocks, false},
		{"orphan", blocks[1:], true},
		{"early-parent-result", []Object{blocks[0], blocks[1], blocks[3]}, true},
		{"mismatched-result", []Object{blocks[0], blocks[1], {"type": "web_search_tool_result", "tool_use_id": "srv_web", "caller": Object{"type": "code_execution_20260120", "tool_id": "other"}, "content": []any{}}}, true},
		{"missing-result-caller", []Object{blocks[0], blocks[1], {"type": "web_search_tool_result", "tool_use_id": "srv_web", "content": []any{}}}, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			l := newPTCLedger()
			var err error
			for _, b := range tc.blocks {
				if err = l.assistant(b); err != nil {
					break
				}
			}
			if (err != nil) != tc.fail {
				t.Fatalf("err=%v expected failure %v", err, tc.fail)
			}
		})
	}
}
func TestRealCLIReviewNestedServerCaller(t *testing.T) {
	blocks := nestedWebReviewBlocks()
	var calls atomic.Int32
	endpoint, identity := executionGatewayFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		calls.Add(1)
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		messages, _ := body["messages"].([]any)
		if len(messages) > 1 {
			for _, b := range blocks {
				if !messageProbeContainsBlock(body, b) {
					t.Errorf("history block %s changed", str(b, "type"))
				}
			}
			writeExecutionFixture(w, str(body, "model"), []Object{{"type": "text", "text": "CONTINUED"}})
			return
		}
		writeExecutionFixture(w, str(body, "model"), blocks)
	})
	initial := []any{Object{"role": "user", "content": "nested fixture"}}
	history := []any{initial[0], Object{"role": "assistant", "content": blocks}, Object{"role": "user", "content": "continue"}}
	for _, tc := range []struct {
		session  string
		messages []any
		stream   bool
	}{{"nested", initial, false}, {"nested", history, false}, {"cold", history, false}, {"nested", initial, false}, {"sse", initial, true}} {
		raw, _ := json.Marshal(Object{"model": "claude-opus-5-5", "max_tokens": 128, "tools": []any{Object{"type": "web_search_20260209", "name": "web_search"}}, "messages": tc.messages, "stream": tc.stream})
		req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
		req.Header.Set("X-Api-Key", "worker-fixture")
		req.Header.Set(resources.PrincipalHeader, identity.PrincipalID)
		req.Header.Set(resources.GenerationHeader, identity.Generation)
		req.Header.Set(resources.ResourceOutputsHeader, "1")
		req.Header.Set("X-CCGateway-Session-ID", tc.session)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		out, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if res.StatusCode != 200 {
			t.Fatalf("%d %s", res.StatusCode, out)
		}
		if tc.stream {
			if !bytes.Contains(out, []byte("event: message_stop")) || bytes.Contains(out, []byte("event: error")) {
				t.Fatalf("SSE %s", out)
			}
		} else if len(tc.messages) == 1 {
			answer, _ := decodeObject(out)
			if digest(answer["content"]) != digest(blocks) {
				t.Fatalf("changed %s", out)
			}
		}
	}
	if calls.Load() != 5 {
		t.Fatalf("calls=%d", calls.Load())
	}
}
