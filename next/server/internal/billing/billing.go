// Package billing implements model prices (core.Pricer, core.PriceCatalog),
// the balance ledger (core.Ledger), the pre-request balance check
// (core.BalanceGate) and their console APIs (CONTRACTS §5.5).
package billing

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Service is the billing module. It implements core.Pricer,
// core.PriceCatalog, core.BalanceGate and core.Ledger.
type Service struct {
	db       *store.DB
	rdb      redis.UniversalClient
	bus      core.Bus
	events   core.EventPublisher
	registry core.PluginRegistry

	cacheTTL time.Duration

	mu       sync.Mutex
	prices   *priceSnapshot
	resolved map[string]resolved // model
	settings *settingsSnapshot

	unsubscribe func()
}

var (
	_ core.Pricer       = (*Service)(nil)
	_ core.PriceCatalog = (*Service)(nil)
	_ core.BalanceGate  = (*Service)(nil)
	_ core.Ledger       = (*Service)(nil)
)

// New builds the billing service. bus and registry may be nil: without a
// bus, caches only refresh on their TTL (and on local changes); without a
// registry, u() keys are not checked against plugin declarations.
func New(db *store.DB, rdb redis.UniversalClient, bus core.Bus, events core.EventPublisher, registry core.PluginRegistry) *Service {
	s := &Service{
		db:       db,
		rdb:      rdb,
		bus:      bus,
		events:   events,
		registry: registry,
		cacheTTL: time.Minute,
		resolved: map[string]resolved{},
	}
	if bus != nil {
		s.unsubscribe = bus.Subscribe(core.ChannelConfigChanged, func([]byte) { s.invalidate() })
	}
	return s
}

// Close stops the config:changed subscription.
func (s *Service) Close() {
	if s.unsubscribe != nil {
		s.unsubscribe()
	}
}

// invalidate drops the price and settings caches.
func (s *Service) invalidate() {
	s.mu.Lock()
	s.prices = nil
	s.settings = nil
	s.resolved = map[string]resolved{}
	s.mu.Unlock()
}

// changed invalidates locally and tells the other nodes.
func (s *Service) changed(ctx context.Context, key string) {
	s.invalidate()
	if s.bus == nil {
		return
	}
	payload, _ := json.Marshal(map[string]string{"key": key})
	if err := s.bus.Publish(context.WithoutCancel(ctx), core.ChannelConfigChanged, payload); err != nil {
		slog.WarnContext(ctx, "billing: publish config:changed", "err", err)
	}
}

// changedAfterCommit is used when the change happens inside a caller-owned
// transaction: invalidate now and again shortly after the caller commits.
func (s *Service) changedAfterCommit(ctx context.Context, key string) {
	s.invalidate()
	ctx = context.WithoutCancel(ctx)
	time.AfterFunc(time.Second, func() { s.changed(ctx, key) })
}

// RegisterRoutes mounts the billing console API.
func (s *Service) RegisterRoutes(r *httpapi.Router) {
	s.registerPriceRoutes(r)
	s.registerBalanceRoutes(r)
	s.registerSettingsRoutes(r)
}
