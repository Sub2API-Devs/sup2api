package main

import (
	"context"
	"encoding/json"
	"encoding/pem"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/control"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestConfigPropagatesResolvedClusterStoresToCore(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://shell-db/test")
	t.Setenv("REDIS_URL", "redis://:cache%40pass@shell-redis:6379/2")
	c := config{ClusterID: "test", NodeID: "a", PrimaryNode: "a", RuntimeABI: "test", PeerURL: "https://node-a", DatabaseURL: "postgres://old/test", RedisURL: "redis://old", Root: t.TempDir(), CoreEnv: []string{"DATABASE_URL=postgres://wrong/test", "REDIS_URL=redis://wrong/9", "SUB2API_LOG_LEVEL=debug"}}
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
	if effective["DATABASE_URL"] != "postgres://shell-db/test" || effective["REDIS_URL"] != "redis://:cache%40pass@shell-redis:6379/2" {
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
	dir := t.TempDir()
	socket := filepath.Join(dir, "shell.sock")
	listener, err := net.Listen("unix", socket)
	if err != nil {
		t.Fatal("unix sockets unavailable:", err)
	}
	token, err := control.NewManagementToken()
	if err != nil {
		t.Fatal(err)
	}
	tokenFile := defaultTokenFile(socket)
	if err = control.WriteManagementToken(tokenFile, token); err != nil {
		t.Fatal(err)
	}
	seen := make(chan string, 4)
	srv := &http.Server{Handler: control.RequireManagementToken(token, false, http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		seen <- q.Method + " " + q.URL.EscapedPath() + " " + q.Header.Get("X-Updater-Actor")
		if strings.Contains(q.URL.Path, "missing") {
			w.WriteHeader(404)
		}
	}))}
	go srv.Serve(listener)
	t.Cleanup(func() { _ = srv.Close() })
	for command, want := range map[string]string{
		"disable-node": "POST /system/nodes/node%2Fb/disable local-operator",
		"enable-node":  "POST /system/nodes/node%2Fb/enable local-operator",
		"status":       "GET /system/upgrades local-operator",
	} {
		if err = localCommand(command, socket, tokenFile, "node/b"); err != nil {
			t.Fatal(command, err)
		}
		if got := <-seen; got != want {
			t.Fatalf("%s: got %q want %q", command, got, want)
		}
	}
	if err = localCommand("disable-node", socket, tokenFile, "missing"); err == nil {
		t.Fatal("HTTP failure reported as success")
	}
	<-seen
	if err = localCommand("enable-node", socket, tokenFile, ""); err == nil {
		t.Fatal("node command without -id accepted")
	}
	// A stale token (an earlier gateway boot) or no token file fails: the
	// request never reaches the management API.
	stale := filepath.Join(dir, "stale.token")
	old, err := control.NewManagementToken()
	if err != nil {
		t.Fatal(err)
	}
	if err = control.WriteManagementToken(stale, old); err != nil {
		t.Fatal(err)
	}
	if err = localCommand("status", socket, stale, ""); err == nil || !strings.Contains(err.Error(), "401") {
		t.Fatalf("stale token accepted: %v", err)
	}
	if err = localCommand("status", socket, filepath.Join(dir, "absent.token"), ""); err == nil {
		t.Fatal("missing token file accepted")
	}
	select {
	case got := <-seen:
		t.Fatalf("unauthenticated request reached the API: %s", got)
	default:
	}
}

// The token file defaults to the shell's runtime directory beside the
// socket, so the CLI finds the serving gateway's token from the same config.
func TestManagementTokenFileDefaults(t *testing.T) {
	root := t.TempDir()
	write := func(c config) string {
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
	base := config{ClusterID: "test", NodeID: "a", PrimaryNode: "a", RuntimeABI: "test", PeerURL: "https://node-a", DatabaseURL: "postgres://db/test", RedisURL: "redis://r", Root: root}
	got, err := readConfig(write(base))
	if err != nil {
		t.Fatal(err)
	}
	if want := filepath.Join(root, "runtime", "shell.token"); got.ManagementTokenFile != want || got.AllowTokenlessManagement {
		t.Fatalf("defaults: %q %v", got.ManagementTokenFile, got.AllowTokenlessManagement)
	}
	custom := base
	custom.ManagementSocket = filepath.Join(root, "sock", "m.sock")
	if got, err = readConfig(write(custom)); err != nil || got.ManagementTokenFile != filepath.Join(root, "sock", "shell.token") {
		t.Fatalf("socket-relative default: %q %v", got.ManagementTokenFile, err)
	}
	custom.ManagementTokenFile = "relative.token"
	if _, err = readConfig(write(custom)); err == nil {
		t.Fatal("relative token path accepted")
	}
	// The migration switch: file value, environment override, invalid value.
	tokenless := base
	tokenless.AllowTokenlessManagement = true
	if got, err = readConfig(write(tokenless)); err != nil || !got.AllowTokenlessManagement {
		t.Fatalf("file switch: %v %v", got.AllowTokenlessManagement, err)
	}
	t.Setenv("SUB2API_ALLOW_TOKENLESS_MANAGEMENT", "false")
	if got, err = readConfig(write(tokenless)); err != nil || got.AllowTokenlessManagement {
		t.Fatalf("environment must override the file: %v %v", got.AllowTokenlessManagement, err)
	}
	t.Setenv("SUB2API_ALLOW_TOKENLESS_MANAGEMENT", "maybe")
	if _, err = readConfig(write(base)); err == nil {
		t.Fatal("invalid switch value accepted")
	}
}

// init/import fetch the manifest with the same client as serve, so a release
// origin signed by the cluster CA works for every command.
func TestPublisherClientTrustsClusterCA(t *testing.T) {
	origin := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(204) }))
	defer origin.Close()
	ca := filepath.Join(t.TempDir(), "ca.crt")
	if err := os.WriteFile(ca, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: origin.Certificate().Raw}), 0600); err != nil {
		t.Fatal(err)
	}
	client, err := publisherClient(ca)
	if err != nil {
		t.Fatal(err)
	}
	res, err := client.Get(origin.URL)
	if err != nil || res.StatusCode != 204 {
		t.Fatalf("cluster-CA origin rejected: %v %v", res, err)
	}
	res.Body.Close()
	if _, err = publisherClient(filepath.Join(t.TempDir(), "missing.crt")); err == nil {
		t.Fatal("missing CA file accepted")
	}
}

func TestParseRedisURLAcceptsValkeySchemes(t *testing.T) {
	for raw, tls := range map[string]bool{
		"redis://cache:6379/0":    false,
		"valkey://cache:6379/0":   false,
		"valkeys://cache:6380/0":  true,
		"rediss://cache:6380/0":   true,
		" VALKEY://cache:6379/0 ": false,
	} {
		opt, err := parseRedisURL(raw)
		if err != nil {
			t.Errorf("%q: %v", raw, err)
			continue
		}
		if (opt.TLSConfig != nil) != tls || !strings.HasPrefix(opt.Addr, "cache:") {
			t.Errorf("%q: addr=%s tls=%v", raw, opt.Addr, opt.TLSConfig != nil)
		}
	}
	if _, err := parseRedisURL("memcached://cache:11211"); err == nil {
		t.Error("memcached:// accepted")
	}
}

// A password-protected cache URL keeps its credentials through parsing, in
// every accepted scheme, including percent-encoded characters.
func TestParseRedisURLWithPassword(t *testing.T) {
	for raw, want := range map[string]struct {
		user, password, addr string
		db                   int
		tls                  bool
	}{
		"redis://:s3cret@redis:6379/0":           {"", "s3cret", "redis:6379", 0, false},
		"valkey://:p%40ss%2Fw%3Ard@cache:6379/2": {"", "p@ss/w:rd", "cache:6379", 2, false},
		"valkeys://default:pw@cache:6380/1":      {"default", "pw", "cache:6380", 1, true},
		"rediss://:pw@cache:6380/0":              {"", "pw", "cache:6380", 0, true},
	} {
		opt, err := parseRedisURL(raw)
		if err != nil {
			t.Errorf("%q: %v", raw, err)
			continue
		}
		if opt.Username != want.user || opt.Password != want.password || opt.Addr != want.addr || opt.DB != want.db || (opt.TLSConfig != nil) != want.tls {
			t.Errorf("%q: user=%q password=%q addr=%s db=%d tls=%v", raw, opt.Username, opt.Password, opt.Addr, opt.DB, opt.TLSConfig != nil)
		}
	}
}

// With requirepass on, only clients built from the URL with the right
// password can use the cache; the same URL also works against a cache that
// has no password yet, which is what lets clients switch first during a
// migration (go-redis authenticates with HELLO 3 AUTH default <password>).
func TestRedisPasswordIsEnforced(t *testing.T) {
	ctx := context.Background()
	ping := func(raw string) error {
		opt, err := parseRedisURL(raw)
		if err != nil {
			return err
		}
		client := redis.NewClient(opt)
		defer client.Close()
		return client.Ping(ctx).Err()
	}
	open := miniredis.RunT(t)
	if err := ping("valkey://:s3cret@" + open.Addr() + "/0"); err != nil {
		t.Fatalf("password URL against a cache without a password: %v", err)
	}
	locked := miniredis.RunT(t)
	locked.RequireAuth("s3cret")
	if err := ping("valkey://:s3cret@" + locked.Addr() + "/0"); err != nil {
		t.Fatalf("correct password rejected: %v", err)
	}
	if err := ping("redis://" + locked.Addr() + "/0"); err == nil || !strings.Contains(err.Error(), "NOAUTH") {
		t.Fatalf("client without password accepted: %v", err)
	}
	if err := ping("redis://:wrong@" + locked.Addr() + "/0"); err == nil {
		t.Fatal("wrong password accepted")
	}
}
