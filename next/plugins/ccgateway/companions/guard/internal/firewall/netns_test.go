//go:build netns

// L6 (05 §7): the firewall engine writes real iptables-nft rules in the
// network namespace of a privileged throwaway container. The topology
// mimics the host: an internal account bridge with an app and the shared
// gateway, the control bridge with the controller, another container
// network and an "internet" namespace. Docker's own rules are recreated
// by hand. Connectivity is checked with the test binary re-executed inside
// each namespace (GUARD_NETNS_HELPER), so only iptables, iproute2 and
// util-linux are needed. Run as root:
//
//	go test -tags netns -count=1 -v ./internal/firewall/
package firewall

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"net"
	"net/netip"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"ccgateway/guard/internal/dockerapi"
)

func TestMain(m *testing.M) {
	if mode := os.Getenv("GUARD_NETNS_HELPER"); mode != "" {
		os.Exit(helper(mode, os.Getenv("GUARD_NETNS_ADDR")))
	}
	os.Exit(m.Run())
}

// helper: listen-tcp, listen-udp (echo), dial-tcp, dial-udp, sleep.
func helper(mode, addr string) int {
	switch mode {
	case "sleep":
		fmt.Println("ready")
		select {}
	case "listen-tcp":
		l, err := net.Listen("tcp4", addr)
		if err != nil {
			fmt.Println("error", err)
			return 1
		}
		fmt.Println("ready")
		for {
			c, err := l.Accept()
			if err != nil {
				return 1
			}
			go func() { defer c.Close(); _, _ = io.Copy(c, c) }()
		}
	case "listen-udp":
		pc, err := net.ListenPacket("udp4", addr)
		if err != nil {
			fmt.Println("error", err)
			return 1
		}
		fmt.Println("ready")
		buf := make([]byte, 1500)
		for {
			n, from, err := pc.ReadFrom(buf)
			if err != nil {
				return 1
			}
			_, _ = pc.WriteTo(buf[:n], from)
		}
	case "dial-tcp", "dial-udp":
		c, err := net.DialTimeout(strings.TrimPrefix(mode, "dial-")+"4", addr, 1500*time.Millisecond)
		if err != nil {
			return 1
		}
		defer c.Close()
		_ = c.SetDeadline(time.Now().Add(1500 * time.Millisecond))
		if _, err := c.Write([]byte("ping\n")); err != nil {
			return 1
		}
		b := make([]byte, 5)
		if _, err := io.ReadFull(c, b); err != nil || string(b) != "ping\n" {
			return 1
		}
		return 0
	}
	return 2
}

type lab struct {
	t     *testing.T
	self  string
	procs []*exec.Cmd
	pids  map[string]int
}

func (l *lab) sh(cmd string) string {
	l.t.Helper()
	f := strings.Fields(cmd)
	out, err := exec.Command(f[0], f[1:]...).CombinedOutput()
	if err != nil {
		l.t.Fatalf("%s: %v\n%s", cmd, err, out)
	}
	return string(out)
}

// spawn starts the helper in namespace ns ("" = this namespace) and waits
// for "ready".
func (l *lab) spawn(ns, mode, addr string) int {
	l.t.Helper()
	var cmd *exec.Cmd
	if ns == "" {
		cmd = exec.Command(l.self)
	} else {
		cmd = exec.Command("ip", "netns", "exec", ns, l.self)
	}
	cmd.Env = append(os.Environ(), "GUARD_NETNS_HELPER="+mode, "GUARD_NETNS_ADDR="+addr)
	out, err := cmd.StdoutPipe()
	if err != nil {
		l.t.Fatal(err)
	}
	if err := cmd.Start(); err != nil {
		l.t.Fatal(err)
	}
	l.procs = append(l.procs, cmd)
	line, _ := bufio.NewReader(out).ReadString('\n')
	if strings.TrimSpace(line) != "ready" {
		l.t.Fatalf("%s %s %s: %q", ns, mode, addr, line)
	}
	return cmd.Process.Pid
}

// can reports whether ns reaches addr ("tcp"/"udp").
func (l *lab) can(ns, proto, addr string) bool {
	var cmd *exec.Cmd
	if ns == "" {
		cmd = exec.Command(l.self)
	} else {
		cmd = exec.Command("ip", "netns", "exec", ns, l.self)
	}
	cmd.Env = append(os.Environ(), "GUARD_NETNS_HELPER=dial-"+proto, "GUARD_NETNS_ADDR="+addr)
	return cmd.Run() == nil
}

func (l *lab) expect(ns, proto, addr string, want bool) {
	l.t.Helper()
	if got := l.can(ns, proto, addr); got != want {
		l.t.Fatalf("%s → %s %s: reachable=%v, want %v", nsName(ns), proto, addr, got, want)
	}
}

func nsName(ns string) string {
	if ns == "" {
		return "host"
	}
	return ns
}

const accBridge = "br-000000000100"

func setupLab(t *testing.T) *lab {
	if os.Geteuid() != 0 {
		t.Fatal("netns tests must run as root in a privileged container")
	}
	self, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	l := &lab{t: t, self: self, pids: map[string]int{}}
	t.Cleanup(func() {
		for _, p := range l.procs {
			_ = p.Process.Kill()
			_, _ = p.Process.Wait()
		}
	})
	out, _ := exec.Command("iptables", "-V").CombinedOutput()
	if !strings.Contains(string(out), "nf_tables") {
		t.Fatalf("iptables is not iptables-nft: %s", out)
	}
	if err := os.WriteFile("/proc/sys/net/bridge/bridge-nf-call-iptables", []byte("1"), 0o644); err != nil {
		t.Fatalf("br_netfilter is not available: %v", err)
	}
	l.sh("sysctl -w net.ipv4.ip_forward=1")
	bridge := func(name, cidr string) {
		l.sh("ip link add " + name + " type bridge")
		l.sh("ip addr add " + cidr + " dev " + name)
		l.sh("ip link set " + name + " up")
	}
	member := func(ns, veth, br, cidr, gw string) {
		l.sh("ip netns add " + ns)
		l.sh("ip link add " + veth + " type veth peer name eth0 netns " + ns)
		if br != "" {
			l.sh("ip link set " + veth + " master " + br)
		}
		l.sh("ip link set " + veth + " up")
		l.sh("ip -n " + ns + " link set lo up")
		l.sh("ip -n " + ns + " addr add " + cidr + " dev eth0")
		l.sh("ip -n " + ns + " link set eth0 up")
		if gw != "" {
			l.sh("ip -n " + ns + " route add default via " + gw)
		}
	}
	bridge(accBridge, "10.1.0.1/24")
	bridge("ccg-control0", "172.29.255.1/29")
	bridge("brother", "172.30.0.1/24")
	member("app", "vetha1", accBridge, "10.1.0.3/24", "10.1.0.2")
	member("gw", "vethb1", accBridge, "10.1.0.2/24", "")
	l.sh("ip -n gw addr add 198.51.100.1/32 dev lo")
	member("ctl", "vethc1", "ccg-control0", "172.29.255.2/29", "172.29.255.1")
	member("other", "vethd1", "brother", "172.30.0.2/24", "172.30.0.1")
	member("out", "vout", "", "203.0.113.1/24", "")
	l.sh("ip addr add 203.0.113.254/24 dev vout")
	l.sh("ip addr add 192.0.2.254/24 dev vout")
	l.sh("ip -n out addr add 192.0.2.53/24 dev eth0")
	l.sh("ip -n out route add default via 203.0.113.254")
	t.Cleanup(func() {
		for _, ns := range []string{"app", "gw", "ctl", "other", "out"} {
			_ = exec.Command("ip", "netns", "del", ns).Run()
		}
	})

	// Docker's rules, as on ovh: FORWARD → DOCKER-USER → DOCKER-FORWARD.
	for _, r := range []string{
		"-P FORWARD DROP",
		"-N DOCKER-USER", "-N DOCKER-FORWARD",
		"-A FORWARD -j DOCKER-USER", "-A FORWARD -j DOCKER-FORWARD",
		"-A DOCKER-USER -m comment --comment other-service -j RETURN",
		// internal account network
		"-A DOCKER-FORWARD -i " + accBridge + " ! -d 10.1.0.0/24 -j DROP",
		"-A DOCKER-FORWARD -o " + accBridge + " ! -s 10.1.0.0/24 -j DROP",
		"-A DOCKER-FORWARD -i " + accBridge + " -o " + accBridge + " -j ACCEPT",
		// ccg-control: a normal bridge with the published 8787
		"-A DOCKER-FORWARD -o ccg-control0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT",
		"-A DOCKER-FORWARD -d 172.29.255.2/32 ! -i ccg-control0 -o ccg-control0 -p tcp -m tcp --dport 8787 -j ACCEPT",
		"-A DOCKER-FORWARD -i ccg-control0 ! -o ccg-control0 -j ACCEPT",
		// another container network and the internet
		"-A DOCKER-FORWARD -i brother -j ACCEPT",
		"-A DOCKER-FORWARD -o brother -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT",
		"-A DOCKER-FORWARD -i vout -j ACCEPT",
	} {
		l.sh("iptables -w 5 " + r)
	}
	l.sh("iptables -w 5 -t nat -A POSTROUTING -s 172.29.255.0/29 ! -o ccg-control0 -j MASQUERADE")

	l.pids["app"] = l.spawn("app", "sleep", "")
	l.pids["gw"] = l.spawn("gw", "sleep", "")
	l.spawn("gw", "listen-tcp", "198.51.100.1:80")
	l.spawn("gw", "listen-udp", "198.51.100.1:53")
	l.spawn("app", "listen-tcp", "10.1.0.3:8787")
	l.spawn("app", "listen-tcp", "10.1.0.3:22")
	l.spawn("out", "listen-tcp", "203.0.113.1:443")
	l.spawn("out", "listen-tcp", "192.0.2.53:53")
	l.spawn("out", "listen-udp", "192.0.2.53:53")
	l.spawn("ctl", "listen-tcp", "172.29.255.2:8787")
	l.spawn("", "listen-tcp", "172.29.255.1:8790")
	l.spawn("", "listen-tcp", "172.29.255.1:8791")
	return l
}

// labDocker is the Docker view of the lab: app and gateway hold the real
// sleeper PIDs so the engine's nsenter lookups are real.
func labDocker(t *testing.T, l *lab) *fakeDocker {
	netID := "000000000100" + strings.Repeat("e", 52)
	d := &fakeDocker{containers: map[string]*dockerapi.ContainerInfo{}, networks: map[string]*dockerapi.NetworkInfo{
		"ccg-21-net": {Name: "ccg-21-net", ID: netID, Internal: true, Labels: map[string]string{"io.sup2api.ccgateway.account": "21"},
			IPAM: dockerapi.IPAM{Config: []dockerapi.IPAMConfig{{Subnet: "10.1.0.0/24", Gateway: "10.1.0.1"}}}},
	}}
	d.containers["app21"] = info(t, fmt.Sprintf(`{"Id":"app21","Name":"/ccg-21-app","State":{"Status":"running","Running":true,"Pid":%d,"StartedAt":"t1"},
		"Config":{"Labels":{"io.sup2api.ccgateway.account":"21"}},
		"NetworkSettings":{"Networks":{"ccg-21-net":{"NetworkID":"%s","IPAddress":"10.1.0.3","EndpointID":"ea"}}}}`, l.pids["app"], netID))
	d.containers["gw"] = info(t, fmt.Sprintf(`{"Id":"gw","Name":"/ccg-shared-egress","State":{"Status":"running","Running":true,"Pid":%d,"StartedAt":"t0"},
		"Config":{"Labels":{"io.sup2api.ccgateway.shared":"ccg"}},
		"NetworkSettings":{"Networks":{"ccg-21-net":{"NetworkID":"%s","IPAddress":"10.1.0.2","EndpointID":"eg"}}}}`, l.pids["gw"], netID))
	return d
}

// failingIPT makes iptables-restore fail on demand.
type failingIPT struct {
	mu       sync.Mutex
	fail     bool
	restores int
	r        Runner
}

func (f *failingIPT) Run(ctx context.Context, argv []string, stdin []byte) ([]byte, error) {
	f.mu.Lock()
	fail := f.fail
	if strings.HasSuffix(argv[0], "iptables-restore") {
		f.restores++
	}
	f.mu.Unlock()
	if fail && strings.HasSuffix(argv[0], "iptables-restore") {
		return f.r.Run(ctx, argv, []byte("*filter\n-A NO-SUCH-CHAIN -j ACCEPT\nCOMMIT\n"))
	}
	return f.r.Run(ctx, argv, stdin)
}

func (l *lab) chain(name string) string { return l.sh("iptables -w 5 -S " + name) }

// covers: L6 IT-S02 IT-S04 IT-S05 N1 N2 N4 N5 N7 03§7 D1 the three chains in a real kernel
func TestNetnsFirewall(t *testing.T) {
	l := setupLab(t)

	t.Run("baseline without guard", func(t *testing.T) {
		l.t = t
		l.expect("app", "tcp", "198.51.100.1:80", false) // Docker's internal rule
		l.expect("ctl", "tcp", "203.0.113.1:443", true)  // the control bridge is a normal bridge
		l.expect("other", "tcp", "172.29.255.2:8787", true)
		l.expect("ctl", "tcp", "172.29.255.1:8791", true)
		l.expect("", "tcp", "172.29.255.1:8790", true)
	})

	d := labDocker(t, l)
	ipt := &failingIPT{r: ExecRunner{Timeout: 15 * time.Second, Limit: 8 << 20}}
	e := New(Options{Prefix: "ccg", Chains: ChainNames("CCG"),
		Control: Control{Bridge: "ccg-control0", ControllerIP: netip.MustParseAddr("172.29.255.2"), GuardIP: netip.MustParseAddr("172.29.255.1"), GuardPort: 8790},
		DNS:     func() ([]netip.Addr, error) { return []netip.Addr{netip.MustParseAddr("192.0.2.53")}, nil },
		Tools:   DefaultTools(), Docker: d, NS: ExecRunner{Timeout: 5 * time.Second, Limit: 1 << 20}, IPT: ipt,
		Links: SysLinks{Root: "/sys/class/net"}, RetryDelay: time.Hour, FailDelay: time.Hour})

	t.Run("initial write", func(t *testing.T) {
		l.t = t
		if err := e.Initial(context.Background()); err != nil {
			t.Fatal(err)
		}
		if e.Status() != "ok" {
			t.Fatal(e.Status())
		}
		w := e.Written()
		if len(w["CCG-PROXY-BRIDGE"]) != 2 || len(w["CCG-CONTROL-FWD"]) != 7 || len(w["CCG-CONTROL-IN"]) != 4 {
			t.Fatalf("%v", w)
		}
		if !strings.Contains(w["CCG-PROXY-BRIDGE"][0].String(), "--physdev-in vetha1 --physdev-out vethb1") {
			t.Fatalf("real veth lookup: %v", w["CCG-PROXY-BRIDGE"][0])
		}
	})

	t.Run("jumps first, other rules kept", func(t *testing.T) {
		l.t = t
		du := ParseChain(l.chain("DOCKER-USER"), "DOCKER-USER")
		if len(du) != 3 || du[2].String() != "-m comment --comment other-service -j RETURN" {
			t.Fatalf("%v", du)
		}
		in := ParseChain(l.chain("INPUT"), "INPUT")
		if len(in) != 1 || !strings.Contains(in[0].String(), "-j CCG-CONTROL-IN") {
			t.Fatalf("%v", in)
		}
	})

	t.Run("kernel equals written after normalization", func(t *testing.T) {
		l.t = t
		w := e.Written()
		for _, ch := range ChainNames("CCG").All() {
			if d := Diff(w[ch], ParseChain(l.chain(ch), ch), ch != "CCG-PROXY-BRIDGE"); len(d) != 0 {
				t.Fatalf("%s: %v", ch, d)
			}
		}
	})

	t.Run("account to gateway allowed, tcp only", func(t *testing.T) {
		l.t = t
		l.expect("app", "tcp", "198.51.100.1:80", true)
		l.expect("app", "udp", "198.51.100.1:53", false)
	})

	t.Run("controller to worker 8787 only", func(t *testing.T) {
		l.t = t
		l.expect("ctl", "tcp", "10.1.0.3:8787", true)
		l.expect("ctl", "tcp", "10.1.0.3:22", false)
	})

	t.Run("controller DNS to upstream only (D1)", func(t *testing.T) {
		l.t = t
		l.expect("ctl", "udp", "192.0.2.53:53", true)
		l.expect("ctl", "tcp", "192.0.2.53:53", true)
		l.expect("ctl", "tcp", "203.0.113.1:443", false)
		l.expect("ctl", "tcp", "192.0.2.53:443", false)
	})

	t.Run("nobody else reaches the controller", func(t *testing.T) {
		l.t = t
		l.expect("other", "tcp", "172.29.255.2:8787", false)
	})

	t.Run("only the controller reaches the guard", func(t *testing.T) {
		l.t = t
		l.expect("ctl", "tcp", "172.29.255.1:8790", true)
		l.expect("ctl", "tcp", "172.29.255.1:8791", false)
		l.expect("", "tcp", "172.29.255.1:8790", false)
		l.expect("other", "tcp", "172.29.255.1:8790", false)
	})

	t.Run("reapply changes nothing", func(t *testing.T) {
		l.t = t
		before := map[string]string{}
		for _, ch := range append(ChainNames("CCG").All(), "DOCKER-USER", "INPUT") {
			before[ch] = l.chain(ch)
		}
		n := ipt.restores
		_ = e.cycle(context.Background(), true, nil, true)
		if ipt.restores != n {
			t.Fatal("unchanged rules rewritten")
		}
		e.Rewrite()
		_ = e.cycle(context.Background(), true, nil, true)
		for ch, s := range before {
			if l.chain(ch) != s {
				t.Fatalf("%s changed:\n%s\n%s", ch, s, l.chain(ch))
			}
		}
	})

	t.Run("stopped account loses its exceptions", func(t *testing.T) {
		l.t = t
		d.mu.Lock()
		d.containers["app21"].State.Status = "exited"
		d.mu.Unlock()
		_ = e.cycle(context.Background(), false, []string{"21"}, false)
		l.expect("app", "tcp", "198.51.100.1:80", false)
		l.expect("ctl", "tcp", "10.1.0.3:8787", false)
		if !strings.Contains(l.chain("CCG-CONTROL-IN"), "ccgateway-control-guard") {
			t.Fatal("CONTROL-IN must stay")
		}
		d.mu.Lock()
		d.containers["app21"].State.Status = "running"
		d.mu.Unlock()
		_ = e.cycle(context.Background(), false, []string{"21"}, false)
		l.expect("app", "tcp", "198.51.100.1:80", true)
	})

	t.Run("failed write keeps the kernel rules", func(t *testing.T) {
		l.t = t
		before := l.chain("CCG-PROXY-BRIDGE")
		ipt.mu.Lock()
		ipt.fail = true
		ipt.mu.Unlock()
		d.mu.Lock()
		d.containers["app21"].State.Status = "exited"
		d.mu.Unlock()
		_ = e.cycle(context.Background(), false, []string{"21"}, false)
		if e.Status() != "failed" || l.chain("CCG-PROXY-BRIDGE") != before {
			t.Fatalf("%s\n%s", e.Status(), l.chain("CCG-PROXY-BRIDGE"))
		}
		ipt.mu.Lock()
		ipt.fail = false
		ipt.mu.Unlock()
		d.mu.Lock()
		d.containers["app21"].State.Status = "running"
		d.mu.Unlock()
		_ = e.cycle(context.Background(), true, nil, true)
		if e.Status() != "ok" {
			t.Fatal(e.Status())
		}
	})

	t.Run("fail closed when docker is unreachable", func(t *testing.T) {
		l.t = t
		d.mu.Lock()
		d.listErr = fmt.Errorf("docker down")
		d.mu.Unlock()
		_ = e.cycle(context.Background(), true, nil, false)
		if len(ParseChain(l.chain("CCG-PROXY-BRIDGE"), "CCG-PROXY-BRIDGE")) != 0 ||
			len(ParseChain(l.chain("CCG-CONTROL-FWD"), "CCG-CONTROL-FWD")) != 2 ||
			len(ParseChain(l.chain("CCG-CONTROL-IN"), "CCG-CONTROL-IN")) != 4 {
			t.Fatal("not failed closed")
		}
		l.expect("app", "tcp", "198.51.100.1:80", false)
		l.expect("ctl", "tcp", "203.0.113.1:443", false)
		l.expect("", "tcp", "172.29.255.1:8790", false)
		d.mu.Lock()
		d.listErr = nil
		d.mu.Unlock()
		_ = e.cycle(context.Background(), true, nil, false)
		l.expect("app", "tcp", "198.51.100.1:80", true)
	})

	t.Run("duplicate and missing jumps repaired", func(t *testing.T) {
		l.t = t
		l.sh("iptables -w 5 -I DOCKER-USER 1 -m comment --comment ccgateway-managed-proxy-bridge -j CCG-PROXY-BRIDGE")
		l.sh("iptables -w 5 -D INPUT -m comment --comment ccgateway-managed-control-in -j CCG-CONTROL-IN")
		_ = e.cycle(context.Background(), true, nil, true)
		du := l.chain("DOCKER-USER")
		if strings.Count(du, "-j CCG-PROXY-BRIDGE") != 1 || strings.Count(du, "-j CCG-CONTROL-FWD") != 1 ||
			strings.Count(l.chain("INPUT"), "-j CCG-CONTROL-IN") != 1 || !strings.Contains(du, "other-service") {
			t.Fatalf("%s\n%s", du, l.chain("INPUT"))
		}
	})

	t.Run("external flush is repaired", func(t *testing.T) {
		l.t = t
		l.sh("iptables -w 5 -F CCG-PROXY-BRIDGE")
		l.expect("app", "tcp", "198.51.100.1:80", false)
		_ = e.cycle(context.Background(), true, nil, true)
		l.expect("app", "tcp", "198.51.100.1:80", true)
	})

	t.Run("print-cleanup removes everything", func(t *testing.T) {
		l.t = t
		for _, c := range Cleanup(ChainNames("CCG")) {
			l.sh(strings.Replace(c, "iptables", "iptables", 1))
		}
		all := l.sh("iptables -w 5 -S")
		if strings.Contains(all, "CCG-") || !strings.Contains(all, "other-service") {
			t.Fatal(all)
		}
	})
	_ = strconv.Itoa
}
