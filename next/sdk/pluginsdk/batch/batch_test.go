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
	}, func(n int) { dropped.Add(int64(n)) })
	w.max = 5
	w.interval = 50 * time.Millisecond

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
