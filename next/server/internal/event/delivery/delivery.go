// Package delivery pushes outbox events (table events) to subscribed plugins
// with at-least-once semantics.
//
// For every subscription in the current plugin generation a worker runs on
// each node, but only the node holding lock "events:{plugin}" delivers. The
// worker reads events after the plugin cursor, filters them by the
// subscription patterns, calls AppPlugin.OnEvents and advances the cursor to
// the acknowledged id. Failed batches are retried with exponential backoff
// and dead-lettered after MaxFailures consecutive failures.
package delivery

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// ChannelEventsAppended is an optional wake-up hint: publishing any payload
// on it makes delivery workers poll immediately instead of waiting for the
// next tick. Writers are not required to publish it.
const ChannelEventsAppended = "events:appended"

// Options tunes delivery; zero values take the defaults.
type Options struct {
	BatchSize    int           // default batch when the manifest omits it (100)
	PollInterval time.Duration // idle poll period (1s)
	LockTTL      time.Duration // lease of lock events:{plugin} (30s)
	CallTimeout  time.Duration // OnEvents timeout; must be well below LockTTL (20s)
	MaxFailures  int           // consecutive failures before dead-lettering (10)
	BackoffMin   time.Duration // first retry delay (1s)
	BackoffMax   time.Duration // retry delay cap (5min)
	ScanLimit    int           // max outbox rows examined per step (1000)
	// GapMinWait/GapMaxWait bound how long a hole in the id sequence (an
	// uncommitted or rolled-back insert) blocks the cursor: a hole is
	// skipped once it is at least GapMinWait old and every transaction that
	// was running when it was first seen has finished, or unconditionally
	// after GapMaxWait (1s / 5min).
	GapMinWait        time.Duration
	GapMaxWait        time.Duration
	RetentionAge      time.Duration // events older than this may be deleted (7d)
	RetentionInterval time.Duration // retention period (1h)
}

func (o *Options) defaults() {
	def := func(d *time.Duration, v time.Duration) {
		if *d <= 0 {
			*d = v
		}
	}
	if o.BatchSize <= 0 {
		o.BatchSize = 100
	}
	def(&o.PollInterval, time.Second)
	def(&o.LockTTL, 30*time.Second)
	def(&o.CallTimeout, 20*time.Second)
	if o.MaxFailures <= 0 {
		o.MaxFailures = 10
	}
	def(&o.BackoffMin, time.Second)
	def(&o.BackoffMax, 5*time.Minute)
	if o.ScanLimit <= 0 {
		o.ScanLimit = 1000
	}
	def(&o.GapMinWait, time.Second)
	def(&o.GapMaxWait, 5*time.Minute)
	def(&o.RetentionAge, 7*24*time.Hour)
	def(&o.RetentionInterval, time.Hour)
}

// Service runs the delivery workers and the event retention loop.
type Service struct {
	db       *store.DB
	locker   core.Locker
	bus      core.Bus
	registry core.PluginRegistry
	log      *slog.Logger
	nodeID   string
	opts     Options

	mu      sync.Mutex
	workers map[string]*worker
	ctx     context.Context
	cancel  context.CancelFunc
	wg      sync.WaitGroup
	changed chan struct{}
	unsubs  []func()
	started bool
}

// New builds the delivery service. bus may be nil (no wake-up hints).
func New(db *store.DB, locker core.Locker, bus core.Bus, registry core.PluginRegistry, logger *slog.Logger, nodeID string, opts Options) *Service {
	if logger == nil {
		logger = slog.Default()
	}
	opts.defaults()
	return &Service{
		db: db, locker: locker, bus: bus, registry: registry,
		log:     logger.With("component", "event-delivery", "node", nodeID),
		nodeID:  nodeID,
		opts:    opts,
		workers: map[string]*worker{},
		changed: make(chan struct{}, 1),
	}
}

// Start launches the workers for the current generation and follows
// generation changes until Stop.
func (s *Service) Start(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.started {
		return nil
	}
	s.started = true
	s.ctx, s.cancel = context.WithCancel(context.WithoutCancel(ctx))
	s.unsubs = append(s.unsubs, s.registry.OnChange(func(core.Generation) { s.signal() }))
	if s.bus != nil {
		s.unsubs = append(s.unsubs, s.bus.Subscribe(ChannelEventsAppended, func([]byte) { s.WakeAll() }))
	}
	s.reconcileLocked(s.registry.Current())
	s.wg.Add(2)
	go s.watch()
	go s.retentionLoop()
	return nil
}

// Stop halts all workers, releases held locks and waits for them (bounded
// by ctx).
func (s *Service) Stop(ctx context.Context) error {
	s.mu.Lock()
	if !s.started {
		s.mu.Unlock()
		return nil
	}
	s.started = false
	for _, u := range s.unsubs {
		u()
	}
	s.unsubs = nil
	s.cancel()
	for k, w := range s.workers {
		w.cancel()
		delete(s.workers, k)
	}
	s.mu.Unlock()
	done := make(chan struct{})
	go func() { s.wg.Wait(); close(done) }()
	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// WakeAll makes every worker poll now (e.g. after events were written).
func (s *Service) WakeAll() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, w := range s.workers {
		w.poke()
	}
}

func (s *Service) signal() {
	select {
	case s.changed <- struct{}{}:
	default:
	}
}

func (s *Service) watch() {
	defer s.wg.Done()
	for {
		select {
		case <-s.ctx.Done():
			return
		case <-s.changed:
			s.mu.Lock()
			if s.started {
				s.reconcileLocked(s.registry.Current())
			}
			s.mu.Unlock()
		}
	}
}

// reconcileLocked starts workers for new subscriptions, updates bindings of
// existing ones and stops workers whose plugin left the generation (the
// cursor stays in the database so delivery resumes from it later).
func (s *Service) reconcileLocked(gen core.Generation) {
	want := map[string]core.SubscriptionBinding{}
	if gen != nil {
		for _, b := range gen.Subscriptions() {
			if b.Client == nil || len(b.Events.Subscribe) == 0 {
				continue
			}
			want[b.Plugin.Key] = b
		}
	}
	for key, w := range s.workers {
		if _, ok := want[key]; !ok {
			w.cancel()
			delete(s.workers, key)
		}
	}
	for key, b := range want {
		if w, ok := s.workers[key]; ok {
			w.setBinding(b)
			continue
		}
		w := newWorker(s, b)
		s.workers[key] = w
		s.wg.Add(1)
		go func() {
			defer s.wg.Done()
			w.run()
		}()
	}
}
