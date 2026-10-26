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
// node and, through the bus, on the others. Every such change publishes:
// config saves, controller install/upgrade and runtime updates use
// config:changed (configChanged), account saves account:changed (and the
// saving node calls AccountChanged directly), a saved proxy config:changed
// "proxy", and a saved feature policy ccgateway_features (an account's
// request log level ccgateway_request_log with its id). The bus is
// best-effort, so the entries still expire after requestCacheTTL as a
// fallback: a change whose message was lost is picked up within five minutes
// instead of thirty seconds, and a route is only used for the controller of
// the configuration read and for routeMaxAge (audit A4).
// A connection is only asked from the controller for the revision the core
// wants, and every new tunnel carries it (the controller answers 409 unless
// it is the applied one); dropping a route closes its idle tunnels.
var requestCacheTTL = 5 * time.Minute

// healthCacheTTL keeps the Worker's last /healthz answer as short-lived as
// before: raising the configuration fallback must not extend how long a
// capability answer is trusted.
const healthCacheTTL = 30 * time.Second

// routeIdleTimeout keeps an idle connection to a Worker. The Worker closes an
// idle keep-alive connection itself (next/plugins/ccgateway/companions/
// worker/internal/server/server.go, http.Server.IdleTimeout; being raised to
// at least 180 s), so this must stay below it: a POST sent on a connection the
// Worker is closing is not retried. Keeping it long makes a request after a
// longer pause reuse the tunnel instead of paying a new TLS connection, the
// controller's lock and a Worker round trip before the first token. The
// controller's relay idle timeout (3700 s) is not the constraint.
const routeIdleTimeout = 110 * time.Second

// ccgatewayChange is published on config:changed when the CCGateway
// configuration is saved.
const ccgatewayChange = "ccgateway"
const ccgatewayFeatureChange = "ccgateway_features"

// ccgatewayRequestLogChange is published on config:changed with the account
// id when an account's request log level is saved: the other nodes drop only
// that account's cached level (an older core ignores the type and picks the
// change up after requestCacheTTL).
const ccgatewayRequestLogChange = "ccgateway_request_log"

// forgetRequestLog drops account id's cached request log level on this node.
func (s *Service) forgetRequestLog(id int64) {
	s.cache.mu.Lock()
	s.cache.gen++
	delete(s.cache.requestLogs, id)
	s.cache.mu.Unlock()
}

// requestLogChanged follows a saved request log level of account id: this
// node drops it now, the others through the bus.
func (s *Service) requestLogChanged(ctx context.Context, id int64) {
	s.forgetRequestLog(id)
	if s.Bus == nil {
		return
	}
	b, _ := json.Marshal(map[string]any{"type": ccgatewayRequestLogChange, "account_id": id})
	if err := s.Bus.Publish(context.WithoutCancel(ctx), core.ChannelConfigChanged, b); err != nil {
		slog.WarnContext(ctx, "CCGateway: publish request log change", "err", err)
	}
}

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
	gen uint64
	// cfg holds the configuration under the one key configKey.
	cfg     map[configKey]cacheEntry[Config]
	desired map[int64]cacheEntry[accountDesired]
	// features holds each account's CC feature policy (audit A7); it changes
	// with the account, so account:changed drops it with the desired state.
	features map[int64]cacheEntry[AccountFeaturePolicy]
	// requestLogs holds each account's own request log level (CONTRACTS
	// §65); a saved level drops it (requestLogChanged), like the account.
	requestLogs map[int64]cacheEntry[AccountRequestLog]
	// routes is keyed by runtime key and holds the route of one revision.
	routes map[string]*accountRoute
}

// configKey is the key of the one cached configuration.
type configKey struct{}

// cacheEntry is a value the request path read, and when.
type cacheEntry[V any] struct {
	v  V
	at time.Time
}

// readThrough is (*m)[k] while it is younger than requestCacheTTL, else what
// load reads, kept unless the cache was invalidated meanwhile; cached
// reports whether it came from the cache. load runs without the lock.
func readThrough[K comparable, V any](c *requestCache, m *map[K]cacheEntry[V], k K, load func() (V, error)) (v V, cached bool, err error) {
	c.mu.Lock()
	if e, ok := (*m)[k]; ok && time.Since(e.at) < requestCacheTTL {
		c.mu.Unlock()
		return e.v, true, nil
	}
	gen := c.gen
	c.mu.Unlock()
	v, err = load()
	if err != nil {
		return v, false, err
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.gen == gen {
		if *m == nil {
			*m = map[K]cacheEntry[V]{}
		}
		(*m)[k] = cacheEntry[V]{v: v, at: time.Now()}
	}
	return v, false, nil
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
	// model request reuses it for healthCacheTTL (audit A7). The Worker still
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
	cfg, _, err := readThrough(&s.cache, &s.cache.cfg, configKey{}, func() (Config, error) { return s.Load(ctx) })
	return cfg, err
}

// requestDesired is desired (without credentials) for the request path;
// cached reports whether it came from the cache.
func (s *Service) requestDesired(ctx context.Context, id int64) (d accountDesired, cached bool, err error) {
	return readThrough(&s.cache, &s.cache.desired, id, func() (accountDesired, error) { return s.desired(ctx, id, false) })
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
	p, _, err := readThrough(&s.cache, &s.cache.features, id, func() (AccountFeaturePolicy, error) { return LoadAccountFeaturePolicy(ctx, s.DB.Pool, id) })
	return p, err
}

// routeHealth is the Worker health r last read, nil when there is none or it
// is older than healthCacheTTL.
func (s *Service) routeHealth(r *accountRoute) *workerHealth {
	s.cache.mu.Lock()
	defer s.cache.mu.Unlock()
	if r.health == nil || time.Since(r.healthAt) >= healthCacheTTL {
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
		key = d.v.Key
	}
	delete(c.desired, id)
	delete(c.features, id)
	delete(c.requestLogs, id)
	r := c.routes[key]
	delete(c.routes, key)
	c.mu.Unlock()
	r.close()
	s.forgetBlocked()
}

// AccountChanged follows a committed change of account id on this node (the
// account service calls it next to publishing account:changed, so the node
// that saved does not depend on receiving its own message). id 0 is a bulk
// change (a plugin's accounts purged): every account is read again, like a
// message without an id (onAccountChanged).
func (s *Service) AccountChanged(id int64) {
	switch {
	case s == nil || id < 0:
	case id == 0:
		s.invalidateRequests(true)
	default:
		s.forgetAccount(id, "")
	}
}

// workerChanged follows an in-place Worker update of runtime key (of
// account id, 0 for an unadopted draft): the Worker's capabilities may differ
// behind the same revision, so this node drops the route and the other nodes
// are told through account:changed.
func (s *Service) workerChanged(ctx context.Context, id int64, key string) {
	s.forgetAccount(id, key)
	if id <= 0 {
		return
	}
	if err := core.PublishAccountChanged(context.WithoutCancel(ctx), s.Bus, id); err != nil {
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
	c.requestLogs = nil
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
		Type      string `json:"type"`
		AccountID int64  `json:"account_id"`
	}
	if json.Unmarshal(payload, &m) != nil {
		return
	}
	switch m.Type {
	case ccgatewayRequestLogChange:
		if m.AccountID > 0 {
			s.forgetRequestLog(m.AccountID)
		}
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
