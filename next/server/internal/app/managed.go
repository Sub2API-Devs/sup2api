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
	// drainGrace is how long a shell-requested graceful drain lets requests
	// in flight finish before they are cancelled (0: at once).
	drainGrace time.Duration
	watch      admissionWatch
	// alert is the admission watchdog's current finding (empty while the
	// persisted admission checks out); reported in status.blockers only.
	alert string
	log   *slog.Logger
}

// admissionWatch tunes watchAdmission; zero values take the defaults.
type admissionWatch struct {
	Interval time.Duration // between checks (10s)
	Timeout  time.Duration // per check (2s)
}

const (
	defaultAdmissionInterval = 10 * time.Second
	defaultAdmissionTimeout  = 2 * time.Second
	// admissionAlertRepeat is how often a persisting watchdog finding is
	// logged again at ERROR level.
	admissionAlertRepeat = time.Minute
	// maxDrainGrace caps a graceful drain: the shell already routes new
	// requests elsewhere, so waiting only lengthens this node's stop.
	maxDrainGrace = 5 * time.Minute
)

func (w admissionWatch) withDefaults() admissionWatch {
	if w.Interval <= 0 {
		w.Interval = defaultAdmissionInterval
	}
	if w.Timeout <= 0 {
		w.Timeout = defaultAdmissionTimeout
	}
	return w
}

func (m *managedCore) logger() *slog.Logger {
	if m.log != nil {
		return m.log
	}
	return slog.Default()
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
	check, active, gate, failure, alert := m.check, m.active, m.gate, m.failure, m.alert
	s.Ready = m.mode == "serving" && m.admission.ServeHTTP
	m.mu.Unlock()
	if alert != "" {
		s.Blockers = append(s.Blockers, alert)
	}
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
	mux.HandleFunc("GET "+runtimecontract.HelloPath, func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, m.hello)
	})
	mux.HandleFunc("GET "+runtimecontract.StatusPath, func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, m.status(r.Context()))
	})
	mux.HandleFunc("POST "+runtimecontract.PreparePath, func(w http.ResponseWriter, r *http.Request) {
		m.handlePrepare(w, r, begin)
	})
	mux.HandleFunc("POST "+runtimecontract.AdmissionPath, m.handleAdmission)
	mux.HandleFunc("POST "+runtimecontract.DrainPath, m.handleDrain)
	mux.HandleFunc("POST "+runtimecontract.ShutdownPath, m.handleShutdown)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), []byte("Bearer "+m.token)) != 1 {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		mux.ServeHTTP(w, r)
	})
}

// writeJSON is the one response writer of the control API.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// decodeControl reads one strict JSON control body; false means the 400 was
// already written.
func decodeControl(w http.ResponseWriter, r *http.Request, v any) bool {
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10))
	d.DisallowUnknownFields()
	if err := d.Decode(v); err != nil {
		http.Error(w, "invalid control request", http.StatusBadRequest)
		return false
	}
	return true
}

// handlePrepare accepts the supervisor's prepare request for this boot. A
// boot can be prepared with one and only one request.
func (m *managedCore) handlePrepare(w http.ResponseWriter, r *http.Request, begin func(runtimecontract.PrepareRequest)) {
	var p runtimecontract.PrepareRequest
	if !decodeControl(w, r, &p) {
		return
	}
	m.mu.Lock()
	if p.BootID != m.hello.BootID || p.ReleaseDigest != m.hello.ReleaseDigest {
		m.mu.Unlock()
		http.Error(w, "core identity mismatch", http.StatusConflict)
		return
	}
	if m.mode != "candidate" {
		ok := p == m.prepare && (m.mode == "preparing" || m.mode == "prepared" || m.mode == "serving")
		m.mu.Unlock()
		if !ok {
			http.Error(w, "prepare cannot change this boot", http.StatusConflict)
			return
		}
		writeJSON(w, http.StatusAccepted, map[string]string{"status": "accepted"})
		return
	}
	m.mode, m.prepare = "preparing", p
	m.mu.Unlock()
	begin(p)
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "accepted"})
}

// handleAdmission moves a prepared boot to serving once PostgreSQL confirms
// the admission, then opens the request gate and starts background work.
func (m *managedCore) handleAdmission(w http.ResponseWriter, r *http.Request) {
	m.opMu.Lock()
	defer m.opMu.Unlock()
	var a runtimecontract.Admission
	if !decodeControl(w, r, &a) {
		return
	}
	m.mu.Lock()
	if a.BootID != m.hello.BootID || a.ReleaseDigest != m.hello.ReleaseDigest || a.Revision < 1 || (m.mode != "prepared" && m.mode != "serving") || a.Revision < m.admission.Revision {
		m.mu.Unlock()
		http.Error(w, "stale identity or runtime not prepared", http.StatusConflict)
		return
	}
	validate, check := m.validate, m.check
	m.mu.Unlock()
	// The socket authenticates the supervisor; PG remains the authority for
	// the exact boot, release, revision and permitted roles.
	if validate == nil || check == nil {
		http.Error(w, "runtime not initialized", http.StatusConflict)
		return
	}
	if err := validate(r.Context(), a); err != nil {
		http.Error(w, "admission is not approved in database", http.StatusConflict)
		return
	}
	if _, err := check(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusConflict)
		return
	}
	m.mu.Lock()
	if (m.mode != "prepared" && m.mode != "serving") || a.Revision < m.admission.Revision {
		m.mu.Unlock()
		http.Error(w, "runtime state changed", http.StatusConflict)
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
			http.Error(w, "background startup failed", http.StatusInternalServerError)
			return
		}
	}
	if a.ServeHTTP {
		m.gate.open()
	}
	writeJSON(w, http.StatusOK, m.status(r.Context()))
}

// handleDrain stops admitting work. The deadline is an observation budget,
// never permission to kill a writer. A graceful drain (the shell already
// routes new requests elsewhere) lets requests in flight finish for
// drainGraceFor(d); any other drain cancels them at once.
func (m *managedCore) handleDrain(w http.ResponseWriter, r *http.Request) {
	var d runtimecontract.DrainRequest
	if !decodeControl(w, r, &d) {
		return
	}
	if d.OperationID == "" {
		http.Error(w, "operation_id required", http.StatusBadRequest)
		return
	}
	grace := drainGraceFor(d, time.Now())
	m.opMu.Lock()
	m.mu.Lock()
	if m.mode != "drained" && m.mode != "draining" {
		m.drainGrace = grace
		m.logger().Info("shell drain requested", "operation", d.OperationID, "graceful", d.Graceful, "grace", grace, "active_http", m.activeHTTPLocked())
	}
	m.drainLocked()
	m.mu.Unlock()
	m.opMu.Unlock()
	writeJSON(w, http.StatusAccepted, m.status(r.Context()))
}

// drainGraceFor is the in-flight budget of a drain request: nothing unless
// graceful, else the time to the shell's deadline minus a margin for the
// barriers after HTTP, capped at maxDrainGrace.
func drainGraceFor(d runtimecontract.DrainRequest, now time.Time) time.Duration {
	if !d.Graceful {
		return 0
	}
	grace := maxDrainGrace
	if !d.Deadline.IsZero() {
		if budget := d.Deadline.Sub(now) - 15*time.Second; budget < grace {
			grace = budget
		}
	}
	return max(grace, 0)
}

func (m *managedCore) activeHTTPLocked() int64 {
	if m.gate == nil {
		return 0
	}
	return m.gate.count()
}

// shutdownGrace is how long the HTTP shutdown of a core drained by its shell
// waits for requests in flight.
func (m *managedCore) shutdownGrace() time.Duration {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.drainGrace
}

// handleShutdown acknowledges a drain and releases the process.
func (m *managedCore) handleShutdown(w http.ResponseWriter, r *http.Request) {
	m.mu.Lock()
	drained := m.mode == "drained"
	m.mu.Unlock()
	if !drained {
		http.Error(w, "drain incomplete", http.StatusConflict)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "stopping"})
	m.shutdownOnce.Do(func() { close(m.shutdown) })
}

func (m *managedCore) drain() {
	m.opMu.Lock()
	defer m.opMu.Unlock()
	m.mu.Lock()
	defer m.mu.Unlock()
	m.drainLocked()
}

// draining reports whether the shell asked this core to drain (as opposed to
// a signal or a failure ending it).
func (m *managedCore) draining() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.mode == "draining"
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

// watchAdmission keeps checking PostgreSQL's persisted admission while the
// core serves, and only reports what it finds: in status.blockers and in the
// log. It never drains the core (decided 2026-11-08). Stopping a core is the
// shell's job, and every path that revokes an admission (an upgrade's stop
// step, disabling a node, identity revocation) tells the shell directly; a
// watchdog that stopped the core on its own took sup2api-ccp down 16 times
// in one day on slow queries from a saturated pool.
func (m *managedCore) watchAdmission(ctx context.Context) {
	w := m.watch.withDefaults()
	log := m.logger()
	ticker := time.NewTicker(w.Interval)
	defer ticker.Stop()
	var since, lastLogged time.Time // the current finding's start and last ERROR
	failures := 0
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
		checkCtx, cancel := context.WithTimeout(ctx, w.Timeout)
		err := validate(checkCtx, a)
		cancel()
		if ctx.Err() != nil {
			return
		}
		if err == nil {
			if failures > 0 {
				log.Info("node admission check recovered", "failures", failures, "after", time.Since(since).Round(time.Millisecond))
			}
			since, lastLogged, failures = time.Time{}, time.Time{}, 0
			m.setAlert("")
			continue
		}
		if failures == 0 {
			since = time.Now()
		}
		failures++
		if errors.Is(err, errAdmissionRevoked) {
			m.setAlert("persisted node admission revoked; still serving until the shell stops this core")
			if lastLogged.IsZero() || time.Since(lastLogged) >= admissionAlertRepeat {
				log.Error("node admission revoked; not stopping (the shell drives stops)", "err", err, "failures", failures, "lasted", time.Since(since).Round(time.Millisecond))
				lastLogged = time.Now()
			}
			continue
		}
		m.setAlert("node admission check failing: " + err.Error())
		log.Warn("node admission check failed; still serving", "err", err, "failures", failures, "lasted", time.Since(since).Round(time.Millisecond))
	}
}

// setAlert records the watchdog's current finding for status.blockers.
func (m *managedCore) setAlert(alert string) {
	m.mu.Lock()
	m.alert = alert
	m.mu.Unlock()
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
		ClusterProtocol: runtimecontract.Range{Min: runtimecontract.ClusterProtocolVersion, Max: runtimecontract.ClusterProtocolVersion}, TaskProtocol: runtimecontract.Range{Min: runtimecontract.TaskProtocolVersion, Max: runtimecontract.TaskProtocolVersion}, HostAPIVersion: protocol.HostAPIVersion,
		Capabilities: []string{runtimecontract.CapabilityGracefulDrain}}, token: cfg.Managed.Token, mode: "candidate", cancel: cancel, shutdown: make(chan struct{}), log: log}
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
