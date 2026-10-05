package account

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

func testAccountForBalanceCache(t *testing.T, db *store.DB) int64 {
	t.Helper()
	var id int64
	err := db.Pool.QueryRow(context.Background(), `INSERT INTO accounts (name, plugin_key, type, credentials_enc)
		VALUES ($1, 'claude-oauth', 'oauth', $2) RETURNING id`,
		"balance-cache-test-"+time.Now().Format("150405.000000"), []byte("x")).Scan(&id)
	require.NoError(t, err)
	return id
}

func TestBalanceCache(t *testing.T) {
	ctx := context.Background()
	db := testutil.DB(t)
	mr := miniredis.RunT(t)
	defer mr.Close()
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	s := &Service{d: Deps{DB: db, Redis: rdb}}

	id := testAccountForBalanceCache(t, db)

	now := time.Now().UTC()
	snap := &store.BalanceSnapshot{
		AccountID:    id,
		AmountMicros: 1234500,
		Currency:     "USD",
		Source:       store.BalanceActive,
		UpdatedAt:    &now,
	}
	err := db.UpsertBalance(ctx, snap)
	require.NoError(t, err)

	// Read should hit Redis
	cached, err := s.cachedAccountBalances(ctx, []int64{id})
	require.NoError(t, err)
	require.Len(t, cached, 1)
	require.Equal(t, snap.AmountMicros, cached[id].AmountMicros)
	require.Equal(t, snap.Currency, cached[id].Currency)

	// Redis should have the key
	val, err := mr.Get(fmt.Sprintf("account:balance:%d", id))
	require.NoError(t, err)
	require.NotEmpty(t, val)
}

func TestBalanceCacheMtimeOrdering(t *testing.T) {
	ctx := context.Background()
	db := testutil.DB(t)
	mr := miniredis.RunT(t)
	defer mr.Close()
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	s := &Service{d: Deps{DB: db, Redis: rdb}}

	id := testAccountForBalanceCache(t, db)

	// Save old snapshot to PG
	oldTime := time.Now().UTC().Add(-10 * time.Minute)
	oldSnap := &store.BalanceSnapshot{
		AccountID:    id,
		AmountMicros: 1000000,
		Currency:     "USD",
		Source:       store.BalanceActive,
		UpdatedAt:    &oldTime,
	}
	err := db.UpsertBalance(ctx, oldSnap)
	require.NoError(t, err)

	// Manually put newer data in Redis
	newTime := time.Now().UTC()
	newSnap := &store.BalanceSnapshot{
		AccountID:    id,
		AmountMicros: 2000000,
		Currency:     "USD",
		Source:       store.BalanceActive,
		UpdatedAt:    &newTime,
	}
	cached := map[string]any{
		"mtime": newTime.UnixNano(),
		"snap":  newSnap,
	}
	data, _ := json.Marshal(cached)
	mr.Set(fmt.Sprintf("account:balance:%d", id), string(data))

	// Read should prefer Redis (newer mtime)
	result, err := s.cachedAccountBalances(ctx, []int64{id})
	require.NoError(t, err)
	require.Len(t, result, 1)
	require.Equal(t, int64(2000000), result[id].AmountMicros)
}

func TestBalanceCacheEvictOnResetAndReauth(t *testing.T) {
	ctx := context.Background()
	db := testutil.DB(t)
	mr := miniredis.RunT(t)
	defer mr.Close()
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	s := &Service{d: Deps{DB: db, Redis: rdb}}

	id := testAccountForBalanceCache(t, db)

	now := time.Now().UTC()
	snap := &store.BalanceSnapshot{
		AccountID:    id,
		AmountMicros: 1500000,
		Currency:     "USD",
		Source:       store.BalanceActive,
		UpdatedAt:    &now,
	}
	err := db.UpsertBalance(ctx, snap)
	require.NoError(t, err)

	// Populate cache
	_, err = s.cachedAccountBalances(ctx, []int64{id})
	require.NoError(t, err)
	require.True(t, mr.Exists(fmt.Sprintf("account:balance:%d", id)))

	// Evict should remove from Redis
	s.evictBalanceCache(ctx, id)
	require.False(t, mr.Exists(fmt.Sprintf("account:balance:%d", id)))
}

func TestBalanceCacheCorruptEntry(t *testing.T) {
	ctx := context.Background()
	db := testutil.DB(t)
	mr := miniredis.RunT(t)
	defer mr.Close()
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	s := &Service{d: Deps{DB: db, Redis: rdb}}

	id := testAccountForBalanceCache(t, db)

	now := time.Now().UTC()
	snap := &store.BalanceSnapshot{
		AccountID:    id,
		AmountMicros: 3000000,
		Currency:     "USD",
		Source:       store.BalanceActive,
		UpdatedAt:    &now,
	}
	err := db.UpsertBalance(ctx, snap)
	require.NoError(t, err)

	// Put corrupt data in Redis
	mr.Set(fmt.Sprintf("account:balance:%d", id), "{invalid json")

	// Should fall back to PG
	result, err := s.cachedAccountBalances(ctx, []int64{id})
	require.NoError(t, err)
	require.Len(t, result, 1)
	require.Equal(t, snap.AmountMicros, result[id].AmountMicros)
}
