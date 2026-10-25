package account

import (
	"encoding/json"
	"slices"
	"strconv"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// readOnlyExtensionsFixture is the preparation fixture whose type declares a
// read-only extension, login, which its plugin fills from the observed
// account email, as the ccgateway plugin keeps its login email.
func readOnlyExtensionsFixture(t *testing.T) (*env, *preparationResource, int64, *preparationPlugin) {
	t.Helper()
	e, resource, proxy, plugin := preparationPluginFixture(t)
	binding := &e.gen.types[len(e.gen.types)-1]
	binding.Type.ExtensionsSchema = json.RawMessage(`{"type":"object","additionalProperties":false,"properties":{"region":{"type":"string"},"login":{"type":"string","maxLength":64,"readOnly":true}}}`)
	plugin.patch = func(in *pluginv1.AccountLifecycleRequest) *pluginv1.AccountPatch {
		var facts core.AccountPreparationFacts
		_ = json.Unmarshal([]byte(in.GetResourceFactsJson()), &facts)
		if facts.AccountEmail == "" {
			return nil
		}
		raw, _ := json.Marshal(map[string]string{"login": facts.AccountEmail})
		return &pluginv1.AccountPatch{ExtensionsJson: string(raw)}
	}
	return e, resource, proxy, plugin
}

func savedSettings(t *testing.T, e *env, id int64) map[string]any {
	t.Helper()
	var raw []byte
	if err := e.db.Pool.QueryRow(t.Context(), `SELECT settings FROM accounts WHERE id=$1`, id).Scan(&raw); err != nil {
		t.Fatal(err)
	}
	out := map[string]any{}
	_ = json.Unmarshal(raw, &out)
	return out
}

// A read-only extension is the plugin's (CONTRACTS §59): set on create from
// the preparation's facts and on each later observation, never by the admin,
// and kept through the admin's own extension edits.
func TestReadOnlyExtensionsArePluginOwned(t *testing.T) {
	e, resource, proxy, _ := readOnlyExtensionsFixture(t)
	ctx := t.Context()
	code, out := e.do("POST", "/account-types/fixture/managed/preparations", map[string]any{"proxy_id": proxy, "settings": map[string]string{"region": "jp"}, "idempotency_key": "ro-1"})
	if code != 201 {
		t.Fatalf("prepare: %d %v", code, out)
	}
	resource.ready, resource.email = true, "first@example.test"
	body := map[string]any{"name": "owned", "plugin_key": "fixture", "type": "managed", "proxy_id": proxy, "credentials": map[string]any{},
		"settings": map[string]string{"region": "jp"}, "preparation_key": data(out)["key"]}
	if code, out = e.do("POST", "/accounts", body); code != 201 {
		t.Fatalf("create: %d %v", code, out)
	}
	id := int64(data(out)["id"].(float64))
	if s := savedSettings(t, e, id); s["login"] != "first@example.test" || s["region"] != "jp" {
		t.Fatalf("created settings %v", s)
	}
	path := "/accounts/" + strconv.FormatInt(id, 10)
	if code, out := e.do("GET", path, nil); code != 200 || data(out)["settings"].(map[string]any)["login"] != "first@example.test" {
		t.Fatalf("API settings: %d %v", code, out)
	}

	// The admin cannot write it, alone or beside an extension of their own.
	for _, settings := range []map[string]string{{"login": "forged@example.test"}, {"region": "us", "login": "forged@example.test"}} {
		if code, out := e.do("PATCH", path, map[string]any{"settings": settings}); code != 400 {
			t.Fatalf("admin wrote a read-only extension: %d %v", code, out)
		}
	}
	// The admin's own extension edit keeps the plugin's value.
	if code, out := e.do("PATCH", path, map[string]any{"settings": map[string]string{"region": "us"}}); code != 200 {
		t.Fatalf("edit region: %d %v", code, out)
	}
	if s := savedSettings(t, e, id); s["login"] != "first@example.test" || s["region"] != "us" {
		t.Fatalf("after an admin edit %v", s)
	}

	audits := func() int64 {
		return e.exec1(`SELECT count(*) FROM audit_logs WHERE action='account.extensions.plugin' AND target_id=$1`, strconv.FormatInt(id, 10))
	}
	// An observation of another login updates it, once; the same one again
	// writes nothing. Manual models do not stop it.
	e.exec1(`UPDATE accounts SET auto_models=false WHERE id=$1 RETURNING id`, id)
	e.svc.FactsObserved(ctx, id, core.AccountPreparationFacts{AccountEmail: "second@example.test"}, false)
	if s := savedSettings(t, e, id); s["login"] != "second@example.test" || s["region"] != "us" {
		t.Fatalf("after another login %v", s)
	}
	e.svc.FactsObserved(ctx, id, core.AccountPreparationFacts{AccountEmail: "second@example.test"}, false)
	if n := audits(); n != 1 {
		t.Fatalf("audit rows %d", n)
	}
	var detail string
	if err := e.db.Pool.QueryRow(ctx, `SELECT detail::text FROM audit_logs WHERE action='account.extensions.plugin' AND target_id=$1`, strconv.FormatInt(id, 10)).Scan(&detail); err != nil || detail != `{"keys": ["login"]}` {
		t.Fatalf("audit detail %q %v (values are not audited)", detail, err)
	}
	// An unknown email leaves the value alone.
	e.svc.FactsObserved(ctx, id, core.AccountPreparationFacts{}, false)
	if s := savedSettings(t, e, id); s["login"] != "second@example.test" {
		t.Fatalf("an unknown email removed the login %v", s)
	}
}

// What the plugin may write is bounded by its schema: only declared read-only
// keys, valid values, and a null removes one.
func TestReadOnlyExtensionsPatchIsValidated(t *testing.T) {
	e, _, _, _ := readOnlyExtensionsFixture(t)
	bt := e.gen.types[len(e.gen.types)-1]
	patch := func(raw string) *pluginv1.AccountLifecycleResponse {
		return &pluginv1.AccountLifecycleResponse{AccountPatch: &pluginv1.AccountPatch{ExtensionsJson: raw}}
	}
	base := []byte(`{"region":"jp","login":"a@example.test"}`)
	for _, raw := range []string{`{"region":"us"}`, `{"other":"x"}`, `{"login":7}`, `{"login":"x"}x`, `[]`} {
		if _, _, err := e.svc.applyExtensionsPatch(bt, base, patch(raw)); err == nil {
			t.Fatalf("accepted %s", raw)
		}
	}
	out, changed, err := e.svc.applyExtensionsPatch(bt, base, patch(`{"login":null}`))
	if err != nil || !changed || string(out) != `{"region":"jp"}` {
		t.Fatalf("null removal %s %v %v", out, changed, err)
	}
	if out, changed, err := e.svc.applyExtensionsPatch(bt, base, patch(`{"login":"a@example.test"}`)); err != nil || changed || string(out) != string(base) {
		t.Fatalf("unchanged value %s %v %v", out, changed, err)
	}
	if keys := readOnlyExtensionKeys(bt); !slices.Equal(keys, []string{"login"}) {
		t.Fatalf("read-only keys %v", keys)
	}
}
