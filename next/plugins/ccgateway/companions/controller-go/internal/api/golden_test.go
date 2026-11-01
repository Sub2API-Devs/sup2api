package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
)

// The HTTP golden files (05-test-plan §6, 02 §8.5): python.json was
// recorded by companions/controller/differential_dump.py from the Python
// Handler over FakeDocker (removed on 2026-11-01, last in c2fe8834a; the
// file stays fixed); intended.json lists the deliberate differences
// (05 §8 BUG-11, BUG-12; the new egress recreate endpoint; net/http's own
// Content-Length parsing) with the answer Go must give instead.
const goldenDir = "../../testdata/http-golden"

type goldenFile struct {
	ControllerKey string       `json:"controller_key"`
	Cases         []goldenCase `json:"cases"`
}

type goldenCase struct {
	Name     string         `json:"name"`
	Request  string         `json:"request"`
	Calls    []goldenCall   `json:"calls"`
	Worker   *goldenWorker  `json:"worker"`
	Response goldenResponse `json:"response"`
	Intended *string        `json:"intended"`
}

type goldenCall struct {
	Call   string       `json:"call"`
	Args   string       `json:"args"`
	Result *string      `json:"result"`
	Error  *goldenError `json:"error"`
}

type goldenError struct {
	Type    string   `json:"type"`
	Message string   `json:"message"`
	Code    string   `json:"code"`
	Names   []string `json:"names"`
	Status  int      `json:"status"`
	Extra   string   `json:"extra"`
}

type goldenWorker struct {
	Request struct {
		Method  string            `json:"method"`
		Path    string            `json:"path"`
		Headers map[string]string `json:"headers"`
		Body    string            `json:"body"`
	} `json:"request"`
	Response *struct {
		Status  int               `json:"status"`
		Headers map[string]string `json:"headers"`
		Chunks  []string          `json:"chunks"`
		Error   string            `json:"error"`
	} `json:"response"`
}

type goldenResponse struct {
	Status  *int        `json:"status"`
	Reason  *string     `json:"reason"`
	Headers [][2]string `json:"headers"`
	Body    string      `json:"body"`
	Closed  bool        `json:"closed"`
}

// intendedCase is the Go answer of a deliberate difference.
type intendedCase struct {
	Why      string         `json:"why"`
	Calls    []goldenCall   `json:"calls"`
	Response goldenResponse `json:"response"`
}

// latin1 is the recording's byte encoding (Python's latin-1 decode).
func latin1(s string) []byte {
	out := make([]byte, 0, len(s))
	for _, r := range s {
		out = append(out, byte(r))
	}
	return out
}

func readGolden(t *testing.T) (*goldenFile, map[string]intendedCase) {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join(goldenDir, "python.json"))
	if err != nil {
		t.Fatal(err)
	}
	var g goldenFile
	if err := json.Unmarshal(raw, &g); err != nil {
		t.Fatal(err)
	}
	raw, err = os.ReadFile(filepath.Join(goldenDir, "intended.json"))
	if err != nil {
		t.Fatal(err)
	}
	var intended struct {
		Cases map[string]intendedCase `json:"cases"`
	}
	if err := json.Unmarshal(raw, &intended); err != nil {
		t.Fatal(err)
	}
	return &g, intended.Cases
}

// goldenErr turns a recorded Python exception into what the business
// packages return for it.
func goldenErr(t *testing.T, e *goldenError) error {
	kinds := map[string]errs.Kind{"BadRequest": errs.BadRequest, "InvalidImage": errs.InvalidImage,
		"RuntimeNotFound": errs.RuntimeNotFound, "NotDraft": errs.NotDraft, "InvalidCLIProfile": errs.InvalidCLIProfile,
		"UnsupportedContainer": errs.UnsupportedContainer, "UpgradeInProgress": errs.UpgradeInProgress,
		"ResourceInUse": errs.ResourceInUse, "OwnershipMismatch": errs.OwnershipMismatch,
		"ImagePullFailed": errs.ImagePullFailed, "DiskQuotaUnavailable": errs.DiskQuotaUnavailable,
		"ContainerChanged": errs.ContainerChanged, "RuntimeBusy": errs.RuntimeBusy, "ActivationFailed": errs.ActivationFailed}
	if e.Type == "UploadError" {
		ue := &contract.UploadError{Status: e.Status, Code: e.Code}
		if e.Extra != "" && e.Extra != "{}" {
			ue.Extra = ordered(t, e.Extra)
		}
		return ue
	}
	if k, ok := kinds[e.Type]; ok {
		return &errs.Error{Kind: k, Code: e.Code, Msg: e.Message, Names: e.Names}
	}
	return errors.New(e.Type + ": " + e.Message)
}

func decodeJSON(t *testing.T, s string) any {
	t.Helper()
	v, err := pyjson.Decode([]byte(s))
	if err != nil {
		t.Fatalf("%v: %s", err, s)
	}
	return v
}

func str(o pyjson.Ordered, k string) string {
	v, _ := o.Get(k)
	s, _ := v.(string)
	return s
}

func boolean(o pyjson.Ordered, k string) bool {
	v, _ := o.Get(k)
	b, _ := v.(bool)
	return b
}

func integer(o pyjson.Ordered, k string) int64 {
	v, _ := o.Get(k)
	n, _ := pyjson.IntOf(v)
	return n
}

func strList(o pyjson.Ordered, k string) []string {
	v, _ := o.Get(k)
	var out []string
	for _, x := range v.([]any) {
		out = append(out, x.(string))
	}
	return out
}

// goldenResult turns a recorded Python return value into the Go type the
// contract method returns. Typed answers are rebuilt from the dict so the
// comparison also checks the contract types' key order.
func goldenResult(t *testing.T, call, result string) any {
	t.Helper()
	v := decodeJSON(t, result)
	if v == nil {
		return nil
	}
	o, _ := v.(pyjson.Ordered)
	switch call {
	case "runtimes":
		l := &contract.RuntimeList{}
		for _, r := range mustGet(o, "runtimes").([]any) {
			row := r.(pyjson.Ordered)
			l.Runtimes = append(l.Runtimes, contract.RuntimeRow{Key: str(row, "key"), Status: str(row, "status"),
				CreatedAt: str(row, "created_at")})
		}
		return l
	case "delete":
		rm := mustGet(o, "removed").(pyjson.Ordered)
		return &contract.DeleteResult{Containers: strList(rm, "containers"), Networks: strList(rm, "networks"),
			Volume: boolean(rm, "volume")}
	case "apply":
		if str(o, "status") == "blocked" {
			return &contract.Blocked{AccountID: str(o, "account_id")}
		}
		return publicOf(o)
	case "public":
		return publicOf(o)
	case "connection":
		return &contract.Connection{AppIP: str(o, "app_ip"), Port: int(integer(o, "port")), APIKey: str(o, "api_key"),
			Revision: str(o, "revision")}
	case "shared.status":
		return &contract.EgressStatus{Ready: boolean(o, "ready")}
	case "ready_state":
		st, err := store.ParseAccountState([]byte(result))
		if err != nil {
			t.Fatal(err)
		}
		return st
	}
	return o
}

func publicOf(o pyjson.Ordered) *contract.Public {
	dq := mustGet(o, "disk_quota").(pyjson.Ordered)
	return &contract.Public{AccountID: str(o, "account_id"), Container: str(o, "container"), CLI: mustGet(o, "cli"),
		ActiveRuntime: mustGet(o, "active_runtime"), CurrentImage: str(o, "current_image"), TargetImage: str(o, "target_image"),
		ImageUpdateAvailable: boolean(o, "image_update_available"), TargetImageAvailable: boolean(o, "target_image_available"),
		EnvironmentPending: boolean(o, "environment_pending"),
		DiskQuota:          store.DiskQuota{LimitBytes: integer(dq, "limit_bytes"), Status: str(dq, "status")},
		Status:             str(o, "status"), Revision: str(o, "revision"), AuthMode: str(o, "auth_mode"),
		Network: mustGet(o, "network"), AppIP: str(o, "app_ip"), GatewayIP: str(o, "gateway_ip")}
}

// replayWorker serves one recorded Worker answer and keeps the request.
type replayWorker struct {
	mu   sync.Mutex
	seen *seenRequest
}

func startReplayWorker(t *testing.T, w *goldenWorker) (*workerServer, *replayWorker) {
	rw := &replayWorker{}
	ws := newWorker(t, func(resp http.ResponseWriter, r *http.Request) {
		plan := w.Response
		h := resp.Header()
		h["Content-Type"] = nil // no sniffing: Python's canned answer may have none
		h["Date"] = nil
		for k, v := range plan.Headers {
			h.Set(k, v)
		}
		resp.WriteHeader(plan.Status)
		for _, c := range plan.Chunks {
			resp.Write(latin1(c))
			resp.(http.Flusher).Flush()
		}
	})
	return ws, rw
}

func headerSet(hs [][2]string) []string {
	var out []string
	for _, h := range hs {
		name := strings.ToLower(h[0])
		if name == "date" || name == "server" {
			continue
		}
		out = append(out, name+": "+h[1])
	}
	sort.Strings(out)
	return out
}

// covers: H1-H12, R1-R23, T1-T3, T9-T13 (05 §6 HTTP golden: every
// recorded Python answer, byte for byte except Date/Server and header
// order; BUG-11/BUG-12 and the other deliberate differences against
// intended.json)
func TestHTTPGolden(t *testing.T) {
	g, intended := readGolden(t)
	if g.ControllerKey != testKey {
		t.Fatal(g.ControllerKey)
	}
	if len(g.Cases) < 60 {
		t.Fatalf("%d golden cases", len(g.Cases))
	}
	seenIntended := map[string]bool{}
	for _, c := range g.Cases {
		c := c
		wantResp, wantCalls := c.Response, c.Calls
		if c.Intended != nil {
			ic, ok := intended[c.Name]
			if !ok {
				t.Errorf("intended case %s (%s) missing from intended.json", c.Name, *c.Intended)
				continue
			}
			seenIntended[c.Name] = true
			wantResp, wantCalls = ic.Response, ic.Calls
		}
		t.Run(c.Name, func(t *testing.T) {
			t.Parallel()
			replayGolden(t, c, wantResp, wantCalls)
		})
	}
	for name := range intended {
		if !seenIntended[name] {
			t.Errorf("intended.json names %s, which python.json does not record as intended", name)
		}
	}
}

func replayGolden(t *testing.T, c goldenCase, wantResp goldenResponse, wantCalls []goldenCall) {
	var worker *workerServer
	var opts func(*Options)
	if c.Worker != nil {
		if c.Worker.Response == nil || c.Worker.Response.Error != "" {
			port := closedPort(t)
			opts = func(o *Options) { o.Worker = client(port) }
		} else {
			worker, _ = startReplayWorker(t, c.Worker)
			opts = func(o *Options) { o.Worker = client(worker.port()) }
		}
	}
	h := newHarness(t, func(o *Options) {
		if opts != nil {
			opts(o)
		}
		// The recorded upstream ports are gone: the tunnel connect fails (T3).
		o.Dial = func(network, addr string, timeout time.Duration) (net.Conn, error) {
			return nil, errors.New("connect refused (golden replay)")
		}
	})
	var mu sync.Mutex
	next := 0
	h.core.fallback = func(name string, args []any) (any, error) {
		mu.Lock()
		defer mu.Unlock()
		if next >= len(wantCalls) {
			return nil, fmt.Errorf("golden: unexpected call %s%v", name, args)
		}
		want := wantCalls[next]
		next++
		if want.Call != name {
			return nil, fmt.Errorf("golden: call %s, recorded %s", name, want.Call)
		}
		if want.Error != nil {
			return nil, goldenErr(t, want.Error)
		}
		if want.Result == nil {
			return nil, nil
		}
		return goldenResult(t, name, *want.Result), nil
	}
	raw := latin1(c.Request)
	res := doRaw(t, h.addr, raw, 300*time.Millisecond)

	// Calls into the business packages: names and JSON arguments.
	got := h.core.callList()
	if len(got) != len(wantCalls) {
		t.Fatalf("calls %v, recorded %d calls %+v", got, len(wantCalls), wantCalls)
	}
	for i, call := range got {
		args := call.Args
		if args == nil {
			args = []any{}
		}
		enc, err := pyjson.Marshal(args)
		if err != nil {
			t.Fatal(err)
		}
		if call.Name != wantCalls[i].Call || string(enc) != wantCalls[i].Args {
			t.Fatalf("call %d: %s %s, recorded %s %s", i, call.Name, enc, wantCalls[i].Call, wantCalls[i].Args)
		}
	}
	// The Worker request (pass-through).
	if worker != nil {
		reqs := worker.requests()
		if len(reqs) != 1 {
			t.Fatalf("%d Worker requests", len(reqs))
		}
		r, want := reqs[0], c.Worker.Request
		if r.Method != want.Method || r.Path != "/"+want.Path || string(r.Body) != string(latin1(want.Body)) {
			t.Fatalf("Worker request %s %s %q, recorded %s %s %q", r.Method, r.Path, r.Body, want.Method, want.Path, want.Body)
		}
		for k, v := range want.Headers {
			if r.Header.Get(k) != v {
				t.Fatalf("Worker header %s %q, recorded %q", k, r.Header.Get(k), v)
			}
		}
	}
	// The answer.
	if wantResp.Status == nil {
		if !res.Missing {
			t.Fatalf("answered %d, recorded no answer", res.Status)
		}
		return
	}
	if res.Missing || res.Status != *wantResp.Status {
		t.Fatalf("status %d (missing=%v), recorded %d", res.Status, res.Missing, *wantResp.Status)
	}
	if wantResp.Reason != nil && res.Reason != *wantResp.Reason {
		t.Fatalf("reason %q, recorded %q", res.Reason, *wantResp.Reason)
	}
	if gh, wh := headerSet(res.Header), headerSet(wantResp.Headers); strings.Join(gh, "\n") != strings.Join(wh, "\n") {
		t.Fatalf("headers\n%s\nrecorded\n%s", strings.Join(gh, "\n"), strings.Join(wh, "\n"))
	}
	if string(res.Body) != string(latin1(wantResp.Body)) {
		t.Fatalf("body %q\nrecorded %q", res.Body, wantResp.Body)
	}
	if res.Closed != wantResp.Closed {
		t.Fatalf("closed %v, recorded %v", res.Closed, wantResp.Closed)
	}
	_ = io.EOF
}
