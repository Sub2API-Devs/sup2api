package api

import (
	"strings"
	"testing"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/pyjson"
)

// workerHarness: UpdateWorker/UpdatePair behave like worker_update's input
// checks (single_image) for the HTTP cases of WorkerHandlerTests.
func workerHarness(t *testing.T) *harness {
	h := newHarness(t, nil)
	h.core.on("update_worker", func(args []any) (any, error) {
		o, ok := args[1].(pyjson.Ordered)
		ref, _ := o.Get("image")
		s, isStr := ref.(string)
		if !ok || len(o) != 1 || !isStr || strings.ToLower(s) != s {
			return nil, errs.New(errs.BadRequest, "invalid image reference")
		}
		switch s {
		case "app:empty":
			return nil, errs.New(errs.InvalidImage, "image has no worker program")
		case "ghcr.io/x/missing:1":
			return nil, errs.New(errs.ImagePullFailed, "manifest unknown")
		}
		if args[0] == "22" {
			return nil, errs.New(errs.RuntimeNotFound, "no app container")
		}
		return ordered(t, `{"status": "updated", "sha256": "`+strings.Repeat("e", 64)+`", "previous_sha256": "`+
			strings.Repeat("f", 64)+`", "path": "/usr/local/bin/ccgateway-worker", "online": true}`), nil
	})
	return h
}

// covers: R9, H5, W13 (WorkerHandlerTests.test_http)
func TestWorkerHTTP(t *testing.T) {
	h := workerHarness(t)
	path := "/accounts/21/worker"
	res := h.do("GET", path, "")
	if res.Status != 405 || string(res.Body) != errBody("method_not_allowed") || !res.Closed {
		t.Fatal(res.Status, string(res.Body), res.Closed)
	}
	for _, body := range []string{"not json", "{}", `{"image": "app:new", "x": 1}`, `{"image": "App:New"}`, "[]", `{"image": 7}`} {
		s, b := h.call("POST", path, body)
		want(t, s, b, 400, errBody("invalid_request"))
	}
	if n := h.core.count("update_worker"); n != 5 {
		t.Fatalf("the non-JSON body must not reach UpdateWorker: %d calls", n)
	}
	s, b := h.call("POST", path, `{"image":"`+strings.Repeat("a", 64<<10)+`"}`)
	want(t, s, b, 400, errBody("invalid_request"))
	s, b = h.call("POST", path, `{"image": "app:empty"}`)
	want(t, s, b, 400, errBody("invalid_image"))
	s, b = h.call("POST", path, `{"image": "ghcr.io/x/missing:1"}`)
	want(t, s, b, 503, errBody("image_pull_failed"))
	s, b = h.call("POST", "/accounts/22/worker", `{"image": "app:new"}`)
	want(t, s, b, 404, errBody("not_found"))
	res = h.do("POST", path, `{"image": "app:new"}`)
	want(t, res.Status, string(res.Body), 200, `{"status": "updated", "sha256": "`+strings.Repeat("e", 64)+
		`", "previous_sha256": "`+strings.Repeat("f", 64)+`", "path": "/usr/local/bin/ccgateway-worker", "online": true}`)
	if res.Closed {
		t.Fatal("a successful worker update keeps the connection (H8)")
	}
	// A body with "components" is the paired activation.
	h.core.answer("update_runtime", ordered(t, `{"status": "unchanged", "cli_version": "2.1.312"}`))
	s, b = h.call("POST", path, `{"image": "app:new", "components": ["worker", "cli"], "cli_version": "2.1.312"}`)
	want(t, s, b, 200, `{"status": "unchanged", "cli_version": "2.1.312"}`)
	if args := h.core.last("update_runtime"); args[0] != "21" {
		t.Fatal(args)
	}
	// "components" inside a list is not a dict key: the plain update.
	before := h.core.count("update_runtime")
	h.call("POST", path, `["components"]`)
	if h.core.count("update_runtime") != before {
		t.Fatal("a list went to the paired update")
	}
}

// covers: R9, H10, W3, W12 (WorkerHandlerTests.test_http_errors)
func TestWorkerHTTPErrors(t *testing.T) {
	h := newHarness(t, nil)
	path := "/accounts/21/worker"
	h.core.failWith("update_worker", errs.New(errs.UnsupportedContainer, "worker program not found"))
	s, b := h.call("POST", path, `{"image": "app:new"}`)
	want(t, s, b, 409, errBody("unsupported_container"))
	h.core.failWith("update_worker", errs.New(errs.ContainerChanged, "container changed"))
	s, b = h.call("POST", path, `{"image": "app:new"}`)
	want(t, s, b, 503, errBody("container_changed"))
	h.core.failWith("update_worker", errs.Wrap(errs.BadRequest, "x", nil))
	s, b = h.call("POST", path, `{"image": "app:new"}`)
	want(t, s, b, 400, errBody("invalid_request"))
	// Not in WORKER_ERRORS: unnamed.
	for _, err := range []error{errs.New(errs.ActivationFailed, "egress"), errs.Mismatch("ccg-21-app"),
		errs.New(errs.UpgradeInProgress, "upgrade")} {
		h.core.failWith("update_worker", err)
		res := h.do("POST", path, `{"image": "app:new"}`)
		if res.Status != 503 || string(res.Body) != errBody("runtime_unavailable") || !res.Closed {
			t.Fatal(err, res.Status, string(res.Body))
		}
	}
	if !strings.Contains(h.log.String(), "POST key=21 path=worker -> 503 runtime_unavailable: OwnershipMismatch") {
		t.Fatal(h.log.String())
	}
}
