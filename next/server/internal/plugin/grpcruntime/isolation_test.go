package grpcruntime_test

import (
	"context"
	"crypto/tls"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/grpcruntime"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/sandbox"
)

// The plugin process's sockets live in a private 0700 directory of the
// core (not the shared TMPDIR), its TMPDIR points there too, and the
// directory goes away with the process.
func TestPluginRunDirIsPrivate(t *testing.T) {
	e := setup(t, registrytest.DefaultGrants())
	// Short enough for unix socket paths below it.
	runRoot, err := os.MkdirTemp("", "s2r")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(runRoot) })
	runRoot = filepath.Join(runRoot, "run")
	rt := e.runtime(t, func(o *grpcruntime.Options) { o.RunDir = runRoot })
	inst := e.load(t, rt)

	prefix := e.key
	if len(prefix) > 12 {
		prefix = prefix[:12]
	}
	dir := inst.RunDir()
	if dir == "" || (filepath.Dir(dir) != runRoot && filepath.Dir(dir) != grpcruntime.FallbackRunRootForTest()) ||
		!strings.HasPrefix(filepath.Base(dir), prefix+"-") {
		t.Fatalf("run dir %q, want <%s>/%s-*", dir, runRoot, prefix)
	}
	out, err := httpCall(t, inst, &pluginv1.HTTPRequest{Method: "GET", Path: "/env"})
	if err != nil {
		t.Fatal(err)
	}
	if got := filepath.Clean(out["tmpdir"].(string)); got != filepath.Join(dir, "tmp") {
		t.Fatalf("plugin TMPDIR %q, want %q", got, filepath.Join(dir, "tmp"))
	}
	if runtime.GOOS != "windows" {
		sockDir, _ := out["socket_dir"].(string)
		if filepath.Dir(sockDir) != dir {
			t.Fatalf("socket dir %q not inside the run dir %q", sockDir, dir)
		}
		for _, d := range []string{filepath.Dir(dir), dir, sockDir, filepath.Join(dir, "tmp")} {
			st, err := os.Stat(d)
			if err != nil {
				t.Fatal(err)
			}
			if perm := st.Mode().Perm(); perm != 0o700 {
				t.Fatalf("%s mode %o, want 700", d, perm)
			}
		}
		addr := inst.PluginAddrForTest()
		if addr == nil || addr.Network() != "unix" || filepath.Dir(addr.String()) != sockDir {
			t.Fatalf("plugin socket %v not in %s", addr, sockDir)
		}
		// Both sockets of the process (the plugin's server and the core's
		// broker serving HostService) are there.
		if socks := unixSockets(t, sockDir); len(socks) < 2 {
			t.Fatalf("sockets in %s: %v", sockDir, socks)
		}
	}
	inst.Stop()
	if _, err := os.Stat(dir); !os.IsNotExist(err) {
		t.Fatalf("run dir left behind: %v", err)
	}
}

func unixSockets(t *testing.T, dir string) []string {
	t.Helper()
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	var out []string
	for _, en := range entries {
		if en.Type()&os.ModeSocket != 0 {
			out = append(out, filepath.Join(dir, en.Name()))
		}
	}
	return out
}

// Every endpoint between the core and a plugin process requires the mutual
// TLS credentials of that process pair: a connection without TLS, or with
// TLS but no accepted client certificate, gets no gRPC call through.
func TestPluginConnectionsRequireMTLS(t *testing.T) {
	e := setup(t, registrytest.DefaultGrants())
	rt := e.runtime(t, nil)
	inst := e.load(t, rt)

	addrs := []net.Addr{inst.PluginAddrForTest()}
	if addrs[0] == nil {
		t.Fatal("no plugin address")
	}
	if runtime.GOOS != "windows" {
		// The broker socket serving HostService/EgressService is next to it.
		addrs = addrs[:0]
		for _, s := range unixSockets(t, filepath.Dir(inst.PluginAddrForTest().String())) {
			addrs = append(addrs, &net.UnixAddr{Name: s, Net: "unix"})
		}
		if len(addrs) < 2 {
			t.Fatalf("sockets: %v", addrs)
		}
	}
	creds := map[string]credentials.TransportCredentials{
		"plaintext":          insecure.NewCredentials(),
		"tls without a cert": credentials.NewTLS(&tls.Config{InsecureSkipVerify: true, MinVersion: tls.VersionTLS12}), //nolint:gosec // the server must refuse it
	}
	for _, addr := range addrs {
		for name, c := range creds {
			if err := healthCall(addr, c); err == nil {
				t.Fatalf("%s %s: call succeeded without the mTLS credentials", addr, name)
			}
		}
	}
	// The core's own mTLS connection keeps working.
	if s, _ := inst.State(); s != grpcruntime.StateReady {
		t.Fatalf("state %s", s)
	}
	if _, err := httpCall(t, inst, &pluginv1.HTTPRequest{Method: "GET", Path: "/dsn"}); err != nil {
		t.Fatalf("plugin -> HostService over mTLS: %v", err)
	}
}

// healthCall makes one PluginService.Health call; a refused connection or
// handshake surfaces as an error.
func healthCall(addr net.Addr, c credentials.TransportCredentials) error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	cc, err := grpc.NewClient("passthrough:///plugin",
		grpc.WithTransportCredentials(c),
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, addr.Network(), addr.String())
		}))
	if err != nil {
		return err
	}
	defer cc.Close()
	_, err = pluginv1.NewPluginServiceClient(cc).Health(ctx, &pluginv1.HealthRequest{}, grpc.WaitForReady(false))
	return err
}

// The plugin process sees only the launcher's allow list: none of the core's
// secrets, whatever the core's environment holds.
func TestPluginEnvHasNoCoreSecrets(t *testing.T) {
	secrets := map[string]string{
		"DATABASE_URL":                     "postgres://core:pw@pg/sub2api",
		"REDIS_URL":                        "redis://:pw@redis:6379/0",
		"SUB2API_DATABASE_URL":             "postgres://core:pw@pg/sub2api",
		"SUB2API_REDIS_URL":                "redis://:pw@redis:6379/0",
		"SUB2API_MASTER_KEY":               "bWFzdGVyLWtleQ==",
		"SUB2API_JWT_SECRET":               strings.Repeat("j", 40),
		"SUB2API_BOOTSTRAP_ADMIN_PASSWORD": "pw",
		"SUB2API_CONTROL_TOKEN":            strings.Repeat("t", 40),
		"SUB2API_CONTROL_SOCKET":           "/run/control.sock",
		"UPDATER_SOCKET":                   "/run/updater.sock",
		"CCG_ADMIN_KEY":                    "admin",
		"CCG_API_KEY":                      "api",
		"AWS_SECRET_ACCESS_KEY":            "aws",
	}
	for k, v := range secrets {
		t.Setenv(k, v)
	}
	e := setup(t, registrytest.DefaultGrants())
	// The real launcher (unwrapped: the plugin-exec wrapper filters again).
	launcher := sandbox.NewLauncher(sandbox.LauncherOptions{DisableWrap: true})
	rt := e.runtime(t, func(o *grpcruntime.Options) { o.Launcher = launcher })
	inst := e.load(t, rt)
	out, err := httpCall(t, inst, &pluginv1.HTTPRequest{Method: "GET", Path: "/env"})
	if err != nil {
		t.Fatal(err)
	}
	var names []string
	for _, n := range out["env"].([]any) {
		names = append(names, n.(string))
	}
	for k := range secrets {
		if slices.Contains(names, k) {
			t.Fatalf("%s reached the plugin (env %v)", k, names)
		}
	}
	for _, k := range config.SensitiveEnv {
		if slices.Contains(names, k) {
			t.Fatalf("%s reached the plugin", k)
		}
	}
	// What it must see: the handshake, its own identity, the mTLS client
	// certificate of this process pair.
	for _, k := range []string{"SUB2API_PLUGIN", "SUB2API_PLUGIN_KEY", "PLUGIN_CLIENT_CERT", "TMPDIR"} {
		if !slices.Contains(names, k) {
			t.Fatalf("%s missing from the plugin env %v", k, names)
		}
	}
}
