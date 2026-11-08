package supervisor

import (
	"context"
	"testing"
	"time"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
)

// recordingControl answers like a core that drains at once and records the
// drain request it received.
type recordingControl struct {
	hello rc.Hello
	got   *rc.DrainRequest
}

func (c *recordingControl) Drain(_ context.Context, d rc.DrainRequest) error {
	c.got = &d
	return nil
}
func (c *recordingControl) Status(context.Context) (rc.Status, error) {
	return rc.Status{Hello: c.hello, DrainComplete: true}, nil
}
func (c *recordingControl) Shutdown(context.Context) error { return nil }

func TestDrainStopSendsGracefulOnlyToACoreThatUnderstandsIt(t *testing.T) {
	for _, tc := range []struct {
		name     string
		caps     []string
		graceful bool
		want     bool
	}{
		{"old core, graceful asked", nil, true, false},
		{"new core, graceful asked", []string{rc.CapabilityGracefulDrain}, true, true},
		{"new core, plain drain", []string{rc.CapabilityGracefulDrain}, false, false},
	} {
		m := &Manager{} // not running: DrainStop only talks to the control socket and then Wait returns at once
		c := &recordingControl{hello: rc.Hello{Capabilities: tc.caps}}
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		err := m.DrainStop(ctx, c, "op", tc.graceful)
		cancel()
		if err != nil {
			t.Fatalf("%s: %v", tc.name, err)
		}
		if c.got == nil || c.got.Graceful != tc.want || c.got.OperationID != "op" || c.got.Deadline.IsZero() {
			t.Fatalf("%s: drain request %+v, want graceful=%v", tc.name, c.got, tc.want)
		}
	}
}

func TestDrainStopRequiresADeadline(t *testing.T) {
	m := &Manager{}
	c := &recordingControl{}
	if err := m.DrainStop(context.Background(), c, "op", true); err == nil || c.got != nil {
		t.Fatal("drain without a deadline was sent")
	}
}
