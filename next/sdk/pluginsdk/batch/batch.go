// Package batch provides a generic channel-backed batch writer: send items to
// a channel, flush them in batches (up to 200 rows or 1 second), useful for
// guard block_log / moderation events. The user supplies a Write([]T) that
// persists one batch and a context that stops the goroutine.
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

// Writer[T] persists items of type T in batches.
type Writer[T any] struct {
	ch       chan T
	write    func(context.Context, []T) error
	onDrop   func(int)
	max      int
	interval time.Duration
	cancel   context.CancelFunc
	wg       sync.WaitGroup
}

// New creates a Writer that collects items from a buffered channel (cap) and
// flushes them via write. The goroutine runs until Stop or until ctx is done.
// onDrop(n) is called when a batch write fails (may be nil).
func New[T any](ctx context.Context, cap int, write func(context.Context, []T) error, onDrop func(int)) *Writer[T] {
	if cap <= 0 {
		cap = 1024
	}
	bg, cancel := context.WithCancel(ctx)
	w := &Writer[T]{
		ch: make(chan T, cap), write: write, onDrop: onDrop,
		max: DefaultMaxBatch, interval: DefaultInterval, cancel: cancel,
	}
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
	flush := func() {
		if len(batch) == 0 {
			return
		}
		fctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
		defer cancel()
		if err := w.write(fctx, batch); err != nil && w.onDrop != nil {
			w.onDrop(len(batch))
		}
		batch = batch[:0]
	}
	for {
		select {
		case <-ctx.Done():
			// Drain what is already queued, then stop.
			for {
				select {
				case item := <-w.ch:
					batch = append(batch, item)
					if len(batch) >= w.max {
						flush()
					}
				default:
					flush()
					return
				}
			}
		case item := <-w.ch:
			batch = append(batch, item)
			if len(batch) >= w.max {
				flush()
			}
		case <-t.C:
			flush()
		}
	}
}
