package gateway

import (
	"context"
	"net/url"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/netguard"
)

// The SSRF guard itself lives in internal/netguard: the gateway is not the
// only place the core sends a request a plugin described (the reconcile loop
// of CONTRACTS §25.4 is the other), and two copies of this check would be one
// copy too many.
var (
	errBadUpstreamURL  = netguard.ErrBadURL
	errPrivateUpstream = netguard.ErrPrivate
)

// checkUpstreamURL validates a URL returned by BuildUpstreamRequest: http(s),
// a host, and (unless AllowPrivateUpstream) only public addresses. Proxied
// requests are resolved by the proxy; the check still applies to the name.
func (g *Gateway) checkUpstreamURL(ctx context.Context, raw string) (*url.URL, error) {
	return netguard.CheckURL(ctx, raw, g.allowPrivate, g.lookupIP)
}
