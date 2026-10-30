// Package moderation implements the prompt moderation plugin (CONTRACTS §20,
// 0.2 per §72): a gateway.request hook that runs the flow bound to the
// request's group. Flows are stages of auditors (OpenAI moderation, TypeSafe
// Jev, LLM verdict) on configured channels. Users on the watch list at the
// enforce level (or everyone in enforce mode) are moderated before the
// upstream call and refused on a hit; the others pass at once and are
// moderated in the background. Suspicious users join the watch list
// automatically, and repeated violations may ban them.
package moderation

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/sync/singleflight"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/batch"
)

// Plugin is the moderation plugin. It implements pluginsdk.Hook,
// pluginsdk.JobRunner, pluginsdk.HTTP, pluginsdk.BroadcastHandler and the
// lifecycle interfaces.
type Plugin struct {
	*pluginsdk.Router
	*pluginsdk.BroadcastMux

	host       pluginsdk.Host
	log        *slog.Logger
	now        func() time.Time
	cfg        atomic.Pointer[config]
	httpClient *http.Client

	agent *agent
	cache atomic.Pointer[lru]
	sf    singleflight.Group
	sem   atomic.Pointer[semaphore]

	snap   atomic.Pointer[snapshot]
	snapMu sync.Mutex

	watch        atomic.Pointer[map[int64]watchEntry]
	watchMu      sync.Mutex
	watchVersion atomic.Int64

	legacyDone atomic.Bool
	// configured: Configure ran at least once, so the legacy conversion
	// sees the real settings and not the defaults.
	configured atomic.Bool

	// Post queue: workers = max_concurrency, capacity = queue_size.
	poolMu sync.RWMutex
	pool   *workerPool
	closed bool

	eventWriter *batch.Writer[eventRec]

	// blocked maps user id -> expiry (zero = until unblocked).
	blocked        atomic.Pointer[map[int64]time.Time]
	blockReloadMu  sync.Mutex
	blockReloadSeq uint64
	refreshEvery   time.Duration
	refreshNow     chan struct{}

	stats struct {
		calls, errors, cacheHits, dropped, droppedEvents, kvErrors atomic.Int64
		inflight, latencyMsSum                                     atomic.Int64
	}

	bg     context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// New returns the plugin.
func New() *Plugin {
	p := &Plugin{
		Router:       pluginsdk.NewRouter(),
		BroadcastMux: pluginsdk.NewBroadcastMux(),
		log:          slog.Default(),
		now:          time.Now,
		httpClient:   newHTTPClient(),
		agent:        newAgent(),
		refreshEvery: 5 * time.Second,
		refreshNow:   make(chan struct{}, 1),
	}
	p.bg, p.cancel = context.WithCancel(context.Background())
	c := compile(DefaultSettings())
	p.cfg.Store(c)
	p.cache.Store(newLRU(c.CacheEntries))
	p.sem.Store(newSemaphore(c.MaxConcurrency))
	empty := map[int64]time.Time{}
	p.blocked.Store(&empty)
	noWatch := map[int64]watchEntry{}
	p.watch.Store(&noWatch)
	p.watchVersion.Store(-1)
	p.snap.Store(emptySnapshot())
	p.routes()
	p.OnTopic(TopicBlocksChanged, p.onBroadcast(p.reloadBlocks))
	p.OnTopic(TopicConfigChanged, p.onBroadcast(p.reloadConfig))
	p.OnTopic(TopicWatchChanged, p.onBroadcast(p.reloadWatch))
	return p
}

// Init implements pluginsdk.Initializer: starts the event writer, the
// refresher and the post workers.
func (p *Plugin) Init(_ context.Context, h pluginsdk.Host) error {
	p.host = h
	p.log = h.Logger()
	p.eventWriter = batch.New(p.bg, 4096, func(ctx context.Context, evs []eventRec) error {
		ids, err := p.writeEvents(ctx, evs)
		if err != nil {
			p.log.Warn("moderation: write events failed", "error", err.Error(), "events", len(evs))
			return err
		}
		p.afterWrite(ctx, evs, ids)
		return nil
	}, func(n int) {
		p.stats.droppedEvents.Add(int64(n))
	})
	p.wg.Add(1)
	go p.refreshLoop(p.bg)
	c := p.cfg.Load()
	p.resizePool(c.MaxConcurrency, c.QueueSize)
	p.kickRefresh()
	return nil
}

// Configure implements pluginsdk.Configurer. It is lenient: the console
// validates against the schema, odd values are clamped here.
func (p *Plugin) Configure(_ context.Context, cfg pluginsdk.Config) error {
	s, err := DecodeSettings(cfg.JSON)
	if err != nil {
		return pluginsdk.FieldErrors{}.Add("", "invalid_json", "settings must be a JSON object / 设置必须是 JSON 对象").Err()
	}
	c := compile(s)
	c.settingsHash = settingsDigest(cfg.JSON)
	old := p.cfg.Swap(c)
	if old == nil || old.MaxConcurrency != c.MaxConcurrency {
		p.sem.Store(newSemaphore(c.MaxConcurrency))
	}
	if old == nil || old.CacheEntries != c.CacheEntries {
		p.cache.Store(newLRU(c.CacheEntries))
	}
	if p.host != nil {
		p.resizePool(c.MaxConcurrency, c.QueueSize)
		// The Jev default set is compiled into the auditors.
		if old != nil && RulesVersionOf(&old.jevDefault) != RulesVersionOf(&c.jevDefault) {
			go func() {
				ctx, cancel := context.WithTimeout(p.bg, 10*time.Second)
				defer cancel()
				_ = p.reloadConfig(ctx)
			}()
		}
	}
	if !p.configured.Swap(true) || (c.enabled && (old == nil || !old.enabled)) {
		p.kickRefresh()
	}
	return nil
}

// Health implements pluginsdk.HealthChecker.
func (p *Plugin) Health(context.Context) (*pluginv1.HealthResponse, error) {
	qlen, _ := p.queueLen()
	return &pluginv1.HealthResponse{Healthy: true, Metrics: map[string]float64{
		"calls":          float64(p.stats.calls.Load()),
		"errors":         float64(p.stats.errors.Load()),
		"queue":          float64(qlen),
		"dropped":        float64(p.stats.dropped.Load()),
		"dropped_events": float64(p.stats.droppedEvents.Load()),
		"cache_hits":     float64(p.stats.cacheHits.Load()),
		"inflight":       float64(p.stats.inflight.Load()),
		"blocked_users":  float64(p.blockedCount()),
		"watched_users":  float64(len(*p.watch.Load())),
	}}, nil
}

// Shutdown implements pluginsdk.Shutdowner: stops the workers and flushes
// the pending event records.
func (p *Plugin) Shutdown(ctx context.Context) error {
	p.cancel()
	if err := p.eventWriter.Stop(); err != nil {
		return err
	}
	p.poolMu.Lock()
	p.closed = true
	var pool *workerPool
	pool, p.pool = p.pool, nil
	p.poolMu.Unlock()
	done := make(chan struct{})
	go func() {
		if pool != nil {
			close(pool.ch)
			pool.wg.Wait()
		}
		p.wg.Wait()
		close(done)
	}()
	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(5 * time.Second):
		return errors.New("moderation: workers did not stop in time")
	}
}

// errDBUnavailable marks a database outage; HandleHTTP answers it with 503.
var errDBUnavailable = errors.New("moderation: database unavailable")

// HandleHTTP serves the routes, answering a database outage with 503.
func (p *Plugin) HandleHTTP(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	resp, err := p.Router.HandleHTTP(ctx, req)
	if errors.Is(err, errDBUnavailable) {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	return resp, err
}

// db returns the plugin database pool.
func (p *Plugin) db(ctx context.Context) (*pgxpool.Pool, error) {
	if p.host == nil {
		return nil, errors.New("moderation: host not initialised")
	}
	pool, err := p.host.DB(ctx)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", errDBUnavailable, err)
	}
	return pool, nil
}

// ---------------------------------------------------------------- concurrency

// semaphore bounds concurrent upstream calls (max_concurrency).
type semaphore struct{ ch chan struct{} }

func newSemaphore(n int) *semaphore { return &semaphore{ch: make(chan struct{}, n)} }

// acquire waits for a slot until ctx is done.
func (p *Plugin) acquire(ctx context.Context) (func(), error) {
	s := p.sem.Load()
	select {
	case s.ch <- struct{}{}:
		return func() { <-s.ch }, nil
	case <-ctx.Done():
		return nil, fmt.Errorf("timeout waiting for a free moderation slot: %w", ctx.Err())
	}
}

// ---------------------------------------------------------------- post queue

type workerPool struct {
	ch      chan *moderation
	workers int
	wg      sync.WaitGroup
}

// resizePool replaces the post pool when its size changed. The old workers
// finish the jobs already queued and exit.
func (p *Plugin) resizePool(workers, size int) {
	p.poolMu.Lock()
	if p.closed || (p.pool != nil && p.pool.workers == workers && cap(p.pool.ch) == size) {
		p.poolMu.Unlock()
		return
	}
	np := &workerPool{ch: make(chan *moderation, size), workers: workers}
	np.wg.Add(workers)
	for i := 0; i < workers; i++ {
		go p.postWorker(np)
	}
	old := p.pool
	p.pool = np
	p.poolMu.Unlock()
	if old != nil {
		close(old.ch)
	}
}

// enqueue adds a post job; false when the queue is full.
func (p *Plugin) enqueue(m *moderation) bool {
	p.poolMu.RLock()
	defer p.poolMu.RUnlock()
	if p.pool == nil || p.closed {
		return false
	}
	select {
	case p.pool.ch <- m:
		return true
	default:
		return false
	}
}

func (p *Plugin) queueLen() (length, capacity int) {
	p.poolMu.RLock()
	defer p.poolMu.RUnlock()
	if p.pool == nil {
		return 0, 0
	}
	return len(p.pool.ch), cap(p.pool.ch)
}

func (p *Plugin) postWorker(pool *workerPool) {
	defer pool.wg.Done()
	for m := range pool.ch {
		if p.bg.Err() != nil {
			continue // shutting down: drop
		}
		p.runPost(m)
	}
}
