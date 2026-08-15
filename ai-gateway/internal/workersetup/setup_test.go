package workersetup

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/nats-io/nkeys"
)

func setupTestCredentials(t *testing.T) string {
	t.Helper()
	pair, err := nkeys.CreateUser()
	if err != nil {
		t.Fatal(err)
	}
	defer pair.Wipe()
	seed, err := pair.Seed()
	if err != nil {
		t.Fatal(err)
	}
	return fmt.Sprintf("-----BEGIN NATS USER JWT-----\ntest.jwt.value\n------END NATS USER JWT------\n\n-----BEGIN USER NKEY SEED-----\n%s\n------END USER NKEY SEED------\n", seed)
}

func TestBootstrapClaimPersistsOnlyUIProvisionedConfiguration(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "worker-config.json")
	pairingPath := configPath + ".pairing"
	if err := os.WriteFile(pairingPath, []byte("pair-once\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	managementKey := strings.Repeat("m", 32)
	vaultKey := base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{4}, 32))
	claimed := make(chan *Config, 1)
	handler := &bootstrapHandler{
		pairingToken: "pair-once", managementKey: managementKey, vaultKey: vaultKey,
		configPath: configPath, pairingPath: pairingPath,
		instanceID: "instance-a", version: "test", claimed: claimed,
	}
	claim := ClaimRequest{
		PairingToken: "wrong",
		Config: Config{
			WorkerID:           "worker-ui",
			ControlPlaneTarget: "sub2api:9090", ControlPlaneInsecure: true,
			NATSURL: "tls://nats.example.com:443", NATSSubject: "sup2api.usage.settlements.v1",
			NATSCredentials: setupTestCredentials(t),
		},
	}
	raw, _ := json.Marshal(claim)
	request := httptest.NewRequest(http.MethodPost, "/worker/v1/claim", bytes.NewReader(raw))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("wrong pairing token returned %d", response.Code)
	}
	if _, err := os.Stat(configPath); !os.IsNotExist(err) {
		t.Fatal("wrong pairing token persisted configuration")
	}

	claim.PairingToken = "pair-once"
	raw, _ = json.Marshal(claim)
	request = httptest.NewRequest(http.MethodPost, "/worker/v1/claim", bytes.NewReader(raw))
	response = httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusCreated {
		t.Fatalf("claim returned %d: %s", response.Code, response.Body.String())
	}
	loaded, err := Load(configPath)
	if err != nil {
		t.Fatal(err)
	}
	if loaded == nil || loaded.WorkerID != "worker-ui" || loaded.ControlPlaneTarget != "sub2api:9090" || loaded.ManagementKey != managementKey || loaded.VaultKey != vaultKey {
		t.Fatalf("unexpected persisted Worker config: %+v", loaded)
	}
	if strings.Contains(response.Body.String(), managementKey) || strings.Contains(response.Body.String(), vaultKey) {
		t.Fatalf("claim response leaked Worker secrets: %s", response.Body.String())
	}
	info, err := os.Stat(configPath)
	if err != nil || info.Mode().Perm() != 0o600 {
		t.Fatalf("Worker config permissions: %v %v", info, err)
	}
	persisted, _ := os.ReadFile(configPath)
	if bytes.Contains(persisted, []byte("redis")) {
		t.Fatalf("Worker configuration contains Redis topology: %s", persisted)
	}
	if _, err := os.Stat(pairingPath); !os.IsNotExist(err) {
		t.Fatal("one-time pairing token was not removed")
	}
	select {
	case got := <-claimed:
		if got.WorkerID != loaded.WorkerID {
			t.Fatalf("claimed config mismatch: %+v", got)
		}
	default:
		t.Fatal("claim was not delivered to bootstrap runtime")
	}
}

func TestBootstrapClaimUsesEnvironmentSecretsNotRequestBody(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "worker-config.json")
	envManagement := strings.Repeat("e", 32)
	envVault := base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{9}, 32))
	handler := &bootstrapHandler{
		pairingToken: "pair-once", managementKey: envManagement, vaultKey: envVault,
		configPath: configPath, pairingPath: configPath + ".pairing",
		instanceID: "instance-env", version: "test", claimed: make(chan *Config, 1),
	}
	claim := ClaimRequest{
		PairingToken: "pair-once",
		Config: Config{
			WorkerID: "worker-ui", ManagementKey: strings.Repeat("x", 32),
			VaultKey:           base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{1}, 32)),
			ControlPlaneTarget: "sub2api:9090", ControlPlaneInsecure: true,
			NATSURL: "tls://nats.example.com:443", NATSSubject: "sup2api.usage.settlements.v1",
			NATSCredentials: setupTestCredentials(t),
		},
	}
	raw, _ := json.Marshal(claim)
	request := httptest.NewRequest(http.MethodPost, "/worker/v1/claim", bytes.NewReader(raw))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusCreated {
		t.Fatalf("claim returned %d: %s", response.Code, response.Body.String())
	}
	loaded, err := Load(configPath)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.ManagementKey != envManagement || loaded.VaultKey != envVault {
		t.Fatalf("claim used request secrets instead of Worker env: %+v", loaded)
	}
}

func TestLoadOperatorSecretsRequiresWorkerEnvironment(t *testing.T) {
	t.Setenv(managementKeyEnv, "")
	t.Setenv(vaultKeyEnv, "")
	if _, _, err := loadOperatorSecrets(); err == nil || !strings.Contains(err.Error(), managementKeyEnv) {
		t.Fatalf("expected missing management key error, got %v", err)
	}
	t.Setenv(managementKeyEnv, strings.Repeat("m", 32))
	if _, _, err := loadOperatorSecrets(); err == nil || !strings.Contains(err.Error(), vaultKeyEnv) {
		t.Fatalf("expected missing vault key error, got %v", err)
	}
	vault := base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{4}, 32))
	t.Setenv(vaultKeyEnv, vault)
	management, gotVault, err := loadOperatorSecrets()
	if err != nil || management != strings.Repeat("m", 32) || gotVault != vault {
		t.Fatalf("expected operator secrets from env, got %q %q %v", management, gotVault, err)
	}
}

func TestResolvePairingTokenPrefersEnvironment(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "worker-config.json.pairing")
	if err := os.WriteFile(path, []byte(strings.Repeat("f", minPairingTokenLength)+"\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	envToken := strings.Repeat("e", minPairingTokenLength)
	t.Setenv("AI_GATEWAY_PAIRING_TOKEN", envToken)
	token, fromEnv, err := resolvePairingToken(path)
	if err != nil {
		t.Fatal(err)
	}
	if !fromEnv || token != envToken {
		t.Fatalf("env token not used: fromEnv=%v token=%q", fromEnv, token)
	}
	stored, err := os.ReadFile(path)
	if err != nil || strings.TrimSpace(string(stored)) != envToken {
		t.Fatalf("pairing file not synced from env: %q %v", stored, err)
	}
}

func TestResolvePairingTokenFallsBackToFileWhenEnvEmpty(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "worker-config.json.pairing")
	fileToken := strings.Repeat("f", minPairingTokenLength)
	if err := os.WriteFile(path, []byte(fileToken+"\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("AI_GATEWAY_PAIRING_TOKEN", "")
	token, fromEnv, err := resolvePairingToken(path)
	if err != nil {
		t.Fatal(err)
	}
	if fromEnv || token != fileToken {
		t.Fatalf("file token not used: fromEnv=%v token=%q", fromEnv, token)
	}
}

func TestResolvePairingTokenRejectsShortEnvironment(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "worker-config.json.pairing")
	t.Setenv("AI_GATEWAY_PAIRING_TOKEN", strings.Repeat("e", minPairingTokenLength-1))
	if _, _, err := resolvePairingToken(path); err == nil || !strings.Contains(err.Error(), "at least 48") {
		t.Fatalf("expected short env token error, got %v", err)
	}
}

func TestResolvePairingTokenRejectsShortStoredFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "worker-config.json.pairing")
	if err := os.WriteFile(path, []byte("file-token\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("AI_GATEWAY_PAIRING_TOKEN", "")
	if _, _, err := resolvePairingToken(path); err == nil || !strings.Contains(err.Error(), "at least 48") {
		t.Fatalf("expected short stored token error, got %v", err)
	}
}

func TestLoadOrCreatePairingTokenGeneratesMinimumLength(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "worker-config.json.pairing")
	token, err := loadOrCreatePairingToken(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(token) < minPairingTokenLength {
		t.Fatalf("generated token too short: %d", len(token))
	}
}

func TestApplyKeepsUnspecifiedSecretsAndValidatesUpdatedNATSURL(t *testing.T) {
	insecure := false
	current := Config{
		WorkerID: "worker-ui", ManagementKey: strings.Repeat("m", 32),
		VaultKey:           base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{4}, 32)),
		ControlPlaneTarget: "sub2api:9090", ControlPlaneInsecure: true,
		NATSURL: "nats://nats:4222", NATSSubject: "sup2api.usage.settlements.v1",
		NATSCredentials: setupTestCredentials(t),
	}
	updated, err := current.Apply(UpdateRequest{
		ControlPlaneTarget: "sup2api:9443", ControlPlaneInsecure: &insecure,
		NATSURL: "tls://nats.example.com:443",
	})
	if err != nil {
		t.Fatal(err)
	}
	if updated.ManagementKey != current.ManagementKey || updated.VaultKey != current.VaultKey {
		t.Fatal("unspecified secrets were replaced")
	}
	if updated.ControlPlaneTarget != "sup2api:9443" || updated.ControlPlaneInsecure || updated.NATSURL != "tls://nats.example.com:443" {
		t.Fatalf("updated public config: %+v", updated)
	}
	if _, err := current.Apply(UpdateRequest{NATSURL: "redis://nats:6379"}); err == nil {
		t.Fatal("invalid NATS URL must be rejected")
	}
}

func TestBootstrapStatusExposesNoPairingSecret(t *testing.T) {
	handler := &bootstrapHandler{pairingToken: "secret-pair", instanceID: "instance-a", claimed: make(chan *Config, 1)}
	request := httptest.NewRequest(http.MethodGet, "/worker/v1/bootstrap", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusOK || strings.Contains(response.Body.String(), "secret-pair") {
		t.Fatalf("unsafe bootstrap status: %d %s", response.Code, response.Body.String())
	}
}
