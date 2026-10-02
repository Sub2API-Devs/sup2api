//go:build linux

package control

import (
	"context"
	"io"
	"net/http"
	"testing"
	"time"
)

// TestRealCoreCPUOffloadMovesNewRequests runs three real cores and makes one
// node report a CPU above the threshold set in the console's system settings.
// Its new requests then go to the idle serving nodes, the primary's to its
// followers included, and come back once the load drops; requests stay local
// when there is no idle node or the setting is off. CPU readings are injected,
// all shells share this test process.
func TestRealCoreCPUOffloadMovesNewRequests(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()
	const adminEmail, adminPassword = "admin@real.test", "Real-core-admin-pass!"
	c := newRealCluster(t, ctx, realOptions{coreEnv: []string{"SUB2API_BOOTSTRAP_ADMIN_EMAIL=" + adminEmail, "SUB2API_BOOTSTRAP_ADMIN_PASSWORD=" + adminPassword}})
	tick := time.NewTicker(200 * time.Millisecond)
	defer tick.Stop()
	wait := func(what string, fn func() bool) {
		t.Helper()
		deadline := time.Now().Add(2 * time.Minute)
		for !fn() {
			if time.Now().After(deadline) {
				t.Fatalf("timed out waiting for %s", what)
			}
			select {
			case <-ctx.Done():
				t.Fatal(ctx.Err())
			case <-tick.C:
			}
		}
	}
	for _, id := range []string{"a", "b", "c"} {
		c.startShell(id)
	}
	if err := c.node("a").engine.Recover(ctx, true); err != nil {
		t.Fatal("bootstrap primary", err)
	}
	_ = c.node("a").engine.Heartbeat(ctx)
	for _, id := range []string{"b", "c"} {
		if err := c.node(id).engine.Recover(ctx, false); err != nil {
			t.Fatal("join follower", err)
		}
	}
	for _, n := range c.list() {
		c.run(n)
	}
	for _, n := range c.list() {
		wait(n.id+" serving", func() bool {
			st, mode, err := n.runtime.Status(ctx)
			return err == nil && st.Ready && mode == "local"
		})
	}
	a, b, cc := c.node("a"), c.node("b"), c.node("c")

	// 30 unauthenticated business requests through a's entrance: each is
	// answered by a core (401), and the forward counters show which.
	send := func() (toB, toC int64) {
		t.Helper()
		b0, c0 := b.forwards.Load(), cc.forwards.Load()
		for i := 0; i < 30; i++ {
			res, err := http.Get(a.public.URL + "/api/v1/key/prices")
			if err != nil {
				t.Fatal(err)
			}
			_, _ = io.Copy(io.Discard, res.Body)
			res.Body.Close()
			if res.StatusCode != 401 {
				t.Fatalf("request %d through a: HTTP %d", i, res.StatusCode)
			}
		}
		return b.forwards.Load() - b0, cc.forwards.Load() - c0
	}
	marked := func(n *realNode) bool {
		var v bool
		_ = c.db.QueryRow(ctx, `SELECT offloading FROM updater.nodes WHERE node_id=$1`, n.id).Scan(&v)
		return v
	}
	offloading := func(n *realNode, want bool) func() bool {
		return func() bool { return n.runtime.Router.Offloading() == want && marked(n) == want }
	}

	// ---- the setting is changed from the console, through any node
	admin := newAPIClient(t, cc.public.URL).login(adminEmail, adminPassword)
	a.cpu.Store(95)
	time.Sleep(3 * time.Second)
	if toB, toC := send(); toB+toC != 0 || a.runtime.Router.Offloading() {
		t.Fatalf("offloaded while the setting is off: b=%d c=%d", toB, toC)
	}
	if r := admin.do(http.MethodPut, "/api/v1/system/offload", map[string]any{"cpu_threshold_percent": 30}, nil); r.status != 400 {
		t.Fatalf("threshold outside the range: %s", r)
	}
	state := admin.ok(http.MethodPut, "/system/offload", map[string]any{"enabled": true, "cpu_threshold_percent": 80})
	if state.get("data.enabled") != true || state.str("data.cpu_threshold_percent") != "80" {
		t.Fatalf("setting not saved: %s", state)
	}
	wait("a offloading", offloading(a, true))
	toB, toC := send()
	if toB == 0 || toC == 0 || toB+toC != 30 {
		t.Fatalf("an overloaded primary must hand every new request to its idle followers: b=%d c=%d", toB, toC)
	}
	t.Logf("primary a at 95%%: 30 requests answered by b (%d) and c (%d)", toB, toC)
	view := admin.ok(http.MethodGet, "/system/offload", nil)
	if nodes, _ := view.get("data.nodes").([]any); len(nodes) != 3 {
		t.Fatalf("console view lists %d nodes: %s", len(nodes), view)
	}

	// ---- a busy follower is skipped; with no idle node a serves locally
	b.cpu.Store(75)
	wait("b no longer a target", func() bool { _, toC := send(); return toC == 30 })
	cc.cpu.Store(85)
	wait("no idle node left", offloading(a, false))
	if toB, toC := send(); toB+toC != 0 {
		t.Fatalf("handed off with no idle node: b=%d c=%d", toB, toC)
	}
	// c is above the threshold too, but with a and b busy it has no target.
	if a.runtime.Router.Offloading() || b.runtime.Router.Offloading() || cc.runtime.Router.Offloading() {
		t.Fatal("a node offloads without an idle target")
	}

	// ---- hysteresis: a keeps offloading until it is 10 points below
	b.cpu.Store(20)
	cc.cpu.Store(20)
	wait("a offloading again", offloading(a, true))
	a.cpu.Store(75)
	time.Sleep(3 * time.Second)
	if toB, toC := send(); toB+toC != 30 {
		t.Fatalf("stopped above the lower bound: b=%d c=%d", toB, toC)
	}
	a.cpu.Store(65)
	wait("a back to local", offloading(a, false))
	if toB, toC := send(); toB+toC != 0 {
		t.Fatalf("still handing off below the lower bound: b=%d c=%d", toB, toC)
	}

	// ---- a follower offloads too, and turning the setting off ends it
	b.cpu.Store(99)
	wait("b offloading", offloading(b, true))
	before := cc.forwards.Load() + a.forwards.Load()
	res, err := http.Get(b.public.URL + "/api/v1/key/prices")
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != 401 || cc.forwards.Load()+a.forwards.Load() != before+1 {
		t.Fatalf("follower b did not hand its request to an idle node: HTTP %d", res.StatusCode)
	}
	admin.ok(http.MethodPut, "/system/offload", map[string]any{"enabled": false})
	wait("b back to local", offloading(b, false))
	t.Log("follower b offloaded at 99% and stopped when the setting was turned off")
}
