//go:build linux

package control

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
)

// TestRealCoreFaultsDuringPrimaryFirstUpgrade drives a real R1->R2 primary
// first update of three nodes while injecting the faults the clean run does
// not: a stopped follower's shell restarts, a new node joins, the primary's
// migration is interrupted by SIGKILL, and Redis is partitioned while the
// cluster is down. A real async video task submitted before the update, a
// slow SSE response across registration expiry and key replacement, and a
// Redis partition while serving are checked against a mock upstream.
//
// Besides the real-core variables it needs TEST_MOCK_URL (mock-upstream as
// seen from this host and the cores) and R2's test migration to contain
// pg_sleep so the migration can be interrupted while it runs.
func TestRealCoreFaultsDuringPrimaryFirstUpgrade(t *testing.T) {
	mockURL := strings.TrimRight(os.Getenv("TEST_MOCK_URL"), "/")
	if mockURL == "" || os.Getenv("TEST_EXPECT_MIGRATION") == "" {
		t.Skip("requires TEST_MOCK_URL and TEST_EXPECT_MIGRATION in addition to the real-core variables")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Minute)
	defer cancel()
	const adminEmail, adminPassword = "admin@real.test", "Real-core-admin-pass!"
	ttl := 3 * time.Second
	c := newRealCluster(t, ctx, realOptions{peerTTL: ttl, coreEnv: []string{
		"SUB2API_BOOTSTRAP_ADMIN_EMAIL=" + adminEmail, "SUB2API_BOOTSTRAP_ADMIN_PASSWORD=" + adminPassword,
		// The mock runs on the private test network.
		"SUB2API_GATEWAY_ALLOW_PRIVATE_UPSTREAM=true",
	}})
	var names []string
	for _, b := range c.bundled {
		names = append(names, b.name)
	}
	if joined := strings.Join(names, ","); !strings.Contains(joined, "volcengine") || !strings.Contains(joined, "anthropic") {
		t.Fatalf("TEST_BUILTIN_DIR must contain signed volcengine and anthropic packages: %s", joined)
	}
	db, store, target := c.db, c.store, c.target
	tick := time.NewTicker(200 * time.Millisecond)
	defer tick.Stop()
	wait := func(what string, timeout time.Duration, fn func() bool) {
		t.Helper()
		deadline := time.Now().Add(timeout)
		for !fn() {
			if time.Now().After(deadline) {
				t.Fatalf("timed out after %s waiting for %s", timeout, what)
			}
			select {
			case <-ctx.Done():
				t.Fatal(ctx.Err())
			case <-tick.C:
			}
		}
	}
	probe := func(n *realNode) int {
		res, err := http.Get(n.public.URL + "/api/v1/key/prices")
		if err != nil {
			return 0
		}
		_, _ = io.Copy(io.Discard, res.Body)
		res.Body.Close()
		return res.StatusCode
	}
	activePlan := func(ctx context.Context) (bool, error) {
		var active bool
		err := db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.upgrades WHERE cluster_id=$1 AND status IN ('running','paused'))`, c.dbname).Scan(&active)
		return active, err
	}

	// ---- baseline cluster a(primary) b(configured key) c(automatic key)
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
		_ = c.node(id).engine.Heartbeat(ctx)
	}
	wait("bundled plugins enabled", 3*time.Minute, func() bool {
		var n int
		_ = db.QueryRow(ctx, `SELECT count(*) FROM plugins WHERE key IN ('anthropic','volcengine') AND status='enabled'`).Scan(&n)
		return n == 2
	})

	// ---- observation hooks: every core start during the update is checked
	var upgrading atomic.Bool
	var violations []string
	var violationsMu sync.Mutex
	violate := func(format string, args ...any) error {
		msg := fmt.Sprintf(format, args...)
		violationsMu.Lock()
		violations = append(violations, msg)
		violationsMu.Unlock()
		t.Error(msg)
		return fmt.Errorf("%s", msg)
	}
	var faultsInjected, killArmed atomic.Bool
	var killedPID atomic.Int64
	observe := func(n *realNode) Runtime {
		return &observedPrimaryFirstRuntime{LocalRuntime: n.runtime,
			beforeMaintenance: func(ctx context.Context) error {
				if n.id != "a" || !upgrading.Load() || !faultsInjected.CompareAndSwap(false, true) {
					return nil
				}
				// All followers are stopped and confirmed; the primary has not
				// stopped yet. Restart one stopped follower's shell and add a
				// new node: neither may start a core, and both new boots must
				// confirm their stop before the primary may migrate.
				restarted := c.restartShell("c")
				t.Logf("fault: restarted stopped follower shell as %s", restarted.engine.Node.ShellBootID)
				joined := c.startShell("d")
				if _, err := joined.engine.Locks.WithLock(ctx, "system:upgrade-node:"+c.dbname+":d", time.Minute, func(ctx context.Context) error { return joined.engine.Recover(ctx, false) }); err != nil {
					t.Logf("joining shell reconciliation paused: %v", err)
				}
				c.run(joined)
				t.Logf("fault: node d joined during the update as %s", joined.engine.Node.ShellBootID)
				return nil
			},
			beforeStart: func(ctx context.Context, digest string, options rc.PrepareRequest) error {
				boot := n.engine.Node.ShellBootID
				if n.id == "d" {
					if active, err := activePlan(ctx); err != nil || active {
						return violate("joining node %s started a core during the update (%v)", boot, err)
					}
					if digest != target.Digest || options.AllowMigration || options.Bootstrap {
						return violate("joining node %s started %s with %+v", boot, digest, options)
					}
					return nil
				}
				if !upgrading.Load() {
					return nil
				}
				if digest != target.Digest {
					return violate("%s restarted an old release during the update", boot)
				}
				if n.id != "a" {
					if options.AllowMigration || options.Bootstrap {
						return violate("follower %s received migration privilege", boot)
					}
					st, mode, err := c.node("a").runtime.Status(ctx)
					if err != nil || !st.Ready || mode != "local" || st.ReleaseDigest != target.Digest {
						return violate("follower %s started before the new primary was ready", boot)
					}
					return nil
				}
				if !options.AllowMigration || options.Bootstrap {
					return violate("primary start without migration privilege: %+v", options)
				}
				for _, other := range c.list() {
					if other.id == "a" {
						continue
					}
					if stopped, err := other.runtime.Stopped(ctx); err != nil || !stopped {
						return violate("primary migration while %s is alive", other.engine.Node.ShellBootID)
					}
					var confirmed bool
					if err := db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.stop_confirmations WHERE cluster_id=$1 AND node_id=$2 AND shell_boot_id=$3)`, c.dbname, other.id, other.engine.Node.ShellBootID).Scan(&confirmed); err != nil || !confirmed {
						return violate("primary migration without a stop confirmation of %s", other.engine.Node.ShellBootID)
					}
				}
				if killArmed.CompareAndSwap(false, true) {
					// Interrupt the real migration while its transaction sleeps.
					go func() {
						for i := 0; i < 1200; i++ {
							var sleeping bool
							_ = db.QueryRow(context.Background(), `SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=$1 AND state='active' AND query ILIKE '%pg_sleep%' AND query NOT ILIKE '%pg_stat_activity%')`, c.dbname).Scan(&sleeping)
							if st := n.supervisor.Status(); sleeping && st.Running && st.PID > 0 {
								if p, err := os.FindProcess(st.PID); err == nil && p.Kill() == nil {
									killedPID.Store(int64(st.PID))
									t.Logf("fault: SIGKILL primary core pid %d during its migration", st.PID)
								}
								return
							}
							time.Sleep(50 * time.Millisecond)
						}
					}()
				}
				return nil
			},
		}
	}
	c.wrap = observe
	for _, n := range c.list() {
		n.engine.Runtime = observe(n)
		c.run(n)
	}

	admin := newAPIClient(t, c.node("a").public.URL).login(adminEmail, adminPassword)
	mock := mockClient{newAPIClient(t, mockURL)}

	// ---- SSE across registration expiry and key replacement
	streamer := newStreamTenant(t, admin, mockURL, c.dbname)
	words := strings.TrimSpace(strings.Repeat("stream ", 48))
	mock.rule(map[string]any{"api_key": streamer.accountKey, "chunk_delay_ms": 250, "text": words})
	var primary Node
	nodes, err := store.Nodes(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for _, n := range nodes {
		if n.ID == "a" {
			primary = n
		}
	}
	forwarder := c.node("c")
	if err = forwarder.runtime.Redirect(ctx, primary); err != nil {
		t.Fatal(err)
	}
	streamRequest := func(n *realNode) (*http.Response, error) {
		body := strings.NewReader(fmt.Sprintf(`{"model":%q,"max_tokens":64,"stream":true,"messages":[{"role":"user","content":"hi"}]}`, streamer.model))
		req, _ := http.NewRequestWithContext(ctx, http.MethodPost, n.public.URL+"/v1/messages", body)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("x-api-key", streamer.apiKey)
		req.Header.Set("anthropic-version", "2023-06-01")
		return http.DefaultClient.Do(req)
	}
	res, err := streamRequest(forwarder)
	if err != nil || res.StatusCode != 200 {
		t.Fatalf("forwarded stream: %v %v", res, err)
	}
	registration := "s2a:peer:{" + c.dbname + "}:node:c"
	keyOf := func() string {
		raw, err := c.direct.Get(ctx, registration).Bytes()
		if err != nil {
			return ""
		}
		var r struct {
			Key string `json:"auth_key"`
		}
		_ = json.Unmarshal(raw, &r)
		return r.Key
	}
	before := keyOf()
	reader := bufio.NewReader(res.Body)
	var streamed strings.Builder
	started := time.Now()
	rotated := false
	for {
		line, err := reader.ReadString('\n')
		streamed.WriteString(line)
		if !rotated && strings.Contains(line, "content_block_delta") {
			// Drop the forwarding node's registration mid-stream. It
			// re-registers with a new automatic key; the stream must not care.
			if err := c.direct.Del(ctx, registration).Err(); err != nil {
				t.Fatal(err)
			}
			rotated = true
		}
		if err != nil {
			break
		}
	}
	res.Body.Close()
	elapsed := time.Since(started)
	if !strings.Contains(streamed.String(), "message_stop") || strings.Count(streamed.String(), "stream") < 48 || elapsed < 3*ttl {
		t.Fatalf("stream did not survive %s of registrations (%s): %s", ttl, elapsed, streamed.String())
	}
	wait("re-registered key", 30*time.Second, func() bool { k := keyOf(); return k != "" && k != before })
	if res, err = streamRequest(forwarder); err != nil || res.StatusCode != 200 {
		t.Fatalf("request after key replacement: %v %v", res, err)
	}
	_, _ = io.Copy(io.Discard, res.Body)
	res.Body.Close()
	if err = forwarder.runtime.Local(ctx); err != nil {
		t.Fatal(err)
	}
	t.Logf("SSE through forwarding node lasted %s across TTL %s and a key replacement", elapsed.Round(time.Millisecond), ttl)

	// ---- an async video task whose upstream observation is held open
	video := newVideoTenant(t, admin, mockURL, c.dbname)
	mock.video(video.accountKey, "running", true)
	submit := newAPIClient(t, c.node("b").public.URL).do(http.MethodPost, "/api/v3/contents/generations/tasks", map[string]any{
		"model": video.model, "content": []map[string]string{{"type": "text", "text": "A mock clip"}}, "resolution": "480p", "ratio": "16:9", "duration": 4,
	}, map[string]string{"Authorization": "Bearer " + video.apiKey})
	publicID, requestID := submit.str("id"), submit.header.Get("X-Request-Id")
	if submit.status != 200 || !strings.HasPrefix(publicID, "s2task_") || requestID == "" {
		t.Fatalf("video submit: %s", submit)
	}
	wait("held video observation", 2*time.Minute, func() bool {
		tasks := mock.videoTasks(video.accountKey)
		return len(tasks) == 1 && tasks[0].Active == 1
	})
	t.Logf("video task %s submitted; an upstream observation is held open", publicID)

	// ---- the update with faults
	var pf Preflight
	wait("clean preflight after the forwarding check", time.Minute, func() bool {
		pf, err = store.Preflight(ctx, target.Digest)
		return err == nil && len(pf.Blockers) == 0
	})
	upgrading.Store(true)
	plan, err := store.Create(ctx, target.Digest, pf.ExpectedRevision, "real-core-faults", "test")
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("primary-first plan %s started", plan.ID)
	pausedOnce := false
	for {
		if plan, err = store.Plan(ctx, plan.ID); err != nil {
			t.Fatal(err)
		}
		if plan.Status == "completed" {
			break
		}
		if plan.Status == "paused" {
			if pausedOnce || killedPID.Load() == 0 {
				t.Fatalf("unexpected pause: %s", plan.Error)
			}
			pausedOnce = true
			t.Logf("fault: plan paused after the interrupted migration: %s", plan.Error)
			// The interrupted transaction must leave nothing behind, every
			// node stays stopped and every entrance stays unavailable.
			wait("interrupted migration backend gone", time.Minute, func() bool {
				var busy bool
				_ = db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=$1 AND state='active' AND query ILIKE '%pg_sleep%' AND query NOT ILIKE '%pg_stat_activity%')`, c.dbname).Scan(&busy)
				return !busy
			})
			var table, recorded bool
			if err = db.QueryRow(ctx, `SELECT to_regclass('managed_upgrade_probe') IS NOT NULL, EXISTS(SELECT 1 FROM schema_migrations WHERE id=$1)`, os.Getenv("TEST_EXPECT_MIGRATION")).Scan(&table, &recorded); err != nil || table || recorded {
				t.Fatalf("interrupted migration left state: table=%v recorded=%v err=%v", table, recorded, err)
			}
			checkDown := func(when string) {
				for _, n := range c.list() {
					if n.supervisor.Status().Running {
						t.Fatalf("%s: %s runs a core while the update is paused", when, n.engine.Node.ShellBootID)
					}
					if code := probe(n); code != 503 {
						t.Fatalf("%s: %s answered %d while the cluster is down", when, n.engine.Node.ShellBootID, code)
					}
				}
			}
			checkDown("after the interrupted migration")
			// Partition Redis for longer than the registration TTL while the
			// cluster is down. Registrations expire and come back; no core
			// may start, old or new, until the plan is resumed.
			c.redis.Cut(3 * ttl)
			t.Logf("fault: Redis partitioned for %s", 3*ttl)
			time.Sleep(4 * ttl)
			wait("registrations restored after the partition", time.Minute, func() bool {
				for _, n := range c.list() {
					if count, _ := c.direct.Exists(ctx, "s2a:peer:{"+c.dbname+"}:node:"+n.id).Result(); count != 1 {
						return false
					}
				}
				return true
			})
			checkDown("after the Redis partition")
			if _, err = store.Action(ctx, plan.ID, "resume", "test"); err != nil {
				t.Fatal(err)
			}
			t.Log("plan resumed")
			continue
		}
		select {
		case <-ctx.Done():
			t.Fatalf("update did not finish: %+v", plan)
		case <-tick.C:
		}
	}
	upgrading.Store(false)
	if !faultsInjected.Load() || !pausedOnce {
		t.Fatalf("faults were not all injected: shells=%v migration=%v", faultsInjected.Load(), pausedOnce)
	}
	wait("all nodes serving the target, including the joined node", 5*time.Minute, func() bool {
		for _, n := range c.list() {
			st, mode, err := n.runtime.Status(ctx)
			if err != nil || !st.Ready || mode != "local" || st.ReleaseDigest != target.Digest || probe(n) != 401 {
				return false
			}
		}
		return len(c.list()) == 4
	})
	var rows int
	if err = db.QueryRow(ctx, `SELECT count(*) FROM managed_upgrade_probe`).Scan(&rows); err != nil || rows != 1 {
		t.Fatalf("retried migration must apply exactly once: rows=%d err=%v", rows, err)
	}
	t.Log("update completed; the retried migration applied once; d serves the target")

	// ---- the video task resumes on the original account and settles once
	mock.video(video.accountKey, "succeeded", false)
	reader2 := newAPIClient(t, c.node("c").public.URL)
	wait("video task succeeded", 6*time.Minute, func() bool {
		r := reader2.do(http.MethodGet, "/api/v3/contents/generations/tasks/"+publicID, nil, map[string]string{"Authorization": "Bearer " + video.apiKey})
		if r.status != 200 {
			t.Fatalf("task lookup: %s", r)
		}
		return r.str("status") == "succeeded"
	})
	tasks := mock.videoTasks(video.accountKey)
	if len(tasks) != 1 {
		t.Fatalf("video submission repeated upstream: %+v", tasks)
	}
	canceled := 0
	for _, q := range tasks[0].Queries {
		if q.APIKey != video.accountKey {
			t.Fatalf("observation used another account: %+v", q)
		}
		if q.Canceled {
			canceled++
		}
	}
	if tasks[0].MaxActive > 1 || canceled == 0 {
		t.Fatalf("the update must cancel the held observation without parallel monitors: %+v", tasks[0])
	}
	var status, cost string
	var output, failures, usageRows int64
	var accountID int64
	var failureCode string
	if err = db.QueryRow(ctx, `SELECT u.billing_status,u.total_cost::text,u.output_tokens,u.account_id,t.poll_failures,t.failure_code,(SELECT count(*) FROM usage_logs WHERE request_id=$2)
		FROM async_tasks t JOIN usage_logs u ON u.id=t.usage_log_id WHERE t.public_id=$1`, publicID, requestID).Scan(&status, &cost, &output, &accountID, &failures, &failureCode, &usageRows); err != nil {
		t.Fatal(err)
	}
	if status != "billed" || output != 17 || accountID != video.accountID || failures != 0 || failureCode != "" || usageRows != 1 {
		t.Fatalf("video settlement: status=%s output=%d account=%d failures=%d code=%q usage rows=%d", status, output, accountID, failures, failureCode, usageRows)
	}
	balance := video.user.ok(http.MethodGet, "/me/balance", nil).str("data.balance")
	spent, ok1 := new(big.Rat).SetString(cost)
	left, ok2 := new(big.Rat).SetString(balance)
	if !ok1 || !ok2 || spent.Sign() <= 0 || new(big.Rat).Add(left, spent).Cmp(big.NewRat(20, 1)) != 0 {
		t.Fatalf("balance %s after cost %s does not settle 20 exactly once", balance, cost)
	}
	t.Logf("video task settled once on its account: cost=%s, %d upstream observations (%d canceled by the update), 0 poll failures", cost, len(tasks[0].Queries), canceled)

	// ---- a Redis partition while serving does not restart any core
	boots := map[string]string{}
	for _, n := range c.list() {
		st, _, err := n.runtime.Status(ctx)
		if err != nil {
			t.Fatal(err)
		}
		boots[n.id] = st.BootID
	}
	c.redis.Cut(3 * ttl)
	t.Logf("fault: Redis partitioned for %s while serving", 3*ttl)
	time.Sleep(4 * ttl)
	wait("service after the partition", 2*time.Minute, func() bool {
		for _, n := range c.list() {
			if probe(n) != 401 {
				return false
			}
		}
		return true
	})
	for _, n := range c.list() {
		st, mode, err := n.runtime.Status(ctx)
		if err != nil || !st.Ready || mode != "local" || st.BootID != boots[n.id] {
			t.Fatalf("partition restarted or closed %s: %+v %s %v", n.id, st, mode, err)
		}
	}
	violationsMu.Lock()
	defer violationsMu.Unlock()
	if len(violations) > 0 {
		t.Fatalf("violations: %v", violations)
	}
	t.Log("Redis partition while serving: every core kept its boot and serves again")
}
