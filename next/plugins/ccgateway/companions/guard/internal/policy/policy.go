// Package policy builds every Docker create request body (03 §4). The
// controller only fills in values; capabilities, security options, network
// modes, mounts, restart policies, logging, privileges, devices, namespaces
// and sysctls never come from a request.
package policy

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/netip"
	"regexp"
	"sort"
	"strings"

	"ccgateway/guard/internal/names"
)

// LogConfig is HostConfig.LogConfig.
type LogConfig struct {
	Type   string            `json:"Type"`
	Config map[string]string `json:"Config,omitempty"`
}

// HostConfig is the subset of Docker's HostConfig the guard ever sets.
type HostConfig struct {
	Binds       []string  `json:"Binds,omitempty"`
	NetworkMode string    `json:"NetworkMode"`
	Memory      int64     `json:"Memory,omitempty"`
	MemorySwap  int64     `json:"MemorySwap,omitempty"`
	NanoCpus    int64     `json:"NanoCpus,omitempty"`
	PidsLimit   int64     `json:"PidsLimit,omitempty"`
	Init        *bool     `json:"Init,omitempty"`
	CapDrop     []string  `json:"CapDrop"`
	CapAdd      []string  `json:"CapAdd,omitempty"`
	SecurityOpt []string  `json:"SecurityOpt"`
	LogConfig   LogConfig `json:"LogConfig"`
	Privileged  bool      `json:"Privileged"`
}

// EndpointIPAM is EndpointSettings.IPAMConfig.
type EndpointIPAM struct {
	IPv4Address string `json:"IPv4Address"`
}

// EndpointSettings is one entry of NetworkingConfig.EndpointsConfig.
type EndpointSettings struct {
	IPAMConfig EndpointIPAM `json:"IPAMConfig"`
}

// NetworkingConfig is the create body's NetworkingConfig.
type NetworkingConfig struct {
	EndpointsConfig map[string]EndpointSettings `json:"EndpointsConfig"`
}

// ContainerSpec is the subset of Docker's container create body.
type ContainerSpec struct {
	Image            string              `json:"Image"`
	Entrypoint       []string            `json:"Entrypoint,omitempty"`
	Cmd              []string            `json:"Cmd,omitempty"`
	User             string              `json:"User,omitempty"`
	Env              []string            `json:"Env,omitempty"`
	Labels           map[string]string   `json:"Labels"`
	Volumes          map[string]struct{} `json:"Volumes,omitempty"`
	NetworkDisabled  bool                `json:"NetworkDisabled,omitempty"`
	HostConfig       HostConfig          `json:"HostConfig"`
	NetworkingConfig *NetworkingConfig   `json:"NetworkingConfig,omitempty"`
}

// IPAMPool is one IPAM pool.
type IPAMPool struct {
	Subnet  string `json:"Subnet"`
	Gateway string `json:"Gateway"`
}

// IPAMSpec is a network's IPAM.
type IPAMSpec struct {
	Driver string     `json:"Driver"`
	Config []IPAMPool `json:"Config"`
}

// NetworkSpec is the network create body.
type NetworkSpec struct {
	Name       string            `json:"Name"`
	Driver     string            `json:"Driver"`
	Internal   bool              `json:"Internal"`
	EnableIPv6 bool              `json:"EnableIPv6"`
	IPAM       IPAMSpec          `json:"IPAM"`
	Labels     map[string]string `json:"Labels"`
}

// VolumeSpec is the volume create body.
type VolumeSpec struct {
	Name       string            `json:"Name"`
	Driver     string            `json:"Driver"`
	DriverOpts map[string]string `json:"DriverOpts,omitempty"`
	Labels     map[string]string `json:"Labels"`
}

const (
	GiB = int64(1) << 30
	MiB = int64(1) << 20

	AppMemoryDefault = GiB
	AppMemoryMin     = 256 * MiB
	AppMemoryMax     = 4 * GiB
	// AppMemorySwapUnlimited is Docker's MemorySwap for "no swap limit".
	AppMemorySwapUnlimited = int64(-1)
	AppCPUDefault          = int64(2e9)
	AppCPUMin              = int64(1e8)
	AppCPUMax              = int64(4e9)

	JobMemoryDefault = GiB
	JobMemoryMin     = 64 * MiB
	JobMemoryMax     = 2 * GiB

	VolumeMin = GiB
	VolumeMax = GiB << 10
)

// NFTReplace is manager.NFT_REPLACE, byte for byte.
const NFTReplace = `if nft list table inet ccg_app >/dev/null 2>&1; then { printf "delete table inet ccg_app\n"; cat /app.nft; } | nft -f -; else nft -f /app.nft; fi; `

var (
	noNewPriv  = []string{"no-new-privileges:true"}
	appLog     = LogConfig{Type: "json-file", Config: map[string]string{"max-size": "20m", "max-file": "3"}}
	oneshotLog = LogConfig{Type: "json-file", Config: map[string]string{"max-size": "1m", "max-file": "1"}}

	envName  = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)
	imageRef = regexp.MustCompile(`^[a-z0-9][a-z0-9._/-]{0,127}(:[A-Za-z0-9._-]{1,128})?(@sha256:[0-9a-f]{64})?$`)
	imageID  = regexp.MustCompile(`^sha256:[0-9a-f]{64}$`)
)

// ErrInvalid wraps every validation error; the text is a fixed message
// safe to return to the controller.
type ErrInvalid struct{ Msg string }

func (e *ErrInvalid) Error() string { return e.Msg }

func invalid(format string, a ...any) error { return &ErrInvalid{Msg: fmt.Sprintf(format, a...)} }

// IsInvalid reports a validation error.
func IsInvalid(err error) bool {
	var e *ErrInvalid
	return errors.As(err, &e)
}

// ValidImage is common.valid_image: a reference or an image ID.
func ValidImage(ref string) bool { return imageRef.MatchString(ref) || imageID.MatchString(ref) }

// ValidImageID reports sha256:<64 hex>.
func ValidImageID(id string) bool { return imageID.MatchString(id) }

// CheckEnv validates the environment and returns sorted K=V entries.
func CheckEnv(env map[string]string) ([]string, error) {
	if len(env) > 128 {
		return nil, invalid("too many environment variables")
	}
	total := 0
	out := make([]string, 0, len(env))
	for k, v := range env {
		if !envName.MatchString(k) {
			return nil, invalid("invalid environment variable name")
		}
		if strings.ContainsRune(v, 0) {
			return nil, invalid("environment value contains NUL")
		}
		total += len(k) + len(v)
		out = append(out, k+"="+v)
	}
	if total > 64<<10 {
		return nil, invalid("environment too large")
	}
	sort.Strings(out)
	return out, nil
}

func printableASCII(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] < 0x20 || s[i] > 0x7e {
			return false
		}
	}
	return true
}

// AppInput is a validated PUT app request.
type AppInput struct {
	Image       string
	IPv4        netip.Addr
	Env         map[string]string
	AuthLabel   string
	ImageLabel  string
	MemoryBytes int64
	NanoCPUs    int64
	// SessionState adds the session state socket directory as a third,
	// read-only bind. It comes from the guard's own configuration
	// (CCG_GUARD_SESSION_STATE), never from the request.
	SessionState bool
}

// StateDir is the session state socket directory under RuntimeRoot and
// StateMount its mount point in account containers
// (SESSION-MEMORY-TOOLS-USED-DESIGN.md §7.2).
const (
	StateDir   = "state"
	StateMount = "/run/ccg-state"
)

// StateBind is the third app bind: <root>/state read-only (propagation
// stays Docker's default rprivate).
func StateBind(root string) string { return root + "/" + StateDir + ":" + StateMount + ":ro" }

// App is the account container (03 §4.2), created but not started.
func App(n names.Names, root, aid string, in AppInput) (ContainerSpec, error) {
	if !names.ValidKey(aid) {
		return ContainerSpec{}, invalid("invalid account key")
	}
	if !ValidImage(in.Image) {
		return ContainerSpec{}, invalid("invalid image reference")
	}
	if !in.IPv4.Is4() {
		return ContainerSpec{}, invalid("invalid ipv4")
	}
	env, err := CheckEnv(in.Env)
	if err != nil {
		return ContainerSpec{}, err
	}
	if in.AuthLabel == "" || len(in.AuthLabel) > 256 || !printableASCII(in.AuthLabel) {
		return ContainerSpec{}, invalid("invalid auth_label")
	}
	if !imageID.MatchString(in.ImageLabel) {
		return ContainerSpec{}, invalid("invalid image_label")
	}
	mem := in.MemoryBytes
	if mem == 0 {
		mem = AppMemoryDefault
	}
	if mem < AppMemoryMin || mem > AppMemoryMax {
		return ContainerSpec{}, invalid("memory_bytes out of range")
	}
	cpu := in.NanoCPUs
	if cpu == 0 {
		cpu = AppCPUDefault
	}
	if cpu < AppCPUMin || cpu > AppCPUMax {
		return ContainerSpec{}, invalid("nano_cpus out of range")
	}
	init := true
	net := n.Net(aid)
	// docker-py sends Config.Volumes for every bind (same inspect shape).
	volumes := map[string]struct{}{"/work": {}, "/etc/resolv.conf": {}}
	binds := []string{
		n.Volume(aid) + ":/work:rw",
		root + "/" + aid + "/resolv.conf:/etc/resolv.conf:ro",
	}
	if in.SessionState {
		volumes[StateMount] = struct{}{}
		binds = append(binds, StateBind(root))
	}
	return ContainerSpec{
		Image: in.Image,
		User:  "1000:1000",
		Env:   env,
		Labels: map[string]string{
			names.LabelAccount: aid,
			names.LabelAuth:    in.AuthLabel,
			names.LabelImage:   in.ImageLabel,
		},
		Volumes: volumes,
		HostConfig: HostConfig{
			Binds:       binds,
			NetworkMode: net,
			Memory:      mem,
			// Swap is unlimited (the host's swap): a request over the memory
			// limit slows down instead of being OOM-killed (2026-11-04).
			MemorySwap:  AppMemorySwapUnlimited,
			NanoCpus:    cpu,
			PidsLimit:   256,
			Init:        &init,
			CapDrop:     []string{"ALL"},
			SecurityOpt: noNewPriv,
			LogConfig:   appLog,
		},
		NetworkingConfig: &NetworkingConfig{EndpointsConfig: map[string]EndpointSettings{
			net: {IPAMConfig: EndpointIPAM{IPv4Address: in.IPv4.String()}},
		}},
	}, nil
}

// JobInput is a validated POST jobs request.
type JobInput struct {
	Image       string
	Entrypoint  []string
	Argv        []string
	User        string
	Volume      string
	Caps        []string
	MemoryBytes int64
}

// JobCaps is the allowed capability set of one-shot jobs (D5: no FOWNER).
var JobCaps = map[string]bool{"CHOWN": true, "DAC_OVERRIDE": true}

// CheckArgv applies the exec limits: count, item size, NUL, total.
func CheckArgv(argv []string, minItems, maxItems int) error {
	if len(argv) < minItems || len(argv) > maxItems {
		return invalid("argv must have %d to %d items", minItems, maxItems)
	}
	total := 0
	for _, a := range argv {
		if len(a) > 128<<10 {
			return invalid("argv item too large")
		}
		if strings.ContainsRune(a, 0) {
			return invalid("argv item contains NUL")
		}
		total += len(a)
	}
	if total > 1<<20 {
		return invalid("argv too large")
	}
	return nil
}

// Job is a one-shot task container (03 §4.6, D5).
func Job(n names.Names, aid string, in JobInput) (ContainerSpec, error) {
	if !names.ValidKey(aid) {
		return ContainerSpec{}, invalid("invalid account key")
	}
	if !ValidImage(in.Image) {
		return ContainerSpec{}, invalid("invalid image reference")
	}
	if err := CheckArgv(in.Entrypoint, 1, 4); err != nil {
		return ContainerSpec{}, invalid("entrypoint must have 1 to 4 valid items")
	}
	if err := CheckArgv(in.Argv, 0, 64); err != nil {
		return ContainerSpec{}, err
	}
	if in.User != "0" && in.User != "1000:1000" {
		return ContainerSpec{}, invalid("user must be 0 or 1000:1000")
	}
	var binds []string
	switch in.Volume {
	case "none":
	case "ro", "rw":
		binds = []string{n.Volume(aid) + ":/work:" + in.Volume}
	default:
		return ContainerSpec{}, invalid("volume must be none, ro or rw")
	}
	var caps []string
	seen := map[string]bool{}
	for _, c := range in.Caps {
		if !JobCaps[c] {
			return ContainerSpec{}, invalid("capability not allowed")
		}
		if seen[c] {
			return ContainerSpec{}, invalid("duplicate capability")
		}
		seen[c] = true
		caps = append(caps, c)
	}
	if len(caps) > 0 && in.Volume != "rw" {
		return ContainerSpec{}, invalid("capabilities require volume rw")
	}
	sort.Strings(caps)
	mem := in.MemoryBytes
	if mem == 0 {
		mem = JobMemoryDefault
	}
	if mem < JobMemoryMin || mem > JobMemoryMax {
		return ContainerSpec{}, invalid("memory_bytes out of range")
	}
	return ContainerSpec{
		Image:      in.Image,
		Entrypoint: append([]string(nil), in.Entrypoint...),
		Cmd:        append([]string(nil), in.Argv...),
		User:       in.User,
		Labels:     map[string]string{names.LabelJob: n.Prefix},
		HostConfig: HostConfig{
			Binds:       binds,
			NetworkMode: "none",
			Memory:      mem,
			NanoCpus:    2e9,
			PidsLimit:   64,
			CapDrop:     []string{"ALL"},
			CapAdd:      caps,
			SecurityOpt: noNewPriv,
			LogConfig:   oneshotLog,
		},
	}, nil
}

// FirewallHelper applies app.nft and the default route inside the app's
// network namespace (03 §4.5). image is the gateway's running image ID.
func FirewallHelper(n names.Names, root, aid, appID, image string, defaultGW netip.Addr) ContainerSpec {
	return ContainerSpec{
		Image:      image,
		Entrypoint: []string{"sh", "-ec"},
		Cmd:        []string{NFTReplace + "ip route replace default via " + defaultGW.String()},
		Labels:     map[string]string{names.LabelJob: n.Prefix},
		HostConfig: HostConfig{
			Binds:       []string{root + "/" + aid + "/app.nft:/app.nft:ro"},
			NetworkMode: "container:" + appID,
			Memory:      64 * MiB,
			PidsLimit:   32,
			CapDrop:     []string{"ALL"},
			CapAdd:      []string{"NET_ADMIN"},
			SecurityOpt: noNewPriv,
			LogConfig:   oneshotLog,
		},
	}
}

// ImageReader is a never started container used to read one file of an
// image (03 §4.7).
func ImageReader(n names.Names, image string) ContainerSpec {
	return ContainerSpec{
		Image:           image,
		Entrypoint:      []string{"true"},
		Labels:          map[string]string{names.LabelJob: n.Prefix},
		NetworkDisabled: true,
		HostConfig: HostConfig{
			NetworkMode: "none",
			CapDrop:     []string{"ALL"},
			SecurityOpt: noNewPriv,
			LogConfig:   LogConfig{Type: "none"},
		},
	}
}

// NetworkInput is a PUT network or ensure uplink request.
type NetworkInput struct {
	Subnet      string
	Gateway     string
	PolicyLabel string
}

var private = []netip.Prefix{
	netip.MustParsePrefix("10.0.0.0/8"),
	netip.MustParsePrefix("172.16.0.0/12"),
	netip.MustParsePrefix("192.168.0.0/16"),
}

// ParseSubnet validates an account or uplink subnet and its gateway:
// RFC 1918, /24 to /29, canonical, gateway = .1.
func ParseSubnet(subnet, gateway string) (netip.Prefix, error) {
	p, err := netip.ParsePrefix(subnet)
	if err != nil || !p.Addr().Is4() || p.Masked() != p {
		return netip.Prefix{}, invalid("subnet must be a canonical IPv4 CIDR")
	}
	if p.Bits() < 24 || p.Bits() > 29 {
		return netip.Prefix{}, invalid("subnet prefix length must be 24 to 29")
	}
	inside := false
	for _, r := range private {
		if r.Contains(p.Addr()) && r.Bits() <= p.Bits() {
			inside = true
		}
	}
	if !inside {
		return netip.Prefix{}, invalid("subnet must be private (RFC 1918)")
	}
	g, err := netip.ParseAddr(gateway)
	if err != nil || g != p.Addr().Next() {
		return netip.Prefix{}, invalid("gateway must be the subnet's .1 address")
	}
	return p, nil
}

// CheckPolicyLabel: at most 4 KiB, one JSON object.
func CheckPolicyLabel(s string) error {
	if len(s) == 0 || len(s) > 4096 {
		return invalid("policy_label must be 1 to 4096 bytes")
	}
	dec := json.NewDecoder(strings.NewReader(s))
	var m map[string]any
	if err := dec.Decode(&m); err != nil || m == nil || dec.More() {
		return invalid("policy_label must be a JSON object")
	}
	if _, err := dec.Token(); err == nil {
		return invalid("policy_label must be a JSON object")
	}
	return nil
}

func network(name, aid string, internal bool, p netip.Prefix, label string) NetworkSpec {
	return NetworkSpec{
		Name: name, Driver: "bridge", Internal: internal, EnableIPv6: false,
		IPAM:   IPAMSpec{Driver: "default", Config: []IPAMPool{{Subnet: p.String(), Gateway: p.Addr().Next().String()}}},
		Labels: map[string]string{names.LabelAccount: aid, names.LabelNetwork: label},
	}
}

// AccountNetwork is <p>-<aid>-net: internal bridge (03 §4.3).
func AccountNetwork(n names.Names, aid string, in NetworkInput) (NetworkSpec, error) {
	if !names.ValidKey(aid) || aid == names.UplinkKey {
		return NetworkSpec{}, invalid("invalid account key")
	}
	p, err := ParseSubnet(in.Subnet, in.Gateway)
	if err != nil {
		return NetworkSpec{}, err
	}
	if err := CheckPolicyLabel(in.PolicyLabel); err != nil {
		return NetworkSpec{}, err
	}
	return network(n.Net(aid), aid, true, p, in.PolicyLabel), nil
}

// GatewayUplink is the gateway's NAT uplink network.
func GatewayUplink(n names.Names, in NetworkInput) (NetworkSpec, error) {
	p, err := ParseSubnet(in.Subnet, in.Gateway)
	if err != nil {
		return NetworkSpec{}, err
	}
	if err := CheckPolicyLabel(in.PolicyLabel); err != nil {
		return NetworkSpec{}, err
	}
	return network(n.GatewayUplink(), names.UplinkKey, false, p, in.PolicyLabel), nil
}

// Volume is <p>-<aid>-data (03 §4.4); bounded=false is the no-quota form.
func Volume(n names.Names, aid string, sizeBytes int64, bounded bool) VolumeSpec {
	if !bounded {
		return VolumeSpec{Name: n.Volume(aid), Driver: "local", Labels: map[string]string{names.LabelAccount: aid}}
	}
	size := fmt.Sprintf("%d", sizeBytes)
	return VolumeSpec{
		Name: n.Volume(aid), Driver: "local",
		DriverOpts: map[string]string{"size": size},
		Labels:     map[string]string{names.LabelAccount: aid, names.LabelDiskQuota: size},
	}
}

// InSubnet: ip is a host address of subnet other than .1 (03 §2.3).
func InSubnet(ip netip.Addr, subnet netip.Prefix) error {
	if !ip.Is4() || !subnet.Contains(ip) {
		return invalid("address outside the account subnet")
	}
	if ip == subnet.Masked().Addr() || ip == subnet.Masked().Addr().Next() || ip == broadcast(subnet) {
		return invalid("address is reserved in the account subnet")
	}
	return nil
}

func broadcast(p netip.Prefix) netip.Addr {
	b := p.Masked().Addr().As4()
	v := uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])
	v |= (1 << (32 - p.Bits())) - 1
	return netip.AddrFrom4([4]byte{byte(v >> 24), byte(v >> 16), byte(v >> 8), byte(v)})
}
