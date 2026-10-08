package config

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestLoad(t *testing.T) {
	// 设置测试环境变量
	os.Setenv("WORKER_ID", "test-worker")
	os.Setenv("WORKER_PORT", "8788")
	defer os.Unsetenv("WORKER_ID")
	defer os.Unsetenv("WORKER_PORT")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.WorkerID != "test-worker" {
		t.Errorf("WorkerID = %s, want test-worker", cfg.WorkerID)
	}

	if cfg.Port != 8788 {
		t.Errorf("Port = %d, want 8788", cfg.Port)
	}
}

func TestExistingAccountContainerConfig(t *testing.T) {
	t.Setenv("WORKER_ID", "")
	t.Setenv("WORKER_PORT", "")
	t.Setenv("HISTORY_DIR", "")
	t.Setenv("CACHE_DIR", "")
	t.Setenv("CCG_BIND", "0.0.0.0:8787")
	t.Setenv("CCG_DATA_DIR", "/work/data")
	t.Setenv("CCG_API_KEY", "test-request-key")
	t.Setenv("CCG_ADMIN_KEY", "test-admin-key")
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Port != 8787 || cfg.HistoryDir != "/work/data" || cfg.CacheDir != filepath.Join("/work/data", "cache") || cfg.WorkerID == "" {
		t.Fatal("existing account container configuration was not preserved")
	}
}

func TestExplicitBindHostSurvivesPortOverride(t *testing.T) {
	for _, tc := range []struct {
		bind, port, host string
		want             int
		bad              bool
	}{
		{"", "", "", 8788, false}, {"127.0.0.1:9001", "", "127.0.0.1", 9001, false},
		{"[::1]:9001", "9002", "::1", 9002, false}, {"localhost:9001", "", "127.0.0.1", 9001, false}, {"192.0.2.1:9001", "", "", 0, true}, {"0.0.0.0:9001", "", "0.0.0.0", 9001, false},
		{"bad host:9001", "", "", 0, true}, {"127.0.0.1:0", "9002", "", 0, true},
		{"127.0.0.1:65536", "", "", 0, true}, {"127.0.0.1:9001", "garbage", "", 0, true},
	} {
		t.Run(tc.bind+"/"+tc.port, func(t *testing.T) {
			t.Setenv("CCG_BIND", tc.bind)
			t.Setenv("WORKER_PORT", tc.port)
			cfg, err := Load()
			if tc.bad {
				if err == nil {
					t.Fatal("invalid listener accepted")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if cfg.BindHost != tc.host || cfg.Port != tc.want {
				t.Fatalf("listener=%s:%d", cfg.BindHost, cfg.Port)
			}
		})
	}
}

func TestValidate(t *testing.T) {
	tests := []struct {
		name    string
		cfg     *Config
		wantErr bool
	}{
		{
			name: "valid config",
			cfg: &Config{
				WorkerID:  "test",
				Port:      8788,
				CLIPath:   "/usr/bin/claude",
				ConfigDir: "/root/.claude",
			},
			wantErr: false,
		},
		{
			name: "missing worker ID",
			cfg: &Config{
				Port:      8788,
				CLIPath:   "/usr/bin/claude",
				ConfigDir: "/root/.claude",
			},
			wantErr: true,
		},
		{
			name: "invalid port",
			cfg: &Config{
				WorkerID:  "test",
				Port:      0,
				CLIPath:   "/usr/bin/claude",
				ConfigDir: "/root/.claude",
			},
			wantErr: true,
		},
		{
			name: "missing CLI path",
			cfg: &Config{
				WorkerID:  "test",
				Port:      8788,
				ConfigDir: "/root/.claude",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.cfg.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestGetEnv(t *testing.T) {
	os.Setenv("TEST_VAR", "test-value")
	defer os.Unsetenv("TEST_VAR")

	got := getEnv("TEST_VAR", "default")
	if got != "test-value" {
		t.Errorf("getEnv() = %s, want test-value", got)
	}

	got = getEnv("NONEXISTENT", "default")
	if got != "default" {
		t.Errorf("getEnv() = %s, want default", got)
	}
}

func TestGetEnvInt(t *testing.T) {
	os.Setenv("TEST_INT", "42")
	defer os.Unsetenv("TEST_INT")

	got := getEnvInt("TEST_INT", 0)
	if got != 42 {
		t.Errorf("getEnvInt() = %d, want 42", got)
	}

	got = getEnvInt("NONEXISTENT", 100)
	if got != 100 {
		t.Errorf("getEnvInt() = %d, want 100", got)
	}
}

func TestGetEnvDuration(t *testing.T) {
	os.Setenv("TEST_DURATION", "5m")
	defer os.Unsetenv("TEST_DURATION")

	got := getEnvDuration("TEST_DURATION", 0)
	if got != 5*time.Minute {
		t.Errorf("getEnvDuration() = %v, want 5m", got)
	}

	got = getEnvDuration("NONEXISTENT", 10*time.Second)
	if got != 10*time.Second {
		t.Errorf("getEnvDuration() = %v, want 10s", got)
	}
}
