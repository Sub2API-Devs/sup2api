// Package usage persists gateway usage records, settles their cost through
// the ledger and serves the usage console API.
package usage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Billing statuses of usage_logs.
const (
	StatusPending = "pending"
	StatusBilled  = "billed"
	StatusFailed  = "failed"
	StatusFree    = "free"
)

// TxLedger is the transactional ledger used for settlement. The billing
// module's *billing.Service implements it; core.Ledger alone is not enough
// because the ledger row and the usage row must commit together.
type TxLedger interface {
	ApplyTx(ctx context.Context, tx pgx.Tx, ch core.LedgerChange) (*core.LedgerResult, error)
	// CacheBalance refreshes the balance cache after commit.
	CacheBalance(ctx context.Context, userID, ledgerID int64, balance decimal.Decimal)
}

// Options tune the settler; zero values take defaults.
type Options struct {
	QueueSize     int           // default 10000
	Workers       int           // default 4
	BatchSize     int           // default 200
	FlushInterval time.Duration // default 200ms
	RetryInterval time.Duration // default 30s
	RetryAfter    time.Duration // default 1m: only retry rows older than this
	MaxAttempts   int           // default 10
}

func (o *Options) defaults() {
	if o.QueueSize <= 0 {
		o.QueueSize = 10000
	}
	if o.Workers <= 0 {
		o.Workers = 4
	}
	if o.BatchSize <= 0 {
		o.BatchSize = 200
	}
	if o.FlushInterval <= 0 {
		o.FlushInterval = 200 * time.Millisecond
	}
	if o.RetryInterval <= 0 {
		o.RetryInterval = 30 * time.Second
	}
	if o.RetryAfter <= 0 {
		o.RetryAfter = time.Minute
	}
	if o.MaxAttempts <= 0 {
		o.MaxAttempts = 10
	}
}

// Service implements core.Settler and the usage console API.
type Service struct {
	db     *store.DB
	ledger TxLedger
	events core.EventPublisher
	opts   Options

	queue chan *core.UsageRecord
	wg    sync.WaitGroup
	stop  context.CancelFunc
	mu    sync.Mutex
}

var _ core.Settler = (*Service)(nil)

// New builds the usage service. Call Start to run the workers.
func New(db *store.DB, ledger TxLedger, events core.EventPublisher, opts Options) *Service {
	opts.defaults()
	return &Service{db: db, ledger: ledger, events: events, opts: opts, queue: make(chan *core.UsageRecord, opts.QueueSize)}
}

// Start runs the settlement workers and the retry loop until Stop.
func (s *Service) Start(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.stop != nil {
		return
	}
	ctx, s.stop = context.WithCancel(context.WithoutCancel(ctx))
	for range s.opts.Workers {
		s.wg.Go(func() { s.worker(ctx) })
	}
	s.wg.Go(func() { s.retryLoop(ctx) })
}

// Stop drains the queue and waits for the workers (bounded by ctx).
func (s *Service) Stop(ctx context.Context) {
	s.mu.Lock()
	stop := s.stop
	s.mu.Unlock()
	if stop == nil {
		return
	}
	stop()
	done := make(chan struct{})
	go func() { s.wg.Wait(); close(done) }()
	select {
	case <-done:
	case <-ctx.Done():
		slog.Warn("usage: stop timed out", "queued", len(s.queue))
	}
}

// Submit implements core.Settler. It never blocks: when the queue is full
// the record is persisted by a separate goroutine and billed by the retry
// loop.
func (s *Service) Submit(rec *core.UsageRecord) {
	if rec == nil {
		return
	}
	select {
	case s.queue <- rec:
	default:
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			if _, err := s.insert(ctx, []*core.UsageRecord{rec}); err != nil {
				logLost(rec, err)
			}
		}()
	}
}

func (s *Service) worker(ctx context.Context) {
	batch := make([]*core.UsageRecord, 0, s.opts.BatchSize)
	for {
		batch = batch[:0]
		select {
		case rec := <-s.queue:
			batch = append(batch, rec)
		case <-ctx.Done():
			s.drain()
			return
		}
		timer := time.NewTimer(s.opts.FlushInterval)
	fill:
		for len(batch) < s.opts.BatchSize {
			select {
			case rec := <-s.queue:
				batch = append(batch, rec)
			case <-timer.C:
				break fill
			case <-ctx.Done():
				break fill
			}
		}
		timer.Stop()
		s.process(context.WithoutCancel(ctx), batch)
	}
}

// drain processes whatever is still queued at shutdown.
func (s *Service) drain() {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	for {
		batch := make([]*core.UsageRecord, 0, s.opts.BatchSize)
	fill:
		for len(batch) < s.opts.BatchSize {
			select {
			case rec := <-s.queue:
				batch = append(batch, rec)
			default:
				break fill
			}
		}
		if len(batch) == 0 {
			return
		}
		s.process(ctx, batch)
	}
}

// process persists a batch and settles its billable records.
func (s *Service) process(ctx context.Context, batch []*core.UsageRecord) {
	var inserted []*core.UsageRecord
	var err error
	for attempt, backoff := 0, 500*time.Millisecond; attempt < 3; attempt, backoff = attempt+1, backoff*2 {
		if inserted, err = s.insert(ctx, batch); err == nil {
			break
		}
		slog.Error("usage: insert batch", "records", len(batch), "attempt", attempt+1, "err", err)
		time.Sleep(backoff)
	}
	if err != nil && len(batch) > 1 {
		// Isolate bad records so one of them cannot sink the whole batch.
		inserted = inserted[:0]
		for _, rec := range batch {
			one, err := s.insert(ctx, []*core.UsageRecord{rec})
			if err != nil {
				logLost(rec, err)
				continue
			}
			inserted = append(inserted, one...)
		}
		err = nil
	}
	if err != nil {
		for _, rec := range batch {
			logLost(rec, err)
		}
		return
	}
	for _, rec := range inserted {
		if initialStatus(rec) != StatusPending {
			continue
		}
		p := fromRecord(rec)
		if err := s.settle(ctx, p, false); err != nil {
			s.markFailed(ctx, p, err)
		}
	}
}

func logLost(rec *core.UsageRecord, err error) {
	b, _ := json.Marshal(rec)
	slog.Error("usage: record lost", "request_id", rec.RequestID, "err", err, "record", string(b))
}

func initialStatus(rec *core.UsageRecord) string {
	if !rec.Billable || rec.Price == nil {
		return StatusFree
	}
	return StatusPending
}

// pendingInputs are stored in billing_detail while a record is unbilled so
// the retry loop can reproduce the calculation.
type pendingInputs struct {
	Semantics string            `json:"semantics"`
	Params    map[string]string `json:"params,omitempty"`
	Headers   map[string]string `json:"headers,omitempty"`
}

type pendingDetail struct {
	Inputs   pendingInputs `json:"inputs"`
	Attempts int           `json:"attempts"`
	Error    string        `json:"error,omitempty"`
}

func trunc(s string, n int) string {
	if len(s) <= n {
		return s
	}
	// Do not cut a UTF-8 sequence in half.
	for n > 0 && s[n]&0xC0 == 0x80 {
		n--
	}
	return s[:n]
}

func jsonOr(v any, empty string) []byte {
	b, err := json.Marshal(v)
	if err != nil || string(b) == "null" {
		return []byte(empty)
	}
	return b
}

// insert writes the batch (ignoring duplicate request ids) and emits
// usage.recorded for free records. It returns the newly inserted records.
func (s *Service) insert(ctx context.Context, batch []*core.UsageRecord) ([]*core.UsageRecord, error) {
	var inserted []*core.UsageRecord
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		inserted = inserted[:0]
		b := &pgx.Batch{}
		for _, rec := range batch {
			status := initialStatus(rec)
			var priceID *int64
			var exprHash, mode string
			detail := []byte("{}")
			if status == StatusPending {
				exprHash, mode = rec.Price.ExprHash, rec.Price.Mode
				if rec.Price.ID > 0 {
					priceID = &rec.Price.ID
				}
				if exprHash == "" {
					exprHash = expr.Hash(rec.Price.Expression)
				}
				detail = jsonOr(pendingDetail{Inputs: pendingInputs{
					Semantics: rec.UsageSemantics, Params: rec.PriceParams, Headers: rec.PriceHeaders}}, "{}")
			}
			created := rec.CreatedAt
			if created.IsZero() {
				created = time.Now()
			}
			attempts := rec.Attempts
			if attempts <= 0 {
				attempts = 1
			}
			rate := rec.RateMultiplier
			t := rec.Tokens
			b.Queue(`
				INSERT INTO usage_logs (request_id, user_id, api_key_id, group_id, account_id, plugin_key, plugin_version,
					platform, protocol, endpoint, model, upstream_model, stream, status_code, success, error_type,
					error_message, attempts, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
					cache_creation_1h_tokens, metrics, sticky_rule, sticky_hit, hook_decisions, rate_multiplier,
					price_id, expr_hash, billing_mode, billing_detail, billing_status, latency_ms, first_token_ms,
					client_ip, user_agent, node_id, created_at, account_type, upstream_protocol, client_request_id)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,
					$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42)
				ON CONFLICT (request_id) DO NOTHING
				RETURNING id`,
				trunc(rec.RequestID, 64), rec.UserID, rec.APIKeyID, rec.GroupID, rec.AccountID,
				trunc(rec.PluginKey, 30), trunc(rec.PluginVersion, 50), trunc(rec.Platform, 50),
				trunc(rec.Protocol, 100), trunc(rec.Endpoint, 200), trunc(rec.Model, 200), trunc(rec.UpstreamModel, 200),
				rec.Stream, rec.StatusCode, rec.Success, trunc(rec.ErrorType, 50), rec.ErrorMessage, attempts,
				t.Input, t.Output, t.CacheRead, t.CacheCreation, t.CacheCreation1h,
				jsonOr(rec.Metrics, "{}"), trunc(rec.StickyRule, 100), rec.StickyHit, jsonOr(rec.HookDecisions, "[]"),
				rate, priceID, exprHash, mode, detail, status, rec.LatencyMs, rec.FirstTokenMs,
				trunc(rec.ClientIP, 64), trunc(rec.UserAgent, 500), trunc(rec.NodeID, 100), created,
				trunc(rec.AccountType, 50), trunc(rec.UpstreamProtocol, 100), trunc(rec.ClientRequestID, 128))
		}
		br := tx.SendBatch(ctx, b)
		var free []core.Event
		for _, rec := range batch {
			var id int64
			err := br.QueryRow().Scan(&id)
			if store.IsNoRows(err) {
				continue // duplicate request id
			}
			if err != nil {
				_ = br.Close()
				return err
			}
			inserted = append(inserted, rec)
			if initialStatus(rec) == StatusFree {
				free = append(free, recordedEvent(fromRecord(rec), decimal.Zero, StatusFree))
			}
		}
		if err := br.Close(); err != nil {
			return err
		}
		if s.events != nil && len(free) > 0 {
			return s.events.Emit(ctx, tx, free...)
		}
		return nil
	})
	return inserted, err
}

// pending is everything needed to settle one usage row.
type pending struct {
	RequestID string
	UserID    int64
	APIKeyID  int64
	GroupID   int64
	AccountID *int64
	PluginKey string
	Platform  string
	Protocol  string
	// AccountType and UpstreamProtocol are the account type (declared by
	// PluginKey) and the protocol sent upstream (ARCHITECTURE 6.6).
	AccountType      string
	UpstreamProtocol string
	Model            string
	Success          bool
	StatusCode       int
	ErrorType        string
	Tokens           core.UsageTokens
	Metrics          map[string]any
	LatencyMs        int
	CreatedAt        time.Time
	Rate             decimal.Decimal

	PriceID    int64
	Mode       string
	Expression string
	Inputs     pendingInputs
	Attempts   int
}

func fromRecord(rec *core.UsageRecord) *pending {
	p := &pending{
		RequestID: trunc(rec.RequestID, 64), UserID: rec.UserID, APIKeyID: rec.APIKeyID, GroupID: rec.GroupID,
		AccountID: rec.AccountID, PluginKey: rec.PluginKey, Platform: rec.Platform, Protocol: rec.Protocol,
		AccountType: trunc(rec.AccountType, 50), UpstreamProtocol: trunc(rec.UpstreamProtocol, 100),
		Model: rec.Model, Success: rec.Success, StatusCode: rec.StatusCode, ErrorType: rec.ErrorType,
		Tokens: rec.Tokens, Metrics: rec.Metrics, LatencyMs: rec.LatencyMs, CreatedAt: rec.CreatedAt,
		Rate:   rec.RateMultiplier,
		Inputs: pendingInputs{Semantics: rec.UsageSemantics, Params: rec.PriceParams, Headers: rec.PriceHeaders},
	}
	if p.CreatedAt.IsZero() {
		p.CreatedAt = time.Now()
	}
	if rec.Price != nil {
		p.PriceID, p.Mode, p.Expression = rec.Price.ID, rec.Price.Mode, rec.Price.Expression
	}
	return p
}

// BillingDetail is stored in usage_logs.billing_detail once billed.
type BillingDetail struct {
	ExprVersion    int               `json:"expr_version"`
	Tier           string            `json:"tier"`
	Rules          []expr.RuleResult `json:"rules"`
	Breakdown      expr.Breakdown    `json:"breakdown"`
	Cost           decimal.Decimal   `json:"cost"` // before the group multiplier
	RateMultiplier decimal.Decimal   `json:"rate_multiplier"`
	TotalCost      decimal.Decimal   `json:"total_cost"` // charged
	LedgerID       *int64            `json:"ledger_id,omitempty"`
	Inputs         pendingInputs     `json:"inputs"`
	Attempts       int               `json:"attempts"`
}

var errNotPending = errors.New("usage row is not pending")

// settle computes the cost and, in one transaction, writes the ledger row,
// the usage billing fields and the usage.recorded event.
func (s *Service) settle(ctx context.Context, p *pending, skipLocked bool) error {
	if p.Expression == "" {
		return errors.New("price expression not found")
	}
	prog, err := expr.CompileCached(p.Expression)
	if err != nil {
		return fmt.Errorf("compile price expression: %w", err)
	}
	t := p.Tokens
	vars := expr.Normalize(p.Inputs.Semantics, expr.Tokens{
		Input: t.Input, Output: t.Output, CacheRead: t.CacheRead,
		CacheCreation: t.CacheCreation, CacheCreation1h: t.CacheCreation1h,
	}, prog.Uses)
	res, err := prog.Eval(expr.Input{Vars: vars, Metrics: p.Metrics, Params: p.Inputs.Params, Headers: p.Inputs.Headers, At: p.CreatedAt})
	if err != nil {
		return err
	}
	total := res.Cost.Mul(p.Rate).Round(8)
	detail := BillingDetail{
		ExprVersion: prog.Version(), Tier: res.Tier, Rules: res.Rules, Breakdown: res.Breakdown,
		Cost: res.Cost, RateMultiplier: p.Rate, TotalCost: total, Inputs: p.Inputs, Attempts: p.Attempts + 1,
	}
	var ledgerRes *core.LedgerResult
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		lock := `SELECT billing_status FROM usage_logs WHERE request_id = $1 FOR UPDATE`
		if skipLocked {
			lock += ` SKIP LOCKED`
		}
		var status string
		if err := tx.QueryRow(ctx, lock, p.RequestID).Scan(&status); err != nil {
			if store.IsNoRows(err) {
				return errNotPending
			}
			return err
		}
		if status != StatusPending && status != StatusFailed {
			return errNotPending
		}
		if total.Sign() > 0 {
			if s.ledger == nil {
				return errors.New("no ledger configured")
			}
			ledgerRes, err = s.ledger.ApplyTx(ctx, tx, core.LedgerChange{
				UserID: p.UserID, Amount: total, Credit: false, Kind: "usage",
				RefType: "usage", RefID: p.RequestID, IdempotencyKey: "usage:" + p.RequestID,
			})
			if err != nil {
				return fmt.Errorf("ledger: %w", err)
			}
			detail.LedgerID = &ledgerRes.LedgerID
		}
		var priceID *int64
		if p.PriceID > 0 {
			priceID = &p.PriceID
		}
		_, err := tx.Exec(ctx, `
			UPDATE usage_logs SET total_cost = $2, billing_status = 'billed', billing_detail = $3, matched_tier = $4,
				expr_hash = $5, billing_mode = $6, price_id = $7, rate_multiplier = $8
			WHERE request_id = $1`,
			p.RequestID, total, jsonOr(detail, "{}"), trunc(res.Tier, 100), prog.Hash(), p.Mode, priceID, p.Rate)
		if err != nil {
			return err
		}
		if s.events != nil {
			return s.events.Emit(ctx, tx, recordedEvent(p, total, StatusBilled))
		}
		return nil
	})
	if errors.Is(err, errNotPending) {
		return nil
	}
	if err != nil {
		return err
	}
	if ledgerRes != nil && !ledgerRes.Duplicate {
		s.ledger.CacheBalance(ctx, p.UserID, ledgerRes.LedgerID, ledgerRes.BalanceAfter)
	}
	return nil
}

func (s *Service) markFailed(ctx context.Context, p *pending, cause error) {
	attempts := p.Attempts + 1
	slog.WarnContext(ctx, "usage: settlement failed", "request_id", p.RequestID, "attempts", attempts, "err", cause)
	if attempts >= s.opts.MaxAttempts {
		slog.ErrorContext(ctx, "usage: settlement gave up", "request_id", p.RequestID, "attempts", attempts, "err", cause)
	}
	patch := jsonOr(map[string]any{"attempts": attempts, "error": trunc(cause.Error(), 1000), "inputs": p.Inputs}, "{}")
	_, err := s.db.Pool.Exec(ctx, `
		UPDATE usage_logs SET billing_status = 'failed', billing_detail = billing_detail || $2::jsonb
		WHERE request_id = $1 AND billing_status IN ('pending', 'failed')`, p.RequestID, patch)
	if err != nil {
		slog.ErrorContext(ctx, "usage: mark failed", "request_id", p.RequestID, "err", err)
	}
}

func recordedEvent(p *pending, total decimal.Decimal, status string) core.Event {
	t := p.Tokens
	return core.Event{Type: core.EventUsageRecorded, Payload: map[string]any{
		"request_id": p.RequestID, "user_id": p.UserID, "api_key_id": p.APIKeyID, "group_id": p.GroupID,
		"account_id": p.AccountID, "plugin_key": p.PluginKey, "platform": p.Platform, "protocol": p.Protocol,
		"account_type": p.AccountType, "upstream_protocol": p.UpstreamProtocol,
		"model": p.Model, "success": p.Success, "status_code": p.StatusCode, "error_type": p.ErrorType,
		"input_tokens": t.Input, "output_tokens": t.Output, "cache_read_tokens": t.CacheRead,
		"cache_creation_tokens": t.CacheCreation, "cache_creation_1h_tokens": t.CacheCreation1h,
		"total_cost": total, "billing_status": status, "latency_ms": p.LatencyMs,
		"created_at": p.CreatedAt.UTC().Format(time.RFC3339Nano),
	}}
}

// ---------------------------------------------------------------- retry

func (s *Service) retryLoop(ctx context.Context) {
	ticker := time.NewTicker(s.opts.RetryInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if n, err := s.RetryPending(ctx); err != nil {
				slog.Error("usage: retry pending", "err", err)
			} else if n > 0 {
				slog.Info("usage: retried pending settlements", "rows", n)
			}
		}
	}
}

// RetryPending settles pending/failed rows older than Options.RetryAfter
// that have not exhausted their attempts. It returns the rows examined.
func (s *Service) RetryPending(ctx context.Context) (int, error) {
	rows, err := s.db.Pool.Query(ctx, `
		SELECT u.request_id, u.user_id, u.api_key_id, u.group_id, u.account_id, u.plugin_key, u.platform,
		       u.protocol, u.account_type, u.upstream_protocol, u.model, u.success, u.status_code, u.error_type,
		       u.input_tokens, u.output_tokens,
		       u.cache_read_tokens, u.cache_creation_tokens, u.cache_creation_1h_tokens, u.metrics, u.latency_ms,
		       u.created_at, u.rate_multiplier, COALESCE(u.price_id, 0), u.billing_mode, u.billing_detail,
		       COALESCE(h.expression, mp.expression, '')
		FROM usage_logs u
		LEFT JOIN model_price_history h ON h.expr_hash = u.expr_hash
		LEFT JOIN model_prices mp ON mp.id = u.price_id AND h.expr_hash IS NULL
		WHERE u.billing_status IN ('pending', 'failed')
		  AND u.created_at < now() - make_interval(secs => $1)
		  AND COALESCE((u.billing_detail->>'attempts')::int, 0) < $2
		ORDER BY u.id LIMIT 500`, s.opts.RetryAfter.Seconds(), s.opts.MaxAttempts)
	if err != nil {
		return 0, err
	}
	var list []*pending
	for rows.Next() {
		p := &pending{}
		var metrics, detail []byte
		if err := rows.Scan(&p.RequestID, &p.UserID, &p.APIKeyID, &p.GroupID, &p.AccountID, &p.PluginKey, &p.Platform,
			&p.Protocol, &p.AccountType, &p.UpstreamProtocol, &p.Model, &p.Success, &p.StatusCode, &p.ErrorType,
			&p.Tokens.Input, &p.Tokens.Output,
			&p.Tokens.CacheRead, &p.Tokens.CacheCreation, &p.Tokens.CacheCreation1h, &metrics, &p.LatencyMs,
			&p.CreatedAt, &p.Rate, &p.PriceID, &p.Mode, &detail, &p.Expression); err != nil {
			rows.Close()
			return 0, err
		}
		_ = json.Unmarshal(metrics, &p.Metrics)
		var pd pendingDetail
		_ = json.Unmarshal(detail, &pd)
		p.Inputs, p.Attempts = pd.Inputs, pd.Attempts
		list = append(list, p)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, err
	}
	for _, p := range list {
		if ctx.Err() != nil {
			break
		}
		if err := s.settle(ctx, p, true); err != nil {
			s.markFailed(ctx, p, err)
		}
	}
	return len(list), nil
}
