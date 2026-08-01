package config

import (
	"testing"
	"time"
)

func TestFromEnvDefaultsToUnixControlPlaneAndPort9999(t *testing.T) {
	for _, key := range []string{
		"AI_GATEWAY_LISTEN",
		"AI_GATEWAY_NODE_ID",
		"AI_GATEWAY_CONTROL_PLANE",
		"AI_GATEWAY_CONTROL_PLANE_INSECURE",
		"AI_GATEWAY_STARTUP_REQUIRED",
		"AI_GATEWAY_DIAL_TIMEOUT",
		"AI_GATEWAY_REQUEST_TIMEOUT",
		"AI_GATEWAY_GRACE_PERIOD",
		"AI_GATEWAY_LEASE_RENEW_INTERVAL",
		"AI_GATEWAY_SETTLEMENT_WAL_PATH",
		"AI_GATEWAY_SETTLEMENT_WAL_MAX_BYTES",
		"AI_GATEWAY_AUTH_CACHE_TTL",
		"AI_GATEWAY_AUTH_CACHE_SIZE",
		"AI_GATEWAY_CONTROL_PLANE_CA_FILE",
	} {
		t.Setenv(key, "")
	}

	cfg, err := FromEnv()
	if err != nil {
		t.Fatalf("FromEnv: %v", err)
	}
	if cfg.ListenAddress != ":9999" {
		t.Fatalf("listen = %q", cfg.ListenAddress)
	}
	if !cfg.ControlPlaneInsecure {
		t.Fatal("Unix control plane should default to filesystem-secured plaintext transport")
	}
	if !cfg.StartupRequired {
		t.Fatal("control plane should be required by default")
	}
	if cfg.LeaseRenewInterval != 30*time.Second {
		t.Fatalf("lease renew interval = %v", cfg.LeaseRenewInterval)
	}
	if cfg.SettlementWALPath != "./data/settlements" || cfg.SettlementWALMaxBytes != 1<<30 {
		t.Fatalf("settlement WAL defaults = %q, %d", cfg.SettlementWALPath, cfg.SettlementWALMaxBytes)
	}
}

func TestFromEnvRequiresCAForSecureTCP(t *testing.T) {
	t.Setenv("AI_GATEWAY_CONTROL_PLANE", "dns:///control.internal:9443")
	t.Setenv("AI_GATEWAY_CONTROL_PLANE_INSECURE", "false")
	t.Setenv("AI_GATEWAY_CONTROL_PLANE_CA_FILE", "")
	if _, err := FromEnv(); err == nil {
		t.Fatal("expected missing CA error")
	}
}
