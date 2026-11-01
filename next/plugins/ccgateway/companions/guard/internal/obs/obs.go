// Package obs writes one-line JSON logs and keeps a few counters. Callers
// pass only fixed event names and validated values: never request bodies,
// environment variables, command output or tokens (03 §3.3, §12.4).
package obs

import (
	"encoding/json"
	"io"
	"os"
	"sort"
	"sync"
	"time"
)

// Fields are the extra keys of one log line.
type Fields map[string]any

// Logger is safe for concurrent use.
type Logger struct {
	mu    sync.Mutex
	w     io.Writer
	debug bool
	now   func() time.Time

	cmu      sync.Mutex
	counters map[string]int64
}

// New returns a logger writing to w (os.Stderr when nil).
func New(w io.Writer, debug bool) *Logger {
	if w == nil {
		w = os.Stderr
	}
	return &Logger{w: w, debug: debug, now: time.Now, counters: map[string]int64{}}
}

// Discard is a logger that writes nothing (tests, offline commands).
func Discard() *Logger { return New(io.Discard, false) }

func (l *Logger) write(level, event string, f Fields) {
	if l == nil {
		return
	}
	line := make(map[string]any, len(f)+3)
	for k, v := range f {
		line[k] = v
	}
	line["ts"] = l.now().UTC().Format(time.RFC3339Nano)
	line["level"] = level
	line["event"] = event
	b, err := json.Marshal(line)
	if err != nil {
		b = []byte(`{"level":"error","event":"log_encode_failed"}`)
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	_, _ = l.w.Write(append(b, '\n'))
}

func (l *Logger) Info(event string, f Fields)  { l.write("info", event, f) }
func (l *Logger) Warn(event string, f Fields)  { l.write("warn", event, f) }
func (l *Logger) Error(event string, f Fields) { l.write("error", event, f) }

// Alert is the highest level: something that should never happen.
func (l *Logger) Alert(event string, f Fields) { l.Inc(event); l.write("alert", event, f) }

// Debug only writes when the guard runs with CCG_GUARD_LOG=debug.
func (l *Logger) Debug(event string, f Fields) {
	if l != nil && l.debug {
		l.write("debug", event, f)
	}
}

// Inc increments a counter.
func (l *Logger) Inc(name string) {
	if l == nil {
		return
	}
	l.cmu.Lock()
	l.counters[name]++
	l.cmu.Unlock()
}

// Counters returns a sorted snapshot.
func (l *Logger) Counters() map[string]int64 {
	out := map[string]int64{}
	if l == nil {
		return out
	}
	l.cmu.Lock()
	defer l.cmu.Unlock()
	keys := make([]string, 0, len(l.counters))
	for k := range l.counters {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		out[k] = l.counters[k]
	}
	return out
}

// Truncate cuts s to n bytes (debug messages from Docker, 03 §5.1).
func Truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
