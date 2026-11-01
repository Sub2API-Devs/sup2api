package logx

import (
	"bytes"
	"regexp"
	"strings"
	"testing"
)

// covers: E1 H11 (Python's log line format)
func TestFormat(t *testing.T) {
	var buf bytes.Buffer
	l := New(&buf, "ccgateway.controller")
	l.Warn("PUT key=%s path=%s -> %d %s", "21", "config", 503, "runtime_unavailable")
	l.Named("ccgateway.controller.cleanup").Info("x")
	l.Error("e")
	lines := strings.Split(strings.TrimSpace(buf.String()), "\n")
	re := regexp.MustCompile(`^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d,\d{3} (WARNING|INFO|ERROR) ccgateway\.controller(\.cleanup)? .+$`)
	if len(lines) != 3 {
		t.Fatal(lines)
	}
	for _, line := range lines {
		if !re.MatchString(line) {
			t.Errorf("%q", line)
		}
	}
	if !strings.HasSuffix(lines[0], "WARNING ccgateway.controller PUT key=21 path=config -> 503 runtime_unavailable") {
		t.Fatal(lines[0])
	}
	var nilLogger *Logger
	nilLogger.Info("ignored")
	if nilLogger.Named("x") != nil {
		t.Fatal("nil")
	}
	Discard().Warn("nothing")
}
