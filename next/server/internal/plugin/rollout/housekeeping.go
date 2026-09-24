package rollout

import (
	"context"
	"sort"
)

// drainAsync drains (or stops) an instance that left the slot. While it
// drains, its package stays cached; afterwards unused packages are swept.
// It only takes drainMu (a leaf lock), so callers may hold c.mu or slot.mu.
func (c *Controller) drainAsync(key, version string, inst Instance, stop bool) {
	id := key + "@" + version
	c.drainMu.Lock()
	c.draining[id]++
	c.drainMu.Unlock()
	go func() {
		if stop {
			inst.Stop()
		} else {
			inst.Drain(c.o.DrainTimeout)
		}
		c.drainMu.Lock()
		c.draining[id]--
		if c.draining[id] <= 0 {
			delete(c.draining, id)
		}
		c.drainMu.Unlock()
		c.sweepPackages()
	}()
}

// setReferenced records the versions the database still refers to:
// active, desired and both sides of an open rollout (the standby).
func (c *Controller) setReferenced(rows []*pluginRow) {
	ref := map[string]map[string]bool{}
	add := func(key string, v *string) {
		if v == nil || *v == "" {
			return
		}
		if ref[key] == nil {
			ref[key] = map[string]bool{}
		}
		ref[key][*v] = true
	}
	for _, p := range rows {
		add(p.key, p.active)
		add(p.key, p.desired)
		if p.ro != nil {
			add(p.key, p.ro.from)
			add(p.key, p.ro.target)
		}
	}
	c.mu.Lock()
	c.referenced = ref
	c.mu.Unlock()
}

// sweepPackages releases cached packages (file handle and unpacked
// directory) of versions that are not referenced, have no local instance
// and no instance still draining.
func (c *Controller) sweepPackages() {
	for _, ref := range c.o.Packages.Cached() {
		if c.packageInUse(ref.Key, ref.Version) {
			continue
		}
		if err := c.o.Packages.Release(ref.Key, ref.Version); err != nil {
			c.log.Warn("remove unused plugin package failed", "plugin", ref.Key, "version", ref.Version, "err", err)
			continue
		}
		c.log.Info("removed unused plugin package", "plugin", ref.Key, "version", ref.Version)
	}
}

func (c *Controller) packageInUse(key, version string) bool {
	c.mu.Lock()
	if c.stopped || c.referenced[key][version] {
		c.mu.Unlock()
		return true
	}
	s := c.slots[key]
	c.mu.Unlock()
	if s != nil {
		s.mu.Lock()
		_, local := s.entries[version]
		s.mu.Unlock()
		if local {
			return true
		}
	}
	// Checked after the slot: an entry leaves the slot only after its
	// drain was counted.
	c.drainMu.Lock()
	defer c.drainMu.Unlock()
	return c.draining[key+"@"+version] > 0
}

// pruneOrphans removes package directories of versions the database no
// longer refers to (left over from earlier runs). Runs once at Start.
func (c *Controller) pruneOrphans(ctx context.Context) {
	keep, err := c.referencedPackages(ctx)
	if err != nil {
		c.log.Warn("plugin package cleanup skipped", "err", err)
		return
	}
	removed, err := c.o.Packages.PruneOrphans(func(key, version, hash8 string) bool {
		return keep[key+"@"+version+"-"+hash8]
	})
	for _, d := range removed {
		c.log.Info("removed orphaned plugin package directory", "dir", d)
	}
	if err != nil {
		c.log.Warn("plugin package cleanup incomplete", "err", err)
	}
}

// referencedPackages returns "key@version-hash8" of every package version
// named by plugins.active_version/desired_version or an open rollout.
func (c *Controller) referencedPackages(ctx context.Context) (map[string]bool, error) {
	rows, err := c.o.DB.Pool.Query(ctx, `
		SELECT v.plugin_key, v.version, v.package_sha256 FROM plugin_versions v
		WHERE EXISTS (SELECT 1 FROM plugins p WHERE p.key = v.plugin_key
				AND (v.version = p.active_version OR v.version = p.desired_version))
			OR EXISTS (SELECT 1 FROM plugin_rollouts r WHERE r.plugin_key = v.plugin_key
				AND r.phase IN ('preparing','activating')
				AND (v.version = r.from_version OR v.version = r.target_version))`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]bool{}
	for rows.Next() {
		var key, version, sum string
		if err := rows.Scan(&key, &version, &sum); err != nil {
			return nil, err
		}
		if len(sum) >= 8 {
			out[key+"@"+version+"-"+lower(sum[:8])] = true
		}
	}
	return out, rows.Err()
}

func lower(s string) string {
	b := []byte(s)
	for i, ch := range b {
		if ch >= 'A' && ch <= 'Z' {
			b[i] = ch + 'a' - 'A'
		}
	}
	return string(b)
}

// servingInstance returns the instance of key currently in the generation.
func (c *Controller) servingInstance(key string) Instance {
	c.mu.Lock()
	s := c.slots[key]
	c.mu.Unlock()
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if e := s.entries[s.serving]; s.serving != "" && e != nil {
		return e.inst
	}
	return nil
}

// syncBroadcast subscribes to the broadcast channels of the plugins served
// here that declare app.broadcast.v1.
func (c *Controller) syncBroadcast() {
	c.mu.Lock()
	slots := make([]*slot, 0, len(c.slots))
	for _, s := range c.slots {
		slots = append(slots, s)
	}
	c.mu.Unlock()
	var keys []string
	for _, s := range slots {
		s.mu.Lock()
		if e := s.entries[s.serving]; s.serving != "" && e != nil && e.inst != nil {
			if r, ok := e.inst.(broadcastReceiver); ok && r.HandlesBroadcast() {
				keys = append(keys, s.key)
			}
		}
		s.mu.Unlock()
	}
	sort.Strings(keys)
	c.hub.sync(keys)
}
