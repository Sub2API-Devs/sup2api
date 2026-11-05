package engine

import (
	"context"
	"errors"
	"sync"
	"time"
)

// fallbackStore keeps the session memory in the shared store (valkeyStore)
// and a local copy (memoryStore) of all it wrote or read (§4.1). The memory
// never holds a request up or fails it (D8):
//
//   - a read takes the local copy when it has the value: this Worker process
//     is the only writer of its account's keys, so what it wrote or read
//     itself is the latest (and the writes, which go to the shared store in
//     the background, may not have landed yet); otherwise the shared store,
//     within storeOpTimeout, and keeps what it found locally;
//   - a write goes to the local copy at once and to the shared store in the
//     background, in order, each within storeOpTimeout;
//   - after breakerFailures failures in a row the shared store is not asked
//     for breakerOpen; the local copy answers alone.
type fallbackStore struct {
	remote  sessionStore
	local   *memoryStore
	breaker storeBreaker
	writes  chan storeWrite
	stop    chan struct{}
	done    chan struct{}
	once    sync.Once
	mu      sync.RWMutex // closed
	closed  bool
}

// storeWrite is one write for the shared store, with its request's context
// values (its diagnostic).
type storeWrite struct {
	ctx context.Context
	op  string
	run func(context.Context) error
}

const (
	// storeWriteQueue bounds the writes waiting for the shared store; a write
	// past it is dropped (the local copy has it).
	storeWriteQueue = 1024
	// storeCloseDrain bounds how long close waits for the queued writes.
	storeCloseDrain = time.Second
)

func newFallbackStore(remote sessionStore, local *memoryStore) *fallbackStore {
	s := &fallbackStore{remote: remote, local: local, writes: make(chan storeWrite, storeWriteQueue), stop: make(chan struct{}), done: make(chan struct{})}
	go s.write()
	return s
}

// ask runs one operation on the shared store, within storeOpTimeout and
// unless the breaker is open, and reports it.
func (s *fallbackStore) ask(ctx context.Context, op string, run func(context.Context) error) error {
	if !s.breaker.allow() {
		reportStore(ctx, "memory", op, time.Now(), errStoreUnavailable)
		return errStoreUnavailable
	}
	started := time.Now()
	opCtx, cancel := context.WithTimeout(ctx, storeOpTimeout)
	err := run(opCtx)
	cancel()
	if err != nil && !errors.Is(err, errStoreValueTooLarge) {
		s.breaker.failure()
	} else {
		s.breaker.success()
	}
	reportStore(ctx, "valkey", op, started, err)
	return err
}

func (s *fallbackStore) loadThread(ctx context.Context, session, thread string, ttl time.Duration) (*sessionEntry, error) {
	if entry, _ := s.local.loadThread(ctx, session, thread, ttl); entry != nil {
		return entry, nil
	}
	var entry *sessionEntry
	err := s.ask(ctx, "load_thread", func(ctx context.Context) (err error) {
		entry, err = s.remote.loadThread(ctx, session, thread, ttl)
		return err
	})
	if err != nil || entry == nil {
		return nil, err
	}
	// The copy lives as long as the shared value does (written at entry.at).
	if expires := entry.at.Add(ttl); s.local.clock().Before(expires) {
		s.local.putThread(session, thread, entry, expires)
	}
	return entry, nil
}

func (s *fallbackStore) saveThread(ctx context.Context, session, thread string, e *sessionEntry, ttl time.Duration) error {
	_ = s.local.saveThread(ctx, session, thread, e, ttl)
	saved := e.clone()
	s.enqueue(ctx, "save_thread", func(ctx context.Context) error { return s.remote.saveThread(ctx, session, thread, saved, ttl) })
	return nil
}

// loadTools: a local set read from the shared store is the whole set; one
// made while the shared store could not be read is joined with what it has.
func (s *fallbackStore) loadTools(ctx context.Context, session string, ttl time.Duration) ([]string, error) {
	local, synced, ok := s.local.readTools(session, ttl)
	if ok && synced {
		return local, nil
	}
	var remote []string
	err := s.ask(ctx, "load_tools", func(ctx context.Context) (err error) {
		remote, err = s.remote.loadTools(ctx, session, ttl)
		return err
	})
	if err != nil {
		if ok {
			return local, nil
		}
		return nil, err
	}
	merged, _ := mergeToolNames(remote, local)
	s.local.mergeToolsSynced(session, merged, ttl, true)
	if len(merged) > len(remote) {
		// What was merged while the shared store could not take it.
		s.enqueue(ctx, "merge_tools", func(ctx context.Context) error { return s.remote.mergeTools(ctx, session, merged, ttl) })
	}
	if remote == nil && !ok {
		return nil, nil
	}
	return merged, nil
}

func (s *fallbackStore) mergeTools(ctx context.Context, session string, names []string, ttl time.Duration) error {
	s.local.mergeToolsSynced(session, names, ttl, false)
	merged := append([]string(nil), names...)
	s.enqueue(ctx, "merge_tools", func(ctx context.Context) error { return s.remote.mergeTools(ctx, session, merged, ttl) })
	return nil
}

// enqueue hands a write to the background writer, or drops it when the
// queue is full or the store is closing (the local copy has it).
func (s *fallbackStore) enqueue(ctx context.Context, op string, run func(context.Context) error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.closed {
		return
	}
	select {
	case s.writes <- storeWrite{ctx: context.WithoutCancel(ctx), op: op, run: run}:
	default:
		reportStore(ctx, "memory", op, time.Now(), errors.New("write queue full"))
	}
}

// write runs the queued writes in order until close; then the ones still
// queued, for at most storeCloseDrain.
func (s *fallbackStore) write() {
	defer close(s.done)
	for {
		select {
		case w := <-s.writes:
			s.run(w)
		case <-s.stop:
			deadline := time.Now().Add(storeCloseDrain)
			for {
				select {
				case w := <-s.writes:
					if time.Now().Before(deadline) {
						s.run(w)
					}
				default:
					return
				}
			}
		}
	}
}

// run runs one queued write; a marker (no op) runs as it is.
func (s *fallbackStore) run(w storeWrite) {
	if w.op == "" {
		_ = w.run(w.ctx)
		return
	}
	_ = s.ask(w.ctx, w.op, w.run)
}

// flush waits until the writes queued so far ran (tests).
func (s *fallbackStore) flush() {
	done := make(chan struct{})
	s.enqueue(context.Background(), "", func(context.Context) error { close(done); return nil })
	select {
	case <-done:
	case <-time.After(5 * time.Second):
	}
}

func (s *fallbackStore) close() {
	s.once.Do(func() {
		s.mu.Lock()
		s.closed = true
		s.mu.Unlock()
		close(s.stop)
		<-s.done
		s.remote.close()
	})
}

// storeBreaker stops asking a failing shared store: breakerFailures failures
// in a row open it for breakerOpen; after that the next failure opens it
// again at once, and a success closes it.
type storeBreaker struct {
	mu        sync.Mutex
	failures  int
	openUntil time.Time
	now       func() time.Time
}

const (
	breakerFailures = 5
	breakerOpen     = 30 * time.Second
)

func (b *storeBreaker) clock() time.Time {
	if b.now != nil {
		return b.now()
	}
	return time.Now()
}

func (b *storeBreaker) allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return !b.clock().Before(b.openUntil)
}

func (b *storeBreaker) failure() {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.failures++; b.failures >= breakerFailures {
		b.openUntil = b.clock().Add(breakerOpen)
	}
}

func (b *storeBreaker) success() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.failures, b.openUntil = 0, time.Time{}
}
