package engine

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestReviewBootstrapAuthenticatedMainStaysLocal(t *testing.T) {
	b := &continuationBootstrap{ready: make(chan struct{})}
	scope := newMainRequestScope()
	if err := scope.enter(); err != nil {
		t.Fatal(err)
	}
	relay := &outboundRelay{path: "/owned", bootstrap: b, scope: scope, control: &modControl{ready: true}}
	forwarded := 0
	h := relay.handler(&Request{}, http.HandlerFunc(func(http.ResponseWriter, *http.Request) { forwarded++ }))
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	body := Object{"system": []any{Object{"type": "text", "text": scope.marker}}, "messages": []any{Object{"role": "user", "content": "fixture"}}}
	r := httptest.NewRequest("POST", "http://localhost/owned/v1/messages", strings.NewReader(string(mustMCPJSON(body)))).WithContext(ctx)
	h.ServeHTTP(httptest.NewRecorder(), r)
	select {
	case <-b.ready:
	default:
		t.Fatal("authenticated main did not produce local attribution")
	}
	if forwarded != 0 {
		t.Fatal("attributed bootstrap reached provider")
	}
	for _, method := range []string{"GET", "POST", "DELETE"} {
		for _, path := range []string{"/v1/messages/count_tokens", "/v1/files", "/api/oauth/profile", "/v1/complete", "/outside"} {
			h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(method, "http://localhost/owned"+path, strings.NewReader(`{}`)))
		}
	}
	if forwarded != 0 {
		t.Fatal("auxiliary/bootstrap resource route reached provider")
	}
}

func TestReviewBootstrapRequiresLiveLeaseAndMod(t *testing.T) {
	for _, invalid := range []string{"inactive", "unloaded-mod", "missing-marker"} {
		t.Run(invalid, func(t *testing.T) {
			b := &continuationBootstrap{ready: make(chan struct{})}
			scope := newMainRequestScope()
			if invalid != "inactive" {
				if err := scope.enter(); err != nil {
					t.Fatal(err)
				}
			}
			relay := &outboundRelay{path: "/owned", bootstrap: b, scope: scope, control: &modControl{ready: invalid != "unloaded-mod"}}
			body := Object{"system": []any{Object{"type": "text", "text": scope.marker}}}
			if invalid == "missing-marker" {
				body["system"] = []any{Object{"type": "text", "text": "client"}}
			}
			h := relay.handler(&Request{}, http.HandlerFunc(func(http.ResponseWriter, *http.Request) { t.Error("unproven request escaped") }))
			h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("POST", "http://localhost/owned/v1/messages", strings.NewReader(string(mustMCPJSON(body)))))
			if b.seen || relay.Failure() == nil {
				t.Fatal("unproven bootstrap accepted")
			}
		})
	}
}
