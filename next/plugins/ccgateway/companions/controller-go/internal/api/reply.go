package api

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strconv"
	"strings"
	"syscall"
	"time"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/pyjson"
)

// The failures each endpoint group names (H10); anything else is 503
// runtime_unavailable with its whole error in the log.
var (
	requestErrors    = errs.Request
	deleteErrors     = errs.Delete
	managementErrors = errs.Management
	workerErrors     = errs.Worker
	tunnelErrors     = errs.Tunnel
)

// exchange is one request: Python's handler instance state.
type exchange struct {
	s        *Server
	w        *trackWriter
	r        *http.Request
	key      *string // account key for the failure log (nil: None)
	path     *string // request path for the failure log (nil: None)
	close    bool    // close_connection
	hijacked bool
	abort    bool // the client is gone: end the connection without an answer
}

// trackWriter remembers whether the answer has started (response_started).
type trackWriter struct {
	http.ResponseWriter
	started bool
}

func (t *trackWriter) WriteHeader(code int) {
	if code >= 200 {
		t.started = true
	}
	t.ResponseWriter.WriteHeader(code)
}

func (t *trackWriter) Write(p []byte) (int, error) {
	t.started = true
	return t.ResponseWriter.Write(p)
}

// Unwrap lets http.ResponseController reach Flush, Hijack and the deadlines.
func (t *trackWriter) Unwrap() http.ResponseWriter { return t.ResponseWriter }

func (ex *exchange) keyText() string  { return noneOr(ex.key) }
func (ex *exchange) pathText() string { return noneOr(ex.path) }

func noneOr(p *string) string {
	if p == nil {
		return "None"
	}
	return *p
}

// reply is Handler.reply: the JSON body with Content-Type, Content-Length,
// Cache-Control and, when the connection will close, Connection: close.
func (ex *exchange) reply(status int, v any) {
	raw := pyjson.MustMarshal(v)
	h := ex.w.Header()
	h.Set("Content-Type", "application/json")
	h.Set("Content-Length", strconv.Itoa(len(raw)))
	h.Set("Cache-Control", "no-store")
	if ex.close {
		h.Set("Connection", "close")
	}
	rc := http.NewResponseController(ex.w)
	rc.SetWriteDeadline(time.Now().Add(ex.s.idle))
	ex.w.WriteHeader(status)
	ex.w.Write(raw)
	if ex.close {
		// Python closes at once and never reads what is left of the
		// request body; net/http would first try to drain it (a chunked
		// body the client never sends would hold the connection).
		rc.SetReadDeadline(time.Now())
	}
}

// fail is Handler.fail: {"error": code}.
func (ex *exchange) fail(status int, code string, close bool) {
	if close {
		ex.close = true
	}
	ex.reply(status, pyjson.Ordered{{Key: "error", Value: code}})
}

// note is note_failure: one WARNING line per failed request (H11); never
// the body, the headers or the URL. An unnamed failure (Python: with its
// traceback) also gets its whole error chain with the Go types.
func (ex *exchange) note(err error, outcome string, trace bool) {
	text := errs.FailureText(err)
	if trace {
		ex.s.log.Warn("%s key=%s path=%s -> %s: %s | chain: %s", ex.r.Method, ex.keyText(), ex.pathText(),
			outcome, text, chain(err))
		return
	}
	ex.s.log.Warn("%s key=%s path=%s -> %s: %s", ex.r.Method, ex.keyText(), ex.pathText(), outcome, text)
}

// chain is every error of err's chain as "<type>: <message>", outermost first.
func chain(err error) string {
	var parts []string
	for e := err; e != nil && len(parts) < 8; e = errors.Unwrap(e) {
		parts = append(parts, fmt.Sprintf("%T: %s", e, e.Error()))
	}
	return strings.Join(parts, " <- ")
}

// answerError is answer_error: the connection is never reused; a dropped
// client is only logged; otherwise the group's answer unless an answer has
// already started. management adds timeouts to the dropped failures.
func (ex *exchange) answerError(err error, named errs.Set, management bool) {
	ex.close = true
	if ex.dropped(err, management) {
		ex.note(err, "connection dropped", false)
		ex.abort = true
		return
	}
	status, code, known := errs.Answer(err, named)
	ex.note(err, fmt.Sprintf("%d %s", status, code), !known)
	if !ex.w.started {
		ex.fail(status, code, false)
	}
}

// clientError marks a failure of the caller's own connection (reading its
// body or writing the answer).
type clientError struct{ err error }

func (e *clientError) Error() string { return "client connection: " + e.err.Error() }
func (e *clientError) Unwrap() error { return e.err }

// errShortBody is a request body that ended before its Content-Length.
var errShortBody = errors.New("request body ended early")

// dropped is Python's DROPPED (BrokenPipeError, ConnectionResetError; the
// management endpoints add TimeoutError) for the caller's connection, plus
// a body cut short and a request whose client went away (its context
// ended: Go notices before the next write, Python only at it).
func (ex *exchange) dropped(err error, management bool) bool {
	var ce *clientError
	if !errors.As(err, &ce) {
		return errors.Is(err, context.Canceled) && ex.r.Context().Err() != nil
	}
	if errors.Is(err, errShortBody) || errors.Is(err, io.ErrUnexpectedEOF) || isReset(err) {
		return true
	}
	var ne net.Error
	if errors.As(err, &ne) && ne.Timeout() {
		return management
	}
	return ex.r.Context().Err() != nil
}

// isReset is a broken pipe or a reset or aborted connection.
func isReset(err error) bool {
	return errors.Is(err, syscall.EPIPE) || errors.Is(err, syscall.ECONNRESET) || errors.Is(err, syscall.ECONNABORTED) ||
		errors.Is(err, net.ErrClosed) || isPlatformReset(err)
}
