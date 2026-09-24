package gateway

import (
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
)

// typeRoute is how the current request reaches accounts of one account type
// (ARCHITECTURE 6.6, CONTRACTS §13): natively (the type supports the
// endpoint's platform) or through a core protocol converter to a protocol of
// another platform the type supports.
type typeRoute struct {
	binding core.AccountTypeBinding
	// platform is the platform served upstream: the endpoint's platform
	// when native, else the platform owning the upstream protocol.
	platform string
	// upstream is the protocol sent upstream; equals the endpoint protocol
	// when native.
	upstream string
	conv     convert.Converter // nil when native

	requestFields []string
	passHeaders   []string
	usage         manifest.UsageRules

	// Lazily converted request body (conversion path only).
	converted bool
	body      []byte
	bodyErr   error
}

// planRoutes lists the account types able to serve the endpoint: those
// supporting the endpoint's platform P (native), then those supporting
// another platform Q with a protocol Y the core converts the endpoint
// protocol X to. A type supporting P is never converted.
func (c *call) planRoutes() {
	p, x := c.platform, c.ep.Protocol
	c.routes = map[core.AccountTypeKey]*typeRoute{}
	c.routeKeys = nil
	if p != "" {
		for _, b := range c.gen.AccountTypesForPlatform(p) {
			if ap, ok := b.Supports(p); ok && b.Client != nil {
				c.addRoute(b, ap, p, x, c.ep, c.pf, nil)
			}
		}
	}
	for _, b := range c.gen.AccountTypes() {
		if b.Client == nil {
			continue
		}
		if _, done := c.routes[b.Key()]; done {
			continue
		}
		if ap, ok := b.Supports(p); ok && p != "" {
			// Native but not listed by AccountTypesForPlatform; still native.
			c.addRoute(b, ap, p, x, c.ep, c.pf, nil)
			continue
		}
		c.addConvertedRoute(b, x)
	}
}

// addConvertedRoute adds the first (platform, protocol) of b the endpoint
// protocol x converts to. Platforms that are not available (declared by a
// disabled plugin) are skipped.
func (c *call) addConvertedRoute(b core.AccountTypeBinding, x string) {
	for _, ap := range b.Type.Platforms {
		if ap.Platform == c.platform {
			continue
		}
		pb, ok := c.gen.Platform(ap.Platform)
		if !ok {
			continue
		}
		for _, y := range pb.Platform.Protocols() {
			conv, ok := c.g.conv.Lookup(x, y)
			if !ok {
				continue
			}
			c.addRoute(b, ap, ap.Platform, y, endpointFor(&pb.Platform, y), pb.Platform, conv)
			return
		}
	}
}

// endpointFor is the first endpoint of pf speaking protocol.
func endpointFor(pf *manifest.Platform, protocol string) manifest.Endpoint {
	for _, e := range pf.Endpoints {
		if e.Protocol == protocol {
			return e
		}
	}
	return manifest.Endpoint{}
}

// addRoute records the route of b to upstream protocol y of platform q:
// request fields and pass headers come from the account type's entry for q,
// else the platform; usage rules from the account type (per protocol), else
// the endpoint speaking y, else the platform.
func (c *call) addRoute(b core.AccountTypeBinding, ap manifest.AccountPlatform, q, y string,
	ep manifest.Endpoint, pf manifest.Platform, conv convert.Converter) {
	k := b.Key()
	if _, dup := c.routes[k]; dup {
		return
	}
	rt := &typeRoute{binding: b, platform: q, upstream: y, conv: conv,
		requestFields: ap.RequestFields, passHeaders: ap.PassHeaders, usage: pf.Usage}
	if len(rt.requestFields) == 0 {
		rt.requestFields = pf.RequestFields
	}
	if len(rt.passHeaders) == 0 {
		rt.passHeaders = pf.PassHeaders
	}
	if u, ok := ap.Usage[y]; ok {
		rt.usage = u
	} else if ep.Usage != nil {
		rt.usage = *ep.Usage
	}
	c.routes[k] = rt
	c.routeKeys = append(c.routeKeys, k)
}

// route returns the route of an account, nil when its type cannot serve
// this request.
func (c *call) route(ref *core.AccountRef) *typeRoute {
	return c.routes[core.AccountTypeKey{PluginKey: ref.PluginKey, Type: ref.Type}]
}

// usable reports whether ref can still be tried (its type has a route and,
// when converting, the request converted).
func (c *call) usable(ref *core.AccountRef) bool {
	rt := c.route(ref)
	return rt != nil && rt.bodyErr == nil
}

// upstreamBody returns the request body for the route's upstream protocol.
func (rt *typeRoute) upstreamBody(body []byte) ([]byte, error) {
	if rt.conv == nil {
		return body, nil
	}
	if !rt.converted {
		rt.converted = true
		rt.body, rt.bodyErr = rt.conv.Request(body)
	}
	return rt.body, rt.bodyErr
}
