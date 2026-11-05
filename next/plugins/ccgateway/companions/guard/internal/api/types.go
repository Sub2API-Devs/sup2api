package api

import "encoding/json"

// This file is the guard side of the controller contract (03 §3). The Go
// controller's guardapi copies these JSON names; testdata/api-contract
// holds the request → answer samples both sides run.

// ErrorBody is every error answer.
type ErrorBody struct {
	Error   string   `json:"error"`
	Reason  string   `json:"reason,omitempty"`
	Message string   `json:"message"`
	Names   []string `json:"names,omitempty"`
}

// Features of this guard (03 §3.4.1).
var Features = []string{
	"account-state-v1", "exec-combined-v1", "gateway-compose-v1", "raw-inspect-v1",
	"jobs-v1", "load-gzip-v1", "upgrade-compose-v1",
}

// FeatureSessionState is reported only with CCG_GUARD_SESSION_STATE=1: new
// account containers get the state socket mount, so the controller may
// hand out Valkey credentials (SESSION-MEMORY-TOOLS-USED-DESIGN.md §7.4).
const FeatureSessionState = "session-state-v1"

// Health is GET /v1/health.
type Health struct {
	Version    string   `json:"version"`
	Prefix     string   `json:"prefix"`
	Features   []string `json:"features"`
	Docker     string   `json:"docker"`
	Firewall   string   `json:"firewall"`
	Controller string   `json:"controller"`
	Starting   bool     `json:"starting"`
}

// Subnets is GET /v1/subnets.
type Subnets struct {
	HostRoutes []string     `json:"host_routes"`
	Networks   []NetSubnets `json:"networks"`
}

// NetSubnets is one Docker network.
type NetSubnets struct {
	Name    string            `json:"name"`
	Labels  map[string]string `json:"labels"`
	Subnets []string          `json:"subnets"`
}

// Inventory is GET /v1/inventory.
type Inventory struct {
	Containers []json.RawMessage `json:"containers"`
	Networks   []json.RawMessage `json:"networks"`
	Volumes    []json.RawMessage `json:"volumes"`
}

// Account is GET /v1/accounts/{aid}.
type Account struct {
	App             json.RawMessage   `json:"app"`
	Others          []json.RawMessage `json:"others"`
	Network         json.RawMessage   `json:"network"`
	Uplink          json.RawMessage   `json:"uplink"`
	Volume          json.RawMessage   `json:"volume"`
	VolumeUsers     []ContainerRef    `json:"volume_users"`
	NetworkForeign  []ContainerRef    `json:"network_foreign"`
	GatewayAttached bool              `json:"gateway_attached"`
}

// ContainerRef names a container.
type ContainerRef struct {
	ID     string `json:"Id"`
	Name   string `json:"Name"`
	Status string `json:"Status"`
}

// AccountState is GET /v1/accounts/{aid}?fields=state.
type AccountState struct {
	App     *StateApp     `json:"app"`
	Gateway *StateGateway `json:"gateway"`
}

// StateApp is the app part of AccountState.
type StateApp struct {
	ID        string `json:"id"`
	Image     string `json:"image"`
	Status    string `json:"status"`
	StartedAt string `json:"started_at"`
	IP        string `json:"ip"`
}

// StateGateway is the gateway part of AccountState.
type StateGateway struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	StartedAt string `json:"started_at"`
	IP        string `json:"ip"`
}

// NetworkRequest is PUT /v1/accounts/{aid}/network.
type NetworkRequest struct {
	Subnet      string `json:"subnet"`
	Gateway     string `json:"gateway"`
	PolicyLabel string `json:"policy_label"`
}

// VolumeRequest is PUT /v1/accounts/{aid}/volume.
type VolumeRequest struct {
	SizeBytes      int64 `json:"size_bytes"`
	AllowUnbounded bool  `json:"allow_unbounded"`
}

// VolumeResult answers PUT volume.
type VolumeResult struct {
	Volume         json.RawMessage `json:"volume"`
	Created        bool            `json:"created"`
	QuotaSupported *bool           `json:"quota_supported"`
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

// ActionRequest is POST app/{start|stop|restart}.
type ActionRequest struct {
	Timeout *int64 `json:"timeout,omitempty"`
}

// ExecRequest is POST app/exec.
type ExecRequest struct {
	Argv []string `json:"argv"`
	User string   `json:"user"`
}

// GatewayExecRequest is POST /v1/gateway/exec (no user).
type GatewayExecRequest struct {
	Argv []string `json:"argv"`
}

// ExecResult answers both exec endpoints.
type ExecResult struct {
	ExitCode int    `json:"exit_code"`
	Output   string `json:"output"`
}

// ResolvRequest is PUT resolv.
type ResolvRequest struct {
	Nameserver string `json:"nameserver"`
}

// FirewallRequest is PUT firewall.
type FirewallRequest struct {
	Rules          string `json:"rules"`
	DefaultGateway string `json:"default_gateway"`
}

// JobRequest is POST jobs.
type JobRequest struct {
	Image       string   `json:"image"`
	Entrypoint  []string `json:"entrypoint"`
	Argv        []string `json:"argv"`
	User        string   `json:"user"`
	Volume      string   `json:"volume"`
	Caps        []string `json:"caps"`
	MemoryBytes int64    `json:"memory_bytes,omitempty"`
}

// JobResult answers POST jobs.
type JobResult struct {
	ExitCode int    `json:"exit_code"`
	Stdout   string `json:"stdout"`
}

// ImageView is GET /v1/images/inspect.
type ImageView struct {
	ID       string          `json:"Id"`
	RepoTags []string        `json:"RepoTags"`
	Config   ImageViewConfig `json:"Config"`
}

// ImageViewConfig is ImageView.Config.
type ImageViewConfig struct {
	Env    []string          `json:"Env"`
	Labels map[string]string `json:"Labels"`
}

// PullRequest is POST /v1/images/pull.
type PullRequest struct {
	Ref string `json:"ref"`
}

// LoadResult answers POST /v1/images/load.
type LoadResult struct {
	Images []LoadedImage `json:"images"`
}

// LoadedImage is one loaded image.
type LoadedImage struct {
	ID   string   `json:"id"`
	Tags []string `json:"tags"`
}

// GatewayView is GET /v1/gateway.
type GatewayView struct {
	Gateway   json.RawMessage `json:"gateway"`
	ManagedBy string          `json:"managed_by"`
}

// EnsureRequest is POST /v1/gateway/ensure.
type EnsureRequest struct {
	Uplink *UplinkRequest `json:"uplink,omitempty"`
}

// UplinkRequest creates the uplink network when missing.
type UplinkRequest struct {
	Subnet      string `json:"subnet"`
	Gateway     string `json:"gateway"`
	PolicyLabel string `json:"policy_label"`
}

// EnsureResult answers ensure (action: none, started, created).
type EnsureResult struct {
	Gateway json.RawMessage `json:"gateway"`
	Action  string          `json:"action"`
}

// RecreateRequest is POST /v1/gateway/recreate.
type RecreateRequest struct {
	Image string `json:"image"`
}

// RecreateResult answers recreate.
type RecreateResult struct {
	Gateway json.RawMessage `json:"gateway"`
}

// ConnectRequest is PUT /v1/gateway/networks/{aid}.
type ConnectRequest struct {
	IPv4 string `json:"ipv4"`
}

// UpgradeRequest is POST /v1/controller/upgrade.
type UpgradeRequest struct {
	Image string `json:"image"`
}

// UpgradeAccepted answers 202.
type UpgradeAccepted struct {
	Accepted bool `json:"accepted"`
}
