package engine

import (
	"bytes"
	"context"
	"encoding/json"
	diag "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/diagnostics"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestRealCLIDiagnosticsTrustedColdWorker(t *testing.T) {
	var calls atomic.Int32
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			w.Write([]byte(`{"input_tokens":1}`))
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		n := calls.Add(1)
		cfg, _ := body["diagnostics"].(Object)
		if cfg == nil {
			t.Error("diagnostics lost")
		}
		if n > 1 && str(cfg, "previous_message_id") != "msg_surface_probe" {
			t.Error("previous ID changed")
		}
		writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "DIAGNOSTICS_OK"}})
	})
	identityDir := t.TempDir()
	makeWorker := func() (string, resources.Identity, func()) {
		runner := resourceTestRunner(t, handler)
		runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_ID": "diagnostics-fixture", "CCG_RESOURCE_ISSUER_GENERATION": "1"})
		cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 8<<20)
		if err != nil {
			t.Fatal(err)
		}
		g := &Gateway{Runner: runner, Cache: cache, Key: "worker-fixture", Slots: make(chan struct{}, 2), Timeout: 25 * time.Second}
		broker, err := newResourceBroker(g, &authManager{}, identityDir)
		if err != nil {
			t.Fatal(err)
		}
		g.resources = broker
		identity, err := broker.identity(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		server := httptest.NewServer(g)
		return server.URL, identity, func() { server.Close(); broker.lease.Close() }
	}
	first, identity, closeFirst := makeWorker()
	post := func(url, previous, grant string, stream bool, want int) {
		t.Helper()
		body := basic()
		body["stream"] = stream
		body["diagnostics"] = Object{"previous_message_id": nil}
		if previous != "" {
			body["diagnostics"] = Object{"previous_message_id": previous}
		}
		raw, _ := json.Marshal(body)
		req, _ := http.NewRequest("POST", url+"/v1/messages", bytes.NewReader(raw))
		req.Header.Set("X-Api-Key", "worker-fixture")
		req.Header.Set(diag.TrackingHeader, "1")
		req.Header.Set(resources.PrincipalHeader, identity.PrincipalID)
		req.Header.Set(resources.GenerationHeader, identity.Generation)
		if grant != "" {
			req.Header.Set(diag.GrantHeader, grant)
		}
		policy := defaultRequestPolicy()
		policy.ToolSearch = "false"
		p, _ := json.Marshal(policy)
		req.Header.Set(policyHeader, string(p))
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		out, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != want {
			t.Fatalf("status %d: %s", resp.StatusCode, out)
		}
		if want == 200 && resp.Header.Get(diag.ReadyHeader) != "1" {
			t.Fatal("Worker did not acknowledge trusted diagnostics")
		}
	}
	post(first, "", "", false, 200)
	closeFirst()
	cold, other, closeCold := makeWorker()
	defer closeCold()
	if identity != other {
		t.Fatal("persisted issuer changed")
	}
	hash, _ := diag.Hash("msg_surface_probe")
	post(cold, "msg_surface_probe", hash, true, 200)
	post(cold, "msg_surface_probe", "wrong", false, 400)
	post(cold, "msg_surface_probe", "", false, 400)
	if calls.Load() != 2 {
		t.Fatalf("unexpected model calls %d", calls.Load())
	}
}
