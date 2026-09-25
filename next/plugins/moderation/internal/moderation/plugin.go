// Package moderation implements the prompt moderation plugin (CONTRACTS §20):
// a gateway.request hook that sends the latest user message to an
// OpenAI-compatible LLM, which answers through the submit_verdict tool. In
// enforce mode the verdict is awaited and a block refuses the request; in
// observe mode the request passes and the verdict is recorded afterwards.
// Violations are counted and may ban users automatically.
package moderation

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/sync/singleflight"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// TopicBlocksChanged is broadcast after the blocks table changed; the other
// nodes reload their in-memory block list at once (best effort, the 5 s
// poll is the fallback).
const TopicBlocksChanged = "blocks.changed"

// Plugin is the moderation plugin. It implements pluginsdk.Hook,
// pluginsdk.JobRunner, pluginsdk.HTTP, pluginsdk.BroadcastHandler and the
// lifecycle interfaces.
type Plugin struct {
	*pluginsdk.Router
	*pluginsdk.BroadcastMux

	host pluginsdk.Host
	log  *slog.Logger
	now  func() time.Time
	cfg  atomic.Pointer[config]

	agent *agent
	cache *lru
	sf    singleflight.Group
	sem   atomic.Pointer[semaphore]

	// Observe queue: workers = max_concurrency, capacity = queue_size.
	poolMu sync.RWMutex
	pool   *workerPool
	closed bool

	events chan eventRec

	// blocked maps user id -> expiry (zero = until unblocked).
	blocked      atomic.Pointer[map[int64]time.Time]
	refreshEvery time.Duration
	refreshNow   chan struct{}

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
		agent:        newAgent(),
		cache:        newLRU(cacheEntries),
		events:       make(chan eventRec, 4096),
		refreshEvery: 5 * time.Second,
		refreshNow:   make(chan struct{}, 1),
	}
	p.bg, p.cancel = context.WithCancel(context.Background())
	c := compile(DefaultSettings())
	p.cfg.Store(c)
	p.sem.Store(newSemaphore(c.MaxConcurrency))
	empty := map[int64]time.Time{}
	p.blocked.Store(&empty)
	p.routes()
	p.OnTopic(TopicBlocksChanged, p.onBlocksChanged)
	return p
}

// Init implements pluginsdk.Initializer: starts the event writer, the block
// list refresher and the observe workers.
func (p *Plugin) Init(_ context.Context, h pluginsdk.Host) error {
	p.host = h
	p.log = h.Logger()
	p.wg.Add(2)
	go p.eventWriter(p.bg)
	go p.refreshLoop(p.bg)
	c := p.cfg.Load()
	p.resizePool(c.MaxConcurrency, c.QueueSize)
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
	old := p.cfg.Swap(c)
	if old == nil || old.MaxConcurrency != c.MaxConcurrency {
		p.sem.Store(newSemaphore(c.MaxConcurrency))
	}
	if p.host != nil {
		p.resizePool(c.MaxConcurrency, c.QueueSize)
	}
	if c.enabled && (old == nil || !old.enabled) {
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
	}}, nil
}

// Shutdown implements pluginsdk.Shutdowner: stops the workers and flushes
// the pending event records.
func (p *Plugin) Shutdown(ctx context.Context) error {
	p.cancel()
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

// db returns the plugin database pool.
func (p *Plugin) db(ctx context.Context) (*pgxpool.Pool, error) {
	if p.host == nil {
		return nil, errors.New("moderation: host not initialised")
	}
	pool, err := p.host.DB(ctx)
	if err != nil {
		return nil, fmt.Errorf("moderation: database unavailable: %w", err)
	}
	return pool, nil
}

// ---------------------------------------------------------------- concurrency

// semaphore bounds concurrent upstream calls (max_concurrency). A resize
// swaps in a new semaphore; holders release to the one they acquired.
type semaphore struct{ ch chan struct{} }

func newSemaphore(n int) *semaphore { return &semaphore{ch: make(chan struct{}, n)} }

// acquire waits for a slot until ctx is done (the wait counts toward
// timeout_ms).
func (p *Plugin) acquire(ctx context.Context) (func(), error) {
	s := p.sem.Load()
	select {
	case s.ch <- struct{}{}:
		return func() { <-s.ch }, nil
	case <-ctx.Done():
		return nil, fmt.Errorf("timeout waiting for a free moderation slot: %w", ctx.Err())
	}
}

// ---------------------------------------------------------------- observe queue

type observeJob struct {
	cfg  *config
	rec  eventRec // request facts; filled with the verdict by the worker
	text string
	key  string
}

type workerPool struct {
	ch      chan observeJob
	workers int
	wg      sync.WaitGroup
}

// resizePool replaces the observe pool when its size changed. The old
// workers finish the jobs already queued and exit.
func (p *Plugin) resizePool(workers, size int) {
	p.poolMu.Lock()
	if p.closed || (p.pool != nil && p.pool.workers == workers && cap(p.pool.ch) == size) {
		p.poolMu.Unlock()
		return
	}
	np := &workerPool{ch: make(chan observeJob, size), workers: workers}
	np.wg.Add(workers)
	for i := 0; i < workers; i++ {
		go p.observeWorker(np)
	}
	old := p.pool
	p.pool = np
	p.poolMu.Unlock()
	if old != nil {
		close(old.ch)
	}
}

// enqueue adds an observe job; false when the queue is full.
func (p *Plugin) enqueue(j observeJob) bool {
	p.poolMu.RLock()
	defer p.poolMu.RUnlock()
	if p.pool == nil || p.closed {
		return false
	}
	select {
	case p.pool.ch <- j:
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

func (p *Plugin) observeWorker(pool *workerPool) {
	defer pool.wg.Done()
	for j := range pool.ch {
		if p.bg.Err() != nil {
			continue // shutting down: drop
		}
		p.runObserve(j)
	}
}
