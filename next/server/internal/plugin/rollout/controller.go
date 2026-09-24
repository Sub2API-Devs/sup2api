package rollout

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Options wires the controller. DB, Node, Packages, Registry and Runtime are
// required; Bus, Schemas, Defaults, Perms and Events are optional.
type Options struct {
	DB       *store.DB
	Node     core.NodeRegistry
	Bus      core.Bus
	Packages *registry.Packages
	Registry *registry.Registry
	Runtime  Runtime
	Schemas  Schemas
	Defaults core.PluginDefaultsApplier
	Perms    core.PermissionCatalog
	Events   core.EventPublisher
	Logger   *slog.Logger

	// Timing knobs; zero values use the production defaults.
	ReconcileInterval time.Duration // 5s
	LeaseTTL          time.Duration // 15s
	LeaseRenew        time.Duration // 5s
	PrepareTimeout    time.Duration // 120s
	ActivateTimeout   time.Duration // 60s
	CoordinatorTick   time.Duration // 1s
	DrainTimeout      time.Duration // 30s
	LoadRetry         time.Duration // 30s: retry a failed instance load
}

// Controller implements core.RolloutController and runs the node reconciler.
type Controller struct {
	o   Options
	log *slog.Logger

	kickCh chan struct{}
	wakeMu sync.Mutex
	wakers map[int64]chan struct{} // coordinator wake-ups by rollout id

	recMu sync.Mutex // one reconcile pass at a time
	mu    sync.Mutex
	slots map[string]*slot
	sig   string // signature of the last published generation
	// referenced: versions per plugin named by active/desired or an open
	// rollout (from/target) in the last reconcile; their packages are kept.
	referenced map[string]map[string]bool
	restarting map[string]bool // key -> resource restart running
	again      map[string]bool // key -> restart requested while running
	stopped    bool

	drainMu  sync.Mutex     // leaf lock (may be taken under mu or slot.mu)
	draining map[string]int // key@version -> instances still draining

	hub *broadcastHub

	coordMu      sync.Mutex
	coordinating map[int64]bool

	stopOnce sync.Once
	ctx      context.Context // cancelled by Stop
	cancel   context.CancelFunc
	wg       sync.WaitGroup
	unsub    func()
}

var _ core.RolloutController = (*Controller)(nil)

func New(o Options) (*Controller, error) {
	if o.DB == nil || o.Node == nil || o.Packages == nil || o.Registry == nil || o.Runtime == nil {
		return nil, errors.New("rollout: DB, Node, Packages, Registry and Runtime are required")
	}
	if o.Logger == nil {
		o.Logger = slog.Default()
	}
	def := func(d *time.Duration, v time.Duration) {
		if *d <= 0 {
			*d = v
		}
	}
	def(&o.ReconcileInterval, 5*time.Second)
	def(&o.LeaseTTL, 15*time.Second)
	def(&o.LeaseRenew, 5*time.Second)
	def(&o.PrepareTimeout, 120*time.Second)
	def(&o.ActivateTimeout, 60*time.Second)
	def(&o.CoordinatorTick, time.Second)
	def(&o.DrainTimeout, 30*time.Second)
	def(&o.LoadRetry, 30*time.Second)
	ctx, cancel := context.WithCancel(context.Background())
	c := &Controller{
		o:            o,
		log:          o.Logger.With("component", "plugin-rollout", "boot_id", o.Node.BootID()),
		kickCh:       make(chan struct{}, 1),
		wakers:       map[int64]chan struct{}{},
		slots:        map[string]*slot{},
		referenced:   map[string]map[string]bool{},
		draining:     map[string]int{},
		restarting:   map[string]bool{},
		again:        map[string]bool{},
		coordinating: map[int64]bool{},
		ctx:          ctx,
		cancel:       cancel,
	}
	c.hub = newBroadcastHub(o.Bus, o.Node.BootID(), c.servingInstance, c.log)
	return c, nil
}

// Start runs the reconciler (every ReconcileInterval and on broadcasts)
// until Stop. It removes orphaned package directories and performs one
// synchronous reconcile first so plugins are serving when Start returns.
func (c *Controller) Start(context.Context) {
	ctx := c.ctx
	if c.o.Bus != nil {
		c.unsub = c.o.Bus.Subscribe(core.ChannelPluginEvents, c.onPluginEvent)
	}
	c.pruneOrphans(ctx)
	c.Reconcile(ctx)
	c.wg.Add(1)
	go func() {
		defer c.wg.Done()
		t := time.NewTicker(c.o.ReconcileInterval)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
			case <-c.kickCh:
			}
			c.Reconcile(ctx)
		}
	}()
}

// Stop ends the loops, drains every local instance and publishes an empty
// generation. Coordinated rollouts are left to be taken over by other nodes.
func (c *Controller) Stop(ctx context.Context) {
	c.stopOnce.Do(func() {
		if c.unsub != nil {
			c.unsub()
		}
		c.hub.close()
		c.mu.Lock()
		c.stopped = true
		c.mu.Unlock()
		c.cancel()
		c.wg.Wait()
		c.recMu.Lock()
		defer c.recMu.Unlock()
		c.o.Registry.Publish(nil)
		c.mu.Lock()
		var all []Instance
		for _, s := range c.slots {
			for _, e := range s.entries {
				if e.inst != nil {
					all = append(all, e.inst)
				}
			}
		}
		c.slots = map[string]*slot{}
		c.mu.Unlock()
		var wg sync.WaitGroup
		for _, inst := range all {
			wg.Add(1)
			go func(inst Instance) {
				defer wg.Done()
				inst.Drain(c.o.DrainTimeout)
			}(inst)
		}
		done := make(chan struct{})
		go func() { wg.Wait(); close(done) }()
		select {
		case <-done:
		case <-ctx.Done():
		}
	})
}

// onPluginEvent handles core.ChannelPluginEvents: "resources" restarts the
// plugin's local instances, anything else triggers a reconcile.
func (c *Controller) onPluginEvent(payload []byte) {
	var m Message
	_ = json.Unmarshal(payload, &m)
	if m.Type == MessageResources && m.PluginKey != "" {
		c.requestRestart(m.PluginKey)
		return
	}
	c.kick()
	c.wakeCoordinators()
}

func (c *Controller) kick() {
	select {
	case c.kickCh <- struct{}{}:
	default:
	}
}

func (c *Controller) wakeCoordinators() {
	c.wakeMu.Lock()
	defer c.wakeMu.Unlock()
	for _, ch := range c.wakers {
		select {
		case ch <- struct{}{}:
		default:
		}
	}
}

func (c *Controller) publish(ctx context.Context, key string, rolloutID int64) {
	if c.o.Bus == nil {
		return
	}
	b, _ := json.Marshal(Message{Type: "rollout", PluginKey: key, RolloutID: rolloutID})
	if err := c.o.Bus.Publish(ctx, core.ChannelPluginEvents, b); err != nil {
		c.log.Warn("publish plugin event failed", "err", err)
	}
}

// ------------------------------------------------------------------ core.RolloutController

var (
	errNoPlugin = core.ErrNotFound.WithMessage("plugin not found")
	errOpen     = core.ErrConflict.WithMessage("a rollout is already in progress for this plugin").
			WithDetails(map[string]any{"reason": "rollout_in_progress"})
)

type pluginLock struct {
	status     string
	active     *string
	rowVersion int64
}

func lockPlugin(ctx context.Context, tx pgx.Tx, key string) (*pluginLock, error) {
	var p pluginLock
	err := tx.QueryRow(ctx, `SELECT status, active_version, row_version FROM plugins WHERE key = $1 FOR UPDATE`, key).
		Scan(&p.status, &p.active, &p.rowVersion)
	if store.IsNoRows(err) {
		return nil, errNoPlugin
	}
	if err != nil {
		return nil, err
	}
	var open bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM plugin_rollouts WHERE plugin_key = $1 AND phase IN ('preparing','activating'))`, key).Scan(&open); err != nil {
		return nil, err
	}
	if open {
		return nil, errOpen
	}
	return &p, nil
}

func approved(ctx context.Context, tx pgx.Tx, key, version string) (bool, error) {
	var ok bool
	err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM plugin_versions WHERE plugin_key = $1 AND version = $2 AND consent_status = 'approved')`, key, version).Scan(&ok)
	return ok, err
}

func actor(id int64) *int64 {
	if id <= 0 {
		return nil
	}
	return &id
}

func (c *Controller) insertRollout(ctx context.Context, tx pgx.Tx, key, action string, from, target *string, phase string, actorID int64) (int64, error) {
	var id int64
	err := tx.QueryRow(ctx, `
		INSERT INTO plugin_rollouts (plugin_key, action, from_version, target_version, phase,
			coordinator_node_id, coordinator_boot_id, coordinator_lease_until, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, clock_timestamp() + $8 * interval '1 millisecond', $9)
		RETURNING id`,
		key, action, from, target, phase, c.o.Node.NodeID(), c.o.Node.BootID(), c.o.LeaseTTL.Milliseconds(), actor(actorID)).Scan(&id)
	if store.IsUniqueViolation(err, "") {
		return 0, errOpen
	}
	return id, err
}

// Enable starts a rollout of the plugin's active (or newest approved) version.
func (c *Controller) Enable(ctx context.Context, pluginKey string, actorID int64) (*core.Rollout, error) {
	var id int64
	err := c.o.DB.Tx(ctx, func(tx pgx.Tx) error {
		p, err := lockPlugin(ctx, tx, pluginKey)
		if err != nil {
			return err
		}
		switch p.status {
		case "installed", "disabled":
		case "enabled":
			return core.ErrConflict.WithMessage("plugin is already enabled")
		default:
			return core.ErrConflict.WithMessage("plugin cannot be enabled in status " + p.status)
		}
		var target string
		if p.active != nil {
			if ok, err := approved(ctx, tx, pluginKey, *p.active); err != nil {
				return err
			} else if ok {
				target = *p.active
			}
		}
		if target == "" {
			err := tx.QueryRow(ctx, `SELECT version FROM plugin_versions WHERE plugin_key = $1 AND consent_status = 'approved'
				ORDER BY uploaded_at DESC LIMIT 1`, pluginKey).Scan(&target)
			if store.IsNoRows(err) {
				return core.ErrConflict.WithMessage("plugin has no approved version")
			}
			if err != nil {
				return err
			}
		}
		if id, err = c.insertRollout(ctx, tx, pluginKey, "enable", nil, &target, PhasePreparing, actorID); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `UPDATE plugins SET status = 'enabling', status_reason = '', desired_version = $2,
			updated_at = now(), row_version = row_version + 1 WHERE key = $1`, pluginKey, target)
		return err
	})
	if err != nil {
		return nil, err
	}
	return c.started(ctx, pluginKey, id)
}

// Upgrade starts a rollout from the active version to version.
func (c *Controller) Upgrade(ctx context.Context, pluginKey, version string, actorID int64) (*core.Rollout, error) {
	var id int64
	err := c.o.DB.Tx(ctx, func(tx pgx.Tx) error {
		p, err := lockPlugin(ctx, tx, pluginKey)
		if err != nil {
			return err
		}
		if p.status != "enabled" || p.active == nil {
			return core.ErrConflict.WithMessage("only an enabled plugin can be upgraded; enable it instead")
		}
		if *p.active == version {
			return core.ErrConflict.WithMessage("version is already active")
		}
		ok, err := approved(ctx, tx, pluginKey, version)
		if err != nil {
			return err
		}
		if !ok {
			return core.ErrConflict.WithMessage("version is not installed or not approved")
		}
		if id, err = c.insertRollout(ctx, tx, pluginKey, "upgrade", p.active, &version, PhasePreparing, actorID); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `UPDATE plugins SET status = 'upgrading', desired_version = $2,
			updated_at = now(), row_version = row_version + 1 WHERE key = $1`, pluginKey, version)
		return err
	})
	if err != nil {
		return nil, err
	}
	return c.started(ctx, pluginKey, id)
}

// Disable publishes "no version". Nothing needs preparing, so the rollout is
// committed immediately: when Disable returns, plugins.status is "disabled"
// and every node stops serving within one reconcile; the rollout row
// completes once all nodes report it.
func (c *Controller) Disable(ctx context.Context, pluginKey string, actorID int64, reason string) (*core.Rollout, error) {
	var id int64
	err := c.o.DB.Tx(ctx, func(tx pgx.Tx) error {
		p, err := lockPlugin(ctx, tx, pluginKey)
		if err != nil {
			return err
		}
		if p.status != "enabled" {
			return core.ErrConflict.WithMessage("plugin is not enabled")
		}
		if id, err = c.insertRollout(ctx, tx, pluginKey, "disable", p.active, nil, PhaseActivating, actorID); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE plugins SET status = 'disabled', status_reason = $2, desired_version = NULL,
			updated_at = now(), row_version = row_version + 1 WHERE key = $1`, pluginKey, reason); err != nil {
			return err
		}
		if c.o.Perms != nil {
			if err := c.o.Perms.SetPluginActive(ctx, tx, pluginKey, false); err != nil {
				return err
			}
		}
		if c.o.Events != nil {
			ver := ""
			if p.active != nil {
				ver = *p.active
			}
			return c.o.Events.Emit(ctx, tx, core.Event{Type: core.EventPluginDisabled,
				Payload: map[string]any{"plugin_key": pluginKey, "version": ver}})
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return c.started(ctx, pluginKey, id)
}

func (c *Controller) started(ctx context.Context, key string, id int64) (*core.Rollout, error) {
	c.startCoordinator(id)
	c.publish(ctx, key, id)
	c.kick()
	return c.get(ctx, key, id)
}

// Current returns the open rollout of a plugin with live node states.
func (c *Controller) Current(ctx context.Context, pluginKey string) (*core.Rollout, error) {
	var id int64
	err := c.o.DB.Pool.QueryRow(ctx, `SELECT id FROM plugin_rollouts WHERE plugin_key = $1 AND phase IN ('preparing','activating')`, pluginKey).Scan(&id)
	if store.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return c.get(ctx, pluginKey, id)
}

func (c *Controller) get(ctx context.Context, key string, id int64) (*core.Rollout, error) {
	r, err := c.loadRollout(ctx, id)
	if err != nil {
		return nil, err
	}
	if r == nil || r.key != key {
		return nil, core.ErrNotFound.WithMessage("rollout not found")
	}
	out := &core.Rollout{
		ID: r.id, PluginKey: r.key, Action: r.action, FromVersion: deref(r.from), TargetVersion: deref(r.target),
		Phase: r.phase, Coordinator: r.coordNode, Error: r.err, Nodes: []core.RolloutNodeState{},
	}
	if r.phase == PhasePreparing || r.phase == PhaseActivating {
		states, _, _ := c.nodeStates(ctx, r)
		out.Nodes = states
	} else {
		rows, err := c.o.DB.Pool.Query(ctx, `SELECT node_id, boot_id, state, error FROM plugin_rollout_nodes WHERE rollout_id = $1 ORDER BY node_id, boot_id`, id)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		for rows.Next() {
			var n core.RolloutNodeState
			if err := rows.Scan(&n.NodeID, &n.BootID, &n.State, &n.Error); err != nil {
				return nil, err
			}
			out.Nodes = append(out.Nodes, n)
		}
	}
	return out, nil
}

// Cancel aborts a rollout that has not reached its commit point.
func (c *Controller) Cancel(ctx context.Context, pluginKey string, rolloutID, actorID int64) error {
	r, err := c.loadRollout(ctx, rolloutID)
	if err != nil {
		return err
	}
	if r == nil || r.key != pluginKey {
		return core.ErrNotFound.WithMessage("rollout not found")
	}
	if r.phase != PhasePreparing {
		return core.ErrConflict.WithMessage("only a preparing rollout can be cancelled")
	}
	ok, err := c.finishFailed(ctx, r, PhaseCancelled, fmt.Sprintf("cancelled by user %d", actorID))
	if err != nil {
		return err
	}
	if !ok {
		return core.ErrConflict.WithMessage("only a preparing rollout can be cancelled")
	}
	c.publish(ctx, pluginKey, rolloutID)
	c.kick()
	return nil
}

// ------------------------------------------------------------------ rollout rows

type rolloutRow struct {
	id          int64
	key         string
	action      string
	from        *string
	target      *string
	phase       string
	coordNode   string
	coordBoot   string
	leaseExpire bool
	err         string
	rowVersion  int64
	ageSec      float64 // since created_at (DB clock)
	phaseAgeSec float64 // since updated_at (last phase change)
}

const rolloutCols = `id, plugin_key, action, from_version, target_version, phase,
	COALESCE(coordinator_node_id, ''), COALESCE(coordinator_boot_id, ''),
	(coordinator_lease_until IS NULL OR coordinator_lease_until < clock_timestamp()),
	error, row_version,
	EXTRACT(EPOCH FROM now() - created_at)::float8, EXTRACT(EPOCH FROM now() - updated_at)::float8`

func scanRollout(row pgx.Row) (*rolloutRow, error) {
	var r rolloutRow
	err := row.Scan(&r.id, &r.key, &r.action, &r.from, &r.target, &r.phase, &r.coordNode, &r.coordBoot,
		&r.leaseExpire, &r.err, &r.rowVersion, &r.ageSec, &r.phaseAgeSec)
	if store.IsNoRows(err) {
		return nil, nil
	}
	return &r, err
}

func (c *Controller) loadRollout(ctx context.Context, id int64) (*rolloutRow, error) {
	return scanRollout(c.o.DB.Pool.QueryRow(ctx, `SELECT `+rolloutCols+` FROM plugin_rollouts WHERE id = $1`, id))
}

// finishFailed moves a preparing rollout to failed/cancelled and reverts the
// plugin status. The phase check alone guards against the commit point (the
// commit CAS fails once the phase changed). Returns false when the rollout
// is no longer preparing.
func (c *Controller) finishFailed(ctx context.Context, r *rolloutRow, phase, msg string) (bool, error) {
	ok := false
	err := c.o.DB.Tx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE plugin_rollouts SET phase = $2, error = $3, updated_at = now(), row_version = row_version + 1
			WHERE id = $1 AND phase = 'preparing'`, r.id, phase, msg)
		if err != nil || tag.RowsAffected() == 0 {
			return err
		}
		ok = true
		if r.action == "upgrade" {
			_, err = tx.Exec(ctx, `UPDATE plugins SET status = 'enabled', desired_version = active_version,
				updated_at = now(), row_version = row_version + 1 WHERE key = $1`, r.key)
		} else {
			_, err = tx.Exec(ctx, `UPDATE plugins SET status = CASE WHEN active_version IS NULL THEN 'installed' ELSE 'disabled' END,
				desired_version = NULL, status_reason = $2, updated_at = now(), row_version = row_version + 1 WHERE key = $1`, r.key, msg)
		}
		if err != nil {
			return err
		}
		return c.writeNodes(ctx, tx, r)
	})
	return ok, err
}

// writeNodes records the per-node outcome from the live node reports.
func (c *Controller) writeNodes(ctx context.Context, tx pgx.Tx, r *rolloutRow) error {
	states, _, err := c.nodeStates(ctx, r)
	if err != nil {
		c.log.Warn("read node states failed", "err", err)
		return nil
	}
	for _, n := range states {
		st := n.State
		if st == NodePending {
			st = NodeFailed
			if n.Error == "" {
				n.Error = "not ready"
			}
		}
		if _, err := tx.Exec(ctx, `INSERT INTO plugin_rollout_nodes (rollout_id, node_id, boot_id, state, error)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (rollout_id, boot_id) DO UPDATE SET state = EXCLUDED.state, error = EXCLUDED.error, updated_at = now()`,
			r.id, n.NodeID, n.BootID, st, n.Error); err != nil {
			return err
		}
	}
	return nil
}

// nodeStates reads every live node's report for the rollout. selfSeen
// tells whether this node is among the live nodes (guards against an empty
// node list when Redis is unreachable).
func (c *Controller) nodeStates(ctx context.Context, r *rolloutRow) ([]core.RolloutNodeState, bool, error) {
	nodes, err := c.o.Node.LiveNodes(ctx)
	if err != nil {
		return nil, false, err
	}
	selfSeen := false
	out := make([]core.RolloutNodeState, 0, len(nodes))
	for _, n := range nodes {
		if n.BootID == c.o.Node.BootID() {
			selfSeen = true
		}
		ns := core.RolloutNodeState{NodeID: n.NodeID, BootID: n.BootID, State: NodePending}
		if st, ok := parseState(n.Plugins[r.key]); ok && st.RolloutID == r.id && st.Rollout != "" {
			ns.State = st.Rollout
			ns.Error = st.Error
		}
		out = append(out, ns)
	}
	return out, selfSeen, nil
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
