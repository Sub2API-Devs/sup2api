package control

import (
	"testing"
	"time"
)

// Every routing and admission decision reads node liveness through Fresh and
// ServingLocal so the 20s window cannot drift between call sites. The exact
// boundary matters operationally: a node that last reported exactly 20s ago is
// already treated as stale, which moves the primary to maintenance instead of
// forwarding to it (the round-2 change from `> 20s` to `>= 20s`, deliberate).
func TestNodeFreshnessBoundary(t *testing.T) {
	now := time.Date(2026, 10, 24, 12, 0, 0, 0, time.UTC)
	cases := []struct {
		name     string
		lastSeen time.Time
		fresh    bool
	}{
		{"zero value is never fresh", time.Time{}, false},
		{"just seen", now, true},
		{"1ns before the boundary", now.Add(-nodeFreshness + time.Nanosecond), true},
		{"exactly at the boundary is stale", now.Add(-nodeFreshness), false},
		{"1ns past the boundary", now.Add(-nodeFreshness - time.Nanosecond), false},
		{"far in the future is fresh", now.Add(time.Hour), true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			n := Node{LastSeen: tc.lastSeen}
			if got := n.Fresh(now); got != tc.fresh {
				t.Fatalf("Fresh = %v, want %v", got, tc.fresh)
			}
		})
	}
}

// ServingLocal adds Ready and Mode=="local" but deliberately not Enabled: several
// callers route to a node regardless of its scheduling state, and folding
// Enabled in would change where requests for disabled nodes are forwarded. This
// test freezes that decision.
func TestNodeServingLocalConditions(t *testing.T) {
	now := time.Date(2026, 10, 24, 12, 0, 0, 0, time.UTC)
	serving := Node{LastSeen: now, Ready: true, Mode: "local"}
	if !serving.ServingLocal(now) {
		t.Fatal("fresh + ready + local must serve")
	}
	cases := []struct {
		name string
		node Node
		want bool
	}{
		{"disabled but ready still serves", Node{LastSeen: now, Ready: true, Mode: "local", Enabled: false}, true},
		{"enabled but not ready", Node{LastSeen: now, Ready: false, Mode: "local", Enabled: true}, false},
		{"not local mode", Node{LastSeen: now, Ready: true, Mode: "candidate", Enabled: true}, false},
		{"stale", Node{LastSeen: now.Add(-nodeFreshness), Ready: true, Mode: "local", Enabled: true}, false},
		{"zero LastSeen", Node{Ready: true, Mode: "local", Enabled: true}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.node.ServingLocal(now); got != tc.want {
				t.Fatalf("ServingLocal = %v, want %v", got, tc.want)
			}
		})
	}
}
