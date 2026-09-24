// Package cluster implements the multi-node primitives of the core: node
// registry and heartbeats, distributed locks, pub/sub bus and concurrency
// slots. Everything is backed by a single Redis instance (multi-key Lua
// scripts assume non-cluster Redis) with PostgreSQL as lock fallback.
package cluster

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Redis keys (docs/CONTRACTS.md §7).
const (
	keyNodeLive       = "node:live"
	keyNodeInfoPrefix = "node:info:"
	keyNodePlugins    = "node:plugins:"
	keySlotPrefix     = "slot:"
	keyLockPrefix     = "lock:"
)

// Default timings (docs/ARCHITECTURE.md §2.3).
const (
	DefaultHeartbeatInterval = 5 * time.Second
	DefaultNodeTTL           = 15 * time.Second
	DefaultReclaimInterval   = 30 * time.Second
	DefaultSlotTTL           = 5 * time.Minute
)

// OpenRedis parses a redis:// URL and pings the server.
func OpenRedis(ctx context.Context, url string) (*redis.Client, error) {
	opt, err := redis.ParseURL(url)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}
	c := redis.NewClient(opt)
	if err := c.Ping(ctx).Err(); err != nil {
		_ = c.Close()
		return nil, fmt.Errorf("ping redis: %w", err)
	}
	return c, nil
}

// Options configures a Cluster.
type Options struct {
	NodeID      string // config.NodeID
	Addr        string // advertised address, informational (e.g. public URL)
	HostVersion string
	Logger      *slog.Logger
}

// Cluster bundles the four cluster services that share one Redis client.
type Cluster struct {
	Registry *Registry
	Locker   *Locker
	Bus      *Bus
	Slots    *Slots

	cancel context.CancelFunc
	done   chan struct{}
}

var (
	_ core.NodeRegistry = (*Registry)(nil)
	_ core.Locker       = (*Locker)(nil)
	_ core.Bus          = (*Bus)(nil)
	_ core.Slots        = (*Slots)(nil)
)

// New builds all cluster services. pool may be nil (no PG health tracking
// and no advisory-lock fallback). Call Start before use and Close on exit.
func New(rdb redis.UniversalClient, pool *pgxpool.Pool, opts Options) *Cluster {
	var pinger Pinger
	if pool != nil {
		pinger = pool
	}
	reg := NewRegistry(rdb, pinger, RegistryOptions{
		NodeID: opts.NodeID, Addr: opts.Addr, HostVersion: opts.HostVersion, Logger: opts.Logger,
	})
	return &Cluster{
		Registry: reg,
		Locker:   NewLocker(rdb, pool, opts.Logger),
		Bus:      NewBus(rdb, opts.Logger),
		Slots:    NewSlots(rdb, reg, SlotOptions{Logger: opts.Logger}),
	}
}

// Start sends the first heartbeat synchronously (so this node is alive
// before it takes any slot), reclaims slots of dead nodes and starts the
// background loops.
func (c *Cluster) Start(ctx context.Context) error {
	if err := c.Registry.Heartbeat(ctx); err != nil {
		return fmt.Errorf("first heartbeat: %w", err)
	}
	if _, err := c.Slots.Reclaim(ctx); err != nil {
		c.Registry.log.Warn("initial slot reclaim failed", "err", err)
	}
	runCtx, cancel := context.WithCancel(context.WithoutCancel(ctx))
	c.cancel = cancel
	c.done = make(chan struct{})
	go func() {
		defer close(c.done)
		done := make(chan struct{}, 3)
		go func() { c.Registry.Run(runCtx); done <- struct{}{} }()
		go func() { c.Slots.Run(runCtx); done <- struct{}{} }()
		go func() { c.Bus.Run(runCtx); done <- struct{}{} }()
		for range 3 {
			<-done
		}
	}()
	return nil
}

// Close stops the loops and removes this node from node:live.
func (c *Cluster) Close() {
	if c.cancel != nil {
		c.cancel()
		<-c.done
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	c.Registry.Leave(ctx)
}

func orDefault(l *slog.Logger) *slog.Logger {
	if l == nil {
		return slog.Default()
	}
	return l
}
