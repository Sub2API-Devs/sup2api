package control

import (
	"context"
	"errors"
	"testing"
	"time"
)

// A prepare is bounded by download progress, not StepTimeout: a slow bundle
// that keeps arriving must finish in one attempt instead of being cut and
// retried from scratch every StepTimeout.
func TestPostgresSlowPrepareOutlivesStepTimeout(t *testing.T) {
	s, a, b, target := setupEngines(t)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pf, err := s.Preflight(ctx, target.Digest)
	if err != nil {
		t.Fatal(err)
	}
	p, err := s.Create(ctx, target.Digest, pf.ExpectedRevision, "slow-prepare", "admin")
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range []*Engine{a, b} {
		e.Locks = s.Locks
		e.StepTimeout = 200 * time.Millisecond
		e.Runtime.(*fakeRuntime).prepareTook = 3 * e.StepTimeout
	}
	done := make(chan error, 2)
	go func() { done <- a.Run(ctx) }()
	go func() { done <- b.Run(ctx) }()
	defer func() { cancel(); <-done; <-done }()
	for ctx.Err() == nil {
		p, err = s.Plan(ctx, p.ID)
		if err != nil {
			t.Fatal(err)
		}
		if p.Status == "paused" {
			t.Fatalf("plan paused: %s", p.Error)
		}
		if p.Status == "completed" {
			for _, e := range []*Engine{a, b} {
				r := e.Runtime.(*fakeRuntime)
				r.mu.Lock()
				cut := r.prepareCut
				r.mu.Unlock()
				if cut != 0 {
					t.Fatalf("%s prepare was cut short %d times", e.Node.ID, cut)
				}
			}
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("slow prepare never completed: %+v", p)
}

// Every other step still ends at StepTimeout and is not recorded as done.
func TestPostgresHungStopStillEndsAtStepTimeout(t *testing.T) {
	s, a, b, target := setupEngines(t)
	ctx := context.Background()
	pf, err := s.Preflight(ctx, target.Digest)
	if err != nil {
		t.Fatal(err)
	}
	p, err := s.Create(ctx, target.Digest, pf.ExpectedRevision, "hung-stop", "admin")
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range []*Engine{a, b} {
		e.StepTimeout = 200 * time.Millisecond
		e.Runtime.(*fakeRuntime).stopTook = time.Hour
	}
	for i := 0; i < 60; i++ {
		if err = a.Coordinate(ctx); err != nil {
			t.Fatal(err)
		}
		for _, e := range []*Engine{a, b} {
			start := time.Now()
			err := e.Work(ctx)
			if took := time.Since(start); took > 5*time.Second {
				t.Fatalf("%s pass took %s", e.Node.ID, took)
			}
			if errors.Is(err, context.DeadlineExceeded) {
				p, err = s.Plan(ctx, p.ID)
				if err != nil {
					t.Fatal(err)
				}
				for _, st := range p.Steps {
					if st.Action == "stop" && (st.Status == "done" || st.Status == "failed") {
						t.Fatalf("hung stop recorded as %s", st.Status)
					}
				}
				return
			}
		}
	}
	t.Fatal("no step hit StepTimeout")
}
