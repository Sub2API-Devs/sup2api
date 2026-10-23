package engine

import (
	"os"
	"path/filepath"
	"slices"
	"sync"
	"testing"
)

func TestContainerResourceReportingRequiresVerifiedCLICapability(t *testing.T) {
	g := &Gateway{Runner: &Runner{}}
	g.configureResourceReporting()
	if g.Runner.ReportContainerResources {
		t.Fatal("unverified CLI enabled container reporting")
	}
	g.CLIInfo.Capabilities = []string{"request_build", "container_resource_reporting_v1"}
	g.configureResourceReporting()
	if !g.Runner.ReportContainerResources ||
		!slices.Contains(g.requestCapabilities(), "container_resource_reporting_v1") {
		t.Fatal("supporting CLI did not enable container reporting")
	}
	g.MaintenanceOnly = true
	g.configureResourceReporting()
	if g.Runner.ReportContainerResources || slices.Contains(g.requestCapabilities(), "container_resource_reporting_v1") {
		t.Fatal("maintenance runtime advertised active container reporting")
	}
}

func TestEnvironmentManagementAPI(t *testing.T) {
	dir := t.TempDir()
	base := []string{"PATH=/bin", "LANG=C.UTF-8", "TZ=UTC"}
	a := &authManager{key: "admin-key", env: base, overrides: NewEnvironmentOverrides(dir)}

	for _, key := range []string{"", "wrong"} {
		if got := authRequest(a, "PUT", "/admin/environment", `{"locale":"ja_JP.UTF-8","timezone":"Asia/Tokyo"}`, key).Code; got != 401 {
			t.Fatalf("key %q: got %d", key, got)
		}
	}
	if _, err := os.Stat(filepath.Join(dir, environmentFile)); !os.IsNotExist(err) {
		t.Fatal("unauthenticated request wrote the environment")
	}
	got := okBody(t, authRequest(a, "GET", "/admin/environment", "", "admin-key"))
	if got["locale"] != "" || got["timezone"] != "" || got["effective"].(map[string]any)["TZ"] != "UTC" {
		t.Fatalf("initial view %v", got)
	}

	for _, body := range []string{
		`not json`, `{"locale":"en_US","extra":1}`, `{"locale":"en_US"}{}`,
		`{"locale":"en_US; rm -rf /"}`, `{"locale":"e"}`, `{"locale":"en_US.ISO-8859-1"}`,
		`{"timezone":"Mars/Olympus"}`, `{"timezone":"../etc/passwd"}`, `{"timezone":"Local"}`, `{"timezone":"Asia/Tokyo\n"}`,
		`{"locale":123}`,
	} {
		expectCode(t, authRequest(a, "PUT", "/admin/environment", body, "admin-key"), 400, "invalid_request_error")
	}
	expectCode(t, authRequest(a, "POST", "/admin/environment", `{}`, "admin-key"), 405, "invalid_request_error")
	if _, err := os.Stat(filepath.Join(dir, environmentFile)); !os.IsNotExist(err) {
		t.Fatal("rejected request wrote the environment")
	}

	got = okBody(t, authRequest(a, "PUT", "/admin/environment", `{"locale":"zh-CN","timezone":"America/Los_Angeles"}`, "admin-key"))
	effective := got["effective"].(map[string]any)
	if got["locale"] != "zh-CN" || got["timezone"] != "America/Los_Angeles" || effective["LANG"] != "zh-CN.UTF-8" || effective["LC_ALL"] != "zh-CN.UTF-8" || effective["TZ"] != "America/Los_Angeles" {
		t.Fatalf("updated view %v", got)
	}
	// Login, refresh and logout processes start from this environment.
	env := a.environment()
	if environmentValue(env, "LANG") != "zh-CN.UTF-8" || environmentValue(env, "LC_ALL") != "zh-CN.UTF-8" || environmentValue(env, "TZ") != "America/Los_Angeles" || environmentValue(env, "PATH") != "/bin" {
		t.Fatalf("auth environment %v", env)
	}
	// The status snapshot reports what new processes receive.
	status := okBody(t, authRequest(a, "GET", "/admin/status", "", "admin-key"))
	if view, _ := status["environment"].(map[string]any); view["timezone"] != "America/Los_Angeles" {
		t.Fatalf("status environment %v", status)
	}

	// Persisted: a restarted worker loads the same values.
	reloaded := NewEnvironmentOverrides(dir)
	if reloaded.get() != (environmentOverride{Locale: "zh-CN", Timezone: "America/Los_Angeles"}) {
		t.Fatalf("reloaded %+v", reloaded.get())
	}
	if leftovers, _ := filepath.Glob(filepath.Join(dir, ".environment-*")); len(leftovers) != 0 {
		t.Fatalf("temporary files left: %v", leftovers)
	}

	// Empty values keep the inherited variables; an encoding is kept as given.
	got = okBody(t, authRequest(a, "PUT", "/admin/environment", `{"locale":"en_US.utf8","timezone":""}`, "admin-key"))
	effective = got["effective"].(map[string]any)
	if effective["LANG"] != "en_US.utf8" || effective["TZ"] != "UTC" {
		t.Fatalf("partial override %v", got)
	}
	got = okBody(t, authRequest(a, "PUT", "/admin/environment", `{}`, "admin-key"))
	if effective = got["effective"].(map[string]any); effective["LANG"] != "C.UTF-8" || effective["LC_ALL"] != "" || effective["TZ"] != "UTC" {
		t.Fatalf("cleared override %v", got)
	}
	if NewEnvironmentOverrides(dir).get() != (environmentOverride{}) {
		t.Fatal("cleared override not persisted")
	}
}

func TestEnvironmentOverridesRequestProcesses(t *testing.T) {
	dir := t.TempDir()
	s := NewEnvironmentOverrides(dir)
	r := &Runner{Env: []string{"PATH=/bin", "LANG=C", "LC_ALL=C"}, Overrides: s}
	if env := r.baseEnv(); environmentValue(env, "LANG") != "C" || environmentValue(env, "TZ") != "" {
		t.Fatalf("no override changed the environment: %v", env)
	}
	if err := s.Update(environmentOverride{Locale: "de_DE", Timezone: "Europe/Berlin"}); err != nil {
		t.Fatal(err)
	}
	env := r.baseEnv()
	if environmentValue(env, "LANG") != "de_DE.UTF-8" || environmentValue(env, "LC_ALL") != "de_DE.UTF-8" || environmentValue(env, "TZ") != "Europe/Berlin" || environmentValue(env, "DISABLE_AUTOUPDATER") != "1" {
		t.Fatalf("request environment %v", env)
	}
	// A nil store (older construction paths) applies nothing.
	if env := (&Runner{Env: []string{"TZ=UTC"}}).baseEnv(); environmentValue(env, "TZ") != "UTC" {
		t.Fatalf("nil store %v", env)
	}
}

func TestEnvironmentOverridesInvalidFileIgnored(t *testing.T) {
	dir := t.TempDir()
	for _, data := range []string{`{`, `{"locale":"x y","timezone":"Asia/Tokyo"}`, `{"timezone":"Mars/Olympus"}`} {
		if err := os.WriteFile(filepath.Join(dir, environmentFile), []byte(data), 0600); err != nil {
			t.Fatal(err)
		}
		if got := NewEnvironmentOverrides(dir).get(); got != (environmentOverride{}) {
			t.Fatalf("%s loaded as %+v", data, got)
		}
	}
}

func TestEnvironmentOverridesConcurrent(t *testing.T) {
	s := NewEnvironmentOverrides(t.TempDir())
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(2)
		go func(i int) {
			defer wg.Done()
			zone := []string{"Asia/Tokyo", "Europe/Paris"}[i%2]
			if err := s.Update(environmentOverride{Timezone: zone}); err != nil {
				t.Error(err)
			}
		}(i)
		go func() {
			defer wg.Done()
			if tz := environmentValue(s.Apply([]string{"TZ=UTC"}), "TZ"); tz != "UTC" && tz != "Asia/Tokyo" && tz != "Europe/Paris" {
				t.Errorf("torn value %q", tz)
			}
		}()
	}
	wg.Wait()
}
