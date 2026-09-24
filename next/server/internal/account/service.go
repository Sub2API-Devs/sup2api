// Package account implements upstream accounts: account types declared by
// plugins (identified by plugin key + type id), account CRUD with encrypted credentials, the console
// "test account" action, and the gateway's core.AccountDirectory.
package account

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Deps are the collaborators of the account service.
type Deps struct {
	DB       *store.DB
	Redis    redis.UniversalClient
	Cipher   *secret.Cipher
	Registry core.PluginRegistry
	Proxies  core.ProxyDirectory
	Events   core.EventPublisher
	Slots    core.Slots // optional: in_use column is 0 without it
	Bus      core.Bus   // optional: single node without it
	// Converters reports the protocol pairs the gateway can convert; optional
	// (nil: account types only list the endpoints they serve natively).
	Converters core.ProtocolConverters
	// AllowPrivateUpstream disables the private-address guard of the test
	// action (config SUB2API_GATEWAY_ALLOW_PRIVATE_UPSTREAM).
	AllowPrivateUpstream bool
}

const (
	snapshotTTL   = 30 * time.Second
	flushInterval = 10 * time.Second
	testTimeout   = 30 * time.Second
	// Mask replaces sensitive credential values in responses; sending it back
	// in a PATCH keeps the stored value.
	Mask = "******"
)

// Service serves the account endpoints and implements core.AccountDirectory.
type Service struct {
	d Deps

	schemas sync.Map // sha256(schema) -> *jsonschema.Schema

	sf       singleflight.Group
	cacheMu  sync.Mutex
	epoch    uint64
	groups   map[int64]groupSnap
	accounts map[int64]accountSnap

	touchMu sync.Mutex
	touched map[int64]time.Time
}

type groupSnap struct {
	at   time.Time
	refs []core.AccountRef
}

type accountSnap struct {
	at  time.Time
	acc core.Account
}

var _ core.AccountDirectory = (*Service)(nil)

// New builds the account service. Call Run to receive account:changed
// broadcasts and persist last_used_at.
func New(d Deps) *Service {
	return &Service{
		d:        d,
		groups:   map[int64]groupSnap{},
		accounts: map[int64]accountSnap{},
		touched:  map[int64]time.Time{},
	}
}

// RegisterRoutes mounts the account and account type endpoints.
func (s *Service) RegisterRoutes(r *httpapi.Router) {
	r.Perm("GET", "/platforms", "account:read", s.listPlatforms)
	r.Authed("GET", "/me/platforms", s.listMyPlatforms)
	r.Perm("GET", "/account-types", "account:read", s.listTypes)
	r.Perm("GET", "/account-types/:plugin_key/:type/form", "account:read", s.typeForm)
	r.Perm("GET", "/accounts", "account:read", s.list)
	r.Perm("POST", "/accounts", "account:create", s.create)
	r.Perm("GET", "/accounts/:id", "account:read", s.get)
	r.Perm("PATCH", "/accounts/:id", "account:update", s.update)
	r.Perm("DELETE", "/accounts/:id", "account:delete", s.delete)
	r.Perm("POST", "/accounts/:id/test", "account:test", s.test)
	r.Perm("POST", "/accounts/:id/credentials/reveal", "account:credential:view", s.reveal)
}

// Run subscribes to account:changed and flushes last_used_at every 10 s
// until ctx is done.
func (s *Service) Run(ctx context.Context) {
	if s.d.Bus != nil {
		cancel := s.d.Bus.Subscribe(core.ChannelAccountChanged, func([]byte) { s.invalidate() })
		defer cancel()
	}
	tk := time.NewTicker(flushInterval)
	defer tk.Stop()
	for {
		select {
		case <-ctx.Done():
			fctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			if err := s.FlushLastUsed(fctx); err != nil {
				slog.Warn("account: flush last_used_at", "err", err)
			}
			cancel()
			return
		case <-tk.C:
			if err := s.FlushLastUsed(ctx); err != nil {
				slog.WarnContext(ctx, "account: flush last_used_at", "err", err)
			}
		}
	}
}

// invalidate drops every cached snapshot on this node.
func (s *Service) invalidate() {
	s.cacheMu.Lock()
	s.epoch++
	s.groups = map[int64]groupSnap{}
	s.accounts = map[int64]accountSnap{}
	s.cacheMu.Unlock()
}

// changed invalidates local caches and tells the other nodes.
func (s *Service) changed(ctx context.Context, id int64) {
	s.invalidate()
	if s.d.Bus == nil {
		return
	}
	b, _ := json.Marshal(map[string]int64{"account_id": id})
	if err := s.d.Bus.Publish(ctx, core.ChannelAccountChanged, b); err != nil {
		slog.WarnContext(ctx, "account: publish account:changed", "err", err)
	}
}

func (s *Service) gen() core.Generation {
	if s.d.Registry == nil {
		return nil
	}
	return s.d.Registry.Current()
}

func (s *Service) accountType(pluginKey, typ string) (core.AccountTypeBinding, bool) {
	g := s.gen()
	if g == nil {
		return core.AccountTypeBinding{}, false
	}
	return g.AccountType(pluginKey, typ)
}

func (s *Service) pluginActive(key string) bool {
	g := s.gen()
	if g == nil {
		return false
	}
	_, ok := g.Plugin(key)
	return ok
}

func t(ctx context.Context, en, zh string) string {
	if core.Locale(ctx) == "zh" {
		return zh
	}
	return en
}

func cooldownKey(id int64) string { return "cooldown:account:" + itoa(id) }
