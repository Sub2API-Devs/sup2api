package engine

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
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
	Protocol  string             `json:"protocol"`
	Source    string             `json:"source"`
	Status    int                `json:"status"`
	Error     requestErrorDetail `json:"error"`
	Headers   map[string]string  `json:"headers,omitempty"`
	Body      string             `json:"body,omitempty"`
	Truncated bool               `json:"truncated,omitempty"`
}

// Drain stderr continuously without blocking the child or retaining native
// diagnostics. Only one complete, bounded protocol line can become a response.
type requestErrorReader struct {
	line     []byte
	dropping bool
	invalid  bool
	frame    *requestErrorFrame
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
	switch f.Source {
	case "http", "input", "transport", "timeout", "interrupted", "internal":
	default:
		return false
	}
	return f.Error.Type != "" && len(f.Error.Type) <= 512 && f.Error.Code != "" && len(f.Error.Code) <= 512 && f.Error.Message != "" && len(f.Error.Message) <= 8192
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
	h := http.Header{}
	for k, v := range f.Headers {
		if len(v) <= 1024 && !strings.ContainsAny(k+v, "\r\n\x00") {
			h.Set(k, v)
		}
	}
	httpfacts.Apply(w.Header(), h)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(f.Status)
	// Preserve complete upstream JSON errors, including provider-specific fields.
	if f.Source == "http" && !f.Truncated && json.Valid([]byte(f.Body)) {
		_, _ = w.Write([]byte(f.Body))
		return
	}
	_ = json.NewEncoder(w).Encode(struct {
		Type  string             `json:"type"`
		Error requestErrorDetail `json:"error"`
	}{Type: "error", Error: f.Error})
}

func localRequestError(status int, kind, code, message string) *requestErrorFrame {
	return &requestErrorFrame{Protocol: requestErrorProtocol, Source: "internal", Status: status, Error: requestErrorDetail{Type: kind, Code: code, Message: message}}
}
