package app

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestShutdownWaitsForCanceledHandlerCompletion(t *testing.T) {
	gate := &requestGate{}
	requests, cancel := context.WithCancel(context.Background())
	defer cancel()
	entered, canceled, finish := make(chan struct{}), make(chan struct{}), make(chan struct{})
	srv := httptest.NewUnstartedServer(gate.wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		close(entered)
		<-r.Context().Done()
		close(canceled)
		<-finish
	})))
	srv.Config.BaseContext = func(net.Listener) context.Context { return requests }
	srv.Start()
	defer srv.Close()
	go func() {
		resp, err := http.Get(srv.URL)
		if err == nil {
			resp.Body.Close()
		}
	}()
	<-entered
	done := make(chan error, 1)
	go func() { done <- shutdownHTTP(srv.Config, gate, cancel, 20*time.Millisecond) }()
	select {
	case <-canceled:
	case <-time.After(time.Second):
		t.Fatal("request not canceled after grace period")
	}
	select {
	case <-done:
		t.Fatal("shutdown returned before deferred producer completed")
	default:
	}
	close(finish)
	select {
	case err := <-done:
		if err == nil {
			t.Fatal("expected shutdown deadline")
		}
	case <-time.After(time.Second):
		t.Fatal("shutdown did not complete")
	}
}

func TestDrainRejectsNewWorkAndKeepsHealthObservable(t *testing.T) {
	gate := &requestGate{}
	gate.stop()
	handler := gate.wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if gate.isDraining() {
			w.WriteHeader(503)
		}
	}))
	for _, path := range []string{"/v1/messages", "/healthz"} {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
		if rec.Code != 503 {
			t.Fatalf("%s status=%d", path, rec.Code)
		}
	}
	gate.wg.Wait()
}
