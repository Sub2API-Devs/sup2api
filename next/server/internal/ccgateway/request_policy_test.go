package ccgateway

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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
	if err := json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_beta":"reject","unknown_field":"ignore","allow_fast":false,"allow_effort":false,"tool_search":"false"}}`), &in); err != nil {
		t.Fatal(err)
	}
	p := in.EffectiveRequestPolicy()
	if !p.AllowFast || !p.AllowEffort {
		t.Fatalf("saved false switches were honored: %+v", p)
	}
	// The other settings keep their saved values.
	if p.UnknownField != "ignore" || p.ToolSearch != "false" {
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
	p.UnknownField = "ignore"
	old.RequestPolicy = &p
	kept, e := mergeConfig(Config{Mode: "disabled"}, old)
	if e != nil || kept.EffectiveRequestPolicy().UnknownField != "ignore" {
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

func TestNativeRelayPolicySaveAndWorkerProjection(t *testing.T) {
	assert.Equal(t, "native", defaultRequestPolicy().RelayMode)
	assert.Equal(t, "native", (Config{}).EffectiveRequestPolicy().RelayMode)
	for _, mode := range []string{"", "native"} {
		t.Run(mode, func(t *testing.T) {
			var in Config
			require.NoError(t, json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_beta":"ignore","unknown_field":"reject","relay_mode":"`+mode+`","relay_native_accounts":[24],"relay_passthrough_accounts":[23]}}`), &in))
			saved, err := mergeConfig(in, Config{Mode: "disabled"})
			require.NoError(t, err)
			raw, err := json.Marshal(saved)
			require.NoError(t, err)
			assert.NotContains(t, string(raw), "relay_native_accounts")
			assert.NotContains(t, string(raw), "relay_passthrough_accounts")
			var reloaded Config
			require.NoError(t, json.Unmarshal(raw, &reloaded))
			assert.Equal(t, "native", reloaded.EffectiveRequestPolicy().RelayMode)
			for _, id := range []int64{-1, 0, 22, 23, 24} {
				worker := reloaded.WorkerRequestPolicy(id)
				assert.Equal(t, "native", worker.RelayMode)
				assert.Equal(t, reloaded.EffectiveRequestPolicy(), worker)
				wire, err := json.Marshal(worker)
				require.NoError(t, err)
				assert.NotContains(t, string(wire), "relay_native_accounts")
				assert.NotContains(t, string(wire), "relay_passthrough_accounts")
				assert.NotContains(t, string(wire), "pass_upstream_errors")
			}
		})
	}
}

func TestRelayModeStoredPolicyNormalizesToNative(t *testing.T) {
	cipher, err := secret.New(bytes.Repeat([]byte{7}, 32))
	require.NoError(t, err)
	s := &Service{Cipher: cipher}
	for _, mode := range []string{"", "legacy", "passthrough", "native", "direct"} {
		t.Run(mode, func(t *testing.T) {
			plain := []byte(`{"mode":"disabled","request_policy":{"unknown_beta":"ignore","unknown_field":"reject","relay_mode":"` + mode + `","relay_native_accounts":[24],"relay_passthrough_accounts":[23],"pass_upstream_errors":true,"tool_search":"false"}}`)
			enc, err := cipher.Encrypt(plain, configAAD)
			require.NoError(t, err)
			envelope, err := json.Marshal(map[string]any{"cipher": enc})
			require.NoError(t, err)
			old, err := s.decode(envelope)
			require.NoError(t, err)
			require.NotNil(t, old.RequestPolicy)
			assert.Equal(t, mode, old.RequestPolicy.RelayMode)
			for _, id := range []int64{-1, 0, 22, 23, 24} {
				p := old.WorkerRequestPolicy(id)
				assert.Equal(t, "native", p.RelayMode)
				assert.Equal(t, "false", p.ToolSearch)
			}
			assert.Equal(t, "native", old.EffectiveRequestPolicy().RelayMode)
			assert.Equal(t, mode, old.RequestPolicy.RelayMode)
			public, err := json.Marshal(old.Public())
			require.NoError(t, err)
			assert.Contains(t, string(public), `"relay_mode":"native"`)
			assert.NotContains(t, string(public), "relay_native_accounts")
			assert.NotContains(t, string(public), "relay_passthrough_accounts")
			assert.NotContains(t, string(public), "pass_upstream_errors")
			saved, err := mergeConfig(Config{Mode: "disabled"}, old)
			require.NoError(t, err)
			assert.Equal(t, "native", saved.RequestPolicy.RelayMode)
			assert.Equal(t, "false", saved.RequestPolicy.ToolSearch)
		})
	}
}

func TestRelayModeRejectsExplicitNonNativePolicy(t *testing.T) {
	for _, mode := range []string{"legacy", "passthrough", "direct", "Native", " native "} {
		t.Run(mode, func(t *testing.T) {
			p := defaultRequestPolicy()
			p.RelayMode = mode
			require.EqualError(t, validateRequestPolicy(p), "invalid relay_mode: must be native")
			var in Config
			require.NoError(t, json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_beta":"ignore","unknown_field":"reject","relay_mode":"`+mode+`"}}`), &in))
			_, err := mergeConfig(in, Config{Mode: "disabled"})
			require.ErrorContains(t, err, "relay_mode")
		})
	}
}
