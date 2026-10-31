package gateway

import (
	"context"
	"crypto/sha256"
	"encoding/binary"

	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// stickyDeleteIfValue deletes a binding only while it still holds the value
// that was read, so a session rebound meanwhile keeps its new binding.
const stickyDeleteIfValue = `if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0`

// StickyClearer serves HostService.ClearStickyBindings (CONTRACTS §73.2). It
// only needs Redis, so it is built before the plugin runtime and the gateway.
type StickyClearer struct{ rdb redis.UniversalClient }

func NewStickyClearer(rdb redis.UniversalClient) *StickyClearer { return &StickyClearer{rdb: rdb} }

// ClearStickyBindings scans the binding keys sticky:{rule}:{group}:{model}:
// {hash}. A key is compatible when its group segment is the group or "_" and
// its model segment is the model or "_" (the dimension is not part of the
// rule's key). Of the compatible bindings that point at the account, those
// whose hash of key and salt falls under percent are deleted.
func (s *StickyClearer) ClearStickyBindings(ctx context.Context, req core.StickyClearRequest) (matched, cleared int64, err error) {
	if s == nil || s.rdb == nil {
		return 0, 0, core.ErrUnavailable.WithMessage("sticky store unavailable")
	}
	group := itoa(req.GroupID)
	err = scanStickyKeys(ctx, s.rdb, "sticky:*", func(keys []string) error {
		var candidates []string
		for _, key := range keys {
			if stickyKeyServes(key, group, req.Model) {
				candidates = append(candidates, key)
			}
		}
		m, c, err := s.clearBatch(ctx, candidates, req)
		matched, cleared = matched+m, cleared+c
		return err
	})
	return matched, cleared, err
}

func (s *StickyClearer) clearBatch(ctx context.Context, keys []string, req core.StickyClearRequest) (matched, cleared int64, err error) {
	if len(keys) == 0 {
		return 0, 0, nil
	}
	values, err := s.rdb.MGet(ctx, keys...).Result()
	if err != nil {
		return 0, 0, err
	}
	pipe := s.rdb.Pipeline()
	var deletes []*redis.Cmd
	for i, v := range values {
		raw, ok := v.(string)
		if !ok || bindingAccount(raw) != req.AccountID {
			continue
		}
		matched++
		sum := sha256.Sum256([]byte(keys[i] + "\x00" + req.Salt))
		if int(binary.BigEndian.Uint64(sum[:8])%100) < req.Percent {
			deletes = append(deletes, pipe.Eval(ctx, stickyDeleteIfValue, []string{keys[i]}, raw))
		}
	}
	if len(deletes) == 0 {
		return matched, 0, nil
	}
	if _, err := pipe.Exec(ctx); err != nil {
		return matched, 0, err
	}
	for _, d := range deletes {
		if n, _ := d.Int64(); n == 1 {
			cleared++
		}
	}
	return matched, cleared, nil
}
