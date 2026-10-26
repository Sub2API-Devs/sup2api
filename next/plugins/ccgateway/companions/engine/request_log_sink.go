package engine

// The request log's background writer (REQUEST-LOG-ASYNC-DESIGN.md §3). A
// request only hands it work: whatever it does with that work — the disk,
// assembling the response, the index — happens on its one goroutine, in the
// order it was handed over, so a request's files land before its metadata.
//
// Handing work over never waits: a full queue, or more bytes in flight than
// the sink takes, refuses the work and the request's log records what it
// lost (requestDiagnostic.submitLocked). A task that panics is counted and
// the sink goes on. Nothing here takes or waits for a lock the business
// uses; the locks a task takes (store.io, store.mu, d.mu) are the log's own,
// and none is held across anything that waits except store.io, which no
// request ever takes.
import (
	"log"
	"sync"
	"sync/atomic"
	"time"
)

const (
	// logSinkQueue is how many writes may wait.
	logSinkQueue = 8192
	// logSinkInflight bounds the bytes the waiting writes and the responses
	// being assembled hold (§3: 128 MiB).
	logSinkInflight = 128 << 20
	// logSinkDrain is how long a stopping Worker lets the queue drain (§3).
	logSinkDrain = 5 * time.Second
)

// logTask is one unit of background work. run returns the bytes it keeps
// holding (a response chunk kept for the assembler); the rest of the task's
// bytes are released when it returns.
type logTask struct {
	bytes int64
	run   func() int64
}

type logSink struct {
	tasks    chan logTask
	inflight atomic.Int64
	limit    int64
	closed   atomic.Bool
	stop     chan struct{}
	done     chan struct{}
	drainFor time.Duration
	once     sync.Once
	// waiting counts the tasks that may not be dropped (submitAlways) while
	// they wait for room in the queue.
	waiting sync.WaitGroup
	// dropped and panics count what the sink lost, for the Worker's own log.
	dropped atomic.Int64
	panics  atomic.Int64
}

func newLogSink(queue int, limit int64) *logSink {
	s := &logSink{tasks: make(chan logTask, queue), limit: limit, stop: make(chan struct{}), done: make(chan struct{})}
	go s.work()
	return s
}

// submit hands a task over without waiting. It is refused (false) when the
// queue is full, its bytes would pass the sink's limit, or the sink stopped.
func (s *logSink) submit(bytes int64, run func() int64) bool {
	if s == nil || s.closed.Load() {
		return false
	}
	if bytes > 0 && s.inflight.Add(bytes) > s.limit {
		s.inflight.Add(-bytes)
		s.dropped.Add(1)
		return false
	}
	select {
	case s.tasks <- logTask{bytes: bytes, run: run}:
		return true
	default:
		s.inflight.Add(-bytes)
		s.dropped.Add(1)
		return false
	}
}

// submitAlways hands over a task that must not be lost while the sink runs
// (a request's completion: it writes the metadata and leaves the active
// requests). With the queue full a goroutine waits for room in the caller's
// place; the tasks handed over before it still run first.
func (s *logSink) submitAlways(run func() int64) {
	if s == nil || s.closed.Load() {
		return
	}
	select {
	case s.tasks <- logTask{run: run}:
		return
	default:
	}
	s.waiting.Add(1)
	go func() {
		defer s.waiting.Done()
		select {
		case s.tasks <- logTask{run: run}:
		case <-s.stop:
		}
	}()
}

// release gives back bytes a task kept (logTask.run).
func (s *logSink) release(n int64) {
	if s != nil && n > 0 {
		s.inflight.Add(-n)
	}
}

func (s *logSink) work() {
	defer close(s.done)
	for {
		select {
		case t := <-s.tasks:
			s.run(t)
		case <-s.stop:
			s.drain()
			return
		}
	}
}

// drain runs what is queued until the queue is empty or the drain time is up.
func (s *logSink) drain() {
	deadline := time.Now().Add(s.drainFor)
	for time.Now().Before(deadline) {
		select {
		case t := <-s.tasks:
			s.run(t)
		default:
			return
		}
	}
}

// run runs one task; a panic is the log's alone.
func (s *logSink) run(t logTask) {
	var kept int64
	defer func() {
		if r := recover(); r != nil {
			kept = 0
			s.panics.Add(1)
			log.Printf("request log task failed: %v", r)
		}
		s.inflight.Add(-(t.bytes - kept))
	}()
	kept = t.run()
}

// close stops taking work and lets the queue drain for at most timeout; a
// task still running then is left to finish on its own.
func (s *logSink) close(timeout time.Duration) {
	if s == nil {
		return
	}
	s.once.Do(func() {
		s.drainFor = timeout
		s.closed.Store(true)
		close(s.stop)
	})
	timer := time.NewTimer(timeout)
	defer timer.Stop()
	select {
	case <-s.done:
	case <-timer.C:
	}
}
