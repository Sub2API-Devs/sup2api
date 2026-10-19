package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/requestfailure"
)

func errorWire(t *testing.T, f *requestErrorFrame) []byte {
	t.Helper()
	raw, err := json.Marshal(f)
	if err != nil {
		t.Fatal(err)
	}
	return append(append([]byte(requestErrorPrefix), raw...), '\n')
}

func TestRequestErrorReaderFramingAndBounds(t *testing.T) {
	f := localRequestError(504, "timeout_error", "cli_timeout", "timeout")
	wire := errorWire(t, f)
	for split := 0; split <= len(wire); split++ {
		var p requestErrorReader
		_, _ = p.Write([]byte("native warning with secret\n"))
		_, _ = p.Write(wire[:split])
		_, _ = p.Write(wire[split:])
		if got := p.result(); got == nil || got.Status != 504 || got.Error.Code != "cli_timeout" {
			t.Fatalf("split %d: %+v", split, got)
		}
	}
	for _, raw := range [][]byte{wire[:len(wire)-1], append(bytes.Clone(wire), wire...), []byte(requestErrorPrefix + "{}\n"), []byte(requestErrorPrefix + strings.Repeat("x", maxRequestErrorLine) + "\n")} {
		var p requestErrorReader
		_, _ = p.Write(raw)
		if p.result() != nil || len(p.line) > maxRequestErrorLine {
			t.Fatal("invalid frame accepted")
		}
	}
	var p requestErrorReader
	_, _ = p.Write([]byte(strings.Repeat("x", 2*maxRequestErrorLine) + "\n"))
	_, _ = p.Write(wire)
	if p.result() == nil {
		t.Fatal("ordinary oversized diagnostic poisoned valid frame")
	}
}

func TestRequestErrorHTTPResponseAndLogStatus(t *testing.T) {
	for _, status := range []int{400, 401, 403, 429, 500, 529} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			body := `{ "type":"error","error":{"type":"fixture","code":"provider_code","message":"original"} }`
			f := localRequestError(status, "fixture", "provider_code", "original")
			f.Source = "http"
			f.Body = body
			f.Headers = map[string]string{"retry-after": "7", "x-should-retry": "true", "authorization": "private", "set-cookie": "private", "content-length": "999"}
			f.Headers[requestfailure.SourceHeader] = "transport"
			out := httptest.NewRecorder()
			out.Header().Set(requestfailure.SourceHeader, "internal")
			r := httptest.NewRequest("POST", "/v1/messages", nil)
			d := newRequestDiagnostic(out, r)
			w := d.capture(out, r, t.TempDir())
			f.record(d, false)
			f.write(w)
			d.finish()
			if out.Code != status || out.Body.String() != body || out.Header().Get("Retry-After") != "7" || out.Header().Get("X-Should-Retry") != "true" {
				t.Fatal(out.Code, out.Header(), out.Body.String())
			}
			if requestfailure.Source(out.Header()) != "http" {
				t.Fatal("provider spoofed error source", out.Header())
			}
			for _, h := range []string{"Authorization", "Set-Cookie", "Content-Length"} {
				if out.Header().Get(h) != "" {
					t.Fatal("unsafe header", h)
				}
			}
			if d.status != status || d.fields["http_status"] != status || d.fields["status"] != status {
				t.Fatal("log disagrees with wire", d.fields)
			}
		})
	}
}

func TestLocalRequestErrorPreservesCLIMessageAndSource(t *testing.T) {
	for _, source := range []string{"input", "transport", "timeout", "interrupted", "internal"} {
		f := localRequestError(502, "api_error", "ECONNRESET", "read ECONNRESET")
		f.Source = source
		out := httptest.NewRecorder()
		f.write(out)
		var response struct {
			Error requestErrorDetail `json:"error"`
		}
		if err := json.Unmarshal(out.Body.Bytes(), &response); err != nil {
			t.Fatal(err)
		}
		if out.Code != 502 || requestfailure.Source(out.Header()) != source || response.Error != f.Error {
			t.Fatal(out.Code, out.Header(), out.Body.String())
		}
	}
}

func TestLocalRequestErrorMessageIsNotRewritten(t *testing.T) {
	for _, message := range []string{"", `{"password":"prefix\"SYNTHETIC_SECRET"}`, "original\n" + strings.Repeat("原文", 9000)} {
		f := localRequestError(502, "api_error", "ECONNRESET", message)
		f.Source = "transport"
		var reader requestErrorReader
		_, _ = reader.Write(errorWire(t, f))
		parsed := reader.result()
		if parsed == nil {
			t.Fatal("native message rejected")
		}
		out := httptest.NewRecorder()
		parsed.write(out)
		var response struct {
			Error requestErrorDetail `json:"error"`
		}
		if err := json.Unmarshal(out.Body.Bytes(), &response); err != nil {
			t.Fatal(err)
		}
		if response.Error.Message != message {
			t.Fatal("native message changed")
		}
	}
}

func TestRequestDiagnosticTracksStatusWithoutExplicitFail(t *testing.T) {
	out := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(out, r)
	w := d.capture(out, r, t.TempDir())
	w.WriteHeader(429)
	_, _ = w.Write([]byte(`{"error":"upstream"}`))
	d.finish()
	if d.status != 429 || d.fields["status"] != 429 {
		t.Fatal(d.fields)
	}
}

func TestRequestCommandStructuredStderrThroughProcess(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Linux executable fixture")
	}
	for _, mode := range []string{"build", "direct"} {
		t.Run(mode, func(t *testing.T) {
			root := t.TempDir()
			cli := filepath.Join(root, "claude")
			f := localRequestError(429, "rate_limit_error", "upstream_limit", "original")
			f.Source = "http"
			f.Headers = map[string]string{"retry-after": "7"}
			f.Body = `{"error":{"code":"upstream_limit","message":"original"}}`
			wire := string(errorWire(t, f))
			script := "#!/bin/sh\ncat >/dev/null\nprintf '%s\\n' 'ordinary diagnostic with credentials' >&2\nprintf '%s' '" + wire + "' >&2\nexit 2\n"
			if err := os.WriteFile(cli, []byte(script), 0700); err != nil {
				t.Fatal(err)
			}
			g := &Gateway{RequestMode: mode, Key: "gateway", Runner: &Runner{CLI: cli, Work: root}, Slots: make(chan struct{}, 1), Timeout: time.Second, RequestLogDir: filepath.Join(root, "logs")}
			r := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"m","messages":[{"role":"user","content":"hi"}]}`))
			r.Header.Set("X-Api-Key", "gateway")
			w := httptest.NewRecorder()
			g.ServeHTTP(w, r)
			if w.Code != 429 || w.Header().Get("Retry-After") != "7" || !strings.Contains(w.Body.String(), `"code":"upstream_limit"`) || strings.Contains(w.Body.String(), "credentials") {
				t.Fatal(w.Code, w.Body.String())
			}
		})
	}
}

func TestRequestCommandMidStreamFailureAbortsHTTP(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Linux executable fixture")
	}
	root := t.TempDir()
	cli := filepath.Join(root, "claude")
	wire := string(errorWire(t, localRequestError(502, "api_error", "ECONNRESET", "stream failed")))
	script := `#!/bin/sh
while [ "$#" -gt 0 ]; do
 if [ "$1" = "--response-meta" ]; then shift; meta="$1"; fi
 shift
done
cat >/dev/null
printf '%s' '{"status":200,"headers":{"content-type":"text/event-stream"}}' > "$meta"
printf 'event: message_start\ndata: {}\n\n'
` + "printf '%s' '" + wire + "' >&2\nexit 1\n"
	if err := os.WriteFile(cli, []byte(script), 0700); err != nil {
		t.Fatal(err)
	}
	g := &Gateway{RequestMode: "direct", Key: "gateway", Runner: &Runner{CLI: cli, Work: root}, Slots: make(chan struct{}, 1), Timeout: time.Second}
	s := httptest.NewServer(g)
	defer s.Close()
	r, _ := http.NewRequest("POST", s.URL+"/v1/messages", strings.NewReader(`{"model":"m"}`))
	r.Header.Set("X-Api-Key", "gateway")
	res, err := s.Client().Do(r)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if res.StatusCode != 200 || err == nil || strings.Contains(string(body), "message_stop") || strings.Contains(string(body), "stream failed") {
		t.Fatal(res.StatusCode, string(body), err)
	}
}
