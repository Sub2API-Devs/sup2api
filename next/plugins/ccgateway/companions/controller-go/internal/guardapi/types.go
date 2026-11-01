package guardapi

import (
	"encoding/base64"
	"errors"
	"net/netip"
	"sort"
	"strings"

	"ccgateway/controller/internal/pyjson"
)

// Required guard features (R17): checked once at start; a missing one is
// logged loudly, the controller keeps running.
var RequiredFeatures = []string{"account-state-v1", "exec-combined-v1", "gateway-compose-v1", "raw-inspect-v1", "jobs-v1"}

// Health is GET /v1/health (03 §3.4.1).
type Health struct {
	Version    string   `json:"version"`
	Prefix     string   `json:"prefix"`
	Features   []string `json:"features"`
	Docker     string   `json:"docker"`
	Firewall   string   `json:"firewall"`   // ok | degraded | failed
	Controller string   `json:"controller"` // ok | unguarded
	Starting   bool     `json:"starting"`
}

// Missing are the required features h lacks.
func (h *Health) Missing(required []string) []string {
	have := map[string]bool{}
	for _, f := range h.Features {
		have[f] = true
	}
	var out []string
	for _, f := range required {
		if !have[f] {
			out = append(out, f)
		}
	}
	return out
}

// Subnets is GET /v1/subnets (03 §3.4.2).
type Subnets struct {
	HostRoutes []string     `json:"host_routes"`
	Networks   []NetSubnets `json:"networks"`
}

// NetSubnets is one Docker network's IPv4 subnets.
type NetSubnets struct {
	Name    string            `json:"name"`
	Labels  map[string]string `json:"labels"` // only the account label of this prefix's account networks
	Subnets []string          `json:"subnets"`
}

// Prefixes splits the occupied IPv4 ranges: every host route and network
// subnet, and separately the subnets of networks labelled for account aid
// (what _check_subnet_capacity excludes). Unparsable entries are skipped.
func (s *Subnets) Prefixes(aid string) (networks, own, routes []netip.Prefix) {
	for _, r := range s.HostRoutes {
		if p, err := netip.ParsePrefix(r); err == nil && p.Addr().Is4() {
			routes = append(routes, p.Masked())
		}
	}
	for _, n := range s.Networks {
		for _, sub := range n.Subnets {
			p, err := netip.ParsePrefix(sub)
			if err != nil || !p.Addr().Is4() {
				continue
			}
			if aid != "" && n.Labels["io.sup2api.ccgateway.account"] == aid {
				own = append(own, p.Masked())
			} else {
				networks = append(networks, p.Masked())
			}
		}
	}
	return networks, own, routes
}

// Endpoint is one entry of NetworkSettings.Networks.
type Endpoint struct {
	IPAddress string
	NetworkID string
}

// Mount is one entry of a container's Mounts.
type Mount struct {
	Type, Name, Source, Destination, Driver, Mode, Propagation string
	RW                                                         bool
}

// Container is a container's raw Docker inspect (Raw, decoded in order with
// numbers kept as written) plus the fields the controller reads.
// container_identity is computed from Raw (containerfs.Identity), never from
// the typed fields.
type Container struct {
	Raw pyjson.Ordered

	ID          string
	Name        string // without the leading "/"
	Image       string // inspect "Image": the image ID
	Created     string
	Path        string
	Args        []string
	Status      string // State.Status
	StartedAt   string // State.StartedAt
	Labels      map[string]string
	Env         []string
	User        string
	ConfigImage string // Config.Image: the reference it was created from
	NetworkMode string // HostConfig.NetworkMode
	Networks    map[string]Endpoint
	Mounts      []Mount
}

// BootID changes whenever the container (re)starts (common.boot_id).
func (c *Container) BootID() string { return c.StartedAt }

// Running is status == 'running'.
func (c *Container) Running() bool { return c.Status == "running" }

// IP is the container's address on network name ("" when not on it).
func (c *Container) IP(network string) string { return c.Networks[network].IPAddress }

// EnvMap is common.container_env: items with "=" split once, later ones win.
func (c *Container) EnvMap() map[string]string {
	out := map[string]string{}
	for _, item := range c.Env {
		if k, v, ok := strings.Cut(item, "="); ok {
			out[k] = v
		}
	}
	return out
}

// ImageOf is dockerfs.image_of: inspect "Image", else the image label.
func (c *Container) ImageOf() string {
	if c.Image != "" {
		return c.Image
	}
	return c.Labels["io.sup2api.ccgateway.image"]
}

// IPAMConfig is one IPAM pool of a network.
type IPAMConfig struct {
	Subnet  string
	Gateway string
}

// NetEndpoint is one entry of a network's Containers.
type NetEndpoint struct {
	Name        string
	IPv4Address string // with the prefix length, e.g. 10.0.0.3/24
}

// Network is a network's raw inspect plus the fields the controller reads.
type Network struct {
	Raw        pyjson.Ordered
	ID         string
	Name       string
	Created    string
	Labels     map[string]string
	IPAM       []IPAMConfig
	Containers map[string]NetEndpoint // container ID -> endpoint
}

// FirstSubnet is network.first_subnet: the first IPAM subnet.
func (n *Network) FirstSubnet() (netip.Prefix, error) {
	if len(n.IPAM) == 0 {
		return netip.Prefix{}, errors.New("network has no IPAM subnet")
	}
	p, err := netip.ParsePrefix(n.IPAM[0].Subnet)
	if err != nil {
		return netip.Prefix{}, err
	}
	return p, nil
}

// EndpointAddresses are the IPv4 addresses of every endpoint (without prefix length).
func (n *Network) EndpointAddresses() []string {
	var out []string
	for _, id := range sortedKeys(n.Containers) {
		addr, _, _ := strings.Cut(n.Containers[id].IPv4Address, "/")
		out = append(out, addr)
	}
	return out
}

// Volume is a volume's raw inspect plus the fields the controller reads.
type Volume struct {
	Raw       pyjson.Ordered
	Name      string
	Driver    string
	Options   map[string]string
	Labels    map[string]string
	CreatedAt string
}

// ContainerRef names a container using a resource (03 §3.5.1).
type ContainerRef struct {
	ID     string `json:"Id"`
	Name   string `json:"Name"`
	Status string `json:"Status"`
}

// Account is GET /v1/accounts/{aid} (03 §3.5.1).
type Account struct {
	App             *Container // nil when <p>-<aid>-app does not exist
	Others          []*Container
	Network         *Network
	Uplink          *Network
	Volume          *Volume
	VolumeUsers     []ContainerRef
	NetworkForeign  []ContainerRef
	GatewayAttached bool
}

// Container is the account container with suffix role ("app", "egress",
// "app-x"), nil when absent.
func (a *Account) Container(prefix, aid, role string) *Container {
	name := prefix + "-" + aid + "-" + role
	if a.App != nil && a.App.Name == name {
		return a.App
	}
	for _, c := range a.Others {
		if c.Name == name {
			return c
		}
	}
	return nil
}

// AccountState is GET /v1/accounts/{aid}?fields=state (R2).
type AccountState struct {
	App     *StateApp     `json:"app"`
	Gateway *StateGateway `json:"gateway"`
}

// StateApp is the account container's state.
type StateApp struct {
	ID        string `json:"id"`
	Image     string `json:"image"`
	Status    string `json:"status"`
	StartedAt string `json:"started_at"`
	IP        string `json:"ip"`
}

// StateGateway is the shared gateway's state.
type StateGateway struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	StartedAt string `json:"started_at"`
	IP        string `json:"ip"` // its address on <p>-<aid>-net, "" when not attached
}

// Inventory is GET /v1/inventory (03 §3.4.3).
type Inventory struct {
	Containers []*Container
	Networks   []*Network
	Volumes    []*Volume
}

// NetworkRequest is PUT /v1/accounts/{aid}/network.
type NetworkRequest struct {
	Subnet      string `json:"subnet"`
	Gateway     string `json:"gateway"`
	PolicyLabel string `json:"policy_label"`
}

// UplinkRequest is the optional uplink of POST /v1/gateway/ensure.
type UplinkRequest NetworkRequest

// VolumeRequest is PUT /v1/accounts/{aid}/volume.
type VolumeRequest struct {
	SizeBytes      int64 `json:"size_bytes"`
	AllowUnbounded bool  `json:"allow_unbounded"`
}

// VolumeResult is its answer.
type VolumeResult struct {
	Volume         *Volume
	Created        bool
	QuotaSupported *bool // only set when created; false: storage lacks project quotas
}

// AppRequest is PUT /v1/accounts/{aid}/app.
type AppRequest struct {
	Image       string            `json:"image"`
	IPv4        string            `json:"ipv4"`
	Env         map[string]string `json:"env"`
	AuthLabel   string            `json:"auth_label"`
	ImageLabel  string            `json:"image_label"`
	MemoryBytes int64             `json:"memory_bytes,omitempty"`
	NanoCPUs    int64             `json:"nano_cpus,omitempty"`
}

// App container actions.
const (
	ActionStart   = "start"
	ActionStop    = "stop"
	ActionRestart = "restart"
)

// Exec users.
const (
	UserDefault = ""
	UserRoot    = "0"
	UserWorker  = "1000"
)

// ExecResult is an exec's exit code and merged stdout+stderr (R5).
type ExecResult struct {
	ExitCode int
	Output   []byte
}

// Top is GET .../app/top: Docker's {Titles, Processes} with ps -eo pid,comm.
type Top struct {
	Titles    []string   `json:"Titles"`
	Processes [][]string `json:"Processes"`
}

// Job volume modes, users and capabilities (03 §3.5.14).
const (
	VolumeNone = "none"
	VolumeRO   = "ro"
	VolumeRW   = "rw"

	JobUserRoot   = "0"
	JobUserWorker = "1000:1000"

	CapChown       = "CHOWN"
	CapDACOverride = "DAC_OVERRIDE"
	CapFowner      = "FOWNER"
)

// Job is POST /v1/accounts/{aid}/jobs.
type Job struct {
	Image       string   `json:"image"`
	Entrypoint  []string `json:"entrypoint"`
	Argv        []string `json:"argv"`
	User        string   `json:"user"`
	Volume      string   `json:"volume"`
	Caps        []string `json:"caps"`
	MemoryBytes int64    `json:"memory_bytes,omitempty"`
}

// JobResult is a job's exit code and its stdout only (R8). A non-zero exit
// code is not an error of the guard.
type JobResult struct {
	ExitCode int
	Stdout   []byte
}

// ImageConfig is the part of an image's Config the controller reads.
type ImageConfig struct {
	Env    []string          `json:"Env"`
	Labels map[string]string `json:"Labels"`
}

// Image is GET /v1/images/inspect (R10).
type Image struct {
	ID       string      `json:"Id"`
	RepoTags []string    `json:"RepoTags"`
	Config   ImageConfig `json:"Config"`
}

// LoadedImage is one image of POST /v1/images/load.
type LoadedImage struct {
	ID   string   `json:"id"`
	Tags []string `json:"tags"`
}

// PyValue is Python's {"id", "tags"} (R16 answer order).
func (l LoadedImage) PyValue() any {
	tags := make([]any, len(l.Tags))
	for i, t := range l.Tags {
		tags[i] = t
	}
	return pyjson.Ordered{{Key: "id", Value: l.ID}, {Key: "tags", Value: tags}}
}

// Gateway management.
const (
	ManagedByCompose = "compose"
	ManagedByLegacy  = "legacy"
)

// Gateway is GET /v1/gateway.
type Gateway struct {
	Container *Container // nil when the gateway does not exist
	ManagedBy string     // compose | legacy | ""
}

// Ensure actions.
const (
	EnsureNone    = "none"
	EnsureStarted = "started"
	EnsureCreated = "created"
)

// EnsureResult is POST /v1/gateway/ensure.
type EnsureResult struct {
	Gateway *Container
	Action  string
}

// Gateway file names the guard accepts (03 §3.7.7).
const (
	FileBootJSON  = "boot.json"
	FileBootNFT   = "boot.nft"
	FileDNSJSON   = "dns.json"
	FileActiveNFT = "active.nft"
	FileOperation = "operation.json"
)

// GatewayFiles is the guard's whitelist.
var GatewayFiles = []string{FileBootJSON, FileBootNFT, FileDNSJSON, FileActiveNFT, FileOperation}

// UpgradeStatus is GET /v1/controller/upgrade.
type UpgradeStatus struct {
	State     string `json:"state"` // idle | running | done | failed
	Image     string `json:"image"`
	Previous  string `json:"previous"`
	Step      string `json:"step"`
	Result    string `json:"result"`
	Rollback  string `json:"rollback"`
	StartedAt string `json:"started_at"`
	EndedAt   string `json:"ended_at"`
}

func sortedKeys[T any](m map[string]T) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func decodeBase64(s string) ([]byte, error) { return base64.StdEncoding.DecodeString(s) }
