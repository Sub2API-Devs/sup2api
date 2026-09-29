package check

import (
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// withEndpoint returns validPlatform with its single endpoint mutated.
func withEndpoint(mut func(e *manifest.Endpoint)) manifest.Platform {
	p := validPlatform()
	mut(&p.Endpoints[0])
	return p
}

// The three model sources are mutually exclusive and one is required
// (CONTRACTS §25.2).
func TestModelSourceExclusive(t *testing.T) {
	cases := []struct {
		name  string
		mut   func(e *manifest.Endpoint)
		field string
		code  string
	}{
		{"none", func(e *manifest.Endpoint) { e.Request = manifest.EndpointRequest{} },
			"endpoints[0].request", "required"},
		{"path and param", func(e *manifest.Endpoint) {
			e.Path, e.Request = "/video/v1/:model", manifest.EndpointRequest{ModelPath: "model", ModelParam: "model"}
		}, "endpoints[0].request", "mutually_exclusive"},
		{"path and plugin", func(e *manifest.Endpoint) {
			e.Request = manifest.EndpointRequest{ModelPath: "model", ModelSource: manifest.ModelSourcePlugin}
		}, "endpoints[0].request", "mutually_exclusive"},
		{"param and plugin", func(e *manifest.Endpoint) {
			e.Path = "/video/v1/:model"
			e.Request = manifest.EndpointRequest{ModelParam: "model", ModelSource: manifest.ModelSourcePlugin}
		}, "endpoints[0].request", "mutually_exclusive"},
		{"unknown source", func(e *manifest.Endpoint) {
			e.Request = manifest.EndpointRequest{ModelSource: "body"}
		}, "endpoints[0].request.modelSource", "invalid"},
		// ResolveModel answers the stream flag too, so a streamPath next to it
		// would silently never be read.
		{"plugin source with streamPath", func(e *manifest.Endpoint) {
			e.Request = manifest.EndpointRequest{ModelSource: manifest.ModelSourcePlugin, StreamPath: "stream"}
		}, "endpoints[0].request.streamPath", "mutually_exclusive"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := platformCodes(withEndpoint(tc.mut)); got[tc.field] != tc.code {
				t.Fatalf("want %s=%s, got %v", tc.field, tc.code, got)
			}
		})
	}
	// modelSource "plugin" on its own is fine (the capability rule needs a
	// manifest and is checked by Validate, not CheckPlatform).
	ok := withEndpoint(func(e *manifest.Endpoint) {
		e.Request = manifest.EndpointRequest{ModelSource: manifest.ModelSourcePlugin}
	})
	if got := platformCodes(ok); len(got) > 0 {
		t.Fatalf("plugin model source rejected: %v", got)
	}
}

// pluginPlatformManifest is a manifest declaring one platform whose endpoint
// is ep, with the permissions a platform needs but no capability.
func pluginPlatformManifest(ep manifest.Endpoint) *manifest.Manifest {
	m := minimal()
	m.HostPermissions = []manifest.HostPermission{{ID: "gateway.endpoint"}, {ID: "platform.register"}}
	p := validPlatform()
	p.Endpoints = []manifest.Endpoint{ep}
	m.Platforms = []manifest.Platform{p}
	return m
}

// A plugin whose endpoint asks the host to call PlatformService.ResolveModel
// must declare platform.adapter.v1. Declaring a platform does not require it
// (CONTRACTS §13), so without this rule a perfectly legal package would get a
// nil PlatformBinding.Client and 500 on every request (CONTRACTS §25.1).
func TestPluginModelSourceNeedsPlatformAdapter(t *testing.T) {
	ep := validPlatform().Endpoints[0]
	ep.Request = manifest.EndpointRequest{ModelSource: manifest.ModelSourcePlugin}

	m := pluginPlatformManifest(ep)
	c := codes(Validate(m, nil, ValidateOptions{Tooling: true}))
	if c["platforms[0].endpoints[0].request.modelSource"] != "missing_capability" {
		t.Fatalf("want missing_capability, got %v", c)
	}
	m.Capabilities = []manifest.Capability{{ID: manifest.CapPlatformAdapter}}
	if err := Validate(m, nil, ValidateOptions{Tooling: true}); err != nil {
		t.Fatalf("with the capability: %v", codes(err))
	}
	// An endpoint reading the model out of the request needs nothing.
	m2 := pluginPlatformManifest(validPlatform().Endpoints[0])
	if err := Validate(m2, nil, ValidateOptions{Tooling: true}); err != nil {
		t.Fatalf("modelPath endpoint: %v", codes(err))
	}
}

// request.queryParams is an allow-list of query parameter names, matched
// case-insensitively by the host; the endpoint's auth.query parameter carries
// the API key and may not be listed.
func TestQueryParams(t *testing.T) {
	cases := []struct {
		name  string
		mut   func(e *manifest.Endpoint)
		field string
		code  string
	}{
		{"empty name", func(e *manifest.Endpoint) { e.Request.QueryParams = []string{""} },
			"endpoints[0].request.queryParams[0]", "invalid_format"},
		{"space", func(e *manifest.Endpoint) { e.Request.QueryParams = []string{"a b"} },
			"endpoints[0].request.queryParams[0]", "invalid_format"},
		{"too long", func(e *manifest.Endpoint) { e.Request.QueryParams = []string{strings.Repeat("a", 65)} },
			"endpoints[0].request.queryParams[0]", "invalid_format"},
		{"duplicate ignoring case", func(e *manifest.Endpoint) { e.Request.QueryParams = []string{"alt", "ALT"} },
			"endpoints[0].request.queryParams[1]", "duplicate"},
		{"auth.query", func(e *manifest.Endpoint) {
			e.Auth = manifest.EndpointAuth{Query: "key"}
			e.Request.QueryParams = []string{"alt", "key"}
		}, "endpoints[0].request.queryParams[1]", "credential_param"},
		// The host excludes auth.query with EqualFold, so an allow-list entry
		// differing only in case must be rejected at install time - otherwise
		// an author could believe "?Key=sk-..." reaches the plugin.
		{"auth.query other case", func(e *manifest.Endpoint) {
			e.Auth = manifest.EndpointAuth{Query: "key"}
			e.Request.QueryParams = []string{"Key"}
		}, "endpoints[0].request.queryParams[0]", "credential_param"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := platformCodes(withEndpoint(tc.mut)); got[tc.field] != tc.code {
				t.Fatalf("want %s=%s, got %v", tc.field, tc.code, got)
			}
		})
	}
	ok := withEndpoint(func(e *manifest.Endpoint) {
		e.Auth = manifest.EndpointAuth{Headers: []string{"authorization"}, Query: "key"}
		e.Request.QueryParams = []string{"alt", "page_size", "x-t.r"}
	})
	if got := platformCodes(ok); len(got) > 0 {
		t.Fatalf("valid queryParams rejected: %v", got)
	}
}
