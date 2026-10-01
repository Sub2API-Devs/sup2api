//go:build linux

package control

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
)

// This test requires separately built real core binaries. It does not fake the
// core protocol, runtime, process shutdown, database, Redis or network proxy.
// Its historic name is retained, but the policy is now primary-first: every
// old follower exits before primary migration; the planned 503 window is checked.
func TestRealCoreRollingUpgrade(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()
	c := newRealCluster(t, ctx, realOptions{})
	store, testDB, rdb, dbname := c.store, c.db, c.direct, c.dbname
	old, target, broken, s1, s2, bundled := c.old, c.target, c.broken, c.s1, c.s2, c.bundled
	ids := []string{"a", "b"}
	if os.Getenv("TEST_SHELL_NODES") == "3" {
		ids = append(ids, "c")
	}
	for _, id := range ids {
		c.startShell(id)
	}
	nodes := c.list()
	var err error
	if err = nodes[0].engine.Recover(ctx, true); err != nil {
		t.Fatal("bootstrap primary", err)
	}
	t.Log("bootstrap primary a prepared and admitted")
	_ = nodes[0].engine.Heartbeat(ctx)
	for i := 1; i < len(nodes); i++ {
		if err = nodes[i].engine.Recover(ctx, false); err != nil {
			t.Fatal("join follower", err)
		}
		_ = nodes[i].engine.Heartbeat(ctx)
		t.Logf("follower %s downloaded, prepared and admitted", nodes[i].engine.Node.ID)
	}
	pluginSnapshot := func() string {
		var raw string
		if e := testDB.QueryRow(ctx, `SELECT COALESCE(jsonb_agg(jsonb_build_object('key',key,'version',active_version,'status',status) ORDER BY key),'[]'::jsonb)::text FROM plugins`).Scan(&raw); e != nil {
			t.Fatal(e)
		}
		return raw
	}
	pluginsBefore := pluginSnapshot()
	if len(bundled) > 0 && pluginsBefore == "[]" {
		t.Fatal("bundled signed plugins did not bootstrap")
	}
	appliedMigrations := func() map[string]string {
		rows, e := testDB.Query(ctx, `SELECT id,checksum FROM schema_migrations`)
		if e != nil {
			t.Fatal(e)
		}
		defer rows.Close()
		out := map[string]string{}
		for rows.Next() {
			var id, sum string
			if e = rows.Scan(&id, &sum); e != nil {
				t.Fatal(e)
			}
			out[id] = sum
		}
		if e = rows.Err(); e != nil {
			t.Fatal(e)
		}
		return out
	}
	migrationsBefore := appliedMigrations()
	// Exercise an established business-authentication endpoint present in both
	// source snapshots, not a newly added update-console route.
	const probePath = "/api/v1/key/prices"
	for _, n := range nodes {
		resp, e := http.Get(n.public.URL + probePath)
		if e != nil {
			t.Fatal(e)
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		resp.Body.Close()
		if resp.StatusCode != 401 {
			t.Fatalf("baseline node %s probe returned %d: %s", n.engine.Node.ID, resp.StatusCode, body)
		}
	}
	var plannedOutage, initialUpgrade atomic.Bool
	initialUpgrade.Store(true)
	for i, n := range nodes {
		n.engine.Runtime = &observedPrimaryFirstRuntime{LocalRuntime: n.runtime,
			beforeMaintenance: func(ctx context.Context) error {
				if !initialUpgrade.Load() || i != 0 {
					return nil
				}
				for _, follower := range nodes[1:] {
					stopped, e := follower.runtime.Stopped(ctx)
					if e != nil || !stopped {
						return fmt.Errorf("primary maintenance while follower %s still alive: %v", follower.engine.Node.ID, e)
					}
				}
				plannedOutage.Store(true)
				return nil
			},
			beforeStart: func(ctx context.Context, digest string, options rc.PrepareRequest) error {
				if !initialUpgrade.Load() {
					return nil
				}
				if digest != target.Digest {
					return fmt.Errorf("old release restarted during initial upgrade: %s", digest)
				}
				if i == 0 {
					if !options.AllowMigration || options.Bootstrap {
						return fmt.Errorf("primary upgrade must have migration but no bootstrap: %+v", options)
					}
					if n.runtime.Router.Route().Mode != "maintenance" {
						return fmt.Errorf("primary started outside maintenance")
					}
					for _, follower := range nodes[1:] {
						stopped, e := follower.runtime.Stopped(ctx)
						if e != nil || !stopped {
							return fmt.Errorf("primary migration while follower %s alive: %v", follower.engine.Node.ID, e)
						}
					}
				} else {
					if options.AllowMigration || options.Bootstrap {
						return fmt.Errorf("follower received migration/bootstrap privilege")
					}
					st, mode, e := nodes[0].runtime.Status(ctx)
					if e != nil || !st.Ready || mode != "local" || st.ReleaseDigest != target.Digest {
						return fmt.Errorf("follower started before new primary ready: %+v %s %v", st, mode, e)
					}
					if route := n.runtime.Router.Route(); route.Mode != "forward-only" || route.PeerURL != nodes[0].private.URL {
						return fmt.Errorf("follower preparation lost primary forwarding: %+v", route)
					}
				}
				return nil
			},
		}
	}
	for _, n := range nodes {
		c.run(n)
	}
	pf, err := store.Preflight(ctx, target.Digest)
	if err != nil || len(pf.Blockers) > 0 {
		t.Fatalf("preflight: %+v %v", pf, err)
	}
	plan, err := store.Create(ctx, target.Digest, pf.ExpectedRevision, "real-core-update", "test")
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("primary-first plan %s started across %d nodes", plan.ID, len(nodes))
	var requests, failures, unavailable, forwardSuccess atomic.Int64
	var planCursor atomic.Int64
	counts := map[string]int{}
	var firstFailures []string
	trafficCtx, stopTraffic := context.WithCancel(ctx)
	trafficDone := make(chan struct{})
	go func() {
		defer close(trafficDone)
		client := &http.Client{Timeout: 5 * time.Second}
		tick := time.NewTicker(25 * time.Millisecond)
		defer tick.Stop()
		for {
			select {
			case <-trafficCtx.Done():
				return
			case <-tick.C:
				for _, n := range nodes {
					outageAtDispatch := plannedOutage.Load()
					routeAtDispatch := n.runtime.Router.Route()
					resp, e := client.Get(n.public.URL + probePath)
					requests.Add(1)
					if e != nil {
						failures.Add(1)
						counts[n.engine.Node.ID+":transport"]++
						if len(firstFailures) < 8 {
							firstFailures = append(firstFailures, fmt.Sprintf("node=%s cursor=%d error=%v route=%+v", n.engine.Node.ID, planCursor.Load(), e, n.runtime.Router.Route()))
						}
						continue
					}
					body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
					resp.Body.Close()
					counts[fmt.Sprintf("%s:%s:%d", n.engine.Node.ID, n.runtime.Router.Route().Mode, resp.StatusCode)]++
					if resp.StatusCode == 401 && routeAtDispatch.Mode == "forward-only" {
						forwardSuccess.Add(1)
					}
					if resp.StatusCode == 503 && (outageAtDispatch || plannedOutage.Load()) {
						unavailable.Add(1)
						continue
					}
					if resp.StatusCode != 401 {
						failures.Add(1)
						if len(firstFailures) < 8 {
							firstFailures = append(firstFailures, fmt.Sprintf("node=%s cursor=%d status=%d body=%s a=%+v b=%+v", n.engine.Node.ID, planCursor.Load(), resp.StatusCode, body, nodes[0].runtime.Router.Route(), nodes[1].runtime.Router.Route()))
						}
					}
				}
			}
		}
	}()
	tick := time.NewTicker(200 * time.Millisecond)
	defer tick.Stop()
	for {
		plan, err = store.Plan(ctx, plan.ID)
		if err != nil {
			t.Fatal(err)
		}
		planCursor.Store(int64(plan.Cursor))
		primaryRoute := nodes[0].runtime.Router.Route()
		if primaryRoute.Mode == "forward-only" {
			t.Fatal("primary redirected to a follower")
		}
		if primaryRoute.Mode == "maintenance" {
			for _, follower := range nodes[1:] {
				if follower.supervisor.Status().Running {
					t.Fatalf("follower %s is still running during primary maintenance", follower.engine.Node.ID)
				}
			}
		}
		// End the allowed downtime only after all entrance shells have observed
		// the new primary identity. Subsequent follower preparation must keep
		// forwarding successfully until each follower passes local readiness.
		if plannedOutage.Load() && primaryRoute.Mode == "local-serving" {
			converged := true
			for _, follower := range nodes[1:] {
				route := follower.runtime.Router.Route()
				if route.Mode == "forward-only" {
					if route.CoreBootID != primaryRoute.CoreBootID || route.PeerRevision != primaryRoute.Revision {
						converged = false
					}
				} else if route.Mode != "local-serving" {
					converged = false
				}
			}
			if converged {
				plannedOutage.Store(false)
			}
		}
		if plan.Status == "completed" {
			break
		}
		if plan.Status == "paused" {
			t.Fatalf("real rolling update paused: %+v", plan)
		}
		select {
		case <-ctx.Done():
			t.Fatal(ctx.Err())
		case <-tick.C:
		}
	}
	stopTraffic()
	<-trafficDone
	initialUpgrade.Store(false)
	t.Logf("primary-first completed: requests=%d planned503=%d forwardedSuccess=%d failures=%d counts=%v", requests.Load(), unavailable.Load(), forwardSuccess.Load(), failures.Load(), counts)
	if requests.Load() < 10 {
		t.Fatalf("insufficient concurrent traffic: %d", requests.Load())
	}
	if failures.Load() != 0 {
		t.Fatalf("rolling request failures: %d/%d; counts=%v; first failures=%v; final plan=%+v", failures.Load(), requests.Load(), counts, firstFailures, plan)
	}
	if unavailable.Load() == 0 {
		t.Fatal("primary maintenance window was not exercised by traffic")
	}
	if forwardSuccess.Load() == 0 {
		t.Fatal("no successful request exercised follower forwarding")
	}
	for _, n := range nodes {
		st, mode, err := n.runtime.Status(ctx)
		if err != nil || !st.Ready || mode != "local" || st.ReleaseDigest != target.Digest {
			t.Fatalf("target not serving: %+v %s %v", st, mode, err)
		}
	}
	if after := pluginSnapshot(); after != pluginsBefore {
		t.Fatalf("core upgrade changed independent plugin state: before=%s after=%s", pluginsBefore, after)
	}
	migrationsAfter := appliedMigrations()
	for id, sum := range migrationsBefore {
		if migrationsAfter[id] != sum {
			t.Fatalf("applied migration %s changed or vanished", id)
		}
	}
	var added []string
	for id := range migrationsAfter {
		if _, ok := migrationsBefore[id]; !ok {
			added = append(added, id)
		}
	}
	if s1 != s2 && len(added) == 0 {
		t.Fatal("schema-changing release applied no new migration")
	}
	// TEST_EXPECT_MIGRATION names the test-only SQL added to R2's separate
	// source copy, which creates managed_upgrade_probe with exactly one row.
	if probe := os.Getenv("TEST_EXPECT_MIGRATION"); probe != "" {
		var rows int
		if err = testDB.QueryRow(ctx, `SELECT count(*) FROM managed_upgrade_probe`).Scan(&rows); err != nil || len(added) != 1 || added[0] != probe || rows != 1 {
			t.Fatalf("expected one real migration %s applied once: added=%v rows=%d err=%v", probe, added, rows, err)
		}
	}
	t.Logf("primary applied migrations %v while followers were stopped", added)
	// Losing a Redis registration is not a core event: the owning shell
	// re-registers (configured key reused, automatic key replaced) and the
	// running core keeps its boot, readiness and local route.
	for _, n := range nodes[1:] {
		id := n.engine.Node.ID
		redisKey := "s2a:peer:{" + dbname + "}:node:" + id
		var before struct {
			Key string `json:"auth_key"`
		}
		raw, e := rdb.Get(ctx, redisKey).Bytes()
		if e != nil || json.Unmarshal(raw, &before) != nil {
			t.Fatalf("registration of %s unreadable: %v", id, e)
		}
		status, _, e := n.runtime.Status(ctx)
		if e != nil || !status.Ready {
			t.Fatalf("node %s not ready before credential loss: %v", id, e)
		}
		if e = rdb.Del(ctx, redisKey).Err(); e != nil {
			t.Fatal(e)
		}
		var after struct {
			Key  string `json:"auth_key"`
			Boot string `json:"shell_boot_id"`
		}
		for {
			raw, e = rdb.Get(ctx, redisKey).Bytes()
			if e == nil && json.Unmarshal(raw, &after) == nil {
				break
			}
			select {
			case <-ctx.Done():
				t.Fatalf("%s did not re-register", id)
			case <-tick.C:
			}
		}
		if after.Boot != n.engine.Node.ShellBootID {
			t.Fatalf("%s re-registered under another boot", id)
		}
		if configured := id == "b"; configured != (after.Key == before.Key) {
			t.Fatalf("%s key reuse wrong after loss: configured=%v reused=%v", id, configured, after.Key == before.Key)
		}
		current, mode, e := n.runtime.Status(ctx)
		if e != nil || !current.Ready || mode != "local" || current.BootID != status.BootID {
			t.Fatalf("credential loss disturbed core %s: %+v %s %v", id, current, mode, e)
		}
		var ready bool
		if e = testDB.QueryRow(ctx, `SELECT ready FROM updater.nodes WHERE cluster_id=$1 AND node_id=$2`, dbname, id).Scan(&ready); e != nil || !ready {
			t.Fatalf("credential loss cleared persisted readiness of %s: %v", id, e)
		}
		t.Logf("node %s re-registered after Redis loss; key reused=%v; core boot unchanged", id, after.Key == before.Key)
	}
	// A real SIGKILL leaves its socket behind. The stable recovery path must
	// restart the approved R2 and restore admission with a new core boot ID.
	before, _, _ := nodes[1].runtime.Status(ctx)
	process, err := os.FindProcess(nodes[1].supervisor.Status().PID)
	if err != nil {
		t.Fatal(err)
	}
	if err = process.Kill(); err != nil {
		t.Fatal(err)
	}
	t.Logf("killed core b boot=%s; waiting for approved-release recovery", before.BootID)
	for {
		st, mode, e := nodes[1].runtime.Status(ctx)
		if e == nil && st.Ready && mode == "local" && st.BootID != before.BootID && st.ReleaseDigest == target.Digest {
			t.Logf("core b recovered with new boot=%s", st.BootID)
			break
		}
		select {
		case <-ctx.Done():
			t.Fatal("crashed core did not recover", ctx.Err())
		case <-tick.C:
		}
	}
	// A failed primary candidate must pause with every old follower stopped.
	// It must not resurrect an old core as an implicit fallback after migration.
	for {
		pf, err = store.Preflight(ctx, broken.Digest)
		if err != nil {
			t.Fatal(err)
		}
		if len(pf.Blockers) == 0 {
			break
		}
		select {
		case <-ctx.Done():
			t.Fatal(pf.Blockers)
		case <-tick.C:
		}
	}
	failedPlan, err := store.Create(ctx, broken.Digest, pf.ExpectedRevision, "failed-candidate", "test")
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("failed-candidate plan %s started", failedPlan.ID)
	for {
		failedPlan, err = store.Plan(ctx, failedPlan.ID)
		if err != nil {
			t.Fatal(err)
		}
		if failedPlan.Status == "paused" {
			t.Logf("failed-candidate plan paused safely: %s", failedPlan.Error)
			break
		}
		select {
		case <-ctx.Done():
			t.Fatal("failed candidate did not pause")
		case <-tick.C:
		}
	}
	if !strings.Contains(failedPlan.Error, "candidate exited") {
		t.Fatalf("unexpected failure: %s", failedPlan.Error)
	}
	for _, n := range nodes {
		if n.runtime.Router.Route().Mode == "local-serving" {
			t.Fatalf("failed primary candidate left node %s locally serving", n.engine.Node.ID)
		}
		stopped, e := n.runtime.Stopped(ctx)
		if e != nil || !stopped {
			t.Fatalf("failed primary candidate resurrected old process on %s: %v", n.engine.Node.ID, e)
		}
		resp, e := http.Get(n.public.URL + probePath)
		if e != nil {
			t.Fatal(e)
		}
		_, _ = io.Copy(io.Discard, resp.Body)
		resp.Body.Close()
		if resp.StatusCode != 503 {
			t.Fatalf("failed candidate must remain unavailable rather than use an old follower: %d", resp.StatusCode)
		}
	}
	var recovery Plan
	for {
		recovery, err = store.Rollback(ctx, failedPlan.ID, "test")
		if err == nil {
			break
		}
		if !strings.Contains(err.Error(), "still running") {
			t.Fatal("baseline recovery", err)
		}
		select {
		case <-ctx.Done():
			t.Fatal(ctx.Err())
		case <-tick.C:
		}
	}
	t.Logf("baseline recovery plan %s started; order=%v", recovery.ID, recovery.Nodes)
	// Like the initial update, 503 is allowed until the restored primary serves
	// and every follower entrance has observed it (heartbeat lag included).
	recoveryConverged := false
	for {
		primaryRoute := nodes[0].runtime.Router.Route()
		if !recoveryConverged && primaryRoute.Mode == "local-serving" {
			recoveryConverged = true
			for _, follower := range nodes[1:] {
				route := follower.runtime.Router.Route()
				if route.Mode != "local-serving" && (route.Mode != "forward-only" || route.CoreBootID != primaryRoute.CoreBootID || route.PeerRevision != primaryRoute.Revision) {
					recoveryConverged = false
				}
			}
			if recoveryConverged {
				t.Log("recovery: primary serving and all entrances converged")
			}
		}
		for _, n := range nodes {
			route := n.runtime.Router.Route()
			mayBeUnavailable := !recoveryConverged || (route.Mode == "forward-only" && (route.CoreBootID != primaryRoute.CoreBootID || route.PeerRevision != primaryRoute.Revision))
			resp, e := http.Get(n.public.URL + probePath)
			if e != nil {
				t.Fatal("recovery traffic", e)
			}
			_, _ = io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
			if resp.StatusCode != 401 && !(mayBeUnavailable && resp.StatusCode == 503) {
				t.Fatalf("recovery interrupted node %s: %d", n.engine.Node.ID, resp.StatusCode)
			}
		}
		recovery, err = store.Plan(ctx, recovery.ID)
		if err != nil {
			t.Fatal(err)
		}
		if recovery.Status == "completed" {
			break
		}
		if recovery.Status == "paused" {
			t.Fatal("baseline recovery paused", recovery.Error)
		}
		select {
		case <-ctx.Done():
			t.Fatal(ctx.Err())
		case <-tick.C:
		}
	}
	for _, n := range nodes {
		st, mode, e := n.runtime.Status(ctx)
		if e != nil || !st.Ready || mode != "local" || st.ReleaseDigest != target.Digest {
			t.Fatalf("baseline did not recover: %+v %s %v", st, mode, e)
		}
		resp, e := http.Get(n.public.URL + probePath)
		if e != nil {
			t.Fatal(e)
		}
		io.Copy(io.Discard, resp.Body)
		resp.Body.Close()
		if resp.StatusCode != 401 {
			t.Fatalf("completed recovery has unavailable entrance %s: %d", n.engine.Node.ID, resp.StatusCode)
		}
	}
	if after := pluginSnapshot(); after != pluginsBefore {
		t.Fatalf("baseline recovery changed plugins: %s", after)
	}
	nextDigest := old.Digest
	if s1 != s2 {
		pf, err = store.Preflight(ctx, old.Digest)
		if err == nil && len(pf.Blockers) == 0 {
			t.Fatal("schema-changing upgrade allowed an incompatible downgrade")
		}
		// Queue (and immediately pause) a distinct candidate on the current
		// schema, rather than pretending the already-installed build is new.
		nextDigest = broken.Digest
	}
	pf, err = store.Preflight(ctx, nextDigest)
	if err != nil || len(pf.Blockers) > 0 {
		t.Fatalf("next compatible update remains blocked: %+v %v", pf, err)
	}
	next, err := store.Create(ctx, nextDigest, pf.ExpectedRevision, "after-baseline-recovery", "test")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.Action(ctx, next.ID, "pause", "test"); err != nil {
		t.Fatal(err)
	}
	t.Logf("baseline recovery completed; next update %s accepted", next.ID)
	t.Logf("real R1->R2 primary-first upgrade passed; %d business requests, %d planned 503s; old=%s target=%s", requests.Load(), unavailable.Load(), old.Digest, target.Digest)
}
