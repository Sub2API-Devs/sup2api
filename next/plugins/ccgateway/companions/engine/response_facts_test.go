package engine

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestProviderResponseFactsIgnoreAuxiliaryAndReplaceAttempts(t *testing.T) {
	facts := &providerResponseFacts{}
	request := httptest.NewRequest("POST", "/", nil)
	main := request.WithContext(context.WithValue(request.Context(), providerResponseKey{}, facts))
	for i, req := range []*http.Request{main, request, main, request} {
		captureProviderResponseFacts(&http.Response{StatusCode: 200, Request: req, Header: http.Header{
			"Request-Id": []string{fmt.Sprint(i)}, "Set-Cookie": []string{"secret"},
		}})
	}
	header := http.Header{}
	facts.apply(header)
	if header.Get("Request-Id") != "2" || header.Get("Set-Cookie") != "" {
		t.Fatal(header)
	}
}

func TestRealCLIProviderResponseFacts(t *testing.T) {
	for _, mode := range []string{"json", "sse", "count", "warmup"} {
		t.Run(mode, func(t *testing.T) {
			endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Request-Id", "main-response-id")
				w.Header().Set("Anthropic-Ratelimit-Tokens-Remaining", "27")
				w.Header().Set("Set-Cookie", "private")
				if strings.HasSuffix(r.URL.Path, "/count_tokens") {
					w.Header().Set("Content-Type", "application/json")
					fmt.Fprint(w, `{"input_tokens":5}`)
					return
				}
				if mode == "warmup" {
					w.Header().Set("Content-Type", "application/json")
					fmt.Fprint(w, `{"id":"msg-warmup","type":"message","role":"assistant","model":"claude-opus-5-5","content":[],"stop_reason":"max_tokens","usage":{"input_tokens":5,"output_tokens":0}}`)
					return
				}
				generationFixtureEvents(w, "claude-opus-5-5", "end_turn", "ok", false)
			})
			body := basic()
			path := "/v1/messages"
			if mode == "sse" {
				body["stream"] = true
			}
			if mode == "count" {
				path += "/count_tokens"
				delete(body, "max_tokens")
			}
			if mode == "warmup" {
				body["max_tokens"] = 0
			}
			response, err := http.Post(endpoint+path, "application/json", bytes.NewReader(mustServerJSON(body)))
			if err != nil {
				t.Fatal(err)
			}
			raw, _ := io.ReadAll(response.Body)
			response.Body.Close()
			if response.StatusCode != 200 || response.Header.Get("Request-Id") != "main-response-id" || response.Header.Get("Anthropic-Ratelimit-Tokens-Remaining") != "27" || response.Header.Get("Set-Cookie") != "" {
				t.Fatalf("response facts: %d %v %s", response.StatusCode, response.Header, raw)
			}
		})
	}
}
