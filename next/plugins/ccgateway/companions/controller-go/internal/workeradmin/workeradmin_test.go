package workeradmin

import (
	"context"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"testing"
	"time"

	"ccgateway/controller/internal/store"
)

func client(t *testing.T, h http.HandlerFunc) (*Client, *store.AccountState) {
	t.Helper()
	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)
	u, _ := url.Parse(srv.URL)
	port, _ := strconv.Atoi(u.Port())
	st := store.NewAccountState("api", "admin-secret", "10.1.2.3", "10.1.2.2", "t")
	return &Client{Port: port, HostOverride: "127.0.0.1"}, st
}

// covers: T11 (exactly the admin key and the content type; nothing of the caller)
func TestHeadersAreExactlyTheAdminOnes(t *testing.T) {
	var got http.Header
	var host, path, method string
	var body []byte
	c, st := client(t, func(w http.ResponseWriter, r *http.Request) {
		got, host, path, method = r.Header.Clone(), r.Host, r.URL.Path, r.Method
		body, _ = io.ReadAll(r.Body)
		w.WriteHeader(200)
	})
	resp, err := c.Do(context.Background(), st, http.MethodPost, "admin/auth/start", []byte(`{"x":1}`), PassThrough)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	var keys []string
	for k := range got {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	if strings.Join(keys, ",") != "Accept-Encoding,Authorization,Connection,Content-Length,Content-Type" {
		t.Fatalf("headers sent: %v", got)
	}
	if got.Get("Authorization") != "Bearer admin-secret" || got.Get("Content-Type") != "application/json" ||
		got.Get("Accept-Encoding") != "identity" || got.Get("User-Agent") != "" {
		t.Fatal(got)
	}
	if path != "/admin/auth/start" || method != "POST" || string(body) != `{"x":1}` || !strings.HasPrefix(host, "127.0.0.1:") {
		t.Fatal(path, method, string(body), host)
	}
	resp, err = c.Do(context.Background(), st, http.MethodPut, "admin/cli", nil, PassThrough)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if got.Get("Content-Length") != "0" || got.Get("Content-Type") != "application/json" {
		t.Fatal("an empty PUT sends Content-Length: 0 and the JSON type", got)
	}
	resp, _ = c.Do(context.Background(), st, http.MethodGet, "admin/status", nil, PassThrough)
	resp.Body.Close()
	if got.Get("Content-Type") != "application/json" || got.Get("Content-Length") != "" {
		t.Fatal("GET also sends the JSON type", got)
	}
	if New().URL(st, "admin/status") != "http://10.1.2.3:8787/admin/status" {
		t.Fatal(New().URL(st, "admin/status"))
	}
}

// covers: T11 T12 (no redirects, no transparent decompression)
func TestNoRedirectNoDecompression(t *testing.T) {
	c, st := client(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/admin/usage" {
			http.Redirect(w, r, "/elsewhere", http.StatusFound)
			return
		}
		w.Header().Set("Content-Encoding", "gzip")
		w.Write([]byte("raw"))
	})
	resp, err := c.Do(context.Background(), st, http.MethodGet, "admin/usage", nil, PassThrough)
	if err != nil || resp.StatusCode != http.StatusFound {
		t.Fatal(resp, err)
	}
	resp.Body.Close()
	resp, _ = c.Do(context.Background(), st, http.MethodGet, "admin/status", nil, PassThrough)
	b, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if string(b) != "raw" || resp.Header.Get("Content-Encoding") != "gzip" {
		t.Fatal("bytes are passed as received")
	}
}

// covers: T11 B3 (connect 5 s / idle read deadlines)
func TestTimeouts(t *testing.T) {
	hold := make(chan struct{})
	c, st := client(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		w.Write([]byte("a"))
		w.(http.Flusher).Flush()
		<-hold
	})
	defer close(hold)
	resp, err := c.Do(context.Background(), st, http.MethodGet, "admin/status", nil, Timeouts{Connect: time.Second, Idle: 80 * time.Millisecond})
	if err != nil {
		t.Fatal(err)
	}
	start := time.Now()
	_, err = io.ReadAll(resp.Body)
	resp.Body.Close()
	if err == nil || time.Since(start) > 3*time.Second {
		t.Fatal("an idle body times out:", err)
	}
	dead := &Client{Port: 1, HostOverride: "127.0.0.1", Dial: func(ctx context.Context, n, a string) (net.Conn, error) {
		<-ctx.Done()
		return nil, ctx.Err()
	}}
	start = time.Now()
	if _, err := dead.Do(context.Background(), st, http.MethodGet, "x", nil, Timeouts{Connect: 50 * time.Millisecond, Idle: time.Second}); err == nil {
		t.Fatal("connect timeout")
	}
	if time.Since(start) > 2*time.Second {
		t.Fatal("connect timeout too slow")
	}
}

// covers: PV7 (environment applied in place: only an exact echo counts)
func TestPutEnvironment(t *testing.T) {
	answer, status := `{"locale": "ja_JP.UTF-8", "timezone": "Asia/Tokyo", "extra": 1}`, 200
	var body string
	c, st := client(t, func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		body = string(b)
		if r.Method != http.MethodPut || r.URL.Path != "/admin/environment" {
			w.WriteHeader(404)
			return
		}
		w.WriteHeader(status)
		io.WriteString(w, answer)
	})
	env := store.Environment{Locale: "ja_JP.UTF-8", Timezone: "Asia/Tokyo"}
	if !c.PutEnvironment(context.Background(), st, env) || body != `{"locale": "ja_JP.UTF-8", "timezone": "Asia/Tokyo"}` {
		t.Fatal(body)
	}
	for _, a := range []struct {
		body   string
		status int
	}{{`{"locale": "C", "timezone": "Asia/Tokyo"}`, 200}, {`[]`, 200}, {`not json`, 200}, {answer, 405}} {
		answer, status = a.body, a.status
		if c.PutEnvironment(context.Background(), st, env) {
			t.Errorf("%s %d accepted", a.body, a.status)
		}
	}
}

// covers: P11 P3 BUG-7 (maintenance: 409 busy, non-200 unsupported, acknowledgement checked)
func TestMaintenance(t *testing.T) {
	answer, status := `{"active_requests": 0, "lease": "`+strings.Repeat("a", 48)+`"}`, 200
	var body string
	c, st := client(t, func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		body = string(b)
		w.WriteHeader(status)
		io.WriteString(w, answer)
	})
	ack, err := c.Maintenance(context.Background(), st, "pause", "")
	if err != nil || ack == nil || body != `{"action": "pause"}` {
		t.Fatal(ack, err, body)
	}
	if lease, _ := ack.Get("lease"); lease != strings.Repeat("a", 48) {
		t.Fatal(lease)
	}
	if _, err := c.Maintenance(context.Background(), st, "validate", "abc"); err != nil || body != `{"action": "validate", "lease": "abc"}` {
		t.Fatal(body)
	}
	status = 409
	if ack, err := c.Maintenance(context.Background(), st, "pause", ""); ack != nil || err != nil {
		t.Fatal("409 is busy")
	}
	status = 404
	if _, err := c.Maintenance(context.Background(), st, "pause", ""); err != ErrNoMaintenance {
		t.Fatal(err)
	}
	status, answer = 200, strings.Repeat(" ", 5000)
	if _, err := c.Maintenance(context.Background(), st, "pause", ""); err != ErrNoMaintenance {
		t.Fatal("oversized answer:", err)
	}
	for _, a := range []string{`{"active_requests": 1}`, `[]`, `{}`} {
		answer = a
		if _, err := c.Maintenance(context.Background(), st, "pause", ""); err != ErrInvalidAck {
			t.Errorf("%s: %v", a, err)
		}
	}
	answer = `{"active_requests": 0}`
	if !c.Resume(context.Background(), st, "x") {
		t.Fatal("resume acknowledged")
	}
	status = 500
	if c.Resume(context.Background(), st, "x") {
		t.Fatal("resume never fails, but reports false")
	}
}
