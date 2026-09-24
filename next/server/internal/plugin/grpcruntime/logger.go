package grpcruntime

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"strings"

	"github.com/hashicorp/go-hclog"
)

// newHCLogger returns an hclog.Logger (required by go-plugin) whose JSON
// output is re-emitted through slog with the plugin attributes attached.
func newHCLogger(base *slog.Logger) hclog.Logger {
	return hclog.New(&hclog.LoggerOptions{
		Name:       "plugin",
		Level:      hclog.Debug,
		JSONFormat: true,
		Output:     &slogWriter{log: base},
	})
}

type slogWriter struct{ log *slog.Logger }

func (w *slogWriter) Write(p []byte) (int, error) {
	for _, line := range bytes.Split(p, []byte{'\n'}) {
		line = bytes.TrimSpace(line)
		if len(line) == 0 {
			continue
		}
		w.emit(line)
	}
	return len(p), nil
}

func (w *slogWriter) emit(line []byte) {
	var m map[string]any
	if err := json.Unmarshal(line, &m); err != nil {
		w.log.Debug(string(line))
		return
	}
	msg, _ := m["@message"].(string)
	lvl, _ := m["@level"].(string)
	attrs := make([]slog.Attr, 0, len(m))
	for k, v := range m {
		if strings.HasPrefix(k, "@") && k != "@module" {
			continue
		}
		attrs = append(attrs, slog.Any(k, v))
	}
	w.log.LogAttrs(context.Background(), hcLevel(lvl), msg, attrs...)
}

func hcLevel(s string) slog.Level {
	switch strings.ToLower(s) {
	case "trace", "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	}
	return slog.LevelInfo
}
