package workersetup

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/nats-io/nkeys"
)

const ProtocolVersion = "aicodex.proxy-worker/v2"
const pairingTokenEnv = "AI_GATEWAY_PAIRING_TOKEN"

var workerIDPattern = regexp.MustCompile(`^[A-Za-z0-9._:-]{1,128}$`)

type Config struct {
	WorkerID             string `json:"worker_id"`
	ManagementKey        string `json:"management_key"`
	VaultKey             string `json:"vault_key"`
	ControlPlaneTarget   string `json:"control_plane_target"`
	ControlPlaneInsecure bool   `json:"control_plane_insecure"`
	NATSURL              string `json:"nats_url"`
	NATSSubject          string `json:"nats_subject"`
	NATSCredentials      string `json:"nats_credentials"`
}

type ClaimRequest struct {
	PairingToken string `json:"pairing_token"`
	Config
}

func Load(path string) (*Config, error) {
	raw, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read Worker configuration: %w", err)
	}
	var cfg Config
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return nil, fmt.Errorf("decode Worker configuration: %w", err)
	}
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("validate Worker configuration: %w", err)
	}
	return &cfg, nil
}

func (c Config) Validate() error {
	if !workerIDPattern.MatchString(strings.TrimSpace(c.WorkerID)) {
		return errors.New("worker_id must contain 1-128 letters, numbers, dots, underscores, colons or hyphens")
	}
	if len(strings.TrimSpace(c.ManagementKey)) < 32 {
		return errors.New("management_key must contain at least 32 characters")
	}
	if _, err := DecodeVaultKey(c.VaultKey); err != nil {
		return fmt.Errorf("vault_key: %w", err)
	}
	if strings.TrimSpace(c.ControlPlaneTarget) == "" {
		return errors.New("control_plane_target is required")
	}
	parsed, err := url.Parse(strings.TrimSpace(c.NATSURL))
	if err != nil || parsed.Host == "" {
		return errors.New("nats_url must be a valid URL")
	}
	if parsed.User != nil {
		return errors.New("nats_url must not contain credentials")
	}
	switch strings.ToLower(parsed.Scheme) {
	case "tls", "wss":
	default:
		return errors.New("nats_url must use tls or wss")
	}
	if subject := strings.TrimSpace(c.NATSSubject); subject == "" || strings.ContainsAny(subject, " *>\t\r\n") {
		return errors.New("nats_subject must be a concrete NATS subject")
	}
	credentials := []byte(strings.TrimSpace(c.NATSCredentials))
	if len(credentials) == 0 {
		return errors.New("nats_credentials are required")
	}
	if _, err := nkeys.ParseDecoratedJWT(credentials); err != nil {
		return fmt.Errorf("nats_credentials JWT: %w", err)
	}
	keyPair, err := nkeys.ParseDecoratedUserNKey(credentials)
	if err != nil {
		return fmt.Errorf("nats_credentials NKey: %w", err)
	}
	keyPair.Wipe()
	return nil
}

func DecodeVaultKey(raw string) ([]byte, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, errors.New("must be configured")
	}
	for _, decode := range []func(string) ([]byte, error){base64.StdEncoding.DecodeString, base64.RawStdEncoding.DecodeString, hex.DecodeString} {
		decoded, err := decode(raw)
		if err == nil && len(decoded) == 32 {
			return decoded, nil
		}
	}
	return nil, errors.New("must encode exactly 32 bytes using Base64 or hexadecimal")
}

// Bootstrap serves only the one-time claim surface until the control plane
// supplies long-lived Worker configuration. No AI or management route is
// available before a successful claim.
func Bootstrap(ctx context.Context, listenAddress, configPath, instanceID, version string) (*Config, error) {
	if strings.TrimSpace(listenAddress) == "" || strings.TrimSpace(configPath) == "" {
		return nil, errors.New("bootstrap listen address and configuration path are required")
	}
	if err := os.MkdirAll(filepath.Dir(configPath), 0o700); err != nil {
		return nil, fmt.Errorf("create Worker data directory: %w", err)
	}
	pairingPath := configPath + ".pairing"
	pairingToken, fromEnv, err := resolvePairingToken(pairingPath)
	if err != nil {
		return nil, err
	}
	if fromEnv {
		log.Printf("AI Gateway Worker is unclaimed; claim it in the Sup2API Worker UI with AI_GATEWAY_PAIRING_TOKEN")
	} else {
		log.Printf("AI Gateway Worker is unclaimed; enter pairing token %s in the Sup2API Worker UI", pairingToken)
	}

	claimed := make(chan *Config, 1)
	serveErr := make(chan error, 1)
	handler := &bootstrapHandler{
		pairingToken: pairingToken, configPath: configPath, pairingPath: pairingPath,
		instanceID: instanceID, version: version, claimed: claimed,
	}
	server := &http.Server{Addr: listenAddress, Handler: handler, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		err := server.ListenAndServe()
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			serveErr <- err
		}
	}()

	var cfg *Config
	select {
	case cfg = <-claimed:
	case err := <-serveErr:
		return nil, fmt.Errorf("serve Worker pairing endpoint: %w", err)
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
		return nil, ctx.Err()
	}
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		return nil, fmt.Errorf("stop Worker pairing endpoint: %w", err)
	}
	return cfg, nil
}

type bootstrapHandler struct {
	pairingToken string
	configPath   string
	pairingPath  string
	instanceID   string
	version      string
	claimed      chan<- *Config
	mu           sync.Mutex
	done         bool
}

func (h *bootstrapHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	switch {
	case r.Method == http.MethodGet && (r.URL.Path == "/healthz" || r.URL.Path == "/worker/v1/bootstrap"):
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": "unclaimed", "claimed": false, "instance_id": h.instanceID,
			"protocol_version": ProtocolVersion,
		})
	case r.Method == http.MethodPost && r.URL.Path == "/worker/v1/claim":
		h.claim(w, r)
	default:
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"code": "worker_unclaimed", "message": "Worker must be claimed from the Sup2API UI"})
	}
}

func (h *bootstrapHandler) claim(w http.ResponseWriter, r *http.Request) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.done {
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(map[string]string{"code": "already_claimed", "message": "Worker has already been claimed"})
		return
	}
	var request ClaimRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"code": "invalid_claim", "message": "Invalid Worker claim request"})
		return
	}
	provided := sha256.Sum256([]byte(strings.TrimSpace(request.PairingToken)))
	expected := sha256.Sum256([]byte(h.pairingToken))
	if subtle.ConstantTimeCompare(provided[:], expected[:]) != 1 {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"code": "invalid_pairing_token", "message": "Invalid one-time pairing token"})
		return
	}
	request.Config.WorkerID = strings.TrimSpace(request.Config.WorkerID)
	request.Config.ManagementKey = strings.TrimSpace(request.Config.ManagementKey)
	request.Config.VaultKey = strings.TrimSpace(request.Config.VaultKey)
	request.Config.ControlPlaneTarget = strings.TrimSpace(request.Config.ControlPlaneTarget)
	request.Config.NATSURL = strings.TrimSpace(request.Config.NATSURL)
	request.Config.NATSSubject = strings.TrimSpace(request.Config.NATSSubject)
	request.Config.NATSCredentials = strings.TrimSpace(request.Config.NATSCredentials)
	if err := request.Config.Validate(); err != nil {
		w.WriteHeader(http.StatusUnprocessableEntity)
		_ = json.NewEncoder(w).Encode(map[string]string{"code": "invalid_worker_config", "message": err.Error()})
		return
	}
	if err := persistConfig(h.configPath, &request.Config); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"code": "persist_failed", "message": "Failed to persist Worker configuration"})
		return
	}
	_ = os.Remove(h.pairingPath)
	h.done = true
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"protocol_version": ProtocolVersion, "kind": "ai-gateway-caddy",
		"worker_id": request.Config.WorkerID, "instance_id": h.instanceID,
		"generation": 1, "config_revision": 1, "version": h.version,
		"capabilities": []string{"openai_api_key", "openai_oauth_pkce", "oauth_refresh", "account_test", "grpc_settlement_logs", "canonical_usage_records", "nats_jetstream_usage", "nats_nkey_jwt", "sqlite_usage_outbox"},
		"caddy":        map[string]any{"enabled": false, "starting": true},
	})
	h.claimed <- &request.Config
}

// resolvePairingToken prefers the operator-set environment token so Compose
// deployments can put the claim secret in .env instead of scraping container logs.
func resolvePairingToken(path string) (token string, fromEnv bool, err error) {
	if token = strings.TrimSpace(os.Getenv(pairingTokenEnv)); token != "" {
		if err = atomicWrite(path, []byte(token+"\n")); err != nil {
			return "", true, fmt.Errorf("persist Worker pairing token: %w", err)
		}
		return token, true, nil
	}
	token, err = loadOrCreatePairingToken(path)
	return token, false, err
}

func loadOrCreatePairingToken(path string) (string, error) {
	raw, err := os.ReadFile(path)
	if err == nil {
		token := strings.TrimSpace(string(raw))
		if token == "" {
			return "", errors.New("stored Worker pairing token is empty")
		}
		return token, nil
	}
	if !errors.Is(err, os.ErrNotExist) {
		return "", fmt.Errorf("read Worker pairing token: %w", err)
	}
	random := make([]byte, 24)
	if _, err := rand.Read(random); err != nil {
		return "", err
	}
	token := base64.RawURLEncoding.EncodeToString(random)
	if err := atomicWrite(path, []byte(token+"\n")); err != nil {
		return "", fmt.Errorf("persist Worker pairing token: %w", err)
	}
	return token, nil
}

func persistConfig(path string, cfg *Config) error {
	raw, err := json.Marshal(cfg)
	if err != nil {
		return err
	}
	return atomicWrite(path, append(raw, '\n'))
}

func atomicWrite(path string, data []byte) error {
	dir := filepath.Dir(path)
	temporary, err := os.CreateTemp(dir, ".worker-config-*")
	if err != nil {
		return err
	}
	temporaryPath := temporary.Name()
	remove := true
	defer func() {
		_ = temporary.Close()
		if remove {
			_ = os.Remove(temporaryPath)
		}
	}()
	if err := temporary.Chmod(0o600); err != nil {
		return err
	}
	if _, err := temporary.Write(data); err != nil {
		return err
	}
	if err := temporary.Sync(); err != nil {
		return err
	}
	if err := temporary.Close(); err != nil {
		return err
	}
	if err := os.Rename(temporaryPath, path); err != nil {
		return err
	}
	remove = false
	directory, err := os.Open(dir)
	if err != nil {
		return err
	}
	defer directory.Close()
	return directory.Sync()
}
