package usage

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strconv"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/event"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

const a6Expr = `len <= 200000 ? tier("standard", p*3 + c*15 + cr*0.3 + cc*3.75 + cc1h*6) : tier("long_context", p*6 + c*22.5 + cr*0.6 + cc*7.5 + cc1h*12) ||| has(header("anthropic-beta"), "fast-mode") ? 2 : 1`

// flakyLedger fails the first n ApplyTx calls.
type flakyLedger struct {
	*billing.Service
	fail atomic.Int32
}

func (f *flakyLedger) ApplyTx(ctx context.Context, tx pgx.Tx, ch core.LedgerChange) (*core.LedgerResult, error) {
	if f.fail.Add(-1) >= 0 {
		return nil, errors.New("ledger unavailable")
	}
	return f.Service.ApplyTx(ctx, tx, ch)
}

type fixture struct {
	t      *testing.T
	db     *store.DB
	bill   *billing.Service
	ledger *flakyLedger
	svc    *Service
	h      *gin.Engine
	user   int64
	other  int64
	group  int64
	price  *core.PriceRule
}

type allowAll struct{}

func (allowAll) VerifyAccessToken(_ context.Context, token string) (int64, error) {
	return strconv.ParseInt(token, 10, 64)
}
func (allowAll) Can(context.Context, int64, string) (bool, error) { return true, nil }
func (allowAll) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{Superuser: true}, nil
}
func (allowAll) IsSensitive(string) bool                           { return false }
func (allowAll) VerifyStepUp(context.Context, int64, string) error { return nil }

func newFixture(t *testing.T) *fixture {
	t.Helper()
	ctx := context.Background()
	db := testutil.DB(t)
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	pub := event.NewPublisher(db)
	bill := billing.New(db, rdb, nil, pub, nil)
	f := &fixture{t: t, db: db, bill: bill, ledger: &flakyLedger{Service: bill}}
	f.svc = New(db, f.ledger, pub, Options{FlushInterval: 10 * time.Millisecond, Workers: 2, RetryInterval: time.Hour, RetryAfter: time.Millisecond})

	for _, email := range []string{"u@example.com", "o@example.com"} {
		var id int64
		if err := db.Pool.QueryRow(ctx, `INSERT INTO users (email, password_hash) VALUES ($1, 'x') RETURNING id`, email).Scan(&id); err != nil {
			t.Fatal(err)
		}
		if f.user == 0 {
			f.user = id
		} else {
			f.other = id
		}
	}
	if err := db.Pool.QueryRow(ctx, `INSERT INTO groups (name) VALUES ('default') RETURNING id`).Scan(&f.group); err != nil {
		t.Fatal(err)
	}
	if _, err := bill.Apply(ctx, core.LedgerChange{UserID: f.user, Amount: decimal.NewFromInt(10), Credit: true, Kind: "admin_adjust", IdempotencyKey: "seed"}); err != nil {
		t.Fatal(err)
	}
	// Price row + history, as the billing module would store them.
	prog, err := expr.Compile(a6Expr)
	if err != nil {
		t.Fatal(err)
	}
	f.price = &core.PriceRule{Model: "claude-sonnet-4-5", Mode: "expression", Expression: a6Expr, ExprVersion: 1, ExprHash: prog.Hash()}
	err = db.Pool.QueryRow(ctx, `INSERT INTO model_prices (model, mode, expression, expr_hash, source)
		VALUES ('claude-sonnet-4-5', 'expression', $1, $2, 'manual') RETURNING id`, a6Expr, prog.Hash()).Scan(&f.price.ID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Pool.Exec(ctx, `INSERT INTO model_price_history (expr_hash, expression, expr_version) VALUES ($1, $2, 1)`, prog.Hash(), prog.Expression()); err != nil {
		t.Fatal(err)
	}
	gin.SetMode(gin.TestMode)
	f.h = gin.New()
	f.svc.RegisterRoutes(httpapi.NewRouter(f.h, allowAll{}, allowAll{}, allowAll{}))
	return f
}

var bj10 = time.Date(2026, 9, 24, 2, 0, 0, 0, time.UTC)

func (f *fixture) record(id string, billable bool) *core.UsageRecord {
	rec := &core.UsageRecord{
		RequestID: id, UserID: f.user, APIKeyID: 1, GroupID: f.group, PluginKey: "anthropic", Platform: "anthropic",
		Protocol: "anthropic.messages", AccountType: "apikey", UpstreamProtocol: "anthropic.messages", Endpoint: "/v1/messages", Model: "claude-sonnet-x", StatusCode: 200,
		Success: true, Attempts: 1, UsageSemantics: "exclusive",
		Tokens:         core.UsageTokens{Input: 100000, Output: 2000, CacheRead: 80000},
		Billable:       billable,
		PriceHeaders:   map[string]string{"anthropic-beta": "fast-mode"},
		RateMultiplier: decimal.NewFromInt(1),
		HookDecisions:  []core.HookDecision{{PluginKey: "guard", HookID: "h", Decision: "allow"}},
		CreatedAt:      bj10,
	}
	if billable {
		rec.Price = f.price
	}
	return rec
}

func (f *fixture) scalar(sql string, args ...any) string {
	f.t.Helper()
	var v any
	if err := f.db.Pool.QueryRow(context.Background(), sql, args...).Scan(&v); err != nil {
		f.t.Fatalf("%s: %v", sql, err)
	}
	switch x := v.(type) {
	case nil:
		return "<nil>"
	case string:
		return x
	}
	b, _ := json.Marshal(v)
	return string(b)
}

func (f *fixture) balance() decimal.Decimal {
	var d decimal.Decimal
	_ = f.db.Pool.QueryRow(context.Background(), `SELECT balance FROM user_balances WHERE user_id = $1`, f.user).Scan(&d)
	return d
}

func TestRecordedEventPayload(t *testing.T) {
	rec := &core.UsageRecord{RequestID: "r", PluginKey: "relay", Platform: "openai", Protocol: "openai.chat",
		AccountType: "relay_key", UpstreamProtocol: "anthropic.messages", Model: "m", CreatedAt: time.Unix(0, 0)}
	ev := recordedEvent(fromRecord(rec), decimal.NewFromInt(1), StatusBilled)
	p := ev.Payload.(map[string]any)
	if ev.Type != core.EventUsageRecorded || p["account_type"] != "relay_key" || p["upstream_protocol"] != "anthropic.messages" ||
		p["platform"] != "openai" || p["protocol"] != "openai.chat" || p["plugin_key"] != "relay" {
		t.Fatalf("payload: %v", p)
	}
}

func TestSettleFlow(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	f.svc.Start(ctx)

	r1 := f.record("req-1", true)
	free := f.record("req-free", false)
	free.Success, free.StatusCode, free.ErrorType, free.Tokens = false, 403, "blocked_by_hook", core.UsageTokens{}
	r3 := f.record("req-3", true)
	r3.RateMultiplier = decimal.RequireFromString("1.5")
	r3.PriceHeaders = nil
	r3.Tokens = core.UsageTokens{Input: 1204, Output: 812}
	zero := f.record("req-zero", true)
	zero.Tokens = core.UsageTokens{}
	for _, r := range []*core.UsageRecord{r1, free, r3, zero, f.record("req-1", true)} {
		f.svc.Submit(r)
	}
	stopCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	f.svc.Stop(stopCtx)

	if n := f.scalar(`SELECT count(*) FROM usage_logs`); n != "4" {
		t.Fatalf("usage rows = %s", n)
	}
	if s := f.scalar(`SELECT billing_status || ' ' || total_cost::text || ' ' || matched_tier || ' ' || billing_mode FROM usage_logs WHERE request_id = 'req-1'`); s != "billed 0.70800000 standard expression" {
		t.Fatalf("req-1: %s", s)
	}
	if s := f.scalar(`SELECT billing_status || ' ' || total_cost::text FROM usage_logs WHERE request_id = 'req-free'`); s != "free 0.00000000" {
		t.Fatalf("req-free: %s", s)
	}
	// 1204*3 + 812*15 = 15792 micro-dollars, x1.5
	if s := f.scalar(`SELECT billing_status || ' ' || total_cost::text || ' ' || rate_multiplier::text FROM usage_logs WHERE request_id = 'req-3'`); s != "billed 0.02368800 1.5000" {
		t.Fatalf("req-3: %s", s)
	}
	if s := f.scalar(`SELECT billing_status || ' ' || total_cost::text FROM usage_logs WHERE request_id = 'req-zero'`); s != "billed 0.00000000" {
		t.Fatalf("req-zero: %s", s)
	}
	if b := f.balance(); !b.Equal(decimal.RequireFromString("9.268312")) {
		t.Fatalf("balance = %s", b)
	}
	if n := f.scalar(`SELECT count(*) FROM balance_ledger WHERE kind = 'usage'`); n != "2" {
		t.Fatalf("usage ledger rows = %s", n)
	}
	if n := f.scalar(`SELECT count(*) FROM events WHERE type = 'usage.recorded'`); n != "4" {
		t.Fatalf("usage.recorded events = %s", n)
	}
	ev := f.scalar(`SELECT payload->>'total_cost' || ' ' || (payload->>'billing_status') || ' ' || (payload->>'account_type') ||
		' ' || (payload->>'upstream_protocol') FROM events WHERE type = 'usage.recorded' AND payload->>'request_id' = 'req-1'`)
	if ev != "0.708 billed apikey anthropic.messages" {
		t.Fatalf("event: %s", ev)
	}
	if s := f.scalar(`SELECT account_type || ' ' || upstream_protocol FROM usage_logs WHERE request_id = 'req-free'`); s != "apikey anthropic.messages" {
		t.Fatalf("usage row: %s", s)
	}
	if ev := f.scalar(`SELECT payload->>'account_type' FROM events WHERE type = 'usage.recorded' AND payload->>'request_id' = 'req-free'`); ev != "apikey" {
		t.Fatalf("free event: %s", ev)
	}
	var detail BillingDetail
	raw := f.scalar(`SELECT billing_detail::text FROM usage_logs WHERE request_id = 'req-1'`)
	if err := json.Unmarshal([]byte(raw), &detail); err != nil {
		t.Fatal(err)
	}
	if detail.LedgerID == nil || detail.Tier != "standard" || len(detail.Rules) != 1 || !detail.Rules[0].Matched ||
		detail.Breakdown.Vars.Len != 180000 || detail.Inputs.Headers["anthropic-beta"] != "fast-mode" {
		t.Fatalf("detail: %s", raw)
	}
}

func TestRetryPending(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()

	f.ledger.fail.Store(1)
	rec := f.record("req-r", true)
	f.svc.process(ctx, []*core.UsageRecord{rec})
	if s := f.scalar(`SELECT billing_status || ' ' || (billing_detail->>'attempts') FROM usage_logs WHERE request_id = 'req-r'`); s != "failed 1" {
		t.Fatalf("after failure: %s", s)
	}

	// A crash between insert and settlement leaves a pending row.
	crash := f.record("req-crash", true)
	if _, err := f.svc.insert(ctx, []*core.UsageRecord{crash}); err != nil {
		t.Fatal(err)
	}
	// A row whose price expression cannot be found fails permanently.
	lost := f.record("req-lost", true)
	lost.Price = &core.PriceRule{ID: 0, Mode: "expression", Expression: `tier("x", p*999)`, ExprHash: "missing"}
	if _, err := f.svc.insert(ctx, []*core.UsageRecord{lost}); err != nil {
		t.Fatal(err)
	}
	time.Sleep(5 * time.Millisecond)

	n, err := f.svc.RetryPending(ctx)
	if err != nil || n != 3 {
		t.Fatalf("retry: %d %v", n, err)
	}
	for _, id := range []string{"req-r", "req-crash"} {
		if s := f.scalar(`SELECT billing_status || ' ' || total_cost::text FROM usage_logs WHERE request_id = $1`, id); s != "billed 0.70800000" {
			t.Fatalf("%s: %s", id, s)
		}
	}
	if s := f.scalar(`SELECT billing_status || ' ' || (billing_detail->>'error') FROM usage_logs WHERE request_id = 'req-lost'`); s != "failed price expression not found" {
		t.Fatalf("req-lost: %s", s)
	}
	if b := f.balance(); !b.Equal(decimal.RequireFromString("8.584")) {
		t.Fatalf("balance = %s", b)
	}
	// Retrying again does not double charge, and exhausted rows are skipped.
	f.svc.opts.MaxAttempts = 2
	n, _ = f.svc.RetryPending(ctx)
	if n != 1 {
		t.Fatalf("second retry examined %d", n)
	}
	n, _ = f.svc.RetryPending(ctx)
	if n != 0 {
		t.Fatalf("exhausted rows retried: %d", n)
	}
	if b := f.balance(); !b.Equal(decimal.RequireFromString("8.584")) {
		t.Fatalf("balance after retries = %s", b)
	}
	// Settling an already billed row is a no-op.
	if err := f.svc.settle(ctx, fromRecord(rec), false); err != nil {
		t.Fatal(err)
	}
	if n := f.scalar(`SELECT count(*) FROM balance_ledger WHERE kind = 'usage'`); n != "2" {
		t.Fatalf("ledger rows = %s", n)
	}
}

func TestSubmitOverflow(t *testing.T) {
	f := newFixture(t)
	f.svc = New(f.db, f.ledger, event.NewPublisher(f.db), Options{QueueSize: 1})
	// Not started: the first record fills the queue, the second overflows
	// and is persisted directly as pending.
	f.svc.Submit(f.record("q-1", true))
	f.svc.Submit(f.record("q-2", true))
	deadline := time.Now().Add(10 * time.Second)
	for f.scalar(`SELECT count(*) FROM usage_logs WHERE request_id = 'q-2'`) != "1" {
		if time.Now().After(deadline) {
			t.Fatal("overflow record not persisted")
		}
		time.Sleep(50 * time.Millisecond)
	}
	if s := f.scalar(`SELECT billing_status FROM usage_logs WHERE request_id = 'q-2'`); s != "pending" {
		t.Fatalf("overflow status %s", s)
	}
}

func (f *fixture) get(uid int64, path string, want int) map[string]any {
	f.t.Helper()
	req := httptest.NewRequest("GET", "/api/v1"+path, bytes.NewReader(nil))
	req.Header.Set("Authorization", "Bearer "+strconv.FormatInt(uid, 10))
	w := httptest.NewRecorder()
	f.h.ServeHTTP(w, req)
	if w.Code != want {
		f.t.Fatalf("GET %s: %d %s", path, w.Code, w.Body.String())
	}
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return out
}

func TestUsageAPI(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	other := f.record("req-other", false)
	other.UserID, other.Model = f.other, "claude-haiku-4"
	acc := int64(42)
	mine := f.record("req-mine", true)
	mine.AccountID = &acc
	mine.ClientRequestID = "cli-req-1"
	// Served through protocol conversion: client endpoint openai.chat, upstream
	// anthropic.messages.
	mine.Platform, mine.Protocol, mine.AccountType = "openai", "openai.chat", "relay_key"
	f.svc.process(ctx, []*core.UsageRecord{mine, other, f.record("req-mine-2", true)})

	list := f.get(f.user, "/me/usage", 200)
	items := list["data"].([]any)
	if len(items) != 2 || list["page"].(map[string]any)["total"].(float64) != 2 {
		t.Fatalf("me/usage: %v", list)
	}
	first := items[0].(map[string]any)
	if first["account_id"] != nil || first["user_email"] != "u@example.com" || first["group_name"] != "default" || first["total_cost"] != "0.708" ||
		first["account_type"] != "" || first["upstream_protocol"] != "" {
		t.Fatalf("row: %v", first)
	}
	all := f.get(f.user, "/usage?model=claude-haiku-4", 200)["data"].([]any)
	if len(all) != 1 || all[0].(map[string]any)["request_id"] != "req-other" ||
		all[0].(map[string]any)["account_type"] != "apikey" || all[0].(map[string]any)["upstream_protocol"] != "anthropic.messages" {
		t.Fatalf("usage filter: %v", all)
	}
	if n := len(f.get(f.user, "/usage?account_type=relay_key", 200)["data"].([]any)); n != 1 {
		t.Fatalf("account_type filter: %d", n)
	}
	byCRID := f.get(f.user, "/usage?client_request_id=cli-req-1", 200)["data"].([]any)
	if len(byCRID) != 1 || byCRID[0].(map[string]any)["request_id"] != "req-mine" ||
		byCRID[0].(map[string]any)["client_request_id"] != "cli-req-1" {
		t.Fatalf("client_request_id filter: %v", byCRID)
	}
	if n := len(f.get(f.user, "/me/usage?client_request_id=cli-req-1", 200)["data"].([]any)); n != 1 {
		t.Fatalf("self client_request_id filter: %d", n)
	}
	if n := len(f.get(f.user, "/usage?success=true&user_id="+strconv.FormatInt(f.user, 10), 200)["data"].([]any)); n != 2 {
		t.Fatalf("success filter: %d", n)
	}
	if n := len(f.get(f.user, "/usage?from=2026-09-25T00:00:00Z", 200)["data"].([]any)); n != 0 {
		t.Fatalf("from filter: %d", n)
	}
	f.get(f.user, "/usage?from=bad", 400)

	var id, otherID int64
	_ = f.db.Pool.QueryRow(ctx, `SELECT id FROM usage_logs WHERE request_id = 'req-mine'`).Scan(&id)
	_ = f.db.Pool.QueryRow(ctx, `SELECT id FROM usage_logs WHERE request_id = 'req-other'`).Scan(&otherID)
	d := f.get(f.user, "/usage/"+strconv.FormatInt(id, 10), 200)["data"].(map[string]any)
	if d["ledger_id"] == nil || d["price"].(map[string]any)["model"] != "claude-sonnet-4-5" || d["account_id"].(float64) != 42 ||
		d["billing_detail"].(map[string]any)["tier"] != "standard" || len(d["hook_decisions"].([]any)) != 1 ||
		d["protocol"] != "openai.chat" || d["upstream_protocol"] != "anthropic.messages" || d["account_type"] != "relay_key" {
		t.Fatalf("detail: %v", d)
	}
	if _, has := d["price"].(map[string]any)["platform"]; has {
		t.Fatalf("price ref has platform: %v", d["price"])
	}
	md := f.get(f.user, "/me/usage/"+strconv.FormatInt(id, 10), 200)["data"].(map[string]any)
	if md["account_id"] != nil || md["account_type"] != "" || md["upstream_protocol"] != "" {
		t.Fatalf("self detail leaks account: %v", md)
	}
	if md["client_request_id"] != "cli-req-1" || d["client_request_id"] != "cli-req-1" {
		t.Fatalf("client_request_id: self %v admin %v", md["client_request_id"], d["client_request_id"])
	}
	f.get(f.user, "/me/usage/"+strconv.FormatInt(otherID, 10), 404)
	f.get(f.user, "/usage/999999", 404)

	sum := f.get(f.user, "/usage/summary?group_by=model&from=2026-09-01T00:00:00Z", 200)["data"].([]any)
	if len(sum) != 2 {
		t.Fatalf("summary: %v", sum)
	}
	s0 := sum[1].(map[string]any)
	if s0["key"] != "claude-sonnet-x" || s0["requests"].(float64) != 2 || s0["total_cost"] != "1.416" || s0["input_tokens"].(float64) != 200000 {
		t.Fatalf("summary row: %v", s0)
	}
	days := f.get(f.user, "/usage/summary?group_by=day&from=2026-09-01T00:00:00Z", 200)["data"].([]any)
	if len(days) != 1 || days[0].(map[string]any)["key"] != "2026-09-24" {
		t.Fatalf("summary day: %v", days)
	}
	users := f.get(f.user, "/usage/summary?group_by=user&from=2026-09-01T00:00:00Z", 200)["data"].([]any)
	if len(users) != 2 || users[0].(map[string]any)["user_email"] == "" {
		t.Fatalf("summary user: %v", users)
	}
	f.get(f.user, "/usage/summary?group_by=week", 400)
}
