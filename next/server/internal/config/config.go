// Package config loads server configuration from environment variables.
// Every variable is documented in docs/CONTRACTS.md.
package config

import (
	"encoding/base64"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	HTTPAddr    string // SUB2API_HTTP_ADDR, default ":8080"
	PublicURL   string // SUB2API_PUBLIC_URL, e.g. "http://127.0.0.1:3120"
	DatabaseURL string // SUB2API_DATABASE_URL (required)
	RedisURL    string // SUB2API_REDIS_URL (required), e.g. "redis://redis:6379/0"
	NodeID      string // NODE_ID, default hostname
	LogLevel    string // SUB2API_LOG_LEVEL: debug | info | warn | error

	MasterKey []byte // SUB2API_MASTER_KEY, base64 of 32 bytes (AES-256-GCM)
	JWTSecret []byte // SUB2API_JWT_SECRET (required, >= 32 bytes)

	AccessTokenTTL  time.Duration // SUB2API_ACCESS_TOKEN_TTL, default 2h
	RefreshTokenTTL time.Duration // SUB2API_REFRESH_TOKEN_TTL, default 720h

	BootstrapAdminEmail    string // SUB2API_BOOTSTRAP_ADMIN_EMAIL
	BootstrapAdminPassword string // SUB2API_BOOTSTRAP_ADMIN_PASSWORD

	Plugins PluginConfig

	// AllowPrivateUpstream disables the SSRF guard for upstream URLs built by
	// platform plugins (SUB2API_GATEWAY_ALLOW_PRIVATE_UPSTREAM). Test only.
	AllowPrivateUpstream bool

	// TrustedProxies lists proxy IPs/CIDRs whose X-Forwarded-For is trusted
	// (SUB2API_TRUSTED_PROXIES, comma separated; empty = trust none).
	TrustedProxies []string
}

type PluginConfig struct {
	DataDir           string   // SUB2API_PLUGIN_DIR, default "/var/lib/sub2api/plugins"
	DevMode           bool     // SUB2API_PLUGIN_DEV_MODE: allow non-Linux, no sandbox
	AllowUnsigned     bool     // SUB2API_PLUGIN_ALLOW_UNSIGNED
	VerifySignatures  bool     // SUB2API_PLUGIN_VERIFY_SIGNATURES, default true
	OfficialRootKeys  []string // SUB2API_PLUGIN_OFFICIAL_KEYS: comma separated "keyId=base64pub"
	StrictNetwork     bool     // SUB2API_PLUGIN_STRICT_NETWORK, default true on linux
	Seccomp           bool     // SUB2API_PLUGIN_SECCOMP, default true on linux
	MaxPackageBytes   int64    // SUB2API_PLUGIN_MAX_PACKAGE_BYTES, default 200 MiB
	MaxMemoryMB       int      // SUB2API_PLUGIN_MAX_MEMORY_MB, global cap, default 1024
	DBRoleIsolation   bool     // SUB2API_PLUGIN_DB_ROLE_ISOLATION, default true
	MarketSourcesJSON string   // SUB2API_MARKET_SOURCES: JSON [{name,url,public_key}] seeded at start
	// BuiltinDir holds the built-in plugin packages installed at startup
	// (SUB2API_BUILTIN_PLUGIN_DIR, default "/opt/sub2api/builtin").
	BuiltinDir string
}

// Load reads the environment. goos is runtime.GOOS (passed in for tests).
func Load(goos string) (*Config, error) {
	c := &Config{
		HTTPAddr:               env("SUB2API_HTTP_ADDR", ":8080"),
		PublicURL:              env("SUB2API_PUBLIC_URL", ""),
		DatabaseURL:            os.Getenv("SUB2API_DATABASE_URL"),
		RedisURL:               os.Getenv("SUB2API_REDIS_URL"),
		NodeID:                 os.Getenv("NODE_ID"),
		LogLevel:               env("SUB2API_LOG_LEVEL", "info"),
		BootstrapAdminEmail:    os.Getenv("SUB2API_BOOTSTRAP_ADMIN_EMAIL"),
		BootstrapAdminPassword: os.Getenv("SUB2API_BOOTSTRAP_ADMIN_PASSWORD"),
	}
	if c.NodeID == "" {
		h, _ := os.Hostname()
		c.NodeID = h
	}
	var err error
	if c.AccessTokenTTL, err = durationEnv("SUB2API_ACCESS_TOKEN_TTL", 2*time.Hour); err != nil {
		return nil, err
	}
	if c.RefreshTokenTTL, err = durationEnv("SUB2API_REFRESH_TOKEN_TTL", 720*time.Hour); err != nil {
		return nil, err
	}

	if c.DatabaseURL == "" {
		return nil, fmt.Errorf("SUB2API_DATABASE_URL is required")
	}
	if c.RedisURL == "" {
		return nil, fmt.Errorf("SUB2API_REDIS_URL is required")
	}
	mk := os.Getenv("SUB2API_MASTER_KEY")
	if c.MasterKey, err = base64.StdEncoding.DecodeString(mk); err != nil || len(c.MasterKey) != 32 {
		return nil, fmt.Errorf("SUB2API_MASTER_KEY must be base64 of exactly 32 bytes")
	}
	c.JWTSecret = []byte(os.Getenv("SUB2API_JWT_SECRET"))
	if len(c.JWTSecret) < 32 {
		return nil, fmt.Errorf("SUB2API_JWT_SECRET must be at least 32 bytes")
	}

	linux := goos == "linux"
	c.AllowPrivateUpstream = boolEnv("SUB2API_GATEWAY_ALLOW_PRIVATE_UPSTREAM", false)
	for _, p := range strings.Split(os.Getenv("SUB2API_TRUSTED_PROXIES"), ",") {
		if p = strings.TrimSpace(p); p != "" {
			c.TrustedProxies = append(c.TrustedProxies, p)
		}
	}
	p := &c.Plugins
	p.DataDir = env("SUB2API_PLUGIN_DIR", "/var/lib/sub2api/plugins")
	p.DevMode = boolEnv("SUB2API_PLUGIN_DEV_MODE", false)
	p.AllowUnsigned = boolEnv("SUB2API_PLUGIN_ALLOW_UNSIGNED", false)
	p.VerifySignatures = boolEnv("SUB2API_PLUGIN_VERIFY_SIGNATURES", true)
	p.StrictNetwork = boolEnv("SUB2API_PLUGIN_STRICT_NETWORK", linux)
	p.Seccomp = boolEnv("SUB2API_PLUGIN_SECCOMP", linux)
	p.DBRoleIsolation = boolEnv("SUB2API_PLUGIN_DB_ROLE_ISOLATION", true)
	p.MarketSourcesJSON = os.Getenv("SUB2API_MARKET_SOURCES")
	p.BuiltinDir = env("SUB2API_BUILTIN_PLUGIN_DIR", "/opt/sub2api/builtin")
	if s := os.Getenv("SUB2API_PLUGIN_OFFICIAL_KEYS"); s != "" {
		for _, k := range strings.Split(s, ",") {
			if k = strings.TrimSpace(k); k != "" {
				p.OfficialRootKeys = append(p.OfficialRootKeys, k)
			}
		}
	}
	// The key that signed the built-in packages of this image is always
	// trusted as official (SUB2API_BUILTIN_TRUST_KEY "keyId=base64pub", set by
	// the image entrypoint).
	if k := strings.TrimSpace(os.Getenv("SUB2API_BUILTIN_TRUST_KEY")); k != "" {
		id, _, _ := strings.Cut(k, "=")
		dup := false
		for _, have := range p.OfficialRootKeys {
			if hid, _, _ := strings.Cut(have, "="); hid == id {
				dup = true
			}
		}
		if !dup {
			p.OfficialRootKeys = append(p.OfficialRootKeys, k)
		}
	}
	if p.MaxPackageBytes, err = int64Env("SUB2API_PLUGIN_MAX_PACKAGE_BYTES", 200<<20); err != nil {
		return nil, err
	}
	mm, err := int64Env("SUB2API_PLUGIN_MAX_MEMORY_MB", 1024)
	if err != nil {
		return nil, err
	}
	p.MaxMemoryMB = int(mm)
	if !linux && !p.DevMode {
		// Plugins only run on Linux in production; the rest of the server works.
		p.StrictNetwork, p.Seccomp = false, false
	}
	return c, nil
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func boolEnv(k string, def bool) bool {
	v := strings.ToLower(os.Getenv(k))
	switch v {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	}
	return def
}

func durationEnv(k string, def time.Duration) (time.Duration, error) {
	v := os.Getenv(k)
	if v == "" {
		return def, nil
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", k, err)
	}
	return d, nil
}

func int64Env(k string, def int64) (int64, error) {
	v := os.Getenv(k)
	if v == "" {
		return def, nil
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", k, err)
	}
	return n, nil
}
