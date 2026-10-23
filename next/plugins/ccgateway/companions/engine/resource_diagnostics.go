package engine

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"hash"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"strings"
)

type resourceDiagnosticKey struct{}
type resourceDiagnosticWriter struct {
	http.ResponseWriter
	d      *requestDiagnostic
	digest hash.Hash
	bytes  int64
	json   bytes.Buffer
	status int
}

func (w *resourceDiagnosticWriter) Unwrap() http.ResponseWriter { return w.ResponseWriter }
func (w *resourceDiagnosticWriter) WriteHeader(code int) {
	if w.status == 0 {
		w.status = code
		w.ResponseWriter.WriteHeader(code)
	}
}
func (w *resourceDiagnosticWriter) Write(p []byte) (int, error) {
	if w.status == 0 {
		w.WriteHeader(200)
	}
	n, err := w.ResponseWriter.Write(p)
	w.bytes += int64(n)
	w.digest.Write(p[:n])
	if strings.Contains(w.Header().Get("Content-Type"), "json") && w.json.Len()+n <= 1<<20 {
		w.json.Write(p[:n])
	}
	return n, err
}

func (b *resourceBroker) resourceDiagnostic(w http.ResponseWriter, r *http.Request) (http.ResponseWriter, *http.Request, func()) {
	d := newRequestDiagnostic(w, r)
	d.store = b.g.RequestLogs
	d.secretCapture = true // Resource binaries never use the generic raw response log.
	d.fields["operation_kind"] = "provider_resource"
	d.fields["capture_policy"] = "resource_metadata_and_bounded_json"
	d.fields["request_body_retained"] = false
	d.fields["request_body_omitted_reason"] = "multipart/binary payload represented by byte counts, sha256 and part metadata"
	captured := d.capture(w, r, b.g.RequestLogDir)
	if !d.enabled() {
		return captured, r, func() { d.finish() }
	}
	d.artifact("resource-config.json", Object{"body_limit_bytes": b.limit, "spool_budget_bytes": b.budget.limit, "timeout_seconds": resourceTimeout.Seconds(), "cli_version": b.g.Runner.Version, "auth_carrier": "native_cli", "session_checkpoint": false})
	d.trace("resource_received", Object{"method": r.Method, "path": r.URL.Path, "query": r.URL.RawQuery, "content_type": r.Header.Get("Content-Type"), "declared_bytes": r.ContentLength})
	writer := &resourceDiagnosticWriter{ResponseWriter: captured, d: d, digest: sha256.New()}
	finish := func() {
		d.mu.Lock()
		if writer.status != 0 {
			d.status = writer.status
		}
		d.mu.Unlock()
		facts := Object{"status": writer.status, "bytes": writer.bytes, "sha256": hex.EncodeToString(writer.digest.Sum(nil)), "body_retained": false, "body_omitted_reason": "binary, oversized, or non-JSON response"}
		if int64(writer.json.Len()) == writer.bytes && writer.bytes > 0 {
			if value, err := decodeObject(writer.json.Bytes()); err == nil {
				d.artifact("resource-response.json", value)
				facts["body_retained"] = true
				delete(facts, "body_omitted_reason")
			}
		}
		d.artifact("resource-response-facts.json", facts)
		d.trace("resource_response_completed", facts)
		d.finish()
	}
	return writer, r.WithContext(context.WithValue(r.Context(), resourceDiagnosticKey{}, d)), finish
}

func resourceDiagnostic(ctx context.Context) *requestDiagnostic {
	d, _ := ctx.Value(resourceDiagnosticKey{}).(*requestDiagnostic)
	return d
}
func recordResourceInput(ctx context.Context, spool *resourceSpool, contentType string) {
	d := resourceDiagnostic(ctx)
	if !d.enabled() || spool == nil {
		return
	}
	hash := sha256.New()
	_, err := io.Copy(hash, io.NewSectionReader(spool.File, 0, spool.size))
	facts := Object{"bytes": spool.size, "sha256": hex.EncodeToString(hash.Sum(nil)), "content_type": contentType, "body_retained": false, "body_omitted_reason": "multipart/binary payload not retained"}
	if err != nil {
		facts["read_error"] = true
	}
	_, params, err := mime.ParseMediaType(contentType)
	if err == nil && params["boundary"] != "" {
		reader := multipart.NewReader(io.NewSectionReader(spool.File, 0, spool.size), params["boundary"])
		parts := []Object{}
		for len(parts) < 256 {
			part, err := reader.NextPart()
			if err == io.EOF {
				break
			}
			if err != nil {
				facts["multipart_parse_failed"] = true
				break
			}
			partHash := sha256.New()
			n, err := io.Copy(partHash, part)
			_, disposition, _ := mime.ParseMediaType(part.Header.Get("Content-Disposition"))
			parts = append(parts, Object{"name": part.FormName(), "filename": disposition["filename"], "normalized_file_name": part.FileName(), "content_type": part.Header.Get("Content-Type"), "bytes": n, "sha256": hex.EncodeToString(partHash.Sum(nil)), "read_error": err != nil})
			part.Close()
		}
		facts["parts"] = parts
		if len(parts) == 256 {
			facts["parts_truncated"] = true
		}
	}
	d.artifact("resource-request-facts.json", facts)
	d.trace("resource_upload_spooled", facts)
}
