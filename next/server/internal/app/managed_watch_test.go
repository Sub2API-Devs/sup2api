package app

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	runtimecontract "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
)

// servingCore is a managed core in serving mode whose live validation is the
// given function; watchAdmission runs with fast timings.
func servingCore(validate func(context.Context, runtimecontract.Admission) error) *managedCore {
	m := &managedCore{hello: runtimecontract.Hello{NodeID: "n", BootID: "boot", ReleaseDigest: "release"}, token: strings.Repeat("t", 32), mode: "serving",
		admission: runtimecontract.Admission{BootID: "boot", ReleaseDigest: "release", Revision: 1, ServeHTTP: true}, gate: &requestGate{}, shutdown: make(chan struct{}),
		watch: admissionWatch{Interval: 5 * time.Millisecond, Timeout: 50 * time.Millisecond}}
	m.liveValidate = validate
	return m
}

func (m *managedCore) modeNow() string {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.mode
}

func waitMode(t *testing.T, m *managedCore, want string, within time.Duration) {
	t.Helper()
	deadline := time.Now().Add(within)
	for time.Now().Before(deadline) {
		if m.modeNow() == want {
			return
		}
		time.Sleep(2 * time.Millisecond)
	}
	t.Fatalf("mode %q, want %q", m.modeNow(), want)
}

// waitCalls waits until validate has run at least n times.
func waitCalls(t *testing.T, calls *atomic.Int32, n int32) {
	t.Helper()
	deadline := time.Now().Add(time.Second)
	for calls.Load() < n {
		if time.Now().After(deadline) {
			t.Fatalf("watchdog ran %d checks, want at least %d", calls.Load(), n)
		}
		time.Sleep(2 * time.Millisecond)
	}
}

func lastBlocker(s runtimecontract.Status) string {
	if len(s.Blockers) == 0 {
		return ""
	}
	return s.Blockers[len(s.Blockers)-1]
}

func TestWatchAdmissionNeverDrainsOnCheckFailures(t *testing.T) {
	var calls atomic.Int32
	m := servingCore(func(context.Context, runtimecontract.Admission) error {
		calls.Add(1)
		return errors.New("timeout: no free connection")
	})
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go m.watchAdmission(ctx)
	waitCalls(t, &calls, 20) // far past any former grace
	st := m.status(ctx)
	if m.modeNow() != "serving" || !st.Ready || m.gate.isDraining() {
		t.Fatalf("watchdog stopped the core: mode %q ready %v draining %v", m.modeNow(), st.Ready, m.gate.isDraining())
	}
	if !strings.Contains(lastBlocker(st), "check failing") {
		t.Fatalf("finding not reported: %v", st.Blockers)
	}
}

func TestWatchAdmissionNeverDrainsWhenRevoked(t *testing.T) {
	var calls atomic.Int32
	m := servingCore(func(context.Context, runtimecontract.Admission) error {
		calls.Add(1)
		return errAdmissionRevoked
	})
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go m.watchAdmission(ctx)
	waitCalls(t, &calls, 5)
	st := m.status(ctx)
	if m.modeNow() != "serving" || !st.Ready || m.gate.isDraining() {
		t.Fatalf("watchdog stopped the core on revocation: mode %q ready %v draining %v", m.modeNow(), st.Ready, m.gate.isDraining())
	}
	if !strings.Contains(lastBlocker(st), "revoked") {
		t.Fatalf("revocation not reported: %v", st.Blockers)
	}
}

func TestWatchAdmissionClearsTheAlertOnRecovery(t *testing.T) {
	var calls atomic.Int32
	m := servingCore(func(context.Context, runtimecontract.Admission) error {
		if calls.Add(1) <= 3 {
			return errors.New("timeout")
		}
		return nil
	})
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go m.watchAdmission(ctx)
	waitCalls(t, &calls, 6)
	if st := m.status(ctx); len(st.Blockers) != 0 || !st.Ready {
		t.Fatalf("alert not cleared after recovery: %v", st.Blockers)
	}
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
	m := servingCore(nil)
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
	plain := servingCore(nil)
	ph := plain.handler(func(runtimecontract.PrepareRequest) {})
	if w := controlCall(ph, "POST", runtimecontract.DrainPath, plain.token, runtimecontract.DrainRequest{OperationID: "op", Deadline: time.Now().Add(10 * time.Minute)}); w.Code != 202 {
		t.Fatal(w.Code)
	}
	if got := plain.shutdownGrace(); got != 0 {
		t.Fatalf("plain drain granted %v", got)
	}
}
