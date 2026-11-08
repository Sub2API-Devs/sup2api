package proxy

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestYieldingNodeServesThroughTargetsWhileItsCoreIsDown(t *testing.T) {
	var localReady atomic.Bool
	localReady.Store(true)
	var reset atomic.Int64
	a, _, _ := forwardPairWith(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.Header().Set("X-Served-By", "target") }), func(c *Config) {
		c.LocalReady = localReady.Load
		c.LocalServing = func() { reset.Add(1) }
	})
	target := Target{PeerURL: a.Route().PeerURL, CoreBootID: "b-boot", Revision: 7}
	local := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.Header().Set("X-Served-By", "local") }))
	defer local.Close()
	if e := a.SetRoute(Route{Mode: "local-serving", LocalURL: local.URL, CoreBootID: "a-boot", Revision: 100}); e != nil {
		t.Fatal(e)
	}
	if reset.Load() != 1 {
		t.Fatal("a core that obtained local serving must clear the readiness suspicion")
	}
	probe := func(path string) int {
		w := httptest.NewRecorder()
		a.Public().ServeHTTP(w, httptest.NewRequest("GET", "http://public.example"+path, nil))
		return w.Code
	}
	serve := func() (int, string) {
		w := httptest.NewRecorder()
		a.Public().ServeHTTP(w, httptest.NewRequest("POST", "http://public.example/v1/chat", strings.NewReader("{}")))
		return w.Code, w.Header().Get("X-Served-By")
	}
	// The core is gone and nobody takes the traffic: not ready, 503.
	localReady.Store(false)
	if code, by := serve(); code != 503 || by != "" || probe("/readyz") != 503 || a.Diverted() {
		t.Fatalf("dead core without a taker: %d %q", code, by)
	}
	// Yielding: the targets serve, the probe says ready, the core may drain.
	if e := a.SetOffload([]Target{target}, time.Minute); e != nil {
		t.Fatal(e)
	}
	if code, by := serve(); code != 200 || by != "target" || probe("/readyz") != 200 || probe("/healthz") != 200 || !a.Diverted() {
		t.Fatalf("yielding with a dead core: %d %q", code, by)
	}
	// Draining before a shell restart: the probe refuses, requests still go.
	a.SetDraining(true)
	if code, by := serve(); code != 200 || by != "target" || probe("/readyz") != 503 || probe("/livez") != 200 || !a.Draining() {
		t.Fatalf("draining: %d %q", code, by)
	}
	a.SetDraining(false)
	if probe("/readyz") != 200 {
		t.Fatal("drain flag did not clear")
	}
	// Taking the traffic back with the core ready again.
	localReady.Store(true)
	if e := a.SetOffload(nil, 0); e != nil {
		t.Fatal(e)
	}
	if code, by := serve(); code != 200 || by != "local" || a.Diverted() {
		t.Fatalf("resumed: %d %q", code, by)
	}
	// Offload only applies while serving locally: a maintenance route stays closed.
	if e := a.SetOffload([]Target{target}, time.Minute); e != nil {
		t.Fatal(e)
	}
	if e := a.SetRoute(Route{Mode: "maintenance", Revision: 101}); e != nil {
		t.Fatal(e)
	}
	if code, _ := serve(); code != 503 || probe("/readyz") != 503 || a.Diverted() {
		t.Fatalf("maintenance with an offload set: %d", code)
	}
}
