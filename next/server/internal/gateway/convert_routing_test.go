package gateway

import (
	"context"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
)

// gradedConv is a fakeConv of another grade.
type gradedConv struct {
	*fakeConv
	grade convert.Grade
}

func (g gradedConv) Grade() convert.Grade { return g.grade }

func conv(from, to string, grade convert.Grade) convert.Converter {
	return gradedConv{&fakeConv{from: from, to: to}, grade}
}

// routingCall plans the routes of an anthropic.messages (or protocol)
// request over platform "x" (x.fair, x.good: stream or JSON; x.json: JSON
// only; x.sse: stream only, with a stream path; x.always: request.stream)
// and the given account types and converters.
func routingCall(t *testing.T, stream bool, protocol string, types []core.AccountTypeBinding, convs ...convert.Converter) *call {
	t.Helper()
	gen := newFakeGen()
	gen.addPlatform(core.PluginInfo{Key: "xplug"}, manifest.Platform{ID: "x", Endpoints: []manifest.Endpoint{
		{ID: "fair", Method: "POST", Path: "/x/fair", Protocol: "x.fair", Response: sseOrJSON},
		{ID: "good", Method: "POST", Path: "/x/good", Protocol: "x.good", Response: sseOrJSON},
		{ID: "json", Method: "POST", Path: "/x/json", Protocol: "x.json", Response: manifest.EndpointResp{NonStream: "json"}},
		{ID: "sse", Method: "POST", Path: "/x/sse", Protocol: "x.sse", Kind: "proxy", Response: manifest.EndpointResp{Stream: "sse"},
			Request: manifest.EndpointRequest{StreamPath: "stream"}},
		{ID: "always", Method: "POST", Path: "/x/always", Protocol: "x.always", Response: sseOrJSON,
			Request: manifest.EndpointRequest{Stream: true}},
	}})
	gen.accountTypes = types
	anth := builtinPlatform(t, "anthropic")
	c := &call{g: &Gateway{conv: convert.NewRegistry(convs...)}, gen: gen, ep: endpointOf(t, anth, protocol),
		platform: "anthropic", pf: anth, stream: stream}
	c.planRoutes()
	return c
}

func xType(id string, endpoints []string, streamOnly ...string) core.AccountTypeBinding {
	return core.AccountTypeBinding{Plugin: core.PluginInfo{Key: "t"}, Client: &fakePlatform{},
		Type: manifest.AccountType{ID: id, Platforms: []manifest.AccountPlatform{{Platform: "x", Endpoints: endpoints, StreamOnly: streamOnly}}}}
}

func routeOf(c *call, id string) *typeRoute {
	return c.routes[core.AccountTypeKey{PluginKey: "t", Type: id}]
}

// The converted route goes to the endpoint the request converts to best:
// lowest grade, then fewest hops, then declaration order (§5.1).
func TestConvertedRouteByGradeHopsAndOrder(t *testing.T) {
	const x = "anthropic.messages"
	c := routingCall(t, false, x, []core.AccountTypeBinding{xType("all", nil)},
		conv(x, "x.fair", convert.GradeFair), conv(x, "x.good", convert.GradeGood))
	if rt := routeOf(c, "all"); rt == nil || rt.upstream != "x.good" || rt.grade != convert.GradeGood ||
		!slices.Equal(rt.hops, []string{x, "x.good"}) {
		t.Fatalf("best grade: %+v", rt)
	}

	// Equal grades: the first declared endpoint (today's first match).
	c = routingCall(t, false, x, []core.AccountTypeBinding{xType("all", nil)},
		conv(x, "x.good", convert.GradeFair), conv(x, "x.fair", convert.GradeFair))
	if rt := routeOf(c, "all"); rt == nil || rt.upstream != "x.fair" {
		t.Fatalf("declaration order: %+v", rt)
	}

	// A one-hop conversion beats a composition through openai.responses.
	c = routingCall(t, false, x, []core.AccountTypeBinding{xType("all", nil)},
		conv(x, "openai.responses", convert.GradeFair), conv("openai.responses", "x.fair", convert.GradeGood),
		conv(x, "x.good", convert.GradeFair))
	if rt := routeOf(c, "all"); rt == nil || rt.upstream != "x.good" || len(rt.hops) != 2 {
		t.Fatalf("one hop over two: %+v", rt)
	}
	c = routingCall(t, false, x, []core.AccountTypeBinding{xType("faironly", []string{"fair"})},
		conv(x, "openai.responses", convert.GradeFair), conv("openai.responses", "x.fair", convert.GradeGood))
	if rt := routeOf(c, "faironly"); rt == nil || rt.grade != convert.GradeDiscouraged ||
		!slices.Equal(rt.hops, []string{x, "openai.responses", "x.fair"}) {
		t.Fatalf("composition: %+v", rt)
	}
}

// A converted request goes to an endpoint answering in its stream mode.
func TestConvertedRouteStreamMode(t *testing.T) {
	const x = "anthropic.messages"
	convs := []convert.Converter{conv(x, "x.json", convert.GradeFair), conv(x, "x.sse", convert.GradeFair), conv(x, "x.always", convert.GradeFair)}
	types := []core.AccountTypeBinding{xType("all", []string{"json", "sse", "always"}), xType("sseonly", []string{"sse"}),
		xType("declared", []string{"sse"}, "x.sse"), xType("always", []string{"always"})}
	c := routingCall(t, true, x, types, convs...)
	if rt := routeOf(c, "all"); rt == nil || rt.upstream != "x.sse" {
		t.Fatalf("stream: %+v", rt)
	}
	if rt := routeOf(c, "always"); rt == nil || rt.upstream != "x.always" {
		t.Fatalf("stream to an always-streaming endpoint: %+v", rt)
	}
	c = routingCall(t, false, x, types, convs...)
	if rt := routeOf(c, "all"); rt == nil || rt.upstream != "x.json" {
		t.Fatalf("non-stream: %+v", rt)
	}
	if routeOf(c, "sseonly") != nil || routeOf(c, "always") != nil {
		t.Fatal("non-stream request routed to a stream-only endpoint")
	}
	if rt := routeOf(c, "declared"); rt == nil || rt.upstream != "x.sse" || !rt.streamOnly {
		t.Fatalf("streamOnly upstream: %+v", rt)
	}
}

// A count_tokens request no route serves is estimated locally for the
// types serving its family's generation protocol (§8); token counting
// endpoints are never conversion targets.
func TestLocalCountRoute(t *testing.T) {
	saved := localCount
	t.Cleanup(func() { localCount = saved })
	const count = "anthropic.count_tokens"
	types := []core.AccountTypeBinding{xType("gen", []string{"fair"}), xType("none", []string{"json"})}
	convs := []convert.Converter{conv("anthropic.messages", "x.fair", convert.GradeFair), conv(count, "x.json", convert.GradeFair)}

	localCount = nil
	if c := routingCall(t, false, count, types, convs...); len(c.routes) != 0 {
		t.Fatalf("local routes without an estimator: %v", c.routeKeys)
	}
	localCount = func(*call, context.Context, *typeRoute) attemptResult { return attemptResult{} }
	c := routingCall(t, false, count, types, convs...)
	if rt := routeOf(c, "gen"); rt == nil || !rt.local || rt.conv != nil || rt.grade != convert.GradeLocal ||
		rt.upstream != upstreamLocal || !slices.Equal(rt.hops, []string{count}) {
		t.Fatalf("local route %+v", rt)
	}
	if routeOf(c, "none") != nil {
		t.Fatal("token counting converted, or estimated for a type not serving messages")
	}
}

// Within a priority native accounts come first, then converted by grade,
// whatever the weights; a higher priority wins over the grade (§5.2, D2).
func TestPickOrdersPriorityThenGrade(t *testing.T) {
	c := &call{g: &Gateway{randFloat: func() float64 { return 0 }}, routes: map[core.AccountTypeKey]*typeRoute{
		{PluginKey: "n", Type: "t"}: {grade: convert.GradeNative},
		{PluginKey: "g", Type: "t"}: {grade: convert.GradeGood},
		{PluginKey: "f", Type: "t"}: {grade: convert.GradeFair},
	}}
	acc := func(id int64, plugin string, prio, weight int) core.AccountRef {
		return core.AccountRef{ID: id, PluginKey: plugin, Type: "t", Priority: prio, Weight: weight}
	}
	pool := []core.AccountRef{acc(1, "f", 5, 1000), acc(2, "g", 5, 1000), acc(3, "n", 5, 1), acc(4, "f", 9, 1), acc(5, "n", 1, 1000)}
	c.orderPool(pool)
	var ids []int64
	for _, r := range pool {
		ids = append(ids, r.ID)
	}
	if !slices.Equal(ids, []int64{4, 3, 2, 1, 5}) {
		t.Fatalf("order %v", ids)
	}
}
