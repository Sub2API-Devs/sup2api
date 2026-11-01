package api

import (
	"bufio"
	"compress/flate"
	"compress/gzip"
	"compress/zlib"
	"errors"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/workeradmin"
)

// logReadHeaders are the Worker headers a request log file read reports (T12).
var logReadHeaders = []string{"X-Log-File-Size", "X-Log-Offset", "X-Log-Length", "X-Content-Type-Options"}

// passThroughMethods are the methods the Worker accepts on each
// pass-through path; any other path allows GET and POST (T9).
var passThroughMethods = map[string][]string{
	"admin/request-logs":        {"GET", "PUT"},
	"admin/request-logs/query":  {"POST"},
	"admin/request-logs/detail": {"POST"},
	"admin/request-logs/read":   {"POST"},
	"admin/cli":                 {"GET", "POST", "PUT"},
	"admin/usage":               {"GET"},
	"admin/features":            {"GET"},
}

// localPaths are answered by the controller itself; any other method on
// them is 405 (R11). "" is the runtime itself (/accounts/<key>).
func localPath(path string) bool {
	switch path {
	case "", "config", "status", "connection", "egress":
		return true
	}
	return false
}

// accountRequest is account_request (the body is already read).
func (ex *exchange) accountRequest(aid, path string, body []byte) error {
	ctx, method := ex.r.Context(), ex.r.Method
	if aid == "" {
		if method != http.MethodGet {
			ex.fail(http.StatusMethodNotAllowed, "method_not_allowed", false)
			return nil
		}
		list, err := ex.s.accounts.Runtimes(ctx)
		if err != nil {
			return err
		}
		ex.reply(http.StatusOK, list)
		return nil
	}
	switch {
	case path == "" && method == http.MethodDelete:
		// The header must name the runtime again; X-CCG-Delete-Data also
		// removes its data volume and recovery backup (R3).
		account := ex.r.Header.Get("X-CCG-Delete-Account") == aid
		purge := ex.r.Header.Get("X-CCG-Delete-Data") == "1"
		if purge && !account {
			return errs.New(errs.BadRequest, "full deletion requires account confirmation")
		}
		res, err := ex.s.accounts.Delete(ctx, aid, account, purge)
		if err != nil {
			return err
		}
		ex.reply(http.StatusOK, res)
	case path == "config" && method == http.MethodPut:
		desired, err := pyjson.Decode(body)
		if err != nil {
			desired = nil // apply answers 400 and drops readiness (H6)
		}
		res, err := ex.s.accounts.Apply(ctx, aid, desired)
		if err != nil {
			return err
		}
		ex.reply(http.StatusOK, res)
	case path == "status" && method == http.MethodGet:
		res, err := ex.s.accounts.Public(ctx, aid)
		if err != nil {
			return err
		}
		ex.reply(http.StatusOK, res)
	case path == "connection" && method == http.MethodGet:
		res, err := ex.s.accounts.Connection(ctx, aid, ex.r.Header.Get("X-CCG-Revision"))
		if err != nil {
			return err
		}
		if res == nil {
			ex.fail(http.StatusConflict, "not_synchronized", false)
			return nil
		}
		ex.reply(http.StatusOK, res)
	case path == "egress" && method == http.MethodGet:
		res, err := ex.s.accounts.EgressStatus(ctx, aid)
		if err != nil {
			return err
		}
		ex.reply(http.StatusOK, res)
	case localPath(path):
		ex.fail(http.StatusMethodNotAllowed, "method_not_allowed", false)
	default:
		return ex.passThrough(aid, path, body)
	}
	return nil
}

func methodAllowed(path, method string) bool {
	allowed, ok := passThroughMethods[path]
	if !ok {
		allowed = []string{"GET", "POST"}
	}
	for _, m := range allowed {
		if m == method {
			return true
		}
	}
	return false
}

// passThrough is pass_through: the runtime must be ready at the caller's
// revision (checked under the account lock, released before the call);
// the Worker's answer is streamed back.
func (ex *exchange) passThrough(aid, path string, body []byte) error {
	if !methodAllowed(path, ex.r.Method) {
		ex.fail(http.StatusMethodNotAllowed, "method_not_allowed", false)
		return nil
	}
	ctx := ex.r.Context()
	st, err := ex.s.accounts.ReadyState(ctx, aid, ex.r.Header.Get("X-CCG-Revision"))
	if err != nil {
		return err
	}
	if st == nil {
		ex.fail(http.StatusConflict, "not_synchronized", false)
		return nil
	}
	if (strings.HasPrefix(path, "admin/auth/") || path == "admin/usage") && st.AuthMode.Or("") == "api_key" {
		ex.fail(http.StatusConflict, "api_key_account", false)
		return nil
	}
	resp, err := ex.s.worker.Do(ctx, st, ex.r.Method, path, body, workeradmin.PassThrough)
	if err != nil {
		return err
	}
	return ex.relay(path, resp)
}

// relay writes the Worker's answer: its status and Content-Type, always
// Connection: close and Cache-Control: no-store, no Content-Length and no
// chunking (the end of the body is the end of the connection), each piece
// written and flushed as it arrives (T12).
func (ex *exchange) relay(path string, resp *http.Response) error {
	defer resp.Body.Close()
	h := ex.w.Header()
	contentType := "application/json"
	if v, ok := resp.Header["Content-Type"]; ok && len(v) > 0 {
		contentType = v[0]
	}
	h.Set("Content-Type", contentType)
	h.Set("Connection", "close")
	h.Set("Cache-Control", "no-store")
	if path == "admin/request-logs/read" {
		for _, name := range logReadHeaders {
			if v := resp.Header.Get(name); v != "" {
				h.Set(name, v)
			}
		}
	}
	// identity: net/http drops the header, does not chunk and closes the
	// connection after the answer (Python's format).
	h["Transfer-Encoding"] = []string{"identity"}
	ex.close = true
	rc := http.NewResponseController(ex.w)
	rc.SetWriteDeadline(time.Now().Add(ex.s.idle))
	ex.w.WriteHeader(resp.StatusCode)
	body := decodedBody(resp.Header.Get("Content-Encoding"), resp.Body)
	buf := make([]byte, 32<<10)
	for {
		n, err := body.Read(buf)
		if n > 0 {
			rc.SetWriteDeadline(time.Now().Add(ex.s.idle))
			if _, werr := ex.w.Write(buf[:n]); werr != nil {
				return &clientError{werr}
			}
			if ferr := rc.Flush(); ferr != nil {
				return &clientError{ferr}
			}
		}
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
	}
}

// decodedBody undoes a Content-Encoding the way requests' iter_content does
// (urllib3: gzip, x-gzip, deflate; a list is decoded in reverse order, an
// unknown member of a list as deflate). The controller asks for identity,
// so this only matters for a Worker that compresses anyway (T12).
func decodedBody(contentEncoding string, body io.Reader) io.Reader {
	ce := strings.ToLower(contentEncoding)
	known := func(e string) bool { return e == "gzip" || e == "x-gzip" || e == "deflate" }
	var modes []string
	switch {
	case known(ce):
		modes = []string{ce}
	case strings.Contains(ce, ","):
		any := false
		for _, part := range strings.Split(ce, ",") {
			if known(strings.TrimSpace(part)) {
				any = true
			}
		}
		if any {
			for _, part := range strings.Split(ce, ",") {
				modes = append(modes, strings.TrimSpace(part))
			}
		}
	}
	r := body
	for i := len(modes) - 1; i >= 0; i-- {
		r = &lazyDecoder{src: r, mode: modes[i]}
	}
	return r
}

// lazyDecoder opens its decompressor at the first read: the answer's
// status and headers are already sent then, as in Python.
type lazyDecoder struct {
	src  io.Reader
	mode string
	r    io.Reader
}

func (d *lazyDecoder) Read(p []byte) (int, error) {
	if d.r == nil {
		var err error
		if d.r, err = openDecoder(d.mode, d.src); err != nil {
			return 0, err
		}
	}
	return d.r.Read(p)
}

func openDecoder(mode string, src io.Reader) (io.Reader, error) {
	if mode == "gzip" || mode == "x-gzip" {
		return gzip.NewReader(src)
	}
	// deflate: zlib-wrapped, or raw deflate when the first bytes are not a
	// zlib header (urllib3's DeflateDecoder).
	br := bufio.NewReader(src)
	head, err := br.Peek(2)
	if err != nil && len(head) < 2 {
		if errors.Is(err, io.EOF) && len(head) == 0 {
			return br, nil
		}
		return nil, io.ErrUnexpectedEOF
	}
	if head[0]&0x0f == 8 && (uint16(head[0])<<8|uint16(head[1]))%31 == 0 {
		return zlib.NewReader(br)
	}
	return flate.NewReader(br), nil
}

// isTimeout is a net.Error timeout.
func isTimeout(err error) bool {
	var ne net.Error
	return errors.As(err, &ne) && ne.Timeout()
}
