// Package rollout implements the two-phase (prepare, then activate) plugin
// rollout across all live nodes, and the per-node reconciler that starts,
// switches and drains plugin instances according to the desired state in
// PostgreSQL.
package rollout

import (
	"context"
	"encoding/json"
	"io/fs"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/grpcruntime"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
)

// Instance is one running plugin version as seen by the reconciler.
type Instance interface {
	registry.Extension
	// State returns (state, lastError); see grpcruntime.State* constants.
	State() (string, string)
	Restarts() int
	// Refresh re-reads settings/grants and reconfigures on change.
	Refresh(ctx context.Context) error
	// MigrateData runs the plugin data migration (no-op when unsupported).
	MigrateData(ctx context.Context, from, to string) error
	Drain(timeout time.Duration)
	Stop()
}

// Runtime starts plugin instances (grpcruntime today, a JS runtime later).
type Runtime interface {
	Load(ctx context.Context, pkg *registry.Package) (Instance, error)
}

// Schemas is the subset of dbschema.Manager used by rollouts.
type Schemas interface {
	Migrate(ctx context.Context, pluginKey string, fsys fs.FS) ([]string, error)
	Pending(ctx context.Context, pluginKey string, ids []string) (bool, error)
}

// FromGRPC adapts a grpcruntime.Runtime to Runtime.
func FromGRPC(rt *grpcruntime.Runtime) Runtime { return grpcAdapter{rt} }

type grpcAdapter struct{ rt *grpcruntime.Runtime }

func (a grpcAdapter) Load(ctx context.Context, pkg *registry.Package) (Instance, error) {
	inst, err := a.rt.Load(ctx, pkg)
	if err != nil {
		return nil, err
	}
	return inst, nil
}

// Instance states reported by runtimes (mirrors grpcruntime).
const (
	stateReady    = grpcruntime.StateReady
	stateDraining = grpcruntime.StateDraining
	stateFailed   = grpcruntime.StateFailed
	stateStopped  = grpcruntime.StateStopped
)

// Rollout phases (plugin_rollouts.phase).
const (
	PhasePreparing  = "preparing"
	PhaseActivating = "activating"
	PhaseActive     = "active"
	PhaseFailed     = "failed"
	PhaseCancelled  = "cancelled"
)

// Node rollout states (reported per plugin by every node).
const (
	NodePending = "pending"
	NodeReady   = "ready"
	NodeActive  = "active"
	NodeFailed  = "failed"
)

// NodePluginState is the JSON document each node reports per plugin through
// core.NodeRegistry.ReportPlugin.
type NodePluginState struct {
	// State summarizes this node for the console (CONTRACTS §5.7): the
	// rollout state while a rollout is open, else the serving instance as
	// active | pending | failed, or "stopped" when nothing is served.
	State     string          `json:"state"`
	Serving   string          `json:"serving,omitempty"`
	Standby   string          `json:"standby,omitempty"`
	RolloutID int64           `json:"rollout_id,omitempty"`
	Rollout   string          `json:"rollout,omitempty"` // pending | ready | active | failed
	Error     string          `json:"error,omitempty"`
	Instances []InstanceState `json:"instances,omitempty"`
}

type InstanceState struct {
	Version  string `json:"version"`
	State    string `json:"state"`
	Error    string `json:"error,omitempty"`
	Restarts int    `json:"restarts"`
}

// Message is published on core.ChannelPluginEvents.
type Message struct {
	Type      string `json:"type"` // rollout | config | resources
	PluginKey string `json:"plugin_key"`
	RolloutID int64  `json:"rollout_id,omitempty"`
}

// MessageResources asks every node to restart the plugin's instances with
// the resource limits now stored in plugins.resource_limits.
const MessageResources = "resources"

// limitsAware is implemented by instances that can tell whether their
// process runs with outdated resource limits (grpcruntime.Instance).
type limitsAware interface {
	LimitsStale() bool
}

// broadcastReceiver is implemented by instances that accept cluster
// broadcasts (grpcruntime.Instance).
type broadcastReceiver interface {
	HandlesBroadcast() bool
	OnBroadcast(ctx context.Context, msg grpcruntime.BroadcastMessage) error
}

func parseState(s string) (NodePluginState, bool) {
	var st NodePluginState
	if s == "" || json.Unmarshal([]byte(s), &st) != nil {
		return st, false
	}
	return st, true
}
