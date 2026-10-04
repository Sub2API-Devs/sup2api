// Package payment implements the payment plugin: online recharge orders,
// redeem codes and promo codes. Balance changes go through the host ledger
// (grant "ledger.credit"), idempotent on the keys documented per service.
package payment

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Plugin is the payment plugin implementation. It serves HTTP routes through
// the embedded Router.
type Plugin struct {
	*pluginsdk.Router

	host pluginsdk.Host
	cfg  *Config

	orderService  *OrderService
	redeemService *RedeemService
	promoService  *PromoService
	httpHandler   *HTTPHandler
}

// Config holds plugin settings.
type Config struct {
	// 插件设置为空对象，所有配置走数据库 payment_config 表
}

var (
	_ pluginsdk.Initializer = (*Plugin)(nil)
	_ pluginsdk.Configurer  = (*Plugin)(nil)
	_ pluginsdk.HTTP        = (*Plugin)(nil)
	_ pluginsdk.Shutdowner  = (*Plugin)(nil)
)

// New returns a plugin with its routes registered.
func New() *Plugin {
	p := &Plugin{Router: pluginsdk.NewRouter()}
	p.orderService = NewOrderService(p.db, p.ledger)
	p.redeemService = NewRedeemService(p.db, p.ledger)
	p.promoService = NewPromoService(p.db, p.ledger)
	p.httpHandler = NewHTTPHandler(p.orderService, p.redeemService, p.promoService)
	p.httpHandler.register(p.Router)
	return p
}

// Init implements pluginsdk.Initializer.
func (p *Plugin) Init(_ context.Context, host pluginsdk.Host) error {
	p.host = host
	slog.Info("payment plugin initialized")
	return nil
}

// Configure implements pluginsdk.Configurer.
func (p *Plugin) Configure(_ context.Context, cfg pluginsdk.Config) error {
	var settings Config
	if err := cfg.Decode(&settings); err != nil {
		return pluginsdk.FieldErrors{}.Add("", "invalid_json", "settings must be a JSON object").Err()
	}
	p.cfg = &settings
	return nil
}

// Shutdown implements pluginsdk.Shutdowner. The SDK closes the pool.
func (p *Plugin) Shutdown(context.Context) error {
	slog.Info("payment plugin shutting down")
	return nil
}

// db returns the shared pool of the plugin schema (grant "db.schema").
func (p *Plugin) db(ctx context.Context) (*pgxpool.Pool, error) {
	if p.host == nil {
		return nil, errors.New("payment: host not initialized")
	}
	pool, err := p.host.DB(ctx)
	if err != nil {
		return nil, fmt.Errorf("payment: database unavailable: %w", err)
	}
	return pool, nil
}

// ledger credits a user's balance (grant "ledger.credit").
func (p *Plugin) ledger(ctx context.Context, ch pluginsdk.LedgerChange) (*pluginsdk.LedgerResult, error) {
	if p.host == nil {
		return nil, errors.New("payment: host not initialized")
	}
	return p.host.LedgerCredit(ctx, ch)
}

// dbFunc and creditFunc decouple the services from the host for tests.
type (
	dbFunc     func(context.Context) (*pgxpool.Pool, error)
	creditFunc func(context.Context, pluginsdk.LedgerChange) (*pluginsdk.LedgerResult, error)
)
