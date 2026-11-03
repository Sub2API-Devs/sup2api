package account

import (
	"context"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// sweepPreparations cancels the account preparations that expired, were
// abandoned or are being cancelled (core.account.preparation_cleanup), and
// returns how many it disposed of.
func (s *Service) sweepPreparations(ctx context.Context) (int, error) {
	rows, err := s.d.DB.Pool.Query(ctx, `SELECT key,plugin_key,account_type,proxy_id,settings,created_by FROM account_preparations WHERE account_id IS NULL AND state<>'cancelled' AND (state='cancelling' OR expires_at<=now() OR last_seen_at<now()-interval '15 minutes') ORDER BY created_at LIMIT 20`)
	if err != nil {
		return 0, err
	}
	var expired []core.AccountPreparation
	for rows.Next() {
		var p core.AccountPreparation
		if err := rows.Scan(&p.Key, &p.PluginKey, &p.Type, &p.ProxyID, &p.Settings, &p.CreatedBy); err != nil {
			rows.Close()
			return 0, err
		}
		expired = append(expired, p)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return 0, err
	}
	for i, p := range expired {
		call, cancel := context.WithTimeout(ctx, 90*time.Second)
		err := s.disposePreparation(call, p, true)
		cancel()
		if err != nil {
			return i, err
		}
	}
	return len(expired), nil
}
