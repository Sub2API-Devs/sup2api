package check

import (
	"strconv"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func stickyRule() manifest.StickyRule {
	return manifest.StickyRule{Name: "session", KeySources: []manifest.StickyKeySource{{Type: "body", Path: "metadata.user_id"}}}
}

// Plugins take no part in sticky sessions: a manifest declaring sticky rules,
// the removed affinity capability or its host permission is refused with its
// own code.
func TestPluginsDeclareNoStickyRules(t *testing.T) {
	m := pluginPlatformManifest(validPlatform().Endpoints[0])
	m.Platforms[0].StickyRules = []manifest.StickyRule{stickyRule()}
	if got := codes(Validate(m, nil, ValidateOptions{Tooling: true})); got["platforms[0].stickyRules"] != "sticky_not_for_plugins" {
		t.Fatalf("sticky rules in a plugin: %v", got)
	}

	m = minimal()
	m.Capabilities = append(m.Capabilities, manifest.Capability{ID: "scheduler.affinity.v1"})
	m.HostPermissions = append(m.HostPermissions, manifest.HostPermission{ID: "scheduler.affinity", Reason: manifest.LocalizedText{"en": "x"}})
	got := codes(Validate(m, nil, ValidateOptions{Tooling: true}))
	capField := "capabilities[" + strconv.Itoa(len(m.Capabilities)-1) + "]"
	permField := "hostPermissions[" + strconv.Itoa(len(m.HostPermissions)-1) + "].id"
	if got[capField] != "sticky_not_for_plugins" || got[permField] != "sticky_not_for_plugins" {
		t.Fatalf("affinity capability/permission: %v", got)
	}
}

// The core's built-in rules read the session value from the request only.
func TestBuiltinStickyKeySources(t *testing.T) {
	for _, typ := range []string{"body", "header", "api_key", "user"} {
		p := validPlatform()
		r := stickyRule()
		r.KeySources = []manifest.StickyKeySource{{Type: typ, Path: "a", Name: "a"}}
		p.StickyRules = []manifest.StickyRule{r}
		if errs := CheckPlatform(p); len(errs) != 0 {
			t.Fatalf("%s: %v", typ, errs)
		}
	}
	p := validPlatform()
	r := stickyRule()
	r.KeySources = []manifest.StickyKeySource{{Type: "plugin"}}
	p.StickyRules = []manifest.StickyRule{r}
	errs := CheckPlatform(p)
	if len(errs) != 1 || errs[0].Field != "stickyRules[0].keySources[0].type" || errs[0].Code != "invalid" {
		t.Fatalf("plugin key source: %v", errs)
	}
}
