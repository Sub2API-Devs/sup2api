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
	"github.com/stretchr/testify/require"
)

// levelInjectionBefore is features.LevelInjection with the system prompt rule
// from before 2026-11-02: the prompt, like the tools, only at high.
func levelInjectionBefore(level string, configured *features.BuildInjection) *features.BuildInjection {
	if !features.LevelHasEnvironment(level) {
		return nil
	}
	out := &features.BuildInjection{Attachments: map[string]bool{}}
	for _, name := range features.InjectionAttachments {
		out.Attachments[name] = true
	}
	if features.LevelHasTools(level) {
		on := true
		out.SystemPrompt = &on
		out.Tools = map[string]bool{}
		for _, name := range features.DefaultInjectionTools {
			out.Tools[name] = true
		}
	}
	if configured != nil {
		for name, on := range configured.Attachments {
			out.Attachments[name] = on
		}
		if features.LevelHasTools(level) {
			if configured.SystemPrompt != nil {
				value := *configured.SystemPrompt
				out.SystemPrompt = &value
			}
			for name, on := range configured.Tools {
				out.Tools[name] = on
			}
		}
	}
	return out.Effective()
}

// The system prompt became a choice at low on 2026-11-02 (user: low may add
// CC's two prompt blocks; on the edge cases below, "不管他"). Across global,
// group and account layers, legacy globals included, what the Worker is sent
// changes only for a policy that resolves to low with system_prompt
// explicitly true; that policy then adds the prompt on top of what it added,
// still no tool. Every other resolved policy sends what it sent. The two
// stored shapes that already resolve so, accepted and documented (CONTRACTS
// §53.22), are spelled out: (a) a policy lowered to low after its prompt
// layer was customized at high, and (b) an account lowering the level under
// a group at high that wrote the prompt.
func TestPromptAtLowChangesOnlyAnExplicitTrueAtLow(t *testing.T) {
	marshal := func(v any) string { out, _ := json.Marshal(v); return string(out) }
	on, off := true, false
	prompts := []*bool{nil, &off, &on}
	var globals []RequestPolicy
	for _, level := range append([]string{""}, features.RequestLevels...) {
		for _, prompt := range prompts {
			p := defaultRequestPolicy()
			p.Level = level
			p.BuildAttachmentSources = features.BuildAttachmentSources{"platform_name": "worker"}
			p.BuildInjection = &features.BuildInjection{SystemPrompt: prompt, Tools: map[string]bool{"Agent": true}}
			globals = append(globals, p)
		}
	}
	// Saved before levels: migrated by LegacyLevel with keepLegacyInjection.
	for _, raw := range []string{`null`, `{"system_prompt":true}`, `{"system_prompt":false,"attachments":{"date":true}}`, `{"tools":{"Read":true}}`} {
		legacy := defaultRequestPolicy()
		legacy.BuildAttachmentSources = features.BuildAttachmentSources{"os_version": "worker"}
		legacy.BuildInjection = levelInjection(t, raw)
		globals = append(globals, legacy)
	}
	var overrides []FeatureOverrides
	for _, level := range []*string{nil, featureString(features.LevelMicro), featureString(features.LevelLow), featureString(features.LevelHigh)} {
		for _, prompt := range prompts {
			o := FeatureOverrides{Level: level}
			if prompt != nil {
				o.BuildInjection = &features.BuildInjection{SystemPrompt: prompt}
			}
			overrides = append(overrides, o)
		}
	}
	changed, cases := 0, 0
	for _, global := range globals {
		for _, group := range overrides {
			for _, account := range overrides {
				cfg := Config{RequestPolicy: &global, CCFeatureGroups: map[string]GroupFeaturePolicy{"7": {Enabled: true, AllowAccountOverride: true, Overrides: group}}}
				r := cfg.ResolveFeaturePolicy(7, AccountFeaturePolicy{Mode: "custom", Overrides: account})
				level, injection := r.Effective.Level, r.Effective.BuildInjection
				before, after := levelInjectionBefore(level, injection), workerPolicy(r.Effective).BuildInjection
				where := marshal(global) + " / " + marshal(group) + " / " + marshal(account)
				cases++
				if level == features.LevelLow && injection != nil && injection.SystemPrompt != nil && *injection.SystemPrompt {
					changed++
					want := &features.BuildInjection{SystemPrompt: &on}
					if before != nil {
						want.Attachments = before.Attachments
					}
					require.Equal(t, marshal(want), marshal(after), where)
					continue
				}
				require.Equal(t, marshal(before), marshal(after), where)
			}
		}
	}
	require.Positive(t, changed)
	require.Greater(t, cases, changed)

	// (a) High with the prompt layer customized (system_prompt written), then lowered to low.
	lowered := defaultRequestPolicy()
	lowered.Level = features.LevelLow
	lowered.BuildInjection = levelInjection(t, `{"system_prompt":true,"tools":{"Bash":true,"Read":true,"Edit":true,"Write":true,"Agent":false}}`)
	require.JSONEq(t, `{"system_prompt":true,"attachments":{"environment":true,"model":true,"total_tokens":true,"date":true}}`, marshal(workerPolicy(lowered).BuildInjection))
	// (b) An account lowering the level under a group at high that wrote the prompt.
	global := defaultRequestPolicy()
	cfg := Config{RequestPolicy: &global, CCFeatureGroups: map[string]GroupFeaturePolicy{"7": {Enabled: true, AllowAccountOverride: true,
		Overrides: FeatureOverrides{Level: featureString(features.LevelHigh), BuildInjection: levelInjection(t, `{"system_prompt":true}`)}}}}
	r := cfg.ResolveFeaturePolicy(7, AccountFeaturePolicy{Mode: "custom", Overrides: FeatureOverrides{Level: featureString(features.LevelLow)}})
	require.Equal(t, "account", r.Sources["level"])
	require.True(t, *workerPolicy(r.Effective).BuildInjection.SystemPrompt)
	require.Empty(t, workerPolicy(r.Effective).BuildInjection.Tools)
}

// The tools official 2.1.316 sends on a session's first turn beyond the
// first five (features.InjectionToolsV2) reach only a Worker whose CLI
// declares build_injection_tools_v2; an account kept on an older CLI (2.1.312
// v41) gets the rest of its injection unchanged and is never refused for
// them.
func TestNewInjectionToolsOnlyReachACLIThatHasThem(t *testing.T) {
	p := features.WorkerPolicy{SchemaVersion: features.PolicySchemaVersion, RelayMode: "build",
		BuildInjection: levelInjection(t, `{"system_prompt":true,"attachments":{"date":true},"tools":{"Bash":true,"Skill":true,"ToolSearch":true}}`)}
	require.Contains(t, requestPolicyCapabilities(p), features.BuildInjectionToolsV2Capability)
	without := withConfirmedTools(p, []string{features.BuildInjectionCapability})
	require.JSONEq(t, `{"system_prompt":true,"attachments":{"date":true},"tools":{"Bash":true}}`, jsonOf(t, without.BuildInjection))
	require.NotContains(t, requestPolicyCapabilities(without), features.BuildInjectionToolsV2Capability)
	require.JSONEq(t, `{"Bash":true,"Skill":true,"ToolSearch":true}`, jsonOf(t, p.BuildInjection.Tools), "the policy given is not changed")
	require.Equal(t, p, withConfirmedTools(p, []string{features.BuildInjectionToolsV2Capability}))
	require.Nil(t, withConfirmedTools(features.WorkerPolicy{BuildInjection: levelInjection(t, `{"tools":{"Workflow":true}}`)}, nil).BuildInjection)

	for _, capable := range []bool{false, true} {
		var policies []string
		worker := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/healthz" {
				caps := []string{features.RequestPolicyModeCapability, features.RequestLevelsCapability, features.BuildContentPreservationCapability, features.BuildInjectionCapability}
				if capable {
					caps = append(caps, features.BuildInjectionToolsV2Capability)
				}
				_ = json.NewEncoder(w).Encode(map[string]any{"status": "ok", "claude_version": "2.1.312", "capabilities": caps})
				return
			}
			policies = append(policies, r.Header.Get(features.PolicyHeader))
			_, _ = w.Write([]byte(`{}`))
		}))
		t.Setenv("CCGATEWAY_URL", worker.URL)
		global := defaultRequestPolicy()
		global.Level, global.CLIVersion = features.LevelHigh, "2.1.312"
		global.BuildInjection = levelInjection(t, `{"tools":{"Skill":true,"ToolSearch":true,"Bash":false}}`)
		svc := &Service{}
		svc.cache.cfg = keptConfig(Config{Mode: "local", APIKey: "worker-key", RequestPolicy: &global}, time.Now())
		req, err := http.NewRequestWithContext(context.Background(), "POST", VirtualURL, strings.NewReader(`{}`))
		require.NoError(t, err)
		res, err := svc.ModelClientForRequest(ModelRequestContext{}).Do(req)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, res.StatusCode, "never refused for the new tools")
		_, _ = io.Copy(io.Discard, res.Body)
		res.Body.Close()
		require.Len(t, policies, 1)
		var sent features.WorkerPolicy
		require.NoError(t, json.Unmarshal([]byte(policies[0]), &sent))
		require.NotNil(t, sent.BuildInjection.SystemPrompt)
		require.Len(t, sent.BuildInjection.Attachments, len(features.InjectionAttachments))
		if capable {
			require.Equal(t, map[string]bool{"Read": true, "Edit": true, "Write": true, "Skill": true, "ToolSearch": true}, sent.BuildInjection.Tools)
		} else {
			require.Equal(t, map[string]bool{"Read": true, "Edit": true, "Write": true}, sent.BuildInjection.Tools)
		}
		worker.Close()
	}
}

func jsonOf(t *testing.T, v any) string {
	t.Helper()
	out, err := json.Marshal(v)
	require.NoError(t, err)
	return string(out)
}
