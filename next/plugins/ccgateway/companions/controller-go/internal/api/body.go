package api

import (
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/pyjson"
)

// idleBody renews the read deadline of the caller's connection before
// every read (Python's 240 s socket timeout is per recv) and marks read
// failures as the client's.
type idleBody struct {
	r    io.Reader
	rc   *http.ResponseController
	idle time.Duration
}

func (b *idleBody) Read(p []byte) (int, error) {
	b.rc.SetReadDeadline(time.Now().Add(b.idle))
	n, err := b.r.Read(p)
	if err != nil && err != io.EOF {
		err = &clientError{err}
	}
	return n, err
}

// body is the request body with idle deadlines.
func (ex *exchange) body() *idleBody {
	return &idleBody{r: ex.r.Body, rc: http.NewResponseController(ex.w), idle: ex.s.idle}
}

// endBody clears the read deadline once the body is read: the server's
// background read of the next request must not inherit it (it would end the
// request's context in the middle of a long answer).
func (ex *exchange) endBody() {
	http.NewResponseController(ex.w).SetReadDeadline(time.Time{})
}

// rawContentLength is the Content-Length header as sent ("0" when absent).
func (ex *exchange) rawContentLength(def string) string {
	if v, ok := ex.r.Header["Content-Length"]; ok && len(v) > 0 {
		return v[0]
	}
	return def
}

// readBody is read_body: Content-Length strictly decimal (1-12 digits) and
// at most limit, no Transfer-Encoding; exactly that many bytes.
func (ex *exchange) readBody(limit int64) ([]byte, error) {
	raw := ex.rawContentLength("0")
	if len(ex.r.TransferEncoding) > 0 || !decimal.MatchString(raw) {
		return nil, errs.New(errs.BadRequest, "invalid body")
	}
	n, _ := strconv.ParseInt(raw, 10, 64)
	if n > limit {
		return nil, errs.New(errs.BadRequest, "invalid body")
	}
	buf := make([]byte, n)
	if n == 0 {
		return buf, nil
	}
	_, err := io.ReadFull(ex.body(), buf)
	ex.endBody()
	if err != nil {
		if errors.Is(err, io.ErrUnexpectedEOF) || errors.Is(err, io.EOF) {
			return nil, &clientError{errShortBody}
		}
		return nil, err
	}
	return buf, nil
}

// readJSON is read_json: a body that is not JSON is BadRequest.
func (ex *exchange) readJSON(limit int64) (any, error) {
	raw, err := ex.readBody(limit)
	if err != nil {
		return nil, err
	}
	v, err := pyjson.Decode(raw)
	if err != nil {
		return nil, errs.Wrap(errs.BadRequest, "invalid JSON", err)
	}
	return v, nil
}
