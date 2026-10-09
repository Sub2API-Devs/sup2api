package engine

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

// A relay refusal is scoped to the request, so the host keeps the account in
// service; other failures and passed-through API errors are not, and an API
// response cannot claim the scope.
func TestRequestRefusalErrorScope(t *testing.T) {
	run := func(e error) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		x := &exchange{w: w, r: httptest.NewRequest(http.MethodPost, "/v1/messages", nil), diagnostic: &requestDiagnostic{directory: t.TempDir(), fields: Object{}}}
		x.runFailed(context.Background(), e)
		return w
	}
	refusal := &requestRefusal{fmt.Errorf("cannot prepare the upstream request: %w", errors.New("client user turn 3: client user block sequence changed"))}
	if w := run(fmt.Errorf("run: %w", refusal)); w.Code != 502 || w.Header().Get(errorScopeHeader) != "request" {
		t.Fatalf("refusal: %d %q", w.Code, w.Header().Get(errorScopeHeader))
	}
	if w := run(errors.New("Claude Code exited")); w.Header().Get(errorScopeHeader) != "" {
		t.Fatal("other failure scoped to the request")
	}
	forged := &upstreamError{Status: 500, ContentType: "application/json", Body: []byte(`{"type":"error","error":{"type":"api_error","message":"x"}}`),
		Headers: http.Header{errorScopeHeader: {"request"}}}
	if w := run(forged); w.Code != 500 || w.Header().Get(errorScopeHeader) != "" {
		t.Fatalf("API error claimed the request scope: %d %q", w.Code, w.Header().Get(errorScopeHeader))
	}
}
