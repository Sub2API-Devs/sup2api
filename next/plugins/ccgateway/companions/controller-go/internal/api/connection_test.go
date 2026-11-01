package api

import (
	"strings"
	"testing"
	"time"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/errs"
)

func sleepShort() { time.Sleep(10 * time.Millisecond) }

// covers: Y5, R6, Y1 (ConnectionStateTests.test_connection_requires_current_ready_revision_and_keeps_key_private, HTTP part)
func TestConnectionRequiresCurrentReadyRevision(t *testing.T) {
	h := newHarness(t, nil)
	h.core.on("connection", func(args []any) (any, error) {
		if args[1] != testRev {
			return nil, nil
		}
		return &contract.Connection{AppIP: "10.77.0.2", Port: 8787, APIKey: "gateway-key-123456", Revision: testRev}, nil
	})
	h.core.answer("public", &contract.Public{AccountID: "21", Status: "ready", Revision: testRev})
	for _, r := range []string{"", strings.Repeat("b", 64)} {
		res := h.do("GET", "/accounts/21/connection", "", hdr("X-CCG-Revision", r))
		if res.Status != 409 || string(res.Body) != errBody("not_synchronized") || res.Closed {
			t.Fatal(r, res.Status, res.Closed)
		}
	}
	if args := h.core.last("connection"); args[1] != strings.Repeat("b", 64) {
		t.Fatal(args)
	}
	h.call("GET", "/accounts/21/connection", "")
	if args := h.core.last("connection"); args[1] != "" {
		t.Fatal("a missing X-CCG-Revision is the empty string", args)
	}
	s, b := h.call("GET", "/accounts/21/connection", "", rev())
	want(t, s, b, 200, `{"app_ip": "10.77.0.2", "port": 8787, "api_key": "gateway-key-123456", "revision": "`+testRev+`"}`)
	_, b = h.call("GET", "/accounts/21/status", "")
	if strings.Contains(b, "api_key\"") || strings.Contains(b, "gateway-key") {
		t.Fatal(b)
	}
}

// covers: K2 (ConnectionTests.test_request_path_never_waits_unbounded_for_the_account_lock, HTTP part)
func TestConnectionLockWaitIsRuntimeUnavailable(t *testing.T) {
	h := newHarness(t, nil)
	h.core.failWith("connection", errs.New(errs.RuntimeBusy, "account 21 is busy"))
	res := h.do("GET", "/accounts/21/connection", "", rev())
	if res.Status != 503 || string(res.Body) != errBody("runtime_unavailable") || !res.Closed {
		t.Fatal(res.Status, string(res.Body))
	}
	if strings.Contains(h.log.String(), "chain:") {
		t.Fatal("RuntimeBusy is named: no chain", h.log.String())
	}
	// The request context reaches the business call (it ends with the client).
	h.core.on("connection", func(args []any) (any, error) {
		return &contract.Connection{AppIP: "10.77.0.2", Port: 8787, APIKey: "k", Revision: testRev}, nil
	})
	if s, _ := h.call("GET", "/accounts/21/connection", "", rev()); s != 200 {
		t.Fatal(s)
	}
}

// covers: Y1, Y5 (ConnectionTests.test_connection_reads_readiness_without_image_lookups, HTTP part:
// the request path calls Connection only, nothing else of the business packages)
func TestConnectionCallsOnlyConnection(t *testing.T) {
	h := newHarness(t, nil)
	h.core.answer("connection", &contract.Connection{AppIP: "10.77.0.2", Port: 8787, APIKey: "k", Revision: testRev})
	h.call("GET", "/accounts/21/connection", "", rev())
	calls := h.core.callList()
	if len(calls) != 1 || calls[0].Name != "connection" {
		t.Fatal(calls)
	}
}
