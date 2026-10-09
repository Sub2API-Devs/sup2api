package config_test

import (
	"bytes"
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/procguard"
)

func setRequired(t *testing.T) (masterKey []byte, jwt string) {
	t.Helper()
	masterKey = bytes.Repeat([]byte{7}, 32)
	jwt = strings.Repeat("j", 40)
	t.Setenv("DATABASE_URL", "postgres://core:pw@pg:5432/sub2api")
	t.Setenv("REDIS_URL", "redis://:pw@redis:6379/0")
	t.Setenv("SUB2API_MASTER_KEY", base64.StdEncoding.EncodeToString(masterKey))
	t.Setenv("SUB2API_JWT_SECRET", jwt)
	t.Setenv("SUB2API_BOOTSTRAP_ADMIN_PASSWORD", "bootstrap-pw")
	t.Setenv("SUB2API_MANAGED", "true")
	t.Setenv("SUB2API_CONTROL_SOCKET", "/run/control.sock")
	t.Setenv("SUB2API_CONTROL_TOKEN", strings.Repeat("t", 40))
	t.Setenv("SUB2API_RELEASE_DIGEST", "sha256:abc")
	t.Setenv("SUB2API_CORE_BOOT_ID", "boot-1")
	return masterKey, jwt
}

// Once the configuration is loaded the secret variables are removed from
// the environment; the loaded Config keeps every value, so nothing later
// needs the environment.
func TestConfigSurvivesEnvScrub(t *testing.T) {
	mk, jwt := setRequired(t)
	cfg, err := config.Load("linux")
	if err != nil {
		t.Fatal(err)
	}
	if err := procguard.ScrubEnv(config.SensitiveEnv); err != nil {
		t.Fatal(err)
	}
	for _, k := range config.SensitiveEnv {
		if _, ok := os.LookupEnv(k); ok {
			t.Fatalf("%s still in the environment", k)
		}
	}
	for _, kv := range os.Environ() {
		if strings.Contains(kv, "pw@") || strings.Contains(kv, jwt) {
			t.Fatalf("secret still in the environment: %s", kv)
		}
	}
	if cfg.DatabaseURL != "postgres://core:pw@pg:5432/sub2api" || cfg.RedisURL != "redis://:pw@redis:6379/0" ||
		!bytes.Equal(cfg.MasterKey, mk) || string(cfg.JWTSecret) != jwt ||
		cfg.BootstrapAdminPassword != "bootstrap-pw" || cfg.Managed.Token != strings.Repeat("t", 40) {
		t.Fatalf("config lost values after the scrub: %+v", cfg)
	}
	// A second Load would now fail: nothing may depend on reading the
	// environment again.
	if _, err := config.Load("linux"); err == nil {
		t.Fatal("Load succeeded without the scrubbed variables")
	}
}

// Every secret Load reads is in SensitiveEnv.
func TestSensitiveEnvCoversSecrets(t *testing.T) {
	want := []string{"DATABASE_URL", "REDIS_URL", "SUB2API_MASTER_KEY", "SUB2API_JWT_SECRET",
		"SUB2API_BOOTSTRAP_ADMIN_PASSWORD", "SUB2API_CONTROL_TOKEN"}
	have := map[string]bool{}
	for _, k := range config.SensitiveEnv {
		have[k] = true
	}
	for _, k := range want {
		if !have[k] {
			t.Errorf("%s missing from SensitiveEnv", k)
		}
	}
}

func TestUpdaterTokenFile(t *testing.T) {
	setRequired(t)
	dir := t.TempDir()
	write := func(name, body string) string {
		p := filepath.Join(dir, name)
		if err := os.WriteFile(p, []byte(body), 0o600); err != nil {
			t.Fatal(err)
		}
		return p
	}
	// Not set: no token (older shells).
	cfg, err := config.Load("linux")
	if err != nil || cfg.Managed.UpdaterToken != "" {
		t.Fatalf("unset: %q %v", cfg.Managed.UpdaterToken, err)
	}
	tok := strings.Repeat("aB", 32)
	t.Setenv("SUB2API_UPDATER_TOKEN_FILE", write("ok", "  "+tok+"\n"))
	if cfg, err = config.Load("linux"); err != nil || cfg.Managed.UpdaterToken != tok {
		t.Fatalf("valid: %q %v", cfg.Managed.UpdaterToken, err)
	}
	// The token stays in memory: it is not in the environment.
	for _, kv := range os.Environ() {
		if strings.Contains(kv, tok) {
			t.Fatalf("token in the environment: %s", kv)
		}
	}
	for name, body := range map[string]string{
		"short":  strings.Repeat("a", 63),
		"long":   strings.Repeat("a", 65),
		"nonhex": strings.Repeat("g", 64),
		"empty":  "",
		"inner":  strings.Repeat("a", 32) + " " + strings.Repeat("a", 31),
	} {
		t.Setenv("SUB2API_UPDATER_TOKEN_FILE", write(name, body))
		if _, err := config.Load("linux"); err == nil || !strings.Contains(err.Error(), "SUB2API_UPDATER_TOKEN_FILE") {
			t.Fatalf("%s accepted: %v", name, err)
		}
	}
	t.Setenv("SUB2API_UPDATER_TOKEN_FILE", filepath.Join(dir, "missing"))
	if _, err := config.Load("linux"); err == nil {
		t.Fatal("missing token file accepted")
	}
}

func TestPluginRunDirAndEgressDefaults(t *testing.T) {
	setRequired(t)
	t.Setenv("SUB2API_PLUGIN_DIR", "/data/plugins")
	cfg, err := config.Load("linux")
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Plugins.RunDir != filepath.Join("/data/plugins", ".run") {
		t.Fatalf("run dir %q", cfg.Plugins.RunDir)
	}
	if cfg.Plugins.EgressAllowPrivate {
		t.Fatal("private egress allowed by default")
	}
	t.Setenv("SUB2API_PLUGIN_RUN_DIR", "/run/s2p")
	t.Setenv("SUB2API_PLUGIN_EGRESS_ALLOW_PRIVATE", "true")
	if cfg, err = config.Load("linux"); err != nil || cfg.Plugins.RunDir != "/run/s2p" || !cfg.Plugins.EgressAllowPrivate {
		t.Fatalf("overrides: %+v %v", cfg.Plugins, err)
	}
}
