package control

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
	"github.com/jackc/pgx/v5"
)

type Engine struct {
	Store   *Store
	Locks   LockRunner
	Runtime Runtime
	Node    Node
	// StepTimeout bounds every node step except a prepare's bundle download,
	// which release.Manager fails once bytes stop arriving. PrepareTimeout is
	// only the lock's backstop for that download; neither cuts a live transfer.
	StepTimeout    time.Duration
	PrepareTimeout time.Duration
	PeerMaintain   func(context.Context) error
	PeerCheck      func(context.Context) error
	// CPU reports this node's averaged CPU load; ok is false when unmeasured.
	CPU func() (percent float64, ok bool)

	heartbeat     sync.Mutex
	offloading    bool
	progress      atomic.Uint64
	lastBlocked   sync.Mutex
	lastBlockedAt map[string]time.Time
	passMu        sync.Mutex
	passErrors    map[string]passError
	// yielding sends this node's new requests to the other serving nodes
	// regardless of CPU load: a rolling plan sets it before the node's core
	// restarts (yield step) and clears it after (resume step); an operator
	// sets it before recreating the shell (Yield).
	yielding atomic.Bool
	// busy is true while a plan is running or paused, when the loop polls
	// every second; idle it polls every idlePoll.
	busy atomic.Bool
	// lastWritten is the control snapshot the heartbeat last persisted in
	// PostgreSQL and when; an unchanged snapshot is rewritten only every
	// heartbeatRewrite, telemetry goes to Redis every beat.
	lastWritten   Node
	lastWrittenAt time.Time
	// notReadySince is when an idle, reachable core was first seen not
	// ready; Work restarts it only once that lasts notReadyRestart.
	notReadySince time.Time
}

const (
	DefaultStepTimeout    = 10 * time.Minute
	DefaultPrepareTimeout = 24 * time.Hour
	// idlePoll is the engine's poll interval while no plan is active. A
	// plan created or acted on through the management API wakes every
	// engine over Redis at once, so the interval only bounds how late a
	// node notices a change it was not told about (2026-11-08: before,
	// every node asked PostgreSQL every second around the clock).
	idlePoll = 30 * time.Second
	// activePoll is the poll interval while a plan is running or paused.
	activePoll = time.Second
	// heartbeatRewrite bounds how long an unchanged heartbeat snapshot goes
	// without a PostgreSQL write; liveness itself is Redis telemetry.
	heartbeatRewrite = time.Minute
	// notReadyRestart is how long an idle core may answer status calls but
	// report not ready before Work restarts it. A momentary blip (a plugin
	// reconnecting, a slow database) is logged, not restarted.
	notReadyRestart = 2 * time.Minute
)

func (e *Engine) stepTimeout() time.Duration {
	if e.StepTimeout > 0 {
		return e.StepTimeout
	}
	return DefaultStepTimeout
}

// Run polls durable state; restart never resumes an in-memory command. Each pass
// obtains a fresh Redis lock before reading the current plan and local step.
func (e *Engine) Run(ctx context.Context) error {
	if e.StepTimeout == 0 {
		e.StepTimeout = DefaultStepTimeout
	}
	if e.PrepareTimeout == 0 {
		e.PrepareTimeout = DefaultPrepareTimeout
	}
	// A long download/drain must not stop the independent liveness report.
	go func() {
		ticker := time.NewTicker(3 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				_ = e.Heartbeat(ctx)
			}
		}
	}()
	wakes := e.Store.upgradeWakeups(ctx)
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		_ = e.Heartbeat(ctx)
		start := e.progress.Load()
		for pass := 0; pass < 16 && ctx.Err() == nil; pass++ {
			before := e.progress.Load()
			primary, _, _, err := e.Store.ClusterState(ctx)
			if err == nil && primary == e.Node.ID {
				_, err := e.Locks.WithLock(ctx, "system:upgrade:"+e.Store.Cluster, 30*time.Second, e.Coordinate)
				e.notePassError("coordinate", err)
			}
			_, err = e.Locks.WithLock(ctx, "system:upgrade-node:"+e.Store.Cluster+":"+e.Node.ID, max(e.StepTimeout, e.PrepareTimeout), e.Work)
			e.notePassError("work", err)
			if before == e.progress.Load() {
				break
			}
		}
		// Coalesce bursts and cap hint-driven retries, including duplicate hints.
		timer := time.NewTimer(50 * time.Millisecond)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
		// A plan in flight, or progress this round, keeps the fast cadence;
		// an idle cluster is polled rarely and woken over Redis on change.
		delay := idlePoll
		if e.busy.Load() || e.progress.Load() != start {
			delay = activePoll
		}
		wait := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			wait.Stop()
			return ctx.Err()
		case <-wait.C:
		case <-wakes:
			wait.Stop()
		}
	}
}

// Yield makes this node send its new requests to the other serving nodes,
// for an operator who is about to restart the shell (deploy/gateway/*/README):
// the heartbeat marks the node offloading, the router forwards, and the
// readiness probe answers 503 when drain is set so that an ingress with a
// health check moves on. Yield fails, and changes nothing, when no other
// node can take the traffic. Resume takes the traffic back.
func (e *Engine) Yield(ctx context.Context, drain bool) error {
	e.yielding.Store(true)
	if err := e.Heartbeat(ctx); err != nil {
		e.yielding.Store(false)
		return err
	}
	e.heartbeat.Lock()
	shedding := e.offloading
	e.heartbeat.Unlock()
	if !shedding {
		e.yielding.Store(false)
		return errors.New("no other serving node can take this node's traffic")
	}
	if d, ok := e.Runtime.(interface{ SetDraining(bool) }); ok {
		d.SetDraining(drain)
	}
	return nil
}

// Resume ends a Yield: the node serves its own requests again.
func (e *Engine) Resume(ctx context.Context) error {
	e.yielding.Store(false)
	if d, ok := e.Runtime.(interface{ SetDraining(bool) }); ok {
		d.SetDraining(false)
	}
	return e.Heartbeat(ctx)
}

// YieldState reports the node's traffic handover for the management API.
type YieldState struct {
	NodeID     string `json:"node_id"`
	Yielding   bool   `json:"yielding"`
	Offloading bool   `json:"offloading"`
	Draining   bool   `json:"draining"`
	Active     int64  `json:"active_requests"`
}

func (e *Engine) YieldState() YieldState {
	st := YieldState{NodeID: e.Node.ID, Yielding: e.yielding.Load()}
	e.heartbeat.Lock()
	st.Offloading = e.offloading
	e.heartbeat.Unlock()
	if d, ok := e.Runtime.(interface{ Draining() bool }); ok {
		st.Draining = d.Draining()
	}
	if a, ok := e.Runtime.(interface{ Active() int64 }); ok {
		st.Active = a.Active()
	}
	return st
}

// notePassError logs what a coordinate or work pass returned. The loop
// retries on its own, so the log is deduplicated: a new message at once,
// the same one again every passErrorRepeat, and a recovery line when a pass
// succeeds after failures. Before this the errors were dropped and a core
// restarted by Work left no trace of why (2026-11-08).
func (e *Engine) notePassError(pass string, err error) {
	e.passMu.Lock()
	defer e.passMu.Unlock()
	if e.passErrors == nil {
		e.passErrors = map[string]passError{}
	}
	last := e.passErrors[pass]
	if err == nil || errors.Is(err, context.Canceled) {
		if last.message != "" {
			slog.Info("upgrade engine pass recovered", "pass", pass, "after", last.message)
		}
		delete(e.passErrors, pass)
		return
	}
	now := time.Now()
	if err.Error() != last.message || now.Sub(last.logged) >= passErrorRepeat {
		slog.Warn("upgrade engine pass failed", "pass", pass, "node", e.Node.ID, "err", err)
		e.passErrors[pass] = passError{message: err.Error(), logged: now}
	}
}

type passError struct {
	message string
	logged  time.Time
}

const passErrorRepeat = 5 * time.Minute

// knownStrategies is KnownStrategy for SQL (= ANY($n)).
var knownStrategies = []string{PrimaryFirst, Rolling}

// commitProgress never signals an uncommitted result. Every immediate next pass
// acquires a fresh Redis lease and rereads PG; no command is resumed from memory.
func (e *Engine) commitProgress(ctx context.Context, tx pgx.Tx) error {
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	e.progress.Add(1)
	e.Store.NotifyUpgrade(ctx)
	return nil
}

func (e *Engine) Heartbeat(ctx context.Context) error {
	e.heartbeat.Lock()
	defer e.heartbeat.Unlock()
	if e.PeerMaintain != nil {
		if err := e.PeerMaintain(ctx); err != nil {
			return err
		}
	}
	nodes, nodesErr := e.Store.Nodes(ctx)
	if nodesErr == nil {
		// Refresh the node directory snapshot for authorization and routing.
		e.Store.nodeDirectory.Store(&nodes)
		if refresher, ok := e.Runtime.(interface {
			RefreshForward(context.Context, []Node) error
		}); ok {
			_ = refresher.RefreshForward(ctx, nodes)
		}
		e.resumeForward(ctx, nodes)
	}
	st, mode, err := e.Runtime.Status(ctx)
	n := e.Node
	n.Mode = mode
	n.RouteRevision = e.Runtime.RouteRevision()
	n.CoreBootID = st.BootID
	n.ReleaseDigest = st.ReleaseDigest
	n.Ready = st.Ready && mode == "local"
	n.Stopped, _ = e.Runtime.Stopped(ctx)
	if err != nil {
		n.Error = err.Error()
	}
	if e.CPU != nil {
		if cpu, ok := e.CPU(); ok {
			n.CPUPercent = &cpu
		}
	}
	// Receivers accept offloaded requests only from a node marked offloading,
	// so the mark is stored before shedding starts and cleared after it ends.
	// A yielding node (rolling restart, shell restart) sheds to every other
	// serving node whatever the load; otherwise CPU protection decides.
	shedder, _ := e.Runtime.(interface{ SetOffload([]Node) error })
	var targets []Node
	yielding := e.yielding.Load()
	if shedder != nil && nodesErr == nil {
		if yielding {
			targets = yieldTargets(n, nodes)
		} else if set, err := e.Store.Offload(ctx); err == nil {
			targets = offloadTargets(set, n, nodes, e.offloading)
		}
	}
	if len(targets) == 0 && shedder != nil {
		_ = shedder.SetOffload(nil)
		if e.offloading {
			attrs := []any{"node", n.ID, "yielding", yielding}
			if n.CPUPercent != nil {
				attrs = append(attrs, "cpu_percent", *n.CPUPercent)
			}
			slog.Info("offload stopped", attrs...)
		}
		e.offloading = false
	}
	n.Offloading = len(targets) > 0
	if err = e.persistHeartbeat(ctx, n, nodes, nodesErr == nil); err != nil || len(targets) == 0 {
		return err
	}
	if err = shedder.SetOffload(targets); err != nil {
		return err
	}
	if !e.offloading {
		ids := make([]string, len(targets))
		for i, t := range targets {
			ids[i] = t.ID
		}
		attrs := []any{"node", n.ID, "yielding", yielding, "targets", ids}
		if n.CPUPercent != nil {
			attrs = append(attrs, "cpu_percent", *n.CPUPercent)
		}
		slog.Warn("offload started", attrs...)
	}
	e.offloading = true
	return nil
}

// yieldTargets are the nodes a yielding node hands its new requests to:
// every other enabled node that serves locally, is fresh, has a serving
// identity and is not shedding itself. The release does not matter: a
// rolling plan has both releases serving by design.
func yieldTargets(self Node, nodes []Node) []Node {
	var out []Node
	for _, n := range nodes {
		if n.ID != self.ID && n.Enabled && n.Mode == "local" && n.Ready && !n.Offloading && n.CoreBootID != "" && n.RouteRevision != 0 && n.Fresh(time.Now()) {
			out = append(out, n)
		}
	}
	return out
}

// persistHeartbeat writes the control snapshot to PostgreSQL when it
// changed, or every heartbeatRewrite, and reports telemetry to Redis every
// time. Both happen when the cluster still has a shell that reads liveness
// from PostgreSQL (telemetry boot differs from its shell boot), or when the
// node directory could not be read, so nothing is skipped on a guess.
func (e *Engine) persistHeartbeat(ctx context.Context, n Node, nodes []Node, haveNodes bool) error {
	legacy := !haveNodes
	for _, other := range nodes {
		if other.Enabled && other.TelemetryBootID != other.ShellBootID {
			legacy = true
		}
	}
	if !legacy && !e.lastWrittenAt.IsZero() && time.Since(e.lastWrittenAt) < heartbeatRewrite && sameControlSnapshot(e.lastWritten, n) {
		return e.Store.ReportTelemetry(ctx, n)
	}
	if err := e.Store.Heartbeat(ctx, n); err != nil {
		e.lastWrittenAt = time.Time{}
		return err
	}
	e.lastWritten, e.lastWrittenAt = n, time.Now()
	return nil
}

// sameControlSnapshot compares the fields Store.Heartbeat persists.
func sameControlSnapshot(a, b Node) bool {
	return a.ID == b.ID && a.ShellBootID == b.ShellBootID && a.ReleaseDigest == b.ReleaseDigest && a.CoreBootID == b.CoreBootID &&
		a.Mode == b.Mode && a.Ready == b.Ready && a.RouteRevision == b.RouteRevision && a.Stopped == b.Stopped && a.Offloading == b.Offloading
}

// resumeForward lets a follower that fell back to maintenance only because the
// primary was unavailable serve through the primary again once it is ready,
// without waiting for its own later plan steps. It never starts a core.
func (e *Engine) resumeForward(ctx context.Context, nodes []Node) {
	if _, mode, _ := e.Runtime.Status(ctx); mode != "maintenance" {
		return
	}
	primary, _, _, err := e.Store.ClusterState(ctx)
	if err != nil || primary == e.Node.ID || e.Store.ValidateNode(ctx, e.Node.ID, e.Node.ShellBootID) != nil {
		return
	}
	for _, n := range nodes {
		if n.ID == primary && n.Enabled && n.ServingLocal(time.Now()) {
			_ = e.Runtime.Redirect(ctx, n)
		}
	}
}

func (e *Engine) Coordinate(ctx context.Context) error {
	if err := e.checkPeer(ctx); err != nil {
		return err
	}
	primary, _, _, err := e.Store.ClusterState(ctx)
	if err != nil || primary != e.Node.ID {
		return err
	}
	tx, err := e.Store.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var p Plan
	var raw []byte
	err = tx.QueryRow(ctx, `SELECT id,release_digest,nodes,cursor,strategy FROM updater.upgrades WHERE cluster_id=$1 AND status='running' FOR UPDATE`, e.Store.Cluster).Scan(&p.ID, &p.ReleaseDigest, &raw, &p.Cursor, &p.Strategy)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if err = json.Unmarshal(raw, &p.Nodes); err != nil {
		return err
	}
	if !KnownStrategy(p.Strategy) {
		_, err = tx.Exec(ctx, `UPDATE updater.upgrades SET status='paused',error='legacy upgrade strategy requires manual reconciliation' WHERE id=$1`, p.ID)
		if err != nil {
			return err
		}
		return e.commitProgress(ctx, tx)
	}
	if len(p.Nodes) < 1 || p.Nodes[0] != primary {
		return errors.New("invalid stored upgrade membership")
	}
	steps := Steps(p)
	if p.Cursor >= len(steps) {
		return e.completePlan(ctx, tx, p)
	}
	st := steps[p.Cursor]
	if st.Action == "maintenance" || st.Action == "start-primary" {
		if err = e.followersStopped(ctx); err != nil {
			// The diagnostic update must not wait on our own FOR UPDATE lock.
			_ = tx.Rollback(ctx)
			_ = e.recordBlockedReason(ctx, p.ID, "waiting for followers to stop: "+err.Error())
			return err
		}
	}
	if exists, err := e.settleExistingStep(ctx, tx, p, st); exists || err != nil {
		return err
	}
	return e.insertNextStep(ctx, tx, p, st)
}

// completePlan closes a plan whose cursor reached the end: every planned node
// must be observed serving the target release before the baseline moves.
func (e *Engine) completePlan(ctx context.Context, tx pgx.Tx, p Plan) error {
	if err := e.requireFreshNodes(ctx, p.Nodes); err != nil {
		return err
	}
	var verified int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM updater.nodes WHERE cluster_id=$1 AND node_id=ANY($2) AND ready AND mode='local' AND release_digest=$3`, e.Store.Cluster, p.Nodes, p.ReleaseDigest).Scan(&verified); err != nil {
		return err
	}
	if verified != len(p.Nodes) {
		reason := "waiting for all planned nodes to verify the target release"
		// Release the plan row lock before recording diagnostics through the pool.
		_ = tx.Rollback(ctx)
		_ = e.recordBlockedReason(ctx, p.ID, reason)
		return errors.New(reason)
	}
	if _, err := tx.Exec(ctx, `UPDATE updater.clusters SET baseline=$2,revision=revision+1 WHERE cluster_id=$1`, e.Store.Cluster, p.ReleaseDigest); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE updater.upgrades SET status='completed',updated_at=now() WHERE id=$1`, p.ID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO updater.events(upgrade_id,kind,message) VALUES($1,'completed','all node steps acknowledged')`, p.ID); err != nil {
		return err
	}
	return e.commitProgress(ctx, tx)
}

// settleExistingStep handles a step row that already exists: it may be
// acknowledged as done (advancing the cursor) or still be running, which is left
// alone and committed. exists reports that there was a row, so the caller must
// not create the step; the transaction is finished either way.
func (e *Engine) settleExistingStep(ctx context.Context, tx pgx.Tx, p Plan, st Step) (exists bool, err error) {
	var state string
	err = tx.QueryRow(ctx, `SELECT status FROM updater.steps WHERE upgrade_id=$1 AND step_id=$2`, p.ID, p.Cursor).Scan(&state)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return true, err
	}
	if state != "done" && st.Action == "stop" {
		var safetyStopped bool
		if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.nodes n JOIN updater.stop_confirmations c ON c.cluster_id=n.cluster_id AND c.node_id=n.node_id AND c.shell_boot_id=n.shell_boot_id WHERE n.cluster_id=$1 AND n.node_id=$2 AND NOT n.enabled AND n.stopped AND c.upgrade_id=$3 AND c.step_id=$4)`, e.Store.Cluster, st.NodeID, p.ID, st.ID).Scan(&safetyStopped); err != nil {
			return true, err
		}
		if safetyStopped && e.requireFreshNodes(ctx, []string{st.NodeID}) == nil {
			if _, err = tx.Exec(ctx, `UPDATE updater.steps SET status='done',error='',updated_at=now() WHERE upgrade_id=$1 AND step_id=$2`, p.ID, st.ID); err != nil {
				return true, err
			}
			state = "done"
		}
	}
	if state == "done" {
		if _, err = tx.Exec(ctx, `UPDATE updater.upgrades SET cursor=cursor+1,updated_at=now() WHERE id=$1`, p.ID); err != nil {
			return true, err
		}
		return true, e.commitProgress(ctx, tx)
	}
	return true, tx.Commit(ctx)
}

// insertNextStep creates the current step's row. A plan step aimed at a disabled
// node pauses the whole plan instead.
func (e *Engine) insertNextStep(ctx context.Context, tx pgx.Tx, p Plan, st Step) error {
	if st.Action != "stop" {
		var enabled bool
		if err := tx.QueryRow(ctx, `SELECT enabled FROM updater.nodes WHERE cluster_id=$1 AND node_id=$2`, e.Store.Cluster, st.NodeID).Scan(&enabled); err != nil {
			return err
		}
		if !enabled {
			if _, err := tx.Exec(ctx, `UPDATE updater.upgrades SET status='paused',error=$2 WHERE id=$1`, p.ID, "planned node is disabled: "+st.NodeID); err != nil {
				return err
			}
			return e.commitProgress(ctx, tx)
		}
	}
	if _, err := tx.Exec(ctx, `INSERT INTO updater.steps(upgrade_id,step_id,node_id,action,target_digest,peer_node) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`, p.ID, st.ID, st.NodeID, st.Action, st.TargetDigest, st.PeerNode); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO updater.events(upgrade_id,kind,message) VALUES($1,'step', $2)`, p.ID, st.NodeID+": "+st.Action); err != nil {
		return err
	}
	return e.commitProgress(ctx, tx)
}

func (e *Engine) Work(ctx context.Context) error {
	// The lock budget leaves room for a slow bundle download; everything else
	// in a pass, including the bookkeeping around a prepare, keeps StepTimeout.
	lock := ctx
	ctx, cancel := context.WithTimeout(lock, e.stepTimeout())
	defer cancel()
	if err := e.checkPeer(ctx); err != nil {
		return err
	}
	var st Step
	err := e.Store.DB.QueryRow(ctx, `SELECT s.upgrade_id,s.step_id,s.node_id,s.action,s.target_digest,s.peer_node,s.status FROM updater.steps s JOIN updater.upgrades u ON u.id=s.upgrade_id WHERE u.cluster_id=$1 AND u.status='running' AND u.strategy=ANY($3) AND u.cursor=s.step_id AND s.node_id=$2 AND s.status IN ('pending','running')`, e.Store.Cluster, e.Node.ID, knownStrategies).Scan(&st.UpgradeID, &st.ID, &st.NodeID, &st.Action, &st.TargetDigest, &st.PeerNode, &st.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		// When there is no active command, a crashed stable core may restart
		// only from the persisted route/release, never from a local symlink.
		state, _, statusErr := e.Runtime.Status(ctx)
		var active, outside bool
		if err := e.Store.DB.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.upgrades WHERE cluster_id=$1 AND status IN ('running','paused')),EXISTS(SELECT 1 FROM updater.upgrades WHERE cluster_id=$1 AND status IN ('running','paused') AND NOT nodes ? $2)`, e.Store.Cluster, e.Node.ID).Scan(&active, &outside); err != nil {
			return err
		}
		e.busy.Store(active)
		if outside || statusErr != nil {
			// A core that cannot be reached is restarted by Recover; say why,
			// since the core's own reason dies with its boot.
			attrs := []any{"node", e.Node.ID, "outside_plan", outside}
			if statusErr != nil {
				attrs = append(attrs, "status_err", statusErr)
			}
			slog.Warn("local core unreachable; recovering from the persisted route", attrs...)
			e.notReadySince = time.Time{}
			return e.Recover(ctx, false)
		}
		if state.Ready || active {
			// A member of a plan in flight is not ready between its steps by
			// design; the plan, not this check, restarts it.
			e.notReadySince = time.Time{}
			return nil
		}
		// The core answers but is not ready. That used to restart it at once,
		// and a core that was merely slow lost its in-flight requests. Now it
		// is logged once, and restarted only when it stays that way.
		attrs := []any{"node", e.Node.ID, "mode", state.Mode, "boot", state.BootID, "blockers", state.Blockers}
		if e.notReadySince.IsZero() {
			e.notReadySince = time.Now()
			slog.Warn("local core reports not ready; recovering if it stays so", append(attrs, "after", notReadyRestart)...)
		}
		if time.Since(e.notReadySince) < notReadyRestart {
			return nil
		}
		slog.Warn("local core not ready for too long; recovering from the persisted route", append(attrs, "since", e.notReadySince.UTC().Format(time.RFC3339))...)
		e.notReadySince = time.Time{}
		return e.Recover(ctx, false)
	}
	if err != nil {
		return err
	}
	e.busy.Store(true)
	// Running is a journal state, not an ownership lease: Redis governs execution.
	started, err := e.Store.DB.Exec(ctx, `UPDATE updater.steps s SET status='running',updated_at=now() FROM updater.upgrades u WHERE s.upgrade_id=$1 AND s.step_id=$2 AND u.id=s.upgrade_id AND u.status='running' AND u.strategy=ANY($3) AND u.cursor=s.step_id`, st.UpgradeID, st.ID, knownStrategies)
	if err != nil {
		return err
	}
	if started.RowsAffected() == 0 {
		return nil
	}
	run := ctx
	if st.Action == "prepare" {
		run = lock
	}
	err = e.Execute(run, st)
	if run.Err() != nil {
		return run.Err()
	} // loss of lock never records completion
	// Record under a fresh bound: a download may have outlived the first one.
	ctx, cancel = context.WithTimeout(lock, e.stepTimeout())
	defer cancel()
	execErr := err
	status := "done"
	message := ""
	if execErr != nil {
		status = "failed"
		message = execErr.Error()
		if len(message) > 1024 {
			message = message[:1024]
		}
	}
	late := false
	if txerr := e.Store.withTx(ctx, func(tx pgx.Tx) error {
		// Serialize the outcome with pause/supersede itself, not only a snapshot
		// of its status in UPDATE ... FROM. This keeps inherited step history
		// immutable even when a late outcome races the rollback transaction.
		var currentStatus string
		if err := tx.QueryRow(ctx, `SELECT status FROM updater.upgrades WHERE id=$1 FOR UPDATE`, st.UpgradeID).Scan(&currentStatus); err != nil {
			return err
		}
		finished, err := tx.Exec(ctx, `UPDATE updater.steps s SET status=$3,error=$4,updated_at=now() FROM updater.upgrades u WHERE s.upgrade_id=$1 AND s.step_id=$2 AND u.id=s.upgrade_id AND u.status IN ('running','paused') AND u.cursor=s.step_id`, st.UpgradeID, st.ID, status, message)
		if err != nil {
			return err
		}
		if finished.RowsAffected() == 0 {
			late = true
			_, err = tx.Exec(ctx, `INSERT INTO updater.events(upgrade_id,kind,message) VALUES($1,'late_result','ignored result from an inactive plan')`, st.UpgradeID)
			return err
		}
		if execErr != nil {
			if _, err = tx.Exec(ctx, `UPDATE updater.upgrades SET status='paused',error=$2,updated_at=now() WHERE id=$1 AND status IN ('running','paused')`, st.UpgradeID, message); err != nil {
				return err
			}
		}
		_, err = tx.Exec(ctx, `INSERT INTO updater.events(upgrade_id,kind,message) VALUES($1,$2,$3)`, st.UpgradeID, status, st.NodeID+": "+st.Action+" "+message)
		return err
	}); txerr != nil {
		return txerr
	}
	if late {
		return execErr
	}
	e.progress.Add(1)
	_ = e.Heartbeat(ctx)
	// Publish after the post-action report so a peer can observe the new route
	// on its first wake. Report/publication failures are repaired by polling.
	e.Store.NotifyUpgrade(ctx)
	return execErr
}
func (e *Engine) Execute(ctx context.Context, st Step) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	switch st.Action {
	case "prepare":
		r, err := e.Store.Release(ctx, st.TargetDigest)
		if err != nil {
			return err
		}
		primary, _, _, err := e.Store.ClusterState(ctx)
		if err != nil {
			return err
		}
		source := r.BundleBase
		if e.Node.ID != primary {
			nodes, err := e.Store.Nodes(ctx)
			if err != nil {
				return err
			}
			source = ""
			for _, n := range nodes {
				if n.ID == primary {
					source = n.PeerURL + "/internal/blobs"
				}
			}
			if source == "" {
				return errors.New("primary artifact source missing")
			}
		}
		return e.Runtime.Prepare(ctx, r, source)
	case "redirect":
		nodes, err := e.Store.Nodes(ctx)
		if err != nil {
			return err
		}
		for _, n := range nodes {
			if n.ID == st.PeerNode {
				if !n.ServingLocal(time.Now()) {
					return e.Runtime.Maintenance(ctx)
				}
				return e.Runtime.Redirect(ctx, n)
			}
		}
		return errors.New("forward target not found")
	case "maintenance":
		if err := e.followersStopped(ctx); err != nil {
			return err
		}
		return e.Runtime.Maintenance(ctx)
	case "yield":
		// A core that is not serving has nothing to hand over; one that is
		// must have a taker, or the plan pauses here rather than go dark.
		if err := e.Yield(ctx, false); err != nil {
			if stopped, _ := e.Runtime.Stopped(ctx); stopped {
				e.yielding.Store(true)
				return nil
			}
			if status, _, statusErr := e.Runtime.Status(ctx); statusErr != nil || !status.Ready {
				e.yielding.Store(true)
				return nil
			}
			return err
		}
		return nil
	case "resume":
		return e.Resume(ctx)
	case "stop":
		return e.stop(ctx, fmt.Sprintf("%s-%d", st.UpgradeID, st.ID))
	case "start", "start-primary":
		return e.start(ctx, st.UpgradeID, st.TargetDigest, false)
	case "admit":
		status, _, err := e.Runtime.Status(ctx)
		if err != nil || status.ReleaseDigest != st.TargetDigest {
			start := st
			start.Action = "start"
			if err = e.Execute(ctx, start); err != nil {
				return err
			}
		}
		return e.Admit(ctx, st.TargetDigest)
	case "local":
		status, _, err := e.Runtime.Status(ctx)
		if err != nil || !status.Ready {
			admit := st
			admit.Action = "admit"
			if err = e.Execute(ctx, admit); err != nil {
				return err
			}
		}
		return e.Runtime.Local(ctx)
	default:
		return errors.New("unknown persistent step action")
	}
}
func (e *Engine) Admit(ctx context.Context, digest string) error {
	if err := e.admissionAllowed(ctx, digest); err != nil {
		return err
	}
	st, _, err := e.Runtime.Status(ctx)
	if err != nil {
		return err
	}
	if st.ReleaseDigest != digest || st.BootID == "" {
		return errors.New("candidate release identity mismatch")
	}
	if len(st.Blockers) > 0 {
		return errors.New("candidate plugin or schema checks are blocked")
	}
	rel, err := e.Store.Release(ctx, digest)
	if err != nil {
		return err
	}
	if st.SchemaContract == "" || st.SchemaContract != rel.Manifest.SchemaAfter {
		return errors.New("candidate embedded schema contract differs from the signed release")
	}
	if st.Protocol != rc.Protocol || st.ClusterProtocol != rel.Manifest.ClusterProtocol || st.TaskProtocol != rel.Manifest.TaskProtocol || st.HostAPIVersion != rel.Manifest.HostAPIVersion {
		return errors.New("candidate runtime protocols differ from signed release")
	}
	if st.CoreVersion == "" || st.CoreVersion != rel.Manifest.CoreVersion {
		return errors.New("candidate core version differs from the signed release")
	}
	tx, err := e.Store.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var allowed bool
	if err = tx.QueryRow(ctx, `SELECT enabled AND shell_boot_id=$3 FROM updater.nodes WHERE cluster_id=$1 AND node_id=$2 FOR UPDATE`, e.Store.Cluster, e.Node.ID, e.Node.ShellBootID).Scan(&allowed); err != nil {
		return err
	}
	if !allowed {
		return errors.New("node disabled before admission commit")
	}
	if err = e.planAuthorizesTx(ctx, tx, digest); err != nil {
		return err
	}
	var rev int64
	err = tx.QueryRow(ctx, `INSERT INTO updater.node_admissions(node_id,cluster_id,core_boot_id,release_digest,revision,serve_http,claim_background,coordinate_plugins) VALUES($1,$2,$3,$4,1,true,true,true) ON CONFLICT(node_id) DO UPDATE SET core_boot_id=EXCLUDED.core_boot_id,release_digest=EXCLUDED.release_digest,revision=updater.node_admissions.revision+1,serve_http=true,claim_background=true,coordinate_plugins=true WHERE updater.node_admissions.cluster_id=EXCLUDED.cluster_id RETURNING revision`, e.Node.ID, e.Store.Cluster, st.BootID, digest).Scan(&rev)
	if err != nil {
		return err
	}
	if err = tx.Commit(ctx); err != nil {
		return err
	}
	out, err := e.Runtime.Admit(ctx, rc.Admission{BootID: st.BootID, ReleaseDigest: digest, Revision: rev, ServeHTTP: true, ClaimBackground: true, CoordinatePlugins: true})
	if err != nil {
		return err
	}
	if !out.Ready {
		return errors.New("candidate did not become ready")
	}
	return nil
}

// checkPeer verifies the node's shell identity before a coordination pass. A
// revoke seen by authoritative PG stops the local core; a transient Redis
// registration miss alone does not.
func (e *Engine) checkPeer(ctx context.Context) error {
	if err := e.Store.ValidateNode(ctx, e.Node.ID, e.Node.ShellBootID); err != nil {
		if e.identityRevoked(ctx) {
			e.stopRevokedIdentity(ctx)
		}
		return err
	}
	if e.PeerCheck != nil {
		return e.PeerCheck(ctx)
	}
	return nil
}

// identityRevoked reports the authoritative PG answer. Only an identity mismatch
// there triggers draining. A transient Redis registration miss must not restart
// or drain an otherwise valid core.
func (e *Engine) identityRevoked(ctx context.Context) bool {
	var revoked bool
	err := e.Store.DB.QueryRow(ctx, `SELECT NOT enabled OR shell_boot_id<>$3 FROM updater.nodes WHERE cluster_id=$1 AND node_id=$2`, e.Store.Cluster, e.Node.ID, e.Node.ShellBootID).Scan(&revoked)
	return err == nil && revoked
}

// stopRevokedIdentity drains a revoked core and reports the stop for this
// unchanged shell boot. Errors are deliberately not surfaced: the caller is
// already returning the identity failure and the next pass retries.
func (e *Engine) stopRevokedIdentity(ctx context.Context) {
	_ = e.Runtime.Maintenance(ctx)
	bounded, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	if err := e.Runtime.DrainStop(bounded, "node-identity-revoked"); err != nil {
		return
	}
	stopped, err := e.Runtime.Stopped(bounded)
	if err != nil || !stopped {
		return
	}
	// Disabled identities cannot authenticate or receive ordinary work, but
	// may still report this safety fact for their own unchanged shell boot.
	tag, err := e.Store.DB.Exec(bounded, `UPDATE updater.nodes SET ready=false,stopped=true,mode='maintenance',last_seen=now() WHERE cluster_id=$1 AND node_id=$2 AND shell_boot_id=$3`, e.Store.Cluster, e.Node.ID, e.Node.ShellBootID)
	if err != nil || tag.RowsAffected() != 1 {
		return
	}
	nodes, err := e.Store.Nodes(bounded)
	if err != nil {
		return
	}
	for _, n := range nodes {
		if n.ID == e.Node.ID && n.ShellBootID == e.Node.ShellBootID {
			_ = e.Store.ReportTelemetry(bounded, n)
		}
	}
	_ = e.Store.RecordStop(bounded, e.Node)
}
func (e *Engine) followersStopped(ctx context.Context) error {
	primary, _, _, err := e.Store.ClusterState(ctx)
	if err != nil {
		return err
	}
	nodes, err := e.Store.Nodes(ctx)
	if err != nil {
		return err
	}
	for _, n := range nodes {
		if n.ID != primary && !n.Fresh(time.Now()) {
			return errors.New("waiting for fresh follower observations")
		}
	}
	var unsafe int
	err = e.Store.DB.QueryRow(ctx, `SELECT count(*) FROM updater.nodes n
 JOIN updater.upgrades p ON p.cluster_id=n.cluster_id AND p.status IN ('running','paused')
 LEFT JOIN updater.stop_confirmations c ON c.cluster_id=n.cluster_id AND c.node_id=n.node_id AND c.upgrade_id=p.id AND c.shell_boot_id=n.shell_boot_id
 WHERE n.cluster_id=$1 AND n.node_id<>$2 AND
 (NOT n.stopped OR c.node_id IS NULL OR n.peer_protocol<>$3 OR n.strategy<>$4 OR
 ((p.nodes ? n.node_id) AND NOT EXISTS(SELECT 1 FROM updater.steps st WHERE st.upgrade_id=p.id AND st.node_id=n.node_id AND st.step_id=c.step_id AND st.action='stop' AND st.status='done')) OR
 (NOT (p.nodes ? n.node_id) AND c.step_id IS NOT NULL))`, e.Store.Cluster, primary, PeerProtocol, PrimaryFirst).Scan(&unsafe)
	if err != nil {
		return err
	}
	if unsafe > 0 {
		return errors.New("waiting for current-boot plan-bound follower stop confirmations")
	}
	blockers, err := e.Store.UnmanagedBlockers(ctx)
	if err != nil {
		return err
	}
	if len(blockers) > 0 {
		return errors.New("unmanaged live cores block migration")
	}
	return nil
}
func (e *Engine) stop(ctx context.Context, operation string) error {
	_, err := e.Store.DB.Exec(ctx, `UPDATE updater.node_admissions SET serve_http=false,claim_background=false,coordinate_plugins=false,revision=revision+1 WHERE node_id=$1 AND cluster_id=$2 AND (serve_http OR claim_background OR coordinate_plugins)`, e.Node.ID, e.Store.Cluster)
	if err != nil {
		return err
	}
	stopped, err := e.Runtime.Stopped(ctx)
	if err != nil {
		return err
	}
	if !stopped {
		if err = e.Runtime.DrainStop(ctx, operation); err != nil {
			return err
		}
	}
	stopped, err = e.Runtime.Stopped(ctx)
	if err != nil {
		return err
	}
	if !stopped {
		return errors.New("process group has not stopped")
	}
	if err = e.Heartbeat(ctx); err != nil {
		return err
	}
	return e.Store.RecordStop(ctx, e.Node)
}
func (e *Engine) start(ctx context.Context, planID, digest string, bootstrap bool) error {
	primary, _, _, err := e.Store.ClusterState(ctx)
	if err != nil {
		return err
	}
	rel, err := e.Store.Release(ctx, digest)
	if err != nil {
		return err
	}
	opts := rc.PrepareRequest{Bootstrap: bootstrap, AllowMigration: bootstrap, ExpectedSchemaAfter: rel.Manifest.SchemaAfter, CoordinatePlugins: e.Node.ID == primary}
	if planID != "" {
		p, err := e.Store.Plan(ctx, planID)
		if err != nil {
			return err
		}
		if !KnownStrategy(p.Strategy) || p.Status != "running" {
			return errors.New("plan is not runnable")
		}
		if p.Strategy == Rolling {
			// The schema is unchanged by construction (rollingEligible), the
			// other nodes keep serving: no migration, no barrier.
			opts.ExpectedSchemaBefore = rel.Manifest.SchemaBefore
		} else if e.Node.ID == primary {
			if err = e.followersStopped(ctx); err != nil {
				return err
			}
			source, err := e.Store.Release(ctx, p.SourceDigest)
			if err != nil {
				return err
			}
			opts.AllowMigration = true
			opts.ExpectedSchemaBefore = source.Manifest.SchemaAfter
		} else {
			nodes, err := e.Store.Nodes(ctx)
			if err != nil {
				return err
			}
			ready := false
			for _, n := range nodes {
				if n.ID == primary && n.ReleaseDigest == digest && n.ServingLocal(time.Now()) {
					ready = true
				}
			}
			if !ready {
				return errors.New("primary target release is not locally ready")
			}
		}
	}
	if err = e.Execute(ctx, Step{Action: "prepare", TargetDigest: digest}); err != nil {
		return err
	}
	_, err = e.Runtime.Start(ctx, digest, opts)
	return err
}

// Recover obeys issued stop intents even before their ACK. Active maintenance
// never authorizes an old follower to restart, including unplanned new nodes.
func (e *Engine) Recover(ctx context.Context, bootstrap bool) error {
	if err := e.checkPeer(ctx); err != nil {
		return err
	}
	primary, baseline, _, err := e.Store.ClusterState(ctx)
	if err != nil {
		return err
	}
	plans, err := e.Store.Plans(ctx)
	if err != nil {
		return err
	}
	if active := activePlan(plans); active != nil {
		return e.recoverActivePlan(ctx, *active, primary)
	}
	if bootstrap {
		var admitted bool
		if err = e.Store.DB.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.node_admissions WHERE cluster_id=$1)`, e.Store.Cluster).Scan(&admitted); err != nil {
			return err
		}
		bootstrap = !admitted && e.Node.ID == primary
	}
	return e.startStable(ctx, baseline, bootstrap, e.Node.ID == primary)
}

// activePlan returns the plan a restart must respect: the oldest running or
// paused plan, or nil when nothing is in flight.
func activePlan(plans []Plan) *Plan {
	for i := range plans {
		if plans[i].Status == "running" || plans[i].Status == "paused" {
			return &plans[i]
		}
	}
	return nil
}

// recoverActivePlan restarts this node into the state an in-flight plan assigns
// it. Each branch either forwards to the primary, stops, or resumes stable
// serving; the durable plan, not memory, decides which.
func (e *Engine) recoverActivePlan(ctx context.Context, p Plan, primary string) error {
	if !KnownStrategy(p.Strategy) {
		return e.enterMaintenanceAndStop(ctx, "legacy-plan-recovery")
	}
	member := false
	for _, id := range p.Nodes {
		if id == e.Node.ID {
			member = true
		}
	}
	if p.Strategy == Rolling && member {
		return e.recoverRollingMember(ctx, p, primary)
	}
	stopped, startIssued, localDone, disrupted := scanNodeSteps(p, e.Node.ID)
	if !member || (stopped && !startIssued) || (startIssued && !localDone) {
		forwarded := false
		if e.Node.ID != primary {
			if n, ok := e.freshPrimary(ctx, primary); ok && e.redirectToPrimary(ctx, n) {
				forwarded = true
			}
		}
		if !forwarded {
			if err := e.Runtime.Maintenance(ctx); err != nil {
				return err
			}
		}
		// Prepared candidates are owned by issued start/admit work. Between
		// steps they stay closed; a paused plan cannot autonomously admit them.
		if startIssued && member {
			return nil
		}
		return e.stop(ctx, "active-plan-recovery")
	}
	if localDone {
		return e.startStable(ctx, p.ReleaseDigest, false, e.Node.ID == primary)
	}
	if disrupted {
		return e.enterMaintenanceAndStop(ctx, "migration-barrier")
	}
	state, _, statusErr := e.Runtime.Status(ctx)
	if statusErr == nil && state.Ready {
		return nil
	}
	if e.Node.ID != primary {
		if n, ok := e.freshPrimary(ctx, primary); ok {
			// The redirect is best effort: the node is about to stop either way.
			_ = e.redirectToPrimary(ctx, n)
			return e.stop(ctx, "active-plan-recovery")
		}
	}
	return e.enterMaintenanceAndStop(ctx, "active-plan-recovery")
}

// recoverRollingMember restarts a member of a rolling plan into the state the
// plan assigns it. A node past its local step serves the target; a node whose
// turn is under way (yield issued, core stopped or started but not yet
// serving) yields and stays stopped for the plan to continue; a node whose
// turn has not come keeps serving its current core, or, if that core is
// gone, waits stopped for its turn rather than restart an old release.
func (e *Engine) recoverRollingMember(ctx context.Context, p Plan, primary string) error {
	var yielded, stopped, startIssued, localDone bool
	for _, st := range p.Steps {
		if st.NodeID != e.Node.ID {
			continue
		}
		switch st.Action {
		case "yield":
			yielded = true
		case "stop":
			stopped = true
		case "start":
			startIssued = true
		case "local":
			localDone = st.Status == "done"
		case "resume":
			if st.Status == "done" {
				yielded = false
			}
		}
	}
	if localDone {
		e.yielding.Store(yielded)
		return e.startStable(ctx, p.ReleaseDigest, false, e.Node.ID == primary)
	}
	if yielded || stopped {
		e.yielding.Store(true)
		if startIssued {
			// The candidate is owned by the plan's start/admit work.
			return nil
		}
		return e.stop(ctx, "active-plan-recovery")
	}
	state, _, statusErr := e.Runtime.Status(ctx)
	if statusErr == nil && state.Ready {
		return nil
	}
	e.yielding.Store(true)
	return e.stop(ctx, "active-plan-recovery")
}

// scanNodeSteps reads the plan's steps that concern nodeID.
func scanNodeSteps(p Plan, nodeID string) (stopped, startIssued, localDone, disrupted bool) {
	for _, st := range p.Steps {
		if st.Action == "maintenance" {
			disrupted = true
		}
		if st.NodeID != nodeID {
			continue
		}
		switch st.Action {
		case "stop":
			stopped = true
			startIssued = false
			localDone = false
		case "start", "start-primary":
			startIssued = true
		case "local":
			localDone = st.Status == "done"
		}
	}
	return stopped, startIssued, localDone, disrupted
}

// freshPrimary returns the primary node when it is fresh and serving locally,
// which is the precondition for routing this node's traffic through it. Callers
// that only need "is there somewhere to redirect to" stop there; callers that
// need the redirect itself pass the node on.
func (e *Engine) freshPrimary(ctx context.Context, primary string) (Node, bool) {
	nodes, _ := e.Store.Nodes(ctx)
	for _, n := range nodes {
		if n.ID == primary && n.ServingLocal(time.Now()) {
			return n, true
		}
	}
	return Node{}, false
}

// redirectToPrimary routes this node's serving through primary and reports
// whether that worked.
func (e *Engine) redirectToPrimary(ctx context.Context, primary Node) bool {
	return e.Runtime.Redirect(ctx, primary) == nil
}

// enterMaintenanceAndStop stops the core in maintenance for reason, which is
// recorded in the stop confirmation and therefore differs per call site.
func (e *Engine) enterMaintenanceAndStop(ctx context.Context, reason string) error {
	if err := e.Runtime.Maintenance(ctx); err != nil {
		return err
	}
	return e.stop(ctx, reason)
}
func (e *Engine) startStable(ctx context.Context, digest string, bootstrap, coordinate bool) error {
	if err := e.Store.withChange(ctx, func(ctx context.Context) error {
		if err := e.admissionAllowed(ctx, digest); err != nil {
			return err
		}
		tag, err := e.Store.DB.Exec(ctx, `UPDATE updater.nodes SET ready=false,stopped=false,mode='candidate' WHERE cluster_id=$1 AND node_id=$2 AND shell_boot_id=$3 AND enabled`, e.Store.Cluster, e.Node.ID, e.Node.ShellBootID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() != 1 {
			return ErrConflict
		}
		return nil
	}); err != nil {
		return err
	}
	rel, err := e.Store.Release(ctx, digest)
	if err != nil {
		return err
	}
	if err = e.Execute(ctx, Step{Action: "prepare", TargetDigest: digest}); err != nil {
		return err
	}
	_, err = e.Runtime.Start(ctx, digest, rc.PrepareRequest{Bootstrap: bootstrap, AllowMigration: bootstrap, ExpectedSchemaAfter: rel.Manifest.SchemaAfter, CoordinatePlugins: coordinate})
	if err != nil {
		return err
	}
	if err = e.Admit(ctx, digest); err != nil {
		return err
	}
	return e.Runtime.Local(ctx)
}

func (e *Engine) admissionAllowed(ctx context.Context, digest string) error {
	if err := e.checkPeer(ctx); err != nil {
		return err
	}
	primary, baseline, _, err := e.Store.ClusterState(ctx)
	if err != nil {
		return err
	}
	var id, status, target, strategy string
	err = e.Store.DB.QueryRow(ctx, `SELECT id,status,release_digest,strategy FROM updater.upgrades WHERE cluster_id=$1 AND status IN ('running','paused')`, e.Store.Cluster).Scan(&id, &status, &target, &strategy)
	if errors.Is(err, pgx.ErrNoRows) {
		if digest != baseline {
			return errors.New("release is not the completed baseline")
		}
		return nil
	}
	if err != nil {
		return err
	}
	if !KnownStrategy(strategy) || digest != target {
		return errors.New("active plan does not authorize this release")
	}
	var localDone, started bool
	err = e.Store.DB.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.steps WHERE upgrade_id=$1 AND node_id=$2 AND action='local' AND status='done'),EXISTS(SELECT 1 FROM updater.steps WHERE upgrade_id=$1 AND node_id=$2 AND action IN ('start','start-primary') AND status='done')`, id, e.Node.ID).Scan(&localDone, &started)
	if err != nil {
		return err
	}
	if localDone {
		return nil
	}
	if status != "running" || !started {
		return errors.New("node has no runnable first-admission permission")
	}
	if strategy == Rolling {
		// Each node admits on its own turn; the others serve meanwhile.
		return nil
	}
	if e.Node.ID == primary {
		return e.followersStopped(ctx)
	}
	var ready bool
	if err = e.requireFreshNodes(ctx, []string{primary}); err != nil {
		return err
	}
	err = e.Store.DB.QueryRow(ctx, `SELECT ready AND mode='local' AND release_digest=$3 FROM updater.nodes WHERE cluster_id=$1 AND node_id=$2`, e.Store.Cluster, primary, digest).Scan(&ready)
	if err != nil {
		return err
	}
	if !ready {
		return errors.New("primary target is not locally ready")
	}
	return nil
}

// Freshness is an observation, not proof of stopped processes or authorization.
// Callers retain the durable PG predicates and plan-bound stop confirmations.
func (e *Engine) requireFreshNodes(ctx context.Context, ids []string) error {
	nodes, err := e.Store.Nodes(ctx)
	if err != nil {
		return err
	}
	fresh := make(map[string]bool, len(nodes))
	for _, n := range nodes {
		fresh[n.ID] = n.Fresh(time.Now())
	}
	for _, id := range ids {
		if !fresh[id] {
			return errors.New("waiting for fresh node observation: " + id)
		}
	}
	return nil
}

// planAuthorizesTx repeats the plan part of admissionAllowed inside the
// admission transaction. Pause, supersede, creation and completion each update
// the active plan row or the cluster row, so share locks on both (plan first,
// matching Coordinate and rollback) serialize the admission write with them.
func (e *Engine) planAuthorizesTx(ctx context.Context, tx pgx.Tx, digest string) error {
	var id, status, target, strategy string
	planErr := tx.QueryRow(ctx, `SELECT id,status,release_digest,strategy FROM updater.upgrades WHERE cluster_id=$1 AND status IN ('running','paused') FOR SHARE`, e.Store.Cluster).Scan(&id, &status, &target, &strategy)
	if planErr != nil && !errors.Is(planErr, pgx.ErrNoRows) {
		return planErr
	}
	var baseline string
	if err := tx.QueryRow(ctx, `SELECT baseline FROM updater.clusters WHERE cluster_id=$1 FOR SHARE`, e.Store.Cluster).Scan(&baseline); err != nil {
		return err
	}
	if errors.Is(planErr, pgx.ErrNoRows) {
		// A plan created before the cluster row lock was granted is visible now.
		var active bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.upgrades WHERE cluster_id=$1 AND status IN ('running','paused'))`, e.Store.Cluster).Scan(&active); err != nil {
			return err
		}
		if active || digest != baseline {
			return ErrConflict
		}
		return nil
	}
	if !KnownStrategy(strategy) || digest != target {
		return ErrConflict
	}
	var localDone, started bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.steps WHERE upgrade_id=$1 AND node_id=$2 AND action='local' AND status='done'),EXISTS(SELECT 1 FROM updater.steps WHERE upgrade_id=$1 AND node_id=$2 AND action IN ('start','start-primary') AND status='done')`, id, e.Node.ID).Scan(&localDone, &started); err != nil {
		return err
	}
	if localDone || (status == "running" && started) {
		return nil
	}
	return errors.New("plan changed before admission commit")
}

// recordBlockedReason writes waiting errors to upgrades.blocked_reason with
// deduplication and rate limiting (once per minute per reason).
func (e *Engine) recordBlockedReason(ctx context.Context, upgradeID, reason string) error {
	e.lastBlocked.Lock()
	if e.lastBlockedAt == nil {
		e.lastBlockedAt = make(map[string]time.Time)
	}
	key := upgradeID + ":" + reason
	last := e.lastBlockedAt[key]
	if time.Since(last) < time.Minute {
		e.lastBlocked.Unlock()
		return nil
	}
	e.lastBlockedAt[key] = time.Now()
	e.lastBlocked.Unlock()
	_, err := e.Store.DB.Exec(ctx, `UPDATE updater.upgrades SET blocked_reason=$2 WHERE id=$1`, upgradeID, reason)
	return err
}
