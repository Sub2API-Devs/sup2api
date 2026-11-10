package moderation

import (
	"context"

	"github.com/jackc/pgx/v5"
)

// parityReason is the history reason of an entry convertParityOnce changed.
const parityReason = "0.8.0 升级：默认级别为拦截，自动加入的条目改为拦截级 / upgrade to 0.8.0: the default level is enforce, automatic entries become enforce"

// convertParityOnce adapts the watch list to the 0.8.0 timing rules, once
// per installation (config_state.parity_converted, row-locked so only one
// node does it). Until 0.8.0 mode = enforce moderated everyone first and
// automatic entries were always added at observe; from 0.8.0 an entry's own
// level wins over the default level, so those entries would move their
// users to moderation after the request. Under mode = enforce the live
// automatic observe entries therefore become enforce entries, as they would
// have been added under the new rules. Entries an administrator or the AI
// set to observe are a choice and stay.
func (p *Plugin) convertParityOnce(ctx context.Context) {
	if p.parityDone.Load() || p.host == nil || !p.configured.Load() {
		return
	}
	db, err := p.db(ctx)
	if err != nil {
		return
	}
	c := p.cfg.Load()
	now := p.now().UTC()
	ran, converted := false, 0
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		ran, converted = false, 0
		var done bool
		if err := tx.QueryRow(ctx, `SELECT parity_converted FROM config_state WHERE id = 1 FOR UPDATE`).Scan(&done); err != nil {
			return err
		}
		if done {
			return nil
		}
		ran = true
		if c.Mode == ModeEnforce {
			rows, err := tx.Query(ctx, `UPDATE watchlist SET level = 'enforce', updated_at = $1
				WHERE level = 'observe' AND source = 'auto' AND (expires_at IS NULL OR expires_at > $1)
				RETURNING user_id`, now)
			if err != nil {
				return err
			}
			users, err := pgx.CollectRows(rows, pgx.RowTo[int64])
			if err != nil {
				return err
			}
			for _, uid := range users {
				if err := watchEvent(ctx, tx, watchChange{uid: uid, action: "set_level", from: LevelObserve, to: LevelEnforce, reason: parityReason}); err != nil {
					return err
				}
			}
			if converted = len(users); converted > 0 {
				if err := bumpWatch(ctx, tx); err != nil {
					return err
				}
			}
		}
		_, err := tx.Exec(ctx, `UPDATE config_state SET parity_converted = true WHERE id = 1`)
		return err
	})
	if err != nil {
		p.log.Warn("moderation: converting the watch list for 0.8.0 failed, retrying later", "error", err.Error())
		return
	}
	p.parityDone.Store(true)
	if ran {
		p.log.Info("moderation: 0.8.0 watch list conversion done", "mode", c.Mode, "converted", converted)
	}
	if converted > 0 {
		p.watchChanged(ctx)
	}
}
