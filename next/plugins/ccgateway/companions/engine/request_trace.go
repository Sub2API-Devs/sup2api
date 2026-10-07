package engine

// Worker-owned diagnostic artifacts. Call sites use these nil-safe methods so
// tracing can be disabled without changing the request execution path.
import (
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
	b, err := json.Marshal(Object{"time": time.Now().UTC().Format(time.RFC3339Nano), "event": event, "detail": detail})
	if err == nil {
		d.appendTrace("events.jsonl", append(b, '\n'))
	}
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
