package gateway

import "testing"

func TestReviewCachedResourceCapabilitiesInvalidateWithBody(t *testing.T) {
	var cache resourceScanCache
	first := []byte(`{"container":{"skills":[{"type":"custom","skill_id":"skill","version":"one"}]},"messages":[]}`)
	second := []byte(`{"container":{"skills":[{"type":"custom","skill_id":"skill","version":"two"}]},"messages":[]}`)
	a, e := cache.inspect(first)
	if e != nil || a.SkillVersions[0].Selector != "one" {
		t.Fatal(a, e)
	}
	b, e := cache.inspect(second)
	if e != nil || b.SkillVersions[0].Selector != "two" {
		t.Fatal(b, e)
	}
	a, e = cache.inspect(first)
	if e != nil || a.SkillVersions[0].Selector != "one" {
		t.Fatal("new version overwrote prior request snapshot", a, e)
	}
	reset, e := cache.inspect([]byte(`{"container":null,"messages":[]}`))
	if e != nil || reset.Outputs || len(reset.SkillVersions) != 0 {
		t.Fatal("cached resource capability survived reset", reset, e)
	}
	if _, e := cache.inspect([]byte(`{"container":{"skills":[{"type":"custom","skill_id":"a","skill_\u0069d":"b"}]}}`)); e == nil {
		t.Fatal("duplicate escaped identity passed scanner cache")
	}
}
