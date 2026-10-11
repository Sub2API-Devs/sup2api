package check

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
)

func TestObservationDeclaration(t *testing.T) {
	for _, name := range []string{"valid", "no_grant", "no_capability", "bad_scope", "unknown_event", "duplicate_metric", "bad_metric", "too_many_metrics", "no_declaration"} {
		t.Run(name, func(t *testing.T) {
			m := &manifest.Manifest{Capabilities: []manifest.Capability{{ID: observation.Capability}}, Observations: &manifest.Observations{Events: []string{observation.UsageFinalized}, Metrics: []string{"custom_units"}}}
			p := &manifest.HostPermission{ID: observation.Permission, Scope: map[string]any{"types": "own"}}
			v := &validator{m: m, perms: map[string]*manifest.HostPermission{observation.Permission: p}}
			switch name {
			case "no_grant":
				delete(v.perms, observation.Permission)
			case "no_capability":
				m.Capabilities = nil
			case "bad_scope":
				p.Scope = map[string]any{}
			case "unknown_event":
				m.Observations.Events = []string{"raw_body"}
			case "duplicate_metric":
				m.Observations.Metrics = []string{"x", "x"}
			case "bad_metric":
				m.Observations.Metrics = []string{"core.tokens"}
			case "too_many_metrics":
				m.Observations.Metrics = make([]string, 17)
			case "no_declaration":
				m.Observations = nil
			}
			v.observations()
			if name == "valid" && len(v.errs) != 0 {
				t.Fatal(v.errs)
			}
			if name != "valid" && len(v.errs) == 0 {
				t.Fatal("invalid observer accepted")
			}
		})
	}
}
