package fakeguard

import (
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"

	"ccgateway/controller/internal/guardapi"
)

// Call is one recorded guard request.
type Call struct {
	Method string
	Route  string // template, e.g. "PUT /v1/accounts/{aid}/app"
	Path   string // the request path
	Query  string
	AID    string
	Body   []byte // JSON bodies only (raw bodies are not kept)
}

// Calls returns every recorded call in order.
func (g *Guard) Calls() []Call {
	g.hooksMu.Lock()
	defer g.hooksMu.Unlock()
	return append([]Call(nil), g.calls...)
}

// Routes is the route template of every call, in order.
func (g *Guard) Routes() []string {
	var out []string
	for _, c := range g.Calls() {
		out = append(out, c.Route)
	}
	return out
}

// CallsTo are the calls of one route template.
func (g *Guard) CallsTo(route string) []Call {
	var out []Call
	for _, c := range g.Calls() {
		if c.Route == route {
			out = append(out, c)
		}
	}
	return out
}

// Count is the number of calls of a route template.
func (g *Guard) Count(route string) int { return len(g.CallsTo(route)) }

// ResetCalls forgets the recorded calls.
func (g *Guard) ResetCalls() {
	g.hooksMu.Lock()
	defer g.hooksMu.Unlock()
	g.calls = nil
}

func (g *Guard) record(c Call) {
	g.hooksMu.Lock()
	defer g.hooksMu.Unlock()
	g.calls = append(g.calls, c)
}

// Fault is an injected failure.
type Fault struct {
	// Nth is the first matching call that fails (1 = the next one).
	Nth int
	// Times is how many consecutive matching calls fail from Nth on (0 = 1).
	Times int
	// AID restricts the fault to one account ("" = any).
	AID string
	// Status, Code, Reason, Message, Names form the error answer. Status 0
	// is a transport failure (connection reset) instead of an answer.
	Status  int
	Code    string
	Reason  string
	Message string
	Names   []string
}

type faultRule struct {
	route string
	f     Fault
	seen  int
}

// Fail registers a fault for a route template ("*" matches every route).
func (g *Guard) Fail(route string, f Fault) {
	if f.Nth < 1 {
		f.Nth = 1
	}
	if f.Times < 1 {
		f.Times = 1
	}
	g.hooksMu.Lock()
	defer g.hooksMu.Unlock()
	g.faults = append(g.faults, &faultRule{route: route, f: f})
}

// ClearFaults removes every fault.
func (g *Guard) ClearFaults() {
	g.hooksMu.Lock()
	defer g.hooksMu.Unlock()
	g.faults = nil
}

func (g *Guard) fault(route, aid string) *Fault {
	g.hooksMu.Lock()
	defer g.hooksMu.Unlock()
	for _, r := range g.faults {
		if r.f.Status == 0 || (r.route != route && r.route != "*") || (r.f.AID != "" && r.f.AID != aid) {
			continue
		}
		r.seen++
		if r.seen >= r.f.Nth && r.seen < r.f.Nth+r.f.Times {
			f := r.f
			return &f
		}
	}
	return nil
}

type execHook struct {
	target string // "app:<aid>", "app:*", "gateway"
	prefix []string
	fn     func(argv []string, user string) (int, []byte)
}

// OnExec answers execs whose argv starts with prefix in target ("app:<aid>",
// "app:*" or "gateway"). The latest matching hook wins. An output over 16
// MiB answers 502 output_too_large; see ExitTimeout and ExitStartFailed.
func (g *Guard) OnExec(target string, prefix []string, fn func(argv []string, user string) (int, []byte)) {
	g.hooksMu.Lock()
	defer g.hooksMu.Unlock()
	g.execHooks = append(g.execHooks, execHook{target: target, prefix: append([]string(nil), prefix...), fn: fn})
}

// ExecReply is a hook answering a fixed result.
func ExecReply(code int, output string) func([]string, string) (int, []byte) {
	return func([]string, string) (int, []byte) { return code, []byte(output) }
}

func (g *Guard) execHook(target string, argv []string) func([]string, string) (int, []byte) {
	g.hooksMu.Lock()
	defer g.hooksMu.Unlock()
	for i := len(g.execHooks) - 1; i >= 0; i-- {
		h := g.execHooks[i]
		if h.target != target && !(h.target == "app:*" && strings.HasPrefix(target, "app:")) {
			continue
		}
		if len(argv) < len(h.prefix) {
			continue
		}
		match := true
		for j, p := range h.prefix {
			if argv[j] != p {
				match = false
				break
			}
		}
		if match {
			return h.fn
		}
	}
	return nil
}

// Special exit codes of OnExec, OnJob and OnFirewall hooks (a real exit
// code is never negative).
const (
	// ExitStartFailed: the container could not run. A job answers 502
	// job_failed, the firewall helper 502 helper_failed, an exec 502
	// docker_error. Any other negative code means the same.
	ExitStartFailed = -1
	// ExitTimeout: the guard's time limit passed. An exec answers 504
	// timeout/exec_timeout, a job and the firewall helper 504
	// timeout/job_timeout.
	ExitTimeout = -2
)

// OnJob answers every job (exit code, stdout). A stdout over 64 KiB
// answers 502 output_too_large; see ExitTimeout and ExitStartFailed.
func (g *Guard) OnJob(fn func(aid string, job guardapi.Job) (int, []byte)) {
	g.hooksMu.Lock()
	defer g.hooksMu.Unlock()
	g.jobHook = fn
}

// OnFirewall answers the firewall helper of PUT firewall: its exit code
// (default 0). Non-zero answers 502 helper_failed; see ExitTimeout. The
// rules are recorded (Firewall) before the helper runs, as the guard writes
// app.nft first.
func (g *Guard) OnFirewall(fn func(aid string, rec FirewallRecord) int) {
	g.hooksMu.Lock()
	defer g.hooksMu.Unlock()
	g.firewallHook = fn
}

// OnLoad answers image loads after the guard's archive checks: it gets the
// archive bytes (decompressed if gzip) and returns what Docker loaded. A
// returned tag the archive does not name answers 502 load_failed, as does
// an error that is not a guard answer. The loaded images become local.
func (g *Guard) OnLoad(fn func(data []byte) ([]guardapi.LoadedImage, error)) {
	g.hooksMu.Lock()
	defer g.hooksMu.Unlock()
	g.loadHook = fn
}

// Handler serves the guard API.
func (g *Guard) Handler() http.Handler { return http.HandlerFunc(g.serve) }

// Transport is an in-process http.RoundTripper to the fake (with transport faults).
func (g *Guard) Transport() http.RoundTripper { return roundTripper{g} }

type roundTripper struct{ g *Guard }

// errReset is the transport failure of a Status 0 fault.
var errReset = &net.OpError{Op: "read", Net: "tcp", Err: errors.New("connection reset by peer")}

func (rt roundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if err := req.Context().Err(); err != nil {
		return nil, err
	}
	route, aid := routeOf(req.Method, req.URL.Path, req.URL.Query().Get("fields"))
	if f := rt.g.peekTransportFault(route, aid); f {
		if req.Body != nil {
			req.Body.Close()
		}
		return nil, errReset
	}
	rec := httptest.NewRecorder()
	rt.g.serve(rec, req)
	resp := rec.Result()
	resp.Request = req
	return resp, nil
}

// peekTransportFault consumes a Status 0 fault of route.
func (g *Guard) peekTransportFault(route, aid string) bool {
	g.hooksMu.Lock()
	defer g.hooksMu.Unlock()
	for _, r := range g.faults {
		if r.f.Status != 0 || (r.route != route && r.route != "*") || (r.f.AID != "" && r.f.AID != aid) {
			continue
		}
		r.seen++
		if r.seen >= r.f.Nth && r.seen < r.f.Nth+r.f.Times {
			return true
		}
	}
	return false
}

// Client is a guardapi.Client wired to the fake in process.
func (g *Guard) Client(opts ...guardapi.Option) *guardapi.HTTPClient {
	c, err := guardapi.New("http://172.29.255.1:8790", g.token, append([]guardapi.Option{guardapi.WithTransport(g.Transport())}, opts...)...)
	if err != nil {
		panic(err)
	}
	return c
}

// Server serves the fake on a loopback listener (for tests of real sockets).
func (g *Guard) Server() *httptest.Server { return httptest.NewServer(g.Handler()) }
