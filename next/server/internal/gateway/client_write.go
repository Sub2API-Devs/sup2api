package gateway

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// clientWriteTimeout is how long one write to the client may block. A client
// that stops reading otherwise holds its concurrency slots forever: the stream
// stalls on backpressure while the slots keep renewing.
var clientWriteTimeout = 60 * time.Second

// deadlineWriter renews a write deadline as a response is written. Renewing at
// most once a second keeps the cost off each SSE line.
type deadlineWriter struct {
	gin.ResponseWriter
	rc      *http.ResponseController
	renewed time.Time
}

func (w *deadlineWriter) renew() {
	if now := time.Now(); now.Sub(w.renewed) >= time.Second {
		w.renewed = now
		_ = w.rc.SetWriteDeadline(now.Add(clientWriteTimeout))
	}
}

func (w *deadlineWriter) Write(b []byte) (int, error) {
	w.renew()
	return w.ResponseWriter.Write(b)
}

func (w *deadlineWriter) WriteString(s string) (int, error) {
	w.renew()
	return w.ResponseWriter.WriteString(s)
}

func (w *deadlineWriter) Flush() {
	w.renew()
	w.ResponseWriter.Flush()
}

// limitClientWrites bounds each write of the response until the returned
// function runs, which clears the deadline: net/http leaves it on the
// connection, where it would fail the next request's response.
func (c *call) limitClientWrites() func() {
	orig := c.c.Writer
	rc := http.NewResponseController(orig)
	c.c.Writer = &deadlineWriter{ResponseWriter: orig, rc: rc}
	return func() {
		c.c.Writer = orig
		_ = rc.SetWriteDeadline(time.Time{})
	}
}
