package api

import (
	"errors"
	"strings"
	"testing"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/pyjson"
)

var (
	validKeys   = []string{"1", "42", "123456789012345678", draft, "d" + strings.Repeat("0", 16)}
	invalidKeys = []string{"", "0", "01", "1234567890123456789", "d", "d" + strings.Repeat("a", 15), "d" + strings.Repeat("a", 17),
		"D0123456789abcdef", "d0123456789ABCDEF", "d0123456789abcdeg", "x0123456789abcdef",
		draft + "\n", "1\n", "../1", "1/../2", "d0123456789abcdef/..", "-1", " 1"}
)

// covers: H3, H4, R23 (KeyTests.test_routes_only_accept_valid_keys; ProgramArchiveTests.test_route)
func TestRoutesOnlyAcceptValidKeys(t *testing.T) {
	for _, key := range validKeys {
		if m := routeAccount.FindStringSubmatch("/accounts/" + key + "/status"); m == nil || m[1] != key {
			t.Fatal(key, m)
		}
		if m := routeAccount.FindStringSubmatch("/accounts/" + key + "/admin/auth/session"); m == nil || m[2] != "admin/auth/session" {
			t.Fatal(key)
		}
		if m := routeAccount.FindStringSubmatch("/accounts/" + key + "/admin/usage"); m == nil || m[2] != "admin/usage" {
			t.Fatal(key)
		}
		if m := routeAccount.FindStringSubmatch("/accounts/" + key); m == nil || m[1] != key || m[2] != "" {
			t.Fatal(key)
		}
	}
	for _, key := range invalidKeys {
		if routeAccount.MatchString("/accounts/" + key + "/status") {
			t.Fatalf("%q accepted", key)
		}
	}
	if m := routeAccount.FindStringSubmatch("/accounts"); m == nil || m[1] != "" || m[2] != "" {
		t.Fatal(m)
	}
	for _, path := range []string{"/accounts/", "/accounts/1/", "/accounts/1/admin/auth/other", "/accounts/1/status?x=1",
		"/accounts/1/../2/status", "/accounts/1/admin/auth/session/x", "/accounts/1/admin/usage/x",
		"/accounts/1/admin/auth/usage", "/accounts/1/v1/messages", "/accounts/1/v1/messages/count_tokens",
		"/accounts/" + draft + "/migrate-auth", "/accounts/1/admin/cli/catalog", "/accounts/21/worker/x",
		"/accounts/1/status\n"} {
		if routeAccount.MatchString(path) {
			t.Fatalf("%q matched", path)
		}
	}
	if m := routeAccount.FindStringSubmatch("/accounts/21/worker"); m == nil || m[2] != "worker" {
		t.Fatal(m)
	}
	for path, ok := range map[string]bool{"/runtime/images": true, "/runtime/controller": true, "/runtime/cleanup": true,
		"/runtime/egress/recreate": true, "/runtime/egress": false, "/runtime/images/": false, "/runtime/images?x": false} {
		if routeRuntime.MatchString(path) != ok {
			t.Fatal(path)
		}
	}
	for path, ok := range map[string]bool{"/images/uploads": true, "/images/uploads/" + strings.Repeat("a", 22): true,
		"/images/uploads/" + strings.Repeat("a", 22) + "/load": true, "/images/uploads/" + strings.Repeat("a", 21): false,
		"/images/uploads/" + strings.Repeat("-", 22) + "/load/": false, "/images/uploads/": false} {
		if routeUpload.MatchString(path) != ok {
			t.Fatal(path)
		}
	}
}

// covers: H3 (new: the raw request target decides, no normalisation or redirects)
func TestRawTargetIsNotNormalised(t *testing.T) {
	h := newHarness(t, nil)
	h.core.answer("health", healthAnswer(t))
	for _, target := range []string{"/health?x=1", "//accounts/", "///nothing", "/./accounts", "/accounts/1/status/",
		"/accounts/7/status?x=1", "http://controller.test/accounts", "/%61ccounts", "/runtime/images/"} {
		res := h.do("GET", target, "")
		if res.Status != 404 || string(res.Body) != errBody("not_found") || !res.Closed {
			t.Fatalf("%s: %d %s closed=%v", target, res.Status, res.Body, res.Closed)
		}
	}
	if len(h.core.callList()) != 0 {
		t.Fatal(h.core.callList())
	}
	// Python 3.12 reduces leading slashes only (gh-87389).
	h.core.answer("runtimes", &contract.RuntimeList{})
	if s, b := h.call("GET", "//accounts", ""); s != 200 || b != `{"runtimes": []}` {
		t.Fatal(s, b)
	}
	if s, _ := h.call("GET", "///health", ""); s != 200 {
		t.Fatal(s)
	}
}

// covers: H1, BUG-11 (fixed: "Bearer " is required, a non-ASCII value is 401)
func TestAuthorizationRequiresBearer(t *testing.T) {
	h := newHarness(t, nil)
	h.core.answer("runtimes", &contract.RuntimeList{})
	cases := []struct {
		header string
		ok     bool
	}{
		{"Bearer " + testKey, true},
		{testKey, false},                     // bare key: Python accepted it
		{"bearer " + testKey, false},         // removeprefix is case-sensitive
		{"Bearer  " + testKey, false},        // one space only
		{"Bearer " + testKey + "x", false},   // longer
		{"Bearer " + testKey[:31], false},    // shorter
		{"Bearer \xe9" + testKey[1:], false}, // not ASCII: Python dropped the connection
		{"", false},
	}
	for _, c := range cases {
		var headers [][2]string
		if c.header != "" {
			headers = append(headers, hdr("Authorization", c.header))
		}
		res := doRaw(t, h.addr, rawRequest("GET", "/accounts", nil, headers, "", false), 300*1e6)
		if c.ok {
			if res.Status != 200 {
				t.Fatalf("%q: %d", c.header, res.Status)
			}
			continue
		}
		if res.Status != 401 || string(res.Body) != errBody("unauthorized") || !res.Closed {
			t.Fatalf("%q: %d %s closed=%v", c.header, res.Status, res.Body, res.Closed)
		}
	}
	// Only the first Authorization header counts.
	res := doRaw(t, h.addr, rawRequest("GET", "/accounts", nil, [][2]string{hdr("Authorization", "Bearer x"),
		hdr("Authorization", "Bearer "+testKey)}, "", false), 300*1e6)
	if res.Status != 401 {
		t.Fatal(res.Status)
	}
	if h.core.count("runtimes") != 1 {
		t.Fatal(h.core.count("runtimes"))
	}
}

// covers: H2, BUG-12 (fixed: other methods are authenticated, then JSON 405 with close)
func TestOtherMethodsAreAuthenticatedThen405(t *testing.T) {
	h := newHarness(t, nil)
	for _, method := range []string{"HEAD", "PATCH", "OPTIONS", "PROPFIND"} {
		for _, target := range []string{"/health", "/accounts/7/status", "/nothing", "/images/uploads"} {
			res := doRaw(t, h.addr, rawRequest(method, target, nil, nil, "wrong", true), 300*1e6)
			if res.Status != 401 || !res.Closed {
				t.Fatalf("%s %s unauthenticated: %d", method, target, res.Status)
			}
			res = doRaw(t, h.addr, rawRequest(method, target, nil, nil, testKey, true), 300*1e6)
			if res.Status != 405 || !res.Closed {
				t.Fatalf("%s %s: %d closed=%v", method, target, res.Status, res.Closed)
			}
			if method != "HEAD" && string(res.Body) != errBody("method_not_allowed") {
				t.Fatal(string(res.Body))
			}
			if v, _ := res.get("Content-Type"); v != "application/json" {
				t.Fatal(v)
			}
		}
	}
	if len(h.core.callList()) != 0 {
		t.Fatal(h.core.callList())
	}
}

// covers: H7, H8 (new: Connection: close exactly where Python sets close_connection)
func TestConnectionCloseTable(t *testing.T) {
	st := readyState(t, "api_key")
	h := newHarness(t, nil)
	h.core.answer("health", healthAnswer(t))
	h.core.answer("runtimes", &contract.RuntimeList{})
	h.core.answer("delete", &contract.DeleteResult{})
	h.core.answer("apply", &contract.Blocked{AccountID: "7"})
	h.core.answer("public", &contract.Public{AccountID: "7", Status: "pending"})
	h.core.answer("connection", nil)
	h.core.answer("shared.status", &contract.EgressStatus{Ready: true})
	h.core.answer("ready_state", st)
	h.core.answer("runtime_images", ordered(t, `{"app": "a", "egress": "e", "controller": ""}`))
	h.core.answer("set_runtime_images", healthAnswer(t))
	h.core.answer("cleanup_inventory", ordered(t, `{"runtimes": []}`))
	h.core.answer("cleanup_runtimes", ordered(t, `{"results": [], "deleted": 0, "failed": 0}`))
	h.core.answer("update_worker", ordered(t, `{"status": "unchanged", "sha256": "x"}`))
	h.core.answer("uploads.create", ordered(t, `{"upload_id": "x", "offset": 0, "size": 1}`))
	h.core.answer("uploads.status", ordered(t, `{"offset": 0, "size": 1}`))
	h.core.answer("uploads.delete", ordered(t, `{"deleted": true}`))
	h.core.answer("uploads.load", ordered(t, `{"sha256": "x", "images": []}`))
	h.core.answer("uploads.write", ordered(t, `{"offset": 1, "size": 1}`))
	h.core.answer("upgrade_controller", nil)
	h.core.answer("recreate_egress", ordered(t, `{"recreated": true, "image": "egress:test"}`))
	id := strings.Repeat("a", 22)
	cases := []struct {
		method, target, body string
		headers              [][2]string
		status               int
		close                bool
	}{
		{"GET", "/accounts", "", nil, 200, false},
		{"POST", "/accounts", "", nil, 405, false},
		{"GET", "/accounts/7", "", nil, 405, false},
		{"DELETE", "/accounts/" + draft, "", nil, 200, false},
		{"PUT", "/accounts/7/config", "{}", nil, 200, false},
		{"GET", "/accounts/7/status", "", nil, 200, false},
		{"POST", "/accounts/7/status", "", nil, 405, false},
		{"GET", "/accounts/7/connection", "", nil, 409, false},
		{"GET", "/accounts/7/egress", "", nil, 200, false},
		{"DELETE", "/accounts/7/admin/status", "", nil, 405, false},
		{"GET", "/accounts/7/admin/auth/session", "", nil, 409, false},
		{"DELETE", "/accounts/7", "", [][2]string{hdr("X-CCG-Delete-Data", "1")}, 400, true},
		{"GET", "/health", "", nil, 200, true},
		{"POST", "/health", "", nil, 405, true},
		{"GET", "/nothing", "", nil, 404, true},
		{"GET", "/runtime/images", "", nil, 200, false},
		{"PUT", "/runtime/images", "{}", nil, 200, false},
		{"DELETE", "/runtime/images", "", nil, 405, true},
		{"POST", "/runtime/controller", `{"image": "c:1"}`, nil, 202, false},
		{"POST", "/runtime/egress/recreate", "{}", nil, 200, false},
		{"GET", "/runtime/egress/recreate", "", nil, 405, true},
		{"GET", "/runtime/cleanup", "", nil, 200, false},
		{"POST", "/runtime/cleanup", "{}", nil, 200, false},
		{"POST", "/runtime/cleanup", "nope", nil, 400, true},
		{"POST", "/images/uploads", `{"size": 1}`, nil, 200, false},
		{"GET", "/images/uploads", "", nil, 405, true},
		{"PUT", "/images/uploads/" + id, "x", [][2]string{hdr("X-CCG-Offset", "0")}, 200, false},
		{"PUT", "/images/uploads/" + id, "x", nil, 400, true},
		{"GET", "/images/uploads/" + id, "", nil, 200, false},
		{"DELETE", "/images/uploads/" + id, "", nil, 200, false},
		{"POST", "/images/uploads/" + id + "/load", "", nil, 200, false},
		{"POST", "/accounts/7/worker", `{"image": "a:1"}`, nil, 200, false},
		{"GET", "/accounts/7/worker", "", nil, 405, true},
		{"POST", "/accounts/7/worker", "nope", nil, 400, true},
		{"GET", "/accounts/7/tunnel", "", nil, 400, true},
	}
	for _, c := range cases {
		res := doRaw(t, h.addr, rawRequest(c.method, c.target, []byte(c.body), c.headers, testKey, true), 300*1e6)
		hv, has := res.get("Connection")
		if res.Status != c.status || res.Closed != c.close || has != c.close || (has && hv != "close") {
			t.Fatalf("%s %s: %d closed=%v Connection=%q, want %d close=%v", c.method, c.target, res.Status, res.Closed, hv, c.status, c.close)
		}
		if ct, _ := res.get("Content-Type"); ct != "application/json" {
			t.Fatal(c.target, ct)
		}
		if cc, _ := res.get("Cache-Control"); cc != "no-store" {
			t.Fatal(c.target, cc)
		}
		if _, ok := res.get("Server"); ok {
			t.Fatal("Server header")
		}
		if _, ok := res.get("Date"); !ok {
			t.Fatal("Date header")
		}
	}
	// The answer bodies of the account answers are the contract types.
	s, b := h.call("PUT", "/accounts/7/config", "{}")
	want(t, s, b, 200, `{"account_id": "7", "status": "blocked", "revision": ""}`)
	s, b = h.call("GET", "/accounts/7/egress", "")
	want(t, s, b, 200, `{"backend": "shared_xray", "ready": true}`)
	s, b = h.call("POST", "/runtime/controller", `{"image": "c:1"}`)
	want(t, s, b, 202, `{"accepted": true}`)
}

// covers: H5 (read_body: strict decimal Content-Length, the limits, no Transfer-Encoding)
func TestReadBodyRules(t *testing.T) {
	h := newHarness(t, nil)
	h.core.answer("public", &contract.Public{AccountID: "7", Status: "pending"})
	h.core.answer("runtime_images", ordered(t, `{"app": "a"}`))
	h.core.on("apply", func(args []any) (any, error) { return rawValue{args[1]}, nil })
	// Leading zeros are decimal; the body is read exactly.
	res := h.do("PUT", "/accounts/7/config", `{"a": 1}`, hdr("Content-Length", "008"))
	want(t, res.Status, string(res.Body), 200, `{"a": 1}`)
	for _, c := range []struct{ target, length string }{
		{"/accounts/7/status", "33554433"}, {"/runtime/images", "65537"}, {"/accounts/7/worker", "65537"},
		{"/accounts/7/status", "1234567890123"},
	} {
		res := h.do("GET", c.target, "", hdr("Content-Length", c.length))
		if c.target == "/accounts/7/worker" {
			res = h.do("POST", c.target, "", hdr("Content-Length", c.length))
		}
		if res.Status != 400 || string(res.Body) != errBody("invalid_request") || !res.Closed {
			t.Fatalf("%+v: %d %s", c, res.Status, res.Body)
		}
	}
	res = h.do("PUT", "/accounts/7/config", "2\r\n{}\r\n0\r\n\r\n", hdr("Transfer-Encoding", "chunked"))
	if res.Status != 400 || !res.Closed {
		t.Fatal(res.Status)
	}
	if !strings.Contains(h.log.String(), "PUT key=7 path=config -> 400 invalid_request: BadRequest: invalid body\n") {
		t.Fatal(h.log.String())
	}
	// GET status reads (and ignores) its body first.
	res = h.do("GET", "/accounts/7/status", `{"ignored": true}`)
	if res.Status != 200 || res.Closed {
		t.Fatal(res.Status)
	}
}

// covers: H11 (new: a body that ends early is a dropped connection: logged, not answered)
func TestShortBodyIsADroppedConnection(t *testing.T) {
	h := newHarness(t, nil)
	conn := dialRaw(t, h.addr)
	conn.write([]byte("PUT /accounts/7/config HTTP/1.1\r\nHost: x\r\nAuthorization: Bearer " + testKey + "\r\nContent-Length: 10\r\n\r\n{}"))
	conn.c.(interface{ CloseWrite() error }).CloseWrite()
	if rest := conn.readAll(); rest != "" {
		t.Fatalf("answered: %q", rest)
	}
	waitLog(t, h, "PUT key=7 path=config -> connection dropped")
	if h.core.count("apply") != 0 {
		t.Fatal("applied a partial body")
	}
}

// covers: H9, H10 (new: the outcome of every named failure in every group,
// a guard 404 leaking is unnamed)
func TestErrorGroups(t *testing.T) {
	h := newHarness(t, nil)
	kinds := []errs.Kind{errs.BadRequest, errs.InvalidImage, errs.RuntimeNotFound, errs.NotDraft, errs.InvalidCLIProfile,
		errs.UnsupportedContainer, errs.UpgradeInProgress, errs.ResourceInUse, errs.OwnershipMismatch, errs.ImagePullFailed,
		errs.DiskQuotaUnavailable, errs.ContainerChanged, errs.RuntimeBusy}
	type group struct {
		name, method, target, body, stub string
		set                              errs.Set
	}
	groups := []group{
		{"request", "GET", "/accounts/7/status", "", "public", errs.Request},
		{"delete", "DELETE", "/accounts/" + draft, "", "delete", errs.Delete},
		{"management", "GET", "/runtime/cleanup", "", "cleanup_inventory", errs.Management},
		{"worker", "POST", "/accounts/7/worker", `{"image": "a:1"}`, "update_worker", errs.Worker},
		{"tunnel", "GET", "/accounts/7/tunnel", "", "connection", errs.Tunnel},
	}
	for _, g := range groups {
		for _, k := range kinds {
			h.core.failWith(g.stub, &errs.Error{Kind: k, Msg: "m"})
			headers := [][2]string{}
			if g.name == "tunnel" {
				headers = tunnelHeaders()
			}
			res := h.do(g.method, g.target, g.body, headers...)
			status, code, _ := errs.Answer(&errs.Error{Kind: k}, g.set)
			if res.Status != status || string(res.Body) != errBody(code) || !res.Closed {
				t.Fatalf("%s %v: %d %s, want %d %s", g.name, k, res.Status, res.Body, status, code)
			}
		}
		h.core.failWith(g.stub, &guardapi.Error{Status: 404, Code: guardapi.CodeNotFound, Endpoint: "GET /v1/accounts/{aid}"})
		headers := [][2]string{}
		if g.name == "tunnel" {
			headers = tunnelHeaders()
		}
		if res := h.do(g.method, g.target, g.body, headers...); res.Status != 503 || string(res.Body) != errBody("runtime_unavailable") {
			t.Fatalf("%s guard 404: %d", g.name, res.Status)
		}
		// The guard still starting (503 unavailable/starting), the local
		// 413 of an oversized guard request and a transport failure are
		// unnamed everywhere (IMPLEMENTATION §5.3).
		for _, gerr := range []error{guardapi.ErrStarting,
			&guardapi.Error{Status: 413, Code: guardapi.CodeTooLarge, Endpoint: "PUT /v1/accounts/{aid}/app"},
			&guardapi.TransportError{Endpoint: "GET /v1/accounts/{aid}", Err: errors.New("connection refused")}} {
			h.core.failWith(g.stub, gerr)
			if res := h.do(g.method, g.target, g.body, headers...); res.Status != 503 || string(res.Body) != errBody("runtime_unavailable") || !res.Closed {
				t.Fatalf("%s %v: %d %s", g.name, gerr, res.Status, res.Body)
			}
		}
	}
	h.core.failWith("public", errs.Activation(errs.CodeEgressNotReady, "egress did not come up"))
	s, b := h.call("GET", "/accounts/7/status", "")
	want(t, s, b, 503, errBody("egress_not_ready"))
	h.core.failWith("public", errors.New("plain"))
	s, b = h.call("GET", "/accounts/7/status", "")
	want(t, s, b, 503, errBody("runtime_unavailable"))
	if !strings.Contains(h.log.String(), "GET key=7 path=status -> 503 runtime_unavailable: error: plain | chain: *errors.errorString: plain") {
		t.Fatal(h.log.String())
	}
	// Management failures log the full path and key None.
	if !strings.Contains(h.log.String(), "GET key=None path=/runtime/cleanup -> 400 invalid_request: BadRequest: m\n") {
		t.Fatal(h.log.String())
	}
	_ = pyjson.Ordered{}
}

// covers: H11, 02 §3.1 (new: a panic before the answer is 503
// runtime_unavailable with close and a stack in the log; the server goes on)
func TestPanicIsRuntimeUnavailable(t *testing.T) {
	h := newHarness(t, nil)
	h.core.on("public", func([]any) (any, error) { panic("boom") })
	res := h.do("GET", "/accounts/7/status", "")
	if res.Status != 503 || string(res.Body) != errBody("runtime_unavailable") || !res.Closed {
		t.Fatal(res.Status, string(res.Body))
	}
	log := h.log.String()
	if !strings.Contains(log, "ERROR ccgateway.controller GET key=7 path=status -> 503 runtime_unavailable: panic: boom") ||
		!strings.Contains(log, "goroutine") {
		t.Fatal(log)
	}
	h.core.answer("public", &contract.Public{AccountID: "7", Status: "pending"})
	if s, _ := h.call("GET", "/accounts/7/status", ""); s != 200 {
		t.Fatal(s)
	}
}

func waitLog(t *testing.T, h *harness, part string) {
	t.Helper()
	for i := 0; i < 500; i++ {
		if strings.Contains(h.log.String(), part) {
			return
		}
		sleepShort()
	}
	t.Fatalf("log lacks %q: %q", part, h.log.String())
}
