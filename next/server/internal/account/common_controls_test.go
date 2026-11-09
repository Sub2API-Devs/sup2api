package account

import (
	"encoding/json"
	"maps"
	"slices"
	"testing"

	"github.com/stretchr/testify/require"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// Every control of the manifest is enforced: a field control here, the
// usage limit by its endpoint, proxy as required.
func TestCommonControlFieldsCoverManifest(t *testing.T) {
	names := append(slices.Collect(maps.Keys(commonControlFields)), "usage_limit", "proxy")
	require.ElementsMatch(t, slices.Collect(maps.Keys(manifest.CommonControlSpecs)), names)
}

func TestCommonControlEnforcement(t *testing.T) {
	e := setup(t)
	off := false
	legacy := e.mkRawAccount("anthropic", "apikey", "legacy", "unused", true)
	e.exec1(`UPDATE accounts SET weight = 2, max_concurrency = 7, rpm_limit = 0 WHERE id = $1 RETURNING id`, legacy)
	declare := func(c map[string]manifest.AccountCommonControl) { e.gen.types[0].Type.CommonControls = c }
	raw := func(s string) json.RawMessage { return json.RawMessage(s) }
	declare(map[string]manifest.AccountCommonControl{
		"priority":           {Default: raw(`50`)},
		"weight":             {Configurable: &off, Default: raw(`5`)},
		"max_concurrency":    {Configurable: &off},
		"rpm_limit":          {Locked: true, Default: raw(`100`)},
		"header_passthrough": {Visible: &off, Default: raw(`["X-Foo"]`)},
		"param_override":     {Locked: true, Default: raw(`{"temperature": 0.5}`)},
		"usage_limit":        {Locked: true, Default: raw(`{"enabled": true, "amount": "5", "period": "day", "timezone": "UTC"}`)},
		"proxy":              {Required: true},
	})
	status, result := e.do("GET", "/account-types", nil)
	require.Equal(t, 200, status)
	controls := result["data"].([]any)[0].(map[string]any)["common_controls"].(map[string]any)
	require.Equal(t, map[string]any{"configurable": false, "default": 5.0}, controls["weight"])
	require.Equal(t, map[string]any{"locked": true, "default": 100.0}, controls["rpm_limit"])
	// Defaults are served as the core stores them.
	require.Equal(t, map[string]any{"visible": false, "default": []any{"x-foo"}}, controls["header_passthrough"])
	require.Equal(t, map[string]any{"required": true}, controls["proxy"])

	proxyID := e.exec1(`INSERT INTO proxies(name,protocol,host,port) VALUES('controls','http','proxy.example',3128) RETURNING id`)
	body := func(extra map[string]any) map[string]any {
		b := map[string]any{"name": "controlled", "plugin_key": "anthropic", "type": "apikey",
			"credentials": map[string]any{"api_key": "sk-good-key-123"}, "proxy_id": proxyID}
		maps.Copy(b, extra)
		return b
	}
	for _, tc := range []struct {
		name  string
		extra map[string]any
		field string
	}{
		{"not configurable", map[string]any{"weight": 6}, "weight:read_only"},
		{"not configurable, core default", map[string]any{"max_concurrency": 5}, "max_concurrency:read_only"},
		{"locked", map[string]any{"rpm_limit": 99}, "rpm_limit:read_only"},
		{"locked object", map[string]any{"param_override": map[string]any{}}, "param_override:read_only"},
		{"proxy required", map[string]any{"proxy_id": nil}, "proxy_id:required"},
	} {
		status, result = e.do("POST", "/accounts", body(tc.extra))
		require.Equal(t, 400, status, tc.name)
		require.Contains(t, fieldsOf(result), tc.field, tc.name)
	}

	// The defaults apply; values equal to them pass even when fixed.
	status, result = e.do("POST", "/accounts", body(map[string]any{"weight": 5, "max_concurrency": 0, "param_override": map[string]any{"temperature": 0.5}}))
	require.Equal(t, 201, status, result)
	created := data(result)
	require.Equal(t, 50.0, created["priority"])
	require.Equal(t, 5.0, created["weight"])
	require.Equal(t, 0.0, created["max_concurrency"])
	require.Equal(t, 100.0, created["rpm_limit"])
	require.Equal(t, []any{"x-foo"}, created["header_passthrough"])
	require.Equal(t, map[string]any{"temperature": 0.5}, created["param_override"])
	id := itoa(int64(created["id"].(float64)))
	status, result = e.do("GET", "/accounts/"+id+"/usage-limit", nil)
	require.Equal(t, 200, status)
	require.Equal(t, true, data(result)["configured"])
	require.Equal(t, "day", data(result)["period"])

	// A configurable default can be overridden, also when hidden.
	status, result = e.do("POST", "/accounts", body(map[string]any{"name": "chosen", "priority": 70, "header_passthrough": []string{}}))
	require.Equal(t, 201, status, result)
	require.Equal(t, 70.0, data(result)["priority"])
	require.Empty(t, data(result)["header_passthrough"])

	for _, tc := range []struct {
		name   string
		id     string
		patch  map[string]any
		status int
		field  string
	}{
		{"keeps a fixed value", id, map[string]any{"weight": 5, "rpm_limit": 100}, 200, ""},
		{"not configurable", id, map[string]any{"weight": 7}, 400, "weight:read_only"},
		{"locked", id, map[string]any{"rpm_limit": 0}, 400, "rpm_limit:read_only"},
		{"locked object, other formatting", id, map[string]any{"param_override": json.RawMessage(`{ "temperature":0.50 }`)}, 200, ""},
		{"hidden but configurable", id, map[string]any{"header_passthrough": []string{"x-bar"}}, 200, ""},
		{"proxy removed", id, map[string]any{"proxy_id": nil}, 400, "proxy_id:required"},
		{"legacy without a proxy stays editable", itoa(legacy), map[string]any{"name": "renamed"}, 200, ""},
		{"legacy cannot clear its absent proxy", itoa(legacy), map[string]any{"proxy_id": nil}, 400, "proxy_id:required"},
		{"legacy locked to the default", itoa(legacy), map[string]any{"proxy_id": proxyID, "rpm_limit": 0}, 400, "rpm_limit:read_only"},
		{"legacy gets a proxy", itoa(legacy), map[string]any{"proxy_id": proxyID, "rpm_limit": 100}, 200, ""},
		{"legacy keeps its value", itoa(legacy), map[string]any{"weight": 2, "max_concurrency": 7}, 200, ""},
		{"legacy cannot take the default", itoa(legacy), map[string]any{"weight": 5}, 400, "weight:read_only"},
	} {
		status, result = e.do("PATCH", "/accounts/"+tc.id, tc.patch)
		require.Equal(t, tc.status, status, "%s: %v", tc.name, result)
		if tc.field != "" {
			require.Contains(t, fieldsOf(result), tc.field, tc.name)
		}
	}

	limit := map[string]any{"enabled": true, "amount": "5", "period": "day", "period_count": 1, "timezone": "UTC"}
	status, result = e.do("PUT", "/accounts/"+id+"/usage-limit", limit)
	require.Equal(t, 200, status, result)
	limit["amount"] = "6"
	status, result = e.do("PUT", "/accounts/"+id+"/usage-limit", limit)
	require.Equal(t, 400, status)
	require.Contains(t, fieldsOf(result), "usage_limit:read_only")

	// Not configurable: the current configuration stays, whatever it is.
	declare(map[string]manifest.AccountCommonControl{"usage_limit": {Configurable: &off}})
	status, result = e.do("PUT", "/accounts/"+itoa(legacy)+"/usage-limit", limit)
	require.Equal(t, 400, status)
	require.Contains(t, fieldsOf(result), "usage_limit:read_only")
	limit["amount"] = "5"
	status, result = e.do("PUT", "/accounts/"+id+"/usage-limit", limit)
	require.Equal(t, 200, status, result)
}

// Without declarations an own-level caller's new account keeps its own
// default concurrency; a declared default wins over it.
func TestCommonControlDefaultsOwnLevel(t *testing.T) {
	authz := fakeAuthz{keys: map[int64][]string{}}
	e := setupWith(t, authz)
	alice := e.addUser("alice@x.com")
	authz.keys[e.uid], authz.keys[alice] = adminKeys, supplierKeys
	require.Equal(t, float64(ownDefaultConcurrency), e.createAs(alice, "own", nil)["max_concurrency"])
	e.gen.types[0].Type.CommonControls = map[string]manifest.AccountCommonControl{"max_concurrency": {Default: json.RawMessage(`3`)}}
	require.Equal(t, 3.0, e.createAs(alice, "declared", nil)["max_concurrency"])
	require.Equal(t, 3.0, e.createAs(e.uid, "admin", nil)["max_concurrency"])
	// Fixed without a default, each caller is held to their own core default.
	off := false
	e.gen.types[0].Type.CommonControls = map[string]manifest.AccountCommonControl{"max_concurrency": {Configurable: &off}}
	require.Equal(t, float64(ownDefaultConcurrency), e.createAs(alice, "fixed", map[string]any{"max_concurrency": ownDefaultConcurrency})["max_concurrency"])
	require.Equal(t, 0.0, e.createAs(e.uid, "fixed-admin", nil)["max_concurrency"])
	code, out := e.doAs(alice, "POST", "/accounts", map[string]any{"name": "fixed-5", "plugin_key": "anthropic", "type": "apikey",
		"credentials": map[string]any{"api_key": "sk-good-key-123"}, "max_concurrency": 5})
	require.Equal(t, 400, code, out)
	require.Contains(t, fieldsOf(out), "max_concurrency:read_only")
}

// The plugin's account_patch cannot move a fixed control: a locked field
// keeps its default, a non-configurable one the value the caller was held
// to; configurable fields still follow the patch.
func TestCommonControlsGuardAccountPatch(t *testing.T) {
	e, resource, proxy, plugin := preparationPluginFixture(t)
	resource.ready = true
	off := false
	e.gen.types[len(e.gen.types)-1].Type.CommonControls = map[string]manifest.AccountCommonControl{
		"priority": {Locked: true, Default: json.RawMessage(`4`)},
		"weight":   {Configurable: &off, Default: json.RawMessage(`2`)},
	}
	plugin.patch = func(in *pluginv1.AccountLifecycleRequest) *pluginv1.AccountPatch {
		if in.GetPhase() == "before_update" {
			return &pluginv1.AccountPatch{Priority: new(int32(8)), Weight: new(int32(9)), RpmLimit: new(int32(11))}
		}
		return &pluginv1.AccountPatch{Priority: new(int32(3)), Weight: new(int32(7)), TpmLimit: new(int64(5000))}
	}
	code, out := e.do("POST", "/account-types/fixture/managed/preparations", map[string]any{"proxy_id": proxy, "settings": map[string]string{"region": "jp"}})
	require.Equal(t, 201, code, out)
	code, out = e.do("POST", "/accounts", map[string]any{"name": "guarded", "plugin_key": "fixture", "type": "managed", "proxy_id": proxy,
		"credentials": map[string]any{}, "settings": map[string]string{"region": "jp"}, "preparation_key": data(out)["key"]})
	require.Equal(t, 201, code, out)
	acc := data(out)
	require.Equal(t, []any{4.0, 2.0, 5000.0}, []any{acc["priority"], acc["weight"], acc["tpm_limit"]})
	code, out = e.do("PATCH", "/accounts/"+itoa(int64(acc["id"].(float64))), map[string]any{"name": "guarded-2"})
	require.Equal(t, 200, code, out)
	acc = data(out)
	require.Equal(t, []any{4.0, 2.0, 11.0}, []any{acc["priority"], acc["weight"], acc["rpm_limit"]})
}

// Fixed object and list controls compare as JSON: the current value passes
// whatever its spelling, another one does not; a configurable default usage
// limit is saved with the account and stays editable.
func TestCommonControlStructuredValues(t *testing.T) {
	e := setup(t)
	off := false
	raw := func(s string) json.RawMessage { return json.RawMessage(s) }
	e.gen.types[0].Type.CommonControls = map[string]manifest.AccountCommonControl{
		"model_mapping": {Configurable: &off, Default: raw(`{"claude-a": "claude-b", "claude-c": "claude-d"}`)},
		"model_limits":  {Configurable: &off, Default: raw(`[{"models": ["claude-a"], "rpm_limit": 2}]`)},
		"environment":   {Locked: true, Default: raw(`{"relay_timeout_seconds": 600}`)},
		"usage_limit":   {Default: raw(`{"enabled": true, "amount": 3, "period": "week", "timezone": "UTC"}`)},
	}
	acc := e.createAs(e.uid, "structured", nil)
	require.Equal(t, map[string]any{"claude-a": "claude-b", "claude-c": "claude-d"}, acc["model_mapping"])
	require.Equal(t, map[string]any{"relay_timeout_seconds": 600.0}, acc["environment"])
	id := itoa(int64(acc["id"].(float64)))
	for _, tc := range []struct {
		name  string
		patch map[string]any
		field string
	}{
		{"same mapping, other order", map[string]any{"model_mapping": raw(`{"claude-c":"claude-d","claude-a":"claude-b"}`)}, ""},
		{"same limits, zero fields spelled out", map[string]any{"model_limits": raw(`[{"models":["claude-a"],"rpm_limit":2,"tpm_limit":0,"spm_limit":0,"max_concurrency":0}]`)}, ""},
		{"same environment", map[string]any{"environment": map[string]any{"relay_timeout_seconds": 600}}, ""},
		{"other mapping", map[string]any{"model_mapping": map[string]any{"claude-a": "claude-d"}}, "model_mapping:read_only"},
		{"cleared limits", map[string]any{"model_limits": []any{}}, "model_limits:read_only"},
		{"other environment", map[string]any{"environment": map[string]any{}}, "environment:read_only"},
	} {
		status, result := e.do("PATCH", "/accounts/"+id, tc.patch)
		if tc.field == "" {
			require.Equal(t, 200, status, "%s: %v", tc.name, result)
			continue
		}
		require.Equal(t, 400, status, tc.name)
		require.Contains(t, fieldsOf(result), tc.field, tc.name)
	}
	status, result := e.do("GET", "/accounts/"+id+"/usage-limit", nil)
	require.Equal(t, 200, status)
	require.Equal(t, []any{true, "week", "3"}, []any{data(result)["configured"], data(result)["period"], data(result)["amount"]})
	status, result = e.do("PUT", "/accounts/"+id+"/usage-limit", map[string]any{"enabled": false, "amount": "3", "period": "day", "period_count": 1, "timezone": "UTC"})
	require.Equal(t, 200, status, result)

	// A default the core refuses is a broken package: writes of the type fail
	// instead of skipping the declaration.
	e.gen.types[0].Type.CommonControls = map[string]manifest.AccountCommonControl{"weight": {Default: raw(`0`)}}
	status, result = e.do("PATCH", "/accounts/"+id, map[string]any{"name": "renamed"})
	require.Equal(t, 400, status, result)
	require.Contains(t, fieldsOf(result), "weight:invalid")
}

// A locked setting is always its default: an older account holding another
// value takes it on its next save, whatever that save changes.
func TestLockedControlsConverge(t *testing.T) {
	e := setup(t)
	legacy := e.mkRawAccount("anthropic", "apikey", "legacy", "unused", true)
	e.exec1(`UPDATE accounts SET rpm_limit = 0, priority = 3 WHERE id = $1 RETURNING id`, legacy)
	raw := func(s string) json.RawMessage { return json.RawMessage(s) }
	e.gen.types[0].Type.CommonControls = map[string]manifest.AccountCommonControl{
		"rpm_limit":      {Locked: true, Default: raw(`100`)},
		"param_override": {Locked: true, Default: raw(`{"temperature": 0.5}`)},
		"usage_limit":    {Locked: true, Default: raw(`{"enabled": true, "amount": "5", "period": "day", "timezone": "UTC"}`)},
	}
	status, result := e.do("PATCH", "/accounts/"+itoa(legacy), map[string]any{"name": "renamed"})
	require.Equal(t, 200, status, result)
	acc := data(result)
	require.Equal(t, []any{100.0, 3.0, map[string]any{"temperature": 0.5}}, []any{acc["rpm_limit"], acc["priority"], acc["param_override"]})
	status, result = e.do("GET", "/accounts/"+itoa(legacy)+"/usage-limit", nil)
	require.Equal(t, 200, status)
	require.Equal(t, []any{true, "day", "5"}, []any{data(result)["configured"], data(result)["period"], data(result)["amount"]})
	// Another value stays refused.
	status, result = e.do("PATCH", "/accounts/"+itoa(legacy), map[string]any{"rpm_limit": 7})
	require.Equal(t, 400, status)
	require.Contains(t, fieldsOf(result), "rpm_limit:read_only")
}

// An own-level caller's new account fits the type's defaults into the
// own-level caps, omitted or sent back as prefilled; another value outside
// them is still refused.
func TestCommonControlOwnLevelClamp(t *testing.T) {
	authz := fakeAuthz{keys: map[int64][]string{}}
	e := setupWith(t, authz)
	alice := e.addUser("alice@x.com")
	authz.keys[e.uid], authz.keys[alice] = adminKeys, supplierKeys
	weight, maxc := 300, 0
	e.gen.types[0].Type.DefaultLimits = &manifest.AccountDefaultLimits{Weight: &weight, MaxConcurrency: &maxc}
	e.gen.types[0].Type.CommonControls = map[string]manifest.AccountCommonControl{"priority": {Default: json.RawMessage(`500`)}}
	acc := e.createAs(alice, "omitted", nil)
	require.Equal(t, []any{100.0, 1.0, 10.0}, []any{acc["priority"], acc["weight"], acc["max_concurrency"]})
	acc = e.createAs(alice, "prefilled", map[string]any{"priority": 500, "weight": 300, "max_concurrency": 0})
	require.Equal(t, []any{100.0, 100.0, 10.0}, []any{acc["priority"], acc["weight"], acc["max_concurrency"]})
	require.Equal(t, 500.0, e.createAs(e.uid, "admin", nil)["priority"])
	for field, v := range map[string]int{"priority": 300, "weight": 200} {
		code, out := e.doAs(alice, "POST", "/accounts", map[string]any{"name": "explicit", "plugin_key": "anthropic", "type": "apikey",
			"credentials": map[string]any{"api_key": "sk-good-key-123"}, field: v})
		require.Equal(t, 400, code, out)
		require.Contains(t, fieldsOf(out), field+":restricted")
	}
	e.gen.types[0].Type.CommonControls = map[string]manifest.AccountCommonControl{"max_concurrency": {Default: json.RawMessage(`5000`)}}
	require.Equal(t, 1000.0, e.createAs(alice, "big", nil)["max_concurrency"])
}
