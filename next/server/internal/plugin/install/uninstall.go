package install

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// running reports whether a status means instances may be serving.
func running(status string) bool {
	return status == StatusEnabled || status == StatusEnabling || status == StatusUpgrading
}

// UninstallOptions select what uninstall removes besides the plugin row.
type UninstallOptions struct {
	// Purge drops the plugin's database schema.
	Purge bool
	// PurgeAccounts deletes the accounts of the plugin's account types
	// through Deps.Accounts; otherwise they are kept and show up orphaned.
	PurgeAccounts bool
}

// UninstallResult reports what uninstall removed.
type UninstallResult struct {
	AccountsDeleted int `json:"accounts_deleted"`
}

// Uninstall disables the plugin if needed, optionally drops its schema, and
// deletes the plugin row (cascading grants, versions, cursors, job runs,
// rollouts, plugin-default prices and sticky rules) and its egress domains. Accounts are kept and
// show up as orphaned unless opt.PurgeAccounts is set.
func (s *Service) Uninstall(ctx context.Context, key string, opt UninstallOptions, actorID int64) (UninstallResult, error) {
	var res UninstallResult
	if builtin, err := IsBuiltin(ctx, s.d.DB.Pool, key); err != nil {
		return res, err
	} else if builtin {
		return res, ErrBuiltin
	}
	if opt.PurgeAccounts && s.d.Accounts == nil {
		return res, core.ErrUnavailable.WithMessage("account purging is unavailable on this node")
	}
	if err := s.quiesce(ctx, key, actorID); err != nil {
		return res, err
	}
	purge := opt.Purge
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
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
		var stopped bool
		if err := tx.QueryRow(ctx, `SELECT target_boot_ids <@ stopped_boot_ids FROM plugin_uninstalls WHERE plugin_key = $1 FOR UPDATE`, key).Scan(&stopped); err != nil {
			return err
		}
		if !stopped {
			return core.ErrConflict.WithMessage("plugin nodes have not all stopped")
		}
		if opt.PurgeAccounts {
			// Keep the plugin row and uninstall barrier locked until account
			// cleanup ends: another uninstall/reinstall cannot create a new
			// lifecycle whose accounts would be swept by this old request.
			n, err := s.d.Accounts.PurgePluginAccounts(ctx, key)
			res.AccountsDeleted = n
			if err != nil {
				return core.ErrInternal.WithMessage("plugin uninstall is pending: deleting its accounts failed; retry uninstall").WithCause(err)
			}
			if err := audit.Audit(ctx, tx, actorID, "plugin.accounts.purge", "plugin", key, map[string]any{"accounts_deleted": n, "ok": true}); err != nil {
				return err
			}
		}
		if purge && s.d.Schemas != nil {
			if err := s.d.Schemas.DropTx(ctx, tx, key); err != nil {
				return fmt.Errorf("drop plugin schema: %w", err)
			}
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
		// No foreign key to plugins: a reinstalled plugin must raise
		// plugin.egress_new_domain again for the hosts it connects to.
		if _, err := tx.Exec(ctx, `DELETE FROM plugin_egress_domains WHERE plugin_key = $1`, key); err != nil {
			return err
		}
		return audit.Audit(ctx, tx, actorID, "plugin.uninstall", "plugin", key, map[string]any{
			"purge": purge, "purge_accounts": opt.PurgeAccounts, "previous_status": st})
	})
	if err != nil {
		return res, err
	}
	s.Notify(ctx, key)
	return res, nil
}

func checkUninstall(ctx context.Context, q store.Querier, key string) error {
	var pending bool
	if err := q.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM plugin_uninstalls WHERE plugin_key = $1)`, key).Scan(&pending); err != nil {
		return err
	}
	if pending {
		return core.ErrConflict.WithMessage("plugin uninstall is waiting for nodes to stop")
	}
	return nil
}

// quiesce leaves a durable barrier if the request is interrupted. Never infer
// that a process stopped solely from a missing heartbeat: a partitioned node
// can still have a live plugin and an independent database connection.
func (s *Service) quiesce(ctx context.Context, key string, actorID int64) error {
	if s.d.Nodes == nil {
		return core.ErrUnavailable.WithMessage("node registry is required for uninstall")
	}
	boots := func(readCtx context.Context) ([]string, error) {
		nodes, err := s.d.Nodes.LiveNodes(readCtx)
		if err != nil {
			return nil, err
		}
		ids := make([]string, 0, len(nodes))
		for _, n := range nodes {
			ids = append(ids, n.BootID)
		}
		return ids, nil
	}
	ids, err := boots(ctx)
	if err != nil {
		return err
	}
	err = func() error {
		ctx, release, err := core.BeginPluginMutation(ctx, s.d.Mutations)
		if err != nil {
			return err
		}
		defer release()
		return s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
			var epoch int64
			var builtin bool
			if err := tx.QueryRow(ctx, `SELECT row_version, builtin FROM plugins WHERE key = $1 FOR UPDATE`, key).Scan(&epoch, &builtin); err != nil {
				return err
			}
			if builtin {
				return ErrBuiltin
			}
			var open bool
			if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM plugin_rollouts WHERE plugin_key=$1 AND phase IN ('preparing','activating'))`, key).Scan(&open); err != nil {
				return err
			}
			if open {
				return core.ErrConflict.WithMessage("a rollout is in progress; cancel it or wait until it finishes")
			}
			tag, err := tx.Exec(ctx, `INSERT INTO plugin_uninstalls(plugin_key,epoch,target_boot_ids)
			VALUES($1::text,$2,ARRAY(SELECT DISTINCT unnest($3::text[] || ARRAY(SELECT boot_id FROM plugin_runtime_nodes WHERE plugin_key=$1::text AND NOT stopped)))) ON CONFLICT DO NOTHING`, key, epoch+1, ids)
			if err != nil || tag.RowsAffected() == 0 {
				return err
			}
			if _, err := tx.Exec(ctx, `UPDATE plugins SET status='disabled', desired_version=NULL, status_reason='uninstalling', row_version=row_version+1, updated_at=now() WHERE key=$1`, key); err != nil {
				return err
			}
			if s.d.Permissions != nil {
				if err := s.d.Permissions.SetPluginActive(ctx, tx, key, false); err != nil {
					return err
				}
			}
			return audit.Audit(ctx, tx, actorID, "plugin.uninstall.begin", "plugin", key, nil)
		})
	}()
	if err != nil {
		return err
	}
	s.Notify(ctx, key)
	waitCtx, cancel := context.WithTimeout(ctx, 35*time.Second)
	defer cancel()
	t := time.NewTicker(100 * time.Millisecond)
	defer t.Stop()
	for {
		ids, err = boots(waitCtx)
		if err != nil {
			return err
		}
		var stopped bool
		// Include nodes that joined while the marker was being committed. A
		// node starting after it can only read the disabled desired state.
		err = s.d.DB.Pool.QueryRow(waitCtx, `UPDATE plugin_uninstalls SET target_boot_ids=ARRAY(SELECT DISTINCT unnest(target_boot_ids || $2::text[]))
			WHERE plugin_key=$1 RETURNING target_boot_ids <@ stopped_boot_ids`, key, ids).Scan(&stopped)
		if err != nil {
			return err
		}
		if stopped {
			return nil
		}
		select {
		case <-waitCtx.Done():
			return core.ErrConflict.WithMessage("plugin uninstall is pending: waiting for all nodes to acknowledge stop; retry uninstall")
		case <-t.C:
		}
	}
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
		if _, err := s.d.Rollout.Disable(core.WithEmergencyRevocation(ctx), k, actorID, reason); err != nil {
			slog.ErrorContext(ctx, "disable plugin after revocation", "plugin", k, "err", err)
			continue
		}
		disabled = append(disabled, k)
	}
	return disabled
}
