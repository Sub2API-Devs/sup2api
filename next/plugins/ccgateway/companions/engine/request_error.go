package engine

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/requestfailure"
)

const requestErrorPrefix = "CCG_REQUEST_ERROR "
const requestErrorProtocol = "ccgateway.request.error.v1"
const maxRequestErrorLine = 512 << 10

type requestErrorDetail struct {
	Type    string `json:"type"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

type requestErrorFrame struct {
	Protocol   string             `json:"protocol"`
	Source     string             `json:"source"`
	Status     int                `json:"status"`
	Error      requestErrorDetail `json:"error"`
	Headers    map[string]string  `json:"headers,omitempty"`
	Body       string             `json:"body,omitempty"`
	Truncated  bool               `json:"truncated,omitempty"`
	BodyFile   bool               `json:"bodyFile,omitempty"`
	BodyBytes  int64              `json:"bodyBytes,omitempty"`
	BodyBase64 *string            `json:"bodyBase64,omitempty"`
	bodyReader io.Reader
}

// Drain stderr continuously without blocking the child or retaining native
// diagnostics. Only one complete, bounded protocol line can become a response.
type requestErrorReader struct {
	line            []byte
	dropping        bool
	invalid         bool
	frame           *requestErrorFrame
	diagnostic      *requestDiagnostic
	diagnosticCount int
}

func (p *requestErrorReader) Write(data []byte) (int, error) {
	total := len(data)
	for len(data) > 0 {
		i := bytes.IndexByte(data, '\n')
		part := data
		if i >= 0 {
			part = data[:i]
		}
		if !p.dropping {
			if len(p.line)+len(part) > maxRequestErrorLine {
				if bytes.HasPrefix(p.line, []byte(requestErrorPrefix)) || len(p.line) == 0 && bytes.HasPrefix(part, []byte(requestErrorPrefix)) {
					p.invalid = true
				}
				p.line = nil
				p.dropping = true
			} else {
				p.line = append(p.line, part...)
			}
		}
		if i < 0 {
			break
		}
		if !p.dropping {
			p.accept(p.line)
		}
		p.line = p.line[:0]
		p.dropping = false
		data = data[i+1:]
	}
	return total, nil
}

func (p *requestErrorReader) accept(line []byte) {
	if bytes.HasPrefix(line, []byte(requestContentDiagnosticPrefix)) {
		p.acceptContentDiagnostic(line[len(requestContentDiagnosticPrefix):])
		return
	}
	if !bytes.HasPrefix(line, []byte(requestErrorPrefix)) {
		return
	}
	var f requestErrorFrame
	if p.frame != nil || json.Unmarshal(line[len(requestErrorPrefix):], &f) != nil || !f.valid() {
		p.invalid = true
		return
	}
	p.frame = &f
}

func (p *requestErrorReader) result() *requestErrorFrame {
	if p.invalid || len(p.line) > 0 && bytes.HasPrefix(p.line, []byte(requestErrorPrefix)) {
		return nil
	}
	return p.frame
}

func (f *requestErrorFrame) valid() bool {
	if f.Protocol != requestErrorProtocol || f.Status < 400 || f.Status > 599 || len(f.Body) > 64<<10 || len(f.Headers) > 32 {
		return false
	}
	// Only an upstream HTTP answer carries its body in a file or in base64,
	// and its body is never truncated.
	upstream := f.Source == requestfailure.SourceHTTP
	if f.BodyBytes < 0 || upstream && f.Truncated || f.BodyFile && (!upstream || f.Body != "" || f.BodyBase64 != nil) {
		return false
	}
	if f.BodyBase64 != nil && (!upstream || f.Body != "" || f.BodyFile) {
		return false
	}
	if !requestfailure.CLISource(f.Source) {
		return false
	}
	// The reader already bounds the entire protocol frame. Do not replace a
	// native message merely because it is empty or exceeds the old 8 KiB cap.
	return f.Error.Type != "" && len(f.Error.Type) <= 512 && f.Error.Code != "" && len(f.Error.Code) <= 512
}

// The CLI only chooses a marker, never a filesystem path. The Worker opens
// its own request-local sidecar after the CLI exits and verifies completion.
func (f *requestErrorFrame) openBody(meta string) (io.Closer, error) {
	if f.Source != requestfailure.SourceHTTP {
		return nil, nil
	}
	if f.BodyFile {
		path := meta + ".error-body"
		info, err := os.Lstat(path)
		if err != nil || !info.Mode().IsRegular() || info.Size() != f.BodyBytes {
			return nil, errors.New("invalid CLI HTTP error body file")
		}
		file, err := os.Open(path)
		if err != nil {
			return nil, err
		}
		f.bodyReader = file
		return file, nil
	}
	if f.BodyBase64 != nil {
		body, err := base64.StdEncoding.Strict().DecodeString(*f.BodyBase64)
		if err != nil || int64(len(body)) != f.BodyBytes {
			return nil, errors.New("invalid CLI HTTP error body encoding")
		}
		f.bodyReader = bytes.NewReader(body)
	}
	return nil, nil
}

func (f *requestErrorFrame) record(d *requestDiagnostic, committed bool) {
	if !committed {
		d.fail(f.Status, f.Error.Type, f.Error.Message)
	} else {
		d.setField("error_type", f.Error.Type)
		d.setField("error", logValue(f.Error.Message))
		d.setField("response_interrupted", true)
	}
	d.setField("error_code", f.Error.Code)
	d.setField("error_source", f.Source)
	d.trace("cli_error", Object{"status": f.Status, "code": f.Error.Code, "source": f.Source, "response_started": committed, "truncated": f.Truncated})
}

func (f *requestErrorFrame) write(w http.ResponseWriter) {
	// The CLI frame sets the source; provider headers cannot spoof it.
	w.Header().Set(requestfailure.SourceHeader, f.Source)
	h := http.Header{}
	for k, v := range f.Headers {
		if len(v) <= 1024 && !strings.ContainsAny(k+v, "\r\n\x00") {
			h.Set(k, v)
		}
	}
	httpfacts.Apply(w.Header(), h)
	if f.Source == requestfailure.SourceHTTP {
		if ct := h.Get("Content-Type"); ct != "" {
			w.Header().Set("Content-Type", ct)
		} else {
			w.Header()["Content-Type"] = nil
		}
		w.WriteHeader(f.Status)
		body := f.bodyReader
		if body == nil {
			body = strings.NewReader(f.Body)
		}
		if _, err := io.Copy(w, body); err != nil {
			panic(http.ErrAbortHandler)
		}
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(f.Status)
	_ = json.NewEncoder(w).Encode(struct {
		Type  string             `json:"type"`
		Error requestErrorDetail `json:"error"`
	}{Type: "error", Error: f.Error})
}

func localRequestError(status int, kind, code, message string) *requestErrorFrame {
	return &requestErrorFrame{Protocol: requestErrorProtocol, Source: requestfailure.SourceInternal, Status: status, Error: requestErrorDetail{Type: kind, Code: code, Message: message}}
}
