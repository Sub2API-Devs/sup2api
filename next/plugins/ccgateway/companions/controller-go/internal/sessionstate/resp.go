package sessionstate

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
)

// The controller speaks the few RESP2 commands it needs itself (AUTH, ACL
// SETUSER/DELUSER/LIST, INFO): the module has no third-party dependency, and
// a full client would bring a connection pool, retries and RESP3 for what is
// a handful of commands every ten seconds.

// maxReply bounds every bulk string and array a server may send (ACL LIST of
// a few hundred users, INFO): a confused peer cannot make the controller
// allocate without limit.
const (
	maxBulk  = 4 << 20
	maxArray = 1 << 16
	maxLine  = 64 << 10
)

// ServerError is an error reply ("-ERR ...", "-NOPERM ...", "-WRONGPASS ...").
type ServerError struct{ Msg string }

func (e *ServerError) Error() string { return "valkey: " + e.Msg }

// Code is the first word of the error ("ERR", "NOPERM", "WRONGPASS").
func (e *ServerError) Code() string {
	code, _, _ := strings.Cut(e.Msg, " ")
	return code
}

// IsServerError reports a reply error with code ("" = any).
func IsServerError(err error, code string) bool {
	var e *ServerError
	return errors.As(err, &e) && (code == "" || e.Code() == code)
}

var errProtocol = errors.New("valkey: protocol error")

// writeCommand encodes argv as a RESP array of bulk strings.
func writeCommand(w *bufio.Writer, argv []string) error {
	fmt.Fprintf(w, "*%d\r\n", len(argv))
	for _, a := range argv {
		fmt.Fprintf(w, "$%d\r\n", len(a))
		w.WriteString(a)
		w.WriteString("\r\n")
	}
	return w.Flush()
}

func readLine(r *bufio.Reader) (string, error) {
	var b []byte
	for {
		chunk, isPrefix, err := r.ReadLine()
		if err != nil {
			if err == io.EOF {
				err = io.ErrUnexpectedEOF
			}
			return "", err
		}
		b = append(b, chunk...)
		if len(b) > maxLine {
			return "", errProtocol
		}
		if !isPrefix {
			return string(b), nil
		}
	}
}

// readReply decodes one reply: string (simple or bulk), int64, []any, nil
// (null bulk or array) or *ServerError (returned as the error).
func readReply(r *bufio.Reader, depth int) (any, error) {
	if depth > 4 {
		return nil, errProtocol
	}
	line, err := readLine(r)
	if err != nil {
		return nil, err
	}
	if line == "" {
		return nil, errProtocol
	}
	body := line[1:]
	switch line[0] {
	case '+':
		return body, nil
	case '-':
		return nil, &ServerError{Msg: body}
	case ':':
		n, err := strconv.ParseInt(body, 10, 64)
		if err != nil {
			return nil, errProtocol
		}
		return n, nil
	case '$':
		n, err := strconv.Atoi(body)
		if err != nil || n < -1 || n > maxBulk {
			return nil, errProtocol
		}
		if n == -1 {
			return nil, nil
		}
		buf := make([]byte, n+2)
		if _, err := io.ReadFull(r, buf); err != nil {
			return nil, err
		}
		if buf[n] != '\r' || buf[n+1] != '\n' {
			return nil, errProtocol
		}
		return string(buf[:n]), nil
	case '*':
		n, err := strconv.Atoi(body)
		if err != nil || n < -1 || n > maxArray {
			return nil, errProtocol
		}
		if n == -1 {
			return nil, nil
		}
		out := make([]any, 0, n)
		var firstErr error
		for i := 0; i < n; i++ {
			v, err := readReply(r, depth+1)
			if err != nil {
				if !IsServerError(err, "") {
					return nil, err
				}
				if firstErr == nil {
					firstErr = err
				}
				continue
			}
			out = append(out, v)
		}
		if firstErr != nil {
			return nil, firstErr
		}
		return out, nil
	}
	return nil, errProtocol
}
