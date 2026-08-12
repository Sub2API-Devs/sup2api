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
	claimed := make(chan *Config, 1)
	handler := &bootstrapHandler{
		pairingToken: "pair-once", configPath: configPath, pairingPath: pairingPath,
		instanceID: "instance-a", version: "test", claimed: claimed,
	}
	claim := ClaimRequest{
		PairingToken: "wrong",
		Config: Config{
			WorkerID: "worker-ui", ManagementKey: strings.Repeat("m", 32),
			VaultKey:           base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{4}, 32)),
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
	if loaded == nil || loaded.WorkerID != "worker-ui" || loaded.ControlPlaneTarget != "sub2api:9090" {
		t.Fatalf("unexpected persisted Worker config: %+v", loaded)
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

func TestBootstrapStatusExposesNoPairingSecret(t *testing.T) {
	handler := &bootstrapHandler{pairingToken: "secret-pair", instanceID: "instance-a", claimed: make(chan *Config, 1)}
	request := httptest.NewRequest(http.MethodGet, "/worker/v1/bootstrap", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusOK || strings.Contains(response.Body.String(), "secret-pair") {
		t.Fatalf("unsafe bootstrap status: %d %s", response.Code, response.Body.String())
	}
}
