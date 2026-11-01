package api

import (
	"bytes"
	"compress/gzip"
	"compress/zlib"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"testing"
	"time"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/store"
)

// passHarness is a controller whose ready_state answers st at testRev
// (nil otherwise) and whose Worker client reaches ws.
func passHarness(t *testing.T, st *store.AccountState, handler func(w http.ResponseWriter, r *http.Request)) (*harness, *workerServer) {
	t.Helper()
	if handler == nil {
		handler = func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			io.WriteString(w, `{"session":null}`)
		}
	}
	ws := newWorker(t, handler)
	h := newHarness(t, func(o *Options) { o.Worker = client(ws.port()) })
	h.core.on("ready_state", func(args []any) (any, error) {
		if args[1] == testRev {
			return st, nil
		}
		return nil, nil
	})
	return h, ws
}

// covers: T9, T10, T11 (HandlerTests.test_session_pass_through)
func TestSessionPassThrough(t *testing.T) {
	h, ws := passHarness(t, readyState(t, ""), nil)
	path := "/accounts/" + draft + "/admin/auth/session"
	s, b := h.call("GET", path, "")
	want(t, s, b, 409, errBody("not_synchronized"))
	s, b = h.call("GET", path, "", rev())
	want(t, s, b, 200, `{"session":null}`)
	seen := ws.requests()
	last := seen[len(seen)-1]
	if last.Method != "GET" || last.Path != "/admin/auth/session" || last.Header.Get("Authorization") != "Bearer admin-key-abcdef" {
		t.Fatal(last)
	}
	if args := h.core.last("ready_state"); args[0] != draft || args[1] != testRev {
		t.Fatal(args)
	}
	s, _ = h.call("POST", "/accounts/"+draft+"/admin/auth/cancel", "{}", rev())
	if s != 200 || ws.requests()[len(ws.requests())-1].Path != "/admin/auth/cancel" {
		t.Fatal(s)
	}
	s, _ = h.call("POST", "/accounts/"+draft+"/admin/auth/refresh", "", rev())
	last = ws.requests()[len(ws.requests())-1]
	if s != 200 || last.Method != "POST" || last.Path != "/admin/auth/refresh" || last.Header.Get("Content-Length") != "0" {
		t.Fatal(s, last)
	}
	s, b = h.call("DELETE", path, "", rev())
	want(t, s, b, 405, errBody("method_not_allowed"))
}

// covers: T9 (HandlerTests.test_request_logs_pass_through)
func TestRequestLogsPassThrough(t *testing.T) {
	h, ws := passHarness(t, readyState(t, "api_key"), nil)
	path := "/accounts/7/admin/request-logs"
	if s, _ := h.call("GET", path, ""); s != 409 {
		t.Fatal(s)
	}
	for _, method := range []string{"GET", "PUT"} {
		if s, _ := h.call(method, path, `{"enabled":false}`, rev()); s != 200 {
			t.Fatal(method, s)
		}
		last := ws.requests()[len(ws.requests())-1]
		if last.Method != method || last.Path != "/admin/request-logs" || string(last.Body) != `{"enabled":false}` ||
			last.Header.Get("Authorization") != "Bearer admin-key-abcdef" {
			t.Fatal(last)
		}
	}
	calls := len(ws.requests())
	if s, _ := h.call("POST", path, "{}", rev()); s != 405 {
		t.Fatal(s)
	}
	if s, _ := h.call("PUT", "/accounts/7/admin/status", "{}", rev()); s != 405 {
		t.Fatal(s)
	}
	if len(ws.requests()) != calls {
		t.Fatal("a refused method reached the Worker")
	}
	for _, action := range []string{"query", "detail", "read"} {
		if s, _ := h.call("POST", path+"/"+action, "{}", rev()); s != 200 {
			t.Fatal(action, s)
		}
		if last := ws.requests()[len(ws.requests())-1]; last.Method != "POST" || last.Path != "/admin/request-logs/"+action {
			t.Fatal(last)
		}
		calls = len(ws.requests())
		for _, method := range []string{"GET", "PUT", "DELETE"} {
			if s, _ := h.call(method, path+"/"+action, "{}", rev()); s != 405 {
				t.Fatal(method, action, s)
			}
		}
		if len(ws.requests()) != calls {
			t.Fatal("a refused method reached the Worker")
		}
	}
	for _, other := range []string{path + "/query?limit=1", path + "/files", path + "/read/x"} {
		if s, _ := h.call("POST", other, "{}", rev()); s != 404 {
			t.Fatal(other, s)
		}
	}
}

// covers: T12 (HandlerTests.test_request_log_read_reports_its_range)
func TestRequestLogReadReportsItsRange(t *testing.T) {
	h, _ := passHarness(t, readyState(t, "api_key"), func(w http.ResponseWriter, r *http.Request) {
		for k, v := range map[string]string{"Content-Type": "application/octet-stream", "X-Log-File-Size": "9",
			"X-Log-Offset": "2", "X-Log-Length": "3", "X-Content-Type-Options": "nosniff", "X-Other": "dropped"} {
			w.Header().Set(k, v)
		}
		io.WriteString(w, "abc")
	})
	res := h.do("POST", "/accounts/7/admin/request-logs/read", "{}", rev())
	if res.Status != 200 || string(res.Body) != "abc" {
		t.Fatal(res.Status, string(res.Body))
	}
	var got []string
	for _, name := range []string{"X-Log-File-Size", "X-Log-Offset", "X-Log-Length", "X-Content-Type-Options", "X-Other"} {
		v, _ := res.get(name)
		got = append(got, v)
	}
	if strings.Join(got, ",") != "9,2,3,nosniff," {
		t.Fatal(got)
	}
	if ct, _ := res.get("Content-Type"); ct != "application/octet-stream" {
		t.Fatal(ct)
	}
}

// covers: T9 (HandlerTests.test_features_read_only_pass_through)
func TestFeaturesReadOnlyPassThrough(t *testing.T) {
	h, ws := passHarness(t, readyState(t, "api_key"), nil)
	path := "/accounts/7/admin/features"
	if s, _ := h.call("GET", path, ""); s != 409 {
		t.Fatal(s)
	}
	if s, _ := h.call("GET", path, "", rev()); s != 200 {
		t.Fatal(s)
	}
	if last := ws.requests()[0]; last.Method != "GET" || last.Path != "/admin/features" {
		t.Fatal(last)
	}
	for _, method := range []string{"POST", "PUT", "DELETE"} {
		if s, _ := h.call(method, path, "{}", rev()); s != 405 {
			t.Fatal(method, s)
		}
	}
	if len(ws.requests()) != 1 {
		t.Fatal(len(ws.requests()))
	}
}

// covers: T9, T11, R23 (HandlerTests.test_cli_management_is_a_plain_pass_through)
func TestCLIManagementIsAPlainPassThrough(t *testing.T) {
	h, ws := passHarness(t, readyState(t, "api_key"), nil)
	path := "/accounts/7/admin/cli"
	if s, _ := h.call("GET", path, ""); s != 409 {
		t.Fatal(s)
	}
	for _, c := range [][2]string{{"GET", ""}, {"POST", `{"action":"check"}`}, {"POST", `{"action":"sync"}`},
		{"POST", `{"action":"update"}`}, {"PUT", `{"auto_update":false}`}} {
		if s, _ := h.call(c[0], path, c[1], rev()); s != 200 {
			t.Fatal(c, s)
		}
		last := ws.requests()[len(ws.requests())-1]
		if last.Method != c[0] || last.Path != "/admin/cli" || string(last.Body) != c[1] {
			t.Fatal(last)
		}
		assertWorkerHeaders(t, last, c[0] != "GET")
	}
	calls := len(ws.requests())
	if s, _ := h.call("DELETE", path, "", rev()); s != 405 {
		t.Fatal(s)
	}
	s, b := h.call("GET", path+"/catalog", "", rev())
	want(t, s, b, 404, errBody("not_found"))
	if len(ws.requests()) != calls {
		t.Fatal("refused requests reached the Worker")
	}
}

// assertWorkerHeaders: exactly the admin key and the content type, plus
// what the HTTP client itself adds (T11, test_headers.py).
func assertWorkerHeaders(t *testing.T, r *seenRequest, withBody bool) {
	t.Helper()
	var names []string
	for k := range r.Header {
		names = append(names, k)
	}
	sort.Strings(names)
	wantNames := "Accept-Encoding,Authorization,Connection,Content-Type"
	if withBody {
		wantNames = "Accept-Encoding,Authorization,Connection,Content-Length,Content-Type"
	}
	if strings.Join(names, ",") != wantNames {
		t.Fatalf("Worker request headers %v, want %s", names, wantNames)
	}
	if r.Header.Get("Authorization") != "Bearer admin-key-abcdef" || r.Header.Get("Content-Type") != "application/json" ||
		r.Header.Get("Accept-Encoding") != "identity" {
		t.Fatal(r.Header)
	}
}

// covers: T11 (HandlerTests.test_pass_through_never_forwards_caller_headers, test_headers.py)
func TestPassThroughNeverForwardsCallerHeaders(t *testing.T) {
	h, ws := passHarness(t, readyState(t, ""), nil)
	h.call("GET", "/accounts/7/admin/status", "", rev(), hdr("Anthropic-Beta", "a"),
		hdr("X-CCGateway-Request-Policy", "{}"), hdr("X-Api-Key", "caller"), hdr("User-Agent", "core"),
		hdr("Cookie", "c=1"))
	assertWorkerHeaders(t, ws.requests()[0], false)
}

// covers: T9, T10 (HandlerTests.test_usage_pass_through)
func TestUsagePassThrough(t *testing.T) {
	h, ws := passHarness(t, readyState(t, "oauth"), nil)
	path := "/accounts/7/admin/usage"
	s, b := h.call("GET", path, "")
	want(t, s, b, 409, errBody("not_synchronized"))
	if s, _ := h.call("GET", path, "", rev()); s != 200 {
		t.Fatal(s)
	}
	if last := ws.requests()[0]; last.Method != "GET" || last.Path != "/admin/usage" {
		t.Fatal(last)
	}
	s, b = h.call("POST", path, "{}", rev())
	want(t, s, b, 405, errBody("method_not_allowed"))
	if len(ws.requests()) != 1 {
		t.Fatal(len(ws.requests()))
	}
}

// covers: T10 (HandlerTests.test_api_key_accounts_reject_oauth)
func TestAPIKeyAccountsRejectOAuth(t *testing.T) {
	h, ws := passHarness(t, readyState(t, "api_key"), nil)
	s, b := h.call("GET", "/accounts/4/admin/auth/session", "", rev())
	want(t, s, b, 409, errBody("api_key_account"))
	s, b = h.call("GET", "/accounts/4/admin/usage", "", rev())
	want(t, s, b, 409, errBody("api_key_account"))
	if len(ws.requests()) != 0 {
		t.Fatal("reached the Worker")
	}
	// Both 409s keep the connection (H8).
	if res := h.do("GET", "/accounts/4/admin/usage", "", rev()); res.Closed {
		t.Fatal("closed")
	}
}

// covers: T12, H8 (new: the raw answer has no Content-Length, no
// Transfer-Encoding, Connection: close, and ends with the connection; each
// piece reaches the caller before the next exists)
func TestPassThroughStreamsCloseDelimited(t *testing.T) {
	release := make(chan struct{})
	h, _ := passHarness(t, readyState(t, ""), func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Content-Length", "") // removed below; the Worker streams chunked
		w.Header().Del("Content-Length")
		w.WriteHeader(201)
		io.WriteString(w, "event: one\n\n")
		w.(http.Flusher).Flush()
		<-release
		io.WriteString(w, "event: two\n\n")
	})
	conn := dialRaw(t, h.addr)
	conn.write(rawRequest("GET", "/accounts/7/admin/status", nil, [][2]string{rev()}, testKey, true))
	head := conn.readHead()
	if head.Status != 201 || head.Proto != "HTTP/1.1" {
		t.Fatal(head.Status, head.Proto)
	}
	for _, name := range []string{"Content-Length", "Transfer-Encoding"} {
		if v, ok := head.get(name); ok {
			t.Fatalf("%s: %s", name, v)
		}
	}
	for name, v := range map[string]string{"Connection": "close", "Cache-Control": "no-store", "Content-Type": "text/event-stream"} {
		if got, _ := head.get(name); got != v {
			t.Fatalf("%s: %q", name, got)
		}
	}
	if got := conn.readN(len("event: one\n\n")); got != "event: one\n\n" {
		t.Fatal(got)
	}
	close(release)
	if rest := conn.readAll(); rest != "event: two\n\n" {
		t.Fatal(rest)
	}
}

// covers: T12 (new: a compressed Worker answer is forwarded decoded and
// without Content-Encoding, as requests' iter_content did)
func TestPassThroughDecodesCompressedAnswers(t *testing.T) {
	plain := `{"usage": "` + strings.Repeat("x", 300) + `"}`
	var gz, zl bytes.Buffer
	g := gzip.NewWriter(&gz)
	g.Write([]byte(plain))
	g.Close()
	z := zlib.NewWriter(&zl)
	z.Write([]byte(plain))
	z.Close()
	bodies := map[string][]byte{"gzip": gz.Bytes(), "deflate": zl.Bytes(), "br": []byte("opaque"), "": []byte(plain)}
	for enc, raw := range bodies {
		h, ws := passHarness(t, readyState(t, ""), func(w http.ResponseWriter, r *http.Request) {
			if enc != "" {
				w.Header().Set("Content-Encoding", enc)
			}
			w.Write(raw)
		})
		res := h.do("GET", "/accounts/7/admin/status", "", rev())
		wantBody := plain
		if enc == "br" {
			wantBody = "opaque" // not something requests decodes: passed on as is
		}
		if res.Status != 200 || string(res.Body) != wantBody {
			t.Fatalf("%s: %d %q", enc, res.Status, res.Body)
		}
		if v, ok := res.get("Content-Encoding"); ok {
			t.Fatalf("%s: Content-Encoding %q forwarded", enc, v)
		}
		if ae := ws.requests()[0].Header.Get("Accept-Encoding"); ae != "identity" {
			t.Fatal(ae)
		}
	}
}

// covers: T13, H8, H10 (new: Worker unreachable before the answer -> 503
// unnamed with close; ready_state busy -> 503; failure after the answer
// started -> logged, connection cut)
func TestPassThroughFailures(t *testing.T) {
	st := readyState(t, "")
	h := newHarness(t, func(o *Options) { o.Worker = client(closedPort(t)) })
	h.core.answer("ready_state", st)
	res := h.do("GET", "/accounts/7/admin/status", "", rev())
	if res.Status != 503 || string(res.Body) != errBody("runtime_unavailable") || !res.Closed {
		t.Fatal(res.Status, string(res.Body), res.Closed)
	}
	if v, _ := res.get("Connection"); v != "close" {
		t.Fatal(v)
	}
	if !strings.Contains(h.log.String(), "GET key=7 path=admin/status -> 503 runtime_unavailable: error: ") {
		t.Fatal(h.log.String())
	}
	h.core.failWith("ready_state", errs.New(errs.RuntimeBusy, "account lock busy"))
	res = h.do("GET", "/accounts/7/admin/status", "", rev())
	if res.Status != 503 || string(res.Body) != errBody("runtime_unavailable") || !res.Closed {
		t.Fatal(res.Status, string(res.Body))
	}
	if !strings.Contains(h.log.String(), "-> 503 runtime_unavailable: RuntimeBusy: account lock busy\n") {
		t.Fatal(h.log.String())
	}

	// The Worker dies in the middle of its answer.
	h2, _ := passHarness(t, st, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", "100")
		io.WriteString(w, "partial")
		w.(http.Flusher).Flush()
		panic(http.ErrAbortHandler)
	})
	res = h2.do("GET", "/accounts/7/admin/status", "", rev())
	if res.Status != 200 || string(res.Body) != "partial" || !res.Closed {
		t.Fatal(res.Status, string(res.Body), res.Closed)
	}
	deadline := time.Now().Add(5 * time.Second)
	for !strings.Contains(h2.log.String(), "GET key=7 path=admin/status -> 503 runtime_unavailable") {
		if time.Now().After(deadline) {
			t.Fatalf("no failure line: %q", h2.log.String())
		}
		time.Sleep(10 * time.Millisecond)
	}
}

// covers: T13 (new: a caller that goes away mid-stream is "connection
// dropped" and the Worker request is cancelled)
func TestPassThroughCallerGoesAway(t *testing.T) {
	gone := make(chan struct{})
	h, _ := passHarness(t, readyState(t, ""), func(w http.ResponseWriter, r *http.Request) {
		io.WriteString(w, "first")
		w.(http.Flusher).Flush()
		select {
		case <-r.Context().Done():
		case <-time.After(10 * time.Second):
		}
		close(gone)
	})
	conn := dialRaw(t, h.addr)
	conn.write(rawRequest("GET", "/accounts/7/admin/status", nil, [][2]string{rev()}, testKey, true))
	conn.readHead()
	conn.readN(len("first"))
	conn.c.Close()
	select {
	case <-gone:
	case <-time.After(8 * time.Second):
		t.Fatal("the Worker request was not cancelled")
	}
	deadline := time.Now().Add(5 * time.Second)
	for !strings.Contains(h.log.String(), "-> connection dropped") {
		if time.Now().After(deadline) {
			t.Fatalf("no dropped line: %q", h.log.String())
		}
		time.Sleep(10 * time.Millisecond)
	}
	if strings.Contains(h.log.String(), "503") {
		t.Fatal(h.log.String())
	}
}

// covers: T9 (the method table of every pass-through path)
func TestPassThroughMethodTable(t *testing.T) {
	cases := map[string]string{
		"admin/status": "GET POST", "admin/auth/session": "GET POST", "admin/auth/start": "GET POST",
		"admin/auth/complete": "GET POST", "admin/auth/cancel": "GET POST", "admin/auth/logout": "GET POST",
		"admin/auth/refresh": "GET POST", "admin/usage": "GET", "admin/features": "GET",
		"admin/request-logs": "GET PUT", "admin/request-logs/query": "POST", "admin/request-logs/detail": "POST",
		"admin/request-logs/read": "POST", "admin/cli": "GET POST PUT",
	}
	for path, allowed := range cases {
		var got []string
		for _, m := range []string{"GET", "POST", "PUT", "DELETE"} {
			if methodAllowed(path, m) {
				got = append(got, m)
			}
		}
		if strings.Join(got, " ") != allowed {
			t.Fatal(path, got)
		}
		if !routeAccount.MatchString("/accounts/7/" + path) {
			t.Fatal("route", path)
		}
	}
	_ = fmt.Sprint
}
