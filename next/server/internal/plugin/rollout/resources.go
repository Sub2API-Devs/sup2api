package rollout

import (
	"time"
)

// requestRestart replaces the local instances of key with instances started
// under the current resource limits (CONTRACTS §14.3, "resources" message).
// Restarts of one plugin run one at a time; a request arriving meanwhile
// triggers one more pass afterwards.
func (c *Controller) requestRestart(key string) {
	c.mu.Lock()
	if c.stopped {
		c.mu.Unlock()
		return
	}
	if c.restarting[key] {
		c.again[key] = true
		c.mu.Unlock()
		return
	}
	c.restarting[key] = true
	c.mu.Unlock()
	go func() {
		for {
			c.restartKey(key)
			c.mu.Lock()
			if !c.again[key] || c.stopped {
				delete(c.restarting, key)
				delete(c.again, key)
				c.mu.Unlock()
				return
			}
			delete(c.again, key)
			c.mu.Unlock()
		}
	}()
}

// restartKey replaces every ready instance of key, one after the other:
// the new instance is started (handshake and Health included) before the
// generation switches to it and the old one drains. When the new instance
// fails to start, the old one keeps serving and the error is reported in
// the node plugin state.
func (c *Controller) restartKey(key string) {
	c.mu.Lock()
	s := c.slots[key]
	c.mu.Unlock()
	if s == nil {
		return
	}
	type target struct {
		version string
		inst    Instance
	}
	var targets []target
	s.mu.Lock()
	for v, e := range s.entries {
		if e.inst == nil {
			continue
		}
		if state, _ := e.inst.State(); state != stateReady {
			continue // failed/stopped instances are replaced by the reconciler
		}
		targets = append(targets, target{v, e.inst})
	}
	s.mu.Unlock()

	for _, t := range targets {
		if c.ctx.Err() != nil {
			return
		}
		// grpcruntime instances know whether their limits really changed;
		// skip the restart when they did not.
		if la, ok := t.inst.(limitsAware); ok {
			if err := t.inst.Refresh(c.ctx); err == nil && !la.LimitsStale() {
				s.mu.Lock()
				if e := s.entries[t.version]; e != nil && e.inst == t.inst {
					e.restartErr = ""
				}
				s.mu.Unlock()
				continue
			}
		}
		c.log.Info("restarting plugin instance with new resource limits", "plugin", key, "version", t.version)
		fresh, err := c.o.Runtime.Load(c.ctx, t.inst.Package())
		if err != nil {
			c.log.Error("plugin restart with new resource limits failed; keeping the running instance",
				"plugin", key, "version", t.version, "err", err)
			s.mu.Lock()
			if e := s.entries[t.version]; e != nil && e.inst == t.inst {
				e.restartErr = truncate("restart with new resource limits failed: "+err.Error(), 500)
				e.restartFailAt = time.Now()
			}
			s.mu.Unlock()
			continue
		}
		c.recMu.Lock()
		swapped := false
		if c.ctx.Err() == nil {
			s.mu.Lock()
			if e := s.entries[t.version]; e != nil && e.inst == t.inst {
				e.inst = fresh
				e.restartErr = ""
				swapped = true
			}
			s.mu.Unlock()
		}
		if swapped {
			c.republish()
			c.syncBroadcast()
		}
		c.recMu.Unlock()
		if !swapped {
			// The version was dropped (or the controller stopped) meanwhile.
			fresh.Stop()
			continue
		}
		c.log.Info("plugin instance replaced", "plugin", key, "version", t.version)
		c.drainAsync(key, t.version, t.inst, false)
	}
}
