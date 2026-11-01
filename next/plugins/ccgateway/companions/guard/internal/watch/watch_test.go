package watch

import (
	"context"
	"net/netip"
	"reflect"
	"sort"
	"sync"
	"testing"
	"time"

	"ccgateway/guard/internal/dockerapi"
	"ccgateway/guard/internal/dockerapi/fakedocker"
)

type recFW struct {
	mu     sync.Mutex
	calls  [][]string // nil element = all
	recon  int
	forget []string
}

func (r *recFW) Recompute(reason string, aids ...string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if aids == nil {
		aids = []string{"*"}
	}
	r.calls = append(r.calls, aids)
}
func (r *recFW) Reconcile() { r.mu.Lock(); r.recon++; r.mu.Unlock() }
func (r *recFW) ForgetContainer(id string) {
	r.mu.Lock()
	r.forget = append(r.forget, id)
	r.mu.Unlock()
}
func (r *recFW) snapshot() ([][]string, int) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([][]string(nil), r.calls...), r.recon
}

func ev(typ, action, name string) dockerapi.Event {
	e := dockerapi.Event{Type: typ, Action: action}
	e.Actor.ID = "id-" + name
	e.Actor.Attributes = map[string]string{"name": name}
	return e
}

// covers: 03§8.2 event routing: own prefix, isolated prefix, unrelated names, ignored actions
func TestRoute(t *testing.T) {
	w := &Watcher{C: Config{Prefix: "ccg", ControlNetwork: "ccg-control"}}
	cases := []struct {
		e            dockerapi.Event
		aid          string
		all, control bool
	}{
		{ev("container", "start", "ccg-21-app"), "21", false, false},
		{ev("container", "die", "ccg-d0123456789abcdef-app"), "d0123456789abcdef", false, false},
		{ev("container", "destroy", "ccg-shared-egress"), "", true, false},
		{ev("container", "start", "ccg-controller"), "", false, true},
		{ev("network", "connect", "ccg-21-net"), "21", false, false},
		{ev("network", "disconnect", "ccg-control"), "", false, true},
		{ev("container", "start", "ccg-gt-d00000000000a0001-app"), "", false, false},
		{ev("container", "start", "ccg-21-egress"), "", false, false},
		{ev("container", "start", "caddy"), "", false, false},
		{ev("container", "exec_start", "ccg-21-app"), "", false, false},
		{ev("container", "health_status", "ccg-controller"), "", false, false},
		{ev("network", "connect", "ccg-21-uplink"), "", false, false},
	}
	for i, c := range cases {
		aid, all, control := w.Route(c.e)
		if aid != c.aid || all != c.all || control != c.control {
			t.Errorf("case %d: %q %v %v", i, aid, all, control)
		}
	}
}

func fakeWorld(t *testing.T, project string) *fakedocker.Fake {
	f := fakedocker.New()
	f.Start()
	t.Cleanup(f.Close)
	f.AddImage("sha256:"+fakedocker.RandID(), nil, "ctl:1")
	f.AddNetwork(&fakedocker.Network{Name: "ccg-control", Subnet: "172.29.255.0/29"})
	f.AddContainer(&fakedocker.Container{Name: "ccg-controller", Status: "running",
		Labels:   map[string]string{"com.docker.compose.project": project, "com.docker.compose.service": "controller"},
		Networks: map[string]string{"ccg-control": "172.29.255.2"}})
	return f
}

// covers: U6 03§8.4 controller identity on the control network
func TestControlCheck(t *testing.T) {
	cfg := Config{Prefix: "ccg", ControlNetwork: "ccg-control", ControllerIP: netip.MustParseAddr("172.29.255.2"), Project: "ccgateway"}
	f := fakeWorld(t, "ccgateway")
	d := dockerapi.NewDialer(f.Dial)
	s := &State{}
	w := &Watcher{C: cfg, D: d, FW: &recFW{}, S: s}
	w.CheckControl(context.Background())
	if !s.ControllerOK() {
		t.Fatal("compose controller")
	}
	// A foreign container on the control network: still ok, but reported.
	f.AddContainer(&fakedocker.Container{Name: "intruder", Status: "running", Networks: map[string]string{"ccg-control": "172.29.255.3"}})
	w.CheckControl(context.Background())
	if _, foreign := s.Snapshot(); !reflect.DeepEqual(foreign, []string{"intruder"}) || !s.ControllerOK() {
		t.Fatalf("%v", foreign)
	}
	// Wrong project label (docker-py controller, or another project).
	for _, p := range []string{"", "ccgateway-gt"} {
		f2 := fakeWorld(t, p)
		s2 := &State{}
		(&Watcher{C: cfg, D: dockerapi.NewDialer(f2.Dial), FW: &recFW{}, S: s2}).CheckControl(context.Background())
		if s2.ControllerOK() {
			t.Fatalf("project %q accepted", p)
		}
	}
	// .2 held by another container.
	f3 := fakedocker.New()
	f3.Start()
	t.Cleanup(f3.Close)
	f3.AddNetwork(&fakedocker.Network{Name: "ccg-control", Subnet: "172.29.255.0/29"})
	f3.AddContainer(&fakedocker.Container{Name: "fake-controller", Status: "running",
		Labels:   map[string]string{"com.docker.compose.project": "ccgateway", "com.docker.compose.service": "controller"},
		Networks: map[string]string{"ccg-control": "172.29.255.2"}})
	s3 := &State{}
	(&Watcher{C: cfg, D: dockerapi.NewDialer(f3.Dial), FW: &recFW{}, S: s3}).CheckControl(context.Background())
	if s3.ControllerOK() {
		t.Fatal("wrong name accepted")
	}
	// No control network at all (S1–S4).
	f4 := fakedocker.New()
	f4.Start()
	t.Cleanup(f4.Close)
	s4 := &State{}
	(&Watcher{C: cfg, D: dockerapi.NewDialer(f4.Dial), FW: &recFW{}, S: s4}).CheckControl(context.Background())
	if s4.ControllerOK() {
		t.Fatal("missing network")
	}
}

func waitFor(t *testing.T, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for !cond() {
		if time.Now().After(deadline) {
			t.Fatal("timeout")
		}
		time.Sleep(5 * time.Millisecond)
	}
}

// covers: 03§8.2 debounce: 200 ms merge, 1 s cap; destroy forgets caches
func TestDebounce(t *testing.T) {
	f := fakeWorld(t, "ccgateway")
	fw := &recFW{}
	w := &Watcher{C: Config{Prefix: "ccg", ControlNetwork: "ccg-control", ControllerIP: netip.MustParseAddr("172.29.255.2"),
		Project: "ccgateway", Quiet: 60 * time.Millisecond, Max: 300 * time.Millisecond, Period: time.Hour},
		D: dockerapi.NewDialer(f.Dial), FW: fw, S: &State{}}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go w.Run(ctx, time.Now())
	waitFor(t, func() bool { return f.Subscribers() == 1 })
	f.Emit("container", "start", "x", map[string]string{"name": "ccg-21-app"})
	f.Emit("container", "start", "y", map[string]string{"name": "ccg-22-app"})
	f.Emit("network", "connect", "z", map[string]string{"name": "ccg-21-net"})
	waitFor(t, func() bool { c, _ := fw.snapshot(); return len(c) == 1 })
	calls, _ := fw.snapshot()
	got := append([]string(nil), calls[0]...)
	sort.Strings(got)
	if !reflect.DeepEqual(got, []string{"21", "22"}) {
		t.Fatalf("%v", calls)
	}
	// A steady stream is flushed at most Max after its first event.
	stop := time.Now().Add(700 * time.Millisecond)
	start := time.Now()
	for time.Now().Before(stop) {
		f.Emit("container", "die", "x", map[string]string{"name": "ccg-21-app"})
		time.Sleep(20 * time.Millisecond)
	}
	calls, _ = fw.snapshot()
	if len(calls) < 2 {
		t.Fatalf("no flush during a steady stream after %v", time.Since(start))
	}
	// Gateway events recompute every account.
	n := len(calls)
	f.Emit("container", "destroy", "gwid", map[string]string{"name": "ccg-shared-egress"})
	waitFor(t, func() bool {
		c, _ := fw.snapshot()
		return len(c) > n && c[len(c)-1][0] == "*"
	})
	fw.mu.Lock()
	forgot := append([]string(nil), fw.forget...)
	fw.mu.Unlock()
	if len(forgot) != 1 || forgot[0] != "gwid" {
		t.Fatalf("%v", forgot)
	}
}

// covers: 03§8.5 reconnect after a dropped stream, then full reconciliation
func TestReconnect(t *testing.T) {
	f := fakeWorld(t, "ccgateway")
	fw := &recFW{}
	w := &Watcher{C: Config{Prefix: "ccg", ControlNetwork: "ccg-control", ControllerIP: netip.MustParseAddr("172.29.255.2"),
		Project: "ccgateway", Period: time.Hour}, D: dockerapi.NewDialer(f.Dial), FW: fw, S: &State{}}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go w.Run(ctx, time.Now())
	waitFor(t, func() bool { return f.Subscribers() == 1 })
	f.DropEvents()
	waitFor(t, func() bool { _, r := fw.snapshot(); return r >= 1 })
	waitFor(t, func() bool { return f.Subscribers() == 1 })
	f.Emit("container", "start", "x", map[string]string{"name": "ccg-21-app"})
	waitFor(t, func() bool { c, _ := fw.snapshot(); return len(c) >= 1 })
}
