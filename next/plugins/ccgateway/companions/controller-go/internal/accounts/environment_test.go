package accounts

import (
	"testing"

	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
	"ccgateway/controller/internal/workeradmin"
)

func oauthWith(locale, timezone string) pyjson.Ordered {
	a := pyjson.Ordered{kv("mode", "oauth")}
	if locale != "" {
		a = append(a, kv("locale", locale))
	}
	if timezone != "" {
		a = append(a, kv("timezone", timezone))
	}
	return a
}

// covers: PV6 PV7 S19 (test_environment_changes_preserve_existing_runtime)
func TestEnvironmentChangesPreserveExistingRuntime(t *testing.T) {
	e := newEnv(t)
	w := e.startWorker(404) // an older Worker has no /admin/environment
	e.mustApply("7", desired(rev))
	app := e.appID("7")
	e.mustApply("7", desired(revB, kv("auth", oauthWith("ja_JP.UTF-8", "Asia/Tokyo"))))
	if w.count() != 1 || e.appID("7") != app || !e.g.Exists("ccg-7-data") {
		t.Fatal("one attempt, same container and volume")
	}
	p, _ := e.m.Public(bg, "7")
	if !p.EnvironmentPending || e.state("7").Environment.V != (store.Environment{}) {
		t.Fatalf("%+v", p)
	}
}

// covers: PV7 S17 S18 S19 S20 T11 (test_environment_change_applied_in_place_by_worker)
func TestEnvironmentChangeAppliedInPlaceByWorker(t *testing.T) {
	e := newEnv(t)
	w := e.startWorker(200)
	e.mustApply("7", desired(rev))
	app := e.app("7")
	st := e.state("7")
	e.mustApply("7", desired(revB, kv("auth", oauthWith("ja_JP.UTF-8", "Asia/Tokyo"))))
	if w.count() != 1 {
		t.Fatal(w.count())
	}
	c := w.last()
	if c.Method != "PUT" || c.Path != "/admin/environment" || c.Auth != "Bearer "+st.AdminKey ||
		string(c.Body) != `{"locale": "ja_JP.UTF-8", "timezone": "Asia/Tokyo"}` {
		t.Fatalf("%+v", c)
	}
	if now := e.app("7"); now.ID != app.ID || now.StartedAt != app.StartedAt {
		t.Fatal("not even restarted")
	}
	saved := e.state("7")
	if saved.EnvironmentPending.V || saved.Has("environment_desired") ||
		saved.Environment.V != (store.Environment{Locale: "ja_JP.UTF-8", Timezone: "Asia/Tokyo"}) {
		t.Fatal("applied")
	}
	w.set(200, nil)
	e.mustApply("7", desired(revB, kv("auth", oauthWith("ja_JP.UTF-8", "Asia/Tokyo"))))
	if w.count() != 0 {
		t.Fatal("nothing changed: no Worker call")
	}
}

// covers: PV7 (test_environment_retried_after_worker_failure)
func TestEnvironmentRetriedAfterWorkerFailure(t *testing.T) {
	e := newEnv(t)
	w := e.startWorker(200)
	e.mustApply("7", desired(rev))
	auth := oauthWith("de_DE.UTF-8", "Europe/Berlin")
	failures := []func(){
		func() { w.set(405, nil) },
		func() { w.set(500, nil) },
		func() {
			w.set(200, func([]byte) []byte { return []byte(`{"locale": "other", "timezone": "Europe/Berlin"}`) })
		},
		func() { e.m.worker = &workeradmin.Client{Port: 1, HostOverride: "127.0.0.1"} },
	}
	for i, fail := range failures {
		fail()
		if e.mustApply("7", desired(revB, kv("auth", auth))).Status != "ready" {
			t.Fatal(i)
		}
		if p, _ := e.m.Public(bg, "7"); !p.EnvironmentPending {
			t.Fatal("still pending", i)
		}
	}
	e.m.worker = e.worker
	w.set(200, nil)
	e.mustApply("7", desired(revB, kv("auth", auth)))
	if p, _ := e.m.Public(bg, "7"); p.EnvironmentPending {
		t.Fatal("applied on the next reconciliation")
	}
}

// covers: PV7 S18 (test_environment_set_at_creation_cannot_be_cleared_in_place)
func TestEnvironmentSetAtCreationCannotBeClearedInPlace(t *testing.T) {
	e := newEnv(t)
	w := e.startWorker(200)
	e.mustApply("7", desired(rev, kv("auth", oauthWith("", "Asia/Tokyo"))))
	if e.appEnv("7")["TZ"] != "Asia/Tokyo" {
		t.Fatal("TZ")
	}
	if p, _ := e.m.Public(bg, "7"); p.EnvironmentPending {
		t.Fatal("not pending")
	}
	w.set(200, nil)
	e.mustApply("7", desired(revB, kv("auth", oauthWith("", ""))))
	if p, _ := e.m.Public(bg, "7"); w.count() != 0 || !p.EnvironmentPending {
		t.Fatal("empty means the container's own value")
	}
	e.mustApply("7", desired(revB, kv("auth", oauthWith("", "Europe/Paris"))))
	if p, _ := e.m.Public(bg, "7"); w.count() != 1 || p.EnvironmentPending {
		t.Fatal("another timezone is applied in place")
	}
}

// covers: PV16 V6 (locale becomes LANG and LC_ALL, with .UTF-8 when it has no codeset)
func TestLocaleBecomesLangAndLCAll(t *testing.T) {
	e := newEnv(t)
	e.mustApply("7", desired(rev, kv("auth", oauthWith("zh_CN", ""))))
	env := e.appEnv("7")
	if env["LANG"] != "zh_CN.UTF-8" || env["LC_ALL"] != "zh_CN.UTF-8" {
		t.Fatal(env["LANG"])
	}
	e.mustApply("8", desired(rev, kv("auth", pyjson.Ordered{kv("mode", "api_key"), kv("api_key", "sk-test-key-123"),
		kv("base_url", "https://api.example.test/v1/")})))
	env = e.appEnv("8")
	if env["ANTHROPIC_API_KEY"] != "sk-test-key-123" || env["ANTHROPIC_BASE_URL"] != "https://api.example.test" {
		t.Fatal(env)
	}
	if p, _ := e.m.Public(bg, "8"); p.AuthMode != "api_key" {
		t.Fatal(p.AuthMode)
	}
}
