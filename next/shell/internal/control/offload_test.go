package control

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/shell/internal/peer"
)

func TestOffloadTargetsNeedLoadHeadroomAndTheSameRelease(t *testing.T) {
	pct := func(v float64) *float64 { return &v }
	set := Offload{Enabled: true, CPUPercent: 80}
	self := Node{ID: "a", Mode: "local", Ready: true, ReleaseDigest: "r", CPUPercent: pct(85)}
	idle := Node{ID: "b", Enabled: true, Mode: "local", Ready: true, ReleaseDigest: "r", CoreBootID: "boot", RouteRevision: 1, LastSeen: time.Now(), CPUPercent: pct(30)}
	ids := func(nodes []Node) (out []string) {
		for _, n := range nodes {
			out = append(out, n.ID)
		}
		return
	}
	if got := ids(offloadTargets(set, self, []Node{self, idle}, false)); len(got) != 1 || got[0] != "b" {
		t.Fatalf("overloaded node must offload to the idle one: %v", got)
	}
	at := func(cpu float64, was bool) int {
		s := self
		s.CPUPercent = &cpu
		return len(offloadTargets(set, s, []Node{idle}, was))
	}
	if at(79, false) != 0 || at(80, false) != 1 || at(75, true) != 1 || at(69.9, true) != 0 {
		t.Fatal("offload must start at the threshold and stop ten points below it")
	}
	for name, mutate := range map[string]func(*Node){
		"busy":          func(n *Node) { n.CPUPercent = pct(70) },
		"unmeasured":    func(n *Node) { n.CPUPercent = nil },
		"offloading":    func(n *Node) { n.Offloading = true },
		"forwarding":    func(n *Node) { n.Mode = "forward" },
		"not ready":     func(n *Node) { n.Ready = false },
		"disabled":      func(n *Node) { n.Enabled = false },
		"other release": func(n *Node) { n.ReleaseDigest = "other" },
		"silent":        func(n *Node) { n.LastSeen = time.Now().Add(-time.Minute) },
		"no route":      func(n *Node) { n.RouteRevision = 0 },
	} {
		n := idle
		mutate(&n)
		if len(offloadTargets(set, self, []Node{n}, true)) != 0 {
			t.Errorf("%s node took offloaded traffic", name)
		}
	}
	for name, s := range map[string]Node{
		"forwarding self": {ID: "a", Mode: "forward", Ready: true, ReleaseDigest: "r", CPUPercent: pct(99)},
		"unmeasured self": {ID: "a", Mode: "local", Ready: true, ReleaseDigest: "r"},
	} {
		if len(offloadTargets(set, s, []Node{idle}, true)) != 0 {
			t.Errorf("%s offloaded", name)
		}
	}
	if len(offloadTargets(Offload{CPUPercent: 80}, self, []Node{idle}, true)) != 0 {
		t.Fatal("disabled setting offloaded")
	}
}

// shedRuntime records offload changes together with the node's stored mark.
type shedRuntime struct {
	*fakeRuntime
	store *Store
	node  string
	log   []string
}

func (r *shedRuntime) SetOffload(nodes []Node) error {
	var marked bool
	_ = r.store.DB.QueryRow(context.Background(), `SELECT offloading FROM updater.nodes WHERE node_id=$1`, r.node).Scan(&marked)
	entry := "local"
	if len(nodes) > 0 {
		entry = "shed:" + nodes[0].ID
	}
	if marked {
		entry += "(marked)"
	}
	if len(r.log) == 0 || r.log[len(r.log)-1] != entry {
		r.log = append(r.log, entry)
	}
	return nil
}

func TestPostgresCPUOffloadIsMarkedBeforeSheddingAndAuthorizesForwards(t *testing.T) {
	s, a, b, _ := setupEngines(t)
	ctx := context.Background()
	ar := &shedRuntime{fakeRuntime: a.Runtime.(*fakeRuntime), store: s, node: a.Node.ID}
	a.Runtime = ar
	cpuA, cpuB, measuredB := 99.0, 20.0, true
	a.CPU = func() (float64, bool) { return cpuA, true }
	b.CPU = func() (float64, bool) { return cpuB, measuredB }
	beat := func() {
		t.Helper()
		if err := b.Heartbeat(ctx); err != nil {
			t.Fatal(err)
		}
		if err := a.Heartbeat(ctx); err != nil {
			t.Fatal(err)
		}
	}
	forward := func() error { return s.AuthorizePeer(ctx, a.Node.ID, "boot", b.Node.ID, "forward", "") }
	beat()
	if len(ar.log) != 1 || ar.log[0] != "local" || !errors.Is(forward(), peer.ErrForbidden) {
		t.Fatalf("offload while disabled: %v %v", ar.log, forward())
	}
	for _, bad := range []int{OffloadMinPercent - 1, OffloadMaxPercent + 1} {
		if _, err := s.SetOffload(ctx, OffloadPatch{CPUPercent: &bad}); !errors.Is(err, errOffloadRange) {
			t.Fatalf("threshold %d accepted: %v", bad, err)
		}
	}
	on, threshold := true, 80
	if o, err := s.SetOffload(ctx, OffloadPatch{Enabled: &on, CPUPercent: &threshold}); err != nil || o != (Offload{true, 80}) {
		t.Fatal(o, err)
	}

	cpuA = 85
	beat()
	if ar.log[len(ar.log)-1] != "shed:"+b.Node.ID+"(marked)" {
		t.Fatalf("shedding must start after the mark is stored: %v", ar.log)
	}
	if err := forward(); err != nil {
		t.Fatalf("offloading primary may forward to a serving follower: %v", err)
	}
	if err := s.AuthorizePeer(ctx, a.Node.ID, "boot", b.Node.ID, "core-artifact", ""); !errors.Is(err, peer.ErrForbidden) {
		t.Fatalf("offloading grants only forwarding: %v", err)
	}
	if err := s.AuthorizePeer(ctx, b.Node.ID, "boot", a.Node.ID, "forward", ""); err != nil {
		t.Fatalf("follower forwarding to the primary is unchanged: %v", err)
	}
	cpuA = 75
	beat()
	if ar.log[len(ar.log)-1] != "shed:"+b.Node.ID+"(marked)" {
		t.Fatalf("offload stopped above the lower bound: %v", ar.log)
	}

	// The follower filling up ends the offload; the mark is cleared only after
	// shedding stopped.
	cpuB = 75
	beat()
	if ar.log[len(ar.log)-1] != "local(marked)" || !errors.Is(forward(), peer.ErrForbidden) {
		t.Fatalf("shedding must stop before the mark is cleared: %v %v", ar.log, forward())
	}
	cpuB = 20
	beat()
	if ar.log[len(ar.log)-1] != "local" {
		t.Fatalf("restarted below the threshold: %v", ar.log)
	}
	cpuA = 80
	beat()
	if ar.log[len(ar.log)-1] != "shed:"+b.Node.ID+"(marked)" {
		t.Fatalf("did not restart at the threshold: %v", ar.log)
	}
	measuredB = false
	beat()
	if ar.log[len(ar.log)-1] != "local(marked)" {
		t.Fatalf("an unmeasured node took offloaded traffic: %v", ar.log)
	}
	beat()

	// A new shell boot starts unmeasured and not offloading.
	cpuB, measuredB = 20, true
	beat()
	beat()
	n := a.Node
	n.ShellBootID = "boot-2"
	if err := s.Register(ctx, n); err != nil {
		t.Fatal(err)
	}
	nodes, err := s.Nodes(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for _, n := range nodes {
		if n.ID == a.Node.ID && (n.Offloading || n.CPUPercent != nil) {
			t.Fatalf("new boot inherited load state: %+v", n)
		}
	}
}
