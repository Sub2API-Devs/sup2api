package core

import (
	"context"
	"time"
)

// ============================================================ cluster (owner: D sandbox-network)

// Node identifies this process in the cluster.
type Node interface {
	NodeID() string // stable: NODE_ID env or hostname
	BootID() string // random per process start
}

// NodeStatus is one live node as seen in Redis.
type NodeStatus struct {
	NodeID        string            `json:"node_id"`
	BootID        string            `json:"boot_id"`
	Addr          string            `json:"addr"`
	HostVersion   string            `json:"host_version"`
	StartedAt     time.Time         `json:"started_at"`
	LastHeartbeat time.Time         `json:"last_heartbeat"`
	Plugins       map[string]string `json:"plugins"` // plugin key -> JSON PluginNodeState
}

// NodeRegistry manages heartbeats and per-node plugin state.
type NodeRegistry interface {
	Node
	LiveNodes(ctx context.Context) ([]NodeStatus, error)
	IsAlive(ctx context.Context, bootID string) (bool, error)
	// ReportPlugin publishes this node's actual state for one plugin
	// (value is a JSON document owned by the plugin runtime).
	ReportPlugin(ctx context.Context, pluginKey string, stateJSON string) error
	// Healthy reports whether this node talked to Redis and PG within the
	// self-fencing window (15 s).
	Healthy() bool
}

// Locker provides short distributed locks (Redis SET NX PX with owner token,
// falling back to pg_try_advisory_lock when Redis is unavailable).
type Locker interface {
	TryLock(ctx context.Context, key string, ttl time.Duration) (release func(), ok bool, err error)
}

// Bus is Redis pub/sub for cache invalidation and coordination. Messages are
// best-effort: every consumer must also reconcile periodically.
type Bus interface {
	Publish(ctx context.Context, channel string, payload []byte) error
	Subscribe(channel string, handler func(payload []byte)) (cancel func())
}

// Broadcast channels.
const (
	ChannelPluginEvents   = "plugin:events"
	ChannelAuthzChanged   = "authz:changed"
	ChannelAccountChanged = "account:changed"
	ChannelConfigChanged  = "config:changed"
)

// Slots is the distributed concurrency limiter. Members are prefixed with
// the boot id so slots of dead nodes can be reclaimed safely.
type Slots interface {
	// Acquire takes one slot of kind ("account"|"user") for id if fewer than
	// limit are held (limit <= 0 = unlimited). release is idempotent.
	Acquire(ctx context.Context, kind string, id int64, limit int, requestID string) (release func(), ok bool, err error)
	InUse(ctx context.Context, kind string, id int64) (int, error)
}
