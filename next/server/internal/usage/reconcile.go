package usage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/netguard"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usagerules"
)

// The reconcile loop closes pre-charged usage rows (CONTRACTS §25.4).
//
// It is GENERIC. It knows nothing about tasks, videos or jobs: it knows that
// pending_settlements holds entries, that some of them are due, and that the
// plugin named on each one can describe a request that answers "is it done
// yet?". Everything domain-specific is on the plugin's side of two rpcs.
//
// Three properties are the design and must survive editing:
//
//  1. THE CORE SENDS THE REQUEST. The plugin only builds it and parses the
//     answer. That is what lets the core hand it the account with its
//     credentials (exactly as BuildUpstreamRequest already does) while the
//     plugin needs no "net" permission, no way to enumerate accounts and no
//     scheduler of its own. Collapsing the two rpcs into one "go and check"
//     call would require opening all three.
//
//  2. ONE NODE AT A TIME, AND NEVER FOREVER. A cluster lock keeps the sweep
//     to one node; on top of it every claimed entry is LEASED (its
//     next_check_at is pushed forward before any plugin is called), so a node
//     that dies mid-sweep costs one lease, not a stuck entry. The sweep has a
//     hard budget and the entries of different plugins are interleaved across
//     a small worker pool, so one plugin that answers slowly delays its own
//     entries and not the loop.
//
//  3. GIVING UP DOES NOT REFUND, AND MUST NOT WRITE 'failed'. See abandon().

const (
	// reconcileLockKey is the cluster lock the sweep holds.
	reconcileLockKey = "usage:reconcile"
	// reconcileInterval is how often a node looks for due entries.
	reconcileInterval = 10 * time.Second
	// reconcileBatch is how many entries one sweep claims.
	reconcileBatch = 100
	// reconcileWorkers process the claimed entries in parallel.
	reconcileWorkers = 4
	// reconcileLease hides a claimed entry from other sweeps while it is
	// being worked on. It is longer than the per-entry budget so a live node
	// always finishes before the lease lapses, and short enough that a dead
	// one is forgiven quickly.
	reconcileLease = 3 * time.Minute
	// reconcileLockTTL outlives a whole sweep; a node that dies holding it
	// blocks the loop for at most this long.
	reconcileLockTTL = 5 * time.Minute
	// reconcileSweepBudget bounds one sweep. Whatever is not reached stays
	// due (its lease lapses) and is picked up next time, in order.
	reconcileSweepBudget = 2 * time.Minute
	// reconcileEntryBudget bounds one entry end to end: two plugin calls and
	// one upstream request.
	reconcileEntryBudget = 30 * time.Second
	// reconcileHTTPTimeout bounds the upstream request itself.
	reconcileHTTPTimeout = 20 * time.Second
	// maxReconcileBody is how much of the upstream answer the plugin is
	// shown. A status document is small; anything larger is not one.
	maxReconcileBody = 256 << 10
)

// ReconcileDeps are what the loop needs beyond the settler itself. The loop
// does not run until StartReconcile is called with all of them.
type ReconcileDeps struct {
	// Locker keeps the sweep to one node (cluster.Locker).
	Locker core.Locker
	// Registry resolves the plugin named on an entry to its PlatformService.
	Registry core.PluginRegistry
	// Accounts loads the account that served the original request, with its
	// credentials - the same account the plugin already saw when it built the
	// upstream request.
	Accounts core.AccountDirectory
	// Proxies gives the account's HTTP client, so a reconcile leaves the
	// deployment by the same route the request did.
	Proxies core.ProxyDirectory
	// AllowPrivateUpstream mirrors the gateway's setting for the SSRF guard.
	AllowPrivateUpstream bool
	NodeID               string
	Logger               *slog.Logger
	// Interval overrides reconcileInterval (tests).
	Interval time.Duration
}

type reconciler struct {
	ReconcileDeps
	log *slog.Logger
}

// StartReconcile starts the reconcile loop, which runs until Stop. It is a
// no-op when a dependency is missing: a deployment without a locker or a
// plugin registry has no pre-charged rows to close either.
func (s *Service) StartReconcile(ctx context.Context, d ReconcileDeps) {
	if d.Locker == nil || d.Registry == nil || d.Accounts == nil || d.Proxies == nil {
		return
	}
	if d.Logger == nil {
		d.Logger = slog.Default()
	}
	if d.Interval <= 0 {
		d.Interval = reconcileInterval
	}
	s.mu.Lock()
	if s.rec != nil {
		s.mu.Unlock()
		return
	}
	s.rec = &reconciler{ReconcileDeps: d, log: d.Logger.With("component", "reconcile", "node", d.NodeID)}
	ctx, s.recStop = context.WithCancel(context.WithoutCancel(ctx))
	s.mu.Unlock()
	s.wg.Go(func() { s.reconcileLoop(ctx) })
}

func (s *Service) reconcileLoop(ctx context.Context) {
	t := time.NewTicker(s.rec.Interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			s.ReconcileDue(ctx)
		}
	}
}

// ---------------------------------------------------------------- the sweep

// settleEntry is one claimed row of pending_settlements.
type settleEntry struct {
	id         int64
	pluginKey  string
	refID      string
	usageLogID int64
	accountID  *int64
	attempts   int
	createdAt  time.Time
	deadlineAt time.Time
}

// ReconcileDue runs one sweep: claim the due entries and work through them.
// It returns how many entries it claimed (0 when another node holds the
// lock), which is what the tests assert on.
func (s *Service) ReconcileDue(ctx context.Context) int {
	r := s.rec
	if r == nil {
		return 0
	}
	// One node at a time. This is not the only guard - every claimed entry is
	// leased below - but it keeps N nodes from each taking a slice of the
	// same due set and calling N plugins at once every ten seconds.
	release, ok, err := r.Locker.TryLock(ctx, reconcileLockKey, reconcileLockTTL)
	if err != nil {
		if ctx.Err() == nil {
			r.log.Warn("reconcile lock failed", "err", err)
		}
		return 0
	}
	if !ok {
		return 0
	}
	defer release()

	ctx, cancel := context.WithTimeout(ctx, reconcileSweepBudget)
	defer cancel()
	entries, err := s.claimDue(ctx, reconcileBatch)
	if err != nil {
		r.log.Error("reconcile: claim due entries", "err", err)
		return 0
	}
	if len(entries) == 0 {
		return 0
	}
	var abandoned atomic.Int64
	ch := make(chan *settleEntry)
	var wg sync.WaitGroup
	for range reconcileWorkers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for e := range ch {
				if s.reconcileOne(ctx, e) {
					abandoned.Add(1)
				}
			}
		}()
	}
	for _, e := range interleaveByPlugin(entries) {
		select {
		case ch <- e:
		case <-ctx.Done():
		}
	}
	close(ch)
	wg.Wait()
	// Abandoning is the outcome an operator has to know about: money was
	// kept on an estimate nobody could confirm.
	if n := abandoned.Load(); n > 0 {
		r.log.Error("reconcile: gave up on pre-charged entries; the estimate stands as the final charge",
			"entries", n, "of", len(entries))
	}
	return len(entries)
}

// claimDue takes the next due entries AND leases them in one statement: their
// next_check_at moves forward before any plugin is called, so a node that
// dies halfway through a sweep loses a lease rather than wedging an entry,
// and a second node cannot pick up what this one is already holding.
func (s *Service) claimDue(ctx context.Context, limit int) ([]*settleEntry, error) {
	rows, err := s.db.Pool.Query(ctx, `
		UPDATE pending_settlements p
		SET next_check_at = now() + make_interval(secs => $2)
		FROM (
			SELECT id FROM pending_settlements
			WHERE state = 'pending' AND next_check_at <= now()
			ORDER BY next_check_at
			LIMIT $1
			FOR UPDATE SKIP LOCKED
		) due
		WHERE p.id = due.id
		RETURNING p.id, p.plugin_key, p.ref_id, p.usage_log_id, p.account_id, p.attempts, p.created_at, p.deadline_at`,
		limit, reconcileLease.Seconds())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*settleEntry
	for rows.Next() {
		e := &settleEntry{}
		if err := rows.Scan(&e.id, &e.pluginKey, &e.refID, &e.usageLogID, &e.accountID, &e.attempts,
			&e.createdAt, &e.deadlineAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// interleaveByPlugin round-robins the entries across their plugins. With
// four workers and a hundred entries of one slow plugin followed by one entry
// of a fast one, a plain ordering would leave the fast one waiting behind the
// whole slow batch; interleaved, it is reached in the first few rounds. The
// slow plugin still pays for being slow - in its own entries' latency - which
// is the only place that cost belongs.
func interleaveByPlugin(entries []*settleEntry) []*settleEntry {
	byPlugin := map[string][]*settleEntry{}
	var order []string
	for _, e := range entries {
		if _, ok := byPlugin[e.pluginKey]; !ok {
			order = append(order, e.pluginKey)
		}
		byPlugin[e.pluginKey] = append(byPlugin[e.pluginKey], e)
	}
	if len(order) < 2 {
		return entries
	}
	out := make([]*settleEntry, 0, len(entries))
	for len(out) < len(entries) {
		for _, k := range order {
			if q := byPlugin[k]; len(q) > 0 {
				out = append(out, q[0])
				byPlugin[k] = q[1:]
			}
		}
	}
	return out
}

// ---------------------------------------------------------------- one entry

// reservedRowState is the usage row an entry belongs to.
type reservedRowState struct {
	p         *pending
	status    string
	totalCost decimal.Decimal
}

// reconcileOne checks one entry and applies the outcome. It reports whether
// the entry was abandoned.
func (s *Service) reconcileOne(ctx context.Context, e *settleEntry) bool {
	r := s.rec
	ctx, cancel := context.WithTimeout(ctx, reconcileEntryBudget)
	defer cancel()

	row, err := s.loadReserved(ctx, e.usageLogID)
	if err != nil {
		r.log.Error("reconcile: load usage row", "entry", e.id, "usage_log_id", e.usageLogID, "err", err)
		return false
	}
	if row.status != StatusReserved {
		// A human already refunded or re-billed this row, or another node
		// finished it. Close the entry rather than fight over it.
		s.closeEntry(ctx, e, SettleStateSettled, "usage row left the reserved state")
		return false
	}

	cfg := s.reconcileSettings(ctx)
	now := time.Now()
	switch {
	case !now.Before(e.deadlineAt):
		s.abandon(ctx, e, row, fmt.Sprintf("deadline %s passed", e.deadlineAt.UTC().Format(time.RFC3339)))
		return true
	case e.attempts >= cfg.maxAttempts:
		s.abandon(ctx, e, row, fmt.Sprintf("gave up after %d checks", e.attempts))
		return true
	}

	res, err := s.askPlugin(ctx, e, row)
	if err != nil {
		// Nothing was learned. Count the attempt and come back: a plugin
		// that is down during a rollout must not cost anyone a refund, and
		// the deadline is what eventually stops this.
		s.reschedule(ctx, e, cfg, 0, err.Error())
		return false
	}
	switch res.GetState() {
	case pluginv1.ReconcileResult_SETTLED:
		s.settleReconciled(ctx, e, row, res)
	case pluginv1.ReconcileResult_SETTLED_ESTIMATE:
		s.settleEstimate(ctx, e, row, res)
	case pluginv1.ReconcileResult_FAILED:
		s.refundFailed(ctx, e, row, res.GetReason())
	default:
		// PENDING is the zero value on purpose: a plugin that cannot tell
		// yet, and an empty answer, both mean "ask again" - never "settle
		// for nothing".
		s.reschedule(ctx, e, cfg, time.Duration(res.GetNextCheckAfterSec())*time.Second, "")
	}
	return false
}

// askPlugin runs the two rpcs with the upstream request in between.
func (s *Service) askPlugin(ctx context.Context, e *settleEntry, row *reservedRowState) (*pluginv1.ReconcileResult, error) {
	r := s.rec
	gen := r.Registry.Current()
	if gen == nil {
		return nil, errors.New("no plugin generation loaded")
	}
	client := platformClientOf(gen, e.pluginKey)
	if client == nil {
		return nil, fmt.Errorf("plugin %q has no platform service", e.pluginKey)
	}
	acct, proxyID := s.reconcileAccount(ctx, e)
	entry := &pluginv1.ReconcileEntry{
		RefId: e.refID, RequestId: row.p.RequestID, Attempts: int32(e.attempts),
		CreatedAtUnix: e.createdAt.Unix(), DeadlineAtUnix: e.deadlineAt.Unix(),
	}
	built, err := client.BuildReconcileRequest(ctx, &pluginv1.BuildReconcileRequestRequest{Entry: entry, Account: acct})
	if err != nil {
		return nil, fmt.Errorf("BuildReconcileRequest: %w", err)
	}
	if built == nil {
		return nil, errors.New("BuildReconcileRequest returned nothing")
	}
	status, headers, body, transportErr := s.fetchReconcile(ctx, built, proxyID)
	res, err := client.ParseReconcileResponse(ctx, &pluginv1.ParseReconcileResponseRequest{
		Entry: entry, Account: acct, Status: int32(status), Headers: headers,
		Body: body, TransportError: transportErr,
	})
	if err != nil {
		return nil, fmt.Errorf("ParseReconcileResponse: %w", err)
	}
	if res == nil {
		return nil, errors.New("ParseReconcileResponse returned nothing")
	}
	return res, nil
}

// platformClientOf finds the PlatformService of the plugin that declared the
// platform whose ExtractUsage made the reservation.
func platformClientOf(gen core.Generation, pluginKey string) core.PlatformPlugin {
	for _, pb := range gen.Platforms() {
		if pb.Plugin.Key == pluginKey && pb.Client != nil {
			return pb.Client
		}
	}
	return nil
}

// reconcileAccount loads the account that served the original request.
//
// Credentials travel ONLY when the account's type is declared by the plugin
// being called. That is the same rule ExtractUsage uses for settings, and it
// has the same justification: such a plugin already receives these exact
// credentials on every BuildUpstreamRequest for this account, so nothing new
// is exposed - while a platform plugin that does not own the account type
// would be seeing a third party's secret for the first time, which is not a
// decision a reconcile loop gets to make.
func (s *Service) reconcileAccount(ctx context.Context, e *settleEntry) (*pluginv1.Account, *int64) {
	if e.accountID == nil {
		return nil, nil
	}
	acc, err := s.rec.Accounts.Load(ctx, *e.accountID)
	if err != nil || acc == nil {
		s.rec.log.Warn("reconcile: account unavailable", "entry", e.id, "account_id", *e.accountID, "err", err)
		return nil, nil
	}
	out := &pluginv1.Account{Id: acc.ID, Name: acc.Name, Type: acc.Type}
	if acc.PluginKey == e.pluginKey {
		out.CredentialsJson = string(acc.Credentials)
		out.SettingsJson = string(acc.Settings)
	}
	return out, acc.ProxyID
}

// fetchReconcile sends the request the plugin described, through the
// account's proxy and behind the same SSRF guard the gateway applies. A
// failure is not an error here: the plugin is shown the transport error and
// decides what it means, exactly as ClassifyError is shown one.
func (s *Service) fetchReconcile(ctx context.Context, b *pluginv1.BuildReconcileRequestResponse, proxyID *int64) (int, map[string]string, []byte, string) {
	u, err := netguard.CheckURL(ctx, b.GetUrl(), s.rec.AllowPrivateUpstream, netguard.DefaultLookup)
	if err != nil {
		return 0, nil, nil, err.Error()
	}
	method := strings.ToUpper(strings.TrimSpace(b.GetMethod()))
	if method == "" {
		method = http.MethodGet
	}
	var body io.Reader
	if b.GetBodyJson() != "" {
		body = strings.NewReader(b.GetBodyJson())
	}
	ctx, cancel := context.WithTimeout(ctx, reconcileHTTPTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, method, u.String(), body)
	if err != nil {
		return 0, nil, nil, err.Error()
	}
	for k, v := range b.GetHeaders() {
		req.Header.Set(k, v)
	}
	if body != nil && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}
	hc, err := s.rec.Proxies.HTTPClient(ctx, proxyID)
	if err != nil {
		return 0, nil, nil, err.Error()
	}
	resp, err := hc.Do(req)
	if err != nil {
		// The URL may carry the credential (a "?key=..." style API), so the
		// address is reported without query or fragment.
		return 0, nil, nil, "reconcile request to " + u.Scheme + "://" + u.Host + u.Path + " failed: " + err.Error()
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, maxReconcileBody))
	headers := make(map[string]string, len(resp.Header))
	for k, v := range resp.Header {
		if len(v) > 0 {
			headers[strings.ToLower(k)] = v[0]
		}
	}
	return resp.StatusCode, headers, raw, ""
}

// ---------------------------------------------------------------- outcomes

// bookkeeping returns the context the outcome writes run under: a fresh one
// with its own short deadline, NOT the entry budget.
//
// The entry budget bounds the plugin calls and the upstream request, and a
// plugin that used all of it would otherwise take the bookkeeping down with
// it - losing an abandon (the entry sits leased and is reconsidered later,
// which is harmless) or, worse, losing the record of a settle whose ledger
// row the same transaction would have rolled back anyway. Writing the outcome
// is not the part that is allowed to be slow.
func bookkeeping(ctx context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.WithoutCancel(ctx), 15*time.Second)
}

// reschedule counts the attempt and puts the entry back in the queue. want is
// the plugin's own suggestion, 0 when it made none.
func (s *Service) reschedule(ctx context.Context, e *settleEntry, cfg resolved, want time.Duration, lastErr string) {
	ctx, cancel := bookkeeping(ctx)
	defer cancel()
	next := time.Now().Add(cfg.clampDelay(want, e.attempts+1))
	if next.After(e.deadlineAt) {
		// One last attempt exactly at the deadline rather than one fewer.
		next = e.deadlineAt
	}
	_, err := s.db.Pool.Exec(ctx, `
		UPDATE pending_settlements SET attempts = attempts + 1, next_check_at = $2, last_error = $3
		WHERE id = $1 AND state = 'pending'`, e.id, next, trunc(lastErr, 2000))
	if err != nil {
		s.rec.log.Error("reconcile: reschedule", "entry", e.id, "err", err)
		return
	}
	if lastErr != "" {
		s.rec.log.Warn("reconcile: check failed, will retry", "entry", e.id, "plugin", e.pluginKey,
			"ref_id", e.refID, "attempts", e.attempts+1, "next_check_at", next, "err", lastErr)
	}
}

// closeEntry marks an entry done without touching money.
func (s *Service) closeEntry(ctx context.Context, e *settleEntry, state, note string) {
	ctx, cancel := bookkeeping(ctx)
	defer cancel()
	_, err := s.db.Pool.Exec(ctx, `UPDATE pending_settlements SET state = $2, last_error = $3 WHERE id = $1`,
		e.id, state, trunc(note, 2000))
	if err != nil {
		s.rec.log.Error("reconcile: close entry", "entry", e.id, "err", err)
	}
}

// settleReconciled replaces the estimate with the real usage: the row is
// repriced, the difference is charged or refunded, and the row becomes an
// ordinary billed one.
func (s *Service) settleReconciled(ctx context.Context, e *settleEntry, row *reservedRowState, res *pluginv1.ReconcileResult) {
	p := row.p
	t := res.GetTokens()
	p.Tokens = usagerules.Tokens(t.GetInputTokens(), t.GetOutputTokens(), t.GetCacheReadTokens(),
		t.GetCacheCreationTokens(), t.GetCacheCreation_1HTokens())
	if m := s.reconciledFacts(ctx, e, p, res.GetFacts()); m != nil {
		p.Metrics = m
	}
	total, detail, exprHash, err := priceOf(p)
	if err != nil {
		s.rec.log.Error("reconcile: price the real usage", "entry", e.id, "err", err)
		s.reschedule(ctx, e, s.reconcileSettings(ctx), 0, "pricing failed: "+err.Error())
		return
	}
	diff := total.Sub(row.totalCost)
	var ledgerRes *core.LedgerResult
	ctx, cancel := bookkeeping(ctx)
	defer cancel()
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		var status string
		if err := tx.QueryRow(ctx, `SELECT billing_status FROM usage_logs WHERE id = $1 FOR UPDATE`, e.usageLogID).Scan(&status); err != nil {
			return err
		}
		if status != StatusReserved {
			return errNotPending
		}
		switch {
		case diff.Sign() > 0:
			// The estimate was short. The base amount already went through
			// "usage:{request_id}"; this is its own key so the two can never
			// cancel each other out.
			ledgerRes, err = s.ledger.ApplyTx(ctx, tx, core.LedgerChange{
				UserID: p.UserID, Amount: diff, Credit: false, Kind: "usage",
				RefType: "usage", RefID: p.RequestID, IdempotencyKey: "usage:" + p.RequestID + ":reconcile",
				Note: "reconciled: real usage exceeded the reservation",
			})
		case diff.Sign() < 0:
			ledgerRes, err = s.ledger.ApplyTx(ctx, tx, core.LedgerChange{
				UserID: p.UserID, Amount: diff.Neg(), Credit: true, Kind: "refund",
				RefType: "usage", RefID: p.RequestID, IdempotencyKey: "refund:" + p.RequestID + ":reconcile",
				Note: "reconciled: real usage was below the reservation",
			})
		}
		if err != nil {
			return fmt.Errorf("ledger: %w", err)
		}
		if ledgerRes != nil {
			detail.LedgerID = &ledgerRes.LedgerID
		}
		tk := p.Tokens
		if _, err := tx.Exec(ctx, `
			UPDATE usage_logs SET input_tokens = $2, output_tokens = $3, cache_read_tokens = $4,
				cache_creation_tokens = $5, cache_creation_1h_tokens = $6, metrics = $7,
				total_cost = $8, billing_status = 'billed', billing_detail = $9, matched_tier = $10, expr_hash = $11
			WHERE id = $1`,
			e.usageLogID, tk.Input, tk.Output, tk.CacheRead, tk.CacheCreation, tk.CacheCreation1h,
			jsonOr(p.Metrics, "{}"), total, jsonOr(detail, "{}"), trunc(detail.Tier, 100), exprHash); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE pending_settlements SET state = $2, attempts = attempts + 1, last_error = ''
			WHERE id = $1`, e.id, SettleStateSettled); err != nil {
			return err
		}
		if s.events != nil {
			return s.events.Emit(ctx, tx, recordedEvent(p, total, StatusBilled))
		}
		return nil
	})
	if errors.Is(err, errNotPending) {
		return
	}
	if err != nil {
		s.rec.log.Error("reconcile: settle", "entry", e.id, "request_id", p.RequestID, "err", err)
		return
	}
	if ledgerRes != nil && !ledgerRes.Duplicate {
		s.ledger.CacheBalance(ctx, p.UserID, ledgerRes.LedgerID, ledgerRes.BalanceAfter)
	}
	s.rec.log.Info("reconcile: settled", "entry", e.id, "request_id", p.RequestID, "plugin", e.pluginKey,
		"ref_id", e.refID, "reserved", row.totalCost.String(), "final", total.String())
}

// refundFailed gives the whole reservation back: the upstream says the work
// produced nothing, so there is nothing to bill for.
func (s *Service) refundFailed(ctx context.Context, e *settleEntry, row *reservedRowState, reason string) {
	p := row.p
	var ledgerRes *core.LedgerResult
	ctx, cancel := bookkeeping(ctx)
	defer cancel()
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var status string
		if err := tx.QueryRow(ctx, `SELECT billing_status FROM usage_logs WHERE id = $1 FOR UPDATE`, e.usageLogID).Scan(&status); err != nil {
			return err
		}
		if status != StatusReserved {
			return errNotPending
		}
		if row.totalCost.Sign() > 0 {
			var err error
			ledgerRes, err = s.ledger.ApplyTx(ctx, tx, core.LedgerChange{
				UserID: p.UserID, Amount: row.totalCost, Credit: true, Kind: "refund",
				RefType: "usage", RefID: p.RequestID, IdempotencyKey: "refund:" + p.RequestID + ":reconcile",
				Note: "reconciled: the upstream work failed",
			})
			if err != nil {
				return fmt.Errorf("ledger: %w", err)
			}
		}
		// 'free' is the honest status: nothing was delivered, nothing is
		// owed. It is also not in usage_logs_billing_pending_idx, so the
		// settlement retry loop will not pick the row up and bill it again.
		if _, err := tx.Exec(ctx, `
			UPDATE usage_logs SET total_cost = 0, billing_status = 'free', success = false,
				error_type = $2, error_message = $3
			WHERE id = $1`, e.usageLogID, trunc(reason, 50), trunc(reason, 1000)); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE pending_settlements SET state = $2, attempts = attempts + 1, last_error = $3
			WHERE id = $1`, e.id, SettleStateFailed, trunc(reason, 2000)); err != nil {
			return err
		}
		p.Success, p.ErrorType = false, trunc(reason, 50)
		if s.events != nil {
			return s.events.Emit(ctx, tx, recordedEvent(p, decimal.Zero, StatusFree))
		}
		return nil
	})
	if errors.Is(err, errNotPending) {
		return
	}
	if err != nil {
		s.rec.log.Error("reconcile: refund a failed entry", "entry", e.id, "request_id", p.RequestID, "err", err)
		return
	}
	if ledgerRes != nil && !ledgerRes.Duplicate {
		s.ledger.CacheBalance(ctx, p.UserID, ledgerRes.LedgerID, ledgerRes.BalanceAfter)
	}
	s.rec.log.Info("reconcile: upstream work failed, reservation refunded", "entry", e.id,
		"request_id", p.RequestID, "refunded", row.totalCost.String(), "reason", reason)
}

// abandon stops asking. The reservation becomes the final charge: the call
// really was made, the upstream really started the work, and making the
// platform eat a cost that was genuinely incurred because the upstream never
// answered a status query is the wrong default. A human can still reverse it
// (POST /usage/:id/refund). The write itself, and why it must say 'billed',
// is keepEstimate.
func (s *Service) abandon(ctx context.Context, e *settleEntry, row *reservedRowState, reason string) {
	marker := map[string]string{
		core.AnomalyReconcile:         core.ReconcileAbandoned,
		core.AnomalyReconcileAttempts: strconv.Itoa(e.attempts),
		core.AnomalyReconcileError:    trunc(reason, 500),
	}
	if !s.keepEstimate(ctx, e, row, SettleStateAbandoned, marker, reason, false) {
		return
	}
	s.rec.log.Error("reconcile: gave up on a pre-charged entry; the estimate is now the final charge",
		"entry", e.id, "request_id", row.p.RequestID, "plugin", e.pluginKey, "ref_id", e.refID,
		"attempts", e.attempts, "charged", row.totalCost.String(), "reason", reason)
}

// settleEstimate closes an entry the plugin answered SETTLED_ESTIMATE to: the
// work finished, the upstream reported no usage for it, the estimate is the
// final charge (CONTRACTS §25.5 gap 2).
//
// It is the same ledger outcome as abandon - nothing moves, the row becomes
// 'billed' at the reservation - reached for the opposite reason: not "nobody
// could confirm the work" but "the work is confirmed and there is no figure
// to replace the estimate with". The row says which. usage_logs.anomalies
// carries reconcile=estimated rather than abandoned, and the entry closes as
// 'estimated' rather than 'abandoned', so a revenue summary counts both as
// estimates while an operator reading either row is not told the wrong story.
//
// Before this state existed a plugin in this position had two answers, both
// wrong: SETTLED with zero tokens refunded the whole reservation for a job
// that was delivered, and keeping its own table of estimates to answer
// SETTLED from meant every reserving plugin rebuilding what the core already
// holds on the row.
func (s *Service) settleEstimate(ctx context.Context, e *settleEntry, row *reservedRowState, res *pluginv1.ReconcileResult) {
	if t := res.GetTokens(); t.GetInputTokens() != 0 || t.GetOutputTokens() != 0 || t.GetCacheReadTokens() != 0 ||
		t.GetCacheCreationTokens() != 0 || t.GetCacheCreation_1HTokens() != 0 || len(res.GetFacts()) > 0 {
		// Not an error, but a plugin that has real figures should answer
		// SETTLED with them; ignoring what it sent is the contract, saying so
		// is what keeps the contract from being a surprise.
		s.rec.log.Warn("reconcile: SETTLED_ESTIMATE carried tokens or facts; they are ignored, the estimate stands",
			"entry", e.id, "plugin", e.pluginKey, "ref_id", e.refID)
	}
	reason := res.GetReason()
	marker := map[string]string{
		core.AnomalyReconcile:         core.ReconcileEstimated,
		core.AnomalyReconcileAttempts: strconv.Itoa(e.attempts + 1),
	}
	if reason != "" {
		marker[core.AnomalyReconcileError] = trunc(reason, 500)
	}
	if !s.keepEstimate(ctx, e, row, SettleStateEstimated, marker, reason, true) {
		return
	}
	s.rec.log.Info("reconcile: upstream confirmed the work without a usage figure; the estimate is the final charge",
		"entry", e.id, "request_id", row.p.RequestID, "plugin", e.pluginKey, "ref_id", e.refID,
		"charged", row.totalCost.String(), "note", reason)
}

// keepEstimate is the one write that turns a reserved row into a final billed
// one WITHOUT moving money: the reservation is the charge. abandon and
// settleEstimate both end here; marker is what they disagree about. It
// reports whether the row was closed by this call (false when another actor
// got there first, or on a database error, both already logged as needed).
//
// THE STATUS MUST BE 'billed'. Not 'failed', which reads more naturally and
// is a duplicate charge:
//
//	CREATE INDEX usage_logs_billing_pending_idx ON usage_logs (id)
//	  WHERE billing_status IN ('pending', 'failed');
//
// That index is how the settlement retry loop finds work. The money for this
// row already left the balance when the reservation was charged; putting the
// row back into that index would have the retry loop price it again and take
// the amount a second time - silently, minutes later, on a row nobody is
// looking at. 'billed' is not a euphemism here, it is the truth: an amount
// was computed, charged, and is final.
func (s *Service) keepEstimate(ctx context.Context, e *settleEntry, row *reservedRowState, entryState string,
	marker map[string]string, note string, countAttempt bool) bool {
	p := row.p
	mk, _ := json.Marshal(marker)
	ctx, cancel := bookkeeping(ctx)
	defer cancel()
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var status string
		if err := tx.QueryRow(ctx, `SELECT billing_status FROM usage_logs WHERE id = $1 FOR UPDATE`, e.usageLogID).Scan(&status); err != nil {
			return err
		}
		if status != StatusReserved {
			return errNotPending
		}
		if _, err := tx.Exec(ctx, `
			UPDATE usage_logs SET billing_status = 'billed', anomalies = anomalies || $2::jsonb
			WHERE id = $1`, e.usageLogID, mk); err != nil {
			return err
		}
		attempts := "attempts"
		if countAttempt {
			attempts = "attempts + 1"
		}
		if _, err := tx.Exec(ctx, `UPDATE pending_settlements SET state = $2, last_error = $3, attempts = `+attempts+`
			WHERE id = $1`, e.id, entryState, trunc(note, 2000)); err != nil {
			return err
		}
		if s.events != nil {
			return s.events.Emit(ctx, tx, recordedEvent(p, row.totalCost, StatusBilled))
		}
		return nil
	})
	if errors.Is(err, errNotPending) {
		return false
	}
	if err != nil {
		s.rec.log.Error("reconcile: close at the estimate", "entry", e.id, "request_id", p.RequestID,
			"state", entryState, "err", err)
		return false
	}
	return true
}

// ---------------------------------------------------------------- helpers

// loadReserved reads everything needed to reprice and close one usage row.
func (s *Service) loadReserved(ctx context.Context, usageLogID int64) (*reservedRowState, error) {
	p := &pending{}
	st := &reservedRowState{p: p}
	var metrics, detail []byte
	err := s.db.Pool.QueryRow(ctx, `
		SELECT u.request_id, u.user_id, u.api_key_id, u.group_id, u.account_id, u.plugin_key, u.platform,
		       u.protocol, u.account_type, u.upstream_protocol, u.model, u.success, u.status_code, u.error_type,
		       u.input_tokens, u.output_tokens, u.cache_read_tokens, u.cache_creation_tokens,
		       u.cache_creation_1h_tokens, u.metrics, u.latency_ms, u.created_at, u.rate_multiplier,
		       COALESCE(u.price_id, 0), u.billing_mode, u.billing_detail, u.billing_status, u.total_cost,
		       COALESCE(h.expression, mp.expression, '')
		FROM usage_logs u
		LEFT JOIN model_price_history h ON h.expr_hash = u.expr_hash
		LEFT JOIN model_prices mp ON mp.id = u.price_id AND h.expr_hash IS NULL
		WHERE u.id = $1`, usageLogID).
		Scan(&p.RequestID, &p.UserID, &p.APIKeyID, &p.GroupID, &p.AccountID, &p.PluginKey, &p.Platform,
			&p.Protocol, &p.AccountType, &p.UpstreamProtocol, &p.Model, &p.Success, &p.StatusCode, &p.ErrorType,
			&p.Tokens.Input, &p.Tokens.Output, &p.Tokens.CacheRead, &p.Tokens.CacheCreation,
			&p.Tokens.CacheCreation1h, &metrics, &p.LatencyMs, &p.CreatedAt, &p.Rate,
			&p.PriceID, &p.Mode, &detail, &st.status, &st.totalCost, &p.Expression)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(metrics, &p.Metrics)
	var pd pendingDetail
	_ = json.Unmarshal(detail, &pd)
	p.Inputs, p.Attempts = pd.Inputs, pd.Attempts
	return st, nil
}

// reconciledFacts types the facts the plugin reported for the real usage
// against the same manifest declarations the gateway checks a live report
// against (CONTRACTS §25.3): only declared keys survive, and only values that
// fit the declared type. Returns nil when nothing could be resolved, in which
// case the estimate's metrics stand.
func (s *Service) reconciledFacts(ctx context.Context, e *settleEntry, p *pending, facts map[string]string) map[string]any {
	if len(facts) == 0 {
		return nil
	}
	rules, ok := s.usageRulesFor(p)
	if !ok {
		s.rec.log.Warn("reconcile: cannot resolve the usage facts of this protocol, keeping the estimate's metrics",
			"entry", e.id, "protocol", p.UpstreamProtocol)
		return nil
	}
	out := make(map[string]any, len(facts))
	for key, raw := range facts {
		f, ok := rules.Facts[key]
		if !ok {
			s.rec.log.Warn("reconcile: plugin reported an undeclared usage fact, dropped",
				"entry", e.id, "plugin", e.pluginKey, "fact", key)
			continue
		}
		v, ok := usagerules.Fact(f, raw)
		if !ok {
			s.rec.log.Warn("reconcile: plugin reported a usage fact that does not fit its declared type, dropped",
				"entry", e.id, "plugin", e.pluginKey, "fact", key, "type", f.Type)
			continue
		}
		out[key] = v
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// usageRulesFor resolves the usage rules of the row's upstream protocol, the
// same way the gateway and the console account test do (usagerules.For): the
// account type's per-protocol override, else the endpoint, else the platform.
func (s *Service) usageRulesFor(p *pending) (manifest.UsageRules, bool) {
	gen := s.rec.Registry.Current()
	if gen == nil || p.UpstreamProtocol == "" {
		return manifest.UsageRules{}, false
	}
	pb, ok := gen.PlatformForProtocol(p.UpstreamProtocol)
	if !ok {
		return manifest.UsageRules{}, false
	}
	var ap manifest.AccountPlatform
	if bt, ok := gen.AccountType(p.PluginKey, p.AccountType); ok {
		ap, _ = bt.Supports(pb.Platform.ID)
	}
	var ep *manifest.Endpoint
	for i := range pb.Platform.Endpoints {
		if pb.Platform.Endpoints[i].Protocol == p.UpstreamProtocol {
			ep = &pb.Platform.Endpoints[i]
			break
		}
	}
	return usagerules.For(ap, ep, &pb.Platform, p.UpstreamProtocol), true
}
