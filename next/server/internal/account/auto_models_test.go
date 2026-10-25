package account

import (
	"slices"
	"strconv"
	"strings"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

var (
	autoMaxModels = []string{"claude-fable-5", "claude-opus-5", "claude-sonnet-5"}
	autoProModels = []string{"claude-opus-5", "claude-sonnet-5"}
)

// autoModelsPatch answers save hooks like the ccgateway plugin: unless
// auto_models is false, the list follows the subscription type.
func autoModelsPatch(in *pluginv1.AccountLifecycleRequest) *pluginv1.AccountPatch {
	if p := in.GetAccount().GetProperties(); p.AutoModels != nil && !p.GetAutoModels() {
		return nil
	}
	models := autoMaxModels
	if strings.Contains(in.GetResourceFactsJson(), `"pro"`) {
		models = autoProModels
	}
	return &pluginv1.AccountPatch{Models: &pluginv1.ModelList{Ids: slices.Clone(models)}}
}

func savedModels(t *testing.T, e *env, id int64) ([]string, *bool) {
	t.Helper()
	row, err := e.svc.loadRow(t.Context(), e.db.Pool, id, nil, false)
	if err != nil {
		t.Fatal(err)
	}
	return row.Models, row.AutoModels
}

func anyStrings(v any) []string {
	list, _ := v.([]any)
	out := make([]string, 0, len(list))
	for _, item := range list {
		s, _ := item.(string)
		out = append(out, s)
	}
	return out
}

// before_update receives the recorded subscription type and its
// account_patch replaces the models about to be saved; auto_models is saved
// and read back (CONTRACTS §41.4, §59).
func TestBeforeUpdateAccountPatchAndAutoModels(t *testing.T) {
	e, _, _, plugin := preparationPluginFixture(t)
	plugin.patch = autoModelsPatch
	enc, err := e.svc.d.Cipher.Encrypt([]byte(`{}`), aad("fixture"))
	if err != nil {
		t.Fatal(err)
	}
	id := e.exec1(`INSERT INTO accounts(name,plugin_key,type,credentials_enc,settings,models,subscription_type)
		VALUES('auto','fixture','managed',$1,'{"region":"jp"}',ARRAY['claude-fable-5'],'pro') RETURNING id`, enc)
	path := "/accounts/" + strconv.FormatInt(id, 10)

	code, out := e.do("PATCH", path, map[string]any{"name": "renamed"})
	if code != 200 {
		t.Fatalf("update: %d %v", code, out)
	}
	if plugin.facts != `{"subscription_type":"pro"}` {
		t.Fatalf("facts = %q", plugin.facts)
	}
	if got := data(out); !slices.Equal(anyStrings(got["models"]), autoProModels) || got["auto_models"] != nil {
		t.Fatalf("automatic account after update %v", got)
	}
	var detail string
	if err := e.db.Pool.QueryRow(t.Context(), `SELECT detail::text FROM audit_logs WHERE action='account.update' ORDER BY id DESC LIMIT 1`).Scan(&detail); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(detail, `"plugin_changed": ["models"]`) {
		t.Fatalf("audit detail %s", detail)
	}

	// Manual mode keeps the submitted list.
	manual := []string{"claude-fable-5", "claude-haiku-4-5"}
	if code, out = e.do("PATCH", path, map[string]any{"auto_models": false, "models": manual}); code != 200 {
		t.Fatalf("manual update: %d %v", code, out)
	}
	if got := data(out); !slices.Equal(anyStrings(got["models"]), manual) || got["auto_models"] != false {
		t.Fatalf("manual account after update %v", got)
	}
	if code, out = e.do("GET", path, nil); code != 200 || data(out)["auto_models"] != false {
		t.Fatalf("read back: %d %v", code, out)
	}
	if code, out = e.do("PATCH", path, map[string]any{"name": "still manual"}); code != 200 || !slices.Equal(anyStrings(data(out)["models"]), manual) {
		t.Fatalf("manual list changed by a later save: %d %v", code, out)
	}

	// Back to automatic: the plugin's list again.
	if code, out = e.do("PATCH", path, map[string]any{"auto_models": true}); code != 200 {
		t.Fatalf("automatic update: %d %v", code, out)
	}
	if got := data(out); !slices.Equal(anyStrings(got["models"]), autoProModels) || got["auto_models"] != true {
		t.Fatalf("automatic account after update %v", got)
	}
	if models, auto := savedModels(t, e, id); !slices.Equal(models, autoProModels) || auto == nil || !*auto {
		t.Fatalf("stored %v %v", models, auto)
	}
}

// A changed subscription type recomputes the models of an automatic account
// through before_update; a manual account is left alone (CONTRACTS §59).
func TestSubscriptionChangedRecomputesAutomaticModels(t *testing.T) {
	e, _, _, plugin := preparationPluginFixture(t)
	plugin.patch = autoModelsPatch
	ctx := t.Context()
	id := e.exec1(`INSERT INTO accounts(name,plugin_key,type,credentials_enc,settings,models,subscription_type)
		VALUES('auto','fixture','managed',''::bytea,'{"region":"jp"}',$1,'pro') RETURNING id`, autoProModels)
	audits := func() int64 {
		return e.exec1(`SELECT count(*) FROM audit_logs WHERE action='account.models.auto' AND target_id=$1`, strconv.FormatInt(id, 10))
	}

	e.exec1(`UPDATE accounts SET subscription_type='max' WHERE id=$1 RETURNING id`, id)
	e.svc.FactsObserved(ctx, id, core.AccountPreparationFacts{}, true)
	if models, _ := savedModels(t, e, id); !slices.Equal(models, autoMaxModels) {
		t.Fatalf("automatic models after the change to max %v", models)
	}
	if plugin.facts != `{"subscription_type":"max"}` || !slices.Equal(plugin.changed, []string{"subscription_type"}) {
		t.Fatalf("before_update facts %q changed %v", plugin.facts, plugin.changed)
	}
	if n := audits(); n != 1 {
		t.Fatalf("audit rows %d", n)
	}
	var detail string
	if err := e.db.Pool.QueryRow(ctx, `SELECT detail::text FROM audit_logs WHERE action='account.models.auto' ORDER BY id DESC LIMIT 1`).Scan(&detail); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(detail, `"subscription_type": "max"`) || !strings.Contains(detail, `"plugin_changed": ["models"]`) {
		t.Fatalf("audit detail %s", detail)
	}
	var state string
	if err := e.db.Pool.QueryRow(ctx, `SELECT status FROM account_lifecycle_sync WHERE account_id=$1`, id).Scan(&state); err != nil || state != "pending" {
		t.Fatalf("lifecycle state %q %v", state, err)
	}

	// Nothing to change: nothing written.
	e.svc.FactsObserved(ctx, id, core.AccountPreparationFacts{}, true)
	if n := audits(); n != 1 {
		t.Fatalf("unchanged models audited again: %d", n)
	}

	// Manual mode: the subscription type no longer touches the list.
	e.exec1(`UPDATE accounts SET auto_models=false, subscription_type='pro' WHERE id=$1 RETURNING id`, id)
	e.svc.FactsObserved(ctx, id, core.AccountPreparationFacts{}, true)
	if models, _ := savedModels(t, e, id); !slices.Equal(models, autoMaxModels) {
		t.Fatalf("manual models changed %v", models)
	}
	if n := audits(); n != 1 {
		t.Fatalf("manual account audited: %d", n)
	}
}
