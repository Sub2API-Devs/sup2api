package rollout

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/grpcruntime"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// ------------------------------------------------------------------ fakes (no database)

type memNode struct{ boot string }

func (n memNode) NodeID() string                                     { return "node-" + n.boot }
func (n memNode) BootID() string                                     { return n.boot }
func (memNode) LiveNodes(context.Context) ([]core.NodeStatus, error) { return nil, nil }
func (memNode) IsAlive(context.Context, string) (bool, error)        { return true, nil }
func (memNode) ReportPlugin(context.Context, string, string) error   { return nil }
func (memNode) Healthy() bool                                        { return true }

type stubInst struct {
	pkg *registry.Package

	mu        sync.Mutex
	state     string
	stale     bool // limitsAware: limits changed
	refreshed int
	drained   chan struct{}
	block     chan struct{} // Drain waits for it when set

	broadcast bool
	got       chan grpcruntime.BroadcastMessage
	fail      error
}

func newStub(pkg *registry.Package) *stubInst {
	return &stubInst{pkg: pkg, state: grpcruntime.StateReady, drained: make(chan struct{}),
		got: make(chan grpcruntime.BroadcastMessage, 8)}
}

func (f *stubInst) Package() *registry.Package      { return f.pkg }
func (f *stubInst) Grants() registry.Grants         { return registry.Grants{} }
func (f *stubInst) Platform() core.PlatformPlugin   { return nil }
func (f *stubInst) Hook() core.HookPlugin           { return nil }
func (f *stubInst) App() core.AppPlugin             { return nil }
func (f *stubInst) HTTP() core.HTTPPlugin           { return nil }
func (f *stubInst) Scheduler() core.SchedulerPlugin { return nil }
func (f *stubInst) Restarts() int                   { return 0 }
func (f *stubInst) MigrateData(context.Context, string, string) error {
	return nil
}
func (f *stubInst) Refresh(context.Context) error {
	f.mu.Lock()
	f.refreshed++
	f.mu.Unlock()
	return nil
}
func (f *stubInst) State() (string, string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.state, ""
}
func (f *stubInst) Drain(time.Duration) {
	if f.block != nil {
		<-f.block
	}
	f.Stop()
}
func (f *stubInst) Stop() {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.state != grpcruntime.StateStopped {
		f.state = grpcruntime.StateStopped
		close(f.drained)
	}
}
func (f *stubInst) isStopped() bool { s, _ := f.State(); return s == grpcruntime.StateStopped }

// staleInst additionally implements limitsAware.
type staleInst struct{ *stubInst }

func (f staleInst) LimitsStale() bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.stale
}

// bcInst additionally implements broadcastReceiver.
type bcInst struct{ *stubInst }

func (f bcInst) HandlesBroadcast() bool { return f.broadcast }
func (f bcInst) OnBroadcast(_ context.Context, m grpcruntime.BroadcastMessage) error {
	f.got <- m
	return f.fail
}

type stubRuntime struct {
	mu    sync.Mutex
	fail  error
	loads int
	made  []*stubInst
	wrap  func(*stubInst) Instance
}

func (r *stubRuntime) Load(_ context.Context, pkg *registry.Package) (Instance, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.loads++
	if r.fail != nil {
		return nil, r.fail
	}
	s := newStub(pkg)
	r.made = append(r.made, s)
	if r.wrap != nil {
		return r.wrap(s), nil
	}
	return s, nil
}

func loadPkg(t *testing.T, dir, key, version string, caps ...string) *registry.Package {
	t.Helper()
	m := registrytest.Manifest(key, version)
	m.Capabilities = nil
	m.Platforms, m.AccountTypes, m.Hooks, m.Routes = nil, nil, nil, nil
	for _, c := range caps {
		m.Capabilities = append(m.Capabilities, manifest.Capability{ID: c})
	}
	p, err := registry.LoadPackage(dir, registrytest.Package(t, m, []byte("bin"), nil), "", "unsigned")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = p.Close() })
	return p
}

func newTestController(t *testing.T, rt Runtime, bus core.Bus, dir string) *Controller {
	t.Helper()
	c, err := New(Options{
		DB: &store.DB{}, Node: memNode{"boot-self"}, Bus: bus,
		Packages: registry.NewPackages(nil, dir), Registry: registry.New(), Runtime: rt,
		DrainTimeout: time.Second, LoadRetry: time.Hour,
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { c.hub.close() })
	return c
}

// serve puts inst in the slot of its plugin as the serving version.
func (c *Controller) serveForTest(inst Instance) {
	pkg := inst.Package()
	s := c.slotFor(pkg.Key)
	s.mu.Lock()
	s.entries[pkg.Version] = &entry{version: pkg.Version, inst: inst, epoch: 1}
	s.serving = pkg.Version
	s.mu.Unlock()
	c.republish()
}

func (c *Controller) entryForTest(key, version string) *entry {
	c.mu.Lock()
	s := c.slots[key]
	c.mu.Unlock()
	s.mu.Lock()
	defer s.mu.Unlock()
	e := *s.entries[version]
	return &e
}

func waitUntil(t *testing.T, what string, fn func() bool) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for !fn() {
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for %s", what)
		}
		time.Sleep(10 * time.Millisecond)
	}
}

// ------------------------------------------------------------------ resource restart

func TestResourceRestartReplacesInstance(t *testing.T) {
	dir := t.TempDir()
	rt := &stubRuntime{}
	c := newTestController(t, rt, nil, dir)
	old := newStub(loadPkg(t, dir, "demo", "1.0.0"))
	c.serveForTest(old)
	gen := c.o.Registry.Current().Number()

	c.onPluginEvent([]byte(`{"type":"resources","plugin_key":"demo"}`))
	waitUntil(t, "old instance drained", old.isStopped)
	waitUntil(t, "restart finished", func() bool {
		c.mu.Lock()
		defer c.mu.Unlock()
		return !c.restarting["demo"]
	})
	e := c.entryForTest("demo", "1.0.0")
	if len(rt.made) != 1 || e.inst != Instance(rt.made[0]) || e.restartErr != "" {
		t.Fatalf("entry after restart: inst=%p made=%d err=%q", e.inst, len(rt.made), e.restartErr)
	}
	if c.o.Registry.Current().Number() == gen {
		t.Fatal("generation not republished with the new instance")
	}
	if c.servingInstance("demo") != Instance(rt.made[0]) {
		t.Fatal("serving instance not switched")
	}
}

func TestResourceRestartFailureKeepsOldInstance(t *testing.T) {
	dir := t.TempDir()
	rt := &stubRuntime{fail: errors.New("health check failed")}
	c := newTestController(t, rt, nil, dir)
	old := newStub(loadPkg(t, dir, "demo", "1.0.0"))
	c.serveForTest(old)
	gen := c.o.Registry.Current().Number()

	c.restartKey("demo")
	e := c.entryForTest("demo", "1.0.0")
	if e.inst != Instance(old) || old.isStopped() {
		t.Fatal("old instance replaced or stopped after a failed restart")
	}
	if e.restartErr == "" || e.restartFailAt.IsZero() {
		t.Fatal("restart error not recorded")
	}
	if c.o.Registry.Current().Number() != gen {
		t.Fatal("generation changed after a failed restart")
	}

	// The next successful restart clears the error.
	rt.mu.Lock()
	rt.fail = nil
	rt.mu.Unlock()
	c.restartKey("demo")
	if e := c.entryForTest("demo", "1.0.0"); e.restartErr != "" || e.inst == Instance(old) {
		t.Fatalf("after retry: err=%q", e.restartErr)
	}
}

func TestResourceRestartSkipsUnchangedLimits(t *testing.T) {
	dir := t.TempDir()
	rt := &stubRuntime{wrap: func(s *stubInst) Instance { return staleInst{s} }}
	c := newTestController(t, rt, nil, dir)
	cur := staleInst{newStub(loadPkg(t, dir, "demo", "1.0.0"))}
	c.serveForTest(cur)

	c.restartKey("demo")
	if rt.loads != 0 || cur.refreshed != 1 {
		t.Fatalf("restart with unchanged limits: loads=%d refreshed=%d", rt.loads, cur.refreshed)
	}
	cur.mu.Lock()
	cur.stale = true
	cur.mu.Unlock()
	c.restartKey("demo")
	if rt.loads != 1 {
		t.Fatalf("stale limits not restarted: loads=%d", rt.loads)
	}
	waitUntil(t, "old drained", cur.isStopped)
}

func TestResourceRestartDroppedVersion(t *testing.T) {
	dir := t.TempDir()
	block := make(chan struct{})
	rt := &blockingRuntime{stubRuntime: &stubRuntime{}, release: block}
	c := newTestController(t, rt, nil, dir)
	old := newStub(loadPkg(t, dir, "demo", "1.0.0"))
	c.serveForTest(old)

	done := make(chan struct{})
	go func() { c.restartKey("demo"); close(done) }()
	waitUntil(t, "load started", func() bool { return rt.started.Load() })
	// The reconciler drops the version while the new instance starts.
	s := c.slotFor("demo")
	s.mu.Lock()
	delete(s.entries, "1.0.0")
	s.serving = ""
	s.mu.Unlock()
	close(block)
	<-done
	if len(rt.made) != 1 || !rt.made[0].isStopped() {
		t.Fatal("instance started for a dropped version was not stopped")
	}
}

type blockingRuntime struct {
	*stubRuntime
	release chan struct{}
	started atomic.Bool
}

func (r *blockingRuntime) Load(ctx context.Context, pkg *registry.Package) (Instance, error) {
	r.started.Store(true)
	<-r.release
	return r.stubRuntime.Load(ctx, pkg)
}

// ------------------------------------------------------------------ package cache cleanup

func TestSweepReleasesUnusedPackagesAfterDrain(t *testing.T) {
	dir := t.TempDir()
	c := newTestController(t, &stubRuntime{}, nil, dir)
	p1 := loadPkg(t, dir, "demo", "1.0.0")
	p2 := loadPkg(t, dir, "demo", "2.0.0")
	p3 := loadPkg(t, dir, "gone", "1.0.0")
	for _, p := range []*registry.Package{p1, p2, p3} {
		c.o.Packages.Adopt(p)
	}
	active, desired := "2.0.0", "2.0.0"
	c.setReferenced([]*pluginRow{{key: "demo", active: &active, desired: &desired}})
	v2 := newStub(p2)
	c.serveForTest(v2)

	v1 := newStub(p1)
	v1.block = make(chan struct{})
	c.drainAsync("demo", "1.0.0", v1, false)
	c.sweepPackages()
	if !dirExists(p1.Dir) {
		t.Fatal("package of a draining instance was removed")
	}
	if dirExists(p3.Dir) {
		t.Fatal("unreferenced package without instances was kept")
	}
	close(v1.block)
	waitUntil(t, "drained package released", func() bool { return !dirExists(p1.Dir) })
	if !dirExists(p2.Dir) {
		t.Fatal("serving package removed")
	}
	refs := c.o.Packages.Cached()
	if len(refs) != 1 || refs[0].Version != "2.0.0" {
		t.Fatalf("cached %v", refs)
	}
	if _, err := p1.ReadFile("manifest.json"); err == nil {
		t.Fatal("released package file still open")
	}
}

func dirExists(p string) bool { _, err := os.Stat(p); return err == nil }

func TestSetReferencedIncludesRollout(t *testing.T) {
	c := newTestController(t, &stubRuntime{}, nil, t.TempDir())
	a, from, target := "1.0.0", "1.0.0", "2.0.0"
	c.setReferenced([]*pluginRow{{key: "k", active: &a, ro: &rolloutRow{from: &from, target: &target}}})
	if !c.referenced["k"]["1.0.0"] || !c.referenced["k"]["2.0.0"] || len(c.referenced["k"]) != 2 {
		t.Fatalf("referenced %v", c.referenced)
	}
}

// ------------------------------------------------------------------ broadcast

func broadcastPayload(t *testing.T, topic, boot string) []byte {
	b, err := json.Marshal(grpcruntime.BroadcastMessage{Topic: topic, Payload: []byte("p"), SourceNodeID: "node-" + boot, SourceBootID: boot})
	if err != nil {
		t.Fatal(err)
	}
	return b
}

func TestBroadcastDelivery(t *testing.T) {
	dir := t.TempDir()
	bus := &registrytest.MemBus{}
	c := newTestController(t, &stubRuntime{}, bus, dir)

	withCap := bcInst{newStub(loadPkg(t, dir, "guard", "1.0.0", manifest.CapAppBroadcast))}
	withCap.broadcast = true
	withCap.fail = errors.New("plugin error") // failures are only logged
	noCap := bcInst{newStub(loadPkg(t, dir, "plain", "1.0.0"))}
	c.serveForTest(withCap)
	c.serveForTest(noCap)
	c.syncBroadcast()
	if got := c.hub.subscribed(); len(got) != 1 || got[0] != "guard" {
		t.Fatalf("subscribed %v", got)
	}

	ctx := context.Background()
	ch := grpcruntime.BroadcastChannel("guard")
	// From another node: delivered.
	_ = bus.Publish(ctx, ch, broadcastPayload(t, "rules.changed", "boot-other"))
	select {
	case m := <-withCap.got:
		if m.Topic != "rules.changed" || m.SourceNodeID != "node-boot-other" || string(m.Payload) != "p" {
			t.Fatalf("delivered %+v", m)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("broadcast not delivered")
	}
	// From this node: skipped. Malformed: ignored.
	_ = bus.Publish(ctx, ch, broadcastPayload(t, "rules.changed", "boot-self"))
	_ = bus.Publish(ctx, ch, []byte("{"))
	_ = bus.Publish(ctx, ch, broadcastPayload(t, "second", "boot-other"))
	select {
	case m := <-withCap.got:
		if m.Topic != "second" {
			t.Fatalf("own or malformed broadcast delivered: %+v", m)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("second broadcast not delivered")
	}
	// Plugins without the capability are not subscribed; a direct message
	// on their channel is not delivered either.
	_ = bus.Publish(ctx, grpcruntime.BroadcastChannel("plain"), broadcastPayload(t, "x", "boot-other"))
	c.hub.handle("plain", broadcastPayload(t, "x", "boot-other"))
	select {
	case m := <-noCap.got:
		t.Fatalf("delivered to plugin without app.broadcast.v1: %+v", m)
	case <-time.After(100 * time.Millisecond):
	}

	// Plugin no longer served: unsubscribed.
	s := c.slotFor("guard")
	s.mu.Lock()
	s.serving = ""
	s.mu.Unlock()
	c.syncBroadcast()
	if bus.Subscribed(ch) || len(c.hub.subscribed()) != 0 {
		t.Fatal("still subscribed after the plugin stopped serving")
	}
	c.hub.close()
	c.hub.sync([]string{"guard"})
	if bus.Subscribed(ch) {
		t.Fatal("subscribed after close")
	}
}
