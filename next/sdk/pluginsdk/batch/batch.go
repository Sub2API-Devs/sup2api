// Package batch provides a generic channel-backed batch writer: send items to
// a channel, flush them in batches (up to 200 rows or 1 second; WithMaxBatch
// and WithInterval choose other limits), useful for guard block_log /
// moderation events. The user supplies a Write([]T) that persists one batch
// and a context that stops the goroutine.
package batch

import (
	"context"
	"sync"
	"time"
)

const (
	// DefaultMaxBatch is the row limit before a flush.
	DefaultMaxBatch = 200
	// DefaultInterval is the time limit before a flush.
	DefaultInterval = time.Second
)

// Option changes a limit of a Writer when New creates it.
type Option func(*limits)

type limits struct {
	max      int
	interval time.Duration
}

// WithMaxBatch sets the row limit before a flush (DefaultMaxBatch when not
// given). A value that is not positive is ignored.
func WithMaxBatch(n int) Option {
	return func(l *limits) {
		if n > 0 {
			l.max = n
		}
	}
}

// WithInterval sets the time limit before a flush (DefaultInterval when not
// given), e.g. a few milliseconds in a test that waits for the write. A
// value that is not positive is ignored.
func WithInterval(d time.Duration) Option {
	return func(l *limits) {
		if d > 0 {
			l.interval = d
		}
	}
}

// Writer[T] persists items of type T in batches.
type Writer[T any] struct {
	ch     chan T
	write  func(context.Context, []T) error
	onDrop func(int)
	limits // set by New and never changed: the goroutine reads them
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// New creates a Writer that collects items from a buffered channel (cap) and
// flushes them via write. The goroutine runs until Stop or until ctx is done.
// onDrop(n) is called when a batch write fails (may be nil). opts choose
// other limits than DefaultMaxBatch and DefaultInterval:
//
//	w := batch.New(ctx, 1024, write, nil, batch.WithInterval(10*time.Millisecond))
func New[T any](ctx context.Context, cap int, write func(context.Context, []T) error, onDrop func(int), opts ...Option) *Writer[T] {
	if cap <= 0 {
		cap = 1024
	}
	l := limits{max: DefaultMaxBatch, interval: DefaultInterval}
	for _, opt := range opts {
		if opt != nil {
			opt(&l)
		}
	}
	bg, cancel := context.WithCancel(ctx)
	w := &Writer[T]{ch: make(chan T, cap), write: write, onDrop: onDrop, limits: l, cancel: cancel}
	w.wg.Add(1)
	go w.run(bg)
	return w
}

// Send queues one item. It never blocks: a full channel drops the item and
// returns false.
func (w *Writer[T]) Send(item T) bool {
	select {
	case w.ch <- item:
		return true
	default:
		if w.onDrop != nil {
			w.onDrop(1)
		}
		return false
	}
}

// Stop cancels the background goroutine and waits up to 5 seconds for it to
// flush pending items. Returns nil when the goroutine stopped, an error if it
// did not stop in time.
func (w *Writer[T]) Stop() error {
	w.cancel()
	done := make(chan struct{})
	go func() { w.wg.Wait(); close(done) }()
	select {
	case <-done:
		return nil
	case <-time.After(5 * time.Second):
		return context.DeadlineExceeded
	}
}

func (w *Writer[T]) run(ctx context.Context) {
	defer w.wg.Done()
	t := time.NewTicker(w.interval)
	defer t.Stop()
	var batch []T
	flush := func(items []T) {
		if len(items) == 0 {
			return
		}
		fctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
		defer cancel()
		if err := w.write(fctx, items); err != nil && w.onDrop != nil {
			w.onDrop(len(items))
		}
	}
	for {
		select {
		case <-ctx.Done():
			// Drain what is already queued, then stop.
			batch = w.drain(batch, flush)
			flush(batch)
			return
		case item := <-w.ch:
			batch = append(batch, item)
			if len(batch) >= w.max {
				flush(batch)
				batch = batch[:0]
			}
		case <-t.C:
			flush(batch)
			batch = batch[:0]
		}
	}
}

// drain takes every item already queued without blocking, flushing each full
// batch, and returns what is left for the caller to flush.
func (w *Writer[T]) drain(batch []T, flush func([]T)) []T {
	for {
		select {
		case item := <-w.ch:
			batch = append(batch, item)
			if len(batch) >= w.max {
				flush(batch)
				batch = batch[:0]
			}
		default:
			return batch
		}
	}
}
