package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func TestRealCLIResourceOutputsWithoutInputsBindIdentity(t *testing.T) {
	var broker *resourceBroker
	var mode, calls atomic.Int32
	runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		for _, name := range []string{resources.PrincipalHeader, resources.GenerationHeader, resources.ResourceOutputsHeader, resources.ResourceRefsHeader, resources.ResourceContextsHeader} {
			if r.Header.Get(name) != "" {
				t.Error("private core resource capability reached provider", name)
			}
		}
		if broker.authority.mu.TryLock() {
			broker.authority.mu.Unlock()
			t.Error("resource issuer not locked during model execution")
		}
		raw, _ := io.ReadAll(r.Body)
		body, err := decodeObject(raw)
		if err != nil {
			t.Error(err)
		}
		w.Header().Set(resources.PrincipalHeader, "forged-upstream-principal")
		w.Header().Set(resources.GenerationHeader, "forged-upstream-generation")
		if mode.Load() == 2 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(429)
			io.WriteString(w, `{"type":"error","error":{"type":"rate_limit_error","message":"output fixture"}}`)
			return
		}
		generationFixtureEvents(w, str(body, "model"), "end_turn", "resource output fixture", false)
	})
	runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_ID": "outputs-fixture", "CCG_RESOURCE_ISSUER_GENERATION": "1"})
	cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	g := &Gateway{Runner: runner, Cache: cache, Key: "worker-fixture", Slots: make(chan struct{}, 2), Timeout: 20 * time.Second}
	broker, err = newResourceBroker(g, &authManager{}, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	g.resources = broker
	defer broker.lease.Close()
	id, err := broker.identity(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(g)
	defer server.Close()
	for _, scenario := range []string{"json", "sse", "upstream_error", "parse_error", "wrong_issuer", "missing_capability"} {
		t.Run(scenario, func(t *testing.T) {
			mode.Store(0)
			if scenario == "upstream_error" {
				mode.Store(2)
			}
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "messages": []any{Object{"role": "user", "content": "no input resources"}}, "stream": scenario == "sse"}
			if scenario == "parse_error" {
				body["max_tokens"] = "invalid"
			}
			raw, _ := json.Marshal(body)
			request, _ := http.NewRequest("POST", server.URL+"/v1/messages", bytes.NewReader(raw))
			request.Header.Set("X-Api-Key", "worker-fixture")
			request.Header.Set("Content-Type", "application/json")
			policy := defaultRequestPolicy()
			policy.PassUpstreamErrors = true
			policyRaw, _ := json.Marshal(policy)
			request.Header.Set(policyHeader, string(policyRaw))
			request.Header.Set(resources.PrincipalHeader, id.PrincipalID)
			request.Header.Set(resources.GenerationHeader, id.Generation)
			request.Header.Set(resources.ResourceOutputsHeader, "1")
			if scenario == "wrong_issuer" {
				request.Header.Set(resources.PrincipalHeader, "other")
			}
			if scenario == "missing_capability" {
				request.Header.Del(resources.ResourceOutputsHeader)
				body["max_tokens"] = "invalid"
				raw, _ = json.Marshal(body)
				request.Body = io.NopCloser(bytes.NewReader(raw))
				request.ContentLength = int64(len(raw))
			}
			before := calls.Load()
			response, err := (&http.Client{Timeout: 25 * time.Second}).Do(request)
			if err != nil {
				t.Fatal(err)
			}
			output, _ := io.ReadAll(response.Body)
			response.Body.Close()
			want := 200
			if scenario == "upstream_error" {
				want = 429
			}
			if scenario == "parse_error" || scenario == "wrong_issuer" || scenario == "missing_capability" {
				want = 400
			}
			if response.StatusCode != want {
				t.Fatalf("status %d want %d body %s", response.StatusCode, want, output)
			}
			if scenario == "wrong_issuer" || scenario == "missing_capability" {
				if response.Header.Get(resources.PrincipalHeader) != "" || response.Header.Get(resources.GenerationHeader) != "" {
					t.Fatal("unverified identity echoed")
				}
			} else if response.Header.Get(resources.PrincipalHeader) != id.PrincipalID || response.Header.Get(resources.GenerationHeader) != id.Generation {
				t.Fatal("actual identity missing or replaced")
			}
			if want == 400 && calls.Load() != before {
				t.Fatal("invalid request reached provider")
			}
			if !broker.authority.mu.TryLock() {
				t.Fatal("completed request retained issuer lock")
			}
			broker.authority.mu.Unlock()
		})
	}
}
