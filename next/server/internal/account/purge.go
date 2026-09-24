package account

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

var _ core.PluginAccountPurger = (*Service)(nil)

// PurgePluginAccounts implements core.PluginAccountPurger (CONTRACTS §14.3):
// it soft-deletes every account of the plugin's account types, removes their
// group memberships and emits one account.deleted event per account, all in
// one transaction; then it clears their cooldowns and broadcasts
// account:changed once. Returns the number of accounts deleted.
func (s *Service) PurgePluginAccounts(ctx context.Context, pluginKey string) (int, error) {
	if pluginKey == "" {
		return 0, core.ErrInvalidArgument.WithMessage("plugin key is required")
	}
	var ids []int64
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		ids = ids[:0]
		rows, err := tx.Query(ctx, `UPDATE accounts SET deleted_at = now(), updated_at = now()
			WHERE plugin_key = $1 AND deleted_at IS NULL RETURNING id, type, name`, pluginKey)
		if err != nil {
			return err
		}
		var evs []core.Event
		for rows.Next() {
			var id int64
			var typ, name string
			if err := rows.Scan(&id, &typ, &name); err != nil {
				rows.Close()
				return err
			}
			ids = append(ids, id)
			evs = append(evs, core.Event{Type: core.EventAccountDeleted, Payload: basicPayload(id, pluginKey, typ, name)})
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return err
		}
		if len(ids) == 0 {
			return nil
		}
		if _, err := tx.Exec(ctx, `DELETE FROM account_groups WHERE account_id = ANY($1)`, ids); err != nil {
			return err
		}
		return s.d.Events.Emit(ctx, tx, evs...)
	})
	if err != nil {
		return 0, err
	}
	if len(ids) == 0 {
		return 0, nil
	}
	if s.d.Redis != nil {
		keys := make([]string, len(ids))
		for i, id := range ids {
			keys[i] = cooldownKey(id)
		}
		if err := s.d.Redis.Del(ctx, keys...).Err(); err != nil {
			slog.WarnContext(ctx, "account: clear cooldowns of purged accounts", "plugin_key", pluginKey, "err", err)
		}
	}
	s.purged(ctx, pluginKey, len(ids))
	slog.InfoContext(ctx, "account: purged plugin accounts", "plugin_key", pluginKey, "count", len(ids))
	return len(ids), nil
}

// purged invalidates local caches and broadcasts one account:changed for a
// bulk deletion.
func (s *Service) purged(ctx context.Context, pluginKey string, n int) {
	s.invalidate()
	if s.d.Bus == nil {
		return
	}
	b, _ := json.Marshal(map[string]any{"reason": "plugin_purged", "plugin_key": pluginKey, "count": n})
	if err := s.d.Bus.Publish(ctx, core.ChannelAccountChanged, b); err != nil {
		slog.WarnContext(ctx, "account: publish account:changed", "err", err)
	}
}
