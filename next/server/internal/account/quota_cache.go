package account

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Quota cache layer (CONTRACTS §44.9). Snapshots are written to PG (the
// source of truth) and Redis (a short-TTL read cache, 10 minutes); reads hit
// Redis first and fall back to PG when the key is missing or Redis is down.
// Anything that deletes a snapshot or changes an account's identity (reset-
// status, reauthorize, delete) also deletes the Redis key. Multiple nodes
// share Redis; the cache time (AccountQuotasAt + json mtime) orders entries
// so the freshest PG read always wins. Redis unavailability degrades to PG
// reads; it is never an error.

const (
	quotaCachePrefix = "account:quota:"
	quotaCacheTTL    = 10 * time.Minute
)

// quotaRedisKey is the key for account id's cached snapshot.
func quotaRedisKey(id int64) string { return quotaCachePrefix + "{" + itoa(id) + "}" }

// cachedAccountQuotas reads the snapshots for ids from Redis, falling back to
// PG for the missing ones and writing those back to Redis. Redis failures
// fall back to PG and do not fail the call.
func (s *Service) cachedAccountQuotas(ctx context.Context, ids []int64) map[int64]*store.QuotaSnapshot {
	if len(ids) == 0 || s.d.Redis == nil {
		snaps, _ := s.d.DB.AccountQuotas(ctx, ids)
		return snaps
	}
	keys := make([]string, len(ids))
	for i, id := range ids {
		keys[i] = quotaRedisKey(id)
	}
	vals, err := s.d.Redis.MGet(ctx, keys...).Result()
	out := map[int64]*store.QuotaSnapshot{}
	if err != nil && err != redis.Nil {
		slog.WarnContext(ctx, "account: redis MGet quota", "err", err)
		vals = nil
	}
	var pgIDs []int64
	if vals != nil {
		for i, v := range vals {
			if v == nil {
				pgIDs = append(pgIDs, ids[i])
				continue
			}
			raw, ok := v.(string)
			if !ok {
				continue
			}
			var envelope struct {
				Mtime int64                `json:"mtime"`
				Snap  *store.QuotaSnapshot `json:"snap"`
			}
			if json.Unmarshal([]byte(raw), &envelope) == nil && envelope.Snap != nil && envelope.Snap.AccountID == ids[i] && envelope.Mtime > time.Now().Add(-quotaCacheTTL).UnixMicro() {
				out[ids[i]] = envelope.Snap
			} else {
				pgIDs = append(pgIDs, ids[i])
			}
		}
	} else {
		pgIDs = ids
	}
	if len(pgIDs) == 0 {
		return out
	}
	// The PG read is at a known database time; entries cached before it are
	// stale (CONTRACTS §44.9 mtime ordering). Write the fresh ones back.
	pgSnaps, at, err := s.d.DB.AccountQuotasAt(ctx, pgIDs)
	if err != nil {
		slog.WarnContext(ctx, "account: read quota snapshots", "err", err)
		return out
	}
	for id, snap := range pgSnaps {
		out[id] = snap
	}
	mtime := at.UnixMicro()
	for id, snap := range pgSnaps {
		raw, _ := json.Marshal(snap)
		// The cache uses a JSON wrapper: {mtime, snap}.
		envelope := map[string]any{"mtime": mtime, "snap": json.RawMessage(raw)}
		cached, _ := json.Marshal(envelope)
		if err := s.cacheQuotaAt(ctx, id, cached, mtime); err != nil {
			slog.WarnContext(ctx, "account: redis SET quota", "id", id, "err", err)
		}
	}
	return out
}

// evictQuotaCache deletes the Redis keys for ids. Redis failures are logged
// and do not fail the call; the cache self-heals on the next PG write.
func (s *Service) evictQuotaCache(ctx context.Context, ids ...int64) {
	if len(ids) == 0 || s.d.Redis == nil {
		return
	}
	var at time.Time
	if err := s.d.DB.Pool.QueryRow(ctx, `SELECT clock_timestamp()`).Scan(&at); err != nil {
		at = time.Now()
	}
	for _, id := range ids {
		key := quotaRedisKey(id)
		if err := s.d.Redis.Eval(ctx, `local old=tonumber(redis.call('GET',KEYS[2]) or '0'); if tonumber(ARGV[1])>=old then redis.call('SET',KEYS[2],ARGV[1],'PX',ARGV[2]); redis.call('DEL',KEYS[1]); end; return 1`, []string{key, key + ":fence"}, at.UnixMicro(), quotaCacheTTL.Milliseconds()).Err(); err != nil && err != redis.Nil {
			slog.WarnContext(ctx, "account: redis DEL quota", "err", err)
		}
	}
}

func (s *Service) cacheQuotaAt(ctx context.Context, id int64, raw []byte, at int64) error {
	key := quotaRedisKey(id)
	return s.d.Redis.Eval(ctx, `local fence=tonumber(redis.call('GET',KEYS[2]) or '0'); if tonumber(ARGV[1])<=fence then return 0 end; local old=redis.call('GET',KEYS[1]); if old then local ok,v=pcall(cjson.decode,old); if ok and type(v)=='table' and v.mtime and tonumber(v.mtime)>tonumber(ARGV[1]) then return 0 end end; redis.call('SET',KEYS[1],ARGV[2],'PX',ARGV[3]); return 1`, []string{key, key + ":fence"}, at, raw, quotaCacheTTL.Milliseconds()).Err()
}
