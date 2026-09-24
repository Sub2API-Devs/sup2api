package rollout

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// startCoordinator runs the coordinator loop for a rollout this node leads
// (it created it or took it over), unless one is already running.
func (c *Controller) startCoordinator(id int64) {
	c.coordMu.Lock()
	if c.coordinating[id] {
		c.coordMu.Unlock()
		return
	}
	c.coordinating[id] = true
	c.coordMu.Unlock()

	wake := make(chan struct{}, 1)
	c.wakeMu.Lock()
	c.wakers[id] = wake
	c.wakeMu.Unlock()

	c.wg.Add(1)
	go func() {
		defer c.wg.Done()
		defer func() {
			c.wakeMu.Lock()
			delete(c.wakers, id)
			c.wakeMu.Unlock()
			c.coordMu.Lock()
			delete(c.coordinating, id)
			c.coordMu.Unlock()
		}()
		c.coordinate(id, wake)
	}()
}

// takeOver claims rollouts whose coordinator lease expired.
func (c *Controller) takeOver(ctx context.Context, r *rolloutRow) {
	if r.coordBoot == c.o.Node.BootID() {
		c.startCoordinator(r.id)
		return
	}
	if !r.leaseExpire {
		return
	}
	var id int64
	err := c.o.DB.Pool.QueryRow(ctx, `UPDATE plugin_rollouts SET coordinator_node_id = $2, coordinator_boot_id = $3,
			coordinator_lease_until = clock_timestamp() + $4 * interval '1 millisecond', row_version = row_version + 1
		WHERE id = $1 AND phase IN ('preparing','activating')
			AND (coordinator_lease_until IS NULL OR coordinator_lease_until < clock_timestamp())
		RETURNING id`, r.id, c.o.Node.NodeID(), c.o.Node.BootID(), c.o.LeaseTTL.Milliseconds()).Scan(&id)
	if err != nil {
		return // lost the race or DB error; the next reconcile retries
	}
	c.log.Info("took over plugin rollout", "rollout_id", r.id, "plugin", r.key, "previous", r.coordBoot)
	c.startCoordinator(r.id)
}

type coordState struct {
	migrated     bool
	dataMigrated bool
	dataFrom     string
}

func (c *Controller) coordinate(id int64, wake <-chan struct{}) {
	// c.ctx is cancelled by Stop; another node then takes the lease over.
	ctx, cancel := context.WithCancel(c.ctx)
	defer cancel()
	go c.keepLease(ctx, cancel, id)
	st := &coordState{}
	tick := time.NewTicker(c.o.CoordinatorTick)
	defer tick.Stop()
	for {
		done, err := c.coordinateStep(ctx, id, st)
		if err != nil {
			c.log.Warn("rollout coordinator step failed", "rollout_id", id, "err", err)
		}
		if done {
			return
		}
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		case <-wake:
		}
	}
}

// keepLease renews the coordinator lease every LeaseRenew, independently of
// slow coordinator steps (migrations). Losing the lease, or failing to renew
// it for a whole LeaseTTL, cancels the coordinator.
func (c *Controller) keepLease(ctx context.Context, cancel context.CancelFunc, id int64) {
	t := time.NewTicker(c.o.LeaseRenew)
	defer t.Stop()
	lastOK := time.Now()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
		tag, err := c.o.DB.Pool.Exec(ctx, `UPDATE plugin_rollouts SET coordinator_lease_until = clock_timestamp() + $3 * interval '1 millisecond'
			WHERE id = $1 AND coordinator_boot_id = $2 AND phase IN ('preparing','activating')`,
			id, c.o.Node.BootID(), c.o.LeaseTTL.Milliseconds())
		switch {
		case err == nil && tag.RowsAffected() == 0:
			cancel() // lost the lease or the rollout finished
			return
		case err == nil:
			lastOK = time.Now()
		case ctx.Err() != nil:
			return
		default:
			c.log.Warn("renew rollout lease failed", "rollout_id", id, "err", err)
			if time.Since(lastOK) > c.o.LeaseTTL {
				cancel()
				return
			}
		}
	}
}

// coordinateStep advances one rollout; done=true ends the loop.
func (c *Controller) coordinateStep(ctx context.Context, id int64, st *coordState) (bool, error) {
	r, err := c.loadRollout(ctx, id)
	if err != nil {
		return false, err
	}
	if r == nil || (r.phase != PhasePreparing && r.phase != PhaseActivating) {
		return true, nil
	}
	if r.coordBoot != c.o.Node.BootID() {
		return true, nil // lease lost
	}

	switch r.phase {
	case PhasePreparing:
		if r.ageSec > c.o.PrepareTimeout.Seconds() {
			return c.fail(ctx, r, "prepare timed out")
		}
		if !st.migrated {
			if err := c.migrate(ctx, r); err != nil {
				return c.fail(ctx, r, "migration failed: "+err.Error())
			}
			st.migrated = true
			var from *string
			_ = c.o.DB.Pool.QueryRow(ctx, `SELECT active_version FROM plugins WHERE key = $1`, r.key).Scan(&from)
			st.dataFrom = deref(from)
			c.publish(ctx, r.key, r.id)
			c.kick()
		}
		states, selfSeen, err := c.nodeStates(ctx, r)
		if err != nil {
			return false, err
		}
		for _, n := range states {
			if n.State == NodeFailed {
				return c.fail(ctx, r, fmt.Sprintf("node %s (%s) failed to prepare: %s", n.NodeID, n.BootID, n.Error))
			}
		}
		if !st.dataMigrated {
			ok, err := c.migrateData(ctx, r, st.dataFrom)
			if err != nil {
				return c.fail(ctx, r, "data migration failed: "+err.Error())
			}
			if !ok {
				return false, nil // local standby not ready yet
			}
			st.dataMigrated = true
		}
		if !selfSeen {
			return false, nil
		}
		for _, n := range states {
			if n.State != NodeReady {
				return false, nil
			}
		}
		if err := c.commit(ctx, r); err != nil {
			return false, err
		}
		c.publish(ctx, r.key, r.id)
		c.kick()
		return false, nil

	case PhaseActivating:
		states, selfSeen, err := c.nodeStates(ctx, r)
		if err != nil {
			return false, err
		}
		all := selfSeen
		for _, n := range states {
			if n.State != NodeActive && n.State != NodeFailed {
				all = false
			}
		}
		if !all && r.phaseAgeSec < c.o.ActivateTimeout.Seconds() {
			return false, nil
		}
		if err := c.complete(ctx, r); err != nil {
			return false, err
		}
		c.publish(ctx, r.key, r.id)
		c.kick()
		return true, nil
	}
	return true, nil
}

func (c *Controller) fail(ctx context.Context, r *rolloutRow, msg string) (bool, error) {
	if ctx.Err() != nil {
		return true, ctx.Err() // stopping or lease lost: not a rollout failure
	}
	c.log.Warn("plugin rollout failed", "rollout_id", r.id, "plugin", r.key, "reason", msg)
	ok, err := c.finishFailed(ctx, r, PhaseFailed, msg)
	if err != nil {
		return false, err
	}
	if ok {
		c.publish(ctx, r.key, r.id)
		c.kick()
	}
	return ok, nil
}

// migrate applies the target version's SQL migrations (advisory lock inside).
func (c *Controller) migrate(ctx context.Context, r *rolloutRow) error {
	if r.target == nil {
		return nil
	}
	pkg, err := c.o.Packages.Open(ctx, r.key, *r.target)
	if err != nil {
		return err
	}
	if pkg.Manifest.Database == nil {
		return nil
	}
	var granted bool
	if err := c.o.DB.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM plugin_permission_grants
		WHERE plugin_key = $1 AND permission = 'db.schema' AND status = 'granted')`, r.key).Scan(&granted); err != nil {
		return err
	}
	if !granted {
		return fmt.Errorf("permission db.schema is not granted")
	}
	if c.o.Schemas == nil {
		return fmt.Errorf("no schema manager configured")
	}
	fsys, err := pkg.MigrationsFS()
	if err != nil {
		return err
	}
	applied, err := c.o.Schemas.Migrate(ctx, r.key, fsys)
	if err != nil {
		return err
	}
	if len(applied) > 0 {
		c.log.Info("plugin migrations applied", "plugin", r.key, "version", *r.target, "files", applied)
	}
	return nil
}

// migrateData calls MigrateData on the local standby of the target version.
// ok=false means the standby is not ready yet.
func (c *Controller) migrateData(ctx context.Context, r *rolloutRow, from string) (bool, error) {
	if r.target == nil || from == *r.target {
		return true, nil
	}
	pkg, err := c.o.Packages.Open(ctx, r.key, *r.target)
	if err != nil {
		return false, err
	}
	declared := false
	for _, cp := range pkg.Manifest.Capabilities {
		if cp.ID == manifest.CapMigrationData {
			declared = true
		}
	}
	if !declared {
		return true, nil
	}
	inst := c.localInstance(r.key, *r.target)
	if inst == nil {
		return false, nil
	}
	if s, msg := inst.State(); s != stateReady {
		if s == stateFailed {
			return false, fmt.Errorf("standby failed: %s", msg)
		}
		return false, nil
	}
	return true, inst.MigrateData(ctx, from, *r.target)
}

// commit is the commit point: preparing -> activating.
func (c *Controller) commit(ctx context.Context, r *rolloutRow) error {
	return c.o.DB.Tx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE plugin_rollouts SET phase = 'activating', updated_at = now(), row_version = row_version + 1
			WHERE id = $1 AND row_version = $2 AND phase = 'preparing' AND coordinator_boot_id = $3`, r.id, r.rowVersion, c.o.Node.BootID())
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return fmt.Errorf("rollout %d changed concurrently", r.id)
		}
		var prevActive *string
		if err := tx.QueryRow(ctx, `SELECT active_version FROM plugins WHERE key = $1 FOR UPDATE`, r.key).Scan(&prevActive); err != nil {
			return err
		}
		target := deref(r.target)
		if _, err := tx.Exec(ctx, `UPDATE plugins SET active_version = $2, desired_version = $2,
			updated_at = now(), row_version = row_version + 1 WHERE key = $1`, r.key, target); err != nil {
			return err
		}
		upgraded := r.action == "upgrade" || (prevActive != nil && *prevActive != target)
		if upgraded && c.o.Defaults != nil {
			pkg, err := c.o.Packages.Open(ctx, r.key, target)
			if err != nil {
				return err
			}
			if err := c.o.Defaults.ApplyDefaults(ctx, tx, pkg.Manifest, nil); err != nil {
				return fmt.Errorf("apply defaults: %w", err)
			}
		}
		if r.action == "enable" {
			if c.o.Perms != nil {
				if err := c.o.Perms.SetPluginActive(ctx, tx, r.key, true); err != nil {
					return err
				}
			}
			if c.o.Events != nil {
				if err := c.o.Events.Emit(ctx, tx, core.Event{Type: core.EventPluginEnabled,
					Payload: map[string]any{"plugin_key": r.key, "version": target}}); err != nil {
					return err
				}
			}
		}
		c.log.Info("plugin rollout committed", "rollout_id", r.id, "plugin", r.key, "version", target)
		return nil
	})
}

// complete ends an activating rollout: activating -> active.
func (c *Controller) complete(ctx context.Context, r *rolloutRow) error {
	return c.o.DB.Tx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE plugin_rollouts SET phase = 'active', updated_at = now(), row_version = row_version + 1
			WHERE id = $1 AND row_version = $2 AND phase = 'activating' AND coordinator_boot_id = $3`, r.id, r.rowVersion, c.o.Node.BootID())
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return fmt.Errorf("rollout %d changed concurrently", r.id)
		}
		status := "enabled"
		if r.action == "disable" {
			status = "disabled"
		}
		if _, err := tx.Exec(ctx, `UPDATE plugins SET status = $2, updated_at = now(), row_version = row_version + 1
			WHERE key = $1`, r.key, status); err != nil {
			return err
		}
		c.log.Info("plugin rollout completed", "rollout_id", r.id, "plugin", r.key, "action", r.action)
		return c.writeNodes(ctx, tx, r)
	})
}
