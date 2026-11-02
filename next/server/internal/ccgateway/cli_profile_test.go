package ccgateway

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestRuntimeConfigLeavesTheCLIToTheImage: the core names no CLI in a
// runtime's configuration (cli-from-image-v1); the stored cli_version is
// not part of the revision, and only a controller without the feature is
// sent the legacy profile.
func TestRuntimeConfigLeavesTheCLIToTheImage(t *testing.T) {
	features := `["cli-profile-v1","cli-from-image-v1"]`
	var received map[string]any
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			_, _ = w.Write([]byte(`{"features":` + features + `}`))
			return
		}
		if r.Method == "PUT" && strings.HasSuffix(r.URL.Path, "/config") {
			received = nil
			require.NoError(t, json.NewDecoder(r.Body).Decode(&received))
			_, _ = w.Write([]byte(`{}`))
			return
		}
		http.NotFound(w, r)
	})
	id := f.account(false)
	save := func(version string) {
		policy := defaultRequestPolicy()
		policy.CLIVersion = version
		raw, _ := json.Marshal(Config{Mode: "local", AccountRuntimes: true, AdminKey: "controller-secret", RequestPolicy: &policy})
		encrypted, err := f.cipher.Encrypt(raw, configAAD)
		require.NoError(t, err)
		envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
		_, err = f.db.Pool.Exec(context.Background(), "UPDATE settings SET value=$1 WHERE key=$2", envelope, settingKey)
		require.NoError(t, err)
	}
	save("2.1.302")
	d, err := f.s.desired(context.Background(), id, true)
	require.NoError(t, err)
	require.Nil(t, d.CLI)
	require.NoError(t, f.s.putConfig(context.Background(), d.Key, d))
	require.NotContains(t, received, "cli")

	save("2.1.304")
	changed, err := f.s.desired(context.Background(), id, true)
	require.NoError(t, err)
	require.Equal(t, d.Revision, changed.Revision, "the stored cli_version is no runtime change")

	// An older controller still needs a profile: the stored version.
	features = `["cli-profile-v1"]`
	require.NoError(t, f.s.putConfig(context.Background(), changed.Key, changed))
	require.Equal(t, map[string]any{"version": "2.1.304", "request_mode": "build", "disable_auto_update": true}, received["cli"])
	features = `[]`
	require.ErrorContains(t, f.s.putConfig(context.Background(), changed.Key, changed), "cli-profile-v1")
}

func TestPinnedRequestModesSaveReload(t *testing.T) {
	for _, mode := range []string{"direct", "build"} {
		p := defaultRequestPolicy()
		p.RelayMode = mode
		saved, err := mergeConfig(Config{Mode: "disabled", RequestPolicy: &p}, Config{Mode: "disabled"})
		require.NoError(t, err)
		raw, _ := json.Marshal(saved)
		var reloaded Config
		require.NoError(t, json.Unmarshal(raw, &reloaded))
		got := reloaded.EffectiveRequestPolicy()
		require.Equal(t, mode, got.RelayMode)
		require.Equal(t, PinnedCLIVersion, got.CLIVersion)
		require.Equal(t, mode, reloaded.EffectiveRequestPolicy().RelayMode)
	}
	for _, version := range []string{"../2.1.302", "latest", "2.1.302\n", "2.1.302;sh"} {
		p := defaultRequestPolicy()
		p.CLIVersion = version
		_, err := mergeConfig(Config{Mode: "disabled", RequestPolicy: &p}, Config{Mode: "disabled"})
		require.Error(t, err)
	}
}

// TestSavedCLIVersionAsksNoRuntime: the stored cli_version only reaches
// controllers without cli-from-image-v1, so a save no longer asks the
// Workers which CLI they run (it used to refuse a version they did not run,
// audit B3); omitting it keeps the stored one.
func TestSavedCLIVersionAsksNoRuntime(t *testing.T) {
	ctl := newFakeController(t)
	f := newRuntimeFixture(t, ctl.ServeHTTP)
	id := f.account(true)
	key := strconv.FormatInt(id, 10)
	require.NoError(t, f.s.Reconcile(context.Background(), key))
	admin := f.user("cli-version@test")
	put := func(policy string) (int, map[string]any) {
		cfg, err := f.s.Load(context.Background())
		require.NoError(t, err)
		return f.request(admin, "PUT", "/system/ccgateway/remote-config", `{"mode":"local","feature_revision":`+strconv.FormatInt(cfg.FeatureRevision, 10)+`,"request_policy":{"schema_version":1,"unknown_field":"reject"`+policy+`}}`)
	}
	stored := func() string {
		cfg, err := f.s.Load(context.Background())
		require.NoError(t, err)
		return cfg.EffectiveRequestPolicy().CLIVersion
	}
	ctl.cliVersion = "2.1.302"
	before := len(ctl.seen("GET /accounts/" + key + "/admin/features"))
	code, out := put(`,"cli_version":"2.1.305"`)
	require.Equal(t, 200, code, out)
	require.Equal(t, "2.1.305", stored())
	require.Len(t, ctl.seen("GET /accounts/"+key+"/admin/features"), before, "no Worker is asked")
	code, out = put(``)
	require.Equal(t, 200, code, out)
	require.Equal(t, "2.1.305", stored())
}

// TestSaveReportsStoredConfigFaults: a stored configuration that cannot be
// read (here it no longer decrypts) is a server fault, 500 internal, whether
// or not the body changes cli_version. It used to be 400 invalid_argument,
// and with a changed cli_version a failed read before the transaction could
// end as 409 config_changed (code-quality audit 2026-10-24 K4).
func TestSaveReportsStoredConfigFaults(t *testing.T) {
	f := newRuntimeFixture(t, newFakeController(t).ServeHTTP)
	admin := f.user("stored-fault@test")
	_, err := f.db.Pool.Exec(context.Background(), `INSERT INTO settings(key,value) VALUES($1,'{"cipher":"AAAA"}')
		ON CONFLICT(key) DO UPDATE SET value=excluded.value`, settingKey)
	require.NoError(t, err)
	for _, policy := range []string{``, `,"cli_version":"2.1.305"`} {
		code, out := f.request(admin, "PUT", "/system/ccgateway/remote-config", `{"mode":"local","request_policy":{"schema_version":1,"unknown_field":"reject"`+policy+`}}`)
		require.Equal(t, 500, code, out)
		require.Equal(t, "internal", out["error"].(map[string]any)["code"], out)
	}
}
