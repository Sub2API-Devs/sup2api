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
	require.Equal(t, map[string]any{"visible": false, "default": []any{"X-Foo"}}, controls["header_passthrough"])
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
