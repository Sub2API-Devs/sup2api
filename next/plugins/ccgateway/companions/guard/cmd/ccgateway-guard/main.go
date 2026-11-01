// Command ccgateway-guard is the host service that executes Docker
// operations for the CCGateway controller (next/docs/ccgateway-guard/03).
//
// Subcommands: serve | ready | print-rules [--chain X] | diff-rules
// [--chain X] | print-cleanup | version.
package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/netip"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"ccgateway/guard/internal/api"
	"ccgateway/guard/internal/compose"
	"ccgateway/guard/internal/config"
	"ccgateway/guard/internal/controller"
	"ccgateway/guard/internal/dockerapi"
	"ccgateway/guard/internal/files"
	"ccgateway/guard/internal/firewall"
	"ccgateway/guard/internal/gateway"
	"ccgateway/guard/internal/names"
	"ccgateway/guard/internal/obs"
	"ccgateway/guard/internal/watch"
)

var version = "dev"

const readyFile = "/tmp/ccgateway-guard.ready"

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}
	cmd, args := os.Args[1], os.Args[2:]
	var code int
	switch cmd {
	case "serve":
		code = serve()
	case "ready":
		code = ready(readyFile, time.Now())
	case "print-rules":
		code = printRules(args, os.Stdout, os.Stderr)
	case "diff-rules":
		code = diffRules(args, os.Stdout, os.Stderr)
	case "print-cleanup":
		code = printCleanup(os.Stdout, os.Stderr)
	case "version":
		fmt.Println(version)
	default:
		usage()
		code = 2
	}
	os.Exit(code)
}

func usage() {
	fmt.Fprintln(os.Stderr, "usage: ccgateway-guard serve | ready | print-rules [--chain X] | diff-rules [--chain X] | print-cleanup | version")
}

func loadConfig(requireToken bool, stderr io.Writer) (*config.Config, int) {
	cfg, err := config.Load(os.Getenv, config.Options{RequireToken: requireToken})
	if err != nil {
		fmt.Fprintln(stderr, "config:", err)
		return nil, 2
	}
	return cfg, 0
}

// engineFor builds the firewall engine of cfg (shared by serve and the
// offline commands).
func engineFor(cfg *config.Config, d *dockerapi.Client, log *obs.Logger) *firewall.Engine {
	tools := firewall.DefaultTools()
	var dns func() ([]netip.Addr, error)
	if cfg.ControlDNS {
		r := &firewall.ResolvDNS{Host: cfg.ResolvConf, Systemd: cfg.SystemdResolvConf, Fixed: cfg.DNSServers}
		dns = r.Servers
	}
	return firewall.New(firewall.Options{
		Prefix: cfg.Prefix,
		Chains: firewall.ChainNames(cfg.ChainPrefix),
		Control: firewall.Control{Bridge: cfg.ControlBridge, ControllerIP: cfg.ControllerIP,
			GuardIP: cfg.Listen.Addr(), GuardPort: cfg.Listen.Port()},
		DNS:    dns,
		Tools:  tools,
		Docker: d,
		NS:     firewall.ExecRunner{Timeout: 5 * time.Second, Limit: 1 << 20},
		IPT:    firewall.ExecRunner{Timeout: 15 * time.Second, Limit: 8 << 20},
		Links:  firewall.SysLinks{Root: "/sys/class/net"},
		Log:    log,
	})
}

func chainArg(args []string, chains firewall.Chains, stderr io.Writer) ([]string, int) {
	fs := flag.NewFlagSet("rules", flag.ContinueOnError)
	fs.SetOutput(stderr)
	chain := fs.String("chain", "", "only this chain")
	if err := fs.Parse(args); err != nil || fs.NArg() != 0 {
		return nil, 2
	}
	if *chain == "" {
		return chains.All(), 0
	}
	for _, c := range chains.All() {
		if c == *chain {
			return []string{c}, 0
		}
	}
	fmt.Fprintln(stderr, "unknown chain for this instance:", *chain)
	return nil, 2
}

func printRules(args []string, stdout, stderr io.Writer) int {
	cfg, code := loadConfig(false, stderr)
	if cfg == nil {
		return code
	}
	chains := firewall.ChainNames(cfg.ChainPrefix)
	sel, code := chainArg(args, chains, stderr)
	if sel == nil {
		return code
	}
	eng := engineFor(cfg, dockerapi.New(cfg.DockerSocket), obs.New(stderr, false))
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	desired, err := eng.Desired(ctx)
	if err != nil {
		fmt.Fprintln(stderr, "compute:", err)
		return 1
	}
	sub := map[string][]firewall.Rule{}
	for _, c := range sel {
		sub[c] = desired[c]
	}
	fmt.Fprint(stdout, firewall.RestoreScript(sel, sub))
	return 0
}

func diffRules(args []string, stdout, stderr io.Writer) int {
	cfg, code := loadConfig(false, stderr)
	if cfg == nil {
		return code
	}
	chains := firewall.ChainNames(cfg.ChainPrefix)
	sel, code := chainArg(args, chains, stderr)
	if sel == nil {
		return code
	}
	eng := engineFor(cfg, dockerapi.New(cfg.DockerSocket), obs.New(stderr, false))
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	desired, err := eng.Desired(ctx)
	if err != nil {
		fmt.Fprintln(stderr, "compute:", err)
		return 2
	}
	tools := firewall.DefaultTools()
	run := firewall.ExecRunner{Timeout: 15 * time.Second, Limit: 8 << 20}
	same := true
	for _, c := range sel {
		out, err := run.Run(ctx, []string{tools.Iptables, "-w", "5", "-S", c}, nil)
		if err != nil {
			fmt.Fprintf(stdout, "# %s: cannot read the kernel chain (%v)\n", c, err)
			same = false
			continue
		}
		d := firewall.Diff(desired[c], firewall.ParseChain(string(out), c), c != chains.Bridge)
		if len(d) == 0 {
			fmt.Fprintf(stdout, "# %s: identical (%d rules)\n", c, len(desired[c]))
			continue
		}
		same = false
		fmt.Fprintf(stdout, "# %s: %d differences (- kernel only, + guard only)\n", c, len(d))
		for _, l := range d {
			fmt.Fprintln(stdout, l)
		}
	}
	if !same {
		return 1
	}
	return 0
}

func printCleanup(stdout, stderr io.Writer) int {
	cfg, code := loadConfig(false, stderr)
	if cfg == nil {
		return code
	}
	for _, l := range firewall.Cleanup(firewall.ChainNames(cfg.ChainPrefix)) {
		fmt.Fprintln(stdout, l)
	}
	return 0
}

type readyState struct {
	PID       int    `json:"pid"`
	Version   string `json:"version"`
	Since     string `json:"since"`
	Heartbeat string `json:"heartbeat"`
}

// ready is the healthcheck: the file is fresh and its pid is a serving
// guard (03 §10.4). It never uses HTTP (X14).
func ready(path string, now time.Time) int {
	b, err := os.ReadFile(path)
	if err != nil {
		return 1
	}
	var st readyState
	if json.Unmarshal(b, &st) != nil || st.PID <= 0 {
		return 1
	}
	hb, err := time.Parse(time.RFC3339Nano, st.Heartbeat)
	if err != nil || now.Sub(hb) > 15*time.Second {
		return 1
	}
	cmdline, err := os.ReadFile("/proc/" + strconv.Itoa(st.PID) + "/cmdline")
	if err != nil {
		return 1
	}
	parts := strings.Split(strings.TrimRight(string(cmdline), "\x00"), "\x00")
	if len(parts) < 2 || !strings.HasSuffix(parts[0], "ccgateway-guard") || parts[1] != "serve" {
		return 1
	}
	return 0
}

func writeReady(since time.Time) {
	st := readyState{PID: os.Getpid(), Version: version, Since: since.UTC().Format(time.RFC3339Nano),
		Heartbeat: time.Now().UTC().Format(time.RFC3339Nano)}
	b, _ := json.Marshal(st)
	tmp := readyFile + ".tmp"
	if os.WriteFile(tmp, b, 0o600) == nil {
		_ = os.Rename(tmp, readyFile)
	}
}

func checkBackend(ctx context.Context, tools firewall.Tools, log *obs.Logger) error {
	run := firewall.ExecRunner{Timeout: 15 * time.Second}
	out, err := run.Run(ctx, []string{tools.Iptables, "-V"}, nil)
	if err != nil || !strings.Contains(string(out), "nf_tables") {
		return errors.New("iptables backend is not nf_tables")
	}
	if _, err := run.Run(ctx, []string{tools.Iptables, "-w", "5", "-S", "DOCKER-USER"}, nil); err != nil {
		return errors.New("DOCKER-USER chain not found")
	}
	if b, err := os.ReadFile("/proc/net/ip_tables_names"); err == nil && strings.TrimSpace(string(b)) != "" {
		log.Warn("legacy_tables_present", nil)
	}
	if b, err := os.ReadFile("/proc/sys/net/bridge/bridge-nf-call-iptables"); err != nil || strings.TrimSpace(string(b)) != "1" {
		log.Warn("bridge_nf_call_iptables_off", nil)
	}
	return nil
}

func apiVersionOK(v dockerapi.VersionInfo) bool {
	cmp := func(a, b string) int {
		pa, pb := strings.SplitN(a, ".", 2), strings.SplitN(b, ".", 2)
		if len(pa) != 2 || len(pb) != 2 {
			return -2
		}
		ma, _ := strconv.Atoi(pa[0])
		mb, _ := strconv.Atoi(pb[0])
		na, _ := strconv.Atoi(pa[1])
		nb, _ := strconv.Atoi(pb[1])
		switch {
		case ma != mb:
			return map[bool]int{true: -1, false: 1}[ma < mb]
		case na != nb:
			return map[bool]int{true: -1, false: 1}[na < nb]
		}
		return 0
	}
	lo, hi := cmp(v.MinAPIVersion, dockerapi.Version), cmp(dockerapi.Version, v.APIVersion)
	return lo != -2 && hi != -2 && lo <= 0 && hi <= 0
}

func serve() int {
	start := time.Now()
	cfg, code := loadConfig(true, os.Stderr)
	if cfg == nil {
		return code
	}
	log := obs.New(os.Stderr, cfg.Debug)
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()

	tools := firewall.DefaultTools()
	if err := checkBackend(ctx, tools, log); err != nil {
		log.Error("iptables_backend_rejected", obs.Fields{"reason": err.Error()})
		return 3
	}
	d := dockerapi.New(cfg.DockerSocket)
	ver, err := d.Version(ctx)
	if err != nil || !apiVersionOK(ver) {
		log.Error("docker_version_rejected", obs.Fields{"api": ver.APIVersion, "min": ver.MinAPIVersion, "guard": dockerapi.Version})
		return 4
	}
	log.Info("docker_version", obs.Fields{"docker": ver.Version, "api": ver.APIVersion, "guard_api": dockerapi.Version})

	runtimeRoot, err := files.OpenRoot(cfg.RuntimeRoot)
	if err != nil {
		log.Error("runtime_root_rejected", obs.Fields{"reason": err.Error()})
		return 5
	}
	stateRoot, err := files.OpenRoot(cfg.StateDir)
	if err != nil {
		log.Error("state_dir_rejected", obs.Fields{"reason": err.Error()})
		return 5
	}
	projectRoot, err := files.OpenRoot(cfg.ProjectDir)
	if err != nil {
		log.Error("project_dir_rejected", obs.Fields{"reason": err.Error()})
		return 5
	}
	rt := files.Runtime{R: runtimeRoot}
	st := files.State{R: stateRoot}
	if n, err := st.CleanLoads(0, time.Now()); err != nil {
		log.Error("state_loads_cleanup_failed", nil)
	} else if n > 0 {
		log.Info("state_loads_cleaned", obs.Fields{"files": n})
	}
	checked, rejected, err := rt.Sweep(names.ValidKey)
	if err != nil {
		log.Error("mount_source_sweep_failed", nil)
	} else {
		if rejected == nil {
			rejected = []files.SweepResult{}
		}
		lvl := log.Info
		if len(rejected) > 0 {
			lvl = log.Warn
			for range rejected {
				log.Inc("mount_source_rejected")
			}
		}
		lvl("mount_source_sweep", obs.Fields{"checked": checked, "rejected": rejected})
	}
	n := cfg.Names()
	cleanJobs(ctx, d, n, 0, log)

	if out, err := (compose.CmdExec{}).Run(ctx, []string{"/usr/bin/docker", "compose", "version", "--short"},
		[]string{"PATH=/usr/bin:/bin", "HOME=/tmp", "DOCKER_CONFIG=/tmp/.docker"}); err == nil {
		log.Info("compose_version", nil)
	} else {
		log.Warn("compose_version_unavailable", obs.Fields{"stderr": out})
	}

	runner := &compose.Runner{Docker: "/usr/bin/docker", Project: cfg.Project, Dir: cfg.ProjectDir, Socket: cfg.DockerSocket,
		X: compose.CmdExec{}, Env: compose.RootEnv{R: projectRoot},
		L: compose.FileLock{Path: cfg.ProjectDir + "/.compose.lock", Wait: 60 * time.Second}}
	life := &compose.Lifecycle{}
	eng := engineFor(cfg, d, log)
	srv := &api.Server{Cfg: cfg, D: d, Files: rt, State: st, FW: eng, Log: log, Version: version,
		DockerVersion: ver.Version, HostRoutes: api.HostRoutesFile("/proc/net/route")}
	state := &watch.State{}
	srv.Control = state
	srv.Upgrader = &controller.Upgrader{N: n, D: d, C: runner, Lock: runner.L, Life: life, Store: st, Log: log}
	srv.Gateway = &gateway.Manager{N: n, Project: cfg.Project, Root: cfg.RuntimeRoot, D: d, F: rt, Nets: srv, C: runner,
		CLock: runner.L, Life: life, Locks: srv, FW: eng, Store: st, Log: log}
	srv.SetStarting(true)

	srv.Upgrader.Resume(ctx)
	srv.Gateway.Resume(ctx)

	if err := eng.Initial(ctx); err != nil {
		log.Error("firewall_initial_failed", nil)
	}
	go eng.Run(ctx)
	w := &watch.Watcher{C: watch.Config{Prefix: cfg.Prefix, ControlNetwork: cfg.ControlNetwork, ControllerIP: cfg.ControllerIP,
		Project: cfg.Project}, D: d, FW: eng, S: state, Log: log,
		OnTick: func(ctx context.Context) {
			cleanJobs(ctx, d, n, 10*time.Minute, log)
			if _, err := st.CleanLoads(time.Hour, time.Now()); err != nil {
				log.Warn("state_loads_cleanup_failed", nil)
			}
		}}
	w.CheckControl(ctx)
	go w.Run(ctx, start)

	l, err := api.Listen(ctx, cfg.Listen.String(), func() { log.Warn("listen_retry", nil) })
	if err != nil {
		return 0
	}
	hs := &http.Server{Handler: srv.Handler(), ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 120 * time.Second,
		MaxHeaderBytes: 16 << 10, TLSNextProto: map[string]func(*http.Server, *tls.Conn, http.Handler){}}
	hs.SetKeepAlivesEnabled(true)
	srv.SetStarting(false)
	go func() {
		if err := hs.Serve(l); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("serve_failed", nil)
			stop()
		}
	}()
	writeReady(start)
	log.Info("guard_ready", obs.Fields{"version": version, "prefix": cfg.Prefix, "listen": cfg.Listen.String()})
	tick := time.NewTicker(5 * time.Second)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			_ = os.Remove(readyFile)
			sctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
			_ = hs.Shutdown(sctx)
			cancel()
			srv.Upgrader.WaitIdle()
			log.Info("guard_stopped", nil)
			return 0
		case <-tick.C:
			writeReady(start)
		}
	}
}

// cleanJobs removes guard one-shot containers (label guard-job=<prefix>)
// that are not running and older than age (0 = every one, at startup).
func cleanJobs(ctx context.Context, d *dockerapi.Client, n names.Names, age time.Duration, log *obs.Logger) {
	list, err := d.ContainerList(ctx, dockerapi.Filters{"label": {names.LabelJob + "=" + n.Prefix}}, true)
	if err != nil {
		return
	}
	removed := 0
	for _, c := range list {
		if !n.IsOneshot(c.Name()) {
			continue
		}
		if age > 0 {
			if c.State == "running" {
				continue
			}
			_, info, err := d.ContainerInspect(ctx, c.ID)
			if err != nil {
				continue
			}
			if t, err := time.Parse(time.RFC3339Nano, info.Created); err == nil && time.Since(t) < age {
				continue
			}
		}
		if err := d.ContainerRemove(ctx, c.ID, true, true); err == nil {
			removed++
		}
	}
	if removed > 0 {
		log.Info("stale_jobs_removed", obs.Fields{"containers": removed})
	}
}
