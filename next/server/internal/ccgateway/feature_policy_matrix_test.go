package ccgateway

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

// This is the public field vocabulary under test, deliberately independent
// from the production list so accidental omission from that list fails here.
var matrixEnvironmentFields = []string{
	"platform_name", "os_version", "shell", "primary_directory",
	"additional_directories", "git_repository", "worktree",
	"scratchpad_directory", "github_cli", "agent_proxy",
}

type matrixField struct {
	path    string
	sources []string
}

func matrixFields() []matrixField {
	var fields []matrixField
	for _, key := range matrixEnvironmentFields {
		fields = append(fields, matrixField{"build_attachment_sources." + key, []string{"client", "worker", "erase"}})
	}
	for _, key := range []string{"cc_version", "cc_entrypoint"} {
		fields = append(fields, matrixField{"build_billing_sources." + key, []string{"client", "worker"}})
	}
	return fields
}

func matrixOverride(field, value string) FeatureOverrides {
	o := FeatureOverrides{}
	if value == "inherit" {
		return o
	}
	section, key, _ := strings.Cut(field, ".")
	if section == "build_attachment_sources" {
		o.BuildAttachmentSources = features.BuildAttachmentSources{key: value}
	} else {
		o.BuildBillingSources = features.BuildBillingSources{key: value}
	}
	return o
}

func matrixValue(p RequestPolicy, field string) string {
	section, key, _ := strings.Cut(field, ".")
	value := p.BuildAttachmentSources[key]
	if section == "build_billing_sources" {
		value = p.BuildBillingSources[key]
	}
	if value == "" {
		return "client"
	}
	return value
}

func matrixGlobal(field, value string) RequestPolicy {
	p := defaultRequestPolicy()
	o := matrixOverride(field, value)
	p.BuildAttachmentSources = o.BuildAttachmentSources
	p.BuildBillingSources = o.BuildBillingSources
	return p
}

// 10 * 3 * 4 * 4 * 4 * 2 + 2 * 2 * 3 * 3 * 4 * 2 = 4,128 cases:
// every global source, sparse group/account value, both group gates and modes.
func TestFeatureSourceInheritanceExhaustiveMatrix(t *testing.T) {
	cases := 0
	for _, field := range matrixFields() {
		sparse := append([]string{"inherit"}, field.sources...)
		for _, global := range field.sources {
			for _, group := range sparse {
				for _, account := range sparse {
					for _, enabled := range []bool{false, true} {
						for _, allow := range []bool{false, true} {
							for _, mode := range []string{"follow", "custom"} {
								name := fmt.Sprintf("%s/global=%s/group=%s/account=%s/enabled=%t/allow=%t/%s", field.path, global, group, account, enabled, allow, mode)
								t.Run(name, func(t *testing.T) {
									p := matrixGlobal(field.path, global)
									cfg := Config{RequestPolicy: &p, CCFeatureGroups: map[string]GroupFeaturePolicy{
										"7": {Enabled: enabled, AllowAccountOverride: allow, Overrides: matrixOverride(field.path, group)},
									}}
									ap := AccountFeaturePolicy{Mode: mode, Overrides: matrixOverride(field.path, account)}
									before, _ := json.Marshal([]any{cfg, ap})
									want, inherited, origin := global, global, "global"
									if enabled && group != "inherit" {
										want, inherited, origin = group, group, "group"
									}
									if (!enabled || allow) && mode == "custom" && account != "inherit" {
										want, origin = account, "account"
									}
									r := cfg.ResolveFeaturePolicy(7, ap)
									require.Equal(t, want, matrixValue(r.Effective, field.path))
									require.Equal(t, inherited, matrixValue(r.Inherited, field.path))
									require.Equal(t, origin, r.Sources[field.path])
									require.Equal(t, !enabled || allow, r.Editable)
									require.NoError(t, validateRequestPolicy(r.Effective))
									for _, other := range matrixFields() {
										if other.path != field.path {
											require.Equal(t, "client", matrixValue(r.Effective, other.path), other.path)
											require.Equal(t, "global", r.Sources[other.path], other.path)
										}
									}
									after, _ := json.Marshal([]any{cfg, ap})
									require.JSONEq(t, string(before), string(after), "resolving must not mutate stored policies")
								})
								cases++
							}
						}
					}
				}
			}
		}
	}
	require.Equal(t, 4128, cases)
}

func TestFeatureMissingGroupPolicyAllowsAccountsButNoRequestGroupStaysGlobal(t *testing.T) {
	cases := 0
	for _, field := range matrixFields() {
		for _, global := range field.sources {
			for _, account := range field.sources {
				for _, groupID := range []int64{0, 999} {
					p := matrixGlobal(field.path, global)
					cfg := Config{RequestPolicy: &p, CCFeatureGroups: map[string]GroupFeaturePolicy{
						"7": {Enabled: true, AllowAccountOverride: true, Overrides: matrixOverride(field.path, "worker")},
					}}
					ap := AccountFeaturePolicy{Mode: "custom", Overrides: matrixOverride(field.path, account)}
					r := cfg.ResolveFeaturePolicy(groupID, ap)
					want, origin := global, "global"
					if groupID > 0 {
						want, origin = account, "account"
					}
					require.Equal(t, want, matrixValue(r.Effective, field.path), field.path)
					require.Equal(t, origin, r.Sources[field.path])
					require.Equal(t, groupID > 0, r.Editable)
					cases++
				}
			}
		}
	}
	require.Equal(t, 196, cases)
}

func TestFeatureMixedFieldsHaveIndependentInheritance(t *testing.T) {
	p := defaultRequestPolicy()
	p.BuildAttachmentSources = features.BuildAttachmentSources{}
	group, account := FeatureOverrides{BuildAttachmentSources: features.BuildAttachmentSources{}}, FeatureOverrides{BuildAttachmentSources: features.BuildAttachmentSources{}}
	for i, key := range matrixEnvironmentFields {
		p.BuildAttachmentSources[key] = "worker"
		if i%3 != 0 {
			group.BuildAttachmentSources[key] = "erase"
		}
		if i%3 == 2 {
			account.BuildAttachmentSources[key] = "client"
		}
	}
	p.BuildBillingSources = features.BuildBillingSources{"cc_version": "worker", "cc_entrypoint": "client"}
	group.BuildBillingSources = features.BuildBillingSources{"cc_version": "client", "cc_entrypoint": "worker"}
	account.BuildBillingSources = features.BuildBillingSources{"cc_entrypoint": "client"}
	cfg := Config{RequestPolicy: &p, CCFeatureGroups: map[string]GroupFeaturePolicy{"7": {Enabled: true, AllowAccountOverride: true, Overrides: group}}}
	r := cfg.ResolveFeaturePolicy(7, AccountFeaturePolicy{Mode: "custom", Overrides: account})
	for i, key := range matrixEnvironmentFields {
		require.Equal(t, []string{"worker", "erase", "client"}[i%3], r.Effective.BuildAttachmentSources[key])
		require.Equal(t, []string{"global", "group", "account"}[i%3], r.Sources["build_attachment_sources."+key])
	}
	require.Equal(t, "client", r.Effective.BuildBillingSources["cc_version"])
	require.Equal(t, "group", r.Sources["build_billing_sources.cc_version"])
	require.Equal(t, "client", r.Effective.BuildBillingSources["cc_entrypoint"])
	require.Equal(t, "account", r.Sources["build_billing_sources.cc_entrypoint"])
}

func TestFeatureScalarSettingsAcrossAllLayers(t *testing.T) {
	fields := []struct {
		key    string
		values []string
		set    func(*FeatureOverrides, *string)
		get    func(RequestPolicy) string
	}{
		{"relay_mode", []string{"build", "direct"}, func(o *FeatureOverrides, v *string) { o.RelayMode = v }, func(p RequestPolicy) string { return p.RelayMode }},
		{"unknown_field", []string{"reject", "ignore"}, func(o *FeatureOverrides, v *string) { o.UnknownField = v }, func(p RequestPolicy) string { return p.UnknownField }},
		{"tool_search", []string{"request", "false", "true", "auto", "auto:0", "auto:50", "auto:100"}, func(o *FeatureOverrides, v *string) { o.ToolSearch = v }, func(p RequestPolicy) string { return p.ToolSearch }},
		{"thinking_disabled_compat", []string{"pass", "omit"}, func(o *FeatureOverrides, v *string) { o.ThinkingDisabledCompat = v }, func(p RequestPolicy) string { return p.ThinkingDisabledCompat }},
		{"custom_tool_prefix", []string{"ccgateway", "account-tools", "mixed_1"}, func(o *FeatureOverrides, v *string) { o.CustomToolPrefix = v }, func(p RequestPolicy) string { return p.CustomToolPrefix }},
	}
	cases := 0
	for _, field := range fields {
		for _, value := range field.values {
			for _, origin := range []string{"global", "group", "account"} {
				t.Run(field.key+"/"+value+"/"+origin, func(t *testing.T) {
					p := defaultRequestPolicy()
					global, group, account := FeatureOverrides{}, FeatureOverrides{}, FeatureOverrides{}
					switch origin {
					case "global":
						field.set(&global, featureString(value))
					case "group":
						field.set(&group, featureString(value))
					case "account":
						field.set(&account, featureString(value))
					}
					// Global storage uses the full RequestPolicy representation.
					if origin == "global" {
						raw, _ := json.Marshal(global)
						require.NoError(t, json.Unmarshal(raw, &p))
					}
					cfg := Config{RequestPolicy: &p, CCFeatureGroups: map[string]GroupFeaturePolicy{"7": {Enabled: true, AllowAccountOverride: true, Overrides: group}}}
					resolved := cfg.ResolveFeaturePolicy(7, AccountFeaturePolicy{Mode: "custom", Overrides: account})
					require.Equal(t, value, field.get(resolved.Effective))
					require.Equal(t, origin, resolved.Sources[field.key])
					require.Equal(t, "2.1.304", resolved.Effective.CLIVersion)
					wire, err := (&Service{}).resolvedWorkerPolicy(context.Background(), Config{RequestPolicy: &resolved.Effective}, 0, 0)
					require.NoError(t, err)
					require.Equal(t, value, field.get(wire))
					require.NoError(t, validateRequestPolicy(wire))
				})
				cases++
			}
		}
	}
	require.Equal(t, 48, cases)
}

type matrixRepresentative struct {
	Name            string
	Field           string
	ExpectedSource  string
	ExpectedSources map[string]string
	ExpectedOrigin  string
	ExpectedMode    string
	Config          Config
	Account         AccountFeaturePolicy
	GroupID         int64
}

func representativeFeatureCases() []matrixRepresentative {
	var cases []matrixRepresentative
	for _, field := range matrixFields() {
		for _, source := range field.sources {
			p := defaultRequestPolicy()
			cases = append(cases, matrixRepresentative{
				Name: strings.ReplaceAll(field.path, ".", "-") + "-" + source, Field: field.path,
				ExpectedSource: source, ExpectedOrigin: "account", ExpectedMode: "build", GroupID: 7,
				Config: Config{RequestPolicy: &p, CCFeatureGroups: map[string]GroupFeaturePolicy{
					"7": {Enabled: true, AllowAccountOverride: true, Overrides: matrixOverride(field.path, "worker")},
				}},
				Account: AccountFeaturePolicy{Mode: "custom", Overrides: matrixOverride(field.path, source)},
			})
		}
	}
	for _, version := range []string{"client", "worker"} {
		for _, entry := range []string{"client", "worker"} {
			p := defaultRequestPolicy()
			cases = append(cases, matrixRepresentative{
				Name: "billing-combination-" + version + "-" + entry, Field: "build_billing_sources",
				ExpectedSources: map[string]string{"cc_version": version, "cc_entrypoint": entry}, ExpectedOrigin: "account", ExpectedMode: "build", GroupID: 7,
				Config:  Config{RequestPolicy: &p, CCFeatureGroups: map[string]GroupFeaturePolicy{"7": {Enabled: true, AllowAccountOverride: true}}},
				Account: AccountFeaturePolicy{Mode: "custom", Overrides: FeatureOverrides{BuildBillingSources: features.BuildBillingSources{"cc_version": version, "cc_entrypoint": entry}}},
			})
		}
	}
	field := "build_attachment_sources.shell"
	for _, enabled := range []bool{false, true} {
		for _, allow := range []bool{false, true} {
			for _, mode := range []string{"follow", "custom"} {
				p := matrixGlobal(field, "client")
				want, origin := "client", "global"
				if enabled {
					want, origin = "worker", "group"
				}
				if (!enabled || allow) && mode == "custom" {
					want, origin = "erase", "account"
				}
				cases = append(cases, matrixRepresentative{Name: fmt.Sprintf("gates-enabled-%t-allow-%t-%s", enabled, allow, mode),
					Field: field, ExpectedSource: want, ExpectedOrigin: origin, ExpectedMode: "build", GroupID: 7,
					Config:  Config{RequestPolicy: &p, CCFeatureGroups: map[string]GroupFeaturePolicy{"7": {Enabled: enabled, AllowAccountOverride: allow, Overrides: matrixOverride(field, "worker")}}},
					Account: AccountFeaturePolicy{Mode: mode, Overrides: matrixOverride(field, "erase")},
				})
			}
		}
	}
	for _, origin := range []string{"global", "group", "account"} {
		p := matrixGlobal(field, "worker")
		cfg := Config{RequestPolicy: &p, CCFeatureGroups: map[string]GroupFeaturePolicy{"7": {Enabled: true, AllowAccountOverride: true}}}
		ap := AccountFeaturePolicy{Mode: "custom"}
		if origin == "group" {
			g := cfg.CCFeatureGroups["7"]
			g.Overrides = matrixOverride(field, "worker")
			cfg.CCFeatureGroups["7"] = g
		}
		if origin == "account" {
			ap.Overrides = matrixOverride(field, "worker")
		}
		cases = append(cases, matrixRepresentative{Name: "origin-" + origin, Field: field, ExpectedSource: "worker", ExpectedOrigin: origin, ExpectedMode: "build", GroupID: 7, Config: cfg, Account: ap})
	}
	for _, groupID := range []int64{0, 999} {
		p := matrixGlobal(field, "client")
		want, origin := "client", "global"
		if groupID > 0 {
			want, origin = "erase", "account"
		}
		cases = append(cases, matrixRepresentative{Name: fmt.Sprintf("missing-request-group-%d", groupID), Field: field,
			ExpectedSource: want, ExpectedOrigin: origin, ExpectedMode: "build", GroupID: groupID,
			Config:  Config{RequestPolicy: &p, CCFeatureGroups: map[string]GroupFeaturePolicy{"7": {Enabled: true, AllowAccountOverride: true, Overrides: matrixOverride(field, "worker")}}},
			Account: AccountFeaturePolicy{Mode: "custom", Overrides: matrixOverride(field, "erase")},
		})
	}
	for _, where := range []string{"global", "group", "account", "account-build-over-group-direct"} {
		p := matrixGlobal(field, "worker")
		g := GroupFeaturePolicy{Enabled: true, AllowAccountOverride: true}
		ap := AccountFeaturePolicy{Mode: "custom"}
		wantMode := "direct"
		switch where {
		case "global":
			p.RelayMode = "direct"
		case "group":
			g.Overrides.RelayMode = featureString("direct")
		case "account":
			ap.Overrides.RelayMode = featureString("direct")
		default:
			g.Overrides.RelayMode = featureString("direct")
			ap.Overrides.RelayMode = featureString("build")
			wantMode = "build"
		}
		cases = append(cases, matrixRepresentative{Name: "mode-" + where, Field: field, ExpectedSource: "worker", ExpectedOrigin: "global", ExpectedMode: wantMode,
			Config: Config{RequestPolicy: &p, CCFeatureGroups: map[string]GroupFeaturePolicy{"7": g}}, Account: ap, GroupID: 7})
	}
	return cases
}

// Optional evidence export bridges these actual Go resolver results into the
// separate actual Worker -> CLI -> HTTP harness. No hand-authored policy JSON.
func TestFeatureConfigurationRepresentativeExport(t *testing.T) {
	type evidenceCase struct {
		Name            string            `json:"name"`
		Field           string            `json:"field"`
		ExpectedSource  string            `json:"expected_source,omitempty"`
		ExpectedSources map[string]string `json:"expected_sources,omitempty"`
		ExpectedOrigin  string            `json:"expected_origin"`
		ExpectedMode    string            `json:"expected_mode"`
		WorkerPolicy    RequestPolicy     `json:"worker_policy"`
		Effective       RequestPolicy     `json:"effective"`
		Sources         map[string]string `json:"sources"`
	}
	var evidence []evidenceCase
	for _, tc := range representativeFeatureCases() {
		t.Run(tc.Name, func(t *testing.T) {
			r := tc.Config.ResolveFeaturePolicy(tc.GroupID, tc.Account)
			if tc.ExpectedSources != nil {
				for key, source := range tc.ExpectedSources {
					require.Equal(t, source, matrixValue(r.Effective, tc.Field+"."+key))
					require.Equal(t, tc.ExpectedOrigin, r.Sources[tc.Field+"."+key])
				}
			} else {
				require.Equal(t, tc.ExpectedSource, matrixValue(r.Effective, tc.Field))
				require.Equal(t, tc.ExpectedOrigin, r.Sources[tc.Field])
			}
			require.Equal(t, tc.ExpectedMode, r.Effective.RelayMode)
			// Feed the actual resolved result through the real wire finalizer;
			// group/account application already occurred above, no DB is needed.
			wire, err := (&Service{}).resolvedWorkerPolicy(context.Background(), Config{RequestPolicy: &r.Effective}, 0, 0)
			require.NoError(t, err)
			if tc.ExpectedMode == "direct" {
				require.Nil(t, wire.BuildAttachmentSources)
				require.Nil(t, wire.BuildBillingSources)
				require.Equal(t, []string{features.RequestPolicyModeCapability}, requestPolicyCapabilities(wire))
			}
			evidence = append(evidence, evidenceCase{tc.Name, tc.Field, tc.ExpectedSource, tc.ExpectedSources, tc.ExpectedOrigin, tc.ExpectedMode, wire, r.Effective, r.Sources})
		})
	}
	require.Len(t, evidence, 55)
	if output := os.Getenv("CCG_POLICY_MATRIX_OUTPUT"); output != "" {
		require.True(t, filepath.IsAbs(output), "matrix output must be an explicit absolute artifact path")
		data, err := json.MarshalIndent(map[string]any{"schema_version": 1, "cli_version": "2.1.304", "cases": evidence}, "", "  ")
		require.NoError(t, err)
		require.NoError(t, os.WriteFile(output, append(data, '\n'), 0600))
	}
}
