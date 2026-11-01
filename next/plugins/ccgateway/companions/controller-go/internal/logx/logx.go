// Package logx is the controller's log: one line per event on stderr in
// Python's format "%(asctime)s %(levelname)s %(name)s %(message)s"
// (behaviour E1, H11). Never log request bodies, headers, URLs, tokens,
// keys or proxy credentials.
//
// FROZEN.
package logx

import (
	"fmt"
	"io"
	"os"
	"sync"
	"time"
)

// Logger writes lines for one logger name.
type Logger struct {
	name string
	out  *output
}

type output struct {
	mu  sync.Mutex
	w   io.Writer
	now func() time.Time
}

// New is a logger called name writing to w (os.Stderr when nil).
func New(w io.Writer, name string) *Logger {
	if w == nil {
		w = os.Stderr
	}
	return &Logger{name: name, out: &output{w: w, now: time.Now}}
}

// Discard is a logger that writes nothing.
func Discard() *Logger { return New(io.Discard, "discard") }

// Named is a logger with another name sharing the output.
func (l *Logger) Named(name string) *Logger {
	if l == nil {
		return nil
	}
	return &Logger{name: name, out: l.out}
}

func (l *Logger) line(level, format string, args []any) {
	if l == nil {
		return
	}
	l.out.mu.Lock()
	defer l.out.mu.Unlock()
	t := l.out.now()
	fmt.Fprintf(l.out.w, "%s,%03d %s %s %s\n", t.Format("2006-01-02 15:04:05"), t.Nanosecond()/1e6, level, l.name,
		fmt.Sprintf(format, args...))
}

// Info logs at INFO.
func (l *Logger) Info(format string, args ...any) { l.line("INFO", format, args) }

// Warn logs at WARNING.
func (l *Logger) Warn(format string, args ...any) { l.line("WARNING", format, args) }

// Error logs at ERROR.
func (l *Logger) Error(format string, args ...any) { l.line("ERROR", format, args) }
