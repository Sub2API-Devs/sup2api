package cluster

import (
	"context"
	"log/slog"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Pinger is satisfied by *pgxpool.Pool.
type Pinger interface {
	Ping(ctx context.Context) error
}

// RegistryOptions configures a Registry. Zero values use the defaults.
type RegistryOptions struct {
	NodeID      string
	BootID      string // default: random UUID
	Addr        string
	HostVersion string
	Interval    time.Duration // heartbeat interval, default 5 s
	TTL         time.Duration // liveness window, default 15 s
	Now         func() time.Time
	Logger      *slog.Logger
}

// Registry implements core.NodeRegistry. Heartbeats write node:live,
// node:info:{boot} and node:plugins:{boot} in one pipeline.
type Registry struct {
	rdb    redis.UniversalClient
	pg     Pinger
	opts   RegistryOptions
	log    *slog.Logger
	start  time.Time
	nowFn  func() time.Time
	lastRS atomic.Int64 // unix nanos of last successful Redis round trip
	lastPG atomic.Int64 // unix nanos of last successful PG ping

	mu      sync.Mutex
	plugins map[string]string // plugin key -> state JSON, re-sent on every heartbeat
}

// NewRegistry builds a registry. pg may be nil, in which case Healthy only
// considers Redis.
func NewRegistry(rdb redis.UniversalClient, pg Pinger, opts RegistryOptions) *Registry {
	if opts.BootID == "" {
		opts.BootID = uuid.NewString()
	}
	if opts.Interval <= 0 {
		opts.Interval = DefaultHeartbeatInterval
	}
	if opts.TTL <= 0 {
		opts.TTL = DefaultNodeTTL
	}
	now := opts.Now
	if now == nil {
		now = time.Now
	}
	return &Registry{
		rdb: rdb, pg: pg, opts: opts, log: orDefault(opts.Logger),
		nowFn: now, start: now(), plugins: map[string]string{},
	}
}

func (r *Registry) NodeID() string { return r.opts.NodeID }
func (r *Registry) BootID() string { return r.opts.BootID }

// TTL is the liveness window.
func (r *Registry) TTL() time.Duration { return r.opts.TTL }

func (r *Registry) now() time.Time { return r.nowFn() }

// Run heartbeats every interval until ctx is done.
func (r *Registry) Run(ctx context.Context) {
	t := time.NewTicker(r.opts.Interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			hctx, cancel := context.WithTimeout(ctx, r.opts.Interval)
			if err := r.Heartbeat(hctx); err != nil {
				r.log.Warn("cluster heartbeat failed", "err", err)
			}
			cancel()
		}
	}
}

// Heartbeat refreshes this node in Redis, drops expired node:live members
// and pings PostgreSQL for the self-fencing health check.
func (r *Registry) Heartbeat(ctx context.Context) error {
	if r.pg != nil {
		if err := r.pg.Ping(ctx); err == nil {
			r.lastPG.Store(r.now().UnixNano())
		} else {
			r.log.Warn("cluster pg ping failed", "err", err)
		}
	}
	now := r.now()
	boot := r.opts.BootID
	ttl := r.opts.TTL
	infoKey := keyNodeInfoPrefix + boot
	plugKey := keyNodePlugins + boot

	r.mu.Lock()
	plugins := make([]any, 0, len(r.plugins)*2)
	for k, v := range r.plugins {
		plugins = append(plugins, k, v)
	}
	r.mu.Unlock()

	_, err := r.rdb.Pipelined(ctx, func(p redis.Pipeliner) error {
		p.ZAdd(ctx, keyNodeLive, redis.Z{Score: float64(now.UnixMilli()), Member: boot})
		p.ZRemRangeByScore(ctx, keyNodeLive, "-inf", "("+strconv.FormatInt(now.Add(-ttl).UnixMilli(), 10))
		p.HSet(ctx, infoKey,
			"node_id", r.opts.NodeID,
			"addr", r.opts.Addr,
			"host_version", r.opts.HostVersion,
			"started_at", r.start.UTC().Format(time.RFC3339Nano),
			"last_heartbeat", strconv.FormatInt(now.UnixMilli(), 10),
		)
		p.PExpire(ctx, infoKey, ttl)
		if len(plugins) > 0 {
			p.HSet(ctx, plugKey, plugins...)
		}
		p.PExpire(ctx, plugKey, ttl)
		return nil
	})
	if err != nil {
		return err
	}
	r.lastRS.Store(r.now().UnixNano())
	return nil
}

// Leave removes this node from the live set (graceful shutdown).
func (r *Registry) Leave(ctx context.Context) {
	boot := r.opts.BootID
	_, _ = r.rdb.Pipelined(ctx, func(p redis.Pipeliner) error {
		p.ZRem(ctx, keyNodeLive, boot)
		p.Del(ctx, keyNodeInfoPrefix+boot, keyNodePlugins+boot)
		return nil
	})
}

// LiveNodes returns every node with a heartbeat inside the TTL window.
func (r *Registry) LiveNodes(ctx context.Context) ([]core.NodeStatus, error) {
	cutoff := r.now().Add(-r.opts.TTL).UnixMilli()
	zs, err := r.rdb.ZRangeByScoreWithScores(ctx, keyNodeLive, &redis.ZRangeBy{
		Min: strconv.FormatInt(cutoff, 10), Max: "+inf",
	}).Result()
	if err != nil {
		return nil, err
	}
	r.markRedisOK()
	if len(zs) == 0 {
		return []core.NodeStatus{}, nil
	}
	infos := make([]*redis.MapStringStringCmd, len(zs))
	plugs := make([]*redis.MapStringStringCmd, len(zs))
	_, err = r.rdb.Pipelined(ctx, func(p redis.Pipeliner) error {
		for i, z := range zs {
			boot, _ := z.Member.(string)
			infos[i] = p.HGetAll(ctx, keyNodeInfoPrefix+boot)
			plugs[i] = p.HGetAll(ctx, keyNodePlugins+boot)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	out := make([]core.NodeStatus, 0, len(zs))
	for i, z := range zs {
		boot, _ := z.Member.(string)
		info := infos[i].Val()
		if len(info) == 0 {
			continue // info expired between the two reads
		}
		st := core.NodeStatus{
			NodeID:        info["node_id"],
			BootID:        boot,
			Addr:          info["addr"],
			HostVersion:   info["host_version"],
			LastHeartbeat: time.UnixMilli(int64(z.Score)).UTC(),
			Plugins:       plugs[i].Val(),
		}
		if st.Plugins == nil {
			st.Plugins = map[string]string{}
		}
		if t, err := time.Parse(time.RFC3339Nano, info["started_at"]); err == nil {
			st.StartedAt = t
		}
		out = append(out, st)
	}
	return out, nil
}

// IsAlive reports whether bootID heartbeated within the TTL window.
func (r *Registry) IsAlive(ctx context.Context, bootID string) (bool, error) {
	score, err := r.rdb.ZScore(ctx, keyNodeLive, bootID).Result()
	if err == redis.Nil {
		r.markRedisOK()
		return false, nil
	}
	if err != nil {
		return false, err
	}
	r.markRedisOK()
	return int64(score) >= r.now().Add(-r.opts.TTL).UnixMilli(), nil
}

// ReportPlugin publishes this node's state for one plugin. An empty
// stateJSON removes the plugin from this node's report.
func (r *Registry) ReportPlugin(ctx context.Context, pluginKey string, stateJSON string) error {
	key := keyNodePlugins + r.opts.BootID
	r.mu.Lock()
	if stateJSON == "" {
		delete(r.plugins, pluginKey)
	} else {
		r.plugins[pluginKey] = stateJSON
	}
	r.mu.Unlock()
	_, err := r.rdb.Pipelined(ctx, func(p redis.Pipeliner) error {
		if stateJSON == "" {
			p.HDel(ctx, key, pluginKey)
		} else {
			p.HSet(ctx, key, pluginKey, stateJSON)
		}
		p.PExpire(ctx, key, r.opts.TTL)
		return nil
	})
	if err == nil {
		r.markRedisOK()
	}
	return err
}

// Healthy reports whether both Redis and PostgreSQL answered within the
// TTL window. A node that is not healthy must fence itself (return 503 for
// plugin-dependent requests).
func (r *Registry) Healthy() bool {
	limit := r.now().Add(-r.opts.TTL).UnixNano()
	if r.lastRS.Load() < limit {
		return false
	}
	if r.pg != nil && r.lastPG.Load() < limit {
		return false
	}
	return true
}

func (r *Registry) markRedisOK() { r.lastRS.Store(r.now().UnixNano()) }
