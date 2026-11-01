// Package api is the guard's HTTP service (03 §3): authentication,
// routing, request limits, error mapping, per-account locks and the 31
// endpoint handlers. Every Docker create body comes from package policy.
package api

import (
	"context"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net"
	"net/http"
	"net/netip"
	"os"
	"strings"
	"sync"
	"time"

	"ccgateway/guard/internal/apierr"
	"ccgateway/guard/internal/config"
	"ccgateway/guard/internal/controller"
	"ccgateway/guard/internal/dockerapi"
	"ccgateway/guard/internal/gateway"
	"ccgateway/guard/internal/names"
	"ccgateway/guard/internal/obs"
)

// RuntimeFiles are the mount sources (files.Runtime; a memory fake in
// tests).
type RuntimeFiles interface {
	WriteResolv(aid string, data []byte) (replaced bool, err error)
	VerifyResolv(aid string) error
	WriteAppNFT(aid string, data []byte) error
	WriteGatewayFile(name string, data []byte) error
	EnsureGatewayDir() error
	VerifyGatewayDir() error
}

// StateFiles hold image load spools (files.State).
type StateFiles interface {
	CreateLoad() (*os.File, string, error)
	RemoveLoad(name string) error
	FreeBytes() (uint64, error)
}

// Firewall is the part of firewall.Engine the API notifies.
type Firewall interface {
	Recompute(reason string, aids ...string)
	InvalidateRoute(aid string)
	Status() string
}

// ControlState reports whether .2 is the compose controller.
type ControlState interface{ ControllerOK() bool }

// Server is the API.
type Server struct {
	Cfg      *config.Config
	D        *dockerapi.Client
	Files    RuntimeFiles
	State    StateFiles
	FW       Firewall
	Control  ControlState
	Gateway  *gateway.Manager
	Upgrader *controller.Upgrader
	Log      *obs.Logger
	Version  string
	// DockerVersion is the daemon version read at startup.
	DockerVersion string
	// HostRoutes returns the host's non-default routes (/proc/net/route).
	HostRoutes func() ([]netip.Prefix, error)
	// Timeouts (tests shorten them).
	ExecTimeout   time.Duration // 110 s
	JobTimeout    time.Duration // 120 s
	HelperTimeout time.Duration // 30 s
	LockWait      time.Duration // 30 s
	IdleTimeout   time.Duration // 120 s

	n         names.Names
	locks     *KeyedMutex
	netAlloc  sync.Mutex
	sem       chan struct{}
	streamSem chan struct{}
	loadSem   chan struct{}
	starting  bool
	smu       sync.RWMutex
	routes    []route
	once      sync.Once
}

func (s *Server) init() {
	s.once.Do(func() {
		s.n = s.Cfg.Names()
		s.locks = NewKeyedMutex()
		s.sem = make(chan struct{}, 32)
		s.streamSem = make(chan struct{}, 4)
		s.loadSem = make(chan struct{}, 1)
		if s.Log == nil {
			s.Log = obs.Discard()
		}
		def := func(d *time.Duration, v time.Duration) {
			if *d == 0 {
				*d = v
			}
		}
		def(&s.ExecTimeout, 110*time.Second)
		def(&s.JobTimeout, 120*time.Second)
		def(&s.HelperTimeout, 30*time.Second)
		def(&s.LockWait, 30*time.Second)
		def(&s.IdleTimeout, 120*time.Second)
		s.routes = s.table()
	})
}

// SetStarting toggles 503 unavailable/starting for every route but health.
func (s *Server) SetStarting(v bool) {
	s.smu.Lock()
	s.starting = v
	s.smu.Unlock()
}

func (s *Server) isStarting() bool {
	s.smu.RLock()
	defer s.smu.RUnlock()
	return s.starting
}

type handler func(w http.ResponseWriter, r *http.Request, p params) error

type route struct {
	method      string
	pattern     string
	segs        []string
	query       []string
	stream      bool
	load        bool
	noUnguarded bool // health: no controller identity check
	h           handler
}

type params struct {
	vals  map[string]string
	route string
}

func (p params) get(k string) string { return p.vals[k] }

func (s *Server) table() []route {
	r := func(method, pattern string, h handler, query ...string) route {
		return route{method: method, pattern: pattern, segs: strings.Split(strings.Trim(pattern, "/"), "/"), query: query, h: h}
	}
	stream := func(rt route) route { rt.stream = true; return rt }
	health := r("GET", "/v1/health", s.health)
	health.noUnguarded = true
	load := stream(r("POST", "/v1/images/load", s.imageLoad))
	load.load = true
	return []route{
		health,
		r("GET", "/v1/subnets", s.subnets),
		r("GET", "/v1/inventory", s.inventory),
		r("GET", "/v1/images/inspect", s.imageInspect, "ref"),
		r("POST", "/v1/images/pull", s.imagePull),
		load,
		stream(r("GET", "/v1/images/file", s.imageFile, "ref", "path", "limit")),
		r("GET", "/v1/accounts/{aid}", s.account, "fields"),
		r("PUT", "/v1/accounts/{aid}/network", s.putNetwork),
		r("DELETE", "/v1/accounts/{aid}/network", s.deleteNetwork, "role"),
		r("PUT", "/v1/accounts/{aid}/volume", s.putVolume),
		r("DELETE", "/v1/accounts/{aid}/volume", s.deleteVolume),
		r("PUT", "/v1/accounts/{aid}/app", s.putApp),
		r("POST", "/v1/accounts/{aid}/app/exec", s.appExec),
		r("POST", "/v1/accounts/{aid}/app/{action}", s.appAction),
		r("DELETE", "/v1/accounts/{aid}/containers/{suffix}", s.deleteContainer),
		stream(r("GET", "/v1/accounts/{aid}/app/archive", s.archiveGet, "path")),
		stream(r("PUT", "/v1/accounts/{aid}/app/archive", s.archivePut, "path")),
		r("GET", "/v1/accounts/{aid}/app/top", s.appTop),
		r("PUT", "/v1/accounts/{aid}/resolv", s.putResolv),
		r("PUT", "/v1/accounts/{aid}/firewall", s.putFirewall),
		r("POST", "/v1/accounts/{aid}/jobs", s.runJob),
		r("GET", "/v1/gateway", s.getGateway),
		r("POST", "/v1/gateway/ensure", s.ensureGateway),
		r("POST", "/v1/gateway/recreate", s.recreateGateway),
		r("POST", "/v1/gateway/exec", s.gatewayExec),
		r("PUT", "/v1/gateway/networks/{aid}", s.connectGateway),
		r("DELETE", "/v1/gateway/networks/{aid}", s.disconnectGateway),
		r("PUT", "/v1/gateway/files/{name}", s.gatewayFile),
		r("POST", "/v1/controller/upgrade", s.startUpgrade),
		r("GET", "/v1/controller/upgrade", s.upgradeStatus),
	}
}

// Routes lists "METHOD pattern" of every endpoint (tests).
func (s *Server) Routes() []string {
	s.init()
	out := make([]string, len(s.routes))
	for i, r := range s.routes {
		out[i] = r.method + " " + r.pattern
	}
	return out
}

func match(segs []string, path string) (map[string]string, bool) {
	parts := strings.Split(strings.TrimPrefix(path, "/"), "/")
	if len(parts) != len(segs) {
		return nil, false
	}
	vals := map[string]string{}
	for i, seg := range segs {
		if strings.HasPrefix(seg, "{") {
			if parts[i] == "" {
				return nil, false
			}
			vals[strings.Trim(seg, "{}")] = parts[i]
			continue
		}
		if seg != parts[i] {
			return nil, false
		}
	}
	return vals, true
}

// recorder captures the answer for the request log.
type recorder struct {
	http.ResponseWriter
	status int
	reason string
	wrote  bool
}

func (r *recorder) WriteHeader(code int) {
	if !r.wrote {
		r.status, r.wrote = code, true
	}
	r.ResponseWriter.WriteHeader(code)
}

func (r *recorder) Write(b []byte) (int, error) {
	if !r.wrote {
		r.status, r.wrote = 200, true
	}
	return r.ResponseWriter.Write(b)
}

func (r *recorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }

// Handler is the whole HTTP handler.
func (s *Server) Handler() http.Handler {
	s.init()
	return http.HandlerFunc(s.serve)
}

func (s *Server) serve(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	rec := &recorder{ResponseWriter: w, status: 200}
	p := params{route: "unmatched"}
	aidLog := ""
	defer func() {
		f := obs.Fields{"method": r.Method, "route": p.route, "status": rec.status, "ms": time.Since(start).Milliseconds()}
		if aidLog != "" {
			f["aid"] = aidLog
		}
		if rec.reason != "" {
			f["reason"] = rec.reason
		}
		if p.route == "/v1/accounts/{aid}/app/archive" {
			if v := r.URL.Query().Get("path"); v != "" {
				f["path"] = obs.Truncate(v, 256)
			}
		}
		s.Log.Info("request", f)
	}()
	if !s.authorized(r) {
		s.writeErr(rec, apierr.ErrUnauthorized)
		return
	}
	var rt *route
	pathMatched := false
	for i := range s.routes {
		vals, ok := match(s.routes[i].segs, r.URL.Path)
		if !ok {
			continue
		}
		pathMatched = true
		if s.routes[i].method == r.Method {
			rt = &s.routes[i]
			p.vals = vals
			break
		}
	}
	if rt == nil {
		if pathMatched {
			s.writeErr(rec, apierr.ErrMethod)
		} else {
			s.writeErr(rec, apierr.NotFound("", "no such endpoint"))
		}
		return
	}
	p.route = rt.pattern
	if !rt.noUnguarded {
		if !s.Control.ControllerOK() {
			s.Log.Inc("controller_unguarded")
			s.writeErr(rec, apierr.ErrUnguarded)
			return
		}
		if s.isStarting() {
			s.writeErr(rec, apierr.ErrStarting)
			return
		}
	}
	if aid, ok := p.vals["aid"]; ok {
		if !names.ValidKey(aid) {
			s.writeErr(rec, apierr.Invalid("invalid account key"))
			return
		}
		aidLog = aid
	}
	if err := checkQuery(r, rt.query); err != nil {
		s.writeErr(rec, err)
		return
	}
	sem := s.sem
	if rt.stream {
		sem = s.streamSem
	}
	select {
	case sem <- struct{}{}:
		defer func() { <-sem }()
	default:
		s.writeErr(rec, apierr.ErrBusy)
		return
	}
	if rt.load {
		select {
		case s.loadSem <- struct{}{}:
			defer func() { <-s.loadSem }()
		default:
			s.writeErr(rec, apierr.ErrBusy)
			return
		}
	}
	if err := rt.h(rec, r, p); err != nil {
		if rec.wrote {
			panic(http.ErrAbortHandler)
		}
		s.writeErr(rec, err)
	}
}

func checkQuery(r *http.Request, allowed []string) error {
	q, err := urlQuery(r)
	if err != nil {
		return apierr.Invalid("invalid query")
	}
	for k, v := range q {
		ok := false
		for _, a := range allowed {
			if a == k {
				ok = true
			}
		}
		if !ok {
			return apierr.Invalid("unknown query parameter")
		}
		if len(v) != 1 {
			return apierr.Invalid("repeated query parameter")
		}
	}
	return nil
}

func urlQuery(r *http.Request) (map[string][]string, error) {
	return parseQuery(r.URL.RawQuery)
}

// authorized is §3.2 items 1 and 2: source address and bearer token.
func (s *Server) authorized(r *http.Request) bool {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return false
	}
	ip, err := netip.ParseAddr(host)
	if err != nil || ip.Unmap() != s.Cfg.ControllerIP {
		return false
	}
	vals := r.Header.Values("Authorization")
	if len(vals) != 1 {
		return false
	}
	tok, ok := strings.CutPrefix(vals[0], "Bearer ")
	if !ok || len(tok) != 64 {
		return false
	}
	for i := 0; i < len(tok); i++ {
		c := tok[i]
		if !(c >= '0' && c <= '9' || c >= 'a' && c <= 'f') {
			return false
		}
	}
	b, err := hex.DecodeString(tok)
	if err != nil || !s.Cfg.HasToken {
		return false
	}
	return subtle.ConstantTimeCompare(b, s.Cfg.Token[:]) == 1
}

func (s *Server) writeErr(w http.ResponseWriter, err error) {
	e, ok := apierr.As(err)
	if !ok {
		s.Log.Error("internal_error", obs.Fields{"type": errKind(err)})
		e = apierr.ErrInternal
	}
	if rec, ok := w.(*recorder); ok {
		rec.reason = e.Reason
	}
	writeJSON(w, e.Status, ErrorBody{Error: e.Code, Reason: e.Reason, Message: e.Message, Names: e.Names})
}

func errKind(err error) string {
	var de *dockerapi.Error
	switch {
	case errors.As(err, &de):
		return "docker"
	case errors.Is(err, context.DeadlineExceeded):
		return "timeout"
	case errors.Is(err, context.Canceled):
		return "canceled"
	}
	return "error"
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	b, err := json.Marshal(v)
	if err != nil {
		status, b = 502, []byte(`{"error":"docker_error","message":"encode failed"}`)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(append(b, '\n'))
}

func noContent(w http.ResponseWriter) error {
	w.WriteHeader(http.StatusNoContent)
	return nil
}

// decode reads one JSON object (03 §3.3): application/json, ≤ 1 MiB, no
// unknown fields, nothing after it. optional accepts an empty body.
func decode(r *http.Request, v any, optional bool) error {
	if optional && r.ContentLength == 0 {
		return nil
	}
	mt, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mt != "application/json" {
		return apierr.Invalid("content type must be application/json")
	}
	if r.ContentLength > 1<<20 {
		return apierr.TooLarge("request body too large")
	}
	body := io.LimitReader(r.Body, 1<<20+1)
	data, err := io.ReadAll(body)
	if err != nil {
		return apierr.Invalid("cannot read body")
	}
	if len(data) > 1<<20 {
		return apierr.TooLarge("request body too large")
	}
	dec := json.NewDecoder(strings.NewReader(string(data)))
	dec.DisallowUnknownFields()
	dec.UseNumber()
	if err := dec.Decode(v); err != nil {
		return apierr.Invalid("invalid JSON body")
	}
	if dec.More() {
		return apierr.Invalid("trailing data after JSON body")
	}
	if _, err := dec.Token(); err != io.EOF {
		return apierr.Invalid("trailing data after JSON body")
	}
	return nil
}

// rawBody checks Content-Length and type of a byte stream body.
func rawBody(r *http.Request, max int64, types ...string) (int64, error) {
	if len(r.TransferEncoding) > 0 || r.ContentLength < 0 {
		return 0, apierr.Invalid("Content-Length is required")
	}
	if r.ContentLength > max {
		return 0, apierr.TooLarge("request body too large")
	}
	mt, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	ok := false
	for _, t := range types {
		if err == nil && mt == t {
			ok = true
		}
	}
	if !ok {
		return 0, apierr.Invalid("unsupported content type")
	}
	return r.ContentLength, nil
}

// lock takes the per-key lock with the 30 s wait.
func (s *Server) lock(ctx context.Context, key string) (func(), error) {
	ctx, cancel := context.WithTimeout(ctx, s.LockWait)
	defer cancel()
	unlock, err := s.locks.Lock(ctx, key)
	if err != nil {
		return nil, apierr.ErrLockTimeout
	}
	return unlock, nil
}

// Lock implements gateway.Locks.
func (s *Server) Lock(ctx context.Context, key string) (func(), error) {
	s.init()
	return s.lock(ctx, key)
}

// KeyedMutex is a lock per key with a context-bounded wait.
type KeyedMutex struct {
	mu sync.Mutex
	m  map[string]chan struct{}
}

// NewKeyedMutex returns an empty KeyedMutex.
func NewKeyedMutex() *KeyedMutex { return &KeyedMutex{m: map[string]chan struct{}{}} }

// Lock waits for key until ctx ends.
func (k *KeyedMutex) Lock(ctx context.Context, key string) (func(), error) {
	k.mu.Lock()
	ch, ok := k.m[key]
	if !ok {
		ch = make(chan struct{}, 1)
		k.m[key] = ch
	}
	k.mu.Unlock()
	select {
	case ch <- struct{}{}:
		return func() { <-ch }, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}
