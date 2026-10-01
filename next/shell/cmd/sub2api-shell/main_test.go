package main

import (
	"encoding/json"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestConfigPropagatesResolvedClusterStoresToCore(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://shell-db/test")
	t.Setenv("REDIS_URL", "redis://shell-redis/2")
	c := config{ClusterID: "test", NodeID: "a", PrimaryNode: "a", RuntimeABI: "test", PeerURL: "https://node-a", DatabaseURL: "postgres://old/test", RedisURL: "redis://old", Root: t.TempDir(), CoreEnv: []string{"SUB2API_DATABASE_URL=postgres://wrong/test", "SUB2API_REDIS_URL=redis://wrong/9", "SUB2API_LOG_LEVEL=debug"}}
	b, err := json.Marshal(c)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(t.TempDir(), "shell.json")
	if err = os.WriteFile(path, b, 0600); err != nil {
		t.Fatal(err)
	}
	got, err := readConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	effective := map[string]string{}
	for _, entry := range got.coreEnvironment() {
		key, value, _ := strings.Cut(entry, "=")
		effective[key] = value
	}
	if effective["SUB2API_DATABASE_URL"] != "postgres://shell-db/test" || effective["SUB2API_REDIS_URL"] != "redis://shell-redis/2" {
		t.Fatalf("core stores differ from shell: %+v", effective)
	}
	if effective["SUB2API_LOG_LEVEL"] != "debug" {
		t.Fatal("unrelated core environment was lost")
	}
	if len(got.CoreEnv) != 3 {
		t.Fatal("coreEnvironment mutated config slice")
	}
}

func TestPeerAuthKeySources(t *testing.T) {
	configured, fromEnv := strings.Repeat("c", 32), strings.Repeat("e", 40)
	write := func(key string) string {
		c := config{ClusterID: "test", NodeID: "a", PrimaryNode: "a", RuntimeABI: "test", PeerURL: "https://node-a", DatabaseURL: "postgres://db/test", RedisURL: "redis://r", Root: t.TempDir(), PeerAuthKey: key}
		b, err := json.Marshal(c)
		if err != nil {
			t.Fatal(err)
		}
		path := filepath.Join(t.TempDir(), "shell.json")
		if err = os.WriteFile(path, b, 0600); err != nil {
			t.Fatal(err)
		}
		return path
	}
	got, err := readConfig(write(""))
	if err != nil || got.PeerAuthKey != "" {
		t.Fatalf("unset key must select automatic mode: %q %v", got.PeerAuthKey, err)
	}
	if got, err = readConfig(write(configured)); err != nil || got.PeerAuthKey != configured {
		t.Fatalf("configured key: %q %v", got.PeerAuthKey, err)
	}
	if _, err = readConfig(write("short")); err == nil {
		t.Fatal("weak configured key accepted")
	}
	t.Setenv("SUB2API_PEER_AUTH_KEY", fromEnv)
	if got, err = readConfig(write(configured)); err != nil || got.PeerAuthKey != fromEnv {
		t.Fatalf("environment must override the file: %q %v", got.PeerAuthKey, err)
	}
	// A present but invalid override fails closed instead of falling back.
	t.Setenv("SUB2API_PEER_AUTH_KEY", "short")
	if _, err = readConfig(write(configured)); err == nil {
		t.Fatal("invalid environment key fell back to the file")
	}
	// Compose renders an unset ${NODE_X_PEER_AUTH_KEY:-} as an empty value.
	t.Setenv("SUB2API_PEER_AUTH_KEY", "")
	if got, err = readConfig(write(configured)); err != nil || got.PeerAuthKey != configured {
		t.Fatalf("empty environment must keep the configured key: %q %v", got.PeerAuthKey, err)
	}
	if got, err = readConfig(write("")); err != nil || got.PeerAuthKey != "" {
		t.Fatalf("empty environment must keep automatic mode: %q %v", got.PeerAuthKey, err)
	}
}

func TestNodeCommandsUseLocalManagementRoutes(t *testing.T) {
	socket := filepath.Join(t.TempDir(), "shell.sock")
	listener, err := net.Listen("unix", socket)
	if err != nil {
		t.Skip("unix sockets unavailable:", err)
	}
	seen := make(chan string, 4)
	srv := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		seen <- q.Method + " " + q.URL.EscapedPath() + " " + q.Header.Get("X-Updater-Actor")
		if strings.Contains(q.URL.Path, "missing") {
			w.WriteHeader(404)
		}
	})}
	go srv.Serve(listener)
	t.Cleanup(func() { _ = srv.Close() })
	for command, want := range map[string]string{
		"disable-node": "POST /system/nodes/node%2Fb/disable local-operator",
		"enable-node":  "POST /system/nodes/node%2Fb/enable local-operator",
	} {
		if err = localCommand(command, socket, "node/b"); err != nil {
			t.Fatal(err)
		}
		if got := <-seen; got != want {
			t.Fatalf("%s: got %q want %q", command, got, want)
		}
	}
	if err = localCommand("disable-node", socket, "missing"); err == nil {
		t.Fatal("HTTP failure reported as success")
	}
	if err = localCommand("enable-node", socket, ""); err == nil {
		t.Fatal("node command without -id accepted")
	}
}
