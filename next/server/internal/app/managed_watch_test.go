package app

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	runtimecontract "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
)

// servingCore is a managed core in serving mode.
func servingCore() *managedCore {
	return &managedCore{hello: runtimecontract.Hello{NodeID: "n", BootID: "boot", ReleaseDigest: "release"}, token: strings.Repeat("t", 32), mode: "serving",
		admission: runtimecontract.Admission{BootID: "boot", ReleaseDigest: "release", Revision: 1, ServeHTTP: true}, gate: &requestGate{}, shutdown: make(chan struct{})}
}

func (m *managedCore) modeNow() string {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.mode
}

func TestDrainGraceFollowsTheShellsRequest(t *testing.T) {
	now := time.Now()
	cases := []struct {
		name string
		d    runtimecontract.DrainRequest
		want time.Duration
	}{
		{"plain drain cancels at once", runtimecontract.DrainRequest{OperationID: "op", Deadline: now.Add(10 * time.Minute)}, 0},
		{"graceful drain is capped", runtimecontract.DrainRequest{OperationID: "op", Deadline: now.Add(10 * time.Minute), Graceful: true}, maxDrainGrace},
		{"graceful drain keeps a margin to the deadline", runtimecontract.DrainRequest{OperationID: "op", Deadline: now.Add(time.Minute), Graceful: true}, 45 * time.Second},
		{"graceful drain past its deadline waits for nothing", runtimecontract.DrainRequest{OperationID: "op", Deadline: now.Add(5 * time.Second), Graceful: true}, 0},
		{"graceful drain without a deadline is capped", runtimecontract.DrainRequest{OperationID: "op", Graceful: true}, maxDrainGrace},
	}
	for _, c := range cases {
		if got := drainGraceFor(c.d, now); got != c.want {
			t.Errorf("%s: grace %v, want %v", c.name, got, c.want)
		}
	}
}

func TestHandleDrainRecordsTheGraceAndAdvertisesTheCapability(t *testing.T) {
	m := servingCore()
	m.hello.Capabilities = []string{runtimecontract.CapabilityGracefulDrain}
	h := m.handler(func(runtimecontract.PrepareRequest) { t.Fatal("unexpected prepare") })
	var hello runtimecontract.Hello
	if w := controlCall(h, "GET", runtimecontract.HelloPath, m.token, nil); w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &hello) != nil || !hello.Has(runtimecontract.CapabilityGracefulDrain) {
		t.Fatalf("hello does not advertise graceful drains: %d %s", w.Code, w.Body.String())
	}
	d := runtimecontract.DrainRequest{OperationID: "upgrade-3", Deadline: time.Now().Add(10 * time.Minute), Graceful: true}
	if w := controlCall(h, "POST", runtimecontract.DrainPath, m.token, d); w.Code != 202 {
		t.Fatal(w.Code, w.Body.String())
	}
	if got := m.shutdownGrace(); got != maxDrainGrace {
		t.Fatalf("grace %v, want %v", got, maxDrainGrace)
	}
	if m.modeNow() != "draining" || !m.gate.isDraining() {
		t.Fatal("drain did not close the gate")
	}
	// A second, plain drain cannot shorten the grace already granted.
	if w := controlCall(h, "POST", runtimecontract.DrainPath, m.token, runtimecontract.DrainRequest{OperationID: "again"}); w.Code != 202 {
		t.Fatal(w.Code)
	}
	if got := m.shutdownGrace(); got != maxDrainGrace {
		t.Fatalf("second drain changed the grace to %v", got)
	}
	plain := servingCore()
	ph := plain.handler(func(runtimecontract.PrepareRequest) {})
	if w := controlCall(ph, "POST", runtimecontract.DrainPath, plain.token, runtimecontract.DrainRequest{OperationID: "op", Deadline: time.Now().Add(10 * time.Minute)}); w.Code != 202 {
		t.Fatal(w.Code)
	}
	if got := plain.shutdownGrace(); got != 0 {
		t.Fatalf("plain drain granted %v", got)
	}
}
