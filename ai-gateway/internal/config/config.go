package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/workersetup"
	"github.com/google/uuid"
)

const (
	defaultListenAddress      = ":9999"
	defaultControlPlaneTarget = "unix:///tmp/sup2api-control.sock"
	defaultSettlementWALPath  = "./data/settlements"
	defaultSettlementWALBytes = int64(1 << 30)
	defaultSettlementSubject  = "sup2api.usage.settlements.v1"
	defaultWorkerVaultPath    = "./data/worker-vault.db"
)

// Config contains process-level bootstrap settings. Request routing and
// business policy stay in the control plane rather than environment variables.
type Config struct {
	ListenAddress         string
	NodeID                string
	ControlPlaneTarget    string
	ControlPlaneInsecure  bool
	StartupRequired       bool
	DialTimeout           time.Duration
	RequestTimeout        time.Duration
	GracePeriod           time.Duration
	LeaseRenewInterval    time.Duration
	SettlementWALPath     string
	SettlementWALMaxBytes int64
	NATSURL               string
	NATSSubject           string
	NATSCredentials       string
	AuthCacheTTL          time.Duration
	AuthCacheSize         int
	WorkerID              string
	WorkerInstanceID      string
	WorkerManagementKey   string
	WorkerVaultPath       string
	WorkerVaultKey        string
	WorkerConfigPath      string
	WorkerVersion         string

	TLSCAFile     string
	TLSCertFile   string
	TLSKeyFile    string
	TLSServerName string
}

// FromEnv builds and validates process configuration.
func FromEnv() (Config, error) {
	hostname, _ := os.Hostname()
	cfg := Config{
		ListenAddress:         envOrDefault("AI_GATEWAY_LISTEN", defaultListenAddress),
		NodeID:                hostname,
		ControlPlaneTarget:    defaultControlPlaneTarget,
		ControlPlaneInsecure:  true,
		StartupRequired:       true,
		DialTimeout:           5 * time.Second,
		RequestTimeout:        2 * time.Second,
		GracePeriod:           10 * time.Second,
		LeaseRenewInterval:    30 * time.Second,
		SettlementWALPath:     envOrDefault("AI_GATEWAY_SETTLEMENT_WAL_PATH", defaultSettlementWALPath),
		SettlementWALMaxBytes: defaultSettlementWALBytes,
		NATSURL:               "",
		NATSSubject:           defaultSettlementSubject,
		NATSCredentials:       "",
		AuthCacheTTL:          60 * time.Second,
		AuthCacheSize:         65536,
		WorkerID:              "",
		WorkerInstanceID:      uuid.NewString(),
		WorkerManagementKey:   "",
		WorkerVaultPath:       envOrDefault("AI_GATEWAY_WORKER_VAULT_PATH", defaultWorkerVaultPath),
		WorkerVaultKey:        "",
		WorkerVersion:         envOrDefault("AI_GATEWAY_VERSION", "dev"),
		TLSCAFile:             strings.TrimSpace(os.Getenv("AI_GATEWAY_CONTROL_PLANE_CA_FILE")),
		TLSCertFile:           strings.TrimSpace(os.Getenv("AI_GATEWAY_CONTROL_PLANE_CERT_FILE")),
		TLSKeyFile:            strings.TrimSpace(os.Getenv("AI_GATEWAY_CONTROL_PLANE_KEY_FILE")),
		TLSServerName:         strings.TrimSpace(os.Getenv("AI_GATEWAY_CONTROL_PLANE_SERVER_NAME")),
	}
	var err error
	if cfg.StartupRequired, err = envBool("AI_GATEWAY_STARTUP_REQUIRED", cfg.StartupRequired); err != nil {
		return Config{}, err
	}
	if cfg.DialTimeout, err = envDuration("AI_GATEWAY_DIAL_TIMEOUT", cfg.DialTimeout); err != nil {
		return Config{}, err
	}
	if cfg.RequestTimeout, err = envDuration("AI_GATEWAY_REQUEST_TIMEOUT", cfg.RequestTimeout); err != nil {
		return Config{}, err
	}
	if cfg.GracePeriod, err = envDuration("AI_GATEWAY_GRACE_PERIOD", cfg.GracePeriod); err != nil {
		return Config{}, err
	}
	if cfg.LeaseRenewInterval, err = envDuration("AI_GATEWAY_LEASE_RENEW_INTERVAL", cfg.LeaseRenewInterval); err != nil {
		return Config{}, err
	}
	if cfg.SettlementWALMaxBytes, err = envInt64("AI_GATEWAY_SETTLEMENT_WAL_MAX_BYTES", cfg.SettlementWALMaxBytes); err != nil {
		return Config{}, err
	}
	if cfg.AuthCacheTTL, err = envDuration("AI_GATEWAY_AUTH_CACHE_TTL", cfg.AuthCacheTTL); err != nil {
		return Config{}, err
	}
	if cfg.AuthCacheSize, err = envInt("AI_GATEWAY_AUTH_CACHE_SIZE", cfg.AuthCacheSize); err != nil {
		return Config{}, err
	}

	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

// FromEnvWithWorker overlays the claimed Worker configuration on process-level
// transport and timeout settings. After claim, identity, secrets, and
// control-plane routing come from the persisted Worker configuration file.
func FromEnvWithWorker(worker *workersetup.Config, instanceID string) (Config, error) {
	if worker == nil {
		return Config{}, fmt.Errorf("UI-provisioned Worker configuration is required")
	}
	if err := worker.Validate(); err != nil {
		return Config{}, err
	}
	cfg, err := FromEnv()
	if err != nil {
		return Config{}, err
	}
	cfg.NodeID = worker.WorkerID
	cfg.WorkerID = worker.WorkerID
	cfg.WorkerInstanceID = strings.TrimSpace(instanceID)
	cfg.WorkerManagementKey = worker.ManagementKey
	cfg.WorkerVaultKey = worker.VaultKey
	cfg.ControlPlaneTarget = worker.ControlPlaneTarget
	cfg.ControlPlaneInsecure = worker.ControlPlaneInsecure
	cfg.NATSURL = worker.NATSURL
	cfg.NATSSubject = worker.NATSSubject
	cfg.NATSCredentials = worker.NATSCredentials
	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func (c Config) Validate() error {
	if strings.TrimSpace(c.ListenAddress) == "" {
		return fmt.Errorf("AI_GATEWAY_LISTEN must not be empty")
	}
	if strings.TrimSpace(c.NodeID) == "" {
		return fmt.Errorf("AI_GATEWAY_NODE_ID must not be empty")
	}
	if strings.TrimSpace(c.ControlPlaneTarget) == "" {
		return fmt.Errorf("AI_GATEWAY_CONTROL_PLANE must not be empty")
	}
	if c.DialTimeout <= 0 || c.RequestTimeout <= 0 || c.GracePeriod <= 0 || c.LeaseRenewInterval <= 0 {
		return fmt.Errorf("gateway timeouts must be positive")
	}
	if strings.TrimSpace(c.SettlementWALPath) == "" || c.SettlementWALMaxBytes <= 0 {
		return fmt.Errorf("AI_GATEWAY_SETTLEMENT_WAL_PATH must not be empty and AI_GATEWAY_SETTLEMENT_WAL_MAX_BYTES must be positive")
	}
	if strings.TrimSpace(c.NATSURL) != "" {
		parsed, err := url.Parse(c.NATSURL)
		if err != nil || parsed.Host == "" {
			return fmt.Errorf("worker nats_url must be a valid NATS URL")
		}
		if parsed.User != nil {
			return fmt.Errorf("worker nats_url must not contain credentials")
		}
		switch strings.ToLower(parsed.Scheme) {
		case "nats", "tls", "wss":
		default:
			return fmt.Errorf("worker nats_url must use nats, tls or wss")
		}
		if strings.TrimSpace(c.NATSSubject) == "" || strings.ContainsAny(c.NATSSubject, " *>\t\r\n") {
			return fmt.Errorf("worker nats_subject must be a concrete subject when nats_url is configured")
		}
		if strings.TrimSpace(c.NATSCredentials) == "" {
			return fmt.Errorf("UI-provisioned NATS JWT credentials are required")
		}
	}
	if c.AuthCacheTTL <= 0 || c.AuthCacheSize <= 0 {
		return fmt.Errorf("AI_GATEWAY_AUTH_CACHE_TTL and AI_GATEWAY_AUTH_CACHE_SIZE must be positive")
	}
	if c.WorkerManagementKey != "" {
		if len(c.WorkerManagementKey) < 32 {
			return fmt.Errorf("AI_GATEWAY_MANAGEMENT_KEY must contain at least 32 characters")
		}
		if strings.TrimSpace(c.WorkerID) == "" || strings.TrimSpace(c.WorkerInstanceID) == "" {
			return fmt.Errorf("AI_GATEWAY_WORKER_ID and AI_GATEWAY_INSTANCE_ID must not be empty")
		}
		if strings.TrimSpace(c.WorkerVaultPath) == "" {
			return fmt.Errorf("AI_GATEWAY_WORKER_VAULT_PATH must not be empty")
		}
		if _, err := DecodeWorkerVaultKey(c.WorkerVaultKey); err != nil {
			return fmt.Errorf("AI_GATEWAY_VAULT_KEY: %w", err)
		}
	}
	if !c.ControlPlaneInsecure {
		if c.TLSCAFile == "" {
			return fmt.Errorf("AI_GATEWAY_CONTROL_PLANE_CA_FILE is required for secure control-plane transport")
		}
		if (c.TLSCertFile == "") != (c.TLSKeyFile == "") {
			return fmt.Errorf("control-plane client certificate and key must be configured together")
		}
	}
	return nil
}

// DecodeWorkerVaultKey accepts a 32-byte key encoded as standard/raw Base64
// or hexadecimal. It deliberately does not derive encryption material from
// the management Bearer secret so both secrets can be rotated independently.
func DecodeWorkerVaultKey(raw string) ([]byte, error) {
	return workersetup.DecodeVaultKey(raw)
}

func envOrDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func envBool(key string, fallback bool) (bool, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, nil
	}
	value, err := strconv.ParseBool(raw)
	if err != nil {
		return false, fmt.Errorf("%s: %w", key, err)
	}
	return value, nil
}

func envDuration(key string, fallback time.Duration) (time.Duration, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, nil
	}
	value, err := time.ParseDuration(raw)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return value, nil
}

func envInt(key string, fallback int) (int, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return value, nil
}

func envInt64(key string, fallback int64) (int64, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, nil
	}
	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return value, nil
}
