package runtimeapp

import (
	"context"
	"fmt"
	"time"

	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/config"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/runtime"
	"github.com/caddyserver/caddy/v2"
)

func init() {
	caddy.RegisterModule(App{})
}

// App is the top-level Caddy module that owns resources shared by all Sup2API
// HTTP handlers.
type App struct {
	NodeID                string         `json:"node_id"`
	ControlPlaneTarget    string         `json:"control_plane_target"`
	ControlPlaneInsecure  bool           `json:"control_plane_insecure,omitempty"`
	StartupRequired       bool           `json:"startup_required,omitempty"`
	DialTimeout           caddy.Duration `json:"dial_timeout,omitempty"`
	RequestTimeout        caddy.Duration `json:"request_timeout,omitempty"`
	SettlementWALPath     string         `json:"settlement_wal_path,omitempty"`
	SettlementWALMaxBytes int64          `json:"settlement_wal_max_bytes,omitempty"`
	AuthCacheTTL          caddy.Duration `json:"auth_cache_ttl,omitempty"`
	AuthCacheSize         int            `json:"auth_cache_size,omitempty"`
	TLSCAFile             string         `json:"tls_ca_file,omitempty"`
	TLSCertFile           string         `json:"tls_cert_file,omitempty"`
	TLSKeyFile            string         `json:"tls_key_file,omitempty"`
	TLSServerName         string         `json:"tls_server_name,omitempty"`
	WorkerID              string         `json:"worker_id,omitempty"`
	WorkerInstanceID      string         `json:"worker_instance_id,omitempty"`
	WorkerManagementKey   string         `json:"worker_management_key,omitempty"`
	WorkerVaultPath       string         `json:"worker_vault_path,omitempty"`
	WorkerVaultKey        string         `json:"worker_vault_key,omitempty"`
	WorkerVersion         string         `json:"worker_version,omitempty"`

	runtime *runtime.Runtime
}

func (App) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "sup2api",
		New: func() caddy.Module { return new(App) },
	}
}

func (a *App) Provision(ctx caddy.Context) error {
	if a.DialTimeout == 0 {
		a.DialTimeout = caddy.Duration(5 * time.Second)
	}
	if a.RequestTimeout == 0 {
		a.RequestTimeout = caddy.Duration(2 * time.Second)
	}
	if a.SettlementWALPath == "" {
		a.SettlementWALPath = "./data/settlements"
	}
	if a.SettlementWALMaxBytes == 0 {
		a.SettlementWALMaxBytes = 1 << 30
	}
	if a.AuthCacheTTL == 0 {
		a.AuthCacheTTL = caddy.Duration(time.Minute)
	}
	if a.AuthCacheSize == 0 {
		a.AuthCacheSize = 65536
	}

	var workerVaultKey []byte
	if a.WorkerManagementKey != "" {
		var err error
		workerVaultKey, err = config.DecodeWorkerVaultKey(a.WorkerVaultKey)
		if err != nil {
			return fmt.Errorf("decode worker vault key: %w", err)
		}
	}
	runtime, err := runtime.New(runtime.Config{
		NodeID:                a.NodeID,
		ControlPlaneTarget:    a.ControlPlaneTarget,
		ControlPlaneInsecure:  a.ControlPlaneInsecure,
		StartupRequired:       a.StartupRequired,
		DialTimeout:           time.Duration(a.DialTimeout),
		RequestTimeout:        time.Duration(a.RequestTimeout),
		SettlementWALPath:     a.SettlementWALPath,
		SettlementWALMaxBytes: a.SettlementWALMaxBytes,
		AuthCacheTTL:          time.Duration(a.AuthCacheTTL),
		AuthCacheSize:         a.AuthCacheSize,
		TLSCAFile:             a.TLSCAFile,
		TLSCertFile:           a.TLSCertFile,
		TLSKeyFile:            a.TLSKeyFile,
		TLSServerName:         a.TLSServerName,
		WorkerID:              a.WorkerID,
		WorkerInstanceID:      a.WorkerInstanceID,
		WorkerManagementKey:   a.WorkerManagementKey,
		WorkerVaultPath:       a.WorkerVaultPath,
		WorkerVaultKey:        workerVaultKey,
		WorkerVersion:         a.WorkerVersion,
	}, ctx.Logger())
	if err != nil {
		return fmt.Errorf("provision Sup2API runtime: %w", err)
	}
	a.runtime = runtime
	return nil
}

func (a *App) Validate() error {
	if a.NodeID == "" {
		return fmt.Errorf("node_id is required")
	}
	if a.ControlPlaneTarget == "" {
		return fmt.Errorf("control_plane_target is required")
	}
	return nil
}

func (a *App) Start() error {
	if a.runtime == nil {
		return fmt.Errorf("Sup2API runtime was not provisioned")
	}
	return a.runtime.Start(context.Background())
}

func (a *App) Stop() error {
	if a.runtime == nil {
		return nil
	}
	return a.runtime.Stop()
}

func (a *App) GatewayRuntime() *runtime.Runtime { return a.runtime }

var (
	_ caddy.Module      = (*App)(nil)
	_ caddy.Provisioner = (*App)(nil)
	_ caddy.Validator   = (*App)(nil)
	_ caddy.App         = (*App)(nil)
)
