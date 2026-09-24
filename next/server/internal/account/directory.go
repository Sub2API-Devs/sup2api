package account

import (
	"context"
	"encoding/json"
	"log/slog"
	"slices"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Candidates returns active, schedulable accounts of the group whose platform
// is in platforms (all platforms when empty), in priority order, excluding
// accounts that are cooling down.
func (s *Service) Candidates(ctx context.Context, groupID int64, platforms []string) ([]core.AccountRef, error) {
	refs, err := s.groupSnapshot(ctx, groupID)
	if err != nil {
		return nil, err
	}
	out := make([]core.AccountRef, 0, len(refs))
	for _, r := range refs {
		if len(platforms) == 0 || slices.Contains(platforms, r.Platform) {
			out = append(out, r)
		}
	}
	if len(out) == 0 || s.d.Redis == nil {
		return out, nil
	}
	pipe := s.d.Redis.Pipeline()
	cmds := make([]*redis.IntCmd, len(out))
	for i, r := range out {
		cmds[i] = pipe.Exists(ctx, cooldownKey(r.ID))
	}
	if _, err := pipe.Exec(ctx); err != nil {
		// Serving a cooling account is better than serving nothing; the
		// gateway will classify the upstream error again.
		slog.WarnContext(ctx, "account: read cooldowns", "err", err)
		return out, nil
	}
	kept := out[:0]
	for i, r := range out {
		if cmds[i].Val() == 0 {
			kept = append(kept, r)
		}
	}
	return kept, nil
}

func (s *Service) groupSnapshot(ctx context.Context, groupID int64) ([]core.AccountRef, error) {
	now := time.Now()
	s.cacheMu.Lock()
	snap, ok := s.groups[groupID]
	epoch := s.epoch
	s.cacheMu.Unlock()
	if ok && now.Sub(snap.at) < snapshotTTL {
		return snap.refs, nil
	}
	v, err, _ := s.sf.Do("g:"+itoa(groupID), func() (any, error) {
		rows, err := s.d.DB.Pool.Query(ctx, `SELECT a.id, a.name, a.plugin_key, a.platform, a.type, a.priority,
				a.max_concurrency, a.proxy_id
			FROM accounts a JOIN account_groups ag ON ag.account_id = a.id
			WHERE ag.group_id = $1 AND a.deleted_at IS NULL AND a.status = 'active' AND a.schedulable
			ORDER BY a.priority, a.id`, groupID)
		if err != nil {
			return nil, err
		}
		refs, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (core.AccountRef, error) {
			var a core.AccountRef
			err := r.Scan(&a.ID, &a.Name, &a.PluginKey, &a.Platform, &a.Type, &a.Priority, &a.MaxConcurrency, &a.ProxyID)
			return a, err
		})
		if err != nil {
			return nil, err
		}
		s.cacheMu.Lock()
		if s.epoch == epoch {
			s.groups[groupID] = groupSnap{at: now, refs: refs}
		}
		s.cacheMu.Unlock()
		return refs, nil
	})
	if err != nil {
		return nil, err
	}
	return v.([]core.AccountRef), nil
}

// Load returns one account with decrypted credentials (not deleted; any status).
func (s *Service) Load(ctx context.Context, id int64) (*core.Account, error) {
	now := time.Now()
	s.cacheMu.Lock()
	snap, ok := s.accounts[id]
	epoch := s.epoch
	s.cacheMu.Unlock()
	if ok && now.Sub(snap.at) < snapshotTTL {
		acc := snap.acc
		return &acc, nil
	}
	a, err := s.loadRow(ctx, s.d.DB.Pool, id, false)
	if err != nil {
		return nil, err
	}
	plain, err := s.decrypt(a.Platform, a.CredEnc)
	if err != nil {
		return nil, err
	}
	settings := a.Settings
	if len(settings) == 0 {
		settings = []byte("{}")
	}
	acc := core.Account{
		AccountRef: core.AccountRef{ID: a.ID, Name: a.Name, PluginKey: a.PluginKey, Platform: a.Platform, Type: a.Type,
			Priority: a.Priority, MaxConcurrency: a.MaxConcurrency, ProxyID: a.ProxyID},
		Status:      a.Status,
		Credentials: json.RawMessage(plain),
		Settings:    json.RawMessage(settings),
	}
	s.cacheMu.Lock()
	if s.epoch == epoch {
		s.accounts[id] = accountSnap{at: now, acc: acc}
	}
	s.cacheMu.Unlock()
	return &acc, nil
}

// IsCoolingDown reports whether the account has an active cooldown.
func (s *Service) IsCoolingDown(ctx context.Context, id int64) (bool, error) {
	if s.d.Redis == nil {
		return false, nil
	}
	n, err := s.d.Redis.Exists(ctx, cooldownKey(id)).Result()
	return n > 0, err
}

// SetCooldown excludes the account from scheduling until the given time. The
// first cooldown of a period emits account.status_changed (status "cooldown").
func (s *Service) SetCooldown(ctx context.Context, id int64, until time.Time, reason string) error {
	if s.d.Redis == nil {
		return nil
	}
	ttl := time.Until(until)
	if ttl <= 0 {
		return s.d.Redis.Del(ctx, cooldownKey(id)).Err()
	}
	prev, err := s.d.Redis.PTTL(ctx, cooldownKey(id)).Result()
	if err != nil {
		return err
	}
	if prev > ttl {
		// Never shorten an existing, longer cooldown.
		return nil
	}
	if err := s.d.Redis.Set(ctx, cooldownKey(id), reason, ttl).Err(); err != nil {
		return err
	}
	if prev > 0 {
		return nil // extending an existing cooldown
	}
	var platform string
	if err := s.d.DB.Pool.QueryRow(ctx, `SELECT platform FROM accounts WHERE id = $1`, id).Scan(&platform); err != nil {
		if store.IsNoRows(err) {
			return nil
		}
		return err
	}
	return s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		return s.d.Events.Emit(ctx, tx, core.Event{Type: core.EventAccountStatusChanged,
			Payload: statusPayload(id, platform, "cooldown", reason, &until)})
	})
}

// Disable sets status=disabled with a reason, emits account.status_changed
// and broadcasts account:changed. Disabling a disabled account is a no-op.
func (s *Service) Disable(ctx context.Context, id int64, reason string) error {
	changed := false
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		var platform string
		err := tx.QueryRow(ctx, `UPDATE accounts SET status = 'disabled', status_reason = $2, updated_at = clock_timestamp()
			WHERE id = $1 AND deleted_at IS NULL AND status <> 'disabled' RETURNING platform`, id, reason).Scan(&platform)
		if store.IsNoRows(err) {
			return nil
		}
		if err != nil {
			return err
		}
		changed = true
		return s.d.Events.Emit(ctx, tx, core.Event{Type: core.EventAccountStatusChanged,
			Payload: statusPayload(id, platform, "disabled", reason, nil)})
	})
	if err != nil {
		return err
	}
	if changed {
		s.changed(ctx, id)
	}
	return nil
}

// TouchLastUsed records usage; last_used_at is written in batches by Run.
func (s *Service) TouchLastUsed(_ context.Context, id int64) {
	s.touchMu.Lock()
	s.touched[id] = time.Now().UTC()
	s.touchMu.Unlock()
}

// FlushLastUsed writes pending last_used_at updates in one statement.
func (s *Service) FlushLastUsed(ctx context.Context) error {
	s.touchMu.Lock()
	if len(s.touched) == 0 {
		s.touchMu.Unlock()
		return nil
	}
	pending := s.touched
	s.touched = map[int64]time.Time{}
	s.touchMu.Unlock()
	ids := make([]int64, 0, len(pending))
	ts := make([]time.Time, 0, len(pending))
	for id, at := range pending {
		ids = append(ids, id)
		ts = append(ts, at)
	}
	_, err := s.d.DB.Pool.Exec(ctx, `UPDATE accounts a SET last_used_at = v.t
		FROM (SELECT unnest($1::bigint[]) AS id, unnest($2::timestamptz[]) AS t) v
		WHERE a.id = v.id AND (a.last_used_at IS NULL OR a.last_used_at < v.t)`, ids, ts)
	if err != nil {
		s.touchMu.Lock()
		for id, at := range pending {
			if cur, ok := s.touched[id]; !ok || cur.Before(at) {
				s.touched[id] = at
			}
		}
		s.touchMu.Unlock()
	}
	return err
}
