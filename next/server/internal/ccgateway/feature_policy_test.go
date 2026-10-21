package ccgateway

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/require"
)

func featureString(v string) *string { return &v }

func TestFeatureLayersResolve(t *testing.T) {
	global := defaultRequestPolicy()
	global.BuildAttachmentSources = features.BuildAttachmentSources{"platform_name": "worker"}
	cfg := Config{RequestPolicy: &global, FeatureRevision: 4, CCFeatureGroups: map[string]GroupFeaturePolicy{
		"1": {Enabled: true, AllowAccountOverride: true, Overrides: FeatureOverrides{BuildAttachmentSources: features.BuildAttachmentSources{"os_version": "erase"}}},
		"2": {Enabled: true, AllowAccountOverride: false, Overrides: FeatureOverrides{RelayMode: featureString("direct")}},
		"3": {Enabled: false, AllowAccountOverride: true, Overrides: FeatureOverrides{RelayMode: featureString("direct")}},
	}}
	account := AccountFeaturePolicy{Mode: "custom", Revision: 7, Overrides: FeatureOverrides{
		BuildAttachmentSources: features.BuildAttachmentSources{"platform_name": "client"}, BuildBillingSources: features.BuildBillingSources{"cc_version": "worker"},
	}}
	got := cfg.ResolveFeaturePolicy(1, account)
	require.True(t, got.Editable)
	require.Equal(t, "client", got.Effective.BuildAttachmentSources["platform_name"])
	require.Equal(t, "erase", got.Effective.BuildAttachmentSources["os_version"])
	require.Equal(t, "client", got.Effective.BuildAttachmentSources["shell"])
	require.Equal(t, "worker", got.Inherited.BuildAttachmentSources["platform_name"])
	require.Equal(t, "account", got.Sources["build_billing_sources.cc_version"])
	require.Equal(t, "group", got.Sources["build_attachment_sources.os_version"])
	require.Equal(t, "global", got.Sources["build_attachment_sources.shell"])
	require.Equal(t, "4:1:7", got.PolicyRevision)
	for _, tc := range []struct {
		id           int64
		mode, reason string
	}{{0, "build", "no_group"}, {2, "direct", "account_override_disabled"}} {
		r := cfg.ResolveFeaturePolicy(tc.id, account)
		require.False(t, r.Editable)
		require.Equal(t, tc.reason, r.DisabledReason)
		require.Equal(t, tc.mode, r.Effective.RelayMode)
		require.Equal(t, "worker", r.Effective.BuildAttachmentSources["platform_name"])
		require.Equal(t, "client", r.Effective.BuildBillingSources["cc_version"])
	}
	for _, id := range []int64{3, 4} {
		r := cfg.ResolveFeaturePolicy(id, account)
		require.True(t, r.Editable)
		require.Empty(t, r.DisabledReason)
		require.Equal(t, "build", r.Effective.RelayMode)
		require.Equal(t, "client", r.Effective.BuildAttachmentSources["platform_name"])
		require.Equal(t, "worker", r.Effective.BuildBillingSources["cc_version"])
		require.Equal(t, "account", r.Sources["build_billing_sources.cc_version"])
	}
	// Neither preview nor the next account can mutate cached global maps.
	got.Effective.BuildAttachmentSources["platform_name"] = "erase"
	require.Equal(t, "worker", global.BuildAttachmentSources["platform_name"])
	require.Equal(t, "worker", got.Inherited.BuildAttachmentSources["platform_name"])
}

func TestFeatureConfigRevisionAndOmission(t *testing.T) {
	p := defaultRequestPolicy()
	p.BuildBillingSources = features.BuildBillingSources{"cc_entrypoint": "worker"}
	old := Config{Mode: "disabled", RequestPolicy: &p, FeatureRevision: 8, CCFeatureGroups: map[string]GroupFeaturePolicy{"7": {Enabled: true}}}
	got, err := mergeConfig(Config{Mode: "disabled"}, old)
	require.NoError(t, err)
	require.Equal(t, old.FeatureRevision, got.FeatureRevision)
	require.Equal(t, old.CCFeatureGroups, got.CCFeatureGroups)
	require.Equal(t, p.BuildBillingSources, got.RequestPolicy.BuildBillingSources)
	draft := got
	draft.CCFeatureGroups = map[string]GroupFeaturePolicy{}
	draft.FeatureRevision = 7
	_, err = mergeConfig(draft, old)
	require.Equal(t, "conflict", core.AsError(err).Code)
	draft.FeatureRevision = 8
	cleared, err := mergeConfig(draft, old)
	require.NoError(t, err)
	require.Empty(t, cleared.CCFeatureGroups)
	require.EqualValues(t, 9, cleared.FeatureRevision)
	require.True(t, sameRuntimeConfig(got, cleared))
	p2 := *got.RequestPolicy
	p2.RelayMode = "direct"
	cleared.RequestPolicy = &p2
	require.True(t, sameRuntimeConfig(got, cleared))
}

func TestFeatureOverridesRejectUnsupportedAndEmpty(t *testing.T) {
	for _, raw := range []string{`{"cli_version":"2.1.304"}`, `{"relay_mode":""}`, `{"build_attachment_sources":{"shell":"follow"}}`, `{"build_billing_sources":{"cc_version":"erase"}}`, `null`} {
		var p FeatureOverrides
		require.Error(t, json.Unmarshal([]byte(raw), &p), raw)
	}
	var p FeatureOverrides
	require.NoError(t, json.Unmarshal([]byte(`{"build_attachment_sources":{"shell":"erase"},"build_billing_sources":{"cc_version":"worker"}}`), &p))
}

func TestFeatureRequiredCapabilities(t *testing.T) {
	p := defaultRequestPolicy()
	p.BuildAttachmentSources = features.BuildAttachmentSources{"shell": "erase"}
	p.BuildBillingSources = features.BuildBillingSources{"cc_version": "worker"}
	required := requestPolicyCapabilities(p)
	require.Contains(t, required, features.BuildAttachmentCapabilityV2)
	require.Contains(t, required, features.BuildContentPreservationCapability)
	require.Contains(t, required, features.BuildBillingCapability)
	p.RelayMode = "direct"
	require.Equal(t, []string{features.RequestPolicyModeCapability}, requestPolicyCapabilities(p))
	// Only an identity source other than the default needs the identity CLI.
	p.RequestIdentitySources = features.RequestIdentitySources{"user_id": "worker"}
	require.Contains(t, requestPolicyCapabilities(p), features.RequestIdentityCapability)
	p.RelayMode = ""
	require.Contains(t, requestPolicyCapabilities(p), features.RequestIdentityCapability)
	for _, source := range []string{"client", ""} {
		p.RequestIdentitySources = features.RequestIdentitySources{"user_id": source}
		require.NotContains(t, requestPolicyCapabilities(p), features.RequestIdentityCapability, source)
	}
}

// The identity is not configurable (2026-10-21 decision): no source reaches
// the wire in either relay mode, including one stored before that decision.
func TestWirePolicyNeverSendsIdentity(t *testing.T) {
	svc := &Service{}
	for _, mode := range []string{"build", "direct"} {
		cfg := Config{RequestPolicy: ptrPolicy(defaultRequestPolicy())}
		cfg.RequestPolicy.RelayMode = mode
		p, err := svc.resolvedWorkerPolicy(context.Background(), cfg, 0, 0)
		require.NoError(t, err)
		require.Empty(t, p.RequestIdentitySources, mode)
		raw, err := json.Marshal(p)
		require.NoError(t, err)
		require.NotContains(t, string(raw), "request_identity_sources", mode)
		require.Equal(t, "replace", cfg.ResolveFeaturePolicy(0, AccountFeaturePolicy{}).Effective.RequestIdentitySources["user_id"], "the preview still shows the applied default")

		for _, source := range []string{features.RequestIdentityDefault, "client", "worker"} {
			cfg.RequestPolicy.RequestIdentitySources = features.RequestIdentitySources{"user_id": source}
			p, err = svc.resolvedWorkerPolicy(context.Background(), cfg, 0, 0)
			require.NoError(t, err)
			require.Nil(t, p.RequestIdentitySources, mode+"/"+source)
		}
	}
}

// A global save that omits a source map keeps the stored one; {} resets it.
func TestGlobalSavePreservesOmittedIdentitySources(t *testing.T) {
	stored := defaultRequestPolicy()
	stored.RequestIdentitySources = features.RequestIdentitySources{"user_id": "client"}
	stored.BuildBillingSources = features.BuildBillingSources{"cc_version": "worker"}
	old := Config{Mode: "disabled", RequestPolicy: &stored, FeatureRevision: 3}
	in := defaultRequestPolicy()
	in.RequestIdentitySources, in.BuildBillingSources = nil, nil
	got, err := mergeConfig(Config{Mode: "disabled", RequestPolicy: &in, FeatureRevision: 3}, old)
	require.NoError(t, err)
	require.Equal(t, stored.RequestIdentitySources, got.RequestPolicy.RequestIdentitySources)
	require.Equal(t, stored.BuildBillingSources, got.RequestPolicy.BuildBillingSources)
	reset := defaultRequestPolicy()
	reset.RequestIdentitySources = features.RequestIdentitySources{}
	got, err = mergeConfig(Config{Mode: "disabled", RequestPolicy: &reset, FeatureRevision: 3}, old)
	require.NoError(t, err)
	require.Empty(t, got.RequestPolicy.RequestIdentitySources)
}

func TestAccountFeaturePolicyRevisionAndClear(t *testing.T) {
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) { http.NotFound(w, r) })
	id := f.account(false)
	ctx := context.Background()
	save := func(p AccountFeaturePolicy) error {
		return f.db.Tx(ctx, func(tx pgx.Tx) error {
			var locked int64
			if err := tx.QueryRow(ctx, "SELECT id FROM accounts WHERE id=$1 FOR UPDATE", id).Scan(&locked); err != nil {
				return err
			}
			return SaveAccountFeaturePolicyTx(ctx, tx, id, p)
		})
	}
	p := AccountFeaturePolicy{Mode: "custom", Overrides: FeatureOverrides{
		RelayMode: featureString("direct"), UnknownField: featureString("ignore"),
		ToolSearch: featureString("auto:50"), ThinkingDisabledCompat: featureString("omit"),
		CustomToolPrefix:       featureString("account-tools"),
		BuildAttachmentSources: features.BuildAttachmentSources{},
		BuildBillingSources:    features.BuildBillingSources{"cc_version": "worker", "cc_entrypoint": "worker"},
	}}
	for _, field := range matrixEnvironmentFields {
		p.Overrides.BuildAttachmentSources[field] = "erase"
	}
	require.NoError(t, save(p))
	require.Equal(t, "conflict", core.AsError(save(p)).Code)
	read, err := LoadAccountFeaturePolicy(ctx, f.db.Pool, id)
	require.NoError(t, err)
	require.EqualValues(t, 1, read.Revision)
	require.Len(t, read.Overrides.BuildAttachmentSources, 10)
	require.Len(t, read.Overrides.BuildBillingSources, 2)
	for _, group := range []*GroupFeaturePolicy{nil, {Enabled: false, AllowAccountOverride: false}} {
		cfg := Config{RequestPolicy: ptrPolicy(defaultRequestPolicy())}
		if group != nil {
			cfg.CCFeatureGroups = map[string]GroupFeaturePolicy{"7": *group}
		}
		wire, err := f.s.resolvedWorkerPolicy(ctx, cfg, id, 7)
		require.NoError(t, err)
		require.Equal(t, "direct", wire.RelayMode, "load the saved account override without enabled group settings")
		require.Equal(t, "account-tools", wire.CustomToolPrefix)
		require.Empty(t, wire.BuildBillingSources, "direct still omits content transformations")
	}
	read.Mode = "follow"
	require.NoError(t, save(read))
	read, err = LoadAccountFeaturePolicy(ctx, f.db.Pool, id)
	require.NoError(t, err)
	require.EqualValues(t, 2, read.Revision)
	require.Equal(t, FeatureOverrides{}, read.Overrides)
}

func TestFeatureModeUsesAuthenticatedGroup(t *testing.T) {
	svc := &Service{}
	mode := "direct"
	cfg := Config{RequestPolicy: ptrPolicy(defaultRequestPolicy()), CCFeatureGroups: map[string]GroupFeaturePolicy{"8": {Enabled: true, Overrides: FeatureOverrides{RelayMode: &mode}}}}
	p, err := svc.resolvedWorkerPolicy(context.Background(), cfg, 21, 8)
	require.NoError(t, err)
	require.Equal(t, "direct", p.RelayMode)
	require.Nil(t, p.BuildAttachmentSources)
	require.Nil(t, p.BuildBillingSources)
	p, err = svc.resolvedWorkerPolicy(context.Background(), cfg, 21, 0)
	require.NoError(t, err)
	require.Equal(t, "build", p.RelayMode)
	transport := svc.ModelClientForRequest(ModelRequestContext{AccountID: 21, GroupID: 8}).Transport.(modelTransport)
	require.EqualValues(t, 8, transport.groupID)
	require.EqualValues(t, 21, transport.accountID)
}

func ptrPolicy(p RequestPolicy) *RequestPolicy { return &p }

func TestFeaturePreviewPermissionsAndNoWorker(t *testing.T) {
	calls := 0
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) { calls++; http.NotFound(w, r) })
	ctx := context.Background()
	uid := f.user("owner@test")
	outsider := f.user("other@test")
	f.auth.keys[uid] = []string{"account:own:read", "account:own:update"}
	f.auth.keys[outsider] = []string{"account:own:read", "account:own:update"}
	id := f.account(false)
	_, err := f.db.Pool.Exec(ctx, "UPDATE accounts SET created_by=$1 WHERE id=$2", uid, id)
	require.NoError(t, err)
	var gid int64
	require.NoError(t, f.db.Pool.QueryRow(ctx, "INSERT INTO groups(name) VALUES('preview') RETURNING id").Scan(&gid))
	_, err = f.db.Pool.Exec(ctx, "INSERT INTO account_groups(account_id,group_id) VALUES($1,$2)", id, gid)
	require.NoError(t, err)
	code, out := f.callAs(uid, "GET", id, "cc-features?group_id="+strconv.FormatInt(gid, 10), "")
	require.Equal(t, 200, code, out)
	require.Equal(t, "", data(out)["disabled_reason"])
	require.Equal(t, true, data(out)["editable"])
	code, _ = f.callAs(outsider, "GET", id, "cc-features", "")
	require.Equal(t, 404, code)
	code, _ = f.callAs(uid, "GET", id, "cc-features?group_id=99999", "")
	require.Equal(t, 404, code)
	code, out = f.callAs(uid, "POST", id, "cc-features/preview", `{"group_id":null,"cc_feature_policy":{"mode":"custom","revision":0,"overrides":{"relay_mode":"direct"}}}`)
	require.Equal(t, 200, code, out)
	require.Equal(t, "build", data(out)["effective"].(map[string]any)["relay_mode"])
	code, out = f.callAs(uid, "POST", id, "cc-features/preview", `{"group_id":`+strconv.FormatInt(gid, 10)+`,"cc_feature_policy":{"mode":"custom","revision":0,"overrides":{"relay_mode":"direct"}}}`)
	require.Equal(t, 200, code, out)
	require.Equal(t, "direct", data(out)["effective"].(map[string]any)["relay_mode"])
	read, err := LoadAccountFeaturePolicy(ctx, f.db.Pool, id)
	require.NoError(t, err)
	require.EqualValues(t, 0, read.Revision)
	require.Equal(t, "follow", read.Mode)
	require.Zero(t, calls)
}

func TestFeatureConfigHTTPAtomicAndNoRuntimeKick(t *testing.T) {
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		t.Error("policy save must not call controller")
		http.NotFound(w, r)
	})
	ctx := context.Background()
	uid := f.user("settings@test")
	var gid int64
	require.NoError(t, f.db.Pool.QueryRow(ctx, "INSERT INTO groups(name) VALUES('policy-save') RETURNING id").Scan(&gid))
	f.account(false)
	f.s.sweepNow = make(chan struct{}, 1)
	body := `{"mode":"local","feature_revision":0,"cc_feature_groups":{"` + strconv.FormatInt(gid, 10) + `":{"enabled":true,"allow_account_override":true,"overrides":{"build_billing_sources":{"cc_version":"worker"}}}}}`
	code, out := f.request(uid, "PUT", "/system/ccgateway/remote-config", body)
	require.Equal(t, 200, code, out)
	require.Equal(t, float64(1), data(out)["feature_revision"])
	require.Empty(t, f.s.kick)
	require.Empty(t, f.s.sweepNow)
	// Stale write cannot clear groups; an omitted new field remains intact.
	code, out = f.request(uid, "PUT", "/system/ccgateway/remote-config", `{"mode":"local","feature_revision":0,"cc_feature_groups":{}}`)
	require.Equal(t, 409, code, out)
	require.Equal(t, "feature_revision_conflict", reason(out))
	code, out = f.request(uid, "PUT", "/system/ccgateway/remote-config", `{"mode":"local"}`)
	require.Equal(t, 200, code, out)
	require.Len(t, data(out)["cc_feature_groups"], 1)
	// Unknown group IDs are rejected within the same config transaction.
	code, _ = f.request(uid, "PUT", "/system/ccgateway/remote-config", `{"mode":"local","feature_revision":1,"cc_feature_groups":{"99999":{"enabled":true,"overrides":{}}}}`)
	require.Equal(t, 400, code)
	saved, err := f.s.Load(ctx)
	require.NoError(t, err)
	require.Len(t, saved.CCFeatureGroups, 1)
	require.EqualValues(t, 1, saved.FeatureRevision)
}

func TestNewConfigDefaultsDoNotChangeLegacyDefaults(t *testing.T) {
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) { http.NotFound(w, r) })
	fresh, err := f.s.decodeStored([]byte("{}"))
	require.NoError(t, err)
	require.Equal(t, "worker", fresh.EffectiveRequestPolicy().BuildAttachmentSources["platform_name"])
	plain, _ := json.Marshal(Config{Mode: "disabled"})
	cipher, err := f.cipher.Encrypt(plain, configAAD)
	require.NoError(t, err)
	raw, _ := json.Marshal(map[string]any{"cipher": cipher})
	old, err := f.s.decodeStored(raw)
	require.NoError(t, err)
	require.Empty(t, old.EffectiveRequestPolicy().BuildAttachmentSources)
}
