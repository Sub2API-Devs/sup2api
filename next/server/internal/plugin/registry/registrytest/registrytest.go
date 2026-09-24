// Package registrytest provides shared helpers for plugin runtime tests: the
// compiled test plugin, package builder, database fixtures and in-memory
// (Redis-backed) cluster fakes.
package registrytest

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	goruntime "runtime"
	"sort"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

var (
	buildOnce sync.Once
	buildBin  []byte
	buildErr  error
)

// TestPlugin compiles grpcruntime/testdata/testplugin (once per process)
// and returns the binary.
func TestPlugin(t testing.TB) []byte {
	t.Helper()
	buildOnce.Do(func() {
		_, file, _, _ := goruntime.Caller(0)
		serverDir := filepath.Join(filepath.Dir(file), "..", "..", "..", "..")
		dir, err := os.MkdirTemp("", "s2p-testplugin-")
		if err != nil {
			buildErr = err
			return
		}
		out := filepath.Join(dir, "plugin")
		if goruntime.GOOS == "windows" {
			out += ".exe"
		}
		cmd := exec.Command("go", "build", "-o", out, "./internal/plugin/grpcruntime/testdata/testplugin")
		cmd.Dir = serverDir
		cmd.Env = append(os.Environ(), "CGO_ENABLED=0")
		if b, err := cmd.CombinedOutput(); err != nil {
			buildErr = err
			buildBin = b
			return
		}
		buildBin, buildErr = os.ReadFile(out)
		_ = os.RemoveAll(dir)
	})
	if buildErr != nil {
		t.Fatalf("build test plugin: %v\n%s", buildErr, buildBin)
	}
	return buildBin
}

// Manifest returns a manifest for the test plugin.
func Manifest(key, version string) *manifest.Manifest {
	return &manifest.Manifest{
		APIVersion: 1,
		Key:        key,
		Name:       manifest.LocalizedText{"en": "Test " + key, "zh": "测试 " + key},
		Version:    version,
		Publisher:  "test",
		Runtime:    "grpc",
		Entry:      manifest.Entry{GRPC: &manifest.GRPCEntry{Binaries: "runtimes/{os}-{arch}/plugin"}},
		HostCompat: ">=0.1.0",
		Capabilities: []manifest.Capability{
			{ID: manifest.CapPlatformAdapter}, {ID: manifest.CapHTTPRoutes}, {ID: manifest.CapGatewayHook}, {ID: manifest.CapMigrationData}, {ID: manifest.CapAppBroadcast},
		},
		Platforms: []manifest.Platform{{
			ID:        "p_" + key,
			Endpoints: []manifest.Endpoint{TestEndpoint(key)},
		}},
		AccountTypes: []manifest.AccountType{{
			ID: "apikey", Label: manifest.LocalizedText{"en": "API key", "zh": "API 密钥"},
			Form:      manifest.Form{Mode: "schema", Schema: "forms/apikey.schema.json", UISchema: "forms/apikey.ui.json"},
			Platforms: []manifest.AccountPlatform{{Platform: "p_" + key}},
		}},
		Hooks:           []manifest.Hook{{Point: "gateway.request", Order: 10, Needs: []string{"model", "prompt_text"}, TimeoutMs: 500}},
		Database:        &manifest.Database{Schema: "plg_" + key, Migrations: "migrations/"},
		UserPermissions: []manifest.UserPermission{{Key: "rules:read", Label: manifest.LocalizedText{"en": "Read rules"}}},
		Routes: []manifest.Route{
			{Method: "GET", Path: "/echo/:id", Scope: "admin", Permission: "rules:read"},
			{Method: "POST", Path: "/hook", Scope: "webhook"},
			{Method: "GET", Path: "/dsn", Scope: "public"},
			{Method: "POST", Path: "/credit", Scope: "public"},
		},
		Icon: "ui/icon.svg",
	}
}

// TestEndpoint is the endpoint of the test platform "p_<key>": POST
// /p_<key>/v1/test, protocol "p_<key>.test" (unique per plugin key).
func TestEndpoint(key string) manifest.Endpoint {
	return manifest.Endpoint{
		ID: "test", Method: "POST", Path: "/p_" + key + "/v1/test", Protocol: "p_" + key + ".test", Kind: "proxy",
		Auth:     manifest.EndpointAuth{Headers: []string{"authorization"}},
		Request:  manifest.EndpointRequest{ModelPath: "model"},
		Response: manifest.EndpointResp{NonStream: "json"}, ErrorFormat: "plain", Billing: "usage",
	}
}

// DefaultGrants approves everything the test manifest asks for.
func DefaultGrants() map[string]string {
	return map[string]string{
		"kv":                   `{}`,
		"db.schema":            `{}`,
		"gateway.hook":         `{"points":["gateway.request"],"fields":["model"]}`,
		"routes.admin":         `{}`,
		"routes.webhook":       `{}`,
		"routes.public":        `{}`,
		"accounts.credentials": `{"types":"own"}`,
		"gateway.endpoint":     `{}`,
		"platform.register":    `{}`,
		"broadcast":            `{}`,
	}
}

// Package builds a .s2plugin zip with the test binary for this platform and
// the given extra files (migrations, ui ...).
func Package(t testing.TB, m *manifest.Manifest, bin []byte, extra map[string][]byte) []byte {
	t.Helper()
	files := map[string][]byte{}
	mj, _ := json.Marshal(m)
	files["manifest.json"] = mj
	name := "runtimes/" + goruntime.GOOS + "-" + goruntime.GOARCH + "/plugin"
	if goruntime.GOOS == "windows" {
		name += ".exe"
	}
	files[name] = bin
	files["forms/apikey.schema.json"] = []byte(`{"type":"object","properties":{"api_key":{"type":"string"}}}`)
	files["forms/apikey.ui.json"] = []byte(`{"api_key":{"ui:widget":"password"}}`)
	files["ui/index.html"] = []byte(`<!doctype html><title>t</title>`)
	files["ui/icon.svg"] = []byte(`<svg xmlns="http://www.w3.org/2000/svg"/>`)
	files["secret.txt"] = []byte("not an asset")
	for k, v := range extra {
		files[k] = v
	}
	names := make([]string, 0, len(files))
	for k := range files {
		names = append(names, k)
	}
	sort.Strings(names)
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for _, n := range names {
		w, err := zw.Create(n)
		if err != nil {
			t.Fatal(err)
		}
		_, _ = w.Write(files[n])
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

// Install inserts the plugins row (status) and an approved version with grants.
func Install(t testing.TB, db *store.DB, m *manifest.Manifest, pkg []byte, grants map[string]string, status string) {
	t.Helper()
	ctx := context.Background()
	name, _ := json.Marshal(m.Name)
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins (key, name, status) VALUES ($1, $2, $3)`, m.Key, name, status); err != nil {
		t.Fatal(err)
	}
	AddVersion(t, db, m, pkg)
	for perm, scope := range grants {
		if _, err := db.Pool.Exec(ctx, `INSERT INTO plugin_permission_grants (plugin_key, permission, scope, status, plugin_version, manifest_hash)
			VALUES ($1, $2, $3, 'granted', $4, 'x')`, m.Key, perm, scope, m.Version); err != nil {
			t.Fatal(err)
		}
	}
}

// AddVersion inserts an approved plugin_versions row.
func AddVersion(t testing.TB, db *store.DB, m *manifest.Manifest, pkg []byte) {
	t.Helper()
	mj, _ := json.Marshal(m)
	sum := sha256.Sum256(pkg)
	msum := sha256.Sum256(mj)
	if _, err := db.Pool.Exec(context.Background(), `INSERT INTO plugin_versions (plugin_key, version, manifest, manifest_hash,
			package_sha256, package, package_size, signature_status, consent_status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'unsigned', 'approved')`,
		m.Key, m.Version, mj, hex.EncodeToString(msum[:]), hex.EncodeToString(sum[:]), pkg, len(pkg)); err != nil {
		t.Fatal(err)
	}
}

// ------------------------------------------------------------------ launcher

// Launcher execs the binary directly (dev mode) and lets tests fire
// resource events.
type Launcher struct {
	mu       sync.Mutex
	watchers map[int]func(core.ResourceEvent)
	Commands int
}

func (l *Launcher) Command(_ context.Context, spec core.LaunchSpec) (*exec.Cmd, error) {
	l.mu.Lock()
	l.Commands++
	l.mu.Unlock()
	cmd := exec.Command(spec.BinaryPath)
	cmd.Dir = spec.WorkDir
	cmd.Env = append([]string(nil), spec.Env...)
	return cmd, nil
}

func (l *Launcher) Watch(_ core.LaunchSpec, pid int, onEvent func(core.ResourceEvent)) func() {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.watchers == nil {
		l.watchers = map[int]func(core.ResourceEvent){}
	}
	l.watchers[pid] = onEvent
	return func() {
		l.mu.Lock()
		delete(l.watchers, pid)
		l.mu.Unlock()
	}
}

// Fire delivers a resource event to the watcher of pid.
func (l *Launcher) Fire(pid int, ev core.ResourceEvent) bool {
	l.mu.Lock()
	fn := l.watchers[pid]
	l.mu.Unlock()
	if fn == nil {
		return false
	}
	ev.PID = pid
	fn(ev)
	return true
}

// ------------------------------------------------------------------ cluster fakes

// Node is a NodeRegistry backed by Redis (use miniredis in tests).
type Node struct {
	RDB  redis.UniversalClient
	ID   string
	Boot string
	mu   sync.Mutex
	dead bool
}

func (n *Node) NodeID() string { return n.ID }
func (n *Node) BootID() string { return n.Boot }
func (n *Node) Healthy() bool  { return true }

// Heartbeat marks the node alive.
func (n *Node) Heartbeat(ctx context.Context) {
	n.mu.Lock()
	dead := n.dead
	n.mu.Unlock()
	if dead {
		return
	}
	n.RDB.ZAdd(ctx, "node:live", redis.Z{Score: float64(time.Now().UnixMilli()), Member: n.Boot})
	n.RDB.HSet(ctx, "node:info:"+n.Boot, "node_id", n.ID)
}

// Kill removes the node from the live set and stops heartbeats.
func (n *Node) Kill(ctx context.Context) {
	n.mu.Lock()
	n.dead = true
	n.mu.Unlock()
	n.RDB.ZRem(ctx, "node:live", n.Boot)
}

func (n *Node) LiveNodes(ctx context.Context) ([]core.NodeStatus, error) {
	boots, err := n.RDB.ZRangeByScore(ctx, "node:live", &redis.ZRangeBy{
		Min: strconv.FormatInt(time.Now().Add(-15*time.Second).UnixMilli(), 10), Max: "+inf"}).Result()
	if err != nil {
		return nil, err
	}
	out := make([]core.NodeStatus, 0, len(boots))
	for _, b := range boots {
		id, _ := n.RDB.HGet(ctx, "node:info:"+b, "node_id").Result()
		plugins, _ := n.RDB.HGetAll(ctx, "node:plugins:"+b).Result()
		out = append(out, core.NodeStatus{NodeID: id, BootID: b, Plugins: plugins})
	}
	return out, nil
}

func (n *Node) IsAlive(ctx context.Context, bootID string) (bool, error) {
	s, err := n.RDB.ZScore(ctx, "node:live", bootID).Result()
	if err == redis.Nil {
		return false, nil
	}
	return err == nil && s > float64(time.Now().Add(-15*time.Second).UnixMilli()), err
}

func (n *Node) ReportPlugin(ctx context.Context, pluginKey, stateJSON string) error {
	n.Heartbeat(ctx)
	n.mu.Lock()
	dead := n.dead
	n.mu.Unlock()
	if dead {
		return nil
	}
	return n.RDB.HSet(ctx, "node:plugins:"+n.Boot, pluginKey, stateJSON).Err()
}

// Bus is a core.Bus over Redis pub/sub.
type Bus struct{ RDB redis.UniversalClient }

func (b Bus) Publish(ctx context.Context, channel string, payload []byte) error {
	return b.RDB.Publish(ctx, channel, payload).Err()
}

func (b Bus) Subscribe(channel string, handler func([]byte)) func() {
	ctx, cancel := context.WithCancel(context.Background())
	ps := b.RDB.Subscribe(ctx, channel)
	go func() {
		ch := ps.Channel()
		for {
			select {
			case <-ctx.Done():
				return
			case m, ok := <-ch:
				if !ok {
					return
				}
				handler([]byte(m.Payload))
			}
		}
	}()
	return func() { cancel(); _ = ps.Close() }
}

// MemBus is an in-process core.Bus: Publish calls every handler of the
// channel synchronously. Published messages are also recorded.
type MemBus struct {
	mu       sync.Mutex
	handlers map[string]map[int]func([]byte)
	nextID   int
	sent     []MemMessage
}

// MemMessage is one message published on a MemBus.
type MemMessage struct {
	Channel string
	Payload []byte
}

var _ core.Bus = (*MemBus)(nil)

func (b *MemBus) Publish(_ context.Context, channel string, payload []byte) error {
	b.mu.Lock()
	b.sent = append(b.sent, MemMessage{Channel: channel, Payload: append([]byte(nil), payload...)})
	ids := make([]int, 0, len(b.handlers[channel]))
	for id := range b.handlers[channel] {
		ids = append(ids, id)
	}
	sort.Ints(ids)
	hs := make([]func([]byte), 0, len(ids))
	for _, id := range ids {
		hs = append(hs, b.handlers[channel][id])
	}
	b.mu.Unlock()
	for _, h := range hs {
		h(payload)
	}
	return nil
}

func (b *MemBus) Subscribe(channel string, handler func([]byte)) func() {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.handlers == nil {
		b.handlers = map[string]map[int]func([]byte){}
	}
	if b.handlers[channel] == nil {
		b.handlers[channel] = map[int]func([]byte){}
	}
	b.nextID++
	id := b.nextID
	b.handlers[channel][id] = handler
	var once sync.Once
	return func() {
		once.Do(func() {
			b.mu.Lock()
			defer b.mu.Unlock()
			delete(b.handlers[channel], id)
			if len(b.handlers[channel]) == 0 {
				delete(b.handlers, channel)
			}
		})
	}
}

// Subscribed reports whether channel has at least one handler.
func (b *MemBus) Subscribed(channel string) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return len(b.handlers[channel]) > 0
}

// Messages returns the messages published on channel so far.
func (b *MemBus) Messages(channel string) []MemMessage {
	b.mu.Lock()
	defer b.mu.Unlock()
	var out []MemMessage
	for _, m := range b.sent {
		if m.Channel == channel {
			out = append(out, m)
		}
	}
	return out
}
