package config

import (
	"encoding/base64"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/workersetup"
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
		"AI_GATEWAY_WORKER_ID",
		"AI_GATEWAY_INSTANCE_ID",
		"AI_GATEWAY_MANAGEMENT_KEY",
		"AI_GATEWAY_VAULT_KEY",
		"AI_GATEWAY_REDIS_URL",
		"AI_GATEWAY_WORKER_LOG_MAX_LEN",
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

func TestFromEnvWithWorkerUsesUIProvisionedConfigurationWithoutRedis(t *testing.T) {
	t.Setenv("AI_GATEWAY_WORKER_ID", "legacy-env-worker")
	t.Setenv("AI_GATEWAY_MANAGEMENT_KEY", strings.Repeat("e", 32))
	t.Setenv("AI_GATEWAY_VAULT_KEY", "legacy-env-vault")
	t.Setenv("AI_GATEWAY_CONTROL_PLANE", "legacy-control:1")
	t.Setenv("AI_GATEWAY_CONTROL_PLANE_INSECURE", "not-a-bool")
	t.Setenv("AI_GATEWAY_REDIS_URL", "redis://should-never-be-read:6379/0")
	worker := &workersetup.Config{
		WorkerID: "gateway-ui-01", ManagementKey: strings.Repeat("m", 32),
		VaultKey:           base64.StdEncoding.EncodeToString(make([]byte, 32)),
		ControlPlaneTarget: "sub2api:9090", ControlPlaneInsecure: true,
	}
	cfg, err := FromEnvWithWorker(worker, "instance-ui")
	if err != nil {
		t.Fatal(err)
	}
	if cfg.NodeID != worker.WorkerID || cfg.WorkerManagementKey != worker.ManagementKey || cfg.ControlPlaneTarget != worker.ControlPlaneTarget || cfg.WorkerInstanceID != "instance-ui" {
		t.Fatalf("UI Worker configuration was not applied: %+v", cfg)
	}
	worker.VaultKey = "bad"
	if _, err := FromEnvWithWorker(worker, "instance-ui"); err == nil || !strings.Contains(err.Error(), "vault_key") {
		t.Fatalf("expected invalid UI vault key to fail, got %v", err)
	}
}

func TestFromEnvRequiresCAForSecureTCP(t *testing.T) {
	t.Setenv("AI_GATEWAY_CONTROL_PLANE_CA_FILE", "")
	worker := &workersetup.Config{
		WorkerID: "gateway-ui-tls", ManagementKey: strings.Repeat("m", 32),
		VaultKey:           base64.StdEncoding.EncodeToString(make([]byte, 32)),
		ControlPlaneTarget: "dns:///control.internal:9443", ControlPlaneInsecure: false,
	}
	if _, err := FromEnvWithWorker(worker, "instance-ui"); err == nil {
		t.Fatal("expected missing CA error")
	}
}
