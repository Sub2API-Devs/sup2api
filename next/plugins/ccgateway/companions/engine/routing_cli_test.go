package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestRealCLIRoutingControlsAndProviderError(t *testing.T) {
	for _, deny := range []bool{false, true} {
		t.Run(fmt.Sprintf("provider_error=%t", deny), func(t *testing.T) {
			calls := make(chan Object, 4)
			url, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					t.Errorf("unexpected endpoint %s", r.URL.Path)
				}
				if r.Header.Get("X-Api-Key") != "dummy-generation-fixture" || r.Header.Get("Anthropic-Workspace-Id") != "" {
					t.Error("client identity header reached inner request")
				}
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				calls <- body
				if deny {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(400)
					fmt.Fprint(w, `{"type":"error","error":{"type":"invalid_request_error","message":"fixture geography unsupported"}}`)
					return
				}
				generationFixtureEvents(w, str(body, "model"), "end_turn", "geo fixture", false)
			})
			body := Object{"model": "claude-opus-5-5", "max_tokens": 32, "messages": []any{Object{"role": "user", "content": "geographic control"}}, "inference_geo": "us", "service_tier": "standard_only"}
			raw, _ := json.Marshal(body)
			req, _ := http.NewRequest("POST", url+"/v1/messages", bytes.NewReader(raw))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Anthropic-Workspace-Id", "outer-workspace-must-not-pass")
			req.Header.Set("X-Api-Key", "outer-key-must-not-pass")
			req.Header.Set("X-Ccgateway-Request-Policy", `{"pass_upstream_errors":true}`)
			res, err := (&http.Client{Timeout: 25 * time.Second}).Do(req)
			if err != nil {
				t.Fatal(err)
			}
			out, _ := io.ReadAll(res.Body)
			res.Body.Close()
			if deny {
				if res.StatusCode != 400 || !bytes.Contains(out, []byte("fixture geography unsupported")) {
					t.Fatalf("provider error changed: %d %s", res.StatusCode, out)
				}
			} else if res.StatusCode != 200 {
				t.Fatalf("%d %s", res.StatusCode, out)
			}
			if len(calls) != 1 {
				t.Fatalf("calls=%d", len(calls))
			}
			wire := <-calls
			if wire["inference_geo"] != "us" || wire["service_tier"] != "standard_only" {
				t.Fatal("routing constraints lost", wire)
			}
		})
	}
}
