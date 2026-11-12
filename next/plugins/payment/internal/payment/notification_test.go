package payment

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/shopspring/decimal"
)

// stubVerifier answers every Verify with its fields and counts the calls.
type stubVerifier struct {
	n     *PaymentNotification
	err   error
	calls int
}

func (v *stubVerifier) Verify(context.Context, *pluginv1.HTTPRequest, ProviderConfig) (*PaymentNotification, error) {
	v.calls++
	return v.n, v.err
}

// webhook posts a notification for provider through the router.
func webhook(t *testing.T, p *Plugin, provider string) *pluginv1.HTTPResponse {
	t.Helper()
	resp, err := p.HandleHTTP(context.Background(), &pluginv1.HTTPRequest{
		Method: "POST", RoutePath: "/webhook/:provider",
		Path:       "/webhook/" + provider,
		PathParams: map[string]string{"provider": provider},
		Body:       []byte(`{"out_trade_no":"forged"}`),
	})
	if err != nil {
		t.Fatal(err)
	}
	return resp
}

// pendingOrder creates a pending order of 100 and enables an alipay instance.
func pendingOrder(t *testing.T, p *Plugin) *CreateOrderResponse {
	t.Helper()
	ctx := context.Background()
	if _, err := mustDB(t, p).Exec(ctx, `
		INSERT INTO payment_provider_instances (provider_key, name) VALUES ($1, 'test')
	`, ProviderAlipay); err != nil {
		t.Fatal(err)
	}
	order, err := p.orderService.CreateOrder(ctx, CreateOrderRequest{
		UserID: 7001, Amount: decimal.NewFromInt(100),
		PaymentType: PaymentTypeAlipay, OrderType: OrderTypeBalance,
	})
	if err != nil {
		t.Fatal(err)
	}
	return order
}

func orderStatus(t *testing.T, p *Plugin, id int64) string {
	t.Helper()
	var status string
	if err := mustDB(t, p).QueryRow(context.Background(),
		`SELECT status FROM payment_orders WHERE id = $1`, id).Scan(&status); err != nil {
		t.Fatal(err)
	}
	return status
}

func TestWebhookFailsClosed(t *testing.T) {
	success := func(o *CreateOrderResponse) *PaymentNotification {
		return &PaymentNotification{OutTradeNo: o.OutTradeNo, TradeNo: "t1", Amount: decimal.NewFromInt(100), Status: NotificationStatusSuccess}
	}
	cases := []struct {
		name     string
		provider string
		verifier func(*CreateOrderResponse) *stubVerifier // nil: none registered
		status   int32
		verified bool
		want     string
		credits  int
	}{
		{name: "no verifier", provider: ProviderAlipay, status: http.StatusNotImplemented, want: StatusPending},
		{name: "unknown provider", provider: "nope", status: http.StatusNotFound, want: StatusPending},
		{name: "disabled or absent instance", provider: ProviderStripe, status: http.StatusNotFound, want: StatusPending},
		{name: "signature rejected", provider: ProviderAlipay, verified: true, status: http.StatusBadRequest, want: StatusPending,
			verifier: func(*CreateOrderResponse) *stubVerifier { return &stubVerifier{err: errors.New("bad signature")} }},
		{name: "verifier returns nothing", provider: ProviderAlipay, verified: true, status: http.StatusBadRequest, want: StatusPending,
			verifier: func(*CreateOrderResponse) *stubVerifier { return &stubVerifier{} }},
		{name: "amount mismatch", provider: ProviderAlipay, verified: true, status: http.StatusBadRequest, want: StatusPending,
			verifier: func(o *CreateOrderResponse) *stubVerifier {
				n := success(o)
				n.Amount = decimal.NewFromInt(1)
				return &stubVerifier{n: n}
			}},
		{name: "not a success", provider: ProviderAlipay, verified: true, status: http.StatusOK, want: StatusPending,
			verifier: func(o *CreateOrderResponse) *stubVerifier {
				n := success(o)
				n.Status = NotificationStatusFailed
				return &stubVerifier{n: n}
			}},
		{name: "unknown order is acknowledged", provider: ProviderAlipay, verified: true, status: http.StatusOK, want: StatusPending,
			verifier: func(o *CreateOrderResponse) *stubVerifier {
				n := success(o)
				n.OutTradeNo = "s2a_missing"
				return &stubVerifier{n: n}
			}},
		{name: "verified success", provider: ProviderAlipay, verified: true, status: http.StatusOK, want: StatusCompleted, credits: 1,
			verifier: func(o *CreateOrderResponse) *stubVerifier { return &stubVerifier{n: success(o)} }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			p, fh := startDB(t)
			order := pendingOrder(t, p)
			var v *stubVerifier
			if tc.verifier != nil {
				v = tc.verifier(order)
				p.orderService.RegisterVerifier(ProviderAlipay, v)
			}
			resp := webhook(t, p, tc.provider)
			if resp.GetStatus() != tc.status {
				t.Fatalf("status = %d, want %d (%s)", resp.GetStatus(), tc.status, resp.GetBody())
			}
			if v != nil && (v.calls > 0) != tc.verified {
				t.Fatalf("verifier calls = %d, want verified = %v", v.calls, tc.verified)
			}
			if got := orderStatus(t, p, order.OrderID); got != tc.want {
				t.Fatalf("order status = %s, want %s", got, tc.want)
			}
			if got := len(hostCredits(fh)); got != tc.credits {
				t.Fatalf("ledger credits = %d, want %d", got, tc.credits)
			}
		})
	}
}

// A disabled instance does not make its provider known.
func TestWebhookDisabledInstanceIsUnknown(t *testing.T) {
	p, _ := startDB(t)
	if _, err := mustDB(t, p).Exec(context.Background(), `
		INSERT INTO payment_provider_instances (provider_key, name, enabled) VALUES ($1, 'off', false)
	`, ProviderStripe); err != nil {
		t.Fatal(err)
	}
	v := &stubVerifier{}
	p.orderService.RegisterVerifier(ProviderStripe, v)
	if resp := webhook(t, p, ProviderStripe); resp.GetStatus() != http.StatusNotFound || v.calls != 0 {
		t.Fatalf("status = %d, verifier calls = %d, want 404 and 0", resp.GetStatus(), v.calls)
	}
}

// perInstanceVerifier accepts the notification only for one instance.
type perInstanceVerifier struct {
	accept int64
	n      *PaymentNotification
	seen   []int64
}

func (v *perInstanceVerifier) Verify(_ context.Context, _ *pluginv1.HTTPRequest, cfg ProviderConfig) (*PaymentNotification, error) {
	v.seen = append(v.seen, cfg.ID)
	if cfg.ID != v.accept {
		return nil, errors.New("secret-detail: wrong key")
	}
	return v.n, nil
}

// Each enabled instance is tried; one accepting is enough, none accepting is
// a 400 that does not echo the verifier's errors.
func TestWebhookTriesEveryInstance(t *testing.T) {
	p, _ := startDB(t)
	order := pendingOrder(t, p)
	var second int64
	if err := mustDB(t, p).QueryRow(context.Background(), `
		INSERT INTO payment_provider_instances (provider_key, name, sort_order) VALUES ($1, 'second', 1) RETURNING id
	`, ProviderAlipay).Scan(&second); err != nil {
		t.Fatal(err)
	}
	v := &perInstanceVerifier{accept: -1, n: &PaymentNotification{
		OutTradeNo: order.OutTradeNo, TradeNo: "t2", Amount: decimal.NewFromInt(100), Status: NotificationStatusSuccess}}
	p.orderService.RegisterVerifier(ProviderAlipay, v)

	resp := webhook(t, p, ProviderAlipay)
	if resp.GetStatus() != http.StatusBadRequest || len(v.seen) != 2 || strings.Contains(string(resp.GetBody()), "secret-detail") {
		t.Fatalf("all rejecting: status %d, seen %v, body %s", resp.GetStatus(), v.seen, resp.GetBody())
	}
	if got := orderStatus(t, p, order.OrderID); got != StatusPending {
		t.Fatalf("order status = %s after rejection", got)
	}

	v.accept, v.seen = second, nil
	if resp := webhook(t, p, ProviderAlipay); resp.GetStatus() != http.StatusOK || len(v.seen) != 2 {
		t.Fatalf("second accepting: status %d, seen %v", resp.GetStatus(), v.seen)
	}
	if got := orderStatus(t, p, order.OrderID); got != StatusCompleted {
		t.Fatalf("order status = %s, want completed", got)
	}
}
