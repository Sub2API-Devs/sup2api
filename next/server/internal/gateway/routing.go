package gateway

import (
	"slices"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
)

// typeRoute is how the current request reaches accounts of one account type
// (ARCHITECTURE 6.6): natively, or through a core protocol converter.
type typeRoute struct {
	binding core.AccountTypeBinding
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

// planRoutes lists the account types able to serve the endpoint protocol:
// the natively supporting ones, then those reachable through a converter.
// A type supporting the protocol natively is never converted.
func (c *call) planRoutes() {
	p := c.ep.Protocol
	c.routes = map[core.AccountTypeKey]*typeRoute{}
	c.routeKeys = nil
	for _, b := range c.gen.AccountTypesForProtocol(p) {
		ap, ok := b.Protocol(p)
		if !ok || b.Client == nil {
			continue
		}
		c.addRoute(b, ap, nil)
	}
	for _, b := range c.gen.AccountTypes() {
		if b.Client == nil {
			continue
		}
		if _, done := c.routes[b.Key()]; done {
			continue
		}
		if ap, ok := b.Protocol(p); ok {
			// Native but not listed by AccountTypesForProtocol; still native.
			c.addRoute(b, ap, nil)
			continue
		}
		for _, ap := range b.Type.Protocols {
			if conv, ok := c.g.conv.Lookup(p, ap.Protocol); ok {
				c.addRoute(b, ap, conv)
				break
			}
		}
	}
}

func (c *call) addRoute(b core.AccountTypeBinding, ap manifest.AccountProtocol, conv convert.Converter) {
	k := b.Key()
	if _, dup := c.routes[k]; dup {
		return
	}
	rt := &typeRoute{binding: b, upstream: ap.Protocol, conv: conv}
	def := c.defaultPlatform(ap.Protocol)
	rt.requestFields = ap.RequestFields
	rt.passHeaders = ap.PassHeaders
	if def != nil {
		if len(rt.requestFields) == 0 {
			rt.requestFields = def.RequestFields
		}
		if len(rt.passHeaders) == 0 {
			rt.passHeaders = def.PassHeaders
		}
		rt.usage = def.Usage
	}
	if ap.Usage != nil {
		rt.usage = *ap.Usage
	}
	c.routes[k] = rt
	c.routeKeys = append(c.routeKeys, k)
}

// defaultPlatform is the platform whose defaults (request fields, pass
// headers, usage rules) apply to protocol: the endpoint's own platform when
// it declares the protocol, else the first enabled platform declaring it.
func (c *call) defaultPlatform(protocol string) *manifest.Platform {
	if pl := endpointPlatform(c.plugin); pl != nil && slices.Contains(pl.Protocols, protocol) {
		return pl
	}
	if pbs := c.gen.PlatformsForProtocol(protocol); len(pbs) > 0 {
		pl := pbs[0].Platform
		return &pl
	}
	return nil
}

// endpointPlatform is the platform declared by the endpoint's plugin (nil
// when the plugin declares none).
func endpointPlatform(p core.PluginInfo) *manifest.Platform {
	if p.Manifest == nil {
		return nil
	}
	return p.Manifest.Platform
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
