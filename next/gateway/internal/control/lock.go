package control

import (
	"context"
	"errors"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/runtime-contract/locklease"
	"github.com/go-redsync/redsync/v4"
	"github.com/go-redsync/redsync/v4/redis/goredis/v9"
	"github.com/redis/go-redis/v9"
)

// RedisLocks uses the same renewal implementation as the core. There is no PG
// fallback or second lock namespace. Every attempt gets a new redsync token.
type RedisLocks struct {
	rs  *redsync.Redsync
	TTL time.Duration
}

func NewRedisLocks(client redis.UniversalClient) *RedisLocks {
	return &RedisLocks{rs: redsync.New(goredis.NewPool(client)), TTL: 30 * time.Second}
}

type redisLock struct{ mutex *redsync.Mutex }

func (l redisLock) Until() time.Time                         { return l.mutex.Until() }
func (l redisLock) Extend(ctx context.Context) (bool, error) { return l.mutex.ExtendContext(ctx) }
func (l *RedisLocks) WithLock(ctx context.Context, key string, budget time.Duration, fn func(context.Context) error) (bool, error) {
	if budget <= 0 {
		return false, errors.New("lock work budget must be positive")
	}
	ctx, cancel := context.WithTimeout(ctx, budget)
	defer cancel()
	m := l.rs.NewMutex("lock:"+key, redsync.WithExpiry(l.TTL), redsync.WithTries(1))
	if err := m.TryLockContext(ctx); err != nil {
		var taken *redsync.ErrTaken
		if errors.As(err, &taken) {
			return false, nil
		}
		return false, err
	}
	defer func() {
		releaseCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_, _ = m.UnlockContext(releaseCtx)
	}()
	work, stop := locklease.KeepLock(ctx, redisLock{m})
	defer stop()
	err := fn(work)
	if work.Err() != nil {
		return true, context.Cause(work)
	}
	return true, err
}
