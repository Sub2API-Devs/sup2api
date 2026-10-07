package ccgateway

import (
	"encoding/json"
	"testing"
)

func TestAttachmentOverridesRoundTrip(t *testing.T) {
	p := defaultRequestPolicy()
	p.AttachmentSources = map[string]string{"environment": "both", "date": "gateway"}
	p.UnknownClientAttachment = "ignore"
	data, err := json.Marshal(Config{RequestPolicy: &p})
	if err != nil {
		t.Fatal(err)
	}
	var cfg Config
	if err = json.Unmarshal(data, &cfg); err != nil {
		t.Fatal(err)
	}
	got := cfg.EffectiveRequestPolicy()
	if got.AttachmentSources["date"] != "gateway" || got.UnknownClientAttachment != "ignore" || got.UnknownGatewayAttachment != "pass" {
		t.Fatal("attachment policy lost")
	}
	if err = validateRequestPolicy(got); err != nil {
		t.Fatal(err)
	}
	got.AttachmentSources["hook_additional_context"] = "gateway"
	if validateRequestPolicy(got) == nil {
		t.Fatal("protected type override accepted")
	}
}
