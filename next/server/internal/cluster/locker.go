package cluster

import (
	"context"
	"hash/fnv"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// releaseScript deletes the lock only when the caller still owns it.
var releaseScript = redis.NewScript(`
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0`)

// Locker implements core.Locker: Redis SET NX PX with an owner token,
// falling back to pg_try_advisory_lock on a dedicated connection when Redis
// returns an error.
type Locker struct {
	rdb  redis.UniversalClient
	pool *pgxpool.Pool
	log  *slog.Logger
}

// NewLocker builds a locker. pool may be nil (no fallback).
func NewLocker(rdb redis.UniversalClient, pool *pgxpool.Pool, logger *slog.Logger) *Locker {
	return &Locker{rdb: rdb, pool: pool, log: orDefault(logger)}
}

// TryLock takes lock:{key} for ttl. release is idempotent and safe to call
// after the lock expired (it never deletes a lock owned by someone else).
func (l *Locker) TryLock(ctx context.Context, key string, ttl time.Duration) (func(), bool, error) {
	rkey := keyLockPrefix + key
	token := uuid.NewString()
	ok, err := l.rdb.SetNX(ctx, rkey, token, ttl).Result()
	if err == nil {
		if !ok {
			return func() {}, false, nil
		}
		var once sync.Once
		return func() {
			once.Do(func() {
				rctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
				defer cancel()
				if err := releaseScript.Run(rctx, l.rdb, []string{rkey}, token).Err(); err != nil {
					l.log.Warn("lock release failed", "key", rkey, "err", err)
				}
			})
		}, true, nil
	}
	if l.pool == nil {
		return func() {}, false, err
	}
	l.log.Warn("redis lock failed, falling back to pg advisory lock", "key", rkey, "err", err)
	return l.tryPG(ctx, rkey)
}

func (l *Locker) tryPG(ctx context.Context, rkey string) (func(), bool, error) {
	conn, err := l.pool.Acquire(ctx)
	if err != nil {
		return func() {}, false, err
	}
	id := AdvisoryKey(rkey)
	var ok bool
	if err := conn.QueryRow(ctx, "SELECT pg_try_advisory_lock($1)", id).Scan(&ok); err != nil {
		conn.Release()
		return func() {}, false, err
	}
	if !ok {
		conn.Release()
		return func() {}, false, nil
	}
	var once sync.Once
	return func() {
		once.Do(func() {
			rctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			if _, err := conn.Exec(rctx, "SELECT pg_advisory_unlock($1)", id); err != nil {
				// Session state is unknown; drop the connection so the lock dies with it.
				_ = conn.Conn().Close(rctx)
			}
			conn.Release()
		})
	}, true, nil
}

// AdvisoryKey maps a lock name to a pg advisory lock id.
func AdvisoryKey(name string) int64 {
	h := fnv.New64a()
	_, _ = h.Write([]byte("sub2api-lock:" + name))
	return int64(h.Sum64())
}
