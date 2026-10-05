package account

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func testAccountForQuotaCache(t *testing.T, db *store.DB) int64 {
	t.Helper()
	var id int64
	err := db.Pool.QueryRow(context.Background(), `INSERT INTO accounts (name, plugin_key, type, credentials_enc)
		VALUES ($1, 'test', 'test_type', $2) RETURNING id`,
		"quota-cache-test-"+time.Now().Format("150405.000000"), []byte("x")).Scan(&id)
	require.NoError(t, err)
	return id
}

func TestQuotaCache(t *testing.T) {
	ctx := context.Background()
	db := testutil.DB(t)
	mr := miniredis.RunT(t)
	defer mr.Close()
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	s := &Service{d: Deps{DB: db, Redis: rdb}}

	id1 := testAccountForQuotaCache(t, db)
	id2 := testAccountForQuotaCache(t, db)
	reset := time.Now().Add(time.Hour).UTC().Truncate(time.Second)
	w1 := map[string]store.QuotaWindow{"5h": {Utilization: 10, ResetsAt: &reset}}
	w2 := map[string]store.QuotaWindow{"7d": {Utilization: 20}}
	if err := db.SaveAccountQuota(ctx, id1, store.QuotaPassive, w1); err != nil {
		t.Fatal(err)
	}
	if err := db.SaveAccountQuota(ctx, id2, store.QuotaActive, w2); err != nil {
		t.Fatal(err)
	}

	// First read: PG miss, Redis set.
	snaps := s.cachedAccountQuotas(ctx, []int64{id1, id2})
	if len(snaps) != 2 || snaps[id1].Windows["5h"].Utilization != 10 || snaps[id2].Source != store.QuotaActive {
		t.Fatalf("first read: %+v", snaps)
	}
	k1 := quotaRedisKey(id1)
	if !mr.Exists(k1) {
		t.Fatal("Redis key not set")
	}
	raw, _ := rdb.Get(ctx, k1).Result()
	var envelope map[string]any
	if err := json.Unmarshal([]byte(raw), &envelope); err != nil || envelope["mtime"] == nil {
		t.Fatalf("envelope: %v %v", err, envelope)
	}

	// Second read: Redis hit.
	snaps = s.cachedAccountQuotas(ctx, []int64{id1})
	if len(snaps) != 1 || snaps[id1].Windows["5h"].Utilization != 10 {
		t.Fatalf("cached: %+v", snaps)
	}

	// Evict and read: PG hit, Redis set again.
	s.evictQuotaCache(ctx, id1)
	if mr.Exists(k1) {
		t.Fatal("eviction failed")
	}
	snaps = s.cachedAccountQuotas(ctx, []int64{id1})
	if len(snaps) != 1 || !mr.Exists(k1) {
		t.Fatalf("after evict: %+v", snaps)
	}

	// A missing account: empty result, no Redis key.
	snaps = s.cachedAccountQuotas(ctx, []int64{1 << 40})
	if len(snaps) != 0 {
		t.Fatalf("missing: %+v", snaps)
	}

	// Redis down: falls back to PG.
	mr.Close()
	snaps = s.cachedAccountQuotas(ctx, []int64{id1, id2})
	if len(snaps) != 2 {
		t.Fatalf("redis down: %+v", snaps)
	}

	// Redis nil: same.
	s.d.Redis = nil
	snaps = s.cachedAccountQuotas(ctx, []int64{id1})
	if len(snaps) != 1 {
		t.Fatalf("redis nil: %+v", snaps)
	}
}

func TestQuotaCacheMtimeOrdering(t *testing.T) {
	ctx := context.Background()
	db := testutil.DB(t)
	mr := miniredis.RunT(t)
	defer mr.Close()
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	s := &Service{d: Deps{DB: db, Redis: rdb}}

	id := testAccountForQuotaCache(t, db)
	w1 := map[string]store.QuotaWindow{"5h": {Utilization: 10}}
	if err := db.SaveAccountQuota(ctx, id, store.QuotaPassive, w1); err != nil {
		t.Fatal(err)
	}
	// First read sets the cache.
	_ = s.cachedAccountQuotas(ctx, []int64{id})
	// A PG write at a later database time: the cache is stale.
	w2 := map[string]store.QuotaWindow{"5h": {Utilization: 30}}
	if err := db.SaveAccountQuota(ctx, id, store.QuotaPassive, w2); err != nil {
		t.Fatal(err)
	}
	// A manual SET with an old mtime (before the second write): it loses to PG.
	stale := map[string]any{"mtime": 1, "snap": map[string]any{"account_id": id, "windows": map[string]any{"5h": map[string]any{"utilization": 99}}}}
	raw, _ := json.Marshal(stale)
	if err := rdb.Set(ctx, quotaRedisKey(id), raw, quotaCacheTTL).Err(); err != nil {
		t.Fatal(err)
	}
	snaps := s.cachedAccountQuotas(ctx, []int64{id})
	if snaps[id].Windows["5h"].Utilization != 30 {
		t.Fatalf("stale cache won: %+v", snaps[id])
	}
}

func TestQuotaCacheEvictOnResetAndReauth(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	id := e.mkRawAccount("anthropic", "apikey", "a", "sk-good-key-123", true)
	rdb := redis.NewClient(&redis.Options{Addr: e.mr.Addr()})
	e.svc.d.Redis = rdb
	_ = e.svc.d.DB.SaveAccountQuota(ctx, id, store.QuotaPassive, map[string]store.QuotaWindow{"5h": {Utilization: 50}})
	_ = e.svc.cachedAccountQuotas(ctx, []int64{id})
	if !e.mr.Exists(quotaRedisKey(id)) {
		t.Fatal("cache not set")
	}
	// reset-status evicts.
	code, _ := e.do("POST", "/accounts/"+itoa(id)+"/reset-status", nil)
	if code != 200 || e.mr.Exists(quotaRedisKey(id)) {
		t.Fatalf("reset-status: code %d, exists %v", code, e.mr.Exists(quotaRedisKey(id)))
	}
	// reauth evicts (not testable without a real container; check the code path).
	_ = e.svc.d.DB.SaveAccountQuota(ctx, id, store.QuotaPassive, map[string]store.QuotaWindow{"5h": {Utilization: 50}})
	_ = e.svc.cachedAccountQuotas(ctx, []int64{id})
	if !e.mr.Exists(quotaRedisKey(id)) {
		t.Fatal("cache not set before delete")
	}
	// delete evicts.
	code, _ = e.do("DELETE", "/accounts/"+itoa(id), nil)
	if code != 204 || e.mr.Exists(quotaRedisKey(id)) {
		t.Fatalf("delete: code %d, exists %v", code, e.mr.Exists(quotaRedisKey(id)))
	}
}

func TestQuotaCacheCorruptEntry(t *testing.T) {
	ctx := context.Background()
	db := testutil.DB(t)
	mr := miniredis.RunT(t)
	defer mr.Close()
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	s := &Service{d: Deps{DB: db, Redis: rdb}}

	id := testAccountForQuotaCache(t, db)
	_ = db.SaveAccountQuota(ctx, id, store.QuotaPassive, map[string]store.QuotaWindow{"5h": {Utilization: 10}})
	// Corrupt JSON: falls back to PG and overwrites the key.
	_ = rdb.Set(ctx, quotaRedisKey(id), "not json", quotaCacheTTL).Err()
	snaps := s.cachedAccountQuotas(ctx, []int64{id})
	if len(snaps) != 1 || snaps[id].Windows["5h"].Utilization != 10 {
		t.Fatalf("corrupt: %+v", snaps)
	}
	raw, _ := rdb.Get(ctx, quotaRedisKey(id)).Result()
	if strings.Contains(raw, "not json") {
		t.Fatal("corrupt entry kept")
	}
}
