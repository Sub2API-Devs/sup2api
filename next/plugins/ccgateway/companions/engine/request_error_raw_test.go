package engine

import (
	"bytes"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestRequestErrorFilePreservesOpaqueBytes(t *testing.T) {
	for _, body := range [][]byte{{}, []byte("<html>bad request</html>"), {0xff, 0x00, 0x80}, bytes.Repeat([]byte("error\xff"), 40000)} {
		meta := filepath.Join(t.TempDir(), "meta.json")
		if err := os.WriteFile(meta+".error-body", body, 0600); err != nil {
			t.Fatal(err)
		}
		f := localRequestError(400, "invalid_request_error", "invalid_request_error", "diagnostic")
		f.Source, f.BodyFile, f.BodyBytes = "http", true, int64(len(body))
		f.Headers = map[string]string{"content-type": "application/octet-stream", "retry-after": "1"}
		if !f.valid() {
			t.Fatal("valid sidecar frame rejected")
		}
		closer, err := f.openBody(meta)
		if err != nil {
			t.Fatal(err)
		}
		w := httptest.NewRecorder()
		f.write(w)
		_ = closer.Close()
		if w.Code != 400 || !bytes.Equal(body, w.Body.Bytes()) || w.Header().Get("Content-Type") != "application/octet-stream" {
			t.Fatal("upstream body changed")
		}
		f.BodyBytes++
		if closer, err = f.openBody(meta); err == nil {
			closer.Close()
			t.Fatal("incomplete sidecar accepted")
		}
	}
}

func TestRequestErrorLegacyTextAndEmptyRemainVerbatim(t *testing.T) {
	for _, body := range []string{"", "plain upstream error", "<html>error</html>", `{ "error":"exact" }`} {
		f := localRequestError(400, "invalid_request_error", "invalid_request_error", "metadata only")
		f.Source, f.Body = "http", body
		w := httptest.NewRecorder()
		f.write(w)
		if w.Code != 400 || w.Body.String() != body || w.Header().Get("Content-Type") != "" {
			t.Fatal("rewrapped error", w.Body.String())
		}
	}
}
