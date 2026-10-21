package account

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/jackc/pgx/v5"
)

type preparationPlugin struct {
	*fakePlatform
	phases []string
	// facts / changed are the resource_facts_json and changed_fields of the
	// last before_create or before_update; patch answers both when set.
	facts   string
	changed []string
	patch   func(*pluginv1.AccountLifecycleRequest) *pluginv1.AccountPatch
}

func (p *preparationPlugin) OnAccountLifecycle(_ context.Context, in *pluginv1.AccountLifecycleRequest) (*pluginv1.AccountLifecycleResponse, error) {
	p.phases = append(p.phases, in.Phase)
	out := &pluginv1.AccountLifecycleResponse{SettingsJson: in.Account.SettingsJson, RunResource: true}
	if in.Phase == "before_create" || in.Phase == "before_update" {
		p.facts, p.changed = in.ResourceFactsJson, in.ChangedFields
		if p.patch != nil {
			out.AccountPatch = p.patch(in)
		}
	}
	return out, nil
}

type preparationResource struct {
	prepared     map[string]bool
	ready        bool
	subscription string
	cancelled    int
	adopted      int64
}

func (r *preparationResource) PrepareAccount(_ context.Context, p core.AccountPreparation) error {
	r.prepared[p.Key] = true
	return nil
}
func (r *preparationResource) UpdateAccountPreparation(context.Context, pgx.Tx, core.AccountPreparation) error {
	return nil
}
func (r *preparationResource) AccountPreparationAction(context.Context, core.AccountPreparation, string, string, json.RawMessage) (any, error) {
	return map[string]string{"status": "ready"}, nil
}
func (r *preparationResource) CheckAccountPreparation(context.Context, core.AccountPreparation) (core.AccountPreparationFacts, error) {
	if !r.ready {
		return core.AccountPreparationFacts{}, core.ErrInvalidArgument.WithMessage("not ready")
	}
	return core.AccountPreparationFacts{SubscriptionType: r.subscription}, nil
}
func (r *preparationResource) AdoptAccountPreparation(_ context.Context, _ pgx.Tx, _ core.AccountPreparation, id int64) error {
	r.adopted = id
	return nil
}
func (r *preparationResource) CancelAccountPreparation(_ context.Context, p core.AccountPreparation) error {
	delete(r.prepared, p.Key)
	r.cancelled++
	return nil
}
func (r *preparationResource) ReconcileAccount(context.Context, int64) error { return nil }

func preparationFixture(t *testing.T) (*env, *preparationResource, int64) {
	e, resource, proxy, _ := preparationPluginFixture(t)
	return e, resource, proxy
}

func preparationPluginFixture(t *testing.T) (*env, *preparationResource, int64, *preparationPlugin) {
	t.Helper()
	e := setup(t)
	if _, err := e.db.Pool.Exec(t.Context(), `INSERT INTO plugins(key,name,status) VALUES('fixture','{"en":"Fixture"}','enabled')`); err != nil {
		t.Fatal(err)
	}
	e.svc.d.Locker = testutil.NewMemLocker()
	resource := &preparationResource{prepared: map[string]bool{}}
	info := core.PluginInfo{Key: "fixture", Manifest: &manifest.Manifest{Name: manifest.LocalizedText{"en": "Fixture"}}}
	e.gen.plugins = append(e.gen.plugins, info)
	plugin := &preparationPlugin{fakePlatform: e.plat}
	e.gen.types = append(e.gen.types, core.AccountTypeBinding{Plugin: info, Client: plugin,
		Type:       manifest.AccountType{ID: "managed", Form: manifest.Form{Mode: "schema"}, Lifecycle: &manifest.AccountLifecycle{Preparation: true, Required: true}, ExtensionsSchema: json.RawMessage(`{"type":"object","additionalProperties":false,"properties":{"region":{"type":"string"}}}`)},
		FormSchema: json.RawMessage(`{"type":"object","additionalProperties":false}`)})
	e.svc.d.LifecycleResources = map[string]core.AccountLifecycleResource{"fixture": resource}
	proxy := e.exec1(`INSERT INTO proxies(name,protocol,host,port) VALUES('preparation','http','proxy.invalid',3128) RETURNING id`)
	return e, resource, proxy, plugin
}

func TestAccountPreparationOwnershipReadinessAndAdoption(t *testing.T) {
	e, resource, proxy := preparationFixture(t)
	request := map[string]any{"proxy_id": proxy, "settings": map[string]string{"region": "jp"}, "idempotency_key": "attempt-1"}
	code, out := e.do("POST", "/account-types/fixture/managed/preparations", request)
	if code != 201 {
		t.Fatalf("prepare: %d %v", code, out)
	}
	key := data(out)["key"].(string)
	code, again := e.do("POST", "/account-types/fixture/managed/preparations", request)
	if code != 201 || data(again)["key"] != key || len(resource.prepared) != 1 {
		t.Fatalf("preparation was not idempotent: %d %v", code, again)
	}
	other := e.addUser("other-preparation@example.test")
	if code, _ := e.doAs(other, "GET", "/account-preparations/"+key+"/status", nil); code != 404 {
		t.Fatalf("other owner read preparation: %d", code)
	}
	body := map[string]any{"name": "prepared", "plugin_key": "fixture", "type": "managed", "proxy_id": proxy, "credentials": map[string]any{}, "settings": map[string]string{"region": "jp"}, "preparation_key": key}
	if code, _ := e.do("POST", "/accounts", body); code != 400 {
		t.Fatalf("unready preparation accepted: %d", code)
	}
	resource.ready = true
	code, out = e.do("POST", "/accounts", body)
	if code != 201 || resource.adopted == 0 {
		t.Fatalf("adopt: %d %v", code, out)
	}
	if code, _ := e.do("POST", "/accounts", body); code != 404 {
		t.Fatalf("preparation was reused: %d", code)
	}
	if code, _ := e.do("DELETE", "/account-preparations/"+key, nil); code != 404 || resource.cancelled != 0 {
		t.Fatalf("adopted resource was removed: %d %d", code, resource.cancelled)
	}
}

func TestAccountPreparationCleanupHonorsRenewal(t *testing.T) {
	e, resource, proxy := preparationFixture(t)
	code, out := e.do("POST", "/account-types/fixture/managed/preparations", map[string]any{"proxy_id": proxy, "settings": map[string]string{"region": "jp"}})
	if code != 201 {
		t.Fatalf("prepare: %d %v", code, out)
	}
	key := data(out)["key"].(string)
	ctx := core.WithUserID(t.Context(), e.uid)
	preparation, err := e.svc.loadPreparation(ctx, key)
	if err != nil {
		t.Fatal(err)
	}
	if err := e.svc.disposePreparation(ctx, preparation, true); err != nil || resource.cancelled != 0 {
		t.Fatalf("active preparation was swept: %v", err)
	}
	if _, err := e.db.Pool.Exec(ctx, `UPDATE account_preparations SET expires_at=now()-interval '1 minute' WHERE key=$1`, key); err != nil {
		t.Fatal(err)
	}
	if err := e.svc.sweepPreparations(ctx); err != nil || resource.cancelled != 1 {
		t.Fatalf("expired preparation was not swept: %v", err)
	}
	if err := e.svc.sweepPreparations(ctx); err != nil || resource.cancelled != 1 {
		t.Fatalf("cleanup was not idempotent: %v", err)
	}
}

func TestLifecycleEventsUseCurrentOwnedAccount(t *testing.T) {
	e, _, _ := preparationFixture(t)
	id := e.exec1(`INSERT INTO accounts(name,plugin_key,type,credentials_enc,settings,rpm_limit,tpm_limit,max_concurrency) VALUES('current','fixture','managed',''::bytea,'{"region":"jp"}',31,4100,7) RETURNING id`)
	handler := &lifecycleEvents{service: e.svc, plugin: "fixture"}
	payload, _ := json.Marshal(basicPayload(id, "fixture", "managed", "old name"))
	request := &pluginv1.OnEventsRequest{Events: []*pluginv1.Event{{Id: 12, Type: core.EventAccountUpdated, PayloadJson: string(payload)}}}
	for range 2 {
		response, err := handler.OnEvents(t.Context(), request)
		if err != nil || response.GetAckedThroughId() != 12 {
			t.Fatalf("event delivery: %v %v", response, err)
		}
	}
	row, err := e.svc.loadRow(t.Context(), e.db.Pool, id, nil, false)
	if err != nil {
		t.Fatal(err)
	}
	snapshot := row.pluginAccount(nil)
	if snapshot.Name != "current" || snapshot.Properties.RpmLimit != 31 || snapshot.Properties.TpmLimit != 4100 || snapshot.Properties.MaxConcurrency != 7 || snapshot.CredentialsJson != "" {
		t.Fatalf("incorrect lifecycle snapshot: %v", snapshot)
	}
	foreign, _ := json.Marshal(basicPayload(id, "another-plugin", "managed", "foreign"))
	request.Events[0].PayloadJson = string(foreign)
	if _, err := handler.OnEvents(t.Context(), request); err != nil {
		t.Fatalf("foreign event was not skipped: %v", err)
	}
}

func TestLifecycleSynchronizationCannotOverwriteNewerGeneration(t *testing.T) {
	e, _, _ := preparationFixture(t)
	ctx := t.Context()
	id := e.exec1(`INSERT INTO accounts(name,plugin_key,type,credentials_enc) VALUES('sync','fixture','managed',''::bytea) RETURNING id`)
	row, err := e.svc.loadRow(ctx, e.db.Pool, id, nil, false)
	if err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if err := markLifecyclePending(ctx, e.db.Pool, id); err != nil {
			t.Fatal(err)
		}
	}
	if err := e.svc.saveLifecycleStatus(ctx, id, row.UpdatedAt, 1, core.AccountSynchronization{Status: "applied"}); err != nil {
		t.Fatal(err)
	}
	var state string
	if err := e.db.Pool.QueryRow(ctx, `SELECT status FROM account_lifecycle_sync WHERE account_id=$1`, id).Scan(&state); err != nil || state != "pending" {
		t.Fatalf("stale synchronization replaced the current state: %s %v", state, err)
	}
	if err := e.svc.saveLifecycleStatus(ctx, id, row.UpdatedAt, 2, core.AccountSynchronization{Status: "applied"}); err != nil {
		t.Fatal(err)
	}
	if err := e.db.Pool.QueryRow(ctx, `SELECT status FROM account_lifecycle_sync WHERE account_id=$1`, id).Scan(&state); err != nil || state != "applied" {
		t.Fatalf("current synchronization did not apply: %s %v", state, err)
	}
}

type synchronizationReader struct {
	*preparationResource
	state core.AccountSynchronization
	err   error
	reads int
	// during runs inside the read.
	during func()
}

func (r *synchronizationReader) AccountSynchronization(context.Context, int64) (core.AccountSynchronization, error) {
	r.reads++
	if r.during != nil {
		r.during()
	}
	return r.state, r.err
}

// A state that event delivery left behind is read again once it settled:
// read failures and fresh rows are left alone, applied rows are never read.
func TestLifecycleStatusSweepRereadsStaleStates(t *testing.T) {
	e, resource, _ := preparationFixture(t)
	ctx := t.Context()
	reader := &synchronizationReader{preparationResource: resource, err: core.ErrUnavailable}
	e.svc.d.LifecycleResources = map[string]core.AccountLifecycleResource{"fixture": reader}
	id := e.exec1(`INSERT INTO accounts(name,plugin_key,type,credentials_enc) VALUES('stale','fixture','managed',''::bytea) RETURNING id`)
	e.exec1(`INSERT INTO account_lifecycle_sync(account_id,status,code,updated_at) VALUES($1,'failed','runtime_sync_failed',now()-interval '1 minute') RETURNING account_id`, id)
	backdate := func() {
		if _, err := e.db.Pool.Exec(ctx, `UPDATE account_lifecycle_sync SET updated_at=now()-interval '1 minute' WHERE account_id=$1`, id); err != nil {
			t.Fatal(err)
		}
	}
	sweep := func(want int, status, code string) {
		t.Helper()
		got, err := e.svc.sweepLifecycleStatus(ctx)
		var state core.AccountSynchronization
		if err == nil {
			err = e.db.Pool.QueryRow(ctx, `SELECT status,code FROM account_lifecycle_sync WHERE account_id=$1`, id).Scan(&state.Status, &state.Code)
		}
		if err != nil || got != want || state.Status != status || state.Code != code {
			t.Fatalf("sweep: %d %+v %v, want %d %s/%s", got, state, err, want, status, code)
		}
	}
	sweep(0, "failed", "runtime_sync_failed")
	reader.err, reader.state = nil, core.AccountSynchronization{Status: "pending", Code: "runtime_pending"}
	sweep(1, "pending", "runtime_pending")
	// Just written: left to settle.
	reader.state = core.AccountSynchronization{Status: "applied"}
	reads := reader.reads
	sweep(0, "pending", "runtime_pending")
	if reader.reads != reads {
		t.Fatal("a fresh state was read again")
	}
	backdate()
	sweep(1, "applied", "")
	backdate()
	sweep(0, "applied", "")
	if reader.reads != reads+1 {
		t.Fatalf("applied state read again: %d", reader.reads-reads)
	}
	// A change while the state is read keeps its own state.
	if _, err := e.db.Pool.Exec(ctx, `UPDATE account_lifecycle_sync SET status='failed',code='runtime_sync_failed',updated_at=now()-interval '1 minute' WHERE account_id=$1`, id); err != nil {
		t.Fatal(err)
	}
	reader.during = func() {
		if err := markLifecyclePending(ctx, e.db.Pool, id); err != nil {
			t.Error(err)
		}
	}
	if _, err := e.svc.sweepLifecycleStatus(ctx); err != nil {
		t.Fatal(err)
	}
	reader.during = nil
	sweep(0, "pending", "")
}

func TestAccountPreparationRejectsConfigurationMismatch(t *testing.T) {
	e, resource, proxy := preparationFixture(t)
	request := map[string]any{"proxy_id": proxy, "settings": map[string]string{"region": "jp"}, "idempotency_key": "attempt-1"}
	code, out := e.do("POST", "/account-types/fixture/managed/preparations", request)
	if code != 201 {
		t.Fatalf("prepare: %d %v", code, out)
	}
	key := data(out)["key"].(string)
	request["settings"] = map[string]string{"region": "us"}
	if code, _ := e.do("POST", "/account-types/fixture/managed/preparations", request); code != 409 {
		t.Fatalf("idempotency key rebound: %d", code)
	}
	resource.ready = true
	body := map[string]any{"name": "prepared", "plugin_key": "fixture", "type": "managed", "proxy_id": proxy, "credentials": map[string]any{}, "settings": map[string]string{"region": "us"}, "preparation_key": key}
	if code, _ := e.do("POST", "/accounts", body); code != 409 {
		t.Fatalf("changed environment adopted: %d", code)
	}
	if code, _ := e.do("DELETE", "/account-preparations/"+key, nil); code != 204 || resource.cancelled != 1 {
		t.Fatalf("cancel: %d %d", code, resource.cancelled)
	}
}

// before_create receives what the preparation observed and may change the
// models before the account is saved; the subscription type is recorded on
// the account (CONTRACTS §59).
func TestBeforeCreateFactsAndAccountPatch(t *testing.T) {
	e, resource, proxy, plugin := preparationPluginFixture(t)
	resource.ready, resource.subscription = true, "pro"
	plugin.patch = func(in *pluginv1.AccountLifecycleRequest) *pluginv1.AccountPatch {
		models := in.GetAccount().GetProperties().GetModels()
		if len(models) == 0 || models[0] != "claude-fable-5" {
			return nil
		}
		return &pluginv1.AccountPatch{Models: &pluginv1.ModelList{Ids: models[1:]}}
	}
	create := func(models []string) (int, map[string]any) {
		code, out := e.do("POST", "/account-types/fixture/managed/preparations", map[string]any{"proxy_id": proxy, "settings": map[string]string{"region": "jp"}})
		if code != 201 {
			t.Fatalf("prepare: %d %v", code, out)
		}
		return e.do("POST", "/accounts", map[string]any{"name": "patched", "plugin_key": "fixture", "type": "managed", "proxy_id": proxy,
			"credentials": map[string]any{}, "settings": map[string]string{"region": "jp"}, "preparation_key": data(out)["key"], "models": models})
	}
	code, out := create([]string{"claude-fable-5", "claude-opus-5"})
	if code != 201 {
		t.Fatalf("create: %d %v", code, out)
	}
	if plugin.facts != `{"subscription_type":"pro"}` {
		t.Fatalf("facts = %q", plugin.facts)
	}
	got := data(out)
	if models, _ := got["models"].([]any); len(models) != 1 || models[0] != "claude-opus-5" || got["subscription_type"] != "pro" {
		t.Fatalf("saved account %v", got)
	}
	var detail string
	if err := e.db.Pool.QueryRow(t.Context(), `SELECT detail::text FROM audit_logs WHERE action='account.create' ORDER BY id DESC LIMIT 1`).Scan(&detail); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(detail, `"plugin_changed": ["models"]`) || !strings.Contains(detail, `"subscription_type": "pro"`) {
		t.Fatalf("audit detail %s", detail)
	}
	// A list the plugin leaves alone is saved as sent.
	if code, out = create([]string{"claude-opus-5"}); code != 201 {
		t.Fatalf("create: %d %v", code, out)
	}
	if models, _ := data(out)["models"].([]any); len(models) != 1 || models[0] != "claude-opus-5" {
		t.Fatalf("unpatched account %v", data(out))
	}
	// An invalid change is refused like invalid input; nothing is saved.
	plugin.patch = func(*pluginv1.AccountLifecycleRequest) *pluginv1.AccountPatch {
		return &pluginv1.AccountPatch{Models: &pluginv1.ModelList{Ids: []string{"claude-*"}}}
	}
	before := e.exec1(`SELECT count(*) FROM accounts`)
	if code, out = create([]string{"claude-opus-5"}); code < 400 {
		t.Fatalf("invalid patch accepted: %d %v", code, out)
	}
	if after := e.exec1(`SELECT count(*) FROM accounts`); after != before {
		t.Fatalf("account saved after an invalid patch: %d -> %d", before, after)
	}
}
