package rollout_test

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/dbschema"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/grpcruntime"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/rollout"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// ------------------------------------------------------------------ fakes

type fakeInst struct {
	pkg *registry.Package
	rt  *fakeRuntime

	mu       sync.Mutex
	state    string
	migrated string
}

func (f *fakeInst) Package() *registry.Package      { return f.pkg }
func (f *fakeInst) Grants() registry.Grants         { return registry.Grants{} }
func (f *fakeInst) Platform() core.PlatformPlugin   { return nil }
func (f *fakeInst) Hook() core.HookPlugin           { return nil }
func (f *fakeInst) App() core.AppPlugin             { return nil }
func (f *fakeInst) HTTP() core.HTTPPlugin           { return nil }
func (f *fakeInst) Scheduler() core.SchedulerPlugin { return nil }
func (f *fakeInst) Restarts() int                   { return 0 }
func (f *fakeInst) Refresh(context.Context) error   { return nil }
func (f *fakeInst) Drain(time.Duration)             { f.Stop() }
func (f *fakeInst) Stop()                           { f.set(grpcruntime.StateStopped) }
func (f *fakeInst) set(s string)                    { f.mu.Lock(); f.state = s; f.mu.Unlock() }
func (f *fakeInst) State() (string, string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.state == grpcruntime.StateStarting && !f.rt.held(f.pkg.Version) {
		f.state = grpcruntime.StateReady
	}
	return f.state, ""
}
func (f *fakeInst) MigrateData(_ context.Context, from, to string) error {
	f.mu.Lock()
	f.migrated = from + "->" + to
	f.mu.Unlock()
	return nil
}

type fakeRuntime struct {
	mu    sync.Mutex
	hold  map[string]bool
	fail  map[string]bool
	insts []*fakeInst
}

func newFakeRuntime() *fakeRuntime {
	return &fakeRuntime{hold: map[string]bool{}, fail: map[string]bool{}}
}

func (r *fakeRuntime) held(v string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.hold[v]
}

func (r *fakeRuntime) setHold(v string, on bool) {
	r.mu.Lock()
	r.hold[v] = on
	r.mu.Unlock()
}

func (r *fakeRuntime) Load(_ context.Context, pkg *registry.Package) (rollout.Instance, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.fail[pkg.Version] {
		return nil, fmt.Errorf("simulated start failure of %s", pkg.Version)
	}
	f := &fakeInst{pkg: pkg, rt: r, state: grpcruntime.StateStarting}
	r.insts = append(r.insts, f)
	return f, nil
}

func (r *fakeRuntime) instances(version string) []*fakeInst {
	r.mu.Lock()
	defer r.mu.Unlock()
	var out []*fakeInst
	for _, f := range r.insts {
		if f.pkg.Version == version {
			out = append(out, f)
		}
	}
	return out
}

type recorder struct {
	mu       sync.Mutex
	active   []bool
	defaults []string
	events   []string
}

func (r *recorder) SyncPlugin(context.Context, pgx.Tx, string, []core.PermissionDef, []string) error {
	return nil
}
func (r *recorder) SetPluginActive(_ context.Context, _ pgx.Tx, _ string, active bool) error {
	r.mu.Lock()
	r.active = append(r.active, active)
	r.mu.Unlock()
	return nil
}
func (r *recorder) DeletePlugin(context.Context, pgx.Tx, string) error { return nil }
func (r *recorder) ApplyDefaults(_ context.Context, _ pgx.Tx, m *manifest.Manifest, _ []string) error {
	r.mu.Lock()
	r.defaults = append(r.defaults, m.Version)
	r.mu.Unlock()
	return nil
}
func (r *recorder) Emit(_ context.Context, _ pgx.Tx, evs ...core.Event) error {
	r.mu.Lock()
	for _, e := range evs {
		p := e.Payload.(map[string]any)
		r.events = append(r.events, fmt.Sprintf("%s:%s", e.Type, p["version"]))
	}
	r.mu.Unlock()
	return nil
}
func (r *recorder) snapshot() ([]bool, []string, []string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]bool(nil), r.active...), append([]string(nil), r.defaults...), append([]string(nil), r.events...)
}

// ------------------------------------------------------------------ harness

type node struct {
	name string
	reg  *registry.Registry
	rt   *fakeRuntime
	ctl  *rollout.Controller
	node *registrytest.Node
	pkgs *registry.Packages
}

func (n *node) version(key string) string {
	if p, ok := n.reg.Current().Plugin(key); ok {
		return p.Version
	}
	return ""
}

type harness struct {
	t   *testing.T
	db  *store.DB
	rdb *redis.Client
	rec *recorder
	key string
	bin []byte
}

func newHarness(t *testing.T) *harness {
	db := testutil.DB(t)
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return &harness{t: t, db: db, rdb: rdb, rec: &recorder{}, key: "ro" + hex.EncodeToString(b), bin: []byte("not-a-binary")}
}

func (h *harness) manifest(version string) *manifest.Manifest {
	m := registrytest.Manifest(h.key, version)
	m.Capabilities = append(m.Capabilities, manifest.Capability{ID: manifest.CapMigrationData})
	return m
}

func (h *harness) pkg(version string, migrations ...string) []byte {
	extra := map[string][]byte{}
	for i, sql := range migrations {
		extra[fmt.Sprintf("migrations/%04d.sql", i+1)] = []byte(sql)
	}
	return registrytest.Package(h.t, h.manifest(version), h.bin, extra)
}

func (h *harness) node(name, boot string) *node {
	t := h.t
	reg := registry.New()
	rt := newFakeRuntime()
	pkgs := registry.NewPackages(h.db, t.TempDir())
	t.Cleanup(pkgs.Close)
	nd := &registrytest.Node{RDB: h.rdb, ID: name, Boot: boot}
	nd.Heartbeat(context.Background())
	ctl, err := rollout.New(rollout.Options{
		DB: h.db, Node: nd, Bus: registrytest.Bus{RDB: h.rdb}, Packages: pkgs, Registry: reg, Runtime: rt,
		Schemas:  dbschema.New(h.db, h.db.Pool.Config().ConnString(), make([]byte, 32), false),
		Defaults: h.rec, Perms: h.rec, Events: h.rec,
		ReconcileInterval: 150 * time.Millisecond,
		LeaseTTL:          8 * time.Second,
		LeaseRenew:        time.Second,
		CoordinatorTick:   100 * time.Millisecond,
		PrepareTimeout:    60 * time.Second,
		ActivateTimeout:   20 * time.Second,
		DrainTimeout:      time.Second,
		LoadRetry:         300 * time.Millisecond,
	})
	if err != nil {
		t.Fatal(err)
	}
	ctl.Start(context.Background())
	t.Cleanup(func() { ctl.Stop(context.Background()) })
	return &node{name: name, reg: reg, rt: rt, ctl: ctl, node: nd, pkgs: pkgs}
}

func (h *harness) plugin() (status, active, desired string) {
	var a, d *string
	if err := h.db.Pool.QueryRow(context.Background(), `SELECT status, active_version, desired_version FROM plugins WHERE key = $1`, h.key).
		Scan(&status, &a, &d); err != nil {
		h.t.Fatal(err)
	}
	if a != nil {
		active = *a
	}
	if d != nil {
		desired = *d
	}
	return
}

func (h *harness) rolloutRow(id int64) (phase, coordBoot, errMsg string) {
	if err := h.db.Pool.QueryRow(context.Background(), `SELECT phase, COALESCE(coordinator_boot_id, ''), error FROM plugin_rollouts WHERE id = $1`, id).
		Scan(&phase, &coordBoot, &errMsg); err != nil {
		h.t.Fatal(err)
	}
	return
}

func waitFor(t *testing.T, what string, fn func() bool) {
	t.Helper()
	deadline := time.Now().Add(60 * time.Second)
	for time.Now().Before(deadline) {
		if fn() {
			return
		}
		time.Sleep(25 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for %s", what)
}

// ------------------------------------------------------------------ tests

func TestTwoNodeRollout(t *testing.T) {
	h := newHarness(t)
	ctx := context.Background()
	registrytest.Install(t, h.db, h.manifest("1.0.0"), h.pkg("1.0.0", `CREATE TABLE a (id int);`), map[string]string{"db.schema": "{}"}, "installed")
	t.Cleanup(func() { _ = dbschema.New(h.db, "", nil, false).Drop(context.Background(), h.key) })

	a := h.node("node-a", "boot-a")
	b := h.node("node-b", "boot-b")

	// ---- enable: both nodes prepare, then activate together.
	r, err := a.ctl.Enable(ctx, h.key, 0)
	if err != nil {
		t.Fatal(err)
	}
	if r.Phase != rollout.PhasePreparing || r.TargetVersion != "1.0.0" || r.Action != "enable" {
		t.Fatalf("rollout = %+v", r)
	}
	if _, err := b.ctl.Enable(ctx, h.key, 0); core.AsError(err).Code != "conflict" {
		t.Fatalf("second enable: %v", err)
	}
	waitFor(t, "enable completes", func() bool {
		s, act, _ := h.plugin()
		return s == "enabled" && act == "1.0.0"
	})
	if a.version(h.key) != "1.0.0" || b.version(h.key) != "1.0.0" {
		t.Fatalf("generations: a=%q b=%q", a.version(h.key), b.version(h.key))
	}
	if phase, _, _ := h.rolloutRow(r.ID); phase != rollout.PhaseActive {
		t.Fatalf("phase = %s", phase)
	}
	var nodesActive int
	_ = h.db.Pool.QueryRow(ctx, `SELECT count(*) FROM plugin_rollout_nodes WHERE rollout_id = $1 AND state = 'active'`, r.ID).Scan(&nodesActive)
	if nodesActive != 2 {
		t.Fatalf("rollout nodes active = %d", nodesActive)
	}
	var mig int
	_ = h.db.Pool.QueryRow(ctx, `SELECT count(*) FROM plugin_migrations WHERE plugin_key = $1`, h.key).Scan(&mig)
	if mig != 1 {
		t.Fatalf("migrations applied = %d", mig)
	}
	if got := a.rt.instances("1.0.0")[0].migrated; got != "->1.0.0" {
		t.Fatalf("MigrateData on coordinator = %q", got)
	}
	if got := b.rt.instances("1.0.0")[0].migrated; got != "" {
		t.Fatalf("MigrateData must run on one node only, b got %q", got)
	}
	act, _, evs := h.rec.snapshot()
	if len(act) != 1 || !act[0] || len(evs) != 1 || evs[0] != "plugin.enabled:1.0.0" {
		t.Fatalf("perms=%v events=%v", act, evs)
	}
	if cur, _ := a.ctl.Current(ctx, h.key); cur != nil {
		t.Fatalf("no rollout should be open: %+v", cur)
	}

	// ---- upgrade: node B is slow to prepare; nobody switches until it is ready.
	registrytest.AddVersion(t, h.db, h.manifest("2.0.0"), h.pkg("2.0.0", `CREATE TABLE a (id int);`, `ALTER TABLE a ADD COLUMN b int;`))
	b.rt.setHold("2.0.0", true)
	r, err = a.ctl.Upgrade(ctx, h.key, "2.0.0", 0)
	if err != nil {
		t.Fatal(err)
	}
	waitFor(t, "node A standby ready", func() bool {
		cur, _ := a.ctl.Current(ctx, h.key)
		if cur == nil {
			return false
		}
		states := map[string]string{}
		for _, n := range cur.Nodes {
			states[n.BootID] = n.State
		}
		return states["boot-a"] == rollout.NodeReady && states["boot-b"] == rollout.NodePending
	})
	time.Sleep(500 * time.Millisecond)
	if phase, _, _ := h.rolloutRow(r.ID); phase != rollout.PhasePreparing {
		t.Fatalf("committed before all nodes were ready: %s", phase)
	}
	if a.version(h.key) != "1.0.0" || b.version(h.key) != "1.0.0" {
		t.Fatal("a node switched before the commit point")
	}
	if s, _, d := h.plugin(); s != "upgrading" || d != "2.0.0" {
		t.Fatalf("plugin status during upgrade = %s desired %s", s, d)
	}
	b.rt.setHold("2.0.0", false)
	waitFor(t, "upgrade completes", func() bool {
		s, act, _ := h.plugin()
		return s == "enabled" && act == "2.0.0" && a.version(h.key) == "2.0.0" && b.version(h.key) == "2.0.0"
	})
	waitFor(t, "old version drained on both nodes", func() bool {
		for _, n := range []*node{a, b} {
			for _, f := range n.rt.instances("1.0.0") {
				if s, _ := f.State(); s != grpcruntime.StateStopped {
					return false
				}
			}
		}
		return true
	})
	if got := a.rt.instances("2.0.0")[0].migrated; got != "1.0.0->2.0.0" {
		t.Fatalf("MigrateData = %q", got)
	}
	if _, defs, _ := h.rec.snapshot(); len(defs) != 1 || defs[0] != "2.0.0" {
		t.Fatalf("ApplyDefaults calls = %v", defs)
	}
	_ = h.db.Pool.QueryRow(ctx, `SELECT count(*) FROM plugin_migrations WHERE plugin_key = $1`, h.key).Scan(&mig)
	if mig != 2 {
		t.Fatalf("migrations applied = %d", mig)
	}

	// ---- a node that fails to prepare cancels the rollout; everyone keeps 2.0.0.
	registrytest.AddVersion(t, h.db, h.manifest("3.0.0"), h.pkg("3.0.0", `CREATE TABLE a (id int);`, `ALTER TABLE a ADD COLUMN b int;`))
	b.rt.mu.Lock()
	b.rt.fail["3.0.0"] = true
	b.rt.mu.Unlock()
	r, err = b.ctl.Upgrade(ctx, h.key, "3.0.0", 0)
	if err != nil {
		t.Fatal(err)
	}
	waitFor(t, "rollout fails", func() bool {
		phase, _, _ := h.rolloutRow(r.ID)
		return phase == rollout.PhaseFailed
	})
	if s, act, d := h.plugin(); s != "enabled" || act != "2.0.0" || d != "2.0.0" {
		t.Fatalf("after failed rollout: %s %s %s", s, act, d)
	}
	if _, _, msg := h.rolloutRow(r.ID); msg == "" {
		t.Fatal("failed rollout has no error")
	}
	waitFor(t, "standby 3.0.0 stopped on node A", func() bool {
		for _, f := range a.rt.instances("3.0.0") {
			if s, _ := f.State(); s != grpcruntime.StateStopped {
				return false
			}
		}
		return true
	})
	if a.version(h.key) != "2.0.0" || b.version(h.key) != "2.0.0" {
		t.Fatal("nodes must keep the old version after a failed rollout")
	}

	// ---- cancel a preparing rollout.
	b.rt.mu.Lock()
	b.rt.fail["3.0.0"] = false
	b.rt.hold["3.0.0"] = true
	b.rt.mu.Unlock()
	r, err = a.ctl.Upgrade(ctx, h.key, "3.0.0", 0)
	if err != nil {
		t.Fatal(err)
	}
	if err := a.ctl.Cancel(ctx, h.key, r.ID, 1); err != nil {
		t.Fatal(err)
	}
	if phase, _, _ := h.rolloutRow(r.ID); phase != rollout.PhaseCancelled {
		t.Fatalf("phase = %s", phase)
	}
	if s, act, _ := h.plugin(); s != "enabled" || act != "2.0.0" {
		t.Fatalf("after cancel: %s %s", s, act)
	}

	// ---- disable: committed immediately, nodes stop serving.
	r, err = b.ctl.Disable(ctx, h.key, 0, "maintenance")
	if err != nil {
		t.Fatal(err)
	}
	if s, _, d := h.plugin(); s != "disabled" || d != "" {
		t.Fatalf("status right after Disable = %s desired %q", s, d)
	}
	waitFor(t, "disable completes", func() bool {
		phase, _, _ := h.rolloutRow(r.ID)
		return phase == rollout.PhaseActive && a.version(h.key) == "" && b.version(h.key) == ""
	})
	act, _, evs = h.rec.snapshot()
	if len(act) != 2 || act[1] || evs[len(evs)-1] != "plugin.disabled:2.0.0" {
		t.Fatalf("perms=%v events=%v", act, evs)
	}

	// ---- re-enable resumes the last active version.
	r, err = a.ctl.Enable(ctx, h.key, 0)
	if err != nil {
		t.Fatal(err)
	}
	if r.TargetVersion != "2.0.0" {
		t.Fatalf("re-enable target = %s", r.TargetVersion)
	}
	waitFor(t, "re-enable completes", func() bool {
		s, _, _ := h.plugin()
		return s == "enabled" && a.version(h.key) == "2.0.0" && b.version(h.key) == "2.0.0"
	})
}

func TestRolloutTakeoverAndLateJoiner(t *testing.T) {
	h := newHarness(t)
	ctx := context.Background()
	registrytest.Install(t, h.db, h.manifest("1.0.0"), h.pkg("1.0.0"), map[string]string{"db.schema": "{}"}, "installed")
	t.Cleanup(func() { _ = dbschema.New(h.db, "", nil, false).Drop(context.Background(), h.key) })

	a := h.node("node-a", "boot-a")
	b := h.node("node-b", "boot-b")
	if _, err := a.ctl.Enable(ctx, h.key, 0); err != nil {
		t.Fatal(err)
	}
	waitFor(t, "enable completes", func() bool { s, _, _ := h.plugin(); return s == "enabled" })
	registrytest.AddVersion(t, h.db, h.manifest("2.0.0"), h.pkg("2.0.0"))

	// Node B holds its standby; the coordinator (A) dies before the commit point.
	b.rt.setHold("2.0.0", true)
	r, err := a.ctl.Upgrade(ctx, h.key, "2.0.0", 0)
	if err != nil {
		t.Fatal(err)
	}
	waitFor(t, "A ready", func() bool {
		cur, _ := b.ctl.Current(ctx, h.key)
		if cur == nil {
			return false
		}
		for _, n := range cur.Nodes {
			if n.BootID == "boot-a" && n.State == rollout.NodeReady {
				return true
			}
		}
		return false
	})
	a.node.Kill(ctx)
	a.ctl.Stop(ctx)

	// B takes the lease over after it expires and finishes the rollout.
	waitFor(t, "takeover", func() bool {
		_, boot, _ := h.rolloutRow(r.ID)
		return boot == "boot-b"
	})
	if phase, _, _ := h.rolloutRow(r.ID); phase != rollout.PhasePreparing {
		t.Fatalf("phase after takeover = %s", phase)
	}
	if b.version(h.key) != "1.0.0" {
		t.Fatal("B switched before commit")
	}

	// A node joining while preparing serves the old version and prepares the new one.
	c := h.node("node-c", "boot-c")
	waitFor(t, "late joiner serves old version", func() bool { return c.version(h.key) == "1.0.0" })
	if len(c.rt.instances("2.0.0")) != 1 {
		t.Fatal("late joiner did not start the standby")
	}

	b.rt.setHold("2.0.0", false)
	waitFor(t, "upgrade completes after takeover", func() bool {
		phase, _, _ := h.rolloutRow(r.ID)
		s, act, _ := h.plugin()
		return phase == rollout.PhaseActive && s == "enabled" && act == "2.0.0" &&
			b.version(h.key) == "2.0.0" && c.version(h.key) == "2.0.0"
	})

	// A node joining after activation starts the new version directly.
	d := h.node("node-d", "boot-d")
	waitFor(t, "late joiner serves new version", func() bool { return d.version(h.key) == "2.0.0" })
	if len(d.rt.instances("1.0.0")) != 0 {
		t.Fatal("joiner after activation must not start the old version")
	}
}
