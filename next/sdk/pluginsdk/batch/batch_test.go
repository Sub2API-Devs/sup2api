package batch

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestBatchWriter(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var mu sync.Mutex
	var written [][]int
	var dropped atomic.Int64
	w := New(ctx, 10, func(_ context.Context, batch []int) error {
		mu.Lock()
		written = append(written, append([]int(nil), batch...))
		mu.Unlock()
		return nil
	}, func(n int) { dropped.Add(int64(n)) }, WithMaxBatch(5), WithInterval(50*time.Millisecond))

	// Send items, flushing when batch size is hit
	for i := 1; i <= 7; i++ {
		if !w.Send(i) {
			t.Fatal("send failed")
		}
	}
	time.Sleep(20 * time.Millisecond)
	mu.Lock()
	if len(written) != 1 || len(written[0]) != 5 {
		t.Fatalf("batch flush: %v, want one batch of 5", written)
	}
	mu.Unlock()

	// Wait for interval flush
	time.Sleep(60 * time.Millisecond)
	mu.Lock()
	if len(written) != 2 || len(written[1]) != 2 {
		t.Fatalf("interval flush: %v, want two batches", written)
	}
	mu.Unlock()

	// Overflow the channel
	for i := 0; i < 20; i++ {
		w.Send(100 + i)
	}
	if dropped.Load() == 0 {
		t.Error("channel overflow did not drop items")
	}

	// Stop flushes remaining items - give it clean state
	time.Sleep(100 * time.Millisecond) // let pending batches flush
	mu.Lock()
	beforeStop := len(written)
	mu.Unlock()

	w.Send(999) // distinct marker
	if err := w.Stop(); err != nil {
		t.Fatalf("Stop: %v", err)
	}

	mu.Lock()
	afterStop := len(written)
	found := false
	for _, b := range written {
		for _, v := range b {
			if v == 999 {
				found = true
			}
		}
	}
	mu.Unlock()
	if !found {
		t.Errorf("marker 999 not flushed on Stop, batches before=%d after=%d", beforeStop, afterStop)
	}
}

func TestBatchWriterContextCancel(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	var flushed atomic.Int64
	w := New(ctx, 10, func(_ context.Context, batch []int) error {
		flushed.Add(int64(len(batch)))
		return nil
	}, nil)
	w.Send(1)
	w.Send(2)
	cancel()
	time.Sleep(20 * time.Millisecond)
	if n := flushed.Load(); n != 2 {
		t.Errorf("context cancel flushed %d items, want 2", n)
	}
}

// The limits are fixed when the Writer is created, before its goroutine
// starts: the defaults, or what the options say. An option that makes no
// sense (zero, negative) keeps the default.
func TestBatchWriterLimits(t *testing.T) {
	write := func(context.Context, []int) error { return nil }
	for name, tc := range map[string]struct {
		opts     []Option
		max      int
		interval time.Duration
	}{
		"defaults":      {nil, DefaultMaxBatch, DefaultInterval},
		"interval":      {[]Option{WithInterval(20 * time.Millisecond)}, DefaultMaxBatch, 20 * time.Millisecond},
		"max batch":     {[]Option{WithMaxBatch(7)}, 7, DefaultInterval},
		"both":          {[]Option{WithInterval(time.Minute), WithMaxBatch(1)}, 1, time.Minute},
		"last one wins": {[]Option{WithMaxBatch(3), WithMaxBatch(9)}, 9, DefaultInterval},
		"not positive":  {[]Option{WithInterval(0), WithInterval(-time.Second), WithMaxBatch(0), WithMaxBatch(-1)}, DefaultMaxBatch, DefaultInterval},
	} {
		w := New(context.Background(), 1, write, nil, tc.opts...)
		if w.max != tc.max || w.interval != tc.interval {
			t.Errorf("%s: max %d, interval %v; want %d, %v", name, w.max, w.interval, tc.max, tc.interval)
		}
		if err := w.Stop(); err != nil {
			t.Errorf("%s: Stop: %v", name, err)
		}
	}
}

// With a short interval an item is written soon after it is sent, without
// Stop and long before the default second.
func TestBatchWriterInterval(t *testing.T) {
	wrote := make(chan []int, 1)
	w := New(context.Background(), 1, func(_ context.Context, batch []int) error {
		wrote <- append([]int(nil), batch...)
		return nil
	}, nil, WithInterval(5*time.Millisecond))
	defer func() { _ = w.Stop() }()
	start := time.Now()
	w.Send(1)
	select {
	case got := <-wrote:
		if len(got) != 1 || got[0] != 1 {
			t.Fatalf("wrote %v, want [1]", got)
		}
		if d := time.Since(start); d > DefaultInterval/2 {
			t.Fatalf("the item was written after %v", d)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("the item was not written")
	}
}
