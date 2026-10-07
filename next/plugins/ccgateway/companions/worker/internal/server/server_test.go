package server

import (
	"ccgateway/worker/pkg/types"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

type mockWorker struct{ healthError error }

func (m *mockWorker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("X-Test-Forwarded", r.Header.Get("X-Test-Forwarded"))
	w.WriteHeader(202)
}
func (m *mockWorker) Health(context.Context) (*types.HealthStatus, error) {
	return &types.HealthStatus{Status: "healthy"}, m.healthError
}
func (m *mockWorker) Close() error { return nil }

func TestRoutesForwardWithoutReencoding(t *testing.T) {
	s := New(&mockWorker{}, 8788)
	for _, path := range []string{"/v1/messages", "/admin/status", "/admin/auth/start"} {
		req := httptest.NewRequest("POST", path, nil)
		req.Header.Set("X-Test-Forwarded", "present")
		out := httptest.NewRecorder()
		s.handler.ServeHTTP(out, req)
		if out.Code != 202 || out.Header().Get("X-Test-Forwarded") != "present" {
			t.Fatalf("lost request at %s", path)
		}
	}
}
func TestHealth(t *testing.T) {
	for _, fail := range []bool{false, true} {
		w := &mockWorker{}
		if fail {
			w.healthError = errors.New("private error")
		}
		s := New(w, 8788)
		out := httptest.NewRecorder()
		s.handler.ServeHTTP(out, httptest.NewRequest("GET", "/health", nil))
		want := 200
		if fail {
			want = 503
		}
		if out.Code != want {
			t.Fatal(out.Code)
		}
	}
}
