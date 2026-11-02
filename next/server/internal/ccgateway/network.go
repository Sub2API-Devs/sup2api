package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"net/netip"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// RuntimeNetwork controls both isolated business and egress uplink networks.
type RuntimeNetwork struct {
	Pool       string `json:"pool"`
	Allocation string `json:"allocation"`
}

func (c Config) EffectiveNetwork() RuntimeNetwork {
	n := RuntimeNetwork{Pool: "10.0.0.0/8", Allocation: "random"}
	if c.Network != nil {
		if c.Network.Pool != "" {
			n.Pool = c.Network.Pool
		}
		if c.Network.Allocation != "" {
			n.Allocation = c.Network.Allocation
		}
	}
	return n
}

func validateNetwork(n RuntimeNetwork) (RuntimeNetwork, error) {
	p, err := netip.ParsePrefix(strings.TrimSpace(n.Pool))
	if err != nil || !p.Addr().Is4() || p.Bits() > 24 {
		return n, errors.New("network pool must be an RFC1918 IPv4 CIDR with prefix at most /24")
	}
	p = p.Masked()
	allowed := false
	for _, cidr := range []string{"10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"} {
		parent := netip.MustParsePrefix(cidr)
		if p.Bits() >= parent.Bits() && parent.Contains(p.Addr()) {
			allowed = true
		}
	}
	if !allowed || (n.Allocation != "random" && n.Allocation != "sequential") {
		return n, errors.New("invalid private network pool or IP allocation mode")
	}
	n.Pool = p.String()
	return n, nil
}

// Read through the caller's transaction so adoption and dispatch agree on the
// same network revision. Any network policy change invalidates old readiness.
func (s *Service) desiredNetwork(ctx context.Context, q store.Querier, d accountDesired) (accountDesired, error) {
	c, _, err := s.loadIn(ctx, q, false)
	if err != nil {
		return d, err
	}
	d.Network = c.EffectiveNetwork()
	encoded, _ := json.Marshal(d.Network)
	d.Revision = revisionOf(d.Revision + "|network:" + string(encoded))
	// No CLI: the image decides (cli-from-image-v1, 2026-11-02); putConfig
	// names one only for a controller that cannot.
	return d, nil
}

// runtimeDefaultMode is the request_mode of every CLI profile (audit A11). It
// decides nothing per request: the core sends relay_mode with each one and
// the Worker switches to it (CONTRACTS §53.21). The controller still requires
// the key (cli_profiles.validate_profile accepts exactly version, request_mode
// and disable_auto_update) and checks the packaged CLI has that mode.
const runtimeDefaultMode = "build"

// RuntimeCLI is the CLI profile a controller without cli-from-image-v1 is
// sent (legacyCLI). The core does not choose the CLI otherwise: a new
// runtime runs the one its image packages, an existing one keeps the one it
// runs until it is updated in place.
type RuntimeCLI struct {
	Version           string `json:"version"`
	RequestMode       string `json:"request_mode"`
	DisableAutoUpdate bool   `json:"disable_auto_update"`
}
