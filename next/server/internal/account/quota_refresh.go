package account

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"sort"
	"sync"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

const quotaSweepPage = 64

func quotaPluginRevision(bt core.AccountTypeBinding) string {
	raw, _ := json.Marshal(struct {
		Version   string
		Quota     any
		Lifecycle any
	}{bt.Plugin.Version, bt.Type.Quota, bt.Type.Lifecycle})
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

func (s *Service) initializeQuota(ctx context.Context, q store.Querier, id int64, bt core.AccountTypeBinding) error {
	decl := bt.Type.Quota
	if decl == nil || !decl.Query || !decl.AutoRefresh {
		return nil
	}
	return store.EnsureAccountQuota(ctx, q, id, quotaPluginRevision(bt), true)
}

// lifecycleQuotaReady is the SQL condition (on account_lifecycle_sync l)
// under which a lifecycle account may be queried for its quota: the runtime
// configuration is applied, or only a new environment (locale / timezone)
// waits for the next runtime while the existing container keeps serving.
const lifecycleQuotaReady = `(l.status='applied' OR (l.status='pending' AND l.code='environment_requires_new_runtime'))`

// quotaBlocked is why an active quota query of the account cannot run now
// ("" when it can): runtime_not_ready while the lifecycle plugin has not
// synchronized the account's runtime. A disabled account is only kept out of
// scheduling (2026-10-22 user decision); its quota is queried like any other.
func (s *Service) quotaBlocked(ctx context.Context, a *row, bt core.AccountTypeBinding) (string, error) {
	if bt.Type.Lifecycle == nil {
		return "", nil
	}
	var ready bool
	if err := s.d.DB.Pool.QueryRow(ctx, `SELECT COALESCE((SELECT `+lifecycleQuotaReady+` FROM account_lifecycle_sync l WHERE l.account_id=$1),true)`, a.ID).Scan(&ready); err != nil {
		return "", err
	}
	if !ready {
		return "runtime_not_ready", nil
	}
	return "", nil
}

var quotaBlockedMessages = map[string]string{
	"runtime_not_ready": "The account runtime is not synchronized yet; the quota can be refreshed once it is.",
}

// quotaNotReady answers a query the account cannot take now: the background
// refresh keeps the stored snapshot, a manual refresh is told why (409 with
// details.reason) instead of silently getting the old snapshot.
func (s *Service) quotaNotReady(ctx context.Context, id int64, manual bool, reason string, err error) (*store.QuotaSnapshot, error) {
	if !manual {
		return s.d.DB.AccountQuota(ctx, id)
	}
	if err != nil {
		return nil, err
	}
	return nil, core.ErrConflict.WithMessage(quotaBlockedMessages[reason]).WithDetails(map[string]any{"reason": reason})
}

func quotaNextCheck(now time.Time, res *pluginv1.QuotaResult, failures int, failed bool) time.Time {
	if failed {
		// failures counts the failed queries before this one.
		return now.Add(min(quotaRetryFirst<<min(failures, 6), quotaErrorTTL))
	}
	next := now.Add(quotaFresh)
	if value := res.GetNextCheckAtUnix(); value > 0 {
		next = time.Unix(value, 0)
	}
	if next.Before(now.Add(quotaQueryFloor)) {
		return now.Add(quotaQueryFloor)
	}
	if next.After(now.Add(24 * time.Hour)) {
		return now.Add(24 * time.Hour)
	}
	return next
}

func (s *Service) executeQuotaQuery(ctx context.Context, bt core.AccountTypeBinding, a *row, manual bool, floor time.Duration) (*store.QuotaSnapshot, error) {
	if reason, err := s.quotaBlocked(ctx, a, bt); err != nil || reason != "" {
		return s.quotaNotReady(ctx, a.ID, manual, reason, err)
	}
	revision := quotaPluginRevision(bt)
	current, ok := s.accountType(a.PluginKey, a.Type)
	if !ok || quotaPluginRevision(current) != revision {
		return s.d.DB.AccountQuota(ctx, a.ID)
	}
	if err := store.EnsureAccountQuota(ctx, s.d.DB.Pool, a.ID, revision, bt.Type.Quota.AutoRefresh); err != nil {
		return nil, err
	}
	claim, err := s.d.DB.LeaseAccountQuota(ctx, a.ID, revision, floor, quotaQueryTimeout+10*time.Second, manual)
	if err != nil {
		return nil, err
	}
	if claim == nil {
		return s.d.DB.AccountQuota(ctx, a.ID)
	}
	a, err = s.loadRow(ctx, s.d.DB.Pool, a.ID, nil, false)
	if err != nil {
		return nil, err
	}
	valid, err := s.d.DB.AccountQuotaClaimValid(ctx, claim)
	if err != nil {
		return nil, err
	}
	if !valid || (!manual && !claim.Initial && !a.Schedulable) {
		return s.d.DB.AccountQuota(ctx, a.ID)
	}
	if reason, err := s.quotaBlocked(ctx, a, bt); err != nil || reason != "" {
		return s.quotaNotReady(ctx, a.ID, manual, reason, err)
	}
	qctx, cancel := context.WithTimeout(ctx, quotaQueryTimeout)
	done := make(chan struct{})
	go func() {
		defer close(done)
		tick := time.NewTicker(time.Second)
		defer tick.Stop()
		for {
			select {
			case <-qctx.Done():
				return
			case <-tick.C:
				current, ok := s.accountType(a.PluginKey, a.Type)
				valid, e := s.d.DB.AccountQuotaClaimValid(qctx, claim)
				if !ok || quotaPluginRevision(current) != revision || e != nil || !valid || (s.d.CanWork != nil && !s.d.CanWork()) {
					cancel()
					return
				}
			}
		}
	}()
	res, queryErr := s.runQuotaQuery(qctx, bt, a)
	var windows map[string]store.QuotaWindow
	if queryErr == nil {
		windows, queryErr = normalizedQuota(res)
	}
	expired := qctx.Err() != nil
	cancel()
	<-done
	current, ok = s.accountType(a.PluginKey, a.Type)
	if !ok || quotaPluginRevision(current) != revision || ctx.Err() != nil || (s.d.CanWork != nil && !s.d.CanWork()) {
		return s.d.DB.AccountQuota(ctx, a.ID)
	}
	if errors.Is(queryErr, errQuotaQueryUnimplemented) {
		released, err := s.d.DB.ReleaseAccountQuotaQuery(ctx, claim, time.Now().Add(quotaFresh))
		if err != nil {
			return nil, err
		}
		if released {
			s.evictQuotaCache(ctx, a.ID)
		}
		return s.d.DB.AccountQuota(ctx, a.ID)
	}
	if expired {
		queryErr = errors.New("quota query cancelled or timed out")
	}
	msg := ""
	if queryErr != nil {
		msg = truncate(queryErr.Error(), maxQuotaError)
	}
	applied, err := s.d.DB.CompleteAccountQuota(ctx, claim, windows, msg, quotaNextCheck(time.Now(), res, claim.Failures, queryErr != nil))
	if err != nil {
		return nil, err
	}
	if applied {
		s.evictQuotaCache(ctx, a.ID)
		s.changed(ctx, a.ID)
	}
	return s.d.DB.AccountQuota(ctx, a.ID)
}

func (s *Service) runQuotaSweep(ctx context.Context) {
	tick := time.NewTicker(quotaFlushTick)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			if err := s.sweepQuotas(ctx); err != nil && ctx.Err() == nil {
				slog.WarnContext(ctx, "account: quota sweep", "err", err)
			}
		}
	}
}

func (s *Service) sweepQuotas(ctx context.Context) error {
	s.quotaSweepMu.Lock()
	defer s.quotaSweepMu.Unlock()
	if s.d.CanWork != nil && !s.d.CanWork() {
		return nil
	}
	g := s.gen()
	if g == nil {
		return nil
	}
	keys := quotaSweepTypes(g)
	if len(keys) == 0 {
		return nil
	}
	if err := s.initializeQuotaPage(ctx, keys); err != nil {
		return err
	}
	ids, err := s.dueQuotaIDs(ctx, keys)
	if err != nil {
		return err
	}
	return s.queryDueQuotas(ctx, ids)
}

// quotaSweepTypes lists the "plugin/type" pairs whose quota is queryable and
// auto-refreshed.
func quotaSweepTypes(g core.Generation) []string {
	keys := []string{}
	for _, bt := range g.AccountTypes() {
		if q := bt.Type.Quota; q != nil && q.Query && q.AutoRefresh && bt.Client != nil {
			keys = append(keys, bt.Plugin.Key+"/"+bt.Type.ID)
		}
	}
	return keys
}

// initializeQuotaPage walks one cursor page of accounts and creates the quota
// snapshot rows they are missing, advancing the sweep cursor.
func (s *Service) initializeQuotaPage(ctx context.Context, keys []string) error {
	rows, err := s.d.DB.Pool.Query(ctx, `SELECT a.id,a.plugin_key,a.type FROM accounts a WHERE a.deleted_at IS NULL
  AND a.plugin_key||'/'||a.type=ANY($1) AND a.id>$2 ORDER BY a.id LIMIT $3`, keys, s.quotaSweepAfter, quotaSweepPage)
	if err != nil {
		return err
	}
	type entry struct {
		id          int64
		plugin, typ string
	}
	entries := []entry{}
	for rows.Next() {
		var e entry
		if err := rows.Scan(&e.id, &e.plugin, &e.typ); err != nil {
			rows.Close()
			return err
		}
		entries = append(entries, e)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	for _, e := range entries {
		bt, ok := s.accountType(e.plugin, e.typ)
		if ok {
			if err := s.initializeQuota(ctx, s.d.DB.Pool, e.id, bt); err != nil {
				return err
			}
		}
		s.quotaSweepAfter = e.id
	}
	if len(entries) < quotaSweepPage {
		s.quotaSweepAfter = 0
	}
	return nil
}

// dueQuotaIDs selects the accounts whose quota is due for a refresh now.
func (s *Service) dueQuotaIDs(ctx context.Context, keys []string) ([]int64, error) {
	rows, err := s.d.DB.Pool.Query(ctx, `SELECT q.account_id FROM account_quota_snapshots q JOIN accounts a ON a.id=q.account_id
  WHERE q.auto_refresh AND q.next_check_at<=now() AND (q.lease_until IS NULL OR q.lease_until<=now())
  AND (q.last_active_at IS NULL OR q.last_active_at<=now()-make_interval(secs=>$3::float8))
  AND (a.schedulable OR q.updated_at IS NULL) AND a.deleted_at IS NULL AND a.plugin_key||'/'||a.type=ANY($1)
  AND NOT EXISTS(SELECT 1 FROM account_lifecycle_sync l WHERE l.account_id=a.id AND NOT `+lifecycleQuotaReady+`)
  ORDER BY q.next_check_at,q.account_id LIMIT $2`, keys, quotaSweepPage, quotaQueryFloor.Seconds())
	if err != nil {
		return nil, err
	}
	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return nil, err
		}
		ids = append(ids, id)
	}
	rows.Close()
	return ids, rows.Err()
}

// queryDueQuotas queries the selected accounts concurrently, four at a time,
// each behind the single-flight key so an explicit refresh and the sweep
// never query one account twice.
func (s *Service) queryDueQuotas(ctx context.Context, ids []int64) error {
	var wg sync.WaitGroup
	sem := make(chan struct{}, 4)
	for _, id := range ids {
		if ctx.Err() != nil {
			break
		}
		select {
		case sem <- struct{}{}:
		case <-ctx.Done():
			wg.Wait()
			return ctx.Err()
		}
		wg.Add(1)
		go func(id int64) {
			defer wg.Done()
			defer func() { <-sem }()
			_, err, _ := s.quotaFlight.Do(itoa(id), func() (any, error) {
				a, err := s.loadRow(ctx, s.d.DB.Pool, id, nil, false)
				if err != nil {
					return nil, err
				}
				decl, bt := s.quotaDecl(a.PluginKey, a.Type)
				if decl == nil || !decl.Query || !decl.AutoRefresh || bt.Client == nil || (s.d.CanWork != nil && !s.d.CanWork()) {
					return nil, nil
				}
				return s.executeQuotaQuery(ctx, bt, a, false, quotaQueryFloor)
			})
			if err != nil && ctx.Err() == nil {
				slog.WarnContext(ctx, "account: refresh quota", "account", id, "err", err)
			}
		}(id)
	}
	wg.Wait()
	return ctx.Err()
}

func (s *Service) AccountQuotaSnapshots(ctx context.Context, ids []int64) (map[int64]*pluginv1.AccountQuotaSnapshot, error) {
	snapshots, err := s.d.DB.AccountQuotas(ctx, ids)
	if err != nil {
		return nil, err
	}
	out := make(map[int64]*pluginv1.AccountQuotaSnapshot, len(snapshots))
	for id, snap := range snapshots {
		if snap.Generation <= 0 || snap.Windows == nil {
			return nil, errors.New("invalid stored quota snapshot")
		}
		q := &pluginv1.AccountQuotaSnapshot{Revision: snap.Revision, Generation: snap.Generation, Error: snap.Error}
		if snap.UpdatedAt != nil {
			q.UpdatedAtUnix = snap.UpdatedAt.Unix()
		}
		for key, w := range snap.Windows {
			window := &pluginv1.QuotaWindow{Key: key, Utilization: w.Utilization, UtilizationUnknown: w.UtilizationUnknown, Status: w.Status, Used: w.Used, Limit: w.Limit}
			if w.ResetsAt != nil {
				window.ResetsAtUnix = w.ResetsAt.Unix()
			}
			q.Windows = append(q.Windows, window)
		}
		sort.Slice(q.Windows, func(i, j int) bool { return q.Windows[i].Key < q.Windows[j].Key })
		out[id] = q
	}
	return out, nil
}

func (s *Service) ApplyAccountQuotaObservation(ctx context.Context, id, expectedGeneration int64, res *pluginv1.QuotaResult) error {
	if expectedGeneration <= 0 {
		return nil
	}
	windows, err := normalizedQuota(res)
	if err != nil {
		return err
	}
	var pluginKey, accountType string
	err = s.d.DB.Pool.QueryRow(ctx, `SELECT plugin_key,type FROM accounts WHERE id=$1 AND deleted_at IS NULL`, id).Scan(&pluginKey, &accountType)
	if store.IsNoRows(err) {
		return nil
	}
	if err != nil {
		return err
	}
	decl, binding := s.quotaDecl(pluginKey, accountType)
	if decl == nil {
		return nil
	}
	var next *time.Time
	if res.GetNextCheckAtUnix() > 0 {
		value := quotaNextCheck(time.Now(), res, 0, false)
		next = &value
	}
	applied, err := s.applyQuotaObservation(ctx, id, expectedGeneration, binding, windows, next)
	if err != nil || !applied {
		return err
	}
	s.evictQuotaCache(ctx, id)
	s.changed(ctx, id)
	return nil
}

func (s *Service) applyQuotaObservation(ctx context.Context, id, generation int64, binding core.AccountTypeBinding, windows map[string]store.QuotaWindow, next *time.Time) (bool, error) {
	if s.quota != nil {
		s.quota.writeMu.Lock()
		defer s.quota.writeMu.Unlock()
		s.quota.mu.Lock()
		defer s.quota.mu.Unlock()
	}
	applied, err := s.d.DB.ApplyAccountQuotaObservation(ctx, id, generation, binding.Plugin.Key, binding.Type.ID, binding.Plugin.Version, windows, next)
	if err != nil || !applied || s.quota == nil {
		return applied, err
	}
	if entry := s.quota.entries[id]; entry != nil {
		for key, window := range windows {
			delete(entry.pending, key)
			entry.status[key] = window.Status
		}
		if len(entry.pending) == 0 {
			entry.pending = nil
		}
	}
	return true, nil
}

var _ core.AccountQuotaSource = (*Service)(nil)
