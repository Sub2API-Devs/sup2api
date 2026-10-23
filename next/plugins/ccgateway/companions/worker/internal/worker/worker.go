package worker

import (
	"ccgateway/engine"
	"ccgateway/worker/internal/config"
	"ccgateway/worker/pkg/types"
	"context"
	"net/http"
	"os"
	"strings"
	"time"
)

type Worker interface {
	http.Handler
	Health(context.Context) (*types.HealthStatus, error)
	Close() error
}

type impl struct {
	*engine.Runtime
	id        string
	startTime time.Time
}

func New(cfg *config.Config) (Worker, error) {
	// Inject account config into child processes without modifying global env.
	env := make([]string, 0, len(os.Environ())+2)
	for _, entry := range os.Environ() {
		key, _, _ := strings.Cut(entry, "=")
		if !strings.EqualFold(key, "CLAUDE_CONFIG_DIR") && !strings.EqualFold(key, "CLAUDE_SECURESTORAGE_CONFIG_DIR") {
			env = append(env, entry)
		}
	}
	env = append(env, "CLAUDE_CONFIG_DIR="+cfg.ConfigDir, "CLAUDE_SECURESTORAGE_CONFIG_DIR="+cfg.ConfigDir)
	timeout := cfg.RequestTimeout
	if cfg.CLITimeout > 0 && (timeout <= 0 || cfg.CLITimeout < timeout) {
		timeout = cfg.CLITimeout
	}
	runtime, err := engine.NewRuntime(engine.Options{
		ExpectedCLIVersion: cfg.CLIVersion, ExpectedCLISHA256: cfg.CLISHA256, ExpectedCLIPatch: cfg.CLIPatch,
		RequestMode:               cfg.RequestMode,
		WorkingDirectory:          cfg.WorkingDirectory,
		RuntimeMaintenanceLease:   cfg.RuntimeMaintenanceLease,
		RuntimeMaintenanceExpires: cfg.RuntimeMaintenanceExpires,
		MaintenanceOnly:           cfg.MaintenanceOnly,
		CLI:                       cfg.CLIPath, DataDir: cfg.HistoryDir,
		Key: cfg.APIKey, AdminKey: cfg.AdminKey,
		Timeout: timeout, Env: env,
	})
	if err != nil {
		return nil, err
	}
	return &impl{Runtime: runtime, id: cfg.WorkerID, startTime: time.Now()}, nil
}

func (w *impl) Health(ctx context.Context) (*types.HealthStatus, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	status := "healthy"
	if !w.CLIReady() {
		status = "starting"
	}
	patch, checksum := w.CLIIdentity()
	return &types.HealthStatus{Status: status, WorkerID: w.id, CLIVersion: w.CLIVersion(), Uptime: int64(time.Since(w.startTime).Seconds()), CLIPatch: patch, CLISHA256: checksum, Capabilities: w.RequestCapabilities(), MaintenanceOnly: w.MaintenanceOnly()}, nil
}
