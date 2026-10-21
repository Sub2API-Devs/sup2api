package account

import (
	"context"
	"log/slog"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

func markLifecyclePending(ctx context.Context, q store.Querier, id int64) error {
	if _, err := q.Exec(ctx, `INSERT INTO account_lifecycle_sync(account_id,status) VALUES($1,'pending') ON CONFLICT (account_id) DO UPDATE SET status='pending',code='',generation=account_lifecycle_sync.generation+1,updated_at=now()`, id); err != nil {
		return err
	}
	_, err := q.Exec(ctx, `INSERT INTO plugin_event_cursors(plugin_key,last_event_id) SELECT plugin_key,(SELECT COALESCE(max(id),0) FROM events) FROM accounts WHERE id=$1 ON CONFLICT (plugin_key) DO NOTHING`, id)
	return err
}

func (s *Service) saveLifecycleStatus(ctx context.Context, id int64, version time.Time, generation int64, state core.AccountSynchronization) error {
	_, err := s.d.DB.Pool.Exec(ctx, `INSERT INTO account_lifecycle_sync(account_id,status,code) SELECT id,$2,$3 FROM accounts WHERE id=$1 AND updated_at=$4 ON CONFLICT (account_id) DO UPDATE SET status=EXCLUDED.status,code=EXCLUDED.code,updated_at=now() WHERE account_lifecycle_sync.generation=$5`, id, state.Status, state.Code, version, generation)
	return err
}

func (s *Service) fillLifecycleStatus(ctx context.Context, views []*View) error {
	ids := make([]int64, 0, len(views))
	byID := make(map[int64]*View, len(views))
	for _, view := range views {
		binding, ok := s.accountType(view.PluginKey, view.Type)
		if ok && binding.Type.Lifecycle != nil {
			ids = append(ids, view.ID)
			byID[view.ID] = view
		}
	}
	if len(ids) == 0 {
		return nil
	}
	rows, err := s.d.DB.Pool.Query(ctx, `SELECT account_id,status,code FROM account_lifecycle_sync WHERE account_id=ANY($1)`, ids)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		var state core.AccountSynchronization
		if err := rows.Scan(&id, &state.Status, &state.Code); err != nil {
			return err
		}
		byID[id].LifecycleSync = &state
	}
	return rows.Err()
}

// Only event delivery wrote the synchronization state, so an account left
// pending or failed stayed so after its runtime came up on a later reconcile
// pass, and quota refresh skipped it until the snapshot went stale
// (2026-10-21 audit). The sweep reads the resource again for those rows.
const (
	lifecycleStatusSweepEvery = time.Minute
	// lifecycleStatusSettle leaves a fresh state to the delivery in flight.
	lifecycleStatusSettle    = 30 * time.Second
	lifecycleStatusSweepPage = 50
)

func (s *Service) runLifecycleStatusSweep(ctx context.Context) {
	ticker := time.NewTicker(lifecycleStatusSweepEvery)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
		if s.d.CanWork != nil && !s.d.CanWork() {
			continue
		}
		if _, err := s.sweepLifecycleStatus(ctx); err != nil && ctx.Err() == nil {
			slog.WarnContext(ctx, "account lifecycle synchronization recheck failed", "err", err)
		}
	}
}

// sweepLifecycleStatus rereads the synchronization of accounts not applied
// for a while and returns how many changed. Every read is written back, so
// unchanged rows move behind the others (oldest first) instead of filling
// every page; a read that fails leaves the row as it is.
func (s *Service) sweepLifecycleStatus(ctx context.Context) (int, error) {
	if s.d.Locker != nil {
		lock, ok, err := s.d.Locker.TryLock(ctx, "account:lifecycle-status:sweep", 2*time.Minute)
		if err != nil || !ok {
			return 0, err
		}
		defer lock.Release()
		var cancel context.CancelFunc
		ctx, cancel = core.KeepLock(ctx, lock)
		defer cancel()
	}
	type stale struct {
		id, generation int64
		pluginKey, typ string
		version        time.Time
		state          core.AccountSynchronization
	}
	rows, err := s.d.DB.Pool.Query(ctx, `SELECT a.id,a.plugin_key,a.type,a.updated_at,l.generation,l.status,l.code FROM account_lifecycle_sync l JOIN accounts a ON a.id=l.account_id
  WHERE l.status<>'applied' AND l.updated_at<=now()-make_interval(secs=>$1::float8) AND a.deleted_at IS NULL
  ORDER BY l.updated_at,a.id LIMIT $2`, lifecycleStatusSettle.Seconds(), lifecycleStatusSweepPage)
	if err != nil {
		return 0, err
	}
	var accounts []stale
	for rows.Next() {
		var a stale
		if err := rows.Scan(&a.id, &a.pluginKey, &a.typ, &a.version, &a.generation, &a.state.Status, &a.state.Code); err != nil {
			rows.Close()
			return 0, err
		}
		accounts = append(accounts, a)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return 0, err
	}
	updated := 0
	for _, a := range accounts {
		binding, ok := s.accountType(a.pluginKey, a.typ)
		reader, readable := s.d.LifecycleResources[a.pluginKey].(core.AccountSynchronizationReader)
		if !ok || binding.Type.Lifecycle == nil || !readable {
			continue
		}
		call, cancel := context.WithTimeout(ctx, 30*time.Second)
		state, err := reader.AccountSynchronization(call, a.id)
		cancel()
		if err != nil {
			continue
		}
		if err := s.saveLifecycleStatus(ctx, a.id, a.version, a.generation, state); err != nil {
			return updated, err
		}
		if state != a.state {
			updated++
		}
	}
	return updated, nil
}
