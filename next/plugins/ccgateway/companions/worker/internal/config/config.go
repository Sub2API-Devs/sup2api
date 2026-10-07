package config

import (
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

// Config Worker 配置
type Config struct {
	// 基础配置
	WorkerID    string
	Port        int
	LogLevel    string
	APIKey      string
	AdminKey    string
	NativeTools string

	// CLI 配置
	CLIPath    string
	CLIVersion string
	PluginPath string

	// 存储配置
	ConfigDir  string
	HistoryDir string
	CacheDir   string

	// 缓存配置
	MaxCacheSize     int64
	HistoryRetention time.Duration

	// 超时配置
	RequestTimeout time.Duration
	CLITimeout     time.Duration
	HealthTimeout  time.Duration
}

// Load 从环境变量加载配置
func Load() (*Config, error) {
	workerID, _ := os.Hostname()
	port := 8788
	if bind := os.Getenv("CCG_BIND"); bind != "" && os.Getenv("WORKER_PORT") == "" {
		_, rawPort, err := net.SplitHostPort(bind)
		if err != nil {
			return nil, fmt.Errorf("invalid CCG_BIND")
		}
		port, err = strconv.Atoi(rawPort)
		if err != nil {
			return nil, fmt.Errorf("invalid CCG_BIND port")
		}
	}
	dataDir := getEnv("CCG_DATA_DIR", "/work/history")
	cfg := &Config{
		WorkerID:         getEnv("WORKER_ID", workerID),
		Port:             getEnvInt("WORKER_PORT", port),
		LogLevel:         getEnv("LOG_LEVEL", "info"),
		APIKey:           os.Getenv("CCG_API_KEY"),
		AdminKey:         os.Getenv("CCG_ADMIN_KEY"),
		NativeTools:      os.Getenv("CCG_NATIVE_TOOLS"),
		CLIPath:          getEnv("WORKER_CLI_PATH", "/usr/local/bin/claude"),
		CLIVersion:       getEnv("WORKER_CLI_VERSION", "2.1.288"),
		PluginPath:       os.Getenv("WORKER_PLUGIN_PATH"),
		ConfigDir:        getEnv("CLAUDE_CONFIG_DIR", "/root/.claude"),
		HistoryDir:       getEnv("HISTORY_DIR", dataDir),
		CacheDir:         getEnv("CACHE_DIR", filepath.Join(dataDir, "cache")),
		MaxCacheSize:     getEnvInt64("MAX_CACHE_SIZE", 32*1024*1024),
		HistoryRetention: getEnvDuration("HISTORY_RETENTION", 24*time.Hour),
		RequestTimeout:   getEnvDuration("REQUEST_TIMEOUT", 10*time.Minute),
		CLITimeout:       getEnvDuration("CLI_TIMEOUT", 15*time.Minute),
		HealthTimeout:    getEnvDuration("HEALTH_TIMEOUT", 5*time.Second),
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate 验证配置
func (c *Config) Validate() error {
	if c.WorkerID == "" {
		return fmt.Errorf("WORKER_ID is required")
	}
	if c.Port < 1 || c.Port > 65535 {
		return fmt.Errorf("invalid port: %d", c.Port)
	}
	if c.CLIPath == "" {
		return fmt.Errorf("WORKER_CLI_PATH is required")
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

// getEnvInt 获取整数环境变量
func getEnvInt(key string, defaultValue int) int {
	v := os.Getenv(key)
	if v == "" {
		return defaultValue
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return defaultValue
	}
	return i
}

// getEnvInt64 获取 int64 环境变量
func getEnvInt64(key string, defaultValue int64) int64 {
	v := os.Getenv(key)
	if v == "" {
		return defaultValue
	}
	i, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return defaultValue
	}
	return i
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
