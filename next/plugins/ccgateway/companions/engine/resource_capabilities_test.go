package engine

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func TestResourceCapabilityKindsAndLimits(t *testing.T) {
	h := http.Header{}
	h.Set(resources.ResourceRefsHeader, `[{"kind":"file","id":"same"},{"kind":"container","id":"same"},{"kind":"skill","id":"skill_fixture"}]`)
	h.Set(resources.ResourceOutputsHeader, "1")
	grant, err := parseResourceCapabilities(h)
	if err != nil {
		t.Fatal(err)
	}
	for _, ref := range []resources.AdmissionReference{{Kind: resources.KindFile, ID: "same"}, {Kind: resources.KindContainer, ID: "same"}, {Kind: resources.KindSkill, ID: "skill_fixture"}} {
		if grant.require(ref.Kind, ref.ID) != nil {
			t.Fatal("valid resource kind missing", ref.Kind)
		}
	}
	if grant.require(resources.KindContainer, "skill_fixture") == nil || grant.require(resources.KindFile, "skill_fixture") == nil {
		t.Fatal("resource authorization crossed kind boundary")
	}
	if !(&Request{resources: grant}).resourceOutputsAllowed() || (&Request{}).resourceOutputsAllowed() {
		t.Fatal("output capability incorrect")
	}
	for _, raw := range []string{`[{"kind":"unknown","id":"x"}]`, `[{"kind":"file","id":"x"},{"kind":"file","id":"x"}]`, `[{"kind":"file","id":"x","extra":true}]`, `[{"kind":"file","id":"bad\nvalue"}]`, `{}`, `[] {}`} {
		h.Set(resources.ResourceRefsHeader, raw)
		if _, err := parseResourceCapabilities(h); err == nil {
			t.Fatal("invalid capability accepted", raw)
		}
	}
	var tooMany []resources.AdmissionReference
	for i := 0; i <= resourceAdmissionLimit; i++ {
		tooMany = append(tooMany, resources.AdmissionReference{Kind: resources.KindFile, ID: string(rune('a' + i))})
	}
	raw, _ := json.Marshal(tooMany)
	h.Set(resources.ResourceRefsHeader, string(raw))
	if _, err := parseResourceCapabilities(h); err == nil {
		t.Fatal("too many resources accepted")
	}
	h.Del(resources.ResourceRefsHeader)
	h.Set(resources.ResourceIDsHeader, `["legacy_file"]`)
	grant, err = parseResourceCapabilities(h)
	if err != nil || grant.require(resources.KindFile, "legacy_file") != nil {
		t.Fatal("legacy file capability failed", err)
	}
	h.Set(resources.ResourceOutputsHeader, "true")
	if _, err := parseResourceCapabilities(h); err == nil {
		t.Fatal("noncanonical output capability accepted")
	}
}

func TestResourceIdentityResponseNeverUsesRequestHeaders(t *testing.T) {
	actual := resources.Identity{PrincipalID: "verified-principal", Generation: "verified-generation"}
	h := http.Header{resources.PrincipalHeader: []string{"untrusted"}, resources.GenerationHeader: []string{"untrusted"}}
	(&resourceAdmission{identity: actual}).applyResponseHeaders(h)
	if h.Get(resources.PrincipalHeader) != actual.PrincipalID || h.Get(resources.GenerationHeader) != actual.Generation {
		t.Fatal("actual identity not reflected")
	}
}

func TestResourceProgrammaticContextIsExplicitAndKindBound(t *testing.T) {
	h := http.Header{}
	h.Set(resources.ResourceRefsHeader, `[{"kind":"container","id":"container_fixture"}]`)
	h.Set(resources.ResourceContextsHeader, `[{"kind":"ptc","parent_id":"srvtool_parent","resource_id":"container_fixture"}]`)
	grant, err := parseResourceCapabilities(h)
	if err != nil {
		t.Fatal(err)
	}
	r := &Request{resources: grant}
	if r.checkResourceContext("srvtool_parent", "container_fixture") != nil {
		t.Fatal("verified programmatic context rejected")
	}
	if r.checkResourceContext("srvtool_other", "container_fixture") == nil || r.checkResourceContext("srvtool_parent", "container_other") == nil {
		t.Fatal("unverified parent/container binding accepted")
	}
	for _, raw := range []string{`[{"kind":"other","parent_id":"srvtool_parent","resource_id":"container_fixture"}]`, `[{"kind":"ptc","parent_id":"srvtool_parent","resource_id":"container_other"}]`, `[{"kind":"ptc","parent_id":"srvtool_parent","resource_id":"container_fixture"},{"kind":"ptc","parent_id":"srvtool_parent","resource_id":"container_fixture"}]`, `null`} {
		h.Set(resources.ResourceContextsHeader, raw)
		if _, err := parseResourceCapabilities(h); err == nil {
			t.Fatal("invalid programmatic context accepted", raw)
		}
	}
	h.Set(resources.ResourceContextsHeader, `[{"kind":"ptc","parent_id":"srvtool_parent","resource_id":"container_fixture"}]`)
	h.Set(resources.ResourceRefsHeader, `[{"kind":"file","id":"container_fixture"}]`)
	if _, err := parseResourceCapabilities(h); err == nil {
		t.Fatal("file grant implied a container binding")
	}
	h.Del(resources.ResourceContextsHeader)
	h.Set(resources.ResourceIDsHeader, `["container_fixture"]`)
	if _, err := parseResourceCapabilities(h); err == nil {
		t.Fatal("mixed typed and legacy capabilities accepted")
	}
}
