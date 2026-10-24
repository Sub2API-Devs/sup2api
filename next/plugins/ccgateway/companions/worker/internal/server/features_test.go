package server

import (
	"ccgateway/engine"
	"ccgateway/worker/pkg/types"
	"context"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

type versionedWorker struct{ mockWorker }

func (*versionedWorker) Health(context.Context) (*types.HealthStatus, error) {
	return &types.HealthStatus{Status: "healthy", CLIVersion: "2.1.292"}, nil
}

func TestCapabilitiesUseObservedCLIVersionNotConfiguredImage(t *testing.T) {
	t.Setenv("WORKER_CLI_VERSION", "made-up-version")
	w := httptest.NewRecorder()
	r := httptest.NewRequest("GET", "/admin/features", nil)
	r.Header.Set("Authorization", "Bearer admin")
	worker := &versionedWorker{mockWorker{facts: engine.RuntimeFacts{ExecutionModes: []string{"request_direct", "request_build"}, Capabilities: []string{features.BuildAttachmentCapabilityV2, features.RequestLevelsCapability}}}}
	New(worker, 8788, "admin").srv.Handler.ServeHTTP(w, r)
	doc, err := features.DecodeRuntimeCapabilities(w.Body.Bytes())
	if err != nil {
		t.Fatal(err)
	}
	if doc.Probes[0].Value != "2.1.292" || doc.Probes[0].Status != "observed" || doc.Catalog.RuntimeVerified || doc.ModelProviderVerification != "not_run" {
		t.Fatal("version observation turned into a readiness claim")
	}
	// The modes and the catalog are the loaded CLI's.
	assert.Equal(t, []string{"request_direct", "request_build"}, doc.ExecutionModes)
	assert.Equal(t, features.RequestRuntimeCatalog(worker.facts.Capabilities), doc.Catalog)
	assert.Empty(t, doc.HelperHistorySchemaVersions)
	assert.Empty(t, doc.HelperHistoryPayloadVersions)
}

func TestCapabilitiesRequireAdminAndReportOnlyObservedEvidence(t *testing.T) {
	s := New(&mockWorker{}, 8788, "admin-secret")
	for _, tc := range []struct {
		method, auth string
		status       int
	}{{"GET", "", 401}, {"GET", "admin-secret", 401}, {"GET", "Bearer api-secret", 401}, {"GET", "Bearer admin-secret", 200}, {"POST", "Bearer admin-secret", 405}} {
		r := httptest.NewRequest(tc.method, "/admin/features", nil)
		r.Header.Set("Authorization", tc.auth)
		w := httptest.NewRecorder()
		s.srv.Handler.ServeHTTP(w, r)
		if w.Code != tc.status {
			t.Fatal(tc.method, w.Code)
		}
		if tc.status == 200 {
			doc, err := features.DecodeRuntimeCapabilities(w.Body.Bytes())
			if err != nil {
				t.Fatal(err)
			}
			if doc.Catalog.RuntimeVerified || doc.ModelProviderVerification != "not_run" || doc.Probes[0].Status != "unavailable" || w.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("unobserved capability claim")
			}
		}
	}
	w := httptest.NewRecorder()
	r := httptest.NewRequest("GET", "/admin/features", nil)
	New(&mockWorker{}, 8788, "").srv.Handler.ServeHTTP(w, r)
	if w.Code != 401 {
		t.Fatal("empty admin key opened capability endpoint")
	}
}
