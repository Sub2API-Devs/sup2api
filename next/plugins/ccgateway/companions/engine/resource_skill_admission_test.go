package engine

import (
	"net/http"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func TestSkillVersionCapabilityRequiresExactOwnedParentVersion(t *testing.T) {
	h := http.Header{}
	h.Set(resources.ResourceRefsHeader, `[{"kind":"skill","id":"skill_owned"}]`)
	h.Set(resources.ResourceSkillVersionsHeader, `[{"skill_id":"skill_owned","version":"version_one"}]`)
	grant, err := parseResourceCapabilities(h)
	if err != nil {
		t.Fatal(err)
	}
	r := &Request{resources: grant}
	if err := r.requireSkillVersion("skill_owned", "version_one"); err != nil {
		t.Fatal(err)
	}
	for _, pair := range [][2]string{{"skill_other", "version_one"}, {"skill_owned", "version_two"}, {"skill_owned", "latest"}} {
		if r.requireSkillVersion(pair[0], pair[1]) == nil {
			t.Fatalf("unapproved parent/version accepted: %v", pair)
		}
	}
	for _, bad := range []string{`[{"skill_id":"skill_other","version":"version_one"}]`, `[{"skill_id":"skill_owned","version":"latest"}]`, `[{"skill_id":"skill_owned","version":""}]`, `[{"skill_id":"skill_owned","version":"version_one"},{"skill_id":"skill_owned","version":"version_one"}]`, `[{"skill_id":"skill_owned","version":"version_one","unknown":1}]`} {
		h.Set(resources.ResourceSkillVersionsHeader, bad)
		if _, err := parseResourceCapabilities(h); err == nil {
			t.Fatalf("bad grant accepted: %s", bad)
		}
	}
}

func TestOutboundCustomSkillVersionCannotDrift(t *testing.T) {
	grant := &resourceAdmission{outputs: true, kinds: map[string]map[string]bool{resources.KindSkill: {"skill_owned": true}}, skillVersions: map[resources.AdmissionSkillVersion]bool{{SkillID: "skill_owned", Version: "version_one"}: true}}
	r := &Request{resources: grant}
	for _, version := range []string{"latest", "version_two"} {
		body := []byte(`{"container":{"skills":[{"type":"custom","skill_id":"skill_owned","version":"` + version + `"}]},"messages":[]}`)
		if err := r.validateOutboundResources(body); err == nil {
			t.Fatalf("outbound changed skill version to %q", version)
		}
	}
}
