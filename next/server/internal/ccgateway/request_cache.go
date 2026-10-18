package ccgateway

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
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
// configuration and the desired revisions also expire after requestCacheTTL.
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

type requestCache struct {
	mu sync.Mutex
	// gen changes with every invalidation; a value read before it changed
	// is not stored.
	gen     uint64
	cfg     *cachedConfig
	desired map[int64]cachedDesired
	// routes is keyed by runtime key and holds the route of one revision.
	routes map[string]*accountRoute
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
	client                                *http.Client
	closeIdle                             func() error
	// closed: the route was dropped; a connection a request still holds is
	// closed when the request ends instead of being kept.
	closed atomic.Bool
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
// for the connection only when there is none for that revision yet.
func (s *Service) route(ctx context.Context, cfg Config, key, revision string) (*accountRoute, error) {
	c := &s.cache
	c.mu.Lock()
	if r := c.routes[key]; r != nil && r.revision == revision {
		c.mu.Unlock()
		return r, nil
	}
	gen := c.gen
	c.mu.Unlock()
	connection, err := s.fetchConnection(ctx, cfg, key, revision)
	if err != nil {
		return nil, err
	}
	r := &accountRoute{key: key, revision: revision, target: connection.target(), base: "http://" + connection.target(), modelKey: connection.Key}
	if s.openAccount == nil {
		switch cfg.Mode {
		case "controller":
			r.client, r.closeIdle = pooledTunnelClient(cfg, key, revision, r.target)
		case "local":
			transport := &http.Transport{Proxy: nil, MaxResponseHeaderBytes: 64 << 10, IdleConnTimeout: routeIdleTimeout}
			r.client = &http.Client{Transport: transport, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
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
		if old.revision == revision {
			// Another request stored one first.
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

// forgetAccount drops what the request path keeps for one account: its
// desired revision and its route.
func (s *Service) forgetAccount(id int64, key string) {
	c := &s.cache
	c.mu.Lock()
	c.gen++
	if d, ok := c.desired[id]; ok && key == "" {
		key = d.d.Key
	}
	delete(c.desired, id)
	r := c.routes[key]
	delete(c.routes, key)
	c.mu.Unlock()
	r.close()
	s.forgetBlocked()
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
