package control

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
)

func TestRollingStepsRestartFollowersThenPrimaryOneAtATime(t *testing.T) {
	st := Steps(Plan{Strategy: Rolling, ID: "p", Nodes: []string{"a", "b", "c"}})
	var actions []string
	for _, s := range st {
		actions = append(actions, s.NodeID+":"+s.Action)
	}
	turn := func(n string) []string {
		return []string{n + ":yield", n + ":stop", n + ":start", n + ":admit", n + ":local", n + ":resume"}
	}
	want := append([]string{"a:prepare", "b:prepare", "c:prepare"}, turn("b")...)
	want = append(want, turn("c")...)
	want = append(want, turn("a")...)
	if !reflect.DeepEqual(actions, want) {
		t.Fatal(actions)
	}
	for i := 0; i < len(st); i++ {
		if st[i].ID != i || st[i].PeerNode != "" {
			t.Fatalf("step %d: %+v", i, st[i])
		}
	}
}

func TestRollingEligibility(t *testing.T) {
	now := time.Now()
	serving := func(id string, rolling bool) Node {
		return Node{ID: id, Enabled: true, Rolling: rolling, Mode: "local", Ready: true, LastSeen: now}
	}
	rel := testRelease("r")
	maintenance := rel
	maintenance.Manifest.Strategy = "maintenance"
	migrating := rel
	migrating.Manifest.SchemaAfter = "contract-2"
	stopped := serving("b", true)
	stopped.Ready = false
	disabledOld := Node{ID: "c", Enabled: false}
	cases := []struct {
		name  string
		rel   Release
		nodes []Node
		min   int
		want  bool
	}{
		{"two rolling nodes serving", rel, []Node{serving("a", true), serving("b", true)}, 2, true},
		{"a disabled old shell does not count", rel, []Node{serving("a", true), serving("b", true), disabledOld}, 2, true},
		{"an old shell forces primary-first", rel, []Node{serving("a", true), serving("b", false)}, 2, false},
		{"one node cannot roll", rel, []Node{serving("a", true)}, 2, false},
		{"signed maintenance stays primary-first", maintenance, []Node{serving("a", true), serving("b", true)}, 2, false},
		{"a schema change stays primary-first", migrating, []Node{serving("a", true), serving("b", true)}, 2, false},
		{"recovery needs one serving node", rel, []Node{serving("a", true), stopped}, 1, true},
		{"a new plan needs two", rel, []Node{serving("a", true), stopped}, 2, false},
	}
	for _, tc := range cases {
		if got := rollingEligible(tc.rel, tc.nodes, tc.min); got != tc.want {
			t.Errorf("%s: %v", tc.name, got)
		}
	}
}

// rollingRuntime records what the plan did to a node, together with the
// node's stored offloading mark at the time of each stop.
type rollingRuntime struct {
	*fakeRuntime
	store   *Store
	node    string
	offload []Node
	log     []string
}

func (r *rollingRuntime) SetOffload(nodes []Node) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.offload = nodes
	entry := "serve-local"
	if len(nodes) > 0 {
		entry = "shed:" + nodes[0].ID
	}
	if len(r.log) == 0 || r.log[len(r.log)-1] != entry {
		r.log = append(r.log, entry)
	}
	return nil
}
func (r *rollingRuntime) DrainStop(ctx context.Context, op string) error {
	var marked bool
	_ = r.store.DB.QueryRow(ctx, `SELECT offloading FROM updater.nodes WHERE node_id=$1`, r.node).Scan(&marked)
	r.mu.Lock()
	r.log = append(r.log, "stop(marked="+boolString(marked)+")")
	r.mu.Unlock()
	return r.fakeRuntime.DrainStop(ctx, op)
}
func (r *rollingRuntime) Maintenance(ctx context.Context) error {
	r.mu.Lock()
	r.log = append(r.log, "maintenance")
	r.mu.Unlock()
	return r.fakeRuntime.Maintenance(ctx)
}
func boolString(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

func TestPostgresRollingPlanRestartsOneNodeWhileTheOtherServes(t *testing.T) {
	s, a, b, target := setupEnginesWith(t, true)
	ctx := context.Background()
	ar := &rollingRuntime{fakeRuntime: a.Runtime.(*fakeRuntime), store: s, node: a.Node.ID}
	br := &rollingRuntime{fakeRuntime: b.Runtime.(*fakeRuntime), store: s, node: b.Node.ID}
	a.Runtime, b.Runtime = ar, br
	pf, err := s.Preflight(ctx, target.Digest)
	if err != nil || len(pf.Blockers) != 0 {
		t.Fatalf("preflight: %+v %v", pf, err)
	}
	if pf.Strategy != Rolling {
		t.Fatalf("two rolling shells serving a schema-keeping release must roll: %s", pf.Strategy)
	}
	p, err := s.Create(ctx, target.Digest, pf.ExpectedRevision, "roll", "admin")
	if err != nil {
		t.Fatal(err)
	}
	if p.Strategy != Rolling {
		t.Fatalf("stored strategy %s", p.Strategy)
	}
	var bStoppedWhileAServed, forwardAllowedWhileYielding bool
	for i := 0; i < 200 && p.Status == "running"; i++ {
		if err = a.Coordinate(ctx); err != nil {
			t.Fatal(err)
		}
		_ = a.Work(ctx)
		_ = b.Work(ctx)
		nodes, err := s.Nodes(ctx)
		if err != nil {
			t.Fatal(err)
		}
		var na, nb Node
		for _, n := range nodes {
			switch n.ID {
			case a.Node.ID:
				na = n
			case b.Node.ID:
				nb = n
			}
		}
		if nb.Stopped && na.Ready && na.Mode == "local" {
			bStoppedWhileAServed = true
		}
		if nb.Offloading && s.AuthorizePeer(ctx, b.Node.ID, "boot", a.Node.ID, "forward", "") == nil {
			forwardAllowedWhileYielding = true
		}
		if na.Stopped && nb.Stopped {
			t.Fatal("both cores stopped at once")
		}
		if p, err = s.Plan(ctx, p.ID); err != nil {
			t.Fatal(err)
		}
	}
	if p.Status != "completed" {
		t.Fatalf("plan did not complete: %+v", p)
	}
	if !bStoppedWhileAServed || !forwardAllowedWhileYielding {
		t.Fatalf("follower restart not observed while the primary served: stopped=%v forward=%v", bStoppedWhileAServed, forwardAllowedWhileYielding)
	}
	for _, r := range []*rollingRuntime{br, ar} {
		joined := strings.Join(r.log, " ")
		if strings.Contains(joined, "maintenance") {
			t.Fatalf("%s entered maintenance: %v", r.node, r.log)
		}
		if !strings.Contains(joined, "shed:") || !strings.Contains(joined, "stop(marked=true)") {
			t.Fatalf("%s must yield to the other node before its core stops: %v", r.node, r.log)
		}
		if r.log[len(r.log)-1] != "serve-local" {
			t.Fatalf("%s must take its traffic back: %v", r.node, r.log)
		}
		if st, _, _ := r.Status(ctx); st.ReleaseDigest != target.Digest || !st.Ready {
			t.Fatalf("%s not serving the target: %+v", r.node, st)
		}
	}
	// The follower restarted first, the primary after it was serving again.
	if !strings.Contains(strings.Join(br.log, " "), "shed:"+a.Node.ID) || !strings.Contains(strings.Join(ar.log, " "), "shed:"+b.Node.ID) {
		t.Fatalf("each node yields to the other: a=%v b=%v", ar.log, br.log)
	}
	var baseline string
	if err = s.DB.QueryRow(ctx, `SELECT baseline FROM updater.clusters WHERE cluster_id=$1`, s.Cluster).Scan(&baseline); err != nil || baseline != target.Digest {
		t.Fatalf("baseline %s %v", baseline, err)
	}
	for _, e := range []*Engine{a, b} {
		if st := e.YieldState(); st.Yielding || st.Offloading {
			t.Fatalf("%s still yielding after the plan: %+v", e.Node.ID, st)
		}
	}
}

func TestPostgresRollingPlanPausesWhenNoNodeCanTakeTheTraffic(t *testing.T) {
	s, a, b, target := setupEnginesWith(t, true)
	ctx := context.Background()
	ar := &rollingRuntime{fakeRuntime: a.Runtime.(*fakeRuntime), store: s, node: a.Node.ID}
	br := &rollingRuntime{fakeRuntime: b.Runtime.(*fakeRuntime), store: s, node: b.Node.ID}
	a.Runtime, b.Runtime = ar, br
	pf, err := s.Preflight(ctx, target.Digest)
	if err != nil || len(pf.Blockers) != 0 || pf.Strategy != Rolling {
		t.Fatalf("preflight: %+v %v", pf, err)
	}
	p, err := s.Create(ctx, target.Digest, pf.ExpectedRevision, "roll", "admin")
	if err != nil {
		t.Fatal(err)
	}
	// The primary's core stops answering as the follower's turn comes: the
	// follower has nobody to yield to and must keep serving, so the plan
	// pauses at its yield step instead of taking the cluster down.
	ar.mu.Lock()
	ar.status.Ready = false
	ar.mu.Unlock()
	if err = a.Heartbeat(ctx); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 50 && p.Status == "running"; i++ {
		_ = a.Coordinate(ctx)
		_ = a.Work(ctx)
		_ = b.Work(ctx)
		if p, err = s.Plan(ctx, p.ID); err != nil {
			t.Fatal(err)
		}
	}
	if p.Status != "paused" || !strings.Contains(p.Error, "take this node's traffic") {
		t.Fatalf("expected pause at yield: %+v", p)
	}
	if br.stopped || strings.Contains(strings.Join(br.log, " "), "stop") {
		t.Fatalf("follower stopped without a taker: %v", br.log)
	}
	if st := b.YieldState(); st.Yielding || st.Offloading {
		t.Fatalf("a failed yield leaves no mark: %+v", st)
	}
}

func TestPostgresYieldHandlersHandOverAndTakeBack(t *testing.T) {
	s, a, b, _ := setupEnginesWith(t, true)
	ctx := context.Background()
	br := &rollingRuntime{fakeRuntime: b.Runtime.(*fakeRuntime), store: s, node: b.Node.ID}
	b.Runtime = br
	mux := http.NewServeMux()
	b.yieldHandlers(mux)
	call := func(method, path, body string) (int, YieldState) {
		t.Helper()
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, httptest.NewRequest(method, path, strings.NewReader(body)))
		var out struct {
			Data YieldState `json:"data"`
		}
		_ = json.Unmarshal(w.Body.Bytes(), &out)
		return w.Code, out.Data
	}
	if code, _ := call("GET", "/system/nodes/"+a.Node.ID+"/yield", ""); code != http.StatusNotFound {
		t.Fatalf("another node's yield answered %d", code)
	}
	if code, st := call("GET", "/system/nodes/self/yield", ""); code != 200 || st.Yielding || st.NodeID != b.Node.ID {
		t.Fatalf("idle state: %d %+v", code, st)
	}
	code, st := call("POST", "/system/nodes/"+b.Node.ID+"/yield", `{"drain":true}`)
	if code != 200 || !st.Yielding || !st.Offloading {
		t.Fatalf("yield: %d %+v", code, st)
	}
	if len(br.offload) != 1 || br.offload[0].ID != a.Node.ID {
		t.Fatalf("new requests must go to the primary: %+v", br.offload)
	}
	var marked bool
	if err := s.DB.QueryRow(ctx, `SELECT offloading FROM updater.nodes WHERE node_id=$1`, b.Node.ID).Scan(&marked); err != nil || !marked {
		t.Fatalf("yield must be stored before forwarding: %v %v", marked, err)
	}
	if err := s.AuthorizePeer(ctx, b.Node.ID, "boot", a.Node.ID, "forward", ""); err != nil {
		t.Fatalf("the primary must accept the yielded forwards: %v", err)
	}
	// Heartbeats keep the handover while it lasts.
	if err := b.Heartbeat(ctx); err != nil || len(br.offload) != 1 {
		t.Fatalf("heartbeat dropped the yield: %v %+v", err, br.offload)
	}
	if code, st = call("DELETE", "/system/nodes/self/yield", ""); code != 200 || st.Yielding || st.Offloading {
		t.Fatalf("resume: %d %+v", code, st)
	}
	if len(br.offload) != 0 {
		t.Fatalf("resume must serve locally again: %+v", br.offload)
	}
	if err := s.DB.QueryRow(ctx, `SELECT offloading FROM updater.nodes WHERE node_id=$1`, b.Node.ID).Scan(&marked); err != nil || marked {
		t.Fatalf("resume must clear the stored mark: %v %v", marked, err)
	}
	// A single serving node has nobody to yield to.
	s.RevokePeer = func(context.Context, string) error { return nil }
	if err := s.DisableNode(ctx, a.Node.ID); err != nil {
		t.Fatal(err)
	}
	if code, _ = call("POST", "/system/nodes/self/yield", ""); code != http.StatusConflict {
		t.Fatalf("yield without a taker answered %d", code)
	}
	if st := b.YieldState(); st.Yielding {
		t.Fatalf("a refused yield must not stick: %+v", st)
	}
}

func TestPostgresHeartbeatRewritesUnchangedSnapshotOnlyPeriodically(t *testing.T) {
	_, a, _, _ := setupEnginesWith(t, true)
	ctx := context.Background()
	if err := a.Heartbeat(ctx); err != nil {
		t.Fatal(err)
	}
	first := a.lastWrittenAt
	if first.IsZero() {
		t.Fatal("heartbeat did not record its write")
	}
	if err := a.Heartbeat(ctx); err != nil || a.lastWrittenAt != first {
		t.Fatalf("an unchanged snapshot was rewritten: %v %v", err, a.lastWrittenAt)
	}
	a.lastWrittenAt = time.Now().Add(-2 * heartbeatRewrite)
	if err := a.Heartbeat(ctx); err != nil || !a.lastWrittenAt.After(first) {
		t.Fatalf("a stale snapshot must be rewritten: %v %v", err, a.lastWrittenAt)
	}
	stale := a.lastWrittenAt
	ar := a.Runtime.(*fakeRuntime)
	ar.mu.Lock()
	ar.status.Ready = false
	ar.mu.Unlock()
	if err := a.Heartbeat(ctx); err != nil || !a.lastWrittenAt.After(stale) {
		t.Fatalf("a changed snapshot must be written at once: %v", err)
	}
	var ready bool
	if err := a.Store.DB.QueryRow(ctx, `SELECT ready FROM updater.nodes WHERE node_id=$1`, a.Node.ID).Scan(&ready); err != nil || ready {
		t.Fatalf("change not persisted: ready=%v %v", ready, err)
	}
	_ = rc.Protocol
}
