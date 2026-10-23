package ccgateway

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

// fakeWorkerCapabilities are every request policy capability: a fake Worker
// declaring them passes the capability read each model request makes first
// (every policy needs request_levels_v1).
var fakeWorkerCapabilities = []string{
	features.RequestPolicyModeCapability, features.RequestLevelsCapability, features.BuildContentPreservationCapability,
	features.BuildAttachmentCapability, features.BuildAttachmentCapabilityV2, features.BuildBillingCapability,
	features.BuildIdentityCapability, features.DirectBillingCapability, features.BuildInjectionCapability,
	features.RequestIdentityCapability,
}

func fakeWorkerHealthBody(version string) []byte {
	raw, _ := json.Marshal(map[string]any{"status": "ok", "claude_version": version, "capabilities": fakeWorkerCapabilities})
	return raw
}

// serveFakeWorkerHealth answers GET /healthz for a fake Worker handler; false
// for any other request.
func serveFakeWorkerHealth(w http.ResponseWriter, r *http.Request, version string) bool {
	if r.URL.Path != "/healthz" {
		return false
	}
	_, _ = w.Write(fakeWorkerHealthBody(version))
	return true
}

// fakeWorkerHealthResponse is the /healthz answer for a fake Worker transport,
// nil for any other request.
func fakeWorkerHealthResponse(r *http.Request, version string) *http.Response {
	if r.URL.Path != "/healthz" {
		return nil
	}
	return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(bytes.NewReader(fakeWorkerHealthBody(version))), Request: r}
}
