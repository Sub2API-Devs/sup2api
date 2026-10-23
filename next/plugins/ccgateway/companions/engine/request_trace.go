package engine

// Worker-owned diagnostic artifacts. Call sites use these nil-safe methods so
// tracing can be disabled without changing the request execution path.
import (
	"bytes"
	"encoding/json"
	"io"
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
	if d.store != nil && !d.store.enabled {
		return false
	}
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
	if d.store != nil && !d.store.enabled {
		return
	}
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

// traceContent records an event whose detail is request or response content
// (a search result, a Mod's attachment text): whole at the full level, as its
// shape (summary) otherwise.
func (d *requestDiagnostic) traceContent(event string, detail, summary any) {
	if !d.enabled() {
		return
	}
	d.mu.Lock()
	content := !d.summaryOnly
	d.mu.Unlock()
	if content {
		d.trace(event, detail)
	} else {
		d.trace(event, summary)
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

func (d *requestDiagnostic) snapshot(name, source string) {
	if !d.enabled() || source == "" {
		return
	}
	f, err := os.Open(source)
	if err != nil {
		d.trace("snapshot_unavailable", Object{"file": name})
		return
	}
	defer f.Close()
	b, err := io.ReadAll(io.LimitReader(f, (64<<20)+1))
	if err == nil {
		d.save(name, b)
	}
}

type traceReader struct {
	io.ReadCloser
	diagnostic *requestDiagnostic
	name       string
}

func (r *traceReader) Read(p []byte) (int, error) {
	n, err := r.ReadCloser.Read(p)
	if n > 0 {
		r.diagnostic.appendTrace(r.name, p[:n])
	}
	return n, err
}
