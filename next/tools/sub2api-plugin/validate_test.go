package main

import (
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/platforms"
)

// minimalManifest is the smallest manifest the host accepts: identity, a grpc
// entry and a host range. Tests add what they need on top.
func minimalManifest() *manifest.Manifest {
	return &manifest.Manifest{
		APIVersion: manifest.APIVersion,
		Key:        "demo",
		Name:       manifest.LocalizedText{"en": "Demo"},
		Version:    "0.1.0",
		Publisher:  "tester",
		Runtime:    "grpc",
		Entry:      manifest.Entry{GRPC: &manifest.GRPCEntry{Binaries: "runtimes/{os}-{arch}/plugin"}},
		HostCompat: ">=0.1.0 <0.2.0",
	}
}

func TestValidateMinimalManifest(t *testing.T) {
	if msgs := validateManifest(minimalManifest(), nil); len(msgs) != 0 {
		t.Fatalf("minimal manifest: %v", msgs)
	}
}

// The CLI now runs the host's own checks, so it catches a platform whose
// endpoint shadows a built-in one - which the CLI's former copy of the rules
// could not see (it had no access to the built-in definitions).
func TestValidateBuiltinEndpointConflict(t *testing.T) {
	builtin := platforms.Builtin()[0]
	m := minimalManifest()
	m.HostPermissions = []manifest.HostPermission{{ID: "gateway.endpoint"}, {ID: "platform.register"}}
	m.Platforms = []manifest.Platform{{ID: "mine", Usage: manifest.UsageRules{Semantics: "inclusive"},
		Endpoints: []manifest.Endpoint{{
			ID: "clash", Method: builtin.Endpoints[0].Method, Path: builtin.Endpoints[0].Path,
			Protocol: "mine.call", Kind: "proxy",
			Auth:        manifest.EndpointAuth{Headers: []string{"authorization"}},
			Request:     manifest.EndpointRequest{ModelPath: "model"},
			Response:    manifest.EndpointResp{NonStream: "json"},
			ErrorFormat: "plain", Billing: "usage", BillingTypes: []string{"per_request", "per_token", "expression"},
		}}}}
	msgs := validateManifest(m, nil)
	if len(msgs) != 1 || !strings.Contains(msgs[0], "conflicts with built-in platform") {
		t.Fatalf("built-in endpoint conflict: %v", msgs)
	}
	// A path of its own is fine.
	m.Platforms[0].Endpoints[0].Path = "/mine/v1/call"
	if msgs := validateManifest(m, nil); len(msgs) != 0 {
		t.Fatalf("distinct path: %v", msgs)
	}
	// Reserved core route segments are rejected, unrelated ones are not
	// (the first segment must match a core route as a whole).
	m.Platforms[0].Endpoints[0].Path = "/api/v1/call"
	if msgs := validateManifest(m, nil); len(msgs) != 1 || !strings.Contains(msgs[0], "must not start with /api") {
		t.Fatalf("reserved segment: %v", msgs)
	}
	m.Platforms[0].Endpoints[0].Path = "/healthcheck/v1/call"
	if msgs := validateManifest(m, nil); len(msgs) != 0 {
		t.Fatalf("/healthcheck is not a core route: %v", msgs)
	}
}

func TestValidateBroadcast(t *testing.T) {
	m := minimalManifest()
	m.Capabilities = []manifest.Capability{{ID: manifest.CapAppBroadcast}}
	if msgs := validateManifest(m, nil); len(msgs) != 1 || !strings.Contains(msgs[0], "broadcast") {
		t.Fatalf("missing broadcast permission: %v", msgs)
	}
	m.HostPermissions = []manifest.HostPermission{{ID: "broadcast"}}
	if msgs := validateManifest(m, nil); len(msgs) != 0 {
		t.Fatalf("valid broadcast manifest: %v", msgs)
	}
}

// Tooling mode skips only what the CLI cannot know before the build: the host
// version and the files the build produces.
func TestValidateToolingSkipsBuildArtifacts(t *testing.T) {
	m := minimalManifest()
	m.HostCompat = ">=9.0.0" // no host to compare against
	if msgs := validateManifest(m, nil); len(msgs) != 0 {
		t.Fatalf("hostCompat must not be matched: %v", msgs)
	}
	m.HostCompat = "not a range"
	if msgs := validateManifest(m, nil); len(msgs) != 1 || !strings.Contains(msgs[0], "hostCompat") {
		t.Fatalf("hostCompat must still parse: %v", msgs)
	}
}
