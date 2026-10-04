package check

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func webSocketPlatform() manifest.Platform {
	p := validPlatform()
	p.Endpoints = []manifest.Endpoint{{
		ID: "live", Method: "GET", Path: "/video/v1/live", Protocol: "video.live", Kind: manifest.EndpointKindWebSocket,
		Auth:        manifest.EndpointAuth{Headers: []string{"authorization"}},
		Request:     manifest.EndpointRequest{ModelPath: "model"},
		Response:    manifest.EndpointResp{Stream: manifest.ResponseWebSocket},
		ErrorFormat: "plain", Billing: "usage", BillingTypes: []string{"per_request", "per_token", "expression"},
	}}
	return p
}

func TestWebSocketEndpointRules(t *testing.T) {
	if got := platformCodes(webSocketPlatform()); len(got) > 0 {
		t.Fatalf("valid websocket endpoint rejected: %v", got)
	}
	const f = "endpoints[0]"
	for name, tc := range map[string]struct {
		mutate func(*manifest.Endpoint)
		field  string
	}{
		"POST":           {func(e *manifest.Endpoint) { e.Method = "POST" }, f + ".method"},
		"no ws response": {func(e *manifest.Endpoint) { e.Response.Stream = "sse" }, f + ".response.stream"},
		"json response":  {func(e *manifest.Endpoint) { e.Response.NonStream = "json" }, f + ".response.nonStream"},
		"stream path":    {func(e *manifest.Endpoint) { e.Request.StreamPath = "stream" }, f + ".request"},
		"model param": {func(e *manifest.Endpoint) {
			e.Request.ModelPath, e.Request.ModelSource = "", manifest.ModelSourcePlugin
		}, f + ".request"},
		"plugin usage": {func(e *manifest.Endpoint) { e.UsageSource = manifest.UsageSourcePlugin }, f + ".usageSource"},
		"task": {func(e *manifest.Endpoint) {
			e.Task = &manifest.AsyncTaskEndpoint{Action: manifest.TaskActionSubmit, Kind: "live", IDPaths: []string{"id"}}
		}, f + ".task"},
		"unknown kind": {func(e *manifest.Endpoint) { e.Kind = "stream" }, f + ".kind"},
		"ws stream on proxy": {func(e *manifest.Endpoint) {
			e.Kind = manifest.EndpointKindProxy
			e.Method = "POST"
			e.Response.NonStream = "json"
		}, f + ".response.stream"},
	} {
		p := webSocketPlatform()
		tc.mutate(&p.Endpoints[0])
		if got := platformCodes(p); got[tc.field] == "" {
			t.Errorf("%s: no error at %s: %v", name, tc.field, got)
		}
	}
	// Turns are metered by the sse rules; without one every turn is free.
	p := webSocketPlatform()
	p.Usage.SSE = nil
	if got := platformCodes(p); got["endpoints[0].usage.sse"] != "required" {
		t.Fatalf("websocket endpoint without sse rules: %v", got)
	}
}

func TestWebSocketCapabilityNeedsAdapter(t *testing.T) {
	m := minimal()
	m.Capabilities = []manifest.Capability{{ID: manifest.CapPlatformWebSocket}}
	if got := codes(Validate(m, nil, ValidateOptions{Tooling: true})); got["capabilities[0]"] == "" {
		t.Fatalf("platform.websocket.v1 without platform.adapter.v1 accepted: %v", got)
	}
	m.Capabilities = append(m.Capabilities, manifest.Capability{ID: manifest.CapPlatformAdapter})
	if got := codes(Validate(m, nil, ValidateOptions{Tooling: true})); got["capabilities[0]"] != "" || got["capabilities[1]"] != "" {
		t.Fatalf("platform.websocket.v1 with the adapter rejected: %v", got)
	}
}
