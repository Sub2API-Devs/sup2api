// Package config parses the guard's environment (03 §10.1). The guard has no
// configuration file: compose passes every value as an environment
// variable. Errors name the variable and the reason, never the value.
package config

import (
	"encoding/hex"
	"fmt"
	"net/netip"
	"path"
	"regexp"
	"strings"

	"ccgateway/guard/internal/names"
)

// Config is one guard instance (X2: one process serves one instance).
type Config struct {
	Token          [32]byte
	HasToken       bool
	Prefix         string
	Listen         netip.AddrPort
	ControllerIP   netip.Addr
	ControlNetwork string
	ControlBridge  string
	ControlSubnet  netip.Prefix
	ChainPrefix    string
	Project        string
	ProjectDir     string
	RuntimeRoot    string
	StateDir       string
	DockerSocket   string
	PullRepos      []Pattern
	LoadRepos      []Pattern
	// ControlDNS lets the controller reach Docker's upstream DNS servers on
	// port 53 (D1: on by default). DNSServers, when set, replaces the
	// servers read from the resolv.conf files.
	ControlDNS        bool
	DNSServers        []netip.Addr
	ResolvConf        string // the host's /etc/resolv.conf as the guard sees it
	SystemdResolvConf string // systemd-resolved's upstream file
	Debug             bool
}

// Names is the resource name builder of this instance.
func (c *Config) Names() names.Names { return names.Names{Prefix: c.Prefix} }

// Chain returns the chain name for a suffix such as "PROXY-BRIDGE".
func (c *Config) Chain(suffix string) string { return c.ChainPrefix + "-" + suffix }

// Options select what Load requires.
type Options struct {
	// RequireToken is false for the offline subcommands (print-rules,
	// diff-rules, print-cleanup), which never serve the API.
	RequireToken bool
}

var (
	tokenRe   = regexp.MustCompile(`^[0-9a-f]{64}$`)
	bridgeRe  = regexp.MustCompile(`^[a-z0-9-]{1,15}$`)
	chainRe   = regexp.MustCompile(`^[A-Z][A-Z0-9-]{0,14}$`)
	projectRe = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,62}$`)
	netNameRe = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$`)
	repoRe    = regexp.MustCompile(`^[a-z0-9][a-z0-9._/-]{0,254}\*?$`)
)

// Error is a configuration error: variable name and reason, no value.
type Error struct{ Var, Reason string }

func (e *Error) Error() string { return e.Var + ": " + e.Reason }

func bad(v, reason string) error { return &Error{Var: v, Reason: reason} }

// Load reads and validates every variable.
func Load(getenv func(string) string, opt Options) (*Config, error) {
	get := func(name, def string) string {
		if v := getenv(name); v != "" {
			return v
		}
		return def
	}
	c := &Config{}

	if tok := getenv("CCG_GUARD_TOKEN"); tok != "" || opt.RequireToken {
		if !tokenRe.MatchString(tok) {
			return nil, bad("CCG_GUARD_TOKEN", "must be 64 lowercase hex digits")
		}
		b, _ := hex.DecodeString(tok)
		copy(c.Token[:], b)
		c.HasToken = true
	}

	c.Prefix = get("CCG_GUARD_PREFIX", "ccg")
	if !names.Prefix.MatchString(c.Prefix) || strings.HasSuffix(c.Prefix, "-") {
		return nil, bad("CCG_GUARD_PREFIX", "must match ^[a-z][a-z0-9-]{0,32}$ and not end with '-'")
	}

	var err error
	sub := get("CCG_GUARD_CONTROL_SUBNET", "172.29.255.0/29")
	c.ControlSubnet, err = netip.ParsePrefix(sub)
	if err != nil || !c.ControlSubnet.Addr().Is4() || c.ControlSubnet.Bits() < 24 || c.ControlSubnet.Bits() > 30 ||
		c.ControlSubnet.Masked() != c.ControlSubnet {
		return nil, bad("CCG_GUARD_CONTROL_SUBNET", "must be an IPv4 network /24 to /30")
	}

	c.Listen, err = netip.ParseAddrPort(get("CCG_GUARD_LISTEN", "172.29.255.1:8790"))
	if err != nil || !c.Listen.Addr().Is4() || c.Listen.Port() == 0 {
		return nil, bad("CCG_GUARD_LISTEN", "must be IPv4:port")
	}
	if !HostAddr(c.Listen.Addr(), c.ControlSubnet) {
		return nil, bad("CCG_GUARD_LISTEN", "address must be a host address of the control subnet")
	}
	c.ControllerIP, err = netip.ParseAddr(get("CCG_GUARD_CONTROLLER_IP", "172.29.255.2"))
	if err != nil || !c.ControllerIP.Is4() || !HostAddr(c.ControllerIP, c.ControlSubnet) {
		return nil, bad("CCG_GUARD_CONTROLLER_IP", "must be a host address of the control subnet")
	}
	if c.ControllerIP == c.Listen.Addr() {
		return nil, bad("CCG_GUARD_CONTROLLER_IP", "must differ from the listen address")
	}

	c.ControlNetwork = get("CCG_GUARD_CONTROL_NETWORK", "ccg-control")
	if !netNameRe.MatchString(c.ControlNetwork) {
		return nil, bad("CCG_GUARD_CONTROL_NETWORK", "invalid Docker network name")
	}
	c.ControlBridge = get("CCG_GUARD_CONTROL_BRIDGE", "ccg-control0")
	if !bridgeRe.MatchString(c.ControlBridge) {
		return nil, bad("CCG_GUARD_CONTROL_BRIDGE", "must match ^[a-z0-9-]{1,15}$")
	}
	c.ChainPrefix = get("CCG_GUARD_CHAIN_PREFIX", "CCG")
	if !chainRe.MatchString(c.ChainPrefix) || len(c.ChainPrefix)+len("-PROXY-BRIDGE") > 28 {
		return nil, bad("CCG_GUARD_CHAIN_PREFIX", "must match ^[A-Z][A-Z0-9-]{0,14}$")
	}
	c.Project = get("CCG_GUARD_PROJECT", "ccgateway")
	if !projectRe.MatchString(c.Project) {
		return nil, bad("CCG_GUARD_PROJECT", "invalid compose project name")
	}
	for _, p := range []struct {
		v   string
		def string
		dst *string
	}{
		{"CCG_GUARD_PROJECT_DIR", "/opt/ccgateway", &c.ProjectDir},
		{"CCG_GUARD_RUNTIME_ROOT", "/opt/ccgateway-runtime", &c.RuntimeRoot},
		{"CCG_GUARD_STATE_DIR", "/var/lib/ccgateway-guard", &c.StateDir},
		{"CCG_GUARD_DOCKER_SOCKET", "/var/run/docker.sock", &c.DockerSocket},
		{"CCG_GUARD_RESOLV_CONF", "/etc/resolv.conf", &c.ResolvConf},
		{"CCG_GUARD_SYSTEMD_RESOLV_CONF", "/run/systemd/resolve/resolv.conf", &c.SystemdResolvConf},
	} {
		val := get(p.v, p.def)
		if !AbsClean(val) {
			return nil, bad(p.v, "must be a clean absolute path")
		}
		*p.dst = val
	}

	if c.PullRepos, err = ParsePatterns(get("CCG_GUARD_PULL_REPOS", "ghcr.io/sub2api-devs/ccgateway-*")); err != nil {
		return nil, bad("CCG_GUARD_PULL_REPOS", err.Error())
	}
	if c.LoadRepos, err = ParsePatterns(get("CCG_GUARD_LOAD_REPOS", "ccgateway-*,ghcr.io/sub2api-devs/ccgateway-*")); err != nil {
		return nil, bad("CCG_GUARD_LOAD_REPOS", err.Error())
	}

	switch get("CCG_GUARD_CONTROL_DNS", "1") {
	case "1":
		c.ControlDNS = true
	case "0":
	default:
		return nil, bad("CCG_GUARD_CONTROL_DNS", "must be 0 or 1")
	}
	if v := getenv("CCG_GUARD_CONTROL_DNS_SERVERS"); v != "" {
		for _, s := range strings.Split(v, ",") {
			a, err := netip.ParseAddr(strings.TrimSpace(s))
			if err != nil || !a.Is4() || a.IsLoopback() || a.IsUnspecified() || a.IsMulticast() {
				return nil, bad("CCG_GUARD_CONTROL_DNS_SERVERS", "must be comma separated non-loopback IPv4 addresses")
			}
			c.DNSServers = append(c.DNSServers, a)
		}
		if len(c.DNSServers) > 8 {
			return nil, bad("CCG_GUARD_CONTROL_DNS_SERVERS", "at most 8 servers")
		}
	}

	switch get("CCG_GUARD_LOG", "info") {
	case "info":
	case "debug":
		c.Debug = true
	default:
		return nil, bad("CCG_GUARD_LOG", "must be info or debug")
	}
	return c, nil
}

// AbsClean reports whether p is absolute, clean and NUL free.
func AbsClean(p string) bool {
	return strings.HasPrefix(p, "/") && path.Clean(p) == p && !strings.ContainsRune(p, 0) && len(p) <= 4096
}

// HostAddr reports whether a is inside prefix and is neither the network
// address nor the broadcast address.
func HostAddr(a netip.Addr, prefix netip.Prefix) bool {
	if !a.Is4() || !prefix.Contains(a) {
		return false
	}
	if a == prefix.Masked().Addr() {
		return false
	}
	return a != Broadcast(prefix)
}

// Broadcast returns the last address of an IPv4 prefix.
func Broadcast(p netip.Prefix) netip.Addr {
	b := p.Masked().Addr().As4()
	host := 32 - p.Bits()
	v := uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])
	v |= (1 << host) - 1
	return netip.AddrFrom4([4]byte{byte(v >> 24), byte(v >> 16), byte(v >> 8), byte(v)})
}

// First returns the .1 address of an IPv4 prefix.
func First(p netip.Prefix) netip.Addr { return p.Masked().Addr().Next() }

// Pattern is a repository pattern: an exact repository, or one ending in a
// single '*' that matches within the last path segment (03 §10.1).
type Pattern struct {
	norm string // qualified, with the trailing '*' if any
	glob bool
}

func (p Pattern) String() string { return p.norm }

// ParsePatterns parses a comma separated list.
func ParsePatterns(v string) ([]Pattern, error) {
	var out []Pattern
	for _, item := range strings.Split(v, ",") {
		item = strings.TrimSpace(item)
		if item == "" || item == "*" || !repoRe.MatchString(item) || strings.Contains(item, "//") {
			return nil, fmt.Errorf("invalid repository pattern")
		}
		glob := strings.HasSuffix(item, "*")
		base := strings.TrimSuffix(item, "*")
		if strings.HasSuffix(base, "/") {
			return nil, fmt.Errorf("pattern must end with a name")
		}
		norm := Qualify(base)
		if glob {
			norm += "*"
		}
		out = append(out, Pattern{norm: norm, glob: glob})
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("empty pattern list")
	}
	return out, nil
}

// Match reports whether the repository (no tag, no digest) matches.
func (p Pattern) Match(repo string) bool {
	q := Qualify(repo)
	if !p.glob {
		return q == p.norm
	}
	base := strings.TrimSuffix(p.norm, "*")
	rest, ok := strings.CutPrefix(q, base)
	return ok && !strings.Contains(rest, "/")
}

// MatchAny reports whether any pattern matches repo.
func MatchAny(ps []Pattern, repo string) bool {
	for _, p := range ps {
		if p.Match(repo) {
			return true
		}
	}
	return false
}

// Qualify is images._qualified for a repository or reference:
// x → docker.io/library/x, a/b → docker.io/a/b, registry/a stays.
func Qualify(name string) string {
	first, _, hasSlash := strings.Cut(name, "/")
	if hasSlash && (strings.Contains(first, ".") || strings.Contains(first, ":") || first == "localhost") {
		return name
	}
	if hasSlash {
		return "docker.io/" + name
	}
	return "docker.io/library/" + name
}

// SplitRef cuts an image reference into repository, tag and digest. The
// tag is "" when absent; digest includes "sha256:".
func SplitRef(ref string) (repo, tag, digest string) {
	repo = ref
	if i := strings.Index(repo, "@"); i >= 0 {
		repo, digest = repo[:i], repo[i+1:]
	}
	if i := strings.LastIndex(repo, ":"); i >= 0 && !strings.Contains(repo[i:], "/") {
		repo, tag = repo[:i], repo[i+1:]
	}
	return repo, tag, digest
}
