package firewall

import (
	"bytes"
	"context"
	"errors"
	"net/netip"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Runner executes a fixed program with guard-built arguments.
type Runner interface {
	Run(ctx context.Context, argv []string, stdin []byte) ([]byte, error)
}

// Tools are the absolute paths of the programs the firewall runs.
type Tools struct {
	Iptables        string
	IptablesRestore string
	Nsenter         string
	IP              string
}

// DefaultTools finds the programs at their fixed image (and Debian host)
// paths.
func DefaultTools() Tools {
	first := func(cands ...string) string {
		for _, c := range cands {
			if st, err := os.Stat(c); err == nil && !st.IsDir() {
				return c
			}
		}
		return cands[0]
	}
	return Tools{
		Iptables:        first("/usr/sbin/iptables", "/sbin/iptables", "/usr/bin/iptables"),
		IptablesRestore: first("/usr/sbin/iptables-restore", "/sbin/iptables-restore", "/usr/bin/iptables-restore"),
		Nsenter:         first("/usr/bin/nsenter", "/bin/nsenter", "/usr/sbin/nsenter"),
		IP:              first("/usr/sbin/ip", "/usr/bin/ip", "/sbin/ip", "/bin/ip"),
	}
}

// ExecError is a failed command: exit status and the tail of stderr (only
// for guard logs; iptables messages carry no secrets).
type ExecError struct {
	Prog   string
	Code   int
	Stderr string
}

func (e *ExecError) Error() string {
	return filepath.Base(e.Prog) + " exited " + strconv.Itoa(e.Code) + ": " + e.Stderr
}

// ExecRunner runs programs with a clean environment, a timeout and output
// limits (03 §7.3: 5 s and 1 MiB for nsenter; 15 s for iptables-restore).
type ExecRunner struct {
	Timeout time.Duration
	Limit   int
}

type limitBuf struct {
	b     bytes.Buffer
	limit int
	over  bool
}

func (l *limitBuf) Write(p []byte) (int, error) {
	if l.b.Len()+len(p) > l.limit {
		l.over = true
		p = p[:max(0, l.limit-l.b.Len())]
	}
	l.b.Write(p)
	return len(p), nil
}

// ErrOutput is a command output over the limit.
var ErrOutput = errors.New("command output too large")

func (r ExecRunner) Run(ctx context.Context, argv []string, stdin []byte) ([]byte, error) {
	timeout := r.Timeout
	if timeout <= 0 {
		timeout = 15 * time.Second
	}
	limit := r.Limit
	if limit <= 0 {
		limit = 1 << 20
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, argv[0], argv[1:]...)
	cmd.Env = []string{"PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"}
	if stdin != nil {
		cmd.Stdin = bytes.NewReader(stdin)
	}
	out := &limitBuf{limit: limit}
	errb := &limitBuf{limit: 2048}
	cmd.Stdout, cmd.Stderr = out, errb
	err := cmd.Run()
	if err != nil {
		code := -1
		var ee *exec.ExitError
		if errors.As(err, &ee) {
			code = ee.ExitCode()
		}
		return nil, &ExecError{Prog: argv[0], Code: code, Stderr: strings.TrimSpace(errb.b.String())}
	}
	if out.over {
		return nil, ErrOutput
	}
	return out.b.Bytes(), nil
}

// Links reads the host's interface table.
type Links interface {
	Ifindexes() (map[int]string, error)
	Master(ifname string) (string, error)
}

// SysLinks reads /sys/class/net (Root is "/sys/class/net"; tests use a
// fake directory).
type SysLinks struct{ Root string }

func (s SysLinks) Ifindexes() (map[int]string, error) {
	entries, err := os.ReadDir(s.Root)
	if err != nil {
		return nil, err
	}
	out := map[int]string{}
	for _, e := range entries {
		b, err := os.ReadFile(filepath.Join(s.Root, e.Name(), "ifindex"))
		if err != nil {
			continue
		}
		n, err := strconv.Atoi(strings.TrimSpace(string(b)))
		if err == nil {
			out[n] = e.Name()
		}
	}
	return out, nil
}

func (s SysLinks) Master(ifname string) (string, error) {
	t, err := os.Readlink(filepath.Join(s.Root, ifname, "master"))
	if err != nil {
		return "", err
	}
	return filepath.Base(t), nil
}

// ResolvDNS implements D1: the upstream servers dockerd gives containers
// on user networks. When the host resolv.conf only names the
// systemd-resolved stub (127.0.0.53), dockerd uses
// /run/systemd/resolve/resolv.conf instead; loopback servers are dropped.
type ResolvDNS struct {
	Host    string // the host's /etc/resolv.conf (as mounted in the guard)
	Systemd string // /run/systemd/resolve/resolv.conf
	Fixed   []netip.Addr

	mu   sync.Mutex
	last []netip.Addr
}

// ErrNoDNS means no upstream server could be read.
var ErrNoDNS = errors.New("no upstream DNS server")

func parseNameservers(b []byte) []netip.Addr {
	var out []netip.Addr
	for _, line := range strings.Split(string(b), "\n") {
		f := strings.Fields(line)
		if len(f) >= 2 && f[0] == "nameserver" {
			if a, err := netip.ParseAddr(f[1]); err == nil {
				out = append(out, a)
			}
		}
	}
	return out
}

// Servers returns the IPv4 upstream servers. A read failure after an
// earlier success keeps the last good list (systemd-resolved may be
// restarting); otherwise ErrNoDNS.
func (d *ResolvDNS) Servers() ([]netip.Addr, error) {
	if len(d.Fixed) > 0 {
		return d.Fixed, nil
	}
	got, err := d.read()
	d.mu.Lock()
	defer d.mu.Unlock()
	if err != nil || len(got) == 0 {
		if len(d.last) > 0 {
			return d.last, nil
		}
		return nil, ErrNoDNS
	}
	d.last = got
	return got, nil
}

func (d *ResolvDNS) read() ([]netip.Addr, error) {
	b, err := os.ReadFile(d.Host)
	if err != nil {
		return nil, err
	}
	ns := parseNameservers(b)
	if len(ns) == 1 && ns[0] == netip.MustParseAddr("127.0.0.53") {
		// The compose template mounts /run/systemd/resolve read-only. There
		// is no /proc/1/root fallback: AppArmor (docker-default) denies it,
		// and D7 forbids working around AppArmor.
		if d.Systemd == "" {
			return nil, ErrNoDNS
		}
		sb, err := os.ReadFile(d.Systemd)
		if err != nil {
			return nil, err
		}
		ns = parseNameservers(sb)
	}
	var out []netip.Addr
	for _, a := range ns {
		if a.Is4() && !a.IsLoopback() && !a.IsUnspecified() {
			out = append(out, a)
		}
	}
	return out, nil
}
