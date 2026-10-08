package engine

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestProviderErrorHeadersRequireMainAttribution(t *testing.T) {
	r := httptest.NewRequest("POST", "/messages", nil)
	response := &http.Response{Request: r, Header: http.Header{"Request-Id": []string{"real"}, "Retry-After": []string{"3"}}}
	if len(mainErrorHeaders(response)) != 0 {
		t.Fatal("aux headers attributed to main")
	}
	response.Request = r.WithContext(context.WithValue(r.Context(), apiOutputRequestKey{}, &Request{}))
	if mainErrorHeaders(response).Get("Request-Id") != "real" {
		t.Fatal("main headers lost")
	}
}

func TestUpstreamErrorAfterStreamCannotRewriteHTTPHeaders(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	x := &exchange{w: w, r: r, req: &Request{Stream: true}, diagnostic: newRequestDiagnostic(w, r), streaming: true}
	w.Header().Set("Content-Type", "text/event-stream")
	w.WriteHeader(200)
	x.passUpstream(&upstreamError{Status: 429, ContentType: "application/json", Body: []byte(`{"error":{"type":"rate_limit_error","message":"stream failure"}}`), Headers: http.Header{"Retry-After": []string{"7"}}}, Object{})
	if w.Result().StatusCode != 200 || w.Result().Header.Get("Retry-After") != "" || !strings.Contains(w.Body.String(), "event: error") || !strings.Contains(w.Body.String(), "stream failure") {
		t.Fatal(w.Result().StatusCode, w.Header(), w.Body.String())
	}
}

func TestRealCLIUpstreamErrorHeaders(t *testing.T) {
	for _, status := range []int{400, 429, 529} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			var calls atomic.Int32
			endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				calls.Add(1)
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Request-Id", "provider-error-id")
				w.Header().Set("Retry-After", "7")
				w.Header().Set("Anthropic-Ratelimit-Requests-Remaining", "0")
				w.Header().Set("Set-Cookie", "must-not-leak")
				w.Header().Set("Authorization", "must-not-leak")
				w.WriteHeader(status)
				fmt.Fprint(w, `{"type":"error","error":{"type":"fixture_error","message":"original fixture"}}`)
			})
			policy := defaultRequestPolicy()
			policy.PassUpstreamErrors = true
			req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(mustServerJSON(basic())))
			req.Header = policyHeaders(policy)
			res, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			raw, _ := io.ReadAll(res.Body)
			if res.StatusCode != status || res.Header.Get("Request-Id") != "provider-error-id" || res.Header.Get("Retry-After") != "7" || !bytes.Contains(raw, []byte("original fixture")) {
				t.Fatalf("provider error facts lost: %d %v %s", res.StatusCode, res.Header, raw)
			}
			if res.Header.Get("Set-Cookie") != "" || res.Header.Get("Authorization") != "" || calls.Load() != 1 {
				t.Fatal("secret leak or duplicate request")
			}
		})
	}
}
