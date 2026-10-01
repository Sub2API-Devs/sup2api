package gateway

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

const spoolMemoryLimit = 1 << 20
const spoolTotalLimit = 64 << 20

// bufferedResponse keeps a successful non-streaming answer private until its
// accounting receipt commits. Large answers spill to an owner-only temp file.
type bufferedResponse struct {
	gin.ResponseWriter
	header       http.Header
	status, size int
	mem          bytes.Buffer
	file         *os.File
	err          error
	written      bool
}

func newBufferedResponse(w gin.ResponseWriter) *bufferedResponse {
	return &bufferedResponse{ResponseWriter: w, header: w.Header().Clone(), status: 200}
}
func (w *bufferedResponse) Header() http.Header { return w.header }
func (w *bufferedResponse) Status() int         { return w.status }
func (w *bufferedResponse) Size() int {
	if !w.written {
		return -1
	}
	return w.size
}
func (w *bufferedResponse) Written() bool { return w.written }
func (w *bufferedResponse) WriteHeader(code int) {
	if !w.written {
		w.status = code
	}
}
func (w *bufferedResponse) WriteHeaderNow()                   { w.written = true }
func (w *bufferedResponse) Flush()                            { w.written = true }
func (w *bufferedResponse) WriteString(s string) (int, error) { return w.Write([]byte(s)) }
func (w *bufferedResponse) Write(p []byte) (int, error) {
	w.written = true
	if w.err != nil {
		return 0, w.err
	}
	if w.size+len(p) > spoolTotalLimit {
		w.err = errors.New("response exceeds 64 MiB spool limit")
		return 0, w.err
	}
	if w.file == nil && w.size+len(p) > spoolMemoryLimit {
		w.file, w.err = os.CreateTemp("", "sup2api-response-*")
		if w.err == nil {
			_, w.err = w.file.Write(w.mem.Bytes())
			w.mem.Reset()
		}
		if w.err != nil {
			return 0, w.err
		}
	}
	var n int
	if w.file == nil {
		n, w.err = w.mem.Write(p)
	} else {
		n, w.err = w.file.Write(p)
	}
	w.size += n
	return n, w.err
}
func (w *bufferedResponse) close() {
	if w.file != nil {
		name := w.file.Name()
		_ = w.file.Close()
		_ = os.Remove(name)
	}
}
func (w *bufferedResponse) publish() error {
	if w.err != nil {
		return w.err
	}
	for k, v := range w.header {
		w.ResponseWriter.Header()[k] = v
	}
	w.ResponseWriter.WriteHeader(w.status)
	var r io.Reader = &w.mem
	if w.file != nil {
		if _, err := w.file.Seek(0, 0); err != nil {
			return err
		}
		r = w.file
	}
	_, err := io.Copy(w.ResponseWriter, r)
	return err
}
