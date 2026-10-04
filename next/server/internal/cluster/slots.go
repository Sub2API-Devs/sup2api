package cluster

import (
	"context"
	"errors"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// acquireScript: drop expired members, check the limit, add the member.
// KEYS[1]=slot key; ARGV: test clock, ttl ms, limit, member.
var acquireScript = redis.NewScript(redisTimeLua + `
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
local limit = tonumber(ARGV[3])
if limit > 0 and redis.call('ZCARD', KEYS[1]) >= limit then
  return 0
end
redis.call('ZADD', KEYS[1], now+tonumber(ARGV[2]), ARGV[4])
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return 1`)

// A vanished or expired member is a lost lease, never a successful refresh.
var refreshSlotScript = redis.NewScript(redisTimeLua + `
local old = redis.call('ZSCORE', KEYS[1], ARGV[2])
if not old or tonumber(old) <= now then return 0 end
redis.call('ZADD', KEYS[1], 'XX', now+tonumber(ARGV[3]), ARGV[2])
redis.call('PEXPIRE', KEYS[1], ARGV[3])
return 1`)

var ErrSlotLost = errors.New("concurrency slot lease lost")

type slotID struct{ key, member string }
type slotLease struct {
	cancel context.CancelCauseFunc
	timer  *time.Timer
}

// reclaimScript removes members whose boot id is not alive in node:live.
// It refuses to run (returns -1) unless the calling node itself is alive,
// so a wiped or stale node:live never makes live nodes look dead.
// KEYS[1]=slot key, KEYS[2]=node:live; ARGV: test clock, node ttl, own boot.
var reclaimScript = redis.NewScript(redisTimeLua + `
local cutoff = now-tonumber(ARGV[2])
local own = redis.call('ZSCORE', KEYS[2], ARGV[3])
if not own or tonumber(own) < cutoff then
  return -1
end
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
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

var countSlotsScript = redis.NewScript(redisTimeLua + `
return redis.call('ZCOUNT',KEYS[1],'('..tostring(now),'+inf')`)

// SlotOptions configures Slots. Zero values use the defaults.
type SlotOptions struct {
	// TTL bounds how long a slot survives without refresh. Held slots are
	// refreshed every TTL/5, so long streams keep their slot.
	TTL             time.Duration    // default 5 min
	NodeTTL         time.Duration    // liveness window, default 15 s
	ReclaimInterval time.Duration    // default 30 s
	Now             func() time.Time // tests only: override the shared Redis clock
	Logger          *slog.Logger
}

// Slots implements core.Slots with one ZSET per (kind, id). Members are
// "{boot_id}:{request_id}:{lease_id}" scored by expiry time in ms.
type Slots struct {
	rdb  redis.UniversalClient
	node core.Node
	opts SlotOptions
	log  *slog.Logger

	mu   sync.Mutex
	held map[slotID]*slotLease
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
	return &Slots{rdb: rdb, node: node, opts: opts, log: orDefault(opts.Logger), held: map[slotID]*slotLease{}}
}

// SlotKey returns the Redis key for (kind, id).
func SlotKey(kind string, id int64) string {
	return keySlotPrefix + kind + ":" + strconv.FormatInt(id, 10)
}

// Acquire implements core.Slots.
func (s *Slots) Acquire(ctx context.Context, kind string, id int64, limit int, requestID string) (func(), bool, error) {
	_, release, ok, err := s.AcquireLease(ctx, kind, id, limit, requestID)
	return release, ok, err
}

func (s *Slots) AcquireLease(ctx context.Context, kind string, id int64, limit int, requestID string) (context.Context, func(), bool, error) {
	if requestID == "" {
		requestID = uuid.NewString()
	}
	key := SlotKey(kind, id)
	// Each acquisition has its own identity: releasing an earlier attempt
	// can never remove a later lease of the same request and account.
	member := s.node.BootID() + ":" + requestID + ":" + uuid.NewString()
	started := time.Now()
	n, err := acquireScript.Run(ctx, s.rdb, []string{key},
		sharedClockOverride(s.opts.Now), s.opts.TTL.Milliseconds(), limit, member,
	).Int()
	if err != nil {
		return ctx, func() {}, false, err
	}
	if n != 1 {
		return ctx, func() {}, false, nil
	}
	leaseCtx, cancel := context.WithCancelCause(ctx)
	ident := slotID{key, member}
	lease := &slotLease{cancel: cancel}
	remaining := s.opts.TTL - time.Since(started)
	if remaining <= 0 {
		cancel(ErrSlotLost)
	}
	lease.timer = time.AfterFunc(max(remaining, 0), func() { cancel(ErrSlotLost) })
	s.mu.Lock()
	if old := s.held[ident]; old != nil {
		old.timer.Stop()
		old.cancel(ErrSlotLost)
	}
	s.held[ident] = lease
	s.mu.Unlock()
	var once sync.Once
	return leaseCtx, func() {
		once.Do(func() {
			s.mu.Lock()
			delete(s.held, ident)
			lease.timer.Stop()
			s.mu.Unlock()
			cancel(context.Canceled)
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
	return countSlotsScript.Run(ctx, s.rdb, []string{SlotKey(kind, id)}, sharedClockOverride(s.opts.Now)).Int()
}

// InUseMany counts unexpired slots for multiple (kind, id) pairs using Redis pipeline.
func (s *Slots) InUseMany(ctx context.Context, kind string, ids []int64) (map[int64]int, error) {
	if len(ids) == 0 {
		return map[int64]int{}, nil
	}
	keys := make([]string, len(ids))
	for i, id := range ids {
		keys[i] = SlotKey(kind, id)
	}
	cmds := make([]*redis.Cmd, len(keys))
	_, err := s.rdb.Pipelined(ctx, func(p redis.Pipeliner) error {
		for i, key := range keys {
			cmds[i] = countSlotsScript.Eval(ctx, p, []string{key}, sharedClockOverride(s.opts.Now))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	result := make(map[int64]int, len(ids))
	for i, cmd := range cmds {
		count, err := cmd.Int()
		if err != nil {
			return nil, err
		}
		result[ids[i]] = count
	}
	return result, nil
}

// Reclaim removes slots held by nodes that are no longer alive, plus
// expired members. Slots of live nodes are never touched. It returns the
// number of removed dead-node members.
func (s *Slots) Reclaim(ctx context.Context) (int, error) {
	removed := 0
	var cursor uint64
	for {
		keys, next, err := s.rdb.Scan(ctx, cursor, keySlotPrefix+"*", 500).Result()
		if err != nil {
			return removed, err
		}
		for _, k := range keys {
			n, err := reclaimScript.Run(ctx, s.rdb, []string{k, keyNodeLive},
				sharedClockOverride(s.opts.Now), s.opts.NodeTTL.Milliseconds(), s.node.BootID()).Int()
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
	held := make(map[slotID]*slotLease, len(s.held))
	for id, lease := range s.held {
		held[id] = lease
	}
	s.mu.Unlock()
	if len(held) == 0 {
		return nil
	}
	started := time.Now()
	rctx, cancel := context.WithTimeout(ctx, min(s.opts.TTL/5, 3*time.Second))
	defer cancel()
	cmds := make(map[slotID]*redis.Cmd, len(held))
	_, first := s.rdb.Pipelined(rctx, func(p redis.Pipeliner) error {
		for id := range held {
			cmds[id] = refreshSlotScript.Eval(rctx, p, []string{id.key}, sharedClockOverride(s.opts.Now), id.member, s.opts.TTL.Milliseconds())
		}
		return nil
	})
	remaining := s.opts.TTL - time.Since(started)
	for id, lease := range held {
		n, err := cmds[id].Int()
		s.mu.Lock()
		if s.held[id] == lease {
			if err != nil || n != 1 || remaining <= 0 {
				lease.timer.Stop()
				lease.cancel(ErrSlotLost)
				delete(s.held, id)
			} else {
				lease.timer.Reset(remaining)
			}
		}
		s.mu.Unlock()
		if err != nil && first == nil {
			first = err
		}
		if n != 1 && first == nil {
			first = ErrSlotLost
		}
	}
	return first
}

// Run reclaims dead-node slots every ReclaimInterval and refreshes held
// slots every TTL/5 until ctx is done.
func (s *Slots) Run(ctx context.Context) {
	reclaim := time.NewTicker(s.opts.ReclaimInterval)
	defer reclaim.Stop()
	refresh := time.NewTicker(max(min(s.opts.TTL/5, s.opts.NodeTTL/3), time.Millisecond))
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
