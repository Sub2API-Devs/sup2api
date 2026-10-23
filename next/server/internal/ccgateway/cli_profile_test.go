package ccgateway

import (
	"context"
	"encoding/json"
	"github.com/stretchr/testify/require"
	"net/http"
	"strconv"
	"strings"
	"testing"
)

func TestPinnedCLIDesiredRevisionAndControllerConfig(t *testing.T) {
	var received accountDesired
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			_, _ = w.Write([]byte(`{"features":["cli-profile-v1"]}`))
			return
		}
		if r.Method == "PUT" && strings.HasSuffix(r.URL.Path, "/config") {
			require.NoError(t, json.NewDecoder(r.Body).Decode(&received))
			_, _ = w.Write([]byte(`{}`))
			return
		}
		http.NotFound(w, r)
	})
	id := f.account(false)
	save := func(mode string) {
		policy := defaultRequestPolicy()
		policy.RelayMode = mode
		policy.CLIVersion = "2.1.302"
		raw, _ := json.Marshal(Config{Mode: "local", AccountRuntimes: true, AdminKey: "controller-secret", RequestPolicy: &policy})
		encrypted, err := f.cipher.Encrypt(raw, configAAD)
		require.NoError(t, err)
		envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
		_, err = f.db.Pool.Exec(context.Background(), "UPDATE settings SET value=$1 WHERE key=$2", envelope, settingKey)
		require.NoError(t, err)
	}
	save("build")
	d, err := f.s.desired(context.Background(), id, true)
	require.NoError(t, err)
	require.Equal(t, &RuntimeCLI{Version: "2.1.302", RequestMode: "build", DisableAutoUpdate: true}, d.CLI)
	require.NoError(t, f.s.putConfig(context.Background(), d.Key, d))
	require.Equal(t, d.CLI, received.CLI)
	save("direct")
	changed, err := f.s.desired(context.Background(), id, true)
	require.NoError(t, err)
	require.Equal(t, d.Revision, changed.Revision)
	require.Equal(t, "build", changed.CLI.RequestMode)
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

// TestSavedCLIVersionMustBeWhatTheRuntimesRun: the cli_version is part of
// every runtime's revision and the controller refuses a running container a
// version it was not paired with (409 cli_profile_unavailable, every account
// pending: audit B3). A PUT remote-config that changes it is refused unless
// the ready runtimes' Workers already run it; omitting it keeps the stored one.
func TestSavedCLIVersionMustBeWhatTheRuntimesRun(t *testing.T) {
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
	code, out := put(`,"cli_version":"2.1.305"`)
	require.Equal(t, 400, code, out)
	require.Equal(t, "cli_version_unavailable", reason(out))
	details := out["error"].(map[string]any)["details"].(map[string]any)
	require.Equal(t, []any{key}, details["runtimes"], "the runtimes still on another version are named")
	require.Equal(t, "2.1.302", stored())

	// The same version is no change: nothing is asked.
	code, out = put(`,"cli_version":"2.1.302"`)
	require.Equal(t, 200, code, out)

	// After the paired update the Worker runs it: the change is accepted.
	ctl.cliVersion = "2.1.305"
	code, out = put(`,"cli_version":"2.1.305"`)
	require.Equal(t, 200, code, out)
	require.Equal(t, "2.1.305", stored())

	// A body without cli_version keeps the stored one (it used to reset it
	// to the pinned version).
	code, out = put(``)
	require.Equal(t, 200, code, out)
	require.Equal(t, "2.1.305", stored())

	// Nothing confirms a version no ready runtime runs (the account is
	// pending at the new revision, an older Worker reports none): only the
	// pinned one is accepted then.
	ctl.cliVersion = ""
	code, out = put(`,"cli_version":"2.1.306"`)
	require.Equal(t, 400, code, out)
	require.Equal(t, "cli_version_unavailable", reason(out))
	code, out = put(`,"cli_version":"` + PinnedCLIVersion + `"`)
	require.Equal(t, 200, code, out)
	require.Equal(t, PinnedCLIVersion, stored())
}
