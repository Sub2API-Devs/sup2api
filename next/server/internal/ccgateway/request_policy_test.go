package ccgateway

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
)

func TestCustomToolPrefixSaveReload(t *testing.T) {
	for _, prefix := range []string{"", "ccgateway", "my-tools"} {
		p := defaultRequestPolicy()
		p.CustomToolPrefix = prefix
		saved, err := mergeConfig(Config{Mode: "disabled", RequestPolicy: &p}, Config{Mode: "disabled"})
		if err != nil {
			t.Fatal(err)
		}
		raw, _ := json.Marshal(saved)
		var loaded Config
		if err := json.Unmarshal(raw, &loaded); err != nil {
			t.Fatal(err)
		}
		want := prefix
		if want == "" {
			want = "ccgateway"
		}
		if loaded.EffectiveRequestPolicy().CustomToolPrefix != want {
			t.Fatal("saved prefix lost")
		}
		public, _ := json.Marshal(loaded.Public())
		if !strings.Contains(string(public), `"custom_tool_prefix":"`+want+`"`) {
			t.Fatal("prefix missing in settings")
		}
	}
	for _, prefix := range []string{"bad__name", "bad name", strings.Repeat("x", 33)} {
		p := defaultRequestPolicy()
		p.CustomToolPrefix = prefix
		if _, err := mergeConfig(Config{Mode: "disabled", RequestPolicy: &p}, Config{Mode: "disabled"}); err == nil {
			t.Fatal("invalid prefix accepted")
		}
	}
}

func TestPassUpstreamErrorsDefaultAndJSON(t *testing.T) {
	if defaultRequestPolicy().PassUpstreamErrors {
		t.Fatal("pass_upstream_errors must default to false")
	}
	if (Config{Mode: "disabled"}).EffectiveRequestPolicy().PassUpstreamErrors {
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
	pub, _ := json.Marshal((Config{Mode: "disabled", RequestPolicy: &p}).Public())
	if !strings.Contains(string(pub), `"pass_upstream_errors":true`) {
		t.Fatalf("public settings lack pass_upstream_errors: %s", pub)
	}
}

func TestPassUpstreamErrorsLegacyConfig(t *testing.T) {
	// A configuration persisted before the field existed.
	legacy := []byte(`{"mode":"disabled","request_policy":{"unknown_beta":"ignore","unknown_field":"reject","allow_fast":true,"tool_search":"auto","allow_effort":true,"betas":[]}}`)
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
	kept, err := mergeConfig(Config{Mode: "disabled"}, old)
	if err != nil || kept.EffectiveRequestPolicy().PassUpstreamErrors || !kept.EffectiveRequestPolicy().AllowFast {
		t.Fatal("omitted policy changed legacy settings", err)
	}
}

func TestPassUpstreamErrorsSave(t *testing.T) {
	var in Config
	if err := json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_beta":"ignore","unknown_field":"reject","allow_fast":false,"allow_effort":true,"pass_upstream_errors":true,"betas":[]}}`), &in); err != nil {
		t.Fatal(err)
	}
	saved, err := mergeConfig(in, Config{Mode: "disabled"})
	if err != nil || !saved.EffectiveRequestPolicy().PassUpstreamErrors {
		t.Fatal("enabled pass_upstream_errors was not saved", err)
	}
	// Persist/reload through JSON as save() does.
	plain, _ := json.Marshal(saved)
	var reloaded Config
	if err := json.Unmarshal(plain, &reloaded); err != nil || !reloaded.EffectiveRequestPolicy().PassUpstreamErrors {
		t.Fatal("pass_upstream_errors lost on reload", err)
	}
	kept, err := mergeConfig(Config{Mode: "disabled"}, reloaded)
	if err != nil || !kept.EffectiveRequestPolicy().PassUpstreamErrors {
		t.Fatal("omitted policy dropped pass_upstream_errors", err)
	}
	off := *saved.RequestPolicy
	off.PassUpstreamErrors = false
	cleared, err := mergeConfig(Config{Mode: "disabled", RequestPolicy: &off}, reloaded)
	if err != nil || cleared.EffectiveRequestPolicy().PassUpstreamErrors {
		t.Fatal("pass_upstream_errors could not be turned off", err)
	}
}

// Fast mode and effort are supported by the official API and are no longer
// settings: a saved false (or an old default) is ignored and saved back as true.
func TestOfficialFeaturesIgnoreSavedSwitches(t *testing.T) {
	if p := defaultRequestPolicy(); !p.AllowFast || !p.AllowEffort {
		t.Fatalf("defaults must allow fast and effort: %+v", p)
	}
	if p := (Config{Mode: "disabled"}).EffectiveRequestPolicy(); !p.AllowFast || !p.AllowEffort {
		t.Fatalf("missing policy must allow fast and effort: %+v", p)
	}
	var in Config
	if err := json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_beta":"reject","unknown_field":"ignore","allow_fast":false,"allow_effort":false,"tool_search":"false","pass_upstream_errors":true}}`), &in); err != nil {
		t.Fatal(err)
	}
	p := in.EffectiveRequestPolicy()
	if !p.AllowFast || !p.AllowEffort {
		t.Fatalf("saved false switches were honored: %+v", p)
	}
	// The other settings keep their saved values.
	if p.UnknownBeta != "reject" || p.UnknownField != "ignore" || p.ToolSearch != "false" || !p.PassUpstreamErrors {
		t.Fatalf("other settings changed: %+v", p)
	}
	saved, err := mergeConfig(in, Config{Mode: "disabled"})
	if err != nil || !saved.RequestPolicy.AllowFast || !saved.RequestPolicy.AllowEffort {
		t.Fatal("saved policy keeps the switches off", err)
	}
	raw, _ := json.Marshal(saved.EffectiveRequestPolicy())
	if !strings.Contains(string(raw), `"allow_fast":true`) || !strings.Contains(string(raw), `"allow_effort":true`) {
		t.Fatalf("Worker header lacks the forced switches: %s", raw)
	}
	pub, _ := json.Marshal(saved.Public())
	if !strings.Contains(string(pub), `"allow_fast":true`) || !strings.Contains(string(pub), `"allow_effort":true`) {
		t.Fatalf("public settings lack the forced switches: %s", pub)
	}
}

func TestRequestPolicyConfig(t *testing.T) {
	old := Config{Mode: "disabled"}
	p := defaultRequestPolicy()
	p.UnknownBeta = "ignore"
	old.RequestPolicy = &p
	kept, e := mergeConfig(Config{Mode: "disabled"}, old)
	if e != nil || kept.EffectiveRequestPolicy().UnknownBeta != "ignore" {
		t.Fatal("omitted policy did not retain settings", e)
	}
	p.Betas = []BetaRule{}
	saved, e := mergeConfig(Config{Mode: "disabled", RequestPolicy: &p}, old)
	if e != nil || len(saved.EffectiveRequestPolicy().Betas) != len(defaultRequestPolicy().Betas) {
		t.Fatal("fixed whitelist was overridden", e)
	}
	if saved.Public()["request_policy"] == nil {
		t.Fatal("policy missing from public settings")
	}
	for _, b := range []BetaRule{{Name: "bad name", Mapping: "forward"}, {Name: "x", Mapping: "fast"}, {Name: "x", Mapping: "environment"}} {
		invalid := defaultRequestPolicy()
		invalid.Betas = []BetaRule{b}
		if _, e := mergeConfig(Config{Mode: "disabled", RequestPolicy: &invalid}, old); e != nil {
			t.Fatal("legacy rules should be ignored", b, e)
		}
	}
}

func TestAttachmentSourceSaveReload(t *testing.T) {
	for _, source := range []string{"client", "gateway", "both", ""} {
		t.Run(source, func(t *testing.T) {
			var input Config
			body := `{"mode":"disabled","request_policy":{"unknown_beta":"ignore","unknown_field":"reject","attachment_source":"` + source + `"}}`
			if err := json.Unmarshal([]byte(body), &input); err != nil {
				t.Fatal(err)
			}
			saved, err := mergeConfig(input, Config{Mode: "disabled"})
			if err != nil {
				t.Fatal(err)
			}
			raw, err := json.Marshal(saved)
			if err != nil {
				t.Fatal(err)
			}
			var reloaded Config
			if err := json.Unmarshal(raw, &reloaded); err != nil {
				t.Fatal(err)
			}
			kept, err := mergeConfig(Config{Mode: "disabled"}, reloaded)
			if err != nil {
				t.Fatal(err)
			}
			want := source
			if want == "" {
				want = "client"
			}
			if kept.EffectiveRequestPolicy().AttachmentSource != want {
				t.Fatal("attachment source lost on save/reload")
			}
			public, _ := json.Marshal(kept.Public())
			if !strings.Contains(string(public), `"attachment_source":"`+want+`"`) {
				t.Fatal("attachment source missing in public settings")
			}
		})
	}
	p := defaultRequestPolicy()
	p.AttachmentSource = "invalid"
	if _, err := mergeConfig(Config{Mode: "disabled", RequestPolicy: &p}, Config{Mode: "disabled"}); err == nil {
		t.Fatal("invalid attachment source accepted")
	}
}

// thinking_disabled_compat defaults to pass (legacy configurations too),
// saves and reloads omit, and rejects other values.
func TestThinkingDisabledCompatSave(t *testing.T) {
	if p := defaultRequestPolicy(); p.ThinkingDisabledCompat != "pass" {
		t.Fatalf("default: %q", p.ThinkingDisabledCompat)
	}
	var legacy Config
	if err := json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_beta":"ignore","unknown_field":"reject","betas":[]}}`), &legacy); err != nil {
		t.Fatal(err)
	}
	if got := legacy.EffectiveRequestPolicy().ThinkingDisabledCompat; got != "pass" {
		t.Fatalf("legacy: %q", got)
	}
	var in Config
	if err := json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_beta":"ignore","unknown_field":"reject","thinking_disabled_compat":"omit","betas":[]}}`), &in); err != nil {
		t.Fatal(err)
	}
	saved, err := mergeConfig(in, Config{Mode: "disabled"})
	if err != nil || saved.EffectiveRequestPolicy().ThinkingDisabledCompat != "omit" {
		t.Fatal("omit not saved", err)
	}
	plain, _ := json.Marshal(saved)
	var reloaded Config
	if err := json.Unmarshal(plain, &reloaded); err != nil || reloaded.EffectiveRequestPolicy().ThinkingDisabledCompat != "omit" {
		t.Fatal("omit lost on reload", err)
	}
	bad := *saved.RequestPolicy
	bad.ThinkingDisabledCompat = "adaptive"
	if _, err := mergeConfig(Config{Mode: "disabled", RequestPolicy: &bad}, reloaded); err == nil {
		t.Fatal("invalid value accepted")
	}
}

// relay_mode defaults to legacy; relay_passthrough_accounts turns single
// accounts to passthrough, and the Worker never sees the list.
func TestRelayModeSaveAndWorkerPolicy(t *testing.T) {
	var legacy Config
	if err := json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_beta":"ignore","unknown_field":"reject","betas":[]}}`), &legacy); err != nil {
		t.Fatal(err)
	}
	if got := legacy.WorkerRequestPolicy(23).RelayMode; got != "legacy" {
		t.Fatalf("legacy default: %q", got)
	}
	var in Config
	if err := json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_beta":"ignore","unknown_field":"reject","relay_passthrough_accounts":[23],"betas":[]}}`), &in); err != nil {
		t.Fatal(err)
	}
	saved, err := mergeConfig(in, Config{Mode: "disabled"})
	if err != nil {
		t.Fatal(err)
	}
	plain, _ := json.Marshal(saved)
	var reloaded Config
	if err := json.Unmarshal(plain, &reloaded); err != nil {
		t.Fatal(err)
	}
	if p := reloaded.WorkerRequestPolicy(23); p.RelayMode != "passthrough" || p.RelayPassthroughAccounts != nil {
		t.Fatalf("account 23: %+v", p)
	}
	if p := reloaded.WorkerRequestPolicy(22); p.RelayMode != "legacy" {
		t.Fatalf("account 22: %q", p.RelayMode)
	}
	if got := reloaded.EffectiveRequestPolicy().RelayPassthroughAccounts; len(got) != 1 || got[0] != 23 {
		t.Fatalf("console view: %v", got)
	}
	all := *reloaded.RequestPolicy
	all.RelayMode = "passthrough"
	if p := (Config{RequestPolicy: &all}).WorkerRequestPolicy(22); p.RelayMode != "passthrough" {
		t.Fatal("global passthrough")
	}
	for _, bad := range []func(p *RequestPolicy){
		func(p *RequestPolicy) { p.RelayMode = "direct" },
		func(p *RequestPolicy) { p.RelayPassthroughAccounts = []int64{0} },
		func(p *RequestPolicy) { p.RelayPassthroughAccounts = []int64{23, 23} },
	} {
		policy := *reloaded.RequestPolicy
		bad(&policy)
		if _, err := mergeConfig(Config{Mode: "disabled", RequestPolicy: &policy}, reloaded); err == nil {
			t.Fatalf("invalid policy accepted: %+v", policy)
		}
	}
}
