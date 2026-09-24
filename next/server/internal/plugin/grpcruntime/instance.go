package grpcruntime

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"

	"github.com/hashicorp/go-plugin"
	"google.golang.org/grpc"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
)

// Instance states.
const (
	StateStarting   = "starting"
	StateReady      = "ready"
	StateRestarting = "restarting"
	StateFailed     = "failed" // restart budget exhausted on this node
	StateDraining   = "draining"
	StateStopped    = "stopped"
)

// Instance is one running plugin version on this node.
type Instance struct {
	rt      *Runtime
	pkg     *registry.Package
	binPath string
	binSum  string
	log     *slog.Logger
	caps    map[string]bool

	sem      chan struct{}
	inflight atomic.Int64
	draining atomic.Bool
	idle     chan struct{} // closed once draining and no call in flight
	idleOnce sync.Once

	settings atomic.Pointer[settings]
	proc     atomic.Pointer[proc]

	mu        sync.Mutex
	state     string
	lastErr   string
	restarts  []time.Time
	restartsN int // total restarts since load

	restartReq chan string
	stopCh     chan struct{}
	stopOnce   sync.Once
	done       chan struct{} // supervisor exited
}

// proc is one OS process of an instance; replaced on restart.
type proc struct {
	client    *plugin.Client
	plugin    pluginv1.PluginServiceClient
	platform  pluginv1.PlatformServiceClient
	hook      pluginv1.HookServiceClient
	app       pluginv1.AppServiceClient
	http      pluginv1.HTTPServiceClient
	sched     pluginv1.SchedulerServiceClient
	migration pluginv1.MigrationServiceClient
	pid       int
	stopWatch func()
	failures  int // consecutive health failures
}

func newInstance(rt *Runtime, pkg *registry.Package, binPath, sum string, st *settings) *Instance {
	i := &Instance{
		rt:         rt,
		pkg:        pkg,
		binPath:    binPath,
		binSum:     sum,
		log:        rt.log.With("plugin", pkg.Key, "version", pkg.Version),
		caps:       map[string]bool{},
		sem:        make(chan struct{}, rt.o.MaxConcurrency),
		idle:       make(chan struct{}),
		state:      StateStarting,
		restartReq: make(chan string, 1),
		stopCh:     make(chan struct{}),
		done:       make(chan struct{}),
	}
	for _, c := range pkg.Manifest.Capabilities {
		i.caps[c.ID] = true
	}
	i.settings.Store(st)
	return i
}

// ------------------------------------------------------------------ accessors

func (i *Instance) Key() string                { return i.pkg.Key }
func (i *Instance) Version() string            { return i.pkg.Version }
func (i *Instance) Package() *registry.Package { return i.pkg }
func (i *Instance) Info() core.PluginInfo      { return registry.Info(i.pkg) }
func (i *Instance) Grants() registry.Grants    { return i.settings.Load().grants }

// State returns the lifecycle state and the last error message.
func (i *Instance) State() (state, lastErr string) {
	i.mu.Lock()
	defer i.mu.Unlock()
	return i.state, i.lastErr
}

// Restarts returns the number of restarts since the instance was loaded.
func (i *Instance) Restarts() int {
	i.mu.Lock()
	defer i.mu.Unlock()
	return i.restartsN
}

// InFlight returns the number of calls currently running.
func (i *Instance) InFlight() int64 { return i.inflight.Load() }

// PID of the current process (0 when not running).
func (i *Instance) PID() int {
	if p := i.proc.Load(); p != nil {
		return p.pid
	}
	return 0
}

func (i *Instance) setState(s, errMsg string) {
	i.mu.Lock()
	i.state = s
	i.lastErr = errMsg
	i.mu.Unlock()
}

func (i *Instance) isStopped() bool {
	select {
	case <-i.stopCh:
		return true
	default:
		return false
	}
}

// ------------------------------------------------------------------ process lifecycle

func (i *Instance) launchSpec() core.LaunchSpec {
	m := i.pkg.Manifest
	st := i.settings.Load()
	spec := core.LaunchSpec{
		PluginKey:     i.pkg.Key,
		Version:       i.pkg.Version,
		BinaryPath:    i.binPath,
		WorkDir:       filepath.Join(i.rt.o.DataDir, i.pkg.Key, "work"),
		StrictNetwork: i.rt.o.StrictNetwork,
		Seccomp:       i.rt.o.Seccomp,
	}
	if m.Resources != nil {
		spec.MemoryMB = m.Resources.MemoryMB
		spec.CPU = m.Resources.CPU
		spec.MaxThreads = m.Resources.MaxThreads
		spec.MaxOpenFiles = m.Resources.MaxOpenFiles
	}
	if l := st.limits; l.MemoryMB > 0 || l.CPU > 0 || l.MaxThreads > 0 || l.MaxOpenFiles > 0 {
		if l.MemoryMB > 0 {
			spec.MemoryMB = l.MemoryMB
		}
		if l.CPU > 0 {
			spec.CPU = l.CPU
		}
		if l.MaxThreads > 0 {
			spec.MaxThreads = l.MaxThreads
		}
		if l.MaxOpenFiles > 0 {
			spec.MaxOpenFiles = l.MaxOpenFiles
		}
	}
	if max := i.rt.o.MaxMemoryMB; max > 0 && (spec.MemoryMB == 0 || spec.MemoryMB > max) {
		spec.MemoryMB = max
	}
	strict := "0"
	if spec.StrictNetwork {
		strict = "1"
	}
	spec.Env = []string{
		protocol.EnvPluginKey + "=" + i.pkg.Key,
		protocol.EnvPluginVersion + "=" + i.pkg.Version,
		protocol.EnvStrictNetwork + "=" + strict,
		protocol.EnvDataDir + "=" + spec.WorkDir,
	}
	return spec
}

func (i *Instance) startFirst(ctx context.Context) error {
	p, err := i.startProc(ctx)
	if err != nil {
		i.setState(StateFailed, err.Error())
		return err
	}
	i.proc.Store(p)
	i.setState(StateReady, "")
	return nil
}

// startProc launches one process and runs the handshake.
func (i *Instance) startProc(ctx context.Context) (_ *proc, err error) {
	ctx, cancel := context.WithTimeout(ctx, i.rt.o.StartTimeout)
	defer cancel()

	// Re-verify the extracted binary before every start.
	if sum, err := fileSum(i.binPath); err != nil || sum != i.binSum {
		if _, _, err := i.pkg.ExtractBinary(goos(), goarch()); err != nil {
			return nil, fmt.Errorf("re-extract binary: %w", err)
		}
	}
	spec := i.launchSpec()
	if err := os.MkdirAll(spec.WorkDir, 0o700); err != nil {
		return nil, err
	}
	cmd, err := i.rt.o.Launcher.Command(ctx, spec)
	if err != nil {
		return nil, fmt.Errorf("launcher: %w", err)
	}
	cfg := &plugin.ClientConfig{
		HandshakeConfig:  protocol.Handshake,
		Plugins:          protocol.PluginMap(&protocol.GRPCPlugin{}),
		Cmd:              cmd,
		AllowedProtocols: []plugin.Protocol{plugin.ProtocolGRPC},
		SkipHostEnv:      true,
		StartTimeout:     i.rt.o.StartTimeout,
		Logger:           newHCLogger(i.log),
	}
	// go-plugin can only checksum the executable it starts; when the
	// launcher wraps the plugin (sandbox), the binary was verified above.
	if samePath(cmd.Path, i.binPath) {
		sum, _ := hex.DecodeString(i.binSum)
		cfg.SecureConfig = &plugin.SecureConfig{Checksum: sum, Hash: sha256.New()}
	}
	client := plugin.NewClient(cfg)
	p := &proc{client: client}
	defer func() {
		if err != nil {
			i.killProc(p, false)
		}
	}()
	rpc, err := client.Client()
	if err != nil {
		return nil, fmt.Errorf("start plugin process: %w", err)
	}
	raw, err := rpc.Dispense(protocol.PluginName)
	if err != nil {
		return nil, fmt.Errorf("dispense: %w", err)
	}
	pc, ok := raw.(*protocol.Client)
	if !ok || pc.Conn == nil {
		return nil, errors.New("dispense: unexpected client type")
	}
	var conn grpc.ClientConnInterface = pc.Conn
	p.plugin = pluginv1.NewPluginServiceClient(conn)
	p.platform = pluginv1.NewPlatformServiceClient(conn)
	p.hook = pluginv1.NewHookServiceClient(conn)
	p.app = pluginv1.NewAppServiceClient(conn)
	p.http = pluginv1.NewHTTPServiceClient(conn)
	p.sched = pluginv1.NewSchedulerServiceClient(conn)
	p.migration = pluginv1.NewMigrationServiceClient(conn)
	if rc := client.ReattachConfig(); rc != nil {
		p.pid = rc.Pid
	}

	info, err := p.plugin.GetInfo(ctx, &pluginv1.GetInfoRequest{})
	if err != nil {
		return nil, fmt.Errorf("GetInfo: %w", err)
	}
	if info.GetPluginKey() != i.pkg.Key || info.GetVersion() != i.pkg.Version {
		return nil, fmt.Errorf("GetInfo: plugin reports %s@%s, package is %s@%s",
			info.GetPluginKey(), info.GetVersion(), i.pkg.Key, i.pkg.Version)
	}
	if info.GetProtocolVersion() != protocol.ProtocolVersion {
		return nil, fmt.Errorf("GetInfo: protocol version %d, host supports %d", info.GetProtocolVersion(), protocol.ProtocolVersion)
	}
	reported := map[string]bool{}
	for _, c := range info.GetCapabilities() {
		reported[c] = true
	}
	for c := range i.caps {
		if len(reported) > 0 && !reported[c] {
			i.log.Warn("plugin does not report a capability declared in its manifest", "capability", c)
		}
	}

	// Serve HostService and EgressService for this instance on the broker.
	host := &hostServer{i: i}
	var egress pluginv1.EgressServiceServer = pluginv1.UnimplementedEgressServiceServer{}
	if i.rt.o.Egress != nil {
		egress = i.rt.o.Egress.ServerFor(i.pkg.Key, i.egressPolicy)
	}
	brokerID := pc.Broker.NextId()
	go pc.Broker.AcceptAndServe(brokerID, func(opts []grpc.ServerOption) *grpc.Server {
		s := grpc.NewServer(opts...)
		pluginv1.RegisterHostServiceServer(s, host)
		pluginv1.RegisterEgressServiceServer(s, egress)
		return s
	})
	node := i.rt.o.Node
	initResp, err := p.plugin.InitHost(ctx, &pluginv1.InitHostRequest{
		HostBrokerId:   brokerID,
		HostApiVersion: protocol.HostAPIVersion,
		NodeId:         node.NodeID(),
		BootId:         node.BootID(),
		HostVersion:    i.rt.o.HostVersion,
	})
	if err != nil {
		return nil, fmt.Errorf("InitHost: %w", err)
	}
	if !initResp.GetReady() {
		return nil, fmt.Errorf("InitHost: plugin not ready: %s", initResp.GetMessage())
	}
	if err := i.configure(ctx, p, i.settings.Load()); err != nil {
		return nil, err
	}
	h, err := p.plugin.Health(ctx, &pluginv1.HealthRequest{})
	if err != nil {
		return nil, fmt.Errorf("Health: %w", err)
	}
	if !h.GetHealthy() {
		return nil, fmt.Errorf("Health: unhealthy: %s", h.GetMessage())
	}
	if p.pid > 0 {
		p.stopWatch = i.rt.o.Launcher.Watch(spec, p.pid, i.onResourceEvent)
	}
	return p, nil
}

func (i *Instance) configure(ctx context.Context, p *proc, st *settings) error {
	req := &pluginv1.ConfigureRequest{ConfigJson: st.configJSON}
	for perm, scope := range st.grants {
		req.Grants = append(req.Grants, &pluginv1.Grant{Permission: perm, ScopeJson: string(scope)})
	}
	resp, err := p.plugin.Configure(ctx, req)
	if err != nil {
		return fmt.Errorf("Configure: %w", err)
	}
	if errs := resp.GetErrors(); len(errs) > 0 {
		return fmt.Errorf("Configure rejected: %s: %s", errs[0].GetField(), errs[0].GetMessage())
	}
	return nil
}

func (i *Instance) egressPolicy() core.EgressPolicy {
	st := i.settings.Load()
	pol := core.EgressPolicy{Mode: st.egress}
	if pol.Mode == "" {
		pol.Mode = "allow_all"
	}
	if st.grants.Has("net") {
		pol.AllowedDomains, _ = st.grants.List("net", "domains")
	}
	return pol
}

func (i *Instance) onResourceEvent(ev core.ResourceEvent) {
	switch ev.Kind {
	case "memory_exceeded":
		i.log.Warn("plugin exceeded its memory limit, restarting", "rss", ev.RSSBytes, "msg", ev.Message)
		i.requestRestart("memory_exceeded")
	case "threads_exceeded":
		i.log.Warn("plugin exceeded its thread limit", "threads", ev.Threads)
	}
}

func (i *Instance) requestRestart(reason string) {
	select {
	case i.restartReq <- reason:
	default:
	}
}

// killProc shuts a process down (graceful Shutdown first when asked).
func (i *Instance) killProc(p *proc, graceful bool) {
	if p == nil {
		return
	}
	if p.stopWatch != nil {
		p.stopWatch()
	}
	if graceful && p.plugin != nil && !p.client.Exited() {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		_, _ = p.plugin.Shutdown(ctx, &pluginv1.ShutdownRequest{GraceSeconds: 2})
		cancel()
	}
	p.client.Kill()
}

// supervise watches the process: exit detection every second, health checks
// every HealthInterval, restart requests from the resource watchdog.
func (i *Instance) supervise() {
	defer close(i.done)
	exitTick := time.NewTicker(time.Second)
	defer exitTick.Stop()
	healthTick := time.NewTicker(i.rt.o.HealthInterval)
	defer healthTick.Stop()
	for {
		select {
		case <-i.stopCh:
			return
		case reason := <-i.restartReq:
			i.restart(reason)
		case <-exitTick.C:
			if p := i.proc.Load(); p != nil && p.client.Exited() {
				i.restart("process exited")
			}
		case <-healthTick.C:
			i.checkHealth()
		}
		if s, _ := i.State(); s == StateFailed {
			// Budget exhausted: stay down until the instance is replaced.
			<-i.stopCh
			return
		}
	}
}

func (i *Instance) checkHealth() {
	p := i.proc.Load()
	if p == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	h, err := p.plugin.Health(ctx, &pluginv1.HealthRequest{})
	if err == nil && h.GetHealthy() {
		p.failures = 0
		return
	}
	p.failures++
	msg := "unhealthy"
	if err != nil {
		msg = err.Error()
	} else if h.GetMessage() != "" {
		msg = h.GetMessage()
	}
	i.log.Warn("plugin health check failed", "failures", p.failures, "err", msg)
	if p.failures >= 3 {
		i.restart("health check failed: " + msg)
	}
}

// restart replaces the process with exponential backoff. More than
// MaxRestarts restarts within RestartWindow marks the instance failed.
func (i *Instance) restart(reason string) {
	for {
		if i.isStopped() {
			return
		}
		now := time.Now()
		i.mu.Lock()
		kept := i.restarts[:0]
		for _, t := range i.restarts {
			if now.Sub(t) < i.rt.o.RestartWindow {
				kept = append(kept, t)
			}
		}
		i.restarts = append(kept, now)
		n := len(i.restarts)
		i.restartsN++
		i.mu.Unlock()

		old := i.proc.Swap(nil)
		i.killProc(old, false)
		if n > i.rt.o.MaxRestarts {
			msg := fmt.Sprintf("restarted more than %d times within %s; last reason: %s", i.rt.o.MaxRestarts, i.rt.o.RestartWindow, reason)
			i.log.Error("plugin marked unavailable on this node", "reason", msg)
			i.setState(StateFailed, msg)
			return
		}
		i.setState(StateRestarting, reason)
		delay := i.rt.o.BackoffBase << (n - 1)
		if delay > i.rt.o.BackoffMax || delay <= 0 {
			delay = i.rt.o.BackoffMax
		}
		i.log.Warn("restarting plugin", "reason", reason, "attempt", n, "delay", delay)
		select {
		case <-i.stopCh:
			return
		case <-time.After(delay):
		}
		p, err := i.startProc(context.Background())
		if err != nil {
			reason = err.Error()
			i.log.Error("plugin restart failed", "err", err)
			continue
		}
		i.mu.Lock()
		if i.isStopped() {
			i.mu.Unlock()
			i.killProc(p, true)
			return
		}
		i.proc.Store(p)
		i.mu.Unlock()
		state := StateReady
		if i.draining.Load() {
			state = StateDraining
		}
		i.setState(state, "")
		return
	}
}

// Refresh re-reads settings and grants; when they changed, the plugin is
// reconfigured in place (resource limit changes apply on the next start).
func (i *Instance) Refresh(ctx context.Context) error {
	st, err := i.rt.loadSettings(ctx, i.pkg.Key)
	if err != nil {
		return err
	}
	if st.fingerprint == i.settings.Load().fingerprint {
		return nil
	}
	i.settings.Store(st)
	p := i.proc.Load()
	if p == nil {
		return nil
	}
	cctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := i.configure(cctx, p, st); err != nil {
		i.log.Warn("plugin reconfigure failed", "err", err)
		return err
	}
	return nil
}

// MigrateData calls MigrationService.MigrateData when the plugin declares
// capability migration.data.v1; otherwise it is a no-op.
func (i *Instance) MigrateData(ctx context.Context, from, to string) error {
	if !i.caps[manifest.CapMigrationData] {
		return nil
	}
	return i.call(ctx, 10*time.Minute, func(ctx context.Context, p *proc) error {
		_, err := p.migration.MigrateData(ctx, &pluginv1.MigrateDataRequest{FromVersion: from, ToVersion: to})
		return err
	})
}

// Drain stops accepting calls, waits for in-flight calls (up to timeout, 0 =
// runtime default) and stops the process.
func (i *Instance) Drain(timeout time.Duration) {
	if timeout <= 0 {
		timeout = i.rt.o.DrainTimeout
	}
	i.draining.Store(true)
	if s, _ := i.State(); s == StateReady {
		i.setState(StateDraining, "")
	}
	if i.inflight.Load() == 0 {
		i.idleOnce.Do(func() { close(i.idle) })
	}
	select {
	case <-i.idle:
	case <-time.After(timeout):
		i.log.Warn("plugin drain timed out", "in_flight", i.inflight.Load())
	}
	i.Stop()
}

// Stop terminates the instance immediately.
func (i *Instance) Stop() {
	i.stopOnce.Do(func() {
		i.draining.Store(true)
		i.mu.Lock()
		close(i.stopCh)
		i.mu.Unlock()
		p := i.proc.Swap(nil)
		i.killProc(p, true)
		i.setState(StateStopped, "")
	})
}

// Kill terminates the current process without stopping supervision (tests,
// crash simulation).
func (i *Instance) Kill() {
	if p := i.proc.Load(); p != nil {
		p.client.Kill()
	}
}
