package billing

import (
	"context"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/event"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// roundTrips counts what actually reaches the server: every statement, and
// every batch (one flush). It exists to keep Precharge at a bounded number of
// round trips — the request path pays each one at a distant Supabase (CONTRACTS
// §63.7).
type roundTrips struct {
	mu         sync.Mutex
	flushes    int
	begins     int
	commits    int
	batches    int
	statements []string
}

func (r *roundTrips) TraceQueryStart(ctx context.Context, _ *pgx.Conn, data pgx.TraceQueryStartData) context.Context {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.statements = append(r.statements, data.SQL)
	switch data.SQL {
	case "begin":
		r.begins++
	case "commit":
		r.commits++
	}
	r.flushes++
	return ctx
}

func (r *roundTrips) TraceQueryEnd(context.Context, *pgx.Conn, pgx.TraceQueryEndData) {}

func (r *roundTrips) TraceBatchStart(ctx context.Context, _ *pgx.Conn, _ pgx.TraceBatchStartData) context.Context {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.batches++
	r.flushes++
	return ctx
}

func (r *roundTrips) TraceBatchQuery(context.Context, *pgx.Conn, pgx.TraceBatchQueryData) {}
func (r *roundTrips) TraceBatchEnd(context.Context, *pgx.Conn, pgx.TraceBatchEndData)     {}

func (r *roundTrips) reset() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.flushes, r.begins, r.commits, r.batches, r.statements = 0, 0, 0, 0, nil
}

// tracedStore opens a second pool on the same test database, with the same
// settings, that counts the round trips of one Precharge.
func tracedStore(t *testing.T, base *store.DB, trace *roundTrips) *store.DB {
	t.Helper()
	cfg, err := pgxpool.ParseConfig(base.Pool.Config().ConnString())
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.Tracer = trace
	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	return &store.DB{Pool: pool}
}

// Precharge used to run about a dozen serial statements, half of them repeated
// by ApplyTx: BEGIN, insert the balance row, lock it, the idempotency lookup,
// insert the reservation, then the same insert, lock and lookup again, insert
// the ledger row, update the balance, the event and COMMIT. The merged path
// must stay at four flushes: BEGIN, one batch, the event, COMMIT.
func TestPrechargeRoundTrips(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	uid := e.user("precharge-round-trips@test.invalid")
	if _, err := e.svc.Apply(ctx, core.LedgerChange{UserID: uid, Amount: decimal.NewFromInt(10), Credit: true, Kind: KindAdminAdjust, IdempotencyKey: "seed"}); err != nil {
		t.Fatal(err)
	}
	trace := &roundTrips{}
	db := tracedStore(t, e.db, trace)
	svc := New(db, e.rdb, e.bus, event.NewPublisher(db), nil)
	record := func(id string) *core.UsageRecord {
		return &core.UsageRecord{RequestID: id, UserID: uid, Price: &core.PriceRule{Expression: "flat(0.5)"}, RateMultiplier: decimal.NewFromInt(1)}
	}
	// The first call of a statement on a pool prepares it (two flushes); the
	// steady state a busy node is in is what matters here.
	if err := svc.Precharge(ctx, record("warmup")); err != nil {
		t.Fatal(err)
	}
	trace.reset()
	if err := svc.Precharge(ctx, record("measured")); err != nil {
		t.Fatal(err)
	}
	if trace.flushes > 4 {
		t.Fatalf("%d round trips (%d statements, %d batches) for one precharge; want at most 4\n%v",
			trace.flushes, len(trace.statements), trace.batches, trace.statements)
	}
	if trace.begins != 1 || trace.commits != 1 {
		t.Fatalf("transaction opened %d and committed %d times", trace.begins, trace.commits)
	}
	if trace.batches != 2 {
		t.Fatalf("%d batches (charge and event); want 2", trace.batches)
	}
}
