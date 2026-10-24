package engine

import (
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

func cliTestRuntime(t *testing.T, check func(context.Context) (string, error)) *Runtime {
	t.Helper()
	management, err := newCLIManagement(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	return &Runtime{cli: newCLICheck("2.1.304", check), cliManagement: management, admin: &authManager{key: "admin-fixture"}}
}

func cliCall(r *Runtime, method, body, key string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, "/admin/cli", strings.NewReader(body))
	if key != "" {
		request.Header.Set("Authorization", "Bearer "+key)
	}
	out := httptest.NewRecorder()
	r.serveCLI(out, request)
	return out
}

func TestCLIManagementPolicyAndAuthentication(t *testing.T) {
	r := cliTestRuntime(t, func(context.Context) (string, error) { return "2.1.304", nil })
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
		if out := cliCall(r, tc.method, tc.body, tc.key); out.Code != tc.status {
			t.Fatalf("%s %s: %d %s", tc.method, tc.body, out.Code, out.Body.String())
		}
	}
	loaded, err := newCLIManagement(filepath.Dir(r.cliManagement.path))
	if err != nil || !loaded.policy.AutoUpdate || loaded.policy.Channel != "latest" {
		t.Fatalf("policy persistence: %v", err)
	}
}

// The packaged CLI is never replaced by an official release, which has no
// request command: an install action is an unknown one. The view keeps the
// field names the core reads.
func TestCLIInstallIsRefusedAndTheViewKeepsItsShape(t *testing.T) {
	r := cliTestRuntime(t, func(context.Context) (string, error) { return "2.1.304", nil })
	for _, action := range []string{"begin-install", "validate-install", "finish-install"} {
		if out := cliCall(r, "POST", `{"action":"`+action+`"}`, "admin-fixture"); out.Code != 400 {
			t.Fatalf("%s: %d %s", action, out.Code, out.Body.String())
		}
	}
	var view struct {
		Catalog  cliCheckStatus `json:"catalog"`
		Updating *bool          `json:"updating"`
	}
	out := cliCall(r, "GET", "", "admin-fixture")
	if json.Unmarshal(out.Body.Bytes(), &view) != nil || view.Updating == nil || *view.Updating || view.Catalog.State != "ready" || view.Catalog.Version != "2.1.304" || view.Catalog.CatalogVersion != "2.1.304" {
		t.Fatal(out.Body.String())
	}
}

// sync rechecks the CLI: another version (or none) stops the Worker taking
// requests, since its capabilities were read from the one at startup.
func TestCLISyncRechecksTheVersion(t *testing.T) {
	current, failure := "2.1.304", error(nil)
	r := cliTestRuntime(t, func(context.Context) (string, error) { return current, failure })
	if out := cliCall(r, "POST", `{"action":"sync"}`, "admin-fixture"); out.Code != 200 || r.cli.ready() != nil {
		t.Fatal(out.Body.String())
	}
	current = "2.1.305"
	cliCall(r, "POST", `{"action":"sync"}`, "admin-fixture")
	if err := r.cli.ready(); err == nil || !strings.Contains(err.Error(), "2.1.305") || r.cli.status().Version != "2.1.305" {
		t.Fatalf("a changed CLI stayed ready: %v", err)
	}
	if r.cliManagement.result != "failed" {
		t.Fatal(r.cliManagement.result)
	}
	current, failure = "", errors.New("cannot read Claude Code version")
	cliCall(r, "POST", `{"action":"sync"}`, "admin-fixture")
	if r.cli.status().Error != "cannot read Claude Code version" {
		t.Fatal(r.cli.status())
	}
	current, failure = "2.1.304", nil
	cliCall(r, "POST", `{"action":"sync"}`, "admin-fixture")
	if r.cli.ready() != nil || r.cliManagement.result != "complete" {
		t.Fatal("the CLI did not recover", r.cli.status())
	}
}
