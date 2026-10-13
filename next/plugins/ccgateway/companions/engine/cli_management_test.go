package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestCLIManagementPolicyAndAuthentication(t *testing.T) {
	root := t.TempDir()
	management, err := newCLIManagement(root)
	if err != nil {
		t.Fatal(err)
	}
	catalog := newCLICatalog(func(context.Context) (string, error) { return "2.1.296", nil }, func(context.Context, string) (nativeCatalogue, error) {
		return nativeCatalogue{"Read": {{Name: "Read"}}}, nil
	})
	if err := catalog.sync(context.Background()); err != nil {
		t.Fatal(err)
	}
	r := &Runtime{catalog: catalog, cliManagement: management, admin: &authManager{key: "admin-fixture"}}
	for _, tc := range []struct {
		method, body, key string
		status            int
	}{
		{"GET", "", "", 401},
		{"PUT", `{"auto_update":true,"channel":"latest"}`, "wrong", 401},
		{"GET", "", "admin-fixture", 200},
		{"PUT", `{"auto_update":true,"channel":"latest"}`, "admin-fixture", 200},
		{"PUT", `{"auto_update":true,"channel":"https://invalid.test"}`, "admin-fixture", 400},
		{"POST", `{"action":"exec"}`, "admin-fixture", 400},
		{"PUT", `{"auto_update":true,"channel":"stable","exec":"foo"}`, "admin-fixture", 400},
		{"DELETE", `{}`, "admin-fixture", 405},
	} {
		request := httptest.NewRequest(tc.method, "/admin/cli", strings.NewReader(tc.body))
		if tc.key != "" {
			request.Header.Set("Authorization", "Bearer "+tc.key)
		}
		out := httptest.NewRecorder()
		r.serveCLI(out, request)
		if out.Code != tc.status {
			t.Fatalf("%s: %d %s", tc.method, out.Code, out.Body.String())
		}
	}
	loaded, err := newCLIManagement(root)
	if err != nil || !loaded.policy.AutoUpdate || loaded.policy.Channel != "latest" {
		t.Fatalf("policy persistence: %v", err)
	}
	management.updating = true
	if management.save(cliUpdatePolicy{Channel: "stable"}) == nil {
		t.Fatal("changed policy during update")
	}
}

func TestCLIInstallLeaseKeepsGateUntilVerificationOrRollback(t *testing.T) {
	version := "2.1.292"
	catalog := newCLICatalog(func(context.Context) (string, error) { return version, nil }, func(context.Context, string) (nativeCatalogue, error) {
		return nativeCatalogue{"Read": {{Name: "Read"}}}, nil
	})
	if err := catalog.sync(context.Background()); err != nil {
		t.Fatal(err)
	}
	management, err := newCLIManagement(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	r := &Runtime{catalog: catalog, cliManagement: management, admin: &authManager{}, life: context.Background()}
	if err := r.lockCLIInstall(context.Background()); err != nil {
		t.Fatal(err)
	}
	lease := &cliInstallLease{token: "fixture", target: "2.1.296", before: version, done: make(chan struct{})}
	management.install, management.updating = lease, true
	if r.finishCLIInstall("wrong", true) == nil {
		t.Fatal("foreign lease accepted")
	}
	if r.finishCLIInstall("fixture", true) == nil {
		t.Fatal("unchanged installation accepted")
	}
	if r.cliGate.TryRLock() {
		r.cliGate.RUnlock()
		t.Fatal("gate released before rollback")
	}
	if r.finishCLIInstall("fixture", false) == nil {
		t.Fatal("failed installation reported successful")
	}
	if !r.cliGate.TryRLock() {
		t.Fatal("rollback did not release gate")
	}
	r.cliGate.RUnlock()
	if management.result != "failed" || management.updating || catalog.status().CatalogVersion != version {
		t.Fatal("incorrect rollback status")
	}
}

func TestCLIVersionComparison(t *testing.T) {
	for _, pair := range [][2]string{{"2.1.292", "2.1.296"}, {"2.1.296", "2.1.296"}, {"invalid", "2.1.296"}} {
		if newerCLIVersion(pair[0], pair[1]) {
			t.Fatal("unsafe automatic downgrade or invalid release")
		}
	}
	if !newerCLIVersion("2.1.300", "2.1.99") {
		t.Fatal("version comparison was lexical")
	}
}

func TestCLIUpdateBusyDoesNotInvokeExecutable(t *testing.T) {
	r := &Runtime{}
	r.cliGate.RLock()
	defer r.cliGate.RUnlock()
	if r.lockCLIInstall(context.Background()) == nil {
		t.Fatal("update ignored live request")
	}
}

func catalogReadFixture(t *testing.T) *Runtime {
	t.Helper()
	management, err := newCLIManagement(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	catalog := newCLICatalog(func(context.Context) (string, error) {
		t.Error("catalog GET invoked CLI version detection")
		return "", fmt.Errorf("unexpected CLI detection")
	}, func(context.Context, string) (nativeCatalogue, error) {
		t.Error("catalog GET invoked capture")
		return nil, fmt.Errorf("unexpected capture")
	})
	catalog.current.Store(&cliSnapshot{version: "2.1.296", tools: nativeCatalogue{
		"Read": {
			{Name: "Read", Description: " Read\n保留空格 ", Schema: Object{"type": "object", "properties": Object{"offset": Object{"type": "integer", "description": "line\nnumber", "minimum": 0}}}, Metadata: Object{"secret": "private-metadata"}},
			{Name: "Read", Description: "another description", Schema: Object{"type": "object"}},
		},
		"Bash": {{Name: "Bash", Description: "", Schema: Object{"type": "object"}}},
	}})
	catalog.state = cliCatalogStatus{Version: "2.1.296", CatalogVersion: "2.1.296", State: "ready", ToolCount: 2, VariantCount: 3, SyncedAt: time.Unix(1, 0).UTC()}
	return &Runtime{catalog: catalog, cliManagement: management, admin: &authManager{key: "admin-fixture"}}
}

func catalogRequest(r *Runtime, method, key string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, "/admin/cli/catalog", nil)
	if key != "" {
		request.Header.Set("Authorization", "Bearer "+key)
	}
	out := httptest.NewRecorder()
	r.serveCLI(out, request)
	return out
}

func TestCLICatalogReadOnlySnapshot(t *testing.T) {
	r := catalogReadFixture(t)
	before := digest(r.catalog.current.Load().tools)
	for _, key := range []string{"", "wrong"} {
		if out := catalogRequest(r, "GET", key); out.Code != 401 {
			t.Fatalf("unauthorized read: %d", out.Code)
		}
	}
	for _, method := range []string{"POST", "PUT", "DELETE", "HEAD"} {
		if out := catalogRequest(r, method, "admin-fixture"); out.Code != 405 {
			t.Fatalf("mutation %s: %d", method, out.Code)
		}
	}
	first := catalogRequest(r, "GET", "admin-fixture")
	second := catalogRequest(r, "GET", "admin-fixture")
	if first.Code != 200 || first.Header().Get("Cache-Control") != "no-store" || first.Body.String() != second.Body.String() {
		t.Fatalf("unstable catalog response: %d %s", first.Code, first.Body)
	}
	var out struct {
		Catalog cliCatalogStatus `json:"catalog"`
		Tools   []struct {
			Name     string `json:"name"`
			Variants []struct {
				Description string `json:"description"`
				Schema      Object `json:"input_schema"`
			} `json:"variants"`
		} `json:"tools"`
	}
	if err := json.Unmarshal(first.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.Catalog != r.catalog.state || len(out.Tools) != 2 || out.Tools[0].Name != "Bash" || out.Tools[1].Name != "Read" || len(out.Tools[1].Variants) != 2 {
		t.Fatalf("incorrect name/variant grouping: %s", first.Body)
	}
	found := false
	for _, variant := range out.Tools[1].Variants {
		if variant.Description == " Read\n保留空格 " {
			found = digest(variant.Schema) == digest(r.catalog.current.Load().tools["Read"][0].Schema)
		}
	}
	if !found || strings.Contains(first.Body.String(), "private-metadata") || digest(r.catalog.current.Load().tools) != before {
		t.Fatal("definition fidelity, metadata filtering or snapshot immutability failed")
	}
}

func TestCLICatalogReadRejectsUnavailableAndMaintenance(t *testing.T) {
	for _, state := range []string{"starting", "syncing", "failed"} {
		r := catalogReadFixture(t)
		r.catalog.state.State = state
		if out := catalogRequest(r, "GET", "admin-fixture"); out.Code != 503 || strings.Contains(out.Body.String(), "input_schema") {
			t.Fatalf("stale %s catalog returned: %d %s", state, out.Code, out.Body)
		}
	}
	r := catalogReadFixture(t)
	r.catalog.state.Version = "2.1.300"
	if out := catalogRequest(r, "GET", "admin-fixture"); out.Code != 503 {
		t.Fatal("mismatched version accepted", out.Code)
	}
	r = catalogReadFixture(t)
	r.catalog.current.Store(nil)
	if out := catalogRequest(r, "GET", "admin-fixture"); out.Code != 503 {
		t.Fatal("empty snapshot accepted", out.Code)
	}
	r = catalogReadFixture(t)
	r.cliGate.Lock()
	defer r.cliGate.Unlock()
	if out := catalogRequest(r, "GET", "admin-fixture"); out.Code != 503 {
		t.Fatal("installation did not block catalog read", out.Code)
	}
}

func TestCLICatalogReadRejectsOversizeResponse(t *testing.T) {
	r := catalogReadFixture(t)
	r.catalog.current.Store(&cliSnapshot{version: "2.1.296", tools: nativeCatalogue{
		"Read": {{Name: "Read", Description: strings.Repeat("x", 8<<20), Schema: Object{"type": "object"}}},
	}})
	r.catalog.state.ToolCount, r.catalog.state.VariantCount = 1, 1
	if out := catalogRequest(r, "GET", "admin-fixture"); out.Code != 503 || strings.Contains(out.Body.String(), "input_schema") {
		t.Fatal("oversize response was partially returned", out.Code)
	}
}

type catalogGateWriter struct {
	*httptest.ResponseRecorder
	gate     *sync.RWMutex
	unlocked bool
}

func (w *catalogGateWriter) Write(raw []byte) (int, error) {
	w.unlocked = w.gate.TryLock()
	if w.unlocked {
		w.gate.Unlock()
	}
	return w.ResponseRecorder.Write(raw)
}

func TestCLICatalogReadReleasesGateBeforeResponse(t *testing.T) {
	r := catalogReadFixture(t)
	request := httptest.NewRequest("GET", "/admin/cli/catalog", nil)
	request.Header.Set("Authorization", "Bearer admin-fixture")
	out := &catalogGateWriter{ResponseRecorder: httptest.NewRecorder(), gate: &r.cliGate}
	r.serveCLI(out, request)
	if out.Code != 200 || !out.unlocked {
		t.Fatal("response held the CLI maintenance gate", out.Code)
	}
}

func TestCLICatalogReadConcurrentPublication(t *testing.T) {
	r := catalogReadFixture(t)
	publish := func(version string) {
		r.catalog.mu.Lock()
		defer r.catalog.mu.Unlock()
		r.catalog.current.Store(&cliSnapshot{version: version, tools: nativeCatalogue{"Read": {{Name: "Read", Description: version, Schema: Object{"type": "object"}}}}})
		r.catalog.state = cliCatalogStatus{Version: version, CatalogVersion: version, State: "ready", ToolCount: 1, VariantCount: 1}
	}
	publish("2.1.296")
	var workers sync.WaitGroup
	workers.Add(1)
	go func() {
		defer workers.Done()
		for i := range 300 {
			publish(fmt.Sprintf("2.1.%d", 296+i))
		}
	}()
	defer workers.Wait()
	for range 300 {
		response := catalogRequest(r, "GET", "admin-fixture")
		var out struct {
			Catalog cliCatalogStatus `json:"catalog"`
			Tools   []struct {
				Variants []struct {
					Description string `json:"description"`
				} `json:"variants"`
			} `json:"tools"`
		}
		if json.Unmarshal(response.Body.Bytes(), &out) != nil || response.Code != 200 || len(out.Tools) != 1 || len(out.Tools[0].Variants) != 1 || out.Tools[0].Variants[0].Description != out.Catalog.CatalogVersion || out.Catalog.Version != out.Catalog.CatalogVersion {
			t.Fatalf("mixed catalog generations: %s", response.Body)
		}
	}
}
