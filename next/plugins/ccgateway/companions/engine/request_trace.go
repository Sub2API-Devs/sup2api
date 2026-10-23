package engine

// Worker-owned diagnostic artifacts. Call sites use these nil-safe methods so
// tracing can be disabled without changing the request execution path.
import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

func (d *requestDiagnostic) enabled() bool {
	if d == nil {
		return false
	}
	unlock := d.lock()
	defer unlock()
	// Logs turned off clear the directory (store.serve).
	return d.directory != "" && !d.discarded && !d.finished
}

func (d *requestDiagnostic) artifact(name string, value any) {
	if !d.enabled() {
		return
	}
	b, err := json.MarshalIndent(value, "", "  ")
	if err == nil {
		d.save(name, b)
	}
}

func (d *requestDiagnostic) appendTrace(name string, b []byte) {
	if d == nil {
		return
	}
	unlock := d.lock()
	defer unlock()
	if d.secretCapture && name != "events.jsonl" || !d.keeps(name) {
		return // Raw transport chunks can split a credential at any byte; a summary keeps no content.
	}
	b = d.redactCaptureLocked(b)
	if d.directory == "" || !d.reserve(len(b)) {
		return
	}
	f, err := os.OpenFile(filepath.Join(d.directory, name), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		d.logFailure(err)
		return
	}
	defer f.Close()
	if _, err := f.Write(b); err != nil {
		d.logFailure(err)
	}
}

func (d *requestDiagnostic) trace(event string, detail any) {
	if !d.enabled() {
		return
	}
	d.mu.Lock()
	content := !d.summaryOnly
	d.mu.Unlock()
	// A summary keeps no content: an event's texts (error messages, mostly)
	// keep at most their first 256 bytes.
	if !content {
		detail = boundStrings(detail)
	}
	b, err := json.Marshal(Object{"time": time.Now().UTC().Format(time.RFC3339Nano), "event": event, "detail": detail})
	if err == nil {
		d.appendTrace("events.jsonl", append(b, '\n'))
	}
}

// boundStrings is detail with every string cut to logValue's 256 bytes.
func boundStrings(detail any) any {
	raw, err := json.Marshal(detail)
	if err != nil {
		return nil
	}
	var value any
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	if decoder.Decode(&value) != nil {
		return nil
	}
	var bound func(any) any
	bound = func(v any) any {
		switch v := v.(type) {
		case string:
			return logValue(v)
		case map[string]any:
			for key, child := range v {
				v[key] = bound(child)
			}
		case []any:
			for i, child := range v {
				v[i] = bound(child)
			}
		}
		return v
	}
	return bound(value)
}
