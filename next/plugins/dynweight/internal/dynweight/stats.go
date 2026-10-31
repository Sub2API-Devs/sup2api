package dynweight

import (
	"context"
	"fmt"
	"os"
	"sync"
	"sync/atomic"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// counter is a runtime counter of this node (GET /stats), as new-api's
// GET /dynamic_weight/stats reports its instance's. All but the gauges only
// grow from the plugin's start.
type counter int

const (
	cObserved            counter = iota // samples counted
	cFlushes                            // flushes that wrote counters
	cFlushFailures                      // flushes whose counters were kept for the next one
	cFlushedKeys                        // (key, window) counters written
	cFlushedSamples                     // samples in them
	cRuns                               // evaluate runs on this node
	cRunFailures                        // runs that could not load or had failed keys
	cRunBusyUs                          // their wall time, microseconds
	cLastRunMs                          // gauge: the last run's wall time
	cLastRunAt                          // gauge: when it ended, unix seconds
	cEvaluations                        // keys handed to the kernel
	cApplied                            // evaluations written back
	cSkipped                            // keys whose newest closed window was evaluated already
	cLost                               // write-backs lost to an overlapping run or a reset
	cBaseResets                         // keys reset for a changed account weight
	cKeyFailures                        // keys whose evaluation failed
	cChanged                            // keys whose effective weight changed
	cResets                             // keys reset by hand or by a status change
	cEventsLogged                       // events written to the plugin log
	cEventsLogDropped                   // events over the log cap (the events table has them)
	cStickyClears                       // sticky clears the core did
	cStickyClearFailures                // sticky clear calls that failed (retried or given up)
	nCounters
)

var counterNames = [nCounters]string{
	"observed_total", "flushes_total", "flush_failures_total", "flushed_keys_total", "flushed_samples_total",
	"runs_total", "run_failures_total", "run_busy_us_total", "last_run_ms", "last_run_at",
	"evaluations_total", "applied_total", "skipped_total", "lost_total", "base_resets_total", "key_failures_total",
	"changed_total", "resets_total", "events_logged_total", "events_log_dropped_total",
	"sticky_clears_total", "sticky_clear_failures_total",
}

type counters [nCounters]atomic.Int64

func (c *counters) add(k counter, n int64) { c[k].Add(n) }

// getStats is GET /stats: this node's counters, the samples dropped over
// the pending cap, and the keys pending and degraded, with the node they
// are from and since when.
func (p *Plugin) getStats(context.Context, *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	cfg := p.cfg.Load()
	out := map[string]any{
		"node_id":               p.nodeID(),
		"started_at":            p.started.Unix(),
		"enabled":               cfg.Enabled,
		"config_version":        cfg.version,
		"degraded_keys":         len(*p.weights.Load()),
		"pending_keys":          p.obs.pending(),
		"dropped_samples_total": p.obs.dropped.Load(),
	}
	for i, name := range counterNames {
		out[name] = p.stats[i].Load()
	}
	return pluginsdk.DataResponse(out), nil
}

// nodeID names this node: the host's node id, else hostname:pid.
func (p *Plugin) nodeID() string {
	if p.host != nil && p.host.Info().NodeID != "" {
		return p.host.Info().NodeID
	}
	name, _ := os.Hostname()
	return fmt.Sprintf("%s:%d", name, os.Getpid())
}

const (
	// eventLogLimit lines per eventLogSeconds at most go to the plugin log
	// (new-api caps its system log rows alike); the events table stays
	// complete.
	eventLogLimit   = 5000
	eventLogSeconds = 60
)

// eventLog is the budget of the event lines in the plugin log.
type eventLog struct {
	mu      sync.Mutex
	start   int64
	used    int
	dropped int
}

// take grants up to n lines at now; dropped is what the window that just
// ended refused, to report once.
func (l *eventLog) take(n int, now int64) (granted, dropped int) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if now-l.start >= eventLogSeconds {
		l.start, l.used = now, 0
		dropped, l.dropped = l.dropped, 0
	}
	granted = min(n, eventLogLimit-l.used)
	l.used += granted
	l.dropped += n - granted
	return granted, dropped
}
