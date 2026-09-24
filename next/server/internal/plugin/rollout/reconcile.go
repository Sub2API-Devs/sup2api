package rollout

import (
	"context"
	"encoding/json"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
)

// slot is the local state of one plugin on this node.
type slot struct {
	key     string
	mu      sync.Mutex
	entries map[string]*entry // version -> entry
	serving string            // version that should be in the generation
}

type entry struct {
	version string
	inst    Instance // nil when loading failed
	epoch   int64    // plugins.row_version when (re)created
	loadErr string
	failAt  time.Time
}

type pluginRow struct {
	key        string
	status     string
	active     *string
	rowVersion int64
	ro         *rolloutRow
}

func (c *Controller) slotFor(key string) *slot {
	c.mu.Lock()
	defer c.mu.Unlock()
	s, ok := c.slots[key]
	if !ok {
		s = &slot{key: key, entries: map[string]*entry{}}
		c.slots[key] = s
	}
	return s
}

// localInstance returns the local instance of key@version, if running.
func (c *Controller) localInstance(key, version string) Instance {
	c.mu.Lock()
	s := c.slots[key]
	c.mu.Unlock()
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if e := s.entries[version]; e != nil {
		return e.inst
	}
	return nil
}

func (c *Controller) loadPlugins(ctx context.Context) ([]*pluginRow, error) {
	rows, err := c.o.DB.Pool.Query(ctx, `SELECT key, status, active_version, row_version FROM plugins ORDER BY key`)
	if err != nil {
		return nil, err
	}
	var out []*pluginRow
	byKey := map[string]*pluginRow{}
	for rows.Next() {
		p := &pluginRow{}
		if err := rows.Scan(&p.key, &p.status, &p.active, &p.rowVersion); err != nil {
			rows.Close()
			return nil, err
		}
		out = append(out, p)
		byKey[p.key] = p
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	rrows, err := c.o.DB.Pool.Query(ctx, `SELECT `+rolloutCols+` FROM plugin_rollouts WHERE phase IN ('preparing','activating')`)
	if err != nil {
		return nil, err
	}
	defer rrows.Close()
	for rrows.Next() {
		r, err := scanRollout(rrows)
		if err != nil {
			return nil, err
		}
		if p := byKey[r.key]; p != nil {
			p.ro = r
		}
	}
	return out, rrows.Err()
}

// Reconcile runs one pass: take over orphaned rollouts, bring local
// instances in line with the desired state, publish the generation and
// report per-plugin node state.
func (c *Controller) Reconcile(ctx context.Context) {
	c.recMu.Lock()
	defer c.recMu.Unlock()
	if ctx.Err() != nil {
		return
	}
	rows, err := c.loadPlugins(ctx)
	if err != nil {
		c.log.Warn("reconcile: load plugins failed", "err", err)
		return
	}
	for _, p := range rows {
		if p.ro != nil {
			c.takeOver(ctx, p.ro)
		}
	}
	seen := map[string]bool{}
	var wg sync.WaitGroup
	reports := make([]NodePluginState, len(rows))
	for idx, p := range rows {
		seen[p.key] = true
		s := c.slotFor(p.key)
		wg.Add(1)
		go func(idx int, p *pluginRow) {
			defer wg.Done()
			reports[idx] = c.reconcileKey(ctx, s, p)
		}(idx, p)
	}
	wg.Wait()

	// Plugins removed from the database (uninstalled).
	c.mu.Lock()
	var gone []*slot
	for key, s := range c.slots {
		if !seen[key] {
			gone = append(gone, s)
			delete(c.slots, key)
		}
	}
	c.mu.Unlock()
	for _, s := range gone {
		s.mu.Lock()
		for _, e := range s.entries {
			if e.inst != nil {
				go e.inst.Drain(c.o.DrainTimeout)
			}
		}
		s.entries = map[string]*entry{}
		s.mu.Unlock()
		_ = c.o.Node.ReportPlugin(ctx, s.key, "{}")
	}

	c.republish()

	for idx, p := range rows {
		b, _ := json.Marshal(reports[idx])
		if err := c.o.Node.ReportPlugin(ctx, p.key, string(b)); err != nil {
			c.log.Warn("report plugin state failed", "plugin", p.key, "err", err)
		}
	}
}

func (c *Controller) reconcileKey(ctx context.Context, s *slot, p *pluginRow) NodePluginState {
	var serving, standby, keep string
	ro := p.ro
	switch {
	case ro != nil && ro.phase == PhasePreparing:
		serving = deref(ro.from)
		if t := deref(ro.target); t != "" && t != serving {
			standby = t
		}
	case ro != nil && ro.phase == PhaseActivating:
		serving = deref(ro.target)
		keep = deref(ro.from) // old process stays until the rollout is active
	default:
		if (p.status == "enabled" || p.status == "upgrading") && p.active != nil {
			serving = *p.active
		}
	}

	// A standby only starts once the target's SQL migrations are applied.
	standbyBlocked := ""
	if standby != "" {
		if pending, err := c.migrationsPending(ctx, p.key, standby); err != nil {
			standbyBlocked = err.Error()
		} else if pending {
			standbyBlocked = "waiting for migrations"
		}
	}

	needed := map[string]bool{}
	for _, v := range []string{serving, keep} {
		if v != "" {
			needed[v] = true
		}
	}
	if standby != "" && standbyBlocked == "" {
		needed[standby] = true
	}
	var wg sync.WaitGroup
	for v := range needed {
		wg.Add(1)
		go func(v string) {
			defer wg.Done()
			c.ensure(ctx, s, v, p.rowVersion)
		}(v)
	}
	wg.Wait()

	s.mu.Lock()
	for v, e := range s.entries {
		if !needed[v] {
			delete(s.entries, v)
			if e.inst != nil {
				go e.inst.Drain(c.o.DrainTimeout)
			}
		}
	}
	s.serving = serving
	var running []Instance
	st := NodePluginState{Serving: serving, Standby: standby}
	versions := make([]string, 0, len(s.entries))
	for v := range s.entries {
		versions = append(versions, v)
	}
	sort.Strings(versions)
	for _, v := range versions {
		e := s.entries[v]
		is := InstanceState{Version: v}
		if e.inst != nil {
			is.State, is.Error = e.inst.State()
			is.Restarts = e.inst.Restarts()
			running = append(running, e.inst)
		} else {
			is.State, is.Error = stateFailed, e.loadErr
		}
		st.Instances = append(st.Instances, is)
	}
	entryState := func(v string) (string, string) {
		e := s.entries[v]
		if e == nil {
			return NodePending, ""
		}
		if e.inst == nil {
			return NodeFailed, e.loadErr
		}
		switch state, msg := e.inst.State(); state {
		case stateReady, stateDraining:
			return NodeReady, ""
		case stateFailed, stateStopped:
			return NodeFailed, msg
		default:
			return NodePending, msg
		}
	}
	if ro != nil {
		st.RolloutID = ro.id
		switch ro.phase {
		case PhasePreparing:
			switch {
			case standby == "":
				st.Rollout = NodeReady
			case standbyBlocked != "":
				st.Rollout, st.Error = NodePending, standbyBlocked
			default:
				st.Rollout, st.Error = entryState(standby)
			}
		case PhaseActivating:
			if serving == "" {
				st.Rollout = NodeActive
			} else {
				state, msg := entryState(serving)
				if state == NodeReady {
					state = NodeActive
				}
				st.Rollout, st.Error = state, msg
			}
		}
	}
	switch {
	case st.Rollout != "":
		st.State = st.Rollout
	case serving == "":
		st.State = "stopped"
	default:
		state, msg := entryState(serving)
		if state == NodeReady {
			state = NodeActive
		}
		st.State = state
		if st.Error == "" {
			st.Error = msg
		}
	}
	s.mu.Unlock()

	for _, inst := range running {
		if err := inst.Refresh(ctx); err != nil {
			c.log.Debug("plugin refresh failed", "plugin", p.key, "err", err)
		}
	}
	return st
}

func (c *Controller) migrationsPending(ctx context.Context, key, version string) (bool, error) {
	pkg, err := c.o.Packages.Open(ctx, key, version)
	if err != nil {
		return false, err
	}
	if pkg.Manifest.Database == nil || c.o.Schemas == nil {
		return false, nil
	}
	ids, err := pkg.MigrationIDs()
	if err != nil {
		return false, err
	}
	return c.o.Schemas.Pending(ctx, key, ids)
}

// ensure starts key@version unless it is running (or failed recently in the
// same desired-state epoch).
func (c *Controller) ensure(ctx context.Context, s *slot, version string, epoch int64) {
	s.mu.Lock()
	e := s.entries[version]
	if e != nil {
		if e.inst != nil {
			state, _ := e.inst.State()
			if (state != stateFailed && state != stateStopped) || e.epoch == epoch {
				s.mu.Unlock()
				return
			}
			// Failed instance and the desired state changed: replace it.
			old := e.inst
			delete(s.entries, version)
			go old.Stop()
		} else if e.epoch == epoch && time.Since(e.failAt) < c.o.LoadRetry {
			s.mu.Unlock()
			return
		}
	}
	s.mu.Unlock()

	pkg, err := c.o.Packages.Open(ctx, s.key, version)
	var inst Instance
	if err == nil {
		inst, err = c.o.Runtime.Load(ctx, pkg)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if err != nil {
		c.log.Error("plugin instance failed to start", "plugin", s.key, "version", version, "err", err)
		s.entries[version] = &entry{version: version, epoch: epoch, loadErr: truncate(err.Error(), 500), failAt: time.Now()}
		return
	}
	c.log.Info("plugin instance started", "plugin", s.key, "version", version)
	s.entries[version] = &entry{version: version, inst: inst, epoch: epoch}
}

// republish switches the registry when the serving set or grants changed.
func (c *Controller) republish() {
	c.mu.Lock()
	keys := make([]string, 0, len(c.slots))
	for k := range c.slots {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var exts []Instance
	var sig strings.Builder
	for _, k := range keys {
		s := c.slots[k]
		s.mu.Lock()
		if e := s.entries[s.serving]; s.serving != "" && e != nil && e.inst != nil {
			exts = append(exts, e.inst)
			g, _ := json.Marshal(e.inst.Grants())
			sig.WriteString(k + "@" + s.serving + "#" + e.inst.Package().SHA256 + "#" + string(g) + "\n")
		}
		s.mu.Unlock()
	}
	changed := sig.String() != c.sig
	if changed {
		c.sig = sig.String()
	}
	c.mu.Unlock()
	if !changed {
		return
	}
	list := make([]registry.Extension, 0, len(exts))
	for _, e := range exts {
		list = append(list, e)
	}
	g := c.o.Registry.Publish(list)
	c.log.Info("plugin generation published", "generation", g.Number(), "plugins", len(list))
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
