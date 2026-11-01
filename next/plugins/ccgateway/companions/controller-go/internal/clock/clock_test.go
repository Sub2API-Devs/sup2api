package clock

import (
	"context"
	"testing"
	"time"
)

// covers: B3 (waits run instantly on the fake clock, in order)
func TestFake(t *testing.T) {
	start := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)
	f := NewFake(start)
	for i := 0; i < 30; i++ {
		if err := f.Sleep(context.Background(), 200*time.Millisecond); err != nil {
			t.Fatal(err)
		}
	}
	f.Advance(time.Second)
	if got := f.Now().Sub(start); got != 7*time.Second {
		t.Fatal(got)
	}
	if len(f.Sleeps()) != 30 {
		t.Fatal("sleeps recorded")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if f.Sleep(ctx, time.Second) == nil {
		t.Fatal("a cancelled sleep fails")
	}
}

// covers: B1 B2 (the real clock honours cancellation)
func TestReal(t *testing.T) {
	c := Real()
	if err := c.Sleep(context.Background(), time.Millisecond); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if c.Sleep(ctx, time.Hour) == nil || c.Sleep(ctx, 0) == nil {
		t.Fatal("cancelled")
	}
	if time.Since(c.Now()) > time.Minute {
		t.Fatal("Now")
	}
}
