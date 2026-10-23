package server

import (
	"context"
	"encoding/json"
	"net/http"
	"runtime/debug"
	"time"

	"ccgateway/engine"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

// Version is optionally set by the release build. It is never an image tag.
var Version = "dev"
var Revision = "unknown"

func binaryBuildInfo() features.BuildInfo {
	out := features.BuildInfo{Version: Version, Revision: Revision}
	if info, ok := debug.ReadBuildInfo(); ok {
		for _, setting := range info.Settings {
			switch setting.Key {
			case "vcs.revision":
				out.Revision = setting.Value
			case "vcs.modified":
				out.Modified = setting.Value == "true"
			}
		}
	}
	return out
}

func (s *Server) handleFeatures(w http.ResponseWriter, r *http.Request) {
	if !engine.AdminAuthorized(r, s.adminKey) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	probe := features.RuntimeProbe{Name: "cli_version", Status: "unavailable"}
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if status, err := s.worker.Health(ctx); err == nil && status != nil && status.CLIVersion != "" {
		probe.Status = "observed"
		probe.Value = status.CLIVersion
	}
	out := features.RuntimeCapabilities{ProtocolVersion: features.CapabilityProtocolVersion, Build: binaryBuildInfo(), Catalog: features.Catalog(), PolicySchemaVersions: []int{features.PolicySchemaVersion}, Probes: []features.RuntimeProbe{probe}, ModelProviderVerification: "not_run"}
	out.ExecutionModes = []string{"native"}
	if worker, ok := s.worker.(interface{ ExecutionModes() []string }); ok {
		out.ExecutionModes = worker.ExecutionModes()
		if len(out.ExecutionModes) == 1 && out.ExecutionModes[0] != "native" {
			// Native policy declarations do not apply to single-request mode.
			out.Catalog = features.RequestCatalog(out.ExecutionModes[0])
		}
	}
	if worker, ok := s.worker.(interface{ RequestCapabilities() []string }); ok {
		out.Catalog = features.RequestRuntimeCatalog(worker.RequestCapabilities())
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(out)
}
