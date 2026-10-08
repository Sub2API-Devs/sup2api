package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync/atomic"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestRealCLIHelperHistoryPartialUsage(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			var calls atomic.Int32
			handler := func(w http.ResponseWriter, r *http.Request) {
				_, _ = io.Copy(io.Discard, r.Body)
				n := calls.Add(1)
				if n == 1 {
					writeInternalCacheFixture(w, "claude-opus-5-5", []Object{{"type": "tool_use", "id": "partial_helper", "name": "ToolSearch", "input": Object{"query": "select:mcp__ccgateway__weather"}}})
					return
				}
				if n > 2 {
					w.WriteHeader(400)
					_, _ = io.WriteString(w, `{"type":"error","error":{"type":"invalid_request_error","message":"fixture forbids retry"}}`)
					return
				}
				w.Header().Set("Content-Type", "text/event-stream")
				_, _ = io.WriteString(w, "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"id\":\"msg_partial\",\"type\":\"message\",\"role\":\"assistant\",\"model\":\"claude-opus-5-5\",\"content\":[],\"usage\":{\"input_tokens\":17,\"output_tokens\":0}}}\n\n")
				// Deliberate EOF, no fabricated terminal or usage completion.
			}
			endpoint, id := helperHistoryGatewayFixture(t, handler)
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "messages": []any{Object{"role": "user", "content": "public partial usage fixture"}}, "tools": []any{Object{"name": "weather", "defer_loading": true, "input_schema": Object{"type": "object"}}}}
			raw, _ := json.Marshal(body)
			hash, _ := helperhistory.CanonicalDigest(raw)
			policy := json.RawMessage(`{"pass_upstream_errors":true}`)
			ns, _ := helperhistory.Namespace("claude-opus-5-5", "2.1.292", policy)
			envelope := helperhistory.RequestEnvelope{Version: 1, AttemptID: uuid(), RequestDigest: hash, Namespace: ns, Identity: id, Request: raw}
			data, _ := json.Marshal(envelope)
			req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(data))
			req.Header.Set(helperhistory.Header, "1")
			req.Header.Set("X-CCGateway-Request-Policy", string(policy))
			res, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatal(err)
			}
			data, _ = io.ReadAll(res.Body)
			res.Body.Close()
			if res.StatusCode != 200 {
				t.Fatalf("outer HTTP%d %s", res.StatusCode, data)
			}
			answer, err := helperhistory.DecodeResponse(data)
			if err != nil {
				t.Fatalf("%v %s", err, data)
			}
			a := answer.Accounting
			if answer.StatusCode < 400 || a == nil || a.Source != helperhistory.AccountingProviderCalls || !a.Known || a.Complete || len(a.Calls) != 2 || !a.Calls[0].Complete || a.Calls[1].Complete {
				t.Fatalf("partial provider facts lost status%d accounting%+v", answer.StatusCode, a)
			}
			if calls.Load() != 2 {
				t.Fatal("unexpected retry", calls.Load())
			}
			if !bytes.Contains(a.Calls[0].Frames[0], []byte(`"input_tokens":20`)) || !bytes.Contains(a.Calls[1].Frames[0], []byte(`"input_tokens":17`)) {
				t.Fatal("observed call usage overwritten")
			}
		})
	}
}
