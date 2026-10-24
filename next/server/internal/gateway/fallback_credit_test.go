package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type memoryCredits struct {
	mu   sync.Mutex
	rows map[string]core.FallbackCredit
	fail bool
}

func (s *memoryCredits) Record(_ context.Context, in core.FallbackCredit) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.fail {
		return core.ErrUnavailable
	}
	s.rows[in.TokenHash] = in
	return nil
}
func (s *memoryCredits) Resolve(_ context.Context, in core.FallbackCreditLookup) (core.FallbackCredit, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r := s.rows[in.TokenHash]
	if r.Owner != in.Owner || !slices.Contains(r.PromptDigests, in.PromptDigest) || !r.ExpiresAt.After(time.Now()) {
		return core.FallbackCredit{}, core.ErrNotFound
	}
	return r, nil
}

func TestFallbackCreditHTTPRegistryRefusalAndNoAutomaticRetry(t *testing.T) {
	// The sse modes stream (2026-10-25 audit P2-1): the Worker's receipt is a
	// trailer, and an unconfirmed credit ends the committed stream with an
	// error event in place of the events that carry the token.
	for _, mode := range []string{"json", "sse", "sse-trailer", "storage", "worker-storage", "missing-ready", "wrong-issuer", "sse-storage", "sse-missing-ready", "sse-wrong-issuer"} {
		t.Run(mode, func(t *testing.T) {
			e, _, _ := resourceTestEnv(t)
			sse := strings.HasPrefix(mode, "sse")
			failure := strings.TrimPrefix(mode, "sse-")
			registry := &memoryCredits{rows: map[string]core.FallbackCredit{}, fail: failure == "storage"}
			e.gw.d.Credits = registry
			token := "fixture-credit-token"
			hash, _ := credits.TokenHash(token)
			var calls atomic.Int32
			up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				if r.Header.Get(credits.TrackingHeader) != "1" {
					t.Error("missing trusted tracking")
				}
				if r.Header.Get(credits.AdmissionHeader) != "" {
					if r.Header.Get(credits.AdmissionHeader) != hash {
						t.Error("wrong credit grant")
					}
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(429)
					fmt.Fprint(w, `{"type":"error","error":{"type":"rate_limit_error","message":"provider-credit-fixture"}}`)
					return
				}
				w.Header().Set(resources.PrincipalHeader, "synthetic_issuer")
				w.Header().Set(resources.GenerationHeader, "v1")
				if failure == "wrong-issuer" {
					w.Header().Set(resources.GenerationHeader, "changed")
				}
				if failure != "missing-ready" && failure != "worker-storage" && mode != "sse-trailer" {
					w.Header().Set(credits.ReadyHeader, hash)
				}
				if mode == "worker-storage" {
					w.Header().Set(credits.FailureHeader, "storage")
				}
				message := map[string]any{"id": "msg_credit", "type": "message", "model": testModel, "role": "assistant", "content": []any{map[string]any{"type": "text", "text": "Cannot answer. "}}, "stop_reason": "refusal", "stop_details": map[string]any{"fallback_credit_token": token, "fallback_has_prefill_claim": true}, "usage": map[string]any{"input_tokens": 11, "output_tokens": 7}}
				if !sse {
					w.Header().Set("Content-Type", "application/json")
					json.NewEncoder(w).Encode(message)
					return
				}
				w.Header().Set("Content-Type", "text/event-stream")
				emit := func(kind string, event map[string]any) {
					event["type"] = kind
					raw, _ := json.Marshal(event)
					fmt.Fprintf(w, "event: %s\ndata: %s\n\n", kind, raw)
				}
				start := map[string]any{"id": "msg_credit", "type": "message", "model": testModel, "role": "assistant", "content": []any{}, "usage": message["usage"]}
				emit("message_start", map[string]any{"message": start})
				emit("content_block_start", map[string]any{"index": 0, "content_block": map[string]any{"type": "text", "text": ""}})
				emit("content_block_delta", map[string]any{"index": 0, "delta": map[string]any{"type": "text_delta", "text": "Cannot answer. "}})
				emit("content_block_stop", map[string]any{"index": 0})
				emit("message_delta", map[string]any{"delta": map[string]any{"stop_reason": "refusal", "stop_details": message["stop_details"]}, "usage": map[string]any{"output_tokens": 7}})
				emit("message_stop", map[string]any{})
				// The Worker flushes what it relays, so its answer is chunked
				// and can end with the receipt.
				w.(http.Flusher).Flush()
				if mode == "sse-trailer" {
					w.Header().Set(http.TrailerPrefix+credits.ReadyHeader, hash)
				}
			}))
			defer up.Close()
			e.plat.base = up.URL
			request := body(testModel, sse)
			raw, _ := json.Marshal(request)
			status, response := creditStreamRequest(t, e, raw)
			rec := e.record()
			if rec.Tokens.Input != 11 || rec.Tokens.Output != 7 {
				t.Fatalf("original usage lost %+v", rec.Tokens)
			}
			if failure == "storage" || failure == "worker-storage" || failure == "missing-ready" || failure == "wrong-issuer" {
				if strings.Contains(string(response), token) || rec.Success {
					t.Fatalf("unverified token exposed %d %s", status, response)
				}
				// A stream that already began answers its error as an event;
				// the issuer is checked before anything is sent.
				if committed := sse && failure != "wrong-issuer"; committed != (status == 200) || committed && !strings.Contains(string(response), "event: error") || !committed && status < 400 {
					t.Fatalf("credit failure answered %d %s", status, response)
				}
				if (failure == "storage" || failure == "worker-storage") && rec.ErrorType != "gateway_credit_storage" {
					t.Fatalf("storage fault called refusal/upstream: %s", rec.ErrorType)
				}
				return
			}
			if status != 200 || !rec.Success || !strings.Contains(string(response), token) {
				t.Fatalf("normal refusal changed %d %s", status, response)
			}
			registry.mu.Lock()
			stored := registry.rows[hash]
			registry.mu.Unlock()
			if stored.TokenHash != hash || len(stored.PromptDigests) < 2 {
				t.Fatal("credit aliases not registered")
			}
			// Credit ownership is the authenticated user/group, not a bearer
			// token guessed from another user's response.
			other := *e.auth.keys[testKey]
			other.UserID++
			e.auth.keys["credit-other-owner"] = &other
			request["fallback_credit_token"] = token
			raw, _ = json.Marshal(request)
			status, _ = fileRequest(t, e, "POST", "/v1/messages", "credit-other-owner", "fallback-credit-2026-07-01", raw, "application/json")
			e.record()
			if status != 404 || calls.Load() != 1 {
				t.Fatal("another owner redeemed a credit")
			}
			registry.mu.Lock()
			expired := stored
			expired.ExpiresAt = time.Now().Add(-time.Minute)
			registry.rows[hash] = expired
			registry.mu.Unlock()
			status, _ = fileRequest(t, e, "POST", "/v1/messages", testKey, "fallback-credit-2026-07-01", raw, "application/json")
			e.record()
			if status != 404 || calls.Load() != 1 {
				t.Fatal("expired credit reached model")
			}
			registry.mu.Lock()
			registry.rows[hash] = stored
			registry.mu.Unlock()
			// A changed prompt is rejected before model I/O.
			request["fallback_credit_token"] = token
			request["system"] = "changed"
			raw, _ = json.Marshal(request)
			status, _ = fileRequest(t, e, "POST", "/v1/messages", testKey, "fallback-credit-2026-07-01", raw, "application/json")
			e.record()
			if status != 404 || calls.Load() != 1 {
				t.Fatalf("changed prompt reached model %d calls=%d", status, calls.Load())
			}
			delete(request, "system")
			request["max_tokens"] = 64
			request["stream"] = false
			raw, _ = json.Marshal(request)
			status, response = fileRequest(t, e, "POST", "/v1/messages", testKey, "fallback-credit-2026-07-01", raw, "application/json")
			e.record()
			if status != 429 || calls.Load() != 2 {
				t.Fatalf("credit redemption automatically retried: %d calls=%d %s", status, calls.Load(), response)
			}
		})
	}
}
func (s *memoryCredits) LookupOwned(_ context.Context, owner core.ResourceOwner, hash string) (core.FallbackCredit, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r, ok := s.rows[hash]
	if !ok || r.Owner != owner {
		return core.FallbackCredit{}, core.ErrNotFound
	}
	return r, nil
}

// creditStreamRequest is fileRequest for a tracked model request whose stream
// may end with its error event and an aborted connection, which marks the
// stream as incomplete.
func creditStreamRequest(t *testing.T, e *env, raw []byte) (int, []byte) {
	t.Helper()
	req, _ := http.NewRequest("POST", e.srv.URL+"/v1/messages", bytes.NewReader(raw))
	req.Header.Set("X-Api-Key", testKey)
	req.Header.Set("Anthropic-Beta", "fallback-credit-2026-07-01")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) {
		t.Fatal(err)
	}
	return resp.StatusCode, body
}

// A tracked event stream reaches the client as it arrives (2026-10-25 audit
// P2-1); only the events that carry a credit token wait for the receipt.
func TestFallbackCreditTrackedStreamRelaysBeforeTheEnd(t *testing.T) {
	e, _, _ := resourceTestEnv(t)
	e.gw.d.Credits = &memoryCredits{rows: map[string]core.FallbackCredit{}}
	release := make(chan struct{})
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(resources.PrincipalHeader, "synthetic_issuer")
		w.Header().Set(resources.GenerationHeader, "v1")
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"id\":\"msg_stream\",\"type\":\"message\",\"model\":\""+testModel+"\",\"role\":\"assistant\",\"content\":[],\"usage\":{\"input_tokens\":3,\"output_tokens\":1}}}\n\n")
		w.(http.Flusher).Flush()
		<-release
		fmt.Fprint(w, "event: message_delta\ndata: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"end_turn\"},\"usage\":{\"output_tokens\":1}}\n\nevent: message_stop\ndata: {\"type\":\"message_stop\"}\n\n")
	}))
	defer up.Close()
	defer close(release)
	e.plat.base = up.URL
	raw, _ := json.Marshal(body(testModel, true))
	req, _ := http.NewRequest("POST", e.srv.URL+"/v1/messages", bytes.NewReader(raw))
	req.Header.Set("X-Api-Key", testKey)
	req.Header.Set("Anthropic-Beta", "fallback-credit-2026-07-01")
	req.Header.Set("Content-Type", "application/json")
	first := make([]byte, len("event: message_start\n"))
	read := make(chan error, 1)
	go func() {
		resp, err := http.DefaultClient.Do(req)
		if err == nil {
			defer resp.Body.Close()
			_, err = io.ReadFull(resp.Body, first)
		}
		read <- err
	}()
	select {
	case err := <-read:
		if err != nil || string(first) != "event: message_start\n" {
			t.Fatalf("first event %q %v", first, err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("the tracked stream was held until its end")
	}
}
