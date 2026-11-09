package gateway

import (
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usagerules"
)

// typeRoute is how the current request reaches accounts of one account type
// (ARCHITECTURE 6.6, CONTRACTS §13): natively (the type supports the
// endpoint's platform), through a core protocol converter to a protocol of
// a platform the type supports, or - for a count_tokens request - answered
// by the core itself (local).
type typeRoute struct {
	binding core.AccountTypeBinding
	// platform is the platform served upstream: the endpoint's platform
	// when native, else the platform owning the upstream protocol.
	platform string
	// upstream is the protocol sent upstream (the last hop); equals the
	// endpoint protocol when native, upstreamLocal on a local route.
	upstream string
	// conv is nil when native or local. It is the registry's converter
	// until the request is prepared for the route, then the converter bound
	// to the request (convert_policy.go).
	conv convert.Converter
	// grade orders the routes within a priority (CONVERT-MATRIX §5.2): native,
	// the converter's grade, or local.
	grade convert.Grade
	// hops are the protocols a converted route passes through, client first.
	hops []string
	// local answers a count_tokens request without an upstream (§8).
	local bool

	requestFields []string
	passHeaders   []string
	usage         manifest.UsageRules
	// pluginUsage, usageEvents and usageMaxBytes are the upstream endpoint's
	// usageSource / usageStreamEvents / usageMaxBytes (CONTRACTS §25.3).
	//
	// They come off the endpoint and NOT off `usage` above, which is the
	// result of the §13 override chain: its last link,
	// AccountPlatform.usage[protocol], belongs to the account type's plugin -
	// a third party that has no business redirecting a call that goes to the
	// platform's plugin, and that (because an override replaces the whole
	// block) used to be able to switch the source off just by not mentioning
	// it. On the endpoint there is one reading and one writer.
	pluginUsage   bool
	usageEvents   []string
	usageMaxBytes int64
	// usageRequestFields are the request body paths ExtractUsage is shown
	// (endpoint.usageRequestFields); nil for every endpoint that declares
	// none, which is how those pay nothing for the feature.
	usageRequestFields []string
	// resp is the response shape the upstream endpoint promises
	// (endpoint.response); respDeclared is false when no endpoint of the
	// upstream platform speaks the protocol, in which case there is nothing
	// to compare the actual response against. Note this is the *upstream*
	// endpoint on a converting route, not the client endpoint: the shape
	// being checked is the one the upstream answers with.
	resp         manifest.EndpointResp
	respDeclared bool
	// modelPath is the body path of the model in the upstream protocol
	// (empty when the model travels in the path).
	modelPath string
	// streamOnly is set when the account type declares the upstream protocol
	// in AccountPlatform.streamOnly (CONTRACTS §83): a non-streaming request
	// is sent upstream with streamPath set to true and its SSE answer is
	// collected into the non-streaming response. streamPath is the upstream
	// endpoint's request.streamPath.
	streamOnly       bool
	streamPath       string
	modelReferences  []manifest.RequestModelReference
	requiredUsage    []manifest.AdditionalUsageRule
	requiredAttempts []*manifest.AttemptUsageRule

	// prepared is the request converted for this route, at pick time and
	// only when an account of the type is considered (convert_policy.go).
	prepared preparedConversion
	// body is the converted request; kept here so releaseBodies frees it.
	body []byte
}

// upstreamLocal is the upstream protocol recorded for a local route.
const upstreamLocal = "local"

// planRoutes lists the account types able to serve the endpoint: those
// supporting the endpoint's platform P (native), then those reaching it
// through a core converter to a protocol of another platform they support.
// A type supporting P is converted only when its endpoint subset on P
// leaves the endpoint out, and then only to another endpoint of P in the
// subset (CONTRACTS §83.3). A count_tokens request is never converted: the
// types without a native route estimate it locally when they serve the
// generation protocol of its family (CONVERT-MATRIX §8).
func (c *call) planRoutes() {
	defer func() {
		if !c.ep.WebSocket() {
			return
		}
		// A WebSocket session is relayed as is: only account types whose
		// plugin builds upstream WebSocket requests, and never converted.
		c.keepRoutes(func(rt *typeRoute) bool {
			return rt.grade == convert.GradeNative && hasCapability(rt.binding.Plugin.Manifest, manifest.CapPlatformWebSocket)
		})
	}()
	defer func() {
		if !c.ep.TaskSubmit() {
			return
		}
		c.keepRoutes(func(rt *typeRoute) bool {
			return rt.binding.Plugin.Key == c.plugin.Key && rt.upstream == c.ep.Protocol && rt.grade == convert.GradeNative
		})
	}()
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
		ap, native := b.Supports(p)
		native = native && p != ""
		if native {
			// Native but not listed by AccountTypesForPlatform; still native.
			c.addRoute(b, ap, p, x, c.ep, c.pf, nil)
		}
		_, added := c.routes[b.Key()]
		switch {
		case added:
		case c.tokenCounting():
			// Token counting endpoints are never converted.
			c.addLocalCountRoute(b)
		default:
			// Natively: the endpoint is outside the type's endpoint subset on
			// P (CONTRACTS §83.3), so only another endpoint of P in the subset
			// may serve it; the type's other platforms are not tried.
			c.addConvertedRoute(b, x, native)
		}
	}
}

// keepRoutes drops the routes keep refuses.
func (c *call) keepRoutes(keep func(*typeRoute) bool) {
	keys := c.routeKeys[:0]
	for _, key := range c.routeKeys {
		if !keep(c.routes[key]) {
			delete(c.routes, key)
			continue
		}
		keys = append(keys, key)
	}
	c.routeKeys = keys
}

// addConvertedRoute adds the route of b to the endpoint of its platforms
// the endpoint protocol x converts to best (core.BestConvertTarget), among
// the type's other platforms or, with samePlatform, among the endpoints of
// the endpoint's own platform in the type's subset. The target must answer
// in the request's stream mode: an SSE endpoint for a stream; for a
// non-stream request an endpoint answering JSON without being always
// streaming, or one the type declares streamOnly (CONTRACTS §83.1).
func (c *call) addConvertedRoute(b core.AccountTypeBinding, x string, samePlatform bool) {
	t, ok := core.BestConvertTarget(c.gen, b, c.g.conv, x, func(ap manifest.AccountPlatform, ep manifest.Endpoint) bool {
		if (ap.Platform == c.platform) != samePlatform {
			return false
		}
		if c.stream {
			return ep.Response.Stream == "sse"
		}
		return !ep.Request.Stream && ep.Response.NonStream == "json" || ap.StreamsOnly(ep.Protocol)
	})
	if !ok {
		return
	}
	conv, _ := c.g.conv.Resolve(x, t.Endpoint.Protocol)
	c.addRoute(b, t.Platform, t.Platform.Platform, t.Endpoint.Protocol, t.Endpoint, t.Definition, conv)
}

// addLocalCountRoute adds the local route of b for a count_tokens request
// when the type serves the generation protocol of the request's family.
func (c *call) addLocalCountRoute(b core.AccountTypeBinding) {
	family := core.CountTokensFamily(c.ep.Protocol)
	if family == "" || !core.ServesProtocol(c.gen, b, c.g.conv, family) {
		return
	}
	k := b.Key()
	c.routes[k] = &typeRoute{binding: b, platform: c.platform, upstream: upstreamLocal, grade: convert.GradeLocal,
		hops: []string{c.ep.Protocol}, local: true}
	c.routeKeys = append(c.routeKeys, k)
}

// addRoute records the route of b to upstream protocol y of platform q:
// request fields and pass headers come from the account type's entry for q,
// else the platform; usage rules from the account type (per protocol), else
// the endpoint speaking y, else the platform.
func (c *call) addRoute(b core.AccountTypeBinding, ap manifest.AccountPlatform, q, y string,
	ep manifest.Endpoint, pf manifest.Platform, conv convert.Converter) {
	if !ap.SupportsEndpoint(ep.ID) {
		return
	}
	k := b.Key()
	if _, dup := c.routes[k]; dup {
		return
	}
	rt := &typeRoute{binding: b, platform: q, upstream: y, conv: conv, grade: convert.GradeNative,
		requestFields: ap.RequestFields, passHeaders: ap.ClientHeaders(&pf),
		usage:              usagerules.For(ap, &ep, &pf, y),
		pluginUsage:        ep.PluginUsage(),
		usageEvents:        ep.UsageStreamEvents,
		usageMaxBytes:      ep.UsageMaxBytes,
		usageRequestFields: ep.UsageRequestFields,
		resp:               ep.Response,
		respDeclared:       ep.Protocol != "",
		modelPath:          ep.Request.ModelPath,
		streamPath:         ep.Request.StreamPath,
		modelReferences:    ep.Request.ModelReferences,
		requiredUsage:      append([]manifest.AdditionalUsageRule(nil), pf.Usage.Additional...)}
	rt.streamOnly = ap.StreamsOnly(y) && ep.Kind == manifest.EndpointKindProxy && ep.Response.Stream == "sse" && ep.Request.StreamPath != ""
	if ep.Usage != nil {
		rt.requiredUsage = append(rt.requiredUsage, ep.Usage.Additional...)
		rt.requiredAttempts = append(rt.requiredAttempts, ep.Usage.Attempts)
	}
	rt.requiredAttempts = append(rt.requiredAttempts, pf.Usage.Attempts)
	if len(rt.requestFields) == 0 {
		rt.requestFields = pf.RequestFields
	}
	if conv != nil {
		rt.grade, rt.hops = conv.Grade(), convert.Hops(conv)
	}
	c.routes[k] = rt
	c.routeKeys = append(c.routeKeys, k)
}

// route returns the route of an account, nil when its type cannot serve
// this request.
func (c *call) route(ref *core.AccountRef) *typeRoute {
	return c.routes[core.AccountTypeKey{PluginKey: ref.PluginKey, Type: ref.Type}]
}

func hasCapability(m *manifest.Manifest, id string) bool {
	if m == nil {
		return false
	}
	for _, c := range m.Capabilities {
		if c.ID == id {
			return true
		}
	}
	return false
}
