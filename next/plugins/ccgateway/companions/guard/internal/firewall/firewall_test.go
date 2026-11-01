package firewall

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/netip"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

	"ccgateway/guard/internal/dockerapi"
)

// ---- fixtures (the Python test's setUp) ----

func info(t *testing.T, raw string) *dockerapi.ContainerInfo {
	t.Helper()
	var c dockerapi.ContainerInfo
	if err := json.Unmarshal([]byte(raw), &c); err != nil {
		t.Fatal(err)
	}
	return &c
}

type fixture struct {
	app, gw *dockerapi.ContainerInfo
	net     *dockerapi.NetworkInfo
}

func setup(t *testing.T) *fixture {
	app := info(t, `{"Id":"a21","Name":"/ccg-21-app","State":{"Status":"running","Running":true,"Pid":21,"StartedAt":"t1"},
		"Config":{"Labels":{"io.sup2api.ccgateway.account":"21"}},
		"NetworkSettings":{"Networks":{"ccg-21-net":{"NetworkID":"netid","IPAddress":"10.1.0.3","EndpointID":"e1"}}}}`)
	gw := info(t, `{"Id":"gw","Name":"/ccg-shared-egress","State":{"Status":"running","Running":true,"Pid":30,"StartedAt":"t0"},
		"Config":{"Labels":{"io.sup2api.ccgateway.shared":"ccg"}},
		"NetworkSettings":{"Networks":{"ccg-21-net":{"NetworkID":"netid","IPAddress":"10.1.0.2","EndpointID":"e2"}}}}`)
	net := &dockerapi.NetworkInfo{Name: "ccg-21-net", ID: "netid000000000000", Internal: true,
		Labels: map[string]string{"io.sup2api.ccgateway.account": "21"},
		IPAM:   dockerapi.IPAM{Config: []dockerapi.IPAMConfig{{Subnet: "10.1.0.0/24", Gateway: "10.1.0.1"}}}}
	net.ID = "netid"
	return &fixture{app: app, gw: gw, net: net}
}

func (f *fixture) rules() []Rule {
	return BridgeRules(BridgeInput{AID: "21", App: f.app, Gateway: f.gw, Network: f.net, AppVeth: "vethabc",
		GatewayVeth: "vethdef", DefaultRoute: "10.1.0.2", Prefix: "ccg"})
}

func idx(r Rule, s string) int {
	for i, x := range r {
		if x == s {
			return i
		}
	}
	return -1
}

func has(r Rule, s string) bool { return idx(r, s) >= 0 }

// covers: python test_syncing_account_targets_only_its_proxy_peer
func TestBridgeRulesTargetOnlyProxyPeer(t *testing.T) {
	rules := setup(t).rules()
	if len(rules) != 2 {
		t.Fatalf("%v", rules)
	}
	out, back := rules[0], rules[1]
	if out[idx(out, "--physdev-out")+1] != "vethdef" || !has(out, "10.1.0.3/32") || !has(out, "tcp") {
		t.Fatalf("out %v", out)
	}
	if !has(back, "ESTABLISHED,RELATED") || back[idx(back, "--physdev-in")+1] != "vethdef" {
		t.Fatalf("back %v", back)
	}
}

// covers: python test_stopped_or_blocked_account_has_no_exception (blocked = app stopped or gateway detached)
func TestBridgeRulesStoppedOrBlocked(t *testing.T) {
	f := setup(t)
	f.app.State.Status = "exited"
	if f.rules() != nil {
		t.Fatal("stopped app")
	}
	f = setup(t)
	delete(f.gw.NetworkSettings.Networks, "ccg-21-net")
	if f.rules() != nil {
		t.Fatal("gateway detached (manager.block)")
	}
	f = setup(t)
	f.gw.State.Status = "restarting"
	if f.rules() != nil {
		t.Fatal("gateway not running")
	}
}

// covers: python test_public_or_wrong_owner_network_is_rejected
func TestBridgeRulesRejectPublicOrForeignNetwork(t *testing.T) {
	f := setup(t)
	f.net.Internal = false
	if f.rules() != nil {
		t.Fatal("public network")
	}
	f = setup(t)
	f.net.Labels["io.sup2api.ccgateway.account"] = "22"
	if f.rules() != nil {
		t.Fatal("foreign network")
	}
	f = setup(t)
	f.app.Config.Labels["io.sup2api.ccgateway.account"] = "22"
	if f.rules() != nil {
		t.Fatal("foreign app")
	}
}

// covers: python test_changed_endpoint_or_additional_network_is_rejected
func TestBridgeRulesRejectChangedEndpoint(t *testing.T) {
	f := setup(t)
	r := BridgeRules(BridgeInput{AID: "21", App: f.app, Gateway: f.gw, Network: f.net, AppVeth: "vethabc",
		GatewayVeth: "vethdef", DefaultRoute: "10.1.0.9", Prefix: "ccg"})
	if r != nil {
		t.Fatal("default route not via gateway")
	}
	f = setup(t)
	ep := f.gw.NetworkSettings.Networks["ccg-21-net"]
	ep.NetworkID = "other"
	f.gw.NetworkSettings.Networks["ccg-21-net"] = ep
	if f.rules() != nil {
		t.Fatal("gateway endpoint on another network id")
	}
	f = setup(t)
	f.app.NetworkSettings.Networks["public"] = dockerapi.EndpointInfo{NetworkID: "pub", IPAddress: "172.17.0.5"}
	if f.rules() != nil {
		t.Fatal("app on an extra network")
	}
	f = setup(t)
	ep = f.gw.NetworkSettings.Networks["ccg-21-net"]
	ep.IPAddress = "10.1.0.3"
	f.gw.NetworkSettings.Networks["ccg-21-net"] = ep
	if BridgeRules(BridgeInput{AID: "21", App: f.app, Gateway: f.gw, Network: f.net, AppVeth: "vethabc",
		GatewayVeth: "vethdef", DefaultRoute: "10.1.0.3", Prefix: "ccg"}) != nil {
		t.Fatal("same address")
	}
	f = setup(t)
	if BridgeRules(BridgeInput{AID: "21", App: f.app, Gateway: f.gw, Network: f.net, AppVeth: "vethabc",
		GatewayVeth: "vethabc", DefaultRoute: "10.1.0.2", Prefix: "ccg"}) != nil {
		t.Fatal("same veth")
	}
	if BridgeRules(BridgeInput{AID: "21", App: f.app, Gateway: f.gw, Network: f.net, AppVeth: "eth0",
		GatewayVeth: "vethdef", DefaultRoute: "10.1.0.2", Prefix: "ccg"}) != nil {
		t.Fatal("not a veth")
	}
}

// covers: python test_peer_must_be_this_controllers_shared_gateway
func TestBridgeRulesPeerMustBeOwnGateway(t *testing.T) {
	f := setup(t)
	if len(f.rules()) != 2 {
		t.Fatal("baseline")
	}
	f.gw.Config.Labels = map[string]string{"io.sup2api.ccgateway.shared": "ccg-other"}
	if f.rules() != nil {
		t.Fatal("other instance's gateway")
	}
	f.gw.Config.Labels = map[string]string{"io.sup2api.ccgateway.account": "21"}
	if f.rules() != nil {
		t.Fatal("leftover per-account egress")
	}
	f = setup(t)
	f.gw.Config.Labels = map[string]string{"io.sup2api.ccgateway.shared": "ccg-np-test"}
	f.net.Name = "ccg-np-test-21-net"
	f.app.NetworkSettings.Networks = map[string]dockerapi.EndpointInfo{"ccg-np-test-21-net": f.app.NetworkSettings.Networks["ccg-21-net"]}
	f.gw.NetworkSettings.Networks = map[string]dockerapi.EndpointInfo{"ccg-np-test-21-net": f.gw.NetworkSettings.Networks["ccg-21-net"]}
	if len(BridgeRules(BridgeInput{AID: "21", App: f.app, Gateway: f.gw, Network: f.net, AppVeth: "vethabc",
		GatewayVeth: "vethdef", DefaultRoute: "10.1.0.2", Prefix: "ccg-np-test"})) != 2 {
		t.Fatal("isolated prefix")
	}
}

// covers: python test_separate_chain_flushes_only_itself
func TestRestoreScriptTouchesOnlyOwnChain(t *testing.T) {
	script := RestoreScript([]string{"CCG-NPTEST-BRIDGE"}, map[string][]Rule{"CCG-NPTEST-BRIDGE": {{"-s", "10.1.0.3/32", "-j", "ACCEPT"}}})
	if !strings.Contains(script, ":CCG-NPTEST-BRIDGE - [0:0]\n-F CCG-NPTEST-BRIDGE\n-A CCG-NPTEST-BRIDGE ") {
		t.Fatal(script)
	}
	if strings.Contains(script, "CCG-PROXY-BRIDGE") || !strings.HasPrefix(script, "*filter\n") || !strings.HasSuffix(script, "COMMIT\n") {
		t.Fatal(script)
	}
	if JumpComment("ccgateway-managed-proxy-bridge", "CCG-NPTEST-BRIDGE", "CCG-PROXY-BRIDGE") != "ccgateway-managed-proxy-bridge-ccg-nptest-bridge" {
		t.Fatal("isolated jump comment")
	}
	j := ChainNames("CCG").Jumps()
	if j[0].Comment != "ccgateway-managed-proxy-bridge" || j[0].Parent != "DOCKER-USER" || j[2].Parent != "INPUT" {
		t.Fatalf("%+v", j)
	}
	gt := ChainNames("CCG-GT").Jumps()
	if gt[0].Comment != "ccgateway-managed-proxy-bridge-ccg-gt-proxy-bridge" || gt[1].Chain != "CCG-GT-CONTROL-FWD" {
		t.Fatalf("%+v", gt)
	}
}

// ---- engine fakes ----

type fakeDocker struct {
	mu         sync.Mutex
	containers map[string]*dockerapi.ContainerInfo
	networks   map[string]*dockerapi.NetworkInfo
	listErr    error
	inspects   int
}

func (d *fakeDocker) ContainerList(ctx context.Context, f dockerapi.Filters, all bool) ([]dockerapi.ContainerSummary, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.listErr != nil {
		return nil, d.listErr
	}
	var out []dockerapi.ContainerSummary
	for _, c := range d.containers {
		if _, ok := c.Config.Labels["io.sup2api.ccgateway.account"]; ok {
			out = append(out, dockerapi.ContainerSummary{ID: c.ID, Names: []string{c.Name}, Labels: c.Config.Labels})
		}
	}
	return out, nil
}

func (d *fakeDocker) ContainerInspect(ctx context.Context, id string) (dockerapi.Raw, *dockerapi.ContainerInfo, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.inspects++
	for _, c := range d.containers {
		if c.ID == id || c.TrimName() == id {
			cp := *c
			return nil, &cp, nil
		}
	}
	return nil, nil, &dockerapi.Error{Status: 404, Message: "no such container"}
}

func (d *fakeDocker) NetworkInspect(ctx context.Context, id string) (dockerapi.Raw, *dockerapi.NetworkInfo, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if n, ok := d.networks[id]; ok {
		return nil, n, nil
	}
	return nil, nil, &dockerapi.Error{Status: 404, Message: "no such network"}
}

type fakeRun struct {
	mu     sync.Mutex
	calls  [][]string
	stdin  []string
	fn     func(argv []string) ([]byte, error)
	kernel map[string]string // chain → iptables -S output
}

func (r *fakeRun) Run(ctx context.Context, argv []string, stdin []byte) ([]byte, error) {
	r.mu.Lock()
	r.calls = append(r.calls, argv)
	if stdin != nil {
		r.stdin = append(r.stdin, string(stdin))
	}
	fn := r.fn
	r.mu.Unlock()
	if fn != nil {
		return fn(argv)
	}
	return nil, nil
}

func (r *fakeRun) count(prog string) int {
	r.mu.Lock()
	defer r.mu.Unlock()
	n := 0
	for _, c := range r.calls {
		if strings.HasSuffix(c[0], prog) {
			n++
		}
	}
	return n
}

type fakeLinks struct {
	idx    map[int]string
	master map[string]string
}

func (l fakeLinks) Ifindexes() (map[int]string, error) { return l.idx, nil }
func (l fakeLinks) Master(n string) (string, error) {
	if m, ok := l.master[n]; ok {
		return m, nil
	}
	return "", errors.New("no master")
}

var tools = Tools{Iptables: "/usr/sbin/iptables", IptablesRestore: "/usr/sbin/iptables-restore", Nsenter: "/usr/bin/nsenter", IP: "/usr/sbin/ip"}

var ctl = Control{Bridge: "ccg-control0", ControllerIP: netip.MustParseAddr("172.29.255.2"), GuardIP: netip.MustParseAddr("172.29.255.1"), GuardPort: 8790}

// world is two accounts (21, 22) and the shared gateway.
func world(t *testing.T) (*fakeDocker, *fakeRun, fakeLinks) {
	d := &fakeDocker{containers: map[string]*dockerapi.ContainerInfo{}, networks: map[string]*dockerapi.NetworkInfo{}}
	gwNets := map[string]dockerapi.EndpointInfo{}
	idx := map[int]string{}
	master := map[string]string{}
	for i, aid := range []string{"21", "22"} {
		netID := fmt.Sprintf("%012d", 100+i) + "aaaa"
		sub := fmt.Sprintf("10.%d.0", i+1)
		d.networks["ccg-"+aid+"-net"] = &dockerapi.NetworkInfo{Name: "ccg-" + aid + "-net", ID: netID, Internal: true,
			Labels: map[string]string{"io.sup2api.ccgateway.account": aid},
			IPAM:   dockerapi.IPAM{Config: []dockerapi.IPAMConfig{{Subnet: sub + ".0/24", Gateway: sub + ".1"}}}}
		app := info(t, fmt.Sprintf(`{"Id":"app%s","Name":"/ccg-%s-app","State":{"Status":"running","Running":true,"Pid":%s,"StartedAt":"t"},
			"Config":{"Labels":{"io.sup2api.ccgateway.account":"%s"}},
			"NetworkSettings":{"Networks":{"ccg-%s-net":{"NetworkID":"%s","IPAddress":"%s.3","EndpointID":"e%s"}}}}`,
			aid, aid, aid, aid, aid, netID, sub, aid))
		d.containers[app.ID] = app
		gwNets["ccg-"+aid+"-net"] = dockerapi.EndpointInfo{NetworkID: netID, IPAddress: sub + ".2", EndpointID: "g" + aid}
		idx[100+i*10] = "vetha" + aid
		idx[101+i*10] = "vethb" + aid
		master["vetha"+aid] = "br-" + netID[:12]
		master["vethb"+aid] = "br-" + netID[:12]
	}
	gw := info(t, `{"Id":"gw","Name":"/ccg-shared-egress","State":{"Status":"running","Running":true,"Pid":30,"StartedAt":"t"},
		"Config":{"Labels":{"io.sup2api.ccgateway.shared":"ccg"}}}`)
	gw.NetworkSettings.Networks = gwNets
	d.containers["gw"] = gw
	run := &fakeRun{}
	run.fn = func(argv []string) ([]byte, error) {
		switch {
		case strings.HasSuffix(argv[0], "nsenter"):
			pid := argv[2]
			if strings.Contains(strings.Join(argv, " "), "route") {
				return []byte(fmt.Sprintf(`[{"dst":"default","gateway":"10.%s.0.2"}]`, map[string]string{"21": "1", "22": "2"}[pid])), nil
			}
			if pid == "30" {
				return []byte(`[{"ifindex":1,"addr_info":[{"local":"127.0.0.1"}]},{"link_index":101,"addr_info":[{"local":"10.1.0.2"}]},{"link_index":111,"addr_info":[{"local":"10.2.0.2"}]}]`), nil
			}
			sub := map[string]string{"21": "1", "22": "2"}[pid]
			link := map[string]int{"21": 100, "22": 110}[pid]
			return []byte(fmt.Sprintf(`[{"link_index":%d,"addr_info":[{"local":"10.%s.0.3"}]}]`, link, sub)), nil
		case strings.HasSuffix(argv[0], "iptables") && argv[3] == "-S":
			run.mu.Lock()
			defer run.mu.Unlock()
			return []byte(run.kernel[argv[4]]), nil
		}
		return nil, nil
	}
	run.kernel = map[string]string{}
	return d, run, fakeLinks{idx: idx, master: master}
}

func engine(d *fakeDocker, run *fakeRun, links fakeLinks, dns []netip.Addr) *Engine {
	o := Options{Prefix: "ccg", Chains: ChainNames("CCG"), Control: ctl, Tools: tools, Docker: d, NS: run, IPT: run,
		Links: links, RetryDelay: time.Hour, FailDelay: time.Hour}
	if dns != nil {
		o.DNS = func() ([]netip.Addr, error) { return dns, nil }
	}
	return New(o)
}

// covers: python test_disappearing_account_does_not_remove_other_accounts; 03§7.7 row 1
func TestDisappearingAccountKeepsOthers(t *testing.T) {
	d, run, links := world(t)
	base := run.fn
	run.fn = func(argv []string) ([]byte, error) {
		if strings.HasSuffix(argv[0], "nsenter") && argv[2] == "22" {
			return nil, &ExecError{Prog: argv[0], Code: 1}
		}
		return base(argv)
	}
	e := engine(d, run, links, nil)
	desired, err := e.Desired(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	b := desired["CCG-PROXY-BRIDGE"]
	if len(b) != 2 || !has(b[0], "ccgateway-21-proxy-out") {
		t.Fatalf("%v", b)
	}
	// The control rules of 22 do not depend on nsenter and stay.
	if !strings.Contains(fmt.Sprint(desired["CCG-CONTROL-FWD"]), "ccgateway-22-control") {
		t.Fatal("control rules of the skipped account")
	}
}

// covers: 03§7.2 rules deterministic (ordered by key)
func TestRulesDeterministic(t *testing.T) {
	d, run, links := world(t)
	a, _ := engine(d, run, links, nil).Desired(context.Background())
	b, _ := engine(d, run, links, nil).Desired(context.Background())
	if !reflect.DeepEqual(a, b) {
		t.Fatal("not deterministic")
	}
	got := RestoreScript(ChainNames("CCG").All(), a)
	if strings.Index(got, "ccgateway-21-proxy-out") > strings.Index(got, "ccgateway-22-proxy-out") {
		t.Fatal("order")
	}
}

// covers: 03§7.4 §7.5 D1 control chains, full text, DNS on and off
func TestControlRules(t *testing.T) {
	d, run, links := world(t)
	off, _ := engine(d, run, links, nil).Desired(context.Background())
	want := []string{
		"-i ccg-control0 -o br-000000000100 -s 172.29.255.2/32 -d 10.1.0.3/32 -p tcp -m tcp --dport 8787 -m comment --comment ccgateway-21-control -j ACCEPT",
		"-i br-000000000100 -o ccg-control0 -s 10.1.0.3/32 -d 172.29.255.2/32 -p tcp -m tcp --sport 8787 -m conntrack --ctstate ESTABLISHED,RELATED -m comment --comment ccgateway-21-control-return -j ACCEPT",
		"-i ccg-control0 -o br-000000000101 -s 172.29.255.2/32 -d 10.2.0.3/32 -p tcp -m tcp --dport 8787 -m comment --comment ccgateway-22-control -j ACCEPT",
		"-i br-000000000101 -o ccg-control0 -s 10.2.0.3/32 -d 172.29.255.2/32 -p tcp -m tcp --sport 8787 -m conntrack --ctstate ESTABLISHED,RELATED -m comment --comment ccgateway-22-control-return -j ACCEPT",
		"-i ccg-control0 -m comment --comment ccgateway-control-egress-deny -j DROP",
		"-o ccg-control0 -m comment --comment ccgateway-control-ingress-deny -j DROP",
	}
	var got []string
	for _, r := range off["CCG-CONTROL-FWD"] {
		got = append(got, r.String())
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("%s", strings.Join(got, "\n"))
	}
	in := []string{
		"-i ccg-control0 -s 172.29.255.2/32 -d 172.29.255.1/32 -p tcp -m tcp --dport 8790 -m comment --comment ccgateway-control-guard -j ACCEPT",
		"-d 172.29.255.1/32 -p tcp -m tcp --dport 8790 -m comment --comment ccgateway-control-guard-deny -j DROP",
		"-i ccg-control0 -m conntrack --ctstate ESTABLISHED,RELATED -m comment --comment ccgateway-control-established -j ACCEPT",
		"-i ccg-control0 -m comment --comment ccgateway-control-host-deny -j DROP",
	}
	got = nil
	for _, r := range off["CCG-CONTROL-IN"] {
		got = append(got, r.String())
	}
	if !reflect.DeepEqual(got, in) {
		t.Fatalf("%s", strings.Join(got, "\n"))
	}
	on, _ := engine(d, run, links, []netip.Addr{netip.MustParseAddr("8.8.8.8"), netip.MustParseAddr("1.1.1.1"), netip.MustParseAddr("1.1.1.1")}).Desired(context.Background())
	fwd := on["CCG-CONTROL-FWD"]
	if len(fwd) != len(want)+6 {
		t.Fatalf("dns rules %d", len(fwd))
	}
	dns := fwd[4:10]
	if dns[0].String() != "-i ccg-control0 -s 172.29.255.2/32 -d 1.1.1.1/32 -p udp -m udp --dport 53 -m comment --comment ccgateway-control-dns -j ACCEPT" ||
		dns[1].String() != "-i ccg-control0 -s 172.29.255.2/32 -d 1.1.1.1/32 -p tcp -m tcp --dport 53 -m comment --comment ccgateway-control-dns -j ACCEPT" ||
		dns[2].String() != "-o ccg-control0 -s 1.1.1.1/32 -d 172.29.255.2/32 -m conntrack --ctstate ESTABLISHED,RELATED -m comment --comment ccgateway-control-dns-return -j ACCEPT" ||
		!strings.Contains(dns[3].String(), "-d 8.8.8.8/32") {
		t.Fatalf("%v", dns)
	}
	if fwd[len(fwd)-1].String() != want[5] || fwd[len(fwd)-2].String() != want[4] {
		t.Fatal("DROP must stay last")
	}
}

// covers: D1 upstream DNS from the resolv.conf dockerd uses (systemd-resolved stub)
func TestResolvDNS(t *testing.T) {
	dir := t.TempDir()
	host := filepath.Join(dir, "resolv.conf")
	sysd := filepath.Join(dir, "systemd.conf")
	_ = os.WriteFile(host, []byte("nameserver 127.0.0.53\noptions edns0 trust-ad\nsearch .\n"), 0o644)
	_ = os.WriteFile(sysd, []byte("# comment\nnameserver 1.1.1.1\nnameserver 8.8.8.8\nnameserver 2606:4700::1111\n"), 0o644)
	r := &ResolvDNS{Host: host, Systemd: sysd}
	if got, err := r.Servers(); err != nil || fmt.Sprint(got) != "[1.1.1.1 8.8.8.8]" {
		t.Fatalf("%v %v", got, err)
	}
	// resolved directory not mounted: no servers, fail closed (no DNS rules).
	nm := &ResolvDNS{Host: host, Systemd: filepath.Join(dir, "not-mounted")}
	if _, err := nm.Servers(); !errors.Is(err, ErrNoDNS) {
		t.Fatalf("not mounted: %v", err)
	}
	_ = os.WriteFile(host, []byte("nameserver 9.9.9.9\nnameserver 127.0.0.1\n"), 0o644)
	if got, _ := r.Servers(); fmt.Sprint(got) != "[9.9.9.9]" {
		t.Fatalf("plain host %v", got)
	}
	_ = os.Remove(host)
	if got, err := r.Servers(); err != nil || fmt.Sprint(got) != "[9.9.9.9]" {
		t.Fatal("keeps the last good list")
	}
	if _, err := (&ResolvDNS{Host: host}).Servers(); !errors.Is(err, ErrNoDNS) {
		t.Fatal("no servers")
	}
	if got, _ := (&ResolvDNS{Fixed: []netip.Addr{netip.MustParseAddr("1.0.0.1")}}).Servers(); fmt.Sprint(got) != "[1.0.0.1]" {
		t.Fatal("fixed")
	}
}

// covers: 03§7.6 only changed chains are written; one transaction
func TestApplySkipsUnchanged(t *testing.T) {
	d, run, links := world(t)
	e := engine(d, run, links, nil)
	if err := e.Initial(context.Background()); err != nil {
		t.Fatal(err)
	}
	if run.count("iptables-restore") != 1 || e.Status() != "ok" {
		t.Fatalf("restores %d status %s", run.count("iptables-restore"), e.Status())
	}
	first := run.stdin[0]
	for _, ch := range []string{"CCG-PROXY-BRIDGE", "CCG-CONTROL-FWD", "CCG-CONTROL-IN"} {
		if !strings.Contains(first, ":"+ch+" - [0:0]\n-F "+ch+"\n") {
			t.Fatalf("%s missing", ch)
		}
	}
	_ = e.cycle(context.Background(), true, nil, false)
	if run.count("iptables-restore") != 1 {
		t.Fatal("unchanged rules were rewritten")
	}
	d.mu.Lock()
	d.containers["app22"].State.Status = "exited"
	d.mu.Unlock()
	_ = e.cycle(context.Background(), false, []string{"22"}, false)
	if run.count("iptables-restore") != 2 {
		t.Fatal("change not written")
	}
	last := run.stdin[1]
	if strings.Contains(last, "CCG-CONTROL-IN") || strings.Contains(last, "ccgateway-22-") || !strings.Contains(last, "ccgateway-21-proxy-out") {
		t.Fatalf("%s", last)
	}
}

// covers: 03§7.7 fail closed: Docker unreachable empties the account rules, CONTROL-IN stays
func TestApplyFailClosed(t *testing.T) {
	d, run, links := world(t)
	e := engine(d, run, links, nil)
	_ = e.Initial(context.Background())
	d.mu.Lock()
	d.listErr = errors.New("docker down")
	d.mu.Unlock()
	if err := e.cycle(context.Background(), true, nil, false); err == nil {
		t.Fatal("no error")
	}
	w := e.Written()
	if len(w["CCG-PROXY-BRIDGE"]) != 0 || len(w["CCG-CONTROL-FWD"]) != 2 || len(w["CCG-CONTROL-IN"]) != 4 || e.Status() != "failed" {
		t.Fatalf("%v %s", w, e.Status())
	}
	// iptables-restore failing keeps the last write and reports failed.
	d.mu.Lock()
	d.listErr = nil
	d.mu.Unlock()
	base := run.fn
	run.fn = func(argv []string) ([]byte, error) {
		if strings.HasSuffix(argv[0], "iptables-restore") {
			return nil, &ExecError{Prog: argv[0], Code: 1}
		}
		return base(argv)
	}
	_ = e.cycle(context.Background(), true, nil, false)
	if len(e.Written()["CCG-PROXY-BRIDGE"]) != 0 || e.Status() != "failed" {
		t.Fatal("failed write must not change the recorded state")
	}
	run.fn = base
	_ = e.cycle(context.Background(), true, nil, false)
	if len(e.Written()["CCG-PROXY-BRIDGE"]) != 4 || e.Status() != "ok" {
		t.Fatal("recovery")
	}
}

// covers: 03§7.1 jump inserted when missing, duplicates removed, other rules untouched
func TestJumpDedup(t *testing.T) {
	d, run, links := world(t)
	run.kernel["DOCKER-USER"] = "-N DOCKER-USER\n-A DOCKER-USER -j RETURN-OTHER\n" +
		"-A DOCKER-USER -m comment --comment ccgateway-managed-proxy-bridge -j CCG-PROXY-BRIDGE\n" +
		"-A DOCKER-USER -m comment --comment ccgateway-managed-proxy-bridge -j CCG-PROXY-BRIDGE\n"
	run.kernel["INPUT"] = "-P INPUT ACCEPT\n"
	e := engine(d, run, links, nil)
	_ = e.Initial(context.Background())
	var cmds []string
	for _, c := range run.calls {
		if strings.HasSuffix(c[0], "iptables") && (c[3] == "-I" || c[3] == "-D") {
			cmds = append(cmds, strings.Join(c[3:], " "))
		}
	}
	want := []string{
		"-D DOCKER-USER -m comment --comment ccgateway-managed-proxy-bridge -j CCG-PROXY-BRIDGE",
		"-I DOCKER-USER 1 -m comment --comment ccgateway-managed-control-fwd -j CCG-CONTROL-FWD",
		"-I INPUT 1 -m comment --comment ccgateway-managed-control-in -j CCG-CONTROL-IN",
	}
	if !reflect.DeepEqual(cmds, want) {
		t.Fatalf("%q", cmds)
	}
}

// covers: 03§7.6 external flush (chain drift) forces a rewrite
func TestChainDrift(t *testing.T) {
	d, run, links := world(t)
	e := engine(d, run, links, nil)
	_ = e.Initial(context.Background())
	w := e.Written()
	for ch, rules := range w {
		var b strings.Builder
		b.WriteString("-N " + ch + "\n")
		for _, r := range rules {
			b.WriteString("-A " + ch + " " + r.String() + "\n")
		}
		run.kernel[ch] = b.String()
	}
	_ = e.cycle(context.Background(), true, nil, true)
	if run.count("iptables-restore") != 1 {
		t.Fatal("identical kernel chains must not be rewritten")
	}
	run.kernel["CCG-PROXY-BRIDGE"] = "-N CCG-PROXY-BRIDGE\n"
	_ = e.cycle(context.Background(), true, nil, true)
	if run.count("iptables-restore") != 2 || !strings.Contains(run.stdin[1], "-F CCG-PROXY-BRIDGE") || strings.Contains(run.stdin[1], "CCG-CONTROL-IN") {
		t.Fatal("drift not repaired")
	}
}

// covers: 03§7.3 veth cache: no nsenter while the container does not restart
func TestVethCache(t *testing.T) {
	d, run, links := world(t)
	e := engine(d, run, links, nil)
	_, _ = e.Desired(context.Background())
	n := run.count("nsenter")
	if n == 0 {
		t.Fatal("no nsenter")
	}
	_, _ = e.Desired(context.Background())
	if run.count("nsenter") != n {
		t.Fatal("cached lookups ran nsenter again")
	}
	d.mu.Lock()
	d.containers["app21"].State.StartedAt = "t2"
	d.mu.Unlock()
	_, _ = e.Desired(context.Background())
	if run.count("nsenter") != n+2 {
		t.Fatalf("restart must refresh veth and route: %d → %d", n, run.count("nsenter"))
	}
	e.ForgetContainer("gw")
	_, _ = e.Desired(context.Background())
	if run.count("nsenter") != n+4 {
		t.Fatalf("forgotten gateway: %d", run.count("nsenter"))
	}
}

// covers: 03§7.3 route cache invalidated by firewall/start/restart
func TestRouteCacheInvalidation(t *testing.T) {
	d, run, links := world(t)
	e := engine(d, run, links, nil)
	_, _ = e.Desired(context.Background())
	n := run.count("nsenter")
	e.InvalidateRoute("21")
	_, _ = e.Desired(context.Background())
	if run.count("nsenter") != n+1 {
		t.Fatalf("one route lookup expected: %d", run.count("nsenter")-n)
	}
}

// covers: 03§7.3 veth must be enslaved to the account bridge
func TestVethMasterChecked(t *testing.T) {
	d, run, links := world(t)
	links.master["vethb21"] = "docker0"
	got, _ := engine(d, run, links, nil).Desired(context.Background())
	if strings.Contains(fmt.Sprint(got["CCG-PROXY-BRIDGE"]), "ccgateway-21-") || !strings.Contains(fmt.Sprint(got["CCG-PROXY-BRIDGE"]), "ccgateway-22-") {
		t.Fatal("veth on another bridge must drop only that account")
	}
}

// covers: 03§7.9 print-cleanup removes jumps then chains
func TestCleanup(t *testing.T) {
	got := strings.Join(Cleanup(ChainNames("CCG-GT")), "\n")
	want := "iptables -w 5 -D DOCKER-USER -m comment --comment ccgateway-managed-proxy-bridge-ccg-gt-proxy-bridge -j CCG-GT-PROXY-BRIDGE\n" +
		"iptables -w 5 -D DOCKER-USER -m comment --comment ccgateway-managed-control-fwd-ccg-gt-control-fwd -j CCG-GT-CONTROL-FWD\n" +
		"iptables -w 5 -D INPUT -m comment --comment ccgateway-managed-control-in-ccg-gt-control-in -j CCG-GT-CONTROL-IN\n" +
		"iptables -w 5 -F CCG-GT-PROXY-BRIDGE\niptables -w 5 -X CCG-GT-PROXY-BRIDGE\n" +
		"iptables -w 5 -F CCG-GT-CONTROL-FWD\niptables -w 5 -X CCG-GT-CONTROL-FWD\n" +
		"iptables -w 5 -F CCG-GT-CONTROL-IN\niptables -w 5 -X CCG-GT-CONTROL-IN"
	if got != want {
		t.Fatal(got)
	}
}

// covers: 03§7.7 Run loop applies recomputations requested by the API and events
func TestRunLoop(t *testing.T) {
	d, run, links := world(t)
	e := engine(d, run, links, nil)
	_ = e.Initial(context.Background())
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go e.Run(ctx)
	d.mu.Lock()
	d.containers["app21"].State.Status = "exited"
	d.mu.Unlock()
	e.Recompute("test", "21")
	deadline := time.Now().Add(2 * time.Second)
	for run.count("iptables-restore") < 2 {
		if time.Now().After(deadline) {
			t.Fatal("recompute not applied")
		}
		time.Sleep(10 * time.Millisecond)
	}
	if strings.Contains(fmt.Sprint(e.Written()["CCG-PROXY-BRIDGE"]), "ccgateway-21-") {
		t.Fatal("stopped account still allowed")
	}
}
