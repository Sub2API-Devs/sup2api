package ccgateway

import (
	"encoding/json"
	"errors"
	"net/http"
	"reflect"
	"strings"
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
	controller.mu.Lock()
	controller.subscription = "pro"
	controller.mu.Unlock()
	if facts, err := fixture.s.CheckAccountPreparation(ctx, preparation); err != nil || facts.SubscriptionType != "pro" {
		t.Fatal(facts, err)
	}
	preparation.CreatedBy = fixture.user("other@example.test")
	if _, err := fixture.s.CheckAccountPreparation(ctx, preparation); err == nil {
		t.Fatal("preparation accepted for another owner")
	}
}

// TestPreparationSyncAndStatusMatchTheDraftEndpoints: a preparation's sync
// fails like the draft's own sync (syncFailure: the controller's reason, else
// sync_failed; it used to fall back to runtime_unavailable) and its status is
// the draft status (code-quality audit 2026-10-24 K1).
func TestPreparationSyncAndStatusMatchTheDraftEndpoints(t *testing.T) {
	health := `{"features":["cli-profile-v1"]}`
	fixture := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/health":
			_, _ = w.Write([]byte(health))
		case strings.HasSuffix(r.URL.Path, "/status"):
			_, _ = w.Write([]byte(`{"container":"ccg-d1234567890abcdef","status":"ready","revision":"other"}`))
		case strings.HasSuffix(r.URL.Path, "/config"):
			w.WriteHeader(http.StatusConflict)
			_, _ = w.Write([]byte(`{"error":"cli_profile_unavailable"}`))
		default:
			t.Errorf("unexpected controller call %s", r.URL.Path)
		}
	})
	uid := fixture.user("preparation-sync@example.test")
	ctx := core.WithUserID(t.Context(), uid)
	preparation := core.AccountPreparation{Key: "d1234567890abcdef", PluginKey: "ccgateway", Type: "managed", CreatedBy: uid, Settings: json.RawMessage(`{}`)}
	if err := fixture.s.PrepareAccount(ctx, preparation); err != nil {
		t.Fatal(err)
	}
	reasonOfErr := func(err error) string { return reasonOf(core.AsError(err)) }

	_, err := fixture.s.AccountPreparationAction(ctx, preparation, "POST", "sync", nil)
	if got := reasonOfErr(err); got != "cli_profile_unavailable" {
		t.Fatalf("sync refused by the controller: %q %v", got, err)
	}
	health = `{"features":[]}` // an older controller: putConfig fails without a reason
	_, err = fixture.s.AccountPreparationAction(ctx, preparation, "POST", "sync", nil)
	if got := reasonOfErr(err); got != "sync_failed" {
		t.Fatalf("sync without a controller reason: %q %v", got, err)
	}

	out, err := fixture.s.AccountPreparationAction(ctx, preparation, "GET", "status", nil)
	if err != nil {
		t.Fatal(err)
	}
	if want := map[string]string{"key": preparation.Key, "container": "ccg-d1234567890abcdef", "status": "creating"}; !reflect.DeepEqual(out, want) {
		t.Fatalf("status: %#v", out)
	}
	if _, err := fixture.s.AccountPreparationAction(ctx, preparation, "POST", "logout", nil); !errors.Is(err, core.ErrNotFound) {
		t.Fatalf("a draft has no logout: %v", err)
	}
}
