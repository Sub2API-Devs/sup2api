package engine

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"
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
