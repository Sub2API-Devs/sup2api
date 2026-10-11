package account

import (
	"context"
	"log/slog"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func (s *Service) runPreparationSweep(ctx context.Context) {
	ticker := time.NewTicker(time.Minute)
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
		if err := s.sweepPreparations(ctx); err != nil && ctx.Err() == nil {
			slog.WarnContext(ctx, "account preparation cleanup failed", "err", err)
		}
	}
}

func (s *Service) sweepPreparations(ctx context.Context) error {
	if s.d.Locker != nil {
		lock, ok, err := s.d.Locker.TryLock(ctx, "account:preparations:sweep", 2*time.Minute)
		if err != nil || !ok {
			return err
		}
		defer lock.Release()
		var cancel context.CancelFunc
		ctx, cancel = core.KeepLock(ctx, lock)
		defer cancel()
	}
	rows, err := s.d.DB.Pool.Query(ctx, `SELECT key,plugin_key,account_type,proxy_id,settings,created_by FROM account_preparations WHERE account_id IS NULL AND state<>'cancelled' AND (state='cancelling' OR expires_at<=now() OR last_seen_at<now()-interval '15 minutes') ORDER BY created_at LIMIT 20`)
	if err != nil {
		return err
	}
	var expired []core.AccountPreparation
	for rows.Next() {
		var p core.AccountPreparation
		if err := rows.Scan(&p.Key, &p.PluginKey, &p.Type, &p.ProxyID, &p.Settings, &p.CreatedBy); err != nil {
			rows.Close()
			return err
		}
		expired = append(expired, p)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for _, p := range expired {
		call, cancel := context.WithTimeout(ctx, 90*time.Second)
		err := s.disposePreparation(call, p, true)
		cancel()
		if err != nil {
			return err
		}
	}
	return nil
}
