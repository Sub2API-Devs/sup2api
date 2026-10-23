package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/requestfailure"
	"github.com/stretchr/testify/require"
)

func levelInjection(t *testing.T, raw string) *features.BuildInjection {
	t.Helper()
	var p *features.BuildInjection
	require.NoError(t, json.Unmarshal([]byte(raw), &p))
	return p
}

// A global policy saved before levels gets the level of what it did, and the
// level adds exactly what it added: every in-level item it did not add is
// written as an explicit "not added" (CC-INJECTION-LEVELS-DESIGN §5).
func TestLegacyGlobalPolicyMigratesToALevelWithoutChangingTheInjection(t *testing.T) {
	for _, c := range []struct {
		name, relay string
		sources     features.BuildAttachmentSources
		injection   string
		want        string
	}{
		{"production: build, platform and os from the Worker", "build", features.BuildAttachmentSources{"platform_name": "worker", "os_version": "worker"}, `null`, features.LevelLow},
		{"build converting nothing", "build", nil, `null`, features.LevelMicro},
		{"build adding nothing explicitly", "build", features.BuildAttachmentSources{"shell": "client"}, `{"system_prompt":false,"attachments":{"date":false}}`, features.LevelMicro},
		{"build adding one attachment", "build", nil, `{"attachments":{"date":true}}`, features.LevelLow},
		{"build erasing a field", "build", features.BuildAttachmentSources{"shell": "erase"}, `{"attachments":{"environment":true,"model":false}}`, features.LevelLow},
		{"build adding the prompt only", "build", nil, `{"system_prompt":true}`, features.LevelHigh},
		{"build adding a tool only", "build", features.BuildAttachmentSources{"os_version": "worker"}, `{"tools":{"Agent":true},"attachments":{"model":true}}`, features.LevelHigh},
		{"build adding everything", "build", nil, `{"system_prompt":true,"attachments":{"environment":true,"model":true,"total_tokens":true,"date":true},"tools":{"Bash":true,"Read":true,"Edit":true,"Write":true,"NotebookEdit":true}}`, features.LevelHigh},
		{"retired mode reads as build", "passthrough", features.BuildAttachmentSources{"os_version": "worker"}, `null`, features.LevelLow},
		{"direct", "direct", features.BuildAttachmentSources{"os_version": "worker"}, `{"tools":{"Read":true}}`, features.LevelNone},
	} {
		t.Run(c.name, func(t *testing.T) {
			legacy := defaultRequestPolicy()
			legacy.RelayMode, legacy.BuildAttachmentSources, legacy.BuildInjection = c.relay, c.sources, levelInjection(t, c.injection)
			before, _ := json.Marshal(legacy)
			got := Config{RequestPolicy: &legacy}.EffectiveRequestPolicy()
			after, _ := json.Marshal(legacy)
			require.JSONEq(t, string(before), string(after), "reading must not change the stored policy")
			require.Equal(t, c.want, got.Level)
			require.Equal(t, features.RelayModeForLevel(c.want), got.RelayMode)
			require.NoError(t, validateRequestPolicy(got))
			if c.want != features.LevelNone {
				// What a request without a billing header was given stays.
				require.Equal(t, legacy.BuildInjection.Effective(), features.LevelInjection(got.Level, got.BuildInjection))
			}
			wire, err := (&Service{}).resolvedWorkerPolicy(context.Background(), Config{RequestPolicy: &legacy}, 0, 0)
			require.NoError(t, err)
			if c.want == features.LevelNone {
				require.Nil(t, wire.BuildInjection)
			} else {
				require.Equal(t, legacy.BuildInjection.Effective(), wire.BuildInjection)
			}
			// Read again from the migrated form: the same level, nothing more.
			again := Config{RequestPolicy: &got}.EffectiveRequestPolicy()
			require.Equal(t, got, again)
		})
	}
	// The production global (doc §5): low, the four attachments off.
	prod := defaultRequestPolicy()
	prod.BuildAttachmentSources = features.BuildAttachmentSources{"platform_name": "worker", "os_version": "worker"}
	got := Config{RequestPolicy: &prod}.EffectiveRequestPolicy()
	raw, _ := json.Marshal(got.BuildInjection)
	require.JSONEq(t, `{"attachments":{"environment":false,"model":false,"total_tokens":false,"date":false}}`, string(raw))
	// No stored policy at all is the build that converted and added nothing.
	require.Equal(t, features.LevelMicro, Config{}.EffectiveRequestPolicy().Level)
	// A new installation starts at the default level with its defaults.
	fresh, err := (&Service{}).decodeStored(nil)
	require.NoError(t, err)
	require.Equal(t, features.DefaultRequestLevel, fresh.EffectiveRequestPolicy().Level)
	wire, err := (&Service{}).resolvedWorkerPolicy(context.Background(), fresh, 0, 0)
	require.NoError(t, err)
	require.Equal(t, features.LevelInjection(features.LevelLow, nil), wire.BuildInjection)
}

// Group and account overrides saved before levels carry relay_mode only:
// direct is none; build lifts only a none level so far, to the level of the
// merged settings; a level always wins.
func TestLegacyOverrideRelayModeMapsToALevel(t *testing.T) {
	str := featureString
	worker := features.BuildAttachmentSources{"shell": "worker"}
	for _, c := range []struct {
		name           string
		global         RequestPolicy
		group, account FeatureOverrides
		want, origin   string
		wireInjection  string
	}{
		{"group direct over global low", RequestPolicy{BuildAttachmentSources: worker}, FeatureOverrides{RelayMode: str("direct")}, FeatureOverrides{}, features.LevelNone, "group", `null`},
		{"account direct over group", RequestPolicy{Level: features.LevelHigh}, FeatureOverrides{}, FeatureOverrides{RelayMode: str("direct")}, features.LevelNone, "account", `null`},
		{"account build over group direct", RequestPolicy{BuildAttachmentSources: worker}, FeatureOverrides{RelayMode: str("direct")}, FeatureOverrides{RelayMode: str("build")}, features.LevelLow, "account", `null`},
		{"account build with the prompt over group direct", RequestPolicy{}, FeatureOverrides{RelayMode: str("direct")},
			FeatureOverrides{RelayMode: str("build"), BuildInjection: levelInjection(t, `{"system_prompt":true}`)}, features.LevelHigh, "account", `{"system_prompt":true}`},
		{"group build over global direct adds what the legacy build added", RequestPolicy{RelayMode: "direct", BuildAttachmentSources: worker, BuildInjection: levelInjection(t, `{"attachments":{"date":true}}`)},
			FeatureOverrides{RelayMode: str("build")}, FeatureOverrides{}, features.LevelLow, "group", `{"attachments":{"date":true}}`},
		{"build over a level other than none keeps it", RequestPolicy{Level: features.LevelMicro, BuildAttachmentSources: worker}, FeatureOverrides{RelayMode: str("build")}, FeatureOverrides{}, features.LevelMicro, "global", `null`},
		{"a level wins over relay_mode", RequestPolicy{Level: features.LevelLow}, FeatureOverrides{Level: str(features.LevelMicro), RelayMode: str("direct")}, FeatureOverrides{}, features.LevelMicro, "group", `null`},
		{"an account level over a direct group", RequestPolicy{}, FeatureOverrides{RelayMode: str("direct")}, FeatureOverrides{Level: str(features.LevelHigh)}, features.LevelHigh, "account",
			`{"system_prompt":true,"attachments":{"environment":true,"model":true,"total_tokens":true,"date":true},"tools":{"Bash":true,"Read":true,"Edit":true,"Write":true}}`},
	} {
		t.Run(c.name, func(t *testing.T) {
			global := defaultRequestPolicy()
			global.Level, global.BuildAttachmentSources, global.BuildInjection = c.global.Level, c.global.BuildAttachmentSources, c.global.BuildInjection
			if c.global.RelayMode != "" {
				global.RelayMode = c.global.RelayMode
			}
			require.NoError(t, c.group.Validate())
			require.NoError(t, c.account.Validate())
			cfg := Config{RequestPolicy: &global, CCFeatureGroups: map[string]GroupFeaturePolicy{"7": {Enabled: true, AllowAccountOverride: true, Overrides: c.group}}}
			r := cfg.ResolveFeaturePolicy(7, AccountFeaturePolicy{Mode: "custom", Overrides: c.account})
			require.Equal(t, c.want, r.Effective.Level)
			require.Equal(t, features.RelayModeForLevel(c.want), r.Effective.RelayMode)
			require.Equal(t, c.origin, r.Sources["level"])
			require.Equal(t, c.origin, r.Sources["relay_mode"])
			wire, err := (&Service{}).resolvedWorkerPolicy(context.Background(), Config{RequestPolicy: &r.Effective}, 0, 0)
			require.NoError(t, err)
			require.Equal(t, features.RelayModeForLevel(c.want), wire.RelayMode)
			require.Equal(t, levelInjection(t, c.wireInjection), wire.BuildInjection)
		})
	}
}

// What reaches the Worker per level: none is the billing header (entrypoint
// and sources), micro adds the identity lines, low the environment, high the
// prompt and the tools. The level itself is never sent.
func TestWirePolicyCarriesOnlyTheLayersOfItsLevel(t *testing.T) {
	full := defaultRequestPolicy()
	full.BuildBillingEntrypoint = "claude-vscode"
	full.BuildBillingSources = features.BuildBillingSources{"cc_version": "worker", "cc_entrypoint": "client"}
	full.BuildIdentityLines = features.BuildIdentityLines{"claude-vscode": "official_cli", "cli": "official_cli"}
	full.BuildAttachmentSources = features.BuildAttachmentSources{"os_version": "worker", "shell": "client", "platform_name": "erase"}
	full.BuildInjection = levelInjection(t, `{"system_prompt":true,"attachments":{"model":false},"tools":{"Agent":true,"Write":false}}`)
	low := `{"attachments":{"environment":true,"total_tokens":true,"date":true}}`
	high := `{"system_prompt":true,"attachments":{"environment":true,"total_tokens":true,"date":true},"tools":{"Bash":true,"Read":true,"Edit":true,"Agent":true}}`
	for _, c := range []struct {
		level, relay           string
		identity, environment  bool
		injection              string
		capabilities, excluded []string
	}{
		{features.LevelNone, "direct", false, false, `null`,
			[]string{features.RequestPolicyModeCapability, features.RequestLevelsCapability, features.DirectBillingCapability},
			[]string{features.BuildIdentityCapability, features.BuildAttachmentCapabilityV2, features.BuildInjectionCapability, features.BuildBillingCapability}},
		{features.LevelMicro, "build", true, false, `null`,
			[]string{features.RequestLevelsCapability, features.BuildIdentityCapability, features.BuildBillingCapability},
			[]string{features.DirectBillingCapability, features.BuildAttachmentCapabilityV2, features.BuildInjectionCapability}},
		{features.LevelLow, "build", true, true, low,
			[]string{features.RequestLevelsCapability, features.BuildIdentityCapability, features.BuildAttachmentCapabilityV2, features.BuildInjectionCapability},
			[]string{features.DirectBillingCapability}},
		{features.LevelHigh, "build", true, true, high,
			[]string{features.RequestLevelsCapability, features.BuildIdentityCapability, features.BuildAttachmentCapabilityV2, features.BuildInjectionCapability},
			[]string{features.DirectBillingCapability}},
	} {
		t.Run(c.level, func(t *testing.T) {
			p := copyPolicy(full)
			p.Level = c.level
			stored, _ := json.Marshal(p)
			wire, err := (&Service{}).resolvedWorkerPolicy(context.Background(), Config{RequestPolicy: &p}, 0, 0)
			require.NoError(t, err)
			require.NoError(t, wire.Validate())
			after, _ := json.Marshal(p)
			require.JSONEq(t, string(stored), string(after), "layers above the level stay configured")
			raw, _ := json.Marshal(wire)
			require.NotContains(t, string(raw), `"level"`)
			require.Equal(t, c.relay, wire.RelayMode)
			require.Equal(t, "claude-vscode", wire.BuildBillingEntrypoint)
			require.Equal(t, features.BuildBillingSources{"cc_version": "worker"}, wire.BuildBillingSources)
			// The identity line adapts in the CLI at every build level: stored lines are never sent.
			require.NotContains(t, string(raw), "build_identity_lines")
			if c.environment {
				require.Equal(t, features.BuildAttachmentSources{"os_version": "worker", "platform_name": "erase"}, wire.BuildAttachmentSources)
			} else {
				require.Nil(t, wire.BuildAttachmentSources)
			}
			require.Equal(t, levelInjection(t, c.injection), wire.BuildInjection)
			required := requestPolicyCapabilities(wire)
			for _, capability := range c.capabilities {
				require.Contains(t, required, capability)
			}
			for _, capability := range c.excluded {
				require.NotContains(t, required, capability)
			}
		})
	}
	// Even a policy that changes nothing needs a Worker that follows levels.
	for _, level := range features.RequestLevels {
		p := defaultRequestPolicy()
		p.Level, p.CLIVersion = level, "2.1.302"
		wire, err := (&Service{}).resolvedWorkerPolicy(context.Background(), Config{RequestPolicy: &p}, 0, 0)
		require.NoError(t, err)
		require.Contains(t, requestPolicyCapabilities(wire), features.RequestLevelsCapability, level)
	}
}

// The capability read runs for the policy the request resolves to, also when
// only a group or account changes the level, and no request reaches a Worker
// that does not follow levels.
func TestModelRequestNeedsTheLevelsCapability(t *testing.T) {
	for _, capable := range []bool{false, true} {
		var policies []string
		worker := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/healthz" {
				caps := []string{features.RequestPolicyModeCapability, features.DirectBillingCapability}
				if capable {
					caps = append(caps, features.RequestLevelsCapability)
				}
				_ = json.NewEncoder(w).Encode(map[string]any{"status": "ok", "claude_version": "2.1.302", "capabilities": caps})
				return
			}
			policies = append(policies, r.Header.Get("X-CCGateway-Request-Policy"))
			_, _ = w.Write([]byte(`{}`))
		}))
		t.Setenv("CCGATEWAY_URL", worker.URL)
		global := defaultRequestPolicy()
		global.Level, global.CLIVersion = features.LevelMicro, "2.1.302"
		svc := &Service{}
		svc.cache.cfg = &cachedConfig{c: Config{Mode: "local", APIKey: "worker-key", RequestPolicy: &global,
			CCFeatureGroups: map[string]GroupFeaturePolicy{"7": {Enabled: true, Overrides: FeatureOverrides{Level: featureString(features.LevelNone)}}}}, at: time.Now()}
		req, err := http.NewRequestWithContext(context.Background(), "POST", VirtualURL, strings.NewReader(`{}`))
		require.NoError(t, err)
		res, err := svc.ModelClientForRequest(ModelRequestContext{GroupID: 7}).Do(req)
		if !capable {
			// The core answers itself (audit A6): a 503 marked as the core's
			// with the missing capability named, never a transport failure.
			require.NoError(t, err)
			require.Equal(t, http.StatusServiceUnavailable, res.StatusCode)
			require.Equal(t, requestfailure.SourceCore, requestfailure.Source(res.Header))
			require.Equal(t, "configuration_error", requestfailure.Reason(res.Header))
			answer, _ := io.ReadAll(res.Body)
			res.Body.Close()
			require.Contains(t, string(answer), "lacks "+features.RequestLevelsCapability)
			require.Empty(t, policies)
		} else {
			require.NoError(t, err)
			_, _ = io.Copy(io.Discard, res.Body)
			res.Body.Close()
			require.Len(t, policies, 1)
			require.NotContains(t, policies[0], `"level"`)
			var sent RequestPolicy
			require.NoError(t, json.Unmarshal([]byte(policies[0]), &sent))
			require.Equal(t, "direct", sent.RelayMode, "the group's level decides the mode")
		}
		worker.Close()
	}
}

// A save without a level keeps the stored one; a save with one sets it, and
// wins over a relay_mode it also carries.
func TestGlobalSaveKeepsTheStoredLevel(t *testing.T) {
	stored := defaultRequestPolicy()
	stored.Level = features.LevelHigh
	old := Config{Mode: "disabled", RequestPolicy: &stored, FeatureRevision: 3}
	in := defaultRequestPolicy()
	in.RelayMode = "direct"
	got, err := mergeConfig(Config{Mode: "disabled", RequestPolicy: &in, FeatureRevision: 3}, old)
	require.NoError(t, err)
	require.Equal(t, features.LevelHigh, got.RequestPolicy.Level)
	require.Equal(t, "build", got.RequestPolicy.RelayMode, "a stored level decides the mode")
	require.EqualValues(t, 3, got.FeatureRevision, "nothing changed")

	in = defaultRequestPolicy()
	in.Level, in.RelayMode = features.LevelNone, "build"
	got, err = mergeConfig(Config{Mode: "disabled", RequestPolicy: &in, FeatureRevision: 3}, old)
	require.NoError(t, err)
	require.Equal(t, features.LevelNone, got.RequestPolicy.Level)
	require.Equal(t, "direct", got.RequestPolicy.RelayMode)
	require.EqualValues(t, 4, got.FeatureRevision)

	in = defaultRequestPolicy()
	in.Level = "medium"
	_, err = mergeConfig(Config{Mode: "disabled", RequestPolicy: &in, FeatureRevision: 3}, old)
	require.ErrorContains(t, err, "level")

	// A stored policy from before levels is written back with its level.
	legacy := defaultRequestPolicy()
	legacy.RelayMode = "direct"
	in = defaultRequestPolicy()
	in.RelayMode = "direct"
	got, err = mergeConfig(Config{Mode: "disabled", RequestPolicy: &in, FeatureRevision: 3}, Config{Mode: "disabled", RequestPolicy: &legacy, FeatureRevision: 3})
	require.NoError(t, err)
	require.Equal(t, features.LevelNone, got.RequestPolicy.Level)
	require.EqualValues(t, 3, got.FeatureRevision, "the migration alone is no change")
}

func TestFeatureOverridesLevel(t *testing.T) {
	var p0 FeatureOverrides
	require.Error(t, json.Unmarshal([]byte(`{"level":null}`), &p0))
	for _, raw := range []string{`{"level":""}`, `{"level":"medium"}`, `{"relay_mode":"native"}`} {
		var p FeatureOverrides
		require.NoError(t, json.Unmarshal([]byte(raw), &p), raw)
		require.Error(t, p.Validate(), raw)
	}
	var p FeatureOverrides
	require.NoError(t, json.Unmarshal([]byte(`{"level":"high","relay_mode":"direct"}`), &p))
	require.Equal(t, features.LevelHigh, *p.Level)
	out, _ := json.Marshal(p)
	require.JSONEq(t, `{"level":"high","relay_mode":"direct"}`, string(out), "stored as saved")
}
