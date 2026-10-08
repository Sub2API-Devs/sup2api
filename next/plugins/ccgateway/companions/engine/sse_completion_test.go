package engine

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestSSEIncompleteTerminationClosesDispatchBeforeCLIReadsEOF(t *testing.T) {
	for _, mode := range []string{"custody", "pass-errors", "pass-only", "ordinary-retry", "completed-helper"} {
		t.Run(mode, func(t *testing.T) {
			var calls atomic.Int32
			wire := "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"id\":\"fixture\",\"type\":\"message\",\"role\":\"assistant\",\"content\":[],\"usage\":{\"input_tokens\":17}}}\n\n"
			if mode == "completed-helper" {
				wire += "event: message_delta\ndata: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"tool_use\"},\"usage\":{\"output_tokens\":8}}\n\nevent: message_stop\ndata: {\"type\":\"message_stop\"}\n\n"
			}
			up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				w.Header().Set("Content-Type", "text/event-stream")
				io.WriteString(w, wire)
			}))
			defer up.Close()
			target, _ := url.Parse(up.URL)
			relay := &outboundRelay{path: "/relay"}
			proxy := relay.forwarder(target)
			proxy.Transport = http.DefaultTransport
			req := &Request{}
			if mode == "custody" || mode == "completed-helper" {
				req.helperHistory = &helperHistoryExecution{}
			}
			ctx := context.WithValue(context.Background(), apiOutputRequestKey{}, req)
			if mode == "pass-only" {
				ctx = context.Background()
			}
			ctx = context.WithValue(ctx, modelRequest{}, mode == "pass-errors" || mode == "pass-only")
			first, _ := http.NewRequestWithContext(ctx, "POST", up.URL+"/v1/messages", strings.NewReader(`{}`))
			resp, err := http.DefaultClient.Do(first)
			if err != nil {
				t.Fatal(err)
			}
			if err = proxy.ModifyResponse(resp); err != nil {
				t.Fatal(err)
			}
			got, err := io.ReadAll(resp.Body)
			resp.Body.Close()
			if err != nil || string(got) != wire {
				t.Fatal("original stream/EOF changed", err)
			}
			// The CLI may retry synchronously on EOF. No runner callback or
			// scheduling delay is available to close the gate in this test.
			second := httptest.NewRequest("POST", "/relay/v1/messages", strings.NewReader(`{}`))
			w := httptest.NewRecorder()
			relay.handler(&Request{}, proxy).ServeHTTP(w, second)
			want := int32(1)
			if mode == "ordinary-retry" || mode == "completed-helper" {
				want = 2
			}
			if calls.Load() != want {
				t.Fatalf("provider calls=%d want=%d", calls.Load(), want)
			}
			if req.helperHistory != nil && mode == "custody" {
				a := req.helperHistory.failureAccounting(helperhistory.AccountingEvidence{})
				if !a.Known || a.Complete || len(a.Calls) != 1 {
					t.Fatal("partial accounting changed")
				}
			}
		})
	}
}
