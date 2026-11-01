// Package clock is the controller's time source. Production uses the real
// clock; tests use Fake, whose Sleep advances time instantly, so waits such
// as the 120 s Worker idle wait or the 30 x 0.2 s activation loop finish at
// once while keeping their exact sequence of checks.
//
// FROZEN: accounts.Options.Clock and the Clock interface.
package clock

import (
	"context"
	"sync"
	"time"
)

// Clock is the time source of every wait loop.
type Clock interface {
	Now() time.Time
	// Sleep waits d or until ctx ends (then it returns ctx.Err()).
	Sleep(ctx context.Context, d time.Duration) error
}

// Real is the system clock.
func Real() Clock { return realClock{} }

type realClock struct{}

func (realClock) Now() time.Time { return time.Now() }

func (realClock) Sleep(ctx context.Context, d time.Duration) error {
	if d <= 0 {
		return ctx.Err()
	}
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-t.C:
		return nil
	}
}

// Fake is a manual clock: Sleep advances it by d and returns immediately.
type Fake struct {
	mu     sync.Mutex
	now    time.Time
	sleeps []time.Duration
}

// NewFake starts at t (UTC).
func NewFake(t time.Time) *Fake { return &Fake{now: t.UTC()} }

func (f *Fake) Now() time.Time {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.now
}

func (f *Fake) Sleep(ctx context.Context, d time.Duration) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	if d > 0 {
		f.now = f.now.Add(d)
	}
	f.sleeps = append(f.sleeps, d)
	return nil
}

// Advance moves the clock forward without a Sleep call.
func (f *Fake) Advance(d time.Duration) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.now = f.now.Add(d)
}

// Sleeps returns every duration passed to Sleep, in order.
func (f *Fake) Sleeps() []time.Duration {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]time.Duration(nil), f.sleeps...)
}
