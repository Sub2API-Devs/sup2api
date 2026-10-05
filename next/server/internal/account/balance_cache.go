package account

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Redis cache for balance snapshots (CONTRACTS §51.3), parallel to quota cache.

const balanceCacheTTL = 10 * time.Minute

type balanceCacheEntry struct {
	Mtime int64                  `json:"mtime"` // PG updated_at in nanos
	Snap  *store.BalanceSnapshot `json:"snap"`
}

func (s *Service) writeBalanceCache(ctx context.Context, snap *store.BalanceSnapshot) {
	if s.d.Redis == nil || snap.UpdatedAt == nil {
		return
	}
	key := balanceCacheKey(snap.AccountID)
	entry := balanceCacheEntry{
		Mtime: snap.UpdatedAt.UnixNano(),
		Snap:  snap,
	}
	data, err := json.Marshal(entry)
	if err != nil {
		slog.WarnContext(ctx, "account: marshal balance cache", "account", snap.AccountID, "err", err)
		return
	}
	if err := s.d.Redis.Set(ctx, key, data, balanceCacheTTL).Err(); err != nil {
		slog.WarnContext(ctx, "account: write balance cache", "account", snap.AccountID, "err", err)
	}
}

func (s *Service) deleteBalanceCache(ctx context.Context, accountID int64) error {
	if s.d.Redis == nil {
		return nil
	}
	return s.d.Redis.Del(ctx, balanceCacheKey(accountID)).Err()
}

func (s *Service) evictBalanceCache(ctx context.Context, ids ...int64) {
	if len(ids) == 0 || s.d.Redis == nil {
		return
	}
	keys := make([]string, len(ids))
	for i, id := range ids {
		keys[i] = balanceCacheKey(id)
	}
	if err := s.d.Redis.Del(ctx, keys...).Err(); err != nil {
		slog.WarnContext(ctx, "account: redis DEL balance", "err", err)
	}
}

func balanceCacheKey(accountID int64) string {
	return fmt.Sprintf("account:balance:%d", accountID)
}

// cachedAccountBalances reads balances of multiple accounts with Redis cache.
func (s *Service) cachedAccountBalances(ctx context.Context, ids []int64) (map[int64]*store.BalanceSnapshot, error) {
	if len(ids) == 0 {
		return map[int64]*store.BalanceSnapshot{}, nil
	}

	// Try Redis first
	cached := map[int64]*store.BalanceSnapshot{}
	missing := []int64{}
	redisOK := s.d.Redis != nil

	if redisOK {
		keys := make([]string, len(ids))
		for i, id := range ids {
			keys[i] = balanceCacheKey(id)
		}
		vals, err := s.d.Redis.MGet(ctx, keys...).Result()
		if err != nil {
			slog.WarnContext(ctx, "account: redis MGET balance fallback to PG", "err", err)
			redisOK = false
		} else {
			for i, val := range vals {
				if val == nil {
					missing = append(missing, ids[i])
					continue
				}
				str, ok := val.(string)
				if !ok {
					missing = append(missing, ids[i])
					continue
				}
				var entry balanceCacheEntry
				if err := json.Unmarshal([]byte(str), &entry); err != nil {
					slog.WarnContext(ctx, "account: corrupt balance cache", "account", ids[i])
					missing = append(missing, ids[i])
					continue
				}
				cached[ids[i]] = entry.Snap
			}
		}
	}

	// Fallback to PG for missing or all ids
	needPG := missing
	if !redisOK {
		needPG = ids
	}

	if len(needPG) == 0 {
		return cached, nil
	}

	pgSnaps, err := s.d.DB.AccountBalances(ctx, needPG)
	if err != nil {
		return nil, err
	}

	// Merge PG results and write back to Redis synchronously
	for id, snap := range pgSnaps {
		cached[id] = snap
		if redisOK && snap.UpdatedAt != nil {
			s.writeBalanceCache(ctx, snap)
		}
	}

	return cached, nil
}
