package dockerapi

import "encoding/json"

// Raw is a Docker response body kept byte for byte (X3, R1).
type Raw = json.RawMessage

// ContainerInfo is the part of a container inspect the guard itself reads.
// Everything returned to the controller is the Raw bytes instead.
type ContainerInfo struct {
	ID           string `json:"Id"`
	Name         string `json:"Name"`
	Image        string `json:"Image"`
	Created      string `json:"Created"`
	RestartCount int    `json:"RestartCount"`
	State        struct {
		Status    string `json:"Status"`
		Running   bool   `json:"Running"`
		Pid       int    `json:"Pid"`
		ExitCode  int    `json:"ExitCode"`
		StartedAt string `json:"StartedAt"`
		Health    *struct {
			Status string `json:"Status"`
		} `json:"Health"`
	} `json:"State"`
	Config struct {
		Image  string            `json:"Image"`
		Labels map[string]string `json:"Labels"`
		Env    []string          `json:"Env"`
	} `json:"Config"`
	HostConfig struct {
		NetworkMode string `json:"NetworkMode"`
	} `json:"HostConfig"`
	Mounts          []Mount `json:"Mounts"`
	NetworkSettings struct {
		Networks map[string]EndpointInfo `json:"Networks"`
	} `json:"NetworkSettings"`
}

// Mount is one entry of a container's Mounts.
type Mount struct {
	Type        string `json:"Type"`
	Name        string `json:"Name"`
	Source      string `json:"Source"`
	Destination string `json:"Destination"`
	Mode        string `json:"Mode"`
	RW          bool   `json:"RW"`
}

// EndpointInfo is a container's endpoint on one network.
type EndpointInfo struct {
	NetworkID  string `json:"NetworkID"`
	EndpointID string `json:"EndpointID"`
	IPAddress  string `json:"IPAddress"`
	IPAMConfig *struct {
		IPv4Address string `json:"IPv4Address"`
	} `json:"IPAMConfig"`
}

// TrimName drops Docker's leading "/".
func (c *ContainerInfo) TrimName() string {
	if len(c.Name) > 0 && c.Name[0] == '/' {
		return c.Name[1:]
	}
	return c.Name
}

// Label returns a label value ("" when absent).
func (c *ContainerInfo) Label(k string) string {
	if c == nil || c.Config.Labels == nil {
		return ""
	}
	return c.Config.Labels[k]
}

// NetworkInfo is the part of a network inspect the guard reads.
type NetworkInfo struct {
	Name       string                     `json:"Name"`
	ID         string                     `json:"Id"`
	Driver     string                     `json:"Driver"`
	Internal   bool                       `json:"Internal"`
	Labels     map[string]string          `json:"Labels"`
	Options    map[string]string          `json:"Options"`
	IPAM       IPAM                       `json:"IPAM"`
	Containers map[string]NetworkEndpoint `json:"Containers"`
}

// IPAM is a network's address configuration.
type IPAM struct {
	Driver string       `json:"Driver"`
	Config []IPAMConfig `json:"Config"`
}

// IPAMConfig is one address pool.
type IPAMConfig struct {
	Subnet  string `json:"Subnet"`
	Gateway string `json:"Gateway,omitempty"`
}

// NetworkEndpoint is one container on a network (network inspect view).
type NetworkEndpoint struct {
	Name        string `json:"Name"`
	IPv4Address string `json:"IPv4Address"`
}

// Label returns a label value.
func (n *NetworkInfo) Label(k string) string {
	if n == nil || n.Labels == nil {
		return ""
	}
	return n.Labels[k]
}

// BridgeName is the Linux bridge of a bridge network.
func (n *NetworkInfo) BridgeName() string {
	if v := n.Options["com.docker.network.bridge.name"]; v != "" {
		return v
	}
	if len(n.ID) >= 12 {
		return "br-" + n.ID[:12]
	}
	return ""
}

// VolumeInfo is the part of a volume inspect the guard reads.
type VolumeInfo struct {
	Name    string            `json:"Name"`
	Driver  string            `json:"Driver"`
	Labels  map[string]string `json:"Labels"`
	Options map[string]string `json:"Options"`
}

// ImageInfo is the part of an image inspect the guard reads and returns.
type ImageInfo struct {
	ID       string   `json:"Id"`
	RepoTags []string `json:"RepoTags"`
	Config   struct {
		Env    []string          `json:"Env"`
		Labels map[string]string `json:"Labels"`
	} `json:"Config"`
}

// ContainerSummary is one row of GET /containers/json.
type ContainerSummary struct {
	ID     string            `json:"Id"`
	Names  []string          `json:"Names"`
	Image  string            `json:"Image"`
	State  string            `json:"State"`
	Labels map[string]string `json:"Labels"`
	Mounts []Mount           `json:"Mounts"`
}

// Name returns the first name without the leading "/".
func (s ContainerSummary) Name() string {
	if len(s.Names) == 0 {
		return ""
	}
	n := s.Names[0]
	if len(n) > 0 && n[0] == '/' {
		return n[1:]
	}
	return n
}

// VersionInfo is GET /version.
type VersionInfo struct {
	Version       string `json:"Version"`
	APIVersion    string `json:"ApiVersion"`
	MinAPIVersion string `json:"MinAPIVersion"`
}

// Event is one Docker event (03 §5.5).
type Event struct {
	Type   string `json:"Type"`
	Action string `json:"Action"`
	Actor  struct {
		ID         string            `json:"ID"`
		Attributes map[string]string `json:"Attributes"`
	} `json:"Actor"`
	Time     int64 `json:"time"`
	TimeNano int64 `json:"timeNano"`
}

// Filters is Docker's filters query parameter.
type Filters map[string][]string
