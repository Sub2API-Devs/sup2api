//go:build linux

package control

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/localapi"
	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/proxy"
	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/release"
	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/supervisor"
	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
)

func TestCleanupStoppedCoreReapsOwnedPluginGroup(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	root := t.TempDir()
	manager, err := supervisor.New(root)
	if err != nil {
		t.Fatal(err)
	}
	childFile := filepath.Join(root, "child.pid")
	state, err := manager.Start(ctx, supervisor.Spec{Executable: "/bin/sh", Args: []string{"-c", fmt.Sprintf("sleep 300 & echo $! > %s; wait", childFile)}})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = syscall.Kill(-state.PID, syscall.SIGTERM)
		c, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		_ = manager.Wait(c)
		_ = manager.Close()
	})
	runtime := &LocalRuntime{Supervisor: manager}
	if err = runtime.cleanupStopped(ctx); err == nil {
		t.Fatal("cleanup accepted a live core")
	}
	if err = syscall.Kill(state.PID, 0); err != nil {
		t.Fatal("live core was interrupted", err)
	}
	var child int
	for {
		b, e := os.ReadFile(childFile)
		if e == nil {
			child, e = strconv.Atoi(strings.TrimSpace(string(b)))
			if e == nil && child > 0 {
				break
			}
		}
		select {
		case <-ctx.Done():
			t.Fatal(ctx.Err())
		case <-time.After(10 * time.Millisecond):
		}
	}
	process, err := os.FindProcess(state.PID)
	if err != nil {
		t.Fatal(err)
	}
	if err = process.Kill(); err != nil {
		t.Fatal(err)
	}
	for manager.Status().Running {
		select {
		case <-ctx.Done():
			t.Fatal(ctx.Err())
		case <-time.After(10 * time.Millisecond):
		}
	}
	if err = syscall.Kill(child, 0); err != nil {
		t.Fatal("fixture child did not outlive the crashed core", err)
	}
	if err = runtime.cleanupStopped(ctx); err != nil {
		t.Fatal("owned child cleanup", err)
	}
	if err = syscall.Kill(child, 0); err == nil {
		t.Fatal("surviving plugin was not terminated and reaped")
	}
}

func TestPrimaryMaintenanceAndForwardIdentity(t *testing.T) {
	ctx := context.Background()
	primary := &LocalRuntime{NodeID: "a", PrimaryNode: "a", Router: proxy.New(proxy.Config{})}
	if err := primary.Router.SetRoute(proxy.Route{Mode: "local-serving", LocalURL: "http://127.0.0.1:19001", CoreBootID: "a1", Revision: 1}); err != nil {
		t.Fatal(err)
	}
	if err := primary.Redirect(ctx, Node{ID: "b", PeerURL: "https://127.0.0.1:19002", CoreBootID: "b1", RouteRevision: 2}); err == nil {
		t.Fatal("primary redirected to a follower")
	}
	if err := primary.Maintenance(ctx); err != nil {
		t.Fatal(err)
	}
	w := httptest.NewRecorder()
	primary.Router.Public().ServeHTTP(w, httptest.NewRequest("GET", "http://public/v1/videos", nil))
	if w.Code != 503 {
		t.Fatalf("maintenance served business request: %d", w.Code)
	}
	if route := primary.Router.Route(); route.LocalURL != "" || route.PeerURL != "" || route.Mode != "maintenance" {
		t.Fatalf("maintenance retained a fallback route: %+v", route)
	}
	// Routing checks do not open a connection; the placeholder certificate is
	// sufficient for verifying allowed peer identities and revision changes.
	follower := &LocalRuntime{NodeID: "b", PrimaryNode: "a", Router: proxy.New(proxy.Config{PeerTLS: &tls.Config{}, PeerTransport: http.DefaultTransport})}
	old := Node{ID: "a", PeerURL: "https://127.0.0.1:19001", CoreBootID: "a1", RouteRevision: 1, Ready: true, Mode: "local", LastSeen: time.Now()}
	if err := follower.Redirect(ctx, old); err != nil {
		t.Fatal(err)
	}
	other := old
	other.ID = "c"
	if err := follower.Redirect(ctx, other); err == nil {
		t.Fatal("follower redirected to a non-primary")
	}
	next := old
	next.CoreBootID = "a2"
	next.RouteRevision = 9
	if err := follower.RefreshForward(ctx, []Node{next}); err != nil {
		t.Fatal(err)
	}
	if route := follower.Router.Route(); route.CoreBootID != "a2" || route.PeerRevision != 9 || route.Mode != "forward-only" {
		t.Fatalf("did not follow recovered primary: %+v", route)
	}
}

func TestRuntimeStartKeepsMigrationSeparateFromBootstrap(t *testing.T) {
	for _, tc := range []struct {
		name            string
		options         rc.PrepareRequest
		badCapabilities bool
	}{{"primary migration", rc.PrepareRequest{AllowMigration: true, CoordinatePlugins: true, ExpectedSchemaBefore: "before", ExpectedSchemaAfter: "after"}, false}, {"follower read-only prepare", rc.PrepareRequest{ExpectedSchemaAfter: "after"}, false}, {"incompatible capabilities before migration", rc.PrepareRequest{AllowMigration: true}, true}} {
		t.Run(tc.name, func(t *testing.T) {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			root, err := os.MkdirTemp("", "s2-permit-")
			if err != nil {
				t.Fatal(err)
			}
			defer os.RemoveAll(root)
			socket := filepath.Join(root, "core.sock")
			capture := filepath.Join(root, "prepare.json")
			mgr, err := supervisor.New(filepath.Join(root, "runtime"))
			if err != nil {
				t.Fatal(err)
			}
			defer mgr.Close()
			exe, err := os.Executable()
			if err != nil {
				t.Fatal(err)
			}
			_, err = mgr.Start(ctx, supervisor.Spec{Executable: exe, Args: []string{"-test.run=^TestRuntimeControlHelper$"}, Env: []string{"S2_RUNTIME_HELPER=1", "S2_RUNTIME_SOCKET=" + socket, "S2_RUNTIME_CAPTURE=" + capture}})
			if err != nil {
				t.Fatal(err)
			}
			defer func() {
				cleanup, done := context.WithTimeout(context.Background(), time.Second)
				defer done()
				_ = mgr.Terminate(cleanup)
			}()
			client := localapi.New(socket, "token")
			for {
				if _, err = client.Status(ctx); err == nil {
					break
				}
				select {
				case <-ctx.Done():
					t.Fatal(ctx.Err())
				case <-time.After(10 * time.Millisecond):
				}
			}
			manifest := rc.Manifest{CoreVersion: "test", SchemaAfter: "after", ClusterProtocol: rc.Range{Min: 1, Max: 1}, TaskProtocol: rc.Range{Min: 1, Max: 1}, HostAPIVersion: 4}
			if tc.badCapabilities {
				manifest.TaskProtocol = rc.Range{Min: 2, Max: 2}
			}
			rt := &LocalRuntime{Supervisor: mgr, client: client, prepared: map[string]release.Prepared{"release": {Manifest: manifest}}}
			options := tc.options
			options.BootID = "forged"
			options.ReleaseDigest = "forged"
			st, err := rt.Start(ctx, "release", options)
			if tc.badCapabilities {
				if err == nil {
					t.Fatal("incompatible candidate was prepared")
				}
				if _, e := os.Stat(capture); !os.IsNotExist(e) {
					t.Fatal("Prepare RPC executed before capability validation")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if st.Mode != "prepared" {
				t.Fatalf("not prepared: %+v", st)
			}
			b, err := os.ReadFile(capture)
			if err != nil {
				t.Fatal(err)
			}
			var got rc.PrepareRequest
			if err = json.Unmarshal(b, &got); err != nil {
				t.Fatal(err)
			}
			want := tc.options
			want.BootID = "boot"
			want.ReleaseDigest = "release"
			if got != want {
				t.Fatalf("prepare privileges changed: got %+v want %+v", got, want)
			}
		})
	}
}

func TestRuntimeControlHelper(t *testing.T) {
	if os.Getenv("S2_RUNTIME_HELPER") != "1" {
		return
	}
	listener, err := net.Listen("unix", os.Getenv("S2_RUNTIME_SOCKET"))
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	var mu sync.Mutex
	prepared := false
	handler := http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		if q.Header.Get("Authorization") != "Bearer token" {
			w.WriteHeader(403)
			return
		}
		switch q.URL.Path {
		case rc.StatusPath:
			mode := "candidate"
			if prepared {
				mode = "prepared"
			}
			json.NewEncoder(w).Encode(rc.Status{Hello: rc.Hello{BootID: "boot", ReleaseDigest: "release", Protocol: rc.Protocol, CoreVersion: "test", ClusterProtocol: rc.Range{Min: 1, Max: 1}, TaskProtocol: rc.Range{Min: 1, Max: 1}, HostAPIVersion: 4}, Mode: mode, SchemaContract: "after"})
		case rc.PreparePath:
			var p rc.PrepareRequest
			if err := json.NewDecoder(q.Body).Decode(&p); err != nil {
				w.WriteHeader(400)
				return
			}
			b, _ := json.Marshal(p)
			if err := os.WriteFile(os.Getenv("S2_RUNTIME_CAPTURE"), b, 0600); err != nil {
				w.WriteHeader(500)
				return
			}
			prepared = true
			w.WriteHeader(202)
		default:
			w.WriteHeader(404)
		}
	})
	_ = http.Serve(listener, handler)
}
