package ccgateway

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
)

func TestPassUpstreamErrorsDefaultAndJSON(t *testing.T) {
	if defaultRequestPolicy().PassUpstreamErrors {
		t.Fatal("pass_upstream_errors must default to false")
	}
	if (Config{Mode: "local"}).EffectiveRequestPolicy().PassUpstreamErrors {
		t.Fatal("missing policy must not pass upstream errors")
	}
	// The field is always serialized (no omitempty) so the application sees
	// an explicit false in X-CCGateway-Request-Policy.
	raw, err := json.Marshal(defaultRequestPolicy())
	if err != nil || !strings.Contains(string(raw), `"pass_upstream_errors":false`) {
		t.Fatalf("default policy JSON lacks pass_upstream_errors=false: %s %v", raw, err)
	}
	p := defaultRequestPolicy()
	p.PassUpstreamErrors = true
	raw, _ = json.Marshal(p)
	if !strings.Contains(string(raw), `"pass_upstream_errors":true`) {
		t.Fatalf("enabled policy JSON lacks pass_upstream_errors=true: %s", raw)
	}
	var back RequestPolicy
	if err := json.Unmarshal(raw, &back); err != nil || !back.PassUpstreamErrors {
		t.Fatal("pass_upstream_errors did not round-trip", err)
	}
	pub, _ := json.Marshal((Config{Mode: "local", RequestPolicy: &p}).Public())
	if !strings.Contains(string(pub), `"pass_upstream_errors":true`) {
		t.Fatalf("public settings lack pass_upstream_errors: %s", pub)
	}
}

func TestPassUpstreamErrorsLegacyConfig(t *testing.T) {
	// A configuration persisted before the field existed.
	legacy := []byte(`{"mode":"local","request_policy":{"unknown_beta":"ignore","unknown_field":"reject","allow_fast":true,"tool_search":"auto","allow_effort":true,"betas":[]}}`)
	cipher, _ := secret.New(bytes.Repeat([]byte{7}, 32))
	enc, err := cipher.Encrypt(legacy, configAAD)
	if err != nil {
		t.Fatal(err)
	}
	envelope, _ := json.Marshal(map[string]any{"cipher": enc})
	s := &Service{Cipher: cipher}
	old, err := s.decode(envelope)
	if err != nil {
		t.Fatal(err)
	}
	p := old.EffectiveRequestPolicy()
	if p.PassUpstreamErrors || !p.AllowFast || p.ToolSearch != "auto" {
		t.Fatalf("legacy policy decoded incorrectly: %+v", p)
	}
	raw, _ := json.Marshal(p)
	if !strings.Contains(string(raw), `"pass_upstream_errors":false`) {
		t.Fatalf("legacy policy header lacks explicit false: %s", raw)
	}
	// Saving without a request_policy keeps the legacy settings and false.
	kept, err := mergeConfig(Config{Mode: "local"}, old)
	if err != nil || kept.EffectiveRequestPolicy().PassUpstreamErrors || !kept.EffectiveRequestPolicy().AllowFast {
		t.Fatal("omitted policy changed legacy settings", err)
	}
}

func TestPassUpstreamErrorsSave(t *testing.T) {
	var in Config
	if err := json.Unmarshal([]byte(`{"mode":"local","request_policy":{"unknown_beta":"ignore","unknown_field":"reject","allow_fast":false,"allow_effort":true,"pass_upstream_errors":true,"betas":[]}}`), &in); err != nil {
		t.Fatal(err)
	}
	saved, err := mergeConfig(in, Config{Mode: "local"})
	if err != nil || !saved.EffectiveRequestPolicy().PassUpstreamErrors {
		t.Fatal("enabled pass_upstream_errors was not saved", err)
	}
	// Persist/reload through JSON as save() does.
	plain, _ := json.Marshal(saved)
	var reloaded Config
	if err := json.Unmarshal(plain, &reloaded); err != nil || !reloaded.EffectiveRequestPolicy().PassUpstreamErrors {
		t.Fatal("pass_upstream_errors lost on reload", err)
	}
	kept, err := mergeConfig(Config{Mode: "local"}, reloaded)
	if err != nil || !kept.EffectiveRequestPolicy().PassUpstreamErrors {
		t.Fatal("omitted policy dropped pass_upstream_errors", err)
	}
	off := *saved.RequestPolicy
	off.PassUpstreamErrors = false
	cleared, err := mergeConfig(Config{Mode: "local", RequestPolicy: &off}, reloaded)
	if err != nil || cleared.EffectiveRequestPolicy().PassUpstreamErrors {
		t.Fatal("pass_upstream_errors could not be turned off", err)
	}
}

func TestRequestPolicyConfig(t *testing.T) {
	old := Config{Mode: "local"}
	p := defaultRequestPolicy()
	p.UnknownBeta = "ignore"
	old.RequestPolicy = &p
	kept, e := mergeConfig(Config{Mode: "local"}, old)
	if e != nil || kept.EffectiveRequestPolicy().UnknownBeta != "ignore" {
		t.Fatal("omitted policy did not retain settings", e)
	}
	p.Betas = []BetaRule{}
	saved, e := mergeConfig(Config{Mode: "local", RequestPolicy: &p}, old)
	if e != nil || len(saved.EffectiveRequestPolicy().Betas) != len(defaultRequestPolicy().Betas) {
		t.Fatal("fixed whitelist was overridden", e)
	}
	if saved.Public()["request_policy"] == nil {
		t.Fatal("policy missing from public settings")
	}
	for _, b := range []BetaRule{{"bad name", "forward"}, {"x", "fast"}, {"x", "environment"}} {
		invalid := defaultRequestPolicy()
		invalid.Betas = []BetaRule{b}
		if _, e := mergeConfig(Config{Mode: "local", RequestPolicy: &invalid}, old); e != nil {
			t.Fatal("legacy rules should be ignored", b, e)
		}
	}
}
