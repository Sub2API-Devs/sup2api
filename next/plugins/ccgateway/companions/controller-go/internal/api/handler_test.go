package api

import (
	"errors"
	"fmt"
	"strings"
	"testing"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/pyjson"
)

func want(t *testing.T, gotStatus int, gotBody string, status int, body string) {
	t.Helper()
	if gotStatus != status || gotBody != body {
		t.Fatalf("got %d %s, want %d %s", gotStatus, gotBody, status, body)
	}
}

// covers: H1, H3, H6, H9, H10, H11, R11, A8 (HandlerTests.test_errors_are_english_codes)
func TestErrorsAreEnglishCodes(t *testing.T) {
	h := newHarness(t, nil)
	res := h.doKey(strings.Repeat("wrong", 8), "GET", "/accounts", "")
	want(t, res.Status, string(res.Body), 401, errBody("unauthorized"))
	for _, path := range []string{"/accounts/../1/status", "/accounts/0/status", "/accounts/D0123456789ABCDEF/status",
		"/accounts/1/admin/auth/other", "/nothing"} {
		s, b := h.call("GET", path, "")
		want(t, s, b, 404, errBody("not_found"))
	}
	s, b := h.call("POST", "/accounts", "")
	want(t, s, b, 405, errBody("method_not_allowed"))
	s, b = h.call("GET", "/accounts/"+draft, "")
	want(t, s, b, 405, errBody("method_not_allowed"))
	s, b = h.call("DELETE", "/accounts/"+draft+"/status", "")
	want(t, s, b, 405, errBody("method_not_allowed"))
	s, b = h.call("POST", "/accounts/1/egress", `{"backend":"shared_xray"}`)
	want(t, s, b, 405, errBody("method_not_allowed"))
	if n := len(h.core.callList()); n != 0 {
		t.Fatalf("405/404 reached the business packages: %v", h.core.callList())
	}

	// PUT config: a body that is not JSON reaches Apply as nil (H6).
	h.core.on("apply", func(args []any) (any, error) {
		if args[1] == nil {
			return nil, errs.New(errs.BadRequest, "invalid configuration")
		}
		if _, ok := args[1].([]any); ok {
			return nil, errs.New(errs.BadRequest, "invalid configuration")
		}
		return nil, errs.New(errs.BadRequest, "invalid revision")
	})
	for _, body := range []string{"not json", "[]", `{"revision": "x", "proxy": {}}`} {
		s, b = h.call("PUT", "/accounts/1/config", body)
		want(t, s, b, 400, errBody("invalid_request"))
	}
	if args := h.core.last("apply"); args[0] != "1" {
		t.Fatal(args)
	}
	h.core.failWith("apply", errs.Wrap(errs.ImagePullFailed, "app:test: manifest unknown", nil))
	s, b = h.call("PUT", "/accounts/1/config", `{"revision": "`+testRev+`"}`)
	want(t, s, b, 503, errBody("image_pull_failed"))

	// An unnamed failure: one line naming method, key, path, outcome and
	// the error with its chain; never the body.
	before := strings.Count(h.log.String(), "\n")
	h.core.failWith("apply", fmt.Errorf("create network: %w", errors.New("daemon error")))
	s, b = h.call("PUT", "/accounts/1/config", `{"revision": "`+testRev+`", "proxy": {"protocol": "http"}}`)
	want(t, s, b, 503, errBody("runtime_unavailable"))
	lines := strings.Split(strings.TrimSpace(h.log.String()), "\n")
	if len(lines)-before != 1 {
		t.Fatalf("want one new log line, got %q", lines[before:])
	}
	line := lines[len(lines)-1]
	for _, part := range []string{"WARNING ccgateway.controller PUT key=1 path=config -> 503 runtime_unavailable", "daemon error",
		"chain: *fmt.wrapError"} {
		if !strings.Contains(line, part) {
			t.Fatalf("%q lacks %q", line, part)
		}
	}
	if strings.Contains(line, testRev) {
		t.Fatal("the body reached the log")
	}
	// A failed proxy probe is named for the core.
	h.core.failWith("apply", errs.Activation(errs.CodeProxyCheckFailed, "account proxy connectivity check failed"))
	s, b = h.call("PUT", "/accounts/1/config", `{"revision": "`+testRev+`"}`)
	want(t, s, b, 503, errBody("proxy_check_failed"))
	if !strings.Contains(h.log.String(), "PUT key=1 path=config -> 503 proxy_check_failed: ActivationFailed: account proxy connectivity check failed\n") {
		t.Fatal(h.log.String())
	}
}

// covers: H1, R1 (HandlerTests.test_health)
func TestHealth(t *testing.T) {
	h := newHarness(t, nil)
	h.core.answer("health", healthAnswer(t))
	res := h.doKey(strings.Repeat("wrong", 8), "GET", "/health", "")
	want(t, res.Status, string(res.Body), 401, errBody("unauthorized"))
	s, b := h.call("GET", "/health", "")
	want(t, s, b, 200, string(pyjson.MustMarshal(healthAnswer(t))))
	if !strings.Contains(b, `"features": ["tunnel", "uploads", `) {
		t.Fatal(b)
	}
}

// covers: H10, PV9 (HandlerTests.test_unsupported_disk_quota_has_a_specific_error)
func TestUnsupportedDiskQuotaHasASpecificError(t *testing.T) {
	h := newHarness(t, nil)
	h.core.failWith("apply", &errs.Error{Kind: errs.DiskQuotaUnavailable, Msg: "quota size requested but no quota support",
		Err: &guardapi.Error{Status: 503, Code: guardapi.CodeDiskQuota, Endpoint: "PUT /v1/accounts/{aid}/volume"}})
	s, b := h.call("PUT", "/accounts/1/config", `{"revision": "`+testRev+`", "proxy": {"protocol": "http"}}`)
	want(t, s, b, 503, errBody("disk_quota_unavailable"))
}

// covers: R3 (HandlerTests.test_explicit_account_delete_purges_data)
func TestExplicitAccountDeletePurgesData(t *testing.T) {
	h := newHarness(t, nil)
	h.core.answer("delete", &contract.DeleteResult{Containers: []string{"ccg-21-app"}, Networks: []string{"ccg-21-net"}, Volume: true})
	s, b := h.call("DELETE", "/accounts/21", "", hdr("X-CCG-Delete-Data", "1"))
	want(t, s, b, 400, errBody("invalid_request"))
	if h.core.count("delete") != 0 {
		t.Fatal("deleted without confirmation")
	}
	s, b = h.call("DELETE", "/accounts/21", "", hdr("X-CCG-Delete-Account", "21"), hdr("X-CCG-Delete-Data", "1"))
	want(t, s, b, 200, `{"deleted": true, "removed": {"containers": ["ccg-21-app"], "networks": ["ccg-21-net"], "volume": true}}`)
	if args := h.core.last("delete"); fmt.Sprint(args) != "[21 true true]" {
		t.Fatal(args)
	}
	// Only "1" purges; the confirmation must name the key exactly.
	h.call("DELETE", "/accounts/21", "", hdr("X-CCG-Delete-Account", "21"), hdr("X-CCG-Delete-Data", "yes"))
	if args := h.core.last("delete"); fmt.Sprint(args) != "[21 true false]" {
		t.Fatal(args)
	}
	h.call("DELETE", "/accounts/21", "", hdr("X-CCG-Delete-Account", "021"))
	if args := h.core.last("delete"); fmt.Sprint(args) != "[21 false false]" {
		t.Fatal(args)
	}
}

// covers: R3, D3, H11 (HandlerTests.test_delete_with_a_foreign_volume_user_is_a_conflict)
func TestDeleteWithAForeignVolumeUserIsAConflict(t *testing.T) {
	h := newHarness(t, nil)
	h.core.failWith("delete", errs.InUse([]string{"debug-shell"}))
	s, b := h.call("DELETE", "/accounts/21", "", hdr("X-CCG-Delete-Account", "21"), hdr("X-CCG-Delete-Data", "1"))
	want(t, s, b, 409, errBody("resource_in_use"))
	log := h.log.String()
	if !strings.Contains(log, "DELETE key=21 path=None -> 409 resource_in_use: ResourceInUse: runtime resources in use by debug-shell\n") {
		t.Fatal(log)
	}
}

// covers: R3, H10, H11 (HandlerTests.test_delete_with_a_same_name_foreign_resource_is_a_conflict)
func TestDeleteWithASameNameForeignResourceIsAConflict(t *testing.T) {
	h := newHarness(t, nil)
	h.core.failWith("delete", errs.Mismatch("ccg-21-data"))
	s, b := h.call("DELETE", "/accounts/21", "", hdr("X-CCG-Delete-Account", "21"), hdr("X-CCG-Delete-Data", "1"))
	want(t, s, b, 409, errBody("resource_in_use"))
	log := h.log.String()
	if !strings.Contains(log, "409 resource_in_use: OwnershipMismatch: ccg-21-data") || strings.Contains(log, "chain:") {
		t.Fatalf("a named failure without its chain: %q", log)
	}
	// Elsewhere the same failure is unnamed: 503.
	h.core.failWith("apply", errs.Mismatch("ccg-22-app"))
	s, b = h.call("PUT", "/accounts/22/config", `{"revision": "`+testRev+`", "proxy": {"protocol": "http"}}`)
	want(t, s, b, 503, errBody("runtime_unavailable"))
	if !strings.Contains(h.log.String(), "PUT key=22 path=config -> 503 runtime_unavailable: OwnershipMismatch: ccg-22-app: ownership mismatch (not this runtime's) | chain: *errs.Error") {
		t.Fatal(h.log.String())
	}
}

// covers: R20, R21, X4, X5 (HandlerTests.test_cleanup_http_requires_auth_and_complete_snapshot)
func TestCleanupHTTPRequiresAuthAndCompleteSnapshot(t *testing.T) {
	h := newHarness(t, nil)
	inventory := ordered(t, `{"runtimes": [{"key": "21", "identity": "`+strings.Repeat("a", 64)+`"}, {"key": "22", "identity": "`+strings.Repeat("b", 64)+`"}]}`)
	h.core.answer("cleanup_inventory", inventory)
	res := h.doKey("wrong", "GET", "/runtime/cleanup", "")
	if res.Status != 401 || !res.Closed {
		t.Fatal(res.Status, res.Closed)
	}
	s, b := h.call("GET", "/runtime/cleanup", "")
	want(t, s, b, 200, string(pyjson.MustMarshal(inventory)))
	h.core.on("cleanup_runtimes", func(args []any) (any, error) {
		o, _ := args[0].(pyjson.Ordered)
		if !o.Has("candidates") {
			return nil, errs.New(errs.BadRequest, "invalid cleanup request")
		}
		return ordered(t, `{"results": [{"key": "22", "status": "deleted"}], "deleted": 1, "failed": 0}`), nil
	})
	s, b = h.call("POST", "/runtime/cleanup", "{}")
	want(t, s, b, 400, errBody("invalid_request"))
	s, b = h.call("POST", "/runtime/cleanup", `{"keep_keys": ["21"], "candidates": `+string(pyjson.MustMarshal(mustGet(inventory, "runtimes")))+`}`)
	want(t, s, b, 200, `{"results": [{"key": "22", "status": "deleted"}], "deleted": 1, "failed": 0}`)
}

func mustGet(o pyjson.Ordered, k string) any {
	v, _ := o.Get(k)
	return v
}

// covers: H5, R21, R1 (HandlerTests.test_cleanup_accepts_inventory_larger_than_normal_management_body)
func TestCleanupAcceptsInventoryLargerThanNormalManagementBody(t *testing.T) {
	h := newHarness(t, nil)
	var rows []string
	for i := 1000; i < 1800; i++ {
		rows = append(rows, fmt.Sprintf(`{"key": "%d", "identity": "%s"}`, i, strings.Repeat("a", 64)))
	}
	body := `{"keep_keys": [], "candidates": [` + strings.Join(rows, ", ") + `]}`
	if len(body) <= 64<<10 {
		t.Fatal(len(body))
	}
	h.core.on("cleanup_runtimes", func(args []any) (any, error) {
		o := args[0].(pyjson.Ordered)
		c, _ := o.Get("candidates")
		return pyjson.Ordered{{Key: "results", Value: []any{}}, {Key: "deleted", Value: 0}, {Key: "failed", Value: 0},
			{Key: "n", Value: len(c.([]any))}}, nil
	})
	s, b := h.call("POST", "/runtime/cleanup", body)
	want(t, s, b, 200, `{"results": [], "deleted": 0, "failed": 0, "n": 800}`)
	// Above 8 MiB it is refused before the cleanup sees it.
	res := h.do("POST", "/runtime/cleanup", "", hdr("Content-Length", fmt.Sprint(8<<20+1)))
	if res.Status != 400 || !res.Closed || h.core.count("cleanup_runtimes") != 1 {
		t.Fatal(res.Status, res.Closed)
	}
	h.core.answer("health", pyjson.Ordered{{Key: "version", Value: "abc123def456"}})
	s, b = h.call("GET", "/health", "")
	want(t, s, b, 200, `{"version": "abc123def456"}`)
	s, b = h.call("POST", "/health", "")
	want(t, s, b, 405, errBody("method_not_allowed"))
}

// covers: R2, R3 (HandlerTests.test_delete_and_list)
func TestDeleteAndList(t *testing.T) {
	h := newHarness(t, nil)
	h.core.answer("runtimes", &contract.RuntimeList{Runtimes: []contract.RuntimeRow{
		{Key: "9", Status: "ready", CreatedAt: "2026-11-01T00:00:00Z"}, {Key: draft, Status: "ready", CreatedAt: "2026-11-01T00:00:01Z"}}})
	s, b := h.call("GET", "/accounts", "")
	want(t, s, b, 200, `{"runtimes": [{"key": "9", "status": "ready", "created_at": "2026-11-01T00:00:00Z"}, `+
		`{"key": "`+draft+`", "status": "ready", "created_at": "2026-11-01T00:00:01Z"}]}`)
	h.core.on("delete", func(args []any) (any, error) {
		if args[0] != draft && args[1] != true {
			return nil, errs.New(errs.NotDraft, "only drafts can be deleted")
		}
		return &contract.DeleteResult{}, nil
	})
	s, b = h.call("DELETE", "/accounts/9", "")
	want(t, s, b, 405, errBody("method_not_allowed"))
	for i := 0; i < 2; i++ {
		s, b = h.call("DELETE", "/accounts/"+draft, "")
		want(t, s, b, 200, `{"deleted": true, "removed": {"containers": [], "networks": [], "volume": false}}`)
	}
	s, b = h.call("DELETE", "/accounts/9", "", hdr("X-CCG-Delete-Account", "8"))
	want(t, s, b, 405, errBody("method_not_allowed"))
	s, _ = h.call("DELETE", "/accounts/9", "", hdr("X-CCG-Delete-Account", "9"))
	if s != 200 {
		t.Fatal(s)
	}
	h.core.answer("runtimes", &contract.RuntimeList{})
	s, b = h.call("GET", "/accounts", "")
	want(t, s, b, 200, `{"runtimes": []}`)
}
