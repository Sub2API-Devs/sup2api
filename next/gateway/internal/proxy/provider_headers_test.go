package proxy

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestOuterGatewayPreservesProviderErrorFacts(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Request-Id", "provider-id")
		w.Header().Set("Retry-After", "7")
		w.Header().Set("Anthropic-Ratelimit-Requests-Remaining", "0")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(429)
		fmt.Fprint(w, `{"type":"error"}`)
	}))
	defer up.Close()
	r := New(Config{})
	if err := r.SetRoute(Route{Mode: "local-serving", LocalURL: up.URL, CoreBootID: "fixture", Revision: 1}); err != nil {
		t.Fatal(err)
	}
	q := httptest.NewRequest("POST", "http://public/v1/messages", strings.NewReader(`{}`))
	q.Header.Set("Request-Id", "forged")
	w := httptest.NewRecorder()
	r.Public().ServeHTTP(w, q)
	if w.Code != 429 || w.Header().Get("Request-Id") != "provider-id" || w.Header().Get("Retry-After") != "7" || w.Body.String() != `{"type":"error"}` {
		t.Fatal(w.Code, w.Header(), w.Body.String())
	}
}
