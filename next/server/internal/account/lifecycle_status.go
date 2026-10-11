package account

import (
	"context"
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
