package policy

import (
	"bytes"
	"encoding/json"
	"flag"
	"net/netip"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"ccgateway/guard/internal/names"
)

var update = flag.Bool("update", false, "rewrite golden files")

var n = names.Names{Prefix: "ccg"}

const imgID = "sha256:1111111111111111111111111111111111111111111111111111111111111111"

func golden(t *testing.T, name string, v any) {
	t.Helper()
	got, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	got = append(got, '\n')
	path := filepath.Join("..", "..", "testdata", "policy", name+".json")
	if *update {
		_ = os.MkdirAll(filepath.Dir(path), 0o755)
		if err := os.WriteFile(path, got, 0o644); err != nil {
			t.Fatal(err)
		}
	}
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	want = bytes.ReplaceAll(want, []byte("\r\n"), []byte("\n"))
	if !bytes.Equal(got, want) {
		t.Fatalf("%s differs from golden file:\n%s", name, got)
	}
}

func appInput() AppInput {
	return AppInput{Image: "ccgateway-app:0.1.118", IPv4: netip.MustParseAddr("10.52.74.5"),
		Env: map[string]string{"Z_LAST": "1", "A_FIRST": "x=y", "TZ": "UTC"}, AuthLabel: "fp-abc", ImageLabel: imgID}
}

// covers: O1 03§4.2 account container, whole request golden
func TestAppGolden(t *testing.T) {
	spec, err := App(n, "/opt/ccgateway-runtime", "21", appInput())
	if err != nil {
		t.Fatal(err)
	}
	golden(t, "app", spec)
	if len(spec.HostConfig.Binds) != 2 || len(spec.Volumes) != 2 {
		t.Fatalf("switch off must keep two mounts: %v %v", spec.HostConfig.Binds, spec.Volumes)
	}
}

// covers: SESSION-MEMORY §7.4 the session state switch adds exactly one
// read-only bind and its mount point; nothing else changes
func TestAppSessionState(t *testing.T) {
	in := appInput()
	in.SessionState = true
	spec, err := App(n, "/opt/ccgateway-runtime", "21", in)
	if err != nil {
		t.Fatal(err)
	}
	golden(t, "app-session-state", spec)
	binds := spec.HostConfig.Binds
	if len(binds) != 3 || binds[2] != "/opt/ccgateway-runtime/state:/run/ccg-state:ro" {
		t.Fatalf("binds = %v", binds)
	}
	if _, ok := spec.Volumes["/run/ccg-state"]; !ok || len(spec.Volumes) != 3 {
		t.Fatalf("volumes = %v", spec.Volumes)
	}
	off, _ := App(n, "/opt/ccgateway-runtime", "21", appInput())
	off.HostConfig.Binds = append(off.HostConfig.Binds, StateBind("/opt/ccgateway-runtime"))
	off.Volumes[StateMount] = struct{}{}
	a, _ := json.Marshal(off)
	b, _ := json.Marshal(spec)
	if !bytes.Equal(a, b) {
		t.Fatalf("the switch changed more than the third mount:\n%s\n%s", a, b)
	}
}

// covers: O7 BUG-20(fixed) D5 03§4.6 three job uses
func TestJobGolden(t *testing.T) {
	prep, err := Job(n, "21", JobInput{Image: imgID, Entrypoint: []string{"sh", "-ec"}, Argv: []string{"mkdir -p /work/config"},
		User: "0", Volume: "rw", Caps: []string{"DAC_OVERRIDE", "CHOWN"}})
	if err != nil {
		t.Fatal(err)
	}
	golden(t, "job-prepare-volume", prep)
	quota, err := Job(n, "21", JobInput{Image: imgID, Entrypoint: []string{"node"}, Argv: []string{"-e", "x"},
		User: "1000:1000", Volume: "ro"})
	if err != nil {
		t.Fatal(err)
	}
	golden(t, "job-quota", quota)
	probe, err := Job(n, "21", JobInput{Image: imgID, Entrypoint: []string{"node", "-e"}, Argv: []string{"probe"},
		User: "0", Volume: "none", MemoryBytes: 2 * GiB})
	if err != nil {
		t.Fatal(err)
	}
	golden(t, "job-probe", probe)
}

// covers: 03§4.5 firewall helper, §4.7 image reader, §4.3 networks, §4.4 volumes
func TestOtherGoldens(t *testing.T) {
	golden(t, "firewall-helper", FirewallHelper(n, "/opt/ccgateway-runtime", "21", "appid", imgID, netip.MustParseAddr("10.52.74.2")))
	golden(t, "image-reader", ImageReader(n, "ccgateway-app:0.1.118"))
	net, err := AccountNetwork(n, "21", NetworkInput{Subnet: "10.52.74.0/24", Gateway: "10.52.74.1", PolicyLabel: `{"allocation": "random", "pool": "10.0.0.0/8"}`})
	if err != nil {
		t.Fatal(err)
	}
	golden(t, "network-account", net)
	up, err := GatewayUplink(n, NetworkInput{Subnet: "10.117.81.0/24", Gateway: "10.117.81.1", PolicyLabel: `{}`})
	if err != nil {
		t.Fatal(err)
	}
	golden(t, "network-uplink", up)
	golden(t, "volume-bounded", Volume(n, "21", 10*GiB, true))
	golden(t, "volume-unbounded", Volume(n, "21", 0, false))
}

// covers: 03§4.5 NFT_REPLACE byte for byte with manager.NFT_REPLACE
func TestNFTReplaceMatchesPython(t *testing.T) {
	py := "if nft list table inet ccg_app >/dev/null 2>&1; then " +
		"{ printf \"delete table inet ccg_app\\n\"; cat /app.nft; } | nft -f -; " +
		"else nft -f /app.nft; fi; "
	if NFTReplace != py {
		t.Fatalf("%q", NFTReplace)
	}
}

// covers: D5 only CHOWN and DAC_OVERRIDE, never FOWNER; caps only with rw
func TestJobRejects(t *testing.T) {
	base := func() JobInput {
		return JobInput{Image: imgID, Entrypoint: []string{"sh"}, User: "0", Volume: "rw"}
	}
	cases := map[string]func(*JobInput){
		"FOWNER":          func(j *JobInput) { j.Caps = []string{"FOWNER"} },
		"SYS_ADMIN":       func(j *JobInput) { j.Caps = []string{"SYS_ADMIN"} },
		"NET_ADMIN":       func(j *JobInput) { j.Caps = []string{"NET_ADMIN"} },
		"dup cap":         func(j *JobInput) { j.Caps = []string{"CHOWN", "CHOWN"} },
		"ro with caps":    func(j *JobInput) { j.Volume = "ro"; j.Caps = []string{"CHOWN"} },
		"none with caps":  func(j *JobInput) { j.Volume = "none"; j.Caps = []string{"CHOWN"} },
		"user 1000":       func(j *JobInput) { j.User = "1000" },
		"user root":       func(j *JobInput) { j.User = "root" },
		"memory 4 GiB":    func(j *JobInput) { j.MemoryBytes = 4 * GiB },
		"memory tiny":     func(j *JobInput) { j.MemoryBytes = MiB },
		"entrypoint 5":    func(j *JobInput) { j.Entrypoint = []string{"a", "b", "c", "d", "e"} },
		"entrypoint none": func(j *JobInput) { j.Entrypoint = nil },
		"argv 65":         func(j *JobInput) { j.Argv = make([]string, 65) },
		"argv NUL":        func(j *JobInput) { j.Argv = []string{"a\x00"} },
		"volume rx":       func(j *JobInput) { j.Volume = "rx" },
		"bad image":       func(j *JobInput) { j.Image = "Bad Image" },
	}
	for name, mut := range cases {
		j := base()
		mut(&j)
		if _, err := Job(n, "21", j); err == nil || !IsInvalid(err) {
			t.Errorf("%s accepted (%v)", name, err)
		}
	}
	if _, err := Job(n, "21", base()); err != nil {
		t.Fatal(err)
	}
}

// covers: 03§11.3 account container table
func TestAppRejects(t *testing.T) {
	many := map[string]string{}
	for i := 0; i < 129; i++ {
		many["V"+strings.Repeat("A", i%5)+string(rune('A'+i%26))+string(rune('A'+i/26))] = "x"
	}
	cases := map[string]func(*AppInput){
		"env name":      func(a *AppInput) { a.Env = map[string]string{"1BAD": "x"} },
		"env name dash": func(a *AppInput) { a.Env = map[string]string{"A-B": "x"} },
		"env 129":       func(a *AppInput) { a.Env = many },
		"env total":     func(a *AppInput) { a.Env = map[string]string{"A": strings.Repeat("x", 64<<10)} },
		"env NUL":       func(a *AppInput) { a.Env = map[string]string{"A": "x\x00"} },
		"image label":   func(a *AppInput) { a.ImageLabel = "ccgateway-app:1" },
		"auth label":    func(a *AppInput) { a.AuthLabel = "x\ny" },
		"auth empty":    func(a *AppInput) { a.AuthLabel = "" },
		"auth long":     func(a *AppInput) { a.AuthLabel = strings.Repeat("a", 257) },
		"memory 8 GiB":  func(a *AppInput) { a.MemoryBytes = 8 * GiB },
		"memory small":  func(a *AppInput) { a.MemoryBytes = 128 * MiB },
		"cpu high":      func(a *AppInput) { a.NanoCPUs = 5e9 },
		"cpu low":       func(a *AppInput) { a.NanoCPUs = 1e7 },
		"image":         func(a *AppInput) { a.Image = "UPPER:1" },
		"ipv6":          func(a *AppInput) { a.IPv4 = netip.MustParseAddr("::1") },
	}
	if len(many) != 129 {
		t.Fatalf("setup %d", len(many))
	}
	for name, mut := range cases {
		a := appInput()
		mut(&a)
		if _, err := App(n, "/r", "21", a); err == nil {
			t.Errorf("%s accepted", name)
		}
	}
	if _, err := App(n, "/r", "0", appInput()); err == nil {
		t.Fatal("bad key accepted")
	}
}

// covers: 03§3.5.2 subnet and policy label rules
func TestNetworkRejects(t *testing.T) {
	cases := []NetworkInput{
		{Subnet: "8.8.8.0/24", Gateway: "8.8.8.1", PolicyLabel: "{}"},
		{Subnet: "10.0.0.0/23", Gateway: "10.0.0.1", PolicyLabel: "{}"},
		{Subnet: "10.0.0.0/30", Gateway: "10.0.0.1", PolicyLabel: "{}"},
		{Subnet: "10.0.0.5/24", Gateway: "10.0.0.1", PolicyLabel: "{}"},
		{Subnet: "10.0.0.0/24", Gateway: "10.0.0.2", PolicyLabel: "{}"},
		{Subnet: "172.32.0.0/24", Gateway: "172.32.0.1", PolicyLabel: "{}"},
		{Subnet: "10.0.0.0/24", Gateway: "10.0.0.1", PolicyLabel: "[]"},
		{Subnet: "10.0.0.0/24", Gateway: "10.0.0.1", PolicyLabel: `{"a":1} {}`},
		{Subnet: "10.0.0.0/24", Gateway: "10.0.0.1", PolicyLabel: "{" + strings.Repeat(" ", 4096) + "}"},
		{Subnet: "10.0.0.0/24", Gateway: "10.0.0.1", PolicyLabel: ""},
		{Subnet: "fd00::/64", Gateway: "fd00::1", PolicyLabel: "{}"},
	}
	for i, c := range cases {
		if _, err := AccountNetwork(n, "21", c); err == nil {
			t.Errorf("case %d accepted", i)
		}
	}
	if _, err := AccountNetwork(n, names.UplinkKey, NetworkInput{Subnet: "10.0.0.0/24", Gateway: "10.0.0.1", PolicyLabel: "{}"}); err == nil {
		t.Fatal("uplink key accepted for an account network")
	}
	for _, ok := range []string{"192.168.4.0/29", "172.16.0.0/24", "10.255.255.0/24"} {
		p := netip.MustParsePrefix(ok)
		if _, err := ParseSubnet(ok, p.Addr().Next().String()); err != nil {
			t.Errorf("%s: %v", ok, err)
		}
	}
}

// covers: 03§3.5.6 ipv4 must not be .0, .1 or broadcast
func TestInSubnet(t *testing.T) {
	p := netip.MustParsePrefix("10.1.0.0/24")
	for _, bad := range []string{"10.1.0.0", "10.1.0.1", "10.1.0.255", "10.2.0.5"} {
		if InSubnet(netip.MustParseAddr(bad), p) == nil {
			t.Errorf("%s", bad)
		}
	}
	if InSubnet(netip.MustParseAddr("10.1.0.2"), p) != nil {
		t.Fatal(".2")
	}
}
