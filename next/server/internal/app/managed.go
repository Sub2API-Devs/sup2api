package app

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	runtimecontract "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
)

// managedCore owns a single, non-resumable process lifetime. Drain shuts down
// the business runtime completely; only the private control socket survives.
// A supervisor must start a new boot ID to serve again after draining.
type managedCore struct {
	opMu           sync.Mutex // serialize startup/admission against drain and teardown
	mu             sync.Mutex
	hello          runtimecontract.Hello
	token          string
	mode           string
	prepare        runtimecontract.PrepareRequest
	admission      runtimecontract.Admission
	gate           *requestGate
	start          func() error
	cancel         context.CancelFunc
	validate       func(context.Context, runtimecontract.Admission) error
	liveValidate   func(context.Context, runtimecontract.Admission) error
	check          func(context.Context) (string, error)
	active         func() int64
	failure        string
	schemaContract string
	shutdown       chan struct{}
	shutdownOnce   sync.Once
}

func (m *managedCore) backgroundAllowed() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.mode == "serving" && m.admission.ClaimBackground
}
func (m *managedCore) bootstrapAllowed() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.prepare.Bootstrap && (m.mode == "preparing" || m.mode == "prepared")
}

func (m *managedCore) coordinateAllowed() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	// The explicit first-install permit includes bringing bundled plugins
	// through their rollout before traffic admission. Requiring serving here
	// would deadlock: readiness waits for rollout, admission waits for readiness.
	// This exception does not admit HTTP, jobs or asynchronous task claims.
	if (m.prepare.Bootstrap || m.prepare.CoordinatePlugins) && (m.mode == "preparing" || m.mode == "prepared") {
		return true
	}
	return m.mode == "serving" && m.admission.CoordinatePlugins
}

func (m *managedCore) status(ctx context.Context) runtimecontract.Status {
	m.mu.Lock()
	s := runtimecontract.Status{Hello: m.hello, Mode: m.mode, DrainComplete: m.mode == "drained"}
	s.SchemaContract = m.schemaContract
	if m.mode == "draining" {
		s.PendingUsageWrites = -1
		s.Blockers = append(s.Blockers, "waiting for HTTP, usage and plugin shutdown barriers")
	}
	check, active, gate, failure := m.check, m.active, m.gate, m.failure
	s.Ready = m.mode == "serving" && m.admission.ServeHTTP
	m.mu.Unlock()
	if gate != nil {
		s.ActiveHTTP = gate.count()
	}
	if active != nil {
		s.ActiveBackground = active()
	}
	if failure != "" {
		s.Blockers = append(s.Blockers, failure)
	}
	if (s.Mode == "prepared" || s.Mode == "serving") && check != nil {
		rev, err := check(ctx)
		s.PluginRevision = rev
		if err != nil {
			s.Ready = false
			s.Blockers = append(s.Blockers, err.Error())
		}
	}
	return s
}

func (m *managedCore) handler(begin func(runtimecontract.PrepareRequest)) http.Handler {
	mux := http.NewServeMux()
	write := func(w http.ResponseWriter, status int, v any) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(v)
	}
	decode := func(w http.ResponseWriter, r *http.Request, v any) bool {
		d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10))
		d.DisallowUnknownFields()
		if err := d.Decode(v); err != nil {
			http.Error(w, "invalid control request", http.StatusBadRequest)
			return false
		}
		return true
	}
	mux.HandleFunc("GET "+runtimecontract.HelloPath, func(w http.ResponseWriter, r *http.Request) { write(w, 200, m.hello) })
	mux.HandleFunc("GET "+runtimecontract.StatusPath, func(w http.ResponseWriter, r *http.Request) { write(w, 200, m.status(r.Context())) })
	mux.HandleFunc("POST "+runtimecontract.PreparePath, func(w http.ResponseWriter, r *http.Request) {
		var p runtimecontract.PrepareRequest
		if !decode(w, r, &p) {
			return
		}
		m.mu.Lock()
		if p.BootID != m.hello.BootID || p.ReleaseDigest != m.hello.ReleaseDigest {
			m.mu.Unlock()
			http.Error(w, "core identity mismatch", 409)
			return
		}
		if m.mode != "candidate" {
			ok := p == m.prepare && (m.mode == "preparing" || m.mode == "prepared" || m.mode == "serving")
			m.mu.Unlock()
			if !ok {
				http.Error(w, "prepare cannot change this boot", 409)
				return
			}
			write(w, 202, map[string]string{"status": "accepted"})
			return
		}
		m.mode, m.prepare = "preparing", p
		m.mu.Unlock()
		begin(p)
		write(w, 202, map[string]string{"status": "accepted"})
	})
	mux.HandleFunc("POST "+runtimecontract.AdmissionPath, func(w http.ResponseWriter, r *http.Request) {
		m.opMu.Lock()
		defer m.opMu.Unlock()
		var a runtimecontract.Admission
		if !decode(w, r, &a) {
			return
		}
		m.mu.Lock()
		if a.BootID != m.hello.BootID || a.ReleaseDigest != m.hello.ReleaseDigest || a.Revision < 1 || (m.mode != "prepared" && m.mode != "serving") || a.Revision < m.admission.Revision {
			m.mu.Unlock()
			http.Error(w, "stale identity or runtime not prepared", 409)
			return
		}
		validate, check := m.validate, m.check
		m.mu.Unlock()
		// The socket authenticates the supervisor; PG remains the authority for
		// the exact boot, release, revision and permitted roles.
		if validate == nil || check == nil {
			http.Error(w, "runtime not initialized", 409)
			return
		}
		if err := validate(r.Context(), a); err != nil {
			http.Error(w, "admission is not approved in database", 409)
			return
		}
		if _, err := check(r.Context()); err != nil {
			http.Error(w, err.Error(), 409)
			return
		}
		m.mu.Lock()
		if (m.mode != "prepared" && m.mode != "serving") || a.Revision < m.admission.Revision {
			m.mu.Unlock()
			http.Error(w, "runtime state changed", 409)
			return
		}
		m.admission, m.mode = a, "serving"
		m.gate.stop()
		start := m.start
		m.mu.Unlock()
		if a.ClaimBackground && start != nil {
			if err := start(); err != nil {
				m.mu.Lock()
				m.drainLocked()
				m.mu.Unlock()
				http.Error(w, "background startup failed", 500)
				return
			}
		}
		if a.ServeHTTP {
			m.gate.open()
		}
		write(w, 200, m.status(r.Context()))
	})
	mux.HandleFunc("POST "+runtimecontract.DrainPath, func(w http.ResponseWriter, r *http.Request) {
		var d runtimecontract.DrainRequest
		if !decode(w, r, &d) {
			return
		}
		if d.OperationID == "" {
			http.Error(w, "operation_id required", 400)
			return
		}
		// Deadline is an observation budget, never permission to kill a writer.
		m.drain()
		write(w, 202, m.status(r.Context()))
	})
	mux.HandleFunc("POST "+runtimecontract.ShutdownPath, func(w http.ResponseWriter, r *http.Request) {
		m.mu.Lock()
		drained := m.mode == "drained"
		m.mu.Unlock()
		if !drained {
			http.Error(w, "drain incomplete", 409)
			return
		}
		write(w, 200, map[string]string{"status": "stopping"})
		m.shutdownOnce.Do(func() { close(m.shutdown) })
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), []byte("Bearer "+m.token)) != 1 {
			http.Error(w, "unauthorized", 401)
			return
		}
		mux.ServeHTTP(w, r)
	})
}

func (m *managedCore) drain() {
	m.opMu.Lock()
	defer m.opMu.Unlock()
	m.mu.Lock()
	defer m.mu.Unlock()
	m.drainLocked()
}

func (m *managedCore) drainLocked() {
	if m.mode == "drained" || m.mode == "draining" {
		return
	}
	if m.mode == "candidate" || m.mode == "failed" {
		m.mode = "drained"
		if m.cancel != nil {
			m.cancel()
		}
		return
	}
	m.mode = "draining"
	m.admission = runtimecontract.Admission{}
	if m.gate != nil {
		m.gate.stop()
	}
	if m.cancel != nil {
		m.cancel()
	}
}

func (m *managedCore) watchAdmission(ctx context.Context) {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
		m.mu.Lock()
		a, mode, validate := m.admission, m.mode, m.liveValidate
		if validate == nil {
			validate = m.validate
		}
		m.mu.Unlock()
		if mode != "serving" || validate == nil {
			continue
		}
		checkCtx, cancel := context.WithTimeout(ctx, time.Second)
		err := validate(checkCtx, a)
		cancel()
		if err != nil {
			m.opMu.Lock()
			m.mu.Lock()
			if m.mode == "serving" && m.admission == a {
				m.failure = "persisted node admission changed or became unavailable"
				m.drainLocked()
			}
			m.mu.Unlock()
			m.opMu.Unlock()
		}
	}
}

func runManaged(ctx context.Context, cfg *config.Config, version string, log *slog.Logger) error {
	host, _, err := net.SplitHostPort(cfg.HTTPAddr)
	if err != nil || net.ParseIP(host) == nil || !net.ParseIP(host).IsLoopback() {
		return fmt.Errorf("managed core HTTP address must be an explicit loopback IP")
	}
	if !filepath.IsAbs(cfg.Managed.Socket) || len(cfg.Managed.Token) < 32 || cfg.Managed.BootID == "" || cfg.Managed.ReleaseDigest == "" {
		return errors.New("invalid managed core identity or socket configuration")
	}
	if err := os.MkdirAll(filepath.Dir(cfg.Managed.Socket), 0700); err != nil {
		return err
	}
	ln, err := net.Listen("unix", cfg.Managed.Socket)
	if err != nil {
		return err
	}
	defer ln.Close()
	defer os.Remove(cfg.Managed.Socket)
	if err := os.Chmod(cfg.Managed.Socket, 0600); err != nil {
		return err
	}
	runtimeCtx, cancel := context.WithCancel(context.Background())
	defer cancel()
	m := &managedCore{hello: runtimecontract.Hello{Protocol: runtimecontract.Protocol, NodeID: cfg.NodeID, BootID: cfg.Managed.BootID, ReleaseDigest: cfg.Managed.ReleaseDigest, CoreVersion: version,
		ClusterProtocol: runtimecontract.Range{Min: runtimecontract.ClusterProtocolVersion, Max: runtimecontract.ClusterProtocolVersion}, TaskProtocol: runtimecontract.Range{Min: runtimecontract.TaskProtocolVersion, Max: runtimecontract.TaskProtocolVersion}, HostAPIVersion: protocol.HostAPIVersion}, token: cfg.Managed.Token, mode: "candidate", cancel: cancel, shutdown: make(chan struct{})}
	m.schemaContract, err = SchemaContract()
	if err != nil {
		return err
	}
	watchCtx, stopWatch := context.WithCancel(ctx)
	defer stopWatch()
	go m.watchAdmission(watchCtx)
	var wg sync.WaitGroup
	prepareCh := make(chan runtimecontract.PrepareRequest, 1)
	begin := func(p runtimecontract.PrepareRequest) { prepareCh <- p }
	wg.Add(1)
	go func() {
		defer wg.Done()
		// Drain may win the race between accepting Prepare and starting Run.
		// There are no resources in that case, but the control socket still
		// needs a completed barrier so the supervisor can shut this boot down.
		defer func() {
			m.mu.Lock()
			if m.mode == "draining" {
				m.mode = "drained"
			}
			m.mu.Unlock()
		}()
		select {
		case <-runtimeCtx.Done():
			return
		case <-prepareCh:
		}
		if runtimeCtx.Err() != nil {
			return
		}
		err := run(runtimeCtx, cfg, version, log, m)
		m.mu.Lock()
		defer m.mu.Unlock()
		if err != nil {
			m.failure = err.Error()
			if m.mode == "draining" {
				m.mode = "drained"
			} else {
				m.mode = "failed"
			}
		} else {
			m.mode = "drained"
		}
	}()
	srv := &http.Server{Handler: m.handler(begin), ReadHeaderTimeout: 5 * time.Second}
	errCh := make(chan error, 1)
	go func() { errCh <- srv.Serve(ln) }()
	select {
	case <-ctx.Done():
	case <-m.shutdown:
	case err = <-errCh:
	}
	m.drain()
	// Keep control available while every producer and plugin is drained.
	wg.Wait()
	closeCtx, closeCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer closeCancel()
	_ = srv.Shutdown(closeCtx)
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}
