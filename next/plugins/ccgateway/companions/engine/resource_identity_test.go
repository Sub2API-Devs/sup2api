package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func TestResourceIdentityPersistsAndRotates(t *testing.T) {
	cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 1<<20)
	if err != nil {
		t.Fatal(err)
	}
	b := &resourceBroker{g: &Gateway{Cache: cache}, identityPath: filepath.Join(t.TempDir(), "identity-v1.json")}
	first, err := b.persistIdentity(resources.Identity{PrincipalID: "issuer"}, "")
	if err != nil {
		t.Fatal(err)
	}
	if err := b.g.ownershipIndex().rotateAuthorization(); err != nil {
		t.Fatal(err)
	}
	second, err := b.persistIdentity(resources.Identity{PrincipalID: "issuer"}, "")
	if err != nil || first.Generation != second.Generation {
		t.Fatal("same issuer resource epoch changed after reauthorization", err)
	}
	id, err := b.persistIdentity(resources.Identity{PrincipalID: "different-issuer"}, "")
	if err != nil || id.Generation == first.Generation {
		t.Fatal("changed issuer epoch not rotated", err)
	}
	h := http.Header{}
	h.Set(resources.PrincipalHeader, "issuer")
	h.Set(resources.GenerationHeader, first.Generation)
	if verifyExpectedResourceIdentity(h, id) == nil {
		t.Fatal("old epoch accepted")
	}
}

func TestResourceIdentitySurvivesCacheReplacementAndRestart(t *testing.T) {
	root := t.TempDir()
	broker := func(cacheDir string) *resourceBroker {
		cache, err := newCache(cacheDir, 1<<20)
		if err != nil {
			t.Fatal(err)
		}
		b, err := newResourceBroker(&Gateway{Runner: &Runner{Env: []string{"CCG_RESOURCE_BODY_LIMIT_BYTES=1024"}}, Cache: cache}, &authManager{}, root)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _ = b.lease.Close() })
		return b
	}
	first := broker(filepath.Join(t.TempDir(), "cache"))
	want, err := first.persistIdentity(resources.Identity{PrincipalID: "stable-issuer"}, "")
	if err != nil {
		t.Fatal(err)
	}
	first.lease.Close()
	restarted := broker(filepath.Join(t.TempDir(), "replacement-cache"))
	got, err := restarted.persistIdentity(resources.Identity{PrincipalID: "stable-issuer"}, "")
	if err != nil || got.Generation != want.Generation {
		t.Fatal("resource ownership lost when conversation cache changed", err)
	}
	rotated, err := restarted.persistIdentity(resources.Identity{PrincipalID: "stable-issuer"}, "managed-new-epoch")
	if err != nil || rotated.Generation == got.Generation {
		t.Fatal("explicit managed epoch change retained old resource access", err)
	}
}

func TestRealCLIResourceHTTPIdentityAndProviderErrors(t *testing.T) {
	for _, oauth := range []bool{false, true} {
		t.Run(fmt.Sprint(oauth), func(t *testing.T) {
			var resourcesCalled atomic.Int32
			runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				if r.URL.Path == "/api/oauth/profile" {
					if !oauth || r.Header.Get("Authorization") != "Bearer dummy-resource-oauth" {
						t.Error("wrong profile credential")
					}
					fmt.Fprint(w, `{"account":{"uuid":"account-fixture"},"organization":{"uuid":"organization-fixture"}}`)
					return
				}
				if r.URL.Path != "/v1/files/file_fixture" || r.Method != "DELETE" {
					t.Errorf("unexpected resource request: %s %s", r.Method, r.URL.Path)
				}
				if oauth && r.Header.Get("Anthropic-Beta") != "oauth-2025-04-20" {
					t.Error("OAuth base beta not isolated", r.Header.Get("Anthropic-Beta"))
				}
				resourcesCalled.Add(1)
				w.Header().Set("Retry-After", "3")
				w.WriteHeader(429)
				fmt.Fprint(w, `{"type":"error","error":{"type":"rate_limit_error","message":"resource fixture"}}`)
			})
			runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_ID": "fixture-workspace", "CCG_RESOURCE_ISSUER_GENERATION": "fixture-epoch"})
			if oauth {
				runner.Env = envWith(runner.Env, map[string]string{"ANTHROPIC_API_KEY": "", "CLAUDE_CODE_OAUTH_TOKEN": "dummy-resource-oauth"})
			}
			cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 1<<20)
			if err != nil {
				t.Fatal(err)
			}
			g := &Gateway{Runner: runner, Cache: cache, Key: "worker-fixture", Slots: make(chan struct{}, 2)}
			broker, err := newResourceBroker(g, &authManager{}, t.TempDir())
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { _ = broker.lease.Close() })
			call := func(method, path string, id resources.Identity) *httptest.ResponseRecorder {
				r := httptest.NewRequest(method, path, nil)
				r.Header.Set("X-Api-Key", "worker-fixture")
				r.Header.Set(resources.PrincipalHeader, id.PrincipalID)
				r.Header.Set(resources.GenerationHeader, id.Generation)
				w := httptest.NewRecorder()
				broker.ServeHTTP(w, r)
				return w
			}
			first := call("GET", resources.IdentityPath, resources.Identity{})
			if first.Code != 200 {
				t.Fatalf("identity: %d %s", first.Code, first.Body.String())
			}
			var id resources.Identity
			if json.Unmarshal(first.Body.Bytes(), &id) != nil || id.PrincipalID == "" || id.Generation == "" {
				t.Fatal("invalid identity")
			}
			if strings.Contains(first.Body.String(), "account-fixture") || strings.Contains(first.Body.String(), "dummy-resource") {
				t.Fatal("identity exposed provider identifiers")
			}
			bad := id
			bad.Generation = "old"
			if response := call("DELETE", resourcePrefix+"/v1/files/file_fixture", bad); response.Code != 409 {
				t.Fatal(response.Code, response.Body.String())
			}
			if resourcesCalled.Load() != 0 {
				t.Fatal("mismatched issuer operation was dispatched")
			}
			response := call("DELETE", resourcePrefix+"/v1/files/file_fixture", id)
			if response.Code != 429 || response.Header().Get("Retry-After") != "3" || !strings.Contains(response.Body.String(), "resource fixture") {
				t.Fatal(response.Code, response.Body.String())
			}
			if resourcesCalled.Load() != 1 || len(cache.entries) != 0 {
				t.Fatal("unexpected request or conversation checkpoint")
			}
			files, _ := filepath.Glob(filepath.Join(broker.dir, "*"))
			if len(files) != 0 {
				t.Fatal("resource spool leaked", len(files))
			}
		})
	}
}

func TestRealCLIResourceCancellationReleasesSpool(t *testing.T) {
	entered := make(chan struct{})
	runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) { close(entered); <-r.Context().Done() })
	op := &resourceExchange{route: resourceRoute{method: "GET", path: "/v1/files"}, dir: t.TempDir(), limit: 1024, budget: &resourceSpoolBudget{limit: 2048}}
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { _, err := runner.runResource(ctx, op); done <- err }()
	select {
	case <-entered:
		cancel()
	case <-time.After(10 * time.Second):
		cancel()
		t.Fatal("carrier did not dispatch")
	}
	select {
	case err := <-done:
		if err == nil {
			t.Fatal("cancel succeeded")
		}
	case <-time.After(5 * time.Second):
		t.Fatal("resource cancellation blocked")
	}
	if op.budget.used != 0 {
		t.Fatal("spool quota leaked")
	}
}

func TestRealCLIResourceRuntimeAuthorizationCallback(t *testing.T) {
	runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) { t.Error("unexpected provider request") })
	runtime, err := NewRuntime(Options{CLI: runner.CLI, Plugin: runner.Plugin, DataDir: t.TempDir(), Key: "worker-fixture", AdminKey: "admin-fixture", Env: runner.Env})
	if err != nil {
		t.Fatal(err)
	}
	defer runtime.Close()
	before := runtime.gateway.ownershipIndex().issuerGeneration()
	if runtime.admin.authorizationChanged == nil {
		t.Fatal("worker runtime lacks authorization generation callback")
	}
	if err := runtime.admin.authorizationChanged(); err != nil {
		t.Fatal(err)
	}
	if runtime.gateway.ownershipIndex().issuerGeneration() == before {
		t.Fatal("authorization callback kept old generation")
	}
}
