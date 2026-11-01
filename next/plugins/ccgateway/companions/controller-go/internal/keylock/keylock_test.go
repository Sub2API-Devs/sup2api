package keylock

import (
	"context"
	"sync"
	"testing"
	"time"

	"ccgateway/controller/internal/errs"
)

// covers: K1 K2 M4
func TestLockWaitsAndTimesOut(t *testing.T) {
	l := New()
	h, err := l.Lock(context.Background(), "21")
	if err != nil || h.Key() != "21" {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	if _, err := l.Lock(ctx, "21"); !errs.Is(err, errs.RuntimeBusy) {
		t.Fatalf("held lock: %v", err)
	}
	if other, err := l.Lock(context.Background(), "22"); err != nil {
		t.Fatal("another key is independent")
	} else {
		other.Release()
	}
	if _, ok := l.TryLock("21"); ok {
		t.Fatal("TryLock of a held lock")
	}
	done := make(chan *Held)
	go func() {
		h2, _ := l.Lock(context.Background(), "21")
		done <- h2
	}()
	time.Sleep(10 * time.Millisecond)
	h.Release()
	h.Release() // idempotent
	h2 := <-done
	if h2 == nil {
		t.Fatal("waiter did not get the lock")
	}
	h2.Release()
	if h3, ok := l.TryLock("21"); !ok {
		t.Fatal("free lock")
	} else {
		h3.Release()
	}
}

// covers: K10 (not re-entrant: holders are explicit)
func TestCheck(t *testing.T) {
	l := New()
	h, _ := l.Lock(context.Background(), "21")
	h.Check("21")
	for _, f := range []func(){func() { h.Check("22") }, func() { (*Held)(nil).Check("21") }} {
		func() {
			defer func() {
				if recover() == nil {
					t.Error("Check must panic")
				}
			}()
			f()
		}()
	}
	if RequestWait != 20*time.Second {
		t.Fatal("REQUEST_LOCK_WAIT is 20 s")
	}
}

// covers: K9 (no data race between many keys)
func TestConcurrentKeys(t *testing.T) {
	l := New()
	var wg sync.WaitGroup
	counter := map[string]int{}
	var mu sync.Mutex
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			key := []string{"1", "2", "3"}[i%3]
			h, err := l.Lock(context.Background(), key)
			if err != nil {
				t.Error(err)
				return
			}
			mu.Lock()
			counter[key]++
			mu.Unlock()
			h.Release()
		}(i)
	}
	wg.Wait()
	if counter["1"]+counter["2"]+counter["3"] != 50 {
		t.Fatal(counter)
	}
}
