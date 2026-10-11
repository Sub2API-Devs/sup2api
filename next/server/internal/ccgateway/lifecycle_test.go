package ccgateway

import (
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestLifecyclePreparationUsesConfiguredEnvironment(t *testing.T) {
	controller := newFakeController(t)
	fixture := newRuntimeFixture(t, controller.ServeHTTP)
	uid := fixture.user("preparation@example.test")
	proxy := fixture.proxy(nil)
	ctx := core.WithUserID(t.Context(), uid)
	preparation := core.AccountPreparation{Key: "d1234567890abcdef", PluginKey: "ccgateway", Type: "managed", ProxyID: &proxy, CreatedBy: uid,
		Settings: json.RawMessage(`{"locale":"ja-JP","timezone":"Asia/Tokyo"}`)}
	if err := fixture.s.PrepareAccount(ctx, preparation); err != nil {
		t.Fatal(err)
	}
	if err := fixture.s.PrepareAccount(ctx, preparation); err != nil {
		t.Fatalf("idempotent preparation: %v", err)
	}
	desired, err := fixture.s.draftDesired(ctx, preparation.Key, true)
	if err != nil || desired.Auth["locale"] != "ja_JP.UTF-8" || desired.Auth["timezone"] != "Asia/Tokyo" {
		t.Fatalf("prepared environment: %v %v", desired.Auth, err)
	}
	if _, err := fixture.s.AccountPreparationAction(ctx, preparation, "POST", "sync", nil); err != nil {
		t.Fatal(err)
	}
	if _, err := fixture.s.AccountPreparationAction(ctx, preparation, "POST", "start", json.RawMessage(`{}`)); err != nil {
		t.Fatal(err)
	}
	if _, err := fixture.s.AccountPreparationAction(ctx, preparation, "POST", "complete", json.RawMessage(`{"session_id":"s1","code":"missing-state"}`)); err == nil {
		t.Fatal("authorization code without state accepted")
	}
	if _, err := fixture.s.AccountPreparationAction(ctx, preparation, "POST", "complete", json.RawMessage(`{"session_id":"s1","code":"code#state"}`)); err != nil {
		t.Fatal(err)
	}
	if err := fixture.s.CheckAccountPreparation(ctx, preparation); err != nil {
		t.Fatal(err)
	}
	preparation.CreatedBy = fixture.user("other@example.test")
	if err := fixture.s.CheckAccountPreparation(ctx, preparation); err == nil {
		t.Fatal("preparation accepted for another owner")
	}
}
