package config

import (
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// Config Worker 配置
type Config struct {
	// 基础配置
	WorkerID string
	Port     int
	BindHost string
	LogLevel string
	APIKey   string
	AdminKey string

	// CLI 配置
	CLIPath                   string
	CLIVersion                string
	CLISHA256                 string
	CLIPatch                  string
	RequestMode               string
	WorkingDirectory          string
	RuntimeMaintenanceLease   string
	RuntimeMaintenanceExpires time.Time
	MaintenanceOnly           bool

	// 存储配置
	ConfigDir  string
	HistoryDir string

	// 超时配置
	RequestTimeout time.Duration
	CLITimeout     time.Duration
	HealthTimeout  time.Duration
}

// Load 从环境变量加载配置
func Load() (*Config, error) {
	workerID, _ := os.Hostname()
	port := 8788
	bindHost := ""
	if bind := os.Getenv("CCG_BIND"); bind != "" {
		host, rawPort, err := net.SplitHostPort(bind)
		if err != nil {
			return nil, fmt.Errorf("invalid CCG_BIND")
		}
		port, err = strconv.Atoi(rawPort)
		if err != nil {
			return nil, fmt.Errorf("invalid CCG_BIND port")
		}
		if port < 1 || port > 65535 {
			return nil, fmt.Errorf("invalid CCG_BIND port")
		}
		if !validBindHost(host) {
			return nil, fmt.Errorf("CCG_BIND host must be loopback or unspecified; the internal relay requires loopback")
		}
		if host == "localhost" {
			host = "127.0.0.1"
		}
		bindHost = host
	}
	// WORKER_PORT overrides only the port; an explicit CCG_BIND host survives.
	if raw := os.Getenv("WORKER_PORT"); raw != "" {
		var err error
		port, err = strconv.Atoi(raw)
		if err != nil {
			return nil, fmt.Errorf("invalid WORKER_PORT")
		}
	}
	dataDir := getEnv("CCG_DATA_DIR", "/work/history")
	// Existing standalone account containers use a one-hour model timeout.
	// Preserve that behavior during an in-place Worker migration; explicit
	// Worker settings take precedence over the legacy setting.
	requestTimeout := getEnvDuration("REQUEST_TIMEOUT", getEnvDuration("CCG_TIMEOUT", time.Hour))
	cfg := &Config{
		WorkerID:         getEnv("WORKER_ID", workerID),
		Port:             port,
		BindHost:         bindHost,
		LogLevel:         getEnv("LOG_LEVEL", "info"),
		APIKey:           os.Getenv("CCG_API_KEY"),
		AdminKey:         os.Getenv("CCG_ADMIN_KEY"),
		CLIPath:          getEnv("WORKER_CLI_PATH", "/usr/local/bin/claude"),
		CLIVersion:       os.Getenv("WORKER_CLI_VERSION"),
		CLISHA256:        os.Getenv("CCG_CLI_SHA256"),
		CLIPatch:         os.Getenv("CCG_CLI_PATCH"),
		RequestMode:      getEnv("CCG_REQUEST_MODE", "build"),
		WorkingDirectory: getEnv("CCG_WORKING_DIRECTORY", "/work"),
		ConfigDir:        getEnv("CLAUDE_CONFIG_DIR", "/root/.claude"),
		HistoryDir:       getEnv("HISTORY_DIR", dataDir),
		RequestTimeout:   requestTimeout,
		CLITimeout:       getEnvDuration("CLI_TIMEOUT", requestTimeout),
		HealthTimeout:    getEnvDuration("HEALTH_TIMEOUT", 5*time.Second),
	}

	if cfg.RequestMode == "native" {
		// A Worker-only bootstrap must be installable in a retired native
		// container so its trusted controller can activate the new pair.
		// It exposes management only, never silently switches model routing.
		cfg.RequestMode, cfg.MaintenanceOnly = "build", true
	}
	if err := cfg.loadActiveRuntime("/opt/ccgateway/cli"); err != nil {
		return nil, err
	}
	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate 验证配置
func (c *Config) Validate() error {
	if c.RequestMode == "" {
		c.RequestMode = "build"
	}
	if c.RequestMode != "direct" && c.RequestMode != "build" {
		return fmt.Errorf("CCG_REQUEST_MODE must be direct or build")
	}
	if c.WorkerID == "" {
		return fmt.Errorf("WORKER_ID is required")
	}
	if c.Port < 1 || c.Port > 65535 {
		return fmt.Errorf("invalid port: %d", c.Port)
	}
	if !validBindHost(c.BindHost) {
		return fmt.Errorf("bind host must be loopback or unspecified; the internal relay requires loopback")
	}
	if c.CLIPath == "" {
		return fmt.Errorf("WORKER_CLI_PATH is required")
	}
	if c.WorkingDirectory != "" && !filepath.IsAbs(c.WorkingDirectory) && !strings.HasPrefix(c.WorkingDirectory, "/") {
		return fmt.Errorf("CCG_WORKING_DIRECTORY must be an absolute trusted account directory")
	}
	if c.ConfigDir == "" {
		return fmt.Errorf("CLAUDE_CONFIG_DIR is required")
	}
	return nil
}

// getEnv 获取环境变量，带默认值
func getEnv(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}

// getEnvDuration 获取时间间隔环境变量
func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return defaultValue
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return defaultValue
	}
	return d
}

func validBindHost(host string) bool {
	if host == "" || host == "localhost" {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && (ip.IsLoopback() || ip.IsUnspecified())
}
