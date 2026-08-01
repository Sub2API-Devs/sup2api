package controlplane

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
)

func TestServerCreatesPermissionedUnixSocketAndStopsCleanly(t *testing.T) {
	dir, err := os.MkdirTemp("", "s2a-")
	if err != nil {
		t.Fatalf("MkdirTemp: %v", err)
	}
	defer os.RemoveAll(dir)
	path := filepath.Join(dir, "control.sock")
	signer, _ := NewGrantSigner(strings.Repeat("s", 32), time.Minute)
	rpc := newRPCService(nil, signer)
	server, err := NewServer(&config.Config{DataPlaneControl: config.DataPlaneControlConfig{
		Enabled: true, Network: "unix", Address: path,
	}}, rpc, nil)
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	if err := server.Start(context.Background()); err != nil {
		t.Fatalf("Start: %v", err)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("stat socket: %v", err)
	}
	if info.Mode().Perm() != 0o600 || info.Mode()&os.ModeSocket == 0 {
		t.Fatalf("socket mode = %v", info.Mode())
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := server.Stop(ctx); err != nil {
		t.Fatalf("Stop: %v", err)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("socket still exists: %v", err)
	}
}

func TestPrepareUnixSocketRefusesRegularFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "control.sock")
	if err := os.WriteFile(path, []byte("do not delete"), 0o600); err != nil {
		t.Fatalf("write regular file: %v", err)
	}
	if err := prepareUnixSocket(path); err == nil {
		t.Fatal("expected refusal to replace regular file")
	}
}
