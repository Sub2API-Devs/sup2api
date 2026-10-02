package rollout

import (
	"context"
	"encoding/json"
	"time"
)

type historyState struct {
	State, Serving, Standby, Fallback, Rollout string
	RolloutID                                  int64
}

func historySignature(s NodePluginState) historyState {
	return historyState{s.State, s.Serving, s.Standby, s.Fallback, s.Rollout, s.RolloutID}
}

// Called under recMu, after each completed reconcile. Error text alone does
// not trigger a new row, avoiding an unbounded stream on repeated retries.
func (c *Controller) recordNodeHistory(ctx context.Context, key string, s NodePluginState) {
	signature := historySignature(s)
	if previous, ok := c.history[key]; ok && previous == signature {
		return
	}
	message, _ := json.Marshal(map[string]string{"standby": s.Standby, "fallback": s.Fallback, "error": s.Error, "rollout": s.Rollout})
	_, err := c.o.DB.Pool.Exec(ctx, `INSERT INTO plugin_history(plugin_key,rollout_id,node_id,boot_id,state,version,message)
        VALUES($1,NULLIF($2,0),$3,$4,$5,$6,$7)`, key, s.RolloutID, c.o.Node.NodeID(), c.o.Node.BootID(), s.State, s.Serving, string(message))
	if err != nil {
		c.log.Warn("persist plugin node history failed", "plugin", key, "err", err)
		return
	}
	if c.history == nil {
		c.history = map[string]historyState{}
	}
	c.history[key] = signature
}

func (c *Controller) cleanHistory(ctx context.Context) {
	if time.Since(c.historyCleaned) < time.Hour {
		return
	}
	// Bounded deletion avoids long transactions on busy clusters.
	_, err := c.o.DB.Pool.Exec(ctx, `DELETE FROM plugin_history WHERE id IN
        (SELECT id FROM plugin_history WHERE created_at < now() - interval '30 days' ORDER BY created_at LIMIT 10000)`)
	if err != nil {
		c.log.Warn("clean plugin history failed", "err", err)
		return
	}
	c.historyCleaned = time.Now()
}
