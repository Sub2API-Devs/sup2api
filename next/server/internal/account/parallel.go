package account

import (
	"context"
	"log/slog"
	"runtime/debug"
	"sync"
)

const (
	// modelInUseParallel bounds the concurrent slot reads of fillModelInUse.
	modelInUseParallel = 8
	// viewsPGParallel bounds how many database-bound fills of one list run at
	// once, so a single page never takes a large share of the pool it
	// shares with the gateway.
	viewsPGParallel = 3
)

// runParallel runs tasks concurrently, at most limit at a time (limit <= 0 =
// all at once), and returns when all are done. A panicking task is recovered
// and logged: it must not take the process down (the HTTP recovery
// middleware does not see other goroutines). Tasks report their own errors.
func runParallel(ctx context.Context, limit int, tasks ...func()) {
	switch len(tasks) {
	case 0:
		return
	case 1:
		runRecovered(ctx, tasks[0])
		return
	}
	var sem chan struct{}
	if limit > 0 && limit < len(tasks) {
		sem = make(chan struct{}, limit)
	}
	var wg sync.WaitGroup
	for _, task := range tasks {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if sem != nil {
				sem <- struct{}{}
				defer func() { <-sem }()
			}
			runRecovered(ctx, task)
		}()
	}
	wg.Wait()
}

func runRecovered(ctx context.Context, task func()) {
	defer func() {
		if r := recover(); r != nil {
			slog.ErrorContext(ctx, "account: parallel task panicked", "panic", r, "stack", string(debug.Stack()))
		}
	}()
	task()
}
