package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/jackc/pgx/v5"
)

// Draft sweep (CONTRACTS §49.13): abandoned, failed or cancelled drafts are
// removed every minute by one node at a time.
var (
	sweepEvery  = time.Minute
	draftIdle   = 15 * time.Minute // since last_seen_at
	draftMaxAge = 2 * time.Hour    // since created_at
	orphanAge   = 15 * time.Minute // controller-only draft runtimes
)

const sweepLockKey = "ccgateway:drafts:sweep"

func (s *Service) runSweep(ctx context.Context) {
	t := time.NewTicker(sweepEvery)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
		if s.CanWork != nil && !s.CanWork() {
			continue
		}
		n, e := s.SweepDrafts(ctx)
		if e != nil && ctx.Err() == nil {
			slog.WarnContext(ctx, "CCGateway draft sweep", "err", e)
		} else if n > 0 {
			slog.InfoContext(ctx, "CCGateway draft sweep", "removed", n)
		}
	}
}

// SweepDrafts removes (1) drafts that are not adopted and were not used for
// draftIdle or exist longer than draftMaxAge, on the controller and in the
// table, and (2) draft runtimes the controller lists that the core does not
// know, older than orphanAge. Adopted runtimes and account-id keys are never
// touched. It runs only with account runtimes on and, with a Locker, on one
// node at a time. Returns how many runtimes were removed.
func (s *Service) SweepDrafts(ctx context.Context) (int, error) {
	if !s.runtimesOn(ctx) {
		return 0, nil
	}
	if s.Locker != nil {
		lk, ok, e := s.Locker.TryLock(ctx, sweepLockKey, 2*time.Minute)
		if e != nil || !ok {
			return 0, e
		}
		defer lk.Release()
		var cancel context.CancelFunc
		ctx, cancel = core.KeepLock(ctx, lk)
		defer cancel()
	}
	removed := 0
	rows, e := s.DB.Pool.Query(ctx, `SELECT key FROM ccgateway_runtimes WHERE account_id IS NULL
		AND (last_seen_at < now() - $1::bigint * interval '1 second' OR created_at < now() - $2::bigint * interval '1 second')
		ORDER BY key`, int64(draftIdle/time.Second), int64(draftMaxAge/time.Second))
	if e != nil {
		return 0, e
	}
	var expired []string
	for rows.Next() {
		var key string
		if rows.Scan(&key) == nil && isDraftKey(key) {
			expired = append(expired, key)
		}
	}
	rows.Close()
	if e = rows.Err(); e != nil {
		return 0, e
	}
	var firstErr error
	for _, key := range expired {
		c, cancel := context.WithTimeout(ctx, time.Minute)
		ok, e := s.removeDraft(c, key, false)
		cancel()
		if e != nil {
			if firstErr == nil {
				firstErr = e
			}
			continue
		}
		if ok {
			removed++
		}
		if ctx.Err() != nil {
			return removed, ctx.Err()
		}
	}
	n, e := s.sweepOrphans(ctx)
	removed += n
	if firstErr == nil {
		firstErr = e
	}
	return removed, firstErr
}

// remoteRuntime is one entry of the controller's GET /accounts.
type remoteRuntime struct {
	Key       string `json:"key"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

// listRemote reads GET /accounts; ok=false when the controller predates the
// endpoint (404/405).
func (s *Service) listRemote(ctx context.Context) (list []remoteRuntime, ok bool, err error) {
	cfg, e := s.Load(ctx)
	if e != nil || !cfg.AccountRuntimes {
		return nil, false, errNotConfigured
	}
	client, base, close, e := s.open(ctx, cfg)
	if e != nil {
		return nil, false, e
	}
	defer close()
	req, e := http.NewRequestWithContext(ctx, "GET", base+"/accounts", nil)
	if e != nil {
		return nil, false, e
	}
	req.Header.Set("Authorization", "Bearer "+cfg.AdminKey)
	res, e := client.Do(req)
	if e != nil {
		return nil, false, e
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusNotFound || res.StatusCode == http.StatusMethodNotAllowed {
		return nil, false, nil
	}
	var body struct {
		Runtimes []remoteRuntime `json:"runtimes"`
	}
	if res.StatusCode != 200 || json.NewDecoder(io.LimitReader(res.Body, 8<<20)).Decode(&body) != nil {
		return nil, false, errUnreachable
	}
	return body.Runtimes, true, nil
}

// sweepOrphans deletes draft runtimes on the controller that have no row
// (any row: adopted keys are known too) and are older than orphanAge. The
// controller is listed before the table is read, so a draft created in
// between is known by then.
func (s *Service) sweepOrphans(ctx context.Context) (int, error) {
	list, ok, e := s.listRemote(ctx)
	if e != nil || !ok {
		return 0, e
	}
	var candidates []string
	for _, r := range list {
		if !isDraftKey(r.Key) {
			continue // account ids: deleting an account's data stays manual
		}
		created, e := time.Parse(time.RFC3339, r.CreatedAt)
		if e != nil || time.Since(created) < orphanAge {
			continue
		}
		candidates = append(candidates, r.Key)
	}
	if len(candidates) == 0 {
		return 0, nil
	}
	known := map[string]bool{}
	rows, e := s.DB.Pool.Query(ctx, `SELECT key FROM ccgateway_runtimes WHERE key = ANY($1)`, candidates)
	if e != nil {
		return 0, e
	}
	for rows.Next() {
		var key string
		if rows.Scan(&key) == nil {
			known[key] = true
		}
	}
	rows.Close()
	if e = rows.Err(); e != nil {
		return 0, e
	}
	removed := 0
	var firstErr error
	for _, key := range candidates {
		if known[key] {
			continue
		}
		c, cancel := context.WithTimeout(ctx, time.Minute)
		e := s.lockedTx(c, key, false, func(tx pgx.Tx) error {
			var exists bool
			if e := tx.QueryRow(c, `SELECT EXISTS(SELECT 1 FROM ccgateway_runtimes WHERE key=$1)`, key).Scan(&exists); e != nil || exists {
				return e
			}
			if e := s.deleteRemote(c, key); e != nil {
				return e
			}
			removed++
			return nil
		})
		cancel()
		if e != nil && firstErr == nil {
			firstErr = e
		}
	}
	return removed, firstErr
}
