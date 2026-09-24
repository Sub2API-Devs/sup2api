package cluster

import (
	"context"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// acquireScript: drop expired members, check the limit, add the member.
// KEYS[1]=slot key; ARGV: now ms, expire ms, limit, member, key ttl ms.
var acquireScript = redis.NewScript(`
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
local limit = tonumber(ARGV[3])
if limit > 0 and redis.call('ZCARD', KEYS[1]) >= limit then
  return 0
end
redis.call('ZADD', KEYS[1], ARGV[2], ARGV[4])
redis.call('PEXPIRE', KEYS[1], ARGV[5])
return 1`)

// reclaimScript removes members whose boot id is not alive in node:live.
// It refuses to run (returns -1) unless the calling node itself is alive,
// so a wiped or stale node:live never makes live nodes look dead.
// KEYS[1]=slot key, KEYS[2]=node:live; ARGV: alive cutoff ms, own boot, now ms.
var reclaimScript = redis.NewScript(`
local cutoff = tonumber(ARGV[1])
local own = redis.call('ZSCORE', KEYS[2], ARGV[2])
if not own or tonumber(own) < cutoff then
  return -1
end
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[3])
local members = redis.call('ZRANGE', KEYS[1], 0, -1)
local alive = {}
local removed = 0
for _, m in ipairs(members) do
  local i = string.find(m, ':', 1, true)
  local boot = m
  if i then boot = string.sub(m, 1, i - 1) end
  local a = alive[boot]
  if a == nil then
    local sc = redis.call('ZSCORE', KEYS[2], boot)
    a = (sc and tonumber(sc) >= cutoff) and true or false
    alive[boot] = a
  end
  if not a then
    redis.call('ZREM', KEYS[1], m)
    removed = removed + 1
  end
end
return removed`)

// SlotOptions configures Slots. Zero values use the defaults.
type SlotOptions struct {
	// TTL bounds how long a slot survives without refresh. Held slots are
	// refreshed every TTL/5, so long streams keep their slot.
	TTL             time.Duration // default 5 min
	NodeTTL         time.Duration // liveness window, default 15 s
	ReclaimInterval time.Duration // default 30 s
	Now             func() time.Time
	Logger          *slog.Logger
}

// Slots implements core.Slots with one ZSET per (kind, id). Members are
// "{boot_id}:{request_id}" scored by expiry time in ms.
type Slots struct {
	rdb  redis.UniversalClient
	node core.Node
	opts SlotOptions
	log  *slog.Logger

	mu   sync.Mutex
	held map[string]string // member -> slot key
}

// NewSlots builds the limiter for node (normally the *Registry).
func NewSlots(rdb redis.UniversalClient, node core.Node, opts SlotOptions) *Slots {
	if opts.TTL <= 0 {
		opts.TTL = DefaultSlotTTL
	}
	if opts.NodeTTL <= 0 {
		opts.NodeTTL = DefaultNodeTTL
	}
	if opts.ReclaimInterval <= 0 {
		opts.ReclaimInterval = DefaultReclaimInterval
	}
	if opts.Now == nil {
		opts.Now = time.Now
	}
	return &Slots{rdb: rdb, node: node, opts: opts, log: orDefault(opts.Logger), held: map[string]string{}}
}

// SlotKey returns the Redis key for (kind, id).
func SlotKey(kind string, id int64) string {
	return keySlotPrefix + kind + ":" + strconv.FormatInt(id, 10)
}

// Acquire implements core.Slots.
func (s *Slots) Acquire(ctx context.Context, kind string, id int64, limit int, requestID string) (func(), bool, error) {
	if requestID == "" {
		requestID = uuid.NewString()
	}
	key := SlotKey(kind, id)
	member := s.node.BootID() + ":" + requestID
	now := s.opts.Now()
	n, err := acquireScript.Run(ctx, s.rdb, []string{key},
		now.UnixMilli(), now.Add(s.opts.TTL).UnixMilli(), limit, member, s.opts.TTL.Milliseconds(),
	).Int()
	if err != nil {
		return func() {}, false, err
	}
	if n != 1 {
		return func() {}, false, nil
	}
	s.mu.Lock()
	s.held[member] = key
	s.mu.Unlock()
	var once sync.Once
	return func() {
		once.Do(func() {
			s.mu.Lock()
			delete(s.held, member)
			s.mu.Unlock()
			rctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			if err := s.rdb.ZRem(rctx, key, member).Err(); err != nil {
				// The member expires on its own (TTL) or is reclaimed.
				s.log.Warn("slot release failed", "key", key, "err", err)
			}
		})
	}, true, nil
}

// InUse counts unexpired slots of (kind, id).
func (s *Slots) InUse(ctx context.Context, kind string, id int64) (int, error) {
	n, err := s.rdb.ZCount(ctx, SlotKey(kind, id), "("+strconv.FormatInt(s.opts.Now().UnixMilli(), 10), "+inf").Result()
	return int(n), err
}

// Reclaim removes slots held by nodes that are no longer alive, plus
// expired members. Slots of live nodes are never touched. It returns the
// number of removed dead-node members.
func (s *Slots) Reclaim(ctx context.Context) (int, error) {
	now := s.opts.Now()
	cutoff := now.Add(-s.opts.NodeTTL).UnixMilli()
	removed := 0
	var cursor uint64
	for {
		keys, next, err := s.rdb.Scan(ctx, cursor, keySlotPrefix+"*", 500).Result()
		if err != nil {
			return removed, err
		}
		for _, k := range keys {
			n, err := reclaimScript.Run(ctx, s.rdb, []string{k, keyNodeLive},
				cutoff, s.node.BootID(), now.UnixMilli()).Int()
			if err != nil {
				return removed, err
			}
			if n < 0 {
				// This node is not alive itself; do not judge others.
				return removed, nil
			}
			removed += n
		}
		if next == 0 {
			break
		}
		cursor = next
	}
	if removed > 0 {
		s.log.Info("reclaimed slots of dead nodes", "count", removed)
	}
	return removed, nil
}

// refresh extends the expiry of every slot this process still holds.
func (s *Slots) refresh(ctx context.Context) error {
	s.mu.Lock()
	held := make(map[string]string, len(s.held))
	for m, k := range s.held {
		held[m] = k
	}
	s.mu.Unlock()
	if len(held) == 0 {
		return nil
	}
	exp := float64(s.opts.Now().Add(s.opts.TTL).UnixMilli())
	_, err := s.rdb.Pipelined(ctx, func(p redis.Pipeliner) error {
		for m, k := range held {
			p.ZAddXX(ctx, k, redis.Z{Score: exp, Member: m})
			p.PExpire(ctx, k, s.opts.TTL)
		}
		return nil
	})
	return err
}

// Run reclaims dead-node slots every ReclaimInterval and refreshes held
// slots every TTL/5 until ctx is done.
func (s *Slots) Run(ctx context.Context) {
	reclaim := time.NewTicker(s.opts.ReclaimInterval)
	defer reclaim.Stop()
	refresh := time.NewTicker(max(s.opts.TTL/5, time.Second))
	defer refresh.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-reclaim.C:
			if _, err := s.Reclaim(ctx); err != nil && ctx.Err() == nil {
				s.log.Warn("slot reclaim failed", "err", err)
			}
		case <-refresh.C:
			if err := s.refresh(ctx); err != nil && ctx.Err() == nil {
				s.log.Warn("slot refresh failed", "err", err)
			}
		}
	}
}
