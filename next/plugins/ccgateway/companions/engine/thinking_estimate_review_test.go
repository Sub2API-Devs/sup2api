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

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestRealCLIReviewHiddenThinkingEstimates(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			var calls atomic.Int32
			endpoint, identity := helperHistoryGatewayFixture(t, func(w http.ResponseWriter, r *http.Request) {
				raw, _ := io.ReadAll(r.Body)
				body, err := decodeObject(raw)
				if err != nil {
					t.Error(err)
					return
				}
				if calls.Add(1) == 1 {
					rec := httptest.NewRecorder()
					writeHelperHistoryFixture(rec, str(body, "model"), []Object{{"type": "thinking", "thinking": "", "signature": "fixture-estimate-signature"}, {"type": "tool_use", "id": "estimate-hidden", "name": "ToolSearch", "input": Object{"query": "select:mcp__ccgateway__weather"}}})
					w.Header().Set("Content-Type", "text/event-stream")
					for _, line := range strings.Split(rec.Body.String(), "\n") {
						if !strings.HasPrefix(line, "data:") {
							continue
						}
						e, _ := decodeObject([]byte(strings.TrimSpace(line[5:])))
						if d, ok := e["delta"].(Object); ok && str(d, "type") == "thinking_delta" {
							d["estimated_tokens"] = 50
							encoded, _ := json.Marshal(e)
							fmt.Fprintf(w, "event: content_block_delta\ndata: %s\n\n", encoded)
							d["estimated_tokens"] = nil
						}
						encoded, _ := json.Marshal(e)
						fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(e, "type"), encoded)
					}
					return
				}
				if !bytes.Contains(raw, []byte("estimate-hidden")) || bytes.Contains(raw, []byte("estimated_tokens")) {
					t.Error("hidden history missing or contains transient progress")
				}
				writeInternalCacheFixture(w, str(body, "model"), []Object{{"type": "text", "text": "ESTIMATE_DONE"}})
			})
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "thinking": Object{"type": "adaptive"}, "stream": stream, "messages": []any{Object{"role": "user", "content": "synthetic hidden estimate fixture"}}, "tools": []any{Object{"name": "weather", "defer_loading": true, "input_schema": Object{"type": "object", "properties": Object{}}}}, "output_config": Object{"task_budget": Object{"type": "tokens", "total": 20000}}}
			raw, _ := json.Marshal(body)
			hash, _ := helperhistory.CanonicalDigest(raw)
			namespace, _ := helperhistory.Namespace("claude-opus-5-5", "2.1.292", json.RawMessage(`{}`))
			envelope := helperhistory.RequestEnvelope{Version: 1, PayloadVersion: 2, AttemptID: uuid(), RequestDigest: hash, Namespace: namespace, Identity: identity, Request: raw}
			encoded, _ := json.Marshal(envelope)
			request, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(encoded))
			request.Header.Set(helperhistory.Header, "1")
			request.Header.Set(policyHeader, `{}`)
			request.Header.Set("anthropic-beta", taskBudgetBeta)
			response, err := http.DefaultClient.Do(request)
			if err != nil {
				t.Fatal(err)
			}
			data, _ := io.ReadAll(response.Body)
			response.Body.Close()
			if response.StatusCode != 200 {
				t.Fatalf("HTTP %d", response.StatusCode)
			}
			result, err := helperhistory.DecodeResponse(data)
			if err != nil {
				t.Fatal(err)
			}
			if result.StatusCode != 200 || result.Failure != "" || calls.Load() != 2 || !bytes.Contains(result.Body, []byte("ESTIMATE_DONE")) {
				t.Fatalf("status=%d failure=%s calls=%d", result.StatusCode, result.Failure, calls.Load())
			}
			if !bytes.Contains(result.Delta, []byte("fixture-estimate-signature")) || bytes.Contains(result.Delta, []byte("estimated_tokens")) {
				t.Fatal("signature or progress persistence mismatch")
			}
			public := result.Body
			if stream {
				var frames [][]byte
				for _, line := range strings.Split(string(public), "\n") {
					if strings.HasPrefix(line, "data:") {
						frames = append(frames, []byte(strings.TrimSpace(line[5:])))
					}
				}
				public, err = credits.MessageFromEvents(frames)
				if err != nil {
					t.Fatal(err)
				}
			}
			message, err := decodeObject(public)
			if err != nil {
				t.Fatal(err)
			}
			usage, _ := message["usage"].(Object)
			if tokenCount(usage["input_tokens"]) != 40 || tokenCount(usage["output_tokens"]) != 16 {
				t.Fatal("progress estimate altered billed token facts")
			}
		})
	}
}

func TestReviewThinkingEstimatePreservesHiddenLedger(t *testing.T) {
	r := internalCacheReviewRequest()
	recorder := httptest.NewRecorder()
	writeHelperHistoryFixture(recorder, "fixture", []Object{{"type": "thinking", "thinking": "reason", "signature": "opaque"}, {"type": "tool_use", "id": "estimate-helper", "name": "ToolSearch", "input": Object{"query": "select:mcp__ccgateway__weather"}}})
	for _, line := range strings.Split(recorder.Body.String(), "\n") {
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		e, err := decodeObject([]byte(strings.TrimSpace(line[5:])))
		if err != nil {
			t.Fatal(err)
		}
		if d, ok := e["delta"].(Object); ok && str(d, "type") == "thinking_delta" {
			d["estimated_tokens"] = json.Number("9007199254740993")
		}
		before := digest(e)
		r.observeInternalCacheEvent(e)
		if digest(e) != before {
			t.Fatal("source event changed")
		}
	}
	if r.internalCache.failed || len(r.internalCache.rounds) != 1 {
		t.Fatal("official progress estimate invalidated complete hidden response")
	}
	raw, _ := json.Marshal(r.internalCache.rounds[0])
	if bytes.Contains(raw, []byte("estimated_tokens")) || !bytes.Contains(raw, []byte(`"signature":"opaque"`)) {
		t.Fatal("progress leaked into history or signature changed")
	}
}

func TestReviewThinkingEstimateAccumulatorAndBridge(t *testing.T) {
	for _, estimate := range []any{nil, json.Number("0"), json.Number("9007199254740993")} {
		events := thinkingFixtureEvents("", "opaque")
		delta := Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "thinking_delta", "thinking": "reason", "estimated_tokens": estimate}}
		events = append(append(append([]Object{}, events[:2]...), delta), events[2:]...)
		a := &Accumulator{}
		for _, e := range events {
			before := digest(e)
			if err := a.push(e, &Request{}); err != nil {
				t.Fatal(err)
			}
			if digest(e) != before {
				t.Fatal("public stream event changed")
			}
			if str(e, "type") == "content_block_delta" {
				raw := mcpCarrierEvent(e)
				actual, err := initialThinkingEvent(raw)
				if err != nil || !bytes.Equal(raw, actual) {
					t.Fatal("non-start bridge altered original progress event")
				}
			}
		}
		raw, _ := json.Marshal(a.Message)
		if !a.Done || bytes.Contains(raw, []byte("estimated_tokens")) {
			t.Fatal("estimate persisted as final content or usage")
		}
	}
}
