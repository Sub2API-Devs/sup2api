package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestRealCLIFallbackCreditFailuresDoNotRetry(t *testing.T) {
	for _, mode := range []string{"storage", "storage-sse", "provider400", "provider429"} {
		t.Run(mode, func(t *testing.T) {
			var calls atomic.Int32
			runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				calls.Add(1)
				w.Header().Set("Content-Type", "application/json")
				if !strings.HasPrefix(mode, "storage") {
					status := 400
					kind := "invalid_request_error"
					if mode == "provider429" {
						status = 429
						kind = "rate_limit_error"
					}
					w.Header().Set("Retry-After", "3")
					w.WriteHeader(status)
					json.NewEncoder(w).Encode(Object{"type": "error", "error": Object{"type": kind, "message": "redemption temporarily unavailable"}})
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				if mode == "storage-sse" {
					recorder := httptest.NewRecorder()
					writeSurfaceFixture(recorder, str(body, "model"), []Object{})
					w.Header().Set("Content-Type", "text/event-stream")
					for _, line := range strings.Split(recorder.Body.String(), "\n") {
						if !strings.HasPrefix(line, "data:") {
							continue
						}
						event, _ := decodeObject([]byte(strings.TrimSpace(strings.TrimPrefix(line, "data:"))))
						if str(event, "type") == "message_start" {
							event["message"].(Object)["usage"] = Object{"input_tokens": 1, "output_tokens": 0}
						}
						if str(event, "type") == "message_delta" {
							event["delta"].(Object)["stop_reason"] = "refusal"
							event["delta"].(Object)["stop_details"] = Object{"type": "refusal", "fallback_credit_token": "storage-token", "fallback_has_prefill_claim": false}
						}
						raw, _ := json.Marshal(event)
						fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), raw)
					}
					return
				}
				json.NewEncoder(w).Encode(Object{"id": "msg_store_fail", "type": "message", "role": "assistant", "model": body["model"], "content": []any{}, "stop_reason": "refusal", "stop_details": Object{"type": "refusal", "fallback_credit_token": "storage-token", "fallback_has_prefill_claim": false}, "usage": Object{"input_tokens": 1, "output_tokens": 0}})
			})
			runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_ID": "credit-failure", "CCG_RESOURCE_ISSUER_GENERATION": "1"})
			cache, _ := newCache(filepath.Join(t.TempDir(), "cache"), 8<<20)
			g := &Gateway{Runner: runner, Cache: cache, Key: "fixture-worker", Slots: make(chan struct{}, 2), Timeout: 20 * time.Second}
			broker, err := newResourceBroker(g, &authManager{}, t.TempDir())
			if err != nil {
				t.Fatal(err)
			}
			g.resources = broker
			defer broker.lease.Close()
			id, err := broker.identity(context.Background())
			if err != nil {
				t.Fatal(err)
			}
			g.credits, err = newCreditRegistry(filepath.Join(t.TempDir(), "credits"), g.Key, 1)
			if err != nil {
				t.Fatal(err)
			}
			server := httptest.NewServer(g)
			defer server.Close()
			body := Object{"model": "claude-opus-5-5", "max_tokens": 64, "stream": mode == "storage-sse", "messages": []any{Object{"role": "user", "content": "fixture"}}}
			raw, _ := json.Marshal(body)
			req, _ := http.NewRequest("POST", server.URL+"/v1/messages", bytes.NewReader(raw))
			req.Header.Set("X-Api-Key", g.Key)
			req.Header.Set("Anthropic-Beta", "fallback-credit-2026-07-01")
			req.Header.Set(credits.TrackingHeader, "1")
			req.Header.Set(resources.PrincipalHeader, id.PrincipalID)
			req.Header.Set(resources.GenerationHeader, id.Generation)
			p := defaultRequestPolicy()
			p.ToolSearch = "false"
			policy, _ := json.Marshal(p)
			req.Header.Set(policyHeader, string(policy))
			res, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			out, _ := io.ReadAll(res.Body)
			expected := 400
			if strings.HasPrefix(mode, "storage") {
				expected = 200
				if res.Header.Get(credits.FailureHeader) != "storage" || !bytes.Contains(out, []byte("storage-token")) || !bytes.Contains(out, []byte(`"input_tokens":1`)) {
					t.Fatalf("wrong custody failure: %s", out)
				}
			} else if mode == "provider429" {
				expected = 429
			}
			if res.StatusCode != expected || res.Header.Get(credits.ReadyHeader) != "" || calls.Load() != 1 {
				t.Fatalf("status=%d calls=%d body=%s", res.StatusCode, calls.Load(), out)
			}
			if !strings.HasPrefix(mode, "storage") && !bytes.Contains(out, []byte("redemption temporarily unavailable")) {
				t.Fatal("upstream error changed")
			}
		})
	}
}
