package features

import "testing"

func TestContentPolicyContracts(t *testing.T) {
	for _, field := range BuildAttachmentFields {
		for _, source := range []string{"client", "worker", "erase"} {
			if err := (BuildAttachmentSources{field: source}).Validate(); err != nil {
				t.Fatal(err)
			}
		}
	}
	for _, value := range []BuildAttachmentSources{{"unknown": "client"}, {"shell": ""}, {"platform_name": "follow"}} {
		if value.Validate() == nil {
			t.Fatalf("accepted invalid policy: %#v", value)
		}
	}
	if (BuildAttachmentSources{"platform_name": "worker"}).RequiresV2() || !(BuildAttachmentSources{"platform_name": "erase"}).RequiresV2() {
		t.Fatal("v1/v2 boundary")
	}
	for _, value := range []BuildBillingSources{{"cc_version": "erase"}, {"cc_entrypoint": "follow"}, {"shell": "worker"}} {
		if value.Validate() == nil {
			t.Fatalf("accepted invalid billing policy: %#v", value)
		}
	}
	if err := (BuildBillingSources{"cc_version": "worker", "cc_entrypoint": "client"}).Validate(); err != nil {
		t.Fatal(err)
	}
}
