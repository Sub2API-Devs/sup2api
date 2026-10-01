// Package background provides bounded execution and cancellation for offline
// work. Callers retain their own trigger, durable claim and outcome semantics.
package background

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

var (
	ErrClosed = errors.New("background execution group is closed")
	ErrBusy   = errors.New("background execution capacity is full")
)

// Executor bounds work across all groups on this node. A group also has its own
// cap so a long-running class cannot consume all execution slots.
type Executor struct {
	slots chan struct{}
	// Admitted is checked before work joins the execution/claim barrier.
	// It must be concurrency-safe; nil preserves standalone behavior.
	Admitted func() bool
}

func (e *Executor) Allowed() bool { return e.Admitted == nil || e.Admitted() }
func (e *Executor) Active() int64 { return int64(len(e.slots)) }

func New(concurrency int) *Executor {
	if concurrency < 1 {
		concurrency = 8
	}
	return &Executor{slots: make(chan struct{}, concurrency)}
}

type Group struct {
	executor       *Executor
	slots, pending chan struct{}
	ctx            context.Context
	cancel         context.CancelCauseFunc
	mu             sync.Mutex
	closed         bool
	wg             sync.WaitGroup
	done           chan struct{}
}

func (e *Executor) Group(parent context.Context, concurrency, queue int) *Group {
	if concurrency < 1 {
		concurrency = 4
	}
	if queue < 0 {
		queue = 0
	}
	ctx, cancel := context.WithCancelCause(parent)
	return &Group{executor: e, slots: make(chan struct{}, concurrency), pending: make(chan struct{}, concurrency+queue),
		ctx: ctx, cancel: cancel, done: make(chan struct{})}
}

// Work bounds execution after admission. A lease is optional; it is extended
// only within this budget, and its loss cancels the callback. Durable fencing
// remains the caller's responsibility. RetainLease preserves trigger dedupe TTLs.
type Work struct {
	Timeout     time.Duration
	Lease       core.Lock
	RetainLease bool
}

// Scope applies the same budget and lease lifecycle without consuming a worker.
// Coordinators use this when they will wait for child work in the executor.
func Scope(ctx context.Context, work Work, fn func(context.Context) error) error {
	if work.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, work.Timeout)
		defer cancel()
	}
	if work.Lease != nil {
		if !work.RetainLease {
			defer work.Lease.Release()
		}
		if !work.Lease.Until().After(time.Now()) {
			return core.ErrLockLost
		}
		var stop context.CancelFunc
		ctx, stop = core.KeepLock(ctx, work.Lease)
		defer stop()
	}
	if err := ctx.Err(); err != nil {
		return context.Cause(ctx)
	}
	err := fn(ctx)
	if err == nil && ctx.Err() != nil {
		return context.Cause(ctx)
	}
	return err
}

// Permit reserves execution capacity and joins the group's shutdown barrier.
// It must be released on preparation failure or by Run. Acquire no distributed
// lease before waiting for a permit.
type Permit struct {
	group *Group
	once  sync.Once
}

func (g *Group) enroll() error {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.closed || g.ctx.Err() != nil || !g.executor.Allowed() {
		return ErrClosed
	}
	select {
	case g.pending <- struct{}{}:
		g.wg.Add(1)
		return nil
	default:
		return ErrBusy
	}
}

func (g *Group) leave() { <-g.pending; g.wg.Done() }

func (g *Group) acquire(ctx context.Context, wait bool) (*Permit, error) {
	if err := g.enroll(); err != nil {
		return nil, err
	}
	p, err := g.acquireEnrolled(ctx, wait)
	if err != nil {
		g.leave()
	}
	return p, err
}

func (g *Group) acquireEnrolled(ctx context.Context, wait bool) (*Permit, error) {
	take := func(slots chan struct{}) error {
		if ctx.Err() != nil {
			return context.Cause(ctx)
		}
		if g.ctx.Err() != nil {
			return ErrClosed
		}
		if !wait {
			select {
			case slots <- struct{}{}:
				return nil
			default:
				return ErrBusy
			}
		}
		select {
		case slots <- struct{}{}:
			return nil
		case <-ctx.Done():
			return context.Cause(ctx)
		case <-g.ctx.Done():
			return ErrClosed
		}
	}
	if err := take(g.slots); err != nil {
		return nil, err
	}
	if err := take(g.executor.slots); err != nil {
		<-g.slots
		return nil, err
	}
	if ctx.Err() != nil || g.ctx.Err() != nil || !g.executor.Allowed() {
		<-g.executor.slots
		<-g.slots
		if ctx.Err() != nil {
			return nil, context.Cause(ctx)
		}
		return nil, ErrClosed
	}
	return &Permit{group: g}, nil
}

func (g *Group) Acquire(ctx context.Context) (*Permit, error)    { return g.acquire(ctx, true) }
func (g *Group) TryAcquire(ctx context.Context) (*Permit, error) { return g.acquire(ctx, false) }

func (p *Permit) Release() {
	p.once.Do(func() { <-p.group.executor.slots; <-p.group.slots; p.group.leave() })
}

// Context combines the caller and group cancellation, including preparation
// before Run. Its cancel function must be called after preparation.
func (p *Permit) Context(ctx context.Context) (context.Context, context.CancelFunc) {
	child, cancel := context.WithCancelCause(ctx)
	stop := context.AfterFunc(p.group.ctx, func() { cancel(context.Cause(p.group.ctx)) })
	if p.group.ctx.Err() != nil {
		cancel(context.Cause(p.group.ctx))
	}
	return child, func() { stop(); cancel(context.Canceled) }
}

func (p *Permit) Run(ctx context.Context, work Work, fn func(context.Context) error) error {
	defer p.Release()
	ctx, cancel := p.Context(ctx)
	defer cancel()
	return Scope(ctx, work, fn)
}

func (g *Group) Run(ctx context.Context, work Work, fn func(context.Context) error) error {
	p, err := g.Acquire(ctx)
	if err != nil {
		return err
	}
	return p.Run(ctx, work, fn)
}

// Submit queues bounded local work. The callback starts only after execution
// admission; acquire leases and durable claims inside it, never before Submit.
func (g *Group) Submit(ctx context.Context, work Work, fn func(context.Context) error) error {
	if err := g.enroll(); err != nil {
		return err
	}
	go func() {
		p, err := g.acquireEnrolled(ctx, true)
		if err != nil {
			g.leave()
			return
		}
		_ = p.Run(ctx, work, fn)
	}()
	return nil
}

// Each waits for capacity before launching each item and joins every launched
// callback. The caller controls ordering and durable claim validity; queued
// items must have a parent deadline shorter than their durable claim lease.
func (g *Group) Each(ctx context.Context, work Work, count int, fn func(context.Context, int)) error {
	var wg sync.WaitGroup
	defer wg.Wait()
	for index := 0; index < count; index++ {
		p, err := g.Acquire(ctx)
		if err != nil {
			return err
		}
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			_ = p.Run(ctx, work, func(ctx context.Context) error { fn(ctx, index); return nil })
		}(index)
	}
	return nil
}

// Close seals admission before cancellation and waits for every accepted
// callback/preparation. Repeated calls wait on the same completion barrier.
func (g *Group) Close(ctx context.Context) error {
	g.mu.Lock()
	if !g.closed {
		g.closed = true
		g.cancel(ErrClosed)
		go func() { g.wg.Wait(); close(g.done) }()
	}
	g.mu.Unlock()
	select {
	case <-g.done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}
