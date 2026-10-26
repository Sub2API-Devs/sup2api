package engine

import (
	"path/filepath"
	"testing"
	"time"
)

// Test helpers for the request log's background writer
// (REQUEST-LOG-ASYNC-DESIGN.md): a log is written after the request handed
// it over, so a test that reads the files waits for the writer first.

// flush waits until every write handed over before it has run.
func (s *logSink) flush() {
	if s == nil || s.closed.Load() {
		return
	}
	s.waiting.Wait()
	done := make(chan struct{})
	select {
	case s.tasks <- logTask{run: func() int64 { close(done); return 0 }}:
	case <-s.stop:
		return
	}
	select {
	case <-done:
	case <-s.done:
	}
}

// flush waits for the store's background writes.
func (s *requestLogStore) flush() {
	if s != nil {
		s.sink.flush()
	}
}

// flushLogs waits for the background writes of d's store.
func (d *requestDiagnostic) flushLogs() {
	if d != nil && d.store != nil {
		d.store.flush()
	}
}

// openTestLogStore is newRequestLogStore whose writer stops with the test,
// before its temporary directories are removed.
func openTestLogStore(t *testing.T, root string) (*requestLogStore, error) {
	t.Helper()
	s, err := newRequestLogStore(root)
	if s != nil {
		t.Cleanup(func() { s.sink.close(logSinkDrain) })
	}
	return s, err
}

// summaryLogStore is a store in root at the summary level, as a new account
// was before the default became off.
func summaryLogStore(t *testing.T, root string) *requestLogStore {
	t.Helper()
	s, err := openTestLogStore(t, root)
	if err != nil {
		t.Fatal(err)
	}
	s.mu.Lock()
	s.level, s.enabled = logLevelSummary, true
	s.mu.Unlock()
	return s
}

// detachedDiagnostic is a request log at a directory of its own, written by a
// store's writer, as the credential tests build it.
func detachedDiagnostic(t *testing.T) *requestDiagnostic {
	t.Helper()
	s, err := openTestLogStore(t, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	return &requestDiagnostic{directory: filepath.Join(t.TempDir(), "log"), fields: Object{}, store: s}
}

// finishLog finishes d and waits for its log.
func finishLog(d *requestDiagnostic) {
	d.finish()
	d.flushLogs()
}

// stallSink blocks s's writer until the returned function is called.
func stallSink(t *testing.T, s *logSink) func() {
	t.Helper()
	started, release := make(chan struct{}), make(chan struct{})
	if !s.submit(0, func() int64 { close(started); <-release; return 0 }) {
		t.Fatal("stall refused")
	}
	select {
	case <-started:
	case <-time.After(5 * time.Second):
		t.Fatal("the writer did not start")
	}
	released := false
	t.Cleanup(func() {
		if !released {
			close(release)
		}
	})
	return func() {
		if !released {
			released = true
			close(release)
		}
	}
}
