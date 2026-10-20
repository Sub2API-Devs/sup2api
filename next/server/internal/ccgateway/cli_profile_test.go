package ccgateway

import (
	"context"
	"encoding/json"
	"github.com/stretchr/testify/require"
	"net/http"
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
		got := reloaded.WorkerRequestPolicy(21)
		require.Equal(t, mode, got.RelayMode)
		require.Equal(t, "2.1.304", got.CLIVersion)
		require.Equal(t, mode, reloaded.EffectiveRequestPolicy().RelayMode)
	}
	for _, version := range []string{"../2.1.302", "latest", "2.1.302\n", "2.1.302;sh"} {
		p := defaultRequestPolicy()
		p.CLIVersion = version
		_, err := mergeConfig(Config{Mode: "disabled", RequestPolicy: &p}, Config{Mode: "disabled"})
		require.Error(t, err)
	}
}
