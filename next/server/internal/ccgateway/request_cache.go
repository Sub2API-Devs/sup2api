package ccgateway

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Forwarding a model request needs the configuration, the account's desired
// revision, the runtime's connection (address and Worker key) and a tunnel.
// They only change with the configuration, an account, a proxy or a runtime,
// so they are kept between requests (2026-10-11) instead of being read from
// the database and the controller every time. A change drops them on this
// node and, through the bus, on the others. The bus is best-effort, so the
// configuration and the desired revisions also expire after requestCacheTTL,
// and a route is only used for the controller of the configuration read and
// for routeMaxAge (audit A4).
// A connection is only asked from the controller for the revision the core
// wants, and every new tunnel carries it (the controller answers 409 unless
// it is the applied one); dropping a route closes its idle tunnels.
var requestCacheTTL = 30 * time.Second

// routeIdleTimeout keeps an idle connection to a Worker shorter than the
// Worker's own idle timeout (60 s), so a kept connection is not one the
// Worker is closing.
const routeIdleTimeout = 30 * time.Second

// ccgatewayChange is published on config:changed when the CCGateway
// configuration is saved.
const ccgatewayChange = "ccgateway"
const ccgatewayFeatureChange = "ccgateway_features"

func (s *Service) invalidateFeatureConfig() {
	s.cache.mu.Lock()
	s.cache.gen++
	s.cache.cfg = nil
	s.cache.mu.Unlock()
}

func (s *Service) featureConfigChanged(ctx context.Context) {
	s.invalidateFeatureConfig()
	if s.Bus != nil {
		b, _ := json.Marshal(map[string]string{"type": ccgatewayFeatureChange})
		if err := s.Bus.Publish(context.WithoutCancel(ctx), core.ChannelConfigChanged, b); err != nil {
			slog.WarnContext(ctx, "CCGateway: publish feature config change", "err", err)
		}
	}
}

type requestCache struct {
	mu sync.Mutex
	// gen changes with every invalidation; a value read before it changed
	// is not stored.
	gen     uint64
	cfg     *cachedConfig
	desired map[int64]cachedDesired
	// features holds each account's CC feature policy (audit A7); it changes
	// with the account, so account:changed drops it with the desired state.
	features map[int64]cachedFeatures
	// routes is keyed by runtime key and holds the route of one revision.
	routes map[string]*accountRoute
}

type cachedFeatures struct {
	p  AccountFeaturePolicy
	at time.Time
}

type cachedConfig struct {
	c  Config
	at time.Time
}

type cachedDesired struct {
	d  accountDesired
	at time.Time
}

// accountRoute is how this node reaches one runtime at one revision. client
// is shared by the requests (its idle tunnels are reused); nil opens a
// client per request (SSH mode, whose connection lives with the request).
type accountRoute struct {
	key, revision, base, target, modelKey string
	// endpoint is the controller the connection was asked from
	// (controllerEndpoint): a configuration that names another one, read once
	// the configuration expired, never reuses the route (audit A4).
	endpoint  string
	client    *http.Client
	closeIdle func() error
	// at is when the controller last confirmed the connection; after
	// routeMaxAge it is asked again (guarded by requestCache.mu).
	at time.Time
	// health is the Worker's last /healthz answer through this route and when
	// it was read (guarded by requestCache.mu): the capability check of a
	// model request reuses it for requestCacheTTL (audit A7). The Worker still
	// refuses a policy its CLI cannot apply itself, so a stale answer only
	// delays the core's own, clearer refusal.
	health   *workerHealth
	healthAt time.Time
	// closed: the route was dropped; a connection a request still holds is
	// closed when the request ends instead of being kept.
	closed atomic.Bool
}

// routeMaxAge is how long a route is used before the controller is asked for
// the connection again: the bus is best-effort and a runtime's address or
// Worker key may change behind the same revision. An unchanged answer keeps
// the route and its tunnels.
var routeMaxAge = 5 * time.Minute

// controllerEndpoint identifies what a route's connection was asked from: the
// mode, address and trust of the controller and the management key.
func controllerEndpoint(cfg Config) string {
	return revisionOf(strings.Join([]string{cfg.Mode, cfg.panelScheme(), cfg.Host, strconv.Itoa(cfg.Port), cfg.BasePath, cfg.ControllerCA, cfg.AdminKey}, "\x00"))
}

// fresh reports whether r serves revision through endpoint without asking
// the controller (caller holds requestCache.mu).
func (r *accountRoute) fresh(revision, endpoint string) bool {
	return r != nil && r.revision == revision && r.endpoint == endpoint && time.Since(r.at) < routeMaxAge
}

// same reports whether r is the connection other describes.
func (r *accountRoute) same(other *accountRoute) bool {
	return r.revision == other.revision && r.endpoint == other.endpoint && r.target == other.target && r.modelKey == other.modelKey
}

func (r *accountRoute) close() {
	if r != nil && r.closeIdle != nil {
		r.closed.Store(true)
		_ = r.closeIdle()
	}
}

// requestConfig is Load for the request path.
func (s *Service) requestConfig(ctx context.Context) (Config, error) {
	c := &s.cache
	c.mu.Lock()
	if c.cfg != nil && time.Since(c.cfg.at) < requestCacheTTL {
		cfg := c.cfg.c
		c.mu.Unlock()
		return cfg, nil
	}
	gen := c.gen
	c.mu.Unlock()
	cfg, err := s.Load(ctx)
	if err != nil {
		return cfg, err
	}
	c.mu.Lock()
	if c.gen == gen {
		c.cfg = &cachedConfig{c: cfg, at: time.Now()}
	}
	c.mu.Unlock()
	return cfg, nil
}

// requestDesired is desired (without credentials) for the request path;
// cached reports whether it came from the cache.
func (s *Service) requestDesired(ctx context.Context, id int64) (d accountDesired, cached bool, err error) {
	c := &s.cache
	c.mu.Lock()
	if e, ok := c.desired[id]; ok && time.Since(e.at) < requestCacheTTL {
		c.mu.Unlock()
		return e.d, true, nil
	}
	gen := c.gen
	c.mu.Unlock()
	d, err = s.desired(ctx, id, false)
	if err != nil {
		return d, false, err
	}
	c.mu.Lock()
	if c.gen == gen {
		if c.desired == nil {
			c.desired = map[int64]cachedDesired{}
		}
		c.desired[id] = cachedDesired{d: d, at: time.Now()}
	}
	c.mu.Unlock()
	return d, false, nil
}

// route returns the route of runtime key at revision, asking the controller
// for the connection only when there is no fresh one for that revision and
// controller yet.
func (s *Service) route(ctx context.Context, cfg Config, key, revision string) (*accountRoute, error) {
	endpoint := controllerEndpoint(cfg)
	c := &s.cache
	c.mu.Lock()
	if r := c.routes[key]; r.fresh(revision, endpoint) {
		c.mu.Unlock()
		return r, nil
	}
	gen := c.gen
	c.mu.Unlock()
	connection, err := s.fetchConnection(ctx, cfg, key, revision)
	if err != nil {
		return nil, err
	}
	r := &accountRoute{key: key, revision: revision, endpoint: endpoint, target: connection.target(), base: "http://" + connection.target(), modelKey: connection.Key, at: time.Now()}
	if s.openAccount == nil {
		switch cfg.Mode {
		case "controller":
			r.client, r.closeIdle = pooledTunnelClient(cfg, key, revision, r.target)
		case "local":
			transport := &http.Transport{Proxy: nil, MaxResponseHeaderBytes: 64 << 10, IdleConnTimeout: routeIdleTimeout}
			r.client = newNoRedirectClient(transport)
			r.closeIdle = func() error { transport.CloseIdleConnections(); return nil }
		}
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.gen != gen {
		// Invalidated meanwhile: serve this request, keep nothing.
		r.closed.Store(true)
		return r, nil
	}
	if old := c.routes[key]; old != nil {
		if old.same(r) {
			// Another request stored it first, or the controller confirmed
			// the kept connection: keep it and its tunnels.
			old.at = r.at
			r.close()
			return old, nil
		}
		old.close()
	}
	if c.routes == nil {
		c.routes = map[string]*accountRoute{}
	}
	c.routes[key] = r
	return r, nil
}

// openRoute returns the HTTP client of a route; close ends a client opened
// for this request only.
func (s *Service) openRoute(ctx context.Context, cfg Config, r *accountRoute) (*http.Client, func() error, error) {
	if r.client != nil {
		return r.client, func() error {
			if r.closed.Load() {
				_ = r.closeIdle()
			}
			return nil
		}, nil
	}
	return s.openAccountTransport(ctx, cfg, r.key, r.revision, r.target)
}

// requestAccountFeatures is LoadAccountFeaturePolicy for the request path:
// read once per account and kept like its desired state (audit A7; §49.18
// said forwarding no longer reads the database, the account policy was the
// exception).
func (s *Service) requestAccountFeatures(ctx context.Context, id int64) (AccountFeaturePolicy, error) {
	c := &s.cache
	c.mu.Lock()
	if e, ok := c.features[id]; ok && time.Since(e.at) < requestCacheTTL {
		c.mu.Unlock()
		return e.p, nil
	}
	gen := c.gen
	c.mu.Unlock()
	p, err := LoadAccountFeaturePolicy(ctx, s.DB.Pool, id)
	if err != nil {
		return p, err
	}
	c.mu.Lock()
	if c.gen == gen {
		if c.features == nil {
			c.features = map[int64]cachedFeatures{}
		}
		c.features[id] = cachedFeatures{p: p, at: time.Now()}
	}
	c.mu.Unlock()
	return p, nil
}

// routeHealth is the Worker health r last read, nil when there is none or it
// is older than requestCacheTTL.
func (s *Service) routeHealth(r *accountRoute) *workerHealth {
	s.cache.mu.Lock()
	defer s.cache.mu.Unlock()
	if r.health == nil || time.Since(r.healthAt) >= requestCacheTTL {
		return nil
	}
	return r.health
}

func (s *Service) keepRouteHealth(r *accountRoute, h workerHealth) {
	s.cache.mu.Lock()
	r.health, r.healthAt = &h, time.Now()
	s.cache.mu.Unlock()
}

// forgetAccount drops what the request path keeps for one account: its
// desired revision, its feature policy and its route.
func (s *Service) forgetAccount(id int64, key string) {
	c := &s.cache
	c.mu.Lock()
	c.gen++
	if d, ok := c.desired[id]; ok && key == "" {
		key = d.d.Key
	}
	delete(c.desired, id)
	delete(c.features, id)
	r := c.routes[key]
	delete(c.routes, key)
	c.mu.Unlock()
	r.close()
	s.forgetBlocked()
}

// AccountChanged follows a committed change of account id on this node (the
// account service calls it next to publishing account:changed, so the node
// that saved does not depend on receiving its own message).
func (s *Service) AccountChanged(id int64) {
	if s == nil || id <= 0 {
		return
	}
	s.forgetAccount(id, "")
}

// workerChanged follows an in-place Worker update of runtime key (of
// account id, 0 for an unadopted draft): the Worker's capabilities may differ
// behind the same revision, so this node drops the route and the other nodes
// are told through account:changed.
func (s *Service) workerChanged(ctx context.Context, id int64, key string) {
	s.forgetAccount(id, key)
	if s.Bus == nil || id <= 0 {
		return
	}
	b, _ := json.Marshal(map[string]int64{"account_id": id})
	if err := s.Bus.Publish(context.WithoutCancel(ctx), core.ChannelAccountChanged, b); err != nil {
		slog.WarnContext(ctx, "CCGateway: publish account:changed", "err", err)
	}
}

// invalidateRequests drops everything the request path keeps. keepConfig
// keeps the configuration (an account or proxy changed, not it).
func (s *Service) invalidateRequests(keepConfig bool) {
	c := &s.cache
	c.mu.Lock()
	c.gen++
	if !keepConfig {
		c.cfg = nil
	}
	c.desired = nil
	c.features = nil
	routes := c.routes
	c.routes = nil
	c.mu.Unlock()
	for _, r := range routes {
		r.close()
	}
	s.forgetBlocked()
}

// configChanged follows a saved configuration: this node drops its request
// cache and the other nodes theirs.
func (s *Service) configChanged(ctx context.Context) {
	s.invalidateRequests(false)
	s.sweepSoon()
	if s.Bus == nil {
		return
	}
	b, _ := json.Marshal(map[string]string{"type": ccgatewayChange})
	if err := s.Bus.Publish(context.WithoutCancel(ctx), core.ChannelConfigChanged, b); err != nil {
		slog.WarnContext(ctx, "CCGateway: publish config:changed", "err", err)
	}
}

// onConfigChanged serves config:changed: a saved CCGateway configuration
// drops the request cache; a changed proxy changes the revision of the
// runtimes behind it, so they are reconciled now rather than at the next
// sweep. Other configuration messages are not ours.
func (s *Service) onConfigChanged(payload []byte) {
	var m struct {
		Type string `json:"type"`
	}
	if json.Unmarshal(payload, &m) != nil {
		return
	}
	switch m.Type {
	case ccgatewayFeatureChange:
		s.invalidateFeatureConfig()
	case ccgatewayChange:
		s.invalidateRequests(false)
		s.sweepSoon()
	case "proxy":
		s.invalidateRequests(true)
		s.sweepSoon()
	}
}

// onAccountChanged serves account:changed: the account (or, without an id,
// every account) is read again. The node that changed a CCGateway account
// reconciles its runtime (kickCCGateway).
func (s *Service) onAccountChanged(payload []byte) {
	var m struct {
		AccountID int64 `json:"account_id"`
	}
	_ = json.Unmarshal(payload, &m)
	if m.AccountID <= 0 {
		s.invalidateRequests(true)
		return
	}
	s.forgetAccount(m.AccountID, "")
}

// sweepSoon starts a reconcile pass of every runtime now.
func (s *Service) sweepSoon() {
	select {
	case s.sweepNow <- struct{}{}:
	default:
	}
}
