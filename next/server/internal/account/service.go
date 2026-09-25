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
	// Limiter reports rpm/tpm/tpd usage (rate_usage column); optional.
	Limiter core.AccountLimiter
	Bus     core.Bus // optional: single node without it
	// Converters reports the protocol pairs the gateway can convert; optional
	// (nil: account types only list the endpoints they serve natively).
	Converters core.ProtocolConverters
	// AllowPrivateUpstream disables the private-address guard of the test
	// action (config SUB2API_GATEWAY_ALLOW_PRIVATE_UPSTREAM).
	AllowPrivateUpstream bool
	// Authorizer answers the permission questions handlers ask beyond the
	// route key (proxy visibility, account:settings:custom; CONTRACTS §21).
	// nil denies everything it is asked.
	Authorizer core.Authorizer
	// Resolver finds or creates the proxy named by proxy_url when an account
	// is saved (CONTRACTS §21.4); nil rejects proxy_url as unsupported.
	Resolver core.ProxyResolver
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

// RegisterRoutes mounts the account and account type endpoints. Every route
// accepts the "all" key or its "own" counterpart (CONTRACTS §21.2); handlers
// narrow their SQL with core.OwnerScope.
func (s *Service) RegisterRoutes(r *httpapi.Router) {
	browse := []string{"account:read", "account:own:read", "account:own:create"}
	r.PermAny("GET", "/platforms", s.listPlatforms, browse...)
	r.Authed("GET", "/me/platforms", s.listMyPlatforms)
	r.PermAny("GET", "/account-types", s.listTypes, browse...)
	r.PermAny("GET", "/account-types/:plugin_key/:type/form", s.typeForm, browse...)
	r.PermAny("GET", "/accounts", s.list, "account:read", "account:own:read")
	r.PermAny("POST", "/accounts", s.create, "account:create", "account:own:create")
	r.PermAny("GET", "/accounts/:id", s.get, "account:read", "account:own:read")
	r.PermAny("PATCH", "/accounts/:id", s.update, "account:update", "account:own:update")
	r.PermAny("DELETE", "/accounts/:id", s.delete, "account:delete", "account:own:delete")
	r.PermAny("POST", "/accounts/:id/test", s.test, "account:test", "account:own:test")
	r.PermAny("POST", "/accounts/:id/models/fetch", s.fetchAccountModels, "account:test", "account:own:test")
	r.PermAny("POST", "/account-types/:plugin_key/:type/models/fetch", s.fetchTypeModels, "account:create", "account:own:create")
	r.PermAny("POST", "/accounts/:id/credentials/reveal", s.reveal, "account:credential:view", "account:own:credential:view")
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

// activePluginKeys lists the plugins of the current generation; nil before
// the first generation is loaded (then nothing is filtered).
func (s *Service) activePluginKeys() []string {
	g := s.gen()
	if g == nil {
		return nil
	}
	ps := g.Plugins()
	keys := make([]string, 0, len(ps))
	for _, p := range ps {
		keys = append(keys, p.Key)
	}
	return keys
}

// can asks the Authorizer whether the caller holds key; errors and a missing
// Authorizer count as "no".
func (s *Service) can(ctx context.Context, key string) bool {
	if s.d.Authorizer == nil {
		return false
	}
	uid, ok := core.UserID(ctx)
	if !ok {
		return false
	}
	granted, err := s.d.Authorizer.Can(ctx, uid, key)
	if err != nil {
		slog.WarnContext(ctx, "account: permission check", "permission", key, "err", err)
		return false
	}
	return granted
}

// customSettings reports whether the caller may set guarded settings to
// values other than the official ones (account:settings:custom, CONTRACTS
// §21.3).
func (s *Service) customSettings(ctx context.Context) bool {
	return s.can(ctx, "account:settings:custom")
}

// proxyRange is the set of proxies a caller may reference (by proxy_id) or
// match (proxy_url): scope nil means every proxy, otherwise the rows created
// by *scope; none means the caller holds no proxy key and sees nothing.
type proxyRange struct {
	scope *int64
	none  bool
}

// allProxies is the range of callers holding the "all" account key: proxy_id
// only has to exist.
var allProxies = proxyRange{}

// proxyRangeOf computes the caller's proxy visibility (CONTRACTS §21.4):
// proxy:read sees every proxy; proxy:own:read or proxy:own:manage see the
// caller's own; anything else sees none.
func (s *Service) proxyRangeOf(ctx context.Context) proxyRange {
	if s.can(ctx, "proxy:read") {
		return allProxies
	}
	if s.can(ctx, "proxy:own:read") || s.can(ctx, "proxy:own:manage") {
		uid, _ := core.UserID(ctx)
		return proxyRange{scope: &uid}
	}
	return proxyRange{none: true}
}

// proxyRangeFor returns the proxies a caller of a route registered with
// allKey may reference: everything under the "all" key, the visible range
// under the "own" key.
func (s *Service) proxyRangeFor(ctx context.Context, allKey string) proxyRange {
	if core.OwnerScope(ctx, allKey) == nil {
		return allProxies
	}
	return s.proxyRangeOf(ctx)
}

func t(ctx context.Context, en, zh string) string {
	if core.Locale(ctx) == "zh" {
		return zh
	}
	return en
}

func cooldownKey(id int64) string { return "cooldown:account:" + itoa(id) }
