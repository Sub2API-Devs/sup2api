package check

import (
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// controlsManifest is a valid account type declaring the given controls on
// a core that knows them.
func controlsManifest(controls map[string]manifest.AccountCommonControl) *manifest.Manifest {
	m := minimal()
	m.HostCompat = ">=" + SPMWindowFirstCore + " <0.2.0"
	m.Capabilities = []manifest.Capability{{ID: manifest.CapPlatformAdapter}}
	m.HostPermissions = []manifest.HostPermission{
		{ID: "gateway.endpoint"}, {ID: "platform.register"},
		{ID: "accounts.credentials", Scope: map[string]any{"types": "own"}},
	}
	m.Platforms = []manifest.Platform{validPlatform()}
	m.AccountTypes = []manifest.AccountType{{
		ID: "apikey", Label: manifest.LocalizedText{"en": "Key"},
		Form:           manifest.Form{Mode: "schema", Schema: "forms/k.json"},
		Platforms:      []manifest.AccountPlatform{{Platform: "video"}},
		CommonControls: controls,
	}}
	return m
}

func controlCodes(m *manifest.Manifest) map[string]string {
	return codes(Validate(m, map[string][]byte{"forms/k.json": []byte(`{}`)}, ValidateOptions{Tooling: true}))
}

func TestCommonControls(t *testing.T) {
	off, on := false, true
	d := func(s string) manifest.AccountCommonControl {
		return manifest.AccountCommonControl{Default: json.RawMessage(s)}
	}
	locked := func(s string) manifest.AccountCommonControl {
		return manifest.AccountCommonControl{Locked: true, Default: json.RawMessage(s)}
	}
	f := "accountTypes[0].commonControls."
	for _, tc := range []struct {
		name     string
		controls map[string]manifest.AccountCommonControl
		want     map[string]string // field → code; nil: valid
	}{
		{"every kind valid", map[string]manifest.AccountCommonControl{
			"schedulable": d(`false`), "auto_disable": {Configurable: &off},
			"priority": d(`1000000`), "weight": locked(`1`), "max_concurrency": d(`0`),
			"rpm_limit": d(`10`), "tpm_limit": d(`1000000000000`), "spm_limit": d(`5`), "spm_window_seconds": locked(`86400`),
			"model_limits":       d(`[{"models": ["video-2"], "max_concurrency": 2, "rpm_limit": 1}, {"models": ["video-3"], "spm_window_seconds": 3600}]`),
			"usage_limit":        locked(`{"enabled": true, "amount": "12.5", "period": "week", "period_count": 2, "timezone": "Asia/Shanghai"}`),
			"model_mapping":      d(`{"video-2": "video-2-260101"}`),
			"param_override":     locked(`{"temperature": 0.5}`),
			"header_passthrough": {Visible: &off, Default: json.RawMessage(`["x-foo", "regex:^x-bar-"]`)},
			"environment":        d(`{"relay_timeout_seconds": 600, "task_poll_max_failures": 0}`),
			"proxy":              {Required: true},
		}, nil},
		{"unknown name", map[string]manifest.AccountCommonControl{"status": {}}, map[string]string{f + "status": "unsupported"}},
		{"bool type", map[string]manifest.AccountCommonControl{"schedulable": d(`1`)}, map[string]string{f + "schedulable.default": "invalid"}},
		{"int type", map[string]manifest.AccountCommonControl{"priority": d(`1.5`)}, map[string]string{f + "priority.default": "invalid"}},
		{"int range", map[string]manifest.AccountCommonControl{"weight": d(`0`), "rpm_limit": d(`10000001`)},
			map[string]string{f + "weight.default": "invalid", f + "rpm_limit.default": "invalid"}},
		{"model limits", map[string]manifest.AccountCommonControl{"model_limits": d(`[{"models": ["video-*"], "spm_limit": -1, "spm_window_seconds": 59}, {"models": []}]`)},
			map[string]string{f + "model_limits.default[0].models[0]": "invalid", f + "model_limits.default[0].spm_limit": "invalid",
				f + "model_limits.default[0].spm_window_seconds": "invalid", f + "model_limits.default[1].models": "required"}},
		{"session window range", map[string]manifest.AccountCommonControl{"spm_window_seconds": d(`86401`)}, map[string]string{f + "spm_window_seconds.default": "invalid"}},
		{"model limits shape", map[string]manifest.AccountCommonControl{"model_limits": d(`[{"models": ["video-2"], "maxConcurrency": 1}]`)},
			map[string]string{f + "model_limits.default": "invalid"}},
		{"usage limit", map[string]manifest.AccountCommonControl{"usage_limit": d(`{"enabled": true, "period": "year", "anchor": "1999-01-01T00:00:00Z"}`)},
			map[string]string{f + "usage_limit.default.period": "invalid", f + "usage_limit.default.amount": "invalid",
				f + "usage_limit.default.anchor": "invalid", f + "usage_limit.default.timezone": "invalid"}},
		{"usage limit amount", map[string]manifest.AccountCommonControl{"usage_limit": d(`{"amount": 0.000000001, "period_count": 13, "timezone": "UTC"}`)},
			map[string]string{f + "usage_limit.default.amount": "invalid", f + "usage_limit.default.period_count": "invalid"}},
		{"mapping", map[string]manifest.AccountCommonControl{"model_mapping": d(`{"video-2": "video-*"}`)}, map[string]string{f + "model_mapping.default.video-2": "invalid"}},
		{"param override", map[string]manifest.AccountCommonControl{"param_override": d(`[1]`)}, map[string]string{f + "param_override.default": "invalid"}},
		{"header passthrough", map[string]manifest.AccountCommonControl{"header_passthrough": d(`["authorization"]`)}, map[string]string{f + "header_passthrough.default": "blocked"}},
		{"environment", map[string]manifest.AccountCommonControl{"environment": d(`{"max_request_body_mb": 8, "relay_timeout_seconds": 86401}`)},
			map[string]string{f + "environment.default.max_request_body_mb": "invalid", f + "environment.default.relay_timeout_seconds": "invalid"}},
		{"required outside proxy", map[string]manifest.AccountCommonControl{"priority": {Required: true}}, map[string]string{f + "priority.required": "unsupported"}},
		{"proxy takes only required", map[string]manifest.AccountCommonControl{"proxy": {Required: true, Locked: true}}, map[string]string{f + "proxy": "unsupported"}},
		{"locked without default", map[string]manifest.AccountCommonControl{"priority": {Locked: true}}, map[string]string{f + "priority.default": "required"}},
		{"locked and configurable", map[string]manifest.AccountCommonControl{"priority": {Locked: true, Configurable: &on, Default: json.RawMessage(`1`)}},
			map[string]string{f + "priority.configurable": "conflict"}},
	} {
		got := controlCodes(controlsManifest(tc.controls))
		if len(got) != len(tc.want) {
			t.Errorf("%s: codes %v, want %v", tc.name, got, tc.want)
			continue
		}
		for k, v := range tc.want {
			if got[k] != v {
				t.Errorf("%s: %s = %q, want %q (all: %v)", tc.name, k, got[k], v, got)
			}
		}
	}
}

// A default declared both in defaultLimits and commonControls must agree.
func TestCommonControlsDefaultLimitsConflict(t *testing.T) {
	prio := 5
	m := controlsManifest(map[string]manifest.AccountCommonControl{
		"priority":     {Default: json.RawMessage(`5`)},
		"model_limits": {Default: json.RawMessage(`[{"models": ["video-2"], "rpm_limit": 2, "spm_window_seconds": 60}]`)},
	})
	m.AccountTypes[0].DefaultLimits = &manifest.AccountDefaultLimits{Priority: &prio,
		ModelLimits: []manifest.DefaultModelLimit{{Models: []string{"video-2"}, RPMLimit: 2}}}
	if c := controlCodes(m); len(c) > 0 {
		t.Fatalf("equal defaults must be accepted: %v", c)
	}
	prio = 6
	m.AccountTypes[0].DefaultLimits.ModelLimits[0].RPMLimit = 3
	c := controlCodes(m)
	if c["accountTypes[0].commonControls.priority.default"] != "conflict" || c["accountTypes[0].commonControls.model_limits.default"] != "conflict" || len(c) != 2 {
		t.Fatalf("differing defaults must conflict: %v", c)
	}
}

// Controls an older core does not know need CommonControlsFirstCore; the
// legacy declaration (configurable and default of schedulable and
// auto_disable) does not.
func TestCommonControlsCoreFloor(t *testing.T) {
	off := false
	for _, tc := range []struct {
		name     string
		controls map[string]manifest.AccountCommonControl
		floor    bool
	}{
		{"legacy", map[string]manifest.AccountCommonControl{"schedulable": {Configurable: &off, Default: json.RawMessage(`true`)}}, false},
		{"new name", map[string]manifest.AccountCommonControl{"priority": {Default: json.RawMessage(`1`)}}, true},
		{"locked legacy name", map[string]manifest.AccountCommonControl{"schedulable": {Locked: true, Default: json.RawMessage(`true`)}}, true},
		{"hidden legacy name", map[string]manifest.AccountCommonControl{"auto_disable": {Visible: &off}}, true},
	} {
		m := controlsManifest(tc.controls)
		m.HostCompat = ">=0.1.261 <0.2.0" // the release before CommonControlsFirstCore
		if got := controlCodes(m)["hostCompat"] == "below_feature_core"; got != tc.floor {
			t.Errorf("%s: below_feature_core = %v, want %v", tc.name, got, tc.floor)
		}
	}
}

// Session windows (CONTRACTS §71.1) need SPMWindowFirstCore: the control,
// and a model_limits default naming a window.
func TestCommonControlsSPMWindowCoreFloor(t *testing.T) {
	for _, tc := range []struct {
		name     string
		controls map[string]manifest.AccountCommonControl
		floor    bool
	}{
		{"other controls", map[string]manifest.AccountCommonControl{"spm_limit": {Default: json.RawMessage(`1`)},
			"model_limits": {Default: json.RawMessage(`[{"models": ["video-2"], "spm_limit": 1}]`)}}, false},
		{"window control", map[string]manifest.AccountCommonControl{"spm_window_seconds": {Default: json.RawMessage(`300`)}}, true},
		{"list window", map[string]manifest.AccountCommonControl{"model_limits": {Default: json.RawMessage(`[{"models": ["video-2"], "spm_window_seconds": 300}]`)}}, true},
	} {
		m := controlsManifest(tc.controls)
		m.HostCompat = ">=" + CommonControlsFirstCore + " <0.2.0"
		if got := controlCodes(m)["hostCompat"] == "below_feature_core"; got != tc.floor {
			t.Errorf("%s: below_feature_core = %v, want %v", tc.name, got, tc.floor)
		}
	}
}
