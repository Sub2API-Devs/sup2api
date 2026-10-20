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

func TestRequestPolicySaveAndWorkerProjection(t *testing.T) {
	assert.Equal(t, "build", defaultRequestPolicy().RelayMode)
	assert.Equal(t, "build", (Config{}).EffectiveRequestPolicy().RelayMode)
	for _, mode := range []string{"", "build", "direct"} {
		t.Run(mode, func(t *testing.T) {
			want := mode
			if want == "" {
				want = "build"
			}
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
			assert.Equal(t, want, reloaded.EffectiveRequestPolicy().RelayMode)
			for _, id := range []int64{-1, 0, 22, 23, 24} {
				worker := reloaded.WorkerRequestPolicy(id)
				assert.Equal(t, want, worker.RelayMode)
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

func TestRelayModeStoredPolicyNormalizesToBuild(t *testing.T) {
	cipher, err := secret.New(bytes.Repeat([]byte{7}, 32))
	require.NoError(t, err)
	s := &Service{Cipher: cipher}
	for _, mode := range []string{"", "legacy", "passthrough", "native"} {
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
				assert.Equal(t, "build", p.RelayMode)
				assert.Equal(t, "false", p.ToolSearch)
			}
			assert.Equal(t, "build", old.EffectiveRequestPolicy().RelayMode)
			assert.Equal(t, mode, old.RequestPolicy.RelayMode)
			public, err := json.Marshal(old.Public())
			require.NoError(t, err)
			assert.Contains(t, string(public), `"relay_mode":"build"`)
			assert.NotContains(t, string(public), "relay_native_accounts")
			assert.NotContains(t, string(public), "relay_passthrough_accounts")
			assert.NotContains(t, string(public), "pass_upstream_errors")
			saved, err := mergeConfig(Config{Mode: "disabled"}, old)
			require.NoError(t, err)
			assert.Equal(t, "build", saved.RequestPolicy.RelayMode)
			assert.Equal(t, "false", saved.RequestPolicy.ToolSearch)
		})
	}
}

func TestRelayModeRejectsRetiredModes(t *testing.T) {
	for _, mode := range []string{"native", "legacy", "passthrough", "Native", " native "} {
		t.Run(mode, func(t *testing.T) {
			p := defaultRequestPolicy()
			p.RelayMode = mode
			require.EqualError(t, validateRequestPolicy(p), "invalid relay_mode: must be build or direct")
			var in Config
			require.NoError(t, json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_beta":"ignore","unknown_field":"reject","relay_mode":"`+mode+`"}}`), &in))
			_, err := mergeConfig(in, Config{Mode: "disabled"})
			require.ErrorContains(t, err, "relay_mode")
		})
	}
}

// erase_client_attachments is empty by default, saves, reloads and reaches the
// Worker policy, and rejects unknown or repeated types.
func TestEraseClientAttachmentsSave(t *testing.T) {
	if p := defaultRequestPolicy(); len(p.EraseClientAttachments) != 0 {
		t.Fatalf("default: %v", p.EraseClientAttachments)
	}
	var in Config
	if err := json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_field":"reject","erase_client_attachments":["session_context","date"],"betas":[]}}`), &in); err != nil {
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
	if got := reloaded.WorkerRequestPolicy(26).EraseClientAttachments; len(got) != 2 || got[0] != "session_context" || got[1] != "date" {
		t.Fatalf("reloaded: %v", got)
	}
	for _, types := range [][]string{{"claudeMd"}, {"date", "date"}} {
		bad := *saved.RequestPolicy
		bad.EraseClientAttachments = types
		if _, err := mergeConfig(Config{Mode: "disabled", RequestPolicy: &bad}, reloaded); err == nil {
			t.Fatal("invalid value accepted", types)
		}
	}
}

// A configuration saved before erase_client_attachments existed, with its
// legacy attachment source, sends the Worker the same policy as before.
func TestEraseClientAttachmentsAbsentKeepsWorkerPolicy(t *testing.T) {
	var legacy Config
	if err := json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_field":"reject","attachment_source":"gateway","attachment_sources":{"environment":"client"},"betas":[]}}`), &legacy); err != nil {
		t.Fatal(err)
	}
	saved, err := mergeConfig(legacy, Config{Mode: "disabled"})
	if err != nil {
		t.Fatal(err)
	}
	for _, c := range []Config{legacy, saved} {
		raw, _ := json.Marshal(c.WorkerRequestPolicy(26))
		if strings.Contains(string(raw), "erase_client_attachments") {
			t.Fatalf("worker policy gained erase: %s", raw)
		}
	}
}

// replace_client_attachments saves, reloads and reaches the Worker policy;
// unknown, repeated or erased types are rejected; every erasable type can be
// replaced (date and session_context since ccgateway 0.1.54).
func TestReplaceClientAttachmentsSave(t *testing.T) {
	var in Config
	require.NoError(t, json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_field":"reject","erase_client_attachments":["date"],"replace_client_attachments":["environment","model"],"betas":[]}}`), &in))
	saved, err := mergeConfig(in, Config{Mode: "disabled"})
	require.NoError(t, err)
	plain, _ := json.Marshal(saved)
	var reloaded Config
	require.NoError(t, json.Unmarshal(plain, &reloaded))
	require.Equal(t, []string{"environment", "model"}, reloaded.WorkerRequestPolicy(26).ReplaceClientAttachments)
	all := *saved.RequestPolicy
	all.EraseClientAttachments, all.ReplaceClientAttachments = nil, []string{"environment", "model", "date", "total_tokens_reminder", "session_context"}
	_, err = mergeConfig(Config{Mode: "disabled", RequestPolicy: &all, FeatureRevision: reloaded.FeatureRevision}, reloaded)
	require.NoError(t, err)
	for _, c := range []struct{ erase, replace []string }{{nil, []string{"weather"}}, {[]string{"date"}, []string{"date"}}, {nil, []string{"model", "model"}}, {[]string{"model"}, []string{"model"}}} {
		bad := *saved.RequestPolicy
		bad.EraseClientAttachments, bad.ReplaceClientAttachments = c.erase, c.replace
		_, err := mergeConfig(Config{Mode: "disabled", RequestPolicy: &bad}, reloaded)
		require.ErrorContains(t, err, "replace_client_attachments", "%v", c)
	}
}

func TestIndependentEnvironmentPolicySave(t *testing.T) {
	var in Config
	require.NoError(t, json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_field":"ignore","erase_client_attachments":["platform","environment_update"],"replace_client_attachments":["working_directory"]}}`), &in))
	saved, err := mergeConfig(in, Config{Mode: "disabled"})
	require.NoError(t, err)
	raw, err := json.Marshal(saved)
	require.NoError(t, err)
	var reloaded Config
	require.NoError(t, json.Unmarshal(raw, &reloaded))
	policy := reloaded.WorkerRequestPolicy(21)
	assert.Equal(t, []string{"platform", "environment_update"}, policy.EraseClientAttachments)
	assert.Equal(t, []string{"working_directory"}, policy.ReplaceClientAttachments)
}

func TestAttachmentChildrenPolicySave(t *testing.T) {
	var in Config
	require.NoError(t, json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_field":"ignore","erase_client_attachments":["git_status","model_id","date_change"],"replace_client_attachments":["shell","user_email","current_date"]}}`), &in))
	saved, err := mergeConfig(in, Config{Mode: "disabled"})
	require.NoError(t, err)
	raw, err := json.Marshal(saved)
	require.NoError(t, err)
	var reloaded Config
	require.NoError(t, json.Unmarshal(raw, &reloaded))
	policy := reloaded.WorkerRequestPolicy(21)
	assert.Equal(t, []string{"git_status", "model_id", "date_change"}, policy.EraseClientAttachments)
	assert.Equal(t, []string{"shell", "user_email", "current_date"}, policy.ReplaceClientAttachments)
}
