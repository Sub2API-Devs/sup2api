package install

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// running reports whether a status means instances may be serving.
func running(status string) bool {
	return status == StatusEnabled || status == StatusEnabling || status == StatusUpgrading
}

// Uninstall disables the plugin if needed, optionally drops its schema, and
// deletes the plugin row (cascading grants, versions, cursors, job runs,
// rollouts, plugin-default prices and sticky rules). Accounts are kept and
// show up as orphaned.
func (s *Service) Uninstall(ctx context.Context, key string, purge bool, actorID int64) error {
	status, err := s.pluginStatus(ctx, key)
	if err != nil {
		return err
	}
	if builtin, err := IsBuiltin(ctx, s.d.DB.Pool, key); err != nil {
		return err
	} else if builtin {
		return ErrBuiltin
	}
	if open, err := s.openRollout(ctx, key); err != nil {
		return err
	} else if open {
		return core.ErrConflict.WithMessage("a rollout is in progress; cancel it or wait until it finishes")
	}
	if running(status) {
		if s.d.Rollout == nil {
			return core.ErrUnavailable.WithMessage("rollout controller unavailable")
		}
		ro, err := s.d.Rollout.Disable(ctx, key, actorID, "uninstall")
		if err != nil {
			return err
		}
		if status, err = s.pluginStatus(ctx, key); err != nil {
			return err
		}
		if running(status) {
			details := map[string]any{"status": status}
			if ro != nil {
				details["rollout_id"] = ro.ID
			}
			return core.ErrConflict.WithMessage("the plugin is being disabled; retry uninstall once it is disabled").WithDetails(details)
		}
	}
	if purge && s.d.Schemas != nil {
		if err := s.d.Schemas.Drop(ctx, key); err != nil {
			return fmt.Errorf("drop plugin schema: %w", err)
		}
	}
	err = s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		var st string
		err := tx.QueryRow(ctx, `SELECT status FROM plugins WHERE key = $1 FOR UPDATE`, key).Scan(&st)
		if store.IsNoRows(err) {
			return core.ErrNotFound.WithMessage("plugin not found")
		}
		if err != nil {
			return err
		}
		if running(st) {
			return core.ErrConflict.WithMessage("the plugin was re-enabled concurrently")
		}
		if s.d.Permissions != nil {
			if err := s.d.Permissions.DeletePlugin(ctx, tx, key); err != nil {
				return err
			}
		}
		if tag, err := tx.Exec(ctx, `DELETE FROM plugins WHERE key = $1 AND NOT builtin`, key); err != nil {
			return err
		} else if tag.RowsAffected() == 0 {
			return ErrBuiltin
		}
		return Audit(ctx, tx, actorID, "plugin.uninstall", "plugin", key, map[string]any{"purge": purge, "previous_status": st})
	})
	if err != nil {
		return err
	}
	s.Notify(ctx, key)
	return nil
}

func (s *Service) pluginStatus(ctx context.Context, key string) (string, error) {
	var st string
	err := s.d.DB.Pool.QueryRow(ctx, `SELECT status FROM plugins WHERE key = $1`, key).Scan(&st)
	if store.IsNoRows(err) {
		return "", core.ErrNotFound.WithMessage("plugin not found")
	}
	return st, err
}

func (s *Service) openRollout(ctx context.Context, key string) (bool, error) {
	var n int
	err := s.d.DB.Pool.QueryRow(ctx, `SELECT count(*) FROM plugin_rollouts
		WHERE plugin_key = $1 AND phase IN ('preparing', 'activating')`, key).Scan(&n)
	return n > 0, err
}

// disableRevoked disables running plugins after a revocation (best effort).
func (s *Service) disableRevoked(ctx context.Context, keys []string, actorID int64, reason string) []string {
	var disabled []string
	for _, k := range keys {
		if s.d.Rollout == nil {
			slog.WarnContext(ctx, "cannot disable plugin after revocation: no rollout controller", "plugin", k)
			continue
		}
		if _, err := s.d.Rollout.Disable(ctx, k, actorID, reason); err != nil {
			slog.ErrorContext(ctx, "disable plugin after revocation", "plugin", k, "err", err)
			continue
		}
		disabled = append(disabled, k)
	}
	return disabled
}
