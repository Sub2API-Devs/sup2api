package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/tidwall/gjson"
)

// Client is a thin JSON client for the console API (/api/v1) and the
// gateway. It carries an optional bearer token and step-up token.
type Client struct {
	Base   string
	HTTP   *http.Client
	Token  string
	stepUp string
	stepAt time.Time
}

// NewClient returns an anonymous client for base.
func NewClient(base string) *Client {
	return &Client{Base: strings.TrimRight(base, "/"), HTTP: &http.Client{Timeout: 60 * time.Second}}
}

// Resp is a completed HTTP exchange.
type Resp struct {
	Method string
	Path   string
	Status int
	Header http.Header
	Body   []byte
}

// JSON parses the whole body.
func (r *Resp) JSON() gjson.Result { return gjson.ParseBytes(r.Body) }

// Data returns the "data" member of the envelope.
func (r *Resp) Data() gjson.Result { return gjson.GetBytes(r.Body, "data") }

// ErrCode returns error.code of a console error response.
func (r *Resp) ErrCode() string { return gjson.GetBytes(r.Body, "error.code").String() }

func (r *Resp) String() string {
	b := string(r.Body)
	if len(b) > 800 {
		b = b[:800] + "..."
	}
	return fmt.Sprintf("%s %s -> %d %s", r.Method, r.Path, r.Status, b)
}

// ReqOpt customises a request.
type ReqOpt func(*http.Request)

// Header sets a request header.
func Header(k, v string) ReqOpt { return func(r *http.Request) { r.Header.Set(k, v) } }

// Query adds query parameters.
func Query(kv ...string) ReqOpt {
	return func(r *http.Request) {
		q := r.URL.Query()
		for i := 0; i+1 < len(kv); i += 2 {
			q.Set(kv[i], kv[i+1])
		}
		r.URL.RawQuery = q.Encode()
	}
}

// Do performs a request. body may be nil, []byte, io.Reader or any JSON value.
// path is relative to Base; "/api/v1" is NOT added automatically.
func (c *Client) Do(t testing.TB, method, path string, body any, opts ...ReqOpt) *Resp {
	t.Helper()
	var rd io.Reader
	ctype := ""
	switch b := body.(type) {
	case nil:
	case []byte:
		rd = bytes.NewReader(b)
	case io.Reader:
		rd = b
	default:
		raw, err := json.Marshal(b)
		if err != nil {
			t.Fatalf("marshal %s %s: %v", method, path, err)
		}
		rd = bytes.NewReader(raw)
		ctype = "application/json"
	}
	req, err := http.NewRequest(method, c.Base+path, rd)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	if ctype != "" {
		req.Header.Set("Content-Type", ctype)
	}
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}
	for _, o := range opts {
		o(req)
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("%s %s: read body: %v", method, path, err)
	}
	return &Resp{Method: method, Path: req.URL.RequestURI(), Status: resp.StatusCode, Header: resp.Header, Body: raw}
}

// API performs a console request against /api/v1 + path.
func (c *Client) API(t testing.TB, method, path string, body any, opts ...ReqOpt) *Resp {
	t.Helper()
	return c.Do(t, method, "/api/v1"+path, body, opts...)
}

// OK performs a console request, requires a 2xx status and returns "data".
func (c *Client) OK(t testing.TB, method, path string, body any, opts ...ReqOpt) gjson.Result {
	t.Helper()
	r := c.API(t, method, path, body, opts...)
	if r.Status < 200 || r.Status > 299 {
		t.Fatalf("expected 2xx: %s", r)
	}
	return r.Data()
}

// Expect performs a console request and requires the given status (and, when
// code != "", the error code).
func (c *Client) Expect(t testing.TB, status int, code, method, path string, body any, opts ...ReqOpt) *Resp {
	t.Helper()
	r := c.API(t, method, path, body, opts...)
	if r.Status != status {
		t.Fatalf("expected HTTP %d: %s", status, r)
	}
	if code != "" && r.ErrCode() != code {
		t.Fatalf("expected error code %q: %s", code, r)
	}
	return r
}

// Upload posts a multipart form with a single file field.
func (c *Client) Upload(t testing.TB, path, field, filename string, data []byte, opts ...ReqOpt) *Resp {
	t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, err := mw.CreateFormFile(field, filename)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = fw.Write(data)
	_ = mw.Close()
	opts = append([]ReqOpt{Header("Content-Type", mw.FormDataContentType())}, opts...)
	return c.API(t, http.MethodPost, path, buf.Bytes(), opts...)
}

// ListAll fetches every page of a list endpoint (page_size 200).
func (c *Client) ListAll(t testing.TB, path string, kv ...string) []gjson.Result {
	t.Helper()
	var out []gjson.Result
	for page := 1; ; page++ {
		q := append([]string{"page", fmt.Sprint(page), "page_size", "200"}, kv...)
		r := c.API(t, http.MethodGet, path, nil, Query(q...))
		if r.Status != 200 {
			t.Fatalf("list: %s", r)
		}
		items := r.Data().Array()
		out = append(out, items...)
		total := r.JSON().Get("page.total")
		if !total.Exists() || len(items) == 0 || int64(len(out)) >= total.Int() {
			return out
		}
	}
}

// Find returns the first element whose field equals value.
func Find(items []gjson.Result, field string, value any) (gjson.Result, bool) {
	want := fmt.Sprint(value)
	for _, it := range items {
		if it.Get(field).String() == want {
			return it, true
		}
	}
	return gjson.Result{}, false
}

// PathEscape escapes one path segment.
func PathEscape(s string) string { return url.PathEscape(s) }
