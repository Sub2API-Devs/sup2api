package worker

import (
	"ccgateway/engine"
	"ccgateway/worker/internal/config"
	"ccgateway/worker/pkg/types"
	"context"
	"net"
	"net/http"
	"os"
	"strconv"
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
	internalBaseURL := ""
	if cfg.Port > 0 {
		// Account egress only allows loopback connections to the business
		// HTTP port. Reuse the original relay carrier instead of opening a
		// random loopback port that the firewall deliberately blocks.
		internalBaseURL = workerInternalURL(cfg.BindHost, cfg.Port)
	}
	runtime, err := engine.NewRuntime(engine.Options{
		InternalBaseURL: internalBaseURL,
		CLI:             cfg.CLIPath, Plugin: cfg.PluginPath, DataDir: cfg.HistoryDir, CacheDir: cfg.CacheDir,
		Key: cfg.APIKey, AdminKey: cfg.AdminKey, NativeTools: cfg.NativeTools,
		Timeout: timeout, CacheLimit: cfg.MaxCacheSize, Env: env,
	})
	if err != nil {
		return nil, err
	}
	return &impl{Runtime: runtime, id: cfg.WorkerID, startTime: time.Now()}, nil
}

func workerInternalURL(host string, port int) string {
	if ip := net.ParseIP(host); host == "" || host == "localhost" || ip != nil && ip.IsUnspecified() {
		host = "127.0.0.1"
	}
	return "http://" + net.JoinHostPort(host, strconv.Itoa(port))
}

func (w *impl) Health(ctx context.Context) (*types.HealthStatus, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return &types.HealthStatus{Status: "healthy", WorkerID: w.id, CLIVersion: w.Version, Uptime: int64(time.Since(w.startTime).Seconds())}, nil
}
